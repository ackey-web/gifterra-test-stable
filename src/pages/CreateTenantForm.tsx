// src/pages/CreateTenantForm.tsx
import { useState } from 'react';
import { useContract } from '@thirdweb-dev/react';
import { GIFTERRA_FACTORY_ABI, TNHT_TOKEN } from '../contract';
import { ethers } from 'ethers';

interface CreateTenantFormProps {
  factoryAddress?: string;
  onSuccess?: (tenantId: string, contracts: any) => void;
  onCancel?: () => void;
}

type RankPlan = 'LITE' | 'STANDARD' | 'PRO' | 'CUSTOM';

const RANK_PLANS: { value: RankPlan; label: string; description: string; number: number }[] = [
  { value: 'LITE', label: 'LITE（ライト）', description: '3段階 - 小規模店舗向け', number: 0 },
  { value: 'STANDARD', label: 'STANDARD（スタンダード）', description: '5段階 - 標準プラン', number: 1 },
  { value: 'PRO', label: 'PRO（プロ）', description: '10段階 - 大規模店舗向け', number: 2 },
  { value: 'CUSTOM', label: 'CUSTOM（カスタム）', description: '手動設定 - 完全カスタマイズ', number: 3 },
];

export default function CreateTenantForm({ factoryAddress, onSuccess, onCancel }: CreateTenantFormProps) {
  const { contract: factory } = useContract(factoryAddress, GIFTERRA_FACTORY_ABI);

  const [formData, setFormData] = useState({
    tenantName: '',
    adminAddress: '',
    tipWalletAddress: '',
    rankPlan: 'STANDARD' as RankPlan,
  });

  const [isCreating, setIsCreating] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [deploymentFee, setDeploymentFee] = useState<string>('');
  const [createdTenantInfo, setCreatedTenantInfo] = useState<any>(null);

  // デプロイ手数料取得
  useState(() => {
    if (factory) {
      factory.call('deploymentFee').then((fee: bigint) => {
        setDeploymentFee(ethers.formatEther(fee));
      }).catch(console.error);
    }
  });

  const handleCreate = async () => {
    if (!factory) {
      setMessage({ type: 'error', text: 'Factoryコントラクトに接続されていません' });
      return;
    }

    // バリデーション
    if (!formData.tenantName.trim()) {
      setMessage({ type: 'error', text: 'テナント名を入力してください' });
      return;
    }

    if (!/^0x[a-fA-F0-9]{40}$/.test(formData.adminAddress)) {
      setMessage({ type: 'error', text: '有効な管理者アドレスを入力してください' });
      return;
    }

    if (!/^0x[a-fA-F0-9]{40}$/.test(formData.tipWalletAddress)) {
      setMessage({ type: 'error', text: '有効なTIP受取アドレスを入力してください' });
      return;
    }

    setIsCreating(true);
    setMessage(null);

    try {
      const fee = await factory.call('deploymentFee');
      const rankPlanNumber = RANK_PLANS.find(p => p.value === formData.rankPlan)?.number ?? 1;

      console.log('Creating tenant with params:', {
        tenantName: formData.tenantName,
        admin: formData.adminAddress,
        rewardToken: TNHT_TOKEN.ADDRESS,
        tipWallet: formData.tipWalletAddress,
        rankPlan: rankPlanNumber,
        fee: ethers.formatEther(fee),
      });

      const tx = await factory.call(
        'createTenant',
        [
          formData.tenantName,
          formData.adminAddress,
          TNHT_TOKEN.ADDRESS,
          formData.tipWalletAddress,
          rankPlanNumber,
        ],
        { value: fee }
      );

      console.log('Transaction sent:', tx);

      // イベントからテナント情報を取得
      const receipt = await tx.receipt;
      const event = receipt.logs?.find((log: any) => {
        try {
          const parsed = factory.interface.parseLog(log);
          return parsed?.name === 'TenantCreated';
        } catch {
          return false;
        }
      });

      if (event) {
        const parsed = factory.interface.parseLog(event);
        const tenantInfo = {
          tenantId: parsed.args.tenantId.toString(),
          adminAddress: parsed.args.admin,
          tenantName: parsed.args.tenantName,
          contracts: {
            gifterra: parsed.args.gifterra,
            rewardNFT: parsed.args.rewardNFT,
            paymentSplitter: parsed.args.payLitter,
            journeyPass: parsed.args.journeyPass,
            randomRewardEngine: parsed.args.randomRewardEngine,
          },
        };

        setCreatedTenantInfo(tenantInfo);
        setMessage({ type: 'success', text: `テナント作成成功！ID: ${tenantInfo.tenantId}` });

        if (onSuccess) {
          onSuccess(tenantInfo.tenantId, tenantInfo.contracts);
        }
      } else {
        setMessage({ type: 'success', text: 'テナント作成成功！（詳細情報は取得できませんでした）' });
      }
    } catch (error: any) {
      console.error('Tenant creation error:', error);
      setMessage({
        type: 'error',
        text: error.reason || error.message || 'テナント作成に失敗しました',
      });
    } finally {
      setIsCreating(false);
    }
  };

  if (!factoryAddress) {
    return (
      <div style={{
        background: 'rgba(239, 68, 68, 0.1)',
        border: '1px solid rgba(239, 68, 68, 0.3)',
        borderRadius: 12,
        padding: 24,
        color: '#fff',
      }}>
        <h3 style={{ margin: '0 0 8px 0', fontSize: 16, fontWeight: 700 }}>
          ⚠️ Factoryアドレスが設定されていません
        </h3>
        <p style={{ fontSize: 14, opacity: 0.8, margin: 0 }}>
          環境変数 <code style={{ background: 'rgba(0,0,0,0.3)', padding: '2px 6px', borderRadius: 4 }}>VITE_FACTORY_ADDRESS</code> を設定してください。
        </p>
      </div>
    );
  }

  return (
    <div style={{
      background: 'rgba(255,255,255,0.05)',
      border: '1px solid rgba(255,255,255,0.1)',
      borderRadius: 12,
      padding: 24,
      color: '#fff',
    }}>
      <h2 style={{ margin: '0 0 8px 0', fontSize: 18, fontWeight: 700 }}>
        ➕ 新規テナント作成
      </h2>
      <p style={{ fontSize: 13, opacity: 0.7, margin: '0 0 20px 0' }}>
        新しいテナントのコントラクトセットを一括デプロイします
        {deploymentFee && ` (手数料: ${deploymentFee} MATIC)`}
      </p>

      {message && (
        <div style={{
          padding: '12px 16px',
          borderRadius: 8,
          marginBottom: 20,
          background: message.type === 'success'
            ? 'rgba(34, 197, 94, 0.2)'
            : 'rgba(239, 68, 68, 0.2)',
          border: `1px solid ${message.type === 'success' ? '#22c55e' : '#ef4444'}`,
          color: message.type === 'success' ? '#86efac' : '#fca5a5',
          fontSize: 14,
        }}>
          {message.type === 'success' ? '✅' : '❌'} {message.text}
        </div>
      )}

      {createdTenantInfo && (
        <div style={{
          padding: 20,
          background: 'rgba(34, 197, 94, 0.1)',
          border: '1px solid rgba(34, 197, 94, 0.3)',
          borderRadius: 12,
          marginBottom: 20,
        }}>
          <h3 style={{ margin: '0 0 12px 0', fontSize: 16, fontWeight: 700 }}>
            🎉 デプロイ完了！
          </h3>
          <div style={{ fontSize: 13, lineHeight: 1.8, fontFamily: 'monospace' }}>
            <div><strong>Tenant ID:</strong> {createdTenantInfo.tenantId}</div>
            <div><strong>Gifterra:</strong> {createdTenantInfo.contracts.gifterra}</div>
            <div><strong>RewardNFT:</strong> {createdTenantInfo.contracts.rewardNFT}</div>
            <div><strong>PaymentSplitter:</strong> {createdTenantInfo.contracts.paymentSplitter}</div>
            <div><strong>JourneyPass:</strong> {createdTenantInfo.contracts.journeyPass}</div>
            <div><strong>RandomRewardEngine:</strong> {createdTenantInfo.contracts.randomRewardEngine}</div>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* テナント名 */}
        <div>
          <label style={{
            display: 'block',
            fontSize: 13,
            fontWeight: 600,
            marginBottom: 8,
          }}>
            テナント名 <span style={{ color: '#ef4444' }}>*</span>
          </label>
          <input
            type="text"
            value={formData.tenantName}
            onChange={(e) => setFormData({ ...formData, tenantName: e.target.value })}
            placeholder="例: カフェ テラス"
            disabled={isCreating}
            style={{
              width: '100%',
              padding: '10px 14px',
              background: 'rgba(0,0,0,0.3)',
              border: '1px solid rgba(255,255,255,0.2)',
              borderRadius: 6,
              color: '#fff',
              fontSize: 14,
              outline: 'none',
            }}
          />
        </div>

        {/* 管理者アドレス */}
        <div>
          <label style={{
            display: 'block',
            fontSize: 13,
            fontWeight: 600,
            marginBottom: 8,
          }}>
            管理者アドレス <span style={{ color: '#ef4444' }}>*</span>
          </label>
          <input
            type="text"
            value={formData.adminAddress}
            onChange={(e) => setFormData({ ...formData, adminAddress: e.target.value })}
            placeholder="0x..."
            disabled={isCreating}
            style={{
              width: '100%',
              padding: '10px 14px',
              background: 'rgba(0,0,0,0.3)',
              border: '1px solid rgba(255,255,255,0.2)',
              borderRadius: 6,
              color: '#fff',
              fontSize: 14,
              fontFamily: 'monospace',
              outline: 'none',
            }}
          />
          <p style={{ fontSize: 12, opacity: 0.6, margin: '6px 0 0 0' }}>
            このアドレスにテナントのowner権限が付与されます
          </p>
        </div>

        {/* TIP受取アドレス */}
        <div>
          <label style={{
            display: 'block',
            fontSize: 13,
            fontWeight: 600,
            marginBottom: 8,
          }}>
            TIP受取アドレス <span style={{ color: '#ef4444' }}>*</span>
          </label>
          <input
            type="text"
            value={formData.tipWalletAddress}
            onChange={(e) => setFormData({ ...formData, tipWalletAddress: e.target.value })}
            placeholder="0x..."
            disabled={isCreating}
            style={{
              width: '100%',
              padding: '10px 14px',
              background: 'rgba(0,0,0,0.3)',
              border: '1px solid rgba(255,255,255,0.2)',
              borderRadius: 6,
              color: '#fff',
              fontSize: 14,
              fontFamily: 'monospace',
              outline: 'none',
            }}
          />
          <p style={{ fontSize: 12, opacity: 0.6, margin: '6px 0 0 0' }}>
            投げ銭を受け取るウォレット（デプロイ後も変更可能）
          </p>
        </div>

        {/* ランクプラン */}
        <div>
          <label style={{
            display: 'block',
            fontSize: 13,
            fontWeight: 600,
            marginBottom: 8,
          }}>
            ランクプラン <span style={{ color: '#ef4444' }}>*</span>
          </label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {RANK_PLANS.map((plan) => (
              <label
                key={plan.value}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: 12,
                  background: formData.rankPlan === plan.value
                    ? 'rgba(139, 92, 246, 0.2)'
                    : 'rgba(255,255,255,0.05)',
                  border: `1px solid ${formData.rankPlan === plan.value ? '#8b5cf6' : 'rgba(255,255,255,0.1)'}`,
                  borderRadius: 8,
                  cursor: isCreating ? 'not-allowed' : 'pointer',
                  opacity: isCreating ? 0.5 : 1,
                }}
              >
                <input
                  type="radio"
                  name="rankPlan"
                  value={plan.value}
                  checked={formData.rankPlan === plan.value}
                  onChange={(e) => setFormData({ ...formData, rankPlan: e.target.value as RankPlan })}
                  disabled={isCreating}
                  style={{ marginRight: 12, accentColor: '#8b5cf6' }}
                />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{plan.label}</div>
                  <div style={{ fontSize: 12, opacity: 0.7 }}>{plan.description}</div>
                </div>
              </label>
            ))}
          </div>
        </div>
      </div>

      {/* アクションボタン */}
      <div style={{
        display: 'flex',
        gap: 12,
        marginTop: 24,
        paddingTop: 20,
        borderTop: '1px solid rgba(255,255,255,0.1)',
      }}>
        {onCancel && (
          <button
            onClick={onCancel}
            disabled={isCreating}
            style={{
              padding: '10px 20px',
              background: 'rgba(255,255,255,0.1)',
              border: '1px solid rgba(255,255,255,0.2)',
              borderRadius: 6,
              color: '#fff',
              fontSize: 14,
              fontWeight: 600,
              cursor: isCreating ? 'not-allowed' : 'pointer',
              opacity: isCreating ? 0.5 : 1,
            }}
          >
            キャンセル
          </button>
        )}
        <button
          onClick={handleCreate}
          disabled={isCreating || !factory}
          style={{
            flex: 1,
            padding: '12px 24px',
            background: isCreating
              ? 'rgba(139, 92, 246, 0.5)'
              : 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
            border: 'none',
            borderRadius: 6,
            color: '#fff',
            fontSize: 14,
            fontWeight: 600,
            cursor: isCreating || !factory ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
          }}
        >
          {isCreating ? (
            <>
              <span style={{
                display: 'inline-block',
                width: 12,
                height: 12,
                border: '2px solid rgba(255,255,255,0.3)',
                borderTopColor: '#fff',
                borderRadius: '50%',
                animation: 'spin 0.8s linear infinite',
              }} />
              <span>デプロイ中...</span>
            </>
          ) : (
            <>
              <span>🏭</span>
              <span>テナント作成</span>
            </>
          )}
        </button>
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
