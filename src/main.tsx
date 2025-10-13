// src/main.tsx
import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";

import RewardApp from "./reward-ui/App";
import TipApp from "./tip-ui/App";
import AdminDashboard from "./admin/Dashboard";
import { ThirdwebProvider } from "@thirdweb-dev/react";

// =============================
// Polygon Amoy Testnet 定義
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
  rpc: ["https://rpc-amoy.polygon.technology"],
  explorers: [
    {
      name: "PolygonScan",
      url: "https://amoy.polygonscan.com",
      standard: "EIP3091",
    },
  ],
  testnet: true,
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
