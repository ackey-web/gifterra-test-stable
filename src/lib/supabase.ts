// src/lib/supabase.ts
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('⚠️ Supabase環境変数が設定されていません。.envファイルを確認してください。');
}

export const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '');

// 画像をSupabase Storageにアップロード
export async function uploadImage(file: File, bucket: string = 'images'): Promise<string | null> {
  try {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
    const filePath = `${fileName}`;

    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (error) {
      console.error('❌ 画像のアップロードに失敗:', error);
      return null;
    }

    // 公開URLを取得
    const { data: publicData } = supabase.storage
      .from(bucket)
      .getPublicUrl(filePath);

    return publicData.publicUrl;
  } catch (error) {
    console.error('❌ 画像アップロード中にエラー:', error);
    return null;
  }
}

// 画像を削除
export async function deleteImage(url: string, bucket: string = 'images'): Promise<boolean> {
  try {
    // URLからファイルパスを抽出
    const urlParts = url.split('/');
    const fileName = urlParts[urlParts.length - 1];

    const { error } = await supabase.storage
      .from(bucket)
      .remove([fileName]);

    if (error) {
      console.error('❌ 画像の削除に失敗:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('❌ 画像削除中にエラー:', error);
    return false;
  }
}
