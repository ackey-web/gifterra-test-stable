// src/pages/MypageWithSend.tsx
// JPYC送金機能付きマイページ

import { useState, useEffect } from 'react';
import { usePrivy, useWallets } from '@privy-io/react-auth';
import { ethers } from 'ethers';
import { useTokenBalances } from '../hooks/useTokenBalances';
import { useTransactionHistory } from '../hooks/useTransactionHistory';
import { QRScannerSimple } from '../components/QRScannerSimple';
import { JPYC_TOKEN, ERC20_MIN_ABI } from '../contract';

// 送金タイプ定義
type SendMode = 'simple' | 'bulk' | 'tenant';

export function MypageWithSend() {
  const { ready, authenticated, login, logout, user } = usePrivy();
  const { wallets } = useWallets();
  const [signer, setSigner] = useState<ethers.Signer | null>(null);
  const [address, setAddress] = useState<string | undefined>(undefined);

  // 送金関連の状態
  const [showSendModeModal, setShowSendModeModal] = useState(false);
  const [sendMode, setSendMode] = useState<SendMode | null>(null);
  const [showSendModal, setShowSendModal] = useState(false);
  const [showQRScanner, setShowQRScanner] = useState(false);
  const [sendTo, setSendTo] = useState('');
  const [sendAmount, setSendAmount] = useState('');
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [sendSuccess, setSendSuccess] = useState(false);

  // Privyウォレットからsignerを取得
  useEffect(() => {
    async function setupSigner() {
      if (!wallets || wallets.length === 0) {
        setSigner(null);
        setAddress(undefined);
        return;
      }

      try {
        const wallet = wallets[0];
        const provider = await wallet.getEthereumProvider();
        const ethersProvider = new ethers.providers.Web3Provider(provider, 'any');
        const ethersSigner = ethersProvider.getSigner();
        const addr = await ethersSigner.getAddress();

        setSigner(ethersSigner);
        setAddress(addr);
      } catch (error) {
        console.error('Failed to setup signer:', error);
        setSigner(null);
        setAddress(undefined);
      }
    }

    if (authenticated) {
      setupSigner();
    }
  }, [authenticated, wallets]);

  // トークン残高を取得
  const { balances, refetch: refetchBalances } = useTokenBalances(address, signer);

  // トランザクション履歴を取得
  const { transactions, loading: historyLoading } = useTransactionHistory(address);

  // JPYC送金処理
  const handleSend = async () => {
    if (!signer || !address) {
      setSendError('ウォレットに接続してください');
      return;
    }

    if (!sendTo || !sendAmount) {
      setSendError('送金先と金額を入力してください');
      return;
    }

    // アドレスのバリデーション
    if (!/^0x[a-fA-F0-9]{40}$/.test(sendTo)) {
      setSendError('無効な送金先アドレスです');
      return;
    }

    // 金額のバリデーション
    const amount = parseFloat(sendAmount);
    if (isNaN(amount) || amount <= 0) {
      setSendError('無効な金額です');
      return;
    }

    // 残高チェック
    const jpycBalance = parseFloat(balances.jpyc.formatted);
    if (amount > jpycBalance) {
      setSendError(`残高不足です（残高: ${jpycBalance} JPYC）`);
      return;
    }

    try {
      setSending(true);
      setSendError(null);

      // JPYC コントラクト
      const jpycContract = new ethers.Contract(
        JPYC_TOKEN.ADDRESS,
        ERC20_MIN_ABI,
        signer
      );

      // 金額をWei単位に変換（18 decimals）
      const amountWei = ethers.utils.parseUnits(sendAmount, 18);

      // 送金トランザクション
      const tx = await jpycContract.transfer(sendTo, amountWei);
      console.log('Transaction sent:', tx.hash);

      // トランザクション完了を待つ
      await tx.wait();
      console.log('Transaction confirmed');

      setSendSuccess(true);
      setSendTo('');
      setSendAmount('');

      // 残高を更新
      setTimeout(() => {
        refetchBalances();
      }, 2000);

      // 3秒後にモーダルを閉じる
      setTimeout(() => {
        setShowSendModal(false);
        setSendSuccess(false);
      }, 3000);

    } catch (error: any) {
      console.error('Send error:', error);
      setSendError(error.message || '送金に失敗しました');
    } finally {
      setSending(false);
    }
  };

  // QRスキャン結果を受け取る
  const handleQRScan = (data: string) => {
    setSendTo(data);
    setShowQRScanner(false);
  };

  // 未認証の場合
  if (!ready || !authenticated) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        padding: '20px',
      }}>
        <div style={{
          background: '#ffffff',
          borderRadius: '24px',
          padding: '48px 40px',
          maxWidth: '500px',
          width: '100%',
          boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
          textAlign: 'center',
        }}>
          <h1 style={{ fontSize: 32, fontWeight: 700, color: '#1a1a1a', marginBottom: 16 }}>
            🎁 GIFTERRA マイページ
          </h1>
          <p style={{ fontSize: 16, color: '#4a5568', marginBottom: 32 }}>
            マイページを表示するにはログインが必要です
          </p>
          <button
            onClick={login}
            style={{
              width: '100%',
              padding: '16px',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              border: 'none',
              borderRadius: '12px',
              color: '#ffffff',
              fontSize: 18,
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            }}
          >
            ログイン
          </button>
        </div>
      </div>
    );
  }

  // 認証済み - マイページ表示
  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      padding: '20px',
    }}>
      <div style={{
        maxWidth: '1200px',
        margin: '0 auto',
      }}>
        {/* ヘッダー */}
        <div style={{
          background: '#ffffff',
          borderRadius: '16px',
          padding: '24px',
          marginBottom: '20px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 700, color: '#1a1a1a', margin: 0 }}>
              🎁 マイページ
            </h1>
            <p style={{ fontSize: 14, color: '#718096', margin: '8px 0 0 0' }}>
              {user?.email?.address || user?.google?.email || 'ゲストユーザー'}
            </p>
          </div>
          <button
            onClick={logout}
            style={{
              padding: '12px 24px',
              background: '#e53e3e',
              border: 'none',
              borderRadius: '8px',
              color: '#ffffff',
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            ログアウト
          </button>
        </div>

        {/* ウォレットアドレス */}
        {address && (
          <div style={{
            background: '#ffffff',
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '20px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
          }}>
            <h2 style={{ fontSize: 18, fontWeight: 600, color: '#1a1a1a', margin: '0 0 12px 0' }}>
              💳 ウォレットアドレス
            </h2>
            <div style={{
              padding: '16px',
              background: '#f7fafc',
              borderRadius: '8px',
              fontFamily: 'monospace',
              fontSize: 14,
              color: '#2d3748',
              wordBreak: 'break-all',
            }}>
              {address}
            </div>
          </div>
        )}

        {/* トークン残高 */}
        <div style={{
          background: '#ffffff',
          borderRadius: '16px',
          padding: '24px',
          marginBottom: '20px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
        }}>
          <h2 style={{ fontSize: 18, fontWeight: 600, color: '#1a1a1a', margin: '0 0 16px 0' }}>
            💰 トークン残高
          </h2>
          <div style={{ display: 'grid', gap: '12px' }}>
            {/* JPYC */}
            <div style={{
              padding: '16px',
              background: balances.jpyc.loading ? '#f7fafc' : '#eff6ff',
              borderRadius: '8px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}>
              <span style={{ fontSize: 16, fontWeight: 600, color: '#2d3748' }}>JPYC</span>
              <span style={{ fontSize: 18, fontWeight: 700, color: '#2563eb' }}>
                {balances.jpyc.loading ? '読込中...' : `${balances.jpyc.formatted} JPYC`}
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
            <button
              onClick={refetchBalances}
              style={{
                flex: 1,
                padding: '12px',
                background: '#e2e8f0',
                border: 'none',
                borderRadius: '8px',
                color: '#2d3748',
                fontSize: 14,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              🔄 残高を更新
            </button>
            <button
              onClick={() => setShowSendModeModal(true)}
              style={{
                flex: 1,
                padding: '12px',
                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                border: 'none',
                borderRadius: '8px',
                color: '#ffffff',
                fontSize: 14,
                fontWeight: 600,
                cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
              }}
            >
              💸 送金タイプを選択
            </button>
          </div>
        </div>

        {/* トランザクション履歴 */}
        <div style={{
          background: '#ffffff',
          borderRadius: '16px',
          padding: '24px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
        }}>
          <h2 style={{ fontSize: 18, fontWeight: 600, color: '#1a1a1a', margin: '0 0 16px 0' }}>
            📜 トランザクション履歴（最新20件）
          </h2>

          {historyLoading ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#718096' }}>
              読込中...
            </div>
          ) : transactions.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#718096' }}>
              トランザクション履歴がありません
            </div>
          ) : (
            <div style={{ display: 'grid', gap: '12px' }}>
              {transactions.map((tx, index) => (
                <div
                  key={`${tx.hash}-${index}`}
                  style={{
                    padding: '16px',
                    background: tx.type === 'receive' ? '#ecfdf5' : '#fef3c7',
                    borderRadius: '8px',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                    <span style={{
                      fontSize: 14,
                      fontWeight: 600,
                      color: tx.type === 'receive' ? '#059669' : '#d97706',
                    }}>
                      {tx.type === 'receive' ? '📥 受取' : '📤 送信'}
                    </span>
                    <span style={{ fontSize: 12, color: '#718096' }}>
                      {new Date(tx.timestamp * 1000).toLocaleString('ja-JP')}
                    </span>
                  </div>
                  <div style={{ fontSize: 14, color: '#2d3748', marginBottom: 4 }}>
                    <strong>{parseFloat(tx.value).toFixed(4)} {tx.tokenSymbol}</strong>
                  </div>
                  <div style={{ fontSize: 12, color: '#718096', fontFamily: 'monospace' }}>
                    {tx.type === 'receive' ? 'From:' : 'To:'} {tx.type === 'receive' ? tx.from.slice(0, 10) : tx.to.slice(0, 10)}...
                  </div>
                  <a
                    href={`https://polygonscan.com/tx/${tx.hash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      fontSize: 12,
                      color: '#667eea',
                      textDecoration: 'none',
                      marginTop: 8,
                      display: 'inline-block',
                    }}
                  >
                    🔗 PolygonScanで確認
                  </a>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* フッター */}
        <div style={{
          marginTop: '32px',
          textAlign: 'center',
          color: '#ffffff',
          fontSize: 12,
        }}>
          <div>Powered by <strong>GIFTERRA</strong></div>
          <div>Produced by <strong>METATRON</strong></div>
        </div>
      </div>

      {/* 送金タイプ選択モーダル */}
      {showSendModeModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'rgba(0,0,0,0.8)',
          backdropFilter: 'blur(4px)',
        }}>
          <div style={{
            background: '#ffffff',
            borderRadius: '16px',
            padding: '32px',
            maxWidth: '600px',
            width: '90%',
            boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
          }}>
            <h2 style={{
              fontSize: 22,
              fontWeight: 700,
              color: '#1a1a1a',
              marginBottom: 8,
              textAlign: 'center',
            }}>
              💸 送金タイプを選択
            </h2>
            <p style={{
              fontSize: 14,
              color: '#718096',
              textAlign: 'center',
              marginBottom: 24,
            }}>
              送金方法を選んでください
            </p>

            <div style={{ display: 'grid', gap: '16px', marginBottom: 24 }}>
              {/* シンプル送金 */}
              <button
                onClick={() => {
                  setSendMode('simple');
                  setShowSendModeModal(false);
                  setShowSendModal(true);
                }}
                style={{
                  padding: '20px',
                  background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                  border: 'none',
                  borderRadius: '12px',
                  color: '#ffffff',
                  cursor: 'pointer',
                  textAlign: 'left',
                  boxShadow: '0 4px 12px rgba(16,185,129,0.3)',
                }}
              >
                <div style={{ fontSize: 32, marginBottom: 8 }}>💸</div>
                <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 4 }}>
                  シンプル送金
                </div>
                <div style={{ fontSize: 14, opacity: 0.9, marginBottom: 8 }}>
                  個人アドレスへ自由に送金
                </div>
                <div style={{ fontSize: 12, opacity: 0.8 }}>
                  • 自由なアドレス入力<br />
                  • kodomi記録なし<br />
                  • メッセージ任意
                </div>
              </button>

              {/* 一括送金 */}
              <button
                onClick={() => {
                  alert('一括送金機能は次のフェーズで実装予定です');
                }}
                style={{
                  padding: '20px',
                  background: '#e2e8f0',
                  border: 'none',
                  borderRadius: '12px',
                  color: '#718096',
                  cursor: 'not-allowed',
                  textAlign: 'left',
                }}
              >
                <div style={{ fontSize: 32, marginBottom: 8 }}>📤</div>
                <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 4 }}>
                  一括送金（準備中）
                </div>
                <div style={{ fontSize: 14, marginBottom: 8 }}>
                  複数人へ同時に送金
                </div>
                <div style={{ fontSize: 12, opacity: 0.7 }}>
                  • 複数アドレス対応<br />
                  • シンプルな操作<br />
                  • 効率的な送金
                </div>
              </button>

              {/* テナントへチップ */}
              <button
                onClick={() => {
                  alert('テナントチップ機能は次のフェーズで実装予定です');
                }}
                style={{
                  padding: '20px',
                  background: '#e2e8f0',
                  border: 'none',
                  borderRadius: '12px',
                  color: '#718096',
                  cursor: 'not-allowed',
                  textAlign: 'left',
                }}
              >
                <div style={{ fontSize: 32, marginBottom: 8 }}>🎁</div>
                <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 4 }}>
                  テナントへチップ（準備中）
                </div>
                <div style={{ fontSize: 14, marginBottom: 8 }}>
                  テナントを選んで応援
                </div>
                <div style={{ fontSize: 12, opacity: 0.7 }}>
                  • テナント一覧から選択<br />
                  • kodomi（貢献熱量ポイント）が記録される<br />
                  • 各テナントごとの特典配布が受けられる<br />
                  • メッセージ推奨
                </div>
              </button>
            </div>

            <button
              onClick={() => setShowSendModeModal(false)}
              style={{
                width: '100%',
                padding: '14px',
                background: '#e2e8f0',
                border: 'none',
                borderRadius: '8px',
                color: '#2d3748',
                fontSize: 16,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              キャンセル
            </button>
          </div>
        </div>
      )}

      {/* 送金モーダル */}
      {showSendModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'rgba(0,0,0,0.8)',
          backdropFilter: 'blur(4px)',
        }}>
          <div style={{
            background: '#ffffff',
            borderRadius: '16px',
            padding: '32px',
            maxWidth: '500px',
            width: '90%',
            boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
          }}>
            <h2 style={{
              fontSize: 20,
              fontWeight: 700,
              color: '#1a1a1a',
              marginBottom: 16,
              textAlign: 'center',
            }}>
              💸 JPYC送金
            </h2>

            {sendSuccess ? (
              <div style={{
                textAlign: 'center',
                padding: '40px 20px',
              }}>
                <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
                <p style={{ fontSize: 18, color: '#059669', fontWeight: 600 }}>
                  送金が完了しました！
                </p>
              </div>
            ) : (
              <>
                <div style={{ marginBottom: 16 }}>
                  <label style={{
                    display: 'block',
                    fontSize: 14,
                    fontWeight: 600,
                    color: '#2d3748',
                    marginBottom: 8,
                  }}>
                    送金先アドレス
                  </label>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input
                      type="text"
                      value={sendTo}
                      onChange={(e) => setSendTo(e.target.value)}
                      placeholder="0x..."
                      style={{
                        flex: 1,
                        padding: '12px',
                        fontSize: 14,
                        fontFamily: 'monospace',
                        border: '2px solid #e2e8f0',
                        borderRadius: '8px',
                        outline: 'none',
                      }}
                    />
                    <button
                      onClick={() => setShowQRScanner(true)}
                      style={{
                        padding: '12px 16px',
                        background: '#e2e8f0',
                        border: 'none',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        fontSize: 18,
                      }}
                    >
                      📷
                    </button>
                  </div>
                </div>

                <div style={{ marginBottom: 16 }}>
                  <label style={{
                    display: 'block',
                    fontSize: 14,
                    fontWeight: 600,
                    color: '#2d3748',
                    marginBottom: 8,
                  }}>
                    金額（JPYC）
                  </label>
                  <input
                    type="number"
                    value={sendAmount}
                    onChange={(e) => setSendAmount(e.target.value)}
                    placeholder="0.00"
                    step="0.01"
                    min="0"
                    style={{
                      width: '100%',
                      padding: '12px',
                      fontSize: 14,
                      border: '2px solid #e2e8f0',
                      borderRadius: '8px',
                      outline: 'none',
                    }}
                  />
                  <p style={{
                    fontSize: 12,
                    color: '#718096',
                    marginTop: 4,
                  }}>
                    残高: {balances.jpyc.formatted} JPYC
                  </p>
                </div>

                {sendError && (
                  <div style={{
                    padding: '12px',
                    background: '#fee2e2',
                    border: '1px solid #ef4444',
                    borderRadius: '8px',
                    color: '#991b1b',
                    fontSize: 14,
                    marginBottom: 16,
                  }}>
                    {sendError}
                  </div>
                )}

                <div style={{ display: 'flex', gap: 12 }}>
                  <button
                    onClick={() => {
                      setShowSendModal(false);
                      setSendTo('');
                      setSendAmount('');
                      setSendError(null);
                    }}
                    disabled={sending}
                    style={{
                      flex: 1,
                      padding: '14px',
                      background: '#e2e8f0',
                      border: 'none',
                      borderRadius: '8px',
                      color: '#2d3748',
                      fontSize: 16,
                      fontWeight: 600,
                      cursor: sending ? 'not-allowed' : 'pointer',
                      opacity: sending ? 0.5 : 1,
                    }}
                  >
                    キャンセル
                  </button>
                  <button
                    onClick={handleSend}
                    disabled={sending}
                    style={{
                      flex: 1,
                      padding: '14px',
                      background: sending ? '#9ca3af' : 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                      border: 'none',
                      borderRadius: '8px',
                      color: '#ffffff',
                      fontSize: 16,
                      fontWeight: 600,
                      cursor: sending ? 'not-allowed' : 'pointer',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                    }}
                  >
                    {sending ? '送金中...' : '送金'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* QRスキャナー */}
      {showQRScanner && (
        <QRScannerSimple
          onScan={handleQRScan}
          onClose={() => setShowQRScanner(false)}
          placeholder="送金先アドレスを入力"
        />
      )}
    </div>
  );
}
