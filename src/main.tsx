// src/main.tsx
import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import { Buffer } from "buffer";
import { PrivyProvider } from "@privy-io/react-auth";

// Polyfill Buffer for browser environment (required for Web3 libraries)
window.Buffer = window.Buffer || Buffer;

import RewardApp from "./reward-ui/App";
import TipApp from "./tip-ui/App";
import VendingApp from "./vending-ui/App";
import AdminDashboard from "./admin/Dashboard";
import AdminDashboardMobile from "./admin/DashboardMobile";
import { DownloadPage } from "./pages/DownloadPage";
import { MyPurchasesPage } from "./pages/MyPurchasesPage";
import ClaimHistory from "./pages/ClaimHistory";
import { UserProfilePage } from "./pages/UserProfile";
import { MypagePage } from "./pages/Mypage";
import { LoginPage } from "./pages/Login";
import ScoreProfilePage from "./pages/score-profile";
import { SuperAdminPage } from "./pages/SuperAdmin";
import { ReceivePage } from "./pages/ReceivePage";
import { ThirdwebProvider } from "@thirdweb-dev/react";
import { TenantProvider } from "./admin/contexts/TenantContext";
import { AuthProvider } from "./contexts/AuthContext";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { supportedWallets } from "./config/wallets";

// =============================
// Polygon Mainnet 定義 (ThirdWeb v4互換)
// =============================
const polygonMainnet = {
  chainId: 137,
  name: "Polygon Mainnet",
  slug: "polygon",
  chain: "MATIC",
  shortName: "polygon",
  nativeCurrency: {
    name: "MATIC",
    symbol: "MATIC",
    decimals: 18,
  },
  rpc: [
    // プライマリRPC
    "https://polygon-rpc.com",
    // 設定済みAlchemy RPC（環境変数から）
    ...(import.meta.env.VITE_ALCHEMY_RPC_URL ? [import.meta.env.VITE_ALCHEMY_RPC_URL] : []),
    // フォールバックRPC
    "https://rpc-mainnet.matic.network",
    "https://matic-mainnet.chainstacklabs.com",
    "https://polygon-mainnet.public.blastapi.io"
  ],
  explorers: [
    {
      name: "PolygonScan",
      url: "https://polygonscan.com",
      standard: "EIP3091",
    },
  ],
  testnet: false,
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

const wantsLogin = path.includes("/login") || uiParam === "login";
const wantsAdmin = path.includes("/admin") || uiParam === "admin";
const wantsTip = path.includes("/tip") || uiParam === "tip";
const wantsContent = path.includes("/content") || uiParam === "content";
const wantsAdminMobile = path.includes("/admin-mobile");
const wantsDownload = path.includes("/download") || uiParam === "download";
const wantsPurchases = path.includes("/my-purchases") || uiParam === "purchases";
const wantsClaimHistory = path.includes("/claim-history") || uiParam === "claim-history";
const wantsUserProfile = path.includes("/user/") || uiParam === "user";
const wantsMypage = path.includes("/mypage") || uiParam === "mypage";
const wantsSuperAdmin = path.includes("/super-admin") || uiParam === "super-admin";
const wantsReceive = path.includes("/receive") || uiParam === "receive";

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
    <PrivyProvider
      appId={import.meta.env.VITE_PRIVY_APP_ID || ""}
      config={{
        loginMethods: ["email", "google", "twitter", "discord", "wallet"],
        appearance: {
          theme: "dark",
          accentColor: "#02bbd1",
          logo: "/gifterra-logo.png",
        },
        embeddedWallets: {
          createOnLogin: 'all-users',
          noPromptOnSignature: false,
        },
        // デフォルトチェーンをPolygon Mainnetに設定
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
      <ThirdwebProvider
        clientId="3e4c63f9a07ad8ed962ba1691be8fe2b"
        supportedChains={[polygonMainnet]}
        activeChain={polygonMainnet}
        supportedWallets={supportedWallets}
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
        <AuthProvider>
        {wantsLogin ? (
          <LoginPage />
        ) : wantsReceive ? (
          <ReceivePage />
        ) : wantsDownload ? (
          <DownloadPage />
        ) : wantsPurchases ? (
          <MyPurchasesPage />
        ) : wantsClaimHistory ? (
          <ClaimHistory />
        ) : wantsSuperAdmin ? (
          <SuperAdminPage />
        ) : wantsMypage ? (
          <ProtectedRoute>
            <MypagePage />
          </ProtectedRoute>
        ) : wantsUserProfile ? (
          <UserProfilePage />
        ) : wantsAdminMobile ? (
          <TenantProvider>
            <AdminDashboardMobile />
          </TenantProvider>
        ) : wantsAdmin ? (
          <TenantProvider>
            <AdminDashboard />
          </TenantProvider>
        ) : wantsTip ? (
          <TipApp />
        ) : wantsContent ? (
          <VendingApp />
        ) : (
          <RewardApp />
        )}
        </AuthProvider>
      </ThirdwebProvider>
    </PrivyProvider>
  </React.StrictMode>
);