/**
 * @file スコアプロフィールページ
 * @description ユーザーの二軸スコアプロフィールを表示
 */

import React, { useState, useMemo } from 'react';
import { useAddress } from '@thirdweb-dev/react';
import DualAxisTank from '../components/score/DualAxisTank';
import RankingPanel from '../components/score/RankingPanel';
import TenantScoreCard from '../components/score/TenantScoreCard';
import BadgeSystem from '../components/score/BadgeSystem';
import GiftyAssistant from '../components/score/GiftyAssistant';
import {
  useUserScore,
  useUserRank,
  useAllRankings,
  useTenantScores,
  useAchievements,
} from '../hooks/useScoreApi';

// ========================================
// メインページコンポーネント
// ========================================

export default function ScoreProfilePage({ userId: propsUserId }: { userId?: string } = {}) {
  const connectedAddress = useAddress();
  const [selectedTab, setSelectedTab] = useState<'overview' | 'rankings' | 'tenants'>('overview');

  // URLパラメータまたは接続アドレスからユーザーIDを取得（props優先）
  const userIdFromQuery = useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('userId') || undefined;
  }, []);
  const userId = propsUserId || userIdFromQuery || connectedAddress;
  const isOwnProfile = !userIdFromQuery || userIdFromQuery === connectedAddress;

  // データ取得
  const { data: userScore, loading: scoreLoading, error: scoreError } = useUserScore(userId);
  const { data: userRank, loading: rankLoading } = useUserRank(userId);
  const {
    data: allRankings,
    loading: rankingsLoading,
    refetch: refetchRankings,
  } = useAllRankings(100);
  const { data: tenantScores, toggleFavorite } = useTenantScores(userId);
  const { data: achievements } = useAchievements(userId);

  // ローディング状態
  if (scoreLoading || rankLoading) {
    return (
      <div className="page-container">
        <style jsx>{`
          .page-container {
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          }

          .loading {
            text-align: center;
            color: white;
          }

          .loading-emoji {
            font-size: 64px;
            animation: spin 2s linear infinite;
          }

          @keyframes spin {
            0% {
              transform: rotate(0deg);
            }
            100% {
              transform: rotate(360deg);
            }
          }

          .loading-text {
            margin-top: 16px;
            font-size: 18px;
            font-weight: 600;
          }
        `}</style>

        <div className="loading">
          <div className="loading-emoji">⏳</div>
          <div className="loading-text">Loading Score Data...</div>
        </div>
      </div>
    );
  }

  // エラー状態
  if (scoreError || !userScore) {
    return (
      <div className="page-container">
        <style jsx>{`
          .page-container {
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            padding: 20px;
          }

          .error {
            text-align: center;
            color: white;
            max-width: 500px;
          }

          .error-emoji {
            font-size: 64px;
          }

          .error-title {
            margin-top: 16px;
            font-size: 24px;
            font-weight: bold;
          }

          .error-message {
            margin-top: 8px;
            font-size: 16px;
            opacity: 0.9;
          }

          .error-button {
            margin-top: 24px;
            padding: 12px 24px;
            background: white;
            color: #667eea;
            border: none;
            border-radius: 12px;
            font-size: 16px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s ease;
          }

          .error-button:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
          }
        `}</style>

        <div className="error">
          <div className="error-emoji">😢</div>
          <div className="error-title">スコアデータが見つかりません</div>
          <div className="error-message">
            {scoreError?.message || 'このユーザーのスコアデータはまだ作成されていません'}
          </div>
          <button className="error-button" onClick={() => window.location.href = '/'}>
            ホームに戻る
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <style jsx>{`
        .page-container {
          min-height: 100vh;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          padding: 20px;
        }

        .content-wrapper {
          max-width: 1200px;
          margin: 0 auto;
        }

        /* ヘッダー */
        .page-header {
          background: rgba(255, 255, 255, 0.95);
          border-radius: 20px;
          padding: 24px;
          margin-bottom: 20px;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
          backdrop-filter: blur(10px);
        }

        .header-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 16px;
        }

        .header-title {
          font-size: 28px;
          font-weight: bold;
          color: #2d3748;
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .header-emoji {
          font-size: 36px;
        }

        .rank-badges {
          display: flex;
          gap: 12px;
        }

        .rank-badge {
          padding: 8px 16px;
          background: linear-gradient(135deg, #667eea, #764ba2);
          color: white;
          border-radius: 12px;
          font-size: 14px;
          font-weight: bold;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 2px;
        }

        .rank-badge-value {
          font-size: 18px;
        }

        .rank-badge-label {
          font-size: 10px;
          opacity: 0.9;
        }

        .user-address {
          font-size: 14px;
          color: #718096;
          font-family: monospace;
        }

        /* タブナビゲーション */
        .tab-nav {
          display: flex;
          gap: 8px;
          margin-bottom: 20px;
        }

        .tab-button {
          flex: 1;
          padding: 16px;
          background: rgba(255, 255, 255, 0.9);
          border: none;
          border-radius: 16px;
          font-size: 16px;
          font-weight: 600;
          color: #667eea;
          cursor: pointer;
          transition: all 0.2s ease;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        }

        .tab-button:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 16px rgba(0, 0, 0, 0.15);
        }

        .tab-button.active {
          background: white;
          color: #667eea;
          box-shadow: 0 8px 20px rgba(0, 0, 0, 0.2);
        }

        /* コンテンツグリッド */
        .content-grid {
          display: grid;
          gap: 20px;
        }

        .overview-grid {
          grid-template-columns: 1fr;
        }

        .tenants-grid {
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
        }

        /* モバイル対応 */
        @media (max-width: 768px) {
          .page-container {
            padding: 12px;
          }

          .page-header {
            padding: 16px;
          }

          .header-title {
            font-size: 22px;
          }

          .rank-badges {
            flex-direction: column;
            gap: 8px;
          }

          .tab-nav {
            flex-direction: column;
          }

          .tenants-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>

      <div className="content-wrapper">
        {/* ページヘッダー */}
        <div className="page-header">
          <div className="header-top">
            <div className="header-title">
              <span className="header-emoji">👤</span>
              <span>{isOwnProfile ? 'My Score Profile' : 'User Profile'}</span>
            </div>

            {userRank && (
              <div className="rank-badges">
                {userRank.ranks.composite && (
                  <div className="rank-badge">
                    <div className="rank-badge-value">#{userRank.ranks.composite}</div>
                    <div className="rank-badge-label">Total Rank</div>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="user-address">
            {userId?.slice(0, 6)}...{userId?.slice(-4)}
          </div>
        </div>

        {/* タブナビゲーション */}
        <div className="tab-nav">
          <button
            className={`tab-button ${selectedTab === 'overview' ? 'active' : ''}`}
            onClick={() => setSelectedTab('overview')}
          >
            📊 Overview
          </button>
          <button
            className={`tab-button ${selectedTab === 'rankings' ? 'active' : ''}`}
            onClick={() => setSelectedTab('rankings')}
          >
            🏆 Rankings
          </button>
          <button
            className={`tab-button ${selectedTab === 'tenants' ? 'active' : ''}`}
            onClick={() => setSelectedTab('tenants')}
          >
            💝 My Support
          </button>
        </div>

        {/* コンテンツエリア */}
        <div className="content-grid">
          {/* Overview タブ */}
          {selectedTab === 'overview' && (
            <div className="overview-grid">
              {/* 二軸タンク */}
              <DualAxisTank
                economicScore={userScore.economic.score}
                economicLevel={userScore.economic.level}
                economicDisplayLevel={userScore.economic.displayLevel}
                resonanceScore={userScore.resonance.score}
                resonanceLevel={userScore.resonance.level}
                resonanceDisplayLevel={userScore.resonance.displayLevel}
                resonanceStreak={userScore.resonance.streak}
                showDetails={true}
                size="large"
              />

              {/* バッジシステム */}
              <BadgeSystem
                economicLevel={userScore.economic.level}
                resonanceLevel={userScore.resonance.level}
                economicScore={userScore.economic.score}
                resonanceScore={userScore.resonance.score}
                streak={userScore.resonance.streak}
                longestStreak={userScore.resonance.longestStreak}
                totalTips={userScore.resonance.actions.tips}
                achievements={achievements}
              />
            </div>
          )}

          {/* Rankings タブ */}
          {selectedTab === 'rankings' && allRankings && (
            <RankingPanel
              economicRankings={allRankings.economic}
              resonanceRankings={allRankings.resonance}
              compositeRankings={allRankings.composite}
              currentUserAddress={userId}
              onUserClick={(clickedUserId) => {
                if (clickedUserId !== userId) {
                  window.location.href = `/score-profile?userId=${clickedUserId}`;
                }
              }}
            />
          )}

          {/* My Support タブ */}
          {selectedTab === 'tenants' && (
            <div className="tenants-grid">
              {tenantScores.length === 0 ? (
                <div
                  style={{
                    padding: '48px',
                    textAlign: 'center',
                    background: 'white',
                    borderRadius: '16px',
                    color: '#718096',
                  }}
                >
                  <div style={{ fontSize: '64px', marginBottom: '16px' }}>💝</div>
                  <div style={{ fontSize: '18px', fontWeight: 600 }}>
                    まだ応援しているテナントがありません
                  </div>
                  <div style={{ fontSize: '14px', marginTop: '8px' }}>
                    TIPをすると、ここに応援先が表示されます
                  </div>
                </div>
              ) : (
                tenantScores.map((tenant) => (
                  <TenantScoreCard
                    key={tenant.tenantId}
                    tenant={tenant}
                    onTenantClick={(tenantId) => {
                      window.location.href = `/tenant/${tenantId}`;
                    }}
                    onFavoriteToggle={toggleFavorite}
                    size="medium"
                  />
                ))
              )}
            </div>
          )}
        </div>

        {/* Giftyアシスタント（自分のプロフィールの場合のみ表示） */}
        {isOwnProfile && userScore && (
          <GiftyAssistant
            userScore={userScore}
            onSuggestionClick={(suggestion) => {
              console.log('Suggestion clicked:', suggestion);
              // TODO: 提案に応じたアクションを実装
            }}
          />
        )}
      </div>
    </div>
  );
}
