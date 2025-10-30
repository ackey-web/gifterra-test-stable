// src/pages/Mypage.tsx
// GIFTERRAマイページ - 送受信ツール（Flowモード）+ テナント運用（Tenantモード）

import { useState, useEffect } from 'react';
import { useDisconnect, useSigner, useAddress, ConnectWallet, useChainId, useNetwork } from '@thirdweb-dev/react';
import { ethers } from 'ethers';
import { QRScanner } from '../components/QRScanner';
import { sendTokenGasless } from '../lib/gelatoRelay';
import { JPYC_TOKEN, TNHT_TOKEN } from '../contract';

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
      background: 'linear-gradient(135deg, #018a9a 0%, #017080 100%)',
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
      {/* [A] ヘッダー - 黒背景 */}
      <div style={{
        background: 'rgba(0, 0, 0, 0.85)',
        paddingTop: isMobile ? '16px' : '24px',
        paddingBottom: isMobile ? '16px' : '24px',
        marginBottom: isMobile ? '16px' : '24px',
      }}>
        <div style={{
          maxWidth: isMobile ? '100%' : 600,
          margin: '0 auto',
          padding: isMobile ? '0 16px' : '0 24px',
        }}>
          <Header
            viewMode={viewMode}
            setViewMode={setViewMode}
            isMobile={isMobile}
            tenantRank={tenantRank}
          />
        </div>
      </div>

      {/* [B] メインコンテンツエリア */}
      <div style={{
        position: 'relative',
        zIndex: 1,
        maxWidth: isMobile ? '100%' : 600,
        margin: '0 auto',
        padding: isMobile ? '0 16px 16px' : '0 24px 24px',
      }}>

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
  const disconnect = useDisconnect();
  const address = useAddress();
  const chainId = useChainId();
  const network = useNetwork();

  // R3（承認済みテナント）のみトグル表示
  const showToggle = tenantRank === 'R3';

  const handleLogout = async () => {
    if (window.confirm('ログアウトしますか？')) {
      await disconnect();
      localStorage.removeItem('gifterra_auth');
      window.location.href = '/login';
    }
  };

  // チェーン名を取得
  const getChainName = (chainId: number | undefined) => {
    if (!chainId) return '未接続';
    if (chainId === 80002) return 'Polygon Amoy (Testnet)';
    if (chainId === 137) return 'Polygon';
    return `Chain ID: ${chainId}`;
  };

  return (
    <div>
      {/* 上部：ロゴとボタン */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: isMobile ? 12 : 16,
        padding: isMobile ? '8px 0' : '12px 0',
      }}>
      {/* 左：ロゴ画像 */}
      <img
        src="/GIFTERRA.sidelogo.png"
        alt="GIFTERRA"
        style={{
          height: isMobile ? 60 : 120,
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

      {/* 右：設定・シェア・Admin・ログアウト */}
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
        <button
          onClick={handleLogout}
          style={{
            padding: isMobile ? '6px 12px' : '8px 16px',
            background: 'rgba(220, 38, 38, 0.15)',
            border: '1px solid rgba(220, 38, 38, 0.3)',
            borderRadius: 8,
            color: '#FCA5A5',
            fontSize: isMobile ? 11 : 13,
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.2s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(220, 38, 38, 0.25)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(220, 38, 38, 0.15)';
          }}
        >
          ログアウト
        </button>
      </div>
      </div>

      {/* 下部：ウォレット情報とチェーン表示 */}
      <div style={{
        display: 'flex',
        flexDirection: isMobile ? 'column' : 'row',
        gap: isMobile ? 8 : 12,
        marginTop: 12,
      }}>
        {/* ウォレット接続ボタン */}
        <div style={{ flex: isMobile ? 'none' : 1 }}>
          <ConnectWallet
            theme="dark"
            btnTitle={address ? `${address.slice(0, 6)}...${address.slice(-4)}` : 'ウォレット接続'}
            style={{
              width: '100%',
              height: isMobile ? 40 : 44,
              borderRadius: 8,
              fontSize: isMobile ? 12 : 14,
              fontWeight: 600,
            }}
          />
        </div>

        {/* チェーン表示 */}
        <div style={{
          flex: isMobile ? 'none' : 1,
          padding: isMobile ? '10px 12px' : '12px 16px',
          background: 'rgba(255, 255, 255, 0.05)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: 8,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}>
          <div style={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            background: chainId === 80002 ? '#10b981' : '#f59e0b',
          }} />
          <span style={{
            color: '#e0e0e0',
            fontSize: isMobile ? 12 : 14,
            fontWeight: 500,
          }}>
            {getChainName(chainId)}
          </span>
        </div>
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
  const signer = useSigner();
  const userAddress = useAddress();
  const [selectedToken, setSelectedToken] = useState<'JPYC' | 'NHT'>('JPYC');
  const [sendMode, setSendMode] = useState<SendMode | null>(null); // null = 未選択
  const [showModeModal, setShowModeModal] = useState(false);
  const [showTenantModal, setShowTenantModal] = useState(false);
  const [selectedTenant, setSelectedTenant] = useState<any>(null);
  const [address, setAddress] = useState('');
  const [amount, setAmount] = useState('');
  const [message, setMessage] = useState('');
  const [showQRScanner, setShowQRScanner] = useState(false);
  const [isSending, setIsSending] = useState(false);

  const tokenInfo = {
    JPYC: {
      name: 'JPYC',
      symbol: 'JPYC',
      description: 'ステーブルコイン',
      detail: '日本円と同価値、送金ツールとして利用',
      color: '#667eea',
    },
    NHT: {
      name: 'NHT',
      symbol: 'NHT',
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

  // ガスレス送金処理
  const handleSend = async () => {
    if (!signer || !userAddress) {
      alert('ウォレットが接続されていません');
      return;
    }

    if (!address || !amount) {
      alert('宛先アドレスと数量を入力してください');
      return;
    }

    // アドレス検証
    if (!ethers.utils.isAddress(address)) {
      alert('無効なアドレスです');
      return;
    }

    try {
      setIsSending(true);

      // トークンアドレスを取得
      const tokenAddress = selectedToken === 'JPYC' ? JPYC_TOKEN.ADDRESS : TNHT_TOKEN.ADDRESS;

      // 数量をwei単位に変換
      const amountWei = ethers.utils.parseUnits(amount, 18).toString();

      // Gelato Relayでガスレス送金
      const taskId = await sendTokenGasless(
        signer,
        tokenAddress,
        address,
        amountWei
      );

      alert(`✅ 送金リクエストを受け付けました！\n\nタスクID: ${taskId}\n\nガスレス送金が完了するまでお待ちください。`);

      // フォームをリセット
      setAddress('');
      setAmount('');
      setMessage('');
      setSendMode(null);
      setSelectedTenant(null);

    } catch (error: any) {
      console.error('送金エラー:', error);
      alert(`❌ 送金に失敗しました\n\nエラー: ${error.message || '不明なエラー'}`);
    } finally {
      setIsSending(false);
    }
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
      background: '#ffffff',
      border: '2px solid rgba(59, 130, 246, 0.2)',
      borderRadius: isMobile ? 16 : 24,
      padding: isMobile ? 20 : 28,
      boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
    }}>
      <h2 style={{ margin: '0 0 20px 0', fontSize: isMobile ? 18 : 22, fontWeight: 700, color: '#1a1a1a' }}>
        送金
      </h2>

      {/* トークン選択タブ */}
      <div style={{
        display: 'flex',
        gap: 8,
        marginBottom: 16,
        background: '#f3f4f6',
        borderRadius: 12,
        padding: 4,
        boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
      }}>
        <button
          onClick={() => setSelectedToken('JPYC')}
          style={{
            flex: 1,
            padding: isMobile ? '8px 12px' : '10px 16px',
            background: selectedToken === 'JPYC' ? '#ffffff' : 'rgba(102, 126, 234, 0.2)',
            border: selectedToken === 'JPYC' ? '2px solid #667eea' : '1px solid rgba(102, 126, 234, 0.3)',
            borderRadius: 8,
            color: selectedToken === 'JPYC' ? '#1a1a1a' : 'rgba(255, 255, 255, 0.5)',
            fontSize: isMobile ? 13 : 14,
            fontWeight: selectedToken === 'JPYC' ? 700 : 600,
            cursor: 'pointer',
            transition: 'all 0.2s',
            boxShadow: selectedToken === 'JPYC' ? '0 4px 12px rgba(102, 126, 234, 0.4)' : '0 2px 8px rgba(0,0,0,0.1)',
          }}
        >
          JPYC
        </button>
        <button
          onClick={() => setSelectedToken('NHT')}
          style={{
            flex: 1,
            padding: isMobile ? '8px 12px' : '10px 16px',
            background: selectedToken === 'NHT' ? '#ffffff' : 'rgba(118, 75, 162, 0.2)',
            border: selectedToken === 'NHT' ? '2px solid #764ba2' : '1px solid rgba(118, 75, 162, 0.3)',
            borderRadius: 8,
            color: selectedToken === 'NHT' ? '#1a1a1a' : 'rgba(255, 255, 255, 0.5)',
            fontSize: isMobile ? 13 : 14,
            fontWeight: selectedToken === 'NHT' ? 700 : 600,
            cursor: 'pointer',
            transition: 'all 0.2s',
            boxShadow: selectedToken === 'NHT' ? '0 4px 12px rgba(118, 75, 162, 0.4)' : '0 2px 8px rgba(0,0,0,0.1)',
          }}
        >
          NHT
        </button>
      </div>

      {/* トークン説明 */}
      <div style={{
        marginBottom: 20,
        padding: isMobile ? '12px' : '14px',
        background: `${currentToken.color}20`,
        border: `2px solid ${currentToken.color}`,
        borderRadius: 8,
      }}>
        <div style={{
          fontSize: isMobile ? 13 : 14,
          fontWeight: 700,
          marginBottom: 4,
          color: '#1a1a1a',
        }}>
          {currentToken.description}
        </div>
        <div style={{
          fontSize: isMobile ? 12 : 13,
          color: '#1a1a1a',
          fontWeight: 500,
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
              <div style={{ fontSize: isMobile ? 12 : 13, color: '#e0e0e0', fontWeight: 500 }}>
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
        <label style={{ display: 'block', fontSize: isMobile ? 13 : 14, color: '#1a1a1a', fontWeight: 700, marginBottom: 8 }}>
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
        <label style={{ display: 'block', fontSize: isMobile ? 13 : 14, color: '#1a1a1a', fontWeight: 700, marginBottom: 8 }}>
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
            min="0"
            step="1"
            style={{
              width: '100%',
              padding: isMobile ? '10px 12px' : '12px 14px',
              paddingRight: isMobile ? '90px' : '110px',
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
            fontSize: isMobile ? 13 : 14,
            fontWeight: 700,
            color: '#ffffff',
            background: currentToken.color,
            padding: isMobile ? '4px 8px' : '5px 10px',
            borderRadius: 6,
            border: `1.5px solid ${currentToken.color}`,
            boxShadow: `0 2px 8px ${currentToken.color}66`,
            pointerEvents: 'none',
            zIndex: 10,
            letterSpacing: '0.3px',
          }}>
            {currentToken.symbol}
          </div>
        </div>
      </div>

      {/* メッセージ欄（テナントチップと一括送金のみ） */}
      {sendMode && sendMode !== 'simple' && (
        <div style={{ marginBottom: 20 }}>
          <label style={{ display: 'block', fontSize: isMobile ? 13 : 14, color: '#1a1a1a', fontWeight: 700, marginBottom: 8 }}>
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
            padding: isMobile ? '14px' : '16px',
            background: '#ffffff',
            border: `3px solid #3b82f6`,
            borderRadius: 12,
            color: '#1a1a1a',
            fontSize: isMobile ? 15 : 16,
            fontWeight: 700,
            cursor: 'pointer',
            transition: 'all 0.2s',
            boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)',
          }}
        >
          送金タイプを選択
        </button>
      ) : (
        <button
          onClick={handleSend}
          disabled={isSending || !address || !amount}
          style={{
            width: '100%',
            padding: isMobile ? '12px' : '14px',
            background: isSending || !address || !amount
              ? '#cccccc'
              : `linear-gradient(135deg, ${currentToken.color} 0%, ${currentToken.color}dd 100%)`,
            border: 'none',
            borderRadius: 12,
            color: '#fff',
            fontSize: isMobile ? 14 : 15,
            fontWeight: 600,
            cursor: isSending || !address || !amount ? 'not-allowed' : 'pointer',
            transition: 'all 0.2s',
            boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
            opacity: isSending || !address || !amount ? 0.6 : 1,
          }}
        >
          {isSending ? '送金中...' : '送金する（ガスレス）'}
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
  const [tenants, setTenants] = useState<any[]>([]);

  // localStorageからフォロー中のテナント一覧を読み込み
  useEffect(() => {
    const saved = localStorage.getItem('followed_tenants');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setTenants(parsed);
      } catch (error) {
        console.error('Failed to parse followed tenants:', error);
        setTenants([]);
      }
    }
  }, []);

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
          {tenants.length === 0 ? (
            <div style={{
              padding: isMobile ? 16 : 20,
              textAlign: 'center',
              opacity: 0.6,
              color: '#ffffff',
              fontSize: isMobile ? 14 : 15,
            }}>
              テナントをフォローすると、ここに表示されます
            </div>
          ) : (
            tenants.map((tenant) => (
              <button
                key={tenant.tenantId}
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
                e.currentTarget.style.background = 'linear-gradient(135deg, #2563eb 0%, #60a5fa 100%)';
                e.currentTarget.style.borderColor = 'rgba(59, 130, 246, 0.3)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(59, 130, 246, 0.3)';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.background = 'linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%)';
                e.currentTarget.style.borderColor = 'rgba(0,0,0,0.08)';
                e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)';
              }}
            >
              {tenant.thumbnail ? (
                <img
                  src={tenant.thumbnail}
                  alt={tenant.name}
                  style={{
                    width: isMobile ? 48 : 56,
                    height: isMobile ? 48 : 56,
                    borderRadius: 8,
                    objectFit: 'cover',
                    border: '2px solid rgba(255,255,255,0.2)',
                  }}
                />
              ) : (
                <div style={{
                  width: isMobile ? 48 : 56,
                  height: isMobile ? 48 : 56,
                  borderRadius: 8,
                  background: 'rgba(255,255,255,0.1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 28,
                  border: '2px solid rgba(255,255,255,0.2)',
                }}>
                  {tenant.icon}
                </div>
              )}
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
                background: 'rgba(255, 215, 0, 0.2)',
                border: '1px solid rgba(255, 215, 0, 0.4)',
                borderRadius: 999,
                fontSize: isMobile ? 10 : 11,
                fontWeight: 600,
                color: '#ffd700',
              }}>
                {tenant.rank}
              </div>
            </button>
            ))
          )}
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
  const signer = useSigner();
  const userAddress = useAddress();
  const [recipients, setRecipients] = useState([
    { id: 1, address: '', amount: '' },
  ]);
  const [isSending, setIsSending] = useState(false);

  const tokenInfo = {
    JPYC: {
      name: 'JPYC',
      symbol: 'JPYC',
      description: 'ステーブルコイン',
      detail: '日本円と同価値、送金ツールとして利用',
      color: '#667eea',
    },
    NHT: {
      name: 'NHT',
      symbol: 'NHT',
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

  // ガスレス一括送金処理
  const handleBulkSend = async () => {
    if (!signer || !userAddress) {
      alert('ウォレットが接続されていません');
      return;
    }

    // バリデーション
    const invalidRecipients = recipients.filter(r => !r.address || !r.amount);
    if (invalidRecipients.length > 0) {
      alert('全ての受取人のアドレスと数量を入力してください');
      return;
    }

    // アドレス検証
    for (const recipient of recipients) {
      if (!ethers.utils.isAddress(recipient.address)) {
        alert(`無効なアドレス: ${recipient.address}`);
        return;
      }
    }

    try {
      setIsSending(true);

      // トークンアドレスを取得
      const tokenAddress = selectedToken === 'JPYC' ? JPYC_TOKEN.ADDRESS : TNHT_TOKEN.ADDRESS;

      const taskIds: string[] = [];

      // 各受取人に送金
      for (const recipient of recipients) {
        const amountWei = ethers.utils.parseUnits(recipient.amount, 18).toString();

        const taskId = await sendTokenGasless(
          signer,
          tokenAddress,
          recipient.address,
          amountWei
        );

        taskIds.push(taskId);
      }

      alert(`✅ ${recipients.length}件の送金リクエストを受け付けました！\n\nタスクID:\n${taskIds.join('\n')}\n\nガスレス送金が完了するまでお待ちください。`);

      // フォームをリセット
      setRecipients([{ id: 1, address: '', amount: '' }]);

    } catch (error: any) {
      console.error('一括送金エラー:', error);
      alert(`❌ 一括送金に失敗しました\n\nエラー: ${error.message || '不明なエラー'}`);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div style={{
      background: '#ffffff',
      border: '2px solid rgba(59, 130, 246, 0.2)',
      borderRadius: isMobile ? 16 : 24,
      padding: isMobile ? 20 : 28,
      boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <h2 style={{ margin: 0, fontSize: isMobile ? 18 : 22, fontWeight: 700, color: '#1a1a1a' }}>
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
        background: '#f3f4f6',
        borderRadius: 12,
        padding: 4,
        boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
      }}>
        <button
          onClick={() => setSelectedToken('JPYC')}
          style={{
            flex: 1,
            padding: isMobile ? '8px 12px' : '10px 16px',
            background: selectedToken === 'JPYC' ? '#ffffff' : 'rgba(102, 126, 234, 0.2)',
            border: selectedToken === 'JPYC' ? '2px solid #667eea' : '1px solid rgba(102, 126, 234, 0.3)',
            borderRadius: 8,
            color: selectedToken === 'JPYC' ? '#1a1a1a' : 'rgba(255, 255, 255, 0.5)',
            fontSize: isMobile ? 13 : 14,
            fontWeight: selectedToken === 'JPYC' ? 700 : 600,
            cursor: 'pointer',
            transition: 'all 0.2s',
            boxShadow: selectedToken === 'JPYC' ? '0 4px 12px rgba(102, 126, 234, 0.4)' : '0 2px 8px rgba(0,0,0,0.1)',
          }}
        >
          JPYC
        </button>
        <button
          onClick={() => setSelectedToken('NHT')}
          style={{
            flex: 1,
            padding: isMobile ? '8px 12px' : '10px 16px',
            background: selectedToken === 'NHT' ? '#ffffff' : 'rgba(118, 75, 162, 0.2)',
            border: selectedToken === 'NHT' ? '2px solid #764ba2' : '1px solid rgba(118, 75, 162, 0.3)',
            borderRadius: 8,
            color: selectedToken === 'NHT' ? '#1a1a1a' : 'rgba(255, 255, 255, 0.5)',
            fontSize: isMobile ? 13 : 14,
            fontWeight: selectedToken === 'NHT' ? 700 : 600,
            cursor: 'pointer',
            transition: 'all 0.2s',
            boxShadow: selectedToken === 'NHT' ? '0 4px 12px rgba(118, 75, 162, 0.4)' : '0 2px 8px rgba(0,0,0,0.1)',
          }}
        >
          NHT
        </button>
      </div>

      {/* トークン説明 */}
      <div style={{
        marginBottom: 20,
        padding: isMobile ? '12px' : '14px',
        background: `${currentToken.color}20`,
        border: `2px solid ${currentToken.color}`,
        borderRadius: 8,
      }}>
        <div style={{
          fontSize: isMobile ? 13 : 14,
          fontWeight: 700,
          marginBottom: 4,
          color: '#1a1a1a',
        }}>
          {currentToken.description}
        </div>
        <div style={{
          fontSize: isMobile ? 12 : 13,
          color: '#1a1a1a',
          fontWeight: 500,
        }}>
          {currentToken.detail}
        </div>
      </div>

      {/* 送金先リスト */}
      <div style={{ marginBottom: 16 }}>
        <label style={{ display: 'block', fontSize: isMobile ? 13 : 14, color: '#1a1a1a', fontWeight: 700, marginBottom: 12 }}>
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
        onClick={handleBulkSend}
        disabled={isSending || recipients.some(r => !r.address || !r.amount)}
        style={{
          width: '100%',
          padding: isMobile ? '12px' : '14px',
          background: isSending || recipients.some(r => !r.address || !r.amount)
            ? '#cccccc'
            : `linear-gradient(135deg, ${currentToken.color} 0%, ${currentToken.color}dd 100%)`,
          border: 'none',
          borderRadius: 12,
          color: '#fff',
          fontSize: isMobile ? 14 : 15,
          fontWeight: 600,
          cursor: isSending || recipients.some(r => !r.address || !r.amount) ? 'not-allowed' : 'pointer',
          transition: 'all 0.2s',
          boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
          opacity: isSending || recipients.some(r => !r.address || !r.amount) ? 0.6 : 1,
        }}
      >
        {isSending ? '送金中...' : '一括送金する（ガスレス）'}
      </button>
    </div>
  );
}

// 2. 受取アドレス
function ReceiveAddress({ isMobile }: { isMobile: boolean }) {
  const address = useAddress();
  const [showModal, setShowModal] = useState(false);
  const [qrDataURL, setQrDataURL] = useState<string>('');
  const [copySuccess, setCopySuccess] = useState(false);

  // QRコード生成（動的インポート）
  const generateQR = async (text: string) => {
    try {
      const QRCode = (await import('qrcode')).default;
      const dataURL = await QRCode.toDataURL(text, {
        width: 600, // 高解像度で生成
        margin: 2,
        color: {
          dark: '#000000',
          light: '#ffffff',
        },
      });
      setQrDataURL(dataURL);
    } catch (err) {
      console.error('QRコード生成エラー:', err);
    }
  };

  // モーダルを開く
  const handleOpen = async () => {
    if (!address) {
      alert('ウォレットが接続されていません');
      return;
    }
    await generateQR(address);
    setShowModal(true);
  };

  // アドレスをコピー
  const handleCopy = async () => {
    if (!address) return;
    try {
      await navigator.clipboard.writeText(address);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (err) {
      console.error('コピーエラー:', err);
      alert('コピーに失敗しました');
    }
  };

  // QRコードをダウンロード
  const handleDownload = () => {
    if (!qrDataURL) return;
    const link = document.createElement('a');
    link.download = `gifterra-address-${address?.slice(0, 6)}.png`;
    link.href = qrDataURL;
    link.click();
  };

  return (
    <>
      <div style={{
        background: '#ffffff',
        border: '2px solid rgba(59, 130, 246, 0.2)',
        borderRadius: isMobile ? 16 : 24,
        padding: isMobile ? 20 : 28,
        boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
      }}>
        <h2 style={{ margin: '0 0 16px 0', fontSize: isMobile ? 18 : 22, fontWeight: 700, color: '#1a1a1a' }}>
          受取アドレス
        </h2>
        <p style={{ fontSize: isMobile ? 13 : 14, color: '#4a5568', margin: '0 0 16px 0' }}>
          {address ? 'QR/コピーで共有' : 'ウォレットを接続してください'}
        </p>
        <button
          onClick={handleOpen}
          disabled={!address}
          style={{
            width: '100%',
            padding: isMobile ? '14px' : '16px',
            background: address
              ? 'linear-gradient(135deg, #667EEA 0%, #764BA2 100%)'
              : '#cccccc',
            border: 'none',
            borderRadius: 12,
            color: '#ffffff',
            fontSize: isMobile ? 15 : 16,
            fontWeight: 700,
            cursor: address ? 'pointer' : 'not-allowed',
            boxShadow: address ? '0 4px 12px rgba(102, 126, 234, 0.3)' : 'none',
            opacity: address ? 1 : 0.6,
          }}
        >
          {address ? '受取アドレスを表示' : 'ウォレット未接続'}
        </button>
      </div>

      {/* QRコード表示モーダル */}
      {showModal && address && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: 20,
        }}
        onClick={() => setShowModal(false)}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: isMobile ? 20 : 28,
              padding: isMobile ? 28 : 40,
              maxWidth: isMobile ? '90%' : 480,
              width: '100%',
              boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
              position: 'relative',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* 閉じるボタン */}
            <button
              onClick={() => setShowModal(false)}
              style={{
                position: 'absolute',
                top: 16,
                right: 16,
                width: 36,
                height: 36,
                background: 'rgba(0,0,0,0.05)',
                border: 'none',
                borderRadius: '50%',
                cursor: 'pointer',
                fontSize: 20,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              ×
            </button>

            <h2 style={{
              margin: '0 0 24px 0',
              fontSize: isMobile ? 20 : 24,
              fontWeight: 700,
              color: '#1a1a1a',
              textAlign: 'center',
            }}>
              受取アドレス
            </h2>

            {/* QRコード */}
            {qrDataURL && (
              <div style={{
                display: 'flex',
                justifyContent: 'center',
                marginBottom: 24,
              }}>
                <div style={{
                  padding: 16,
                  background: '#ffffff',
                  border: '3px solid #667eea',
                  borderRadius: 16,
                  boxShadow: '0 8px 24px rgba(102, 126, 234, 0.2)',
                }}>
                  <img
                    src={qrDataURL}
                    alt="QR Code"
                    style={{
                      width: isMobile ? 320 : 320,
                      height: isMobile ? 320 : 320,
                      display: 'block',
                    }}
                  />
                </div>
              </div>
            )}

            {/* アドレス表示 */}
            <div style={{
              padding: isMobile ? '12px 14px' : '14px 16px',
              background: '#f7fafc',
              border: '2px solid #e2e8f0',
              borderRadius: 12,
              marginBottom: 20,
              wordBreak: 'break-all',
              fontSize: isMobile ? 13 : 14,
              fontFamily: 'monospace',
              color: '#1a1a1a',
              textAlign: 'center',
            }}>
              {address}
            </div>

            {/* ボタン */}
            <div style={{
              display: 'flex',
              gap: 12,
              flexDirection: isMobile ? 'column' : 'row',
            }}>
              <button
                onClick={handleCopy}
                style={{
                  flex: 1,
                  padding: isMobile ? '14px' : '16px',
                  background: copySuccess ? '#10b981' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  border: 'none',
                  borderRadius: 12,
                  color: '#ffffff',
                  fontSize: isMobile ? 14 : 15,
                  fontWeight: 700,
                  cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(102, 126, 234, 0.3)',
                  transition: 'all 0.2s',
                }}
              >
                {copySuccess ? '✓ コピーしました！' : '📋 アドレスをコピー'}
              </button>

              <button
                onClick={handleDownload}
                style={{
                  flex: 1,
                  padding: isMobile ? '14px' : '16px',
                  background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                  border: 'none',
                  borderRadius: 12,
                  color: '#ffffff',
                  fontSize: isMobile ? 14 : 15,
                  fontWeight: 700,
                  cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)',
                }}
              >
                💾 QRコードを保存
              </button>
            </div>
          </div>
        </div>
      )}
    </>
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
  const [selectedTenant, setSelectedTenant] = useState<any>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [followedTenants, setFollowedTenants] = useState<any[]>([]);

  // localStorageからフォロー中のテナントを読み込み
  useEffect(() => {
    const saved = localStorage.getItem('followed_tenants');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setFollowedTenants(parsed);
      } catch (error) {
        console.error('Failed to parse followed tenants:', error);
        setFollowedTenants([]);
      }
    } else {
      // 初期データ（デモ用）
      const initialTenants = [
        { tenantId: 'TN001', name: 'カフェX', kodomi: 2000, rank: 'Silver', sbtCount: 2, icon: '🏪', thumbnail: '', description: 'コーヒーとスイーツのお店', walletAddress: '0x1234...5678' },
        { tenantId: 'TN002', name: 'アーティストY', kodomi: 1500, rank: 'Bronze', sbtCount: 1, icon: '🎨', thumbnail: '', description: 'デジタルアート作品を展開', walletAddress: '0xabcd...ef01' },
        { tenantId: 'TN003', name: 'ショップZ', kodomi: 1734, rank: 'Bronze', sbtCount: 3, icon: '☕', thumbnail: '', description: 'こだわりのコーヒー豆専門店', walletAddress: '0x9876...5432' },
      ];
      setFollowedTenants(initialTenants);
      localStorage.setItem('followed_tenants', JSON.stringify(initialTenants));
    }
  }, []);

  // テナントを追加
  const handleAddTenant = (tenant: any) => {
    // 重複チェック
    const isDuplicate = followedTenants.some(t => t.tenantId === tenant.tenantId);
    if (isDuplicate) {
      alert('このテナントは既にフォローしています');
      return;
    }

    const updatedTenants = [...followedTenants, tenant];
    setFollowedTenants(updatedTenants);
    localStorage.setItem('followed_tenants', JSON.stringify(updatedTenants));
  };

  // テナントを削除
  const handleRemoveTenant = (tenantId: string) => {
    if (confirm('このテナントのフォローを解除しますか？')) {
      const updatedTenants = followedTenants.filter(t => t.tenantId !== tenantId);
      setFollowedTenants(updatedTenants);
      localStorage.setItem('followed_tenants', JSON.stringify(updatedTenants));
    }
  };

  return (
    <>
      <div style={{ marginBottom: isMobile ? 40 : 60 }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 20,
        }}>
          <h2 style={{
            margin: 0,
            fontSize: isMobile ? 18 : 22,
            fontWeight: 700,
          }}>
            貢献先テナント
          </h2>
          <button
            onClick={() => setShowAddModal(true)}
            style={{
              padding: isMobile ? '8px 14px' : '10px 18px',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              border: 'none',
              borderRadius: 8,
              color: '#ffffff',
              fontSize: isMobile ? 13 : 14,
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              transition: 'all 0.2s',
              boxShadow: '0 2px 8px rgba(102, 126, 234, 0.3)',
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(102, 126, 234, 0.4)';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 2px 8px rgba(102, 126, 234, 0.3)';
            }}
          >
            ➕ テナント追加
          </button>
        </div>
        <div style={{
          display: 'flex',
          gap: isMobile ? 12 : 16,
          overflowX: 'auto',
          paddingBottom: 8,
        }}>
          {followedTenants.map((tenant, i) => (
            <div
              key={i}
              style={{
                position: 'relative',
                minWidth: isMobile ? 160 : 200,
              }}
            >
              <button
                onClick={() => setSelectedTenant(tenant)}
                style={{
                  width: '100%',
                  background: 'linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%)',
                  border: '1px solid rgba(0,0,0,0.08)',
                  borderRadius: isMobile ? 12 : 16,
                  padding: isMobile ? 16 : 20,
                  boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.transform = 'translateY(-4px)';
                  e.currentTarget.style.boxShadow = '0 6px 16px rgba(59, 130, 246, 0.3)';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)';
                }}
              >
              {tenant.thumbnail ? (
                <img
                  src={tenant.thumbnail}
                  alt={tenant.name}
                  style={{
                    width: '100%',
                    height: isMobile ? 120 : 140,
                    objectFit: 'cover',
                    borderRadius: 8,
                    marginBottom: 12,
                    border: '2px solid rgba(255,255,255,0.2)',
                  }}
                />
              ) : (
                <div style={{
                  width: '100%',
                  height: isMobile ? 120 : 140,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 48,
                  marginBottom: 12,
                  background: 'rgba(255,255,255,0.1)',
                  borderRadius: 8,
                  border: '2px solid rgba(255,255,255,0.2)',
                }}>
                  {tenant.icon}
                </div>
              )}
              <h3 style={{
                margin: '0 0 12px 0',
                fontSize: isMobile ? 14 : 16,
                fontWeight: 700,
                textAlign: 'left',
                color: '#ffffff',
              }}>
                {tenant.name}
              </h3>
              <div style={{
                fontSize: isMobile ? 20 : 24,
                fontWeight: 900,
                marginBottom: 4,
                textAlign: 'left',
                color: '#ffffff',
              }}>
                {tenant.kodomi.toLocaleString()}
              </div>
              <div style={{
                fontSize: isMobile ? 11 : 12,
                opacity: 0.6,
                marginBottom: 12,
                textAlign: 'left',
                color: '#ffffff',
              }}>
                pt
              </div>
              <div style={{
                padding: '4px 12px',
                background: 'rgba(255, 215, 0, 0.2)',
                border: '1px solid rgba(255, 215, 0, 0.4)',
                borderRadius: 999,
                fontSize: isMobile ? 11 : 12,
                fontWeight: 600,
                marginBottom: 8,
                display: 'inline-block',
                color: '#ffd700',
              }}>
                {tenant.rank}
              </div>
              <div style={{
                fontSize: isMobile ? 11 : 12,
                opacity: 0.6,
                textAlign: 'left',
                color: '#ffffff',
              }}>
                SBT: {tenant.sbtCount}個
              </div>
              </button>

              {/* 削除ボタン */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleRemoveTenant(tenant.tenantId);
                }}
                style={{
                  position: 'absolute',
                  top: 8,
                  right: 8,
                  width: 28,
                  height: 28,
                  background: 'rgba(239, 68, 68, 0.9)',
                  border: 'none',
                  borderRadius: 6,
                  color: '#ffffff',
                  fontSize: 16,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.2s',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.background = 'rgba(239, 68, 68, 1)';
                  e.currentTarget.style.transform = 'scale(1.1)';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.background = 'rgba(239, 68, 68, 0.9)';
                  e.currentTarget.style.transform = 'scale(1)';
                }}
                title="フォロー解除"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* テナント詳細モーダル */}
      {selectedTenant && (
        <TenantDetailModal
          isMobile={isMobile}
          tenant={selectedTenant}
          onClose={() => setSelectedTenant(null)}
        />
      )}

      {/* テナント追加モーダル */}
      {showAddModal && (
        <AddTenantModal
          isMobile={isMobile}
          onClose={() => setShowAddModal(false)}
          onAddTenant={handleAddTenant}
        />
      )}
    </>
  );
}

// テナント詳細モーダル
function TenantDetailModal({ isMobile, tenant, onClose }: {
  isMobile: boolean;
  tenant: any;
  onClose: () => void;
}) {
  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    alert(`${label}をコピーしました`);
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.8)',
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
          background: 'linear-gradient(135deg, #1a1a24 0%, #2d2d3d 100%)',
          borderRadius: isMobile ? 16 : 24,
          padding: isMobile ? 24 : 32,
          maxWidth: isMobile ? '100%' : 600,
          width: '100%',
          maxHeight: '90vh',
          overflow: 'auto',
          border: '1px solid rgba(255,255,255,0.1)',
          boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ヘッダー */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: isMobile ? 20 : 24,
        }}>
          <h3 style={{
            margin: 0,
            fontSize: isMobile ? 20 : 24,
            fontWeight: 700,
            color: '#EAF2FF',
          }}>
            テナント詳細
          </h3>
          <button
            onClick={onClose}
            style={{
              background: 'rgba(255,255,255,0.1)',
              border: 'none',
              borderRadius: 8,
              color: '#EAF2FF',
              fontSize: 24,
              width: 36,
              height: 36,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s',
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.background = 'rgba(255,255,255,0.2)';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.background = 'rgba(255,255,255,0.1)';
            }}
          >
            ×
          </button>
        </div>

        {/* サムネイル */}
        {tenant.thumbnail ? (
          <img
            src={tenant.thumbnail}
            alt={tenant.name}
            style={{
              width: '100%',
              height: isMobile ? 200 : 300,
              objectFit: 'cover',
              borderRadius: 12,
              marginBottom: 20,
              border: '2px solid rgba(255,255,255,0.2)',
            }}
          />
        ) : (
          <div style={{
            width: '100%',
            height: isMobile ? 200 : 300,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 80,
            marginBottom: 20,
            background: 'rgba(255,255,255,0.05)',
            borderRadius: 12,
            border: '2px solid rgba(255,255,255,0.2)',
          }}>
            {tenant.icon}
          </div>
        )}

        {/* テナント名 */}
        <h2 style={{
          margin: '0 0 12px 0',
          fontSize: isMobile ? 24 : 28,
          fontWeight: 700,
          color: '#EAF2FF',
        }}>
          {tenant.name}
        </h2>

        {/* ランク */}
        <div style={{
          display: 'inline-block',
          padding: '6px 16px',
          background: 'rgba(255, 215, 0, 0.2)',
          border: '1px solid rgba(255, 215, 0, 0.4)',
          borderRadius: 999,
          fontSize: isMobile ? 13 : 14,
          fontWeight: 600,
          marginBottom: 20,
          color: '#ffd700',
        }}>
          🏆 {tenant.rank}
        </div>

        {/* 説明 */}
        {tenant.description && (
          <div style={{
            marginBottom: 24,
            padding: isMobile ? 16 : 20,
            background: 'rgba(255,255,255,0.05)',
            borderRadius: 12,
            border: '1px solid rgba(255,255,255,0.1)',
          }}>
            <div style={{
              fontSize: isMobile ? 13 : 14,
              fontWeight: 600,
              marginBottom: 8,
              color: '#EAF2FF',
              opacity: 0.7,
            }}>
              説明
            </div>
            <div style={{
              fontSize: isMobile ? 14 : 15,
              lineHeight: 1.6,
              color: '#EAF2FF',
            }}>
              {tenant.description}
            </div>
          </div>
        )}

        {/* 統計情報 */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
          gap: 12,
          marginBottom: 24,
        }}>
          <div style={{
            padding: isMobile ? 16 : 20,
            background: 'rgba(102, 126, 234, 0.1)',
            border: '1px solid rgba(102, 126, 234, 0.2)',
            borderRadius: 12,
          }}>
            <div style={{
              fontSize: isMobile ? 12 : 13,
              opacity: 0.7,
              marginBottom: 4,
              color: '#EAF2FF',
            }}>
              kodomi
            </div>
            <div style={{
              fontSize: isMobile ? 24 : 28,
              fontWeight: 900,
              color: '#667eea',
            }}>
              {tenant.kodomi?.toLocaleString() || 0}
            </div>
            <div style={{
              fontSize: isMobile ? 11 : 12,
              opacity: 0.5,
              color: '#EAF2FF',
            }}>
              pt
            </div>
          </div>
          <div style={{
            padding: isMobile ? 16 : 20,
            background: 'rgba(118, 75, 162, 0.1)',
            border: '1px solid rgba(118, 75, 162, 0.2)',
            borderRadius: 12,
          }}>
            <div style={{
              fontSize: isMobile ? 12 : 13,
              opacity: 0.7,
              marginBottom: 4,
              color: '#EAF2FF',
            }}>
              保有SBT
            </div>
            <div style={{
              fontSize: isMobile ? 24 : 28,
              fontWeight: 900,
              color: '#764ba2',
            }}>
              {tenant.sbtCount || 0}
            </div>
            <div style={{
              fontSize: isMobile ? 11 : 12,
              opacity: 0.5,
              color: '#EAF2FF',
            }}>
              個
            </div>
          </div>
        </div>

        {/* テナントID */}
        <div style={{
          marginBottom: 16,
          padding: isMobile ? 16 : 20,
          background: 'rgba(255,255,255,0.05)',
          borderRadius: 12,
          border: '1px solid rgba(255,255,255,0.1)',
        }}>
          <div style={{
            fontSize: isMobile ? 13 : 14,
            fontWeight: 600,
            marginBottom: 8,
            color: '#EAF2FF',
            opacity: 0.7,
          }}>
            テナントID
          </div>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}>
            <div style={{
              flex: 1,
              fontSize: isMobile ? 13 : 14,
              fontFamily: 'monospace',
              color: '#EAF2FF',
              wordBreak: 'break-all',
            }}>
              {tenant.tenantId}
            </div>
            <button
              onClick={() => copyToClipboard(tenant.tenantId, 'テナントID')}
              style={{
                padding: '8px 12px',
                background: 'rgba(102, 126, 234, 0.2)',
                border: '1px solid rgba(102, 126, 234, 0.3)',
                borderRadius: 6,
                color: '#667eea',
                fontSize: isMobile ? 12 : 13,
                fontWeight: 600,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              📋 コピー
            </button>
          </div>
        </div>

        {/* ウォレットアドレス */}
        <div style={{
          marginBottom: 24,
          padding: isMobile ? 16 : 20,
          background: 'rgba(255,255,255,0.05)',
          borderRadius: 12,
          border: '1px solid rgba(255,255,255,0.1)',
        }}>
          <div style={{
            fontSize: isMobile ? 13 : 14,
            fontWeight: 600,
            marginBottom: 8,
            color: '#EAF2FF',
            opacity: 0.7,
          }}>
            ウォレットアドレス
          </div>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}>
            <div style={{
              flex: 1,
              fontSize: isMobile ? 13 : 14,
              fontFamily: 'monospace',
              color: '#EAF2FF',
              wordBreak: 'break-all',
            }}>
              {tenant.walletAddress}
            </div>
            <button
              onClick={() => copyToClipboard(tenant.walletAddress, 'アドレス')}
              style={{
                padding: '8px 12px',
                background: 'rgba(102, 126, 234, 0.2)',
                border: '1px solid rgba(102, 126, 234, 0.3)',
                borderRadius: 6,
                color: '#667eea',
                fontSize: isMobile ? 12 : 13,
                fontWeight: 600,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              📋 コピー
            </button>
          </div>
        </div>

        {/* 閉じるボタン */}
        <button
          onClick={onClose}
          style={{
            width: '100%',
            padding: isMobile ? 14 : 16,
            background: 'rgba(255,255,255,0.1)',
            border: '1px solid rgba(255,255,255,0.2)',
            borderRadius: 12,
            color: '#EAF2FF',
            fontSize: isMobile ? 15 : 16,
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.2s',
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.background = 'rgba(255,255,255,0.15)';
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.background = 'rgba(255,255,255,0.1)';
          }}
        >
          閉じる
        </button>
      </div>
    </div>
  );
}

// テナント追加モーダル
function AddTenantModal({ isMobile, onClose, onAddTenant }: {
  isMobile: boolean;
  onClose: () => void;
  onAddTenant: (tenantId: string) => void;
}) {
  const [tenantId, setTenantId] = useState('');
  const [error, setError] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [previewTenant, setPreviewTenant] = useState<any>(null);

  // テナントIDで検索（実際にはAPIやlocalStorageから取得）
  const searchTenant = async () => {
    if (!tenantId.trim()) {
      setError('テナントIDを入力してください');
      return;
    }

    setIsSearching(true);
    setError('');
    setPreviewTenant(null);

    // TODO: 実際にはAPIから取得
    // 今はモックデータで検索
    await new Promise(resolve => setTimeout(resolve, 500));

    // localStorageから検索
    const savedProfile = localStorage.getItem('tenant_profile');
    if (savedProfile) {
      const profile = JSON.parse(savedProfile);
      if (profile.tenantId === tenantId.trim()) {
        setPreviewTenant({
          tenantId: profile.tenantId,
          name: profile.tenantName,
          description: profile.description,
          thumbnail: profile.thumbnail,
          icon: '🏪',
          walletAddress: '0x1234...5678', // TODO: 実際のアドレスを取得
          kodomi: 0,
          rank: 'Bronze',
          sbtCount: 0,
        });
        setIsSearching(false);
        return;
      }
    }

    // モックデータで検索
    const mockTenants: any = {
      'TN001': { tenantId: 'TN001', name: 'カフェX', icon: '🏪', thumbnail: '', walletAddress: '0x1234...5678', kodomi: 2000, rank: 'Silver', description: 'コーヒーとスイーツのお店', sbtCount: 2 },
      'TN002': { tenantId: 'TN002', name: 'アーティストY', icon: '🎨', thumbnail: '', walletAddress: '0xabcd...ef01', kodomi: 1500, rank: 'Bronze', description: 'デジタルアート作品を展開', sbtCount: 1 },
      'TN003': { tenantId: 'TN003', name: 'ショップZ', icon: '☕', thumbnail: '', walletAddress: '0x9876...5432', kodomi: 1734, rank: 'Bronze', description: 'こだわりのコーヒー豆専門店', sbtCount: 3 },
      'TN004': { tenantId: 'TN004', name: 'クリエイターA', icon: '🎭', thumbnail: '', walletAddress: '0xfedc...ba98', kodomi: 3200, rank: 'Gold', description: '音楽とアートのクリエイター', sbtCount: 4 },
    };

    const found = mockTenants[tenantId.trim()];
    if (found) {
      setPreviewTenant(found);
    } else {
      setError('テナントが見つかりませんでした');
    }

    setIsSearching(false);
  };

  const handleAdd = () => {
    if (previewTenant) {
      onAddTenant(previewTenant);
      onClose();
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.8)',
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
          background: 'linear-gradient(135deg, #1a1a24 0%, #2d2d3d 100%)',
          borderRadius: isMobile ? 16 : 24,
          padding: isMobile ? 24 : 32,
          maxWidth: isMobile ? '100%' : 600,
          width: '100%',
          maxHeight: '90vh',
          overflow: 'auto',
          border: '1px solid rgba(255,255,255,0.1)',
          boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ヘッダー */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: isMobile ? 20 : 24,
        }}>
          <h3 style={{
            margin: 0,
            fontSize: isMobile ? 20 : 24,
            fontWeight: 700,
            color: '#EAF2FF',
          }}>
            テナントを追加
          </h3>
          <button
            onClick={onClose}
            style={{
              background: 'rgba(255,255,255,0.1)',
              border: 'none',
              borderRadius: 8,
              color: '#EAF2FF',
              fontSize: 24,
              width: 36,
              height: 36,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            ×
          </button>
        </div>

        {/* 説明 */}
        <p style={{
          margin: '0 0 20px 0',
          fontSize: isMobile ? 14 : 15,
          opacity: 0.7,
          color: '#EAF2FF',
          lineHeight: 1.6,
        }}>
          フォローしたいテナントのIDを入力してください。
        </p>

        {/* テナントID入力 */}
        <div style={{ marginBottom: 16 }}>
          <label style={{
            display: 'block',
            fontSize: isMobile ? 13 : 14,
            fontWeight: 600,
            marginBottom: 8,
            color: '#EAF2FF',
          }}>
            テナントID
          </label>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              type="text"
              value={tenantId}
              onChange={(e) => {
                setTenantId(e.target.value);
                setError('');
                setPreviewTenant(null);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  searchTenant();
                }
              }}
              placeholder="例: TN001"
              style={{
                flex: 1,
                padding: isMobile ? '10px 12px' : '12px 14px',
                background: 'rgba(255,255,255,0.05)',
                border: '2px solid rgba(255,255,255,0.2)',
                borderRadius: 8,
                color: '#EAF2FF',
                fontSize: isMobile ? 14 : 15,
              }}
            />
            <button
              onClick={searchTenant}
              disabled={isSearching}
              style={{
                padding: isMobile ? '10px 16px' : '12px 20px',
                background: isSearching ? 'rgba(102, 126, 234, 0.3)' : 'rgba(102, 126, 234, 0.5)',
                border: '1px solid rgba(102, 126, 234, 0.5)',
                borderRadius: 8,
                color: '#EAF2FF',
                fontSize: isMobile ? 14 : 15,
                fontWeight: 600,
                cursor: isSearching ? 'not-allowed' : 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              {isSearching ? '検索中...' : '🔍 検索'}
            </button>
          </div>
        </div>

        {/* エラーメッセージ */}
        {error && (
          <div style={{
            padding: isMobile ? '10px 12px' : '12px 16px',
            marginBottom: 20,
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: 8,
            color: '#ef4444',
            fontSize: isMobile ? 13 : 14,
          }}>
            ⚠️ {error}
          </div>
        )}

        {/* プレビュー */}
        {previewTenant && (
          <div style={{
            marginBottom: 24,
            padding: isMobile ? 16 : 20,
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.2)',
            borderRadius: 12,
          }}>
            <div style={{
              fontSize: isMobile ? 12 : 13,
              fontWeight: 600,
              marginBottom: 12,
              color: '#EAF2FF',
              opacity: 0.7,
            }}>
              プレビュー
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              {previewTenant.thumbnail ? (
                <img
                  src={previewTenant.thumbnail}
                  alt={previewTenant.name}
                  style={{
                    width: isMobile ? 60 : 72,
                    height: isMobile ? 60 : 72,
                    borderRadius: 8,
                    objectFit: 'cover',
                    border: '2px solid rgba(255,255,255,0.2)',
                  }}
                />
              ) : (
                <div style={{
                  width: isMobile ? 60 : 72,
                  height: isMobile ? 60 : 72,
                  borderRadius: 8,
                  background: 'rgba(255,255,255,0.1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 32,
                  border: '2px solid rgba(255,255,255,0.2)',
                }}>
                  {previewTenant.icon}
                </div>
              )}
              <div style={{ flex: 1 }}>
                <div style={{
                  fontSize: isMobile ? 16 : 18,
                  fontWeight: 700,
                  marginBottom: 4,
                  color: '#EAF2FF',
                }}>
                  {previewTenant.name}
                </div>
                <div style={{
                  fontSize: isMobile ? 12 : 13,
                  opacity: 0.6,
                  marginBottom: 4,
                  fontFamily: 'monospace',
                  color: '#EAF2FF',
                }}>
                  {previewTenant.tenantId}
                </div>
                {previewTenant.description && (
                  <div style={{
                    fontSize: isMobile ? 12 : 13,
                    opacity: 0.7,
                    color: '#EAF2FF',
                  }}>
                    {previewTenant.description}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ボタン */}
        <div style={{
          display: 'flex',
          gap: 12,
        }}>
          <button
            onClick={onClose}
            style={{
              flex: 1,
              padding: isMobile ? 14 : 16,
              background: 'rgba(255,255,255,0.1)',
              border: '1px solid rgba(255,255,255,0.2)',
              borderRadius: 12,
              color: '#EAF2FF',
              fontSize: isMobile ? 15 : 16,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            キャンセル
          </button>
          <button
            onClick={handleAdd}
            disabled={!previewTenant}
            style={{
              flex: 1,
              padding: isMobile ? 14 : 16,
              background: previewTenant ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : 'rgba(255,255,255,0.1)',
              border: 'none',
              borderRadius: 12,
              color: '#ffffff',
              fontSize: isMobile ? 15 : 16,
              fontWeight: 700,
              cursor: previewTenant ? 'pointer' : 'not-allowed',
              opacity: previewTenant ? 1 : 0.5,
            }}
          >
            追加する
          </button>
        </div>
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
      <p style={{ fontSize: isMobile ? 13 : 14, color: '#4a5568', margin: 0 }}>
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
  const [selectedTenant, setSelectedTenant] = useState<any>(null);

  // TODO: 実データから取得（複数テナントを運営している場合）
  const myTenants = [
    { tenantId: 'TN001', name: '本店カフェX', icon: '🏪', thumbnail: '', kodomi: 2000, rank: 'Silver', description: '本店のカフェです', walletAddress: '0x1234...5678', sbtCount: 5, totalReceived: 50000 },
    { tenantId: 'TN005', name: '2号店カフェX新宿', icon: '🏪', thumbnail: '', kodomi: 1200, rank: 'Bronze', description: '新宿2号店', walletAddress: '0xabcd...ef01', sbtCount: 3, totalReceived: 25000 },
  ];

  return (
    <>
      {/* 受取タンク */}
      <ReceiveTank isMobile={isMobile} />

      {/* テナント一覧 */}
      <div style={{ marginBottom: isMobile ? 40 : 60 }}>
        <h2 style={{
          margin: '0 0 20px 0',
          fontSize: isMobile ? 18 : 22,
          fontWeight: 700,
        }}>
          管理中のテナント
        </h2>
        <div style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(280px, 1fr))',
          gap: isMobile ? 12 : 16,
        }}>
          {myTenants.map((tenant, i) => (
            <button
              key={i}
              onClick={() => setSelectedTenant(tenant)}
              style={{
                background: 'linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%)',
                border: '1px solid rgba(0,0,0,0.08)',
                borderRadius: isMobile ? 12 : 16,
                padding: isMobile ? 16 : 20,
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                cursor: 'pointer',
                transition: 'all 0.2s',
                textAlign: 'left',
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.transform = 'translateY(-4px)';
                e.currentTarget.style.boxShadow = '0 6px 16px rgba(59, 130, 246, 0.3)';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)';
              }}
            >
              {tenant.thumbnail ? (
                <img
                  src={tenant.thumbnail}
                  alt={tenant.name}
                  style={{
                    width: '100%',
                    height: isMobile ? 140 : 160,
                    objectFit: 'cover',
                    borderRadius: 8,
                    marginBottom: 16,
                    border: '2px solid rgba(255,255,255,0.2)',
                  }}
                />
              ) : (
                <div style={{
                  width: '100%',
                  height: isMobile ? 140 : 160,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 56,
                  marginBottom: 16,
                  background: 'rgba(255,255,255,0.1)',
                  borderRadius: 8,
                  border: '2px solid rgba(255,255,255,0.2)',
                }}>
                  {tenant.icon}
                </div>
              )}
              <h3 style={{
                margin: '0 0 8px 0',
                fontSize: isMobile ? 16 : 18,
                fontWeight: 700,
                color: '#ffffff',
              }}>
                {tenant.name}
              </h3>
              <div style={{
                fontSize: isMobile ? 12 : 13,
                opacity: 0.7,
                marginBottom: 12,
                fontFamily: 'monospace',
                color: '#ffffff',
              }}>
                {tenant.tenantId}
              </div>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 8,
              }}>
                <div>
                  <div style={{
                    fontSize: isMobile ? 11 : 12,
                    opacity: 0.6,
                    marginBottom: 2,
                    color: '#ffffff',
                  }}>
                    総受取
                  </div>
                  <div style={{
                    fontSize: isMobile ? 18 : 20,
                    fontWeight: 900,
                    color: '#ffffff',
                  }}>
                    {tenant.totalReceived?.toLocaleString() || 0}
                  </div>
                  <div style={{
                    fontSize: isMobile ? 10 : 11,
                    opacity: 0.5,
                    color: '#ffffff',
                  }}>
                    JPYC
                  </div>
                </div>
                <div style={{
                  padding: '6px 14px',
                  background: 'rgba(255, 215, 0, 0.2)',
                  border: '1px solid rgba(255, 215, 0, 0.4)',
                  borderRadius: 999,
                  fontSize: isMobile ? 11 : 12,
                  fontWeight: 600,
                  color: '#ffd700',
                }}>
                  {tenant.rank}
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

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
          <h3 style={{ margin: '0 0 12px 0', fontSize: isMobile ? 16 : 18, fontWeight: 700, color: '#ffffff' }}>
            キャンペーン稼働状況
          </h3>
          <p style={{ fontSize: isMobile ? 13 : 14, opacity: 0.6, color: '#ffffff' }}>
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
          <h3 style={{ margin: '0 0 12px 0', fontSize: isMobile ? 16 : 18, fontWeight: 700, color: '#ffffff' }}>
            サポーター動向
          </h3>
          <p style={{ fontSize: isMobile ? 13 : 14, opacity: 0.6, color: '#ffffff' }}>
            詳細はAdminで確認
          </p>
        </div>
      </div>

      {/* テナント詳細モーダル */}
      {selectedTenant && (
        <TenantDetailModal
          isMobile={isMobile}
          tenant={selectedTenant}
          onClose={() => setSelectedTenant(null)}
        />
      )}
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
