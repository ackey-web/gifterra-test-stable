import { getAddress } from "viem";
import { createPublicClient, http } from "viem";
import { polygonAmoy } from "viem/chains";

/* =========================================
   ✅ Gifterra コントラクト設定
========================================= */
export const CONTRACT_ADDRESS = getAddress(
  "0x0174477A1FCEb9dE25289Cd1CA48b6998C9cD7FC" // ← 最新デプロイの Gifterra
);

/* =========================================
   ✅ tNHT トークン設定（新デプロイ版）
========================================= */
export const TOKEN = {
  ADDRESS: getAddress("0xdB738C7A83FE7738299a67741Ae2AbE42B3BA2Ea"),
  SYMBOL: "tNHT",
  DECIMALS: 18,
  ICON: "https://i.imgur.com/nht-token.png",
};

/* =========================================
   ✅ viem 読み取り専用クライアント
========================================= */
export const publicClient = createPublicClient({
  chain: polygonAmoy,
  transport: http(),
});

/* =========================================
   ✅ 読み取り専用の最小 ABI（view 関数）
   ※ ここに userNFTLevel / rankThresholds を戻すのがポイント！
========================================= */
export const READ_ABI = [
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
   ✅ フルABI（書き込み関数も含む）
========================================= */
export const CONTRACT_ABI = [
  ...READ_ABI,
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
   ✅ ERC20 最小ABI
========================================= */
export const ERC20_MIN_ABI = [
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
] as const;