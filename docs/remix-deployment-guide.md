# Remix デプロイガイド - ギフテラ特許回避システム

## 🚀 Remixでの段階的デプロイ手順

### ステップ1: Remixの準備

1. **Remix IDE にアクセス**
   - https://remix.ethereum.org/ を開く
   - 「File Explorer」で新しいワークスペースを作成

2. **Solidity コンパイラ設定**
   - 「Solidity Compiler」タブを開く
   - コンパイラバージョン: `0.8.19` を選択
   - 最適化: `Enable optimization` をチェック（200回）

### ステップ2: コントラクトファイルのアップロード

以下の順序でファイルを `contracts/` フォルダにアップロード：

#### 📁 必要なファイル構成
```
contracts/
├── GifterraFactory.sol          # Factory（最初にデプロイ）
├── GifterraCore.sol            # SBT + 報酬システム
├── StandardNFT.sol             # 通常NFT（特許回避）
└── interfaces/
    └── IERC2981.sol            # ロイヤリティインターフェース
```

#### 🔧 OpenZeppelin インポート
Remixでは自動的にOpenZeppelinライブラリがインポートされます：
- `@openzeppelin/contracts/token/ERC721/ERC721.sol`
- `@openzeppelin/contracts/access/AccessControl.sol`
- `@openzeppelin/contracts/security/ReentrancyGuard.sol`
- `@openzeppelin/contracts/security/Pausable.sol`
- `@openzeppelin/contracts/interfaces/IERC2981.sol`

### ステップ3: コンパイル

1. 各ファイルを順番にコンパイル
2. エラーがないことを確認
3. 「Compilation Details」でバイトコードサイズを確認

### ステップ4: デプロイ（Polygon Amoy テストネット）

#### 🦊 MetaMask設定
```
ネットワーク名: Polygon Amoy Testnet
RPC URL: https://rpc-amoy.polygon.technology/
チェーンID: 80002
シンボル: MATIC
ブロックエクスプローラー: https://amoy.polygonscan.com/
```

#### 💰 テストMATIC取得
- Faucet: https://faucet.polygon.technology/
- 最低 0.1 MATIC を取得（デプロイ用）

### ステップ5: Factory デプロイ

1. **「Deploy & Run Transactions」タブを開く**
2. **Environment**: `Injected Provider - MetaMask` を選択
3. **Account**: ウォレットアドレスが表示されることを確認
4. **Contract**: `GifterraFactory` を選択

#### デプロイパラメータ
```
_feeRecipient: 0x[あなたのウォレットアドレス]
```

5. **「Deploy」ボタンをクリック**
6. **MetaMaskで署名**
7. **デプロイ完了後、アドレスをメモ** 📝

### ステップ6: システム作成テスト

Factory がデプロイされたら、システム作成をテスト：

#### createGifterraSystem パラメータ例
```
_systemName: "Test Gifterra System"
_nftName: "Test Standard NFT"
_nftSymbol: "TEST"
_baseURI: "https://api.test.com/metadata/"
_maxSupply: 1000
_mintPrice: 10000000000000000 (0.01 MATIC in wei)
```

### ステップ7: 特許回避設計の確認

デプロイ後、以下を確認：

#### ✅ **アーキテクチャ分離確認**
1. **Factory コントラクト** → システム作成
2. **GifterraCore** → 特許対象機能（SBT + 報酬）
3. **StandardNFT** → 特許回避機能（通常NFT）

#### ✅ **機能分離確認**
- **GifterraCore**: 自動配布、ランダム抽選、状態フラグ
- **StandardNFT**: 手動ミントのみ、自動処理なし

#### ✅ **データ参照のみ確認**
- 相互アドレス参照は読み取り専用
- 処理連携なし

## 🔍 デプロイ後の確認項目

### Factory動作確認
```javascript
// Remix Console で実行
// 1. Factory統計取得
factoryContract.methods.getFactoryStats().call()

// 2. システム情報取得
factoryContract.methods.getSystem(1).call()
```

### 個別コントラクト確認
```javascript
// GifterraCore
coreContract.methods.version().call()
coreContract.methods.standardNFTAddress().call()

// StandardNFT  
nftContract.methods.version().call()
nftContract.methods.gifterraCoreAddress().call()
```

## ⚠️ トラブルシューティング

### よくあるエラー

#### 1. **コンパイルエラー**
```
Error: Source not found
```
**解決方法**: OpenZeppelinインポートパスを確認

#### 2. **デプロイエラー**
```
Gas estimation failed
```
**解決方法**: 
- ガス制限を手動設定（3,000,000）
- MATICが十分あるか確認

#### 3. **トランザクション失敗**
```
Transaction reverted
```
**解決方法**:
- パラメータを再確認
- ネットワーク設定を確認

## 🎉 成功確認

デプロイが成功すると：

1. **Remix Console** にコントラクトアドレスが表示
2. **Polygon Amoy Explorer** でトランザクション確認可能
3. **Factory統計** でシステム数が表示
4. **各コントラクト** で相互参照アドレスが設定済み

## 📝 次のステップ

デプロイ完了後：
1. **フロントエンド統合**: 環境変数にアドレス設定
2. **機能テスト**: 各操作が正常動作するか確認
3. **特許回避確認**: 設計原則が守られているか検証

---

**💡 ポイント**: 
- 一つずつ段階的にデプロイ
- 各ステップで動作確認
- アドレスは必ずメモしておく
- テストネットで十分検証してからメインネット展開