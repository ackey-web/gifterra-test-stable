// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title GifterraCore
 * @notice ギフテラ本体システム（SBT + 報酬配布）
 * 
 * 【特許対象機能の明示】
 * ====================
 * このコントラクトには以下の特許請求項に該当する機能が含まれています：
 * 
 * 📋 請求項1: ユーザーから送信されたNFTまたはトークンの属性に基づいて、
 *           報酬コンテンツを自動的に配布する処理を備えたデジタル資産配布システム
 *           であって、送信元NFTに対して、状態フラグを付与または変更する機能
 * 
 * 🎲 請求項2: 報酬コンテンツが複数種類からランダムに選定される抽選ロジック
 * 
 * 🎁 請求項3: 報酬コンテンツがNFT、GLBファイル、トークンのいずれか
 * 
 * 【StandardNFTとの関係】
 * - StandardNFTアドレスを参照のみ（データ読み取り専用）
 * - 自動処理での連携なし
 * - 内部ロジック非共有
 * - 独立したコントラクトとして動作
 */
contract GifterraCore is ERC721, AccessControl, ReentrancyGuard, Pausable {
    
    // ロール定義
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant REWARD_DISTRIBUTOR_ROLE = keccak256("REWARD_DISTRIBUTOR_ROLE");
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");
    
    // 【特許対象】SBT（非譲渡NFT）関連
    mapping(uint256 => bool) public soulbound;          // SBT制御
    mapping(uint256 => uint8) public nftRank;           // ランク管理
    mapping(uint256 => bool) public statusFlag;         // 状態フラグ（請求項1対象）
    mapping(uint256 => uint256) public lastRewardTime;  // 最終報酬受取時刻
    
    // StandardNFTアドレス（参照専用）
    // 【特許回避】読み取り専用、自動処理連携なし、処理分離
    address public standardNFTAddress;
    
    // 【特許対象】報酬配布関連（請求項1,3）
    mapping(address => uint256) public lastClaimTime;
    mapping(uint256 => string) public glbRewardURIs;    // GLB報酬URL（請求項3）
    mapping(uint256 => bool) public hasReceivedReward;  // 報酬受取フラグ
    
    // 【特許対象】ランダム抽選設定（請求項2）
    struct RewardPool {
        uint256 nftRewardWeight;    // NFT報酬の重み
        uint256 glbRewardWeight;    // GLB報酬の重み
        uint256 tokenRewardWeight;  // トークン報酬の重み
        bool isActive;              // プール有効性
    }
    mapping(uint8 => RewardPool) public rewardPools; // ランク別報酬プール
    
    // トークン報酬設定
    IERC20 public rewardToken;
    uint256 public baseRewardAmount;
    
    // 統計情報
    uint256 public totalRewardsDistributed;
    uint256 public totalSBTMinted;
    
    // イベント定義
    event SBTMinted(address indexed to, uint256 indexed tokenId, uint8 rank);
    event RewardDistributed(
        address indexed user, 
        uint256 indexed tokenId,
        uint256 rewardType, 
        string content
    ); // 請求項1,3対象
    event StatusFlagUpdated(uint256 indexed tokenId, bool newStatus); // 請求項1対象
    event RandomRewardSelected(uint256 indexed tokenId, uint256 rewardType); // 請求項2対象
    event GLBRewardGenerated(uint256 indexed tokenId, string uri); // 請求項3対象
    event StandardNFTAddressSet(address indexed nftAddress);
    event RewardPoolUpdated(uint8 indexed rank, uint256 nft, uint256 glb, uint256 token);
    
    constructor(string memory _name, address _owner) ERC721(_name, "GIFTERRA") {
        require(_owner != address(0), "Owner cannot be zero address");
        
        _setupRole(DEFAULT_ADMIN_ROLE, _owner);
        _setupRole(MINTER_ROLE, _owner);
        _setupRole(REWARD_DISTRIBUTOR_ROLE, _owner);
        _setupRole(PAUSER_ROLE, _owner);
        
        // デフォルト報酬プール設定
        _setupDefaultRewardPools();
        
        baseRewardAmount = 1 ether; // デフォルト報酬量
    }
    
    /**
     * @notice StandardNFTアドレス設定（参照用のみ）
     * @dev 【特許回避】データ参照のみ、自動処理トリガーなし、処理連携なし
     * 
     * この機能は特許対象外の理由：
     * - アドレスの保存のみ
     * - 自動処理なし
     * - 状態変更なし
     * - 報酬配布トリガーなし
     */
    function setStandardNFTAddress(address _nftAddress) 
        external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(_nftAddress != address(0), "Invalid NFT address");
        standardNFTAddress = _nftAddress;
        emit StandardNFTAddressSet(_nftAddress);
    }
    
    /**
     * @notice SBTミント（非譲渡NFT発行）
     * @dev 【特許対象】非譲渡NFTの発行機能、ランク付与
     */
    function mintSBT(address to, uint8 rank) 
        external onlyRole(MINTER_ROLE) whenNotPaused nonReentrant 
        returns (uint256) {
        require(to != address(0), "Cannot mint to zero address");
        require(rank > 0 && rank <= 10, "Invalid rank");
        
        uint256 tokenId = totalSBTMinted + 1;
        _safeMint(to, tokenId);
        
        // 【特許対象】SBT設定とランク付与
        soulbound[tokenId] = true;  // SBT化
        nftRank[tokenId] = rank;    // ランク設定
        statusFlag[tokenId] = false;  // 初期状態フラグ
        
        totalSBTMinted++;
        
        emit SBTMinted(to, tokenId, rank);
        return tokenId;
    }
    
    /**
     * @notice 報酬配布（自動配布システム）
     * @dev 【特許対象】請求項1〜3の中核機能
     * 
     * 🔴 この機能は特許請求項の中核部分です：
     * - 請求項1: NFT属性（ランク）に基づく自動配布
     * - 請求項1: 状態フラグの付与・変更
     * - 請求項2: ランダム抽選による報酬選定
     * - 請求項3: NFT/GLB/トークンの自動配布
     */
    function distributeReward(address user, uint256 tokenId) 
        external onlyRole(REWARD_DISTRIBUTOR_ROLE) whenNotPaused nonReentrant {
        require(_exists(tokenId), "Token does not exist");
        require(ownerOf(tokenId) == user, "Not NFT owner");
        require(!hasReceivedReward[tokenId], "Already received reward");
        
        // 【特許対象】状態フラグ制御（請求項1）
        statusFlag[tokenId] = true;
        lastRewardTime[tokenId] = block.timestamp;
        emit StatusFlagUpdated(tokenId, true);
        
        // 【特許対象】NFT属性（ランク）に基づく処理（請求項1）
        uint8 rank = nftRank[tokenId];
        require(rewardPools[rank].isActive, "Reward pool not active");
        
        // 【特許対象】ランダム抽選（請求項2）
        uint256 rewardType = _randomRewardSelection(tokenId, rank);
        emit RandomRewardSelected(tokenId, rewardType);
        
        // 【特許対象】報酬の自動配布（請求項3）
        string memory rewardContent = "";
        if (rewardType == 1) {
            // NFT報酬配布
            rewardContent = _distributeNFTReward(user, tokenId);
        } else if (rewardType == 2) {
            // GLB報酬配布
            rewardContent = _distributeGLBReward(user, tokenId);
        } else if (rewardType == 3) {
            // トークン報酬配布
            rewardContent = _distributeTokenReward(user, tokenId, rank);
        }
        
        hasReceivedReward[tokenId] = true;
        totalRewardsDistributed++;
        
        emit RewardDistributed(user, tokenId, rewardType, rewardContent);
    }
    
    /**
     * @dev 【特許対象】ランダム選定ロジック（請求項2）
     * 
     * 🔴 この機能は請求項2の中核部分：
     * "報酬コンテンツが複数種類からランダムに選定される抽選ロジック"
     */
    function _randomRewardSelection(uint256 tokenId, uint8 rank) 
        internal view returns (uint256) {
        RewardPool memory pool = rewardPools[rank];
        
        // 重み付きランダム選択
        uint256 totalWeight = pool.nftRewardWeight + pool.glbRewardWeight + pool.tokenRewardWeight;
        require(totalWeight > 0, "No rewards configured");
        
        uint256 randomSeed = uint256(keccak256(abi.encodePacked(
            block.timestamp,
            block.difficulty,
            tokenId,
            msg.sender
        )));
        
        uint256 randomValue = randomSeed % totalWeight;
        
        if (randomValue < pool.nftRewardWeight) {
            return 1; // NFT報酬
        } else if (randomValue < pool.nftRewardWeight + pool.glbRewardWeight) {
            return 2; // GLB報酬
        } else {
            return 3; // トークン報酬
        }
    }
    
    /**
     * @dev 【特許対象】NFT報酬配布（請求項3）
     */
    function _distributeNFTReward(address user, uint256 tokenId) 
        internal returns (string memory) {
        // 追加SBTミント（報酬として）
        uint256 rewardTokenId = totalSBTMinted + 1;
        _safeMint(user, rewardTokenId);
        
        soulbound[rewardTokenId] = true;
        nftRank[rewardTokenId] = 1; // 報酬NFTは基本ランク
        totalSBTMinted++;
        
        return string(abi.encodePacked("Reward SBT #", _toString(rewardTokenId)));
    }
    
    /**
     * @dev 【特許対象】GLB報酬配布（請求項3）
     * 
     * 🔴 この機能は請求項3の対象：
     * "報酬コンテンツがGLBファイル"
     */
    function _distributeGLBReward(address user, uint256 tokenId) 
        internal returns (string memory) {
        // GLB報酬URL生成（実際の実装では外部APIを使用）
        string memory glbURI = string(abi.encodePacked(
            "https://rewards.gifterra.com/glb/",
            _toString(tokenId),
            ".glb"
        ));
        
        glbRewardURIs[tokenId] = glbURI;
        emit GLBRewardGenerated(tokenId, glbURI);
        
        return glbURI;
    }
    
    /**
     * @dev 【特許対象】トークン報酬配布（請求項3）
     */
    function _distributeTokenReward(address user, uint256 tokenId, uint8 rank) 
        internal returns (string memory) {
        if (address(rewardToken) == address(0)) {
            return "Token reward not configured";
        }
        
        // ランクに基づく報酬量計算
        uint256 rewardAmount = baseRewardAmount * rank;
        
        require(
            rewardToken.transferFrom(address(this), user, rewardAmount),
            "Token transfer failed"
        );
        
        return string(abi.encodePacked(
            _toString(rewardAmount),
            " tokens"
        ));
    }
    
    /**
     * @notice 報酬プール設定
     */
    function setRewardPool(
        uint8 rank,
        uint256 nftWeight,
        uint256 glbWeight,
        uint256 tokenWeight,
        bool isActive
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(rank > 0 && rank <= 10, "Invalid rank");
        
        rewardPools[rank] = RewardPool({
            nftRewardWeight: nftWeight,
            glbRewardWeight: glbWeight,
            tokenRewardWeight: tokenWeight,
            isActive: isActive
        });
        
        emit RewardPoolUpdated(rank, nftWeight, glbWeight, tokenWeight);
    }
    
    /**
     * @notice 報酬トークン設定
     */
    function setRewardToken(IERC20 _token, uint256 _baseAmount) 
        external onlyRole(DEFAULT_ADMIN_ROLE) {
        rewardToken = _token;
        baseRewardAmount = _baseAmount;
    }
    
    /**
     * @notice デフォルト報酬プール設定
     */
    function _setupDefaultRewardPools() internal {
        // ランク1-3: 基本報酬
        for (uint8 i = 1; i <= 3; i++) {
            rewardPools[i] = RewardPool({
                nftRewardWeight: 10,
                glbRewardWeight: 30,
                tokenRewardWeight: 60,
                isActive: true
            });
        }
        
        // ランク4-6: 中級報酬
        for (uint8 i = 4; i <= 6; i++) {
            rewardPools[i] = RewardPool({
                nftRewardWeight: 20,
                glbRewardWeight: 40,
                tokenRewardWeight: 40,
                isActive: true
            });
        }
        
        // ランク7-10: 上級報酬
        for (uint8 i = 7; i <= 10; i++) {
            rewardPools[i] = RewardPool({
                nftRewardWeight: 40,
                glbRewardWeight: 30,
                tokenRewardWeight: 30,
                isActive: true
            });
        }
    }
    
    /**
     * @notice 【特許対象】SBT転送禁止（非譲渡制御）
     */
    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 tokenId
    ) internal override whenNotPaused {
        // SBTの転送を禁止（ミントとバーンは除く）
        require(
            !soulbound[tokenId] || from == address(0) || to == address(0), 
            "SBT: Transfer not allowed"
        );
        super._beforeTokenTransfer(from, to, tokenId);
    }
    
    /**
     * @notice 統計情報取得
     */
    function getStats() external view returns (
        uint256 totalMinted,
        uint256 totalRewards,
        address standardNFT,
        address currentRewardToken,
        uint256 currentBaseReward
    ) {
        totalMinted = totalSBTMinted;
        totalRewards = totalRewardsDistributed;
        standardNFT = standardNFTAddress;
        currentRewardToken = address(rewardToken);
        currentBaseReward = baseRewardAmount;
    }
    
    /**
     * @notice トークン情報取得
     */
    function getTokenInfo(uint256 tokenId) external view returns (
        address owner,
        uint8 rank,
        bool isSoulbound,
        bool status,
        bool hasReward,
        uint256 lastReward,
        string memory glbURI
    ) {
        require(_exists(tokenId), "Token does not exist");
        
        owner = ownerOf(tokenId);
        rank = nftRank[tokenId];
        isSoulbound = soulbound[tokenId];
        status = statusFlag[tokenId];
        hasReward = hasReceivedReward[tokenId];
        lastReward = lastRewardTime[tokenId];
        glbURI = glbRewardURIs[tokenId];
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
     * @notice 文字列変換ユーティリティ
     */
    function _toString(uint256 value) internal pure returns (string memory) {
        if (value == 0) {
            return "0";
        }
        uint256 temp = value;
        uint256 digits;
        while (temp != 0) {
            digits++;
            temp /= 10;
        }
        bytes memory buffer = new bytes(digits);
        while (value != 0) {
            digits -= 1;
            buffer[digits] = bytes1(uint8(48 + uint256(value % 10)));
            value /= 10;
        }
        return string(buffer);
    }
    
    /**
     * @notice バージョン情報
     */
    function version() external pure returns (string memory) {
        return "GifterraCore v1.0.0 - Patent Protected System";
    }
}