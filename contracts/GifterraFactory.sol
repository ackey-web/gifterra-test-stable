// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "./GifterraCore.sol";
import "./StandardNFT.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

/**
 * @title GifterraFactory
 * @notice ギフテラシステム（Core + StandardNFT）を同時生成するFactory
 * 
 * 【特許回避設計の原則】
 * ==================
 * 1. 各コントラクトを独立して生成（内部ロジック非共有）
 * 2. 自動処理なし、手動デプロイメントのみ
 * 3. データ参照関係のみ設定
 * 4. 特許対象機能（自動配布・状態フラグ・ランダム抽選）を分離
 * 
 * 【生成されるシステム構成】
 * - GifterraCore: SBT + 報酬配布システム（特許対象機能含む）
 * - StandardNFT: 通常NFT（譲渡可能、特許対象機能なし）
 * - 両者は完全独立、データ参照のみで連携
 */
contract GifterraFactory is Ownable, ReentrancyGuard {
    
    // システム情報構造体
    struct GifterraSystem {
        address gifterraCore;    // SBT + 報酬配布システム
        address standardNFT;     // 通常NFT（譲渡可能）
        address owner;           // システムオーナー
        string systemName;       // システム名
        uint256 createdAt;       // 作成日時
        bool isActive;           // アクティブ状態
    }
    
    // システム管理
    mapping(uint256 => GifterraSystem) public systems;
    mapping(address => uint256[]) public ownerSystems; // オーナー別システムID
    uint256 public nextSystemId;
    
    // Factory設定
    uint256 public creationFee;  // システム作成手数料
    address public feeRecipient; // 手数料受取人
    bool public isFactoryActive = true;
    
    // イベント
    event SystemCreated(
        uint256 indexed systemId,
        address indexed owner,
        address gifterraCore,
        address standardNFT,
        string systemName
    );
    
    event SystemStatusUpdated(uint256 indexed systemId, bool isActive);
    event CreationFeeUpdated(uint256 newFee);
    event FeeRecipientUpdated(address newRecipient);
    
    constructor(address _feeRecipient) {
        feeRecipient = _feeRecipient;
        nextSystemId = 1; // システムIDは1から開始
    }
    
    /**
     * @notice ギフテラシステムを作成（Core + StandardNFT）
     * @dev 【特許回避】各コントラクトを独立生成、自動連携なし
     * 
     * @param _systemName システム名
     * @param _nftName StandardNFTの名称
     * @param _nftSymbol StandardNFTのシンボル
     * @param _baseURI StandardNFTのベースURI
     * @param _maxSupply StandardNFTの最大供給量（0で無制限）
     * @param _mintPrice StandardNFTのミント価格
     * @return systemId 生成されたシステムID
     * @return coreAddress GifterraCoreのアドレス
     * @return nftAddress StandardNFTのアドレス
     */
    function createGifterraSystem(
        string memory _systemName,
        string memory _nftName,
        string memory _nftSymbol,
        string memory _baseURI,
        uint256 _maxSupply,
        uint256 _mintPrice
    ) external payable nonReentrant returns (
        uint256 systemId, 
        address coreAddress, 
        address nftAddress
    ) {
        require(isFactoryActive, "Factory is not active");
        require(bytes(_systemName).length > 0, "System name cannot be empty");
        require(bytes(_nftName).length > 0, "NFT name cannot be empty");
        require(bytes(_nftSymbol).length > 0, "NFT symbol cannot be empty");
        require(msg.value >= creationFee, "Insufficient creation fee");
        
        systemId = nextSystemId++;
        
        // 1. GifterraCore（SBT + 報酬配布）を生成
        // 【特許対象機能】このコントラクトには以下が含まれます：
        // - 請求項1: NFT属性に基づく報酬の自動配布、状態フラグ制御
        // - 請求項2: ランダム抽選による報酬選定
        // - 請求項3: NFT/GLB/トークンの自動配布
        GifterraCore core = new GifterraCore(_systemName, msg.sender);
        coreAddress = address(core);
        
        // 2. StandardNFT（通常NFT）を独立生成
        // 【特許回避】以下の原則で実装：
        // - 内部ロジック非共有
        // - 自動処理なし（手動操作のみ）
        // - 状態フラグ制御なし
        // - ランダム抽選なし
        // - 報酬配布機能なし
        StandardNFT nft = new StandardNFT(
            _nftName,
            _nftSymbol,
            _baseURI,
            msg.sender,
            coreAddress,  // 参照用アドレスのみ（処理連携なし）
            _maxSupply,
            _mintPrice
        );
        nftAddress = address(nft);
        
        // 3. 相互アドレス設定（データ参照のみ）
        // 【特許回避】読み取り専用、自動処理トリガーなし
        core.setStandardNFTAddress(nftAddress);
        
        // 4. システム情報保存
        systems[systemId] = GifterraSystem({
            gifterraCore: coreAddress,
            standardNFT: nftAddress,
            owner: msg.sender,
            systemName: _systemName,
            createdAt: block.timestamp,
            isActive: true
        });
        
        // 5. オーナー別インデックス更新
        ownerSystems[msg.sender].push(systemId);
        
        // 6. 手数料処理
        if (creationFee > 0 && msg.value > 0) {
            (bool success, ) = payable(feeRecipient).call{value: msg.value}("");
            require(success, "Fee transfer failed");
        }
        
        emit SystemCreated(systemId, msg.sender, coreAddress, nftAddress, _systemName);
    }
    
    /**
     * @notice システム情報取得
     */
    function getSystem(uint256 _systemId) external view returns (GifterraSystem memory) {
        require(_systemId > 0 && _systemId < nextSystemId, "Invalid system ID");
        return systems[_systemId];
    }
    
    /**
     * @notice オーナーのシステム一覧取得
     */
    function getOwnerSystems(address _owner) external view returns (uint256[] memory) {
        return ownerSystems[_owner];
    }
    
    /**
     * @notice アクティブなシステム数取得
     */
    function getActiveSystemsCount() external view returns (uint256 count) {
        for (uint256 i = 1; i < nextSystemId; i++) {
            if (systems[i].isActive) {
                count++;
            }
        }
    }
    
    /**
     * @notice システムのアクティブ状態変更（システムオーナーのみ）
     */
    function setSystemStatus(uint256 _systemId, bool _isActive) external {
        require(_systemId > 0 && _systemId < nextSystemId, "Invalid system ID");
        require(systems[_systemId].owner == msg.sender, "Not system owner");
        
        systems[_systemId].isActive = _isActive;
        emit SystemStatusUpdated(_systemId, _isActive);
    }
    
    /**
     * @notice Factory設定管理（オーナーのみ）
     */
    function setCreationFee(uint256 _newFee) external onlyOwner {
        creationFee = _newFee;
        emit CreationFeeUpdated(_newFee);
    }
    
    function setFeeRecipient(address _newRecipient) external onlyOwner {
        require(_newRecipient != address(0), "Invalid recipient");
        feeRecipient = _newRecipient;
        emit FeeRecipientUpdated(_newRecipient);
    }
    
    function setFactoryStatus(bool _isActive) external onlyOwner {
        isFactoryActive = _isActive;
    }
    
    /**
     * @notice 緊急時の資金引き出し（オーナーのみ）
     */
    function emergencyWithdraw() external onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "No funds to withdraw");
        
        (bool success, ) = payable(owner()).call{value: balance}("");
        require(success, "Withdrawal failed");
    }
    
    /**
     * @notice システム統計情報取得
     */
    function getFactoryStats() external view returns (
        uint256 totalSystems,
        uint256 activeSystems,
        uint256 totalFeeCollected,
        bool factoryActive
    ) {
        totalSystems = nextSystemId - 1;
        
        // アクティブシステム数計算
        for (uint256 i = 1; i < nextSystemId; i++) {
            if (systems[i].isActive) {
                activeSystems++;
            }
        }
        
        totalFeeCollected = address(this).balance;
        factoryActive = isFactoryActive;
    }
    
    /**
     * @notice バージョン情報
     */
    function version() external pure returns (string memory) {
        return "GifterraFactory v1.0.0 - Patent Safe Design";
    }
}