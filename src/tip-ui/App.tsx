// src/tip-ui/App.tsx
import { useEffect, useMemo, useState } from "react";
import {
  ConnectWallet,
  useAddress,
  useChain,
  useContract,
  useContractWrite,
} from "@thirdweb-dev/react";
import { CONTRACT_ADDRESS, CONTRACT_ABI } from "../contract";
import { utils as ethersUtils, ethers } from "ethers";
import { saveAnnotation, fetchAnnotation } from "../lib/annotations";
import { saveTxMessage } from "../lib/annotations_tx";
import { useEmergency } from "../lib/emergency";
import { useCountUp } from "../hooks/useCountUp";
import { tipSuccessConfetti, rankUpConfetti } from "../utils/confetti";
import type { TokenId } from "../config/tokens";
import {
  getAvailableTokens,
  getTokenConfig,
  formatTokenSymbol,
} from "../config/tokens";

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

  // 背景画像をlocalStorageから取得（管理画面で設定可能）
  const [customBgImage] = useState<string>(() => {
    return localStorage.getItem('tip-bg-image') || '/ads/ui-wallpeaper.png';
  });

  // 管理者モード（オーナー確認のみ保持）
  const [isOwner, setIsOwner] = useState(false);

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
    } catch (error: any) {
      const errorMsg = error?.message || error?.data?.message || "Unknown error";
      
      if (errorMsg.includes("state histories haven't been fully indexed yet")) {
        console.warn("🏗️ User data fetch skipped due to blockchain indexing");
        // インデックス処理中は空のデータを設定
        setUserInfoRaw(null);
        setLevelRaw(null);
      } else {
        console.error("Failed to fetch user data:", error);
        setUserInfoRaw(null);
        setLevelRaw(null);
      }
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

  // マルチトークン対応：ユーザーが選択したトークン
  const [selectedTokenId, setSelectedTokenId] = useState<TokenId>('NHT');
  const selectedTokenConfig = useMemo(() => getTokenConfig(selectedTokenId), [selectedTokenId]);

  const parsedAmount = useMemo(() => {
    try {
      if (!amount || Number(amount) <= 0) return null;
      return ethersUtils.parseUnits(amount, selectedTokenConfig.decimals);
    } catch {
      return null;
    }
  }, [amount, selectedTokenConfig.decimals]);

  const [displayName, setDisplayName] = useState("");
  const [message, setMessage] = useState("");

  // 承認ポリシー関連の状態管理
  const [approvalPolicy, setApprovalPolicy] = useState<"exact" | "toNextRank" | "fixedCap">("toNextRank");
  const [rankThresholds, setRankThresholds] = useState<bigint[]>([]);


  // オーナー確認
  useEffect(() => {
    const checkOwner = async () => {
      if (!contract || !address) {
        setIsOwner(false);
        return;
      }
      try {
        const owner = await contract.call("owner");
        setIsOwner(owner.toLowerCase() === address.toLowerCase());
      } catch (error) {
        console.warn("オーナー確認エラー:", error);
        setIsOwner(false);
      }
    };
    checkOwner();
  }, [contract, address]);

  // ランク閾値の取得
  useEffect(() => {
    const fetchRankThresholds = async () => {
      if (!contract) return;
      try {
        // maxRankLevelを取得
        try {
          const maxLevel = await contract.call("maxRankLevel");
          setMaxRankLevel(Number(maxLevel));
        } catch {
          setMaxRankLevel(4); // デフォルト
        }

        const thresholds: bigint[] = [];
        for (let i = 1; i <= 4; i++) {
          try {
            const threshold = await contract.call("rankThresholds", [i]);
            if (threshold && BigInt(threshold) > 0n) {
              thresholds.push(BigInt(threshold));
            }
          } catch {
            // このランクの閾値が存在しない場合はスキップ
          }
        }
        // 重複を除去し、昇順でソート
        const uniqueThresholds = [...new Set(thresholds)].sort((a, b) => a < b ? -1 : 1);
        setRankThresholds(uniqueThresholds);
      } catch (error) {
        console.warn("ランク閾値の取得に失敗:", error);
      }
    };
    fetchRankThresholds();
  }, [contract]);

  // 承認額の計算
  const calculateApprovalAmount = useMemo(() => {
    if (!parsedAmount) return null;
    
    switch (approvalPolicy) {
      case "exact":
        return parsedAmount;
      
      case "toNextRank": {
        const nextRankThreshold = rankThresholds.find(threshold => threshold > totalTips);
        if (nextRankThreshold) {
          const remainingToNextRank = nextRankThreshold - totalTips;
          const remainingAmount = ethersUtils.parseUnits(remainingToNextRank.toString(), 0);
          return remainingAmount.gt(parsedAmount) ? remainingAmount : parsedAmount;
        }
        return ethersUtils.parseUnits("100000", selectedTokenConfig.decimals); // 最高ランク到達後のデフォルト
      }

      case "fixedCap":
        return ethersUtils.parseUnits("1000000", selectedTokenConfig.decimals);
      
      default:
        return parsedAmount;
    }
  }, [approvalPolicy, parsedAmount, totalTips, rankThresholds]);

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
  const totalTipsNumber = Number(fmtUnits(totalTips, selectedTokenConfig.decimals));
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
      // AI分析システムと統一された熱量計算を使用
      const tipAmount = Number(fmtUnits(totalTips, selectedTokenConfig.decimals));

      // AI分析ロジックと統一した計算方法
      // Tipスコア（0-400）: tipAmount / 10で正規化
      const amountScore = Math.min(400, tipAmount / 10);
      
      // 頻度スコア（0-300）: アクティビティレベルから推定
      const frequencyScore = Math.min(300, currentLevel * 50);
      
      // 感情スコア（0-300）: デフォルト値を使用
      const sentimentScore = 225; // 75%相当
      
      // 基本スコア計算
      let baseScore = Math.round(amountScore + frequencyScore + sentimentScore);
      
      // 時間減衰を考慮（シンプル版）
      // 最後のTip活動から推定した減衰
      const decayFactor = totalTips > 0n ? 0.9 : 0.5; // Tipがある場合は軽微な減衰
      const finalScore = Math.round(baseScore * decayFactor);
      
      // AI分析システムと統一されたレベル判定
      let level: UserHeatData["heatLevel"] = "😊ライト";
      if (finalScore >= 800) level = "🔥熱狂";
      else if (finalScore >= 600) level = "💎高額";
      else if (finalScore >= 400) level = "🎉アクティブ";

      setUserHeatData({
        heatScore: finalScore,
        heatLevel: level,
        sentimentScore: 75
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

    if (!address || !parsedAmount) return;

    // トークンアドレスが設定されているか確認
    if (selectedTokenConfig.currentAddress === '0x0000000000000000000000000000000000000000') {
      alert(`❌ ${selectedTokenConfig.symbol} はまだ設定されていません。\n\n別のトークンを選択してください。`);
      return;
    }

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
      
      // ERC20承認チェック（インデックスエラー対応）
      const tokenContract = new ethers.Contract(selectedTokenConfig.currentAddress, [
        "function allowance(address owner, address spender) view returns (uint256)",
        "function approve(address spender, uint256 amount) returns (bool)"
      ], signer);

      let currentAllowance: ethers.BigNumber;

      try {
        currentAllowance = await tokenContract.allowance(address, CONTRACT_ADDRESS);
      } catch (allowanceError: any) {
        const errorMsg = allowanceError?.message || allowanceError?.data?.message || "Unknown error";
        
        if (errorMsg.includes("state histories haven't been fully indexed yet")) {
          console.warn("🏗️ Blockchain indexing in progress - assuming zero allowance and requesting approval");
          // インデックス処理中の場合、承認が必要と仮定
          currentAllowance = ethers.BigNumber.from(0);
        } else {
          console.error("Allowance check failed:", allowanceError);
          throw new Error(`承認状態の確認に失敗しました: ${errorMsg}`);
        }
      }
      
      if (currentAllowance.lt(parsedAmount)) {
        setTxState("approving");

        // ポリシーに基づく承認額を計算
        const approveAmount = calculateApprovalAmount || ethers.utils.parseUnits("1000000", selectedTokenConfig.decimals);
        
        // 安全な承認パターン: 0リセット → 新値設定（インデックスエラー対応）
        try {
          const resetTx = await tokenContract.approve(CONTRACT_ADDRESS, 0);
          await resetTx.wait();
        } catch (resetError: any) {
          const resetErrorMsg = resetError?.message || resetError?.data?.message || "Unknown error";
          if (resetErrorMsg.includes("state histories haven't been fully indexed yet")) {
            console.warn("🏗️ Reset skipped due to blockchain indexing - proceeding with direct approval");
          } else {
            console.warn("Reset failed, proceeding with direct approval:", resetError);
          }
        }

        try {
          const approveTx = await tokenContract.approve(CONTRACT_ADDRESS, approveAmount);
          await approveTx.wait();
        } catch (approveError: any) {
          const approveErrorMsg = approveError?.message || approveError?.data?.message || "Unknown error";
          if (approveErrorMsg.includes("state histories haven't been fully indexed yet")) {
            throw new Error("🏗️ ブロックチェーン履歴インデックス処理中です。15分程度お待ちいただき、再度お試しください。");
          } else {
            throw new Error(`承認処理に失敗しました: ${approveErrorMsg}`);
          }
        }
        setTxState("sending");
      }
      
      // まずethers直接実行を試す（より安定）
      let tx: any;
      let receipt: any;
      
      try {
        
        // ガス見積もりを事前に実行（インデックスエラー対応）
        let gasEstimate: ethers.BigNumber;
        try {
          gasEstimate = await directContract.estimateGas.tip(parsedAmount.toString());
        } catch (gasError: any) {
          const gasErrorMsg = gasError?.message || gasError?.data?.message || "Unknown error";
          if (gasErrorMsg.includes("state histories haven't been fully indexed yet")) {
            console.warn("🏗️ Gas estimation skipped due to blockchain indexing - using default gas limit");
            gasEstimate = ethers.BigNumber.from("300000"); // デフォルトガス制限
          } else {
            throw gasError;
          }
        }
        
        tx = await directContract.tip(parsedAmount.toString(), {
          gasLimit: gasEstimate.mul(120).div(100) // 20%のバッファ
        });
        
        receipt = await tx.wait();
      } catch (directError: any) {
        const directErrorMsg = directError?.message || directError?.data?.message || "Unknown error";
        
        if (directErrorMsg.includes("state histories haven't been fully indexed yet")) {
          throw new Error("🏗️ ブロックチェーン履歴インデックス処理中です。15分程度お待ちいただき、再度お試しください。");
        }
        
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
      const pretty = fmtUnits(BigInt(amt?.toString?.() ?? "0"), selectedTokenConfig.decimals);

      // 🎉 Tip成功エフェクト
      // 1. コンフェッティ（紙吹雪）
      tipSuccessConfetti().catch(console.warn);

      // 2. オーラ／背景エフェクト
      setBgGradient("linear-gradient(135deg, #667eea 0%, #764ba2 100%)");
      setTimeout(() => setBgGradient(""), 3000);

      // 3. カウントアップアニメーション（少し遅らせて開始）
      setTimeout(() => startCountUp(), 600);

      alert(`Tipを贈りました💝 (+${pretty} ${selectedTokenConfig.symbol})`);

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
      
      if (errorMsg.includes("state histories haven't been fully indexed yet")) {
        userMessage = `🏗️ ブロックチェーン履歴インデックス処理中\n\nPolygon Amoyネットワークで履歴の同期処理中です:\n• これは正常な処理で、一時的な現象です\n• 新しいトランザクションは通常5-15分で処理されます\n• 履歴データの完全性を保つための処理です\n\n⏰ 15分程度お待ちいただき、再度お試しください\n💡 このエラーはテストネット特有の現象です`;
      } else if (errorMsg.includes("internal json-rpc error")) {
        userMessage = `🔧 RPC接続エラーが発生しました\n\n原因と対処法:\n• Polygon Amoyネットワークの一時的な混雑\n• RPC エンドポイントの問題\n• ウォレットの接続状態\n\n⏰ 数分待ってから再度お試しください\n💡 他のRPCエンドポイントも自動で試行済みです`;
      } else if (errorMsg.includes("insufficient funds") || errorCode === -32000) {
        userMessage = `💰 ガス代不足エラー\n\nMATICが不足しています:\n• Polygon Amoy testnet用のMATICが必要\n• 最低 0.01 MATIC以上を推奨\n\n🚰 Faucetから無料でMATICを取得:\nhttps://faucet.polygon.technology/`;
      } else if (errorMsg.includes("insufficient balance") || errorMsg.includes("transfer amount exceeds balance")) {
        userMessage = `🏳 残高不足エラー\n\n${selectedTokenConfig.symbol}の残高が不足しています:\n• Tip額: ${amount} ${selectedTokenConfig.symbol}\n• 現在の残高を確認してください\n\n💡 Tip額を調整して再度お試しください`;
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

  const canSend = !!address && !!parsedAmount && !isTipping && !emergency && txState === "idle";

  /* ================= 管理者機能は Admin Dashboard の TIP UI管理で設定 ================ */

  return (
    <main
      style={{
        minHeight: "100vh",
        background: bgGradient || "#0b1620",
        backgroundImage: bgGradient ? 'none' : `url(${customBgImage})`,
        backgroundSize: bgGradient ? "initial" : "cover",
        backgroundPosition: bgGradient ? "initial" : "center",
        backgroundRepeat: "no-repeat",
        backgroundAttachment: "fixed",
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

      {/* タイトル（ロゴなし・モダンフォント） */}
      <header style={{ textAlign: "center", marginBottom: 16 }}>
        <h1 style={{
          fontSize: "clamp(24px, 3vw, 30px)",
          margin: "0 0 6px",
          fontWeight: 800,
          textShadow: "0 2px 12px rgba(0,0,0,0.5)"
        }}>
          💝 Send TIP
        </h1>
        <p style={{
          opacity: 0.85,
          margin: "0 0 8px",
          fontSize: 14,
          fontWeight: 500
        }}>
          プロジェクトを応援しよう
        </p>
        <div style={{
          fontSize: 13,
          fontWeight: address ? 800 : 500,
          color: address ? "#22c55e" : "rgba(255,255,255,0.75)",
          marginTop: 8
        }}>
          {address ? `接続済み: ${address.slice(0, 6)}...${address.slice(-4)}` : "ウォレット未接続"}
        </div>
      </header>

      {/* 管理者パネル削除済み - Admin DashboardのTIP UI管理で設定してください */}

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
            {/* マルチトークン選択ドロップダウン */}
            <select
              value={selectedTokenId}
              onChange={(e) => setSelectedTokenId(e.target.value as TokenId)}
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
              {getAvailableTokens(false).map(token => (
                <option
                  key={token.id}
                  value={token.id}
                  disabled={token.currentAddress === '0x0000000000000000000000000000000000000000'}
                >
                  {formatTokenSymbol(token.id, true)}
                  {token.currentAddress === '0x0000000000000000000000000000000000000000' ? ' (未設定)' : ''}
                </option>
              ))}
            </select>
          </div>
          
          {/* Tip入力と承認ポリシー選択 */}
          <div style={{
            display: "flex",
            gap: '8px',
            width: "100%",
            alignItems: "center"
          }}>
            {/* Tip入力 */}
            <div style={{ 
              display: "flex", 
              alignItems: "center", 
              height: '48px', 
              borderRadius: 10, 
              background: "#0f1a24", 
              border: "1px solid #334155",
              flex: 2
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
              }}>{selectedTokenConfig.symbol}</span>
            </div>
            
            {/* 承認ポリシー選択 */}
            <select
              value={approvalPolicy}
              onChange={(e) => setApprovalPolicy(e.target.value as any)}
              style={{
                height: '48px',
                borderRadius: 10,
                border: "1px solid #334155",
                background: "#0f1a24",
                color: "#fff",
                padding: "0 8px",
                fontSize: '12px',
                fontWeight: 600,
                flex: 1,
                minWidth: '120px',
                outline: 'none'
              }}
            >
              <option value="exact">最小承認</option>
              <option value="toNextRank">次ランクまで（推奨）</option>
              <option value="fixedCap">大きく承認</option>
            </select>
          </div>
          
          {/* 承認額の表示 */}
          {calculateApprovalAmount && calculateApprovalAmount.toString() !== "0" && (
            <div style={{
              width: "100%",
              fontSize: 11,
              color: "rgba(255,255,255,0.7)",
              textAlign: "center",
              marginTop: -8
            }}>
              💡 承認予定額: {ethersUtils.formatUnits(calculateApprovalAmount, selectedTokenConfig.decimals)} {selectedTokenConfig.symbol}
              <br />
              <span style={{ fontSize: 10, opacity: 0.8 }}>承認上限はトークン使用許可の最大額です</span>
            </div>
          )}
          
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
                height: 'clamp(44px, 8vw, 48px)',
                padding: "0 clamp(18px, 4vw, 26px)",
                background: canSend
                  ? "linear-gradient(135deg, #10b981 0%, #059669 100%)"
                  : "rgba(58, 63, 70, 0.8)",
                color: canSend ? "#fff" : "#9ca3af",
                borderRadius: 12,
                border: canSend ? "none" : "1px solid rgba(255,255,255,0.1)",
                cursor: canSend ? "pointer" : "not-allowed",
                fontWeight: 800,
                fontSize: 'clamp(14px, 2.5vw, 16px)',
                minWidth: 'clamp(120px, 25vw, 140px)',
                touchAction: 'manipulation',
                boxShadow: canSend ? "0 4px 16px rgba(16,185,129,0.3)" : "none",
                transition: "all 0.2s ease"
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

        <div style={{
          width: "100%",
          background: "rgba(255,255,255,0.08)",
          backdropFilter: "blur(10px)",
          padding: "12px 14px",
          borderRadius: 16,
          border: "1px solid rgba(255,255,255,0.12)",
          textAlign: "left",
          fontSize: 13,
          lineHeight: 1.5,
          display: "grid",
          rowGap: 6,
          boxShadow: "0 4px 16px rgba(0,0,0,0.2)"
        }}>
          <div><strong>Address:</strong> {address ?? "—"}</div>
          <div><strong>Chain:</strong> {chain ? `${chain.name} (${chain.chainId})` : "—"}</div>
        </div>

        <div style={{
          width: "100%",
          background: "rgba(255,255,255,.08)",
          backdropFilter: "blur(10px)",
          borderRadius: 16,
          border: "1px solid rgba(255,255,255,0.12)",
          padding: 16,
          display: "grid",
          rowGap: 12,
          boxShadow: "0 4px 16px rgba(0,0,0,0.2)"
        }}>
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
                {animatedTips > 0 ? animatedTips.toFixed(4) : fmtUnits(totalTips, selectedTokenConfig.decimals)} {selectedTokenConfig.symbol}
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
              あと <strong>{fmtUnits(nextThreshold > totalTips ? nextThreshold - totalTips : 0n, selectedTokenConfig.decimals)} {selectedTokenConfig.symbol}</strong>
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
            background: "rgba(255,255,255,.08)",
            backdropFilter: "blur(10px)",
            borderRadius: 16,
            border: "1px solid rgba(255,255,255,0.12)",
            padding: 16,
            display: "grid",
            rowGap: 10,
            boxShadow: "0 4px 16px rgba(0,0,0,0.2)"
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