// api/user/claim-history.ts
// ユーザーの特典受け取り履歴を取得するAPI

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { verifyMessage } from 'viem';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceRole = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceRole);

interface ClaimHistoryRequest {
  walletAddress: string;
  signature?: string;
  message?: string;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS設定
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { walletAddress, signature, message }: ClaimHistoryRequest = req.body;

    if (!walletAddress) {
      return res.status(400).json({ error: 'walletAddress は必須です' });
    }

    // ウォレット署名検証（署名がある場合のみ）
    if (signature && message) {
      try {
        const isValid = await verifyMessage({
          address: walletAddress as `0x${string}`,
          message,
          signature: signature as `0x${string}`
        });

        if (!isValid) {
          return res.status(401).json({ error: 'ウォレット署名が無効です' });
        }
      } catch (error) {
        console.error('❌ 署名検証エラー:', error);
        return res.status(401).json({ error: '署名の検証に失敗しました' });
      }
    }

    console.log('📊 受け取り履歴取得:', walletAddress);

    // 受け取り履歴を取得（purchasesテーブル + productsテーブル + download_tokensテーブル）
    const { data: purchases, error: purchasesError } = await supabase
      .from('purchases')
      .select(`
        id,
        product_id,
        buyer,
        tx_hash,
        amount_wei,
        created_at,
        products (
          id,
          name,
          description,
          image_url,
          price_amount_wei
        ),
        download_tokens (
          token,
          is_consumed,
          expires_at,
          consumed_at,
          created_at
        )
      `)
      .eq('buyer', walletAddress)
      .order('created_at', { ascending: false });

    if (purchasesError) {
      console.error('❌ 受け取り履歴取得エラー:', purchasesError);
      return res.status(500).json({
        error: '受け取り履歴の取得に失敗しました',
        details: purchasesError.message,
        code: purchasesError.code
      });
    }

    // データが0件の場合は空配列を返す
    if (!purchases || purchases.length === 0) {
      console.log('ℹ️ 受け取り履歴なし:', walletAddress);
      return res.json({
        success: true,
        walletAddress,
        claims: [],
        totalClaims: 0
      });
    }

    // 受け取り履歴を整形
    const formattedClaims = purchases?.map(purchase => {
      const product = Array.isArray(purchase.products) ? purchase.products[0] : purchase.products;
      const tokens = Array.isArray(purchase.download_tokens) ? purchase.download_tokens : [purchase.download_tokens].filter(Boolean);

      // 最新のトークンを取得
      const latestToken = tokens.length > 0
        ? tokens.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0]
        : null;

      // ステータス判定
      let status: 'completed' | 'expired' | 'available' | 'pending';
      let statusLabel: string;

      if (latestToken) {
        if (latestToken.is_consumed) {
          status = 'completed';
          statusLabel = '✅ 受け取り済み';
        } else if (new Date(latestToken.expires_at) < new Date()) {
          status = 'expired';
          statusLabel = '⏰ 期限切れ';
        } else {
          status = 'available';
          statusLabel = '📦 受け取り可能';
        }
      } else {
        status = 'pending';
        statusLabel = '⏳ 処理中';
      }

      return {
        purchaseId: purchase.id,
        productId: purchase.product_id,
        productName: product?.name || '不明',
        productDescription: product?.description || '',
        productImage: product?.image_url || '',
        txHash: purchase.tx_hash,
        amountWei: purchase.amount_wei,
        claimedAt: purchase.created_at,
        status,
        statusLabel,
        hasValidToken: latestToken && !latestToken.is_consumed && new Date(latestToken.expires_at) > new Date(),
        tokenExpiresAt: latestToken?.expires_at || null,
        downloadUrl: latestToken && !latestToken.is_consumed && new Date(latestToken.expires_at) > new Date()
          ? `${process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000'}/api/download/${latestToken.token}`
          : null
      };
    }) || [];

    console.log('✅ 受け取り履歴取得成功:', {
      walletAddress,
      claimCount: formattedClaims.length
    });

    return res.json({
      success: true,
      walletAddress,
      claims: formattedClaims,
      totalClaims: formattedClaims.length
    });
  } catch (error) {
    console.error('❌ claim-history API エラー:', error);
    const errorMessage = error instanceof Error ? error.message : '内部サーバーエラー';
    const errorStack = error instanceof Error ? error.stack : undefined;

    console.error('❌ エラー詳細:', {
      message: errorMessage,
      stack: errorStack,
      walletAddress: req.body?.walletAddress
    });

    return res.status(500).json({
      error: errorMessage,
      details: process.env.NODE_ENV === 'development' ? errorStack : undefined
    });
  }
}
