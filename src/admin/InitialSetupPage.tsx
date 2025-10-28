// src/admin/InitialSetupPage.tsx
import React, { useState, useEffect } from 'react';

interface TenantConfig {
  paymentSplitterAddress: string;
  tipReceiverWallet: string;
  tenantName: string;
  tenantDescription: string;
  platformFeePercentage: number;
}

export default function InitialSetupPage() {
  const [config, setConfig] = useState<TenantConfig>({
    paymentSplitterAddress: '',
    tipReceiverWallet: '',
    tenantName: '',
    tenantDescription: '',
    platformFeePercentage: 5,
  });

  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // ローカルストレージから設定を読み込み
  useEffect(() => {
    try {
      const savedConfig = localStorage.getItem('gifterra_tenant_config');
      if (savedConfig) {
        const parsed = JSON.parse(savedConfig);
        setConfig(parsed);
      }
    } catch (error) {
      console.error('Failed to load config:', error);
    }
  }, []);

  // 設定を保存
  const handleSave = async () => {
    setIsSaving(true);
    setSaveMessage(null);

    try {
      // バリデーション
      if (!config.paymentSplitterAddress || !/^0x[a-fA-F0-9]{40}$/.test(config.paymentSplitterAddress)) {
        throw new Error('有効なPaymentSplitterアドレスを入力してください');
      }

      if (!config.tipReceiverWallet || !/^0x[a-fA-F0-9]{40}$/.test(config.tipReceiverWallet)) {
        throw new Error('有効なTIP受取ウォレットアドレスを入力してください');
      }

      if (!config.tenantName.trim()) {
        throw new Error('テナント名を入力してください');
      }

      if (config.platformFeePercentage < 0 || config.platformFeePercentage > 100) {
        throw new Error('プラットフォーム手数料は0-100%の範囲で設定してください');
      }

      // ローカルストレージに保存
      localStorage.setItem('gifterra_tenant_config', JSON.stringify(config));

      // TODO: 将来的にはSupabaseなどのバックエンドに保存
      // await saveTenantConfig(config);

      setSaveMessage({ type: 'success', text: '設定を保存しました' });

      // 3秒後にメッセージを消す
      setTimeout(() => setSaveMessage(null), 3000);
    } catch (error) {
      console.error('Failed to save config:', error);
      setSaveMessage({
        type: 'error',
        text: error instanceof Error ? error.message : '設定の保存に失敗しました'
      });
    } finally {
      setIsSaving(false);
    }
  };

  // 設定をリセット
  const handleReset = () => {
    if (confirm('設定をリセットしてもよろしいですか？')) {
      const defaultConfig: TenantConfig = {
        paymentSplitterAddress: '',
        tipReceiverWallet: '',
        tenantName: '',
        tenantDescription: '',
        platformFeePercentage: 5,
      };
      setConfig(defaultConfig);
      localStorage.removeItem('gifterra_tenant_config');
      setSaveMessage({ type: 'success', text: '設定をリセットしました' });
      setTimeout(() => setSaveMessage(null), 3000);
    }
  };

  return (
    <div style={{
      padding: 24,
      maxWidth: 900,
      margin: '0 auto',
      color: '#fff'
    }}>
      {/* ヘッダー */}
      <div style={{ marginBottom: 32 }}>
        <h1 style={{
          fontSize: 28,
          fontWeight: 800,
          marginBottom: 8,
          display: 'flex',
          alignItems: 'center',
          gap: 12
        }}>
          <span>⚙️</span>
          <span>初期設定</span>
        </h1>
        <p style={{
          fontSize: 14,
          color: 'rgba(255,255,255,0.6)',
          lineHeight: 1.6
        }}>
          テナント運用に必要な基本設定を行います。すべての項目を正確に入力してください。
        </p>
      </div>

      {/* 保存メッセージ */}
      {saveMessage && (
        <div style={{
          padding: '12px 16px',
          borderRadius: 8,
          marginBottom: 24,
          background: saveMessage.type === 'success'
            ? 'rgba(34, 197, 94, 0.2)'
            : 'rgba(239, 68, 68, 0.2)',
          border: `1px solid ${saveMessage.type === 'success' ? '#22c55e' : '#ef4444'}`,
          color: saveMessage.type === 'success' ? '#86efac' : '#fca5a5',
          fontSize: 14,
          display: 'flex',
          alignItems: 'center',
          gap: 8
        }}>
          <span>{saveMessage.type === 'success' ? '✅' : '❌'}</span>
          <span>{saveMessage.text}</span>
        </div>
      )}

      {/* 設定フォーム */}
      <div style={{
        background: 'rgba(255,255,255,0.05)',
        borderRadius: 12,
        padding: 24,
        border: '1px solid rgba(255,255,255,0.1)'
      }}>
        {/* テナント基本情報 */}
        <section style={{ marginBottom: 32 }}>
          <h2 style={{
            fontSize: 18,
            fontWeight: 700,
            marginBottom: 16,
            display: 'flex',
            alignItems: 'center',
            gap: 8
          }}>
            <span>🏢</span>
            <span>テナント基本情報</span>
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* テナント名 */}
            <div>
              <label style={{
                display: 'block',
                fontSize: 13,
                fontWeight: 600,
                marginBottom: 8,
                color: 'rgba(255,255,255,0.9)'
              }}>
                テナント名 <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <input
                type="text"
                value={config.tenantName}
                onChange={(e) => setConfig({ ...config, tenantName: e.target.value })}
                placeholder="例: カフェ テラス"
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  background: 'rgba(0,0,0,0.3)',
                  border: '1px solid rgba(255,255,255,0.2)',
                  borderRadius: 6,
                  color: '#fff',
                  fontSize: 14,
                  outline: 'none'
                }}
              />
            </div>

            {/* テナント説明 */}
            <div>
              <label style={{
                display: 'block',
                fontSize: 13,
                fontWeight: 600,
                marginBottom: 8,
                color: 'rgba(255,255,255,0.9)'
              }}>
                テナント説明
              </label>
              <textarea
                value={config.tenantDescription}
                onChange={(e) => setConfig({ ...config, tenantDescription: e.target.value })}
                placeholder="テナントの説明や特徴を入力してください"
                rows={3}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  background: 'rgba(0,0,0,0.3)',
                  border: '1px solid rgba(255,255,255,0.2)',
                  borderRadius: 6,
                  color: '#fff',
                  fontSize: 14,
                  outline: 'none',
                  resize: 'vertical',
                  fontFamily: 'inherit'
                }}
              />
            </div>
          </div>
        </section>

        {/* ブロックチェーン設定 */}
        <section style={{ marginBottom: 32 }}>
          <h2 style={{
            fontSize: 18,
            fontWeight: 700,
            marginBottom: 16,
            display: 'flex',
            alignItems: 'center',
            gap: 8
          }}>
            <span>🔗</span>
            <span>ブロックチェーン設定</span>
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* PaymentSplitter アドレス */}
            <div>
              <label style={{
                display: 'block',
                fontSize: 13,
                fontWeight: 600,
                marginBottom: 8,
                color: 'rgba(255,255,255,0.9)'
              }}>
                PaymentSplitter コントラクトアドレス <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <input
                type="text"
                value={config.paymentSplitterAddress}
                onChange={(e) => setConfig({ ...config, paymentSplitterAddress: e.target.value })}
                placeholder="0x..."
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  background: 'rgba(0,0,0,0.3)',
                  border: '1px solid rgba(255,255,255,0.2)',
                  borderRadius: 6,
                  color: '#fff',
                  fontSize: 14,
                  fontFamily: 'monospace',
                  outline: 'none'
                }}
              />
              <p style={{
                fontSize: 12,
                color: 'rgba(255,255,255,0.5)',
                marginTop: 6,
                lineHeight: 1.5
              }}>
                TIPの収益分配を管理するスマートコントラクトのアドレスです。
              </p>
            </div>

            {/* TIP受取ウォレット */}
            <div>
              <label style={{
                display: 'block',
                fontSize: 13,
                fontWeight: 600,
                marginBottom: 8,
                color: 'rgba(255,255,255,0.9)'
              }}>
                TIP 受取ウォレットアドレス <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <input
                type="text"
                value={config.tipReceiverWallet}
                onChange={(e) => setConfig({ ...config, tipReceiverWallet: e.target.value })}
                placeholder="0x..."
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  background: 'rgba(0,0,0,0.3)',
                  border: '1px solid rgba(255,255,255,0.2)',
                  borderRadius: 6,
                  color: '#fff',
                  fontSize: 14,
                  fontFamily: 'monospace',
                  outline: 'none'
                }}
              />
              <p style={{
                fontSize: 12,
                color: 'rgba(255,255,255,0.5)',
                marginTop: 6,
                lineHeight: 1.5
              }}>
                受け取ったTIPが送金されるウォレットアドレスです。
              </p>
            </div>
          </div>
        </section>

        {/* 手数料設定 */}
        <section style={{ marginBottom: 32 }}>
          <h2 style={{
            fontSize: 18,
            fontWeight: 700,
            marginBottom: 16,
            display: 'flex',
            alignItems: 'center',
            gap: 8
          }}>
            <span>💰</span>
            <span>手数料設定</span>
          </h2>

          <div>
            <label style={{
              display: 'block',
              fontSize: 13,
              fontWeight: 600,
              marginBottom: 8,
              color: 'rgba(255,255,255,0.9)'
            }}>
              プラットフォーム手数料 (%)
            </label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <input
                type="range"
                min="0"
                max="20"
                step="0.5"
                value={config.platformFeePercentage}
                onChange={(e) => setConfig({ ...config, platformFeePercentage: parseFloat(e.target.value) })}
                style={{
                  flex: 1,
                  accentColor: '#8b5cf6'
                }}
              />
              <input
                type="number"
                min="0"
                max="20"
                step="0.5"
                value={config.platformFeePercentage}
                onChange={(e) => setConfig({ ...config, platformFeePercentage: parseFloat(e.target.value) || 0 })}
                style={{
                  width: 80,
                  padding: '8px 12px',
                  background: 'rgba(0,0,0,0.3)',
                  border: '1px solid rgba(255,255,255,0.2)',
                  borderRadius: 6,
                  color: '#fff',
                  fontSize: 14,
                  textAlign: 'center',
                  outline: 'none'
                }}
              />
              <span style={{ fontSize: 14, color: 'rgba(255,255,255,0.7)' }}>%</span>
            </div>
            <p style={{
              fontSize: 12,
              color: 'rgba(255,255,255,0.5)',
              marginTop: 6,
              lineHeight: 1.5
            }}>
              TIP金額からプラットフォームが受け取る手数料の割合です。推奨: 5%
            </p>
          </div>
        </section>

        {/* アクションボタン */}
        <div style={{
          display: 'flex',
          gap: 12,
          justifyContent: 'flex-end',
          paddingTop: 16,
          borderTop: '1px solid rgba(255,255,255,0.1)'
        }}>
          <button
            onClick={handleReset}
            disabled={isSaving}
            style={{
              padding: '10px 20px',
              background: 'rgba(239, 68, 68, 0.2)',
              border: '1px solid #ef4444',
              borderRadius: 6,
              color: '#fca5a5',
              fontSize: 14,
              fontWeight: 600,
              cursor: isSaving ? 'not-allowed' : 'pointer',
              opacity: isSaving ? 0.5 : 1,
              transition: 'all 0.2s ease'
            }}
          >
            リセット
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            style={{
              padding: '10px 24px',
              background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
              border: 'none',
              borderRadius: 6,
              color: '#fff',
              fontSize: 14,
              fontWeight: 600,
              cursor: isSaving ? 'not-allowed' : 'pointer',
              opacity: isSaving ? 0.6 : 1,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              transition: 'all 0.2s ease'
            }}
          >
            {isSaving ? (
              <>
                <span style={{
                  display: 'inline-block',
                  width: 12,
                  height: 12,
                  border: '2px solid rgba(255,255,255,0.3)',
                  borderTopColor: '#fff',
                  borderRadius: '50%',
                  animation: 'spin 0.8s linear infinite'
                }} />
                <span>保存中...</span>
              </>
            ) : (
              <>
                <span>💾</span>
                <span>設定を保存</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* 注意事項 */}
      <div style={{
        marginTop: 24,
        padding: 16,
        background: 'rgba(245, 158, 11, 0.1)',
        border: '1px solid rgba(245, 158, 11, 0.3)',
        borderRadius: 8,
        fontSize: 13,
        color: 'rgba(255,255,255,0.8)',
        lineHeight: 1.6
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: 8,
          marginBottom: 8
        }}>
          <span style={{ fontSize: 16 }}>⚠️</span>
          <strong style={{ fontWeight: 700 }}>重要な注意事項</strong>
        </div>
        <ul style={{
          margin: '8px 0 0 24px',
          paddingLeft: 0,
          listStyle: 'disc'
        }}>
          <li>コントラクトアドレスは一度設定すると変更が困難です。慎重に入力してください。</li>
          <li>TIP受取ウォレットは、秘密鍵を厳重に管理しているウォレットを使用してください。</li>
          <li>現在の設定はブラウザのローカルストレージに保存されます。</li>
          <li>ブラウザのキャッシュをクリアすると設定が失われる可能性があります。</li>
        </ul>
      </div>

      {/* スピナーアニメーション用CSS */}
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
