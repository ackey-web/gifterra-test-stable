// src/tip-ui/App.tsx
import { useEffect, useMemo, useState } from "react";
import {
  ConnectWallet,
  useAddress,
  useChain,
  useContract,
  useContractWrite,
} from "@thirdweb-dev/react";
import { CONTRACT_ADDRESS, CONTRACT_ABI, TOKEN } from "../contract";
import { utils as ethersUtils, ethers } from "ethers";
import { saveAnnotation, fetchAnnotation } from "../lib/annotations";
import { saveTxMessage } from "../lib/annotations_tx";
import { useEmergency } from "../lib/emergency";

/* ---------------- 安全イベントパーサ ---------------- */
function getEventArgsFromReceipt(receipt: any, eventName: string, contractAddress: string, abi: any) {
  try {
    const iface = new ethers.utils.Interface(abi);
    const targetTopic = iface.getEventTopic(eventName);
    const logs: any[] = receipt?.logs || receipt?.events || [];
    const hit = logs.find(
      (l) =>
        (l?.topics?.[0] || "").toLowerCase() === targetTopic.toLowerCase() &&
        (l?.address || "").toLowerCase() === contractAddress.toLowerCase()
    );
    if (!hit) return null;
    const parsed = iface.parseLog({ topics: hit.topics, data: hit.data });
    return parsed?.args || null;
  } catch {
    return null;
  }
}

/* ---------------- ランク表示など ---------------- */
type RankInfo = { label: string; icon: string };
const RANK_LABELS: Record<number, RankInfo> = {
  0: { label: "Unranked", icon: "—" },
  1: { label: "Seed Supporter", icon: "🌱" },
  2: { label: "Grow Supporter", icon: "🌿" },
  3: { label: "Bloom Supporter", icon: "🌸" },
  4: { label: "Mythic Patron", icon: "🌈" },
};

function fmtUnits(v: bigint, decimals: number) {
  try {
    const s = ethersUtils.formatUnits(v.toString(), decimals);
    const [a, b = ""] = s.split(".");
    return b ? `${a}.${b.slice(0, 4)}` : a;
  } catch {
    return "0";
  }
}

/* ---------------- 感情分析 ---------------- */
async function analyzeSentimentSafe(message: string) {
  try {
    const { analyzeSentiment } = await import("../lib/ai_analysis");
    return await analyzeSentiment(message);
  } catch (error) {
    console.warn("Sentiment analysis skipped:", error);
    return null;
  }
}

const EMOTION_GRADIENTS = {
  positive: "linear-gradient(135deg, #FF6B6B, #FFD93D)",
  neutral: "linear-gradient(135deg, #A8E6CF, #DCEDC1)",
  negative: "linear-gradient(135deg, #B4A7D6, #E8DAEF)",
};

const EMOTION_LABELS = {
  positive: "🔥 熱烈な応援",
  neutral: "💚 温かい応援",
  negative: "💙 静かな応援",
};

export default function TipApp() {
  const address = useAddress();
  const chain = useChain();
  const { contract } = useContract(CONTRACT_ADDRESS, CONTRACT_ABI);

  // コントラクトデータ（手動管理）
  const [userInfoRaw, setUserInfoRaw] = useState<any>(null);
  const [levelRaw, setLevelRaw] = useState<any>(null);
  const [nextThresholdRaw, setNextThresholdRaw] = useState<any>(null);

  // データ取得関数
  const fetchUserData = async () => {
    if (!contract || !address) {
      setUserInfoRaw(null);
      setLevelRaw(null);
      return;
    }
    
    try {
      const userInfo = await contract.call("userInfo", [address]);
      setUserInfoRaw(userInfo);
      
      const level = await contract.call("userNFTLevel", [address]);
      setLevelRaw(level);
    } catch (error) {
      console.error("Failed to fetch user data:", error);
    }
  };

  // 初回＆address変更時に取得
  useEffect(() => {
    fetchUserData();
  }, [contract, address]);

  const currentLevel = useMemo(() => {
    try {
      if (levelRaw === undefined || levelRaw === null) return 0;
      return Number(BigInt(levelRaw as any));
    } catch {
      return 0;
    }
  }, [levelRaw]);

  const nextLevel = Math.min(currentLevel + 1, 4);

  // nextThreshold を手動で取得
  useEffect(() => {
    const fetchThreshold = async () => {
      if (!contract) return;
      try {
        const threshold = await contract.call("rankThresholds", [nextLevel]);
        setNextThresholdRaw(threshold);
      } catch (error) {
        console.error("Failed to fetch threshold:", error);
      }
    };
    fetchThreshold();
  }, [contract, nextLevel]);

  const totalTips = useMemo(() => {
    try {
      if (!userInfoRaw) return 0n;
      const arr = userInfoRaw as any[];
      return BigInt(arr[1] ?? 0n);
    } catch {
      return 0n;
    }
  }, [userInfoRaw]);

  const nextThreshold = useMemo(() => {
    try {
      return BigInt(nextThresholdRaw ?? 0n);
    } catch {
      return 0n;
    }
  }, [nextThresholdRaw]);

  const progress = useMemo(() => {
    if (nextLevel === currentLevel || nextThreshold === 0n) return 1;
    const num = Number(totalTips);
    const den = Number(nextThreshold);
    if (!isFinite(num) || !isFinite(den) || den === 0) return 0;
    return Math.min(1, Math.max(0, num / den));
  }, [totalTips, nextThreshold, currentLevel, nextLevel]);

  const [amount, setAmount] = useState("10");
  const parsedAmount = useMemo(() => {
    try {
      if (!amount || Number(amount) <= 0) return null;
      return ethersUtils.parseUnits(amount, TOKEN.DECIMALS);
    } catch {
      return null;
    }
  }, [amount]);

  const [displayName, setDisplayName] = useState("");
  const [message, setMessage] = useState("");
  const [tokenKey, setTokenKey] = useState<"PRIMARY">("PRIMARY");

  const { mutateAsync: tipFn, isLoading: isTipping } = useContractWrite(contract, "tip");

  const [txState, setTxState] = useState<"idle" | "sending" | "mined" | "error">("idle");
  const [lastLevel, setLastLevel] = useState(currentLevel);
  const [rankUpMsg, setRankUpMsg] = useState("");

  const emergency = useEmergency();

  const [hasProfile, setHasProfile] = useState<boolean | null>(null);
  useEffect(() => {
    const checkProfile = async () => {
      if (!address) {
        setHasProfile(null);
        return;
      }
      try {
        const res = await fetchAnnotation(address);
        setHasProfile(!!res?.name || !!res?.message);
      } catch {
        setHasProfile(false);
      }
    };
    checkProfile();
  }, [address]);

  useEffect(() => {
    if (currentLevel > lastLevel) {
      setRankUpMsg(`${RANK_LABELS[currentLevel]?.icon} ${RANK_LABELS[currentLevel]?.label} にランクアップ！ 🎉`);
      const t = setTimeout(() => setRankUpMsg(""), 3000);
      return () => clearTimeout(t);
    }
    setLastLevel(currentLevel);
  }, [currentLevel, lastLevel]);

  // 感情分析結果の状態
  const [sentimentState, setSentimentState] = useState<"idle" | "analyzing" | "show">("idle");
  const [sentimentResult, setSentimentResult] = useState<{ label: string; score: number } | null>(null);
  const [bgGradient, setBgGradient] = useState<string>("");

  /* ================= 投げ銭処理 ================ */
  const doTip = async () => {
    if (emergency) {
      alert("現在メンテナンス中（緊急停止）です。しばらくお待ちください。");
      return;
    }

    if (!address || !parsedAmount || tokenKey !== "PRIMARY") return;

    const dn = displayName.trim().slice(0, 32);
    const msg = message.trim().slice(0, hasProfile ? 120 : 40);

    try {
      setTxState("sending");
      let tx: any;
      if ((contract as any)?.call) {
        tx = await (contract as any).call("tip", [parsedAmount.toString()]);
      } else {
        tx = await tipFn({ args: [parsedAmount.toString()] });
      }

      let receipt: any = tx?.receipt ?? (typeof tx?.wait === "function" ? await tx.wait() : undefined);
      if (!receipt && tx?.hash && (window as any).ethereum) {
        const provider = new ethers.providers.Web3Provider((window as any).ethereum as any);
        receipt = await provider.getTransactionReceipt(tx.hash);
      }

      const args =
        getEventArgsFromReceipt(receipt, "Tipped", CONTRACT_ADDRESS, CONTRACT_ABI) ||
        getEventArgsFromReceipt(receipt, "TipSent", CONTRACT_ADDRESS, CONTRACT_ABI);

      setTxState("mined");

      const txHash: string = receipt?.transactionHash || receipt?.hash || tx?.hash || "";

      // プロフィール保存
      if (!hasProfile && (dn || msg)) {
        try {
          await saveAnnotation({
            from: address,
            displayName: dn || "Anonymous",
            message: msg || "",
            timestamp: Math.floor(Date.now() / 1000),
          });
          setHasProfile(true);
        } catch (e) {
          console.warn("profile save failed", e);
        }
      }

      // トランザクション単位メッセージ保存
      if (txHash && msg) {
        try {
          await saveTxMessage(address, txHash, msg);
        } catch (e) {
          console.warn("saveTxMessage failed", e);
        }
      }

      // UI更新（手動でデータ再取得）
      setTimeout(() => {
        fetchUserData();
        setTxState("idle");
      }, 1200);

      setDisplayName("");
      setMessage("");

      const amt = (args as any)?.amount ?? (args as any)?.value ?? (Array.isArray(args) ? (args as any)[1] : undefined);
      const pretty = fmtUnits(BigInt(amt?.toString?.() ?? "0"), TOKEN.DECIMALS);
      alert(`投げ銭を送信しました！ (+${pretty} ${TOKEN.SYMBOL})`);

      // 投げ銭成功後に感情分析（非同期・独立実行）
      if (msg) {
        setSentimentState("analyzing");
        analyzeSentimentSafe(msg).then((sentiment) => {
          if (sentiment) {
            setSentimentResult({
              label: EMOTION_LABELS[sentiment.label],
              score: sentiment.score,
            });
            setBgGradient(EMOTION_GRADIENTS[sentiment.label]);
            setSentimentState("show");
            
            setTimeout(() => {
              setSentimentState("idle");
              setBgGradient("");
            }, 3000);
          } else {
            setSentimentState("idle");
          }
        }).catch((error) => {
          console.error("Sentiment analysis error:", error);
          setSentimentState("idle");
        });
      }
    } catch (e: any) {
      console.error(e);
      setTxState("error");
      setTimeout(() => setTxState("idle"), 1500);
      const m = e?.reason || e?.data?.message || e?.message || "送信に失敗しました。もう一度お試しください。";
      alert(m);
    }
  };

  const canSend = !!address && !!parsedAmount && tokenKey === "PRIMARY" && !isTipping && !emergency;
  const BUTTON_H = 44;

  return (
    <main 
      style={{ 
        minHeight: "100vh", 
        background: bgGradient || "#0b1620", 
        color: "#fff", 
        display: "grid", 
        gridTemplateRows: "auto 1fr auto", 
        padding: "24px 12px 20px",
        transition: "background 0.8s ease",
      }}
    >
      {/* 感情分析オーバーレイ */}
      {sentimentState !== "idle" && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0, 0, 0, 0.7)",
            backdropFilter: "blur(8px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            animation: "fadeIn 0.3s ease",
          }}
        >
          <div
            style={{
              background: "linear-gradient(145deg, #1e293b, #0f172a)",
              borderRadius: 20,
              padding: "40px",
              textAlign: "center",
              maxWidth: "90vw",
              boxShadow: "0 20px 60px rgba(0, 0, 0, 0.5)",
            }}
          >
            {sentimentState === "analyzing" ? (
              <>
                <div style={{ fontSize: 48, marginBottom: 20, animation: "spin 2s linear infinite" }}>✨</div>
                <div style={{ fontSize: 18, fontWeight: 600 }}>AIがあなたの想いを分析中...</div>
              </>
            ) : (
              <>
                <div style={{ fontSize: 64, marginBottom: 20 }}>{sentimentResult?.label.split(" ")[0]}</div>
                <div style={{ fontSize: 24, fontWeight: 800, marginBottom: 10 }}>
                  {sentimentResult?.label}
                </div>
                <div style={{ fontSize: 14, opacity: 0.8 }}>
                  感情スコア: {sentimentResult?.score}/100
                </div>
              </>
            )}
          </div>
        </div>
      )}

      <style>{`
        @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
        @keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }
        @keyframes pop { 0%, 100% { transform: scale(1) } 50% { transform: scale(1.05) } }
      `}</style>

      <header style={{ textAlign: "center", marginBottom: 10 }}>
        <img src="/gifterra-logo.png" alt="GIFTERRA" style={{ width: "clamp(90px, 12vw, 140px)", marginBottom: 22, filter: "drop-shadow(0 10px 22px rgba(0,0,0,.30))" }} />
        <h1 style={{ fontSize: "clamp(22px, 2.4vw, 28px)", margin: "10px 0 6px" }}>💝 Send Your Support</h1>
        <p style={{ opacity: 0.85, margin: "0 0 4px", fontSize: 13 }}>あなたの応援が、カタチになる。</p>
        <div style={{ fontSize: 13, fontWeight: address ? 800 : 500, color: address ? "#22c55e" : "rgba(255,255,255,0.75)", marginTop: 8 }}>
          {address ? `接続済み: ${address.slice(0, 6)}...${address.slice(-4)}` : "ウォレット未接続"}
        </div>
        
        {/* デバッグ情報 */}
        <div style={{ 
          fontSize: 11, 
          opacity: 0.6, 
          marginTop: 8,
          padding: 6,
          background: "rgba(255,255,255,0.05)",
          borderRadius: 4,
          maxWidth: 400
        }}>
          <div>アドレス: {address || "未接続"}</div>
          <div>チェーン: {chain?.name || "未設定"} (ID: {chain?.chainId || "N/A"})</div>
          <div>期待チェーンID: 80002</div>
        </div>
      </header>

      <section style={{ display: "grid", justifyItems: "center", alignContent: "start", rowGap: 12, width: "min(92vw, 720px)", margin: "12px auto 0" }}>
        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", justifyContent: "center" }}>
          <ConnectWallet theme="dark" />
          <select value={tokenKey} onChange={() => setTokenKey("PRIMARY")} style={{ height: BUTTON_H, borderRadius: 10, border: "1px solid #334155", background: "#0f1a24", color: "#fff", padding: "0 12px", fontWeight: 700 }}>
            <option value="PRIMARY">{TOKEN.SYMBOL}</option>
            <option value="DISABLED" disabled>JPYC（近日予定）</option>
          </select>
          <div style={{ display: "inline-flex", alignItems: "center", height: BUTTON_H, borderRadius: 10, background: "#0f1a24", border: "1px solid #334155" }}>
            <input value={amount} onChange={(e) => setAmount(e.target.value)} inputMode="decimal" placeholder="金額" style={{ height: "100%", padding: "0 12px", outline: "none", background: "transparent", color: "#fff", border: "none", width: 120 }} />
            <span style={{ opacity: 0.8, fontSize: 12, paddingRight: 10 }}>{TOKEN.SYMBOL}</span>
          </div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="ニックネーム（任意）" maxLength={32} style={{ height: BUTTON_H, borderRadius: 10, border: "1px solid #334155", background: "#0f1a24", color: "#fff", padding: "0 12px", width: 160 }} />
            <input
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={hasProfile === null ? "確認中..." : hasProfile ? "一言メッセージ（任意）" : "簡易プロフィール（初回のみ）"}
              maxLength={hasProfile ? 120 : 40}
              style={{ height: BUTTON_H, borderRadius: 10, border: "1px solid #334155", background: "#0f1a24", color: "#fff", padding: "0 12px", width: 220 }}
            />
          </div>
          <button
            onClick={doTip}
            disabled={!canSend}
            title={emergency ? "メンテナンス中（緊急停止）" : undefined}
            style={{
              height: BUTTON_H,
              padding: "0 16px",
              background: canSend ? "#22c55e" : "#3a3f46",
              color: "#0a0a0a",
              borderRadius: 10,
              border: "none",
              cursor: canSend ? "pointer" : "not-allowed",
              fontWeight: 800
            }}
          >
            {emergency ? "メンテナンス中" : txState === "sending" ? "送信中…" : txState === "mined" ? "確定しました" : "投げ銭する"}
          </button>
        </div>

        {hasProfile === false && (
          <div
            style={{
              width: "100%",
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 10,
              padding: "10px 14px",
              fontSize: 12,
              color: "#e5e7eb",
              textAlign: "left",
              lineHeight: 1.5,
            }}
          >
            <strong>💡 初回プロフィール登録</strong>
            <br />
            ・この「簡易プロフィール」は初回のみ登録され、後から変更できません。<br />
            ・最大 40 文字まで入力できます。<br />
            ・登録後は通常の一言メッセージ入力に切り替わります。
          </div>
        )}

        <div style={{ width: "100%", background: "rgba(255,255,255,0.06)", padding: "10px 12px", borderRadius: 12, textAlign: "left", fontSize: 12, lineHeight: 1.35, display: "grid", rowGap: 4 }}>
          <div><strong>Address:</strong> {address ?? "—"}</div>
          <div><strong>Chain:</strong> {chain ? `${chain.name} (${chain.chainId})` : "—"}</div>
        </div>

        <div style={{ width: "100%", background: "rgba(255,255,255,.06)", borderRadius: 12, padding: 14, display: "grid", rowGap: 10 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", flexWrap: "wrap" }}>
            <div>
              <div style={{ fontSize: 12, opacity: 0.8 }}>💎 SBTランク</div>
              <div style={{ fontSize: 18, fontWeight: 800 }}>
                {RANK_LABELS[currentLevel]?.icon} {RANK_LABELS[currentLevel]?.label ?? "Unranked"}
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 12, opacity: 0.8 }}>累積投げ銭額</div>
              <div style={{ fontWeight: 800 }}>
                {fmtUnits(totalTips, TOKEN.DECIMALS)} {TOKEN.SYMBOL}
              </div>
            </div>
          </div>

          <div style={{ position: "relative", height: 14, borderRadius: 999, background: "#0e1720", overflow: "hidden", border: "1px solid rgba(255,255,255,.08)" }}>
            <div
              style={{
                position: "absolute",
                left: 0,
                top: 0,
                bottom: 0,
                width: `${Math.max(4, progress * 100)}%`,
                background: progress >= 1 ? "linear-gradient(90deg,#22c55e,#84cc16)" : "linear-gradient(90deg,#38bdf8,#818cf8)",
                transition: "width .6s ease",
              }}
            />
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, opacity: 0.85, flexWrap: "wrap", gap: 8 }}>
            <div>
              次のランク: <strong>{RANK_LABELS[nextLevel]?.icon} {RANK_LABELS[nextLevel]?.label ?? "—"}</strong>
            </div>
            <div>
              あと <strong>{fmtUnits(nextThreshold > totalTips ? nextThreshold - totalTips : 0n, TOKEN.DECIMALS)} {TOKEN.SYMBOL}</strong>
            </div>
          </div>
        </div>

        {rankUpMsg && <div style={{ fontWeight: 800, animation: "pop 600ms ease" }}>{rankUpMsg}</div>}
      </section>

      <footer style={{ textAlign: "center", fontSize: 12, opacity: 0.6, marginTop: 6 }}>
        Presented by <strong>METATRON.</strong>
      </footer>
    </main>
  );
}