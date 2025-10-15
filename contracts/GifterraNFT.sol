// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

/**
 * @title Gifterra NFT Contract
 * @dev 譲渡可能なNFTコントラクト - SBTコントラクトと連携
 */
contract GifterraNFT is ERC721, ERC721URIStorage, AccessControl, Pausable {
    using Counters for Counters.Counter;

    /* =========================================
       ✅ 基本設定
    ========================================= */
    Counters.Counter private _tokenIdCounter;
    
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant MANAGER_ROLE = keccak256("MANAGER_ROLE");
    
    // SBTコントラクトとの連携用
    address public sbtContract;
    address public managerContract;
    
    /* =========================================
       ✅ NFTメタデータ管理
    ========================================= */
    struct TokenMetadata {
        uint256 level;          // レベル (1-5)
        uint256 createdAt;      // 作成時刻
        bool isFromSBT;         // SBTから変換されたか
        uint256 originalSBTId;  // 元のSBT ID (SBT変換の場合)
    }
    
    mapping(uint256 => TokenMetadata) public tokenMetadata;
    mapping(uint256 => string) private _customTokenURIs;
    
    // レベル別のベースURI
    mapping(uint256 => string) public levelBaseURIs;
    
    /* =========================================
       ✅ イベント
    ========================================= */
    event NFTMinted(
        address indexed to, 
        uint256 indexed tokenId, 
        uint256 level,
        bool isFromSBT
    );
    
    event LevelURIUpdated(uint256 indexed level, string newURI);
    event SBTContractUpdated(address indexed oldContract, address indexed newContract);
    
    /* =========================================
       ✅ コンストラクタ
    ========================================= */
    constructor(
        string memory name,
        string memory symbol,
        address _sbtContract
    ) ERC721(name, symbol) {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(MINTER_ROLE, msg.sender);
        _grantRole(MANAGER_ROLE, msg.sender);
        
        sbtContract = _sbtContract;
        
        // 初期レベルURIの設定
        _initializeLevelURIs();
    }
    
    /* =========================================
       ✅ NFTミント機能
    ========================================= */
    
    /**
     * @dev レベル指定でNFTをミント
     */
    function mintLevelNFT(
        address to, 
        uint256 level
    ) public onlyRole(MINTER_ROLE) whenNotPaused returns (uint256) {
        require(level >= 1 && level <= 5, "Invalid level");
        require(to != address(0), "Cannot mint to zero address");
        
        uint256 tokenId = _tokenIdCounter.current();
        _tokenIdCounter.increment();
        
        _safeMint(to, tokenId);
        
        // メタデータの設定
        tokenMetadata[tokenId] = TokenMetadata({
            level: level,
            createdAt: block.timestamp,
            isFromSBT: false,
            originalSBTId: 0
        });
        
        emit NFTMinted(to, tokenId, level, false);
        return tokenId;
    }
    
    /**
     * @dev SBTから変換してNFTをミント
     */
    function mintFromSBT(
        address to,
        uint256 level,
        uint256 sbtId
    ) public onlyRole(MANAGER_ROLE) whenNotPaused returns (uint256) {
        require(level >= 1 && level <= 5, "Invalid level");
        require(to != address(0), "Cannot mint to zero address");
        
        uint256 tokenId = _tokenIdCounter.current();
        _tokenIdCounter.increment();
        
        _safeMint(to, tokenId);
        
        // SBT変換のメタデータ設定
        tokenMetadata[tokenId] = TokenMetadata({
            level: level,
            createdAt: block.timestamp,
            isFromSBT: true,
            originalSBTId: sbtId
        });
        
        emit NFTMinted(to, tokenId, level, true);
        return tokenId;
    }
    
    /* =========================================
       ✅ メタデータ管理
    ========================================= */
    
    /**
     * @dev トークンのレベルを取得
     */
    function getTokenLevel(uint256 tokenId) public view returns (uint256) {
        require(_exists(tokenId), "Token does not exist");
        return tokenMetadata[tokenId].level;
    }
    
    /**
     * @dev トークンの詳細メタデータを取得
     */
    function getTokenMetadata(uint256 tokenId) public view returns (TokenMetadata memory) {
        require(_exists(tokenId), "Token does not exist");
        return tokenMetadata[tokenId];
    }
    
    /**
     * @dev トークンURIの生成
     */
    function tokenURI(uint256 tokenId) public view override(ERC721, ERC721URIStorage) returns (string memory) {
        require(_exists(tokenId), "Token does not exist");
        
        // カスタムURIが設定されている場合はそれを返す
        string memory customURI = _customTokenURIs[tokenId];
        if (bytes(customURI).length > 0) {
            return customURI;
        }
        
        // レベル別のベースURIを使用
        uint256 level = tokenMetadata[tokenId].level;
        string memory baseURI = levelBaseURIs[level];
        
        if (bytes(baseURI).length > 0) {
            return string(abi.encodePacked(baseURI, Strings.toString(tokenId), ".json"));
        }
        
        return super.tokenURI(tokenId);
    }
    
    /* =========================================
       ✅ 管理機能
    ========================================= */
    
    /**
     * @dev レベル別ベースURIの設定
     */
    function setLevelBaseURI(
        uint256 level, 
        string memory baseURI
    ) public onlyRole(DEFAULT_ADMIN_ROLE) {
        require(level >= 1 && level <= 5, "Invalid level");
        levelBaseURIs[level] = baseURI;
        emit LevelURIUpdated(level, baseURI);
    }
    
    /**
     * @dev カスタムトークンURIの設定
     */
    function setCustomTokenURI(
        uint256 tokenId, 
        string memory uri
    ) public onlyRole(DEFAULT_ADMIN_ROLE) {
        require(_exists(tokenId), "Token does not exist");
        _customTokenURIs[tokenId] = uri;
    }
    
    /**
     * @dev SBTコントラクトアドレスの更新
     */
    function setSBTContract(address _sbtContract) public onlyRole(DEFAULT_ADMIN_ROLE) {
        require(_sbtContract != address(0), "Invalid SBT contract address");
        address oldContract = sbtContract;
        sbtContract = _sbtContract;
        emit SBTContractUpdated(oldContract, _sbtContract);
    }
    
    /**
     * @dev マネージャーコントラクトアドレスの設定
     */
    function setManagerContract(address _managerContract) public onlyRole(DEFAULT_ADMIN_ROLE) {
        require(_managerContract != address(0), "Invalid manager contract address");
        managerContract = _managerContract;
        _grantRole(MANAGER_ROLE, _managerContract);
    }
    
    /* =========================================
       ✅ セキュリティ機能
    ========================================= */
    
    function pause() public onlyRole(DEFAULT_ADMIN_ROLE) {
        _pause();
    }
    
    function unpause() public onlyRole(DEFAULT_ADMIN_ROLE) {
        _unpause();
    }
    
    /* =========================================
       ✅ 内部関数
    ========================================= */
    
    function _initializeLevelURIs() private {
        // レベル別のデフォルトベースURI設定
        levelBaseURIs[1] = "https://api.gifterra.io/metadata/level1/";
        levelBaseURIs[2] = "https://api.gifterra.io/metadata/level2/";
        levelBaseURIs[3] = "https://api.gifterra.io/metadata/level3/";
        levelBaseURIs[4] = "https://api.gifterra.io/metadata/level4/";
        levelBaseURIs[5] = "https://api.gifterra.io/metadata/level5/";
    }
    
    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 tokenId,
        uint256 batchSize
    ) internal override whenNotPaused {
        super._beforeTokenTransfer(from, to, tokenId, batchSize);
    }
    
    function _burn(uint256 tokenId) internal override(ERC721, ERC721URIStorage) {
        super._burn(tokenId);
        delete tokenMetadata[tokenId];
        delete _customTokenURIs[tokenId];
    }
    
    /* =========================================
       ✅ Interface サポート
    ========================================= */
    
    function supportsInterface(bytes4 interfaceId) 
        public 
        view 
        override(ERC721, AccessControl) 
        returns (bool) 
    {
        return super.supportsInterface(interfaceId);
    }
}