// src/admin/vending/components/HubDetailPanelNew.tsx
// 右カラム：選択したHUBの詳細パネル（タブ切替）
import { useState, useRef } from 'react';
import type { VendingMachine } from '../../../types/vending';
import { useSupabaseProducts } from '../../../hooks/useSupabaseProducts';
import { ProductForm, type ProductFormData } from '../../products/ProductForm';
import { createProduct, updateProduct, deleteProduct, formDataToCreateParams, formDataToUpdateParams } from '../../../lib/supabase/products';
import { uploadImage, deleteFileFromUrl } from '../../../lib/supabase';
import { generateSlug } from '../../../utils/slugGenerator';
import { calculateFileHash } from '../../../utils/fileHash';

interface HubDetailPanelNewProps {
  machine: VendingMachine | null;
  onSave?: () => void;
  onToggleActive?: () => void;
  onUpdateMachine?: (updates: Partial<VendingMachine>) => void;
}

type TabType = 'settings' | 'design' | 'products' | 'preview';

const REDIRECT_TAB_KEY = 'vending_redirect_tab';

export function HubDetailPanelNew({
  machine,
  onSave,
  onToggleActive,
  onUpdateMachine
}: HubDetailPanelNewProps) {
  const [activeTab, setActiveTab] = useState<TabType>(() => {
    // リダイレクト用に保存されたタブがあればそれを使用
    const savedTab = localStorage.getItem(REDIRECT_TAB_KEY);
    if (savedTab && ['settings', 'design', 'products', 'preview'].includes(savedTab)) {
      localStorage.removeItem(REDIRECT_TAB_KEY);
      return savedTab as TabType;
    }
    return 'settings';
  });
  const [showProductModal, setShowProductModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ProductFormData | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadingHeaderImage, setUploadingHeaderImage] = useState(false);
  const [uploadingBackgroundImage, setUploadingBackgroundImage] = useState(false);

  // 画像ハッシュ管理（重複検知用）
  const [headerImageHash, setHeaderImageHash] = useState<string | null>(null);
  const [backgroundImageHash, setBackgroundImageHash] = useState<string | null>(null);
  const previousHeaderImageRef = useRef<string | null>(machine?.settings?.design?.headerImage || null);
  const previousBackgroundImageRef = useRef<string | null>(machine?.settings?.design?.backgroundImage || null);

  // Supabase商品取得（HUBのIDをtenantIdとして使用）
  const tenantId = machine?.id || 'default';

  console.log('🎯 [HubDetailPanel] 現在のGIFT HUB:', {
    machineId: machine?.id,
    machineName: machine?.name,
    machineSlug: machine?.slug,
    tenantId
  });

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
      console.log('💾 [特典保存] tenantId:', tenantId, 'formData.id:', formData.id);

      if (formData.id) {
        // 更新
        const params = formDataToUpdateParams(formData, tenantId);
        if (!params) {
          alert('❌ 更新データの変換に失敗しました');
          return;
        }
        console.log('📝 [特典更新] params:', { productId: params.productId, tenantId: params.tenantId });
        const result = await updateProduct(params);
        if (!result.success) {
          alert(`❌ 更新に失敗しました\n\n${result.error}`);
          return;
        }
        alert('✅ 特典を更新しました');
      } else {
        // 新規作成
        const params = formDataToCreateParams(formData, tenantId);
        console.log('🆕 [特典作成] params:', { tenantId: params.tenantId, name: params.name });
        const result = await createProduct(params);
        if (!result.success) {
          alert(`❌ 作成に失敗しました\n\n${result.error}`);
          return;
        }
        alert('✅ 特典を作成しました');
      }

      // モーダルを閉じてリフレッシュ（useSupabaseProductsが自動的に再取得）
      handleCloseModal();

      // リロード後にProductsタブを開くためにlocalStorageに保存
      localStorage.setItem(REDIRECT_TAB_KEY, 'products');

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
    if (!confirm('この特典を削除してもよろしいですか？')) return;

    try {
      const result = await deleteProduct(productId);
      if (!result.success) {
        alert(`❌ 削除に失敗しました\n\n${result.error}`);
        return;
      }
      alert('✅ 特典を削除しました');

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

    // カラー設定の場合は primaryColor と secondaryColor を連動させる
    const designUpdates = field === 'primaryColor' || field === 'secondaryColor'
      ? {
          ...machine.settings.design,
          primaryColor: value,
          secondaryColor: value
        }
      : {
          ...machine.settings.design,
          [field]: value
        };

    const updatedMachine: Partial<VendingMachine> = {
      settings: {
        ...machine.settings,
        design: designUpdates
      }
    };

    onUpdateMachine(updatedMachine);
  };

  // ディスプレイ画像アップロード
  const handleHeaderImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingHeaderImage(true);
    try {
      // ファイルハッシュを計算して重複チェック
      const fileHash = await calculateFileHash(file);

      if (headerImageHash === fileHash) {
        const proceed = confirm('⚠️ 同じ画像が既にアップロードされています。\n\n上書きしますか？');
        if (!proceed) {
          setUploadingHeaderImage(false);
          e.target.value = '';
          return;
        }
      }

      console.log('📤 ディスプレイ画像アップロード開始:', file.name);
      const imageUrl = await uploadImage(file, 'gh-public');

      if (imageUrl) {
        // 古い画像を削除
        if (previousHeaderImageRef.current && previousHeaderImageRef.current !== imageUrl) {
          console.log('🗑️ 古いディスプレイ画像を削除:', previousHeaderImageRef.current);
          await deleteFileFromUrl(previousHeaderImageRef.current);
        }

        handleDesignChange('headerImage', imageUrl);
        setHeaderImageHash(fileHash);
        previousHeaderImageRef.current = imageUrl;
        alert('✅ ディスプレイ画像をアップロードしました');
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
      // ファイルハッシュを計算して重複チェック
      const fileHash = await calculateFileHash(file);

      if (backgroundImageHash === fileHash) {
        const proceed = confirm('⚠️ 同じ画像が既にアップロードされています。\n\n上書きしますか？');
        if (!proceed) {
          setUploadingBackgroundImage(false);
          e.target.value = '';
          return;
        }
      }

      console.log('📤 背景画像アップロード開始:', file.name);
      const imageUrl = await uploadImage(file, 'gh-public');

      if (imageUrl) {
        // 古い画像を削除
        if (previousBackgroundImageRef.current && previousBackgroundImageRef.current !== imageUrl) {
          console.log('🗑️ 古い背景画像を削除:', previousBackgroundImageRef.current);
          await deleteFileFromUrl(previousBackgroundImageRef.current);
        }

        handleDesignChange('backgroundImage', imageUrl);
        setBackgroundImageHash(fileHash);
        previousBackgroundImageRef.current = imageUrl;
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
          onClick={() => setActiveTab('settings')}
          role="tab"
          aria-selected={activeTab === 'settings'}
          aria-controls="settings-panel"
          style={{
            padding: '12px 24px',
            background: activeTab === 'settings' ? 'rgba(59, 130, 246, 0.2)' : 'transparent',
            color: activeTab === 'settings' ? '#3B82F6' : 'rgba(255,255,255,0.6)',
            border: 'none',
            borderBottom: activeTab === 'settings' ? '2px solid #3B82F6' : '2px solid transparent',
            fontSize: 14,
            fontWeight: 700,
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
        >
          ⚙️ Settings
        </button>
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
          onClick={() => window.open(`/content?machine=${machine.slug}`, '_blank')}
          role="button"
          style={{
            padding: '12px 24px',
            background: 'transparent',
            color: 'rgba(255,255,255,0.6)',
            border: 'none',
            borderBottom: '2px solid transparent',
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
        {activeTab === 'settings' && (
          <div>
            <h3 style={{ margin: '0 0 20px 0', fontSize: 18, fontWeight: 700, color: '#fff' }}>
              基本設定
            </h3>

            {/* GIFT HUB名 */}
            <div style={{ marginBottom: 24 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.8)', marginBottom: 8 }}>
                GIFT HUB名
              </label>
              <input
                type="text"
                value={machine.name}
                onChange={(e) => {
                  const newName = e.target.value;
                  const newSlug = generateSlug(newName);
                  onUpdateMachine?.({ name: newName, slug: newSlug });
                }}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.2)',
                  borderRadius: 6,
                  color: '#fff',
                  fontSize: 14
                }}
                placeholder="例: 本社1階 GIFT HUB"
              />
              <p style={{ margin: '6px 0 0 0', fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>
                スラッグ（URL用）: <code style={{ color: '#3B82F6' }}>{machine.slug || 'machine'}</code>
              </p>
            </div>

            {/* 設置場所 */}
            <div style={{ marginBottom: 24 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.8)', marginBottom: 8 }}>
                設置場所
              </label>
              <input
                type="text"
                value={machine.location}
                onChange={(e) => onUpdateMachine?.({ location: e.target.value })}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.2)',
                  borderRadius: 6,
                  color: '#fff',
                  fontSize: 14
                }}
                placeholder="例: 東京本社 1階エントランス"
              />
            </div>

            {/* 説明 */}
            <div style={{ marginBottom: 24 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.8)', marginBottom: 8 }}>
                説明
              </label>
              <textarea
                value={machine.description}
                onChange={(e) => onUpdateMachine?.({ description: e.target.value })}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.2)',
                  borderRadius: 6,
                  color: '#fff',
                  fontSize: 14,
                  minHeight: 100,
                  resize: 'vertical',
                  fontFamily: 'inherit'
                }}
                placeholder="このGIFT HUBの説明を入力してください"
              />
            </div>

            {/* スクロール表示テキスト */}
            <div style={{ marginBottom: 24 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.8)', marginBottom: 8 }}>
                スクロール表示テキスト
              </label>
              <input
                type="text"
                value={machine.settings.welcomeMessage || ''}
                onChange={(e) => onUpdateMachine?.({
                  settings: { ...machine.settings, welcomeMessage: e.target.value }
                })}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.2)',
                  borderRadius: 6,
                  color: '#fff',
                  fontSize: 14
                }}
                placeholder="例: ようこそGIFT HUBへ！"
              />
              <p style={{ margin: '8px 0 0 0', fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>
                GIFT HUBページ上部にスクロール表示されるメッセージです
              </p>
            </div>
          </div>
        )}

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
              <div>
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
                      fontSize: 13,
                      maxWidth: 300
                    }}
                    placeholder="#3B82F6"
                  />
                </div>
                <p style={{ margin: '8px 0 0 0', fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>
                  GIFT HUBのエフェクト色に適用されます
                </p>
              </div>
            </div>

            {/* 画像設定セクション */}
            <div style={{ marginBottom: 32 }}>
              <h4 style={{ margin: '0 0 16px 0', fontSize: 16, fontWeight: 600, color: 'rgba(255,255,255,0.9)' }}>
                🖼️ 画像設定
              </h4>

              {/* ディスプレイ画像 */}
              <div style={{ marginBottom: 20 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.8)', marginBottom: 8 }}>
                  ディスプレイ画像
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
                      alt="Display preview"
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
          </div>
        )}

        {activeTab === 'products' && (
          <div>
            {/* ヘッダー: 新規特典追加ボタン */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#fff' }}>
                配布特典一覧
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
                ＋ 新規特典
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

            {/* 特典一覧 */}
            {!isLoading && products.length === 0 && (
              <div style={{ textAlign: 'center', padding: 40, color: 'rgba(255,255,255,0.5)' }}>
                <p style={{ margin: 0, fontSize: 16 }}>📦 特典がありません</p>
                <p style={{ margin: '8px 0 0 0', fontSize: 13 }}>
                  「＋ 新規特典」ボタンから追加してください
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

                    {/* 必要TIP数 */}
                    <div style={{ marginBottom: 12 }}>
                      <span style={{ fontSize: 14, color: '#10B981', fontWeight: 700 }}>
                        {(Number(product.price_amount_wei) / 1e18).toFixed(2)} tNHT
                      </span>
                    </div>

                    {/* 提供可能数 */}
                    <div style={{ marginBottom: 12, fontSize: 13, color: 'rgba(255,255,255,0.6)' }}>
                      {product.is_unlimited ? (
                        <span>提供可能数: <strong style={{ color: '#10B981' }}>∞ 無制限</strong></span>
                      ) : (
                        <span>提供可能数: <strong style={{ color: product.stock > 0 ? '#10B981' : '#EF4444' }}>{product.stock}</strong></span>
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
