// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * ⚠️ DEPRECATED - DO NOT USE FOR NEW DEPLOYMENTS ⚠️
 *
 * このコントラクトは前提条件の誤認に基づいて作成されました。
 * 特許出願人はプロジェクトオーナー様であるため、特許回避設計は不要でした。
 *
 * 【移行先】
 * - RewardNFT.sol (v1) - 特許整合版の基本実装
 * - RewardNFT_v2.sol (v2) - 推奨版（SKU型I/F、ガス最適化、後方互換）
 *
 * 【廃止理由】
 * - 誤った前提条件（特許回避の必要性）に基づく設計
 * - 自動配布機能が実装されていない（本来は必要な機能）
 * - RewardNFTで正しい実装に置き換え済み
 *
 * 【参照】
 * - contracts/REWARDNFT-DESIGN.md - RewardNFT設計書
 * - contracts/REWARDNFT-V2-CHANGES.md - v2変更点詳細
 * - contracts/MIGRATION-GUIDE.md - 移行ガイド
 *
 * @deprecated Use RewardNFT_v2.sol instead
 */

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "./interfaces/IERC2981.sol";

/**
 * @title StandardNFT
 * @notice ⚠️ DEPRECATED - Use RewardNFT_v2.sol instead
 * @notice 通常NFT（譲渡可能）- ギフテラとは完全独立
 *
 * ⚠️ このコントラクトは廃止予定です ⚠️
 * 特許回避設計は誤った前提条件に基づいていました。
 * 正しい実装はRewardNFT_v2.solをご使用ください。
 *
 * 【特許回避設計の徹底】（※不要だった設計）
 * ===================
 * このコントラクトは特許請求項1〜3に該当する機能を一切含みません：
 * 
 * ❌ 避けている特許対象機能：
 * - 自動配布機能（請求項1,3）
 * - NFT属性に基づく報酬配布（請求項1）
 * - 状態フラグの付与・変更（請求項1）
 * - ランダム抽選ロジック（請求項2）
 * - GLB/トークンの自動配布（請求項3）
 * - GifterraCoreとの処理連携
 * 
 * ✅ 実装している安全機能：
 * - 手動ミント（ユーザー操作・管理者操作のみ）
 * - 通常のERC-721転送機能
 * - メタデータ管理
 * - ロイヤリティ設定
 * - マーケットプレイス対応
 * - アクセス制御
 * 
 * 【設計原則】
 * - ユーザー操作・外部UI操作による制御のみ
 * - 自動処理は一切なし
 * - GifterraCoreとはデータ参照のみ（処理連携なし）
 */
contract StandardNFT is 
    ERC721, 
    ERC721URIStorage, 
    AccessControl, 
    ReentrancyGuard, 
    Pausable,
    IERC2981 
{
    // ロール定義
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant REVEALER_ROLE = keccak256("REVEALER_ROLE");
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");
    
    // 基本設定
    string private _baseTokenURI;
    uint256 private _nextTokenId = 1;
    uint256 public maxSupply;
    uint256 public mintPrice;
    bool public publicMintEnabled = false;
    
    // ロイヤリティ設定（ERC-2981）
    address public royaltyRecipient;
    uint96 public royaltyBasisPoints; // 10000 = 100%
    
    // GifterraCoreアドレス（参照専用）
    // 【特許回避】読み取り専用、自動処理なし、処理連携なし
    address public immutable gifterraCoreAddress;
    
    // メタデータ管理
    mapping(uint256 => bool) public isRevealed;
    string public preRevealURI;
    
    // ミント制限
    mapping(address => uint256) public mintedCount;
    uint256 public maxMintPerAddress;
    
    // 統計情報
    uint256 public totalRevenue;
    
    // イベント
    event TokenMinted(address indexed to, uint256 indexed tokenId, string tokenURI);
    event TokenRevealed(uint256 indexed tokenId, string newURI);
    event RoyaltyUpdated(address recipient, uint96 basisPoints);
    event PublicMintStatusChanged(bool enabled);
    event MintPriceUpdated(uint256 newPrice);
    event MaxSupplyUpdated(uint256 newMaxSupply);
    event RevenueWithdrawn(address recipient, uint256 amount);
    
    constructor(
        string memory name,
        string memory symbol,
        string memory baseURI,
        address owner,
        address _gifterraCoreAddress,  // 参照用のみ
        uint256 _maxSupply,
        uint256 _mintPrice
    ) ERC721(name, symbol) {
        require(owner != address(0), "Owner cannot be zero address");
        require(_gifterraCoreAddress != address(0), "GifterraCore address cannot be zero");
        
        _baseTokenURI = baseURI;
        gifterraCoreAddress = _gifterraCoreAddress;
        maxSupply = _maxSupply;
        mintPrice = _mintPrice;
        maxMintPerAddress = 10; // デフォルト制限
        
        // ロール設定
        _setupRole(DEFAULT_ADMIN_ROLE, owner);
        _setupRole(MINTER_ROLE, owner);
        _setupRole(REVEALER_ROLE, owner);
        _setupRole(PAUSER_ROLE, owner);
        
        // デフォルトロイヤリティ設定（2.5%）
        royaltyRecipient = owner;
        royaltyBasisPoints = 250;
    }
    
    /**
     * @notice 手動ミント（管理者のみ）
     * @dev 【特許回避】自動配布なし、手動操作のみ
     * 
     * このミント機能は以下の特許回避原則に従います：
     * - 管理者による手動操作のみ
     * - NFT属性に基づく自動処理なし
     * - 状態フラグ制御なし
     * - ランダム要素なし
     * - 報酬配布機能なし
     */
    function mint(
        address to, 
        string memory tokenURI
    ) external onlyRole(MINTER_ROLE) whenNotPaused nonReentrant returns (uint256) {
        require(to != address(0), "Cannot mint to zero address");
        require(_checkSupplyLimit(), "Max supply reached");
        
        uint256 tokenId = _nextTokenId++;
        _safeMint(to, tokenId);
        
        if (bytes(tokenURI).length > 0) {
            _setTokenURI(tokenId, tokenURI);
            isRevealed[tokenId] = true;
        }
        
        emit TokenMinted(to, tokenId, tokenURI);
        return tokenId;
    }
    
    /**
     * @notice バッチミント（管理者のみ）
     * @dev 【特許回避】手動バッチ処理、自動配布なし
     */
    function mintBatch(
        address[] calldata recipients,
        string[] calldata tokenURIs
    ) external onlyRole(MINTER_ROLE) whenNotPaused nonReentrant {
        require(recipients.length == tokenURIs.length, "Array length mismatch");
        require(recipients.length <= 50, "Batch size too large");
        require(recipients.length > 0, "Empty batch");
        
        // 供給量チェック
        require(
            maxSupply == 0 || _nextTokenId + recipients.length - 1 <= maxSupply,
            "Batch exceeds max supply"
        );
        
        for (uint256 i = 0; i < recipients.length; i++) {
            require(recipients[i] != address(0), "Cannot mint to zero address");
            
            uint256 tokenId = _nextTokenId++;
            _safeMint(recipients[i], tokenId);
            
            if (bytes(tokenURIs[i]).length > 0) {
                _setTokenURI(tokenId, tokenURIs[i]);
                isRevealed[tokenId] = true;
            }
            
            emit TokenMinted(recipients[i], tokenId, tokenURIs[i]);
        }
    }
    
    /**
     * @notice 有料ミント（パブリック）
     * @dev 【特許回避】ユーザー操作による手動ミント、自動処理なし
     * 
     * この機能は特許対象外の理由：
     * - ユーザーの明示的な操作によるミント
     * - NFT属性に基づく自動配布なし
     * - 報酬配布機能なし
     * - 状態フラグ制御なし
     */
    function publicMint(string memory tokenURI) 
        external payable whenNotPaused nonReentrant {
        require(publicMintEnabled, "Public mint not enabled");
        require(mintPrice > 0, "Public mint not configured");
        require(msg.value >= mintPrice, "Insufficient payment");
        require(_checkSupplyLimit(), "Max supply reached");
        require(
            maxMintPerAddress == 0 || mintedCount[msg.sender] < maxMintPerAddress,
            "Mint limit exceeded"
        );
        
        uint256 tokenId = _nextTokenId++;
        _safeMint(msg.sender, tokenId);
        
        // ミント数更新
        mintedCount[msg.sender]++;
        totalRevenue += msg.value;
        
        if (bytes(tokenURI).length > 0) {
            _setTokenURI(tokenId, tokenURI);
            isRevealed[tokenId] = true;
        }
        
        emit TokenMinted(msg.sender, tokenId, tokenURI);
    }
    
    /**
     * @notice トークンURI更新（リビール機能）
     * @dev 【特許回避】手動操作によるメタデータ更新、自動処理なし
     */
    function reveal(uint256 tokenId, string memory newURI) 
        external onlyRole(REVEALER_ROLE) whenNotPaused {
        require(_exists(tokenId), "Token does not exist");
        require(!isRevealed[tokenId], "Token already revealed");
        
        _setTokenURI(tokenId, newURI);
        isRevealed[tokenId] = true;
        
        emit TokenRevealed(tokenId, newURI);
    }
    
    /**
     * @notice 複数トークンのリビール
     * @dev 【特許回避】手動バッチ処理、自動処理なし
     */
    function revealBatch(
        uint256[] calldata tokenIds, 
        string[] calldata newURIs
    ) external onlyRole(REVEALER_ROLE) whenNotPaused {
        require(tokenIds.length == newURIs.length, "Array length mismatch");
        require(tokenIds.length <= 100, "Batch size too large");
        
        for (uint256 i = 0; i < tokenIds.length; i++) {
            require(_exists(tokenIds[i]), "Token does not exist");
            require(!isRevealed[tokenIds[i]], "Token already revealed");
            
            _setTokenURI(tokenIds[i], newURIs[i]);
            isRevealed[tokenIds[i]] = true;
            
            emit TokenRevealed(tokenIds[i], newURIs[i]);
        }
    }
    
    /**
     * @notice ロイヤリティ設定
     */
    function setRoyalty(address recipient, uint96 basisPoints) 
        external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(recipient != address(0), "Invalid recipient");
        require(basisPoints <= 1000, "Royalty too high"); // 最大10%
        
        royaltyRecipient = recipient;
        royaltyBasisPoints = basisPoints;
        
        emit RoyaltyUpdated(recipient, basisPoints);
    }
    
    /**
     * @notice GifterraCoreの情報参照
     * @dev 【特許回避】読み取り専用、処理連携なし
     * 
     * この機能は特許対象外の理由：
     * - データの読み取りのみ
     * - 自動処理なし
     * - 状態変更なし
     * - 報酬配布なし
     */
    function getGifterraCoreInfo() external view returns (address) {
        return gifterraCoreAddress;
    }
    
    /**
     * @notice 設定管理機能群
     */
    function setBaseURI(string memory newBaseURI) 
        external onlyRole(DEFAULT_ADMIN_ROLE) {
        _baseTokenURI = newBaseURI;
    }
    
    function setPreRevealURI(string memory newPreRevealURI) 
        external onlyRole(DEFAULT_ADMIN_ROLE) {
        preRevealURI = newPreRevealURI;
    }
    
    function setMintPrice(uint256 newPrice) 
        external onlyRole(DEFAULT_ADMIN_ROLE) {
        mintPrice = newPrice;
        emit MintPriceUpdated(newPrice);
    }
    
    function setMaxSupply(uint256 newMaxSupply) 
        external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(
            newMaxSupply == 0 || newMaxSupply >= _nextTokenId - 1,
            "Cannot set below current supply"
        );
        maxSupply = newMaxSupply;
        emit MaxSupplyUpdated(newMaxSupply);
    }
    
    function setMaxMintPerAddress(uint256 newLimit) 
        external onlyRole(DEFAULT_ADMIN_ROLE) {
        maxMintPerAddress = newLimit;
    }
    
    function setPublicMintEnabled(bool enabled) 
        external onlyRole(DEFAULT_ADMIN_ROLE) {
        publicMintEnabled = enabled;
        emit PublicMintStatusChanged(enabled);
    }
    
    /**
     * @notice 売上引き出し
     */
    function withdraw(address recipient) 
        external onlyRole(DEFAULT_ADMIN_ROLE) nonReentrant {
        require(recipient != address(0), "Invalid recipient");
        uint256 balance = address(this).balance;
        require(balance > 0, "No funds to withdraw");
        
        (bool success, ) = payable(recipient).call{value: balance}("");
        require(success, "Withdrawal failed");
        
        emit RevenueWithdrawn(recipient, balance);
    }
    
    /**
     * @notice 緊急停止機能
     */
    function pause() external onlyRole(PAUSER_ROLE) {
        _pause();
    }
    
    function unpause() external onlyRole(PAUSER_ROLE) {
        _unpause();
    }
    
    /**
     * @notice 統計情報取得
     */
    function getStats() external view returns (
        uint256 totalSupply,
        uint256 currentMaxSupply,
        uint256 currentMintPrice,
        uint256 revenue,
        bool isPublicMintEnabled,
        bool isPaused
    ) {
        totalSupply = _nextTokenId - 1;
        currentMaxSupply = maxSupply;
        currentMintPrice = mintPrice;
        revenue = totalRevenue;
        isPublicMintEnabled = publicMintEnabled;
        isPaused = paused();
    }
    
    /**
     * @notice 供給量チェック
     */
    function _checkSupplyLimit() internal view returns (bool) {
        return maxSupply == 0 || _nextTokenId <= maxSupply;
    }
    
    // ERC2981 ロイヤリティ実装
    function royaltyInfo(uint256, uint256 salePrice) 
        external view override returns (address, uint256) {
        uint256 royaltyAmount = (salePrice * royaltyBasisPoints) / 10000;
        return (royaltyRecipient, royaltyAmount);
    }
    
    // URI関連オーバーライド
    function _baseURI() internal view virtual override returns (string memory) {
        return _baseTokenURI;
    }
    
    function tokenURI(uint256 tokenId) 
        public view virtual override(ERC721, ERC721URIStorage) returns (string memory) {
        require(_exists(tokenId), "URI query for nonexistent token");
        
        // リビール前の場合はpreRevealURIを返す
        if (!isRevealed[tokenId] && bytes(preRevealURI).length > 0) {
            return preRevealURI;
        }
        
        return super.tokenURI(tokenId);
    }
    
    function _burn(uint256 tokenId) 
        internal virtual override(ERC721, ERC721URIStorage) {
        super._burn(tokenId);
    }
    
    // インターフェースサポート
    function supportsInterface(bytes4 interfaceId) 
        public view virtual override(ERC721, AccessControl, IERC165) returns (bool) {
        return interfaceId == type(IERC2981).interfaceId || 
               super.supportsInterface(interfaceId);
    }
    
    // 現在の供給量
    function totalSupply() public view returns (uint256) {
        return _nextTokenId - 1;
    }
    
    /**
     * @notice バージョン情報
     */
    function version() external pure returns (string memory) {
        return "StandardNFT v1.0.0 - Patent Safe Design";
    }
}