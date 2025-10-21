# Supabase RLSポリシー設定手順

## 問題の解決方法

特典削除時に401エラーが発生する場合、以下の手順でRLSポリシーを更新してください。

## 手順

### 1. Supabaseダッシュボードを開く

https://app.supabase.com にアクセスし、プロジェクトを選択

### 2. SQL Editorを開く

左メニューから「SQL Editor」をクリック

### 3. 新規クエリを作成

「New query」ボタンをクリック

### 4. RLSポリシー更新SQLを実行

`table-policies.sql`の内容をコピーして貼り付け、「Run」ボタンをクリック

実行すると以下が行われます：
- 既存のproductsテーブルのポリシーを削除
- RLSを有効化
- 新しいポリシーを作成（anon + authenticatedロールに対応）

### 5. 実行結果を確認

成功すると、以下のようなメッセージが表示されます：
```
Success. No rows returned
```

### 6. ブラウザをリロード

管理画面をリロードして、特典削除を再度試してください。

## ポリシーの内容

更新されたポリシーは以下の通りです：

- **SELECT**: `anon`と`authenticated`ロールがすべての商品を読み取り可能
- **INSERT**: `anon`と`authenticated`ロールが商品を作成可能（開発環境用）
- **UPDATE**: `anon`と`authenticated`ロールが商品を更新可能（開発環境用）
- **DELETE**: `anon`と`authenticated`ロールが商品を削除可能（開発環境用）

**注意**: これらのポリシーは開発環境用です。本番環境では、より厳格なポリシーに変更する必要があります。

## トラブルシューティング

### ポリシーが既に存在するエラー

```
ERROR: policy "products: Public Read Access" for table "products" already exists
```

このエラーが出た場合、SQLの先頭にある`DROP POLICY IF EXISTS`文が実行されていません。
手動で既存ポリシーを削除してください：

1. Supabaseダッシュボードで「Database」→「Tables」→「products」を選択
2. 「Policies」タブを開く
3. 既存のポリシーを削除
4. 再度SQLを実行

### 401エラーが解決しない場合

1. ブラウザのキャッシュをクリア
2. ブラウザの開発者ツールを開き、Networkタブで実際のリクエストヘッダーを確認
3. Supabaseプロジェクトの環境変数（VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY）が正しく設定されているか確認

## GIFT HUB削除ボタンについて

GIFT HUB削除ボタンは既に実装されています。各GIFT HUBの右側に赤い「削除」ボタンが表示されています。

表示されていない場合：
1. ページをリロード
2. 別のGIFT HUBを選択してから戻る
3. ブラウザのキャッシュをクリア
