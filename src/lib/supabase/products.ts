// src/lib/supabase/products.ts
// Supabase 商品管理用のヘルパー関数
// RLSポリシーに準拠し、サービスロールは使用しない

import { supabase } from '../supabase';
import type { ProductFormData } from '../../admin/products/ProductForm';

const DEFAULT_TENANT_ID = 'default';
const DEFAULT_TOKEN = '0xdB738C7A83FE7738299a67741Ae2AbE42B3BA2Ea'; // tNHT

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
    const { error } = await supabase
      .from('products')
      .insert([{
        tenant_id: params.tenantId || DEFAULT_TENANT_ID,
        name: params.name,
        description: params.description,
        content_path: params.contentPath,
        image_url: params.imageUrl,
        price_token: DEFAULT_TOKEN,
        price_amount_wei: params.priceAmountWei,
        stock: params.stock,
        is_unlimited: params.isUnlimited,
        is_active: true,
      }]);

    if (error) {
      console.error('❌ 商品作成エラー:', error);
      return { success: false, error: error.message };
    }

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
    const { error } = await supabase
      .from('products')
      .update({
        tenant_id: params.tenantId || DEFAULT_TENANT_ID,
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

    return { success: true };
  } catch (err) {
    console.error('❌ 商品更新エラー (catch):', err);
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}

/**
 * 商品を削除（実際には is_active = false に設定）
 * @param productId 商品ID
 * @returns 成功/失敗
 */
export async function deleteProduct(productId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('products')
      .update({ is_active: false })
      .eq('id', productId);

    if (error) {
      console.error('❌ 商品削除エラー:', error);
      return { success: false, error: error.message };
    }

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
