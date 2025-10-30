// src/components/ProtectedRoute.tsx
import React, { ReactNode, useEffect } from "react";
import { useAddress, useConnectionStatus } from "@thirdweb-dev/react";

interface ProtectedRouteProps {
  children: ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const address = useAddress();
  const connectionStatus = useConnectionStatus();

  useEffect(() => {
    // 接続チェック完了後、未認証ならログインページにリダイレクト
    if (connectionStatus === "disconnected" || (!address && connectionStatus !== "connecting")) {
      // ローカルストレージの認証情報もチェック
      const stored = localStorage.getItem("gifterra_auth");
      if (!stored) {
        window.location.href = "/login";
      }
    }
  }, [address, connectionStatus]);

  // 接続中の場合はローディング表示
  if (connectionStatus === "connecting") {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#f7fafc",
          fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        }}
      >
        <div style={{ textAlign: "center" }}>
          <div
            style={{
              display: "inline-block",
              width: 48,
              height: 48,
              border: "4px solid #e2e8f0",
              borderTop: "4px solid #667eea",
              borderRadius: "50%",
              animation: "spin 1s linear infinite",
            }}
          />
          <p style={{ marginTop: 16, color: "#4a5568", fontSize: 16 }}>
            認証情報を確認中...
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
      </div>
    );
  }

  // 未接続の場合
  if (!address || connectionStatus === "disconnected") {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#f7fafc",
          fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        }}
      >
        <div
          style={{
            textAlign: "center",
            padding: "40px",
            background: "white",
            borderRadius: 16,
            boxShadow: "0 4px 16px rgba(0,0,0,0.1)",
          }}
        >
          <div style={{ fontSize: 48, marginBottom: 16 }}>🔒</div>
          <h2 style={{ fontSize: 24, color: "#2d3748", marginBottom: 12 }}>
            ログインが必要です
          </h2>
          <p style={{ color: "#718096", marginBottom: 24 }}>
            このページにアクセスするには、ログインしてください
          </p>
          <button
            onClick={() => (window.location.href = "/login")}
            style={{
              padding: "12px 32px",
              background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
              color: "white",
              border: "none",
              borderRadius: 8,
              fontSize: 16,
              fontWeight: 600,
              cursor: "pointer",
              boxShadow: "0 4px 12px rgba(102, 126, 234, 0.3)",
            }}
          >
            ログインページへ
          </button>
        </div>
      </div>
    );
  }

  // 認証済みの場合はコンテンツを表示
  return <>{children}</>;
};
