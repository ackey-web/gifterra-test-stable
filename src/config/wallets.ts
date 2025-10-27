// src/config/wallets.ts
// ハイブリッドウォレット設定: スマートウォレット + 外部ウォレット

import {
  MetaMaskWallet,
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
/**
 * スマートウォレットの有効/無効を制御するフラグ
 *
 * 環境変数で制御可能:
 * - true: スマートウォレット有効（ガスレス体験）
 * - false: 従来のウォレットのみ
 */
const ENABLE_SMART_WALLET = import.meta.env.VITE_ENABLE_SMART_WALLET !== "false";

/**
 * スマートウォレット用のパーソナルウォレット設定
 *
 * スマートウォレット内で使えるウォレット:
 * 1. Embedded Wallet（推奨）- メール/SNSログイン
 * 2. MetaMask - スマートウォレット経由
 */
function getPersonalWalletsForSmartWallet() {
  return [
    new EmbeddedWallet({
      auth: {
        options: ["email", "google"],
      },
    }),
    new MetaMaskWallet(),
  ];
}

export const supportedWallets = [
  // スマートウォレット（ガスレス、推奨）
  ...(ENABLE_SMART_WALLET && import.meta.env.VITE_SMART_WALLET_FACTORY
    ? [
        {
          id: "smart",
          meta: {
            name: "簡単ログイン（推奨・ガスレス）",
            iconURL: "ipfs://QmQgjUANXwknJQF4o9g1E4jjLqEDi4jXp0xD8GjZJ2xQNW/smart-wallet.svg",
          },
          create: (options?: any) => {
            const config = getSmartWalletConfig();
            const smartWallet = new SmartWallet({
              ...config,
              ...options,
            });
            return smartWallet;
          },
          recommended: true,
        },
      ]
    : []),

  // MetaMask（直接接続）
  {
    id: "metamask",
    meta: {
      name: "MetaMask",
      iconURL: "ipfs://QmZZHcw7zcXursywnLDAyY6Hfxzqop5GKgwoq8NB9jjrkN/metamask.svg",
    },
    create: (options?: any) => new MetaMaskWallet(options),
  },

  // Coinbase Wallet
  {
    id: "coinbase",
    meta: {
      name: "Coinbase Wallet",
      iconURL: "ipfs://QmcJBHopbwfJcLqJpX2xEufSS84aLbF7bHavYhaXUcrLaH/coinbase.svg",
    },
    create: (options?: any) => new CoinbaseWallet(options),
  },

  // Embedded Wallet（スマートウォレット無効時のフォールバック）
  {
    id: "embedded",
    meta: {
      name: "Email Wallet",
      iconURL: "ipfs://QmeAJVqn17aDNQhjEU3kcWVZCFBrfta8LzaDGkS8Egdiyk/embedded.svg",
    },
    create: (options?: any) => new EmbeddedWallet(options),
  },
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
 * 注: 現在はコンソールログを出力しません
 */
export function debugWalletConfig() {
  // デバッグ出力は削除されました
  // 必要に応じて以下のコードを有効化してください
  /*
  console.log("🔧 Wallet Configuration");
  console.log("Smart Wallet Factory:", import.meta.env.VITE_SMART_WALLET_FACTORY || "Not Set");
  console.log("Paymaster URL:", import.meta.env.VITE_PAYMASTER_URL || "Not Set");
  console.log("WalletConnect Project ID:", import.meta.env.VITE_WALLETCONNECT_PROJECT_ID ? "Set" : "Not Set");
  console.log("Network:", getNetworkEnv());
  console.log("Active Chain:", getActiveChain().name);
  */
}
