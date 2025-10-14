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
import { useCountUp } from "../hooks/useCountUp";
import { tipSuccessConfetti, rankUpConfetti } from "../utils/confetti";

/* ---------------- 貢献熱量分析 ---------------- */
interface UserHeatData {
  heatScore: number;
  heatLevel: "🔥熱狂" | "💎高額" | "🎉アクティブ" | "😊ライト";
  sentimentScore: number;
}

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

  const [txState, setTxState] = useState<"idle" | "approving" | "sending" | "mined" | "error">("idle");
  const [lastLevel, setLastLevel] = useState(currentLevel);
  const [rankUpMsg, setRankUpMsg] = useState("");
  const [sbtProcessMsg, setSbtProcessMsg] = useState("");
  const [showRankUpEffect, setShowRankUpEffect] = useState(false);

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
    if (currentLevel > lastLevel && lastLevel > 0) {
      // 🎆 ランクアップ時の豪華な演出開始
      setShowRankUpEffect(true);
      
      // メインのランクアップメッセージ
      setRankUpMsg(`${RANK_LABELS[currentLevel]?.icon} ${RANK_LABELS[currentLevel]?.label} にランクアップ！ 🎉`);
      
      // SBT処理の詳細案内
      const sbtMessages = [
        "🔥 旧ランクのSBTをバーン中...",
        "✨ 新ランクのSBTをミント中...",
        "🎊 SBTアップグレード完了！"
      ];
      
      // 豪華なコンフェッティ演出
      rankUpConfetti(currentLevel).catch(console.warn);
      
      // 段階的なSBT処理メッセージ表示
      setTimeout(() => setSbtProcessMsg(sbtMessages[0]), 500);  // バーンメッセージ
      setTimeout(() => setSbtProcessMsg(sbtMessages[1]), 1500); // ミントメッセージ
      setTimeout(() => setSbtProcessMsg(sbtMessages[2]), 2500); // 完了メッセージ
      
      // メッセージクリア
      const cleanup = setTimeout(() => {
        setRankUpMsg("");
        setSbtProcessMsg("");
        setShowRankUpEffect(false);
      }, 5000);
      
      return () => clearTimeout(cleanup);
    }
    setLastLevel(currentLevel);
  }, [currentLevel, lastLevel]);

  // 感情分析結果の状態
  const [sentimentState, setSentimentState] = useState<"idle" | "analyzing" | "show">("idle");
  const [sentimentResult, setSentimentResult] = useState<{ label: string; score: number } | null>(null);
  const [bgGradient, setBgGradient] = useState<string>("");

  // 貢献熱量データ
  const [userHeatData, setUserHeatData] = useState<UserHeatData | null>(null);
  const [isLoadingHeat, setIsLoadingHeat] = useState(false);

  // カウントアップアニメーション
  const totalTipsNumber = Number(fmtUnits(totalTips, TOKEN.DECIMALS));
  const { value: animatedTips, start: startCountUp } = useCountUp({
    end: totalTipsNumber,
    duration: 1500,
    decimals: 4,
    startOnMount: false
  });

  /* ================= 貢献熱量分析 ================ */
  const analyzeUserHeat = async () => {
    if (!address || isLoadingHeat) return;
    
    setIsLoadingHeat(true);
    try {
      // 基本的な熱量計算（簡易版）
      const tipAmount = Number(fmtUnits(totalTips, TOKEN.DECIMALS));
      const basicScore = Math.min(1000, tipAmount * 50);
      
      let level: UserHeatData["heatLevel"] = "😊ライト";
      if (basicScore >= 800) level = "🔥熱狂";
      else if (basicScore >= 600) level = "💎高額";
      else if (basicScore >= 400) level = "🎉アクティブ";
      
      setUserHeatData({
        heatScore: Math.round(basicScore),
        heatLevel: level,
        sentimentScore: 75 // デフォルト値
      });
    } catch (error) {
      console.warn("Heat analysis failed:", error);
    } finally {
      setIsLoadingHeat(false);
    }
  };

  // アドレスまたはTip額が変更されたら熱量を再分析
  useEffect(() => {
    if (address && totalTips > 0n) {
      analyzeUserHeat();
    } else {
      setUserHeatData(null);
    }
  }, [address, totalTips]);

  /* ================= Tip送信処理 ================ */
  const doTip = async () => {
    if (emergency) {
      alert("現在メンテナンス中（緊急停止）です。しばらくお待ちください。");
      return;
    }

    if (!address || !parsedAmount || tokenKey !== "PRIMARY") return;

    const dn = displayName.trim().slice(0, 32);
    const msg = message.trim().slice(0, hasProfile ? 120 : 40);

    // 事前チェック（モバイル対応改善）
    try {
      // ThirdWebの接続状態を優先チェック
      if (!address) {
        throw new Error("ウォレットが接続されていません。接続ボタンをクリックしてください。");
      }
      
      // Web3プロバイダー検知（モバイルアプリ対応改善）
      const eth = (window as any).ethereum;
      const userAgent = navigator.userAgent;
      const isMobileDevice = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
      
      if (!eth) {
        if (isMobileDevice) {
          // モバイルデバイスでWeb3プロバイダーがない場合
          throw new Error("モバイルではウォレットアプリからアクセスしてください。\n\n推奨手順:\n1. MetaMaskアプリをインストール\n2. アプリ内ブラウザでこのサイトを開く\n3. アプリ内でウォレットを接続");
        } else {
          throw new Error("MetaMaskまたは対応ウォレットが見つかりません。\n\nMetaMask拡張機能をインストールしてください。");
        }
      }
      
      // アカウント確認（モバイルでは異なるアプローチ）
      try {
        const accounts = await eth.request({ method: "eth_requestAccounts" });
        if (!accounts || accounts.length === 0) {
          throw new Error("ウォレットアカウントが見つかりません");
        }
      } catch (accountError: any) {
        // モバイルアプリではアカウント取得が異なる場合がある
        console.warn("アカウント確認エラー:", accountError);
        // ThirdWebが既に接続されている場合は続行
        if (!address) {
          throw new Error("ウォレットのアカウントアクセスに失敷しました。ウォレットアプリで接続を確認してください。");
        }
      }
      
      // チェーン確認と切り替え（モバイル対応）
      try {
        const currentChainId = await eth.request({ method: "eth_chainId" });
        const targetChainId = "0x13882"; // Polygon Amoy
        
        if ((currentChainId || "").toLowerCase() !== targetChainId.toLowerCase()) {
          console.log("チェーン切り替え要求:", { current: currentChainId, target: targetChainId });
          
          try {
            await eth.request({
              method: "wallet_switchEthereumChain",
              params: [{ chainId: targetChainId }],
            });
            // チェーン切り替え後の待機（モバイルでは長めに）
            await new Promise(resolve => setTimeout(resolve, 2000));
          } catch (switchError: any) {
            console.error("チェーン切り替えエラー:", switchError);
            
            if (switchError.code === 4902) {
              // ネットワークが存在しない場合は追加
              console.log("ネットワーク追加要求");
              await eth.request({
                method: "wallet_addEthereumChain",
                params: [{
                  chainId: targetChainId,
                  chainName: "Polygon Amoy Testnet",
                  nativeCurrency: {
                    name: "MATIC",
                    symbol: "MATIC",
                    decimals: 18
                  },
                  rpcUrls: [
                    "https://rpc-amoy.polygon.technology/",
                    "https://polygon-amoy.drpc.org"
                  ],
                  blockExplorerUrls: ["https://amoy.polygonscan.com/"]
                }]
              });
              await new Promise(resolve => setTimeout(resolve, 1000));
            } else if (switchError.code === 4001) {
              throw new Error("ユーザーがチェーン切り替えを拒否しました。Polygon Amoyネットワークに切り替えてください。");
            } else {
              throw switchError;
            }
          }
        }
      } catch (chainError: any) {
        console.error("チェーン関連エラー:", chainError);
        throw new Error(`ネットワークの確認に失敗しました: ${chainError.message || '不明なエラー'}`);
      }
    } catch (e: any) {
      console.error("事前チェック失敗:", e);
      const errorMsg = e?.message || "不明なエラー";
      
      // モバイルユーザー向けの具体的なエラーメッセージ
      let userFriendlyMessage = "";
      
      if (errorMsg.includes("モバイルではウォレットアプリ")) {
        userFriendlyMessage = "📱 モバイルでのアクセス方法\n\n";
        userFriendlyMessage += "🔄 以下の手順でアクセスしてください:\n\n";
        userFriendlyMessage += "1️⃣ MetaMaskアプリをインストール\n";
        userFriendlyMessage += "2️⃣ アプリを開いてウォレットを作成/インポート\n";
        userFriendlyMessage += "3️⃣ アプリ内のブラウザタブをタップ\n";
        userFriendlyMessage += "4️⃣ このサイトのURLを入力してアクセス\n\n";
        userFriendlyMessage += "⚠️ 通常のブラウザではウォレット接続できません";
      } else if (errorMsg.includes("チェーン切り替えを拒否")) {
        userFriendlyMessage = "🔗 ネットワーク切り替えが必要です\n\n";
        userFriendlyMessage += "• ウォレットで 'Polygon Amoy' ネットワークを選択\n";
        userFriendlyMessage += "• ネットワーク切り替えを承認してください";
      } else {
        userFriendlyMessage = "🚫 ウォレット接続エラー\n\n";
        userFriendlyMessage += `エラー: ${errorMsg}\n\n`;
        userFriendlyMessage += "🔍 解決方法:\n";
        userFriendlyMessage += "• ウォレットアプリが正しく接続されているか確認\n";
        userFriendlyMessage += "• Polygon Amoy テストネットに接続しているか確認";
      }
      
      alert(userFriendlyMessage);
      return;
    }

    try {
      setTxState("sending");
      
      const provider = new ethers.providers.Web3Provider((window as any).ethereum);
      const signer = provider.getSigner();
      const directContract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI as any, signer);
      
      // ERC20承認チェック
      const tokenContract = new ethers.Contract(TOKEN.ADDRESS, [
        "function allowance(address owner, address spender) view returns (uint256)",
        "function approve(address spender, uint256 amount) returns (bool)"
      ], signer);
      
      const currentAllowance = await tokenContract.allowance(address, CONTRACT_ADDRESS);
      console.log("Current allowance:", ethers.utils.formatUnits(currentAllowance, TOKEN.DECIMALS), TOKEN.SYMBOL);
      
      if (currentAllowance.lt(parsedAmount)) {
        console.log("Insufficient allowance, requesting approval...");
        setTxState("approving");
        
        // 大きな値で承認（将来のTipのため）
        const approveAmount = ethers.utils.parseUnits("1000000", TOKEN.DECIMALS);
        const approveTx = await tokenContract.approve(CONTRACT_ADDRESS, approveAmount);
        console.log("Approval transaction sent:", approveTx.hash);
        
        await approveTx.wait();
        console.log("Approval confirmed");
        setTxState("sending");
      }
      
      // まずethers直接実行を試す（より安定）
      let tx: any;
      let receipt: any;
      
      try {
        
        // ガス見積もりを事前に実行
        const gasEstimate = await directContract.estimateGas.tip(parsedAmount.toString());
        
        tx = await directContract.tip(parsedAmount.toString(), {
          gasLimit: gasEstimate.mul(120).div(100) // 20%のバッファ
        });
        
        receipt = await tx.wait();
        console.log("Direct ethers success");
      } catch (directError: any) {
        console.warn("Direct ethers failed, trying ThirdWeb:", directError);
        
        // ethersが失敗した場合のThirdWebフォールバック
        if ((contract as any)?.call) {
          tx = await (contract as any).call("tip", [parsedAmount.toString()]);
        } else {
          tx = await tipFn({ args: [parsedAmount.toString()] });
        }

        receipt = tx?.receipt ?? (typeof tx?.wait === "function" ? await tx.wait() : undefined);
        if (!receipt && tx?.hash && (window as any).ethereum) {
          const provider = new ethers.providers.Web3Provider((window as any).ethereum as any);
          receipt = await provider.getTransactionReceipt(tx.hash);
        }
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
        // 熱量データも更新
        analyzeUserHeat();
        setTxState("idle");
      }, 1200);

      setDisplayName("");
      setMessage("");

      const amt = (args as any)?.amount ?? (args as any)?.value ?? (Array.isArray(args) ? (args as any)[1] : undefined);
      const pretty = fmtUnits(BigInt(amt?.toString?.() ?? "0"), TOKEN.DECIMALS);
      
      // 🎉 Tip成功エフェクト
      // 1. コンフェッティ（紙吹雪）
      tipSuccessConfetti().catch(console.warn);
      
      // 2. オーラ／背景エフェクト
      setBgGradient("linear-gradient(135deg, #667eea 0%, #764ba2 100%)");
      setTimeout(() => setBgGradient(""), 3000);
      
      // 3. カウントアップアニメーション（少し遅らせて開始）
      setTimeout(() => startCountUp(), 600);
      
      alert(`Tipを贈りました💝 (+${pretty} ${TOKEN.SYMBOL})`);

      // Tip成功後に感情分析（非同期・独立実行）
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
      console.error("Tip transaction failed:", e);
      setTxState("error");
      setTimeout(() => setTxState("idle"), 1500);
      
      // 詳細なエラー分析とユーザーメッセージ
      const errorReason = e?.reason || e?.data?.message || e?.message || "不明なエラー";
      const errorCode = e?.code;
      const errorMsg = errorReason.toLowerCase();
      
      let userMessage = "";
      
      if (errorMsg.includes("internal json-rpc error")) {
        userMessage = `🔧 RPC接続エラーが発生しました\n\n原因と対処法:\n• Polygon Amoyネットワークの一時的な混雑\n• RPC エンドポイントの問題\n• ウォレットの接続状態\n\n⏰ 数分待ってから再度お試しください\n💡 他のRPCエンドポイントも自動で試行済みです`;
      } else if (errorMsg.includes("insufficient funds") || errorCode === -32000) {
        userMessage = `💰 ガス代不足エラー\n\nMATICが不足しています:\n• Polygon Amoy testnet用のMATICが必要\n• 最低 0.01 MATIC以上を推奨\n\n🚰 Faucetから無料でMATICを取得:\nhttps://faucet.polygon.technology/`;
      } else if (errorMsg.includes("insufficient balance") || errorMsg.includes("transfer amount exceeds balance")) {
        userMessage = `🏳 残高不足エラー\n\n${TOKEN.SYMBOL}の残高が不足しています:\n• Tip額: ${amount} ${TOKEN.SYMBOL}\n• 現在の残高を確認してください\n\n💡 Tip額を調整して再度お試しください`;
      } else if (errorMsg.includes("user rejected") || errorCode === 4001) {
        userMessage = `🚫 ユーザーキャンセル\n\nトランザクションがキャンセルされました\n再度お試しいただけます`;
      } else if (errorMsg.includes("execution reverted")) {
        // リバートの詳細分析
        if (errorMsg.includes("0xfb8f41b2")) {
          userMessage = `⚠️ コントラクト実行条件エラー\n\nTipを贈ることができませんでした:\n• コントラクトが一時的に利用不可\n• 送信先アドレスに問題がある可能性\n• メンテナンス中の可能性\n\n🔄 数分後に再度お試しください\n💡 問題が続く場合は管理者にお問い合わせください`;
        } else {
          userMessage = `❌ スマートコントラクト実行エラー\n\n考えられる原因:\n• コントラクトの実行条件を満たしていない\n• 一時的なネットワークの問題\n• ガス制限の不足\n\n🔄 時間をおいて再度お試しください`;
        }
      } else if (errorMsg.includes("network") || errorMsg.includes("timeout")) {
        userMessage = `🌐 ネットワークエラー\n\n接続に問題があります:\n• インターネット接続を確認\n• VPNを使用している場合は無効化\n• 時間をおいて再度お試し`;
      } else if (errorMsg.includes("401") || errorMsg.includes("unauthorized")) {
        userMessage = `🔑 認証エラー\n\nThirdWeb APIの認証に失敗:\n• 一時的なAPIの問題\n• 設定の不具合\n\n⏰ しばらく待ってから再度お試しください`;
      } else {
        userMessage = `❓ 予期しないエラー\n\nエラー内容: ${errorReason}\n\n対処法:\n• ページを再読み込み\n• ウォレットを再接続\n• 時間をおいて再試行\n\n問題が続く場合はサポートまでお問い合わせください`;
      }
      
      alert(userMessage);
    }
  };

  const canSend = !!address && !!parsedAmount && tokenKey === "PRIMARY" && !isTipping && !emergency && txState === "idle";


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
            background: "rgba(0, 0, 0, 0.1)", // 非常に薄い背景
            backdropFilter: "none", // ブラーエフェクトを削除
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            animation: "fadeIn 0.3s ease",
            pointerEvents: "none", // コンフェッティとの相互作用を妨げない
          }}
        >
          <div
            style={{
              background: "linear-gradient(145deg, rgba(30, 41, 59, 0.85), rgba(15, 23, 42, 0.85))", // 半透明に変更
              borderRadius: 20,
              padding: "40px",
              textAlign: "center",
              maxWidth: "90vw",
              boxShadow: "0 20px 60px rgba(0, 0, 0, 0.3)", // 影も薄く
              border: "1px solid rgba(255, 255, 255, 0.1)", // 輪郭を明確に
              pointerEvents: "auto", // モーダル自体はクリック可能に
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
        
        @keyframes fadeInOut {
          0%, 100% { opacity: 0; transform: translateX(-50%) scale(0.8); }
          10%, 90% { opacity: 1; transform: translateX(-50%) scale(1); }
        }
        
        @keyframes rankUpPulse {
          0%, 100% { 
            transform: translateX(-50%) scale(1); 
            box-shadow: 0 12px 48px rgba(255,255,255,0.2);
          }
          50% { 
            transform: translateX(-50%) scale(1.05); 
            box-shadow: 0 16px 64px rgba(255,255,255,0.4);
          }
        }
      `}</style>

      <header style={{ textAlign: "center", marginBottom: 10 }}>
        <img src="/gifterra-logo.png" alt="GIFTERRA" style={{ width: "clamp(90px, 12vw, 140px)", marginBottom: 22, filter: "drop-shadow(0 10px 22px rgba(0,0,0,.30))" }} />
        <h1 style={{ fontSize: "clamp(22px, 2.4vw, 28px)", margin: "10px 0 6px" }}>🎁 Send Your Gift</h1>
        <p style={{ opacity: 0.85, margin: "0 0 4px", fontSize: 13 }}>あなたの想いを、Tipとして贈る。</p>
        <div style={{ fontSize: 13, fontWeight: address ? 800 : 500, color: address ? "#22c55e" : "rgba(255,255,255,0.75)", marginTop: 8 }}>
          {address ? `接続済み: ${address.slice(0, 6)}...${address.slice(-4)}` : "ウォレット未接続"}
        </div>
      </header>

      <section style={{ 
        display: "grid", 
        justifyItems: "center", 
        alignContent: "start", 
        rowGap: '12px', 
        width: "min(92vw, 640px)", 
        margin: "12px auto 0",
        padding: "0 12px"
      }}>
        <div style={{ 
          display: "flex", 
          flexDirection: "column",
          gap: '12px',
          width: "100%",
          alignItems: "center"
        }}>
          {/* ConnectWalletとSelectボタンの行 */}
          <div style={{
            display: "flex",
            gap: '12px',
            alignItems: "center",
            flexWrap: "wrap",
            justifyContent: "center",
            width: "100%"
          }}>
          <ConnectWallet 
            theme="dark" 
            modalTitle="ウォレット接続"
            modalTitleIconUrl=""
            style={{
              minHeight: '44px', // モバイルタッチ対応
              fontSize: 'clamp(14px, 2vw, 16px)'
            }}
          />
            <select 
              value={tokenKey} 
              onChange={() => setTokenKey("PRIMARY")} 
              style={{ 
                height: 'clamp(44px, 8vw, 48px)', 
                borderRadius: 10, 
                border: "1px solid #334155", 
                background: "#0f1a24", 
                color: "#fff", 
                padding: "0 12px", 
                fontWeight: 700,
                fontSize: 'clamp(14px, 2vw, 16px)',
                minWidth: 'clamp(80px, 15vw, 100px)'
              }}
            >
              <option value="PRIMARY">{TOKEN.SYMBOL}</option>
              <option value="DISABLED" disabled>JPYC（近日予定）</option>
            </select>
          </div>
          
          {/* Tip入力 */}
          <div style={{ 
            display: "flex", 
            alignItems: "center", 
            height: '48px', 
            borderRadius: 10, 
            background: "#0f1a24", 
            border: "1px solid #334155",
            width: "100%"
          }}>
            <input 
              value={amount} 
              onChange={(e) => setAmount(e.target.value)} 
              inputMode="decimal" 
              placeholder="Tip" 
              style={{ 
                height: "100%", 
                padding: "0 12px", 
                outline: "none", 
                background: "transparent", 
                color: "#fff", 
                border: "none", 
                flex: 1,
                fontSize: '16px',
                textAlign: "right"
              }} 
            />
            <span style={{ 
              opacity: 0.8, 
              fontSize: '12px', 
              paddingRight: 12 
            }}>{TOKEN.SYMBOL}</span>
          </div>
          
          {/* ニックネーム入力 */}
          <input 
            value={displayName} 
            onChange={(e) => setDisplayName(e.target.value)} 
            placeholder="ニックネーム（任意）" 
            maxLength={32} 
            style={{ 
              height: '48px', 
              borderRadius: 10, 
              border: "1px solid #334155", 
              background: "#0f1a24", 
              color: "#fff", 
              padding: "0 12px", 
              width: '100%',
              fontSize: '16px',
              outline: 'none'
            }} 
          />
          
          {/* メッセージ入力 */}
          <input
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder={hasProfile === null ? "確認中..." : hasProfile ? "一言メッセージ（任意）" : "簡易プロフィール（初回のみ）"}
            maxLength={hasProfile ? 120 : 40}
            style={{ 
              height: '48px', 
              borderRadius: 10, 
              border: "1px solid #334155", 
              background: "#0f1a24", 
              color: "#fff", 
              padding: "0 12px", 
              width: '100%',
              fontSize: '16px',
              outline: 'none'
            }}
          />
          
          {/* Tipボタン */}
          <div style={{
            display: "flex",
            justifyContent: "center",
            width: "100%",
            marginTop: '6px'
          }}>
            <button
              onClick={doTip}
              disabled={!canSend}
              title={emergency ? "メンテナンス中（緊急停止）" : undefined}
              style={{
                height: 'clamp(44px, 8vw, 48px)', // モバイル対応の高さ
                padding: "0 clamp(16px, 4vw, 24px)",
                background: canSend ? "#22c55e" : "#3a3f46",
                color: "#0a0a0a",
                borderRadius: 10,
                border: "none",
                cursor: canSend ? "pointer" : "not-allowed",
                fontWeight: 800,
                fontSize: 'clamp(14px, 2.5vw, 16px)',
                minWidth: 'clamp(120px, 25vw, 140px)',
                touchAction: 'manipulation' // モバイルタップ改善
              }}
            >
              {emergency ? "メンテナンス中" : txState === "approving" ? "承認中…" : txState === "sending" ? "送信中…" : txState === "mined" ? "確定しました" : "Tipする"}
            </button>
          </div>
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
              <div style={{ fontSize: 12, opacity: 0.8 }}>累積ギフト</div>
              <div style={{ fontWeight: 800, transition: "all 0.3s ease" }}>
                {animatedTips > 0 ? animatedTips.toFixed(4) : fmtUnits(totalTips, TOKEN.DECIMALS)} {TOKEN.SYMBOL}
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

        {rankUpMsg && (
          <div style={{
            position: "fixed",
            top: "15%", left: "50%", transform: "translateX(-50%)",
            background: showRankUpEffect 
              ? "linear-gradient(135deg, #ff6b6b 0%, #4ecdc4 25%, #45b7d1 50%, #96ceb4 75%, #ffeaa7 100%)"
              : "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
            color: "white", 
            padding: "clamp(15px, 4vw, 30px)", 
            borderRadius: 16,
            fontSize: 'clamp(16px, 4vw, 20px)', 
            fontWeight: "bold", 
            textAlign: "center",
            zIndex: 9999, 
            boxShadow: "0 12px 48px rgba(0,0,0,0.4)",
            animation: showRankUpEffect ? "rankUpPulse 2s ease-in-out infinite" : "fadeInOut 3s ease-in-out",
            border: showRankUpEffect ? "3px solid rgba(255,255,255,0.3)" : "none",
            maxWidth: "90vw", // モバイルで画面からはみ出さない
            wordBreak: "keep-all"
          }}>
            {rankUpMsg}
          </div>
        )}
        
        {sbtProcessMsg && (
          <div style={{
            position: "fixed",
            top: "25%", left: "50%", transform: "translateX(-50%)",
            background: "rgba(0,0,0,0.8)",
            color: "white", 
            padding: "clamp(10px, 3vw, 20px)", 
            borderRadius: 8,
            fontSize: 'clamp(12px, 3vw, 14px)', 
            textAlign: "center",
            zIndex: 9998, 
            boxShadow: "0 4px 16px rgba(0,0,0,0.3)",
            animation: "fadeInOut 1s ease-in-out",
            backdropFilter: "blur(8px)",
            maxWidth: "85vw", // モバイルで画面からはみ出さない
            wordBreak: "keep-all"
          }}>
            {sbtProcessMsg}
          </div>
        )}

        {/* 貢献熱量パネル */}
        {userHeatData && (
          <div style={{ 
            width: "100%", 
            background: "rgba(255,255,255,.06)", 
            borderRadius: 12, 
            padding: 14, 
            display: "grid", 
            rowGap: 8,
            border: "1px solid rgba(255,255,255,.08)"
          }}>
            <div style={{ fontSize: 12, opacity: 0.8, textAlign: "center" }}>🔥 あなたの貢献熱量</div>
            
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontSize: 16, fontWeight: 800 }}>
                  {userHeatData.heatLevel}
                </div>
                <div style={{ fontSize: 11, opacity: 0.7 }}>熱量レベル</div>
              </div>
              
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 18, fontWeight: 800, color: "#f59e0b" }}>
                  {userHeatData.heatScore}
                </div>
                <div style={{ fontSize: 11, opacity: 0.7 }}>/ 1000 pts</div>
              </div>
            </div>
            
            {/* 熱量プログレスバー */}
            <div style={{ 
              position: "relative", 
              height: 8, 
              borderRadius: 999, 
              background: "#0e1720", 
              overflow: "hidden",
              border: "1px solid rgba(255,255,255,.05)"
            }}>
              <div
                style={{
                  position: "absolute",
                  left: 0,
                  top: 0,
                  bottom: 0,
                  width: `${Math.max(2, (userHeatData.heatScore / 1000) * 100)}%`,
                  background: userHeatData.heatScore >= 800 
                    ? "linear-gradient(90deg,#ef4444,#f97316)" // 熱狂
                    : userHeatData.heatScore >= 600
                    ? "linear-gradient(90deg,#8b5cf6,#a855f7)" // 高額
                    : userHeatData.heatScore >= 400
                    ? "linear-gradient(90deg,#06b6d4,#0ea5e9)" // アクティブ
                    : "linear-gradient(90deg,#10b981,#059669)", // ライト
                  transition: "width .8s ease",
                }}
              />
            </div>
            
            <div style={{ fontSize: 10, opacity: 0.6, textAlign: "center" }}>
              {
                isLoadingHeat ? "分析中..." : "Tip・頻度・感情を総合評価"
              }
            </div>
          </div>
        )}
      </section>

      <footer style={{ textAlign: "center", fontSize: 12, opacity: 0.6, marginTop: 6 }}>
        Presented by <strong>METATRON.</strong>
      </footer>
    </main>
  );
}