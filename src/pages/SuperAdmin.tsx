// src/pages/SuperAdmin.tsx
// スーパーアドミン専用ダッシュボード

import { useState, useMemo, useEffect } from 'react';
import { useAddress, useContract } from '@thirdweb-dev/react';
import { isSuperAdminWithDebug } from '../config/superAdmin';
import { useSystemStats, useRealtimeStats } from '../hooks/useSystemStats';
import { useTenantList } from '../hooks/useTenantList';
import { useRecentActivity, getActivityCategoryInfo } from '../hooks/useRecentActivity';
import { useSystemHealth, getHealthStatusInfo } from '../hooks/useSystemHealth';
import { formatTokenAmount } from '../utils/userProfile';
import { GIFTERRA_FACTORY_ABI, TOKEN, TNHT_TOKEN } from '../contract';

// ユーザープロフィールプレビュー用のインポート
import ScoreProfilePage from './score-profile';

// スコア管理ページのインポート
import { ScoreParametersPage, TokenAxisPage, SystemMonitoringPage } from '../admin/score';
import CreateTenantForm from './CreateTenantForm';

type TabType = 'dashboard' | 'user-preview' | 'tenants' | 'revenue' | 'score-parameters' | 'token-axis' | 'system-monitoring';

export function SuperAdminPage() {
  const connectedAddress = useAddress();
  const isAdmin = isSuperAdminWithDebug(connectedAddress);

  // タブ状態
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');

  // アクセス制御
  if (!isAdmin) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#fff',
      }}>
        <div style={{ textAlign: 'center', maxWidth: 500, padding: 20 }}>
          <div style={{ fontSize: 64, marginBottom: 16 }}>🔒</div>
          <h1 style={{ margin: '0 0 12px 0', fontSize: 28, fontWeight: 800 }}>アクセス拒否</h1>
          <p style={{ margin: '0 0 24px 0', fontSize: 16, opacity: 0.9 }}>
            このページはスーパーアドミン専用です。
          </p>
          <button
            onClick={() => window.location.href = '/'}
            style={{
              padding: '12px 32px',
              background: 'rgba(255,255,255,0.2)',
              border: '1px solid rgba(255,255,255,0.3)',
              borderRadius: 8,
              color: '#fff',
              fontSize: 16,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            ホームに戻る
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #1e1e2e 0%, #2d2d44 100%)',
      padding: '40px 20px',
    }}>
      <div style={{
        maxWidth: 1600,
        margin: '0 auto',
      }}>
        {/* ヘッダー */}
        <div style={{
          marginBottom: 32,
          color: '#fff',
        }}>
          <h1 style={{
            margin: '0 0 8px 0',
            fontSize: 32,
            fontWeight: 800,
            display: 'flex',
            alignItems: 'center',
            gap: 12,
          }}>
            👑 Super Admin Dashboard
          </h1>
          <p style={{ margin: 0, fontSize: 14, opacity: 0.7 }}>
            システム管理・監視・プレビューツール
          </p>
        </div>

        {/* タブナビゲーション */}
        <div style={{
          display: 'flex',
          gap: 8,
          marginBottom: 24,
          borderBottom: '1px solid rgba(255,255,255,0.1)',
          paddingBottom: 0,
          flexWrap: 'wrap',
        }}>
          <TabButton
            active={activeTab === 'dashboard'}
            onClick={() => setActiveTab('dashboard')}
            icon="📊"
            label="ダッシュボード"
          />
          <TabButton
            active={activeTab === 'user-preview'}
            onClick={() => setActiveTab('user-preview')}
            icon="👤"
            label="ユーザーマイページ"
          />
          <TabButton
            active={activeTab === 'tenants'}
            onClick={() => setActiveTab('tenants')}
            icon="🏢"
            label="テナント管理"
          />
          <TabButton
            active={activeTab === 'revenue'}
            onClick={() => setActiveTab('revenue')}
            icon="💰"
            label="収益管理"
          />
          <TabButton
            active={activeTab === 'score-parameters'}
            onClick={() => setActiveTab('score-parameters')}
            icon="⚖️"
            label="スコアパラメータ"
          />
          <TabButton
            active={activeTab === 'token-axis'}
            onClick={() => setActiveTab('token-axis')}
            icon="🪙"
            label="トークン軸設定"
          />
          <TabButton
            active={activeTab === 'system-monitoring'}
            onClick={() => setActiveTab('system-monitoring')}
            icon="🖥️"
            label="システム監視"
          />
        </div>

        {/* タブコンテンツ */}
        {activeTab === 'dashboard' && <DashboardTab />}
        {activeTab === 'user-preview' && <UserPreviewTabSimple />}
        {activeTab === 'tenants' && <TenantsTab />}
        {activeTab === 'revenue' && <RevenueTab />}
        {activeTab === 'score-parameters' && <ScoreParametersPage />}
        {activeTab === 'token-axis' && <TokenAxisPage />}
        {activeTab === 'system-monitoring' && <SystemMonitoringPage />}
      </div>
    </div>
  );
}

/**
 * タブボタンコンポーネント
 */
function TabButton({ active, onClick, icon, label, disabled }: {
  active: boolean;
  onClick: () => void;
  icon: string;
  label: string;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        padding: '12px 24px',
        background: active ? 'rgba(102, 126, 234, 0.2)' : 'transparent',
        border: 'none',
        borderBottom: active ? '3px solid rgba(102, 126, 234, 1)' : '3px solid transparent',
        color: disabled ? 'rgba(255,255,255,0.3)' : '#fff',
        fontSize: 14,
        fontWeight: active ? 700 : 600,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        transition: 'all 0.2s',
      }}
    >
      {icon} {label}
    </button>
  );
}

/**
 * ダッシュボードタブ
 */
function DashboardTab() {
  const { stats, isLoading } = useSystemStats();
  const realtimeData = useRealtimeStats();
  const { tenants } = useTenantList();
  const { activities } = useRecentActivity(20);
  const { health } = useSystemHealth();

  if (isLoading) {
    return (
      <div style={{
        padding: 60,
        textAlign: 'center',
        color: '#fff',
      }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>⏳</div>
        <div style={{ fontSize: 18 }}>データを読み込み中...</div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* システムヘルス */}
      <div style={{
        background: 'rgba(255,255,255,0.05)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: 12,
        padding: 20,
        color: '#fff',
      }}>
        <h2 style={{ margin: '0 0 16px 0', fontSize: 18, fontWeight: 700 }}>
          ⚡ システムヘルス
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
          {Object.entries(health.services).map(([key, service]) => {
            const statusInfo = getHealthStatusInfo(service.status);
            return (
              <div
                key={key}
                style={{
                  padding: 12,
                  background: 'rgba(255,255,255,0.05)',
                  borderRadius: 8,
                  border: `1px solid ${service.status === 'down' ? '#ef4444' : service.status === 'degraded' ? '#f59e0b' : '#10b981'}`,
                }}
              >
                <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 4 }}>{service.name}</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: statusInfo.color }}>
                  {statusInfo.icon} {statusInfo.label}
                </div>
                {service.responseTime && (
                  <div style={{ fontSize: 11, opacity: 0.6, marginTop: 4 }}>{service.responseTime}ms</div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* 主要統計 */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
        gap: 16,
      }}>
        <StatCard
          icon="🏪"
          label="GIFT HUB"
          value={stats.totalHubs.toString()}
          subtitle={`${stats.activeHubs}個が稼働中`}
          color="#3b82f6"
        />
        <StatCard
          icon="🎁"
          label="総配布数"
          value={stats.totalDistributions.toLocaleString()}
          subtitle="累計配布回数"
          color="#10b981"
        />
        <StatCard
          icon="💰"
          label="総収益"
          value={`${formatTokenAmount(BigInt(stats.totalRevenue), 18, 0)} JPYC`}
          subtitle="累計収益"
          color="#f59e0b"
        />
        <StatCard
          icon="📦"
          label="商品数"
          value={stats.totalProducts.toString()}
          subtitle="アクティブな商品"
          color="#8b5cf6"
        />
        <StatCard
          icon="📊"
          label="トランザクション"
          value={stats.totalTransactions.toLocaleString()}
          subtitle={`今日: ${stats.transactionsToday}件`}
          color="#ec4899"
        />
        <StatCard
          icon="🏢"
          label="テナント"
          value={stats.totalTenants.toString()}
          subtitle={`${stats.activeTenants}個が稼働中`}
          color="#06b6d4"
        />
      </div>

      {/* リアルタイム統計 */}
      <div style={{
        background: 'rgba(255,255,255,0.05)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: 12,
        padding: 20,
        color: '#fff',
      }}>
        <h2 style={{ margin: '0 0 16px 0', fontSize: 18, fontWeight: 700 }}>
          📡 リアルタイム統計
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
          <div style={{ padding: 12, background: 'rgba(255,255,255,0.05)', borderRadius: 8 }}>
            <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 4 }}>オンラインユーザー</div>
            <div style={{ fontSize: 24, fontWeight: 800 }}>{realtimeData.currentOnlineUsers}</div>
          </div>
          <div style={{ padding: 12, background: 'rgba(255,255,255,0.05)', borderRadius: 8 }}>
            <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 4 }}>処理中トランザクション</div>
            <div style={{ fontSize: 24, fontWeight: 800 }}>{realtimeData.activeTransactions}</div>
          </div>
          <div style={{ padding: 12, background: 'rgba(255,255,255,0.05)', borderRadius: 8 }}>
            <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 4 }}>システム負荷</div>
            <div style={{ fontSize: 24, fontWeight: 800 }}>{realtimeData.systemLoad}%</div>
          </div>
        </div>
      </div>

      {/* テナント一覧と最近のアクティビティ */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
        {/* テナント一覧 */}
        <div style={{
          background: 'rgba(255,255,255,0.05)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 12,
          padding: 20,
          color: '#fff',
        }}>
          <h2 style={{ margin: '0 0 16px 0', fontSize: 18, fontWeight: 700 }}>
            🏢 テナント一覧
          </h2>
          {tenants.map(tenant => {
            const statusInfo = getHealthStatusInfo(tenant.health.status);
            return (
              <div
                key={tenant.id}
                style={{
                  padding: 16,
                  background: 'rgba(255,255,255,0.05)',
                  borderRadius: 8,
                  marginBottom: 12,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <div style={{ fontSize: 16, fontWeight: 700 }}>{tenant.name}</div>
                  <div style={{ fontSize: 12, color: statusInfo.color }}>
                    {statusInfo.icon} {statusInfo.label}
                  </div>
                </div>
                {tenant.stats && (
                  <div style={{ fontSize: 12, opacity: 0.7, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                    <div>GIFT HUB: {tenant.stats.totalHubs}個</div>
                    <div>配布: {tenant.stats.totalDistributions}回</div>
                    <div>収益: {formatTokenAmount(BigInt(tenant.stats.totalRevenue), 18, 0)} JPYC</div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* 最近のアクティビティ */}
        <div style={{
          background: 'rgba(255,255,255,0.05)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 12,
          padding: 20,
          color: '#fff',
          maxHeight: 500,
          overflowY: 'auto',
        }}>
          <h2 style={{ margin: '0 0 16px 0', fontSize: 18, fontWeight: 700 }}>
            📝 最近のアクティビティ
          </h2>
          {activities.slice(0, 10).map(activity => {
            const categoryInfo = getActivityCategoryInfo(activity.category);
            return (
              <div
                key={activity.id}
                style={{
                  padding: 12,
                  background: 'rgba(255,255,255,0.05)',
                  borderRadius: 8,
                  marginBottom: 8,
                  borderLeft: `3px solid ${categoryInfo.color}`,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <span style={{ fontSize: 16 }}>{categoryInfo.icon}</span>
                  <span style={{ fontSize: 14, fontWeight: 600 }}>{activity.title}</span>
                </div>
                <div style={{ fontSize: 12, opacity: 0.8, marginBottom: 4 }}>{activity.description}</div>
                <div style={{ fontSize: 11, opacity: 0.6 }}>{formatRelativeTime(activity.timestamp)}</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/**
 * ユーザープレビュータブ - 実際のユーザーマイページをプレビュー
 */
function UserPreviewTabSimple() {
  const connectedAddress = useAddress();
  const [previewAddress, setPreviewAddress] = useState('');

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '350px 1fr',
      gap: 24,
    }}>
      {/* 左側: コントロールパネル */}
      <div style={{
        background: 'rgba(255,255,255,0.05)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: 12,
        padding: 20,
        color: '#fff',
        height: 'fit-content',
      }}>
        <h3 style={{ margin: '0 0 16px 0', fontSize: 16, fontWeight: 700 }}>
          🔍 プレビュー対象
        </h3>

        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', fontSize: 12, marginBottom: 8, opacity: 0.8 }}>
            ウォレットアドレス
          </label>
          <input
            type="text"
            value={previewAddress}
            onChange={(e) => setPreviewAddress(e.target.value)}
            placeholder="0x..."
            style={{
              width: '100%',
              padding: 10,
              background: 'rgba(255,255,255,0.1)',
              border: '1px solid rgba(255,255,255,0.2)',
              borderRadius: 8,
              color: '#fff',
              fontSize: 13,
              fontFamily: 'monospace',
            }}
          />
        </div>

        <button
          onClick={() => setPreviewAddress(connectedAddress || '')}
          disabled={!connectedAddress}
          style={{
            width: '100%',
            padding: 10,
            background: connectedAddress ? 'rgba(102, 126, 234, 0.2)' : 'rgba(255,255,255,0.05)',
            border: `1px solid ${connectedAddress ? 'rgba(102, 126, 234, 0.5)' : 'rgba(255,255,255,0.1)'}`,
            borderRadius: 8,
            color: connectedAddress ? '#fff' : 'rgba(255,255,255,0.4)',
            fontSize: 13,
            fontWeight: 600,
            cursor: connectedAddress ? 'pointer' : 'not-allowed',
          }}
        >
          接続中のウォレットを使用
        </button>

        <div style={{
          marginTop: 20,
          padding: 12,
          background: 'rgba(251, 191, 36, 0.1)',
          border: '1px solid rgba(251, 191, 36, 0.3)',
          borderRadius: 8,
          fontSize: 12,
        }}>
          💡 <strong>ヒント:</strong> アドレスを入力すると、そのユーザーのマイページをプレビューできます
        </div>
      </div>

      {/* 右側: プレビュー */}
      <div style={{
        background: 'rgba(0,0,0,0.3)',
        borderRadius: 16,
        overflow: 'hidden',
        border: '1px solid rgba(255,255,255,0.1)',
      }}>
        {previewAddress ? (
          <ScoreProfilePage userId={previewAddress} />
        ) : (
          <div style={{
            minHeight: 500,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            padding: 40,
            textAlign: 'center',
          }}>
            <div style={{ fontSize: 64, marginBottom: 16 }}>📭</div>
            <h2 style={{ margin: '0 0 12px 0', fontSize: 20, fontWeight: 700 }}>
              アドレスを入力してください
            </h2>
            <p style={{ margin: 0, fontSize: 14, opacity: 0.7, maxWidth: 400 }}>
              プレビューしたいユーザーのウォレットアドレスを入力するか、接続中のウォレットを使用してください
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * 統計カード
 */
function StatCard({ icon, label, value, subtitle, color }: {
  icon: string;
  label: string;
  value: string;
  subtitle?: string;
  color: string;
}) {
  return (
    <div style={{
      background: 'rgba(255,255,255,0.05)',
      border: `1px solid ${color}30`,
      borderRadius: 12,
      padding: 20,
      color: '#fff',
    }}>
      <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 8 }}>{icon} {label}</div>
      <div style={{ fontSize: 28, fontWeight: 800, color }}>{value}</div>
      {subtitle && <div style={{ fontSize: 11, opacity: 0.6, marginTop: 8 }}>{subtitle}</div>}
    </div>
  );
}

/**
 * テナント管理タブ
 */
function TenantsTab() {
  const { tenants, isLoading } = useTenantList();
  const [showCreateForm, setShowCreateForm] = useState(false);

  // 環境変数からFactoryアドレスを取得
  const factoryAddress = import.meta.env.VITE_FACTORY_ADDRESS;

  if (isLoading) {
    return (
      <div style={{
        padding: 60,
        textAlign: 'center',
        color: '#fff',
      }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>⏳</div>
        <div style={{ fontSize: 18 }}>テナント情報を読み込み中...</div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div style={{
        background: 'rgba(255,255,255,0.05)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: 12,
        padding: 20,
        color: '#fff',
      }}>
        <h2 style={{ margin: '0 0 16px 0', fontSize: 18, fontWeight: 700 }}>
          🏢 テナント一覧
        </h2>
        <p style={{ fontSize: 14, opacity: 0.7, marginBottom: 20 }}>
          プラットフォーム上で動作している全テナントの管理と監視
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {tenants.map(tenant => {
            const statusInfo = getHealthStatusInfo(tenant.health.status);
            return (
              <div
                key={tenant.id}
                style={{
                  padding: 20,
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: 12,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                  <div>
                    <h3 style={{ margin: '0 0 4px 0', fontSize: 20, fontWeight: 700 }}>{tenant.name}</h3>
                    <div style={{ fontSize: 12, opacity: 0.7, fontFamily: 'monospace' }}>{tenant.id}</div>
                  </div>
                  <div style={{
                    padding: '8px 16px',
                    background: statusInfo.color + '20',
                    border: `1px solid ${statusInfo.color}`,
                    borderRadius: 8,
                    fontSize: 14,
                    fontWeight: 600,
                    color: statusInfo.color,
                  }}>
                    {statusInfo.icon} {statusInfo.label}
                  </div>
                </div>

                {tenant.stats && (
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
                    gap: 12,
                    marginTop: 16,
                  }}>
                    <div style={{ padding: 12, background: 'rgba(255,255,255,0.05)', borderRadius: 8 }}>
                      <div style={{ fontSize: 11, opacity: 0.7, marginBottom: 4 }}>GIFT HUB</div>
                      <div style={{ fontSize: 18, fontWeight: 700 }}>{tenant.stats.totalHubs}個</div>
                      <div style={{ fontSize: 11, opacity: 0.6 }}>稼働中: {tenant.stats.activeHubs}個</div>
                    </div>
                    <div style={{ padding: 12, background: 'rgba(255,255,255,0.05)', borderRadius: 8 }}>
                      <div style={{ fontSize: 11, opacity: 0.7, marginBottom: 4 }}>総配布数</div>
                      <div style={{ fontSize: 18, fontWeight: 700 }}>{tenant.stats.totalDistributions.toLocaleString()}回</div>
                    </div>
                    <div style={{ padding: 12, background: 'rgba(255,255,255,0.05)', borderRadius: 8 }}>
                      <div style={{ fontSize: 11, opacity: 0.7, marginBottom: 4 }}>総収益</div>
                      <div style={{ fontSize: 18, fontWeight: 700 }}>{formatTokenAmount(BigInt(tenant.stats.totalRevenue), 18, 0)} JPYC</div>
                    </div>
                    <div style={{ padding: 12, background: 'rgba(255,255,255,0.05)', borderRadius: 8 }}>
                      <div style={{ fontSize: 11, opacity: 0.7, marginBottom: 4 }}>ユーザー数</div>
                      <div style={{ fontSize: 18, fontWeight: 700 }}>{tenant.stats.userCount.toLocaleString()}人</div>
                    </div>
                  </div>
                )}

                {tenant.health.issues.length > 0 && (
                  <div style={{
                    marginTop: 12,
                    padding: 12,
                    background: 'rgba(239, 68, 68, 0.1)',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                    borderRadius: 8,
                  }}>
                    <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 4 }}>⚠️ 問題が検出されました</div>
                    <ul style={{ margin: 0, paddingLeft: 20, fontSize: 11, opacity: 0.9 }}>
                      {tenant.health.issues.map((issue, i) => (
                        <li key={i}>{issue}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* 新規テナント作成 */}
      {showCreateForm ? (
        <CreateTenantForm
          factoryAddress={factoryAddress}
          onSuccess={(tenantId, contracts) => {
            console.log('Tenant created:', tenantId, contracts);
            setShowCreateForm(false);
            // テナント一覧を再読み込み（将来的にrefetch機能を実装）
          }}
          onCancel={() => setShowCreateForm(false)}
        />
      ) : (
        <div style={{
          background: 'rgba(139, 92, 246, 0.1)',
          border: '1px solid rgba(139, 92, 246, 0.3)',
          borderRadius: 12,
          padding: 20,
          color: '#fff',
          textAlign: 'center',
        }}>
          <h3 style={{ margin: '0 0 12px 0', fontSize: 16, fontWeight: 700 }}>
            ➕ 新規テナント作成
          </h3>
          <p style={{ fontSize: 14, opacity: 0.8, marginBottom: 16 }}>
            新しいテナントのコントラクトセットを一括デプロイします
          </p>
          <button
            onClick={() => setShowCreateForm(true)}
            style={{
              padding: '12px 32px',
              background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
              border: 'none',
              borderRadius: 8,
              color: '#fff',
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <span>🏭</span>
            <span>テナント作成フォームを開く</span>
          </button>
        </div>
      )}
    </div>
  );
}

/**
 * 収益管理タブ
 */
function RevenueTab() {
  const { stats, isLoading } = useSystemStats();
  const [platformFee, setPlatformFee] = useState<number>(5);
  const [isSavingFee, setIsSavingFee] = useState(false);
  const [feeMessage, setFeeMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // ローカルストレージから手数料設定を読み込み
  useEffect(() => {
    try {
      const savedFee = localStorage.getItem('gifterra_platform_fee');
      if (savedFee) {
        setPlatformFee(parseFloat(savedFee));
      }
    } catch (error) {
      console.error('Failed to load platform fee:', error);
    }
  }, []);

  // 手数料を保存
  const handleSaveFee = () => {
    setIsSavingFee(true);
    setFeeMessage(null);

    try {
      if (platformFee < 0 || platformFee > 20) {
        throw new Error('手数料は0-20%の範囲で設定してください');
      }

      localStorage.setItem('gifterra_platform_fee', platformFee.toString());
      setFeeMessage({ type: 'success', text: '手数料設定を保存しました' });
      setTimeout(() => setFeeMessage(null), 3000);
    } catch (error) {
      setFeeMessage({
        type: 'error',
        text: error instanceof Error ? error.message : '保存に失敗しました'
      });
    } finally {
      setIsSavingFee(false);
    }
  };

  if (isLoading) {
    return (
      <div style={{
        padding: 60,
        textAlign: 'center',
        color: '#fff',
      }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>⏳</div>
        <div style={{ fontSize: 18 }}>収益データを読み込み中...</div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* プラットフォーム手数料設定 */}
      <div style={{
        background: 'rgba(139, 92, 246, 0.1)',
        border: '1px solid rgba(139, 92, 246, 0.3)',
        borderRadius: 12,
        padding: 20,
        color: '#fff',
      }}>
        <h2 style={{ margin: '0 0 8px 0', fontSize: 18, fontWeight: 700 }}>
          ⚙️ プラットフォーム手数料設定
        </h2>
        <p style={{ fontSize: 13, opacity: 0.7, margin: '0 0 16px 0' }}>
          テナントから徴収するプラットフォーム利用手数料を設定します（現在は参考値として保存のみ）
        </p>

        {feeMessage && (
          <div style={{
            padding: '10px 14px',
            borderRadius: 6,
            marginBottom: 16,
            background: feeMessage.type === 'success'
              ? 'rgba(34, 197, 94, 0.2)'
              : 'rgba(239, 68, 68, 0.2)',
            border: `1px solid ${feeMessage.type === 'success' ? '#22c55e' : '#ef4444'}`,
            color: feeMessage.type === 'success' ? '#86efac' : '#fca5a5',
            fontSize: 13,
            display: 'flex',
            alignItems: 'center',
            gap: 6
          }}>
            <span>{feeMessage.type === 'success' ? '✅' : '❌'}</span>
            <span>{feeMessage.text}</span>
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ flex: 1 }}>
            <label style={{
              display: 'block',
              fontSize: 13,
              fontWeight: 600,
              marginBottom: 8,
            }}>
              手数料率
            </label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <input
                type="range"
                min="0"
                max="20"
                step="0.5"
                value={platformFee}
                onChange={(e) => setPlatformFee(parseFloat(e.target.value))}
                style={{
                  flex: 1,
                  accentColor: '#8b5cf6'
                }}
              />
              <input
                type="number"
                min="0"
                max="20"
                step="0.5"
                value={platformFee}
                onChange={(e) => setPlatformFee(parseFloat(e.target.value) || 0)}
                style={{
                  width: 80,
                  padding: '8px 12px',
                  background: 'rgba(0,0,0,0.3)',
                  border: '1px solid rgba(255,255,255,0.2)',
                  borderRadius: 6,
                  color: '#fff',
                  fontSize: 14,
                  textAlign: 'center',
                  outline: 'none'
                }}
              />
              <span style={{ fontSize: 14, minWidth: 20 }}>%</span>
            </div>
          </div>
          <button
            onClick={handleSaveFee}
            disabled={isSavingFee}
            style={{
              padding: '10px 24px',
              background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
              border: 'none',
              borderRadius: 6,
              color: '#fff',
              fontSize: 14,
              fontWeight: 600,
              cursor: isSavingFee ? 'not-allowed' : 'pointer',
              opacity: isSavingFee ? 0.6 : 1,
              transition: 'all 0.2s ease',
              marginTop: 22
            }}
          >
            {isSavingFee ? '保存中...' : '💾 保存'}
          </button>
        </div>
      </div>

      {/* 収益概要 */}
      <div style={{
        background: 'rgba(255,255,255,0.05)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: 12,
        padding: 20,
        color: '#fff',
      }}>
        <h2 style={{ margin: '0 0 16px 0', fontSize: 18, fontWeight: 700 }}>
          💰 収益概要
        </h2>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: 16,
        }}>
          <div style={{
            padding: 20,
            background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.2), rgba(245, 158, 11, 0.05))',
            border: '1px solid rgba(245, 158, 11, 0.3)',
            borderRadius: 12,
          }}>
            <div style={{ fontSize: 12, opacity: 0.8, marginBottom: 8 }}>💎 総収益</div>
            <div style={{ fontSize: 32, fontWeight: 800, color: '#f59e0b' }}>
              {formatTokenAmount(BigInt(stats.totalRevenue), 18, 0)}
            </div>
            <div style={{ fontSize: 14, opacity: 0.7, marginTop: 4 }}>JPYC</div>
          </div>
          <div style={{
            padding: 20,
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 12,
          }}>
            <div style={{ fontSize: 12, opacity: 0.8, marginBottom: 8 }}>📊 総トランザクション</div>
            <div style={{ fontSize: 32, fontWeight: 800 }}>
              {stats.totalTransactions.toLocaleString()}
            </div>
            <div style={{ fontSize: 14, opacity: 0.7, marginTop: 4 }}>件</div>
          </div>
          <div style={{
            padding: 20,
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 12,
          }}>
            <div style={{ fontSize: 12, opacity: 0.8, marginBottom: 8 }}>🎁 総配布数</div>
            <div style={{ fontSize: 32, fontWeight: 800 }}>
              {stats.totalDistributions.toLocaleString()}
            </div>
            <div style={{ fontSize: 14, opacity: 0.7, marginTop: 4 }}>回</div>
          </div>
        </div>
      </div>

      {/* 収益の内訳 */}
      <div style={{
        background: 'rgba(255,255,255,0.05)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: 12,
        padding: 20,
        color: '#fff',
      }}>
        <h3 style={{ margin: '0 0 16px 0', fontSize: 16, fontWeight: 700 }}>
          📈 収益の内訳（準備中）
        </h3>
        <p style={{ fontSize: 14, opacity: 0.7, marginBottom: 16 }}>
          今後、以下の情報を表示予定です：
        </p>
        <ul style={{ margin: 0, paddingLeft: 20, fontSize: 14, lineHeight: 1.8, opacity: 0.8 }}>
          <li>テナント別の収益</li>
          <li>GIFT HUB別の収益</li>
          <li>時系列の収益推移グラフ</li>
          <li>ロイヤリティ分配の詳細</li>
          <li>プラットフォーム手数料の詳細</li>
        </ul>
      </div>

      {/* 将来の機能 */}
      <div style={{
        background: 'rgba(255,255,255,0.05)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: 12,
        padding: 20,
        color: '#fff',
      }}>
        <h3 style={{ margin: '0 0 12px 0', fontSize: 16, fontWeight: 700 }}>
          🚀 今後の機能
        </h3>
        <ul style={{ margin: 0, paddingLeft: 20, fontSize: 14, lineHeight: 1.8, opacity: 0.8 }}>
          <li>収益の引き出し機能</li>
          <li>収益レポートのエクスポート（CSV, PDF）</li>
          <li>リアルタイム収益ダッシュボード</li>
          <li>収益の自動分配設定</li>
          <li>税務レポートの生成</li>
        </ul>
      </div>
    </div>
  );
}

/**
 * ユーザープロフィールプレビュー（APIサーバー不要版）
 */
function UserProfilePreview({ address, mode, presetName }: {
  address: string;
  mode: PreviewMode;
  presetName: PresetName;
}) {
  // モックモードまたはプリセット選択時
  const profile = mode === 'mock' || presetName !== 'custom'
    ? generateMockUserProfile(presetName)
    : useUserProfile(address).data;

  // ローディング状態
  if (!profile && mode === 'real') {
    return (
      <div style={{
        padding: 60,
        textAlign: 'center',
        color: '#fff',
      }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>⏳</div>
        <div style={{ fontSize: 18 }}>プロフィールを読み込み中...</div>
      </div>
    );
  }

  // データがない場合
  if (!profile) {
    return (
      <div style={{
        padding: 60,
        textAlign: 'center',
        color: '#fff',
      }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>❌</div>
        <div style={{ fontSize: 18 }}>プロフィールが見つかりません</div>
        <div style={{ fontSize: 14, opacity: 0.7, marginTop: 8 }}>
          アドレス: {shortenAddress(address)}
        </div>
      </div>
    );
  }

  const rankInfo = getRankBadge(profile.rank);
  const rankColor = getRankColor(profile.rank);

  return (
    <div style={{
      padding: 20,
      color: '#fff',
    }}>
      {/* ヘッダー */}
      <div style={{
        background: `linear-gradient(135deg, ${rankColor} 0%, ${rankColor}99 100%)`,
        borderRadius: 12,
        padding: 20,
        marginBottom: 20,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 12 }}>
          <div style={{ fontSize: 48 }}>{rankInfo.emoji}</div>
          <div>
            <div style={{ fontSize: 24, fontWeight: 700, marginBottom: 4 }}>
              {profile.displayName || shortenAddress(profile.address)}
            </div>
            <div style={{
              display: 'inline-block',
              padding: '4px 12px',
              background: 'rgba(255,255,255,0.2)',
              borderRadius: 999,
              fontSize: 12,
              fontWeight: 700,
            }}>
              {rankInfo.label}
            </div>
          </div>
        </div>
        <div style={{
          fontSize: 12,
          opacity: 0.9,
          fontFamily: 'monospace',
          wordBreak: 'break-all',
        }}>
          {profile.address}
        </div>
      </div>

      {/* 統計カード */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: 12,
        marginBottom: 20,
      }}>
        <div style={{
          background: 'rgba(255,255,255,0.05)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 12,
          padding: 16,
        }}>
          <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 4 }}>Total Tips</div>
          <div style={{ fontSize: 20, fontWeight: 700 }}>
            {formatTokenAmount(profile.totalTips)} tNHT
          </div>
        </div>

        <div style={{
          background: 'rgba(255,255,255,0.05)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 12,
          padding: 16,
        }}>
          <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 4 }}>Rank</div>
          <div style={{ fontSize: 20, fontWeight: 700 }}>
            #{profile.globalRank || '—'}
          </div>
        </div>

        <div style={{
          background: 'rgba(255,255,255,0.05)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 12,
          padding: 16,
        }}>
          <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 4 }}>Purchases</div>
          <div style={{ fontSize: 20, fontWeight: 700 }}>
            {profile.purchaseCount}
          </div>
        </div>
      </div>

      {/* 最近のアクティビティ */}
      <div style={{
        background: 'rgba(255,255,255,0.05)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: 12,
        padding: 16,
      }}>
        <h3 style={{ margin: '0 0 12px 0', fontSize: 16, fontWeight: 700 }}>
          🕒 Recent Activity
        </h3>
        {profile.recentActivity && profile.recentActivity.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {profile.recentActivity.slice(0, 5).map((activity, index) => (
              <div
                key={index}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: 8,
                  background: 'rgba(255,255,255,0.03)',
                  borderRadius: 8,
                  fontSize: 13,
                }}
              >
                <div>
                  <span style={{ marginRight: 8 }}>{activity.type === 'tip' ? '💰' : '🎁'}</span>
                  <span>{activity.type === 'tip' ? 'Tipped' : 'Purchased'}</span>
                  {activity.amount && (
                    <span style={{ fontWeight: 700, marginLeft: 8 }}>
                      {formatTokenAmount(activity.amount)} tNHT
                    </span>
                  )}
                </div>
                <div style={{ fontSize: 11, opacity: 0.6 }}>
                  {formatRelativeTime(activity.timestamp)}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ textAlign: 'center', opacity: 0.6, padding: 20 }}>
            アクティビティがありません
          </div>
        )}
      </div>

      {/* バッジ */}
      {profile.badges && profile.badges.length > 0 && (
        <div style={{
          background: 'rgba(255,255,255,0.05)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 12,
          padding: 16,
          marginTop: 20,
        }}>
          <h3 style={{ margin: '0 0 12px 0', fontSize: 16, fontWeight: 700 }}>
            🏅 Badges
          </h3>
          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 8,
          }}>
            {profile.badges.map((badge, index) => (
              <div
                key={index}
                style={{
                  padding: '6px 12px',
                  background: 'rgba(255,255,255,0.1)',
                  borderRadius: 999,
                  fontSize: 12,
                  fontWeight: 600,
                }}
              >
                {badge}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
