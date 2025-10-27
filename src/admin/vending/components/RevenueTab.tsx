// src/admin/vending/components/RevenueTab.tsx
// GIFT HUB収益管理タブ（PaymentSplitter V2対応）

import { useState, useEffect } from 'react';
import { useAddress, useContract, useContractRead, useContractWrite } from '@thirdweb-dev/react';
import { PAYMENT_SPLITTER_V2_ABI } from '../../../contract';
import { getTokenConfig } from '../../../config/tokens';

interface RevenueTabProps {
  paymentSplitterAddress: string | undefined;
}

interface PayeeInfo {
  address: string;
  shares: string;
}

export function RevenueTab({ paymentSplitterAddress }: RevenueTabProps) {
  const address = useAddress();
  const [isLoading, setIsLoading] = useState(false);
  const [payees, setPayees] = useState<PayeeInfo[]>([]);

  // クリエイター管理
  const [showAddCreator, setShowAddCreator] = useState(false);
  const [newCreatorAddress, setNewCreatorAddress] = useState('');
  const [newCreatorShares, setNewCreatorShares] = useState('');
  const [editingShares, setEditingShares] = useState<{ [address: string]: string }>({});

  // PaymentSplitterコントラクト
  const { contract } = useContract(paymentSplitterAddress, PAYMENT_SPLITTER_V2_ABI);

  // 統計情報取得
  const { data: stats } = useContractRead(contract, 'getStats');

  // 全クリエイター取得
  const { data: allPayees } = useContractRead(contract, 'getAllPayees');

  // 契約書き込み
  const { mutateAsync: addPayee } = useContractWrite(contract, 'addPayee');
  const { mutateAsync: removePayee } = useContractWrite(contract, 'removePayee');
  const { mutateAsync: updateShares } = useContractWrite(contract, 'updateShares');
  const { mutateAsync: releaseAll } = useContractWrite(contract, 'releaseAll');
  const { mutateAsync: releaseAllERC20 } = useContractWrite(contract, 'releaseAllERC20');

  // データ読み込み
  useEffect(() => {
    if (allPayees && Array.isArray(allPayees) && allPayees.length === 2) {
      const [addresses, shares] = allPayees as [string[], any[]];
      const payeeInfos: PayeeInfo[] = addresses.map((addr, i) => ({
        address: addr,
        shares: shares[i]?.toString() || '0',
      }));
      setPayees(payeeInfos);
    }
  }, [allPayees]);

  // クリエイター追加
  const handleAddCreator = async () => {
    if (!newCreatorAddress || !newCreatorShares) {
      alert('アドレスとシェアを入力してください');
      return;
    }

    try {
      setIsLoading(true);
      await addPayee({args: [newCreatorAddress, newCreatorShares]});
      alert('✅ クリエイターを追加しました！');
      setNewCreatorAddress('');
      setNewCreatorShares('');
      setShowAddCreator(false);
    } catch (error: any) {
      console.error('❌ クリエイター追加エラー:', error);
      alert(`❌ 追加に失敗しました\n\n${error?.message || '不明なエラー'}`);
    } finally {
      setIsLoading(false);
    }
  };

  // クリエイター削除
  const handleRemoveCreator = async (addr: string) => {
    if (!confirm(`このクリエイターを削除してもよろしいですか？\n\n${addr}\n\n⚠️ 削除前に分配を実行してください`)) {
      return;
    }

    try {
      setIsLoading(true);
      await removePayee({args: [addr]});
      alert('✅ クリエイターを削除しました！');
    } catch (error: any) {
      console.error('❌ クリエイター削除エラー:', error);
      alert(`❌ 削除に失敗しました\n\n${error?.message || '不明なエラー'}\n\n分配可能額が残っている場合は先に分配を実行してください`);
    } finally {
      setIsLoading(false);
    }
  };

  // シェア変更
  const handleUpdateShares = async (addr: string) => {
    const newShares = editingShares[addr];
    if (!newShares) {
      alert('新しいシェアを入力してください');
      return;
    }

    try {
      setIsLoading(true);
      await updateShares({args: [addr, newShares]});
      alert('✅ シェアを更新しました！');
      setEditingShares((prev) => {
        const updated = { ...prev };
        delete updated[addr];
        return updated;
      });
    } catch (error: any) {
      console.error('❌ シェア更新エラー:', error);
      alert(`❌ 更新に失敗しました\n\n${error?.message || '不明なエラー'}`);
    } finally {
      setIsLoading(false);
    }
  };

  // 全員に分配
  const handleReleaseAll = async () => {
    if (!confirm('全クリエイターに分配を実行しますか？')) {
      return;
    }

    try {
      setIsLoading(true);
      await releaseAll({args: []});
      alert('✅ 分配が完了しました！');
    } catch (error: any) {
      console.error('❌ 分配エラー:', error);
      alert(`❌ 分配に失敗しました\n\n${error?.message || '不明なエラー'}`);
    } finally {
      setIsLoading(false);
    }
  };

  // ERC20分配（JPYC等）
  const handleReleaseAllERC20 = async () => {
    const jpycConfig = getTokenConfig('JPYC');
    const tokenAddress = jpycConfig.currentAddress;

    if (!confirm(`全クリエイターに${jpycConfig.symbol}を分配しますか？`)) {
      return;
    }

    try {
      setIsLoading(true);
      await releaseAllERC20({args: [tokenAddress]});
      alert(`✅ ${jpycConfig.symbol}の分配が完了しました！`);
    } catch (error: any) {
      console.error('❌ ERC20分配エラー:', error);
      alert(`❌ 分配に失敗しました\n\n${error?.message || '不明なエラー'}`);
    } finally {
      setIsLoading(false);
    }
  };

  if (!paymentSplitterAddress) {
    return (
      <div style={{ padding: 24, textAlign: 'center' }}>
        <p style={{ fontSize: 16, color: '#fff', opacity: 0.7 }}>
          ⚠️ PaymentSplitterが設定されていません
        </p>
        <p style={{ fontSize: 14, color: '#fff', opacity: 0.5, marginTop: 8 }}>
          Settingsタブで PaymentSplitter アドレスを設定してください
        </p>
      </div>
    );
  }

  const totalShares = stats ? Number(stats[1]) : 0;

  return (
    <div style={{ padding: 24 }}>
      <h3 style={{ fontSize: 20, fontWeight: 700, color: '#fff', marginBottom: 24 }}>
        💰 収益管理
      </h3>

      {/* 統計情報 */}
      {stats && (
        <div style={{
          marginBottom: 32,
          padding: 20,
          background: 'rgba(255,255,255,.05)',
          borderRadius: 12,
          border: '1px solid rgba(255,255,255,.1)'
        }}>
          <h4 style={{ fontSize: 16, fontWeight: 600, color: '#fff', marginBottom: 16 }}>
            📊 統計情報
          </h4>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
            <div>
              <div style={{ fontSize: 12, color: '#999', marginBottom: 4 }}>クリエイター数</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: '#fff' }}>{Number(stats[0])}人</div>
            </div>
            <div>
              <div style={{ fontSize: 12, color: '#999', marginBottom: 4 }}>総シェア</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: '#fff' }}>{Number(stats[1])}</div>
            </div>
            <div>
              <div style={{ fontSize: 12, color: '#999', marginBottom: 4 }}>ステータス</div>
              <div style={{ fontSize: 16, fontWeight: 600, color: stats[4] ? '#f59e0b' : '#10b981' }}>
                {stats[4] ? '⏸️ 停止中' : '✅ 稼働中'}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 分配ボタン */}
      <div style={{ marginBottom: 32, display: 'flex', gap: 12 }}>
        <button
          onClick={handleReleaseAll}
          disabled={isLoading}
          style={{
            flex: 1,
            padding: '14px 20px',
            background: '#10b981',
            color: '#fff',
            border: 'none',
            borderRadius: 8,
            fontSize: 16,
            fontWeight: 700,
            cursor: isLoading ? 'not-allowed' : 'pointer',
            opacity: isLoading ? 0.5 : 1,
          }}
        >
          💸 全員に分配（ネイティブ通貨）
        </button>
        <button
          onClick={handleReleaseAllERC20}
          disabled={isLoading}
          style={{
            flex: 1,
            padding: '14px 20px',
            background: '#0ea5e9',
            color: '#fff',
            border: 'none',
            borderRadius: 8,
            fontSize: 16,
            fontWeight: 700,
            cursor: isLoading ? 'not-allowed' : 'pointer',
            opacity: isLoading ? 0.5 : 1,
          }}
        >
          💸 全員に分配（JPYC）
        </button>
      </div>

      {/* クリエイター管理 */}
      <div style={{
        padding: 20,
        background: 'rgba(255,255,255,.05)',
        borderRadius: 12,
        border: '1px solid rgba(255,255,255,.1)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h4 style={{ fontSize: 16, fontWeight: 600, color: '#fff' }}>
            👥 クリエイター管理
          </h4>
          <button
            onClick={() => setShowAddCreator(!showAddCreator)}
            style={{
              padding: '8px 16px',
              background: '#8b5cf6',
              color: '#fff',
              border: 'none',
              borderRadius: 6,
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            {showAddCreator ? '✕ キャンセル' : '+ クリエイター追加'}
          </button>
        </div>

        {/* クリエイター追加フォーム */}
        {showAddCreator && (
          <div style={{
            marginBottom: 20,
            padding: 16,
            background: 'rgba(139,92,246,.1)',
            borderRadius: 8,
            border: '1px solid rgba(139,92,246,.3)'
          }}>
            <div style={{ marginBottom: 12 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#fff', marginBottom: 6 }}>
                ウォレットアドレス
              </label>
              <input
                type="text"
                value={newCreatorAddress}
                onChange={(e) => setNewCreatorAddress(e.target.value)}
                placeholder="0x..."
                style={{
                  width: '100%',
                  padding: '10px',
                  background: 'rgba(255,255,255,.1)',
                  border: '1px solid rgba(255,255,255,.2)',
                  borderRadius: 6,
                  color: '#fff',
                  fontSize: 14,
                }}
              />
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#fff', marginBottom: 6 }}>
                シェア（配分比率）
              </label>
              <input
                type="number"
                value={newCreatorShares}
                onChange={(e) => setNewCreatorShares(e.target.value)}
                placeholder="例: 30 (30%の場合)"
                style={{
                  width: '100%',
                  padding: '10px',
                  background: 'rgba(255,255,255,.1)',
                  border: '1px solid rgba(255,255,255,.2)',
                  borderRadius: 6,
                  color: '#fff',
                  fontSize: 14,
                }}
              />
            </div>
            <button
              onClick={handleAddCreator}
              disabled={isLoading}
              style={{
                width: '100%',
                padding: '10px',
                background: '#8b5cf6',
                color: '#fff',
                border: 'none',
                borderRadius: 6,
                fontSize: 14,
                fontWeight: 600,
                cursor: isLoading ? 'not-allowed' : 'pointer',
                opacity: isLoading ? 0.5 : 1,
              }}
            >
              ✅ 追加
            </button>
          </div>
        )}

        {/* クリエイターリスト */}
        {payees.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 20, color: '#999' }}>
            クリエイターが登録されていません
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {payees.map((payee) => {
              const isEditing = editingShares[payee.address] !== undefined;
              const sharePercentage = totalShares ? ((Number(payee.shares) / totalShares) * 100).toFixed(1) : '0';

              return (
                <div
                  key={payee.address}
                  style={{
                    padding: 16,
                    background: 'rgba(255,255,255,.03)',
                    borderRadius: 8,
                    border: '1px solid rgba(255,255,255,.1)',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontFamily: 'monospace', color: '#fff', marginBottom: 8 }}>
                        {payee.address}
                      </div>
                      <div style={{ display: 'flex', gap: 16, fontSize: 13 }}>
                        <div>
                          <span style={{ color: '#999' }}>シェア: </span>
                          {isEditing ? (
                            <input
                              type="number"
                              value={editingShares[payee.address]}
                              onChange={(e) => setEditingShares((prev) => ({ ...prev, [payee.address]: e.target.value }))}
                              style={{
                                width: '80px',
                                padding: '4px 8px',
                                background: 'rgba(255,255,255,.1)',
                                border: '1px solid rgba(255,255,255,.2)',
                                borderRadius: 4,
                                color: '#fff',
                                fontSize: 13,
                              }}
                            />
                          ) : (
                            <span style={{ fontWeight: 700, color: '#10b981' }}>
                              {payee.shares} ({sharePercentage}%)
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      {isEditing ? (
                        <>
                          <button
                            onClick={() => handleUpdateShares(payee.address)}
                            disabled={isLoading}
                            style={{
                              padding: '6px 12px',
                              background: '#10b981',
                              color: '#fff',
                              border: 'none',
                              borderRadius: 4,
                              fontSize: 12,
                              fontWeight: 600,
                              cursor: isLoading ? 'not-allowed' : 'pointer',
                              opacity: isLoading ? 0.5 : 1,
                            }}
                          >
                            保存
                          </button>
                          <button
                            onClick={() => {
                              const updated = { ...editingShares };
                              delete updated[payee.address];
                              setEditingShares(updated);
                            }}
                            style={{
                              padding: '6px 12px',
                              background: 'rgba(255,255,255,.1)',
                              color: '#fff',
                              border: 'none',
                              borderRadius: 4,
                              fontSize: 12,
                              fontWeight: 600,
                              cursor: 'pointer',
                            }}
                          >
                            キャンセル
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => setEditingShares((prev) => ({ ...prev, [payee.address]: payee.shares }))}
                            style={{
                              padding: '6px 12px',
                              background: '#0ea5e9',
                              color: '#fff',
                              border: 'none',
                              borderRadius: 4,
                              fontSize: 12,
                              fontWeight: 600,
                              cursor: 'pointer',
                            }}
                          >
                            編集
                          </button>
                          <button
                            onClick={() => handleRemoveCreator(payee.address)}
                            disabled={isLoading}
                            style={{
                              padding: '6px 12px',
                              background: '#ef4444',
                              color: '#fff',
                              border: 'none',
                              borderRadius: 4,
                              fontSize: 12,
                              fontWeight: 600,
                              cursor: isLoading ? 'not-allowed' : 'pointer',
                              opacity: isLoading ? 0.5 : 1,
                            }}
                          >
                            削除
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 注意事項 */}
      <div style={{
        marginTop: 24,
        padding: 16,
        background: 'rgba(251,191,36,.1)',
        borderRadius: 8,
        border: '1px solid rgba(251,191,36,.3)'
      }}>
        <h5 style={{ fontSize: 14, fontWeight: 600, color: '#fbbf24', marginBottom: 8 }}>
          ⚠️ 注意事項
        </h5>
        <ul style={{ margin: 0, paddingLeft: 20, fontSize: 13, color: '#fbbf24', opacity: 0.9, lineHeight: 1.8 }}>
          <li>クリエイター削除前に必ず分配を実行してください</li>
          <li>シェア変更は次回の分配から適用されます</li>
          <li>配分比率は相対的な値です（例: 70:30 = 70% : 30%）</li>
          <li>管理操作にはOwner権限が必要です</li>
        </ul>
      </div>
    </div>
  );
}
