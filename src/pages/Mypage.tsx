// src/pages/Mypage.tsx
// GIFTERRAマイページ - 送受信ツール（Flowモード）+ テナント運用（Tenantモード）

import { useState, useEffect } from 'react';

type ViewMode = 'flow' | 'tenant';

export function MypagePage() {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [viewMode, setViewMode] = useState<ViewMode>('flow');

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // URLパラメータから view を取得
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const view = params.get('view');
    if (view === 'tenant') {
      // TODO: R3（承認済み）チェック
      setViewMode('tenant');
    }
  }, []);

  return (
    <div style={{
      minHeight: '100vh',
      background: '#0a0a0f',
      color: '#EAF2FF',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* CSSアニメーション定義 */}
      <style>{`
        @keyframes liquidWave {
          0%, 100% {
            transform: translateX(-50%) translateY(0px);
            border-radius: 45%;
          }
          50% {
            transform: translateX(-50%) translateY(-1.5px);
            border-radius: 46%;
          }
        }
        @keyframes breatheGlow {
          0%, 100% {
            opacity: 0.00;
          }
          50% {
            opacity: 0.06;
          }
        }
        @keyframes subtleBubbleRise {
          0% {
            bottom: 0;
            opacity: 0;
            transform: translateX(0);
          }
          10% {
            opacity: 0.2;
          }
          90% {
            opacity: 0.2;
          }
          100% {
            bottom: 100%;
            opacity: 0;
            transform: translateX(8px);
          }
        }

        @media (prefers-reduced-motion: reduce) {
          * {
            animation-duration: 0.01ms !important;
            animation-iteration-count: 1 !important;
            transition-duration: 0.01ms !important;
          }
        }
      `}</style>

      {/* 前景オーバーレイ */}
      <div style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(12, 16, 28, 0.44)',
        pointerEvents: 'none',
        zIndex: 0,
      }} />

      {/* グリッド背景 */}
      <div style={{
        position: 'fixed',
        inset: 0,
        backgroundImage: 'linear-gradient(rgba(234, 242, 255, 0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(234, 242, 255, 0.02) 1px, transparent 1px)',
        backgroundSize: '50px 50px',
        opacity: 0.5,
        pointerEvents: 'none',
        zIndex: 0,
      }} />

      {/* メインコンテンツ */}
      <div style={{
        position: 'relative',
        zIndex: 1,
        maxWidth: isMobile ? '100%' : 1400,
        margin: '0 auto',
        padding: isMobile ? '16px' : '40px',
      }}>
        {/* [A] ヘッダー */}
        <Header
          viewMode={viewMode}
          setViewMode={setViewMode}
          isMobile={isMobile}
        />

        {/* [B] ヒーロー：浮遊エネルギータンク */}
        <EnergyTank
          variant={viewMode}
          isMobile={isMobile}
        />

        {/* [C] カード列 */}
        {viewMode === 'flow' ? (
          <FlowModeCards isMobile={isMobile} />
        ) : (
          <TenantModeCards isMobile={isMobile} />
        )}

        {/* [D] フッター */}
        <Footer isMobile={isMobile} />
      </div>
    </div>
  );
}

// ========================================
// [A] ヘッダー
// ========================================
function Header({ viewMode, setViewMode, isMobile }: {
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
  isMobile: boolean;
}) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: isMobile ? 24 : 40,
      padding: isMobile ? '12px 0' : '16px 0',
    }}>
      {/* 左：ミニロゴ */}
      <div style={{
        fontSize: isMobile ? 18 : 24,
        fontWeight: 900,
        opacity: 0.9,
      }}>
        GIFTERRA
      </div>

      {/* 中央：ロール切替 */}
      <div style={{
        display: 'flex',
        gap: 8,
        background: 'rgba(255,255,255,0.05)',
        borderRadius: 999,
        padding: 4,
      }}>
        <button
          onClick={() => setViewMode('flow')}
          style={{
            padding: isMobile ? '6px 16px' : '8px 20px',
            background: viewMode === 'flow' ? 'rgba(102, 126, 234, 0.3)' : 'transparent',
            border: 'none',
            borderRadius: 999,
            color: '#EAF2FF',
            fontSize: isMobile ? 12 : 14,
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.2s',
          }}
        >
          個人
        </button>
        <button
          onClick={() => setViewMode('tenant')}
          style={{
            padding: isMobile ? '6px 16px' : '8px 20px',
            background: viewMode === 'tenant' ? 'rgba(118, 75, 162, 0.3)' : 'transparent',
            border: 'none',
            borderRadius: 999,
            color: '#EAF2FF',
            fontSize: isMobile ? 12 : 14,
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.2s',
          }}
        >
          テナント
        </button>
      </div>

      {/* 右：設定・シェア・Admin */}
      <div style={{ display: 'flex', gap: isMobile ? 8 : 12, alignItems: 'center' }}>
        {viewMode === 'tenant' && (
          <button style={{
            padding: isMobile ? '6px 12px' : '8px 16px',
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 8,
            color: '#EAF2FF',
            fontSize: isMobile ? 11 : 13,
            fontWeight: 600,
            cursor: 'pointer',
          }}>
            Adminで開く
          </button>
        )}
        <button style={{
          width: isMobile ? 32 : 36,
          height: isMobile ? 32 : 36,
          background: 'rgba(255,255,255,0.05)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 8,
          color: '#EAF2FF',
          fontSize: isMobile ? 16 : 18,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          ⚙️
        </button>
      </div>
    </div>
  );
}

// ========================================
// [B] 浮遊エネルギータンク
// ========================================
function EnergyTank({ variant, isMobile }: {
  variant: ViewMode;
  isMobile: boolean;
}) {
  const color = variant === 'flow' ? '#667eea' : '#764ba2';
  const percentage = 65; // TODO: 実データ

  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      marginBottom: isMobile ? 40 : 60,
    }}>
      <div style={{
        position: 'relative',
        width: isMobile ? '100%' : 400,
        height: isMobile ? 320 : 420,
      }}>
        {/* タンク本体 */}
        <div style={{
          position: 'relative',
          height: '100%',
          background: 'linear-gradient(180deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.01) 100%)',
          border: '2px solid rgba(255,255,255,0.12)',
          borderRadius: '50% 50% 40% 40% / 10% 10% 40% 40%',
          overflow: 'hidden',
          boxShadow: 'inset 0 0 60px rgba(0,0,0,0.4), 0 10px 40px rgba(0,0,0,0.5)',
        }}>
          {/* 液体 */}
          <div style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: `${percentage}%`,
            transition: 'height 2.5s cubic-bezier(0.4, 0, 0.2, 1)',
          }}>
            <div style={{
              position: 'absolute',
              inset: 0,
              background: `linear-gradient(to top, ${color} 0%, ${color}dd 50%, ${color}aa 100%)`,
              overflow: 'hidden',
            }}>
              {/* 2層波 */}
              <div style={{
                position: 'absolute',
                top: -20,
                left: '50%',
                width: '200%',
                height: 40,
                background: `radial-gradient(ellipse at center, ${color} 0%, ${color}ee 50%, transparent 70%)`,
                animation: 'liquidWave 10s ease-in-out infinite',
              }} />
              <div style={{
                position: 'absolute',
                top: -15,
                left: '50%',
                width: '200%',
                height: 40,
                background: `radial-gradient(ellipse at center, ${color}aa 0%, ${color}66 50%, transparent 70%)`,
                animation: 'liquidWave 12s ease-in-out infinite reverse',
              }} />

              {/* 微細なバブル */}
              <div style={{
                position: 'absolute',
                left: '35%',
                width: 5,
                height: 5,
                background: 'rgba(255,255,255,0.2)',
                borderRadius: '50%',
                animation: 'subtleBubbleRise 14s ease-in-out infinite',
                animationDelay: '0s',
              }} />
              <div style={{
                position: 'absolute',
                left: '65%',
                width: 4,
                height: 4,
                background: 'rgba(255,255,255,0.15)',
                borderRadius: '50%',
                animation: 'subtleBubbleRise 16s ease-in-out infinite',
                animationDelay: '7s',
              }} />

              {/* 呼吸発光 */}
              <div style={{
                position: 'absolute',
                inset: 0,
                background: `radial-gradient(ellipse at center, ${color}ff 0%, transparent 70%)`,
                animation: 'breatheGlow 12s ease-in-out infinite',
                pointerEvents: 'none',
              }} />
            </div>
          </div>

          {/* 中央ラベル */}
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
              fontSize: isMobile ? 14 : 16,
              opacity: 0.6,
              marginBottom: 8,
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
            }}>
              {variant === 'flow' ? '送受信エネルギー' : '受取エネルギー'}
            </div>
            <div style={{
              fontSize: isMobile ? 48 : 64,
              fontWeight: 900,
              letterSpacing: '-0.02em',
              textShadow: '0 4px 20px rgba(0,0,0,0.8)',
            }}>
              {percentage}%
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ========================================
// [C] Flowモードカード
// ========================================
function FlowModeCards({ isMobile }: { isMobile: boolean }) {
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)',
      gap: isMobile ? 16 : 24,
      marginBottom: isMobile ? 40 : 60,
    }}>
      <SendCard isMobile={isMobile} />
      <ReceiveCard isMobile={isMobile} />
      <HistoryCard isMobile={isMobile} />
      <LockCard isMobile={isMobile} />
    </div>
  );
}

function SendCard({ isMobile }: { isMobile: boolean }) {
  return (
    <div style={{
      background: 'rgba(255,255,255,0.03)',
      border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: isMobile ? 16 : 24,
      padding: isMobile ? 20 : 28,
    }}>
      <h3 style={{ margin: '0 0 20px 0', fontSize: isMobile ? 16 : 18, fontWeight: 700 }}>
        送金
      </h3>
      <p style={{ fontSize: isMobile ? 13 : 14, opacity: 0.6, margin: '0 0 16px 0' }}>
        宛先・トークン・数量を入力
      </p>
      <button style={{
        width: '100%',
        padding: isMobile ? '12px' : '14px',
        background: 'rgba(102, 126, 234, 0.2)',
        border: '1px solid rgba(102, 126, 234, 0.3)',
        borderRadius: 12,
        color: '#EAF2FF',
        fontSize: isMobile ? 14 : 15,
        fontWeight: 600,
        cursor: 'pointer',
      }}>
        利用方法を選ぶ
      </button>
    </div>
  );
}

function ReceiveCard({ isMobile }: { isMobile: boolean }) {
  return (
    <div style={{
      background: 'rgba(255,255,255,0.03)',
      border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: isMobile ? 16 : 24,
      padding: isMobile ? 20 : 28,
    }}>
      <h3 style={{ margin: '0 0 20px 0', fontSize: isMobile ? 16 : 18, fontWeight: 700 }}>
        受取アドレス
      </h3>
      <p style={{ fontSize: isMobile ? 13 : 14, opacity: 0.6, margin: '0 0 16px 0' }}>
        接続後にQR/コピー可能
      </p>
      <button style={{
        width: '100%',
        padding: isMobile ? '12px' : '14px',
        background: 'rgba(255,255,255,0.05)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: 12,
        color: '#EAF2FF',
        fontSize: isMobile ? 14 : 15,
        fontWeight: 600,
        cursor: 'pointer',
      }}>
        接続する
      </button>
    </div>
  );
}

function HistoryCard({ isMobile }: { isMobile: boolean }) {
  return (
    <div style={{
      background: 'rgba(255,255,255,0.03)',
      border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: isMobile ? 16 : 24,
      padding: isMobile ? 20 : 28,
    }}>
      <h3 style={{ margin: '0 0 20px 0', fontSize: isMobile ? 16 : 18, fontWeight: 700 }}>
        履歴
      </h3>
      <p style={{ fontSize: isMobile ? 13 : 14, opacity: 0.6, margin: '0 0 16px 0' }}>
        最近の送受信履歴
      </p>
      <div style={{ fontSize: isMobile ? 12 : 13, opacity: 0.4 }}>
        まだ履歴がありません
      </div>
    </div>
  );
}

function LockCard({ isMobile }: { isMobile: boolean }) {
  return (
    <div style={{
      background: 'rgba(255,255,255,0.02)',
      border: '1px solid rgba(255,255,255,0.06)',
      borderRadius: isMobile ? 16 : 24,
      padding: isMobile ? 20 : 28,
      opacity: 0.6,
    }}>
      <div style={{ fontSize: 32, marginBottom: 12 }}>🔒</div>
      <h3 style={{ margin: '0 0 12px 0', fontSize: isMobile ? 16 : 18, fontWeight: 700 }}>
        テナント申請で解放
      </h3>
      <p style={{ fontSize: isMobile ? 12 : 13, opacity: 0.7, margin: 0 }}>
        自動配布 / GIFT HUB / フラグNFT
      </p>
    </div>
  );
}

// ========================================
// [C] Tenantモードカード
// ========================================
function TenantModeCards({ isMobile }: { isMobile: boolean }) {
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)',
      gap: isMobile ? 16 : 24,
      marginBottom: isMobile ? 40 : 60,
    }}>
      <div style={{
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: isMobile ? 16 : 24,
        padding: isMobile ? 20 : 28,
      }}>
        <h3 style={{ margin: '0 0 12px 0', fontSize: isMobile ? 16 : 18, fontWeight: 700 }}>
          キャンペーン稼働状況
        </h3>
        <p style={{ fontSize: isMobile ? 13 : 14, opacity: 0.6 }}>
          詳細はAdminで確認
        </p>
      </div>
    </div>
  );
}

// ========================================
// [D] フッター
// ========================================
function Footer({ isMobile }: { isMobile: boolean }) {
  return (
    <div style={{
      marginTop: isMobile ? 60 : 80,
      paddingTop: isMobile ? 24 : 32,
      borderTop: '1px solid rgba(255,255,255,0.08)',
      textAlign: 'center',
    }}>
      <div style={{
        fontSize: isMobile ? 11 : 12,
        opacity: 0.5,
        marginBottom: 12,
      }}>
        これは送受信ツールです。特典の自動配布は行われません。
      </div>
      <div style={{
        fontSize: isMobile ? 11 : 12,
        opacity: 0.5,
        marginBottom: 12,
      }}>
        GIFTERRAは資産の保管・両替・投資の勧誘を行いません。
      </div>
      <div style={{
        fontSize: isMobile ? 10 : 11,
        opacity: 0.3,
      }}>
        Patent pending / 特許出願中
      </div>
    </div>
  );
}
