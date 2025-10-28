// src/pages/SuperAdmin.tsx
// スーパーアドミン専用ダッシュボード

import { useState, useMemo } from 'react';
import { useAddress } from '@thirdweb-dev/react';
import { isSuperAdminWithDebug } from '../config/superAdmin';
import { useSystemStats, useRealtimeStats } from '../hooks/useSystemStats';
import { useTenantList } from '../hooks/useTenantList';
import { useRecentActivity, getActivityCategoryInfo } from '../hooks/useRecentActivity';
import { useSystemHealth, getHealthStatusInfo } from '../hooks/useSystemHealth';
import { formatTokenAmount } from '../utils/userProfile';

// ユーザープロフィールプレビュー用のインポート
import { MOCK_PROFILE_PRESETS, generateMockUserProfile } from '../utils/mockUserProfile';
import { useUserProfile } from '../hooks/useUserProfile';
import { getRankColor, getRankBadge, shortenAddress, formatRelativeTime } from '../utils/userProfile';
import type { UserProfile, RankName } from '../types/user';

// スコア管理ページのインポート
import { ScoreParametersPage, TokenAxisPage, SystemMonitoringPage } from '../admin/score';

type TabType = 'dashboard' | 'user-preview' | 'tenants' | 'revenue' | 'score-parameters' | 'token-axis' | 'system-monitoring';
type PreviewMode = 'real' | 'mock';
type PresetName = 'beginner' | 'intermediate' | 'advanced' | 'expert' | 'legend' | 'custom';

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
            label="ユーザープロフィール"
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
        {activeTab === 'user-preview' && <UserPreviewTab />}
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
 * ユーザープレビュータブ（既存機能）
 */
function UserPreviewTab() {
  const connectedAddress = useAddress();

  // プレビュー設定
  const [previewMode, setPreviewMode] = useState<PreviewMode>('mock');
  const [presetName, setPresetName] = useState<PresetName>('intermediate');
  const [customAddress, setCustomAddress] = useState('');
  const [customRank, setCustomRank] = useState<RankName>('Silver');
  const [customPoints, setCustomPoints] = useState('3000');

  // プレビュー用アドレスを決定
  const previewAddress = useMemo(() => {
    if (presetName === 'custom' && customAddress) {
      return customAddress;
    }
    return connectedAddress || '0x0000000000000000000000000000000000000000';
  }, [presetName, customAddress, connectedAddress]);

  // 実データ取得
  const { profile: realProfile, isLoading: isLoadingReal } = useUserProfile(
    previewMode === 'real' ? previewAddress : undefined
  );

  // モックデータ生成
  const mockProfile = useMemo((): UserProfile | null => {
    if (previewMode !== 'mock') return null;

    if (presetName === 'custom') {
      return generateMockUserProfile({
        address: previewAddress,
        rank: customRank,
        contributionPoints: BigInt(customPoints || '0'),
        totalTipsSent: BigInt(customPoints || '0'),
        totalTipsReceived: BigInt(parseInt(customPoints || '0') / 2),
        purchaseCount: Math.floor(parseInt(customPoints || '0') / 500),
        rewardClaimedCount: Math.floor(parseInt(customPoints || '0') / 100),
        activityCount: Math.min(50, Math.floor(parseInt(customPoints || '0') / 100)),
        sbtCount: ['Bronze', 'Silver', 'Gold', 'Platinum', 'Diamond'].indexOf(customRank) + 1,
      });
    }

    const presetFn = MOCK_PROFILE_PRESETS[presetName as keyof typeof MOCK_PROFILE_PRESETS];
    return presetFn ? presetFn(previewAddress) : null;
  }, [previewMode, presetName, previewAddress, customRank, customPoints]);

  // プレビュー対象のプロフィール
  const profile = previewMode === 'real' ? realProfile : mockProfile;

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '350px 1fr',
      gap: 24,
    }}>
      {/* 左側: コントロール */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* プレビューモード選択 */}
        <div style={{
          background: 'rgba(255,255,255,0.05)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 12,
          padding: 20,
          color: '#fff',
        }}>
          <h3 style={{ margin: '0 0 16px 0', fontSize: 16, fontWeight: 700 }}>
            📊 プレビューモード
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <label style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: 12,
              background: previewMode === 'mock' ? 'rgba(102, 126, 234, 0.2)' : 'rgba(255,255,255,0.05)',
              border: `1px solid ${previewMode === 'mock' ? 'rgba(102, 126, 234, 0.5)' : 'rgba(255,255,255,0.1)'}`,
              borderRadius: 8,
              cursor: 'pointer',
            }}>
              <input
                type="radio"
                name="previewMode"
                value="mock"
                checked={previewMode === 'mock'}
                onChange={() => setPreviewMode('mock')}
              />
              <div>
                <div style={{ fontSize: 14, fontWeight: 600 }}>🎨 モックデータ</div>
                <div style={{ fontSize: 11, opacity: 0.7 }}>テスト用のダミーデータ</div>
              </div>
            </label>
            <label style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: 12,
              background: previewMode === 'real' ? 'rgba(102, 126, 234, 0.2)' : 'rgba(255,255,255,0.05)',
              border: `1px solid ${previewMode === 'real' ? 'rgba(102, 126, 234, 0.5)' : 'rgba(255,255,255,0.1)'}`,
              borderRadius: 8,
              cursor: 'pointer',
            }}>
              <input
                type="radio"
                name="previewMode"
                value="real"
                checked={previewMode === 'real'}
                onChange={() => setPreviewMode('real')}
              />
              <div>
                <div style={{ fontSize: 14, fontWeight: 600 }}>🔗 実データ</div>
                <div style={{ fontSize: 11, opacity: 0.7 }}>コントラクトから取得</div>
              </div>
            </label>
          </div>
        </div>

        {/* プリセット選択 */}
        {previewMode === 'mock' && (
          <div style={{
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 12,
            padding: 20,
            color: '#fff',
          }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: 16, fontWeight: 700 }}>⚡ プリセット</h3>
            <select
              value={presetName}
              onChange={(e) => setPresetName(e.target.value as PresetName)}
              style={{
                width: '100%',
                padding: 12,
                background: 'rgba(255,255,255,0.1)',
                border: '1px solid rgba(255,255,255,0.2)',
                borderRadius: 8,
                color: '#fff',
                fontSize: 14,
              }}
            >
              <option value="beginner">🥉 初心者 (Bronze)</option>
              <option value="intermediate">🥈 中級者 (Silver)</option>
              <option value="advanced">🥇 上級者 (Gold)</option>
              <option value="expert">💎 エキスパート (Platinum)</option>
              <option value="legend">👑 レジェンド (Diamond)</option>
              <option value="custom">⚙️ カスタム</option>
            </select>

            {/* カスタム設定 */}
            {presetName === 'custom' && (
              <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, marginBottom: 4, opacity: 0.8 }}>ランク</label>
                  <select
                    value={customRank}
                    onChange={(e) => setCustomRank(e.target.value as RankName)}
                    style={{
                      width: '100%',
                      padding: 8,
                      background: 'rgba(255,255,255,0.1)',
                      border: '1px solid rgba(255,255,255,0.2)',
                      borderRadius: 6,
                      color: '#fff',
                      fontSize: 13,
                    }}
                  >
                    <option value="Bronze">🥉 Bronze</option>
                    <option value="Silver">🥈 Silver</option>
                    <option value="Gold">🥇 Gold</option>
                    <option value="Platinum">💎 Platinum</option>
                    <option value="Diamond">👑 Diamond</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, marginBottom: 4, opacity: 0.8 }}>貢献度ポイント</label>
                  <input
                    type="number"
                    value={customPoints}
                    onChange={(e) => setCustomPoints(e.target.value)}
                    style={{
                      width: '100%',
                      padding: 8,
                      background: 'rgba(255,255,255,0.1)',
                      border: '1px solid rgba(255,255,255,0.2)',
                      borderRadius: 6,
                      color: '#fff',
                      fontSize: 13,
                    }}
                    placeholder="3000"
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* アドレス入力 */}
        <div style={{
          background: 'rgba(255,255,255,0.05)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 12,
          padding: 20,
          color: '#fff',
        }}>
          <h3 style={{ margin: '0 0 16px 0', fontSize: 16, fontWeight: 700 }}>🔍 プレビュー対象</h3>
          <div style={{ marginBottom: 12 }}>
            <label style={{ display: 'block', fontSize: 12, marginBottom: 4, opacity: 0.8 }}>ウォレットアドレス</label>
            <input
              type="text"
              value={customAddress}
              onChange={(e) => {
                setCustomAddress(e.target.value);
                if (e.target.value && presetName !== 'custom') {
                  setPresetName('custom');
                }
              }}
              placeholder={connectedAddress || '0x...'}
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
            onClick={() => {
              setCustomAddress(connectedAddress || '');
              setPresetName('custom');
            }}
            style={{
              width: '100%',
              padding: 10,
              background: 'rgba(102, 126, 234, 0.2)',
              border: '1px solid rgba(102, 126, 234, 0.5)',
              borderRadius: 8,
              color: '#fff',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            接続中のウォレットを使用
          </button>
        </div>
      </div>

      {/* 右側: プレビュー */}
      <div>
        {isLoadingReal && previewMode === 'real' ? (
          <div style={{
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 16,
            padding: 60,
            textAlign: 'center',
            color: '#fff',
          }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>⏳</div>
            <div style={{ fontSize: 18 }}>プロフィールを読み込み中...</div>
          </div>
        ) : profile ? (
          <UserProfilePreview profile={profile} />
        ) : (
          <div style={{
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 16,
            padding: 60,
            textAlign: 'center',
            color: '#fff',
          }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>📭</div>
            <div style={{ fontSize: 18, marginBottom: 8 }}>プロフィールがありません</div>
            <div style={{ fontSize: 14, opacity: 0.7 }}>
              {previewMode === 'real' ? 'このアドレスのデータが見つかりません' : 'プリセットを選択してください'}
            </div>
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
 * ユーザープロフィールプレビュー（簡易版）
 */
function UserProfilePreview({ profile }: { profile: UserProfile }) {
  const [viewMode, setViewMode] = useState<'simple' | 'full'>('simple');
  const rankColor = getRankColor(profile.rank.name);
  const rankBadge = getRankBadge(profile.rank.name);

  return (
    <div style={{
      background: 'rgba(255,255,255,0.05)',
      border: '1px solid rgba(255,255,255,0.1)',
      borderRadius: 16,
      padding: 24,
      color: '#fff',
    }}>
      {/* ビューモード切り替え */}
      <div style={{
        display: 'flex',
        gap: 8,
        marginBottom: 16,
      }}>
        <button
          onClick={() => setViewMode('simple')}
          style={{
            flex: 1,
            padding: '10px 16px',
            background: viewMode === 'simple'
              ? 'linear-gradient(135deg, #667eea, #764ba2)'
              : 'rgba(255,255,255,0.1)',
            border: 'none',
            borderRadius: 8,
            color: '#fff',
            fontSize: 13,
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.2s ease',
          }}
        >
          📊 簡易プレビュー
        </button>
        <button
          onClick={() => setViewMode('full')}
          style={{
            flex: 1,
            padding: '10px 16px',
            background: viewMode === 'full'
              ? 'linear-gradient(135deg, #667eea, #764ba2)'
              : 'rgba(255,255,255,0.1)',
            border: 'none',
            borderRadius: 8,
            color: '#fff',
            fontSize: 13,
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.2s ease',
          }}
        >
          🎨 実際のマイページ
        </button>
      </div>

      {viewMode === 'full' ? (
        // 実際のマイページ（iframe）
        <div>
          <div style={{
            marginBottom: 12,
            padding: 8,
            background: 'rgba(102, 126, 234, 0.2)',
            border: '1px solid rgba(102, 126, 234, 0.5)',
            borderRadius: 8,
            fontSize: 12,
            fontWeight: 600,
            textAlign: 'center',
          }}>
            👁️ 実際のマイページプレビュー（スコアプロフィール）
          </div>
          <iframe
            src={`/user/${profile.address}`}
            style={{
              width: '100%',
              height: '800px',
              border: '1px solid rgba(255,255,255,0.2)',
              borderRadius: 12,
              background: '#fff',
            }}
            title="User My Page Preview"
          />
          <div style={{
            marginTop: 12,
            padding: 8,
            background: 'rgba(255,255,255,0.05)',
            borderRadius: 8,
            fontSize: 11,
            textAlign: 'center',
            opacity: 0.7,
          }}>
            💡 ユーザーが実際に見ているマイページと同じレイアウトです
          </div>
        </div>
      ) : (
        // 簡易プレビュー
        <>
          <div style={{
            marginBottom: 16,
            padding: 8,
            background: 'rgba(102, 126, 234, 0.2)',
            border: '1px solid rgba(102, 126, 234, 0.5)',
            borderRadius: 8,
            fontSize: 12,
            fontWeight: 600,
            textAlign: 'center',
          }}>
            👁️ 簡易プレビューモード（Gifterraコントラクトデータ）
          </div>

      {/* ヘッダー */}
      <div style={{
        background: 'rgba(255,255,255,0.1)',
        borderRadius: 12,
        padding: 24,
        marginBottom: 20,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
          <div style={{
            width: 100,
            height: 100,
            borderRadius: '50%',
            background: `linear-gradient(135deg, ${rankColor}, ${rankColor}99)`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 40,
            border: '3px solid rgba(255,255,255,0.3)',
          }}>
            {rankBadge}
          </div>

          <div style={{ flex: 1, minWidth: 250 }}>
            {profile.ensName && (
              <h2 style={{ margin: '0 0 8px 0', fontSize: 24, fontWeight: 800 }}>{profile.ensName}</h2>
            )}
            <div style={{
              fontSize: 14,
              fontFamily: 'monospace',
              marginBottom: 12,
              opacity: profile.ensName ? 0.7 : 1,
            }}>
              {shortenAddress(profile.address, 8)}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <div style={{
                padding: '6px 14px',
                background: rankColor,
                borderRadius: 16,
                fontSize: 12,
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}>
                {rankBadge} {profile.rank.name}
              </div>
              <div style={{ fontSize: 12, opacity: 0.8 }}>Level {profile.rank.level}</div>
            </div>
            <div style={{ fontSize: 14, marginBottom: 6 }}>
              💎 貢献度: <span style={{ fontWeight: 700 }}>{formatTokenAmount(profile.rank.points, 18, 0)}</span> JPYC
            </div>
          </div>
        </div>
      </div>

      {/* 統計 */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: 12,
      }}>
        <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: 10, padding: 14 }}>
          <div style={{ fontSize: 11, opacity: 0.7, marginBottom: 6 }}>💸 Tip送信</div>
          <div style={{ fontSize: 18, fontWeight: 800 }}>{formatTokenAmount(profile.stats.totalTipsSent, 18, 0)} JPYC</div>
        </div>
        <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: 10, padding: 14 }}>
          <div style={{ fontSize: 11, opacity: 0.7, marginBottom: 6 }}>💰 Tip受取</div>
          <div style={{ fontSize: 18, fontWeight: 800 }}>{formatTokenAmount(profile.stats.totalTipsReceived, 18, 0)} JPYC</div>
        </div>
        <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: 10, padding: 14 }}>
          <div style={{ fontSize: 11, opacity: 0.7, marginBottom: 6 }}>🎁 特典受取</div>
          <div style={{ fontSize: 18, fontWeight: 800 }}>{profile.stats.purchaseCount}回</div>
        </div>
        <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: 10, padding: 14 }}>
          <div style={{ fontSize: 11, opacity: 0.7, marginBottom: 6 }}>🎉 Reward受取</div>
          <div style={{ fontSize: 18, fontWeight: 800 }}>{profile.stats.rewardClaimedCount}回</div>
        </div>
      </div>
        </>
      )}
    </div>
  );
}

/**
 * テナント管理タブ
 */
function TenantsTab() {
  const { tenants, isLoading } = useTenantList();

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
          <li>新規テナントの作成・登録</li>
          <li>テナントごとの設定管理</li>
          <li>テナントごとのロイヤリティ設定</li>
          <li>テナントごとのユーザーアクセス制御</li>
          <li>テナント間のデータ分離と移行</li>
        </ul>
      </div>
    </div>
  );
}

/**
 * 収益管理タブ
 */
function RevenueTab() {
  const { stats, isLoading } = useSystemStats();

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
