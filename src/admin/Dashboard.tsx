// src/admin/Dashboard.tsx
import React, { useEffect, useMemo, useState } from "react";
import { useAddress, ConnectWallet } from "@thirdweb-dev/react";
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
import { CONTRACT_ADDRESS, TOKEN } from "../contract";
import {
  fetchAnnotationsCached,
  prefetchAnnotations,
  pickDisplayName,
  pickMessage,
} from "../lib/annotations";
import { fetchTxMessages } from "../lib/annotations_tx";
import { setEmergencyFlag, readEmergencyFlag } from "../lib/emergency";
import { analyzeContributionHeat, isOpenAIConfigured, type ContributionHeat } from "../lib/ai_analysis.ts";

/* ---------- Types & Helpers ---------- */
type Period = "day" | "week" | "month" | "all";
type TipItem = {
  from: string;
  amount: bigint;
  blockNumber: bigint;
  timestamp?: number;
  txHash?: string;
};

type AdData = {
  src: string;
  href: string;
};

type PageType = "dashboard" | "reward-ui-management";

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
    
    console.log("📡 HTTP Response:", {
      url: rpcUrl,
      status: res.status,
      statusText: res.statusText,
      ok: res.ok
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
      console.error("❌ RPC error response:", j.error);
      throw new Error(`RPC Error: ${j.error.message} (code: ${j.error.code})`);
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
  const requestBody = { jsonrpc: "2.0", id: 1, method, params };
  console.log("🔗 RPC call:", { 
    method, 
    paramsLength: params.length,
    primaryRPC: ALCHEMY_RPC || PUBLIC_RPC,
    fullRequest: method === "eth_getLogs" ? requestBody : { method, paramsCount: params.length }
  });
  
  // Try Alchemy first (if configured)
  if (ALCHEMY_RPC) {
    try {
      const result = await rpcWithFallback<T>(method, params, ALCHEMY_RPC);
      console.log("✅ RPC success (Alchemy):", { method, resultType: typeof result });
      return result;
    } catch (error: any) {
      console.warn("⚠️ Alchemy failed, trying public RPC:", error.message);
      
      // If it's an Alchemy limit error for eth_getLogs, fall back to public RPC
      if (error.isAlchemyLimit && method === "eth_getLogs") {
        console.log("🔄 Falling back to public RPC due to Alchemy limits");
      }
    }
  }
  
  // Fallback to public RPC
  try {
    const result = await rpcWithFallback<T>(method, params, PUBLIC_RPC);
    console.log("✅ RPC success (Public):", { method, resultType: typeof result });
    return result;
  } catch (publicError: any) {
    console.error("❌ All RPC endpoints failed");
    throw publicError;
  }
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

/* ---------- Admin & Lookback ---------- */
// 一時的にアクセス制限を緩和（テスト用）
const ADMIN_WALLETS = [
  "0x66f1274ad5d042b7571c2efa943370dbcd3459ab",
  // 追加の管理者ウォレットをここに追加可能
].map((x) => x.toLowerCase());
// Alchemy RPCの制限を考慮した適切なブロック範囲（Polygon Amoyは約2秒/ブロック）
const LOOKBACK_BY_PERIOD: Record<Exclude<Period, "all">, bigint> = {
  day: 43_200n,    // 1日分（約43,200ブロック）
  week: 10_000n,   // Alchemy制限に合わせて調整（約5.5時間分）
  month: 10_000n,  // Alchemy制限に合わせて調整（約5.5時間分）
};
const TOPIC_TIPPED = ethers.utils.keccak256(
  ethers.utils.toUtf8Bytes("Tipped(address,uint256)")
);

/* ---------- Loading Overlay ---------- */
function LoadingOverlay() {
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
          padding: "20px 40px",
          fontSize: 16,
          fontWeight: 600,
          letterSpacing: 0.5,
          textAlign: "center",
        }}
      >
        🔄 データを読み込み中...
      </div>
      <style>{`
        @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
      `}</style>
    </div>
  );
}

/* ---------- Component ---------- */
export default function AdminDashboard() {
  const address = useAddress();
  
  // ページ状態管理
  const [currentPage, setCurrentPage] = useState<PageType>("dashboard");
  const [adManagementData, setAdManagementData] = useState<AdData[]>([]);
  
  // 動的管理者リスト管理
  const [adminWallets, setAdminWallets] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('gifterra-admin-wallets');
      return saved ? JSON.parse(saved) : ADMIN_WALLETS;
    } catch {
      return ADMIN_WALLETS;
    }
  });
  
  // 管理者チェック（初期管理者または追加された管理者）
  const isAdmin = !!address && (ADMIN_WALLETS.includes(address.toLowerCase()) || adminWallets.includes(address.toLowerCase()));
  
  // 新しいウォレット権限管理
  const [newAdminAddress, setNewAdminAddress] = useState("");
  const [showAdminModal, setShowAdminModal] = useState(false);
  
  const addAdminWallet = () => {
    if (!newAdminAddress.trim()) return;
    const cleanAddress = newAdminAddress.trim().toLowerCase();
    if (ethers.utils.isAddress(cleanAddress)) {
      const updatedList = [...new Set([...adminWallets, cleanAddress])];
      setAdminWallets(updatedList);
      localStorage.setItem('gifterra-admin-wallets', JSON.stringify(updatedList));
      setNewAdminAddress("");
      alert(`管理者権限を追加しました: ${cleanAddress}`);
    } else {
      alert("有効なウォレットアドレスを入力してください");
    }
  };
  
  const removeAdminWallet = (addressToRemove: string) => {
    if (ADMIN_WALLETS.includes(addressToRemove.toLowerCase())) {
      alert("初期管理者アドレスは削除できません");
      return;
    }
    const updatedList = adminWallets.filter(addr => addr !== addressToRemove.toLowerCase());
    setAdminWallets(updatedList);
    localStorage.setItem('gifterra-admin-wallets', JSON.stringify(updatedList));
    alert(`管理者権限を削除しました: ${addressToRemove}`);
  };

  const [period, setPeriod] = useState<Period>("day");
  const [fromBlock, setFromBlock] = useState<bigint | undefined>();
  const [rawTips, setRawTips] = useState<TipItem[]>([]);
  const [blockTimeMap, setBlockTimeMap] = useState<Record<string, number>>({});
  const [isLoading, setIsLoading] = useState(true);

  const [emergencyStop, setEmergencyStop] = useState(false);
  useEffect(() => {
    setEmergencyStop(readEmergencyFlag());
  }, []);

  // 広告データの読み込み
  const loadAdData = () => {
    try {
      const saved = localStorage.getItem('gifterra-ads');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.ads && Array.isArray(parsed.ads)) {
          setAdManagementData(parsed.ads);
          return;
        }
      }
    } catch (error) {
      console.error('Failed to load ad data:', error);
    }
    // デフォルトデータ
    setAdManagementData([
      { src: "/ads/ad1.png", href: "https://example.com/1" },
      { src: "/ads/ad2.png", href: "https://example.com/2" },
      { src: "/ads/ad3.png", href: "https://example.com/3" }
    ]);
  };

  // 広告データの保存
  const saveAdData = (ads: AdData[]) => {
    try {
      localStorage.setItem('gifterra-ads', JSON.stringify({ ads }));
      setAdManagementData(ads);
      alert('広告設定を保存しました！');
    } catch (error) {
      console.error('Failed to save ad data:', error);
      alert('保存に失敗しました。');
    }
  };

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

  /* ---------- 最新ブロック範囲取得 ---------- */
  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    (async () => {
      try {
        console.log("📅 Setting up block range for period:", period);
        
        if (period === "all") {
          console.log("📊 Using 'all' period - fromBlock = 0");
          if (!cancelled) setFromBlock(0n);
          return;
        }
        
        const latest = await getLatestBlockNumber();
        const lookback = LOOKBACK_BY_PERIOD[period];
        const fb = BigInt(latest) > lookback ? BigInt(latest) - lookback : 0n;
        
        console.log("🔗 Block range calculated:", {
          period,
          latestBlock: latest,
          lookback: lookback.toString(),
          fromBlock: fb.toString(),
          primaryRPC: ALCHEMY_RPC || PUBLIC_RPC
        });
        
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

        // Alchemy RPCの制限を考慮: eth_getLogsは最大10,000ブロック範囲まで
        // TODO: メインネット移行時は maxBlockRange を増やす (例: 100000n = 約1週間分)
        // テストネット用設定: 10,000ブロック (約1-2日分)
        const currentBlock = await getLatestBlockNumber();
        const maxBlockRange = 10000n; // MAINNET: 100000n に変更予定
        const actualFromBlock = fromBlock === 0n ? 
          Math.max(0, currentBlock - Number(maxBlockRange)) : 
          Math.max(Number(fromBlock), currentBlock - Number(maxBlockRange));
        
        const finalFromBlockHex = "0x" + actualFromBlock.toString(16);
        
        console.log("📊 Adjusted block range for Alchemy limits:", {
          originalFromBlock: fromBlock.toString(),
          currentBlock,
          maxBlockRange: maxBlockRange.toString(),
          adjustedFromBlock: actualFromBlock,
          finalFromBlockHex,
          blockRangeSize: currentBlock - actualFromBlock
        });

        const logRequest = {
          address: CONTRACT_ADDRESS,
          fromBlock: finalFromBlockHex,
          toBlock: "latest",
          topics: [TOPIC_TIPPED],
        };
        
        console.log("🔗 eth_getLogs request:", JSON.stringify(logRequest, null, 2));

        const logs: any[] = await rpc("eth_getLogs", [logRequest]);
        
        console.log("📊 Raw logs received:", {
          count: logs.length,
          logs: logs.slice(0, 3) // 最初の3件のみ表示
        });

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
        console.error("❌ Log fetch failed:", e);
        console.error("Error details:", {
          message: e?.message || "Unknown error",
          stack: e?.stack,
          primaryRPC: ALCHEMY_RPC || PUBLIC_RPC,
          CONTRACT_ADDRESS,
          fromBlock: fromBlock.toString(),
          period
        });
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

  /* ---------- ブロックタイム キャッシュ ---------- */
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
      const results = await Promise.all(
        need.map(async (bn) => {
          const ts = await getBlockTimestamp(Number(bn));
          return { bn, ts };
        })
      );
      for (const r of results) add[r.bn] = r.ts;
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
      await prefetchAnnotations(allAddrsToAnnotate);
      const m = await fetchAnnotationsCached(allAddrsToAnnotate);
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
      try {
        const m = await fetchTxMessages(allAddrsToAnnotate);
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



  // リワードUI管理ページコンポーネント
  const RewardUIManagementPage = () => {
    const [editingAds, setEditingAds] = useState<AdData[]>(adManagementData);

    const handleSave = () => {
      saveAdData(editingAds);
    };

    const updateAd = (index: number, field: 'src' | 'href', value: string) => {
      const updated = [...editingAds];
      updated[index] = { ...updated[index], [field]: value };
      setEditingAds(updated);
    };

    const addAdSlot = () => {
      if (editingAds.length < 3) {
        setEditingAds([...editingAds, { src: '', href: '' }]);
      }
    };

    const removeAdSlot = (index: number) => {
      setEditingAds(editingAds.filter((_, i) => i !== index));
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
          📱 リワードUI 広告管理
        </h2>
        
        <div style={{ marginBottom: 20, padding: 16, background: "rgba(255,255,255,.04)", borderRadius: 8 }}>
          <h3 style={{ margin: "0 0 10px 0", fontSize: 16 }}>💡 使用方法</h3>
          <ul style={{ margin: 0, paddingLeft: 20, opacity: 0.8, fontSize: 14 }}>
            <li>最大3つの広告スロットを設定できます</li>
            <li>画像URL: 表示する広告画像のパスまたはURL</li>
            <li>リンクURL: クリック時に開くWebサイトのURL</li>
            <li>設定はブラウザのlocalStorageに保存されます</li>
          </ul>
        </div>

        {editingAds.map((ad, index) => (
          <div key={index} style={{
            marginBottom: 16,
            padding: 16,
            background: "rgba(255,255,255,.06)",
            borderRadius: 8,
            position: "relative"
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <h4 style={{ margin: 0, fontSize: 16 }}>広告スロット {index + 1}</h4>
              {editingAds.length > 1 && (
                <button
                  onClick={() => removeAdSlot(index)}
                  style={{
                    background: "#dc2626",
                    color: "#fff",
                    border: "none",
                    borderRadius: 4,
                    padding: "4px 8px",
                    fontSize: 12,
                    cursor: "pointer"
                  }}
                >
                  削除
                </button>
              )}
            </div>
            
            <div style={{ marginBottom: 12 }}>
              <label style={{ display: "block", marginBottom: 4, fontSize: 14, opacity: 0.8 }}>
                画像URL:
              </label>
              <input
                type="text"
                value={ad.src}
                onChange={(e) => updateAd(index, 'src', e.target.value)}
                placeholder="/ads/ad1.png または https://example.com/image.png"
                style={{
                  width: "100%",
                  padding: 8,
                  background: "rgba(255,255,255,.1)",
                  border: "1px solid rgba(255,255,255,.2)",
                  borderRadius: 4,
                  color: "#fff",
                  fontSize: 14
                }}
              />
            </div>
            
            <div>
              <label style={{ display: "block", marginBottom: 4, fontSize: 14, opacity: 0.8 }}>
                リンクURL:
              </label>
              <input
                type="text"
                value={ad.href}
                onChange={(e) => updateAd(index, 'href', e.target.value)}
                placeholder="https://example.com/"
                style={{
                  width: "100%",
                  padding: 8,
                  background: "rgba(255,255,255,.1)",
                  border: "1px solid rgba(255,255,255,.2)",
                  borderRadius: 4,
                  color: "#fff",
                  fontSize: 14
                }}
              />
            </div>
          </div>
        ))}

        <div style={{ display: "flex", gap: 12, marginTop: 20 }}>
          {editingAds.length < 3 && (
            <button
              onClick={addAdSlot}
              style={{
                background: "#059669",
                color: "#fff",
                border: "none",
                borderRadius: 8,
                padding: "10px 16px",
                fontWeight: 600,
                cursor: "pointer"
              }}
            >
              ➕ 広告スロット追加
            </button>
          )}
          
          <button
            onClick={handleSave}
            style={{
              background: "#0ea5e9",
              color: "#fff",
              border: "none",
              borderRadius: 8,
              padding: "10px 20px",
              fontWeight: 800,
              cursor: "pointer",
              marginLeft: "auto"
            }}
          >
            💾 保存
          </button>
        </div>

        <div style={{ marginTop: 20, padding: 16, background: "rgba(255,255,255,.04)", borderRadius: 8 }}>
          <h4 style={{ margin: "0 0 10px 0", fontSize: 14 }}>📊 現在の設定プレビュー:</h4>
          <pre style={{ 
            background: "rgba(0,0,0,.3)", 
            padding: 12, 
            borderRadius: 4, 
            fontSize: 12, 
            overflow: "auto",
            margin: 0
          }}>
            {JSON.stringify({ ads: editingAds }, null, 2)}
          </pre>
        </div>
      </div>
    );
  };

  /* ---------- 画面 ---------- */
  if (!isAdmin) {
    return (
      <main
        style={{
          minHeight: "100vh",
          background: "#0b1620",
          color: "#fff",
          display: "grid",
          placeItems: "center",
          textAlign: "center",
          padding: 20,
        }}
      >
        <div
          style={{
            background: "rgba(255,255,255,.06)",
            padding: 24,
            borderRadius: 16,
            width: "min(720px, 92vw)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "center", gap: 10, alignItems: "center" }}>
            <img src="/gifterra-logo.png" alt="GIFTERRA" style={{ height: 32 }} />
            <h2 style={{ margin: 0 }}>GIFTERRA admin : on-chain (Tipped イベント)</h2>
          </div>
          <p style={{ opacity: 0.85 }}>
            このページは管理者のみ閲覧できます。ウォレットを接続し、権限があるアドレスでアクセスしてください。
          </p>
          <div style={{ marginTop: 16, display: "flex", justifyContent: "center" }}>
            <ConnectWallet 
              theme="dark" 
              modalTitle="管理者ウォレット接続"
              modalTitleIconUrl=""
            />
          </div>
          <div style={{ marginTop: 16, opacity: 0.7, fontSize: 12 }}>
            Presented by <strong>METATRON.</strong>
          </div>
        </div>
      </main>
    );
  }

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
      {/* ヘッダー */}
      <div
        style={{
          width: "min(1120px, 96vw)",
          margin: "0 auto 8px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <img src="/gifterra-logo.png" alt="GIFTERRA" style={{ height: 32 }} />
          <h1 style={{ margin: 0, fontSize: 20, fontWeight: 800 }}>
            {currentPage === "dashboard" ? "GIFTERRA admin : on-chain (Tipped イベント)" : "GIFTERRA admin : リワードUI管理"}
          </h1>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button
            onClick={() => setCurrentPage(currentPage === "dashboard" ? "reward-ui-management" : "dashboard")}
            style={{
              background: "#7c3aed",
              color: "#fff",
              border: "none",
              borderRadius: 8,
              padding: "6px 12px",
              fontWeight: 800,
              cursor: "pointer",
            }}
          >
            {currentPage === "dashboard" ? "📱 リワードUI管理" : "📊 ダッシュボード"}
          </button>
          <button
            onClick={() => window.location.reload()}
            style={{
              background: "#0ea5e9",
              color: "#0a0a0a",
              border: "none",
              borderRadius: 8,
              padding: "6px 12px",
              fontWeight: 800,
              cursor: "pointer",
            }}
          >
            リロード
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
              borderRadius: 8,
              padding: "6px 12px",
              fontWeight: 800,
              cursor: "pointer",
              minWidth: 100,
            }}
          >
            {emergencyStop ? "🟢 稼働再開" : "🛑 緊急停止"}
          </button>
        </div>
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
          gridTemplateColumns: "repeat(3, 1fr)",
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
            <button
              onClick={() => setShowAdminModal(true)}
              style={{
                background: "#6366f1",
                color: "#fff",
                border: "none",
                borderRadius: 8,
                padding: "8px 12px",
                fontSize: 11,
                fontWeight: 600,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 4,
                whiteSpace: "nowrap",
                transition: "all 0.2s ease",
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.background = "#4f46e5";
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.background = "#6366f1";
              }}
            >
              🔒 権限
            </button>
          </div>
        </div>
      </div>
      {/* ページ切り替え */}
      {currentPage === "reward-ui-management" ? (
        <RewardUIManagementPage />
      ) : (
        <>
          {/* 期間タブ */}
          <header style={{ textAlign: "center", position: "relative" }}>
        <div style={{ marginTop: 6, display: "inline-flex", gap: 8 }}>
          {(["all", "day", "week", "month"] as Period[]).map((p) => {
            const active = p === period;
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
                }}
              >
                {p === "all" ? "All" : p}
              </button>
            );
          })}
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
                💰 投げ銭数
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
                      name === 'amount' ? '投げ銭数' : '熱量スコア'
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
                      <th style={{ ...th, textAlign: "right" }}>投げ銭額</th>
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

      {/* 管理者権限管理ポップアップモーダル */}
      {showAdminModal && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100vw",
            height: "100vh",
            background: "rgba(0, 0, 0, 0.7)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 1000,
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowAdminModal(false);
            }
          }}
        >
          <div
            style={{
              background: "#1f2937",
              borderRadius: 16,
              padding: 24,
              width: "min(600px, 90vw)",
              maxHeight: "80vh",
              overflow: "auto",
              border: "1px solid rgba(255,255,255,.1)",
              boxShadow: "0 20px 40px rgba(0,0,0,.5)",
            }}
          >
            {/* ヘッダー */}
            <div style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 20,
              paddingBottom: 16,
              borderBottom: "1px solid rgba(255,255,255,.1)"
            }}>
              <h3 style={{
                margin: 0,
                fontSize: 18,
                fontWeight: 700,
                display: "flex",
                alignItems: "center",
                gap: 8,
                color: "#fff"
              }}>
                🔒 管理者権限管理
              </h3>
              <button
                onClick={() => setShowAdminModal(false)}
                style={{
                  background: "rgba(255,255,255,.1)",
                  color: "#fff",
                  border: "none",
                  borderRadius: 8,
                  width: 32,
                  height: 32,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  fontSize: 16,
                }}
              >
                ✕
              </button>
            </div>

            {/* 新規管理者追加 */}
            <div style={{ marginBottom: 24 }}>
              <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 12, color: "#fff" }}>
                新規管理者追加
              </div>
              <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                <input
                  type="text"
                  placeholder="新しい管理者のウォレットアドレス (0x...)"
                  value={newAdminAddress}
                  onChange={(e) => setNewAdminAddress(e.target.value)}
                  style={{
                    background: "rgba(0,0,0,.4)",
                    border: "1px solid rgba(255,255,255,.2)",
                    borderRadius: 8,
                    padding: "12px 16px",
                    color: "#fff",
                    fontSize: 14,
                    flex: 1,
                    minWidth: 300,
                  }}
                />
                <button
                  onClick={addAdminWallet}
                  style={{
                    background: "#10b981",
                    color: "#fff",
                    border: "none",
                    borderRadius: 8,
                    padding: "12px 20px",
                    fontSize: 14,
                    fontWeight: 600,
                    cursor: "pointer",
                    whiteSpace: "nowrap",
                  }}
                >
                  ➕ 管理者追加
                </button>
              </div>
            </div>

            {/* 現在の管理者リスト */}
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 12, color: "#fff" }}>
                現在の管理者 ({adminWallets.length + ADMIN_WALLETS.length}名)
              </div>
              <div style={{ display: "grid", gap: 8, maxHeight: 300, overflow: "auto" }}>
                {/* 初期管理者（削除不可） */}
                {ADMIN_WALLETS.map((addr) => (
                  <div key={addr} style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    background: "rgba(34, 197, 94, 0.15)",
                    border: "1px solid rgba(34, 197, 94, 0.3)",
                    borderRadius: 8,
                    padding: "12px 16px",
                    fontSize: 13,
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span style={{ color: "#22c55e", fontWeight: 600 }}>🔒 初期管理者</span>
                      <code style={{
                        background: "rgba(0,0,0,.4)",
                        padding: "4px 8px",
                        borderRadius: 6,
                        fontSize: 12,
                        color: "#e5e7eb"
                      }}>
                        {addr}
                      </code>
                    </div>
                    <span style={{ color: "#22c55e", fontSize: 12, opacity: 0.8 }}>削除不可</span>
                  </div>
                ))}
                
                {/* 追加された管理者（削除可能） */}
                {adminWallets.filter(addr => !ADMIN_WALLETS.includes(addr)).map((addr) => (
                  <div key={addr} style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    background: "rgba(59, 130, 246, 0.15)",
                    border: "1px solid rgba(59, 130, 246, 0.3)",
                    borderRadius: 8,
                    padding: "12px 16px",
                    fontSize: 13,
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span style={{ color: "#3b82f6", fontWeight: 600 }}>👤 追加管理者</span>
                      <code style={{
                        background: "rgba(0,0,0,.4)",
                        padding: "4px 8px",
                        borderRadius: 6,
                        fontSize: 12,
                        color: "#e5e7eb"
                      }}>
                        {addr}
                      </code>
                    </div>
                    <button
                      onClick={() => removeAdminWallet(addr)}
                      style={{
                        background: "#ef4444",
                        color: "#fff",
                        border: "none",
                        borderRadius: 6,
                        padding: "6px 12px",
                        fontSize: 12,
                        fontWeight: 600,
                        cursor: "pointer",
                      }}
                    >
                      🗑️ 削除
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
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

      {isLoading && <LoadingOverlay />}
    </main>
  );
}