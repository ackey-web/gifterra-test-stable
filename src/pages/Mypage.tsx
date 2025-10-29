// src/pages/Mypage.tsx
// GIFTERRAマイページ - 送受信ツール（Flowモード）+ テナント運用（Tenantモード）

import { useState, useEffect } from 'react';
import { QRScanner } from '../components/QRScanner';

type ViewMode = 'flow' | 'tenant';

// テナントランク定義
// R0: 非テナント（一般ユーザー）
// R1: 申請中
// R2: 審査中
// R3: 承認済みテナント
type TenantRank = 'R0' | 'R1' | 'R2' | 'R3';

export function MypagePage() {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [viewMode, setViewMode] = useState<ViewMode>('flow');
  const [tenantRank, setTenantRank] = useState<TenantRank>('R0'); // TODO: 実データから取得

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
    if (view === 'tenant' && tenantRank === 'R3') {
      // R3（承認済み）のみTenantモード切り替え可能
      setViewMode('tenant');
    }
  }, [tenantRank]);

  // TODO: 実際のテナントランク取得ロジック
  useEffect(() => {
    // const fetchTenantRank = async () => {
    //   const address = await getConnectedAddress();
    //   const rank = await getTenantRankFromContract(address);
    //   setTenantRank(rank);
    // };
    // fetchTenantRank();
  }, []);

  return (
    <div style={{
      minHeight: '100vh',
      background: '#0a0a0f',
      color: '#e0e0e0',
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
            opacity: 0.35;
          }
          90% {
            opacity: 0.35;
          }
          100% {
            bottom: 100%;
            opacity: 0;
            transform: translateX(12px);
          }
        }
        @keyframes liquidShimmer {
          0%, 100% {
            transform: translateX(-10%);
            opacity: 0.3;
          }
          50% {
            transform: translateX(10%);
            opacity: 0.6;
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
        maxWidth: isMobile ? '100%' : 600,
        margin: '0 auto',
        padding: isMobile ? '16px' : '24px',
      }}>
        {/* [A] ヘッダー */}
        <Header
          viewMode={viewMode}
          setViewMode={setViewMode}
          isMobile={isMobile}
          tenantRank={tenantRank}
        />

        {/* [B] コンテンツ */}
        {viewMode === 'flow' ? (
          <FlowModeContent isMobile={isMobile} tenantRank={tenantRank} />
        ) : (
          <TenantModeContent isMobile={isMobile} />
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
function Header({ viewMode, setViewMode, isMobile, tenantRank }: {
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
  isMobile: boolean;
  tenantRank: TenantRank;
}) {
  // R3（承認済みテナント）のみトグル表示
  const showToggle = tenantRank === 'R3';

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: isMobile ? 24 : 40,
      padding: isMobile ? '12px 0' : '16px 0',
    }}>
      {/* 左：ロゴ画像 */}
      <img
        src="/GIFTERRA.sidelogo.png"
        alt="GIFTERRA"
        style={{
          height: isMobile ? 120 : 240,
          opacity: 1,
        }}
      />

      {/* 中央：ロール切替（R3のみ表示） */}
      {showToggle && (
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
      )}

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
// [B] Flowモードコンテンツ
// ========================================
function FlowModeContent({ isMobile, tenantRank }: { isMobile: boolean; tenantRank: TenantRank }) {
  // R3（承認済みテナント）の場合はLock Cardを非表示
  const showLockCard = tenantRank !== 'R3';

  return (
    <>
      {/* 1. 送金・受信（縦並び） */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: isMobile ? 16 : 20,
        marginBottom: isMobile ? 40 : 48,
      }}>
        <SendForm isMobile={isMobile} />
        <ReceiveAddress isMobile={isMobile} />
      </div>

      {/* 2. 全体kodomiタンク */}
      <OverallKodomiTank isMobile={isMobile} />

      {/* 3. 貢献先テナント別カード */}
      <ContributionTenants isMobile={isMobile} />

      {/* 4. 履歴 */}
      <HistorySection isMobile={isMobile} />

      {/* 5. ロックカード（R0/R1/R2のみ表示） */}
      {showLockCard && <LockCard isMobile={isMobile} />}
    </>
  );
}

// 送金モード定義
type SendMode = 'simple' | 'tenant' | 'bulk';

// 1. 送金フォーム
function SendForm({ isMobile }: { isMobile: boolean }) {
  const [selectedToken, setSelectedToken] = useState<'JPYC' | 'NHT'>('JPYC');
  const [sendMode, setSendMode] = useState<SendMode | null>(null); // null = 未選択
  const [showModeModal, setShowModeModal] = useState(false);
  const [showTenantModal, setShowTenantModal] = useState(false);
  const [selectedTenant, setSelectedTenant] = useState<any>(null);
  const [address, setAddress] = useState('');
  const [amount, setAmount] = useState('');
  const [message, setMessage] = useState('');
  const [showQRScanner, setShowQRScanner] = useState(false);

  const tokenInfo = {
    JPYC: {
      name: 'JPYC',
      description: 'ステーブルコイン',
      detail: '日本円と同価値、送金ツールとして利用',
      color: '#667eea',
    },
    NHT: {
      name: 'NHT',
      description: 'ユーティリティトークン',
      detail: 'GIFTERRAエコシステムで流通',
      color: '#764ba2',
    },
  };

  const currentToken = tokenInfo[selectedToken];

  // テナント選択時の処理
  const handleTenantSelect = (tenant: any) => {
    setSelectedTenant(tenant);
    setAddress(tenant.walletAddress);
    setShowTenantModal(false);
  };

  // 一括送金モードの場合は専用UIを表示
  if (sendMode === 'bulk') {
    return (
      <BulkSendForm
        isMobile={isMobile}
        selectedToken={selectedToken}
        setSelectedToken={setSelectedToken}
        onChangeMode={() => setSendMode(null)}
      />
    );
  }

  return (
    <div style={{
      background: 'linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%)',
      border: '1px solid rgba(0,0,0,0.08)',
      borderRadius: isMobile ? 16 : 24,
      padding: isMobile ? 20 : 28,
      boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
    }}>
      <h2 style={{ margin: '0 0 20px 0', fontSize: isMobile ? 18 : 22, fontWeight: 700 }}>
        送金
      </h2>

      {/* トークン選択タブ */}
      <div style={{
        display: 'flex',
        gap: 8,
        marginBottom: 16,
        background: 'linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%)',
        borderRadius: 12,
        padding: 4,
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
      }}>
        <button
          onClick={() => setSelectedToken('JPYC')}
          style={{
            flex: 1,
            padding: isMobile ? '8px 12px' : '10px 16px',
            background: selectedToken === 'JPYC' ? 'rgba(102, 126, 234, 0.3)' : '#ffffff',
            border: selectedToken === 'JPYC' ? '1px solid rgba(102, 126, 234, 0.5)' : '1px solid rgba(0,0,0,0.08)',
            borderRadius: 8,
            color: selectedToken === 'JPYC' ? '#667eea' : '#1a1a1a',
            fontSize: isMobile ? 13 : 14,
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.2s',
            boxShadow: selectedToken === 'JPYC' ? '0 2px 8px rgba(102, 126, 234, 0.2)' : '0 2px 8px rgba(0,0,0,0.1)',
          }}
        >
          JPYC
        </button>
        <button
          onClick={() => setSelectedToken('NHT')}
          style={{
            flex: 1,
            padding: isMobile ? '8px 12px' : '10px 16px',
            background: selectedToken === 'NHT' ? 'rgba(118, 75, 162, 0.3)' : '#ffffff',
            border: selectedToken === 'NHT' ? '1px solid rgba(118, 75, 162, 0.5)' : '1px solid rgba(0,0,0,0.08)',
            borderRadius: 8,
            color: selectedToken === 'NHT' ? '#764ba2' : '#1a1a1a',
            fontSize: isMobile ? 13 : 14,
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.2s',
            boxShadow: selectedToken === 'NHT' ? '0 2px 8px rgba(118, 75, 162, 0.2)' : '0 2px 8px rgba(0,0,0,0.1)',
          }}
        >
          NHT
        </button>
      </div>

      {/* トークン説明 */}
      <div style={{
        marginBottom: 20,
        padding: isMobile ? '12px' : '14px',
        background: `${currentToken.color}11`,
        border: `1px solid ${currentToken.color}33`,
        borderRadius: 8,
      }}>
        <div style={{
          fontSize: isMobile ? 12 : 13,
          fontWeight: 600,
          marginBottom: 4,
          color: currentToken.color,
        }}>
          {currentToken.description}
        </div>
        <div style={{
          fontSize: isMobile ? 11 : 12,
          opacity: 0.7,
        }}>
          {currentToken.detail}
        </div>
      </div>

      {/* 送金モード表示 */}
      {sendMode && (
        <div style={{
          marginBottom: 16,
          padding: isMobile ? '10px 12px' : '12px 16px',
          background: sendMode === 'tenant' ? 'rgba(118, 75, 162, 0.15)' : 'rgba(102, 126, 234, 0.15)',
          border: sendMode === 'tenant' ? '1px solid rgba(118, 75, 162, 0.3)' : '1px solid rgba(102, 126, 234, 0.3)',
          borderRadius: 8,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <div>
            <div style={{ fontSize: isMobile ? 12 : 13, fontWeight: 600, marginBottom: 4 }}>
              {sendMode === 'simple' && '💸 シンプル送金'}
              {sendMode === 'tenant' && '🎁 テナントへチップ'}
              {sendMode === 'bulk' && '📤 一括送金'}
            </div>
            {sendMode === 'tenant' && selectedTenant && (
              <div style={{ fontSize: isMobile ? 11 : 12, opacity: 0.7 }}>
                {selectedTenant.icon} {selectedTenant.name}
              </div>
            )}
          </div>
          <button
            onClick={() => {
              setSendMode(null);
              setSelectedTenant(null);
              setAddress('');
            }}
            style={{
              padding: '4px 8px',
              background: 'rgba(255,255,255,0.1)',
              border: 'none',
              borderRadius: 6,
              color: '#EAF2FF',
              fontSize: 11,
              cursor: 'pointer',
            }}
          >
            変更
          </button>
        </div>
      )}

      {/* テナントチップ時の説明 */}
      {sendMode === 'tenant' && (
        <div style={{
          marginBottom: 16,
          padding: isMobile ? '10px 12px' : '12px 14px',
          background: 'rgba(255, 215, 0, 0.1)',
          border: '1px solid rgba(255, 215, 0, 0.2)',
          borderRadius: 8,
          fontSize: isMobile ? 11 : 12,
          lineHeight: 1.5,
        }}>
          💡 メッセージを書くとkodomi算出に有利になります
        </div>
      )}

      <div style={{ marginBottom: 16 }}>
        <label style={{ display: 'block', fontSize: isMobile ? 12 : 13, opacity: 0.6, marginBottom: 8 }}>
          宛先アドレス {sendMode === 'tenant' && '（自動入力済み）'}
        </label>
        <div style={{ position: 'relative' }}>
          <input
            type="text"
            placeholder={sendMode === 'tenant' ? 'テナントを選択してください' : '0x...'}
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            disabled={sendMode === 'tenant'}
            style={{
              width: '100%',
              padding: isMobile ? '10px 12px' : '12px 14px',
              paddingRight: sendMode !== 'tenant' ? (isMobile ? '50px' : '60px') : (isMobile ? '10px 12px' : '12px 14px'),
              background: sendMode === 'tenant' ? '#f5f5f5' : '#ffffff',
              border: '2px solid #3b82f6',
              borderRadius: 8,
              color: '#1a1a1a',
              fontSize: isMobile ? 14 : 15,
              opacity: sendMode === 'tenant' ? 0.6 : 1,
              cursor: sendMode === 'tenant' ? 'not-allowed' : 'text',
              boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)',
            }}
          />
          {sendMode !== 'tenant' && (
            <button
              onClick={() => setShowQRScanner(true)}
              style={{
                position: 'absolute',
                right: isMobile ? 8 : 10,
                top: '50%',
                transform: 'translateY(-50%)',
                padding: isMobile ? '6px 10px' : '8px 12px',
                background: 'linear-gradient(135deg, #667EEA 0%, #764BA2 100%)',
                border: 'none',
                borderRadius: 6,
                color: '#fff',
                fontSize: isMobile ? 18 : 20,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                lineHeight: 1,
              }}
              title="QRコードスキャン"
            >
              📷
            </button>
          )}
        </div>
      </div>

      <div style={{ marginBottom: 16 }}>
        <label style={{ display: 'block', fontSize: isMobile ? 12 : 13, opacity: 0.6, marginBottom: 8 }}>
          数量
        </label>

        {/* テナントチップ時は固定金額ボタン表示 */}
        {sendMode === 'tenant' && selectedToken === 'JPYC' && (
          <div style={{
            display: 'flex',
            gap: isMobile ? 6 : 8,
            marginBottom: 12,
          }}>
            {[100, 500, 1000].map((presetAmount) => (
              <button
                key={presetAmount}
                onClick={() => setAmount(presetAmount.toString())}
                style={{
                  flex: 1,
                  padding: isMobile ? '8px 10px' : '10px 12px',
                  background: amount === presetAmount.toString()
                    ? `${currentToken.color}33`
                    : '#ffffff',
                  border: amount === presetAmount.toString()
                    ? `2px solid ${currentToken.color}`
                    : '2px solid #3b82f6',
                  borderRadius: 8,
                  color: amount === presetAmount.toString() ? currentToken.color : '#1a1a1a',
                  fontSize: isMobile ? 12 : 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                }}
              >
                {presetAmount} {currentToken.symbol}
              </button>
            ))}
          </div>
        )}

        <div style={{ position: 'relative' }}>
          <input
            type="number"
            placeholder={`0 ${currentToken.symbol}`}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            style={{
              width: '100%',
              padding: isMobile ? '10px 12px' : '12px 14px',
              paddingRight: isMobile ? '80px' : '90px',
              background: '#ffffff',
              border: '2px solid #3b82f6',
              borderRadius: 8,
              color: '#1a1a1a',
              fontSize: isMobile ? 14 : 15,
              boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)',
            }}
          />
          <div style={{
            position: 'absolute',
            right: isMobile ? 8 : 10,
            top: '50%',
            transform: 'translateY(-50%)',
            fontSize: isMobile ? 14 : 16,
            fontWeight: 700,
            color: '#ffffff',
            background: currentToken.color,
            padding: isMobile ? '4px 10px' : '6px 12px',
            borderRadius: 6,
            pointerEvents: 'none',
          }}>
            {currentToken.symbol}
          </div>
        </div>
      </div>

      {/* メッセージ欄（テナントチップと一括送金のみ） */}
      {sendMode && sendMode !== 'simple' && (
        <div style={{ marginBottom: 20 }}>
          <label style={{ display: 'block', fontSize: isMobile ? 12 : 13, opacity: 0.6, marginBottom: 8 }}>
            メッセージ（任意）
          </label>
          <textarea
            placeholder="メッセージを入力..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={3}
            style={{
              width: '100%',
              padding: isMobile ? '10px 12px' : '12px 14px',
              background: '#ffffff',
              border: '2px solid #3b82f6',
              borderRadius: 8,
              color: '#1a1a1a',
              fontSize: isMobile ? 14 : 15,
              fontFamily: 'inherit',
              resize: 'vertical',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            }}
          />
        </div>
      )}

      {!sendMode ? (
        <button
          onClick={() => setShowModeModal(true)}
          style={{
            width: '100%',
            padding: isMobile ? '12px' : '14px',
            background: 'linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%)',
            border: `1px solid rgba(0,0,0,0.08)`,
            borderRadius: 12,
            color: currentToken.color,
            fontSize: isMobile ? 14 : 15,
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.2s',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          }}
        >
          送金タイプを選択
        </button>
      ) : (
        <button
          style={{
            width: '100%',
            padding: isMobile ? '12px' : '14px',
            background: `linear-gradient(135deg, ${currentToken.color} 0%, ${currentToken.color}dd 100%)`,
            border: 'none',
            borderRadius: 12,
            color: '#fff',
            fontSize: isMobile ? 14 : 15,
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.2s',
            boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
          }}
        >
          送金する
        </button>
      )}

      {/* 送金モード選択モーダル */}
      {showModeModal && (
        <SendModeModal
          isMobile={isMobile}
          onClose={() => setShowModeModal(false)}
          onSelectMode={(mode) => {
            setSendMode(mode);
            setShowModeModal(false);
            if (mode === 'tenant') {
              setShowTenantModal(true);
            }
          }}
        />
      )}

      {/* テナント選択モーダル */}
      {showTenantModal && (
        <TenantSelectModal
          isMobile={isMobile}
          onClose={() => {
            setShowTenantModal(false);
            if (!selectedTenant) {
              setSendMode(null); // テナント未選択でキャンセルした場合はモードもリセット
            }
          }}
          onSelectTenant={handleTenantSelect}
        />
      )}

      {/* QRスキャナーモーダル */}
      {showQRScanner && (
        <QRScanner
          onScan={(scannedAddress) => {
            setAddress(scannedAddress);
            setShowQRScanner(false);
          }}
          onClose={() => setShowQRScanner(false)}
          placeholder="ウォレットアドレスを入力"
        />
      )}
    </div>
  );
}

// 送金モード選択モーダル
function SendModeModal({ isMobile, onClose, onSelectMode }: {
  isMobile: boolean;
  onClose: () => void;
  onSelectMode: (mode: SendMode) => void;
}) {
  const modes = [
    {
      id: 'simple' as SendMode,
      icon: '💸',
      title: 'シンプル送金',
      description: '個人アドレスへ自由に送金',
      features: ['自由なアドレス入力', 'kodomi記録なし', 'メッセージ任意'],
    },
    {
      id: 'tenant' as SendMode,
      icon: '🎁',
      title: 'テナントへチップ',
      description: 'テナントを選んで応援',
      features: ['テナント一覧から選択', 'kodomi記録される', 'メッセージ推奨'],
    },
    {
      id: 'bulk' as SendMode,
      icon: '📤',
      title: '一括送金',
      description: '複数人へ同時に送金',
      features: ['複数アドレス対応', 'シンプルな操作', '効率的な送金'],
    },
  ];

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.7)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: isMobile ? 16 : 24,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: '#1a1a24',
          borderRadius: isMobile ? 16 : 24,
          padding: isMobile ? 20 : 32,
          maxWidth: isMobile ? '100%' : 600,
          width: '100%',
          maxHeight: '80vh',
          overflow: 'auto',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: isMobile ? 20 : 24,
        }}>
          <h3 style={{
            margin: 0,
            fontSize: isMobile ? 18 : 22,
            fontWeight: 700,
          }}>
            送金タイプを選択
          </h3>
          <button
            onClick={onClose}
            style={{
              background: 'rgba(255,255,255,0.1)',
              border: 'none',
              borderRadius: 8,
              color: '#EAF2FF',
              fontSize: 20,
              width: 32,
              height: 32,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            ×
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: isMobile ? 12 : 16 }}>
          {modes.map((mode) => (
            <button
              key={mode.id}
              onClick={() => onSelectMode(mode.id)}
              style={{
                background: 'linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%)',
                border: '1px solid rgba(0,0,0,0.08)',
                borderRadius: isMobile ? 12 : 16,
                padding: isMobile ? 16 : 20,
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 0.2s',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.background = '#e9ecef';
                e.currentTarget.style.borderColor = 'rgba(0,0,0,0.15)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.background = '#ffffff';
                e.currentTarget.style.borderColor = 'rgba(0,0,0,0.08)';
                e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)';
              }}
            >
              <div style={{ fontSize: 32, marginBottom: 12 }}>{mode.icon}</div>
              <h4 style={{
                margin: '0 0 8px 0',
                fontSize: isMobile ? 16 : 18,
                fontWeight: 700,
                color: '#ffffff',
              }}>
                {mode.title}
              </h4>
              <p style={{
                margin: '0 0 12px 0',
                fontSize: isMobile ? 13 : 14,
                opacity: 0.7,
                color: '#ffffff',
              }}>
                {mode.description}
              </p>
              <ul style={{
                margin: 0,
                padding: '0 0 0 20px',
                fontSize: isMobile ? 12 : 13,
                opacity: 0.6,
                color: '#ffffff',
              }}>
                {mode.features.map((feature, i) => (
                  <li key={i}>{feature}</li>
                ))}
              </ul>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// テナント選択モーダル
function TenantSelectModal({ isMobile, onClose, onSelectTenant }: {
  isMobile: boolean;
  onClose: () => void;
  onSelectTenant: (tenant: any) => void;
}) {
  // TODO: 実データから取得
  const tenants = [
    { id: 1, name: 'カフェX', icon: '🏪', walletAddress: '0x1234...5678', kodomi: 2000, rank: 'Silver' },
    { id: 2, name: 'アーティストY', icon: '🎨', walletAddress: '0xabcd...ef01', kodomi: 1500, rank: 'Bronze' },
    { id: 3, name: 'ショップZ', icon: '☕', walletAddress: '0x9876...5432', kodomi: 1734, rank: 'Bronze' },
    { id: 4, name: 'クリエイターA', icon: '🎭', walletAddress: '0xfedc...ba98', kodomi: 3200, rank: 'Gold' },
  ];

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.7)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: isMobile ? 16 : 24,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: '#1a1a24',
          borderRadius: isMobile ? 16 : 24,
          padding: isMobile ? 20 : 32,
          maxWidth: isMobile ? '100%' : 500,
          width: '100%',
          maxHeight: '80vh',
          overflow: 'auto',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: isMobile ? 20 : 24,
        }}>
          <h3 style={{
            margin: 0,
            fontSize: isMobile ? 18 : 22,
            fontWeight: 700,
          }}>
            テナントを選択
          </h3>
          <button
            onClick={onClose}
            style={{
              background: 'rgba(255,255,255,0.1)',
              border: 'none',
              borderRadius: 8,
              color: '#EAF2FF',
              fontSize: 20,
              width: 32,
              height: 32,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            ×
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: isMobile ? 10 : 12 }}>
          {tenants.map((tenant) => (
            <button
              key={tenant.id}
              onClick={() => onSelectTenant(tenant)}
              style={{
                background: 'linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%)',
                border: '1px solid rgba(0,0,0,0.08)',
                borderRadius: isMobile ? 12 : 14,
                padding: isMobile ? 12 : 16,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                transition: 'all 0.2s',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.background = '#e9ecef';
                e.currentTarget.style.borderColor = 'rgba(0,0,0,0.15)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.background = '#ffffff';
                e.currentTarget.style.borderColor = 'rgba(0,0,0,0.08)';
                e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)';
              }}
            >
              <div style={{ fontSize: 32 }}>{tenant.icon}</div>
              <div style={{ flex: 1, textAlign: 'left' }}>
                <div style={{
                  fontSize: isMobile ? 14 : 16,
                  fontWeight: 700,
                  marginBottom: 4,
                  color: '#ffffff',
                }}>
                  {tenant.name}
                </div>
                <div style={{
                  fontSize: isMobile ? 11 : 12,
                  opacity: 0.6,
                  fontFamily: 'monospace',
                  color: '#ffffff',
                }}>
                  {tenant.walletAddress}
                </div>
              </div>
              <div style={{
                padding: '4px 10px',
                background: 'rgba(192, 192, 192, 0.2)',
                border: '1px solid rgba(192, 192, 192, 0.3)',
                borderRadius: 999,
                fontSize: isMobile ? 10 : 11,
                fontWeight: 600,
                color: '#ffffff',
              }}>
                {tenant.rank}
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// 一括送金フォーム
function BulkSendForm({ isMobile, selectedToken, setSelectedToken, onChangeMode }: {
  isMobile: boolean;
  selectedToken: 'JPYC' | 'NHT';
  setSelectedToken: (token: 'JPYC' | 'NHT') => void;
  onChangeMode: () => void;
}) {
  const [recipients, setRecipients] = useState([
    { id: 1, address: '', amount: '' },
  ]);

  const tokenInfo = {
    JPYC: {
      name: 'JPYC',
      description: 'ステーブルコイン',
      detail: '日本円と同価値、送金ツールとして利用',
      color: '#667eea',
    },
    NHT: {
      name: 'NHT',
      description: 'ユーティリティトークン',
      detail: 'GIFTERRAエコシステムで流通',
      color: '#764ba2',
    },
  };

  const currentToken = tokenInfo[selectedToken];

  const addRecipient = () => {
    const newId = Math.max(...recipients.map(r => r.id)) + 1;
    setRecipients([...recipients, { id: newId, address: '', amount: '' }]);
  };

  const removeRecipient = (id: number) => {
    if (recipients.length > 1) {
      setRecipients(recipients.filter(r => r.id !== id));
    }
  };

  const updateRecipient = (id: number, field: 'address' | 'amount', value: string) => {
    setRecipients(recipients.map(r =>
      r.id === id ? { ...r, [field]: value } : r
    ));
  };

  const totalAmount = recipients.reduce((sum, r) => {
    const amount = parseFloat(r.amount) || 0;
    return sum + amount;
  }, 0);

  return (
    <div style={{
      background: 'linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%)',
      border: '1px solid rgba(0,0,0,0.08)',
      borderRadius: isMobile ? 16 : 24,
      padding: isMobile ? 20 : 28,
      boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <h2 style={{ margin: 0, fontSize: isMobile ? 18 : 22, fontWeight: 700 }}>
          一括送金
        </h2>
        <button
          onClick={onChangeMode}
          style={{
            padding: '4px 8px',
            background: 'rgba(255,255,255,0.1)',
            border: 'none',
            borderRadius: 6,
            color: '#EAF2FF',
            fontSize: 11,
            cursor: 'pointer',
          }}
        >
          変更
        </button>
      </div>

      {/* トークン選択タブ */}
      <div style={{
        display: 'flex',
        gap: 8,
        marginBottom: 16,
        background: 'linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%)',
        borderRadius: 12,
        padding: 4,
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
      }}>
        <button
          onClick={() => setSelectedToken('JPYC')}
          style={{
            flex: 1,
            padding: isMobile ? '8px 12px' : '10px 16px',
            background: selectedToken === 'JPYC' ? 'rgba(102, 126, 234, 0.3)' : '#ffffff',
            border: selectedToken === 'JPYC' ? '1px solid rgba(102, 126, 234, 0.5)' : '1px solid rgba(0,0,0,0.08)',
            borderRadius: 8,
            color: selectedToken === 'JPYC' ? '#667eea' : '#1a1a1a',
            fontSize: isMobile ? 13 : 14,
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.2s',
            boxShadow: selectedToken === 'JPYC' ? '0 2px 8px rgba(102, 126, 234, 0.2)' : '0 2px 8px rgba(0,0,0,0.1)',
          }}
        >
          JPYC
        </button>
        <button
          onClick={() => setSelectedToken('NHT')}
          style={{
            flex: 1,
            padding: isMobile ? '8px 12px' : '10px 16px',
            background: selectedToken === 'NHT' ? 'rgba(118, 75, 162, 0.3)' : '#ffffff',
            border: selectedToken === 'NHT' ? '1px solid rgba(118, 75, 162, 0.5)' : '1px solid rgba(0,0,0,0.08)',
            borderRadius: 8,
            color: selectedToken === 'NHT' ? '#764ba2' : '#1a1a1a',
            fontSize: isMobile ? 13 : 14,
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.2s',
            boxShadow: selectedToken === 'NHT' ? '0 2px 8px rgba(118, 75, 162, 0.2)' : '0 2px 8px rgba(0,0,0,0.1)',
          }}
        >
          NHT
        </button>
      </div>

      {/* トークン説明 */}
      <div style={{
        marginBottom: 20,
        padding: isMobile ? '12px' : '14px',
        background: `${currentToken.color}11`,
        border: `1px solid ${currentToken.color}33`,
        borderRadius: 8,
      }}>
        <div style={{
          fontSize: isMobile ? 12 : 13,
          fontWeight: 600,
          marginBottom: 4,
          color: currentToken.color,
        }}>
          {currentToken.description}
        </div>
        <div style={{
          fontSize: isMobile ? 11 : 12,
          opacity: 0.7,
        }}>
          {currentToken.detail}
        </div>
      </div>

      {/* 送金先リスト */}
      <div style={{ marginBottom: 16 }}>
        <label style={{ display: 'block', fontSize: isMobile ? 12 : 13, opacity: 0.6, marginBottom: 12 }}>
          送金先（{recipients.length}件）
        </label>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {recipients.map((recipient, index) => (
            <div
              key={recipient.id}
              style={{
                background: 'linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%)',
                border: '1px solid rgba(0,0,0,0.08)',
                borderRadius: 12,
                padding: isMobile ? 12 : 14,
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
              }}
            >
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 10,
              }}>
                <span style={{ fontSize: isMobile ? 12 : 13, fontWeight: 600, opacity: 0.6 }}>
                  #{index + 1}
                </span>
                {recipients.length > 1 && (
                  <button
                    onClick={() => removeRecipient(recipient.id)}
                    style={{
                      background: 'rgba(255, 100, 100, 0.2)',
                      border: '1px solid rgba(255, 100, 100, 0.3)',
                      borderRadius: 6,
                      color: '#ff6666',
                      fontSize: 11,
                      padding: '4px 8px',
                      cursor: 'pointer',
                    }}
                  >
                    削除
                  </button>
                )}
              </div>
              <input
                type="text"
                placeholder="0x..."
                value={recipient.address}
                onChange={(e) => updateRecipient(recipient.id, 'address', e.target.value)}
                style={{
                  width: '100%',
                  padding: isMobile ? '8px 10px' : '10px 12px',
                  background: 'linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%)',
                  border: '1px solid rgba(0,0,0,0.08)',
                  borderRadius: 8,
                  color: '#ffffff',
                  fontSize: isMobile ? 13 : 14,
                  marginBottom: 8,
                  boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                }}
              />
              <input
                type="number"
                placeholder="数量"
                value={recipient.amount}
                onChange={(e) => updateRecipient(recipient.id, 'amount', e.target.value)}
                style={{
                  width: '100%',
                  padding: isMobile ? '8px 10px' : '10px 12px',
                  background: 'linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%)',
                  border: '1px solid rgba(0,0,0,0.08)',
                  borderRadius: 8,
                  color: '#ffffff',
                  fontSize: isMobile ? 13 : 14,
                  boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                }}
              />
            </div>
          ))}
        </div>
      </div>

      {/* 追加ボタン */}
      <button
        onClick={addRecipient}
        style={{
          width: '100%',
          padding: isMobile ? '10px' : '12px',
          background: 'linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%)',
          border: '1px dashed rgba(0,0,0,0.2)',
          borderRadius: 12,
          color: '#ffffff',
          fontSize: isMobile ? 13 : 14,
          fontWeight: 600,
          cursor: 'pointer',
          marginBottom: 20,
          transition: 'all 0.2s',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        }}
      >
        + 送金先を追加
      </button>

      {/* 合計金額 */}
      <div style={{
        marginBottom: 20,
        padding: isMobile ? '12px' : '14px',
        background: `${currentToken.color}11`,
        border: `1px solid ${currentToken.color}33`,
        borderRadius: 8,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <span style={{ fontSize: isMobile ? 13 : 14, opacity: 0.7 }}>
          合計送金額
        </span>
        <span style={{
          fontSize: isMobile ? 18 : 22,
          fontWeight: 900,
          color: currentToken.color,
        }}>
          {totalAmount.toLocaleString()} {selectedToken}
        </span>
      </div>

      {/* 送金ボタン */}
      <button
        style={{
          width: '100%',
          padding: isMobile ? '12px' : '14px',
          background: `linear-gradient(135deg, ${currentToken.color} 0%, ${currentToken.color}dd 100%)`,
          border: 'none',
          borderRadius: 12,
          color: '#fff',
          fontSize: isMobile ? 14 : 15,
          fontWeight: 600,
          cursor: 'pointer',
          transition: 'all 0.2s',
          boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
        }}
      >
        一括送金する
      </button>
    </div>
  );
}

// 2. 受取アドレス
function ReceiveAddress({ isMobile }: { isMobile: boolean }) {
  return (
    <div style={{
      background: 'linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%)',
      border: '1px solid rgba(0,0,0,0.08)',
      borderRadius: isMobile ? 16 : 24,
      padding: isMobile ? 20 : 28,
      boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
    }}>
      <h2 style={{ margin: '0 0 16px 0', fontSize: isMobile ? 18 : 22, fontWeight: 700 }}>
        受取アドレス
      </h2>
      <p style={{ fontSize: isMobile ? 13 : 14, opacity: 0.6, margin: '0 0 16px 0' }}>
        接続後にQR/コピー可能
      </p>
      <button style={{
        width: '100%',
        padding: isMobile ? '12px' : '14px',
        background: 'linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%)',
        border: '1px solid rgba(0,0,0,0.08)',
        borderRadius: 12,
        color: '#ffffff',
        fontSize: isMobile ? 14 : 15,
        fontWeight: 600,
        cursor: 'pointer',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
      }}>
        接続する
      </button>
    </div>
  );
}

// 3. 全体kodomiタンク
function OverallKodomiTank({ isMobile }: { isMobile: boolean }) {
  const color = '#667eea';
  const percentage = 65; // TODO: 実データから算出
  const kodomi = 5234; // TODO: 実データ
  const rank = 'Gold'; // TODO: 実データ

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

              {/* バブルアニメーション（複数） */}
              <div style={{
                position: 'absolute',
                left: '20%',
                width: 8,
                height: 8,
                background: 'rgba(255,255,255,0.35)',
                borderRadius: '50%',
                animation: 'subtleBubbleRise 10s ease-in-out infinite',
                animationDelay: '0s',
                boxShadow: '0 0 10px rgba(255,255,255,0.3)',
              }} />
              <div style={{
                position: 'absolute',
                left: '45%',
                width: 6,
                height: 6,
                background: 'rgba(255,255,255,0.3)',
                borderRadius: '50%',
                animation: 'subtleBubbleRise 12s ease-in-out infinite',
                animationDelay: '3s',
                boxShadow: '0 0 8px rgba(255,255,255,0.25)',
              }} />
              <div style={{
                position: 'absolute',
                left: '70%',
                width: 7,
                height: 7,
                background: 'rgba(255,255,255,0.32)',
                borderRadius: '50%',
                animation: 'subtleBubbleRise 11s ease-in-out infinite',
                animationDelay: '6s',
                boxShadow: '0 0 9px rgba(255,255,255,0.28)',
              }} />
              <div style={{
                position: 'absolute',
                left: '85%',
                width: 5,
                height: 5,
                background: 'rgba(255,255,255,0.28)',
                borderRadius: '50%',
                animation: 'subtleBubbleRise 13s ease-in-out infinite',
                animationDelay: '9s',
                boxShadow: '0 0 7px rgba(255,255,255,0.23)',
              }} />

              {/* 液体の揺らぎエフェクト */}
              <div style={{
                position: 'absolute',
                inset: 0,
                background: `linear-gradient(45deg, transparent 30%, ${color}33 50%, transparent 70%)`,
                animation: 'liquidShimmer 8s ease-in-out infinite',
                pointerEvents: 'none',
              }} />

              {/* 呼吸発光（強化） */}
              <div style={{
                position: 'absolute',
                inset: 0,
                background: `radial-gradient(ellipse at center, ${color}ff 0%, transparent 60%)`,
                animation: 'breatheGlow 10s ease-in-out infinite',
                pointerEvents: 'none',
              }} />

              {/* 光の反射エフェクト */}
              <div style={{
                position: 'absolute',
                top: '10%',
                left: '10%',
                width: '30%',
                height: '20%',
                background: 'radial-gradient(ellipse at center, rgba(255,255,255,0.25) 0%, transparent 70%)',
                borderRadius: '50%',
                animation: 'breatheGlow 7s ease-in-out infinite',
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
              fontSize: isMobile ? 13 : 15,
              opacity: 0.6,
              marginBottom: 4,
              letterSpacing: '0.05em',
            }}>
              全体kodomi
            </div>
            <div style={{
              fontSize: isMobile ? 10 : 11,
              opacity: 0.4,
              marginBottom: 12,
            }}>
              貢献熱量ポイント
            </div>
            <div style={{
              fontSize: isMobile ? 48 : 64,
              fontWeight: 900,
              letterSpacing: '-0.02em',
              textShadow: '0 4px 20px rgba(0,0,0,0.8)',
              marginBottom: 8,
            }}>
              {kodomi.toLocaleString()}
            </div>
            <div style={{
              fontSize: isMobile ? 14 : 16,
              opacity: 0.8,
            }}>
              pt
            </div>
            <div style={{
              marginTop: 16,
              padding: isMobile ? '6px 16px' : '8px 20px',
              background: 'rgba(255, 215, 0, 0.2)',
              border: '1px solid rgba(255, 215, 0, 0.3)',
              borderRadius: 999,
              fontSize: isMobile ? 13 : 14,
              fontWeight: 700,
            }}>
              🏆 {rank}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// 4. 貢献先テナント別カード
function ContributionTenants({ isMobile }: { isMobile: boolean }) {
  // TODO: 実データ
  const tenants = [
    { name: 'カフェX', kodomi: 2000, rank: 'Silver', sbtCount: 2, icon: '🏪' },
    { name: 'アーティストY', kodomi: 1500, rank: 'Bronze', sbtCount: 1, icon: '🎨' },
    { name: 'ショップZ', kodomi: 1734, rank: 'Bronze', sbtCount: 3, icon: '☕' },
  ];

  return (
    <div style={{ marginBottom: isMobile ? 40 : 60 }}>
      <h2 style={{
        margin: '0 0 20px 0',
        fontSize: isMobile ? 18 : 22,
        fontWeight: 700,
      }}>
        貢献先テナント
      </h2>
      <div style={{
        display: 'flex',
        gap: isMobile ? 12 : 16,
        overflowX: 'auto',
        paddingBottom: 8,
      }}>
        {tenants.map((tenant, i) => (
          <div
            key={i}
            style={{
              minWidth: isMobile ? 160 : 200,
              background: 'linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%)',
              border: '1px solid rgba(0,0,0,0.08)',
              borderRadius: isMobile ? 12 : 16,
              padding: isMobile ? 16 : 20,
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            }}
          >
            <div style={{ fontSize: 32, marginBottom: 12 }}>{tenant.icon}</div>
            <h3 style={{
              margin: '0 0 12px 0',
              fontSize: isMobile ? 14 : 16,
              fontWeight: 700,
            }}>
              {tenant.name}
            </h3>
            <div style={{
              fontSize: isMobile ? 20 : 24,
              fontWeight: 900,
              marginBottom: 4,
            }}>
              {tenant.kodomi.toLocaleString()}
            </div>
            <div style={{
              fontSize: isMobile ? 11 : 12,
              opacity: 0.6,
              marginBottom: 12,
            }}>
              pt
            </div>
            <div style={{
              padding: '4px 12px',
              background: 'rgba(192, 192, 192, 0.2)',
              border: '1px solid rgba(192, 192, 192, 0.3)',
              borderRadius: 999,
              fontSize: isMobile ? 11 : 12,
              fontWeight: 600,
              marginBottom: 8,
            }}>
              {tenant.rank}
            </div>
            <div style={{
              fontSize: isMobile ? 11 : 12,
              opacity: 0.6,
            }}>
              SBT: {tenant.sbtCount}個
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// 5. 履歴セクション
function HistorySection({ isMobile }: { isMobile: boolean }) {
  return (
    <div style={{
      background: 'linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%)',
      border: '1px solid rgba(0,0,0,0.08)',
      borderRadius: isMobile ? 16 : 24,
      padding: isMobile ? 20 : 28,
      marginBottom: isMobile ? 24 : 32,
      boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
    }}>
      <h2 style={{ margin: '0 0 16px 0', fontSize: isMobile ? 18 : 22, fontWeight: 700 }}>
        履歴
      </h2>
      <p style={{ fontSize: isMobile ? 13 : 14, opacity: 0.6, margin: 0 }}>
        最近の送受信履歴
      </p>
      <div style={{ fontSize: isMobile ? 12 : 13, opacity: 0.4, marginTop: 16 }}>
        まだ履歴がありません
      </div>
    </div>
  );
}

// ========================================
// [C] 共通コンポーネント
// ========================================
function LockCard({ isMobile }: { isMobile: boolean }) {
  return (
    <div style={{
      background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%)',
      border: '1px solid rgba(102, 126, 234, 0.2)',
      borderRadius: isMobile ? 16 : 24,
      padding: isMobile ? 24 : 32,
    }}>
      <div style={{ fontSize: isMobile ? 36 : 48, marginBottom: 16, textAlign: 'center' }}>✨</div>
      <h3 style={{
        margin: '0 0 16px 0',
        fontSize: isMobile ? 18 : 22,
        fontWeight: 700,
        textAlign: 'center',
      }}>
        もっと活用しませんか？
      </h3>
      <p style={{
        fontSize: isMobile ? 13 : 14,
        opacity: 0.8,
        margin: '0 0 20px 0',
        textAlign: 'center',
      }}>
        テナント申請で解放される機能
      </p>
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        marginBottom: 24,
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: isMobile ? '10px 12px' : '12px 16px',
          background: 'rgba(255,255,255,0.05)',
          borderRadius: 8,
        }}>
          <div style={{ fontSize: 20 }}>🎁</div>
          <div>
            <div style={{ fontSize: isMobile ? 13 : 14, fontWeight: 600 }}>自動配布</div>
            <div style={{ fontSize: isMobile ? 11 : 12, opacity: 0.6 }}>送金時に特典を自動付与</div>
          </div>
        </div>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: isMobile ? '10px 12px' : '12px 16px',
          background: 'rgba(255,255,255,0.05)',
          borderRadius: 8,
        }}>
          <div style={{ fontSize: 20 }}>🏪</div>
          <div>
            <div style={{ fontSize: isMobile ? 13 : 14, fontWeight: 600 }}>GIFT HUB</div>
            <div style={{ fontSize: isMobile ? 11 : 12, opacity: 0.6 }}>特典管理システム</div>
          </div>
        </div>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: isMobile ? '10px 12px' : '12px 16px',
          background: 'rgba(255,255,255,0.05)',
          borderRadius: 8,
        }}>
          <div style={{ fontSize: 20 }}>🚩</div>
          <div>
            <div style={{ fontSize: isMobile ? 13 : 14, fontWeight: 600 }}>フラグNFT</div>
            <div style={{ fontSize: isMobile ? 11 : 12, opacity: 0.6 }}>到達証明の発行</div>
          </div>
        </div>
      </div>
      <button
        onClick={() => {
          window.location.href = '/tenant/apply';
        }}
        style={{
          width: '100%',
          padding: isMobile ? '14px' : '16px',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          border: 'none',
          borderRadius: 12,
          color: '#fff',
          fontSize: isMobile ? 15 : 16,
          fontWeight: 700,
          cursor: 'pointer',
          transition: 'all 0.2s',
        }}
        onMouseOver={(e) => {
          e.currentTarget.style.transform = 'scale(1.02)';
          e.currentTarget.style.boxShadow = '0 8px 24px rgba(102, 126, 234, 0.3)';
        }}
        onMouseOut={(e) => {
          e.currentTarget.style.transform = 'scale(1)';
          e.currentTarget.style.boxShadow = 'none';
        }}
      >
        テナント申請する
      </button>
    </div>
  );
}

// ========================================
// [C] Tenantモードコンテンツ
// ========================================
function TenantModeContent({ isMobile }: { isMobile: boolean }) {
  return (
    <>
      {/* 受取タンク */}
      <ReceiveTank isMobile={isMobile} />

      {/* テナント統計カード */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: isMobile ? 16 : 20,
        marginBottom: isMobile ? 40 : 48,
      }}>
        <div style={{
          background: 'linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%)',
          border: '1px solid rgba(0,0,0,0.08)',
          borderRadius: isMobile ? 16 : 24,
          padding: isMobile ? 20 : 28,
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        }}>
          <h3 style={{ margin: '0 0 12px 0', fontSize: isMobile ? 16 : 18, fontWeight: 700 }}>
            キャンペーン稼働状況
          </h3>
          <p style={{ fontSize: isMobile ? 13 : 14, opacity: 0.6 }}>
            詳細はAdminで確認
          </p>
        </div>
        <div style={{
          background: 'linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%)',
          border: '1px solid rgba(0,0,0,0.08)',
          borderRadius: isMobile ? 16 : 24,
          padding: isMobile ? 20 : 28,
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        }}>
          <h3 style={{ margin: '0 0 12px 0', fontSize: isMobile ? 16 : 18, fontWeight: 700 }}>
            サポーター動向
          </h3>
          <p style={{ fontSize: isMobile ? 13 : 14, opacity: 0.6 }}>
            詳細はAdminで確認
          </p>
        </div>
      </div>
    </>
  );
}

// 受取タンク（Tenantモード専用）
function ReceiveTank({ isMobile }: { isMobile: boolean }) {
  const color = '#764ba2';
  const percentage = 78; // TODO: 実データ
  const totalReceived = 12345; // TODO: 実データ

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
              総受取
            </div>
            <div style={{
              fontSize: isMobile ? 48 : 64,
              fontWeight: 900,
              letterSpacing: '-0.02em',
              textShadow: '0 4px 20px rgba(0,0,0,0.8)',
              marginBottom: 8,
            }}>
              {totalReceived.toLocaleString()}
            </div>
            <div style={{
              fontSize: isMobile ? 14 : 16,
              opacity: 0.8,
            }}>
              JPYC
            </div>
          </div>
        </div>
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
        GIFTERRAは資産の保管・両替・投資の勧誘を行いません。
      </div>
      <div style={{
        fontSize: isMobile ? 10 : 11,
        opacity: 0.3,
        marginBottom: 8,
      }}>
        Patent pending / 特許出願中
      </div>
      <div style={{
        fontSize: isMobile ? 10 : 11,
        opacity: 0.4,
      }}>
        Presented by METATRON.
      </div>
    </div>
  );
}
