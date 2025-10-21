// src/lib/supabase/products.ts
// Supabase 商品管理用のヘルパー関数
// RLSポリシーに準拠し、サービスロールは使用しない

import { supabase, deleteFileFromUrl } from '../supabase';
import type { ProductFormData } from '../../admin/products/ProductForm';

const DEFAULT_TENANT_ID = 'default';
const DEFAULT_TOKEN = '0xdB738C7A83FE7738299a67741Ae2AbE42B3BA2Ea'; // tNHT
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;

export interface CreateProductParams {
  tenantId?: string;
  name: string;
  description: string;
  contentPath: string;
  imageUrl: string;
  priceAmountWei: string;
  stock: number;
  isUnlimited: boolean;
}

export interface UpdateProductParams extends CreateProductParams {
  productId: string;
}

/**
 * 商品を新規作成
 * @param params 商品データ
 * @returns 成功/失敗
 */
export async function createProduct(params: CreateProductParams): Promise<{ success: boolean; error?: string }> {
  try {
    const tenantId = params.tenantId || DEFAULT_TENANT_ID;
    console.log('🆕 [商品作成] tenant_id:', tenantId, 'name:', params.name);

    const productData = {
      tenant_id: tenantId,
      name: params.name,
      description: params.description,
      content_path: params.contentPath,
      image_url: params.imageUrl,
      price_token: DEFAULT_TOKEN,
      price_amount_wei: params.priceAmountWei,
      stock: params.stock,
      is_unlimited: params.isUnlimited,
      is_active: true,
    };

    console.log('📤 [商品作成] データ:', { tenant_id: productData.tenant_id, name: productData.name });

    const { error } = await supabase
      .from('products')
      .insert([productData]);

    if (error) {
      console.error('❌ 商品作成エラー:', error);
      return { success: false, error: error.message };
    }

    console.log('✅ [商品作成] 成功 - tenant_id:', tenantId);
    return { success: true };
  } catch (err) {
    console.error('❌ 商品作成エラー (catch):', err);
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}

/**
 * 商品を更新
 * @param params 商品データ
 * @returns 成功/失敗
 */
export async function updateProduct(params: UpdateProductParams): Promise<{ success: boolean; error?: string }> {
  try {
    const tenantId = params.tenantId || DEFAULT_TENANT_ID;
    console.log('🔄 [商品更新] product_id:', params.productId, 'tenant_id:', tenantId, 'name:', params.name);

    const { error } = await supabase
      .from('products')
      .update({
        tenant_id: tenantId,
        name: params.name,
        description: params.description,
        content_path: params.contentPath,
        image_url: params.imageUrl,
        price_token: DEFAULT_TOKEN,
        price_amount_wei: params.priceAmountWei,
        stock: params.stock,
        is_unlimited: params.isUnlimited,
        is_active: true,
      })
      .eq('id', params.productId);

    if (error) {
      console.error('❌ 商品更新エラー:', error);
      return { success: false, error: error.message };
    }

    console.log('✅ [商品更新] 成功 - product_id:', params.productId);
    return { success: true };
  } catch (err) {
    console.error('❌ 商品更新エラー (catch):', err);
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}

/**
 * 商品を削除（関連ファイルも削除し、is_active = false に設定）
 * @param productId 商品ID
 * @returns 成功/失敗
 */
export async function deleteProduct(productId: string): Promise<{ success: boolean; error?: string }> {
  try {
    console.log('🗑️ [削除開始] 商品ID:', productId);

    // まず商品データを取得
    const { data: product, error: fetchError } = await supabase
      .from('products')
      .select('image_url, content_path, is_active')
      .eq('id', productId)
      .single();

    if (fetchError) {
      console.error('❌ 商品取得エラー:', fetchError);
      return { success: false, error: `商品データの取得に失敗: ${fetchError.message}` };
    }

    if (!product) {
      console.error('❌ 商品が見つかりません:', productId);
      return { success: false, error: '商品が見つかりません' };
    }

    console.log('📦 削除対象商品:', { id: productId, name: product.image_url, is_active: product.is_active });

    // 関連ファイルを削除
    const deletionResults: string[] = [];

    if (product?.image_url) {
      console.log('🗑️ サムネイル画像を削除:', product.image_url);
      const imageDeleted = await deleteFileFromUrl(product.image_url);
      if (imageDeleted) {
        deletionResults.push('サムネイル画像を削除しました');
      } else {
        deletionResults.push('サムネイル画像の削除に失敗しました（既に削除済みの可能性）');
      }
    }

    if (product?.content_path) {
      // content_pathはファイル名のみの場合があるので、フルURLを構築
      const contentUrl = product.content_path.startsWith('http')
        ? product.content_path
        : `${supabaseUrl}/storage/v1/object/public/gh-public/${product.content_path}`;

      console.log('🗑️ 配布ファイルを削除:', contentUrl);
      const contentDeleted = await deleteFileFromUrl(contentUrl);
      if (contentDeleted) {
        deletionResults.push('配布ファイルを削除しました');
      } else {
        deletionResults.push('配布ファイルの削除に失敗しました（既に削除済みの可能性）');
      }
    }

    // 商品を非アクティブに設定
    console.log('🔄 is_activeをfalseに設定中...');
    const { error } = await supabase
      .from('products')
      .update({ is_active: false })
      .eq('id', productId);

    if (error) {
      console.error('❌ 商品削除エラー (UPDATE失敗):', error);
      return { success: false, error: `商品の非アクティブ化に失敗: ${error.message}` };
    }

    console.log('✅ 商品削除完了:', deletionResults);
    return { success: true };
  } catch (err) {
    console.error('❌ 商品削除エラー (catch):', err);
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}

/**
 * ProductFormData を CreateProductParams に変換
 */
export function formDataToCreateParams(formData: ProductFormData, tenantId?: string): CreateProductParams {
  return {
    tenantId,
    name: formData.name,
    description: formData.description,
    contentPath: formData.contentPath,
    imageUrl: formData.imageUrl,
    priceAmountWei: formData.priceAmountWei,
    stock: formData.stock,
    isUnlimited: formData.isUnlimited,
  };
}

/**
 * ProductFormData を UpdateProductParams に変換
 */
export function formDataToUpdateParams(formData: ProductFormData, tenantId?: string): UpdateProductParams | null {
  if (!formData.id) return null;

  return {
    productId: formData.id,
    tenantId,
    name: formData.name,
    description: formData.description,
    contentPath: formData.contentPath,
    imageUrl: formData.imageUrl,
    priceAmountWei: formData.priceAmountWei,
    stock: formData.stock,
    isUnlimited: formData.isUnlimited,
  };
}
