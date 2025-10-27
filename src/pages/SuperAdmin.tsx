// src/pages/SuperAdmin.tsx
// スーパーアドミン専用ダッシュボード

import { useState, useMemo } from 'react';
import { useAddress } from '@thirdweb-dev/react';
import { isSuperAdminWithDebug } from '../config/superAdmin';
import { MOCK_PROFILE_PRESETS, generateMockUserProfile } from '../utils/mockUserProfile';
import { useUserProfile } from '../hooks/useUserProfile';
import { getRankColor, getRankBadge, shortenAddress, formatTokenAmount, formatRelativeTime } from '../utils/userProfile';
import type { UserProfile, RankName } from '../types/user';

type PreviewMode = 'real' | 'mock';
type PresetName = 'beginner' | 'intermediate' | 'advanced' | 'expert' | 'legend' | 'custom';

export function SuperAdminPage() {
  const connectedAddress = useAddress();
  const isAdmin = isSuperAdminWithDebug(connectedAddress);

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
        maxWidth: 1400,
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
            システム管理・プレビュー・診断ツール
          </p>
        </div>

        {/* メインコンテンツ */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '350px 1fr',
          gap: 24,
        }}>
          {/* 左側: コントロールパネル */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 16,
          }}>
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

            {/* プリセット選択 (モックモード時のみ) */}
            {previewMode === 'mock' && (
              <div style={{
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 12,
                padding: 20,
                color: '#fff',
              }}>
                <h3 style={{ margin: '0 0 16px 0', fontSize: 16, fontWeight: 700 }}>
                  ⚡ プリセット
                </h3>
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
                      <label style={{ display: 'block', fontSize: 12, marginBottom: 4, opacity: 0.8 }}>
                        ランク
                      </label>
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
                      <label style={{ display: 'block', fontSize: 12, marginBottom: 4, opacity: 0.8 }}>
                        貢献度ポイント
                      </label>
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
              <h3 style={{ margin: '0 0 16px 0', fontSize: 16, fontWeight: 700 }}>
                🔍 プレビュー対象
              </h3>
              <div style={{ marginBottom: 12 }}>
                <label style={{ display: 'block', fontSize: 12, marginBottom: 4, opacity: 0.8 }}>
                  ウォレットアドレス
                </label>
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

            {/* 情報 */}
            <div style={{
              background: 'rgba(102, 126, 234, 0.1)',
              border: '1px solid rgba(102, 126, 234, 0.3)',
              borderRadius: 12,
              padding: 16,
              color: '#fff',
              fontSize: 12,
            }}>
              <div style={{ fontWeight: 700, marginBottom: 8 }}>ℹ️ 使い方</div>
              <ul style={{ margin: 0, paddingLeft: 20, lineHeight: 1.6, opacity: 0.9 }}>
                <li>モックデータモードでデザインを確認</li>
                <li>プリセットで様々なランクをプレビュー</li>
                <li>実データモードで実際のユーザーを確認</li>
              </ul>
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
                  {previewMode === 'real'
                    ? 'このアドレスのデータが見つかりません'
                    : 'プリセットを選択してください'}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * ユーザープロフィールプレビューコンポーネント
 */
function UserProfilePreview({ profile }: { profile: UserProfile }) {
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
      {/* プレビューラベル */}
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
        👁️ プレビューモード - 実際のユーザー画面と同じデザイン
      </div>

      {/* ヘッダー */}
      <div style={{
        background: 'rgba(255,255,255,0.1)',
        backdropFilter: 'blur(10px)',
        borderRadius: 12,
        padding: 24,
        marginBottom: 20,
        border: '1px solid rgba(255,255,255,0.2)',
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 20,
          flexWrap: 'wrap',
        }}>
          {/* アバター */}
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

          {/* 情報 */}
          <div style={{ flex: 1, minWidth: 250 }}>
            {profile.ensName && (
              <h2 style={{ margin: '0 0 8px 0', fontSize: 24, fontWeight: 800 }}>
                {profile.ensName}
              </h2>
            )}
            <div style={{
              fontSize: 14,
              fontFamily: 'monospace',
              marginBottom: 12,
              opacity: profile.ensName ? 0.7 : 1,
            }}>
              {shortenAddress(profile.address, 8)}
            </div>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              marginBottom: 8,
            }}>
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
              <div style={{ fontSize: 12, opacity: 0.8 }}>
                Level {profile.rank.level}
              </div>
            </div>
            <div style={{ fontSize: 14, marginBottom: 6 }}>
              💎 貢献度: <span style={{ fontWeight: 700 }}>{profile.rank.points.toLocaleString()}</span> pt
            </div>
            {profile.rank.nextRank && profile.rank.pointsToNext !== undefined && (
              <div style={{ fontSize: 12, opacity: 0.9 }}>
                次のランク（{profile.rank.nextRank}）まで: <span style={{ fontWeight: 600 }}>{profile.rank.pointsToNext.toLocaleString()}</span> pt
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 統計 */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: 12,
        marginBottom: 20,
      }}>
        <StatCard emoji="💸" label="Tip送信" value={`${formatTokenAmount(profile.stats.totalTipsSent, 18, 0)} JPYC`} sub={`${profile.stats.tipSentCount}回`} />
        <StatCard emoji="💰" label="Tip受取" value={`${formatTokenAmount(profile.stats.totalTipsReceived, 18, 0)} JPYC`} sub={`${profile.stats.tipReceivedCount}回`} />
        <StatCard emoji="🎁" label="特典受取" value={`${profile.stats.purchaseCount}回`} />
        <StatCard emoji="🎉" label="Reward受取" value={`${profile.stats.rewardClaimedCount}回`} />
      </div>

      {/* SBT */}
      {profile.sbts.length > 0 && (
        <div style={{
          background: 'rgba(255,255,255,0.05)',
          borderRadius: 12,
          padding: 16,
          marginBottom: 20,
        }}>
          <h3 style={{ margin: '0 0 12px 0', fontSize: 14, fontWeight: 700 }}>🖼️ Soulbound Tokens</h3>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
            gap: 12,
          }}>
            {profile.sbts.map((sbt, idx) => (
              <div
                key={idx}
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  borderRadius: 8,
                  padding: 12,
                  textAlign: 'center',
                  border: '1px solid rgba(255,255,255,0.1)',
                }}
              >
                <div style={{ fontSize: 32, marginBottom: 6 }}>{rankBadge}</div>
                <div style={{ fontSize: 11, fontWeight: 600, marginBottom: 2 }}>
                  {sbt.metadata?.name || `SBT #${sbt.tokenId.toString()}`}
                </div>
                {sbt.mintedAt && (
                  <div style={{ fontSize: 10, opacity: 0.6 }}>
                    {formatRelativeTime(sbt.mintedAt)}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* アクティビティ */}
      <div style={{
        background: 'rgba(255,255,255,0.05)',
        borderRadius: 12,
        padding: 16,
      }}>
        <h3 style={{ margin: '0 0 12px 0', fontSize: 14, fontWeight: 700 }}>📝 最近のアクティビティ</h3>
        {profile.recentActivities && profile.recentActivities.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {profile.recentActivities.slice(0, 5).map((activity) => (
              <div
                key={activity.id}
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  padding: 10,
                  borderRadius: 6,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  fontSize: 12,
                }}
              >
                <div style={{ fontSize: 18 }}>
                  {activity.type === 'tip_sent' ? '💸' :
                   activity.type === 'tip_received' ? '💰' :
                   activity.type === 'purchase' ? '🎁' :
                   activity.type === 'reward_claimed' ? '🎉' :
                   activity.type === 'rank_up' ? '⬆️' :
                   activity.type === 'sbt_minted' ? '🖼️' : '📝'}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, marginBottom: 2 }}>
                    {activity.type === 'tip_sent' ? 'Tip送信' :
                     activity.type === 'tip_received' ? 'Tip受取' :
                     activity.type === 'purchase' ? '特典受取' :
                     activity.type === 'reward_claimed' ? 'Reward受取' :
                     activity.type === 'rank_up' ? 'ランクアップ' :
                     activity.type === 'sbt_minted' ? 'SBT取得' : activity.type}
                  </div>
                  <div style={{ fontSize: 10, opacity: 0.7 }}>
                    {formatRelativeTime(activity.timestamp)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ padding: 20, textAlign: 'center', opacity: 0.5, fontSize: 12 }}>
            アクティビティがありません
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * 統計カードコンポーネント
 */
function StatCard({ emoji, label, value, sub }: { emoji: string; label: string; value: string; sub?: string }) {
  return (
    <div style={{
      background: 'rgba(255,255,255,0.05)',
      borderRadius: 10,
      padding: 14,
      border: '1px solid rgba(255,255,255,0.1)',
    }}>
      <div style={{ fontSize: 11, opacity: 0.7, marginBottom: 6 }}>{emoji} {label}</div>
      <div style={{ fontSize: 18, fontWeight: 800 }}>{value}</div>
      {sub && <div style={{ fontSize: 10, opacity: 0.6, marginTop: 4 }}>{sub}</div>}
    </div>
  );
}
