// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "./JourneyPass.sol";
import "./interfaces/IJourneyPassV2.sol";

/**
 * @title JourneyPassV2 (DRAFT - 本番未使用)
 * @notice 汎用フラグNFT v2（名前空間・有効期限・証拠・署名対応）
 *
 * ⚠️ ドラフト実装 ⚠️
 * - 本番デプロイ前にレビュー・監査必須
 * - v1との後方互換性維持
 * - 既存コントラクトへの影響なし
 *
 * 【v1からの追加機能】
 * 1. 名前空間付きフラグ（namespace + bit）
 * 2. 有効期限/失効機能
 * 3. 証拠ハッシュの記録
 * 4. EIP-712署名ベース更新
 * 5. namespace毎の権限分割（オプション）
 *
 * 【v1互換性】
 * - v1のAPI（setFlag, flagsOf等）を全て継承
 * - v1のイベント（FlagUpdated等）を継続サポート
 * - v1のストレージ（_flags）を保持
 *
 * 【バージョン履歴】
 * v2.0.0-draft (ドラフト):
 * - 名前空間付きフラグ実装
 * - 有効期限・失効機能
 * - EIP-712署名ベース更新
 * - 証拠ハッシュ記録
 */
contract JourneyPassV2 is JourneyPass, IJourneyPassV2 {
    // ========================================
    // EIP-712 型定義
    // ========================================

    bytes32 private constant _TYPE_HASH =
        keccak256(
            "EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"
        );

    bytes32 private constant _SET_FLAG_NS_TYPEHASH =
        keccak256(
            "SetFlagNS(uint256 tokenId,bytes32 namespace,uint8 bit,bool value,bytes32 traceId,bytes32 evidenceHash,uint64 validUntil,uint256 nonce,uint256 deadline)"
        );

    // ========================================
    // ストレージ（v2追加）
    // ========================================

    /// @notice 名前空間付きフラグ: tokenId => namespace => flags
    mapping(uint256 => mapping(bytes32 => uint256)) private _flagsNS;

    /// @notice フラグの有効期限: tokenId => namespace => bit => validUntil
    /// @dev 0 = 永続、それ以外 = Unix timestamp
    mapping(uint256 => mapping(bytes32 => mapping(uint8 => uint64))) private _validUntilNS;

    /// @notice フラグの証拠ハッシュ: tokenId => namespace => bit => evidenceHash
    mapping(uint256 => mapping(bytes32 => mapping(uint8 => bytes32))) private _evidenceHashNS;

    /// @notice 署名用nonce: owner => nonce（リプレイ攻撃防止）
    mapping(address => uint256) private _nonces;

    /// @notice EIP-712ドメインセパレータ（キャッシュ）
    bytes32 private _cachedDomainSeparator;
    uint256 private _cachedChainId;
    address private _cachedThis;

    /// @notice namespace毎のsetter権限（オプション機能）
    /// @dev namespace => account => allowed
    mapping(bytes32 => mapping(address => bool)) private _namespaceSetter;

    // ========================================
    // コンストラクタ
    // ========================================

    constructor(
        string memory name,
        string memory symbol,
        string memory baseURI,
        address owner,
        uint256 _maxSupply
    ) JourneyPass(name, symbol, baseURI, owner, _maxSupply) {
        _cachedDomainSeparator = _buildDomainSeparator();
        _cachedChainId = block.chainid;
        _cachedThis = address(this);
    }

    // ========================================
    // 名前空間付きフラグ更新（v2）
    // ========================================

    /**
     * @notice 名前空間付きフラグを更新
     * @dev FLAG_SETTER_ROLE のみ実行可能
     */
    function setFlagNS(
        uint256 tokenId,
        bytes32 namespace,
        uint8 bit,
        bool value,
        bytes32 traceId,
        bytes32 evidenceHash,
        uint64 validUntil
    ) external override onlyRole(FLAG_SETTER_ROLE) whenNotPaused nonReentrant {
        _requireOwned(tokenId);
        require(namespace != bytes32(0), "Invalid namespace");

        // フラグ更新
        if (value) {
            _flagsNS[tokenId][namespace] |= (1 << bit);
        } else {
            _flagsNS[tokenId][namespace] &= ~(1 << bit);
        }

        // 有効期限設定
        if (validUntil > 0) {
            _validUntilNS[tokenId][namespace][bit] = validUntil;
        }

        // 証拠ハッシュ設定
        if (evidenceHash != bytes32(0)) {
            _evidenceHashNS[tokenId][namespace][bit] = evidenceHash;
        }

        emit FlagUpdatedNS(
            namespace,
            tokenId,
            bit,
            value,
            msg.sender,
            traceId,
            evidenceHash,
            validUntil
        );
        emit MetadataUpdate(tokenId); // EIP-4906
    }

    /**
     * @notice 名前空間付きフラグを失効
     * @dev FLAG_SETTER_ROLE のみ実行可能
     */
    function revokeFlagNS(
        uint256 tokenId,
        bytes32 namespace,
        uint8 bit,
        bytes32 traceId,
        bytes32 reasonHash
    ) external override onlyRole(FLAG_SETTER_ROLE) whenNotPaused nonReentrant {
        _requireOwned(tokenId);
        require(namespace != bytes32(0), "Invalid namespace");

        // フラグをクリア
        _flagsNS[tokenId][namespace] &= ~(1 << bit);

        // 有効期限を0にリセット
        _validUntilNS[tokenId][namespace][bit] = 0;

        emit FlagRevokedNS(
            namespace,
            tokenId,
            bit,
            msg.sender,
            traceId,
            reasonHash
        );
        emit MetadataUpdate(tokenId); // EIP-4906
    }

    /**
     * @notice EIP-712署名を使用してフラグを更新
     * @dev 署名検証後にフラグを更新（リプレイ攻撃防止）
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
    ) external override whenNotPaused nonReentrant {
        require(block.timestamp <= deadline, "Signature expired");
        _requireOwned(tokenId);

        address owner = ownerOf(tokenId);
        uint256 nonce = _nonces[owner]++;

        // EIP-712ハッシュ構築
        bytes32 structHash = keccak256(
            abi.encode(
                _SET_FLAG_NS_TYPEHASH,
                tokenId,
                namespace,
                bit,
                value,
                traceId,
                evidenceHash,
                validUntil,
                nonce,
                deadline
            )
        );

        bytes32 digest = keccak256(
            abi.encodePacked("\x19\x01", DOMAIN_SEPARATOR(), structHash)
        );

        // 署名検証
        address signer = ecrecover(digest, v, r, s);
        require(signer == owner, "Invalid signature");
        require(signer != address(0), "Invalid signature");

        // フラグ更新
        if (value) {
            _flagsNS[tokenId][namespace] |= (1 << bit);
        } else {
            _flagsNS[tokenId][namespace] &= ~(1 << bit);
        }

        // 有効期限設定
        if (validUntil > 0) {
            _validUntilNS[tokenId][namespace][bit] = validUntil;
        }

        // 証拠ハッシュ設定
        if (evidenceHash != bytes32(0)) {
            _evidenceHashNS[tokenId][namespace][bit] = evidenceHash;
        }

        emit FlagUpdatedNS(
            namespace,
            tokenId,
            bit,
            value,
            signer,
            traceId,
            evidenceHash,
            validUntil
        );
        emit MetadataUpdate(tokenId); // EIP-4906
    }

    // ========================================
    // View関数（v2）
    // ========================================

    /**
     * @notice 名前空間付きフラグを取得
     */
    function flagsOfNS(uint256 tokenId, bytes32 namespace)
        external
        view
        override
        returns (uint256)
    {
        _requireOwned(tokenId);
        return _flagsNS[tokenId][namespace];
    }

    /**
     * @notice 特定ビットの名前空間付きフラグを確認
     */
    function hasFlagNS(uint256 tokenId, bytes32 namespace, uint8 bit)
        external
        view
        override
        returns (bool)
    {
        _requireOwned(tokenId);
        return (_flagsNS[tokenId][namespace] & (1 << bit)) != 0;
    }

    /**
     * @notice フラグの有効期限を取得
     */
    function validUntilNS(uint256 tokenId, bytes32 namespace, uint8 bit)
        external
        view
        override
        returns (uint64)
    {
        _requireOwned(tokenId);
        return _validUntilNS[tokenId][namespace][bit];
    }

    /**
     * @notice フラグが有効か確認（期限切れチェック含む）
     */
    function isFlagValidNS(uint256 tokenId, bytes32 namespace, uint8 bit)
        external
        view
        override
        returns (bool)
    {
        _requireOwned(tokenId);

        // フラグが立っているか確認
        bool hasFlag = (_flagsNS[tokenId][namespace] & (1 << bit)) != 0;
        if (!hasFlag) return false;

        // 有効期限チェック
        uint64 validUntil = _validUntilNS[tokenId][namespace][bit];
        if (validUntil == 0) return true; // 永続

        return block.timestamp <= validUntil;
    }

    /**
     * @notice 署名検証用のnonce取得
     */
    function nonces(address owner) external view override returns (uint256) {
        return _nonces[owner];
    }

    /**
     * @notice EIP-712ドメインセパレータを取得
     */
    function DOMAIN_SEPARATOR() public view override returns (bytes32) {
        if (
            address(this) == _cachedThis &&
            block.chainid == _cachedChainId
        ) {
            return _cachedDomainSeparator;
        } else {
            return _buildDomainSeparator();
        }
    }

    // ========================================
    // 内部関数
    // ========================================

    /**
     * @notice ドメインセパレータを構築
     */
    function _buildDomainSeparator() private view returns (bytes32) {
        return
            keccak256(
                abi.encode(
                    _TYPE_HASH,
                    keccak256(bytes("JourneyPassV2")),
                    keccak256(bytes("2")),
                    block.chainid,
                    address(this)
                )
            );
    }

    // ========================================
    // namespace毎の権限管理（オプション）
    // ========================================

    /**
     * @notice namespace毎のsetter権限を設定
     * @dev DEFAULT_ADMIN_ROLE のみ実行可能
     * @param namespace 名前空間
     * @param account アカウント
     * @param allowed 許可フラグ
     */
    function setNamespaceSetter(
        bytes32 namespace,
        address account,
        bool allowed
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _namespaceSetter[namespace][account] = allowed;
    }

    /**
     * @notice namespace毎のsetter権限を確認
     * @param namespace 名前空間
     * @param account アカウント
     * @return allowed 許可フラグ
     */
    function isNamespaceSetter(bytes32 namespace, address account)
        external
        view
        returns (bool)
    {
        return _namespaceSetter[namespace][account];
    }

    // ========================================
    // オーバーライド
    // ========================================

    /**
     * @notice バージョン情報
     */
    function version() external pure override returns (string memory) {
        return "JourneyPassV2 v2.0.0-draft - Namespaced Flagged NFT (DRAFT - NOT FOR PRODUCTION)";
    }

    // ========================================
    // 将来の拡張予告（v2.1以降）
    // ========================================

    /**
     * @dev 【v2.1以降で検討】転送ロック機能
     *
     * v2では transferLockEnabled を継承しているが、
     * 実際の転送制御は実装していない（v1と同様）。
     *
     * v2.1での実装例：
     * - namespace毎の完了条件（requiredMaskNS[namespace]）
     * - 全namespace横断の条件
     * - _beforeTokenTransfer() をオーバーライドして制御
     */

    /**
     * @dev 【v2.1以降で検討】namespace毎の進捗計算
     *
     * 提案インターフェース（実装しない）：
     * - progressOfNS(tokenId, namespace) returns (uint256 setBits, uint256 totalBits)
     * - isCompletedNS(tokenId, namespace) returns (bool)
     */

    /**
     * @dev 【v2.1以降で検討】証拠URI
     *
     * 現在は evidenceHash のみ。
     * v2.1では off-chain URIとの紐付けを追加。
     *
     * 提案インターフェース（実装しない）：
     * - setEvidenceURI(tokenId, namespace, bit, string uri)
     * - getEvidenceURI(tokenId, namespace, bit) returns (string uri)
     */
}
