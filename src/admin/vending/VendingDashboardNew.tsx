// src/admin/vending/VendingDashboardNew.tsx
// GIFT HUB 管理画面（新2カラムレイアウト）
import React, { useState, useEffect } from 'react';
import type { VendingMachine } from '../../types/vending';
import { generateSlug } from '../../utils/slugGenerator';
import { HubListNew } from './components/HubListNew';
import { HubDetailPanelNew } from './components/HubDetailPanelNew';

const STORAGE_KEY = 'vending_machines_data';

const VendingDashboardNew: React.FC = () => {
  // localStorageと同期するstate（既存ロジック維持）
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

  // localStorageに保存（既存ロジック維持）
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
  const selectedMachine = machines.find(m => m.id === selectedMachineId) || null;

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
    setSelectedMachineId(newMachine.id);
  };

  // HUB選択
  const handleSelectMachine = (machineId: string) => {
    setSelectedMachineId(machineId);
  };

  // 保存（プレースホルダ）
  const handleSave = () => {
    alert('保存処理（STEP4以降で実装）');
  };

  // 公開/非公開切替
  const handleToggleActive = () => {
    if (!selectedMachine) return;

    const updated = machines.map(m =>
      m.id === selectedMachine.id
        ? { ...m, isActive: !m.isActive, updatedAt: new Date().toISOString() }
        : m
    );
    setMachines(updated);
  };

  // HUB情報更新（デザイン設定など）
  const handleUpdateMachine = (updates: Partial<VendingMachine>) => {
    if (!selectedMachine) return;

    const updated = machines.map(m =>
      m.id === selectedMachine.id
        ? { ...m, ...updates, updatedAt: new Date().toISOString() }
        : m
    );
    setMachines(updated);
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
        padding: 24,
        color: '#fff'
      }}
    >
      {/* ページヘッダー */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ margin: 0, fontSize: 28, fontWeight: 800 }}>
          GIFT HUB 管理
        </h1>
        <p style={{ margin: '8px 0 0 0', fontSize: 14, opacity: 0.7 }}>
          左: HUB一覧 → 右: 詳細パネル（Design / Products / Preview）
        </p>
      </div>

      {/* 2カラムレイアウト */}
      <div
        className="vending-dashboard-grid"
        style={{
          display: 'grid',
          gridTemplateColumns: '400px 1fr',
          gap: 20,
          minHeight: 'calc(100vh - 140px)'
        }}
      >
        {/* 左カラム：HUB一覧 */}
        <HubListNew
          machines={machines}
          selectedMachineId={selectedMachineId}
          onSelectMachine={handleSelectMachine}
          onAddNew={handleAddMachine}
        />

        {/* 右カラム：詳細パネル */}
        <HubDetailPanelNew
          machine={selectedMachine}
          onSave={handleSave}
          onToggleActive={handleToggleActive}
          onUpdateMachine={handleUpdateMachine}
        />
      </div>

      {/* レスポンシブ対応 */}
      <style>{`
        @keyframes scrollText {
          0% { transform: translateX(0); }
          100% { transform: translateX(-100%); }
        }

        @media (max-width: 1024px) {
          .vending-dashboard-grid {
            grid-template-columns: 1fr !important;
            gap: 16px !important;
          }
        }
      `}</style>
    </div>
  );
};

export default VendingDashboardNew;
