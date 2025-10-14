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
import { AdCarousel } from "../components/AdCarousel";
import { burstConfetti } from "../utils/confetti";

/* ---------- 安全イベントパーサ（修正版） ---------- */
function getEventArgsFromReceipt(
  receipt: any,
  eventName: string,
  contractAddress: string,
  abi: any
) {
  try {
    // ethers v5 互換性を考慮したインターフェース作成
    const iface = new ethers.utils.Interface(abi);
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
  } catch (error) {
    console.warn("Event parsing failed:", error);
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
  
  // ---- 成功メッセージ表示用ステート ----
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [bgGradient, setBgGradient] = useState("");

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

    // 事前チェック（改善版）
    try {
      const eth = (window as any).ethereum;
      if (!eth) throw new Error("MetaMaskまたは対応ウォレットが見つかりません");
      
      // アカウント接続確認
      const accounts = await eth.request({ method: "eth_requestAccounts" });
      if (!accounts || accounts.length === 0) {
        throw new Error("ウォレットアカウントが見つかりません");
      }
      
      // チェーン確認と切り替え
      const currentChainId = await eth.request({ method: "eth_chainId" });
      if ((currentChainId || "").toLowerCase() !== "0x13882") {
        try {
          await eth.request({
            method: "wallet_switchEthereumChain",
            params: [{ chainId: "0x13882" }],
          });
          // チェーン切り替え後の待機
          await new Promise(resolve => setTimeout(resolve, 1000));
        } catch (switchError: any) {
          if (switchError.code === 4902) {
            // ネットワークが存在しない場合は追加
            await eth.request({
              method: "wallet_addEthereumChain",
              params: [{
                chainId: "0x13882",
                chainName: "Polygon Amoy Testnet",
                nativeCurrency: {
                  name: "MATIC",
                  symbol: "MATIC",
                  decimals: 18
                },
                rpcUrls: ["https://rpc-amoy.polygon.technology/"],
                blockExplorerUrls: ["https://amoy.polygonscan.com/"]
              }]
            });
          } else {
            throw switchError;
          }
        }
      }
    } catch (e: any) {
      console.error("preflight failed:", e);
      const errorMsg = e?.message || "不明なエラー";
      alert(`ウォレット/チェーンの準備に失敗しました:\n${errorMsg}\n\nPolygon Amoyネットワークに接続していることを確認してください。`);
      return;
    }

    const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
    const maxTry = 3;
    let lastErr: any = null;
    setIsWriting(true);

    // まずethers直接経由を試す（より安定）
    try {
      const provider = new ethers.providers.Web3Provider(
        (window as any).ethereum
      );
      const signer = provider.getSigner();
      const directContract = new ethers.Contract(
        CONTRACT_ADDRESS,
        CONTRACT_ABI as any,
        signer
      );
      
      // ガス見積もりを事前に実行
      const gasEstimate = await directContract.estimateGas.claimDailyReward();
      
      const tx = await directContract.claimDailyReward({
        gasLimit: gasEstimate.mul(120).div(100) // 20%のバッファ
      });
      
      const receipt = await tx.wait();
      
      // 成功時の処理
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
        // 🎉 リワード受け取り成功エフェクト
        burstConfetti().catch(console.warn);
        setBgGradient("linear-gradient(135deg, #667eea 0%, #764ba2 100%)");
        setTimeout(() => setBgGradient(""), 3000);
        setShowSuccessMessage(true);
        setTimeout(() => setShowSuccessMessage(false), 3000);
      } else {
        // 🎉 取引送信成功エフェクト
        burstConfetti().catch(console.warn);
        setBgGradient("linear-gradient(135deg, #667eea 0%, #764ba2 100%)");
        setTimeout(() => setBgGradient(""), 3000);
        setShowSuccessMessage(true);
        setTimeout(() => setShowSuccessMessage(false), 3000);
      }
      
      setShowAddToken(true);
      setIsWriting(false);
      return;
      
    } catch (directError: any) {
      console.warn("Direct ethers failed, trying ThirdWeb:", directError);
      lastErr = directError;
    }

    // ethersが失敗した場合のThirdWebフォールバック
    for (let i = 0; i < maxTry; i++) {
      try {
        console.log(`ThirdWeb attempt ${i + 1}/${maxTry}`);
        
        // ThirdWeb経由でのトランザクション送信
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
          // 🎉 リワード受け取り成功エフェクト
          // 1. コンフェッティ（紙吹雪）
          burstConfetti().catch(console.warn);
          
          // 2. オーラ／背景エフェクト
          setBgGradient("linear-gradient(135deg, #667eea 0%, #764ba2 100%)");
          setTimeout(() => setBgGradient(""), 3000);
          
          // 3. 成功メッセージ表示
          setShowSuccessMessage(true);
          setTimeout(() => setShowSuccessMessage(false), 3000);
          
          setShowAddToken(true); // 成功時のみ出現
        } else {
          // 🎉 取引送信成功エフェクト
          burstConfetti().catch(console.warn);
          setBgGradient("linear-gradient(135deg, #667eea 0%, #764ba2 100%)");
          setTimeout(() => setBgGradient(""), 3000);
          setShowSuccessMessage(true);
          setTimeout(() => setShowSuccessMessage(false), 3000);
          
          setShowAddToken(true); // 成功扱い
        }
        setIsWriting(false);
        return;
      } catch (err: any) {
        console.warn(`[ThirdWeb try ${i + 1}/${maxTry}] failed:`, err);
        lastErr = err;
        
        const msg = (err?.message || "").toLowerCase();
        const isRetriable =
          msg.includes("parse") ||
          msg.includes("json") ||
          msg.includes("rate") ||
          msg.includes("429") ||
          msg.includes("network") ||
          msg.includes("timeout") ||
          msg.includes("connection");
          
        // 致命的なエラーの場合は即座に終了
        if (msg.includes("insufficient funds") || 
            msg.includes("execution reverted") ||
            msg.includes("already claimed")) {
          break;
        }
        
        if (i < maxTry - 1 && isRetriable) {
          const waitTime = 1000 * (i + 1); // 1s, 2s, 3s
          console.log(`Retrying in ${waitTime}ms...`);
          await sleep(waitTime);
          continue;
        }
      }
    }

    setIsWriting(false);
    
    // 詳細なエラー分析と適切なユーザーメッセージ
    const errorReason = lastErr?.reason || lastErr?.data?.message || lastErr?.message || "不明なエラー";
    const errorCode = lastErr?.code;
    const errorMsg = errorReason.toLowerCase();
    
    let userMessage = "";
    
    if (errorMsg.includes("internal json-rpc error")) {
      userMessage = `🔧 RPC接続エラーが発生しました\n\n原因と対処法:\n• Polygon Amoyネットワークの一時的な混雑\n• RPCエンドポイントの問題\n• ウォレットの接続状態\n\n⏰ 数分待ってから再度お試しください\n💡 他のRPCエンドポイントも自動で試行済みです`;
    } else if (errorMsg.includes("insufficient funds") || errorCode === -32000) {
      userMessage = `💰 ガス代不足エラー\n\nMATICが不足しています:\n• Polygon Amoy testnet用のMATICが必要\n• 最低 0.01 MATIC以上を推奨\n\n🚰 Faucetから無料でMATICを取得:\nhttps://faucet.polygon.technology/`;
    } else if (errorMsg.includes("already claimed") || errorMsg.includes("too early")) {
      userMessage = `⏰ 請求制限エラー\n\n既に本日分を受け取り済みです\n次の請求まで: ${remain > 0 ? fmt(remain) : '計算中...'}\n\n📅 24時間に1回のみ請求可能です`;
    } else if (errorMsg.includes("execution reverted")) {
      userMessage = `❌ スマートコントラクト実行エラー\n\n考えられる原因:\n• 請求条件を満たしていない\n• コントラクトの一時的な問題\n• ネットワークの不安定\n\n🔄 時間をおいて再度お試しください`;
    } else if (errorMsg.includes("user rejected") || errorCode === 4001) {
      userMessage = `🚫 ユーザーキャンセル\n\nトランザクションがキャンセルされました\n再度お試しいただけます`;
    } else if (errorMsg.includes("network") || errorMsg.includes("timeout")) {
      userMessage = `🌐 ネットワークエラー\n\n接続に問題があります:\n• インターネット接続を確認\n• VPNを使用している場合は無効化\n• 時間をおいて再度お試し`;
    } else if (errorMsg.includes("401") || errorMsg.includes("unauthorized")) {
      userMessage = `🔑 認証エラー\n\nThirdWeb APIの認証に失敗:\n• 一時的なAPIの問題\n• 設定の不具合\n\n⏰ しばらく待ってから再度お試しください`;
    } else {
      userMessage = `❓ 予期しないエラー\n\nエラー内容: ${errorReason}\n\n対処法:\n• ページを再読み込み\n• ウォレットを再接続\n• 時間をおいて再試行\n\n問題が続く場合はサポートまでお問い合わせください`;
    }
    
    alert(userMessage);
  };

  const BTN_H = 42;

  return (
    <main
      style={{
        minHeight: "100vh",
        width: "100vw",
        maxWidth: "100vw",
        background: bgGradient || "#0b1620",
        backgroundSize: "200% 200%",
        backgroundPosition: "0% 50%",
        animation: bgGradient ? "gradientShift 3s ease-in-out" : "none",
        color: "#fff",
        display: "grid",
        gridTemplateRows: "auto 1fr auto",
        alignContent: "start",
        padding: "14px 10px 16px",
        margin: 0,
        overflowX: "hidden",
        boxSizing: "border-box",
        position: "relative",
        transition: "background 0.8s ease"
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

        {/* 広告スライドショー（localStorageから自動読み込み） */}
        <AdCarousel
          style={{
            width: "clamp(200px, 28vw, 240px)",
            height: "auto",
            marginTop: 18,
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

      {/* 成功メッセージオーバーレイ */}
      {showSuccessMessage && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "rgba(0, 0, 0, 0.3)",
            backdropFilter: "blur(2px)",
            zIndex: 1000,
            animation: "fadeIn 0.3s ease-in-out"
          }}
        >
          <div
            style={{
              background: "linear-gradient(135deg, #667eea, #764ba2)",
              borderRadius: "16px",
              padding: "24px 32px",
              textAlign: "center",
              fontSize: "18px",
              fontWeight: 800,
              color: "#fff",
              boxShadow: "0 8px 32px rgba(0, 0, 0, 0.3)",
              animation: "scaleIn 0.4s ease-out"
            }}
          >
            💎本日のリワードを受け取りました！
          </div>
        </div>
      )}

      {/* CSS アニメーション */}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        
        @keyframes scaleIn {
          from { 
            opacity: 0;
            transform: scale(0.8) translateY(20px);
          }
          to { 
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }
        
        @keyframes gradientShift {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
      `}</style>
    </main>
  );
}