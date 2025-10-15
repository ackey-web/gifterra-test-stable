# 🏪 メタバースEC システムアーキテクチャ設計

## 🎯 概要
メタバース空間に設置された3D自販機を通じて、チップシステムベースのデジタルコンテンツ配布を実現するシステム設計。

## 🏗️ システム構成

### 1. 🖥️ **コンテンツ配布UI (新規)**
- **目的**: メタバース自販機専用のWebアプリケーション
- **アクセス**: `/content?space={spaceId}&machine={machineId}`
- **機能**: 
  - 既存チップシステムとの統合
  - コンテンツセット別表示
  - セキュアダウンロードURL生成

### 2. 🎮 **空間・マシン管理システム**
```typescript
interface MetaverseSpace {
  spaceId: string;           // "world-1", "gallery-a" 等
  spaceName: string;         // "メインワールド", "アートギャラリー" 等
  description: string;       // 空間の説明
  isActive: boolean;         // 運用状態
  contentSets: ContentSet[]; // この空間で配布するコンテンツセット
}

interface VendingMachine {
  machineId: string;         // "machine-001", "vip-booth" 等
  spaceId: string;          // 所属する空間
  machineName: string;      // "エントランス自販機" 等
  position: {x: number, y: number, z: number}; // 3D座標
  contentSetId: string;     // 配布するコンテンツセット
  tipThresholds: TipThreshold[]; // チップ閾値設定
}

interface ContentSet {
  contentSetId: string;     // "starter-pack", "premium-collection" 等
  name: string;            // "スターターパック", "プレミアムコレクション"
  description: string;     // コンテンツセットの説明
  contents: DigitalContent[]; // 含まれるコンテンツ
}

interface DigitalContent {
  contentId: string;       // ユニークID
  name: string;           // "限定アバター.glb", "BGM.mp3" 等
  type: ContentType;      // GLB, MP3, PNG, PDF 等
  fileUrl: string;        // ストレージURL
  metadata: ContentMetadata; // サイズ、作者、説明等
  requiredTips: number;   // 必要チップ数
}
```

### 3. 🔗 **URL設計**
```
// メタバース自販機からのアクセス
https://gifterra.app/content?space=world-1&machine=entrance-01

// Admin管理画面
https://gifterra.app/admin?view=metaverse-management

// 既存システム（変更なし）
https://gifterra.app/          → RewardUI
https://gifterra.app/tip       → TipUI  
https://gifterra.app/admin     → AdminDashboard
```

## 🛠️ 技術実装

### 4. 📱 **UI コンポーネント設計**
```
src/
├── metaverse-ui/          # 新規：メタバース専用UI
│   ├── App.tsx           # メイン配布アプリ
│   ├── ContentDisplay.tsx # コンテンツ表示
│   ├── DownloadManager.tsx # ダウンロード管理
│   └── SpaceIdentifier.tsx # 空間・マシン識別
├── admin/
│   ├── MetaverseManager.tsx # 新規：メタバース管理
│   ├── ContentManager.tsx   # 新規：コンテンツ管理
│   └── (既存Admin機能)
```

### 5. 🗄️ **データ管理**
```typescript
// 既存contract.tsに追加
export const METAVERSE_CONFIG = {
  SPACES: new Map([
    ["world-1", {
      name: "メインワールド",
      machines: ["entrance-01", "center-plaza", "vip-lounge"]
    }],
    ["gallery-a", {
      name: "アートギャラリー", 
      machines: ["gallery-01", "creator-corner"]
    }]
  ]),
  
  CONTENT_SETS: new Map([
    ["starter-pack", {
      name: "スターターパック",
      contents: ["avatar-basic.glb", "welcome-sound.mp3"]
    }],
    ["premium-collection", {
      name: "プレミアムコレクション", 
      contents: ["avatar-premium.glb", "exclusive-bgm.mp3", "special-item.glb"]
    }]
  ])
} as const;
```

## 🎛️ Admin管理機能

### 6. 📊 **管理ダッシュボード拡張**
- **空間管理**: 新規メタバース空間の追加・編集
- **マシン管理**: 自販機の配置・設定管理
- **コンテンツ管理**: デジタルアセットのアップロード・分類
- **閾値設定**: 空間・マシン別のチップ必要数設定
- **配布履歴**: ダウンロード状況の監視・分析

## 🔐 セキュリティ設計

### 7. 🛡️ **アクセス制御**
- **URL暗号化**: 一時的なダウンロードリンク生成
- **チップ検証**: ブロックチェーン上での残高確認
- **レート制限**: 同一ユーザーの連続アクセス制限
- **ログ記録**: 全配布履歴の記録・監査

## 🚀 段階的実装計画

### Phase 1: 基盤構築
1. コンテンツ配布UI作成
2. 既存チップシステムとの統合
3. 基本的なAdmin管理機能

### Phase 2: 高度化
1. マルチ空間対応
2. コンテンツ管理システム
3. セキュリティ強化

### Phase 3: 運用最適化
1. 分析ダッシュボード
2. 自動化機能
3. パフォーマンス最適化

## 💡 運用例

### 🏰 **メインワールド**
- エントランス自販機: スターターパック (50チップ)
- VIPラウンジ: プレミアムコレクション (500チップ)

### 🎨 **アートギャラリー**  
- ギャラリー自販機: アート限定GLB (100チップ)
- クリエーターコーナー: 制作者BGM (200チップ)

この設計により、**1つの管理システムで複数のメタバース空間を効率的に運用**し、各空間の特色に応じたコンテンツ配布が可能になります。