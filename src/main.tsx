// src/main.tsx
import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";

import RewardApp from "./reward-ui/App";
import TipApp from "./tip-ui/App";
import AdminDashboard from "./admin/Dashboard";
import { ThirdwebProvider } from "@thirdweb-dev/react";

// =============================
// Polygon Amoy Testnet 定義 (ThirdWeb v4互換)
// =============================
const polygonAmoy = {
  chainId: 80002,
  name: "Polygon Amoy",
  slug: "polygon-amoy",
  chain: "MATIC",
  shortName: "amoy",
  nativeCurrency: {
    name: "MATIC",
    symbol: "MATIC", 
    decimals: 18,
  },
  rpc: [
    // Alchemy RPC (環境変数から取得、フォールバック付き)
    import.meta.env.VITE_ALCHEMY_RPC_URL || "https://polygon-amoy.g.alchemy.com/v2/demo",
    "https://rpc-amoy.polygon.technology" // フォールバック
  ],
  explorers: [
    {
      name: "PolygonScan",
      url: "https://amoy.polygonscan.com",
      standard: "EIP3091",
    },
  ],
  testnet: true,
  icon: {
    url: "https://cryptologos.cc/logos/polygon-matic-logo.svg",
    width: 512,
    height: 512,
    format: "svg",
  },
};

// =============================
// UI 出し分けロジック
// =============================
const uiParam = new URLSearchParams(location.search).get("ui");
const path = location.pathname;

const wantsAdmin = path.includes("/admin") || uiParam === "admin";
const wantsTip = path.includes("/tip") || uiParam === "tip";
// それ以外は Reward UI

// =============================
// ReactDOM ルート作成
// =============================
const root = ReactDOM.createRoot(
  document.getElementById("root") as HTMLElement
);

// =============================
// アプリ出力
// =============================
root.render(
  <React.StrictMode>
    <ThirdwebProvider
      clientId="779fcfff75c8b7ed91ea029f8783fd8e" // ← あなたの Client ID
      supportedChains={[polygonAmoy]} // ← Polygon Amoy を使用
      activeChain={polygonAmoy}
      dAppMeta={{
        name: "Gifterra",
        description: "Web3 Community Rewards Platform",
        logoUrl: "/gifterra-logo.png",
        url: "https://gifterra.vercel.app",
        isDarkMode: true,
      }}
      autoConnect={true}
    >
      {wantsAdmin ? (
        <AdminDashboard />
      ) : wantsTip ? (
        <TipApp />
      ) : (
        <RewardApp />
      )}
    </ThirdwebProvider>
  </React.StrictMode>
);