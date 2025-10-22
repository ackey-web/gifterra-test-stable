// src/admin/vending/components/HubListNew.tsx
// 左カラム：GIFT HUB一覧
import { useState, useEffect } from 'react';
import type { VendingMachine } from '../../../types/vending';
import { supabase } from '../../../lib/supabase';

interface HubListNewProps {
  machines: VendingMachine[];
  selectedMachineId: string | null;
  onSelectMachine: (machineId: string) => void;
  onAddNew: () => void;
  onDeleteMachine?: (machineId: string) => void;
}

export function HubListNew({
  machines,
  selectedMachineId,
  onSelectMachine,
  onAddNew,
  onDeleteMachine
}: HubListNewProps) {
  // 各GIFT HUBの商品数を管理
  const [productCounts, setProductCounts] = useState<Record<string, number>>({});

  // 全GIFT HUBの商品数を取得
  useEffect(() => {
    const fetchProductCounts = async () => {
      const counts: Record<string, number> = {};

      for (const machine of machines) {
        const tenantId = machine.id;
        const { count, error } = await supabase
          .from('products')
          .select('*', { count: 'exact', head: true })
          .eq('tenant_id', tenantId)
          .eq('is_active', true);

        if (!error) {
          counts[tenantId] = count || 0;
        }
      }

      setProductCounts(counts);
    };

    if (machines.length > 0) {
      fetchProductCounts();
    }
  }, [machines]);

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
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 4 }}>
                    {machine.name}
                  </div>
                  <div style={{ fontSize: 13, opacity: 0.7 }}>
                    特典: {productCounts[machine.id] || 0}件
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
                {onDeleteMachine && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm(`GIFT HUB「${machine.name}」を削除してもよろしいですか？\n\n※この操作は取り消せません`)) {
                        onDeleteMachine(machine.id);
                      }
                    }}
                    style={{
                      padding: '6px 12px',
                      background: '#DC2626',
                      color: '#fff',
                      border: 'none',
                      borderRadius: 6,
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: 'pointer',
                      marginLeft: 8
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = '#B91C1C';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = '#DC2626';
                    }}
                  >
                    削除
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
