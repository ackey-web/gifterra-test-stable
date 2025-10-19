# Supabase セットアップガイド

GIFT HUBで画像やファイルを保存するためにSupabaseを使用します。

## 1. Supabaseプロジェクトの作成

1. [Supabase](https://app.supabase.com/)にアクセス
2. 「New Project」をクリック
3. プロジェクト名、データベースパスワードを設定
4. リージョンを選択（推奨：Northeast Asia (Tokyo)）
5. 「Create new project」をクリック

## 2. ストレージバケットの作成

プロジェクト作成後、以下のバケットを作成します：

### 2.1 Storage > Create a new bucket

以下の4つのバケットを作成してください：

1. **vending-images** - GIFT HUBのヘッダー・背景画像
   - Public bucket: ✅ ON

2. **product-images** - 商品のサムネイル画像
   - Public bucket: ✅ ON

3. **product-files** - 商品の配布ファイル（GLB、ZIP等）
   - Public bucket: ✅ ON

4. **ad-images** - リワードUIの広告画像
   - Public bucket: ✅ ON

### 2.2 各バケットの設定

各バケットで「Policies」タブを開き、以下のポリシーを追加：

**INSERT ポリシー（アップロード許可）:**
```sql
CREATE POLICY "Allow public uploads"
ON storage.objects FOR INSERT
TO public
WITH CHECK (bucket_id = 'バケット名');
```

**SELECT ポリシー（読み取り許可）:**
```sql
CREATE POLICY "Allow public access"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'バケット名');
```

## 3. 環境変数の設定

1. Supabaseの「Settings」→「API」ページを開く
2. 以下の情報をコピー：
   - Project URL
   - anon public key

3. `.env`ファイルに追加：

```bash
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key-here
```

## 4. 動作確認

1. 開発サーバーを再起動
2. GIFT HUB管理画面で画像をアップロード
3. Supabaseの「Storage」で画像がアップロードされているか確認

## トラブルシューティング

### 画像がアップロードできない

1. バケットが「Public」になっているか確認
2. ポリシーが正しく設定されているか確認
3. ブラウザのコンソールでエラーメッセージを確認

### 画像が表示されない

1. バケットの「Public」設定を確認
2. SELECTポリシーが設定されているか確認
3. 画像URLが正しいか確認（ブラウザで直接アクセス）

## 次のステップ

将来的には、以下の機能を追加予定：

- [ ] GIFT HUB商品データをSupabase Databaseに保存
- [ ] ユーザー認証とファイルアクセス制限
- [ ] 画像の自動リサイズ・最適化
- [ ] ファイルの容量制限チェック
