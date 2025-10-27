# Admin Dashboard 履歴表示の修正レポート

## 問題の概要

Admin Dashboardで Tip イベントの履歴が表示されない問題が発生していました。

## 根本原因

**ABIとデプロイ済みコントラクトの不一致**

- **コード内のABI**: `TipSent(address,uint256)` イベントを期待
- **実際のコントラクト**: `Tipped(address,uint256)` イベントを発行

この不一致により、eth_getLogsクエリが誤ったイベントシグネチャハッシュを使用していました。

## 調査プロセス

### 1. ブロックチェーン分析
Block 28083479 のイベントログを直接クエリ:

```javascript
// 期待されたハッシュ (間違い)
TipSent(address,uint256) => 0x171011172a05babdafffeb4c3cb97a07f0e1e7a0538eab4f4331336fb76fef05

// 実際に発行されたイベント (正しい)
Tipped(address,uint256)  => 0x905516bf815c273f240e1d48d78ea7db3f1f0d00b912fc69522caf0ea70450a2
```

### 2. 検証結果

Block 28083479 で確認された Tipped イベント:
```
Block: 28083479
User: 0x66f1274ad5d042b7571c2efa943370dbcd3459ab
Amount: 10.0 tNHT
TxHash: 0xa7f1774dc70cc023fba420c4bd5af3a332a629d37a5b30b8c0e72cfa8ac14bcb
```

## 修正内容

### 1. src/admin/Dashboard.tsx (Line 226-230)

**修正前:**
```typescript
const TOPIC_TIPPED = ethers.utils.keccak256(
  ethers.utils.toUtf8Bytes("TipSent(address,uint256)")
);
```

**修正後:**
```typescript
// 🔧 FIX: The deployed contract emits "Tipped" not "TipSent"
// Discovered via blockchain analysis at Block 28083479
const TOPIC_TIPPED = ethers.utils.keccak256(
  ethers.utils.toUtf8Bytes("Tipped(address,uint256)")
);
```

### 2. src/contract.ts (Line 201-226)

**修正前:**
```typescript
export const EVENT_ABI = [
  {
    // ...
    name: "TipSent",
    type: "event",
  },
  // ...
] as const;
```

**修正後:**
```typescript
/* =========================================
   ✅ イベントABI

   🔧 NOTE: Deployed contract uses "Tipped" not "TipSent"
   Verified via blockchain analysis at Block 28083479
========================================= */
export const EVENT_ABI = [
  {
    // ...
    name: "Tipped",
    type: "event",
  },
  // ...
] as const;
```

## 影響範囲

### ✅ 修正された機能
- Admin Dashboard の Tip 履歴表示
- 期間別フィルター (day/week/month/all)
- グラフ表示
- ユーザー別Tip統計

### ⚠️ 今後の注意点
1. **コントラクト再デプロイ時**: 新しいコントラクトのイベント名を必ず確認
2. **ABI更新時**: 実際のコントラクトと一致することを検証
3. **テスト**: ブロックチェーンからの実データで検証を実施

## テスト方法

修正後、以下で動作確認:

```bash
# 1. ビルド
pnpm build

# 2. Admin Dashboard にアクセス
# → 履歴タブで Tip イベントが正しく表示されることを確認

# 3. 診断スクリプトで検証 (オプション)
node verify-fix.cjs
```

## 関連ファイル

- `src/admin/Dashboard.tsx` - Dashboard UI とイベントクエリロジック
- `src/contract.ts` - コントラクトABI定義
- `test-tip-event.cjs` - 診断スクリプト (Block 28083479の全イベント取得)
- `verify-fix.cjs` - 修正検証スクリプト (Tippedイベント取得)
- `decode-events.cjs` - イベントシグネチャデコーダー

## まとめ

✅ **修正完了**: Tipped イベントに修正し、Admin Dashboard の履歴表示が正常に動作するようになりました。

📝 **教訓**: コントラクトのABIはコードと実際のデプロイ済みコントラクトで一致していることを常に確認する必要があります。
