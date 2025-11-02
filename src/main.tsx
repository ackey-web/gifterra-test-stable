// src/main.tsx
import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import { Buffer } from "buffer";
import { PrivyProvider } from "@privy-io/react-auth";
import { ReceivePage } from "./pages/ReceivePage";

// Polyfill Buffer for browser environment (required for Web3 libraries)
window.Buffer = window.Buffer || Buffer;

// URL判定
const path = location.pathname;
const wantsReceive = path.includes("/receive");

// =============================
// ReactDOM ルート作成
// =============================
const root = ReactDOM.createRoot(
  document.getElementById("root") as HTMLElement
);

// =============================
// 最小限のアプリ出力（MVP Phase 1）
// =============================
root.render(
  <React.StrictMode>
    <PrivyProvider
      appId={import.meta.env.VITE_PRIVY_APP_ID || ""}
      config={{
        loginMethods: ["email", "google", "wallet"],
        appearance: {
          theme: "dark",
          accentColor: "#02bbd1",
          logo: "/gifterra-logo.png",
        },
        embeddedWallets: {
          createOnLogin: 'all-users',
          noPromptOnSignature: false,
        },
        defaultChain: {
          id: 137,
          name: "Polygon Mainnet",
          network: "polygon",
          nativeCurrency: {
            name: "MATIC",
            symbol: "MATIC",
            decimals: 18,
          },
          rpcUrls: {
            default: {
              http: ["https://polygon-rpc.com"],
            },
            public: {
              http: ["https://polygon-rpc.com"],
            },
          },
          blockExplorers: {
            default: {
              name: "PolygonScan",
              url: "https://polygonscan.com",
            },
          },
          testnet: false,
        },
      }}
    >
      {wantsReceive ? (
        <ReceivePage />
      ) : (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white',
          fontFamily: 'system-ui, -apple-system, sans-serif'
        }}>
          <div style={{ textAlign: 'center', padding: '2rem' }}>
            <h1 style={{ fontSize: '3rem', marginBottom: '1rem' }}>🎁 GIFTERRA</h1>
            <p style={{ fontSize: '1.2rem', opacity: 0.9 }}>
              Phase 1 MVP Foundation - Build in Progress
            </p>
            <p style={{ fontSize: '0.9rem', marginTop: '2rem', opacity: 0.7 }}>
              温存＋段階統合方式で再構築中
            </p>
          </div>
        </div>
      )}
    </PrivyProvider>
  </React.StrictMode>
);