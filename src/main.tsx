// src/main.tsx
import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import "./index.css";
import RewardApp from "./reward-ui/App";
import TipApp from "./tip-ui/App";
import AdminDashboard from "./admin/Dashboard";
import { ThirdwebProvider } from "@thirdweb-dev/react";
import type { Chain } from "@thirdweb-dev/chains";

// ✅ 必須フィールド（chain / shortName）を含めた Chain 定義
const PolygonAmoy: Chain = {
  chainId: 80002,
  name: "Polygon Amoy Testnet",
  chain: "Polygon",                 // ← 追加
  shortName: "amoy",                // ← 追加
  slug: "polygon-amoy",
  nativeCurrency: {
    name: "MATIC",
    symbol: "MATIC",
    decimals: 18,
  },
  rpc: ["https://rpc-amoy.polygon.technology"], // 後で Alchemy に差し替え可（Vercel ENV）
  explorers: [
    {
      name: "PolygonScan",
      url: "https://amoy.polygonscan.com",
      standard: "EIP3091",
    },
  ],
  testnet: true,
};

const root = ReactDOM.createRoot(
  document.getElementById("root") as HTMLElement
);

root.render(
  <React.StrictMode>
    <ThirdwebProvider
      clientId="779fcfff75c8b7ed91ea029f8783fd8e"
      activeChain={PolygonAmoy}
      supportedChains={[PolygonAmoy]}
    >
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<RewardApp />} />
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/tip" element={<TipApp />} />
          <Route path="/tip-ui" element={<TipApp />} />
          <Route path="/reward-ui" element={<RewardApp />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </ThirdwebProvider>
  </React.StrictMode>
);
