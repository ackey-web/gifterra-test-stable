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
        background: "linear-gradient(135deg, #018a9a 0%, #017080 100%)",
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
          padding: isMobile ? "24px 20px" : "32px 36px",
          maxWidth: 480,
          width: "100%",
          boxShadow: "0 8px 16px rgba(0,0,0,0.1), 0 16px 32px rgba(0,0,0,0.15), 0 24px 48px rgba(2, 187, 209, 0.2)",
          backdropFilter: "blur(10px)",
          border: "1px solid rgba(255, 255, 255, 0.5)",
          transform: "translateY(0)",
          transition: "all 0.3s ease",
        }}
      >
        {/* ロゴとキャッチコピー */}
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <img
            src="/gifterra-logo.png"
            alt="GIFTERRA"
            style={{
              width: isMobile ? 160 : 200,
              height: "auto",
              margin: "0 auto 16px",
              display: "block",
            }}
          />
          <p
            style={{
              fontSize: isMobile ? 16 : 18,
              color: "#2d3748",
              margin: 0,
              lineHeight: 1.8,
              fontWeight: 500,
            }}
          >
            GIFTERRAにようこそ
            <br />
            まずは無料の送受信から。応援が"残る"体験へ。
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
                borderTop: "3px solid #02bbd1",
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
            marginBottom: 20,
            padding: 16,
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
        </div>

        {/* 接続ボタン */}
        <div style={{ marginBottom: 16 }}>
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
            gap: 8,
            marginTop: 0,
          }}
        >
          <div
            style={{
              padding: 12,
              background: "#f0f4ff",
              borderRadius: 10,
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: 20, marginBottom: 6 }}>⚡️</div>
            <div style={{ fontSize: 12, fontWeight: 600, color: "#4a5568" }}>
              ガスレス送金
            </div>
          </div>
          <div
            style={{
              padding: 12,
              background: "#f0fff4",
              borderRadius: 10,
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: 20, marginBottom: 6 }}>🔒</div>
            <div style={{ fontSize: 12, fontWeight: 600, color: "#4a5568" }}>
              セキュア認証
            </div>
          </div>
          <div
            style={{
              padding: 12,
              background: "#fffaf0",
              borderRadius: 10,
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: 20, marginBottom: 6 }}>🎯</div>
            <div style={{ fontSize: 12, fontWeight: 600, color: "#4a5568" }}>
              簡単操作
            </div>
          </div>
          <div
            style={{
              padding: 12,
              background: "#fef2f2",
              borderRadius: 10,
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: 20, marginBottom: 6 }}>🌐</div>
            <div style={{ fontSize: 12, fontWeight: 600, color: "#4a5568" }}>
              Web3対応
            </div>
          </div>
        </div>

        {/* フッター */}
        <div
          style={{
            marginTop: 20,
            paddingTop: 16,
            borderTop: "1px solid #e2e8f0",
            textAlign: "center",
          }}
        >
          <p
            style={{
              fontSize: 12,
              color: "#718096",
              margin: "0 0 4px 0",
              fontWeight: 500,
            }}
          >
            Powered by GIFTERRA.
          </p>
          <p
            style={{
              fontSize: 12,
              color: "#718096",
              margin: "0 0 12px 0",
              fontWeight: 500,
            }}
          >
            Presented by METATRON.
          </p>
          <p
            style={{
              fontSize: 11,
              color: "#a0aec0",
              margin: 0,
            }}
          >
            特願2025-120883
          </p>
        </div>
      </div>
    </div>
  );
};
