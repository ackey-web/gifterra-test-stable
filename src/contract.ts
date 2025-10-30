import { getAddress } from "viem";
import { createPublicClient, http } from "viem";
import { polygonAmoy } from "viem/chains";

/* =========================================
   ✅ Gifterra コントラクト設定
   
   📝 現在: SBT専用コントラクト + 将来のNFT拡張準備
   🏭 将来: ファクトリーパターンでマルチプロジェクト対応
       - ファクトリーアドレス: TBD (メインネット)
       - プロジェクト別コントラクト管理
       - 導入ユーザー別オーナー権限
========================================= */

// 🎯 SBTコントラクト (現在の主力)
export const SBT_CONTRACT = {
  ADDRESS: getAddress("0x0174477A1FCEb9dE25289Cd1CA48b6998C9cD7FC"),
  TYPE: "SBT" as const,
  FEATURES: ["dailyReward", "tip", "soulbound"] as const,
} as const;

// 🆕 NFTコントラクト (譲渡可能NFT用 - 将来実装)
export const NFT_CONTRACT = {
  // ADDRESS: getAddress("0x..."), // 開発中 - NFTコントラクトデプロイ後に設定
  TYPE: "NFT" as const,
  FEATURES: ["transferable", "marketplace", "metadata"] as const,
} as const;

// 🔗 統合管理コントラクト (SBT ⟷ NFT 連携用 - 将来実装)
export const MANAGER_CONTRACT = {
  // ADDRESS: getAddress("0x..."), // 開発中 - マネージャーコントラクトデプロイ後に設定
  TYPE: "MANAGER" as const,
  FEATURES: ["sbt-nft-bridge", "level-sync", "unified-management"] as const,
} as const;

// 🔄 後方互換性のため現在のCONTRACT_ADDRESSを維持
export const CONTRACT_ADDRESS = SBT_CONTRACT.ADDRESS;

// � メタバースEC設定
export const METAVERSE_CONFIG = {
  // 🏰 メタバース空間設定
  SPACES: {
    "world-1": {
      name: "メインワールド",
      description: "ギフテラの中心となるメタバース空間",
      isActive: true,
      machines: ["entrance-01", "vip-lounge"]
    },
    "gallery-a": {
      name: "アートギャラリー", 
      description: "クリエイター作品を展示するアート空間",
      isActive: true,
      machines: ["gallery-01", "creator-corner"]
    },
    "game-zone": {
      name: "ゲームゾーン",
      description: "ゲーム関連コンテンツの配布エリア", 
      isActive: true,
      machines: ["game-machine-01"]
    }
  },
  
  // 🏪 自販機設定
  MACHINES: {
    "entrance-01": {
      name: "エントランス自販機",
      spaceId: "world-1",
      contentSetId: "starter-pack",
      position: { x: 0, y: 0, z: 5 }
    },
    "vip-lounge": {
      name: "VIPラウンジ",
      spaceId: "world-1", 
      contentSetId: "premium-collection",
      position: { x: 10, y: 2, z: -5 }
    },
    "gallery-01": {
      name: "ギャラリー自販機",
      spaceId: "gallery-a",
      contentSetId: "art-collection",
      position: { x: -5, y: 0, z: 0 }
    },
    "creator-corner": {
      name: "クリエーターコーナー",
      spaceId: "gallery-a",
      contentSetId: "creator-pack", 
      position: { x: 5, y: 1, z: 3 }
    }
  },
  
  // 📦 コンテンツセット設定
  CONTENT_SETS: {
    "starter-pack": {
      name: "スターターパック",
      description: "初心者向けの基本コンテンツセット",
      tipThresholds: [25, 50, 100] // 段階的なアンロック
    },
    "premium-collection": {
      name: "プレミアムコレクション", 
      description: "限定的なプレミアムコンテンツ",
      tipThresholds: [200, 300, 500]
    },
    "art-collection": {
      name: "アートコレクション",
      description: "アーティスト作品のデジタルコレクション",
      tipThresholds: [100, 250]
    },
    "creator-pack": {
      name: "クリエーターパック",
      description: "クリエイター制作のオリジナルコンテンツ",
      tipThresholds: [150, 350]
    }
  }
} as const;

// �🏭 将来のファクトリー機構用設定（メインネット移行時に使用）
export const FACTORY_CONFIG = {
  // FACTORY_ADDRESS: "0x...", // メインネット展開時に設定
  // MASTER_TEMPLATE: "0x...", // マスターコントラクトテンプレート
  // METATRON_OWNER: "0x66f1274ad5d042b7571c2efa943370dbcd3459ab", // METATRON管理者
} as const;

/* =========================================
   ✅ tNHT トークン設定（テストネット用）
========================================= */
export const TNHT_TOKEN = {
  ADDRESS: getAddress("0xdB738C7A83FE7738299a67741Ae2AbE42B3BA2Ea"),
  SYMBOL: "tNHT",
  DECIMALS: 18,
  NAME: "Test NHT Token",
  // シンプルなSVGアイコン（モバイル対応強化）
  ICON: "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIiIGhlaWdodD0iMzIiIHZpZXdCb3g9IjAgMCAzMiAzMiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMTYiIGN5PSIxNiIgcj0iMTYiIGZpbGw9IiM4MjQ3ZTMiLz4KPHN2ZyB4PSI2IiB5PSI2IiB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSI+CjxwYXRoIGQ9Ik0xMiAyQzYuNDggMiAyIDYuNDggMiAxMnM0LjQ4IDEwIDEwIDEwIDEwLTQuNDggMTAtMTBTMTcuNTIgMiAxMiAyem0tMiAxNWwtNS01aDNWOGg0djRoM2wtNSA1eiIgZmlsbD0id2hpdGUiLz4KPC9zdmc+Cjwvc3ZnPg=="
};

/* =========================================
   ✅ JPYC トークン設定
   📝 Polygon Mainnet & Amoy 対応
========================================= */
export const JPYC_TOKEN = {
  // Polygon Mainnet (ChainID: 137) & Polygon Amoy (ChainID: 80002)
  ADDRESS: getAddress("0xE7C3D8C9a439feDe00D2600032D5dB0Be71C3c29"),
  SYMBOL: "JPYC",
  DECIMALS: 18,
  NAME: "JPY Coin",
  ICON: "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIiIGhlaWdodD0iMzIiIHZpZXdCb3g9IjAgMCAzMiAzMiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMTYiIGN5PSIxNiIgcj0iMTYiIGZpbGw9IiMwMDg4Y2MiLz4KPHRleHQgeD0iNTAlIiB5PSI1MCUiIGRvbWluYW50LWJhc2VsaW5lPSJtaWRkbGUiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGZpbGw9IndoaXRlIiBmb250LXNpemU9IjE4IiBmb250LXdlaWdodD0iYm9sZCI+wqU8L3RleHQ+Cjwvc3ZnPg=="
};

/* =========================================
   ✅ 現在使用中のトークン設定
   📝 チェーンIDに応じて自動切り替え
   - Polygon Amoy (80002): tNHT
   - Polygon Mainnet (137): NHT (将来)
========================================= */
export function getActiveToken() {
  const chainId = polygonAmoy.id; // 現在のチェーン

  // テストネット（Amoy）ではtNHT、メインネット（将来）ではNHT/JPYC
  if (chainId === 80002) {
    return TNHT_TOKEN;
  }

  // メインネット（将来の拡張）
  // if (chainId === 137) {
  //   return NHT_TOKEN; // メインネット用NHTトークン
  // }

  // デフォルトはtNHT（テストネット想定）
  return TNHT_TOKEN;
}

export const TOKEN = getActiveToken();

/* =========================================
   ✅ viem 読み取り専用クライアント
========================================= */
export const publicClient = createPublicClient({
  chain: polygonAmoy,
  transport: http(
    // CORS対応のRPCを優先使用
    (import.meta as any)?.env?.VITE_ALCHEMY_RPC_URL || 
    "https://rpc-amoy.polygon.technology"
  ),
});

/* =========================================
   ✅ 読み取り専用の最小 ABI（view 関数）
   ※ ここに userNFTLevel / rankThresholds を戻すのがポイント！
========================================= */
export const READ_ABI = [
  {
    inputs: [],
    name: "owner",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "dailyRewardAmount",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "", type: "address" }],
    name: "userInfo",
    outputs: [
      { internalType: "uint256", name: "lastClaimed", type: "uint256" },
      { internalType: "uint256", name: "totalTips", type: "uint256" },
    ],
    stateMutability: "view",
    type: "function",
  },

  // 👇 これが抜けていたために currentLevel が常に 0 になっていた
  {
    inputs: [{ internalType: "address", name: "user", type: "address" }],
    name: "userNFTLevel",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    name: "rankThresholds",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },

  {
    inputs: [],
    name: "paused",
    outputs: [{ internalType: "bool", name: "", type: "bool" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

/* =========================================
   ✅ イベントABI

   🔧 NOTE: Deployed contract uses "Tipped" not "TipSent"
   Verified via blockchain analysis at Block 28083479
========================================= */
export const EVENT_ABI = [
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: "address", name: "user", type: "address" },
      { indexed: false, internalType: "uint256", name: "amount", type: "uint256" },
    ],
    name: "Tipped",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: "address", name: "user", type: "address" },
      { indexed: false, internalType: "uint256", name: "amount", type: "uint256" },
    ],
    name: "DailyRewardClaimed",
    type: "event",
  },
] as const;

/* =========================================
   ✅ フルABI（書き込み関数も含む）
========================================= */
export const CONTRACT_ABI = [
  ...READ_ABI,
  ...EVENT_ABI,
  {
    inputs: [],
    name: "claimDailyReward",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint256", name: "amount", type: "uint256" }],
    name: "tip",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "pause",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "unpause",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
] as const;

/* =========================================
   ✅ NFT コントラクト用 ABI (将来実装)
   📝 ERC721準拠 + Gifterra拡張機能
========================================= */
export const NFT_ABI = [
  // ERC721 標準関数
  {
    inputs: [{ internalType: "address", name: "owner", type: "address" }],
    name: "balanceOf",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint256", name: "tokenId", type: "uint256" }],
    name: "ownerOf",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint256", name: "tokenId", type: "uint256" }],
    name: "tokenURI",
    outputs: [{ internalType: "string", name: "", type: "string" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "from", type: "address" },
      { internalType: "address", name: "to", type: "address" },
      { internalType: "uint256", name: "tokenId", type: "uint256" },
    ],
    name: "transferFrom",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "to", type: "address" },
      { internalType: "uint256", name: "tokenId", type: "uint256" },
    ],
    name: "approve",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "operator", type: "address" },
      { internalType: "bool", name: "approved", type: "bool" },
    ],
    name: "setApprovalForAll",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  
  // Gifterra 拡張機能
  {
    inputs: [
      { internalType: "address", name: "to", type: "address" },
      { internalType: "uint256", name: "level", type: "uint256" },
    ],
    name: "mintLevelNFT",
    outputs: [{ internalType: "uint256", name: "tokenId", type: "uint256" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint256", name: "tokenId", type: "uint256" }],
    name: "getTokenLevel",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

/* =========================================
   ✅ Manager コントラクト用 ABI (将来実装)
   📝 SBT ⟷ NFT 連携管理
========================================= */
export const MANAGER_ABI = [
  {
    inputs: [{ internalType: "address", name: "user", type: "address" }],
    name: "getUserLevel",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint256", name: "sbtLevel", type: "uint256" }],
    name: "convertSBTtoNFT",
    outputs: [{ internalType: "uint256", name: "tokenId", type: "uint256" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint256", name: "tokenId", type: "uint256" }],
    name: "convertNFTtoSBT",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "user", type: "address" },
      { internalType: "uint256", name: "level", type: "uint256" },
    ],
    name: "syncLevel",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
] as const;

/* =========================================
   ✅ ERC20 最小ABI
========================================= */
export const ERC20_MIN_ABI = [
  {
    inputs: [],
    name: "owner",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "owner", type: "address" }],
    name: "balanceOf",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "owner", type: "address" },
      { internalType: "address", name: "spender", type: "address" },
    ],
    name: "allowance",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "spender", type: "address" },
      { internalType: "uint256", name: "amount", type: "uint256" },
    ],
    name: "approve",
    outputs: [{ internalType: "bool", name: "", type: "bool" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "decimals",
    outputs: [{ internalType: "uint8", name: "", type: "uint8" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "symbol",
    outputs: [{ internalType: "string", name: "", type: "string" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "to", type: "address" },
      { internalType: "uint256", name: "amount", type: "uint256" },
    ],
    name: "transfer",
    outputs: [{ internalType: "bool", name: "", type: "bool" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "from", type: "address" },
      { internalType: "address", name: "to", type: "address" },
      { internalType: "uint256", name: "amount", type: "uint256" },
    ],
    name: "transferFrom",
    outputs: [{ internalType: "bool", name: "", type: "bool" }],
    stateMutability: "nonpayable",
    type: "function",
  },
] as const;

/* =========================================
   ✅ PaymentSplitter ABI
   📝 GifterraPaySplitter v1.0.1 対応
   🎯 GIFT HUB購入時の収益分配に使用
========================================= */
export const PAYMENT_SPLITTER_ABI = [
  // donateERC20 - ERC20トークンでの支払い受け口
  {
    inputs: [
      { internalType: "address", name: "token", type: "address" },
      { internalType: "uint256", name: "amount", type: "uint256" },
      { internalType: "bytes32", name: "sku", type: "bytes32" },
      { internalType: "bytes32", name: "traceId", type: "bytes32" },
    ],
    name: "donateERC20",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  // donateNative - ネイティブ通貨での支払い受け口
  {
    inputs: [
      { internalType: "bytes32", name: "sku", type: "bytes32" },
      { internalType: "bytes32", name: "traceId", type: "bytes32" },
    ],
    name: "donateNative",
    outputs: [],
    stateMutability: "payable",
    type: "function",
  },
  // DonationReceived イベント
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: "address", name: "payer", type: "address" },
      { indexed: true, internalType: "address", name: "token", type: "address" },
      { indexed: false, internalType: "uint256", name: "amount", type: "uint256" },
      { indexed: true, internalType: "bytes32", name: "sku", type: "bytes32" },
      { indexed: false, internalType: "bytes32", name: "traceId", type: "bytes32" },
    ],
    name: "DonationReceived",
    type: "event",
  },
  // releaseAllERC20 - 全受益者へのERC20分配
  {
    inputs: [
      { internalType: "contract IERC20", name: "token", type: "address" },
    ],
    name: "releaseAllERC20",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  // releaseAll - 全受益者へのネイティブ通貨分配
  {
    inputs: [],
    name: "releaseAll",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  // owner - コントラクトオーナー取得
  {
    inputs: [],
    name: "owner",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

/* =========================================
   ✅ PaymentSplitter V2 ABI（可変機能対応）
========================================= */
export const PAYMENT_SPLITTER_V2_ABI = [
  // ========== 寄付受け口（v1互換） ==========
  {
    inputs: [
      { internalType: "bytes32", name: "sku", type: "bytes32" },
      { internalType: "bytes32", name: "traceId", type: "bytes32" },
    ],
    name: "donateNative",
    outputs: [],
    stateMutability: "payable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "token", type: "address" },
      { internalType: "uint256", name: "amount", type: "uint256" },
      { internalType: "bytes32", name: "sku", type: "bytes32" },
      { internalType: "bytes32", name: "traceId", type: "bytes32" },
    ],
    name: "donateERC20",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },

  // ========== 分配関数 ==========
  {
    inputs: [{ internalType: "address payable", name: "account", type: "address" }],
    name: "release",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "contract IERC20", name: "token", type: "address" },
      { internalType: "address", name: "account", type: "address" },
    ],
    name: "release",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "releaseAll",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ internalType: "contract IERC20", name: "token", type: "address" }],
    name: "releaseAllERC20",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },

  // ========== クリエイター管理（V2新機能） ==========
  {
    inputs: [
      { internalType: "address", name: "account", type: "address" },
      { internalType: "uint256", name: "shares_", type: "uint256" },
    ],
    name: "addPayee",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "account", type: "address" }],
    name: "removePayee",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "account", type: "address" },
      { internalType: "uint256", name: "newShares", type: "uint256" },
    ],
    name: "updateShares",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },

  // ========== View関数 ==========
  {
    inputs: [],
    name: "getAllPayees",
    outputs: [
      { internalType: "address[]", name: "payees", type: "address[]" },
      { internalType: "uint256[]", name: "shares", type: "uint256[]" },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "account", type: "address" }],
    name: "shares",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "totalShares",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "payeeCount",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "account", type: "address" }],
    name: "pendingNativePayment",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "contract IERC20", name: "token", type: "address" },
      { internalType: "address", name: "account", type: "address" },
    ],
    name: "pendingERC20Payment",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "getStats",
    outputs: [
      { internalType: "uint256", name: "payeeCount_", type: "uint256" },
      { internalType: "uint256", name: "totalShares_", type: "uint256" },
      { internalType: "uint256", name: "nativeBalance", type: "uint256" },
      { internalType: "uint256", name: "totalNativeReceived_", type: "uint256" },
      { internalType: "bool", name: "isPaused", type: "bool" },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "version",
    outputs: [{ internalType: "string", name: "", type: "string" }],
    stateMutability: "pure",
    type: "function",
  },

  // ========== Pause機能 ==========
  {
    inputs: [],
    name: "pause",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "unpause",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "paused",
    outputs: [{ internalType: "bool", name: "", type: "bool" }],
    stateMutability: "view",
    type: "function",
  },

  // ========== Owner管理 ==========
  {
    inputs: [],
    name: "owner",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "newOwner", type: "address" }],
    name: "transferOwnership",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },

  // ========== イベント ==========
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: "address", name: "payer", type: "address" },
      { indexed: true, internalType: "address", name: "token", type: "address" },
      { indexed: false, internalType: "uint256", name: "amount", type: "uint256" },
      { indexed: true, internalType: "bytes32", name: "sku", type: "bytes32" },
      { indexed: false, internalType: "bytes32", name: "traceId", type: "bytes32" },
    ],
    name: "DonationReceived",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: "address", name: "account", type: "address" },
      { indexed: false, internalType: "uint256", name: "shares", type: "uint256" },
    ],
    name: "PayeeAdded",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: "address", name: "account", type: "address" },
    ],
    name: "PayeeRemoved",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: "address", name: "account", type: "address" },
      { indexed: false, internalType: "uint256", name: "oldShares", type: "uint256" },
      { indexed: false, internalType: "uint256", name: "newShares", type: "uint256" },
    ],
    name: "SharesUpdated",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: "address", name: "account", type: "address" },
      { indexed: false, internalType: "uint256", name: "amount", type: "uint256" },
    ],
    name: "NativeReleased",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: "contract IERC20", name: "token", type: "address" },
      { indexed: true, internalType: "address", name: "account", type: "address" },
      { indexed: false, internalType: "uint256", name: "amount", type: "uint256" },
    ],
    name: "ERC20Released",
    type: "event",
  },
] as const;

/* =========================================
   ✅ GifterraFactory ABI
   📝 マルチテナント作成・管理用ファクトリー
========================================= */
export const GIFTERRA_FACTORY_ABI = [
  // createTenant - 新規テナント作成
  {
    inputs: [
      { internalType: "string", name: "tenantName", type: "string" },
      { internalType: "address", name: "admin", type: "address" },
      { internalType: "address", name: "rewardTokenAddress", type: "address" },
      { internalType: "address", name: "tipWalletAddress", type: "address" },
      { internalType: "uint8", name: "rankPlan", type: "uint8" },
    ],
    name: "createTenant",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "payable",
    type: "function",
  },
  // deploymentFee - 手数料取得
  {
    inputs: [],
    name: "deploymentFee",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  // getTenantInfo - テナント情報取得
  {
    inputs: [{ internalType: "uint256", name: "tenantId", type: "uint256" }],
    name: "getTenantInfo",
    outputs: [
      {
        components: [
          { internalType: "uint256", name: "tenantId", type: "uint256" },
          { internalType: "address", name: "admin", type: "address" },
          { internalType: "string", name: "tenantName", type: "string" },
          {
            components: [
              { internalType: "address", name: "gifterra", type: "address" },
              { internalType: "address", name: "rewardNFT", type: "address" },
              { internalType: "address", name: "payLitter", type: "address" },
              { internalType: "address", name: "journeyPass", type: "address" },
              { internalType: "address", name: "randomRewardEngine", type: "address" },
            ],
            internalType: "struct GifterraFactory.TenantContracts",
            name: "contracts",
            type: "tuple",
          },
          { internalType: "uint256", name: "createdAt", type: "uint256" },
          { internalType: "uint256", name: "lastActivityAt", type: "uint256" },
          { internalType: "bool", name: "isActive", type: "bool" },
          { internalType: "bool", name: "isPaused", type: "bool" },
        ],
        internalType: "struct GifterraFactory.TenantInfo",
        name: "",
        type: "tuple",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  // TenantCreated イベント
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: "uint256", name: "tenantId", type: "uint256" },
      { indexed: true, internalType: "address", name: "admin", type: "address" },
      { indexed: false, internalType: "string", name: "tenantName", type: "string" },
      { indexed: false, internalType: "address", name: "gifterra", type: "address" },
      { indexed: false, internalType: "address", name: "rewardNFT", type: "address" },
      { indexed: false, internalType: "address", name: "payLitter", type: "address" },
      { indexed: false, internalType: "address", name: "journeyPass", type: "address" },
      { indexed: false, internalType: "address", name: "randomRewardEngine", type: "address" },
    ],
    name: "TenantCreated",
    type: "event",
  },
] as const;