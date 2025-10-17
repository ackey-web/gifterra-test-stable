import React, { useState, useEffect, useRef } from 'react';
import type { VendingMachine, Product } from '../../types/vending';

const STORAGE_KEY = 'vending_machines_data';

const VendingDashboard: React.FC = () => {
  // localStorageと同期するstate
  const [machines, setMachines] = useState<VendingMachine[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : [];
  });

  const [selectedMachineId, setSelectedMachineId] = useState<string | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingMachine, setEditingMachine] = useState<VendingMachine | null>(null);

  // 画像アップロード用ref
  const headerImageRef = useRef<HTMLInputElement>(null);
  const bgImageRef = useRef<HTMLInputElement>(null);
  const product1ImageRef = useRef<HTMLInputElement>(null);
  const product2ImageRef = useRef<HTMLInputElement>(null);
  const product3ImageRef = useRef<HTMLInputElement>(null);

  // localStorageに保存
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(machines));
  }, [machines]);

  // 選択中の自販機
  const selectedMachine = machines.find(m => m.id === selectedMachineId);

  // 新規自販機追加
  const handleAddMachine = () => {
    const newMachine: VendingMachine = {
      id: `machine-${Date.now()}`,
      name: '新しい自販機',
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
        displayName: '新しい自販機',
        welcomeMessage: 'いらっしゃいませ！',
        thankYouMessage: 'ありがとうございました！',
        maxSelectionsPerUser: 3,
        operatingHours: { start: '09:00', end: '18:00' },
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
    setEditingMachine(newMachine);
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

    const updated = machines.map(m =>
      m.id === editingMachine.id
        ? { ...editingMachine, updatedAt: new Date().toISOString() }
        : m
    );

    setMachines(updated);
    setShowEditModal(false);
    setEditingMachine(null);
  };

  // 自販機削除
  const handleDeleteMachine = (id: string) => {
    if (!confirm('この自販機を削除してもよろしいですか？')) return;
    setMachines(machines.filter(m => m.id !== id));
    if (selectedMachineId === id) setSelectedMachineId(null);
  };

  // 画像をBase64に変換
  const convertToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  // ヘッダー画像アップロード
  const handleHeaderImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !editingMachine) return;
    const base64 = await convertToBase64(file);
    setEditingMachine({
      ...editingMachine,
      settings: {
        ...editingMachine.settings,
        design: { ...editingMachine.settings.design, headerImage: base64 }
      }
    });
  };

  // 背景画像アップロード
  const handleBgImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !editingMachine) return;
    const base64 = await convertToBase64(file);
    setEditingMachine({
      ...editingMachine,
      settings: {
        ...editingMachine.settings,
        design: { ...editingMachine.settings.design, backgroundImage: base64 }
      }
    });
  };

  // 商品画像アップロード
  const handleProductImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
    const file = e.target.files?.[0];
    if (!file || !editingMachine) return;
    const base64 = await convertToBase64(file);

    const products = [...editingMachine.products];
    if (!products[index]) {
      products[index] = {
        id: `product-${Date.now()}-${index}`,
        name: `商品${index + 1}`,
        price: 100,
        description: '',
        imageUrl: base64,
        stock: 0,
        category: 'other',
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
    } else {
      products[index] = { ...products[index], imageUrl: base64 };
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
        category: 'other',
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
          自販機管理
        </h2>
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
          新しい自販機を追加
        </button>
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
            自販機一覧
          </h3>

          {machines.length === 0 ? (
            <div style={{
              padding: 60,
              textAlign: "center",
              opacity: 0.6
            }}>
              <p style={{ margin: 0, fontSize: 16 }}>自販機がまだ登録されていません</p>
              <p style={{ margin: "8px 0 0 0", fontSize: 13 }}>「+ 新しい自販機を追加」から作成してください</p>
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
              <p style={{ margin: 0 }}>自販機を選択してください</p>
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
                          <div style={{ fontSize: 12, opacity: 0.7 }}>¥{product.price}</div>
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
                  <div style={{ fontSize: 16, fontWeight: 700 }}>¥{selectedMachine.totalSales.toLocaleString()}</div>
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
                自販機編集: {editingMachine.name}
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
                  自販機名 *
                </label>
                <input
                  type="text"
                  value={editingMachine.name}
                  onChange={(e) => setEditingMachine({ ...editingMachine, name: e.target.value })}
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
                  表示名
                </label>
                <input
                  type="text"
                  value={editingMachine.settings.displayName}
                  onChange={(e) => setEditingMachine({
                    ...editingMachine,
                    settings: { ...editingMachine.settings, displayName: e.target.value }
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
                  ヘッダー画像（自販機上部）
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
                  <span style={{ marginLeft: 10, fontSize: 12, opacity: 0.7 }}>✓ 画像設定済み</span>
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
                  <span style={{ marginLeft: 10, fontSize: 12, opacity: 0.7 }}>✓ 画像設定済み</span>
                )}
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12 }}>
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
                <div>
                  <label style={{ display: "block", marginBottom: 4, fontSize: 13, opacity: 0.8 }}>
                    ボタンカラー
                  </label>
                  <input
                    type="color"
                    value={editingMachine.settings.design?.buttonColor || '#2563EB'}
                    onChange={(e) => setEditingMachine({
                      ...editingMachine,
                      settings: {
                        ...editingMachine.settings,
                        design: { ...editingMachine.settings.design, buttonColor: e.target.value }
                      }
                    })}
                    style={{ width: "100%", height: 40, cursor: "pointer", borderRadius: 6 }}
                  />
                </div>
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
                          style={{ width: 40, height: 40, objectFit: "cover", borderRadius: 4 }}
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
                            value={product?.price || 100}
                            onChange={(e) => updateProduct(index, 'price', Number(e.target.value))}
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
    </div>
  );
};

export default VendingDashboard;
