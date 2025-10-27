// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * @title ScoreRegistry
 * @notice 二軸スコア（💸 Economic / 🔥 Resonance）のパラメータ管理とイベント発火
 *
 * 【目的】
 * - トークンの軸分類（Economic/Resonance）を管理
 * - 合成スコアのパラメータ（重み、カーブ）を管理
 * - スコアイベントの発火（インデクサが購読）
 * - 最小侵襲設計：既存コントラクトへのフック最小化
 *
 * 【軸の定義】
 * - 💸 Economic: JPYC等の法定価値系トークン（金銭的貢献）
 * - 🔥 Resonance: NHT等の応援系トークン or アクション（熱量・継続）
 *
 * 【合成スコア】
 * compositeScore = wE * economicScore + wR * f(resonanceScore)
 * - f(x): Linear, Sqrt, Log の選択可能な曲線
 *
 * 【イベント】
 * - ScoreIncremented: スコア加算時（インデクサが集計）
 * - ScoreParamsUpdated: パラメータ更新時（透明性）
 * - TokenAxisUpdated: トークン軸変更時
 * - MilestoneReached: マイルストーン達成時（オプション）
 */
contract ScoreRegistry is AccessControl {
    // ========================================
    // 定数
    // ========================================

    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant AXIS_ECONOMIC = keccak256("ECONOMIC");
    bytes32 public constant AXIS_RESONANCE = keccak256("RESONANCE");

    // ========================================
    // 型定義
    // ========================================

    enum Curve {
        Linear,   // f(x) = x
        Sqrt,     // f(x) = sqrt(x)
        Log       // f(x) = log(x+1)
    }

    // ========================================
    // 状態変数
    // ========================================

    // トークンアドレス → 軸（true=Economic, false=Resonance）
    mapping(address => bool) public isEconomicToken;

    // 合成スコアのパラメータ
    uint256 public weightEconomic = 100;     // 経済軸の重み（Basis Points: 100 = 1.0）
    uint256 public weightResonance = 100;    // 共鳴軸の重み
    Curve public resonanceCurve = Curve.Sqrt; // 共鳴軸の曲線

    // スコア保存（オプション：インデクサ集計を優先する場合は不要）
    mapping(address => uint256) public economicScore;
    mapping(address => uint256) public resonanceScore;

    // ========================================
    // イベント
    // ========================================

    /**
     * @notice スコア加算イベント（インデクサが購読）
     * @param user ユーザーアドレス
     * @param token トークンアドレス（アクションの場合は address(0)）
     * @param amountRaw 生の数値（トークンは最小単位、アクションは回数）
     * @param axis 軸識別子（ECONOMIC or RESONANCE）
     * @param traceId トランザクション追跡用ID
     */
    event ScoreIncremented(
        address indexed user,
        address indexed token,
        uint256 amountRaw,
        bytes32 axis,
        bytes32 indexed traceId
    );

    /**
     * @notice パラメータ更新イベント
     * @param weightEconomic 経済軸の重み
     * @param weightResonance 共鳴軸の重み
     * @param curve 共鳴軸の曲線
     * @param timestamp 更新タイムスタンプ
     */
    event ScoreParamsUpdated(
        uint256 weightEconomic,
        uint256 weightResonance,
        Curve curve,
        uint256 timestamp
    );

    /**
     * @notice トークン軸変更イベント
     * @param token トークンアドレス
     * @param isEconomic true=Economic, false=Resonance
     * @param timestamp 更新タイムスタンプ
     */
    event TokenAxisUpdated(
        address indexed token,
        bool isEconomic,
        uint256 timestamp
    );

    /**
     * @notice マイルストーン達成イベント（オプション）
     * @param user ユーザーアドレス
     * @param axis 軸識別子
     * @param level 達成レベル
     * @param milestoneName マイルストーン名
     * @param timestamp タイムスタンプ
     */
    event MilestoneReached(
        address indexed user,
        bytes32 axis,
        uint256 level,
        string milestoneName,
        uint256 timestamp
    );

    // ========================================
    // コンストラクタ
    // ========================================

    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ADMIN_ROLE, msg.sender);
    }

    // ========================================
    // 軸管理機能
    // ========================================

    /**
     * @notice トークンの軸を設定
     * @param token トークンアドレス
     * @param isEconomic true=Economic, false=Resonance
     */
    function setTokenAxis(address token, bool isEconomic) external onlyRole(ADMIN_ROLE) {
        require(token != address(0), "Invalid token address");

        isEconomicToken[token] = isEconomic;

        emit TokenAxisUpdated(token, isEconomic, block.timestamp);
    }

    /**
     * @notice 複数トークンの軸を一括設定
     * @param tokens トークンアドレス配列
     * @param isEconomicList 軸設定配列
     */
    function setTokenAxesBatch(
        address[] calldata tokens,
        bool[] calldata isEconomicList
    ) external onlyRole(ADMIN_ROLE) {
        require(tokens.length == isEconomicList.length, "Length mismatch");

        for (uint256 i = 0; i < tokens.length; i++) {
            require(tokens[i] != address(0), "Invalid token address");
            isEconomicToken[tokens[i]] = isEconomicList[i];
            emit TokenAxisUpdated(tokens[i], isEconomicList[i], block.timestamp);
        }
    }

    // ========================================
    // パラメータ管理機能
    // ========================================

    /**
     * @notice 合成スコアのパラメータを更新
     * @param _weightEconomic 経済軸の重み（Basis Points）
     * @param _weightResonance 共鳴軸の重み（Basis Points）
     * @param _curve 共鳴軸の曲線
     */
    function updateScoreParams(
        uint256 _weightEconomic,
        uint256 _weightResonance,
        Curve _curve
    ) external onlyRole(ADMIN_ROLE) {
        require(_weightEconomic > 0, "Economic weight must be > 0");
        require(_weightResonance > 0, "Resonance weight must be > 0");

        weightEconomic = _weightEconomic;
        weightResonance = _weightResonance;
        resonanceCurve = _curve;

        emit ScoreParamsUpdated(
            _weightEconomic,
            _weightResonance,
            _curve,
            block.timestamp
        );
    }

    // ========================================
    // スコア記録機能
    // ========================================

    /**
     * @notice スコアを記録してイベントを発火
     * @param user ユーザーアドレス
     * @param token トークンアドレス（アクションの場合は address(0)）
     * @param amountRaw 生の数値
     * @param traceId トランザクション追跡用ID
     *
     * @dev 他のコントラクトから呼び出し可能（public）
     *      権限チェックは呼び出し側で実施すること
     */
    function recordScore(
        address user,
        address token,
        uint256 amountRaw,
        bytes32 traceId
    ) external {
        require(user != address(0), "Invalid user address");
        require(amountRaw > 0, "Amount must be > 0");

        // 軸判定
        bytes32 axis;
        if (token == address(0)) {
            // アクション系は常にResonance
            axis = AXIS_RESONANCE;
        } else {
            // トークンは設定に基づく
            axis = isEconomicToken[token] ? AXIS_ECONOMIC : AXIS_RESONANCE;
        }

        // スコア加算（オプション：インデクサ集計のみでもOK）
        if (axis == AXIS_ECONOMIC) {
            economicScore[user] += amountRaw;
        } else {
            resonanceScore[user] += amountRaw;
        }

        // イベント発火
        emit ScoreIncremented(user, token, amountRaw, axis, traceId);
    }

    /**
     * @notice バッチでスコアを記録
     * @param users ユーザーアドレス配列
     * @param tokens トークンアドレス配列
     * @param amounts 数値配列
     * @param traceIds トレースID配列
     */
    function recordScoreBatch(
        address[] calldata users,
        address[] calldata tokens,
        uint256[] calldata amounts,
        bytes32[] calldata traceIds
    ) external {
        require(
            users.length == tokens.length &&
            users.length == amounts.length &&
            users.length == traceIds.length,
            "Length mismatch"
        );

        for (uint256 i = 0; i < users.length; i++) {
            recordScore(users[i], tokens[i], amounts[i], traceIds[i]);
        }
    }

    // ========================================
    // ビュー関数
    // ========================================

    /**
     * @notice トークンの軸を取得
     * @param token トークンアドレス
     * @return axis 軸識別子
     */
    function getTokenAxis(address token) external view returns (bytes32) {
        if (token == address(0)) {
            return AXIS_RESONANCE;
        }
        return isEconomicToken[token] ? AXIS_ECONOMIC : AXIS_RESONANCE;
    }

    /**
     * @notice ユーザーのスコアを取得
     * @param user ユーザーアドレス
     * @return economic 経済スコア
     * @return resonance 共鳴スコア
     */
    function getScores(address user) external view returns (uint256 economic, uint256 resonance) {
        return (economicScore[user], resonanceScore[user]);
    }

    /**
     * @notice 現在のパラメータを取得
     * @return wE 経済軸の重み
     * @return wR 共鳴軸の重み
     * @return curve 共鳴軸の曲線
     */
    function getParams() external view returns (uint256 wE, uint256 wR, Curve curve) {
        return (weightEconomic, weightResonance, resonanceCurve);
    }

    /**
     * @notice 合成スコアを計算（ビュー関数・参考値）
     * @param user ユーザーアドレス
     * @return composite 合成スコア
     *
     * @dev 実際の合成スコアはインデクサ側で精密に計算
     *      これは参考値のみ（曲線適用は簡易版）
     */
    function getCompositeScore(address user) external view returns (uint256 composite) {
        uint256 eScore = economicScore[user];
        uint256 rScore = resonanceScore[user];

        // 簡易的な合成（正確な計算はインデクサ側で実施）
        uint256 rAdjusted = rScore;
        if (resonanceCurve == Curve.Sqrt && rScore > 0) {
            // 簡易sqrt（精度低）
            rAdjusted = sqrt(rScore);
        }
        // Log曲線はオンチェーンでは実装しない（インデクサ側で処理）

        composite = (eScore * weightEconomic + rAdjusted * weightResonance) / 100;
    }

    // ========================================
    // 内部関数
    // ========================================

    /**
     * @notice 平方根の簡易実装（Babylonian method）
     * @param x 入力値
     * @return y 平方根
     */
    function sqrt(uint256 x) internal pure returns (uint256 y) {
        if (x == 0) return 0;
        uint256 z = (x + 1) / 2;
        y = x;
        while (z < y) {
            y = z;
            z = (x / z + z) / 2;
        }
    }
}
