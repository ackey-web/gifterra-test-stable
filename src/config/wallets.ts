// src/config/wallets.ts
// ハイブリッドウォレット設定: スマートウォレット + 外部ウォレット

import {
  MetaMaskWallet,
  WalletConnect,
  CoinbaseWallet,
  SmartWallet,
  EmbeddedWallet,
  type SmartWalletConfig,
} from "@thirdweb-dev/wallets";
import { PolygonAmoyTestnet, Polygon } from "@thirdweb-dev/chains";
import { getNetworkEnv } from "./tokens";

/**
 * スマートウォレットの設定
 *
 * Account Abstraction (ERC-4337) を使用して:
 * - ガスレストランザクション
 * - メール/SNSログイン
 * - バッチトランザクション
 * - セッションキー
 */
function getSmartWalletConfig(): SmartWalletConfig {
  return {
    // Chain設定
    chain: getActiveChain(),

    // Factory Address (thirdwebのFactory Contract)
    factoryAddress: import.meta.env.VITE_SMART_WALLET_FACTORY || "",

    // ガスレス設定
    gasless: true,

    // Paymasterの設定
    // factoryInfo: {
    //   createAccount: async (factory, owner) => {
    //     return factory.createAccount(owner);
    //   },
    //   getAccountAddress: async (factory, owner) => {
    //     return factory.getAddress(owner);
    //   },
    // },
  };
}

/**
 * サポートするウォレット一覧
 *
 * 戦略:
 * 1. スマートウォレット（推奨）- 初心者向け、ガスレス
 * 2. 外部ウォレット直接接続 - 上級者向け、自己管理
 */
export const supportedWallets = [
  // ===================================
  // メイン: スマートウォレット
  // ===================================
  new SmartWallet({
    ...getSmartWalletConfig(),
    personalWallets: [
      // Embedded Wallet（メール/SNSログイン）
      EmbeddedWallet,

      // MetaMask（スマートウォレット経由）
      MetaMaskWallet,

      // WalletConnect（スマートウォレット経由）
      WalletConnect,
    ],
  }),

  // ===================================
  // サブ: 外部ウォレット直接接続
  // ===================================
  // MetaMask直接接続（上級者向け）
  new MetaMaskWallet(),

  // WalletConnect直接接続
  new WalletConnect({
    projectId: import.meta.env.VITE_WALLETCONNECT_PROJECT_ID || "",
  }),

  // Coinbase Wallet
  new CoinbaseWallet(),
];

/**
 * ガススポンサーシップのルール設定
 *
 * スマートウォレット使用時のみ適用
 * 外部ウォレット直接接続時はユーザーが自己負担
 */
export interface GasSponsorshipRules {
  // 新規ユーザー: 最初のN回は無料
  firstTransactions: number;

  // 関数別スポンサーシップ
  sponsoredFunctions: {
    // Tip機能: 常に無料（上限あり）
    tip: {
      enabled: boolean;
      maxAmount: string; // wei単位
    };

    // GIFT HUB購入: 一定額以下は無料
    purchase: {
      enabled: boolean;
      threshold: string; // wei単位
    };

    // Reward受け取り: 常に無料
    claimReward: {
      enabled: boolean;
    };
  };

  // 1トランザクションあたりの最大ガススポンサー額
  maxGasPerTransaction: string; // wei単位
}

/**
 * デフォルトのガススポンサーシップルール
 */
export const defaultGasSponsorshipRules: GasSponsorshipRules = {
  // 新規ユーザー: 最初の5トランザクション無料
  firstTransactions: 5,

  sponsoredFunctions: {
    // Tip: 1000 JPYC以下は常に無料
    tip: {
      enabled: true,
      maxAmount: "1000000000000000000000", // 1000 * 10^18
    },

    // Purchase: 100 JPYC以下は無料
    purchase: {
      enabled: true,
      threshold: "100000000000000000000", // 100 * 10^18
    },

    // Reward: 常に無料
    claimReward: {
      enabled: true,
    },
  },

  // 最大ガス: 0.02 POL相当
  maxGasPerTransaction: "20000000000000000", // 0.02 * 10^18
};

/**
 * アクティブチェーンの取得
 *
 * 環境変数に応じてTestnet/Mainnetを切り替え
 */
export function getActiveChain() {
  const network = getNetworkEnv();
  return network === "mainnet" ? Polygon : PolygonAmoyTestnet;
}

/**
 * ウォレット接続のデフォルト設定
 */
export const walletConnectionConfig = {
  // 自動接続
  autoConnect: true,

  // 接続状態の永続化
  persist: true,

  // セッション管理
  authConfig: {
    domain: typeof window !== "undefined" ? window.location.origin : "",
    authUrl: "/api/auth",
  },
};

/**
 * デバッグ用: ウォレット設定の確認
 */
export function debugWalletConfig() {
  console.log("🔧 Wallet Configuration");
  console.log("Smart Wallet Factory:", import.meta.env.VITE_SMART_WALLET_FACTORY || "Not Set");
  console.log("Paymaster URL:", import.meta.env.VITE_PAYMASTER_URL || "Not Set");
  console.log("WalletConnect Project ID:", import.meta.env.VITE_WALLETCONNECT_PROJECT_ID ? "Set" : "Not Set");
  console.log("Network:", getNetworkEnv());
  console.log("Active Chain:", getActiveChain().name);
}
