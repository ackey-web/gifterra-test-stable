// src/components/GIFTERRAAIAssistant.tsx
// GIFTERRA AI アシスタント - 特典受け取り失敗時のサポート

import { useState, useEffect, useRef } from 'react';
import { useAddress } from '@thirdweb-dev/react';
import { getExtendedKodomiProfile, getCachedKodomiProfile } from '../lib/kodomi-integration';

interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
}

interface ChatWindowProps {
  walletAddress: string | undefined;
  autoOpenContext: 'CLAIM_FAILED' | null;
  onClose: () => void;
}

function ChatWindow({ walletAddress, autoOpenContext, onClose }: ChatWindowProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [kodomiProfile, setKodomiProfile] = useState<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 自動スクロール
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // kodomiプロファイル取得（キャッシュ優先）
  useEffect(() => {
    if (!walletAddress) return;

    const loadProfile = async () => {
      // まずキャッシュから取得
      const cached = getCachedKodomiProfile(walletAddress);
      if (cached) {
        setKodomiProfile(cached);
        console.log('📊 Kodomi プロファイル（キャッシュ）:', cached);
      }

      // バックグラウンドでフル取得
      try {
        const full = await getExtendedKodomiProfile(walletAddress);
        if (full) {
          setKodomiProfile(full);
          console.log('📊 Kodomi プロファイル（完全版）:', full);
        }
      } catch (error) {
        console.warn('⚠️ Kodomi プロファイル取得エラー:', error);
      }
    };

    loadProfile();
  }, [walletAddress]);

  // 初期メッセージ設定
  useEffect(() => {
    if (messages.length === 0) {
      const greeting: Message = {
        role: 'assistant',
        content: autoOpenContext === 'CLAIM_FAILED'
          ? '申し訳ございません。特典の受け取りに問題が発生した可能性があります。\n\nどのような状況かお聞かせいただけますか？履歴を確認して、すぐにサポートいたします。'
          : 'こんにちは！ギフティです。\n\n特典の受け取りに関するご質問や、おすすめの特典についてお答えします。お気軽にお声がけください。',
        timestamp: new Date()
      };
      setMessages([greeting]);
    }
  }, [autoOpenContext]);

  // メッセージ送信
  const handleSend = async () => {
    if (!input.trim() || !walletAddress) return;

    const userMessage: Message = {
      role: 'user',
      content: input.trim(),
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      // AI APIに送信
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          walletAddress,
          message: userMessage.content,
          context: autoOpenContext,
          kodomiProfile: kodomiProfile
        })
      });

      if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
      }

      const data = await response.json();

      const assistantMessage: Message = {
        role: 'assistant',
        content: data.message || '申し訳ございません。応答の生成に失敗しました。',
        timestamp: new Date()
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('❌ AI応答エラー:', error);
      const errorMessage: Message = {
        role: 'assistant',
        content: '申し訳ございません。一時的にエラーが発生しました。しばらく経ってから再度お試しください。',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  // Enterキーで送信
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 80,
        right: 20,
        width: 380,
        height: 520,
        background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
        borderRadius: 16,
        boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
        display: 'flex',
        flexDirection: 'column',
        zIndex: 9999,
        border: '1px solid rgba(255,255,255,0.1)'
      }}
    >
      {/* ヘッダー */}
      <div
        style={{
          padding: '16px 20px',
          borderBottom: '1px solid rgba(255,255,255,0.1)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: 'rgba(255,255,255,0.05)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <img
            src="/gifterra-logo.png"
            alt="ギフティ"
            style={{ width: 32, height: 32, objectFit: 'contain' }}
          />
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#fff' }}>
              ギフティ
            </div>
            <div style={{ fontSize: 12, opacity: 0.7, color: '#fff' }}>
              サポートアシスタント
            </div>
          </div>
        </div>
        <button
          onClick={onClose}
          style={{
            background: 'transparent',
            border: 'none',
            color: '#fff',
            fontSize: 24,
            cursor: 'pointer',
            padding: 4,
            lineHeight: 1
          }}
        >
          ×
        </button>
      </div>

      {/* Kodomi プロファイル表示 */}
      {kodomiProfile && (
        <div
          style={{
            padding: '12px 20px',
            background: 'rgba(59, 130, 246, 0.1)',
            borderBottom: '1px solid rgba(59, 130, 246, 0.2)',
            fontSize: 12,
            color: '#fff'
          }}
        >
          <div style={{ opacity: 0.8, marginBottom: 4 }}>
            貢献熱量: <strong>{kodomiProfile.heatLevel || '😊ライト'}</strong>
          </div>
          {kodomiProfile.combined?.engagementLevel && (
            <div style={{ opacity: 0.8 }}>
              エンゲージメント: <strong>{kodomiProfile.combined.engagementLevel}</strong>
            </div>
          )}
        </div>
      )}

      {/* メッセージエリア */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: 20,
          display: 'flex',
          flexDirection: 'column',
          gap: 16
        }}
      >
        {messages.map((msg, idx) => (
          <div
            key={idx}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start'
            }}
          >
            {/* ギフティからのメッセージにはLINE風のラベルを表示 */}
            {msg.role === 'assistant' && (
              <div
                style={{
                  fontSize: 11,
                  color: 'rgba(255,255,255,0.6)',
                  marginBottom: 4,
                  marginLeft: 4
                }}
              >
                ギフティ
              </div>
            )}
            <div
              style={{
                maxWidth: '80%',
                padding: '10px 14px',
                borderRadius: 12,
                background: msg.role === 'user'
                  ? 'linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)'
                  : 'rgba(255,255,255,0.1)',
                color: '#fff',
                fontSize: 14,
                lineHeight: 1.5,
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word'
              }}
            >
              {msg.content}
            </div>
          </div>
        ))}

        {isLoading && (
          <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
            <div
              style={{
                padding: '10px 14px',
                borderRadius: 12,
                background: 'rgba(255,255,255,0.1)',
                color: '#fff',
                fontSize: 14
              }}
            >
              <span className="typing-indicator">...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* 入力エリア */}
      <div
        style={{
          padding: 16,
          borderTop: '1px solid rgba(255,255,255,0.1)',
          background: 'rgba(0,0,0,0.2)'
        }}
      >
        {!walletAddress ? (
          <div
            style={{
              padding: 12,
              textAlign: 'center',
              color: '#fff',
              opacity: 0.7,
              fontSize: 13
            }}
          >
            ウォレットを接続してください
          </div>
        ) : (
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="メッセージを入力..."
              disabled={isLoading}
              style={{
                flex: 1,
                padding: '10px 14px',
                background: 'rgba(255,255,255,0.1)',
                border: '1px solid rgba(255,255,255,0.2)',
                borderRadius: 8,
                color: '#fff',
                fontSize: 14,
                outline: 'none'
              }}
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || isLoading}
              style={{
                padding: '10px 16px',
                background: input.trim() && !isLoading
                  ? 'linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)'
                  : 'rgba(255,255,255,0.1)',
                color: '#fff',
                border: 'none',
                borderRadius: 8,
                fontSize: 14,
                fontWeight: 600,
                cursor: input.trim() && !isLoading ? 'pointer' : 'not-allowed',
                opacity: input.trim() && !isLoading ? 1 : 0.5
              }}
            >
              送信
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export function GIFTERRAAIAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [autoOpenContext, setAutoOpenContext] = useState<'CLAIM_FAILED' | null>(null);
  const address = useAddress();

  // 特典受け取り失敗時の自動オープン
  useEffect(() => {
    const handleError = (event: CustomEvent) => {
      console.log('🚨 GIFTERRA Error イベント受信:', event.detail);

      if (event.detail.type === 'CLAIM_FAILED') {
        setAutoOpenContext('CLAIM_FAILED');
        setIsOpen(true);
      }
    };

    window.addEventListener('gifterraError' as any, handleError);
    return () => window.removeEventListener('gifterraError' as any, handleError);
  }, []);

  // 閉じた時にコンテキストをリセット
  const handleClose = () => {
    setIsOpen(false);
    setAutoOpenContext(null);
  };

  return (
    <>
      {/* フローティングボタン */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          style={{
            position: 'fixed',
            bottom: 20,
            right: 20,
            height: 50,
            borderRadius: 25,
            background: 'linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)',
            border: 'none',
            boxShadow: '0 4px 20px rgba(59, 130, 246, 0.4)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 10,
            zIndex: 9998,
            transition: 'transform 0.2s, box-shadow 0.2s',
            padding: '8px 20px 8px 12px',
            whiteSpace: 'nowrap'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.boxShadow = '0 6px 24px rgba(59, 130, 246, 0.6)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 4px 20px rgba(59, 130, 246, 0.4)';
          }}
        >
          <img
            src="/gifterra-logo.png"
            alt="ギフティ"
            style={{ width: 32, height: 32, objectFit: 'contain' }}
          />
          <span
            style={{
              color: '#fff',
              fontSize: 14,
              fontWeight: 700,
              letterSpacing: 0.5
            }}
          >
            AIサポートアシスタント
          </span>
        </button>
      )}

      {/* チャットウィンドウ */}
      {isOpen && (
        <ChatWindow
          walletAddress={address}
          autoOpenContext={autoOpenContext}
          onClose={handleClose}
        />
      )}
    </>
  );
}
