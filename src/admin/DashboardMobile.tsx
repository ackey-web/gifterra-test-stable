// src/admin/DashboardMobile.tsx
import { useEffect, useState } from "react";
import { useAddress, ConnectWallet } from "@thirdweb-dev/react";
import { ethers } from "ethers";
import { CONTRACT_ADDRESS, TOKEN } from "../contract";
import { setEmergencyFlag, readEmergencyFlag } from "../lib/emergency";

/* ---------- Types & Helpers ---------- */
type TipItem = {
  from: string;
  amount: bigint;
  blockNumber: bigint;
  timestamp?: number;
  txHash?: string;
};

const fmt18 = (v: bigint) => {
  try {
    const s = ethers.utils.formatUnits(v.toString(), TOKEN.DECIMALS);
    const [a, b = ""] = s.split(".");
    return b ? `${a}.${b.slice(0, 4)}` : a;
  } catch {
    return "0";
  }
};

const formatTime = (ts: number) => {
  const d = new Date(ts * 1000);
  return d.toLocaleDateString("ja-JP", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const shortAddress = (addr: string) => `${addr.slice(0, 6)}...${addr.slice(-4)}`;

// スマホ用Admin Dashboard
export default function DashboardMobile() {
  const address = useAddress();
  const [loading, setLoading] = useState(false);
  const [tips, setTips] = useState<TipItem[]>([]);
  const [totalTips, setTotalTips] = useState(0n);
  const [emergency, setEmergency] = useState(false);
  
  // 分析用データ
  const [dailyTips, setDailyTips] = useState(0);
  const [weeklyTips, setWeeklyTips] = useState(0);
  const [topSupporters, setTopSupporters] = useState<{address: string, amount: bigint}[]>([]);
  const [rankDistribution, setRankDistribution] = useState({seed: 0, grow: 0, bloom: 0, mythic: 0});

  // データ取得
  const fetchData = async () => {
    if (!address) {
      console.log("🚫 アドレスが未接続のためデータ取得をスキップ");
      return;
    }
    
    console.log("📊 データ取得開始:", { address, contractAddress: CONTRACT_ADDRESS });
    setLoading(true);

    try {
      // RPCプロバイダー初期化
      const rpcUrls = [
        "https://rpc-amoy.polygon.technology",
        "https://polygon-amoy.drpc.org",
        "https://amoy.polygon.technology"
      ];
      
      let provider: ethers.providers.JsonRpcProvider | null = null;
      let providerUrl = "";
      
      // RPCプロバイダーの接続テスト
      for (const rpcUrl of rpcUrls) {
        try {
          console.log("🔗 RPC接続テスト:", rpcUrl);
          const testProvider = new ethers.providers.JsonRpcProvider(rpcUrl);
          await testProvider.getBlockNumber(); // 接続テスト
          provider = testProvider;
          providerUrl = rpcUrl;
          console.log("✅ RPC接続成功:", rpcUrl);
          break;
        } catch (rpcError) {
          console.warn("⚠️ RPC接続失敗:", rpcUrl, rpcError);
        }
      }
      
      if (!provider) {
        throw new Error("すべてのRPCプロバイダーへの接続に失敗しました");
      }
      
      // コントラクト初期化
      const contract = new ethers.Contract(
        CONTRACT_ADDRESS,
        [
          "event TipSent(address indexed from, uint256 amount, string displayName, string message)",
        ],
        provider
      );
      
      console.log("📄 コントラクト初期化完了:", { contract: CONTRACT_ADDRESS, provider: providerUrl });

      // 現在のブロック番号取得
      const currentBlock = await provider.getBlockNumber();
      // 段階的なブロック範囲設定（最近のブロックから優先的に検索）
      const BLOCK_RANGES = [2000, 5000, 10000]; // 段階的に範囲を拡大
      let fromBlock = Math.max(0, currentBlock - BLOCK_RANGES[0]);
      let selectedRange = BLOCK_RANGES[0];
      
      console.log("📊 イベント取得開始:", { 
        currentBlock, 
        fromBlock, 
        range: currentBlock - fromBlock,
        selectedRange,
        availableRanges: BLOCK_RANGES,
        rpcProvider: providerUrl
      });

      // イベント取得（タイムアウトとエラーハンドリングを強化）
      let tipEvents: any[] = [];
      try {
        console.log("🔍 イベントクエリ実行中...");
        const queryResult = await Promise.race([
          contract.queryFilter("TipSent", fromBlock),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Event query timeout')), 30000)
          )
        ]) as any[];
        tipEvents = queryResult;
        console.log("✅ イベント取得成功:", { eventCount: tipEvents.length });
      } catch (eventError) {
        console.error("❌ イベント取得エラー:", eventError);
        // さらに小さい範囲で再試行（最初の範囲よりも小さく）
        const smallerRange = Math.min(selectedRange, 1000);
        const smallerFromBlock = Math.max(0, currentBlock - smallerRange);
        console.log("🔄 より小さい範囲で再試行:", { smallerRange, smallerFromBlock, originalRange: selectedRange });
        tipEvents = await contract.queryFilter("TipSent", smallerFromBlock) as any[];
        console.log("✅ 小範囲イベント取得成功:", { eventCount: tipEvents.length });
      }

      // イベントが0件の場合は段階的に範囲を拡大
      if (tipEvents.length === 0) {
        console.warn("⚠️ イベントが見つかりません - 範囲を拡大して再検索", {
          currentRange: selectedRange,
          blockRange: { from: fromBlock, to: currentBlock },
          contractAddress: CONTRACT_ADDRESS,
          eventName: "TipSent"
        });
        
        // より大きな範囲で再試行
        for (let i = 1; i < BLOCK_RANGES.length; i++) {
          const expandedRange = BLOCK_RANGES[i];
          const expandedFromBlock = Math.max(0, currentBlock - expandedRange);
          console.log(`🔍 範囲を拡大して再検索 (${expandedRange}ブロック)...`);
          
          try {
            const expandedEvents = await contract.queryFilter("TipSent", expandedFromBlock) as any[];
            if (expandedEvents.length > 0) {
              tipEvents = expandedEvents;
              selectedRange = expandedRange;
              fromBlock = expandedFromBlock;
              console.log("✅ 拡大検索で発見:", { eventCount: tipEvents.length, range: expandedRange });
              break;
            }
          } catch (expandError) {
            console.warn(`⚠️ 拡大検索失敗 (${expandedRange}ブロック):`, expandError);
          }
        }
        
        if (tipEvents.length === 0) {
          console.error("❌ すべての範囲でイベントが見つかりませんでした", {
            testedRanges: BLOCK_RANGES,
            suggestion: "コントラクトアドレスまたはイベント名を確認してください"
          });
        }
      }
      
      const tipData: TipItem[] = [];
      const recentEvents = tipEvents.slice(-20); // 最新の20件
      
      console.log("🔄 イベント processing 開始:", { eventsToProcess: recentEvents.length });
      
      for (let i = 0; i < recentEvents.length; i++) {
        const event = recentEvents[i];
        try {
          const block = await provider.getBlock(event.blockNumber);
          tipData.push({
            from: event.args?.from || "",
            amount: event.args?.amount || 0n,
            blockNumber: BigInt(event.blockNumber),
            timestamp: block.timestamp,
            txHash: event.transactionHash,
          });
          
          if ((i + 1) % 5 === 0) {
            console.log("📊 処理進捗:", `${i + 1}/${recentEvents.length}`);
          }
        } catch (blockError) {
          console.warn("⚠️ ブロック情報取得失敗:", event.blockNumber, blockError);
        }
      }

      console.log("💰 累積Tip額計算開始...");
      // 累積Tip額をイベントから集計
      const total = tipEvents.reduce((sum: bigint, event: any) => {
        return sum + (event.args?.amount || 0n);
      }, 0n);
      console.log("💰 累積Tip額(イベント集計):", ethers.utils.formatUnits(total, TOKEN.DECIMALS), TOKEN.SYMBOL);

      // 管理者用統計: 全体の累積Tip額とユーザー統計
      const userStats = new Map<string, bigint>();
      tipEvents.forEach((event: any) => {
        const userAddr = event.args?.from?.toLowerCase();
        const amount = event.args?.amount || 0n;
        if (userAddr) {
          userStats.set(userAddr, (userStats.get(userAddr) || 0n) + amount);
        }
      });
      
      console.log("✅ データ処理完了:", { 
        tipDataCount: tipData.length, 
        totalTipsFromEvents: ethers.utils.formatUnits(total, TOKEN.DECIMALS),
        uniqueUsers: userStats.size,
        totalEvents: tipEvents.length
      });
      
      setTips(tipData.reverse());
      setTotalTips(total);
      
      // 分析データ計算
      calculateAnalytics(tipData);
      
    } catch (error: any) {
      console.error("❌ データ取得エラー:", {
        message: error.message,
        code: error.code,
        stack: error.stack,
        address,
        contractAddress: CONTRACT_ADDRESS,
        errorDetails: {
          name: error.name,
          reason: error.reason,
          code: error.code,
          method: error.method || 'unknown'
        }
      });
      
      // ユーザーにエラーを通知（簡易版）
      alert(`データ読み込みエラー: ${error.message || '不明なエラー'}`);
    } finally {
      setLoading(false);
    }
  };

  // 分析データ計算
  const calculateAnalytics = (tipData: TipItem[]) => {
    const now = Date.now() / 1000;
    const todayStart = new Date().setHours(0, 0, 0, 0) / 1000;
    const weekStart = now - 7 * 24 * 60 * 60;
    
    // 当日・週間Tip集計
    const todayTips = tipData.filter(tip => 
      tip.timestamp && tip.timestamp >= todayStart
    ).length;
    
    const weekTips = tipData.filter(tip => 
      tip.timestamp && tip.timestamp >= weekStart
    ).length;
    
    setDailyTips(todayTips);
    setWeeklyTips(weekTips);
    
    // トップサポーター集計（アドレス別）
    const supporterMap = new Map<string, bigint>();
    tipData.forEach(tip => {
      const current = supporterMap.get(tip.from) || 0n;
      supporterMap.set(tip.from, current + tip.amount);
    });
    
    const topThree = Array.from(supporterMap.entries())
      .map(([address, amount]) => ({ address, amount }))
      .sort((a, b) => b.amount > a.amount ? 1 : -1)
      .slice(0, 3);
    
    setTopSupporters(topThree);
    
    // SBTランク分布（モック - 実際の実装では契約から取得）
    // 簡易版: Tip額に基づく推定分布
    const uniqueUsers = Array.from(supporterMap.keys()).length;
    const mockDistribution = {
      seed: Math.max(1, Math.floor(uniqueUsers * 0.6)),
      grow: Math.max(0, Math.floor(uniqueUsers * 0.25)),
      bloom: Math.max(0, Math.floor(uniqueUsers * 0.12)),
      mythic: Math.max(0, Math.floor(uniqueUsers * 0.03))
    };
    setRankDistribution(mockDistribution);
  };

  // 緊急停止の読み込み・設定
  useEffect(() => {
    const loadEmergencyFlag = async () => {
      const flag = await readEmergencyFlag();
      setEmergency(flag);
    };
    loadEmergencyFlag();
  }, []);

  const toggleEmergency = async () => {
    const newState = !emergency;
    await setEmergencyFlag(newState);
    setEmergency(newState);
  };

  useEffect(() => {
    console.log("🔄 useEffect triggered:", { address, hasAddress: !!address });
    if (address) {
      // 少し遅延してデータ取得を実行
      const timer = setTimeout(() => {
        fetchData();
      }, 1000);
      
      return () => clearTimeout(timer);
    }
  }, [address]);

  return (
    <div style={{
      minHeight: "100vh",
      background: "#0b1620",
      color: "#fff",
      padding: "16px",
      fontFamily: "system-ui, -apple-system, sans-serif"
    }}>
      {/* ヘッダー */}
      <header style={{
        textAlign: "center",
        marginBottom: "24px",
        paddingBottom: "16px",
        borderBottom: "1px solid rgba(255,255,255,0.1)"
      }}>
        <h1 style={{
          fontSize: "24px",
          margin: "0 0 8px 0",
          background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent"
        }}>
          📱 GIFTERRA Admin
        </h1>
        <p style={{ fontSize: "14px", opacity: 0.7, margin: 0 }}>
          Mobile Dashboard
        </p>
      </header>

      {/* ウォレット接続 */}
      <div style={{
        display: "flex",
        justifyContent: "center",
        marginBottom: "24px"
      }}>
        <ConnectWallet 
          theme="dark"
          modalTitle="管理者ウォレット接続"
          style={{
            minHeight: "48px",
            fontSize: "16px"
          }}
        />
      </div>

      {address ? (
        <>
          {/* 統計情報カード */}
          <div style={{
            background: "rgba(255,255,255,0.06)",
            borderRadius: "12px",
            padding: "20px",
            marginBottom: "20px",
            border: "1px solid rgba(255,255,255,0.1)"
          }}>
            <div style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "16px",
              textAlign: "center"
            }}>
              <div>
                <div style={{
                  fontSize: "28px",
                  fontWeight: "bold",
                  color: "#22c55e"
                }}>
                  {fmt18(totalTips)}
                </div>
                <div style={{
                  fontSize: "12px",
                  opacity: 0.7,
                  marginTop: "4px"
                }}>
                  累積 {TOKEN.SYMBOL}
                </div>
              </div>
              <div>
                <div style={{
                  fontSize: "28px",
                  fontWeight: "bold",
                  color: "#3b82f6"
                }}>
                  {tips.length}
                </div>
                <div style={{
                  fontSize: "12px",
                  opacity: 0.7,
                  marginTop: "4px"
                }}>
                  総Tip数
                </div>
              </div>
            </div>
          </div>

          {/* 分析情報セクション */}
          <div style={{
            display: "flex",
            flexDirection: "column",
            gap: "16px",
            marginBottom: "20px"
          }}>
            {/* 当日・週間Tip集計 */}
            <div style={{
              background: "rgba(255,255,255,0.06)",
              borderRadius: "12px",
              padding: "16px",
              border: "1px solid rgba(255,255,255,0.1)"
            }}>
              <h3 style={{
                fontSize: "16px",
                margin: "0 0 12px 0",
                fontWeight: "600",
                color: "#fbbf24"
              }}>
                📊 期間別Tip統計
              </h3>
              <div style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "12px",
                textAlign: "center"
              }}>
                <div style={{
                  background: "rgba(251, 191, 36, 0.1)",
                  borderRadius: "8px",
                  padding: "12px"
                }}>
                  <div style={{
                    fontSize: "20px",
                    fontWeight: "bold",
                    color: "#fbbf24"
                  }}>
                    {dailyTips}
                  </div>
                  <div style={{
                    fontSize: "11px",
                    opacity: 0.7,
                    marginTop: "2px"
                  }}>
                    今日のTip
                  </div>
                </div>
                <div style={{
                  background: "rgba(34, 197, 94, 0.1)",
                  borderRadius: "8px",
                  padding: "12px"
                }}>
                  <div style={{
                    fontSize: "20px",
                    fontWeight: "bold",
                    color: "#22c55e"
                  }}>
                    {weeklyTips}
                  </div>
                  <div style={{
                    fontSize: "11px",
                    opacity: 0.7,
                    marginTop: "2px"
                  }}>
                    今週のTip
                  </div>
                </div>
              </div>
            </div>

            {/* トップサポーター3名 */}
            <div style={{
              background: "rgba(255,255,255,0.06)",
              borderRadius: "12px",
              padding: "16px",
              border: "1px solid rgba(255,255,255,0.1)"
            }}>
              <h3 style={{
                fontSize: "16px",
                margin: "0 0 12px 0",
                fontWeight: "600",
                color: "#f59e0b"
              }}>
                🌟 Top 3 Supporters
              </h3>
              {topSupporters.length === 0 ? (
                <div style={{
                  textAlign: "center",
                  padding: "20px",
                  opacity: 0.6,
                  fontSize: "14px"
                }}>
                  サポーターデータがありません
                </div>
              ) : (
                <div style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "8px"
                }}>
                  {topSupporters.map((supporter, index) => (
                    <div
                      key={supporter.address}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        background: "rgba(245, 158, 11, 0.1)",
                        borderRadius: "8px",
                        padding: "10px 12px"
                      }}
                    >
                      <div style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px"
                      }}>
                        <span style={{
                          fontSize: "16px"
                        }}>
                          {index === 0 ? "🥇" : index === 1 ? "🥈" : "🥉"}
                        </span>
                        <span style={{
                          fontSize: "13px",
                          fontFamily: "monospace",
                          color: "#d1d5db"
                        }}>
                          {shortAddress(supporter.address)}
                        </span>
                      </div>
                      <span style={{
                        fontSize: "14px",
                        fontWeight: "600",
                        color: "#f59e0b"
                      }}>
                        {fmt18(supporter.amount)} {TOKEN.SYMBOL}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* SBTランク分布サマリー */}
            <div style={{
              background: "rgba(255,255,255,0.06)",
              borderRadius: "12px",
              padding: "16px",
              border: "1px solid rgba(255,255,255,0.1)"
            }}>
              <h3 style={{
                fontSize: "16px",
                margin: "0 0 12px 0",
                fontWeight: "600",
                color: "#8b5cf6"
              }}>
                🏆 SBTランク分布
              </h3>
              <div style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "8px",
                fontSize: "13px"
              }}>
                <div style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  background: "rgba(34, 197, 94, 0.1)",
                  borderRadius: "6px",
                  padding: "8px"
                }}>
                  <span>🌱</span>
                  <span style={{ color: "#22c55e" }}>Seed: {rankDistribution.seed}</span>
                </div>
                <div style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  background: "rgba(59, 130, 246, 0.1)",
                  borderRadius: "6px",
                  padding: "8px"
                }}>
                  <span>🌿</span>
                  <span style={{ color: "#3b82f6" }}>Grow: {rankDistribution.grow}</span>
                </div>
                <div style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  background: "rgba(236, 72, 153, 0.1)",
                  borderRadius: "6px",
                  padding: "8px"
                }}>
                  <span>🌸</span>
                  <span style={{ color: "#ec4899" }}>Bloom: {rankDistribution.bloom}</span>
                </div>
                <div style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  background: "rgba(139, 92, 246, 0.1)",
                  borderRadius: "6px",
                  padding: "8px"
                }}>
                  <span>🌈</span>
                  <span style={{ color: "#8b5cf6" }}>Mythic: {rankDistribution.mythic}</span>
                </div>
              </div>
            </div>
          </div>

          {/* 緊急停止ボタン */}
          <div style={{
            background: "rgba(255,255,255,0.06)",
            borderRadius: "12px",
            padding: "16px",
            marginBottom: "20px",
            border: "1px solid rgba(255,255,255,0.1)"
          }}>
            <div style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: "8px"
            }}>
              <span style={{ fontWeight: "600" }}>🚨 緊急停止</span>
              <button
                onClick={toggleEmergency}
                style={{
                  padding: "8px 16px",
                  borderRadius: "8px",
                  border: "none",
                  background: emergency ? "#ef4444" : "#22c55e",
                  color: "white",
                  fontWeight: "600",
                  fontSize: "14px"
                }}
              >
                {emergency ? "ON" : "OFF"}
              </button>
            </div>
            <p style={{
              fontSize: "12px",
              opacity: 0.7,
              margin: 0,
              lineHeight: 1.4
            }}>
              緊急時にすべてのTip機能を停止します
            </p>
          </div>

          {/* 最近のTip履歴 */}
          <div style={{
            background: "rgba(255,255,255,0.06)",
            borderRadius: "12px",
            padding: "16px",
            border: "1px solid rgba(255,255,255,0.1)"
          }}>
            <h3 style={{
              fontSize: "18px",
              margin: "0 0 16px 0",
              fontWeight: "600"
            }}>
              📋 最近のTip履歴
            </h3>
            
            {loading ? (
              <div style={{
                textAlign: "center",
                padding: "40px",
                opacity: 0.7
              }}>
                <div>📡 データ読み込み中...</div>
                <div style={{ fontSize: "12px", marginTop: "8px", opacity: 0.6 }}>
                  ブロックチェーンからTip履歴を取得しています
                </div>
              </div>
            ) : tips.length === 0 ? (
              <div style={{
                textAlign: "center",
                padding: "40px",
                opacity: 0.7
              }}>
                <div>📝 Tip履歴がありません</div>
                <div style={{ fontSize: "12px", marginTop: "8px", opacity: 0.6 }}>
                  ウォレット: {address ? `${address.slice(0, 6)}...${address.slice(-4)}` : "未接続"}
                </div>
                <div style={{ fontSize: "12px", marginTop: "4px", opacity: 0.6 }}>
                  コントラクト: {CONTRACT_ADDRESS.slice(0, 6)}...{CONTRACT_ADDRESS.slice(-4)}
                </div>
              </div>
            ) : (
              <div style={{
                display: "flex",
                flexDirection: "column",
                gap: "12px"
              }}>
                {tips.slice(0, 10).map((tip, i) => (
                  <div
                    key={i}
                    style={{
                      background: "rgba(255,255,255,0.04)",
                      borderRadius: "8px",
                      padding: "12px",
                      border: "1px solid rgba(255,255,255,0.05)"
                    }}
                  >
                    <div style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: "4px"
                    }}>
                      <span style={{
                        fontSize: "16px",
                        fontWeight: "600",
                        color: "#22c55e"
                      }}>
                        +{fmt18(tip.amount)} {TOKEN.SYMBOL}
                      </span>
                      <span style={{
                        fontSize: "12px",
                        opacity: 0.6
                      }}>
                        {tip.timestamp ? formatTime(tip.timestamp) : ""}
                      </span>
                    </div>
                    <div style={{
                      fontSize: "12px",
                      opacity: 0.7,
                      fontFamily: "monospace"
                    }}>
                      {tip.from.slice(0, 6)}...{tip.from.slice(-4)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* デバッグ情報セクション */}
          <div style={{
            background: "rgba(255,255,255,0.03)",
            borderRadius: "8px",
            padding: "12px",
            marginTop: "16px",
            fontSize: "11px",
            fontFamily: "monospace",
            opacity: 0.7
          }}>
            <div>🔗 ウォレット: {address ? `${address.slice(0, 10)}...${address.slice(-6)}` : "未接続"}</div>
            <div>📄 コントラクト: {CONTRACT_ADDRESS.slice(0, 10)}...{CONTRACT_ADDRESS.slice(-6)}</div>
            <div>📊 データ状況: Tips={tips.length}件, 総額={fmt18(totalTips)} {TOKEN.SYMBOL} (イベント集計)</div>
            <div>⏰ 分析: 今日={dailyTips}, 今週={weeklyTips}, サポーター={topSupporters.length}名</div>
          </div>

          {/* データ更新ボタン */}
          <div style={{
            textAlign: "center",
            marginTop: "20px"
          }}>
            <button
              onClick={fetchData}
              disabled={loading}
              style={{
                padding: "12px 24px",
                borderRadius: "8px",
                border: "none",
                background: loading ? "#4b5563" : "#3b82f6",
                color: "white",
                fontWeight: "600",
                fontSize: "14px",
                cursor: loading ? "not-allowed" : "pointer"
              }}
            >
              {loading ? "更新中..." : "🔄 データ更新"}
            </button>
          </div>
        </>
      ) : (
        <div style={{
          textAlign: "center",
          padding: "60px 20px",
          opacity: 0.7
        }}>
          <div style={{ fontSize: "48px", marginBottom: "16px" }}>🔐</div>
          <h3 style={{ fontSize: "20px", margin: "0 0 8px 0" }}>
            ウォレット接続が必要です
          </h3>
          <p style={{ fontSize: "14px", margin: 0 }}>
            管理者機能にアクセスするにはウォレットを接続してください
          </p>
        </div>
      )}
    </div>
  );
}