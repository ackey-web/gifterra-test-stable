# JourneyPass v2.0.0 仕様書（ドラフト）

⚠️ **本ドキュメントはドラフトです** ⚠️

- 本番デプロイ前にレビュー・監査必須
- v1との後方互換性を最優先
- 破壊的変更は一切行わない

## 概要

JourneyPass v2は、v1の全機能を継承しつつ、以下の拡張機能を追加した汎用フラグNFTです。

### v1からの追加機能

1. **名前空間付きフラグ** - 複数のスタンプラリー/証明書タイプを同一トークンで管理
2. **有効期限/失効** - フラグに有効期限を設定、または失効可能
3. **証拠ハッシュ** - フラグ設定時に証拠ハッシュを記録
4. **EIP-712署名ベース更新** - オフチェーン署名によるフラグ更新
5. **namespace毎の権限分割** - namespace単位でsetter権限を管理

## 用語定義

### Namespace（名前空間）

フラグの論理的なグループ。例：

- `keccak256("StampRally2024")` - 2024年スタンプラリー
- `keccak256("KYCVerification")` - KYC検証
- `keccak256("ContractSignature")` - 契約署名

### Bit（ビット）

namespace内の個別フラグ位置（0〜255）。

### Flag（フラグ）

namespace + bitの組み合わせで一意に識別される状態（true/false）。

### Evidence（証拠）

フラグ設定時に記録される証拠ハッシュ。写真、文書、署名等のハッシュ値。

### Expiry（有効期限）

フラグの有効期限（Unix timestamp）。0の場合は永続。

### Revocation（失効）

一度設定したフラグを取り消す操作。失効理由を記録可能。

### TraceId（トレースID）

フラグ更新の追跡用識別子（NFC ID、注文ID、トランザクションID等）。

## API一覧

### v1 API（継続サポート）

v1の全APIを継承し、動作を保証します。

#### ミント

```solidity
function mint(address to) external returns (uint256);
function mintBatch(address[] calldata recipients) external returns (uint256[] memory);
```

#### フラグ更新（v1形式）

```solidity
function setFlag(uint256 tokenId, uint8 bit, bool value, bytes32 traceId) external;
function setFlagsByMask(uint256 tokenId, uint256 setMask, uint256 clearMask, bytes32 traceId) external;
```

#### View関数（v1形式）

```solidity
function flagsOf(uint256 tokenId) external view returns (uint256);
function hasFlag(uint256 tokenId, uint8 bit) external view returns (bool);
function progressOf(uint256 tokenId) external view returns (uint256 setBits, uint256 totalBits);
function isCompleted(uint256 tokenId) external view returns (bool);
```

### v2 API（追加）

#### 名前空間付きフラグ更新

```solidity
/**
 * @notice 名前空間付きフラグを更新
 * @param tokenId トークンID
 * @param namespace 名前空間
 * @param bit ビット位置（0〜255）
 * @param value 設定値
 * @param traceId トレース識別子
 * @param evidenceHash 証拠ハッシュ（0の場合は記録しない）
 * @param validUntil 有効期限（0=永続、それ以外=Unix timestamp）
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
```

#### フラグ失効

```solidity
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
```

#### EIP-712署名ベース更新

```solidity
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
```

#### View関数（v2）

```solidity
// 名前空間付きフラグ取得
function flagsOfNS(uint256 tokenId, bytes32 namespace) external view returns (uint256);

// 特定ビット確認
function hasFlagNS(uint256 tokenId, bytes32 namespace, uint8 bit) external view returns (bool);

// 有効期限取得
function validUntilNS(uint256 tokenId, bytes32 namespace, uint8 bit) external view returns (uint64);

// 有効性確認（期限切れチェック含む）
function isFlagValidNS(uint256 tokenId, bytes32 namespace, uint8 bit) external view returns (bool);

// 署名用nonce取得
function nonces(address owner) external view returns (uint256);

// EIP-712ドメインセパレータ
function DOMAIN_SEPARATOR() external view returns (bytes32);
```

## イベント

### v1イベント（継続）

```solidity
event FlagUpdated(
    uint256 indexed tokenId,
    uint8 indexed bit,
    bool value,
    address indexed operator,
    bytes32 traceId
);

event FlagsBatchUpdated(
    uint256 indexed tokenId,
    uint256 setMask,
    uint256 clearMask,
    address indexed operator,
    bytes32 traceId
);
```

### v2イベント（追加）

```solidity
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

event FlagRevokedNS(
    bytes32 indexed namespace,
    uint256 indexed tokenId,
    uint8 bit,
    address indexed operator,
    bytes32 traceId,
    bytes32 reasonHash
);
```

## 権限モデル

### ロール（v1から継承）

| ロール | 権限 |
|--------|------|
| DEFAULT_ADMIN_ROLE | ロール管理、設定変更 |
| MINTER_ROLE | トークン発行 |
| FLAG_SETTER_ROLE | フラグ更新・失効 |
| PAUSER_ROLE | 緊急停止 |

### namespace毎の権限（v2追加）

```solidity
// namespace毎のsetter権限を設定
function setNamespaceSetter(bytes32 namespace, address account, bool allowed) external;

// namespace毎のsetter権限を確認
function isNamespaceSetter(bytes32 namespace, address account) external view returns (bool);
```

## 移行方針（v1→v2）

### 破壊的変更なし

- v1のAPIは全て動作継続
- v1のストレージ（`_flags`）は保持
- v1のイベントは継続発火
- v2はv1の上位互換

### 段階的移行

1. **Phase 1**: v2デプロイ（本番未使用）
2. **Phase 2**: バックエンドでv2 APIテスト
3. **Phase 3**: 一部機能でv2 API使用開始
4. **Phase 4**: 全機能でv2 API移行
5. **Phase 5**: v1 API廃止検討（将来）

### 互換性テーブル

| 機能 | v1 | v2 | 備考 |
|------|----|----|------|
| ミント | ✅ | ✅ | 同一API |
| フラグ更新（単一namespace） | ✅ | ✅ | v1 API継続サポート |
| フラグ更新（複数namespace） | ❌ | ✅ | v2で追加 |
| 有効期限 | ❌ | ✅ | v2で追加 |
| 失効 | ❌ | ✅ | v2で追加 |
| 証拠ハッシュ | ❌ | ✅ | v2で追加 |
| EIP-712署名 | ❌ | ✅ | v2で追加 |

## ユースケース

### 1. スタンプラリー（v1互換）

```solidity
// v1形式（継続サポート）
journeyPass.setFlag(tokenId, 0, true, keccak256("nfc-checkpoint-001"));

// v2形式（推奨）
journeyPass.setFlagNS(
    tokenId,
    keccak256("StampRally2024"),
    0,
    true,
    keccak256("nfc-checkpoint-001"),
    bytes32(0), // no evidence
    0           // permanent
);
```

### 2. 複数スタンプラリーの並行管理

```solidity
// 2024年スタンプラリー
journeyPass.setFlagNS(
    tokenId,
    keccak256("StampRally2024"),
    0,
    true,
    keccak256("nfc-001"),
    bytes32(0),
    0
);

// 2025年スタンプラリー（同一トークンで別namespace）
journeyPass.setFlagNS(
    tokenId,
    keccak256("StampRally2025"),
    0,
    true,
    keccak256("nfc-001"),
    bytes32(0),
    0
);
```

### 3. KYC検証（有効期限付き）

```solidity
// KYC検証フラグ（1年間有効）
uint64 validUntil = uint64(block.timestamp + 365 days);

journeyPass.setFlagNS(
    tokenId,
    keccak256("KYCVerification"),
    0, // bit 0: ID確認
    true,
    keccak256("kyc-session-123"),
    keccak256("document-hash"), // 証拠ハッシュ
    validUntil
);
```

### 4. 契約ワークフロー

```solidity
bytes32 contractNS = keccak256("ContractSignature");

// 当事者A署名
journeyPass.setFlagNS(tokenId, contractNS, 0, true, traceId, evidenceHash, 0);

// 当事者B署名
journeyPass.setFlagNS(tokenId, contractNS, 1, true, traceId, evidenceHash, 0);

// 監査人承認
journeyPass.setFlagNS(tokenId, contractNS, 2, true, traceId, evidenceHash, 0);

// 全員署名完了チェック
bool allSigned = journeyPass.hasFlagNS(tokenId, contractNS, 0) &&
                 journeyPass.hasFlagNS(tokenId, contractNS, 1) &&
                 journeyPass.hasFlagNS(tokenId, contractNS, 2);
```

### 5. EIP-712署名による委任

```solidity
// オフチェーンで署名生成
const domain = {
    name: 'JourneyPassV2',
    version: '2',
    chainId: chainId,
    verifyingContract: contractAddress
};

const types = {
    SetFlagNS: [
        { name: 'tokenId', type: 'uint256' },
        { name: 'namespace', type: 'bytes32' },
        { name: 'bit', type: 'uint8' },
        { name: 'value', type: 'bool' },
        { name: 'traceId', type: 'bytes32' },
        { name: 'evidenceHash', type: 'bytes32' },
        { name: 'validUntil', type: 'uint64' },
        { name: 'nonce', type: 'uint256' },
        { name: 'deadline', type: 'uint256' }
    ]
};

const value = { tokenId, namespace, bit, value, traceId, evidenceHash, validUntil, nonce, deadline };
const signature = await signer._signTypedData(domain, types, value);
const { v, r, s } = ethers.utils.splitSignature(signature);

// オンチェーンで署名検証+実行
await journeyPass.setFlagNSWithSig(tokenId, namespace, bit, value, traceId, evidenceHash, validUntil, deadline, v, r, s);
```

## セキュリティ考慮事項

### EIP-712署名

- **リプレイ攻撃防止**: nonceを使用
- **期限チェック**: deadlineで署名の有効期限を設定
- **チェーンID検証**: ドメインセパレータに含まれる
- **署名検証**: ecrecoverで厳密に検証

### 有効期限

- **期限切れチェック**: `isFlagValidNS()`で自動判定
- **失効**: `revokeFlagNS()`で明示的に取り消し可能

### 権限管理

- **ロールベース**: v1と同様のAccessControl
- **namespace毎の権限**: より細かい権限分割（オプション）

## ガス最適化

- **ビット操作**: フラグを効率的に管理
- **ドメインセパレータキャッシュ**: 同一チェーンではキャッシュを使用
- **nonce管理**: owner単位でnonce管理（tokenId単位よりも効率的）

## 制限事項（v2.0.0-draft）

### 未実装機能

1. **転送ロック**: v1と同様に未実装（v2.1で検討）
2. **namespace毎の進捗計算**: `progressOfNS()`未実装
3. **証拠URI**: evidenceHashのみ（URIは off-chain）

### 既知の制約

1. **namespace数**: 無制限だがガスコストに注意
2. **ビット数**: namespace毎に256ビット
3. **有効期限精度**: uint64（2038年問題なし、2106年まで対応）

## 将来の拡張（v2.1以降）

### namespace毎の転送ロック

```solidity
// v2.1提案
function setRequiredMaskNS(bytes32 namespace, uint256 mask) external;
function isCompletedNS(uint256 tokenId, bytes32 namespace) external view returns (bool);
```

### 証拠URI

```solidity
// v2.1提案
function setEvidenceURI(uint256 tokenId, bytes32 namespace, uint8 bit, string memory uri) external;
function getEvidenceURI(uint256 tokenId, bytes32 namespace, uint8 bit) external view returns (string memory);
```

### マルチシグ更新

```solidity
// v2.2提案
function setFlagNSMultiSig(
    uint256 tokenId,
    bytes32 namespace,
    uint8 bit,
    bool value,
    bytes32 traceId,
    bytes32 evidenceHash,
    uint64 validUntil,
    address[] calldata signers,
    bytes[] calldata signatures
) external;
```

## テスト戦略

### 単体テスト

- `test/journeypass_v2.draft.spec.ts`（describe.skipで無効化）
- v1互換性テスト
- v2新機能テスト
- EIP-712署名検証テスト

### 統合テスト

- バックエンドとの連携テスト
- Distributor連携テスト（将来）
- ガス消費量測定

### セキュリティテスト

- 署名リプレイ攻撃テスト
- 権限チェックテスト
- 有効期限テスト

## デプロイ戦略（将来）

### Phase 1: ドラフト保管（現在）

- ブランチ: `feature/journeypass-v2-draft`
- ステータス: コンパイルのみ
- デプロイ: なし

### Phase 2: テストネットデプロイ

- レビュー・監査完了後
- テストネット（Mumbai/Goerli）でテスト
- バックエンド連携確認

### Phase 3: メインネットデプロイ

- 監査レポート完了後
- 段階的移行開始
- v1並行運用

## 参考資料

- [JourneyPass v1 設計書](../contracts/JOURNEYPASS-DESIGN.md)
- [EIP-712: Typed structured data hashing and signing](https://eips.ethereum.org/EIPS/eip-712)
- [EIP-4906: ERC-721 Metadata Update Extension](https://eips.ethereum.org/EIPS/eip-4906)

## 変更履歴

- **v2.0.0-draft** (2025-01-XX): 初版ドラフト作成
  - 名前空間付きフラグ
  - 有効期限/失効
  - 証拠ハッシュ
  - EIP-712署名ベース更新
  - namespace毎の権限分割

## ライセンス

MIT License
