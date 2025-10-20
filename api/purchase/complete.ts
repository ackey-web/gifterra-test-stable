// api/purchase/complete.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { createPublicClient, http, getAddress } from 'viem';
import { polygonAmoy } from 'viem/chains';

// Supabase クライアント（サービスロール）
const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceRole = process.env.SUPABASE_SERVICE_ROLE!;
const alchemyRpcUrl = process.env.ALCHEMY_RPC_URL!;

if (!supabaseUrl || !supabaseServiceRole || !alchemyRpcUrl) {
  console.error('❌ 環境変数が設定されていません');
}

const supabase = createClient(supabaseUrl, supabaseServiceRole);

// viem クライアント（Amoy）
const publicClient = createPublicClient({
  chain: polygonAmoy,
  transport: http(alchemyRpcUrl),
});

interface PurchaseRequest {
  productId: string;
  tenantId: string;
  buyer: string;
  txHash: string;
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // CORS設定
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const { productId, tenantId, buyer, txHash }: PurchaseRequest = req.body;

    // 入力検証
    if (!productId || !tenantId || !buyer || !txHash) {
      return res.status(400).json({ success: false, error: '必須パラメータが不足しています' });
    }

    console.log('📦 購入処理開始:', { productId, tenantId, buyer, txHash });

    // 1. 商品情報を取得
    const { data: product, error: productError } = await supabase
      .from('products')
      .select('*')
      .eq('id', productId)
      .eq('tenant_id', tenantId)
      .eq('is_active', true)
      .single();

    if (productError || !product) {
      console.error('❌ 商品が見つかりません:', productError);
      return res.status(404).json({ success: false, error: '商品が見つかりません' });
    }

    // 在庫チェック
    if (!product.is_unlimited && product.stock <= 0) {
      console.log('❌ 在庫切れ');
      return res.status(400).json({ success: false, error: 'SOLD OUT', remainingStock: 0 });
    }

    console.log('✅ 商品情報取得:', {
      name: product.name,
      price: product.price_amount_wei,
      stock: product.stock,
      isUnlimited: product.is_unlimited
    });

    // 2. トランザクション検証
    const receipt = await publicClient.getTransactionReceipt({ hash: txHash as `0x${string}` });

    if (!receipt) {
      return res.status(400).json({ success: false, error: 'トランザクションが見つかりません' });
    }

    if (receipt.status !== 'success') {
      return res.status(400).json({ success: false, error: 'トランザクションが失敗しています' });
    }

    console.log('✅ トランザクション取得:', { blockNumber: receipt.blockNumber, status: receipt.status });

    // 3. TipSent イベントを検証
    const tipLogs = receipt.logs.filter(log => {
      // TipSentイベントのトピック（event signature）と一致するかチェック
      return log.topics[0]?.toLowerCase().includes('tip') || log.data !== '0x';
    });

    if (tipLogs.length === 0) {
      console.error('❌ TipSentイベントが見つかりません');
      console.log('📝 全ログ:', receipt.logs.map(l => ({ topics: l.topics, data: l.data })));
      return res.status(400).json({ success: false, error: 'チップ送信が確認できません' });
    }

    // ログから金額を抽出
    const tipLog = tipLogs[0];
    const amountHex = tipLog.data || '0x0';
    const amountWei = BigInt(amountHex);

    console.log('✅ TipSentイベント検出:', { amountWei: amountWei.toString() });

    // 金額検証
    const expectedAmount = BigInt(product.price_amount_wei);
    if (amountWei < expectedAmount) {
      return res.status(400).json({
        success: false,
        error: `支払額が不足しています（必要: ${expectedAmount.toString()}, 実際: ${amountWei.toString()}）`
      });
    }

    console.log('✅ 金額検証OK');

    // 4. 購入履歴をupsert（冪等性）
    const { data: existingPurchase } = await supabase
      .from('purchases')
      .select('*')
      .eq('tx_hash', txHash)
      .single();

    if (existingPurchase) {
      console.log('ℹ️ 既に処理済みの購入です（冪等）');
      // 既存の購入の場合、署名付きURLを再発行
    } else {
      // 新規購入を記録
      const { error: purchaseError } = await supabase
        .from('purchases')
        .insert({
          product_id: productId,
          buyer: getAddress(buyer),
          tx_hash: txHash,
          amount_wei: amountWei.toString(),
        });

      if (purchaseError) {
        console.error('❌ 購入履歴の保存失敗:', purchaseError);
        return res.status(500).json({ success: false, error: '購入履歴の保存に失敗しました' });
      }

      console.log('✅ 購入履歴を記録');

      // 5. 在庫を減らす（無制限でない場合のみ）
      if (!product.is_unlimited) {
        const { data: stockResult, error: stockError } = await supabase
          .rpc('decrement_stock', { p_product_id: productId });

        if (stockError || !stockResult?.[0]?.success) {
          console.error('❌ 在庫更新失敗:', stockError);
          return res.status(500).json({ success: false, error: '在庫の更新に失敗しました' });
        }

        console.log('✅ 在庫を減らしました:', { remaining: stockResult[0].remaining_stock });
      }
    }

    // 6. 署名付きURLを生成（TTL=600秒）
    const { data: signedUrlData, error: signedUrlError } = await supabase.storage
      .from('gh-downloads')
      .createSignedUrl(product.content_path, 600);

    if (signedUrlError || !signedUrlData) {
      console.error('❌ 署名付きURL生成失敗:', signedUrlError);
      return res.status(500).json({ success: false, error: 'ダウンロードURLの生成に失敗しました' });
    }

    console.log('✅ 署名付きURL生成成功');

    // 7. 最新の在庫数を取得
    const { data: updatedProduct } = await supabase
      .from('products')
      .select('stock, is_unlimited')
      .eq('id', productId)
      .single();

    const isUnlimited = updatedProduct?.is_unlimited || false;
    const remainingStock = isUnlimited ? null : (updatedProduct?.stock || 0);

    // 成功レスポンス
    return res.status(200).json({
      success: true,
      signedUrl: signedUrlData.signedUrl,
      expiresAt: Math.floor(Date.now() / 1000) + 600,
      isUnlimited,
      remainingStock,
    });

  } catch (error) {
    console.error('❌ サーバーエラー:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '内部サーバーエラー'
    });
  }
}
