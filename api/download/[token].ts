// api/download/[token].ts
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { bucket } from '../../src/lib/storageBuckets.js';

// Supabase クライアント（サービスロール）
const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceRole = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceRole) {
  console.error('❌ 環境変数が設定されていません', {
    hasUrl: !!supabaseUrl,
    hasServiceRole: !!supabaseServiceRole
  });
}

const supabase = createClient(supabaseUrl, supabaseServiceRole);

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // CORS設定
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { token } = req.query;

    if (!token || typeof token !== 'string') {
      return res.status(400).json({ error: 'トークンが無効です' });
    }

    console.log('🔑 ダウンロードトークン検証:', token);

    // トークンを検証して消費
    const { data: tokenData, error: tokenError } = await supabase
      .rpc('consume_download_token', { p_token: token });

    if (tokenError) {
      console.error('❌ トークン検証エラー:', tokenError);

      if (tokenError.message?.includes('expired')) {
        return res.status(410).json({ error: 'トークンの有効期限が切れています' });
      }

      if (tokenError.message?.includes('already consumed')) {
        return res.status(400).json({ error: 'このトークンは既に使用されています' });
      }

      return res.status(400).json({ error: 'トークンが無効です' });
    }

    if (!tokenData) {
      return res.status(404).json({ error: 'トークンが見つかりません' });
    }

    console.log('✅ トークン検証成功:', tokenData);

    // 商品情報を取得
    const { data: product, error: productError } = await supabase
      .from('products')
      .select('content_path')
      .eq('id', tokenData.product_id)
      .single();

    if (productError || !product) {
      console.error('❌ 商品が見つかりません:', productError);
      return res.status(404).json({ error: '商品が見つかりません' });
    }

    console.log('✅ 商品情報取得:', product.content_path);

    // 非公開バケット（gh-downloads）から署名URL（10分間有効）を生成
    const { data: signedUrlData, error: signedUrlError } = await supabase.storage
      .from(bucket('DOWNLOADS'))
      .createSignedUrl(product.content_path, 600); // 600秒 = 10分

    if (signedUrlError || !signedUrlData || !signedUrlData.signedUrl) {
      console.error('❌ 署名URL生成失敗:', signedUrlError);
      return res.status(500).json({ error: 'ダウンロードURLの生成に失敗しました' });
    }

    console.log('✅ 署名URL生成成功（有効期限: 10分）');

    // 302リダイレクト
    return res.redirect(302, signedUrlData.signedUrl);

  } catch (error) {
    console.error('❌ サーバーエラー:', error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : '内部サーバーエラー'
    });
  }
}
