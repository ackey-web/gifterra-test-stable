// src/admin/products/ProductForm.tsx
// 商品作成・編集用の再利用可能なフォームコンポーネント
import React, { useState } from 'react';
import { uploadImage } from '../../lib/supabase';

export interface ProductFormData {
  id?: string;
  name: string;
  description: string;
  priceAmountWei: string;
  stock: number;
  isUnlimited: boolean;
  contentPath: string;
  imageUrl: string;
  updatedAt?: string;
}

interface ProductFormProps {
  initialData?: ProductFormData;
  onSubmit: (data: ProductFormData) => Promise<void>;
  onCancel: () => void;
  isSubmitting?: boolean;
}

const DEFAULT_FORM_DATA: ProductFormData = {
  name: '',
  description: '',
  priceAmountWei: '10000000000000000000', // 10 tNHT
  stock: 0,
  isUnlimited: true,
  contentPath: '',
  imageUrl: ''
};

export function ProductForm({
  initialData,
  onSubmit,
  onCancel,
  isSubmitting = false
}: ProductFormProps) {
  const [formData, setFormData] = useState<ProductFormData>(
    initialData || DEFAULT_FORM_DATA
  );
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);

  const handleChange = (field: keyof ProductFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // 画像アップロード
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingImage(true);
    try {
      console.log('📤 画像アップロード開始:', file.name, file.size);
      const imageUrl = await uploadImage(file, 'gh-public');

      if (imageUrl) {
        handleChange('imageUrl', imageUrl);
        alert('✅ 画像をアップロードしました');
        console.log('✅ アップロード成功:', imageUrl);
      } else {
        throw new Error('uploadImage returned null');
      }
    } catch (err) {
      console.error('❌ 画像アップロードエラー:', err);

      const errorMessage = err instanceof Error ? err.message : String(err);

      if (errorMessage.includes('bucket') || errorMessage.includes('not found')) {
        alert(
          '❌ 画像アップロードに失敗しました\n\n' +
          '原因: Supabase Storage バケット "gh-public" が存在しないか、アクセスできません。\n\n' +
          '解決策:\n' +
          '1. Supabase Dashboard → Storage\n' +
          '2. "gh-public" バケットが存在するか確認\n' +
          '3. バケットのポリシー設定で public アクセスが許可されているか確認'
        );
      } else {
        alert(`❌ 画像のアップロードに失敗しました\n\n${errorMessage}`);
      }
    } finally {
      setUploadingImage(false);
      e.target.value = '';
    }
  };

  // ファイルアップロード
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingFile(true);
    try {
      console.log('📤 配布ファイルアップロード開始:', file.name, file.size);

      // 一時的に gh-public バケットにアップロード
      // TODO: 本番環境では gh-downloads（非公開）+ サーバーサイドAPI経由に変更
      const fileUrl = await uploadImage(file, 'gh-public');

      if (fileUrl) {
        // URLからファイルパスを抽出（公開URLから）
        const urlParts = fileUrl.split('/');
        const fileName = urlParts[urlParts.length - 1];

        handleChange('contentPath', fileName);
        alert('✅ 配布ファイルをアップロードしました');
        console.log('✅ アップロード成功:', fileUrl);
      } else {
        throw new Error('uploadImage returned null');
      }
    } catch (err) {
      console.error('❌ ファイルアップロードエラー:', err);

      const errorMessage = err instanceof Error ? err.message : String(err);
      alert(`❌ 配布ファイルのアップロードに失敗しました\n\n${errorMessage}`);
    } finally {
      setUploadingFile(false);
      e.target.value = '';
    }
  };

  const handleSubmit = async () => {
    // バリデーション
    if (!formData.name || !formData.priceAmountWei) {
      alert('商品名と価格は必須です');
      return;
    }

    // contentPath の検証（警告のみ）
    if (!formData.contentPath) {
      const confirmed = confirm(
        '⚠️ 配布ファイルが設定されていません。\n' +
        'このまま保存すると、購入後のダウンロードができません。\n\n' +
        '保存を続けますか？'
      );
      if (!confirmed) return;
    }

    await onSubmit(formData);
  };

  return (
    <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
      <div className="p-6">
        <h2 className="text-2xl font-bold mb-4 text-gray-800">
          {formData.id ? '商品編集' : '新規商品追加'}
        </h2>

        <div className="space-y-4">
          {/* 商品名 */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">商品名 *</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => handleChange('name', e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-2"
              placeholder="例: ベーシックアバター.glb"
            />
          </div>

          {/* 説明 */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">説明</label>
            <textarea
              value={formData.description}
              onChange={(e) => handleChange('description', e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-2"
              rows={3}
              placeholder="商品の説明を入力してください"
            />
          </div>

          {/* 価格 */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">価格（Wei） *</label>
            <input
              type="text"
              value={formData.priceAmountWei}
              onChange={(e) => handleChange('priceAmountWei', e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-2"
              placeholder="10000000000000000000 (= 10 tNHT)"
            />
            <p className="text-xs text-gray-500 mt-1">
              現在: {(Number(formData.priceAmountWei) / 1e18).toFixed(2)} tNHT
            </p>
          </div>

          {/* 在庫設定 */}
          <div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.isUnlimited}
                onChange={(e) => handleChange('isUnlimited', e.target.checked)}
                className="w-4 h-4"
              />
              <span className="text-sm font-semibold text-gray-700">在庫無制限（∞）</span>
            </label>
          </div>

          {!formData.isUnlimited && (
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">在庫数</label>
              <input
                type="number"
                value={formData.stock}
                onChange={(e) => handleChange('stock', parseInt(e.target.value) || 0)}
                className="w-full border border-gray-300 rounded px-3 py-2"
                min="0"
              />
            </div>
          )}

          {/* 画像アップロード */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">サムネイル画像</label>
            <input
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              disabled={uploadingImage}
              className="w-full border border-gray-300 rounded px-3 py-2"
            />
            {formData.imageUrl && (
              <div className="mt-2">
                <img src={formData.imageUrl} alt="Preview" className="w-32 h-32 object-cover rounded" />
              </div>
            )}
          </div>

          {/* ファイルアップロード */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              配布ファイル
              <span className="text-orange-600 ml-1">(購入後のダウンロードに必要)</span>
            </label>
            <input
              type="file"
              onChange={handleFileUpload}
              disabled={uploadingFile}
              className="w-full border border-gray-300 rounded px-3 py-2"
            />
            {uploadingFile && (
              <p className="text-xs text-blue-600 mt-1">⏳ アップロード中...</p>
            )}
            {formData.contentPath ? (
              <p className="text-xs text-green-600 mt-1">✅ パス: {formData.contentPath}</p>
            ) : (
              <p className="text-xs text-gray-500 mt-1">⚠️ ファイル未設定（保存時に警告が表示されます）</p>
            )}
          </div>
        </div>

        <div className="mt-6 flex gap-3 justify-end">
          <button
            onClick={onCancel}
            className="px-4 py-2 bg-gray-400 text-white rounded hover:bg-gray-500"
          >
            キャンセル
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {isSubmitting ? '保存中...' : '保存'}
          </button>
        </div>
      </div>
    </div>
  );
}
