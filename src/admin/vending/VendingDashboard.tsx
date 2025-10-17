import React, { useState } from 'react';
import type { VendingMachine } from '../../types/vending';

const VendingDashboard: React.FC = () => {
  // 自販機リスト（実際のデータは将来的にAPIから取得）
  const [machines] = useState<VendingMachine[]>([]);
  const [selectedMachineId, setSelectedMachineId] = useState<string | null>(null);

  // 新規自販機作成フォーム
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newMachineName, setNewMachineName] = useState('');
  const [newMachineLocation, setNewMachineLocation] = useState('');
  const [newMachineDescription, setNewMachineDescription] = useState('');

  // 選択中の自販機
  const selectedMachine = machines.find(m => m.id === selectedMachineId);

  // フォーム送信
  const handleCreateMachine = () => {
    if (!newMachineName.trim() || !newMachineLocation.trim()) {
      alert('自販機名と設置場所を入力してください');
      return;
    }

    // TODO: APIに送信してデータベースに保存
    console.log('新規自販機作成:', { newMachineName, newMachineLocation, newMachineDescription });

    // フォームリセット
    setNewMachineName('');
    setNewMachineLocation('');
    setNewMachineDescription('');
    setShowCreateForm(false);

    alert('自販機を作成しました（実装待ち：APIとの連携が必要です）');
  };

  return (
    <div style={{
      width: "min(800px, 96vw)",
      margin: "20px auto",
      background: "rgba(255,255,255,.04)",
      borderRadius: 12,
      padding: 24,
    }}>
      <h2 style={{ margin: "0 0 20px 0", fontSize: 24, fontWeight: 800 }}>
        🏪 自販機管理
      </h2>

      {/* 説明セクション */}
      <div style={{ marginBottom: 20, padding: 16, background: "rgba(255,255,255,.04)", borderRadius: 8 }}>
        <h3 style={{ margin: "0 0 10px 0", fontSize: 16 }}>📋 機能概要</h3>
        <ul style={{ margin: 0, paddingLeft: 20, opacity: 0.8, fontSize: 14 }}>
          <li>自販機の新規作成と管理</li>
          <li>商品情報の登録・編集</li>
          <li>デザインカスタマイズ（ヘッダー画像、背景画像、カラーテーマ）</li>
          <li>売上・統計データの確認</li>
          <li>metaverse-uiとの連携</li>
        </ul>
      </div>

      {/* 新規作成ボタン */}
      {!showCreateForm && (
        <button
          onClick={() => setShowCreateForm(true)}
          style={{
            width: "100%",
            padding: 12,
            background: "#059669",
            color: "#fff",
            border: "none",
            borderRadius: 8,
            fontSize: 16,
            fontWeight: 700,
            cursor: "pointer",
            marginBottom: 20
          }}
        >
          ➕ 新規自販機を作成
        </button>
      )}

      {/* 新規作成フォーム */}
      {showCreateForm && (
        <div style={{
          marginBottom: 32,
          padding: 20,
          background: "rgba(255,255,255,.03)",
          borderRadius: 12,
        }}>
          <h3 style={{ margin: "0 0 20px 0", fontSize: 20, fontWeight: 700 }}>
            新規自販機を作成
          </h3>

          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", marginBottom: 4, fontSize: 14, opacity: 0.8 }}>
              自販機名 *
            </label>
            <input
              type="text"
              value={newMachineName}
              onChange={(e) => setNewMachineName(e.target.value)}
              placeholder="例: 本社1F自販機"
              style={{
                width: "100%",
                padding: 8,
                background: "rgba(255,255,255,.1)",
                border: "1px solid rgba(255,255,255,.2)",
                borderRadius: 4,
                color: "#fff",
                fontSize: 14
              }}
            />
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", marginBottom: 4, fontSize: 14, opacity: 0.8 }}>
              設置場所 *
            </label>
            <input
              type="text"
              value={newMachineLocation}
              onChange={(e) => setNewMachineLocation(e.target.value)}
              placeholder="例: 東京本社 1階エントランス"
              style={{
                width: "100%",
                padding: 8,
                background: "rgba(255,255,255,.1)",
                border: "1px solid rgba(255,255,255,.2)",
                borderRadius: 4,
                color: "#fff",
                fontSize: 14
              }}
            />
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", marginBottom: 4, fontSize: 14, opacity: 0.8 }}>
              説明（任意）
            </label>
            <textarea
              value={newMachineDescription}
              onChange={(e) => setNewMachineDescription(e.target.value)}
              placeholder="自販機の説明を入力してください"
              rows={3}
              style={{
                width: "100%",
                padding: 8,
                background: "rgba(255,255,255,.1)",
                border: "1px solid rgba(255,255,255,.2)",
                borderRadius: 4,
                color: "#fff",
                fontSize: 14,
                resize: "vertical"
              }}
            />
          </div>

          <div style={{ display: "flex", gap: 12 }}>
            <button
              onClick={handleCreateMachine}
              disabled={!newMachineName.trim() || !newMachineLocation.trim()}
              style={{
                flex: 1,
                padding: 10,
                background: !newMachineName.trim() || !newMachineLocation.trim() ? "#666" : "#059669",
                color: "#fff",
                border: "none",
                borderRadius: 6,
                fontSize: 14,
                fontWeight: 700,
                cursor: !newMachineName.trim() || !newMachineLocation.trim() ? "not-allowed" : "pointer",
                opacity: !newMachineName.trim() || !newMachineLocation.trim() ? 0.5 : 1
              }}
            >
              作成
            </button>
            <button
              onClick={() => {
                setShowCreateForm(false);
                setNewMachineName('');
                setNewMachineLocation('');
                setNewMachineDescription('');
              }}
              style={{
                flex: 1,
                padding: 10,
                background: "#374151",
                color: "#fff",
                border: "none",
                borderRadius: 6,
                fontSize: 14,
                fontWeight: 700,
                cursor: "pointer"
              }}
            >
              キャンセル
            </button>
          </div>
        </div>
      )}

      {/* 自販機一覧 */}
      <div style={{
        marginBottom: 20,
        padding: 16,
        background: "rgba(255,255,255,.04)",
        borderRadius: 8
      }}>
        <h3 style={{ margin: "0 0 10px 0", fontSize: 16 }}>📊 登録済み自販機</h3>

        {machines.length === 0 ? (
          <div style={{
            padding: 32,
            textAlign: "center",
            opacity: 0.6,
            fontSize: 14
          }}>
            <p style={{ margin: 0 }}>まだ自販機が登録されていません</p>
            <p style={{ margin: "8px 0 0 0", fontSize: 12 }}>
              「新規自販機を作成」ボタンから登録してください
            </p>
          </div>
        ) : (
          <div style={{ display: "grid", gap: 12 }}>
            {machines.map((machine) => (
              <div
                key={machine.id}
                style={{
                  padding: 16,
                  background: "rgba(255,255,255,.06)",
                  borderRadius: 8,
                  cursor: "pointer",
                  border: selectedMachineId === machine.id ? "2px solid #059669" : "2px solid transparent"
                }}
                onClick={() => setSelectedMachineId(machine.id)}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                  <h4 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>{machine.name}</h4>
                  <span style={{
                    padding: "4px 8px",
                    background: machine.isActive ? "#059669" : "#666",
                    color: "#fff",
                    fontSize: 12,
                    borderRadius: 4
                  }}>
                    {machine.isActive ? "稼働中" : "停止中"}
                  </span>
                </div>
                <p style={{ margin: "4px 0", fontSize: 13, opacity: 0.8 }}>
                  📍 {machine.location}
                </p>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, marginTop: 12, fontSize: 12 }}>
                  <div>
                    <div style={{ opacity: 0.6 }}>商品数</div>
                    <div style={{ fontWeight: 700 }}>{machine.products.length}種類</div>
                  </div>
                  <div>
                    <div style={{ opacity: 0.6 }}>総売上</div>
                    <div style={{ fontWeight: 700 }}>¥{machine.totalSales.toLocaleString()}</div>
                  </div>
                  <div>
                    <div style={{ opacity: 0.6 }}>配布数</div>
                    <div style={{ fontWeight: 700 }}>{machine.totalDistributions}個</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 選択中の自販機詳細 */}
      {selectedMachine && (
        <div style={{
          marginBottom: 20,
          padding: 20,
          background: "rgba(255,255,255,.03)",
          borderRadius: 12,
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
            <h3 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>
              {selectedMachine.name} の詳細
            </h3>
            <button
              onClick={() => setSelectedMachineId(null)}
              style={{
                padding: "6px 12px",
                background: "#374151",
                color: "#fff",
                border: "none",
                borderRadius: 6,
                fontSize: 13,
                cursor: "pointer"
              }}
            >
              閉じる
            </button>
          </div>

          {/* タブ切り替え（将来的に実装） */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: 8,
            marginBottom: 20
          }}>
            {["商品管理", "売上・統計", "デザイン", "設定"].map((tab) => (
              <button
                key={tab}
                style={{
                  padding: 10,
                  background: "rgba(255,255,255,.1)",
                  color: "#fff",
                  border: "none",
                  borderRadius: 6,
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer"
                }}
              >
                {tab}
              </button>
            ))}
          </div>

          <div style={{
            padding: 16,
            background: "rgba(255,255,255,.04)",
            borderRadius: 8,
            textAlign: "center",
            opacity: 0.6
          }}>
            <p style={{ margin: 0, fontSize: 14 }}>
              詳細管理機能は実装中です
            </p>
            <p style={{ margin: "8px 0 0 0", fontSize: 12 }}>
              商品管理、デザインカスタマイズ、統計表示などの機能を追加予定
            </p>
          </div>
        </div>
      )}

      {/* metaverse-uiプレビュー情報 */}
      <div style={{
        marginTop: 20,
        padding: 16,
        background: "rgba(139, 92, 246, 0.1)",
        border: "1px solid rgba(139, 92, 246, 0.3)",
        borderRadius: 8
      }}>
        <h3 style={{ margin: "0 0 8px 0", fontSize: 15, fontWeight: 700 }}>
          🌐 metaverse-ui連携
        </h3>
        <p style={{ margin: "0 0 8px 0", fontSize: 13, opacity: 0.9 }}>
          作成した自販機は3D空間からアクセスできます。
        </p>
        <p style={{ margin: 0, fontSize: 12, opacity: 0.7 }}>
          URL形式: <code style={{ background: "rgba(0,0,0,0.3)", padding: "2px 6px", borderRadius: 4 }}>
            /content?space=default&machine={"{machineId}"}
          </code>
        </p>
      </div>
    </div>
  );
};

export default VendingDashboard;
