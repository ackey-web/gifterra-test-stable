// src/pages/Login.tsx
import React, { useState, useEffect } from "react";
import {
  useAddress,
  useConnectionStatus,
  ConnectWallet,
  useWallet,
} from "@thirdweb-dev/react";

export const LoginPage: React.FC = () => {
  const address = useAddress();
  const connectionStatus = useConnectionStatus();
  const wallet = useWallet();
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // ウォレット接続成功時、マイページにリダイレクト
  useEffect(() => {
    if (address && connectionStatus === "connected") {
      // ローカルストレージに認証情報を保存
      localStorage.setItem("gifterra_auth", JSON.stringify({
        address,
        timestamp: Date.now(),
        walletType: wallet?.walletId || "unknown",
      }));

      // マイページにリダイレクト
      window.location.href = "/mypage";
    }
  }, [address, connectionStatus, wallet]);

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: isMobile ? "20px" : "40px",
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      }}
    >
      <div
        style={{
          background: "rgba(255, 255, 255, 0.98)",
          borderRadius: 24,
          padding: isMobile ? "32px 24px" : "48px 40px",
          maxWidth: 480,
          width: "100%",
          boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
          backdropFilter: "blur(10px)",
        }}
      >
        {/* ロゴとタイトル */}
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <div
            style={{
              width: 80,
              height: 80,
              margin: "0 auto 20px",
              background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 36,
              boxShadow: "0 8px 24px rgba(102, 126, 234, 0.4)",
            }}
          >
            🎁
          </div>
          <h1
            style={{
              fontSize: isMobile ? 28 : 32,
              fontWeight: 700,
              color: "#1a202c",
              margin: "0 0 8px 0",
              background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            Gifterra
          </h1>
          <p
            style={{
              fontSize: 15,
              color: "#718096",
              margin: 0,
              lineHeight: 1.6,
            }}
          >
            Web3コミュニティ報酬プラットフォーム
          </p>
        </div>

        {/* 接続状態の表示 */}
        {connectionStatus === "connecting" && (
          <div
            style={{
              textAlign: "center",
              padding: "20px",
              background: "#f7fafc",
              borderRadius: 12,
              marginBottom: 24,
            }}
          >
            <div
              style={{
                display: "inline-block",
                width: 24,
                height: 24,
                border: "3px solid #e2e8f0",
                borderTop: "3px solid #667eea",
                borderRadius: "50%",
                animation: "spin 1s linear infinite",
              }}
            />
            <p style={{ marginTop: 12, color: "#4a5568", fontSize: 14 }}>
              接続中...
            </p>
            <style>
              {`
                @keyframes spin {
                  0% { transform: rotate(0deg); }
                  100% { transform: rotate(360deg); }
                }
              `}
            </style>
          </div>
        )}

        {/* 説明セクション */}
        <div
          style={{
            marginBottom: 32,
            padding: 20,
            background: "#f7fafc",
            borderRadius: 12,
            border: "1px solid #e2e8f0",
          }}
        >
          <h3
            style={{
              fontSize: 16,
              fontWeight: 600,
              color: "#2d3748",
              margin: "0 0 12px 0",
            }}
          >
            ログイン方法を選択
          </h3>
          <ul
            style={{
              margin: 0,
              padding: "0 0 0 20px",
              color: "#4a5568",
              fontSize: 14,
              lineHeight: 1.8,
            }}
          >
            <li>
              <strong>ウォレットを持っている方:</strong>
              <br />
              MetaMaskやCoinbase Walletで接続
            </li>
            <li style={{ marginTop: 8 }}>
              <strong>ウォレットを持っていない方:</strong>
              <br />
              GoogleアカウントやEmailでウォレットを自動生成
            </li>
          </ul>
          <div
            style={{
              marginTop: 16,
              padding: 12,
              background: "#fff3cd",
              border: "1px solid #ffc107",
              borderRadius: 8,
              fontSize: 13,
              color: "#856404",
              lineHeight: 1.6,
            }}
          >
            ⚠️ トランザクション時のガス代（手数料）はユーザー負担となります
          </div>
        </div>

        {/* 接続ボタン */}
        <div style={{ marginBottom: 24 }}>
          <ConnectWallet
            theme="dark"
            btnTitle="ログイン / ウォレット接続"
            modalTitle="Gifterraにログイン"
            modalTitleIconUrl=""
            welcomeScreen={{
              title: "Gifterraへようこそ",
              subtitle: "Web3でコミュニティに報酬を贈ろう",
              img: {
                src: "/gifterra-logo.png",
                width: 150,
                height: 150,
              },
            }}
            termsOfServiceUrl="https://example.com/terms"
            privacyPolicyUrl="https://example.com/privacy"
            style={{
              width: "100%",
              height: 52,
              borderRadius: 12,
              fontSize: 16,
              fontWeight: 600,
              background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
              border: "none",
              boxShadow: "0 4px 16px rgba(102, 126, 234, 0.3)",
              transition: "all 0.2s",
            }}
          />
        </div>

        {/* 特徴セクション */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr",
            gap: 12,
            marginTop: 24,
          }}
        >
          <div
            style={{
              padding: 16,
              background: "#f0f4ff",
              borderRadius: 12,
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: 24, marginBottom: 8 }}>🔑</div>
            <div style={{ fontSize: 13, fontWeight: 600, color: "#4a5568" }}>
              SNS認証対応
            </div>
          </div>
          <div
            style={{
              padding: 16,
              background: "#f0fff4",
              borderRadius: 12,
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: 24, marginBottom: 8 }}>🔒</div>
            <div style={{ fontSize: 13, fontWeight: 600, color: "#4a5568" }}>
              セキュア認証
            </div>
          </div>
          <div
            style={{
              padding: 16,
              background: "#fffaf0",
              borderRadius: 12,
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: 24, marginBottom: 8 }}>🎯</div>
            <div style={{ fontSize: 13, fontWeight: 600, color: "#4a5568" }}>
              簡単操作
            </div>
          </div>
          <div
            style={{
              padding: 16,
              background: "#fef2f2",
              borderRadius: 12,
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: 24, marginBottom: 8 }}>🌐</div>
            <div style={{ fontSize: 13, fontWeight: 600, color: "#4a5568" }}>
              Web3対応
            </div>
          </div>
        </div>

        {/* フッター */}
        <div
          style={{
            marginTop: 32,
            paddingTop: 24,
            borderTop: "1px solid #e2e8f0",
            textAlign: "center",
          }}
        >
          <p
            style={{
              fontSize: 12,
              color: "#a0aec0",
              margin: "0 0 8px 0",
            }}
          >
            初回ログイン時は自動的にウォレットが生成されます
          </p>
          <p
            style={{
              fontSize: 12,
              color: "#a0aec0",
              margin: 0,
            }}
          >
            © 2024 Gifterra. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
};
