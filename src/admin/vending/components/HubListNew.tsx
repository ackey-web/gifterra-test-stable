// src/admin/vending/components/HubListNew.tsx
// 左カラム：GIFT HUB一覧
import type { VendingMachine } from '../../../types/vending';

interface HubListNewProps {
  machines: VendingMachine[];
  selectedMachineId: string | null;
  onSelectMachine: (machineId: string) => void;
  onAddNew: () => void;
}

export function HubListNew({
  machines,
  selectedMachineId,
  onSelectMachine,
  onAddNew
}: HubListNewProps) {
  return (
    <div
      style={{
        background: 'rgba(255,255,255,.03)',
        borderRadius: 12,
        padding: 20,
        minHeight: 500,
        height: '100%'
      }}
    >
      {/* ヘッダー */}
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#fff' }}>
          GIFT HUB一覧
        </h3>
        <button
          onClick={onAddNew}
          style={{
            padding: '8px 16px',
            background: '#059669',
            color: '#fff',
            border: 'none',
            borderRadius: 8,
            fontSize: 14,
            fontWeight: 700,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 8
          }}
        >
          <span style={{ fontSize: 18 }}>+</span>
          新規HUB
        </button>
      </div>

      {/* 一覧 */}
      {machines.length === 0 ? (
        <div
          style={{
            padding: 60,
            textAlign: 'center',
            opacity: 0.6,
            color: '#fff'
          }}
        >
          <p style={{ margin: 0, fontSize: 16 }}>GIFT HUBがまだ登録されていません</p>
          <p style={{ margin: '8px 0 0 0', fontSize: 13 }}>「+ 新規HUB」から作成してください</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {machines.map((machine) => (
            <div
              key={machine.id}
              onClick={() => onSelectMachine(machine.id)}
              style={{
                padding: 16,
                background: selectedMachineId === machine.id
                  ? 'rgba(59, 130, 246, 0.2)'
                  : 'rgba(255,255,255,.05)',
                borderRadius: 8,
                cursor: 'pointer',
                border: selectedMachineId === machine.id
                  ? '2px solid #3B82F6'
                  : '2px solid transparent',
                transition: 'all 0.2s',
                color: '#fff'
              }}
              onMouseEnter={(e) => {
                if (selectedMachineId !== machine.id) {
                  e.currentTarget.style.background = 'rgba(255,255,255,.08)';
                }
              }}
              onMouseLeave={(e) => {
                if (selectedMachineId !== machine.id) {
                  e.currentTarget.style.background = 'rgba(255,255,255,.05)';
                }
              }}
            >
              <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 4 }}>
                {machine.name}
              </div>
              <div style={{ fontSize: 13, opacity: 0.7 }}>
                商品: {machine.products?.length || 0}件
              </div>
              {machine.isActive ? (
                <span style={{
                  display: 'inline-block',
                  marginTop: 8,
                  padding: '2px 8px',
                  background: '#10B981',
                  fontSize: 11,
                  borderRadius: 4,
                  fontWeight: 600
                }}>
                  公開中
                </span>
              ) : (
                <span style={{
                  display: 'inline-block',
                  marginTop: 8,
                  padding: '2px 8px',
                  background: '#6B7280',
                  fontSize: 11,
                  borderRadius: 4,
                  fontWeight: 600
                }}>
                  非公開
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
