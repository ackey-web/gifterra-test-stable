// src/main.tsx
import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";

import RewardApp from "./reward-ui/App";
import TipApp from "./tip-ui/App";
import MetaverseApp from "./metaverse-ui/App";
// 一時的にコメントアウト - ABI整備後に有効化
// import AdminDashboard from "./admin/Dashboard";
// import AdminDashboardMobile from "./admin/DashboardMobile";
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
    // プライマリRPC（モバイル対応）
    "https://rpc-amoy.polygon.technology",
    // 設定済みAlchemy RPC（環境変数から）
    ...(import.meta.env.VITE_ALCHEMY_RPC_URL ? [import.meta.env.VITE_ALCHEMY_RPC_URL] : []),
    // モバイル用フォールバックRPC
    "https://polygon-amoy.drpc.org",
    "https://endpoints.omniatech.io/v1/matic/amoy/public",
    "https://amoy.polygon.technology"
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
// デバイス判定とルーティング
// =============================
const getDeviceType = () => {
  const width = window.innerWidth;
  return width <= 600 ? 'mobile' : 'desktop';
};

// URL判定
const uiParam = new URLSearchParams(location.search).get("ui");
const path = location.pathname;

const wantsAdmin = path.includes("/admin") || uiParam === "admin";
const wantsTip = path.includes("/tip") || uiParam === "tip";
const wantsContent = path.includes("/content") || uiParam === "content";
const wantsAdminMobile = path.includes("/admin-mobile");

// Admin アクセス時のデバイス判定による自動リダイレクト
if (wantsAdmin && !wantsAdminMobile && getDeviceType() === 'mobile') {
  // スマホでAdminアクセス時は /admin-mobile にリダイレクト
  window.location.href = window.location.origin + "/admin-mobile" + window.location.search;
} else if (wantsAdminMobile && getDeviceType() === 'desktop') {
  // PCで /admin-mobile アクセス時は /admin にリダイレクト
  window.location.href = window.location.origin + "/admin" + window.location.search;
}

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
      clientId={import.meta.env.VITE_THIRDWEB_CLIENT_ID || "779fcfff75c8b7ed91ea029f8783fd8e"}
      supportedChains={[polygonAmoy]}
      activeChain={polygonAmoy}
      dAppMeta={{
        name: "Gifterra",
        description: "Web3 Community Rewards Platform",
        logoUrl: "/gifterra-logo.png",
        url: typeof window !== "undefined" ? window.location.origin : "https://gifterra-test-stable.vercel.app",
        isDarkMode: true,
      }}
      autoConnect={true}
      theme="dark"
      autoSwitch={true}
    >
      {wantsAdminMobile ? (
        <div className="min-h-screen bg-gradient-to-br from-red-900 to-orange-900 flex items-center justify-center text-white">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4">🚧 Admin機能 一時停止中</h1>
            <p>システム整備中です。しばらくお待ちください。</p>
          </div>
        </div>
      ) : wantsAdmin ? (
        <div className="min-h-screen bg-gradient-to-br from-red-900 to-orange-900 flex items-center justify-center text-white">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4">🚧 Admin機能 一時停止中</h1>
            <p>システム整備中です。しばらくお待ちください。</p>
          </div>
        </div>
      ) : wantsTip ? (
        <TipApp />
      ) : wantsContent ? (
        <MetaverseApp />
      ) : (
        <RewardApp />
      )}
    </ThirdwebProvider>
  </React.StrictMode>
);