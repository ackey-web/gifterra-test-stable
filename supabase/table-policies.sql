-- Supabase Table RLS ポリシー設定
-- 実行方法: Supabase Dashboard → SQL Editor → 新規クエリ → このSQLを貼り付けて実行

-- ==========================================
-- products テーブル（商品管理）
-- ==========================================

-- 誰でも読み取り可能（公開商品の表示用）
CREATE POLICY "products: Public Read Access"
ON products
FOR SELECT
TO public
USING (is_active = true);

-- 誰でも挿入可能（開発環境用 - 本番では削除すべき）
CREATE POLICY "products: Public Insert Access (DEV ONLY)"
ON products
FOR INSERT
TO public
WITH CHECK (true);

-- 誰でも更新可能（開発環境用 - 本番では削除すべき）
CREATE POLICY "products: Public Update Access (DEV ONLY)"
ON products
FOR UPDATE
TO public
USING (true)
WITH CHECK (true);

-- 誰でも削除可能（開発環境用 - 本番では削除すべき）
CREATE POLICY "products: Public Delete Access (DEV ONLY)"
ON products
FOR DELETE
TO public
USING (true);

-- ==========================================
-- purchases テーブル（購入履歴）
-- ==========================================

-- Service Role のみ読み取り可能
CREATE POLICY "purchases: Service Role Read"
ON purchases
FOR SELECT
TO service_role
USING (true);

-- Service Role のみ挿入可能
CREATE POLICY "purchases: Service Role Insert"
ON purchases
FOR INSERT
TO service_role
WITH CHECK (true);

-- ==========================================
-- download_tokens テーブル（ダウンロードトークン）
-- ==========================================

-- Service Role のみ読み取り可能
CREATE POLICY "download_tokens: Service Role Read"
ON download_tokens
FOR SELECT
TO service_role
USING (true);

-- Service Role のみ挿入可能
CREATE POLICY "download_tokens: Service Role Insert"
ON download_tokens
FOR INSERT
TO service_role
WITH CHECK (true);

-- Service Role のみ更新可能
CREATE POLICY "download_tokens: Service Role Update"
ON download_tokens
FOR UPDATE
TO service_role
USING (true)
WITH CHECK (true);

-- ==========================================
-- ポリシー確認用クエリ
-- ==========================================

-- 以下のクエリで設定されたポリシーを確認できます
-- SELECT * FROM pg_policies WHERE schemaname = 'public' AND tablename IN ('products', 'purchases', 'download_tokens');
