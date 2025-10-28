# 二軸スコアシステム UIコンポーネント 📱

## 概要

モバイルファースト設計による、ユーザーの承認欲求を満たす二軸スコアシステムのUIコンポーネント群です。

## デザイン哲学

### ✅ すべきこと
- **バッジ・レベル・ランキングで達成感を演出**
- **視覚的なメタファー（タンク🪔、炎🔥）で直感的に理解**
- **ソーシャルプルーフを強調（ランキング、ストリーク）**
- **ゲーミフィケーションで継続を促進**
- **モバイルファースト、タッチフレンドリー**

### ❌ してはいけないこと
- **金額を直接表示しない**（ユーザーの心にブレーキをかける）
- **「使った金額」を可視化しない**
- **ネガティブな比較を促進しない**

## コンポーネント一覧

### 1. DualAxisTank 💸🔥

二軸スコアを液体タンクと炎で視覚化するコンポーネント。

**ファイル**: `src/components/score/DualAxisTank.tsx`

**機能**:
- 💸 Economic軸: 液体タンクのアニメーション
- 🔥 Resonance軸: 炎のアニメーション
- レベルバッジ表示
- ストリークボーナス表示
- 3サイズ対応（small/medium/large）

**使用例**:
```tsx
import { DualAxisTank } from '@/components/score';

<DualAxisTank
  economicScore={1500000}
  economicLevel={45}
  economicDisplayLevel={45}
  resonanceScore={250}
  resonanceLevel={25}
  resonanceDisplayLevel={25}
  resonanceStreak={14}
  showDetails={true}
  size="large"
/>
```

### 2. RankingPanel 🏆

三つ葉タブで3つの軸のランキングを表示。

**ファイル**: `src/components/score/RankingPanel.tsx`

**機能**:
- 📊 Total / 💸 Economic / 🔥 Resonance の3タブ
- 上位3位にメダル表示
- 現在のユーザーをハイライト
- スクロール可能なランキングリスト
- ユーザークリックで詳細表示

**使用例**:
```tsx
import { RankingPanel } from '@/components/score';

<RankingPanel
  economicRankings={economicData}
  resonanceRankings={resonanceData}
  compositeRankings={compositeData}
  currentUserAddress="0x..."
  onUserClick={(userId) => console.log(userId)}
/>
```

### 3. TenantScoreCard 💝

テナント（応援先）ごとのスコアを表示するカード。

**ファイル**: `src/components/score/TenantScoreCard.tsx`

**機能**:
- テナント別の二軸スコア表示
- お気に入り登録機能
- レベルプログレスバー
- バナー・アバター表示
- ランク表示

**使用例**:
```tsx
import { TenantScoreCard } from '@/components/score';

<TenantScoreCard
  tenant={{
    tenantId: 'tenant-1',
    tenantName: 'Artist Name',
    economicScore: 50000,
    resonanceScore: 100,
    compositeScore: 75000,
    economicLevel: 30,
    resonanceLevel: 20,
    rank: 5,
    isFavorite: true
  }}
  onTenantClick={(id) => console.log(id)}
  onFavoriteToggle={(id, fav) => console.log(id, fav)}
  size="medium"
/>
```

### 4. BadgeSystem 🏅

バッジ、実績、ストリーク、称号を表示。

**ファイル**: `src/components/score/BadgeSystem.tsx`

**機能**:
- 💸 Economicバッジ（10段階）
- 🔥 Resonanceバッジ（10段階）
- ⚡ ストリーク表示
- 🏅 実績システム
- 次のバッジまでの進捗表示

**バッジ階層**:

**Economic（金銭的貢献）**:
1. 🥚 ビギナー (Lv.0+)
2. 🌱 サポーター (Lv.10+)
3. ✨ コントリビューター (Lv.20+)
4. 🌟 パトロン (Lv.30+)
5. 💪 ベネファクター (Lv.40+)
6. 🔥 メセナ (Lv.50+)
7. ⭐ フィランソロピスト (Lv.60+)
8. 👑 マエストロ (Lv.70+)
9. 💎 レジェンド (Lv.80+)
10. 🏆 インモータル (Lv.90+)

**Resonance（継続的熱量）**:
1. ❄️ クール (Lv.0+)
2. 🌸 ウォーム (Lv.10+)
3. 💧 エンゲージド (Lv.20+)
4. 🌊 コミッテッド (Lv.30+)
5. ⚡ パッショネート (Lv.40+)
6. 🔥 ファナティック (Lv.50+)
7. 💥 フィーバー (Lv.60+)
8. 🌟 インフレイムド (Lv.70+)
9. 💫 インフェルノ (Lv.80+)
10. 🌠 スーパーノヴァ (Lv.90+)

**使用例**:
```tsx
import { BadgeSystem } from '@/components/score';

<BadgeSystem
  economicLevel={45}
  resonanceLevel={25}
  economicScore={1500000}
  resonanceScore={250}
  streak={14}
  longestStreak={30}
  totalTips={230}
  achievements={achievementsData}
/>
```

## API フック

### useUserScore

ユーザーの完全なスコアデータを取得。

```tsx
import { useUserScore } from '@/hooks/useScoreApi';

const { data, loading, error, refetch } = useUserScore('0x...');
```

### useUserRank

ユーザーの各軸での順位を取得。

```tsx
import { useUserRank } from '@/hooks/useScoreApi';

const { data, loading, error } = useUserRank('0x...');
// data.ranks.economic, data.ranks.resonance, data.ranks.composite
```

### useAllRankings

全軸のランキングを一括取得。

```tsx
import { useAllRankings } from '@/hooks/useScoreApi';

const { data, loading, error, refetch } = useAllRankings(100);
// data.economic, data.resonance, data.composite
```

### useTenantScores

ユーザーのテナント別スコアを取得（モック）。

```tsx
import { useTenantScores } from '@/hooks/useScoreApi';

const { data, loading, error, toggleFavorite } = useTenantScores('0x...');
```

### useAchievements

ユーザーの実績を取得（モック）。

```tsx
import { useAchievements } from '@/hooks/useScoreApi';

const { data, loading, error } = useAchievements('0x...');
```

## ページ

### ScoreProfile

すべてのコンポーネントを統合したプロフィールページ。

**ファイル**: `src/pages/score-profile.tsx`

**URL**:
- `/score-profile` - 自分のプロフィール
- `/score-profile?userId=0x...` - 他のユーザーのプロフィール

**タブ**:
1. **📊 Overview** - 二軸タンク、バッジシステム
2. **🏆 Rankings** - 全軸ランキング
3. **💝 My Support** - 応援しているテナント一覧

## スタイリング

### カラーパレット

```css
/* プライマリー */
--primary-purple: #667eea;
--primary-violet: #764ba2;

/* Economic軸 */
--economic-blue: #3498db;

/* Resonance軸 */
--resonance-red: #e74c3c;

/* Composite軸 */
--composite-purple: #9b59b6;

/* レベル色 */
--level-0: #A8DADC;  /* ビギナー */
--level-20: #95E1D3; /* 初級 */
--level-40: #4ECDC4; /* 中級 */
--level-60: #FF6B35; /* 上級 */
--level-80: #FFD700; /* マスター */
--level-90: #e74c3c; /* レジェンド */
```

### アニメーション

- **液体の波**: `wave` - 2秒ループ
- **炎の揺らぎ**: `flicker` - 1.5秒ループ
- **バッジの輝き**: `glow` - 2秒ループ
- **ストリークの脈動**: `pulse` - 2秒ループ
- **プログレスバーのシマー**: `shimmer` - 2秒ループ

## モバイル対応

すべてのコンポーネントは以下のブレークポイントで最適化されています:

```css
/* タブレット */
@media (max-width: 768px) { ... }

/* スマートフォン */
@media (max-width: 640px) { ... }
```

### モバイル最適化:
- ✅ タッチターゲット 44×44px以上
- ✅ フォントサイズ自動調整
- ✅ グリッドレイアウトの自動折り返し
- ✅ スクロールエリアの最適化
- ✅ 横スクロール防止

## パフォーマンス

### 最適化手法:
- `useMemo` でコストの高い計算をメモ化
- `useCallback` でイベントハンドラーをメモ化
- CSS Animationsをハードウェアアクセラレーション
- 画像の遅延ロード
- 仮想スクロール（長いリスト）

### バンドルサイズ:
- DualAxisTank: ~8KB (gzip)
- RankingPanel: ~10KB (gzip)
- TenantScoreCard: ~9KB (gzip)
- BadgeSystem: ~12KB (gzip)

## アクセシビリティ

- ✅ セマンティックHTML
- ✅ ARIA属性（必要に応じて）
- ✅ キーボードナビゲーション
- ✅ スクリーンリーダー対応
- ✅ 色覚異常者対応（色だけに依存しない）

## ブラウザサポート

- Chrome/Edge (最新2バージョン)
- Firefox (最新2バージョン)
- Safari (最新2バージョン)
- iOS Safari (iOS 14+)
- Chrome for Android (最新2バージョン)

## 今後の拡張

### Phase 4: AI統合 🤖
- [ ] Giftyアシスタント統合
- [ ] バランス分析
- [ ] パーソナライズド提案

### Phase 5: Admin UI ⚙️
- [ ] パラメータ管理画面
- [ ] トークン軸設定画面
- [ ] システムモニタリング

### その他
- [ ] ダークモード対応
- [ ] 多言語対応 (i18n)
- [ ] PWA対応
- [ ] オフライン対応
- [ ] プッシュ通知

## トラブルシューティング

### コンポーネントが表示されない

```bash
# 1. 環境変数を確認
echo $NEXT_PUBLIC_SCORE_API_URL

# 2. APIサーバーが起動しているか確認
curl http://localhost:3001/api/health

# 3. ブラウザのコンソールを確認
# F12 -> Console
```

### スタイルが適用されない

```tsx
// styled-jsxが正しく動作しているか確認
// next.config.jsにstyledJsxの設定があるか確認

// または、CSSモジュールを使用
import styles from './Component.module.css';
```

### データが取得できない

```tsx
// useEffectの依存配列を確認
useEffect(() => {
  fetchData();
}, [userId]); // userIdが変更されたときのみ実行
```

## ライセンス

MIT License

## サポート

質問や問題がある場合は、GitHubのIssuesで報告してください。
