// src/pages/UserProfile.tsx
// ユーザープロフィールページ

import { useUserProfile } from '../hooks/useUserProfile';
import { getRankColor, getRankBadge, shortenAddress, formatTokenAmount, formatRelativeTime, generateTwitterShareText } from '../utils/userProfile';

export function UserProfilePage({ address: propsAddress }: { address?: string } = {}) {
  // URLからアドレスを取得（props優先）
  const pathParts = window.location.pathname.split('/');
  const addressFromUrl = pathParts[pathParts.indexOf('user') + 1];
  const targetAddress = propsAddress || addressFromUrl;

  const { profile, activities, isLoading, isError } = useUserProfile(targetAddress);

  if (isLoading) {
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

  if (isError || !profile) {
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

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      padding: '40px 20px',
    }}>
      <div style={{
        maxWidth: 1200,
        margin: '0 auto',
      }}>
        {/* ヘッダー */}
        <div style={{
          background: 'rgba(255,255,255,0.1)',
          backdropFilter: 'blur(10px)',
          borderRadius: 16,
          padding: 32,
          marginBottom: 24,
          border: '1px solid rgba(255,255,255,0.2)',
          color: '#fff',
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 24,
            flexWrap: 'wrap',
          }}>
            {/* プロフィール画像エリア（将来的にENS Avatarなど） */}
            <div style={{
              width: 120,
              height: 120,
              borderRadius: '50%',
              background: `linear-gradient(135deg, ${rankColor}, ${rankColor}99)`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 48,
              border: '4px solid rgba(255,255,255,0.3)',
            }}>
              {rankBadge}
            </div>

            {/* ユーザー情報 */}
            <div style={{ flex: 1, minWidth: 300 }}>
              {/* ENS名（将来対応） */}
              {profile.ensName && (
                <h1 style={{ margin: '0 0 8px 0', fontSize: 32, fontWeight: 800 }}>
                  {profile.ensName}
                </h1>
              )}

              {/* アドレス */}
              <div style={{
                fontSize: 18,
                fontFamily: 'monospace',
                marginBottom: 16,
                opacity: profile.ensName ? 0.7 : 1,
              }}>
                {shortenAddress(profile.address, 8)}
              </div>

              {/* ランク情報 */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                marginBottom: 12,
              }}>
                <div style={{
                  padding: '8px 16px',
                  background: rankColor,
                  borderRadius: 20,
                  fontSize: 14,
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}>
                  {rankBadge} {profile.rank.name}
                </div>
                <div style={{ fontSize: 14, opacity: 0.8 }}>
                  Level {profile.rank.level}
                </div>
              </div>

              {/* 貢献度ポイント */}
              <div style={{ fontSize: 16, marginBottom: 8 }}>
                💎 貢献度: <span style={{ fontWeight: 700, fontSize: 20 }}>{profile.rank.points.toLocaleString()}</span> pt
              </div>

              {/* 次のランクまで */}
              {profile.rank.nextRank && profile.rank.pointsToNext !== undefined && (
                <div style={{ fontSize: 14, opacity: 0.9 }}>
                  次のランク（{profile.rank.nextRank}）まで: <span style={{ fontWeight: 600 }}>{profile.rank.pointsToNext.toLocaleString()}</span> pt
                </div>
              )}
            </div>

            {/* アクションボタン */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
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
                  padding: '12px 24px',
                  background: '#1DA1F2',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 8,
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                🐦 Twitterでシェア
              </button>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(window.location.href);
                  alert('URLをコピーしました！');
                }}
                style={{
                  padding: '12px 24px',
                  background: 'rgba(255,255,255,0.2)',
                  color: '#fff',
                  border: '1px solid rgba(255,255,255,0.3)',
                  borderRadius: 8,
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                🔗 URLをコピー
              </button>
            </div>
          </div>
        </div>

        {/* 統計カード */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
          gap: 16,
          marginBottom: 24,
        }}>
          <div style={{
            background: 'rgba(255,255,255,0.1)',
            backdropFilter: 'blur(10px)',
            borderRadius: 12,
            padding: 20,
            border: '1px solid rgba(255,255,255,0.2)',
            color: '#fff',
          }}>
            <div style={{ fontSize: 14, opacity: 0.8, marginBottom: 8 }}>💸 Tip送信</div>
            <div style={{ fontSize: 28, fontWeight: 800 }}>{formatTokenAmount(profile.stats.totalTipsSent, 18, 0)} JPYC</div>
            <div style={{ fontSize: 12, opacity: 0.7, marginTop: 4 }}>{profile.stats.tipSentCount}回</div>
          </div>

          <div style={{
            background: 'rgba(255,255,255,0.1)',
            backdropFilter: 'blur(10px)',
            borderRadius: 12,
            padding: 20,
            border: '1px solid rgba(255,255,255,0.2)',
            color: '#fff',
          }}>
            <div style={{ fontSize: 14, opacity: 0.8, marginBottom: 8 }}>💰 Tip受取</div>
            <div style={{ fontSize: 28, fontWeight: 800 }}>{formatTokenAmount(profile.stats.totalTipsReceived, 18, 0)} JPYC</div>
            <div style={{ fontSize: 12, opacity: 0.7, marginTop: 4 }}>{profile.stats.tipReceivedCount}回</div>
          </div>

          <div style={{
            background: 'rgba(255,255,255,0.1)',
            backdropFilter: 'blur(10px)',
            borderRadius: 12,
            padding: 20,
            border: '1px solid rgba(255,255,255,0.2)',
            color: '#fff',
          }}>
            <div style={{ fontSize: 14, opacity: 0.8, marginBottom: 8 }}>🎁 特典受取</div>
            <div style={{ fontSize: 28, fontWeight: 800 }}>{profile.stats.purchaseCount}回</div>
          </div>

          <div style={{
            background: 'rgba(255,255,255,0.1)',
            backdropFilter: 'blur(10px)',
            borderRadius: 12,
            padding: 20,
            border: '1px solid rgba(255,255,255,0.2)',
            color: '#fff',
          }}>
            <div style={{ fontSize: 14, opacity: 0.8, marginBottom: 8 }}>🎉 Reward受取</div>
            <div style={{ fontSize: 28, fontWeight: 800 }}>{profile.stats.rewardClaimedCount}回</div>
          </div>
        </div>

        {/* SBTギャラリー */}
        {profile.sbts.length > 0 && (
          <div style={{
            background: 'rgba(255,255,255,0.1)',
            backdropFilter: 'blur(10px)',
            borderRadius: 16,
            padding: 24,
            marginBottom: 24,
            border: '1px solid rgba(255,255,255,0.2)',
            color: '#fff',
          }}>
            <h2 style={{ margin: '0 0 16px 0', fontSize: 20, fontWeight: 700 }}>🖼️ Soulbound Tokens</h2>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
              gap: 16,
            }}>
              {profile.sbts.map((sbt, idx) => (
                <div
                  key={idx}
                  style={{
                    background: 'rgba(255,255,255,0.1)',
                    borderRadius: 12,
                    padding: 16,
                    textAlign: 'center',
                    border: '1px solid rgba(255,255,255,0.2)',
                  }}
                >
                  <div style={{ fontSize: 48, marginBottom: 8 }}>{rankBadge}</div>
                  <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>
                    {sbt.metadata?.name || `SBT #${sbt.tokenId.toString()}`}
                  </div>
                  {sbt.mintedAt && (
                    <div style={{ fontSize: 11, opacity: 0.7 }}>
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
          background: 'rgba(255,255,255,0.1)',
          backdropFilter: 'blur(10px)',
          borderRadius: 16,
          padding: 24,
          border: '1px solid rgba(255,255,255,0.2)',
          color: '#fff',
        }}>
          <h2 style={{ margin: '0 0 16px 0', fontSize: 20, fontWeight: 700 }}>📝 最近のアクティビティ</h2>
          {activities.length === 0 ? (
            <div style={{
              padding: 40,
              textAlign: 'center',
              opacity: 0.7,
            }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>📭</div>
              <div style={{ fontSize: 14 }}>まだアクティビティがありません</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {activities.slice(0, 10).map((activity) => (
                <div
                  key={activity.id}
                  style={{
                    background: 'rgba(255,255,255,0.05)',
                    padding: 16,
                    borderRadius: 8,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                  }}
                >
                  <div style={{ fontSize: 24 }}>
                    {activity.type === 'tip_sent' ? '💸' :
                     activity.type === 'tip_received' ? '💰' :
                     activity.type === 'purchase' ? '🎁' :
                     activity.type === 'reward_claimed' ? '🎉' :
                     activity.type === 'rank_up' ? '⬆️' :
                     activity.type === 'sbt_minted' ? '🖼️' : '📝'}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>
                      {activity.type === 'tip_sent' ? 'Tip送信' :
                       activity.type === 'tip_received' ? 'Tip受取' :
                       activity.type === 'purchase' ? '特典受取' :
                       activity.type === 'reward_claimed' ? 'Reward受取' :
                       activity.type === 'rank_up' ? 'ランクアップ' :
                       activity.type === 'sbt_minted' ? 'SBT取得' : activity.type}
                    </div>
                    <div style={{ fontSize: 12, opacity: 0.7 }}>
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
                        fontSize: 12,
                        textDecoration: 'none',
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
    </div>
  );
}
