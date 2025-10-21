// src/lib/supabase.ts
import { createClient } from '@supabase/supabase-js';
import { bucket, type BucketKey, type UploadKind, bucketNameForKind } from './storageBuckets';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('⚠️ Supabase環境変数が設定されていません。.envファイルを確認してください。');
}

export const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '');

/**
 * URLからファイルパスを抽出
 * 例: https://xxx.supabase.co/storage/v1/object/public/gh-public/12345.jpg → 12345.jpg
 */
export function extractFilePathFromUrl(url: string, bucketName: string): string | null {
  try {
    const urlObj = new URL(url);
    const pathParts = urlObj.pathname.split('/');
    const bucketIndex = pathParts.indexOf(bucketName);
    if (bucketIndex !== -1 && bucketIndex < pathParts.length - 1) {
      // バケット名以降のパスを結合
      return pathParts.slice(bucketIndex + 1).join('/');
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * URLからバケット名とファイルパスを自動抽出して削除
 *
 * @param url - ファイルの公開URL
 * @returns 削除成功時 true
 */
export async function deleteFileFromUrl(url: string): Promise<boolean> {
  try {
    if (!url) return false;

    // URLからバケット名を推定
    const urlObj = new URL(url);
    const pathParts = urlObj.pathname.split('/');

    // バケット名を探す（gh-public, gh-downloads など）
    const bucketName = pathParts.find(part => part.startsWith('gh-'));
    if (!bucketName) {
      console.error('❌ バケット名を特定できませんでした:', url);
      return false;
    }

    // ファイルパスを抽出
    const filePath = extractFilePathFromUrl(url, bucketName);
    if (!filePath) {
      console.error('❌ ファイルパスを抽出できませんでした:', url);
      return false;
    }

    console.log('🗑️ ファイル削除:', { bucket: bucketName, path: filePath });

    const { error } = await supabase.storage
      .from(bucketName)
      .remove([filePath]);

    if (error) {
      console.error('❌ ファイルの削除に失敗:', error);
      return false;
    }

    console.log('✅ ファイル削除成功:', filePath);
    return true;
  } catch (error) {
    console.error('❌ ファイル削除中にエラー:', error);
    return false;
  }
}

/**
 * ファイルをSupabase Storageにアップロード（用途ベース）
 *
 * @param file - アップロードするファイル
 * @param kind - アップロード用途（'preview' | 'product' | 'logo' | 'avatar' | 'temp'）
 * @returns アップロードされたファイルの公開URL
 *
 * @example
 * // プレビュー画像をアップロード（gh-publicバケット）
 * const url = await uploadFile(imageFile, 'preview');
 *
 * @example
 * // 商品ファイルをアップロード（gh-downloadsバケット）
 * const url = await uploadFile(productFile, 'product');
 */
export async function uploadFile(file: File, kind: UploadKind): Promise<string> {
  try {
    const bucketName = bucketNameForKind(kind);
    console.log('📤 uploadFile 開始:', { fileName: file.name, size: file.size, kind, bucket: bucketName });

    // Supabase クライアントの設定確認
    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error('Supabase環境変数が設定されていません。VITE_SUPABASE_URL と VITE_SUPABASE_ANON_KEY を確認してください。');
    }

    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
    const filePath = `${fileName}`;

    console.log('📤 アップロード先:', { bucket: bucketName, filePath });

    const { data, error } = await supabase.storage
      .from(bucketName)
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (error) {
      console.error('❌ Supabase Storage エラー:', error);
      throw new Error(`Supabase Storage エラー: ${error.message} (bucket: ${bucketName}, kind: ${kind})`);
    }

    console.log('✅ アップロード成功:', data);

    // 公開URLを取得
    const { data: publicData } = supabase.storage
      .from(bucketName)
      .getPublicUrl(filePath);

    console.log('✅ 公開URL取得:', publicData.publicUrl);
    return publicData.publicUrl;
  } catch (error) {
    console.error('❌ uploadFile エラー:', error);
    throw error;
  }
}

/**
 * 画像をSupabase Storageにアップロード（後方互換性のため残存）
 * @deprecated uploadFile() を使用してください
 *
 * @param file - アップロードするファイル
 * @param bucketName - バケット名（文字列）または BucketKey
 * @returns アップロードされたファイルの公開URL
 */
export async function uploadImage(file: File, bucketName: string | BucketKey = 'PUBLIC'): Promise<string | null> {
  try {
    // BucketKey の場合は bucket() で実バケット名に変換
    const actualBucket = bucketName === 'PUBLIC' || bucketName === 'DOWNLOADS' || bucketName === 'LOGOS' || bucketName === 'AVATARS' || bucketName === 'TEMP'
      ? bucket(bucketName as BucketKey)
      : bucketName;

    console.log('📤 uploadImage 開始:', { fileName: file.name, size: file.size, bucket: actualBucket });

    // Supabase クライアントの設定確認
    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error('Supabase環境変数が設定されていません。VITE_SUPABASE_URL と VITE_SUPABASE_ANON_KEY を確認してください。');
    }

    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
    const filePath = `${fileName}`;

    console.log('📤 アップロード先:', { bucket: actualBucket, filePath });

    const { data, error } = await supabase.storage
      .from(actualBucket)
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (error) {
      console.error('❌ Supabase Storage エラー:', error);
      throw new Error(`Supabase Storage エラー: ${error.message} (bucket: ${actualBucket})`);
    }

    console.log('✅ アップロード成功:', data);

    // 公開URLを取得
    const { data: publicData } = supabase.storage
      .from(actualBucket)
      .getPublicUrl(filePath);

    console.log('✅ 公開URL取得:', publicData.publicUrl);
    return publicData.publicUrl;
  } catch (error) {
    console.error('❌ uploadImage エラー:', error);
    throw error;
  }
}

/**
 * ファイルを削除
 *
 * @param url - ファイルの公開URL
 * @param bucketName - バケット名（文字列）または BucketKey
 * @returns 削除成功時 true
 */
export async function deleteFile(url: string, bucketName: string | BucketKey = 'PUBLIC'): Promise<boolean> {
  try {
    // BucketKey の場合は bucket() で実バケット名に変換
    const actualBucket = bucketName === 'PUBLIC' || bucketName === 'DOWNLOADS' || bucketName === 'LOGOS' || bucketName === 'AVATARS' || bucketName === 'TEMP'
      ? bucket(bucketName as BucketKey)
      : bucketName;

    // URLからファイルパスを抽出
    const urlParts = url.split('/');
    const fileName = urlParts[urlParts.length - 1];

    const { error } = await supabase.storage
      .from(actualBucket)
      .remove([fileName]);

    if (error) {
      console.error('❌ ファイルの削除に失敗:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('❌ ファイル削除中にエラー:', error);
    return false;
  }
}

/**
 * 画像を削除（後方互換性のため残存）
 * @deprecated deleteFile() を使用してください
 */
export async function deleteImage(url: string, bucketName: string | BucketKey = 'PUBLIC'): Promise<boolean> {
  return deleteFile(url, bucketName);
}
