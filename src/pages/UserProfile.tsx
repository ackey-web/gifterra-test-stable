// src/pages/UserProfile.tsx
// ユーザープロフィールページ - モバイルファーストのレスポンシブデザイン

import { useState, useEffect } from 'react';
import { useUserProfile } from '../hooks/useUserProfile';
import { getRankColor, getRankBadge, shortenAddress, formatRelativeTime, generateTwitterShareText } from '../utils/userProfile';
import type { UserProfile } from '../types/user';

export function UserProfilePage({ address: propsAddress, mockProfile, mockActivities }: {
  address?: string;
  mockProfile?: UserProfile | null;
  mockActivities?: any[];
} = {}) {
  const pathParts = window.location.pathname.split('/');
  const addressFromUrl = pathParts[pathParts.indexOf('user') + 1];
  const targetAddress = propsAddress || addressFromUrl;

  // レスポンシブ対応：画面幅を検知
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const { profile: realProfile, activities: realActivities, isLoading, isError } = useUserProfile(
    mockProfile ? undefined : targetAddress
  );

  const profile = mockProfile || realProfile;
  const activities = mockActivities || realActivities || [];

  if (!mockProfile && isLoading) {
    return (
      <div style={{
        minHeight: '100vh',
        background: '#0a0a0f',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#fff',
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>⏳</div>
          <div style={{ fontSize: 18 }}>読み込み中...</div>
        </div>
      </div>
    );
  }

  if (!mockProfile && (isError || !profile)) {
    return (
      <div style={{
        minHeight: '100vh',
        background: '#0a0a0f',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#fff',
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>❌</div>
          <h2 style={{ margin: '0 0 12px 0', fontSize: 24, fontWeight: 700 }}>プロフィールが見つかりません</h2>
        </div>
      </div>
    );
  }

  const rankColor = getRankColor(profile.rank.name);
  const rankBadge = getRankBadge(profile.rank.name);

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

  const tipSentPercentage = Math.min(100, (profile.stats.tipSentCount / 50) * 100);
  const tipReceivedPercentage = Math.min(100, (profile.stats.tipReceivedCount / 50) * 100);

  return (
    <div style={{
      minHeight: '100vh',
      background: '#0a0a0f',
      color: '#fff',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* グリッド背景 */}
      <div style={{
        position: 'fixed',
        inset: 0,
        backgroundImage: 'linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)',
        backgroundSize: '50px 50px',
        opacity: 0.5,
        pointerEvents: 'none',
      }} />

      {/* グラデーションアクセント */}
      <div style={{
        position: 'fixed',
        top: '-50%',
        right: '-10%',
        width: '60%',
        height: '100%',
        background: 'radial-gradient(circle, rgba(102, 126, 234, 0.15), transparent 70%)',
        pointerEvents: 'none',
      }} />

      <div style={{
        position: 'relative',
        zIndex: 1,
        maxWidth: isMobile ? '100%' : 1600,
        margin: '0 auto',
        padding: isMobile ? '24px 16px' : '80px 40px',
      }}>
        {/* ヘッダー - シームレス */}
        <div style={{
          display: 'flex',
          flexDirection: isMobile ? 'column' : 'row',
          alignItems: 'center',
          gap: isMobile ? 24 : 60,
          marginBottom: isMobile ? 48 : 120,
          paddingBottom: isMobile ? 24 : 60,
          borderBottom: '1px solid rgba(255,255,255,0.08)',
        }}>
          {/* プロフィールアイコン */}
          <div style={{ position: 'relative' }}>
            <div style={{
              width: isMobile ? 100 : 180,
              height: isMobile ? 100 : 180,
              borderRadius: '50%',
              background: `linear-gradient(135deg, ${rankColor}, ${rankColor}dd)`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: isMobile ? 48 : 80,
              position: 'relative',
            }}>
              {rankBadge}
            </div>
            {/* ランクバッジ */}
            <div style={{
              position: 'absolute',
              bottom: -10,
              left: '50%',
              transform: 'translateX(-50%)',
              padding: isMobile ? '6px 16px' : '8px 24px',
              background: rankColor,
              borderRadius: 999,
              fontSize: isMobile ? 12 : 14,
              fontWeight: 800,
              whiteSpace: 'nowrap',
            }}>
              {profile.rank.name}
            </div>
          </div>

          {/* ユーザー情報 */}
          <div style={{ flex: 1, textAlign: isMobile ? 'center' : 'left', width: isMobile ? '100%' : 'auto' }}>
            {profile.ensName && (
              <h1 style={{
                margin: 0,
                fontSize: isMobile ? 28 : 56,
                fontWeight: 900,
                letterSpacing: '-0.02em',
                marginBottom: isMobile ? 8 : 16,
              }}>
                {profile.ensName}
              </h1>
            )}
            <div style={{
              fontSize: isMobile ? 14 : 18,
              fontFamily: 'monospace',
              opacity: 0.5,
              marginBottom: isMobile ? 16 : 32,
            }}>
              {shortenAddress(profile.address, isMobile ? 6 : 10)}
            </div>

            {/* 貢献度 */}
            <div style={{
              display: 'inline-flex',
              alignItems: 'baseline',
              gap: isMobile ? 8 : 12,
            }}>
              <span style={{ fontSize: isMobile ? 14 : 18, opacity: 0.6 }}>貢献度</span>
              <span style={{
                fontSize: isMobile ? 36 : 64,
                fontWeight: 900,
                background: 'linear-gradient(135deg, #fbbf24, #f59e0b)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                letterSpacing: '-0.02em',
              }}>
                {profile.rank.points.toLocaleString()}
              </span>
              <span style={{ fontSize: isMobile ? 16 : 24, opacity: 0.6 }}>pt</span>
            </div>
          </div>

          {/* アクション */}
          <div style={{ display: 'flex', gap: isMobile ? 8 : 16, width: isMobile ? '100%' : 'auto' }}>
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
                padding: isMobile ? '12px 24px' : '16px 32px',
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: isMobile ? 8 : 12,
                color: '#fff',
                fontSize: isMobile ? 14 : 15,
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s',
                flex: isMobile ? 1 : 'none',
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.background = 'rgba(255,255,255,0.1)';
                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)';
              }}
            >
              シェア
            </button>
          </div>
        </div>

        {/* メイン：タンク（主役） */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
          gap: isMobile ? 40 : 80,
          marginBottom: isMobile ? 48 : 120,
        }}>
          {/* Tip送信タンク */}
          <TankVisual
            label="Tip 送信"
            value={formatBigIntSafe(profile.stats.totalTipsSent)}
            count={profile.stats.tipSentCount}
            percentage={tipSentPercentage}
            color="#667eea"
            isMobile={isMobile}
          />

          {/* Tip受取タンク */}
          <TankVisual
            label="Tip 受取"
            value={formatBigIntSafe(profile.stats.totalTipsReceived)}
            count={profile.stats.tipReceivedCount}
            percentage={tipReceivedPercentage}
            color="#764ba2"
            isMobile={isMobile}
          />
        </div>

        {/* 統計 - シンプル */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? 'repeat(3, 1fr)' : 'repeat(3, 1fr)',
          gap: isMobile ? 24 : 80,
          marginBottom: isMobile ? 48 : 120,
          paddingBottom: isMobile ? 32 : 80,
          borderBottom: '1px solid rgba(255,255,255,0.08)',
        }}>
          <StatItem icon="🎁" label="特典受取" value={profile.stats.purchaseCount} isMobile={isMobile} />
          <StatItem icon="🎉" label="Reward" value={profile.stats.rewardClaimedCount} isMobile={isMobile} />
          <StatItem icon="🖼️" label="SBT" value={profile.sbts.length} isMobile={isMobile} />
        </div>

        {/* アクティビティ */}
        {activities.length > 0 && (
          <div>
            <h2 style={{
              fontSize: isMobile ? 20 : 28,
              fontWeight: 700,
              marginBottom: isMobile ? 24 : 40,
              opacity: 0.9,
            }}>
              最近のアクティビティ
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: isMobile ? 8 : 16 }}>
              {activities.slice(0, 5).map((activity) => (
                <div
                  key={activity.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: isMobile ? 12 : 24,
                    padding: isMobile ? '16px 0' : '20px 0',
                    borderBottom: '1px solid rgba(255,255,255,0.05)',
                  }}
                >
                  <div style={{ fontSize: isMobile ? 20 : 28, opacity: 0.8 }}>
                    {activity.type === 'tip_sent' ? '💸' :
                     activity.type === 'tip_received' ? '💰' :
                     activity.type === 'purchase' ? '🎁' :
                     activity.type === 'reward_claimed' ? '🎉' : '📝'}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: isMobile ? 14 : 16, fontWeight: 600, marginBottom: 4 }}>
                      {activity.type === 'tip_sent' ? 'Tip送信' :
                       activity.type === 'tip_received' ? 'Tip受取' :
                       activity.type === 'purchase' ? '特典受取' :
                       activity.type === 'reward_claimed' ? 'Reward受取' : activity.type}
                    </div>
                    <div style={{ fontSize: isMobile ? 12 : 13, opacity: 0.5 }}>
                      {formatRelativeTime(activity.timestamp)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// タンクビジュアル（主役）
function TankVisual({ label, value, count, percentage, color, isMobile }: {
  label: string;
  value: string;
  count: number;
  percentage: number;
  color: string;
  isMobile: boolean;
}) {
  return (
    <div style={{
      position: 'relative',
      height: isMobile ? 360 : 520,
    }}>
      {/* CSSアニメーション定義 */}
      <style>{`
        @keyframes liquidWave {
          0%, 100% {
            transform: translateX(-50%) translateY(0px);
            border-radius: 45%;
          }
          50% {
            transform: translateX(-50%) translateY(-8px);
            border-radius: 48%;
          }
        }
        @keyframes bubbleRise {
          0% {
            bottom: 0;
            opacity: 0.6;
            transform: translateX(0);
          }
          50% {
            opacity: 0.8;
            transform: translateX(10px);
          }
          100% {
            bottom: 100%;
            opacity: 0;
            transform: translateX(0);
          }
        }
        @keyframes shimmer {
          0% {
            transform: translateX(-100%) translateY(0) rotate(10deg);
            opacity: 0;
          }
          50% {
            opacity: 0.4;
          }
          100% {
            transform: translateX(200%) translateY(20px) rotate(10deg);
            opacity: 0;
          }
        }
        @keyframes glowPulse {
          0%, 100% {
            filter: drop-shadow(0 0 20px ${color}66) drop-shadow(0 0 40px ${color}33);
          }
          50% {
            filter: drop-shadow(0 0 30px ${color}99) drop-shadow(0 0 60px ${color}66);
          }
        }
      `}</style>

      {/* ラベル */}
      <div style={{
        fontSize: isMobile ? 12 : 14,
        fontWeight: 600,
        opacity: 0.5,
        marginBottom: isMobile ? 16 : 24,
        textTransform: 'uppercase',
        letterSpacing: '0.1em',
      }}>
        {label}
      </div>

      {/* タンク本体 - 円筒形デザイン */}
      <div style={{
        position: 'relative',
        height: isMobile ? 280 : 400,
        perspective: 1000,
      }}>
        {/* タンクコンテナ（ガラス瓶のような形状） */}
        <div style={{
          position: 'relative',
          height: '100%',
          background: 'linear-gradient(180deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.01) 100%)',
          border: '2px solid rgba(255,255,255,0.12)',
          borderRadius: '50% 50% 40% 40% / 10% 10% 40% 40%',
          overflow: 'hidden',
          boxShadow: 'inset 0 0 60px rgba(0,0,0,0.4), 0 10px 40px rgba(0,0,0,0.5)',
        }}>
          {/* タンク上部の楕円（蓋） */}
          <div style={{
            position: 'absolute',
            top: 0,
            left: '10%',
            right: '10%',
            height: 40,
            background: 'linear-gradient(180deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.02) 100%)',
            borderRadius: '50%',
            border: '1px solid rgba(255,255,255,0.15)',
            zIndex: 2,
          }} />

          {/* 液体コンテナ */}
          <div style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: `${percentage}%`,
            transition: 'height 2.5s cubic-bezier(0.4, 0, 0.2, 1)',
            animation: 'glowPulse 3s ease-in-out infinite',
          }}>
            {/* 液体本体 */}
            <div style={{
              position: 'absolute',
              inset: 0,
              background: `linear-gradient(to top, ${color} 0%, ${color}dd 50%, ${color}aa 100%)`,
              overflow: 'hidden',
            }}>
              {/* 波打つ液体表面 */}
              <div style={{
                position: 'absolute',
                top: -20,
                left: '50%',
                width: '200%',
                height: 40,
                background: `radial-gradient(ellipse at center, ${color} 0%, ${color}ee 50%, transparent 70%)`,
                animation: 'liquidWave 3s ease-in-out infinite',
              }} />
              <div style={{
                position: 'absolute',
                top: -15,
                left: '50%',
                width: '200%',
                height: 40,
                background: `radial-gradient(ellipse at center, ${color}aa 0%, ${color}66 50%, transparent 70%)`,
                animation: 'liquidWave 3.5s ease-in-out infinite reverse',
              }} />

              {/* バブル1 */}
              <div style={{
                position: 'absolute',
                left: '20%',
                width: 8,
                height: 8,
                background: 'rgba(255,255,255,0.4)',
                borderRadius: '50%',
                animation: 'bubbleRise 4s ease-in-out infinite',
                animationDelay: '0s',
              }} />

              {/* バブル2 */}
              <div style={{
                position: 'absolute',
                left: '40%',
                width: 6,
                height: 6,
                background: 'rgba(255,255,255,0.4)',
                borderRadius: '50%',
                animation: 'bubbleRise 5s ease-in-out infinite',
                animationDelay: '1s',
              }} />

              {/* バブル3 */}
              <div style={{
                position: 'absolute',
                left: '65%',
                width: 10,
                height: 10,
                background: 'rgba(255,255,255,0.3)',
                borderRadius: '50%',
                animation: 'bubbleRise 6s ease-in-out infinite',
                animationDelay: '2s',
              }} />

              {/* バブル4 */}
              <div style={{
                position: 'absolute',
                left: '80%',
                width: 7,
                height: 7,
                background: 'rgba(255,255,255,0.4)',
                borderRadius: '50%',
                animation: 'bubbleRise 4.5s ease-in-out infinite',
                animationDelay: '0.5s',
              }} />

              {/* 光の反射（動く） */}
              <div style={{
                position: 'absolute',
                top: 0,
                left: '-50%',
                width: '60%',
                height: '100%',
                background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent)',
                transform: 'skewX(-20deg)',
                animation: 'shimmer 5s ease-in-out infinite',
              }} />
            </div>
          </div>

          {/* 数値（中央） */}
          <div style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 3,
          }}>
            <div style={{
              fontSize: isMobile ? 48 : 72,
              fontWeight: 900,
              letterSpacing: '-0.02em',
              marginBottom: isMobile ? 4 : 8,
              textShadow: '0 4px 20px rgba(0,0,0,0.8), 0 0 40px rgba(0,0,0,0.6)',
              background: 'linear-gradient(180deg, #ffffff 0%, #ffffffdd 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}>
              {value}
            </div>
            <div style={{
              fontSize: isMobile ? 14 : 20,
              opacity: 0.8,
              fontWeight: 600,
              textShadow: '0 2px 8px rgba(0,0,0,0.5)',
            }}>
              JPYC
            </div>
          </div>

          {/* ガラス反射エフェクト（前面） */}
          <div style={{
            position: 'absolute',
            top: '15%',
            left: '8%',
            width: '30%',
            height: '40%',
            background: 'linear-gradient(135deg, rgba(255,255,255,0.15) 0%, transparent 60%)',
            borderRadius: '50%',
            pointerEvents: 'none',
            zIndex: 4,
          }} />
        </div>
      </div>

      {/* メタ情報 */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: isMobile ? 12 : 20,
        fontSize: isMobile ? 12 : 14,
      }}>
        <span style={{ opacity: 0.5 }}>{count} 回</span>
        <span style={{
          fontWeight: 700,
          color,
          textShadow: `0 0 10px ${color}66`,
        }}>
          {percentage.toFixed(0)}%
        </span>
      </div>
    </div>
  );
}

// 統計アイテム
function StatItem({ icon, label, value, isMobile }: {
  icon: string;
  label: string;
  value: number;
  isMobile: boolean;
}) {
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{
        fontSize: isMobile ? 24 : 32,
        marginBottom: isMobile ? 8 : 12,
      }}>
        {icon}
      </div>
      <div style={{
        fontSize: isMobile ? 28 : 48,
        fontWeight: 900,
        marginBottom: isMobile ? 4 : 8,
        letterSpacing: '-0.02em',
      }}>
        {value}
      </div>
      <div style={{
        fontSize: isMobile ? 11 : 14,
        opacity: 0.5,
      }}>
        {label}
      </div>
    </div>
  );
}
