// src/admin/Dashboard.tsx
import React, { useEffect, useMemo, useState, useRef, useCallback } from "react";
import { useAddress, ConnectWallet, useContract, useContractRead } from "@thirdweb-dev/react";
import { ethers } from "ethers";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
} from "recharts";
import { CONTRACT_ADDRESS, CONTRACT_ABI, TOKEN } from "../contract";
import {
  fetchAnnotationsCached,
  prefetchAnnotations,
  pickDisplayName,
  pickMessage,
} from "../lib/annotations";
import { fetchTxMessages } from "../lib/annotations_tx";
import { setEmergencyFlag, readEmergencyFlag } from "../lib/emergency";
import { analyzeContributionHeat, isOpenAIConfigured, type ContributionHeat } from "../lib/ai_analysis.ts";
import VendingDashboardNew from "./vending/VendingDashboardNew";
import ProductManager from "./products/ProductManager";
import DiagnosticsPage from "./DiagnosticsPage";
import { uploadImage, deleteFileFromUrl } from "../lib/supabase";
import { calculateFileHash } from "../utils/fileHash";
import { RewardUIManagementPage, type AdData } from "./reward/RewardUIManagementPage";

/* ---------- Types & Helpers ---------- */
type Period = "day" | "week" | "month" | "all";
type TipItem = {
  from: string;
  amount: bigint;
  blockNumber: bigint;
  timestamp?: number;
  txHash?: string;
};

type PageType = "dashboard" | "reward-ui-management" | "tip-ui-management" | "vending-management" | "product-management" | "diagnostics" | "tenant-management";

// 🚀 将来のマルチテナント実装準備
// - tenant-management: テナント管理（スーパーアドミン専用）
// - plan-management: プラン管理（スーパーアドミン専用）
// - user-management: ユーザー管理（テナント管理者用）

const fmt18 = (v: bigint) => {
  try {
    const s = ethers.utils.formatUnits(v.toString(), TOKEN.DECIMALS);
    const [a, b = ""] = s.split(".");
    return b ? `${a}.${b.slice(0, 4)}` : a;
  } catch {
    return "0";
  }
};
const short = (addr: string) =>
  addr ? `${addr.slice(0, 10)}…${addr.slice(-4)}` : "—";

/* ---------- RPC Helpers ---------- */
const ALCHEMY_RPC = (import.meta as any)?.env?.VITE_ALCHEMY_RPC_URL;
const PUBLIC_RPC = "https://rpc-amoy.polygon.technology";
async function rpcWithFallback<T = any>(method: string, params: any[] = [], rpcUrl: string): Promise<T> {
  const requestBody = { jsonrpc: "2.0", id: 1, method, params };
  
  try {
    const res = await fetch(rpcUrl, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(requestBody),
    });
    
    if (!res.ok) {
      const errorText = await res.text();
      console.error("❌ HTTP Error Response Body:", errorText);
      
      // Parse Alchemy error for block range limits
      if (errorText.includes("10 block range") && rpcUrl.includes("alchemy.com")) {
        const error = new Error(`Alchemy Free tier limit: ${errorText}`);
        (error as any).isAlchemyLimit = true;
        throw error;
      }
      
      throw new Error(`HTTP ${res.status}: ${res.statusText} - ${errorText}`);
    }
    
    const j = await res.json();
    
    if (j.error) {
      const errorMessage = j.error.message || "Unknown RPC error";
      
      // インデックス処理中エラーの特別扱い
      if (errorMessage.includes("state histories haven't been fully indexed yet")) {
        console.warn("🏗️ Blockchain state indexing in progress:", {
          error: j.error,
          note: "This is normal for testnet - blockchain is building historical index"
        });
        const error = new Error(`Blockchain indexing in progress: ${errorMessage}`);
        (error as any).isIndexingError = true;
        throw error;
      }
      
      // Alchemy特有のエラーを検出
      if (errorMessage.includes("10 block range")) {
        const error = new Error(`Alchemy Free tier limit: ${errorMessage}`);
        (error as any).isAlchemyLimit = true;
        throw error;
      }
      
      console.error("❌ RPC error response:", j.error);
      throw new Error(`RPC Error: ${errorMessage} (code: ${j.error.code})`);
    }
    
    return j.result as T;
  } catch (error: any) {
    console.error("❌ RPC call failed:", {
      method,
      url: rpcUrl,
      error: error.message
    });
    throw error;
  }
}

async function rpc<T = any>(method: string, params: any[] = []): Promise<T> {
  // 🔧 履歴表示優先: Public RPCを最初に試行してAlchemyをフォールバックに
  try {
    const result = await rpcWithFallback<T>(method, params, PUBLIC_RPC);
    return result;
  } catch (publicError: any) {
    console.warn("⚠️ Public RPC failed, trying Alchemy:", publicError.message);
  }
  
  // Fallback to Alchemy (if configured and if Public RPC failed)
  if (ALCHEMY_RPC) {
    try {
      const result = await rpcWithFallback<T>(method, params, ALCHEMY_RPC);
      return result;
    } catch (error: any) {
      console.error("❌ All RPC endpoints failed");
      throw error;
    }
  }
  
  console.error("❌ All RPC endpoints failed");
  throw new Error("All RPC endpoints failed");
}
async function getLatestBlockNumber(): Promise<number> {
  const hex = await rpc<string>("eth_blockNumber");
  return parseInt(hex, 16);
}
async function getBlockTimestamp(num: number): Promise<number> {
  const block = await rpc<any>("eth_getBlockByNumber", [
    "0x" + num.toString(16),
    false,
  ]);
  return block?.timestamp ? parseInt(block.timestamp, 16) : 0;
}

/* ---------- Lookback ---------- */
// 🔧 パフォーマンス最適化: 期間別の適切なブロック範囲制限
// Polygon Amoyテストネットの平均ブロック時間: 約2秒

// 期間別の最適なブロック範囲（パフォーマンス重視）
const OPTIMIZED_LOOKBACK: Record<Exclude<Period, "all">, number> = {
  day: 43200,     // 1日分（24時間 × 60分 × 60秒 ÷ 2秒/ブロック）
  week: 302400,   // 1週間分（7日 × 43200ブロック）
  month: 1296000, // 30日分（30日 × 43200ブロック）
};

// 最大検索範囲制限（メモリ保護）
const MAX_BLOCK_RANGE = 500000; // 約11.5日分
const TOPIC_TIPPED = ethers.utils.keccak256(
  ethers.utils.toUtf8Bytes("Tipped(address,uint256)")
);

/* ---------- Loading Overlay ---------- */
function LoadingOverlay({ period }: { period?: Period }) {
  const [dots, setDots] = useState(".");
  
  React.useEffect(() => {
    const interval = setInterval(() => {
      setDots(prev => prev.length >= 3 ? "." : prev + ".");
    }, 500);
    return () => clearInterval(interval);
  }, []);
  
  const getLoadingInfo = () => {
    switch (period) {
      case "day":
        return { time: "高速 (~2秒)", color: "#10b981" };
      case "week":
        return { time: "中速 (~5秒)", color: "#f59e0b" };
      case "month":
        return { time: "中程度 (~10秒)", color: "#f97316" };
      case "all":
        return { time: "保護モード (~15秒)", color: "#ef4444" };
      default:
        return { time: "読み込み中", color: "#6366f1" };
    }
  };
  
  const loadingInfo = getLoadingInfo();
  
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0, 0, 0, 0.45)",
        backdropFilter: "blur(3px)",
        zIndex: 1000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        animation: "fadeIn .2s ease",
      }}
    >
      <div
        style={{
          background: "linear-gradient(145deg, #182235 0%, #111827 100%)",
          border: "1px solid rgba(255,255,255,0.12)",
          borderRadius: 16,
          boxShadow: "0 4px 20px rgba(0,0,0,0.4)",
          color: "#fff",
          padding: "24px 40px",
          fontSize: 16,
          fontWeight: 600,
          letterSpacing: 0.5,
          textAlign: "center",
          minWidth: 280,
        }}
      >
        <div style={{ marginBottom: 12 }}>
          ⚡ データを読み込み中{dots}
        </div>
        {period && (
          <div style={{ fontSize: 12, opacity: 0.8, display: "flex", flexDirection: "column", gap: 4 }}>
            <div>期間: <strong>{period === "all" ? "全期間" : period}</strong></div>
            <div style={{ color: loadingInfo.color }}>
              予想読み込み時間: <strong>{loadingInfo.time}</strong>
            </div>
            <div style={{ fontSize: 10, opacity: 0.6, marginTop: 4 }}>
              ⚡ パフォーマンス最適化済み
            </div>
          </div>
        )}
      </div>
      <style>{`
        @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
      `}</style>
    </div>
  );
}

/* ---------- Component ---------- */
export default function AdminDashboard() {
  // 🚀 マルチテナント実装準備: 現在のユーザー・テナント情報
  // const currentUser = getCurrentUser();
  // const currentTenant = getCurrentTenant();
  // const isMultiTenantMode = process.env.REACT_APP_MULTI_TENANT === 'true';
  const address = useAddress();
  const { contract } = useContract(CONTRACT_ADDRESS, CONTRACT_ABI);
  
  // ページ状態管理
  const [currentPage, setCurrentPage] = useState<PageType>("dashboard");
  const [adManagementData, setAdManagementData] = useState<AdData[]>([]);
  
  
  
  // 商品データの初期化・復元
  
  // コントラクト読み取り（適切なHook使用）
  const { data: contractBalance, error: contractBalanceError } = useContractRead(
    contract,
    "balanceOf",
    [CONTRACT_ADDRESS]
  );
  
  const { data: currentDailyReward, error: dailyRewardError } = useContractRead(
    contract,
    "dailyRewardAmount"
  );
  

  


  const [period, setPeriod] = useState<Period>("day");
  const [fromBlock, setFromBlock] = useState<bigint | undefined>();
  const [rawTips, setRawTips] = useState<TipItem[]>([]);
  const [blockTimeMap, setBlockTimeMap] = useState<Record<string, number>>({});
  const [isLoading, setIsLoading] = useState(true);

  const [emergencyStop, setEmergencyStop] = useState(false);
  useEffect(() => {
    setEmergencyStop(readEmergencyFlag());
  }, []);
  
  // 🎁 GIFT HUB ヘルパー関数
  

  

  
  
  
  // 広告データの読み込み
  const loadAdData = () => {
    console.log('📂 広告データ読み込み開始');
    try {
      const saved = localStorage.getItem('gifterra-ads');
      console.log('📂 localStorage "gifterra-ads":', saved);
      if (saved) {
        const parsed = JSON.parse(saved);
        console.log('📂 パース結果:', parsed);
        if (parsed.ads && Array.isArray(parsed.ads)) {
          console.log('✅ 広告データを設定:', parsed.ads);
          setAdManagementData(parsed.ads);
          return;
        }
      }
    } catch (error) {
      console.error('❌ Failed to load ad data:', error);
    }
    // デフォルトデータ
    console.log('📂 デフォルト広告データを設定');
    setAdManagementData([
      { src: "/ads/ad1.png", href: "https://example.com/1" },
      { src: "/ads/ad2.png", href: "https://example.com/2" },
      { src: "/ads/ad3.png", href: "https://example.com/3" }
    ]);
  };

  // 広告データの保存（useCallbackでメモ化）
  const saveAdData = useCallback((ads: AdData[]) => {
    try {
      localStorage.setItem('gifterra-ads', JSON.stringify({ ads }));
      setAdManagementData(ads);
      alert('広告設定を保存しました！');
    } catch (error) {
      console.error('Failed to save ad data:', error);
      alert('保存に失敗しました。');
    }
  }, []);

  // 初期化でデータ読み込み
  useEffect(() => {
    loadAdData();
  }, []);

  const [fillEmptyDays, setFillEmptyDays] = useState<boolean>(true);
  const [txMsgMap, setTxMsgMap] = useState<Record<string, Record<string, string>>>({});

  // 🆕 AI分析用state
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [heatResults, setHeatResults] = useState<ContributionHeat[]>([]);
  const [analysisProgress, setAnalysisProgress] = useState({ current: 0, total: 0 });

  /* ---------- 最新ブロック範囲取得（⚡ パフォーマンス最適化版） ---------- */
  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    (async () => {
      try {
        
        const latest = await getLatestBlockNumber();
        let fb: bigint;
        
        if (period === "all") {
          // 全期間でも最大範囲を制限（パフォーマンス保護）
          const maxFrom = Math.max(0, latest - MAX_BLOCK_RANGE);
          fb = BigInt(maxFrom);

        } else {
          // 期間別の最適化されたブロック範囲
          const lookback = OPTIMIZED_LOOKBACK[period];
          fb = BigInt(Math.max(0, latest - lookback));
        }

        if (!cancelled) setFromBlock(fb);
      } catch (e: any) {
        console.error("❌ Block range calculation failed:", e);
        if (!cancelled) setFromBlock(0n);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [period]);

  /* ---------- ログ取得 ---------- */
  useEffect(() => {
    let cancelled = false;
    if (fromBlock === undefined) return;
    setIsLoading(true);
    (async () => {
      try {
        const fromBlockHex = "0x" + fromBlock.toString(16);
        
        console.log("🔍 Fetching tip logs...", {
          CONTRACT_ADDRESS,
          fromBlock: fromBlock.toString(),
          fromBlockHex,
          TOPIC_TIPPED,
          primaryRPC: ALCHEMY_RPC || PUBLIC_RPC,
          period
        });

        const finalFromBlockHex = "0x" + fromBlock.toString(16);

        const logRequest = {
          address: CONTRACT_ADDRESS,
          fromBlock: finalFromBlockHex,
          toBlock: "latest",
          topics: [TOPIC_TIPPED],
        };
        
                const logs: any[] = await rpc("eth_getLogs", [logRequest]);

        const items: TipItem[] = logs.map((log) => {
          const topic1: string = log.topics?.[1] || "0x";
          const from = "0x" + topic1.slice(-40).toLowerCase();
          const amount = BigInt(log.data);
          const blockNumber = BigInt(parseInt(log.blockNumber, 16));
          const txHash = (log.transactionHash || "").toLowerCase();
          return { from, amount, blockNumber, txHash };
        });
        
        items.sort((a, b) =>
          a.blockNumber < b.blockNumber ? 1 : a.blockNumber > b.blockNumber ? -1 : 0
        );
        
        console.log("✅ Processed tip items:", {
          count: items.length,
          totalAmount: items.reduce((a, b) => a + b.amount, 0n).toString(),
          uniqueUsers: new Set(items.map(i => i.from)).size,
          sample: items.slice(0, 2)
        });
        
        if (!cancelled) {
          setRawTips(items);
          setIsLoading(false);
        }
      } catch (e: any) {
        const errorMsg = e?.message || e?.data?.message || "Unknown error";
        const isIndexingError = errorMsg.includes("state histories haven't been fully indexed yet");
        const isRpcError = errorMsg.includes("Internal JSON-RPC error");
        
        if (isIndexingError) {
          console.warn("🏗️ Blockchain indexing in progress - this is normal for testnet:", {
            message: errorMsg,
            fromBlock: fromBlock.toString(),
            period,
            note: "履歴インデックス処理中 - テストネット特有の現象"
          });
        } else if (isRpcError) {
          console.warn("🔧 RPC endpoint issue - trying alternative endpoints:", {
            message: errorMsg,
            primaryRPC: ALCHEMY_RPC || PUBLIC_RPC,
            fromBlock: fromBlock.toString(),
            period
          });
        } else {
          console.error("❌ Log fetch failed:", e);
          console.error("Error details:", {
            message: errorMsg,
            stack: e?.stack,
            primaryRPC: ALCHEMY_RPC || PUBLIC_RPC,
            CONTRACT_ADDRESS,
            fromBlock: fromBlock.toString(),
            period
          });
        }
        
        if (!cancelled) {
          setRawTips([]); // エラー時は空配列を設定
          setIsLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [fromBlock]);

  /* ---------- ブロックタイム キャッシュ（⚡ バッチ最適化版） ---------- */
  useEffect(() => {
    const run = async () => {
      if (!rawTips.length) return;
      const need = Array.from(
        new Set(
          rawTips
            .map((t) => t.blockNumber.toString())
            .filter((bn) => blockTimeMap[bn] === undefined)
        )
      );
      if (!need.length) return;
      
      
      const add: Record<string, number> = {};
      
      // バッチサイズで並列処理（RPC負荷分散）
      const BATCH_SIZE = 10;
      for (let i = 0; i < need.length; i += BATCH_SIZE) {
        const batch = need.slice(i, i + BATCH_SIZE);
        const results = await Promise.all(
          batch.map(async (bn) => {
            try {
              const ts = await getBlockTimestamp(Number(bn));
              return { bn, ts };
            } catch (e) {
              console.warn(`⚠️ Failed to get timestamp for block ${bn}:`, e);
              return { bn, ts: 0 };
            }
          })
        );
        for (const r of results) add[r.bn] = r.ts;
        
        // バッチ間で短い待機（RPC負荷軽減）
        if (i + BATCH_SIZE < need.length) {
          await new Promise(resolve => setTimeout(resolve, 50));
        }
      }
      
      setBlockTimeMap((prev) => ({ ...prev, ...add }));

    };
    run();
  }, [rawTips.length]);

  /* ---------- 集計 ---------- */
  const tips: TipItem[] = useMemo(
    () =>
      rawTips.map((t) => ({
        ...t,
        timestamp: blockTimeMap[t.blockNumber.toString()],
      })),
    [rawTips, blockTimeMap]
  );

  const filtered = useMemo(() => {
    if (period === "all") return tips;
    
    const now = Date.now();
    const today0 = new Date();
    today0.setHours(0, 0, 0, 0);
    const localOffset = today0.getTimezoneOffset() * 60000;
    const localToday = new Date(now - localOffset);
    localToday.setHours(0, 0, 0, 0);
    const todayStart = new Date(localToday.getTime() + localOffset);
    
    let fromSec: number;
    
    switch (period) {
      case "day": {
        fromSec = Math.floor(todayStart.getTime() / 1000);
        break;
      }
      case "week": {
        const dayOfWeek = new Date(now - localOffset).getDay();
        const weekStart = new Date(todayStart);
        weekStart.setDate(weekStart.getDate() - dayOfWeek);
        fromSec = Math.floor(weekStart.getTime() / 1000);
        break;
      }
      case "month": {
        const monthStart = new Date(todayStart);
        monthStart.setDate(1);
        fromSec = Math.floor(monthStart.getTime() / 1000);
        break;
      }
      default:
        fromSec = 0;
    }
    
    return tips.filter((t) => (t.timestamp ?? 0) >= fromSec);
  }, [tips, period]);

  const total = filtered.reduce((a, b) => a + b.amount, 0n);
  const uniqueUsers = useMemo(
    () => new Set(filtered.map((t) => t.from.toLowerCase())).size,
    [filtered]
  );

  const ranking = useMemo(() => {
    const map = new Map<string, bigint>();
    for (const t of filtered) {
      const a = t.from.toLowerCase();
      map.set(a, (map.get(a) ?? 0n) + t.amount);
    }
    return [...map.entries()]
      .map(([addr, amt]) => ({ addr, amount: amt }))
      .sort((a, b) => (b.amount > a.amount ? 1 : -1))
      .slice(0, 10);
  }, [filtered]);

  const [recentPage, setRecentPage] = useState(0);
  const [analysisPage, setAnalysisPage] = useState(0);
  const [showTipGraph, setShowTipGraph] = useState(true);
  const [showHeatGraph, setShowHeatGraph] = useState(false);
  const RECENT_PAGE_SIZE = 10;
  const ANALYSIS_ITEMS_PER_PAGE = 10;
  const totalRecentPages = Math.max(1, Math.ceil(filtered.length / RECENT_PAGE_SIZE));
  useEffect(() => {
    setRecentPage(0);
  }, [period, filtered.length]);

  /* ---------- Export Functions ---------- */
  const downloadFile = (filename: string, content: string, type: string) => {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const exportRankingCSV = () => {
    const headers = ["Rank", "Address", "Amount"];
    const rows = ranking.map((u, i) => [
      i + 1,
      u.addr,
      u.amount.toString()
    ]);
    const csv = [headers, ...rows].map(row => row.join(",")).join("\n");
    downloadFile(`gifterra-ranking-${periodLabel}.csv`, csv, "text/csv");
  };

  const exportRankingJSON = () => {
    const data = {
      metadata: {
        exportTime: new Date().toISOString(),
        period: periodLabel,
        totalUsers: ranking.length,
        contractAddress: CONTRACT_ADDRESS
      },
      ranking: ranking.map((u, i) => ({
        rank: i + 1,
        address: u.addr,
        totalAmount: u.amount.toString()
      }))
    };
    downloadFile(`gifterra-ranking-${periodLabel}.json`, JSON.stringify(data, null, 2), "application/json");
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const exportRecentCSV = () => {
    const headers = ["Timestamp", "From", "Name", "Amount", "TxHash", "Block"];
    const rows = filtered.map(t => [
      t.timestamp ? new Date(t.timestamp * 1000).toISOString() : "",
      t.from,
      nameFor(t.from),
      fmt18(t.amount),
      t.txHash || "",
      t.blockNumber
    ]);
    const csv = [headers, ...rows].map(row => row.join(",")).join("\n");
    downloadFile(`gifterra-recent-${periodLabel}.csv`, csv, "text/csv");
  };

  const exportRecentJSON = () => {
    const data = {
      metadata: {
        exportTime: new Date().toISOString(),
        period: periodLabel,
        totalTips: filtered.length,
        contractAddress: CONTRACT_ADDRESS
      },
      tips: filtered.map(t => ({
        timestamp: t.timestamp ? new Date(t.timestamp * 1000).toISOString() : null,
        from: t.from,
        name: nameFor(t.from),
        amount: fmt18(t.amount),
        txHash: t.txHash || "",
        blockNumber: t.blockNumber
      }))
    };
    downloadFile(`gifterra-recent-${periodLabel}.json`, JSON.stringify(data, null, 2), "application/json");
  };

  const exportAnalysisCSV = () => {
    const headers = ["Rank", "Address", "Name", "HeatScore", "HeatLevel", "Sentiment", "Keywords", "TotalAmount"];
    const rows = heatResults.map((r, i) => [
      i + 1,
      r.address,
      r.name,
      r.heatScore,
      r.heatLevel,
      r.sentimentScore,
      r.keywords.join("; "),
      r.totalAmount
    ]);
    const csv = [headers, ...rows].map(row => row.join(",")).join("\n");
    downloadFile(`gifterra-analysis-${periodLabel}.csv`, csv, "text/csv");
  };

  const exportAnalysisJSON = () => {
    const data = {
      metadata: {
        exportTime: new Date().toISOString(),
        period: periodLabel,
        totalAnalyzed: heatResults.length,
        contractAddress: CONTRACT_ADDRESS
      },
      analysis: heatResults.map((r, i) => ({
        rank: i + 1,
        address: r.address,
        name: r.name,
        heatScore: r.heatScore,
        heatLevel: r.heatLevel,
        sentiment: {
          label: r.sentimentLabel,
          score: r.sentimentScore
        },
        keywords: r.keywords,
        totalAmount: r.totalAmount
      }))
    };
    downloadFile(`gifterra-analysis-${periodLabel}.json`, JSON.stringify(data, null, 2), "application/json");
  };
  const recentPaged = useMemo(
    () =>
      filtered.slice(
        recentPage * RECENT_PAGE_SIZE,
        recentPage * RECENT_PAGE_SIZE + RECENT_PAGE_SIZE
      ),
    [filtered, recentPage]
  );

  const chartData = useMemo(() => {
    const getKeyFromTimestamp = (timestamp: number): string => {
      const d = new Date(timestamp * 1000);
      
      if (period === "day") {
        const hours = String(d.getHours()).padStart(2, "0");
        const minutes = Math.floor(d.getMinutes() / 15) * 15;
        const mins = String(minutes).padStart(2, "0");
        return `${hours}:${mins}`;
      } else {
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, "0");
        const day = String(d.getDate()).padStart(2, "0");
        return `${year}-${month}-${day}`;
      }
    };

    const getKeyFromDate = (d: Date): string => {
      if (period === "day") {
        const hours = String(d.getHours()).padStart(2, "0");
        const minutes = String(d.getMinutes()).padStart(2, "0");
        return `${hours}:${minutes}`;
      } else {
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, "0");
        const day = String(d.getDate()).padStart(2, "0");
        return `${year}-${month}-${day}`;
      }
    };

    const byPeriod = new Map<string, bigint>();
    for (const t of filtered) {
      if (!t.timestamp) continue;
      const key = getKeyFromTimestamp(t.timestamp);
      byPeriod.set(key, (byPeriod.get(key) ?? 0n) + t.amount);
    }

    const keys = [...byPeriod.keys()].sort();
    let minDate: Date;
    let maxDate: Date;
    const today0 = new Date();
    today0.setHours(0, 0, 0, 0);

    switch (period) {
      case "day": {
        minDate = new Date(today0);
        maxDate = new Date(today0);
        maxDate.setHours(23, 45, 0, 0);
        break;
      }
      
      case "week": {
        const dayOfWeek = today0.getDay();
        minDate = new Date(today0);
        minDate.setDate(minDate.getDate() - dayOfWeek);
        minDate.setHours(0, 0, 0, 0);
        maxDate = new Date(today0);
        break;
      }
      
      case "month": {
        minDate = new Date(today0.getFullYear(), today0.getMonth(), 1);
        maxDate = new Date(today0.getFullYear(), today0.getMonth() + 1, 0);
        break;
      }
      
      case "all":
      default:
        if (keys.length === 0) return [];
        const firstKey = keys[0];
        const lastKey = keys[keys.length - 1];
        minDate = new Date(firstKey);
        maxDate = new Date(lastKey);
        break;
    }

    if (!fillEmptyDays || period === "all") {
      return [...keys].map((key) => ({
        day: key,
        amount: Number(ethers.utils.formatUnits((byPeriod.get(key) ?? 0n).toString(), TOKEN.DECIMALS)),
      }));
    }

    const full: Array<{ day: string; amount: number }> = [];
    
    if (period === "day") {
      const cur = new Date(minDate);
      while (cur <= maxDate) {
        const key = getKeyFromDate(cur);
        const amt = byPeriod.get(key) ?? 0n;
        full.push({
          day: key,
          amount: Number(ethers.utils.formatUnits(amt.toString(), TOKEN.DECIMALS)),
        });
        cur.setMinutes(cur.getMinutes() + 15);
      }
    } else if (period === "week") {
      const cur = new Date(minDate);
      for (let i = 0; i <= 6; i++) {
        const key = getKeyFromDate(cur);
        const amt = byPeriod.get(key) ?? 0n;
        full.push({
          day: key,
          amount: Number(ethers.utils.formatUnits(amt.toString(), TOKEN.DECIMALS)),
        });
        cur.setDate(cur.getDate() + 1);
      }
    } else if (period === "month") {
      const cur = new Date(minDate);
      while (cur <= maxDate) {
        const key = getKeyFromDate(cur);
        const amt = byPeriod.get(key) ?? 0n;
        full.push({
          day: key,
          amount: Number(ethers.utils.formatUnits(amt.toString(), TOKEN.DECIMALS)),
        });
        cur.setDate(cur.getDate() + 1);
      }
    }
    
    return full;
  }, [filtered, fillEmptyDays, period]);

  const rangeBadge = useMemo(() => {
    const fmt = (d: Date) =>
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    if (chartData.length === 0) return "期間: —";
    const first = chartData[0].day;
    const last = chartData[chartData.length - 1].day;
    const a = new Date(first);
    const b = new Date(last);
    const days = Math.max(1, Math.round((+b - +a) / 86400000) + 1);
    return `期間: ${fmt(a)} 〜 ${fmt(b)}（${days}日）`;
  }, [chartData.length]);

  const pointsBadge = `データ点: ${chartData.length}`;

  // AI分析結果をグラフ用データに変換
  const heatChartData = useMemo(() => {
    if (!heatResults.length) return [];
    
    // 日付別の熱量を計算
    const heatByDay = new Map<string, number>();
    
    // filtered tipsとheatResultsをマッピング
    for (const tip of filtered) {
      const heatUser = heatResults.find(h => h.address.toLowerCase() === tip.from.toLowerCase());
      if (heatUser && tip.timestamp) {
        const day = new Date(tip.timestamp * 1000).toISOString().slice(0, 10);
        heatByDay.set(day, (heatByDay.get(day) || 0) + heatUser.heatScore);
      }
    }

    return Array.from(heatByDay.entries())
      .map(([day, heat]) => ({ day: day.slice(5), heat }))
      .sort((a, b) => a.day.localeCompare(b.day));
  }, [heatResults, filtered]);

  // グラフ用の統合データ
  const displayChartData = useMemo(() => {
    if (!showHeatGraph) return chartData;
    
    const combined = chartData.map(d => ({ ...d, heat: 0 }));
    
    for (const heatDay of heatChartData) {
      const existingDay = combined.find(d => d.day === heatDay.day);
      if (existingDay) {
        existingDay.heat = heatDay.heat;
      } else {
        combined.push({ day: heatDay.day, amount: 0, heat: heatDay.heat });
      }
    }
    
    return combined.sort((a, b) => a.day.localeCompare(b.day));
  }, [chartData, heatChartData, showHeatGraph]);

  const allAddrsToAnnotate = useMemo(() => {
    const s = new Set<string>();
    for (const r of ranking) s.add(r.addr.toLowerCase());
    for (const t of filtered) s.add(t.from.toLowerCase());
    return Array.from(s);
  }, [filtered, ranking]);

  const [annMap, setAnnMap] = useState<Map<string, any>>(new Map());
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!allAddrsToAnnotate.length) {
        setAnnMap(new Map());
        return;
      }
      
      // ⚡ 大量のアドレスがある場合は最初の100件のみに制限
      const limitedAddrs = allAddrsToAnnotate.length > 100 
        ? allAddrsToAnnotate.slice(0, 100)
        : allAddrsToAnnotate;
      
      if (limitedAddrs.length !== allAddrsToAnnotate.length) {

      }
      
      await prefetchAnnotations(limitedAddrs);
      const m = await fetchAnnotationsCached(limitedAddrs);
      if (!cancelled) setAnnMap(m);
    })();
    return () => {
      cancelled = true;
    };
  }, [allAddrsToAnnotate.join("|")]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!allAddrsToAnnotate.length) {
        if (!cancelled) setTxMsgMap({});
        return;
      }
      
      // ⚡ TXメッセージは最初の50件のみに制限（パフォーマンス優先）
      const limitedAddrs = allAddrsToAnnotate.length > 50 
        ? allAddrsToAnnotate.slice(0, 50)
        : allAddrsToAnnotate;
      
      try {
        if (limitedAddrs.length !== allAddrsToAnnotate.length) {

        }
        const m = await fetchTxMessages(limitedAddrs);
        if (!cancelled) setTxMsgMap(m || {});
      } catch (e) {
        console.warn("fetchTxMessages failed", e);
        if (!cancelled) setTxMsgMap({});
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [allAddrsToAnnotate.join("|")]);

  const nameFor = (address: string) => {
    const a = annMap.get(address.toLowerCase()) ?? null;
    return pickDisplayName(address, a, undefined);
  };

  const engagementTX = useMemo(() => {
    const totalTx = filtered.length;
    if (totalTx === 0) return { withMessageRate: 0, uniqueAuthors: 0 };

    let withMsg = 0;
    const authorsWithMsg = new Set<string>();
    for (const t of filtered) {
      const addrL = (t.from || "").toLowerCase();
      const txHash = (t.txHash || "").toLowerCase();
      const has = !!(txHash && txMsgMap[addrL] && txMsgMap[addrL][txHash]);
      if (has) {
        withMsg++;
        authorsWithMsg.add(addrL);
      }
    }
    return {
      withMessageRate: withMsg / totalTx,
      uniqueAuthors: authorsWithMsg.size,
    };
  }, [filtered, txMsgMap]);

  // 🆕 AI分析実行
  const handleAIAnalysis = async () => {
    setIsAnalyzing(true);
    setHeatResults([]);
    
    // 詳細パネルまでスクロール
    setTimeout(() => {
      document.getElementById('ai-detail-panel')?.scrollIntoView({ 
        behavior: 'smooth' 
      });
    }, 100);
    
    try {
      // メッセージ付きTipデータを準備
      const tipsWithMessages = filtered.map(t => {
        const addrL = t.from.toLowerCase();
        const txHash = (t.txHash || "").toLowerCase();
        const ann = annMap.get(addrL);
        const txMsg = (txHash && txMsgMap?.[addrL]?.[txHash]) || "";
        const msg = txMsg || pickMessage(ann) || "";
        
        return {
          from: t.from,
          amount: t.amount,
          timestamp: t.timestamp,
          message: msg,
        };
      });
      
      // 名前マップ作成
      const nameMap = new Map<string, string>();
      for (const addr of allAddrsToAnnotate) {
        nameMap.set(addr, nameFor(addr));
      }
      
      // AI分析実行
      const results = await analyzeContributionHeat(
        tipsWithMessages,
        nameMap,
        (current, total) => {
          setAnalysisProgress({ current, total });
        }
      );
      
      setHeatResults(results);
    } catch (error) {
      console.error("AI analysis failed:", error);
      alert("AI分析に失敗しました。APIキーを確認してください。");
    } finally {
      setIsAnalyzing(false);
    }
  };

  /* ---------- 共通スタイル ---------- */
  const card: React.CSSProperties = {
    background: "rgba(255,255,255,.06)",
    borderRadius: 12,
    padding: 12,
    boxSizing: "border-box",
  };
  const th: React.CSSProperties = {
    padding: "8px 6px",
    textAlign: "left",
    borderBottom: "1px solid rgba(255,255,255,.08)",
    fontWeight: 700,
    fontSize: 12,
  };
  const td: React.CSSProperties = {
    padding: "8px 6px",
    borderBottom: "1px solid rgba(255,255,255,.06)",
    fontSize: 12,
    verticalAlign: "top",
  };
  const tableBox: React.CSSProperties = { width: "100%", overflowX: "auto" };
  const tableStyle: React.CSSProperties = {
    width: "100%",
    borderCollapse: "collapse",
    tableLayout: "fixed",
  };
  const periodLabel =
    period === "day" ? "day" : period === "week" ? "week" : period === "month" ? "month" : "all";



  // 広告データをコンポーネント内で管理するために状態を昇格
  const [editingAds, setEditingAds] = useState<AdData[]>([]);

  // 以前の画像URLを追跡（古い画像削除用）
  const previousAdImagesRef = useRef<string[]>([]);

  // adManagementDataが変わったらeditingAdsを更新（初回のみ）
  useEffect(() => {
    if (editingAds.length === 0 && adManagementData.length > 0) {
      console.log('🔄 広告データ初期化:', adManagementData);
      setEditingAds(adManagementData);
    }
  }, [adManagementData, editingAds.length]);

  // デバッグ: editingAdsの状態を確認
  useEffect(() => {
    console.log('📋 editingAds更新:', editingAds);
  }, [editingAds]);

  // 広告データ操作関数（useCallbackでメモ化して再マウント時も保持）
  const updateAd = useCallback((index: number, field: 'src' | 'href', value: string) => {
    setEditingAds(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  }, []);

  const addAdSlot = useCallback(() => {
    setEditingAds(prev => {
      if (prev.length < 3) {
        return [...prev, { src: '', href: '' }];
      }
      return prev;
    });
  }, []);

  const removeAdSlot = useCallback((index: number) => {
    setEditingAds(prev => prev.filter((_, i) => i !== index));
  }, []);

  // RewardUIManagementPageは別ファイルに分離済み (src/admin/reward/RewardUIManagementPage.tsx)
  // ここには定義しない（ProductFormと同じパターン）

  // ---- リワードトークンチャージコンポーネント ----
  const RewardTokenChargeSection = () => {
    const [chargeAmount, setChargeAmount] = useState("");
    const [isCharging, setIsCharging] = useState(false);

    const handleChargeTokens = async () => {
      if (!chargeAmount || !contract || !address) {
        alert("⚠️ チャージ金額を入力してください");
        return;
      }

      const amount = parseFloat(chargeAmount);
      if (amount <= 0) {
        alert("⚠️ 正の数値を入力してください");
        return;
      }

      try {
        setIsCharging(true);
        
        // Wei単位に変換
        const amountWei = ethers.utils.parseEther(amount.toString());
        
        // コントラクトに直接トークンを転送
        const tx = await (contract as any).call("transfer", [CONTRACT_ADDRESS, amountWei]);
        
        alert(`✅ ${amount} ${TOKEN.SYMBOL} をコントラクトにチャージしました！\nTxHash: ${tx.hash || 'N/A'}`);
        setChargeAmount("");
        
      } catch (error: any) {
        console.error("チャージエラー:", error);
        
        let errorMessage = "❌ チャージに失敗しました\n\n";
        const msg = (error?.message || "").toLowerCase();
        
        if (msg.includes("insufficient funds") || msg.includes("transfer amount exceeds balance")) {
          errorMessage += "残高不足: ウォレットに十分なトークンがありません";
        } else if (msg.includes("user rejected") || msg.includes("user denied")) {
          errorMessage += "ユーザーによってキャンセルされました";
        } else {
          errorMessage += `エラー詳細: ${error?.message || "不明なエラー"}`;
        }
        
        alert(errorMessage);
      } finally {
        setIsCharging(false);
      }
    };

    return (
      <div style={{ marginBottom: 24, padding: 16, background: "rgba(255,255,255,.04)", borderRadius: 8 }}>
        <h3 style={{ margin: "0 0 12px 0", fontSize: 16 }}>🔋 トークンチャージ</h3>
        <div style={{ marginBottom: 12 }}>
          <label style={{ display: "block", marginBottom: 6, fontSize: 14 }}>
            チャージ金額 ({TOKEN.SYMBOL})
          </label>
          <input
            type="number"
            value={chargeAmount}
            onChange={(e) => setChargeAmount(e.target.value)}
            placeholder="例: 1000"
            min="0"
            step="0.01"
            style={{
              width: "100%",
              padding: "10px 12px",
              borderRadius: 6,
              border: "1px solid rgba(255,255,255,.2)",
              background: "rgba(0,0,0,.3)",
              color: "#fff",
              fontSize: 14
            }}
          />
        </div>
        <button
          onClick={handleChargeTokens}
          disabled={isCharging || !chargeAmount}
          style={{
            background: isCharging ? "#666" : "#16a34a",
            color: "#fff",
            border: "none",
            borderRadius: 6,
            padding: "10px 16px",
            fontSize: 14,
            fontWeight: 600,
            cursor: isCharging ? "not-allowed" : "pointer",
            opacity: isCharging || !chargeAmount ? 0.7 : 1
          }}
        >
          {isCharging ? "チャージ中..." : "💰 トークンをチャージ"}
        </button>
        <div style={{ fontSize: 12, opacity: 0.7, marginTop: 8 }}>
          ⚠️ 注意: ウォレットに十分なトークン残高があることを確認してください
        </div>
      </div>
    );
  };

  // ---- リワード量設定コンポーネント ----
  const RewardAmountSettingSection = () => {
    const [newDailyReward, setNewDailyReward] = useState("");
    const [isUpdatingReward, setIsUpdatingReward] = useState(false);

    const handleUpdateDailyReward = async () => {
      if (!newDailyReward || !contract || !address) {
        alert("⚠️ 新しい日次リワード量を入力してください");
        return;
      }

      const amount = parseFloat(newDailyReward);
      if (amount <= 0) {
        alert("⚠️ 正の数値を入力してください");
        return;
      }

      try {
        setIsUpdatingReward(true);
        
        // Wei単位に変換
        const amountWei = ethers.utils.parseEther(amount.toString());
        
        // 日次リワード量を更新
        const tx = await (contract as any).call("setDailyRewardAmount", [amountWei]);
        
        alert(`✅ 日次リワード量を ${amount} ${TOKEN.SYMBOL} に更新しました！\nTxHash: ${tx.hash || 'N/A'}`);
        setNewDailyReward("");
        
      } catch (error: any) {
        console.error("リワード量更新エラー:", error);
        
        let errorMessage = "❌ リワード量の更新に失敗しました\n\n";
        const msg = (error?.message || "").toLowerCase();
        
        if (msg.includes("ownable: caller is not the owner") || msg.includes("access denied")) {
          errorMessage += "権限エラー: コントラクトオーナーのみ実行可能です";
        } else if (msg.includes("user rejected") || msg.includes("user denied")) {
          errorMessage += "ユーザーによってキャンセルされました";
        } else {
          errorMessage += `エラー詳細: ${error?.message || "不明なエラー"}`;
        }
        
        alert(errorMessage);
      } finally {
        setIsUpdatingReward(false);
      }
    };

    return (
      <div style={{ padding: 16, background: "rgba(255,255,255,.04)", borderRadius: 8 }}>
        <h3 style={{ margin: "0 0 12px 0", fontSize: 16 }}>⚙️ 日次リワード量設定</h3>
        <div style={{ marginBottom: 12 }}>
          <label style={{ display: "block", marginBottom: 6, fontSize: 14 }}>
            新しい日次リワード量 ({TOKEN.SYMBOL})
          </label>
          <input
            type="number"
            value={newDailyReward}
            onChange={(e) => setNewDailyReward(e.target.value)}
            placeholder="例: 10"
            min="0"
            step="0.01"
            style={{
              width: "100%",
              padding: "10px 12px",
              borderRadius: 6,
              border: "1px solid rgba(255,255,255,.2)",
              background: "rgba(0,0,0,.3)",
              color: "#fff",
              fontSize: 14
            }}
          />
        </div>
        <button
          onClick={handleUpdateDailyReward}
          disabled={isUpdatingReward || !newDailyReward}
          style={{
            background: isUpdatingReward ? "#666" : "#dc2626",
            color: "#fff",
            border: "none",
            borderRadius: 6,
            padding: "10px 16px",
            fontSize: 14,
            fontWeight: 600,
            cursor: isUpdatingReward ? "not-allowed" : "pointer",
            opacity: isUpdatingReward || !newDailyReward ? 0.7 : 1
          }}
        >
          {isUpdatingReward ? "更新中..." : "⚙️ リワード量を更新"}
        </button>
        <div style={{ fontSize: 12, opacity: 0.7, marginTop: 8 }}>
          ⚠️ 注意: この操作はコントラクトオーナーのみ実行可能です
        </div>
      </div>
    );
  };

  // ---- Tip UI管理ページ ----
  const TipUIManagementPage = () => {
    const [tipBgImage, setTipBgImage] = useState<string>(() => {
      return localStorage.getItem('tip-bg-image') || '';
    });

    // 以前の背景画像URLを追跡（古い画像削除用）
    const previousTipBgRef = useRef<string>(localStorage.getItem('tip-bg-image') || '');

    const handleSaveTipBg = () => {
      if (tipBgImage) {
        localStorage.setItem('tip-bg-image', tipBgImage);
      } else {
        localStorage.removeItem('tip-bg-image');
      }
      alert('✅ TIP UI背景画像の設定を保存しました！');
    };

    return (
      <div style={{
        width: "min(800px, 96vw)",
        margin: "20px auto",
        background: "rgba(255,255,255,.04)",
        borderRadius: 12,
        padding: 24,
      }}>
        <h2 style={{ margin: "0 0 20px 0", fontSize: 24, fontWeight: 800 }}>
          💸 TIP UI 総合管理
        </h2>

        {/* 背景画像設定セクション */}
        <div style={{ marginBottom: 20, padding: 16, background: "rgba(255,255,255,.04)", borderRadius: 8 }}>
          <h3 style={{ margin: "0 0 10px 0", fontSize: 16 }}>🎨 TIP UI 背景画像設定</h3>
          <ul style={{ margin: "0 0 16px 0", paddingLeft: 20, opacity: 0.8, fontSize: 14 }}>
            <li>TIP UI の背景画像を設定できます</li>
          </ul>

          <div style={{ marginBottom: 12 }}>

            <input
              type="file"
              accept="image/*"
              style={{ display: "none" }}
              id="tip-bg-upload"
              onChange={async (e) => {
                console.log('📁 TIP背景画像選択イベント発火', e.target.files);
                const file = e.target.files?.[0];
                if (file) {
                  console.log('📤 TIP背景画像アップロード開始:', { name: file.name, size: file.size });
                  try {
                    // ファイルハッシュを計算して重複チェック
                    const fileHash = await calculateFileHash(file);
                    console.log('🔍 ファイルハッシュ:', fileHash);

                    // 新しい背景画像をアップロード
                    const imageUrl = await uploadImage(file, 'gh-public');
                    console.log('✅ TIP背景画像アップロード完了:', imageUrl);

                    if (imageUrl) {
                      // 古い背景画像を削除（差し替えの場合）
                      const previousUrl = previousTipBgRef.current;
                      if (previousUrl && previousUrl !== imageUrl) {
                        console.log('🗑️ 古いTIP背景画像を削除:', previousUrl);
                        const deleted = await deleteFileFromUrl(previousUrl);
                        if (deleted) {
                          console.log('✅ 古いTIP背景画像を削除しました');
                        }
                      }

                      // 新しい背景画像を設定
                      setTipBgImage(imageUrl);
                      previousTipBgRef.current = imageUrl;
                      alert('✅ 背景画像のアップロードが完了しました！\n保存ボタンを押して設定を保存してください。');
                    }
                  } catch (error: any) {
                    console.error('❌ TIP背景画像アップロードエラー:', error);
                    alert(`❌ 背景画像のアップロードに失敗しました。\n\nエラー: ${error?.message || '不明なエラー'}\n\n詳細はコンソールを確認してください。`);
                  } finally {
                    // ファイル入力をリセット
                    e.target.value = '';
                  }
                } else {
                  console.log('⚠️ TIP背景画像が選択されませんでした');
                }
              }}
            />
            <button
              type="button"
              onClick={() => document.getElementById('tip-bg-upload')?.click()}
              style={{
                padding: "10px 16px",
                background: "#dc2626",
                color: "#fff",
                border: "none",
                borderRadius: 4,
                fontSize: 14,
                cursor: "pointer",
                width: "100%"
              }}
            >
              📁 ファイルを選択
            </button>
          </div>

          {/* プレビュー */}
          {tipBgImage && (
            <div style={{ marginTop: 16 }}>
              <div style={{ fontSize: 14, opacity: 0.8, marginBottom: 8 }}>プレビュー:</div>
              <div style={{
                width: "100%",
                height: 200,
                background: `url(${tipBgImage}) center/cover`,
                borderRadius: 8,
                border: "2px solid rgba(255,255,255,.2)"
              }} />
            </div>
          )}

          <button
            onClick={handleSaveTipBg}
            style={{
              background: "#dc2626",
              color: "#fff",
              border: "none",
              borderRadius: 8,
              padding: "10px 20px",
              fontWeight: 800,
              cursor: "pointer",
              marginTop: 16,
              width: "100%"
            }}
          >
            💾 保存
          </button>
        </div>

        {/* TIP UI URL表示セクション */}
        <div style={{ marginTop: 32, padding: 16, background: "rgba(220, 38, 38, 0.1)", border: "1px solid rgba(220, 38, 38, 0.3)", borderRadius: 8 }}>
          <h3 style={{ margin: "0 0 10px 0", fontSize: 16 }}>🔗 TIP UI ページURL</h3>
          <div style={{ fontSize: 14, opacity: 0.8, marginBottom: 12 }}>
            このURLをユーザーに共有してください
          </div>

          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input
              type="text"
              value={typeof window !== 'undefined' ? `${window.location.origin}/tip` : '/tip'}
              readOnly
              style={{
                flex: 1,
                padding: '8px 12px',
                fontSize: 13,
                color: 'rgba(255,255,255,0.9)',
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(220, 38, 38, 0.4)',
                borderRadius: 6,
                fontFamily: 'monospace',
                outline: 'none'
              }}
            />
            <button
              onClick={() => {
                const url = typeof window !== 'undefined' ? `${window.location.origin}/tip` : '/tip';
                navigator.clipboard.writeText(url);
                const btn = document.activeElement as HTMLButtonElement;
                if (btn) {
                  const originalText = btn.textContent;
                  btn.textContent = '✓ コピー完了';
                  setTimeout(() => {
                    btn.textContent = originalText;
                  }, 1500);
                }
              }}
              style={{
                padding: '8px 16px',
                fontSize: 13,
                fontWeight: 600,
                color: '#fff',
                background: 'rgba(220, 38, 38, 0.8)',
                border: 'none',
                borderRadius: 6,
                cursor: 'pointer',
                transition: 'all 0.2s',
                whiteSpace: 'nowrap'
              }}
            >
              📋 コピー
            </button>
          </div>
        </div>
      </div>
    );
  };

  // ---- テナント管理ページ（将来実装）----
  const TenantManagementPage = () => {
    return (
      <div style={{
        padding: 24,
      }}>
        <h2 style={{ margin: "0 0 20px 0", fontSize: 24, fontWeight: 800 }}>
          🏢 テナント管理（スーパーアドミン専用）
        </h2>
        
        <div style={{ 
          padding: 40, 
          background: "rgba(124, 45, 18, 0.1)", 
          border: "1px solid rgba(124, 45, 18, 0.3)",
          borderRadius: 12, 
          textAlign: "center"
        }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🚀</div>
          <h3 style={{ margin: "0 0 12px 0", fontSize: 18, color: "#dc2626" }}>
            マルチテナント機能（開発予定）
          </h3>
          <p style={{ margin: "0 0 16px 0", fontSize: 14, opacity: 0.8, lineHeight: 1.6 }}>
            将来実装予定の機能：<br />
            • 導入者（テナント）の管理<br />
            • プラン・機能制限の設定<br />
            • 課金・請求管理<br />
            • 利用統計・分析
          </p>
          <div style={{ 
            background: "rgba(255,255,255,0.04)", 
            padding: 16, 
            borderRadius: 8, 
            marginTop: 20,
            fontSize: 12,
            opacity: 0.7
          }}>
            <strong>📝 実装準備状況：</strong><br />
            ✅ 基本型定義完了<br />
            ✅ 権限管理基盤完了<br />
            ✅ 機能制限コンポーネント完了<br />
            🚧 UI実装（未着手）<br />
            🚧 データベース設計（未着手）<br />
            🚧 認証システム（未着手）
          </div>
        </div>
      </div>
    );
  };

  /* ---------- 画面 ---------- */

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#0b1620",
        color: "#fff",
        padding: 16,
        position: "relative",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* 最上部ヘッダー */}
      <header
        style={{
          width: "min(1120px, 96vw)",
          margin: "0 auto",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 12,
          padding: "16px 0 24px 0",
          borderBottom: "1px solid rgba(255,255,255,0.1)",
        }}
      >
        <img src="/gifterra-logo.png" alt="GIFTERRA" style={{ height: 32 }} />
        <h1 style={{ margin: 0, fontSize: 28, fontWeight: 700 }}>
          GIFTERRA admin : Dashboard
        </h1>
      </header>

      {/* ナビゲーションボタン */}
      <nav
        style={{
          width: "min(1120px, 96vw)",
          margin: "0 auto 24px",
          display: "flex",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <button
          onClick={() => setCurrentPage("dashboard")}
          style={{
            background: currentPage === "dashboard" ? "#16a34a" : "#374151",
            color: "#fff",
            border: "none",
            borderRadius: 8,
            padding: "8px 16px",
            fontWeight: 700,
            cursor: "pointer",
            fontSize: 14,
          }}
        >
          📊 ダッシュボード
        </button>
        <button
          onClick={() => setCurrentPage("reward-ui-management")}
          style={{
            background: currentPage === "reward-ui-management" ? "#7c3aed" : "#374151",
            color: "#fff",
            border: "none",
            borderRadius: 8,
            padding: "8px 16px",
            fontWeight: 700,
            cursor: "pointer",
            fontSize: 14,
          }}
        >
          REWARD管理
        </button>
        <button
          onClick={() => setCurrentPage("tip-ui-management")}
          style={{
            background: currentPage === "tip-ui-management" ? "#dc2626" : "#374151",
            color: "#fff",
            border: "none",
            borderRadius: 8,
            padding: "8px 16px",
            fontWeight: 700,
            cursor: "pointer",
            fontSize: 14,
          }}
        >
          TIP管理
        </button>
        <button
          onClick={() => setCurrentPage("vending-management")}
          style={{
            background: currentPage === "vending-management" ? "#059669" : "#374151",
            color: "#fff",
            border: "none",
            borderRadius: 8,
            padding: "8px 16px",
            fontWeight: 700,
            cursor: "pointer",
            fontSize: 14,
          }}
        >
          🏪 GIFT HUB管理
        </button>
        {/* 🚀 将来のマルチテナント実装: スーパーアドミン専用ボタン */}
        {/* {currentUser?.role === UserRole.SUPER_ADMIN && (
          <button
            onClick={() => setCurrentPage("tenant-management")}
            style={{
              background: currentPage === "tenant-management" ? "#7c2d12" : "#374151",
              color: "#fff",
              border: "none",
              borderRadius: 8,
              padding: "8px 16px",
              fontWeight: 700,
              cursor: "pointer",
              fontSize: 14,
            }}
          >
            🏢 テナント管理
          </button>
        )} */}
      </nav>

      {/* システム制御ボタン */}
      <div
        style={{
          width: "min(1120px, 96vw)",
          margin: "0 auto 16px",
          display: "flex",
          gap: 8,
          justifyContent: "flex-end",
        }}
      >
        <button
          onClick={() => window.location.reload()}
          style={{
            background: "#0ea5e9",
            color: "#fff",
            border: "none",
            borderRadius: 6,
            padding: "6px 12px",
            fontWeight: 600,
            cursor: "pointer",
            fontSize: 12,
          }}
        >
          🔄 リロード
        </button>
        <button
          onClick={() => {
            if (emergencyStop) {
              setEmergencyStop(false);
              setEmergencyFlag(false);
            } else {
              setEmergencyStop(true);
              setEmergencyFlag(true);
            }
          }}
          style={{
            background: emergencyStop ? "#16a34a" : "#dc2626",
            color: "#fff",
            border: "none",
            borderRadius: 6,
            padding: "6px 12px",
            fontWeight: 600,
            cursor: "pointer",
            fontSize: 12,
            minWidth: 100,
          }}
        >
          {emergencyStop ? "🟢 稼働再開" : "🛑 緊急停止"}
        </button>
      </div>

      {/* システム状況・ウォレット接続パネル */}
      <div style={{
        margin: "12px auto",
        width: "min(1120px, 96vw)",
        display: "grid",
        gridTemplateColumns: "2fr 1fr",
        gap: 12,
      }}>
        {/* システム状況表示 */}
        <div style={{
          background: "rgba(255,255,255,.04)",
          borderRadius: 8,
          padding: 12,
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 12,
          fontSize: 12
        }}>
          <div>
            <div style={{ opacity: 0.7, marginBottom: 4 }}>🛡️ システム</div>
            <div style={{ fontWeight: 600, color: emergencyStop ? "#ef4444" : "#10b981" }}>
              {emergencyStop ? "🔴 停止中" : "🟢 稼働中"}
            </div>
          </div>
          <div>
            <div style={{ opacity: 0.7, marginBottom: 4 }}>🔗 RPC状況</div>
            <div style={{ fontWeight: 600, fontSize: 11 }}>
              {ALCHEMY_RPC 
                ? "✅ Alchemy + Public RPC" 
                : "🔄 Public RPC Only"}
            </div>
            <div style={{ fontSize: 10, opacity: 0.5, marginTop: 2 }}>
              {ALCHEMY_RPC ? "Alchemy Free (10ブロック制限)" : "Polygon公式"}
            </div>
          </div>
          <div>
            <div style={{ opacity: 0.7, marginBottom: 4 }}>🤖 AI分析</div>
            <div style={{ fontWeight: 600 }}>
              {isOpenAIConfigured() ? "✅ OpenAI API" : "⚠️ Mock分析"}
            </div>
            <div style={{ fontSize: 10, opacity: 0.5, marginTop: 2 }}>
              {isOpenAIConfigured() ? "GPT-4o-mini" : "キーワードマッチング"}
            </div>
          </div>
          <div>
            <div style={{ opacity: 0.7, marginBottom: 4 }}>⚡ パフォーマンス</div>
            <div style={{ fontWeight: 600, color: "#10b981" }}>
              ✅ 最適化済み
            </div>
            <div style={{ fontSize: 10, opacity: 0.5, marginTop: 2 }}>
              期間別制限 + バッチ処理
            </div>
          </div>
        </div>

        {/* ウォレット接続・管理者権限パネル */}
        <div style={{
          background: "rgba(255,255,255,.04)",
          borderRadius: 8,
          padding: 12,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          gap: 12,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, justifyContent: "center" }}>
            <ConnectWallet 
              theme="dark" 
              modalTitle="管理者ダッシュボード接続"
              modalTitleIconUrl=""
            />

          </div>
        </div>
      </div>
      {/* ページ切り替え（CSS表示切替でアンマウント防止） */}
      <div style={{ display: currentPage === "reward-ui-management" ? "block" : "none" }}>
        <RewardUIManagementPage
          editingAds={editingAds}
          updateAd={updateAd}
          addAdSlot={addAdSlot}
          removeAdSlot={removeAdSlot}
          saveAdData={saveAdData}
          previousAdImagesRef={previousAdImagesRef}
          contractBalance={contractBalance}
          contractBalanceError={contractBalanceError}
          dailyRewardError={dailyRewardError}
          currentDailyReward={currentDailyReward}
          RewardTokenChargeSection={RewardTokenChargeSection}
          RewardAmountSettingSection={RewardAmountSettingSection}
        />
      </div>
      <div style={{ display: currentPage === "tip-ui-management" ? "block" : "none" }}>
        <TipUIManagementPage />
      </div>
      {currentPage === "vending-management" ? (
        <VendingDashboardNew />
      ) : currentPage === "product-management" ? (
        <ProductManager />
      ) : currentPage === "diagnostics" ? (
        <DiagnosticsPage />
      ) : currentPage === "tenant-management" ? (
        <TenantManagementPage />
      ) : (
        <>
          {/* 期間タブ（⚡ パフォーマンス情報付き） */}
          <header style={{ textAlign: "center", position: "relative" }}>
        <div style={{ marginTop: 6, display: "inline-flex", gap: 8 }}>
          {(["all", "day", "week", "month"] as Period[]).map((p) => {
            const active = p === period;
            const getPerformanceIndicator = () => {
              switch (p) {
                case "day": return { time: "~2s", color: "#10b981" };
                case "week": return { time: "~5s", color: "#f59e0b" };
                case "month": return { time: "~10s", color: "#f97316" };
                case "all": return { time: "~15s", color: "#ef4444" };
                default: return { time: "", color: "#6366f1" };
              }
            };
            const perf = getPerformanceIndicator();
            
            return (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                style={{
                  padding: "6px 12px",
                  borderRadius: 999,
                  border: "1px solid rgba(255,255,255,.16)",
                  background: active ? "#1f2937" : "transparent",
                  color: "#fff",
                  fontSize: 12,
                  cursor: "pointer",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 2,
                }}
                title={`読み込み時間: ${perf.time}`}
              >
                <div>{p === "all" ? "All" : p}</div>
                <div style={{ 
                  fontSize: 10, 
                  opacity: 0.7, 
                  color: perf.color,
                  fontWeight: 500 
                }}>
                  ⚡{perf.time}
                </div>
              </button>
            );
          })}
        </div>
        <div style={{ 
          marginTop: 8, 
          fontSize: 11, 
          opacity: 0.6, 
          color: "#10b981" 
        }}>
          ⚡ パフォーマンス最適化済み - 期間別に読み込み範囲を制限
        </div>
      </header>

      <section
        style={{
          width: "min(1120px, 96vw)",
          margin: "14px auto",
          display: "grid",
          rowGap: 12,
          flexGrow: 1,
        }}
      >
        {/* KPI + 簡易分析（AI分析ボタン付き） */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: 10,
          }}
        >
          <div style={{...card, display: "flex", flexDirection: "column", justifyContent: "center", textAlign: "left"}}>
            <div style={{ opacity: 0.8, fontSize: 12 }}>合計</div>
            <div style={{ fontWeight: 800, fontSize: 18 }}>
              {fmt18(total)} {TOKEN.SYMBOL}
            </div>
          </div>
          <div style={{...card, display: "flex", flexDirection: "column", justifyContent: "center", textAlign: "left"}}>
            <div style={{ opacity: 0.8, fontSize: 12 }}>ユーザー数</div>
            <div style={{ fontWeight: 800, fontSize: 18 }}>{uniqueUsers}</div>
          </div>
          <div style={{...card, display: "flex", flexDirection: "column", justifyContent: "center", textAlign: "left"}}>
            <div style={{ opacity: 0.8, fontSize: 12 }}>件数</div>
            <div style={{ fontWeight: 800, fontSize: 18 }}>{filtered.length}</div>
          </div>
          {/* 🆕 簡易分析 + AI詳細ボタン */}
          <div style={card}>
            <div style={{ opacity: 0.8, fontSize: 12 }}>📊 分析</div>
            <div style={{ fontSize: 12, lineHeight: 1.35, marginBottom: 8 }}>
              <div>
                メッセージ投稿率：{" "}
                <strong>{(engagementTX.withMessageRate * 100).toFixed(0)}%</strong>
              </div>
              <div>
                投稿ユーザー： <strong>{engagementTX.uniqueAuthors}</strong>
              </div>
            </div>
            <button
              onClick={handleAIAnalysis}
              disabled={isAnalyzing || filtered.length === 0}
              style={{
                background: isAnalyzing ? "#6b7280" : "#8b5cf6",
                color: "#fff",
                border: "none",
                borderRadius: 6,
                padding: "4px 10px",
                fontSize: 11,
                fontWeight: 700,
                cursor: isAnalyzing || filtered.length === 0 ? "not-allowed" : "pointer",
                width: "100%",
                opacity: isAnalyzing || filtered.length === 0 ? 0.6 : 1,
              }}
            >
              {isAnalyzing ? "🤖 分析中..." : "🤖 AI詳細分析"}
            </button>
          </div>
        </div>

        {/* Chart */}
        <div style={card}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6, flexWrap: "wrap" }}>
            <div style={{ fontWeight: 800 }}>📈 データ比較グラフ ({periodLabel})</div>
            <span
              style={{
                fontSize: 12,
                opacity: 0.85,
                padding: "4px 8px",
                borderRadius: 999,
                background: "rgba(255,255,255,.08)",
                border: "1px solid rgba(255,255,255,.12)",
              }}
            >
              {rangeBadge}
            </span>
            <span
              style={{
                fontSize: 12,
                opacity: 0.85,
                padding: "4px 8px",
                borderRadius: 999,
                background: "rgba(255,255,255,.08)",
                border: "1px solid rgba(255,255,255,.12)",
              }}
            >
              {pointsBadge}
            </span>

            {/* グラフ表示切り替え */}
            <div style={{ display: "flex", gap: 8, marginLeft: "auto" }}>
              <label style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 12 }}>
                <input
                  type="checkbox"
                  checked={showTipGraph}
                  onChange={(e) => setShowTipGraph(e.target.checked)}
                />
                🎁 Tip数
              </label>
              <label style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 12 }}>
                <input
                  type="checkbox"
                  checked={showHeatGraph}
                  onChange={(e) => setShowHeatGraph(e.target.checked)}
                  disabled={!heatResults.length}
                />
                🔥 熱量スコア
              </label>
            </div>

            {period !== "all" && period !== "day" && (
              <label style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 13 }}>
                <input
                  type="checkbox"
                  checked={fillEmptyDays}
                  onChange={(e) => setFillEmptyDays(e.target.checked)}
                />
                空の日も表示
              </label>
            )}
          </div>

          {(!showTipGraph && !showHeatGraph) || chartData.length === 0 ? (
            <div style={{ opacity: 0.8, fontSize: 13, textAlign: "center", padding: 40 }}>
              いずれかのグラフを選択してください
            </div>
          ) : (
            <div style={{ width: "100%", height: 260 }}>
              <ResponsiveContainer>
                <LineChart data={displayChartData}>
                  <CartesianGrid stroke="rgba(255,255,255,.08)" />
                  <XAxis dataKey="day" tick={{ fontSize: 12 }} />
                  <YAxis yAxisId="amount" orientation="left" tick={{ fontSize: 12 }} />
                  {showHeatGraph && <YAxis yAxisId="heat" orientation="right" tick={{ fontSize: 12 }} />}
                  <Tooltip
                    formatter={(value, name) => [
                      name === 'amount' ? `${value} Tips` : `${value} Heat`,
                      name === 'amount' ? 'Tip数' : '熱量スコア'
                    ]}
                  />
                  {showTipGraph && <Line yAxisId="amount" type="monotone" dataKey="amount" stroke="#3b82f6" dot={false} />}
                  {showHeatGraph && heatResults.length > 0 && (
                    <Line yAxisId="heat" type="monotone" dataKey="heat" stroke="#8b5cf6" dot={false} />
                  )}
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Ranking */}
        <div style={card}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <h2 style={{ margin: 0, fontSize: 16 }}>🏆 Top Supporters ({periodLabel})</h2>
            <div style={{ display: "flex", gap: 8 }}>
              <button
                onClick={exportRankingCSV}
                style={{
                  background: "#10b981",
                  color: "#fff",
                  border: "none",
                  borderRadius: 6,
                  padding: "6px 12px",
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                📄 CSV
              </button>
              <button
                onClick={exportRankingJSON}
                style={{
                  background: "#3b82f6",
                  color: "#fff",
                  border: "none",
                  borderRadius: 6,
                  padding: "6px 12px",
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                📄 JSON
              </button>
            </div>
          </div>
          <div style={tableBox}>
            <table style={tableStyle}>
              <thead style={{ opacity: 0.8 }}>
                <tr>
                  <th style={th}>Rank</th>
                  <th style={th}>Name</th>
                  <th style={th}>Address</th>
                  <th style={th}>Profile</th>
                  <th style={{ ...th, textAlign: "right", whiteSpace: "nowrap" }}>Total Tips</th>
                </tr>
              </thead>
              <tbody>
                {ranking.map((r, i) => {
                  const a = annMap.get(r.addr.toLowerCase()) ?? null;
                  const name = nameFor(r.addr);
                  const msg = pickMessage(a);
                  return (
                    <tr key={r.addr}>
                      <td style={td}>{i + 1}</td>
                      <td style={{ ...td, fontWeight: 800 }}>{name}</td>
                      <td style={{ ...td, opacity: 0.85 }}>{short(r.addr)}</td>
                      <td style={{ ...td, maxWidth: 420 }}>
                        <div
                          title={msg}
                          style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}
                        >
                          {msg || "—"}
                        </div>
                      </td>
                      <td style={{ ...td, textAlign: "right", fontWeight: 800, whiteSpace: "nowrap" }}>
                        {fmt18(r.amount)} {TOKEN.SYMBOL}
                      </td>
                    </tr>
                  );
                })}
                {ranking.length === 0 && (
                  <tr>
                    <td style={td} colSpan={5}>
                      (no data)
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>


        </div>

        {/* Recent */}
        <div style={card}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <h2 style={{ margin: "4px 0 10px", fontSize: 16 }}>🕒 Recent Tips ({periodLabel})</h2>
            <div style={{ display: "flex", gap: 8 }}>
              <button
                onClick={exportRecentCSV}
                style={{
                  background: "#10b981",
                  color: "#fff",
                  border: "none",
                  borderRadius: 6,
                  padding: "6px 12px",
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                📄 CSV
              </button>
              <button
                onClick={exportRecentJSON}
                style={{
                  background: "#3b82f6",
                  color: "#fff",
                  border: "none",
                  borderRadius: 6,
                  padding: "6px 12px",
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                📄 JSON
              </button>
            </div>
          </div>
          <div style={tableBox}>
            <table style={tableStyle}>
              <thead style={{ opacity: 0.8 }}>
                <tr>
                  <th style={th}>Time</th>
                  <th style={th}>From</th>
                  <th style={th}>Message</th>
                  <th style={{ ...th, textAlign: "right" }}>Amount</th>
                  <th style={th}>Tx</th>
                </tr>
              </thead>
              <tbody>
                {recentPaged.map((t) => {
                  const addrL = (t.from || "").toLowerCase();
                  const a = annMap.get(addrL) ?? null;
                  const name = nameFor(t.from);
                  const txHash = ((t as any).txHash || (t as any).tx || "").toLowerCase();
                  const txMsg = (txHash && txMsgMap && txMsgMap[addrL] && txMsgMap[addrL][txHash]) || "";
                  const msg = txMsg || pickMessage(a) || "";

                  return (
                    <tr key={`${t.from}-${t.blockNumber}-${txHash}`}>
                      <td style={td}>
                        {t.timestamp ? new Date(t.timestamp * 1000).toLocaleString() : "—"}
                      </td>
                      <td style={td}>
                        <div style={{ fontWeight: 800 }}>{name}</div>
                        <div style={{ opacity: 0.75, fontSize: 12 }}>{short(t.from)}</div>
                      </td>
                      <td style={{ ...td, maxWidth: 420 }}>
                        <div
                          title={msg}
                          style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}
                        >
                          {msg || "—"}
                        </div>
                      </td>
                      <td style={{ ...td, textAlign: "right", whiteSpace: "nowrap", fontWeight: 800 }}>
                        {fmt18(t.amount)} {TOKEN.SYMBOL}
                      </td>
                      <td style={td}>
                        {txHash ? (
                          <a
                            href={`https://amoy.polygonscan.com/tx/${txHash}`}
                            target="_blank"
                            rel="noreferrer"
                            style={{ color: "#93c5fd", textDecoration: "underline" }}
                          >
                            view
                          </a>
                        ) : (
                          "—"
                        )}
                      </td>
                    </tr>
                  );
                })}
                {recentPaged.length === 0 && (
                  <tr>
                    <td style={td} colSpan={5}>
                      (no data)
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div style={{ 
            display: "flex", 
            justifyContent: "center", 
            alignItems: "center", 
            gap: 10, 
            marginTop: 16,
            paddingTop: 16,
            borderTop: "1px solid rgba(255,255,255,.08)"
          }}>
            <button
              onClick={() => setRecentPage((p) => Math.max(0, p - 1))}
              disabled={recentPage === 0}
              style={{
                background: "#1f2937",
                color: "#fff",
                border: "none",
                borderRadius: 8,
                padding: "6px 12px",
                fontWeight: 800,
                cursor: recentPage === 0 ? "not-allowed" : "pointer",
                opacity: recentPage === 0 ? 0.5 : 1,
                transition: "all 0.2s ease",
              }}
            >
              ← 前へ
            </button>
            <div style={{ fontSize: 12, color: "#9ca3af", fontWeight: 600 }}>
              {Math.min(recentPage + 1, totalRecentPages)} / {totalRecentPages} ページ
            </div>
            <button
              onClick={() => setRecentPage((p) => Math.min(totalRecentPages - 1, p + 1))}
              disabled={recentPage + 1 >= totalRecentPages}
              style={{
                background: "#1f2937",
                color: "#fff",
                border: "none",
                borderRadius: 8,
                padding: "6px 12px",
                fontWeight: 800,
                cursor: recentPage + 1 >= totalRecentPages ? "not-allowed" : "pointer",
                opacity: recentPage + 1 >= totalRecentPages ? 0.5 : 1,
                transition: "all 0.2s ease",
              }}
            >
              次へ →
            </button>
          </div>
        </div>

        {/* 🆕 AI貢献熱量分析（詳細パネル） */}
        <div id="ai-detail-panel" style={card}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <h2 style={{ margin: 0, fontSize: 16 }}>🤖 AI貢献熱量分析</h2>
            {!isAnalyzing && heatResults.length > 0 && (
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  onClick={exportAnalysisCSV}
                  style={{
                    background: "#10b981",
                    color: "#fff",
                    border: "none",
                    borderRadius: 6,
                    padding: "6px 12px",
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  📄 CSV
                </button>
                <button
                  onClick={exportAnalysisJSON}
                  style={{
                    background: "#8b5cf6",
                    color: "#fff",
                    border: "none",
                    borderRadius: 6,
                    padding: "6px 12px",
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  📄 JSON
                </button>
              </div>
            )}
          </div>
          
          {isAnalyzing && (
            <div style={{ textAlign: "center", padding: "20px 0" }}>
              <div style={{ fontSize: 14, marginBottom: 10 }}>
                🔄 AI分析中... ({analysisProgress.current} / {analysisProgress.total})
              </div>
              <div style={{ 
                width: "100%", 
                height: 8, 
                background: "rgba(255,255,255,.1)", 
                borderRadius: 4,
                overflow: "hidden"
              }}>
                <div style={{
                  width: `${(analysisProgress.current / Math.max(1, analysisProgress.total)) * 100}%`,
                  height: "100%",
                  background: "linear-gradient(90deg, #8b5cf6, #a78bfa)",
                  transition: "width 0.3s ease"
                }} />
              </div>
            </div>
          )}

          {!isAnalyzing && heatResults.length === 0 && (
            <div style={{ textAlign: "center", padding: "20px 0", opacity: 0.7 }}>
              <div style={{ fontSize: 14, marginBottom: 10 }}>
                📊 「AI詳細分析」ボタンをクリックして分析を開始してください
              </div>
              {!import.meta.env.VITE_OPENAI_API_KEY && (
                <div style={{ 
                  fontSize: 12, 
                  color: "#fbbf24", 
                  marginTop: 10,
                  padding: 12,
                  background: "rgba(251, 191, 36, 0.1)",
                  borderRadius: 8,
                  border: "1px solid rgba(251, 191, 36, 0.3)"
                }}>
                  <div style={{ fontWeight: "bold", marginBottom: 6 }}>
                    ⚠️ OpenAI APIキーが未設定
                  </div>
                  <div style={{ marginBottom: 8 }}>
                    本格的なAI分析を利用するには、OpenAI APIキーが必要です。
                  </div>
                  <div style={{ fontSize: 11, opacity: 0.8 }}>
                    • 設定方法: Vercelの環境変数で VITE_OPENAI_API_KEY を設定<br/>
                    • APIキー取得: https://platform.openai.com/api-keys<br/>
                    • 未設定の場合: 簡易モック分析で実行されます
                  </div>
                </div>
              )}
            </div>
          )}

          {!isAnalyzing && heatResults.length > 0 && (
            <>
              {/* サマリー */}
              <div style={{ 
                display: "grid", 
                gridTemplateColumns: "repeat(4, 1fr)", 
                gap: 10, 
                marginBottom: 16 
              }}>
                {["🔥熱狂", "💎高額", "🎉アクティブ", "😊ライト"].map(level => {
                  const count = heatResults.filter(r => r.heatLevel === level).length;
                  return (
                    <div key={level} style={{ 
                      background: "rgba(255,255,255,.04)", 
                      padding: 10, 
                      borderRadius: 8,
                      textAlign: "center"
                    }}>
                      <div style={{ fontSize: 20, marginBottom: 4 }}>{level}</div>
                      <div style={{ fontSize: 18, fontWeight: 800 }}>{count}人</div>
                    </div>
                  );
                })}
              </div>

              {/* 熱量ランキング */}
              <div style={tableBox}>
                <div style={{ fontSize: 14, fontWeight: 600, color: "#8b5cf6", marginBottom: 10 }}>
                  🔥 AI分析詳細 ({heatResults.length}件)
                </div>
                <table style={tableStyle}>
                  <thead style={{ opacity: 0.8 }}>
                    <tr>
                      <th style={th}>Rank</th>
                      <th style={th}>Name</th>
                      <th style={th}>熱量</th>
                      <th style={th}>レベル</th>
                      <th style={th}>感情</th>
                      <th style={th}>キーワード</th>
                      <th style={{ ...th, textAlign: "right" }}>Tip額</th>
                    </tr>
                  </thead>
                  <tbody>
                    {heatResults
                      .slice(analysisPage * ANALYSIS_ITEMS_PER_PAGE, (analysisPage + 1) * ANALYSIS_ITEMS_PER_PAGE)
                      .map((r, i) => {
                        const globalRank = analysisPage * ANALYSIS_ITEMS_PER_PAGE + i + 1;
                        
                        return (
                          <tr key={r.address}>
                            <td style={td}>{globalRank}</td>
                            <td style={{ ...td, fontWeight: 800 }}>{r.name}</td>
                            <td style={{ ...td, fontWeight: 800, color: "#8b5cf6" }}>
                              {r.heatScore}
                            </td>
                            <td style={td}>{r.heatLevel}</td>
                            <td style={td}>
                              <span style={{ 
                                padding: "2px 6px", 
                                borderRadius: 4, 
                                fontSize: 11,
                                background: r.sentimentLabel === "positive" ? "rgba(34, 197, 94, 0.2)" :
                                           r.sentimentLabel === "negative" ? "rgba(239, 68, 68, 0.2)" :
                                           "rgba(156, 163, 175, 0.2)",
                                color: r.sentimentLabel === "positive" ? "#22c55e" :
                                       r.sentimentLabel === "negative" ? "#ef4444" :
                                       "#9ca3af"
                              }}>
                                {r.sentimentScore}
                              </span>
                            </td>
                            <td style={{ ...td, maxWidth: 200 }}>
                              <div style={{ fontSize: 11, opacity: 0.85 }}>
                                {r.keywords.join(", ") || "—"}
                              </div>
                            </td>
                            <td style={{ ...td, textAlign: "right", whiteSpace: "nowrap" }}>
                              {r.totalAmount} {TOKEN.SYMBOL}
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>

              {/* ページネーション - AI分析結果がある場合は常に表示 */}
              {heatResults.length > 0 && (
                <div style={{ 
                  display: "flex", 
                  justifyContent: "center", 
                  alignItems: "center", 
                  gap: 10, 
                  marginTop: 16,
                  paddingTop: 16,
                  borderTop: "1px solid rgba(255,255,255,.08)"
                }}>
                  <button
                    onClick={() => setAnalysisPage(Math.max(0, analysisPage - 1))}
                    disabled={analysisPage === 0}
                    style={{
                      background: "#1f2937",
                      color: "#fff",
                      border: "none",
                      borderRadius: 8,
                      padding: "6px 12px",
                      fontWeight: 800,
                      cursor: analysisPage === 0 ? "not-allowed" : "pointer",
                      opacity: analysisPage === 0 ? 0.5 : 1,
                      transition: "all 0.2s ease",
                    }}
                  >
                    ← 前へ
                  </button>
                  <div style={{ fontSize: 12, color: "#9ca3af", fontWeight: 600 }}>
                    {analysisPage + 1} / {Math.ceil(heatResults.length / ANALYSIS_ITEMS_PER_PAGE)} ページ
                  </div>
                  <button
                    onClick={() => setAnalysisPage(analysisPage + 1)}
                    disabled={(analysisPage + 1) * ANALYSIS_ITEMS_PER_PAGE >= heatResults.length}
                    style={{
                      background: "#1f2937",
                      color: "#fff",
                      border: "none",
                      borderRadius: 8,
                      padding: "6px 12px",
                      fontWeight: 800,
                      cursor: (analysisPage + 1) * ANALYSIS_ITEMS_PER_PAGE >= heatResults.length ? "not-allowed" : "pointer",
                      opacity: (analysisPage + 1) * ANALYSIS_ITEMS_PER_PAGE >= heatResults.length ? 0.5 : 1,
                      transition: "all 0.2s ease",
                    }}
                  >
                    次へ →
                  </button>
                </div>
              )}

            </>
          )}
        </div>
      </section>


        </>
      )}

      {/* フッター */}
      <footer
        style={{
          textAlign: "center",
          opacity: 0.6,
          fontSize: 12,
          marginTop: 8,
        }}
      >
        Presented by <strong>METATRON.</strong>
      </footer>

      {isLoading && <LoadingOverlay period={period} />}
    </main>
  );
}