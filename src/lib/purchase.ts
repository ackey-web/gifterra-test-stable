// src/lib/purchase.ts
import { formatUnits } from 'viem';
import { CONTRACT_ADDRESS, ERC20_MIN_ABI, CONTRACT_ABI } from '../contract';

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
}

export interface PurchaseResult {
  success: boolean;
  token?: string;
  downloadUrl?: string;
  error?: string;
}

/**
 * 商品を購入する（approve → tip → API呼び出し）
 */
export async function purchaseProduct(
  product: Product,
  userAddress: string,
  walletClient: any,
  publicClient: any
): Promise<PurchaseResult> {
  try {
    console.log('🛒 購入処理開始:', product.name);

    const priceWei = BigInt(product.price_amount_wei);
    const tokenAddress = product.price_token as `0x${string}`;

    // 1. allowance チェック
    const currentAllowance = await publicClient.readContract({
      address: tokenAddress,
      abi: ERC20_MIN_ABI,
      functionName: 'allowance',
      args: [userAddress as `0x${string}`, CONTRACT_ADDRESS],
    }) as bigint;

    console.log('💰 現在のallowance:', formatUnits(currentAllowance, 18));

    // 2. approve（必要な場合のみ）
    if (currentAllowance < priceWei) {
      console.log('📝 Approve実行中...');

      const approveTx = await walletClient.writeContract({
        address: tokenAddress,
        abi: ERC20_MIN_ABI,
        functionName: 'approve',
        args: [CONTRACT_ADDRESS, priceWei],
      });

      console.log('⏳ Approve待機中...', approveTx);

      const approveReceipt = await publicClient.waitForTransactionReceipt({ hash: approveTx });

      if (approveReceipt.status !== 'success') {
        throw new Error('Approveに失敗しました');
      }

      console.log('✅ Approve完了');
    } else {
      console.log('✅ Approve済み（スキップ）');
    }

    // 3. tip実行
    console.log('💸 Tip実行中...', formatUnits(priceWei, 18), 'tokens');

    const tipTx = await walletClient.writeContract({
      address: CONTRACT_ADDRESS,
      abi: CONTRACT_ABI,
      functionName: 'tip',
      args: [priceWei],
    });

    console.log('⏳ Tip待機中...', tipTx);

    const tipReceipt = await publicClient.waitForTransactionReceipt({ hash: tipTx });

    if (tipReceipt.status !== 'success') {
      throw new Error('Tipに失敗しました');
    }

    console.log('✅ Tip完了:', tipTx);

    // 4. APIに購入初期化を通知
    console.log('📡 API呼び出し中...');

    const apiUrl = import.meta.env.VITE_API_BASE_URL || '';
    const response = await fetch(`${apiUrl}/api/purchase/init`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        productId: product.id,
        buyer: userAddress,
        txHash: tipTx,
        amountWei: priceWei.toString(),
      }),
    });

    const result: PurchaseResult = await response.json();

    if (!result.success) {
      console.error('❌ API エラー:', result.error);
      return result;
    }

    console.log('✅ 購入完了！ダウンロードトークン:', result.token);

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
