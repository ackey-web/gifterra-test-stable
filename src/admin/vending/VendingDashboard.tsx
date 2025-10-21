import React, { useState, useEffect, useRef } from 'react';
import type { VendingMachine, Product } from '../../types/vending';
import { generateSlug } from '../../utils/slugGenerator';
import { uploadImage } from '../../lib/supabase';
import { ProductForm, type ProductFormData } from '../products/ProductForm';
import { createProduct, formDataToCreateParams } from '../../lib/supabase/products';

const STORAGE_KEY = 'vending_machines_data';

const VendingDashboard: React.FC = () => {
  // localStorageと同期するstate
  const [machines, setMachines] = useState<VendingMachine[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return [];

    const parsed: VendingMachine[] = JSON.parse(saved);

    // 既存データにslugが無い場合は自動生成
    const migrated = parsed.map(machine => {
      if (!machine.slug) {
        return {
          ...machine,
          slug: generateSlug(machine.name)
        };
      }
      return machine;
    });

    return migrated;
  });

  const [selectedMachineId, setSelectedMachineId] = useState<string | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingMachine, setEditingMachine] = useState<VendingMachine | null>(null);

  // 商品追加モーダル用state
  const [showProductModal, setShowProductModal] = useState(false);
  const [isCreatingProduct, setIsCreatingProduct] = useState(false);

  // 画像アップロード用ref
  const headerImageRef = useRef<HTMLInputElement>(null);
  const bgImageRef = useRef<HTMLInputElement>(null);
  const product1ImageRef = useRef<HTMLInputElement>(null);
  const product2ImageRef = useRef<HTMLInputElement>(null);
  const product3ImageRef = useRef<HTMLInputElement>(null);

  // ファイルアップロード用ref
  const product1FileRef = useRef<HTMLInputElement>(null);
  const product2FileRef = useRef<HTMLInputElement>(null);
  const product3FileRef = useRef<HTMLInputElement>(null);

  // localStorageに保存
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(machines));
      console.log('✅ GIFT HUB data saved to localStorage:', machines.length, 'machines');
    } catch (error) {
      console.error('❌ Failed to save to localStorage:', error);
      alert('保存に失敗しました。データが大きすぎる可能性があります。');
    }
  }, [machines]);

  // 選択中の自販機
  const selectedMachine = machines.find(m => m.id === selectedMachineId);

  // 新規GIFT HUB追加
  const handleAddMachine = () => {
    const machineName = '新しいGIFT HUB';
    const newMachine: VendingMachine = {
      id: `machine-${Date.now()}`,
      slug: generateSlug(machineName),
      name: machineName,
      location: '未設定',
      description: '',
      products: [],
      isActive: true,
      totalSales: 0,
      totalAccessCount: 0,
      totalDistributions: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      settings: {
        theme: 'default',
        displayName: '新しいGIFT HUB',
        welcomeMessage: 'いらっしゃいませ！',
        thankYouMessage: 'ありがとうございました！',
        maxSelectionsPerUser: 3,
        operatingHours: { start: '09:00', end: '18:00' },
        tokenSymbol: 'tNHT',
        design: {
          primaryColor: '#3B82F6',
          secondaryColor: '#8B5CF6',
          accentColor: '#10B981',
          textColor: '#FFFFFF',
          buttonColor: '#2563EB',
          cardBackgroundColor: '#1F2937'
        }
      }
    };

    setMachines([...machines, newMachine]);
    setEditingMachine(JSON.parse(JSON.stringify(newMachine))); // deep copy
    setShowEditModal(true);
  };

  // 編集モーダルを開く
  const handleEditMachine = (machine: VendingMachine) => {
    setEditingMachine(JSON.parse(JSON.stringify(machine))); // deep copy
    setShowEditModal(true);
  };

  // 編集を保存
  const handleSaveEdit = () => {
    if (!editingMachine) return;

    // 商品データの正規化（空文字列を数値に変換）
    const normalizedMachine = {
      ...editingMachine,
      products: editingMachine.products.map(product => ({
        ...product,
        price: typeof product.price === 'string' ? (product.price === '' ? 0 : Number(product.price)) : product.price,
        stock: typeof product.stock === 'string' ? (product.stock === '' ? 0 : Number(product.stock)) : product.stock
      })),
      updatedAt: new Date().toISOString()
    };

    const updated = machines.map(m =>
      m.id === editingMachine.id ? normalizedMachine : m
    );

    setMachines(updated);
    setShowEditModal(false);
    setEditingMachine(null);
  };

  // GIFT HUB削除
  const handleDeleteMachine = (id: string) => {
    if (!confirm('このGIFT HUBを削除してもよろしいですか？')) return;
    setMachines(machines.filter(m => m.id !== id));
    if (selectedMachineId === id) setSelectedMachineId(null);
  };

  // 商品作成モーダルを開く
  const handleOpenProductModal = () => {
    setShowProductModal(true);
  };

  // 商品作成を実行
  const handleCreateProduct = async (formData: ProductFormData) => {
    setIsCreatingProduct(true);
    try {
      const params = formDataToCreateParams(formData, 'default');
      const result = await createProduct(params);

      if (result.success) {
        alert('✅ 商品を作成しました');
        setShowProductModal(false);
        // 必要に応じてSupabaseから商品一覧を再取得
      } else {
        throw new Error(result.error || '商品作成に失敗しました');
      }
    } catch (err) {
      console.error('❌ 商品作成エラー:', err);
      alert(`❌ 商品作成に失敗しました\n\n${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsCreatingProduct(false);
    }
  };

  // ヘッダー画像アップロード
  const handleHeaderImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !editingMachine) return;

    // Supabaseに画像をアップロード
    const imageUrl = await uploadImage(file, 'vending-images');

    if (!imageUrl) {
      alert('画像のアップロードに失敗しました。');
      return;
    }

    setEditingMachine({
      ...editingMachine,
      settings: {
        ...editingMachine.settings,
        design: { ...editingMachine.settings.design, headerImage: imageUrl }
      }
    });
  };

  // 背景画像アップロード
  const handleBgImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !editingMachine) return;

    // Supabaseに画像をアップロード
    const imageUrl = await uploadImage(file, 'vending-images');

    if (!imageUrl) {
      alert('画像のアップロードに失敗しました。');
      return;
    }

    setEditingMachine({
      ...editingMachine,
      settings: {
        ...editingMachine.settings,
        design: { ...editingMachine.settings.design, backgroundImage: imageUrl }
      }
    });
  };

  // 配布ファイルアップロード
  const handleProductFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
    const file = e.target.files?.[0];
    if (!file || !editingMachine) return;

    // Supabaseにファイルをアップロード
    const fileUrl = await uploadImage(file, 'product-files');

    if (!fileUrl) {
      alert('ファイルのアップロードに失敗しました。');
      return;
    }

    const fileSizeMB = (file.size / (1024 * 1024)).toFixed(2);

    const products = [...editingMachine.products];
    if (!products[index]) {
      products[index] = {
        id: `product-${Date.now()}-${index}`,
        name: file.name,
        price: 100,
        description: '',
        imageUrl: '',
        stock: 0,
        contentType: 'GLB',
        category: 'digital-asset',
        fileUrl: fileUrl,
        fileName: file.name,
        fileSize: `${fileSizeMB}MB`,
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
    } else {
      products[index] = {
        ...products[index],
        fileUrl: fileUrl,
        fileName: file.name,
        fileSize: `${fileSizeMB}MB`
      };
    }

    setEditingMachine({ ...editingMachine, products });
  };

  // 商品画像アップロード
  const handleProductImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
    const file = e.target.files?.[0];
    if (!file || !editingMachine) return;

    // Supabaseに画像をアップロード
    const imageUrl = await uploadImage(file, 'product-images');

    if (!imageUrl) {
      alert('画像のアップロードに失敗しました。');
      return;
    }

    const products = [...editingMachine.products];
    if (!products[index]) {
      products[index] = {
        id: `product-${Date.now()}-${index}`,
        name: `商品${index + 1}`,
        price: 100,
        description: '',
        imageUrl: imageUrl,
        stock: 0,
        contentType: 'GLB',
        category: 'digital-asset',
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
    } else {
      products[index] = { ...products[index], imageUrl: imageUrl };
    }

    setEditingMachine({ ...editingMachine, products });
  };

  // 商品情報更新
  const updateProduct = (index: number, field: keyof Product, value: any) => {
    if (!editingMachine) return;
    const products = [...editingMachine.products];

    if (!products[index]) {
      products[index] = {
        id: `product-${Date.now()}-${index}`,
        name: '',
        price: 100,
        description: '',
        imageUrl: '',
        stock: 0,
        contentType: 'GLB',
        category: 'digital-asset',
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
    }

    products[index] = { ...products[index], [field]: value };
    setEditingMachine({ ...editingMachine, products });
  };

  // 日付フォーマット
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getDate()).padStart(2, '0')}`;
  };

  return (
    <div style={{
      width: "min(1400px, 98vw)",
      margin: "20px auto",
      background: "rgba(255,255,255,.04)",
      borderRadius: 12,
      padding: 24,
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <h2 style={{ margin: 0, fontSize: 24, fontWeight: 800 }}>
          GIFT HUB管理
        </h2>
        <div style={{ display: "flex", gap: 12 }}>
          <button
            onClick={handleOpenProductModal}
            style={{
              padding: "10px 20px",
              background: "#3B82F6",
              color: "#fff",
              border: "none",
              borderRadius: 8,
              fontSize: 14,
              fontWeight: 700,
              cursor: "pointer",
              display: "none", // STEP3: HUB別Products タブに統合のため非表示（削除は後続PR）
              alignItems: "center",
              gap: 8
            }}
          >
            <span style={{ fontSize: 18 }}>📦</span>
            新規商品追加（Supabase）
          </button>
          <button
            onClick={handleAddMachine}
            style={{
              padding: "10px 20px",
              background: "#059669",
              color: "#fff",
              border: "none",
              borderRadius: 8,
              fontSize: 14,
              fontWeight: 700,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 8
            }}
          >
            <span style={{ fontSize: 18 }}>+</span>
            新しいGIFT HUBを追加
          </button>
        </div>
      </div>

      {/* メインコンテンツ：左右2カラム */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 400px", gap: 20 }}>

        {/* 左側：一覧テーブル */}
        <div style={{
          background: "rgba(255,255,255,.03)",
          borderRadius: 12,
          padding: 20,
          minHeight: 500
        }}>
          <h3 style={{ margin: "0 0 16px 0", fontSize: 18, fontWeight: 700 }}>
            GIFT HUB一覧
          </h3>

          {machines.length === 0 ? (
            <div style={{
              padding: 60,
              textAlign: "center",
              opacity: 0.6
            }}>
              <p style={{ margin: 0, fontSize: 16 }}>GIFT HUBがまだ登録されていません</p>
              <p style={{ margin: "8px 0 0 0", fontSize: 13 }}>「+ 新しいGIFT HUBを追加」から作成してください</p>
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{
                width: "100%",
                borderCollapse: "collapse",
                fontSize: 14
              }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid rgba(255,255,255,.1)" }}>
                    <th style={{ padding: "12px 8px", textAlign: "left", fontWeight: 600, opacity: 0.7 }}>名前</th>
                    <th style={{ padding: "12px 8px", textAlign: "left", fontWeight: 600, opacity: 0.7 }}>作成日</th>
                    <th style={{ padding: "12px 8px", textAlign: "center", fontWeight: 600, opacity: 0.7 }}>状態</th>
                    <th style={{ padding: "12px 8px", textAlign: "center", fontWeight: 600, opacity: 0.7 }}>商品数</th>
                    <th style={{ padding: "12px 8px", textAlign: "right", fontWeight: 600, opacity: 0.7 }}>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {machines.map((machine) => (
                    <tr
                      key={machine.id}
                      style={{
                        borderBottom: "1px solid rgba(255,255,255,.05)",
                        background: selectedMachineId === machine.id ? "rgba(5, 150, 105, 0.1)" : "transparent",
                        cursor: "pointer"
                      }}
                      onClick={() => setSelectedMachineId(machine.id)}
                    >
                      <td style={{ padding: "14px 8px" }}>
                        <div style={{ fontWeight: 600 }}>{machine.name}</div>
                        <div style={{ fontSize: 12, opacity: 0.6, marginTop: 2 }}>{machine.location}</div>
                      </td>
                      <td style={{ padding: "14px 8px" }}>{formatDate(machine.createdAt)}</td>
                      <td style={{ padding: "14px 8px", textAlign: "center" }}>
                        <span style={{
                          padding: "4px 10px",
                          background: machine.isActive ? "#059669" : "#666",
                          color: "#fff",
                          fontSize: 12,
                          borderRadius: 12,
                          fontWeight: 600
                        }}>
                          {machine.isActive ? "稼働中" : "停止中"}
                        </span>
                      </td>
                      <td style={{ padding: "14px 8px", textAlign: "center", fontWeight: 600 }}>
                        {machine.products.length}
                      </td>
                      <td style={{ padding: "14px 8px", textAlign: "right" }}>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEditMachine(machine);
                          }}
                          style={{
                            padding: "6px 12px",
                            background: "#3B82F6",
                            color: "#fff",
                            border: "none",
                            borderRadius: 6,
                            fontSize: 12,
                            fontWeight: 600,
                            cursor: "pointer",
                            marginRight: 6
                          }}
                        >
                          編集
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteMachine(machine.id);
                          }}
                          style={{
                            padding: "6px 12px",
                            background: "#DC2626",
                            color: "#fff",
                            border: "none",
                            borderRadius: 6,
                            fontSize: 12,
                            fontWeight: 600,
                            cursor: "pointer"
                          }}
                        >
                          削除
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* 右側：プレビュー */}
        <div style={{
          background: "rgba(255,255,255,.03)",
          borderRadius: 12,
          padding: 20
        }}>
          <h3 style={{ margin: "0 0 16px 0", fontSize: 18, fontWeight: 700 }}>
            プレビュー
          </h3>

          {!selectedMachine ? (
            <div style={{
              padding: 40,
              textAlign: "center",
              opacity: 0.5,
              fontSize: 14
            }}>
              <p style={{ margin: 0 }}>GIFT HUBを選択してください</p>
            </div>
          ) : (
            <div>
              {/* ヘッダー画像 */}
              {selectedMachine.settings.design?.headerImage && (
                <div style={{
                  marginBottom: 16,
                  borderRadius: 8,
                  overflow: "hidden",
                  background: "#000"
                }}>
                  <img
                    src={selectedMachine.settings.design.headerImage}
                    alt="ヘッダー"
                    style={{ width: "100%", height: 80, objectFit: "cover" }}
                  />
                </div>
              )}

              {/* 自販機情報 */}
              <div style={{
                padding: 16,
                background: selectedMachine.settings.design?.cardBackgroundColor || "rgba(255,255,255,.06)",
                borderRadius: 8,
                marginBottom: 16
              }}>
                <h4 style={{
                  margin: "0 0 8px 0",
                  fontSize: 16,
                  fontWeight: 700,
                  color: selectedMachine.settings.design?.textColor || "#fff"
                }}>
                  {selectedMachine.settings.displayName}
                </h4>
                <p style={{
                  margin: "0 0 8px 0",
                  fontSize: 13,
                  opacity: 0.8,
                  color: selectedMachine.settings.design?.textColor || "#fff"
                }}>
                  {selectedMachine.settings.welcomeMessage}
                </p>
                <div style={{
                  fontSize: 12,
                  opacity: 0.6,
                  color: selectedMachine.settings.design?.textColor || "#fff"
                }}>
                  営業時間: {selectedMachine.settings.operatingHours.start} - {selectedMachine.settings.operatingHours.end}
                </div>
              </div>

              {/* 商品一覧 */}
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8, opacity: 0.7 }}>
                  商品 ({selectedMachine.products.length})
                </div>
                {selectedMachine.products.length === 0 ? (
                  <div style={{ padding: 20, textAlign: "center", opacity: 0.5, fontSize: 13 }}>
                    商品が登録されていません
                  </div>
                ) : (
                  <div style={{ display: "grid", gap: 8 }}>
                    {selectedMachine.products.map((product) => (
                      <div
                        key={product.id}
                        style={{
                          display: "flex",
                          gap: 10,
                          padding: 10,
                          background: "rgba(255,255,255,.04)",
                          borderRadius: 6
                        }}
                      >
                        {product.imageUrl && (
                          <img
                            src={product.imageUrl}
                            alt={product.name}
                            style={{ width: 50, height: 50, objectFit: "cover", borderRadius: 4 }}
                          />
                        )}
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 13, fontWeight: 600 }}>{product.name}</div>
                          <div style={{ fontSize: 12, opacity: 0.7 }}>{product.price} {selectedMachine.settings.tokenSymbol || 'tNHT'}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* 統計情報 */}
              <div style={{
                display: "grid",
                gridTemplateColumns: "repeat(2, 1fr)",
                gap: 10,
                fontSize: 12
              }}>
                <div style={{ padding: 12, background: "rgba(255,255,255,.04)", borderRadius: 6 }}>
                  <div style={{ opacity: 0.6, marginBottom: 4 }}>総売上</div>
                  <div style={{ fontSize: 16, fontWeight: 700 }}>{selectedMachine.totalSales.toLocaleString()} {selectedMachine.settings.tokenSymbol || 'tNHT'}</div>
                </div>
                <div style={{ padding: 12, background: "rgba(255,255,255,.04)", borderRadius: 6 }}>
                  <div style={{ opacity: 0.6, marginBottom: 4 }}>配布数</div>
                  <div style={{ fontSize: 16, fontWeight: 700 }}>{selectedMachine.totalDistributions}</div>
                </div>
                <div style={{ padding: 12, background: "rgba(255,255,255,.04)", borderRadius: 6 }}>
                  <div style={{ opacity: 0.6, marginBottom: 4 }}>アクセス数</div>
                  <div style={{ fontSize: 16, fontWeight: 700 }}>{selectedMachine.totalAccessCount}</div>
                </div>
                <div style={{ padding: 12, background: "rgba(255,255,255,.04)", borderRadius: 6 }}>
                  <div style={{ opacity: 0.6, marginBottom: 4 }}>商品種類</div>
                  <div style={{ fontSize: 16, fontWeight: 700 }}>{selectedMachine.products.length}種</div>
                </div>
              </div>

              {/* フロントUIリンク */}
              <div style={{
                marginTop: 16,
                padding: 12,
                background: "rgba(16, 185, 129, 0.1)",
                border: "1px solid rgba(16, 185, 129, 0.3)",
                borderRadius: 6
              }}>
                <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 6, color: "#10B981" }}>
                  🔗 フロントUI
                </div>
                <a
                  href={`/content?machine=${selectedMachine.slug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    fontSize: 11,
                    color: "#10B981",
                    textDecoration: "none",
                    wordBreak: "break-all"
                  }}
                >
                  {window.location.origin}/content?machine={selectedMachine.slug}
                </a>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 編集モーダル */}
      {showEditModal && editingMachine && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: "rgba(0,0,0,0.8)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 1000,
          padding: 20
        }}>
          <div style={{
            background: "#1F2937",
            borderRadius: 12,
            width: "min(900px, 100%)",
            maxHeight: "90vh",
            overflow: "auto",
            padding: 24
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
              <h3 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>
                GIFT HUB編集: {editingMachine.name}
              </h3>
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setEditingMachine(null);
                }}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "#fff",
                  fontSize: 24,
                  cursor: "pointer",
                  padding: 0,
                  width: 30,
                  height: 30
                }}
              >
                ×
              </button>
            </div>

            {/* 基本情報 */}
            <div style={{ marginBottom: 24, padding: 16, background: "rgba(255,255,255,.04)", borderRadius: 8 }}>
              <h4 style={{ margin: "0 0 12px 0", fontSize: 16, fontWeight: 700 }}>基本情報</h4>

              <div style={{ marginBottom: 12 }}>
                <label style={{ display: "block", marginBottom: 4, fontSize: 13, opacity: 0.8 }}>
                  GIFT HUB名 *
                </label>
                <input
                  type="text"
                  value={editingMachine.name}
                  onChange={(e) => setEditingMachine({
                    ...editingMachine,
                    name: e.target.value,
                    slug: generateSlug(e.target.value)
                  })}
                  style={{
                    width: "100%",
                    padding: 8,
                    background: "rgba(255,255,255,.1)",
                    border: "1px solid rgba(255,255,255,.2)",
                    borderRadius: 6,
                    color: "#fff",
                    fontSize: 14
                  }}
                />
              </div>

              {/* Slug表示 */}
              <div style={{ marginBottom: 12 }}>
                <label style={{ display: "block", marginBottom: 4, fontSize: 13, opacity: 0.8 }}>
                  URL Slug (自動生成)
                </label>
                <div style={{
                  padding: 8,
                  background: "rgba(255,255,255,.05)",
                  border: "1px solid rgba(255,255,255,.1)",
                  borderRadius: 6,
                  color: "#10B981",
                  fontSize: 13,
                  fontFamily: "monospace"
                }}>
                  {editingMachine.slug || '(未生成)'}
                </div>
              </div>

              <div style={{ marginBottom: 12 }}>
                <label style={{ display: "block", marginBottom: 4, fontSize: 13, opacity: 0.8 }}>
                  設置場所 *
                </label>
                <input
                  type="text"
                  value={editingMachine.location}
                  onChange={(e) => setEditingMachine({ ...editingMachine, location: e.target.value })}
                  style={{
                    width: "100%",
                    padding: 8,
                    background: "rgba(255,255,255,.1)",
                    border: "1px solid rgba(255,255,255,.2)",
                    borderRadius: 6,
                    color: "#fff",
                    fontSize: 14
                  }}
                />
              </div>

              <div style={{ marginBottom: 12 }}>
                <label style={{ display: "block", marginBottom: 4, fontSize: 13, opacity: 0.8 }}>
                  ヘッダーテキスト（スクロール表示）
                </label>
                <input
                  type="text"
                  value={editingMachine.settings.displayName}
                  onChange={(e) => setEditingMachine({
                    ...editingMachine,
                    settings: { ...editingMachine.settings, displayName: e.target.value }
                  })}
                  placeholder="例: 🎁 Welcome to Gifterra! デジタルギフトをお楽しみください"
                  style={{
                    width: "100%",
                    padding: 8,
                    background: "rgba(255,255,255,.1)",
                    border: "1px solid rgba(255,255,255,.2)",
                    borderRadius: 6,
                    color: "#fff",
                    fontSize: 14
                  }}
                />
              </div>

              <div style={{ marginBottom: 12 }}>
                <label style={{ display: "block", marginBottom: 4, fontSize: 13, opacity: 0.8 }}>
                  使用トークン
                </label>
                <select
                  value={editingMachine.settings.tokenSymbol || 'tNHT'}
                  onChange={(e) => setEditingMachine({
                    ...editingMachine,
                    settings: { ...editingMachine.settings, tokenSymbol: e.target.value as 'tNHT' | 'JPYC' }
                  })}
                  style={{
                    width: "100%",
                    padding: 8,
                    background: "rgba(255,255,255,.1)",
                    border: "1px solid rgba(255,255,255,.2)",
                    borderRadius: 6,
                    color: "#fff",
                    fontSize: 14
                  }}
                >
                  <option value="tNHT">tNHT (テストネット)</option>
                  <option value="JPYC">JPYC (日本円ステーブルコイン)</option>
                </select>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 12 }}>
                <label style={{ fontSize: 13, opacity: 0.8 }}>稼働状態</label>
                <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={editingMachine.isActive}
                    onChange={(e) => setEditingMachine({ ...editingMachine, isActive: e.target.checked })}
                    style={{ cursor: "pointer" }}
                  />
                  <span style={{ fontSize: 13 }}>{editingMachine.isActive ? "稼働中" : "停止中"}</span>
                </label>
              </div>
            </div>

            {/* デザイン設定 */}
            <div style={{ marginBottom: 24, padding: 16, background: "rgba(255,255,255,.04)", borderRadius: 8 }}>
              <h4 style={{ margin: "0 0 12px 0", fontSize: 16, fontWeight: 700 }}>デザイン設定</h4>

              <div style={{ marginBottom: 12 }}>
                <label style={{ display: "block", marginBottom: 4, fontSize: 13, opacity: 0.8 }}>
                  ディスプレイ画像
                </label>
                <input
                  type="file"
                  ref={headerImageRef}
                  accept="image/*"
                  onChange={handleHeaderImageUpload}
                  style={{ display: "none" }}
                />
                <button
                  onClick={() => headerImageRef.current?.click()}
                  style={{
                    padding: "8px 16px",
                    background: "#3B82F6",
                    color: "#fff",
                    border: "none",
                    borderRadius: 6,
                    fontSize: 13,
                    cursor: "pointer"
                  }}
                >
                  画像を選択
                </button>
                {editingMachine.settings.design?.headerImage && (
                  <>
                    <span style={{ marginLeft: 10, fontSize: 12, opacity: 0.7 }}>✓ 画像設定済み</span>
                    <div style={{ marginTop: 8, maxWidth: 200 }}>
                      <img
                        src={editingMachine.settings.design.headerImage}
                        alt="ディスプレイ画像プレビュー"
                        style={{ width: "100%", height: "auto", borderRadius: 4, border: "1px solid rgba(255,255,255,0.2)" }}
                      />
                    </div>
                  </>
                )}
              </div>

              <div style={{ marginBottom: 12 }}>
                <label style={{ display: "block", marginBottom: 4, fontSize: 13, opacity: 0.8 }}>
                  背景画像
                </label>
                <input
                  type="file"
                  ref={bgImageRef}
                  accept="image/*"
                  onChange={handleBgImageUpload}
                  style={{ display: "none" }}
                />
                <button
                  onClick={() => bgImageRef.current?.click()}
                  style={{
                    padding: "8px 16px",
                    background: "#3B82F6",
                    color: "#fff",
                    border: "none",
                    borderRadius: 6,
                    fontSize: 13,
                    cursor: "pointer"
                  }}
                >
                  画像を選択
                </button>
                {editingMachine.settings.design?.backgroundImage && (
                  <>
                    <span style={{ marginLeft: 10, fontSize: 12, opacity: 0.7 }}>✓ 画像設定済み</span>
                    <div style={{ marginTop: 8, maxWidth: 200 }}>
                      <img
                        src={editingMachine.settings.design.backgroundImage}
                        alt="背景画像プレビュー"
                        style={{ width: "100%", height: "auto", borderRadius: 4, border: "1px solid rgba(255,255,255,0.2)" }}
                      />
                    </div>
                  </>
                )}
              </div>

              <div>
                <label style={{ display: "block", marginBottom: 4, fontSize: 13, opacity: 0.8 }}>
                  メインカラー
                </label>
                <input
                  type="color"
                  value={editingMachine.settings.design?.primaryColor || '#3B82F6'}
                  onChange={(e) => setEditingMachine({
                    ...editingMachine,
                    settings: {
                      ...editingMachine.settings,
                      design: { ...editingMachine.settings.design, primaryColor: e.target.value }
                    }
                  })}
                  style={{ width: "100%", height: 40, cursor: "pointer", borderRadius: 6 }}
                />
              </div>
            </div>

            {/* 商品設定（3つまで） */}
            <div style={{ marginBottom: 24, padding: 16, background: "rgba(255,255,255,.04)", borderRadius: 8 }}>
              <h4 style={{ margin: "0 0 12px 0", fontSize: 16, fontWeight: 700 }}>商品設定（最大3つ）</h4>

              {[0, 1, 2].map((index) => {
                const product = editingMachine.products[index];
                return (
                  <div
                    key={index}
                    style={{
                      marginBottom: 16,
                      padding: 12,
                      background: "rgba(255,255,255,.06)",
                      borderRadius: 6
                    }}
                  >
                    <div style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: 8
                    }}>
                      <span style={{ fontSize: 14, fontWeight: 600 }}>商品 {index + 1}</span>
                      {product?.imageUrl && (
                        <img
                          src={product.imageUrl}
                          alt="商品画像"
                          style={{ width: 100, height: 100, objectFit: "cover", borderRadius: 4 }}
                        />
                      )}
                    </div>

                    <div style={{ display: "grid", gap: 8 }}>
                      <div>
                        <label style={{ display: "block", marginBottom: 2, fontSize: 12, opacity: 0.7 }}>
                          商品名
                        </label>
                        <input
                          type="text"
                          value={product?.name || ''}
                          onChange={(e) => updateProduct(index, 'name', e.target.value)}
                          placeholder="商品名を入力"
                          style={{
                            width: "100%",
                            padding: 6,
                            background: "rgba(255,255,255,.1)",
                            border: "1px solid rgba(255,255,255,.2)",
                            borderRadius: 4,
                            color: "#fff",
                            fontSize: 13
                          }}
                        />
                      </div>

                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                        <div>
                          <label style={{ display: "block", marginBottom: 2, fontSize: 12, opacity: 0.7 }}>
                            価格
                          </label>
                          <input
                            type="number"
                            value={product?.price ?? ''}
                            onChange={(e) => updateProduct(index, 'price', e.target.value === '' ? '' : Number(e.target.value))}
                            min="0"
                            max="99999"
                            placeholder="100"
                            style={{
                              width: "100%",
                              padding: 6,
                              background: "rgba(255,255,255,.1)",
                              border: "1px solid rgba(255,255,255,.2)",
                              borderRadius: 4,
                              color: "#fff",
                              fontSize: 13
                            }}
                          />
                        </div>
                        <div>
                          <label style={{ display: "block", marginBottom: 2, fontSize: 12, opacity: 0.7 }}>
                            在庫
                          </label>
                          <input
                            type="number"
                            value={product?.stock || 0}
                            onChange={(e) => updateProduct(index, 'stock', Number(e.target.value))}
                            disabled={product?.isUnlimitedStock || false}
                            style={{
                              width: "100%",
                              padding: 6,
                              background: product?.isUnlimitedStock ? "rgba(255,255,255,.05)" : "rgba(255,255,255,.1)",
                              border: "1px solid rgba(255,255,255,.2)",
                              borderRadius: 4,
                              color: product?.isUnlimitedStock ? "rgba(255,255,255,.3)" : "#fff",
                              fontSize: 13,
                              cursor: product?.isUnlimitedStock ? "not-allowed" : "text"
                            }}
                          />
                        </div>
                      </div>

                      {/* 在庫無制限チェックボックス */}
                      <div style={{ marginTop: 8 }}>
                        <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                          <input
                            type="checkbox"
                            checked={product?.isUnlimitedStock || false}
                            onChange={(e) => updateProduct(index, 'isUnlimitedStock', e.target.checked)}
                            style={{ cursor: "pointer" }}
                          />
                          <span style={{ fontSize: 13, opacity: 0.8 }}>在庫無制限（∞）</span>
                        </label>
                      </div>

                      <div style={{ marginTop: 8 }}>
                        <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, cursor: "pointer" }}>
                          <input
                            type="checkbox"
                            checked={product?.isUnlimitedStock || false}
                            onChange={(e) => updateProduct(index, 'isUnlimitedStock', e.target.checked)}
                            style={{ cursor: "pointer" }}
                          />
                          <span>在庫無制限</span>
                        </label>
                      </div>

                      <div>
                        <label style={{ display: "block", marginBottom: 2, fontSize: 12, opacity: 0.7 }}>
                          コンテンツタイプ
                        </label>
                        <select
                          value={product?.contentType || 'GLB'}
                          onChange={(e) => updateProduct(index, 'contentType', e.target.value)}
                          style={{
                            width: "100%",
                            padding: 6,
                            background: "rgba(255,255,255,.1)",
                            border: "1px solid rgba(255,255,255,.2)",
                            borderRadius: 4,
                            color: "#fff",
                            fontSize: 13
                          }}
                        >
                          <option value="NFT">NFT</option>
                          <option value="SBT">SBT</option>
                          <option value="GLB">GLB</option>
                          <option value="FBX">FBX</option>
                          <option value="VRM">VRM</option>
                          <option value="MP3">MP3</option>
                          <option value="MP4">MP4</option>
                          <option value="PNG">PNG</option>
                          <option value="PDF">PDF</option>
                          <option value="ZIP">ZIP</option>
                        </select>
                      </div>

                      <div>
                        <label style={{ display: "block", marginBottom: 2, fontSize: 12, opacity: 0.7 }}>
                          商品画像
                        </label>
                        <input
                          type="file"
                          ref={index === 0 ? product1ImageRef : index === 1 ? product2ImageRef : product3ImageRef}
                          accept="image/*"
                          onChange={(e) => handleProductImageUpload(e, index)}
                          style={{ display: "none" }}
                        />
                        <button
                          onClick={() => {
                            if (index === 0) product1ImageRef.current?.click();
                            else if (index === 1) product2ImageRef.current?.click();
                            else product3ImageRef.current?.click();
                          }}
                          style={{
                            padding: "6px 12px",
                            background: "#6366F1",
                            color: "#fff",
                            border: "none",
                            borderRadius: 4,
                            fontSize: 12,
                            cursor: "pointer"
                          }}
                        >
                          画像を選択
                        </button>
                      </div>

                      <div>
                        <label style={{ display: "block", marginBottom: 2, fontSize: 12, opacity: 0.7 }}>
                          配布ファイル (GLB/FBX/VRM/MP3等)
                        </label>
                        <input
                          type="file"
                          ref={index === 0 ? product1FileRef : index === 1 ? product2FileRef : product3FileRef}
                          onChange={(e) => handleProductFileUpload(e, index)}
                          style={{ display: "none" }}
                        />
                        <button
                          onClick={() => {
                            if (index === 0) product1FileRef.current?.click();
                            else if (index === 1) product2FileRef.current?.click();
                            else product3FileRef.current?.click();
                          }}
                          style={{
                            padding: "6px 12px",
                            background: "#10B981",
                            color: "#fff",
                            border: "none",
                            borderRadius: 4,
                            fontSize: 12,
                            cursor: "pointer"
                          }}
                        >
                          ファイルを選択
                        </button>
                        {product?.fileName && (
                          <div style={{ marginTop: 4, fontSize: 11, opacity: 0.7 }}>
                            ✓ {product.fileName} ({product.fileSize})
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* 保存・キャンセルボタン */}
            <div style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}>
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setEditingMachine(null);
                }}
                style={{
                  padding: "10px 24px",
                  background: "#374151",
                  color: "#fff",
                  border: "none",
                  borderRadius: 8,
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: "pointer"
                }}
              >
                キャンセル
              </button>
              <button
                onClick={handleSaveEdit}
                style={{
                  padding: "10px 24px",
                  background: "#059669",
                  color: "#fff",
                  border: "none",
                  borderRadius: 8,
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: "pointer"
                }}
              >
                保存
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 商品作成モーダル */}
      {showProductModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <ProductForm
            onSubmit={handleCreateProduct}
            onCancel={() => setShowProductModal(false)}
            isSubmitting={isCreatingProduct}
          />
        </div>
      )}
    </div>
  );
};

export default VendingDashboard;
