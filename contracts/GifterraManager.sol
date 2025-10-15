// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

// インターフェース定義
interface IGifterraSBT {
    function userNFTLevel(address user) external view returns (uint256);
    function userInfo(address user) external view returns (uint256 lastClaimed, uint256 totalTips);
    function balanceOf(address owner) external view returns (uint256);
}

interface IGifterraNFT {
    function mintFromSBT(address to, uint256 level, uint256 sbtId) external returns (uint256);
    function getTokenLevel(uint256 tokenId) external view returns (uint256);
    function ownerOf(uint256 tokenId) external view returns (address);
    function transferFrom(address from, address to, uint256 tokenId) external;
    function burn(uint256 tokenId) external;
}

/**
 * @title Gifterra Manager Contract
 * @dev SBTとNFTを連携管理するコントラクト
 */
contract GifterraManager is AccessControl, Pausable, ReentrancyGuard {
    
    /* =========================================
       ✅ 基本設定
    ========================================= */
    bytes32 public constant OPERATOR_ROLE = keccak256("OPERATOR_ROLE");
    
    IGifterraSBT public sbtContract;
    IGifterraNFT public nftContract;
    
    /* =========================================
       ✅ 変換管理
    ========================================= */
    struct ConversionRecord {
        address user;
        uint256 sbtLevel;
        uint256 nftTokenId;
        uint256 convertedAt;
        bool isActive;
    }
    
    mapping(address => ConversionRecord[]) public userConversions;
    mapping(uint256 => bool) public convertedNFTs; // NFT -> SBT変換済みフラグ
    
    uint256 public totalConversions;
    uint256 public conversionFee = 0; // 変換手数料 (将来実装)
    
    /* =========================================
       ✅ イベント
    ========================================= */
    event SBTtoNFTConverted(
        address indexed user,
        uint256 sbtLevel,
        uint256 indexed nftTokenId,
        uint256 timestamp
    );
    
    event NFTtoSBTConverted(
        address indexed user,
        uint256 indexed nftTokenId,
        uint256 nftLevel,
        uint256 timestamp
    );
    
    event LevelSynced(
        address indexed user,
        uint256 oldLevel,
        uint256 newLevel,
        uint256 timestamp
    );
    
    event ContractUpdated(
        string contractType,
        address indexed oldContract,
        address indexed newContract
    );
    
    /* =========================================
       ✅ コンストラクタ
    ========================================= */
    constructor(
        address _sbtContract,
        address _nftContract
    ) {
        require(_sbtContract != address(0), "Invalid SBT contract");
        require(_nftContract != address(0), "Invalid NFT contract");
        
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(OPERATOR_ROLE, msg.sender);
        
        sbtContract = IGifterraSBT(_sbtContract);
        nftContract = IGifterraNFT(_nftContract);
    }
    
    /* =========================================
       ✅ レベル管理機能
    ========================================= */
    
    /**
     * @dev ユーザーの統合レベルを取得
     * SBTとNFTの両方を考慮した最高レベルを返す
     */
    function getUserLevel(address user) public view returns (uint256) {
        require(user != address(0), "Invalid user address");
        
        // SBTのレベルを取得
        uint256 sbtLevel = sbtContract.userNFTLevel(user);
        
        // ユーザーの変換記録から最高レベルを取得
        uint256 maxNFTLevel = 0;
        ConversionRecord[] memory conversions = userConversions[user];
        
        for (uint256 i = 0; i < conversions.length; i++) {
            if (conversions[i].isActive) {
                try nftContract.ownerOf(conversions[i].nftTokenId) returns (address owner) {
                    if (owner == user) {
                        uint256 nftLevel = nftContract.getTokenLevel(conversions[i].nftTokenId);
                        if (nftLevel > maxNFTLevel) {
                            maxNFTLevel = nftLevel;
                        }
                    }
                } catch {
                    // NFTが存在しないか、アクセスできない場合はスキップ
                    continue;
                }
            }
        }
        
        // SBTレベルとNFTレベルの最高値を返す
        return sbtLevel > maxNFTLevel ? sbtLevel : maxNFTLevel;
    }
    
    /* =========================================
       ✅ 変換機能
    ========================================= */
    
    /**
     * @dev SBTをNFTに変換
     */
    function convertSBTtoNFT(uint256 sbtLevel) 
        public 
        nonReentrant 
        whenNotPaused 
        returns (uint256) 
    {
        require(sbtLevel >= 1 && sbtLevel <= 5, "Invalid SBT level");
        
        // ユーザーのSBTレベルを確認
        uint256 userSBTLevel = sbtContract.userNFTLevel(msg.sender);
        require(userSBTLevel >= sbtLevel, "Insufficient SBT level");
        
        // SBTを持っていることを確認
        require(sbtContract.balanceOf(msg.sender) > 0, "No SBT found");
        
        // NFTをミント
        uint256 tokenId = nftContract.mintFromSBT(msg.sender, sbtLevel, userSBTLevel);
        
        // 変換記録を保存
        userConversions[msg.sender].push(ConversionRecord({
            user: msg.sender,
            sbtLevel: sbtLevel,
            nftTokenId: tokenId,
            convertedAt: block.timestamp,
            isActive: true
        }));
        
        totalConversions++;
        
        emit SBTtoNFTConverted(msg.sender, sbtLevel, tokenId, block.timestamp);
        return tokenId;
    }
    
    /**
     * @dev NFTをSBTに変換（NFTをバーン）
     */
    function convertNFTtoSBT(uint256 tokenId) 
        public 
        nonReentrant 
        whenNotPaused 
    {
        require(tokenId > 0, "Invalid token ID");
        require(!convertedNFTs[tokenId], "NFT already converted");
        
        // NFTの所有者確認
        address owner = nftContract.ownerOf(tokenId);
        require(owner == msg.sender, "Not NFT owner");
        
        // NFTレベル取得
        uint256 nftLevel = nftContract.getTokenLevel(tokenId);
        
        // NFTをバーン（管理者権限必要）
        // 注意: 実際の実装では、NFTコントラクトにburn機能を追加する必要があります
        // nftContract.burn(tokenId);
        
        // 変換済みフラグを設定
        convertedNFTs[tokenId] = true;
        
        // ユーザーの変換記録を更新
        ConversionRecord[] storage conversions = userConversions[msg.sender];
        for (uint256 i = 0; i < conversions.length; i++) {
            if (conversions[i].nftTokenId == tokenId && conversions[i].isActive) {
                conversions[i].isActive = false;
                break;
            }
        }
        
        emit NFTtoSBTConverted(msg.sender, tokenId, nftLevel, block.timestamp);
    }
    
    /* =========================================
       ✅ レベル同期機能
    ========================================= */
    
    /**
     * @dev レベル同期（管理者のみ）
     */
    function syncLevel(
        address user, 
        uint256 newLevel
    ) public onlyRole(OPERATOR_ROLE) {
        require(user != address(0), "Invalid user address");
        require(newLevel >= 1 && newLevel <= 5, "Invalid level");
        
        uint256 oldLevel = getUserLevel(user);
        
        // 実際のレベル同期ロジックはここに実装
        // 例: SBTコントラクトのレベル更新関数を呼び出し
        
        emit LevelSynced(user, oldLevel, newLevel, block.timestamp);
    }
    
    /* =========================================
       ✅ 照会機能
    ========================================= */
    
    /**
     * @dev ユーザーの変換履歴を取得
     */
    function getUserConversions(address user) 
        public 
        view 
        returns (ConversionRecord[] memory) 
    {
        return userConversions[user];
    }
    
    /**
     * @dev アクティブな変換記録数を取得
     */
    function getActiveConversionsCount(address user) 
        public 
        view 
        returns (uint256) 
    {
        ConversionRecord[] memory conversions = userConversions[user];
        uint256 count = 0;
        
        for (uint256 i = 0; i < conversions.length; i++) {
            if (conversions[i].isActive) {
                count++;
            }
        }
        
        return count;
    }
    
    /* =========================================
       ✅ 管理機能
    ========================================= */
    
    function setSBTContract(address _sbtContract) 
        public 
        onlyRole(DEFAULT_ADMIN_ROLE) 
    {
        require(_sbtContract != address(0), "Invalid SBT contract");
        address oldContract = address(sbtContract);
        sbtContract = IGifterraSBT(_sbtContract);
        emit ContractUpdated("SBT", oldContract, _sbtContract);
    }
    
    function setNFTContract(address _nftContract) 
        public 
        onlyRole(DEFAULT_ADMIN_ROLE) 
    {
        require(_nftContract != address(0), "Invalid NFT contract");
        address oldContract = address(nftContract);
        nftContract = IGifterraNFT(_nftContract);
        emit ContractUpdated("NFT", oldContract, _nftContract);
    }
    
    function setConversionFee(uint256 _fee) 
        public 
        onlyRole(DEFAULT_ADMIN_ROLE) 
    {
        conversionFee = _fee;
    }
    
    function pause() public onlyRole(DEFAULT_ADMIN_ROLE) {
        _pause();
    }
    
    function unpause() public onlyRole(DEFAULT_ADMIN_ROLE) {
        _unpause();
    }
    
    /* =========================================
       ✅ 緊急機能
    ========================================= */
    
    /**
     * @dev 緊急時の変換記録修正
     */
    function emergencyFixConversion(
        address user,
        uint256 conversionIndex,
        bool isActive
    ) public onlyRole(DEFAULT_ADMIN_ROLE) {
        require(user != address(0), "Invalid user address");
        require(conversionIndex < userConversions[user].length, "Invalid conversion index");
        
        userConversions[user][conversionIndex].isActive = isActive;
    }
}