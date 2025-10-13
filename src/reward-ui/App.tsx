// src/reward-ui/App.tsx
import { useEffect, useMemo, useState } from "react";
import {
  ConnectWallet,
  useAddress,
  useChain,
  useContract,
  useContractRead,
} from "@thirdweb-dev/react";
import { ethers } from "ethers";
import { CONTRACT_ADDRESS, CONTRACT_ABI, TOKEN } from "../contract";
import { useEmergency } from "../lib/emergency";

/* ---------- 安全イベントパーサ（元UIのまま） ---------- */
function getEventArgsFromReceipt(
  receipt: any,
  eventName: string,
  contractAddress: string,
  abi: any
) {
  try {
    const iface =
      (ethers as any)?.utils?.Interface
        ? new (ethers as any).utils.Interface(abi)
        : new (ethers as any).Interface(abi);
    const topic = iface.getEventTopic(eventName);
    const logs = receipt?.logs || receipt?.events || [];
    const hit = logs.find(
      (l: any) =>
        (((l?.topics?.[0] || "") + "").toLowerCase() ===
          (topic + "").toLowerCase()) &&
        (((l?.address || "") + "").toLowerCase() ===
          (contractAddress + "").toLowerCase())
    );
    if (!hit) return null;
    const parsed = iface.parseLog({ topics: hit.topics, data: hit.data });
    return parsed?.args || null;
  } catch {
    return null;
  }
}

export default function App() {
  const address = useAddress();
  const chain = useChain();
  const { contract } = useContract(CONTRACT_ADDRESS, CONTRACT_ABI);

  // ---- 読み取り（元UIのまま）----
  const { data: dailyRewardRaw } = useContractRead(
    contract,
    "dailyRewardAmount"
  );
  const { data: userInfoRaw } = useContractRead(
    contract,
    "userInfo",
    address ? [address] : undefined
  );

  const dailyReward =
    dailyRewardRaw !== undefined
      ? `${Number(dailyRewardRaw) / 1e18} ${TOKEN.SYMBOL}/day`
      : "loading...";

  // ★ ダッシュボードと同期するローカル緊急停止フラグのみ使用
  const isMaintenance = useEmergency();

  // ---- 最終請求時刻 → カウントダウン（元UIのまま）----
  const lastClaimedSec = useMemo<number | undefined>(() => {
    if (!userInfoRaw) return undefined;
    try {
      const arr = userInfoRaw as any[];
      return Number(BigInt(arr[0] ?? 0n));
    } catch {
      return undefined;
    }
  }, [userInfoRaw]);

  const [now, setNow] = useState<number>(() => Math.floor(Date.now() / 1000));
  useEffect(() => {
    const t = setInterval(() => setNow(Math.floor(Date.now() / 1000)), 1000);
    return () => clearInterval(t);
  }, []);

  const nextAvailable = useMemo(() => {
    if (!lastClaimedSec) return 0;
    return lastClaimedSec + 24 * 60 * 60;
  }, [lastClaimedSec]);

  const remain = Math.max(0, nextAvailable - now);
  const [isWriting, setIsWriting] = useState(false);

  // ★メンテ中は請求不可（それ以外は元UIのまま）
  const canClaim = !!address && remain === 0 && !isWriting && !isMaintenance;

  // ---- 受け取り成功時のみウォレット追加を表示（レイアウト固定）----
  const [showAddToken, setShowAddToken] = useState(false);

  const addTokenToWallet = async () => {
    try {
      const wasAdded = await (window as any).ethereum?.request({
        method: "wallet_watchAsset",
        params: {
          type: "ERC20",
          options: {
            address: TOKEN.ADDRESS,
            symbol: TOKEN.SYMBOL,
            decimals: TOKEN.DECIMALS,
            image: TOKEN.ICON,
          },
        },
      });
      if (wasAdded) {
        alert(`✅ ${TOKEN.SYMBOL} をウォレットに追加しました！`);
      } else {
        alert("ℹ️ 追加はキャンセルされました。");
      }
    } catch (e) {
      console.error(e);
      alert("⚠️ トークン追加に失敗しました。");
    }
  };

  const fmt = (s: number) => {
    const h = String(Math.floor(s / 3600)).padStart(2, "0");
    const m = String(Math.floor((s % 3600) / 60)).padStart(2, "0");
    const sec = String(s % 60).padStart(2, "0");
    return `${h}:${m}:${sec}`;
  };

  const onClaim = async () => {
    if (!canClaim || !contract) return;

    // 事前チェック（元UIの流儀に合わせて最小変更）
    try {
      const eth = (window as any).ethereum;
      if (!eth) throw new Error("Wallet not found");
      await eth.request({ method: "eth_requestAccounts" });
      const cid = await eth.request({ method: "eth_chainId" });
      if ((cid || "").toLowerCase() !== "0x13882") {
        await eth.request({
          method: "wallet_switchEthereumChain",
          params: [{ chainId: "0x13882" }],
        });
      }
    } catch (e) {
      console.error("preflight failed:", e);
      alert("ウォレット/チェーンの準備に失敗しました。もう一度お試しください。");
      return;
    }

    const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
    const maxTry = 3;
    let lastErr: any = null;
    setIsWriting(true);

    for (let i = 0; i < maxTry; i++) {
      try {
        // thirdweb 経由（元UIのまま）
        const res: any = await (contract as any).call("claimDailyReward", []);
        let receipt =
          res?.receipt ??
          (typeof res?.wait === "function" ? await res.wait() : undefined) ??
          res;

        if (!receipt && res?.hash && (window as any).ethereum) {
          const provider = new ethers.providers.Web3Provider(
            (window as any).ethereum
          );
          receipt = await provider.getTransactionReceipt(res.hash);
        }

        // 受領イベント（元UIのまま）
        const tryEvents = ["DailyRewardClaimed", "DailyClaimed", "RewardClaimed"];
        let args: any = null;
        for (const ev of tryEvents) {
          args = getEventArgsFromReceipt(
            receipt,
            ev,
            CONTRACT_ADDRESS,
            CONTRACT_ABI
          );
          if (args) break;
        }

        if (args) {
          const raw =
            args.amount ??
            args.value ??
            (Array.isArray(args) ? args[1] : undefined);
          const pretty =
            raw !== undefined
              ? Number(
                  ethers.utils.formatUnits(
                    raw.toString ? raw.toString() : (raw as any),
                    TOKEN.DECIMALS
                  )
                ).toFixed(2)
              : undefined;
          alert(
            pretty
              ? `✅ ${pretty} ${TOKEN.SYMBOL} を受け取りました！`
              : "✅ 受け取り完了！"
          );
          setShowAddToken(true); // 成功時のみ出現
        } else {
          alert("✅ 受け取り取引を送信しました。ウォレットで確定をご確認ください。");
          setShowAddToken(true); // 成功扱い
        }
        setIsWriting(false);
        return;
      } catch (err: any) {
        console.warn(`[try ${i + 1}/${maxTry}] thirdweb 経由失敗`, err);
        lastErr = err;
        const msg = (err?.message || "").toLowerCase();
        const retriable =
          msg.includes("parse") ||
          msg.includes("json") ||
          msg.includes("rate") ||
          msg.includes("429") ||
          msg.includes("network");
        if (!retriable && i === 0) {
          // ethers 直叩きフォールバック
          try {
            const provider = new ethers.providers.Web3Provider(
              (window as any).ethereum
            );
            const signer = provider.getSigner();
            const direct = new ethers.Contract(
              CONTRACT_ADDRESS,
              CONTRACT_ABI as any,
              signer
            );
            const tx = await direct.claimDailyReward();
            await tx.wait();
            alert("✅ 受け取り完了！（フォールバック経路）");
            setShowAddToken(true);
            setIsWriting(false);
            return;
          } catch (e2) {
            console.warn("ethers フォールバックも失敗:", e2);
            lastErr = e2;
          }
        }
        if (i < maxTry - 1) {
          await sleep(500 * (i + 1));
          continue;
        }
      }
    }

    setIsWriting(false);
    const msg =
      lastErr?.reason ||
      lastErr?.data?.message ||
      lastErr?.message ||
      "送信に失敗しました。時間をおいて再度お試しください。";
    alert(msg);
  };

  const BTN_H = 42;

  return (
    <main
      style={{
        minHeight: "100vh",
        width: "100vw",
        maxWidth: "100vw",
        background: "#0b1620",
        color: "#fff",
        display: "grid",
        gridTemplateRows: "auto 1fr auto",
        alignContent: "start",
        padding: "14px 10px 16px",
        margin: 0,
        overflowX: "hidden",
        boxSizing: "border-box"
      }}
    >
      {/* ロゴ（元レイアウト） */}
      <div style={{ display: "grid", placeItems: "center", marginTop: 2 }}>
        <img
          src="/gifterra-logo.png"
          alt="GIFTERRA"
          style={{
            width: "clamp(120px, 16vw, 180px)",
            height: "auto",
            objectFit: "contain"
          }}
        />
      </div>

      {/* 中央コンテンツ（元レイアウトを維持） */}
      <div
        style={{
          marginTop: 26,
          display: "grid",
          justifyItems: "center",
          gap: 10
        }}
      >
        <h1
          style={{
            fontSize: "clamp(22px, 2.6vw, 30px)",
            margin: "0 0 12px",
            lineHeight: 1.3
          }}
        >
          <span role="img" aria-label="gift">🎁</span> Daily Reward
        </h1>

        {/* 接続状態（元の色/余白を維持） */}
        <p
          style={{
            margin: "6px 0 8px 0",
            fontSize: 13,
            fontWeight: address ? 700 : 400,
            color: address ? "#4ade80" : "rgba(255,255,255,0.75)"
          }}
        >
          {address ? `接続済み: ${address.slice(0, 6)}...${address.slice(-4)}` : "ウォレットを接続してください"}
        </p>
        
        {/* デバッグ情報 */}
        <div style={{ 
          fontSize: 12, 
          opacity: 0.6, 
          marginBottom: 8,
          padding: 8,
          background: "rgba(255,255,255,0.05)",
          borderRadius: 4 
        }}>
          <div>アドレス: {address || "未接続"}</div>
          <div>チェーン: {chain?.name || "未設定"} (ID: {chain?.chainId || "N/A"})</div>
          <div>期待チェーンID: 80002 (Polygon Amoy)</div>
          <div>Client ID: 779fcfff75c8b7ed91ea029f8783fd8e</div>
        </div>

        {/* ボタン行（高さ・gapなど元のまま） */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 10,
            flexWrap: "wrap",
            marginTop: 4
          }}
        >
          <ConnectWallet theme="dark" />
          <button
            onClick={isMaintenance ? undefined : onClaim}
            disabled={!canClaim}
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              height: BTN_H,
              padding: "0 14px",
              backgroundColor: canClaim ? "#ff7a00" : "#3a3f46",
              color: "#fff",
              borderRadius: 10,
              border: "none",
              cursor: canClaim ? "pointer" : "not-allowed",
              fontSize: 14,
              fontWeight: 700,
              lineHeight: 1,
              opacity: canClaim ? 1 : 0.7
            }}
          >
            {isMaintenance
              ? "メンテナンス中"
              : isWriting
              ? "送信中…"
              : canClaim
              ? "リワードを請求する"
              : "カウントダウン中"}
          </button>
        </div>

        {/* 状態表示（元レイアウト） */}
        <div style={{ fontSize: 12, opacity: 0.9, marginTop: 4, minHeight: 16 }}>
          {!address
            ? "ウォレット未接続"
            : isMaintenance
            ? "⛔ 現在メンテナンス中"
            : remain > 0
            ? `次の受け取りまで: ${fmt(remain)}`
            : "受け取り可能です ✨"}
        </div>

        {/* ウォレット追加（成功時のみ表示） */}
        <div style={{ height: 56, display: "grid", placeItems: "center" }}>
          {showAddToken && (
            <div style={{ display: "grid", justifyItems: "center" }}>
              <div style={{ fontSize: 12, opacity: 0.8, marginBottom: 4 }}>
                💡 初めて {TOKEN.SYMBOL} を受け取る方はこちら
              </div>
              <button
                onClick={addTokenToWallet}
                style={{
                  background: "#2563eb",
                  color: "#fff",
                  border: "none",
                  borderRadius: 8,
                  padding: "6px 14px",
                  fontSize: 13,
                  cursor: "pointer"
                }}
              >
                {TOKEN.SYMBOL} をウォレットに追加 🪙
              </button>
            </div>
          )}
        </div>

        {/* 情報カード（元レイアウト） */}
        <div
          style={{
            boxSizing: "border-box",
            width: "min(88vw, 520px)",
            background: "rgba(255,255,255,0.06)",
            padding: "8px 10px",
            borderRadius: 12,
            textAlign: "left",
            fontSize: 12,
            lineHeight: 1.35,
            display: "grid",
            rowGap: 4,
            marginTop: 4
          }}
        >
          <div><strong>Address:</strong> {address ?? "—"}</div>
          <div><strong>Chain:</strong> {chain ? `${chain.name} (${chain.chainId})` : "—"}</div>
          <div><strong>Daily Reward:</strong> {dailyReward}</div>
        </div>

        {/* バナー（元のまま） */}
        <img
          src="/ad-placeholder.png"
          alt="広告募集中"
          style={{
            width: "clamp(200px, 28vw, 240px)",
            height: "auto",
            objectFit: "contain",
            marginTop: 18,
            filter: "drop-shadow(0 8px 18px rgba(0,0,0,.28))",
            borderRadius: 14
          }}
        />
      </div>

      {/* フッター（元のまま） */}
      <div
        style={{
          textAlign: "center",
          fontSize: 12,
          opacity: 0.6,
          marginTop: 16,
          marginBottom: 6
        }}
      >
        Presented by <strong>METATRON.</strong>
      </div>
    </main>
  );
}