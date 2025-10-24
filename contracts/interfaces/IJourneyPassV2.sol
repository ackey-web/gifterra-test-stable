// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title IJourneyPassV2
 * @notice JourneyPass v2の最小インターフェース（ドラフト）
 *
 * 【概要】
 * - v1の全機能を継承
 * - 名前空間付きフラグ
 * - 有効期限/失効
 * - 証拠紐づけ
 * - EIP-712署名ベース更新
 */
interface IJourneyPassV2 {
    // ========================================
    // イベント（v2追加）
    // ========================================

    /**
     * @notice 名前空間付きフラグ更新イベント
     * @param namespace 名前空間
     * @param tokenId トークンID
     * @param bit ビット位置（0〜255）
     * @param value 設定値
     * @param operator 操作者
     * @param traceId トレース識別子
     * @param evidenceHash 証拠ハッシュ
     * @param validUntil 有効期限（Unix timestamp, 0=永続）
     */
    event FlagUpdatedNS(
        bytes32 indexed namespace,
        uint256 indexed tokenId,
        uint8 bit,
        bool value,
        address indexed operator,
        bytes32 traceId,
        bytes32 evidenceHash,
        uint64 validUntil
    );

    /**
     * @notice 名前空間付きフラグ失効イベント
     * @param namespace 名前空間
     * @param tokenId トークンID
     * @param bit ビット位置
     * @param operator 操作者
     * @param traceId トレース識別子
     * @param reasonHash 失効理由ハッシュ
     */
    event FlagRevokedNS(
        bytes32 indexed namespace,
        uint256 indexed tokenId,
        uint8 bit,
        address indexed operator,
        bytes32 traceId,
        bytes32 reasonHash
    );

    // ========================================
    // 名前空間付きフラグ更新（v2）
    // ========================================

    /**
     * @notice 名前空間付きフラグを更新
     * @param tokenId トークンID
     * @param namespace 名前空間
     * @param bit ビット位置
     * @param value 設定値
     * @param traceId トレース識別子
     * @param evidenceHash 証拠ハッシュ
     * @param validUntil 有効期限（0=永続）
     */
    function setFlagNS(
        uint256 tokenId,
        bytes32 namespace,
        uint8 bit,
        bool value,
        bytes32 traceId,
        bytes32 evidenceHash,
        uint64 validUntil
    ) external;

    /**
     * @notice 名前空間付きフラグを失効
     * @param tokenId トークンID
     * @param namespace 名前空間
     * @param bit ビット位置
     * @param traceId トレース識別子
     * @param reasonHash 失効理由ハッシュ
     */
    function revokeFlagNS(
        uint256 tokenId,
        bytes32 namespace,
        uint8 bit,
        bytes32 traceId,
        bytes32 reasonHash
    ) external;

    /**
     * @notice EIP-712署名を使用してフラグを更新
     * @param tokenId トークンID
     * @param namespace 名前空間
     * @param bit ビット位置
     * @param value 設定値
     * @param traceId トレース識別子
     * @param evidenceHash 証拠ハッシュ
     * @param validUntil 有効期限
     * @param deadline 署名の有効期限
     * @param v 署名パラメータ
     * @param r 署名パラメータ
     * @param s 署名パラメータ
     */
    function setFlagNSWithSig(
        uint256 tokenId,
        bytes32 namespace,
        uint8 bit,
        bool value,
        bytes32 traceId,
        bytes32 evidenceHash,
        uint64 validUntil,
        uint256 deadline,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external;

    // ========================================
    // View関数（v2）
    // ========================================

    /**
     * @notice 名前空間付きフラグを取得
     * @param tokenId トークンID
     * @param namespace 名前空間
     * @return flags フラグ（256ビット）
     */
    function flagsOfNS(uint256 tokenId, bytes32 namespace) external view returns (uint256);

    /**
     * @notice 特定ビットの名前空間付きフラグを確認
     * @param tokenId トークンID
     * @param namespace 名前空間
     * @param bit ビット位置
     * @return hasFlag フラグの状態
     */
    function hasFlagNS(uint256 tokenId, bytes32 namespace, uint8 bit) external view returns (bool);

    /**
     * @notice フラグの有効期限を取得
     * @param tokenId トークンID
     * @param namespace 名前空間
     * @param bit ビット位置
     * @return validUntil 有効期限（0=永続）
     */
    function validUntilNS(uint256 tokenId, bytes32 namespace, uint8 bit) external view returns (uint64);

    /**
     * @notice フラグが有効か確認（期限切れチェック含む）
     * @param tokenId トークンID
     * @param namespace 名前空間
     * @param bit ビット位置
     * @return isValid 有効状態
     */
    function isFlagValidNS(uint256 tokenId, bytes32 namespace, uint8 bit) external view returns (bool);

    /**
     * @notice 署名検証用のnonce取得
     * @param owner オーナーアドレス
     * @return nonce 現在のnonce
     */
    function nonces(address owner) external view returns (uint256);

    /**
     * @notice EIP-712ドメインセパレータを取得
     * @return domainSeparator ドメインセパレータ
     */
    function DOMAIN_SEPARATOR() external view returns (bytes32);
}
