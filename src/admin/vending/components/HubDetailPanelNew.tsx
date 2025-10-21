// src/admin/vending/components/HubDetailPanelNew.tsx
// 右カラム：選択したHUBの詳細パネル（タブ切替）
import { useState } from 'react';
import type { VendingMachine } from '../../../types/vending';
import { useSupabaseProducts } from '../../../hooks/useSupabaseProducts';
import { ProductForm, type ProductFormData } from '../../products/ProductForm';
import { createProduct, updateProduct, deleteProduct, formDataToCreateParams, formDataToUpdateParams } from '../../../lib/supabase/products';
import { uploadImage } from '../../../lib/supabase';

interface HubDetailPanelNewProps {
  machine: VendingMachine | null;
  onSave?: () => void;
  onToggleActive?: () => void;
  onUpdateMachine?: (updates: Partial<VendingMachine>) => void;
}

type TabType = 'design' | 'products' | 'preview';

export function HubDetailPanelNew({
  machine,
  onSave,
  onToggleActive,
  onUpdateMachine
}: HubDetailPanelNewProps) {
  const [activeTab, setActiveTab] = useState<TabType>('design');
  const [showProductModal, setShowProductModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ProductFormData | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadingHeaderImage, setUploadingHeaderImage] = useState(false);
  const [uploadingBackgroundImage, setUploadingBackgroundImage] = useState(false);

  // Supabase商品取得（HUBのIDをtenantIdとして使用）
  const tenantId = machine?.id || 'default';
  const { products, isLoading, error } = useSupabaseProducts({ tenantId, isActive: true });

  // 新規商品追加モーダルを開く
  const handleAddProduct = () => {
    setEditingProduct(null);
    setShowProductModal(true);
  };

  // 商品編集モーダルを開く
  const handleEditProduct = (product: any) => {
    const formData: ProductFormData = {
      id: product.id,
      name: product.name,
      description: product.description || '',
      priceAmountWei: product.price_amount_wei,
      stock: product.stock,
      isUnlimited: product.is_unlimited,
      contentPath: product.content_path,
      imageUrl: product.image_url || '',
      updatedAt: product.updated_at
    };
    setEditingProduct(formData);
    setShowProductModal(true);
  };

  // モーダルを閉じる
  const handleCloseModal = () => {
    setShowProductModal(false);
    setEditingProduct(null);
  };

  // 商品保存（新規 or 更新）
  const handleSubmitProduct = async (formData: ProductFormData) => {
    setIsSubmitting(true);
    try {
      if (formData.id) {
        // 更新
        const params = formDataToUpdateParams(formData, tenantId);
        if (!params) {
          alert('❌ 更新データの変換に失敗しました');
          return;
        }
        const result = await updateProduct(params);
        if (!result.success) {
          alert(`❌ 更新に失敗しました\n\n${result.error}`);
          return;
        }
        alert('✅ 商品を更新しました');
      } else {
        // 新規作成
        const params = formDataToCreateParams(formData, tenantId);
        const result = await createProduct(params);
        if (!result.success) {
          alert(`❌ 作成に失敗しました\n\n${result.error}`);
          return;
        }
        alert('✅ 商品を作成しました');
      }

      // モーダルを閉じてリフレッシュ（useSupabaseProductsが自動的に再取得）
      handleCloseModal();

      // 強制的に再レンダリングさせるため、少し待ってからページリロード
      setTimeout(() => {
        window.location.reload();
      }, 500);
    } catch (err) {
      console.error('❌ 商品保存エラー:', err);
      alert('❌ 予期しないエラーが発生しました');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 商品削除
  const handleDeleteProduct = async (productId: string) => {
    if (!confirm('この商品を削除してもよろしいですか？')) return;

    try {
      const result = await deleteProduct(productId);
      if (!result.success) {
        alert(`❌ 削除に失敗しました\n\n${result.error}`);
        return;
      }
      alert('✅ 商品を削除しました');

      // 強制的に再レンダリング
      setTimeout(() => {
        window.location.reload();
      }, 500);
    } catch (err) {
      console.error('❌ 商品削除エラー:', err);
      alert('❌ 予期しないエラーが発生しました');
    }
  };

  // デザイン設定を更新（ライブプレビュー反映）
  const handleDesignChange = (field: string, value: string) => {
    if (!machine || !onUpdateMachine) return;

    const updatedMachine: Partial<VendingMachine> = {
      settings: {
        ...machine.settings,
        design: {
          ...machine.settings.design,
          [field]: value
        }
      }
    };

    onUpdateMachine(updatedMachine);
  };

  // ヘッダー画像アップロード
  const handleHeaderImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingHeaderImage(true);
    try {
      console.log('📤 ヘッダー画像アップロード開始:', file.name);
      const imageUrl = await uploadImage(file, 'gh-public');

      if (imageUrl) {
        handleDesignChange('headerImage', imageUrl);
        alert('✅ ヘッダー画像をアップロードしました');
        console.log('✅ アップロード成功:', imageUrl);
      } else {
        throw new Error('uploadImage returned null');
      }
    } catch (err) {
      console.error('❌ 画像アップロードエラー:', err);
      const errorMessage = err instanceof Error ? err.message : String(err);
      alert(`❌ 画像のアップロードに失敗しました\n\n${errorMessage}`);
    } finally {
      setUploadingHeaderImage(false);
      e.target.value = '';
    }
  };

  // 背景画像アップロード
  const handleBackgroundImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingBackgroundImage(true);
    try {
      console.log('📤 背景画像アップロード開始:', file.name);
      const imageUrl = await uploadImage(file, 'gh-public');

      if (imageUrl) {
        handleDesignChange('backgroundImage', imageUrl);
        alert('✅ 背景画像をアップロードしました');
        console.log('✅ アップロード成功:', imageUrl);
      } else {
        throw new Error('uploadImage returned null');
      }
    } catch (err) {
      console.error('❌ 画像アップロードエラー:', err);
      const errorMessage = err instanceof Error ? err.message : String(err);
      alert(`❌ 画像のアップロードに失敗しました\n\n${errorMessage}`);
    } finally {
      setUploadingBackgroundImage(false);
      e.target.value = '';
    }
  };

  if (!machine) {
    return (
      <div
        style={{
          background: 'rgba(255,255,255,.03)',
          borderRadius: 12,
          padding: 40,
          minHeight: 500,
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#fff'
        }}
      >
        <div style={{ textAlign: 'center', opacity: 0.5 }}>
          <p style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>
            GIFT HUBを選択してください
          </p>
          <p style={{ margin: '8px 0 0 0', fontSize: 14 }}>
            左の一覧から編集したいHUBをクリックしてください
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        background: 'rgba(255,255,255,.03)',
        borderRadius: 12,
        minHeight: 500,
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        boxShadow: '0 0 20px rgba(59, 130, 246, 0.1)' // 軽いグロー
      }}
    >
      {/* ヘッダー */}
      <div
        style={{
          padding: 20,
          borderBottom: '1px solid rgba(255,255,255,.1)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: '#fff' }}>
            {machine.name}
          </h2>
          {machine.isActive ? (
            <span style={{
              padding: '4px 12px',
              background: '#10B981',
              fontSize: 12,
              borderRadius: 6,
              fontWeight: 600,
              color: '#fff'
            }}>
              公開中
            </span>
          ) : (
            <span style={{
              padding: '4px 12px',
              background: '#6B7280',
              fontSize: 12,
              borderRadius: 6,
              fontWeight: 600,
              color: '#fff'
            }}>
              非公開
            </span>
          )}
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={onToggleActive}
            style={{
              padding: '8px 16px',
              background: machine.isActive ? '#6B7280' : '#10B981',
              color: '#fff',
              border: 'none',
              borderRadius: 6,
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            {machine.isActive ? '非公開にする' : '公開する'}
          </button>
          <button
            onClick={onSave}
            style={{
              padding: '8px 16px',
              background: '#3B82F6',
              color: '#fff',
              border: 'none',
              borderRadius: 6,
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            保存
          </button>
        </div>
      </div>

      {/* タブナビゲーション */}
      <div
        style={{
          padding: '0 20px',
          borderBottom: '1px solid rgba(255,255,255,.1)',
          display: 'flex',
          gap: 4
        }}
      >
        <button
          onClick={() => setActiveTab('design')}
          role="tab"
          aria-selected={activeTab === 'design'}
          aria-controls="design-panel"
          style={{
            padding: '12px 24px',
            background: activeTab === 'design' ? 'rgba(59, 130, 246, 0.2)' : 'transparent',
            color: activeTab === 'design' ? '#3B82F6' : 'rgba(255,255,255,0.6)',
            border: 'none',
            borderBottom: activeTab === 'design' ? '2px solid #3B82F6' : '2px solid transparent',
            fontSize: 14,
            fontWeight: 700,
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
        >
          🎨 Design
        </button>
        <button
          onClick={() => setActiveTab('products')}
          role="tab"
          aria-selected={activeTab === 'products'}
          aria-controls="products-panel"
          style={{
            padding: '12px 24px',
            background: activeTab === 'products' ? 'rgba(59, 130, 246, 0.2)' : 'transparent',
            color: activeTab === 'products' ? '#3B82F6' : 'rgba(255,255,255,0.6)',
            border: 'none',
            borderBottom: activeTab === 'products' ? '2px solid #3B82F6' : '2px solid transparent',
            fontSize: 14,
            fontWeight: 700,
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
        >
          📦 Products
        </button>
        <button
          onClick={() => setActiveTab('preview')}
          role="tab"
          aria-selected={activeTab === 'preview'}
          aria-controls="preview-panel"
          style={{
            padding: '12px 24px',
            background: activeTab === 'preview' ? 'rgba(59, 130, 246, 0.2)' : 'transparent',
            color: activeTab === 'preview' ? '#3B82F6' : 'rgba(255,255,255,0.6)',
            border: 'none',
            borderBottom: activeTab === 'preview' ? '2px solid #3B82F6' : '2px solid transparent',
            fontSize: 14,
            fontWeight: 700,
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
        >
          👁️ Preview
        </button>
      </div>

      {/* タブコンテンツ */}
      <div
        style={{
          flex: 1,
          padding: 20,
          overflowY: 'auto',
          color: '#fff'
        }}
      >
        {activeTab === 'design' && (
          <div>
            <h3 style={{ margin: '0 0 20px 0', fontSize: 18, fontWeight: 700, color: '#fff' }}>
              デザインカスタマイズ
            </h3>

            {/* カラー設定セクション */}
            <div style={{ marginBottom: 32 }}>
              <h4 style={{ margin: '0 0 16px 0', fontSize: 16, fontWeight: 600, color: 'rgba(255,255,255,0.9)' }}>
                🎨 カラー設定
              </h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
                {/* プライマリカラー */}
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.8)', marginBottom: 8 }}>
                    メインカラー
                  </label>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <input
                      type="color"
                      value={machine.settings.design?.primaryColor || '#3B82F6'}
                      onChange={(e) => handleDesignChange('primaryColor', e.target.value)}
                      style={{ width: 50, height: 40, borderRadius: 6, border: '1px solid rgba(255,255,255,0.2)', cursor: 'pointer' }}
                    />
                    <input
                      type="text"
                      value={machine.settings.design?.primaryColor || '#3B82F6'}
                      onChange={(e) => handleDesignChange('primaryColor', e.target.value)}
                      style={{
                        flex: 1,
                        padding: '8px 12px',
                        background: 'rgba(255,255,255,0.05)',
                        border: '1px solid rgba(255,255,255,0.2)',
                        borderRadius: 6,
                        color: '#fff',
                        fontSize: 13
                      }}
                      placeholder="#3B82F6"
                    />
                  </div>
                </div>

                {/* セカンダリカラー */}
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.8)', marginBottom: 8 }}>
                    サブカラー
                  </label>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <input
                      type="color"
                      value={machine.settings.design?.secondaryColor || '#10B981'}
                      onChange={(e) => handleDesignChange('secondaryColor', e.target.value)}
                      style={{ width: 50, height: 40, borderRadius: 6, border: '1px solid rgba(255,255,255,0.2)', cursor: 'pointer' }}
                    />
                    <input
                      type="text"
                      value={machine.settings.design?.secondaryColor || '#10B981'}
                      onChange={(e) => handleDesignChange('secondaryColor', e.target.value)}
                      style={{
                        flex: 1,
                        padding: '8px 12px',
                        background: 'rgba(255,255,255,0.05)',
                        border: '1px solid rgba(255,255,255,0.2)',
                        borderRadius: 6,
                        color: '#fff',
                        fontSize: 13
                      }}
                      placeholder="#10B981"
                    />
                  </div>
                </div>

                {/* アクセントカラー */}
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.8)', marginBottom: 8 }}>
                    アクセントカラー
                  </label>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <input
                      type="color"
                      value={machine.settings.design?.accentColor || '#F59E0B'}
                      onChange={(e) => handleDesignChange('accentColor', e.target.value)}
                      style={{ width: 50, height: 40, borderRadius: 6, border: '1px solid rgba(255,255,255,0.2)', cursor: 'pointer' }}
                    />
                    <input
                      type="text"
                      value={machine.settings.design?.accentColor || '#F59E0B'}
                      onChange={(e) => handleDesignChange('accentColor', e.target.value)}
                      style={{
                        flex: 1,
                        padding: '8px 12px',
                        background: 'rgba(255,255,255,0.05)',
                        border: '1px solid rgba(255,255,255,0.2)',
                        borderRadius: 6,
                        color: '#fff',
                        fontSize: 13
                      }}
                      placeholder="#F59E0B"
                    />
                  </div>
                </div>

                {/* ボタンカラー */}
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.8)', marginBottom: 8 }}>
                    ボタンカラー
                  </label>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <input
                      type="color"
                      value={machine.settings.design?.buttonColor || '#3B82F6'}
                      onChange={(e) => handleDesignChange('buttonColor', e.target.value)}
                      style={{ width: 50, height: 40, borderRadius: 6, border: '1px solid rgba(255,255,255,0.2)', cursor: 'pointer' }}
                    />
                    <input
                      type="text"
                      value={machine.settings.design?.buttonColor || '#3B82F6'}
                      onChange={(e) => handleDesignChange('buttonColor', e.target.value)}
                      style={{
                        flex: 1,
                        padding: '8px 12px',
                        background: 'rgba(255,255,255,0.05)',
                        border: '1px solid rgba(255,255,255,0.2)',
                        borderRadius: 6,
                        color: '#fff',
                        fontSize: 13
                      }}
                      placeholder="#3B82F6"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* 画像設定セクション */}
            <div style={{ marginBottom: 32 }}>
              <h4 style={{ margin: '0 0 16px 0', fontSize: 16, fontWeight: 600, color: 'rgba(255,255,255,0.9)' }}>
                🖼️ 画像設定
              </h4>

              {/* ヘッダー画像 */}
              <div style={{ marginBottom: 20 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.8)', marginBottom: 8 }}>
                  ヘッダー画像（自販機上部）
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleHeaderImageUpload}
                  disabled={uploadingHeaderImage}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.2)',
                    borderRadius: 6,
                    color: '#fff',
                    fontSize: 13
                  }}
                />
                {uploadingHeaderImage && (
                  <p style={{ margin: '8px 0 0 0', fontSize: 12, color: '#3B82F6' }}>⏳ アップロード中...</p>
                )}
                {machine.settings.design?.headerImage && (
                  <div style={{ marginTop: 12 }}>
                    <img
                      src={machine.settings.design.headerImage}
                      alt="Header preview"
                      style={{ width: '100%', maxHeight: 150, objectFit: 'cover', borderRadius: 6 }}
                    />
                  </div>
                )}
              </div>

              {/* 背景画像 */}
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.8)', marginBottom: 8 }}>
                  背景画像
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleBackgroundImageUpload}
                  disabled={uploadingBackgroundImage}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.2)',
                    borderRadius: 6,
                    color: '#fff',
                    fontSize: 13
                  }}
                />
                {uploadingBackgroundImage && (
                  <p style={{ margin: '8px 0 0 0', fontSize: 12, color: '#3B82F6' }}>⏳ アップロード中...</p>
                )}
                {machine.settings.design?.backgroundImage && (
                  <div style={{ marginTop: 12 }}>
                    <img
                      src={machine.settings.design.backgroundImage}
                      alt="Background preview"
                      style={{ width: '100%', maxHeight: 150, objectFit: 'cover', borderRadius: 6 }}
                    />
                  </div>
                )}
              </div>
            </div>

            {/* プレビューカード */}
            <div style={{ marginBottom: 32 }}>
              <h4 style={{ margin: '0 0 16px 0', fontSize: 16, fontWeight: 600, color: 'rgba(255,255,255,0.9)' }}>
                👁️ カラープレビュー
              </h4>
              <div style={{
                padding: 24,
                background: machine.settings.design?.cardBackgroundColor || 'rgba(255,255,255,0.05)',
                borderRadius: 12,
                border: '1px solid rgba(255,255,255,0.1)'
              }}>
                <h5 style={{
                  margin: '0 0 12px 0',
                  fontSize: 18,
                  fontWeight: 700,
                  color: machine.settings.design?.primaryColor || '#3B82F6'
                }}>
                  メインカラーのサンプル
                </h5>
                <p style={{
                  margin: '0 0 16px 0',
                  fontSize: 14,
                  color: machine.settings.design?.textColor || '#fff'
                }}>
                  テキストカラーのサンプルです。現在の設定が反映されています。
                </p>
                <button style={{
                  padding: '10px 20px',
                  background: machine.settings.design?.buttonColor || '#3B82F6',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 6,
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: 'pointer'
                }}>
                  ボタンカラーのサンプル
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'products' && (
          <div>
            {/* ヘッダー: 新規商品追加ボタン */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#fff' }}>
                Supabase 商品一覧（tenant: {tenantId}）
              </h3>
              <button
                onClick={handleAddProduct}
                style={{
                  padding: '10px 20px',
                  background: '#10B981',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 6,
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6
                }}
              >
                ＋ 新規商品
              </button>
            </div>

            {/* エラー表示 */}
            {error && (
              <div style={{
                padding: 16,
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid #EF4444',
                borderRadius: 8,
                color: '#FCA5A5',
                marginBottom: 20
              }}>
                ❌ エラー: {error}
              </div>
            )}

            {/* ローディング表示 */}
            {isLoading && (
              <div style={{ textAlign: 'center', padding: 40, color: 'rgba(255,255,255,0.6)' }}>
                <p style={{ margin: 0, fontSize: 16 }}>⏳ 読み込み中...</p>
              </div>
            )}

            {/* 商品一覧 */}
            {!isLoading && products.length === 0 && (
              <div style={{ textAlign: 'center', padding: 40, color: 'rgba(255,255,255,0.5)' }}>
                <p style={{ margin: 0, fontSize: 16 }}>📦 商品がありません</p>
                <p style={{ margin: '8px 0 0 0', fontSize: 13 }}>
                  「＋ 新規商品」ボタンから追加してください
                </p>
              </div>
            )}

            {!isLoading && products.length > 0 && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
                {products.map((product) => (
                  <div
                    key={product.id}
                    style={{
                      background: 'rgba(255,255,255,.05)',
                      borderRadius: 8,
                      padding: 16,
                      border: '1px solid rgba(255,255,255,.1)',
                      transition: 'all 0.2s',
                      cursor: 'pointer'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'rgba(255,255,255,.08)';
                      e.currentTarget.style.borderColor = 'rgba(59, 130, 246, 0.5)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'rgba(255,255,255,.05)';
                      e.currentTarget.style.borderColor = 'rgba(255,255,255,.1)';
                    }}
                  >
                    {/* 商品画像 */}
                    {product.image_url && (
                      <img
                        src={product.image_url}
                        alt={product.name}
                        style={{
                          width: '100%',
                          height: 150,
                          objectFit: 'cover',
                          borderRadius: 6,
                          marginBottom: 12
                        }}
                      />
                    )}

                    {/* 商品名 */}
                    <h4 style={{ margin: '0 0 8px 0', fontSize: 16, fontWeight: 700, color: '#fff' }}>
                      {product.name}
                    </h4>

                    {/* 説明 */}
                    {product.description && (
                      <p style={{
                        margin: '0 0 12px 0',
                        fontSize: 13,
                        color: 'rgba(255,255,255,0.6)',
                        lineHeight: 1.4,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical'
                      }}>
                        {product.description}
                      </p>
                    )}

                    {/* 価格 */}
                    <div style={{ marginBottom: 12 }}>
                      <span style={{ fontSize: 14, color: '#10B981', fontWeight: 700 }}>
                        {(Number(product.price_amount_wei) / 1e18).toFixed(2)} tNHT
                      </span>
                    </div>

                    {/* 在庫 */}
                    <div style={{ marginBottom: 12, fontSize: 13, color: 'rgba(255,255,255,0.6)' }}>
                      {product.is_unlimited ? (
                        <span>在庫: <strong style={{ color: '#10B981' }}>∞ 無制限</strong></span>
                      ) : (
                        <span>在庫: <strong style={{ color: product.stock > 0 ? '#10B981' : '#EF4444' }}>{product.stock}</strong></span>
                      )}
                    </div>

                    {/* アクションボタン */}
                    <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEditProduct(product);
                        }}
                        style={{
                          flex: 1,
                          padding: '8px 12px',
                          background: '#3B82F6',
                          color: '#fff',
                          border: 'none',
                          borderRadius: 4,
                          fontSize: 13,
                          fontWeight: 600,
                          cursor: 'pointer'
                        }}
                      >
                        編集
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteProduct(product.id);
                        }}
                        style={{
                          flex: 1,
                          padding: '8px 12px',
                          background: '#EF4444',
                          color: '#fff',
                          border: 'none',
                          borderRadius: 4,
                          fontSize: 13,
                          fontWeight: 600,
                          cursor: 'pointer'
                        }}
                      >
                        削除
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'preview' && (
          <div>
            <h3 style={{ margin: '0 0 20px 0', fontSize: 18, fontWeight: 700, color: '#fff' }}>
              プレビュー
            </h3>

            {/* 自販機風プレビュー */}
            <div
              style={{
                background: machine.settings.design?.backgroundImage
                  ? `linear-gradient(rgba(26, 26, 46, 0.85), rgba(22, 33, 62, 0.85)), url(${machine.settings.design.backgroundImage})`
                  : 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                borderRadius: 16,
                padding: 24,
                minHeight: 600,
                border: '2px solid rgba(255,255,255,0.1)',
                boxShadow: `0 0 40px ${machine.settings.design?.primaryColor || '#3B82F6'}40`
              }}
            >
              {/* ヘッダー画像 */}
              {machine.settings.design?.headerImage && (
                <div style={{ marginBottom: 20, borderRadius: 12, overflow: 'hidden' }}>
                  <img
                    src={machine.settings.design.headerImage}
                    alt="Header"
                    style={{ width: '100%', height: 120, objectFit: 'cover' }}
                  />
                </div>
              )}

              {/* HUBタイトル */}
              <div
                style={{
                  textAlign: 'center',
                  padding: '16px 0',
                  marginBottom: 24,
                  borderRadius: 8,
                  background: 'rgba(0,0,0,0.3)',
                  border: '1px solid rgba(255,255,255,0.1)'
                }}
              >
                <h2
                  style={{
                    margin: 0,
                    fontSize: 24,
                    fontWeight: 800,
                    color: machine.settings.design?.primaryColor || '#3B82F6',
                    textShadow: `0 0 20px ${machine.settings.design?.primaryColor || '#3B82F6'}80`
                  }}
                >
                  {machine.settings.displayName || machine.name}
                </h2>
                <p style={{ margin: '8px 0 0 0', fontSize: 14, color: machine.settings.design?.textColor || '#fff', opacity: 0.8 }}>
                  {machine.settings.welcomeMessage}
                </p>
              </div>

              {/* 商品一覧グリッド */}
              <div style={{ marginBottom: 24 }}>
                <h4 style={{
                  margin: '0 0 16px 0',
                  fontSize: 16,
                  fontWeight: 700,
                  color: machine.settings.design?.secondaryColor || '#10B981'
                }}>
                  商品一覧（{products.length}件）
                </h4>

                {isLoading && (
                  <div style={{ textAlign: 'center', padding: 40, color: 'rgba(255,255,255,0.6)' }}>
                    <p style={{ margin: 0, fontSize: 14 }}>⏳ 読み込み中...</p>
                  </div>
                )}

                {!isLoading && products.length === 0 && (
                  <div style={{ textAlign: 'center', padding: 40, color: 'rgba(255,255,255,0.5)' }}>
                    <p style={{ margin: 0, fontSize: 14 }}>📦 商品がありません</p>
                  </div>
                )}

                {!isLoading && products.length > 0 && (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 12 }}>
                    {products.slice(0, 6).map((product) => (
                      <div
                        key={product.id}
                        style={{
                          background: machine.settings.design?.cardBackgroundColor || 'rgba(255,255,255,0.05)',
                          borderRadius: 8,
                          padding: 12,
                          border: `1px solid ${machine.settings.design?.accentColor || '#F59E0B'}40`,
                          transition: 'all 0.2s',
                          cursor: 'pointer'
                        }}
                      >
                        {product.image_url && (
                          <img
                            src={product.image_url}
                            alt={product.name}
                            style={{
                              width: '100%',
                              height: 80,
                              objectFit: 'cover',
                              borderRadius: 6,
                              marginBottom: 8
                            }}
                          />
                        )}
                        <h5 style={{
                          margin: '0 0 4px 0',
                          fontSize: 12,
                          fontWeight: 700,
                          color: machine.settings.design?.textColor || '#fff',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap'
                        }}>
                          {product.name}
                        </h5>
                        <p style={{
                          margin: 0,
                          fontSize: 11,
                          color: machine.settings.design?.secondaryColor || '#10B981',
                          fontWeight: 600
                        }}>
                          {(Number(product.price_amount_wei) / 1e18).toFixed(1)} tNHT
                        </p>
                      </div>
                    ))}
                  </div>
                )}

                {!isLoading && products.length > 6 && (
                  <p style={{ margin: '16px 0 0 0', fontSize: 13, color: 'rgba(255,255,255,0.5)', textAlign: 'center' }}>
                    ※ 最初の6件を表示中（全{products.length}件）
                  </p>
                )}
              </div>

              {/* サンプル購入ボタン */}
              <div style={{ textAlign: 'center' }}>
                <button
                  disabled
                  style={{
                    padding: '12px 32px',
                    background: machine.settings.design?.buttonColor || '#3B82F6',
                    color: '#fff',
                    border: 'none',
                    borderRadius: 8,
                    fontSize: 14,
                    fontWeight: 700,
                    cursor: 'not-allowed',
                    opacity: 0.6,
                    boxShadow: `0 4px 12px ${machine.settings.design?.buttonColor || '#3B82F6'}40`
                  }}
                >
                  購入ボタン（プレビューのみ）
                </button>
              </div>

              {/* 設定情報表示 */}
              <div style={{
                marginTop: 24,
                padding: 16,
                background: 'rgba(0,0,0,0.3)',
                borderRadius: 8,
                border: '1px solid rgba(255,255,255,0.1)'
              }}>
                <h5 style={{ margin: '0 0 12px 0', fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.9)' }}>
                  現在のデザイン設定
                </h5>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)', lineHeight: 1.6 }}>
                  <p style={{ margin: '4px 0' }}>
                    メインカラー: <span style={{ color: machine.settings.design?.primaryColor || '#3B82F6' }}>●</span> {machine.settings.design?.primaryColor || '#3B82F6'}
                  </p>
                  <p style={{ margin: '4px 0' }}>
                    サブカラー: <span style={{ color: machine.settings.design?.secondaryColor || '#10B981' }}>●</span> {machine.settings.design?.secondaryColor || '#10B981'}
                  </p>
                  <p style={{ margin: '4px 0' }}>
                    アクセントカラー: <span style={{ color: machine.settings.design?.accentColor || '#F59E0B' }}>●</span> {machine.settings.design?.accentColor || '#F59E0B'}
                  </p>
                  <p style={{ margin: '4px 0' }}>
                    ボタンカラー: <span style={{ color: machine.settings.design?.buttonColor || '#3B82F6' }}>●</span> {machine.settings.design?.buttonColor || '#3B82F6'}
                  </p>
                  <p style={{ margin: '4px 0' }}>
                    営業時間: {machine.settings.operatingHours.start} - {machine.settings.operatingHours.end}
                  </p>
                  <p style={{ margin: '4px 0' }}>
                    トークン: {machine.settings.tokenSymbol || 'tNHT'}
                  </p>
                </div>
              </div>
            </div>

            {/* 注意書き */}
            <div style={{
              marginTop: 20,
              padding: 16,
              background: 'rgba(59, 130, 246, 0.1)',
              border: '1px solid rgba(59, 130, 246, 0.3)',
              borderRadius: 8
            }}>
              <p style={{ margin: 0, fontSize: 13, color: 'rgba(255,255,255,0.8)', lineHeight: 1.6 }}>
                💡 このプレビューはデザイン設定の確認用です。実際のGIFT HUBは別ページで表示されます。
                Designタブでカラーや画像を変更すると、このプレビューにリアルタイムで反映されます。
              </p>
            </div>
          </div>
        )}
      </div>

      {/* 商品追加/編集モーダル */}
      {showProductModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: 20
          }}
          onClick={handleCloseModal}
        >
          <div onClick={(e) => e.stopPropagation()}>
            <ProductForm
              initialData={editingProduct || undefined}
              onSubmit={handleSubmitProduct}
              onCancel={handleCloseModal}
              isSubmitting={isSubmitting}
            />
          </div>
        </div>
      )}
    </div>
  );
}
