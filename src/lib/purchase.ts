// src/lib/purchase.ts
import { formatUnits } from 'viem';
import { ERC20_MIN_ABI, PAYMENT_SPLITTER_ABI } from '../contract';
import type { PaymentSplit } from './royalty';

export interface Product {
  id: string;
  tenant_id: string;
  name: string;
  description?: string;
  content_path: string;
  price_token: string;
  price_amount_wei: string;
  stock: number;
  is_unlimited: boolean;
  is_active: boolean;
  payment_split?: PaymentSplit | null; // 収益分配設定（JSONB）
  image_url?: string; // サムネイル画像URL
}

export interface PurchaseResult {
  success: boolean;
  token?: string;
  downloadUrl?: string;
  error?: string;
}

/**
 * 商品を購入する（approve → donateERC20 → API呼び出し）
 *
 * 変更点（v2.0 - PaymentSplitter統合）:
 * - Gifterra.tip() → PaymentSplitter.donateERC20() に変更
 * - 収益分配設定（payment_split）に基づき自動配分
 * - EIP-2981 NFTロイヤリティ対応
 *
 * @param product 購入する商品
 * @param userAddress ユーザーアドレス
 * @param walletClient viemのwalletClient
 * @param publicClient viemのpublicClient
 * @param paymentSplitterAddress PaymentSplitterコントラクトアドレス（テナント共通）
 */
export async function purchaseProduct(
  product: Product,
  userAddress: string,
  walletClient: any,
  publicClient: any,
  paymentSplitterAddress?: string
): Promise<PurchaseResult> {
  try {
    const priceWei = BigInt(product.price_amount_wei);
    const tokenAddress = product.price_token as `0x${string}`;

    // PaymentSplitterアドレスの検証
    if (!paymentSplitterAddress || paymentSplitterAddress === '0x0000000000000000000000000000000000000000') {
      throw new Error(
        'PaymentSplitter address not configured for this tenant.\n' +
        'Please configure PaymentSplitter in TenantContext.'
      );
    }

    // 1. allowance チェック
    const currentAllowance = await publicClient.readContract({
      address: tokenAddress,
      abi: ERC20_MIN_ABI,
      functionName: 'allowance',
      args: [userAddress as `0x${string}`, paymentSplitterAddress as `0x${string}`],
    }) as bigint;

    // 2. approve（必要な場合のみ）
    if (currentAllowance < priceWei) {
      console.log('📝 Approving ERC20 token to PaymentSplitter...');
      const approveTx = await walletClient.writeContract({
        address: tokenAddress,
        abi: ERC20_MIN_ABI,
        functionName: 'approve',
        args: [paymentSplitterAddress as `0x${string}`, priceWei],
      });

      const approveReceipt = await publicClient.waitForTransactionReceipt({ hash: approveTx });

      if (approveReceipt.status !== 'success') {
        throw new Error('Approveに失敗しました');
      }
      console.log('✅ Approve successful');
    }

    // 3. donateERC20 実行（PaymentSplitterへ）
    // sku: 商品ID, traceId: txHashの予定（後でAPIで記録）
    const skuBytes32 = productIdToBytes32(product.id);
    const traceIdBytes32 = '0x0000000000000000000000000000000000000000000000000000000000000000'; // 初期値

    console.log('💰 Executing donateERC20 to PaymentSplitter...', {
      paymentSplitter: paymentSplitterAddress,
      token: tokenAddress,
      amount: priceWei.toString(),
      sku: skuBytes32,
    });

    const donateTx = await walletClient.writeContract({
      address: paymentSplitterAddress as `0x${string}`,
      abi: PAYMENT_SPLITTER_ABI,
      functionName: 'donateERC20',
      args: [
        tokenAddress,
        priceWei,
        skuBytes32 as `0x${string}`,
        traceIdBytes32 as `0x${string}`,
      ],
    });

    const donateReceipt = await publicClient.waitForTransactionReceipt({ hash: donateTx });

    if (donateReceipt.status !== 'success') {
      throw new Error('Payment failed');
    }
    console.log('✅ Payment successful, tx:', donateTx);

    // 4. APIに購入初期化を通知
    const apiUrl = import.meta.env.VITE_API_BASE_URL || '';
    const response = await fetch(`${apiUrl}/api/purchase/init`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        productId: product.id,
        buyer: userAddress,
        txHash: donateTx,
        amountWei: priceWei.toString(),
        paymentToken: tokenAddress, // どのトークンで支払ったか
        paymentSplit: product.payment_split, // 収益分配設定
      }),
    });

    const result: PurchaseResult = await response.json();

    if (!result.success) {
      console.error('❌ API エラー:', result.error);
      return result;
    }

    // ダウンロードURLを構築（トークンから）
    if (result.token) {
      const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
      result.downloadUrl = `${baseUrl}/api/download/${result.token}`;
    }

    return result;

  } catch (error) {
    console.error('❌ 購入エラー:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : '購入処理に失敗しました',
    };
  }
}

/**
 * 商品IDをbytes32形式に変換（SKU用）
 */
function productIdToBytes32(productId: string): string {
  // UUID形式の商品IDをbytes32に変換
  // 簡易実装: 文字列をハッシュ化せず、16進数パディング
  const hex = productId.replace(/-/g, '').slice(0, 64);
  return '0x' + hex.padEnd(64, '0');
}

/**
 * executePurchase - Temporary stub to enable build
 * TODO: Implement proper executePurchase or migrate to purchaseProduct
 */
export async function executePurchase(
  _product: any,
  _userAddress: string
): Promise<PurchaseResult> {
  console.warn('⚠️ executePurchase stub called - not fully implemented');
  return {
    success: false,
    error: 'Purchase function is being migrated. Please contact support.',
  };
}

/**
 * 価格を読みやすい形式に変換
 */
export function formatPrice(priceWei: string, decimals: number = 18): string {
  return formatUnits(BigInt(priceWei), decimals);
}

/**
 * 在庫状況を判定
 */
export function getStockStatus(product: Product): {
  available: boolean;
  label: string;
  showBadge: boolean;
} {
  if (product.is_unlimited) {
    return {
      available: true,
      label: '∞',
      showBadge: true
    };
  }

  if (product.stock <= 0) {
    return {
      available: false,
      label: 'SOLD OUT',
      showBadge: true
    };
  }

  if (product.stock <= 3) {
    return {
      available: true,
      label: `残り ${product.stock} 個`,
      showBadge: true
    };
  }

  return {
    available: true,
    label: `在庫: ${product.stock} 個`,
    showBadge: true
  };
}
