// src/pages/UserProfile.tsx
// ユーザープロフィールページ（投げ銭・貢献度・SBT）- リッチビジュアルレイアウト

import { useUserProfile } from '../hooks/useUserProfile';
import { getRankColor, getRankBadge, shortenAddress, formatRelativeTime, generateTwitterShareText } from '../utils/userProfile';
import type { UserProfile } from '../types/user';

export function UserProfilePage({ address: propsAddress, mockProfile, mockActivities }: {
  address?: string;
  mockProfile?: UserProfile | null;
  mockActivities?: any[];
} = {}) {
  // URLからアドレスを取得（props優先）
  const pathParts = window.location.pathname.split('/');
  const addressFromUrl = pathParts[pathParts.indexOf('user') + 1];
  const targetAddress = propsAddress || addressFromUrl;

  // モックデータがある場合はそれを使用、なければコントラクトから取得
  const { profile: realProfile, activities: realActivities, isLoading, isError } = useUserProfile(
    mockProfile ? undefined : targetAddress
  );

  const profile = mockProfile || realProfile;
  const activities = mockActivities || realActivities || [];

  // モックデータがある場合はローディング・エラーをスキップ
  if (!mockProfile && isLoading) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#fff',
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>⏳</div>
          <div style={{ fontSize: 18 }}>プロフィールを読み込み中...</div>
        </div>
      </div>
    );
  }

  if (!mockProfile && (isError || !profile)) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#fff',
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>❌</div>
          <h2 style={{ margin: '0 0 12px 0', fontSize: 24, fontWeight: 700 }}>プロフィールが見つかりません</h2>
          <p style={{ margin: 0, fontSize: 16, opacity: 0.8 }}>指定されたアドレスのプロフィールを取得できませんでした。</p>
          <button
            onClick={() => window.location.href = '/'}
            style={{
              marginTop: 24,
              padding: '12px 24px',
              background: 'rgba(255,255,255,0.2)',
              border: '1px solid rgba(255,255,255,0.3)',
              borderRadius: 8,
              color: '#fff',
              fontSize: 14,
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

  const rankColor = getRankColor(profile.rank.name);
  const rankBadge = getRankBadge(profile.rank.name);

  // BigInt対応：安全に数値変換
  const formatBigIntSafe = (value: bigint | number): string => {
    try {
      if (typeof value === 'bigint') {
        const divisor = BigInt(10 ** 18);
        const integerPart = Number(value / divisor);
        return integerPart.toLocaleString();
      }
      return value.toLocaleString();
    } catch (e) {
      return '0';
    }
  };

  // タンク用のパーセンテージ計算
  const tipSentPercentage = Math.min(100, (profile.stats.tipSentCount / 50) * 100);
  const tipReceivedPercentage = Math.min(100, (profile.stats.tipReceivedCount / 50) * 100);

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%)',
      padding: '60px 20px',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* 背景アニメーション */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'radial-gradient(circle at 20% 50%, rgba(102, 126, 234, 0.1) 0%, transparent 50%), radial-gradient(circle at 80% 80%, rgba(118, 75, 162, 0.1) 0%, transparent 50%)',
        pointerEvents: 'none',
      }} />

      <div style={{
        maxWidth: 1400,
        margin: '0 auto',
        position: 'relative',
        zIndex: 1,
      }}>
        {/* ヘッダーセクション */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.2), rgba(118, 75, 162, 0.2))',
          backdropFilter: 'blur(20px)',
          borderRadius: 24,
          padding: 48,
          marginBottom: 40,
          border: '2px solid rgba(255,255,255,0.1)',
          boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
          color: '#fff',
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 40,
            flexWrap: 'wrap',
          }}>
            {/* プロフィール画像 */}
            <div style={{
              width: 160,
              height: 160,
              borderRadius: '50%',
              background: `linear-gradient(135deg, ${rankColor}, ${rankColor}cc)`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 72,
              border: '6px solid rgba(255,255,255,0.3)',
              boxShadow: '0 10px 40px rgba(0,0,0,0.3)',
              position: 'relative',
            }}>
              <div style={{
                position: 'absolute',
                inset: -10,
                borderRadius: '50%',
                background: `linear-gradient(135deg, ${rankColor}40, transparent)`,
                animation: 'pulse 2s ease-in-out infinite',
              }} />
              {rankBadge}
            </div>

            {/* ユーザー情報 */}
            <div style={{ flex: 1, minWidth: 300 }}>
              {profile.ensName && (
                <h1 style={{ margin: '0 0 12px 0', fontSize: 42, fontWeight: 900, textShadow: '0 2px 10px rgba(0,0,0,0.3)' }}>
                  {profile.ensName}
                </h1>
              )}

              <div style={{
                fontSize: 20,
                fontFamily: 'monospace',
                marginBottom: 24,
                opacity: 0.8,
                textShadow: '0 1px 3px rgba(0,0,0,0.3)',
              }}>
                {shortenAddress(profile.address, 10)}
              </div>

              {/* ランクバッジ */}
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 16,
                marginBottom: 16,
              }}>
                <div style={{
                  padding: '12px 28px',
                  background: rankColor,
                  borderRadius: 999,
                  fontSize: 18,
                  fontWeight: 800,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
                }}>
                  {rankBadge} {profile.rank.name}
                </div>
                <div style={{ fontSize: 16, opacity: 0.8 }}>
                  Level {profile.rank.level}
                </div>
              </div>

              {/* 貢献度ポイント */}
              <div style={{ fontSize: 18, marginBottom: 12 }}>
                💎 貢献度: <span style={{ fontWeight: 800, fontSize: 32, color: '#fbbf24' }}>{profile.rank.points.toLocaleString()}</span> <span style={{ fontSize: 20 }}>pt</span>
              </div>

              {/* 次のランクまで */}
              {profile.rank.nextRank && profile.rank.pointsToNext !== undefined && (
                <div style={{ fontSize: 16, opacity: 0.9 }}>
                  次のランク（{profile.rank.nextRank}）まで: <span style={{ fontWeight: 700, color: '#60a5fa' }}>{profile.rank.pointsToNext.toLocaleString()}</span> pt
                </div>
              )}
            </div>

            {/* アクションボタン */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <button
                onClick={() => {
                  const text = generateTwitterShareText(
                    profile.address,
                    profile.rank.name,
                    profile.rank.points,
                    profile.sbts.length
                  );
                  window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`, '_blank');
                }}
                style={{
                  padding: '16px 32px',
                  background: 'linear-gradient(135deg, #1DA1F2, #1a8cd8)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 12,
                  fontSize: 16,
                  fontWeight: 700,
                  cursor: 'pointer',
                  boxShadow: '0 4px 20px rgba(29, 161, 242, 0.4)',
                  transition: 'transform 0.2s',
                }}
                onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}
              >
                🐦 Twitterでシェア
              </button>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(window.location.href);
                  alert('URLをコピーしました！');
                }}
                style={{
                  padding: '16px 32px',
                  background: 'rgba(255,255,255,0.15)',
                  color: '#fff',
                  border: '2px solid rgba(255,255,255,0.3)',
                  borderRadius: 12,
                  fontSize: 16,
                  fontWeight: 700,
                  cursor: 'pointer',
                  transition: 'transform 0.2s',
                }}
                onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}
              >
                🔗 URLをコピー
              </button>
            </div>
          </div>
        </div>

        {/* メインコンテンツ：タンクアニメーション */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 40,
          marginBottom: 40,
        }}>
          {/* Tip送信タンク - 大型 */}
          <LargeTankCard
            title="💸 Tip 送信"
            value={formatBigIntSafe(profile.stats.totalTipsSent)}
            unit="JPYC"
            count={profile.stats.tipSentCount}
            color="#667eea"
            percentage={tipSentPercentage}
          />

          {/* Tip受取タンク - 大型 */}
          <LargeTankCard
            title="💰 Tip 受取"
            value={formatBigIntSafe(profile.stats.totalTipsReceived)}
            unit="JPYC"
            count={profile.stats.tipReceivedCount}
            color="#764ba2"
            percentage={tipReceivedPercentage}
          />
        </div>

        {/* 統計カード */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: 24,
          marginBottom: 40,
        }}>
          <StatCard icon="🎁" title="特典受取" value={profile.stats.purchaseCount} unit="回" color="#10b981" />
          <StatCard icon="🎉" title="Reward受取" value={profile.stats.rewardClaimedCount} unit="回" color="#f59e0b" />
          <StatCard icon="🖼️" title="SBT保有" value={profile.sbts.length} unit="個" color="#8b5cf6" />
        </div>

        {/* SBTギャラリー */}
        {profile.sbts.length > 0 && (
          <div style={{
            background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.1), rgba(139, 92, 246, 0.05))',
            backdropFilter: 'blur(20px)',
            borderRadius: 24,
            padding: 32,
            marginBottom: 40,
            border: '2px solid rgba(139, 92, 246, 0.3)',
            boxShadow: '0 10px 40px rgba(0,0,0,0.2)',
            color: '#fff',
          }}>
            <h2 style={{ margin: '0 0 24px 0', fontSize: 28, fontWeight: 800 }}>🖼️ Soulbound Tokens</h2>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
              gap: 20,
            }}>
              {profile.sbts.map((sbt, idx) => (
                <div
                  key={idx}
                  style={{
                    background: 'linear-gradient(135deg, rgba(255,255,255,0.1), rgba(255,255,255,0.05))',
                    borderRadius: 16,
                    padding: 20,
                    textAlign: 'center',
                    border: '2px solid rgba(255,255,255,0.2)',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
                    transition: 'transform 0.2s',
                  }}
                  onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-4px)'}
                  onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                >
                  <div style={{ fontSize: 56, marginBottom: 12 }}>{rankBadge}</div>
                  <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 6 }}>
                    {sbt.metadata?.name || `SBT #${sbt.tokenId.toString()}`}
                  </div>
                  {sbt.mintedAt && (
                    <div style={{ fontSize: 12, opacity: 0.7 }}>
                      {formatRelativeTime(sbt.mintedAt)}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* アクティビティフィード */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(255,255,255,0.05), rgba(255,255,255,0.02))',
          backdropFilter: 'blur(20px)',
          borderRadius: 24,
          padding: 32,
          border: '2px solid rgba(255,255,255,0.1)',
          boxShadow: '0 10px 40px rgba(0,0,0,0.2)',
          color: '#fff',
        }}>
          <h2 style={{ margin: '0 0 24px 0', fontSize: 28, fontWeight: 800 }}>📝 最近のアクティビティ</h2>
          {activities.length === 0 ? (
            <div style={{
              padding: 60,
              textAlign: 'center',
              opacity: 0.5,
            }}>
              <div style={{ fontSize: 64, marginBottom: 16 }}>📭</div>
              <div style={{ fontSize: 18 }}>まだアクティビティがありません</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {activities.slice(0, 10).map((activity) => (
                <div
                  key={activity.id}
                  style={{
                    background: 'linear-gradient(135deg, rgba(255,255,255,0.08), rgba(255,255,255,0.03))',
                    padding: 20,
                    borderRadius: 16,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 16,
                    border: '1px solid rgba(255,255,255,0.1)',
                    transition: 'transform 0.2s',
                  }}
                  onMouseOver={(e) => e.currentTarget.style.transform = 'translateX(4px)'}
                  onMouseOut={(e) => e.currentTarget.style.transform = 'translateX(0)'}
                >
                  <div style={{ fontSize: 32 }}>
                    {activity.type === 'tip_sent' ? '💸' :
                     activity.type === 'tip_received' ? '💰' :
                     activity.type === 'purchase' ? '🎁' :
                     activity.type === 'reward_claimed' ? '🎉' :
                     activity.type === 'rank_up' ? '⬆️' :
                     activity.type === 'sbt_minted' ? '🖼️' : '📝'}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 6 }}>
                      {activity.type === 'tip_sent' ? 'Tip送信' :
                       activity.type === 'tip_received' ? 'Tip受取' :
                       activity.type === 'purchase' ? '特典受取' :
                       activity.type === 'reward_claimed' ? 'Reward受取' :
                       activity.type === 'rank_up' ? 'ランクアップ' :
                       activity.type === 'sbt_minted' ? 'SBT取得' : activity.type}
                    </div>
                    <div style={{ fontSize: 13, opacity: 0.7 }}>
                      {formatRelativeTime(activity.timestamp)}
                    </div>
                  </div>
                  {activity.txHash && (
                    <a
                      href={`https://amoy.polygonscan.com/tx/${activity.txHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        color: '#60a5fa',
                        fontSize: 14,
                        textDecoration: 'none',
                        fontWeight: 600,
                      }}
                    >
                      Tx →
                    </a>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* CSS アニメーション */}
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes pulse {
          0%, 100% { opacity: 0.3; transform: scale(1); }
          50% { opacity: 0.6; transform: scale(1.05); }
        }
        @keyframes wave {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
        @keyframes shimmer {
          0% { background-position: -1000px 0; }
          100% { background-position: 1000px 0; }
        }
      ` }} />
    </div>
  );
}

// 大型タンクカードコンポーネント
function LargeTankCard({ title, value, unit, count, color, percentage }: {
  title: string;
  value: string;
  unit: string;
  count: number;
  color: string;
  percentage: number;
}) {
  return (
    <div style={{
      background: 'linear-gradient(135deg, rgba(255,255,255,0.05), rgba(255,255,255,0.02))',
      backdropFilter: 'blur(20px)',
      borderRadius: 24,
      padding: 40,
      border: '2px solid rgba(255,255,255,0.15)',
      boxShadow: `0 20px 60px ${color}40`,
      color: '#fff',
      position: 'relative',
      overflow: 'hidden',
      minHeight: 400,
      display: 'flex',
      flexDirection: 'column',
    }}>
      {/* タンク液体アニメーション - 大きく目立つ */}
      <div style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: `${percentage}%`,
        background: `linear-gradient(to top, ${color}, ${color}cc, ${color}99)`,
        opacity: 0.5,
        transition: 'height 2s cubic-bezier(0.4, 0, 0.2, 1)',
        zIndex: 0,
      }}>
        {/* 波アニメーション */}
        <div style={{
          position: 'absolute',
          top: -10,
          left: 0,
          right: 0,
          height: 20,
          background: `linear-gradient(90deg, transparent, ${color}80, transparent)`,
          animation: 'wave 3s ease-in-out infinite',
        }} />
      </div>

      {/* コンテンツ */}
      <div style={{ position: 'relative', zIndex: 1, flex: 1, display: 'flex', flexDirection: 'column' }}>
        <div style={{ fontSize: 20, opacity: 0.9, marginBottom: 20, fontWeight: 600 }}>{title}</div>

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center' }}>
          <div style={{
            fontSize: 64,
            fontWeight: 900,
            marginBottom: 16,
            textShadow: '0 4px 20px rgba(0,0,0,0.3)',
          }}>
            {value}
          </div>
          <div style={{ fontSize: 28, opacity: 0.8, marginBottom: 24 }}>{unit}</div>
          <div style={{ fontSize: 20, opacity: 0.9, fontWeight: 600 }}>{count} 回</div>
        </div>

        {/* パーセンテージインジケーター */}
        <div style={{
          marginTop: 24,
          height: 12,
          background: 'rgba(0,0,0,0.3)',
          borderRadius: 999,
          overflow: 'hidden',
          border: '1px solid rgba(255,255,255,0.2)',
        }}>
          <div style={{
            height: '100%',
            width: `${percentage}%`,
            background: `linear-gradient(90deg, ${color}, ${color}cc)`,
            borderRadius: 999,
            transition: 'width 2s cubic-bezier(0.4, 0, 0.2, 1)',
            boxShadow: `0 0 20px ${color}80`,
          }} />
        </div>

        {/* パーセンテージ表示 */}
        <div style={{
          marginTop: 12,
          textAlign: 'center',
          fontSize: 18,
          fontWeight: 700,
          opacity: 0.8,
        }}>
          {percentage.toFixed(0)}% 達成
        </div>
      </div>
    </div>
  );
}

// 統計カードコンポーネント
function StatCard({ icon, title, value, unit, color }: {
  icon: string;
  title: string;
  value: number;
  unit: string;
  color: string;
}) {
  return (
    <div style={{
      background: `linear-gradient(135deg, ${color}20, ${color}10)`,
      backdropFilter: 'blur(20px)',
      borderRadius: 20,
      padding: 28,
      border: `2px solid ${color}40`,
      boxShadow: `0 10px 40px ${color}20`,
      color: '#fff',
      transition: 'transform 0.2s',
    }}
    onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-4px)'}
    onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}
    >
      <div style={{ fontSize: 40, marginBottom: 16 }}>{icon}</div>
      <div style={{ fontSize: 15, opacity: 0.8, marginBottom: 12 }}>{title}</div>
      <div style={{ fontSize: 36, fontWeight: 900 }}>
        {value} <span style={{ fontSize: 20, opacity: 0.8 }}>{unit}</span>
      </div>
    </div>
  );
}
