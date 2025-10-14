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

// スマホ用Admin Dashboard
export default function DashboardMobile() {
  const address = useAddress();
  const [loading, setLoading] = useState(false);
  const [tips, setTips] = useState<TipItem[]>([]);
  const [totalTips, setTotalTips] = useState(0n);
  const [emergency, setEmergency] = useState(false);

  // データ取得
  const fetchData = async () => {
    if (!address) return;
    setLoading(true);

    try {
      const provider = new ethers.providers.JsonRpcProvider(
        "https://rpc-amoy.polygon.technology"
      );
      const contract = new ethers.Contract(
        CONTRACT_ADDRESS,
        [
          "event TipSent(address indexed from, uint256 amount, string displayName, string message)",
          "function getTotalTipsByUser(address user) view returns (uint256)",
        ],
        provider
      );

      // イベント取得
      const fromBlock = Math.max(0, (await provider.getBlockNumber()) - 50000);
      const tipEvents = await contract.queryFilter("TipSent", fromBlock);

      const tipData: TipItem[] = [];
      for (const event of tipEvents.slice(-20)) {
        const block = await provider.getBlock(event.blockNumber);
        tipData.push({
          from: event.args?.from,
          amount: event.args?.amount || 0n,
          blockNumber: BigInt(event.blockNumber),
          timestamp: block.timestamp,
          txHash: event.transactionHash,
        });
      }

      // 累積投げ銭額取得
      const total = await contract.getTotalTipsByUser(address);

      setTips(tipData.reverse());
      setTotalTips(total);
    } catch (error) {
      console.error("データ取得エラー:", error);
    } finally {
      setLoading(false);
    }
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
    if (address) {
      fetchData();
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
                  総投げ銭数
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
              緊急時にすべての投げ銭機能を停止します
            </p>
          </div>

          {/* 最近の投げ銭履歴 */}
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
              📋 最近の投げ銭履歴
            </h3>
            
            {loading ? (
              <div style={{
                textAlign: "center",
                padding: "40px",
                opacity: 0.7
              }}>
                読み込み中...
              </div>
            ) : tips.length === 0 ? (
              <div style={{
                textAlign: "center",
                padding: "40px",
                opacity: 0.7
              }}>
                投げ銭履歴がありません
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