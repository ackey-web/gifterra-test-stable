// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "./interfaces/IERC2981.sol";

/**
 * @title RewardNFT
 * @notice 通常NFT（譲渡可能）- 報酬器として機能（特許整合版）
 *
 * 【特許整合設計】
 * ===================
 * このコントラクトは特許出願人による実装であり、特許請求項に沿った
 * 「自動配布」機構を実装します。
 *
 * ✅ 実装する特許対象機能：
 * - 自動配布エンジン（GifterraDistributor）からのミント受付
 * - NFT属性に基づく報酬配布サポート
 * - メタデータの自動設定
 * - 配布ルールに基づくミント実行
 *
 * 【役割分離】
 * - このコントラクト：NFTの発行器（ミント実行とメタデータ提供に特化）
 * - GifterraDistributor：トリガ受領→ルール判定→配布実行の司令塔
 * - PaySplitter：支払い受け口（イベント発火）
 * - JourneyPass：フラグ付きNFT（状態保持）
 *
 * 【設計原則】
 * - 判定ロジックはDistributorに委譲（このコントラクトは判定しない）
 * - ミント要求を受け付けて実行する「発行器」に徹する
 * - メタデータ管理とロイヤリティ設定をサポート
 * - リビール機能による段階的な情報公開
 */
contract RewardNFT is
    ERC721,
    ERC721URIStorage,
    AccessControl,
    ReentrancyGuard,
    Pausable,
    IERC2981
{
    // ロール定義
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant DISTRIBUTOR_ROLE = keccak256("DISTRIBUTOR_ROLE"); // 自動配布エンジン用
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

    // GifterraDistributorアドレス（自動配布エンジン）
    address public distributorAddress;

    // メタデータ管理
    mapping(uint256 => bool) public isRevealed;
    string public preRevealURI;

    // ミント制限
    mapping(address => uint256) public mintedCount;
    uint256 public maxMintPerAddress;

    // 配布追跡（統計用）
    struct DistributionRecord {
        address recipient;
        uint256 tokenId;
        uint256 timestamp;
        string distributionType; // "automatic", "manual", "public"
        bytes32 triggerId; // PaySplitterのトリガーIDなど
    }

    mapping(uint256 => DistributionRecord) public distributionRecords;
    uint256 public totalDistributions;

    // 統計情報
    uint256 public totalRevenue;
    uint256 public automaticDistributionCount;
    uint256 public manualDistributionCount;

    // イベント
    event TokenMinted(
        address indexed to,
        uint256 indexed tokenId,
        string tokenURI,
        string distributionType
    );
    event AutomaticDistribution(
        address indexed distributor,
        address indexed recipient,
        uint256 indexed tokenId,
        bytes32 triggerId
    );
    event TokenRevealed(uint256 indexed tokenId, string newURI);
    event RoyaltyUpdated(address recipient, uint96 basisPoints);
    event PublicMintStatusChanged(bool enabled);
    event MintPriceUpdated(uint256 newPrice);
    event MaxSupplyUpdated(uint256 newMaxSupply);
    event RevenueWithdrawn(address recipient, uint256 amount);
    event DistributorUpdated(address indexed oldDistributor, address indexed newDistributor);

    constructor(
        string memory name,
        string memory symbol,
        string memory baseURI,
        address owner,
        address _distributorAddress,
        uint256 _maxSupply,
        uint256 _mintPrice
    ) ERC721(name, symbol) {
        require(owner != address(0), "Owner cannot be zero address");

        _baseTokenURI = baseURI;
        distributorAddress = _distributorAddress;
        maxSupply = _maxSupply;
        mintPrice = _mintPrice;
        maxMintPerAddress = 10; // デフォルト制限

        // ロール設定
        _setupRole(DEFAULT_ADMIN_ROLE, owner);
        _setupRole(MINTER_ROLE, owner);
        _setupRole(REVEALER_ROLE, owner);
        _setupRole(PAUSER_ROLE, owner);

        // Distributorにミント権限を付与
        if (_distributorAddress != address(0)) {
            _setupRole(DISTRIBUTOR_ROLE, _distributorAddress);
        }

        // デフォルトロイヤリティ設定（2.5%）
        royaltyRecipient = owner;
        royaltyBasisPoints = 250;
    }

    /**
     * @notice 自動配布ミント（Distributorからの呼び出し専用）
     * @dev 特許請求項に沿った自動配布機能
     *
     * このミント機能の特徴：
     * - GifterraDistributorからの自動呼び出しを受け付ける
     * - 判定ロジックはDistributor側で実行済み
     * - このコントラクトは発行器として機能
     * - トリガーIDを記録して追跡可能にする
     *
     * @param to 受取人アドレス
     * @param tokenURI トークンメタデータURI
     * @param triggerId トリガー識別子（PaySplitterのイベントIDなど）
     */
    function distributeMint(
        address to,
        string memory tokenURI,
        bytes32 triggerId
    ) external onlyRole(DISTRIBUTOR_ROLE) whenNotPaused nonReentrant returns (uint256) {
        require(to != address(0), "Cannot mint to zero address");
        require(_checkSupplyLimit(), "Max supply reached");

        uint256 tokenId = _nextTokenId++;
        _safeMint(to, tokenId);

        // メタデータ設定
        if (bytes(tokenURI).length > 0) {
            _setTokenURI(tokenId, tokenURI);
            isRevealed[tokenId] = true;
        }

        // 配布記録
        distributionRecords[tokenId] = DistributionRecord({
            recipient: to,
            tokenId: tokenId,
            timestamp: block.timestamp,
            distributionType: "automatic",
            triggerId: triggerId
        });

        totalDistributions++;
        automaticDistributionCount++;

        emit AutomaticDistribution(msg.sender, to, tokenId, triggerId);
        emit TokenMinted(to, tokenId, tokenURI, "automatic");

        return tokenId;
    }

    /**
     * @notice バッチ自動配布ミント（Distributorからの呼び出し専用）
     * @dev 複数アドレスへの一括配布
     */
    function distributeMintBatch(
        address[] calldata recipients,
        string[] calldata tokenURIs,
        bytes32 triggerId
    ) external onlyRole(DISTRIBUTOR_ROLE) whenNotPaused nonReentrant returns (uint256[] memory) {
        require(recipients.length == tokenURIs.length, "Array length mismatch");
        require(recipients.length <= 50, "Batch size too large");
        require(recipients.length > 0, "Empty batch");

        // 供給量チェック
        require(
            maxSupply == 0 || _nextTokenId + recipients.length - 1 <= maxSupply,
            "Batch exceeds max supply"
        );

        uint256[] memory tokenIds = new uint256[](recipients.length);

        for (uint256 i = 0; i < recipients.length; i++) {
            require(recipients[i] != address(0), "Cannot mint to zero address");

            uint256 tokenId = _nextTokenId++;
            _safeMint(recipients[i], tokenId);

            if (bytes(tokenURIs[i]).length > 0) {
                _setTokenURI(tokenId, tokenURIs[i]);
                isRevealed[tokenId] = true;
            }

            // 配布記録
            distributionRecords[tokenId] = DistributionRecord({
                recipient: recipients[i],
                tokenId: tokenId,
                timestamp: block.timestamp,
                distributionType: "automatic",
                triggerId: triggerId
            });

            tokenIds[i] = tokenId;
            totalDistributions++;
            automaticDistributionCount++;

            emit AutomaticDistribution(msg.sender, recipients[i], tokenId, triggerId);
            emit TokenMinted(recipients[i], tokenId, tokenURIs[i], "automatic");
        }

        return tokenIds;
    }

    /**
     * @notice 手動ミント（管理者のみ）
     * @dev 管理者による手動操作用
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

        // 配布記録
        distributionRecords[tokenId] = DistributionRecord({
            recipient: to,
            tokenId: tokenId,
            timestamp: block.timestamp,
            distributionType: "manual",
            triggerId: bytes32(0)
        });

        totalDistributions++;
        manualDistributionCount++;

        emit TokenMinted(to, tokenId, tokenURI, "manual");
        return tokenId;
    }

    /**
     * @notice バッチミント（管理者のみ）
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

            // 配布記録
            distributionRecords[tokenId] = DistributionRecord({
                recipient: recipients[i],
                tokenId: tokenId,
                timestamp: block.timestamp,
                distributionType: "manual",
                triggerId: bytes32(0)
            });

            totalDistributions++;
            manualDistributionCount++;

            emit TokenMinted(recipients[i], tokenId, tokenURIs[i], "manual");
        }
    }

    /**
     * @notice 有料ミント（パブリック）
     * @dev ユーザーによる直接ミント
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

        // 配布記録
        distributionRecords[tokenId] = DistributionRecord({
            recipient: msg.sender,
            tokenId: tokenId,
            timestamp: block.timestamp,
            distributionType: "public",
            triggerId: bytes32(0)
        });

        totalDistributions++;

        emit TokenMinted(msg.sender, tokenId, tokenURI, "public");
    }

    /**
     * @notice トークンURI更新（リビール機能）
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
     * @notice Distributorアドレス更新
     */
    function setDistributor(address newDistributor)
        external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(newDistributor != address(0), "Invalid distributor address");

        address oldDistributor = distributorAddress;

        // 古いDistributorのロールを取り消し
        if (oldDistributor != address(0)) {
            revokeRole(DISTRIBUTOR_ROLE, oldDistributor);
        }

        // 新しいDistributorにロール付与
        distributorAddress = newDistributor;
        _setupRole(DISTRIBUTOR_ROLE, newDistributor);

        emit DistributorUpdated(oldDistributor, newDistributor);
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
     * @notice 配布記録取得
     */
    function getDistributionRecord(uint256 tokenId)
        external view returns (DistributionRecord memory) {
        require(_exists(tokenId), "Token does not exist");
        return distributionRecords[tokenId];
    }

    /**
     * @notice 配布統計取得
     */
    function getDistributionStats() external view returns (
        uint256 total,
        uint256 automatic,
        uint256 manual,
        uint256 currentSupply
    ) {
        return (
            totalDistributions,
            automaticDistributionCount,
            manualDistributionCount,
            _nextTokenId - 1
        );
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
        bool isPaused,
        address currentDistributor
    ) {
        totalSupply = _nextTokenId - 1;
        currentMaxSupply = maxSupply;
        currentMintPrice = mintPrice;
        revenue = totalRevenue;
        isPublicMintEnabled = publicMintEnabled;
        isPaused = paused();
        currentDistributor = distributorAddress;
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
        return "RewardNFT v1.0.0 - Patent Compliant Design (Automatic Distribution Enabled)";
    }
}
