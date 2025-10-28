// src/lib/ai_analysis.ts
import { ethers } from "ethers";

export interface TipData {
  from: string;
  amount: bigint;
  timestamp?: number;
  message?: string;
}

export interface SentimentAnalysis {
  score: number; // 0-100
  label: "positive" | "neutral" | "negative";
  keywords: string[];
}

export interface ContributionHeat {
  address: string;
  name: string;
  
  // Tip的貢献
  totalAmount: string;
  amountRank: number;
  
  // 参加頻度
  tipCount: number;
  
  // メッセージ分析
  messageCount: number;
  sentimentScore: number; // 0-100（平均）
  sentimentLabel: "positive" | "neutral" | "negative";
  keywords: string[];
  
  // 総合スコア
  heatScore: number; // 0-1000
  heatLevel: "🔥熱狂" | "💎高額" | "🎉アクティブ" | "😊ライト";
  
  // 時系列
  firstTipDate: string;
  lastTipDate: string;
}

/**
 * OpenAI APIを使った感情分析
 */
/**
 * OpenAI APIキーの設定状況を確認
 */
export function isOpenAIConfigured(): boolean {
  const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
  return !!(apiKey && apiKey.startsWith('sk-') && apiKey.length > 20);
}

/**
 * OpenAI APIを使った感情分析
 */
export async function analyzeSentiment(message: string): Promise<SentimentAnalysis> {
  const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
  
  if (!apiKey || !isOpenAIConfigured()) {
    console.warn("OpenAI API key not properly configured, using mock analysis");
    return mockSentimentAnalysis(message);
  }
  
  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `あなたは感情分析の専門家です。与えられた日本語メッセージを分析し、以下のJSON形式で返してください：
{
  "score": 0-100の数値（ポジティブ度。100が最もポジティブ、0が最もネガティブ、50が中立）,
  "label": "positive" | "neutral" | "negative",
  "keywords": ["キーワード1", "キーワード2", "キーワード3"]（感情を表す重要な単語を最大3つ）
}

メッセージが空の場合は score: 50, label: "neutral", keywords: [] を返してください。`
          },
          {
            role: "user",
            content: message || "（メッセージなし）"
          }
        ],
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices[0].message.content;
    const result = JSON.parse(content);
    
    return {
      score: Math.max(0, Math.min(100, result.score)),
      label: result.label,
      keywords: result.keywords || [],
    };
  } catch (error) {
    console.error("Sentiment analysis failed:", error);
    // APIエラーの詳細をログに記録
    if (error instanceof Error) {
      console.error("Error details:", {
        message: error.message,
        hasApiKey: !!apiKey,
        messageLength: message?.length || 0
      });
    }
    return mockSentimentAnalysis(message);
  }
}

/**
 * APIキーがない場合のモック分析（開発用）
 */
function mockSentimentAnalysis(message: string): SentimentAnalysis {
  if (!message || message.trim() === "") {
    return { score: 50, label: "neutral", keywords: [] };
  }
  
  // 拡張されたキーワードマッチング
  const positiveWords = [
    "最高", "感動", "ありがとう", "素晴らしい", "良い", "好き", "応援", "頑張",
    "嬉しい", "楽しい", "すごい", "感謝", "助かる", "愛", "幸せ", "おめでとう",
    "成功", "完璧", "amazing", "great", "awesome", "love", "happy", "thanks",
    "excellent", "wonderful", "fantastic", "perfect", "👍", "❤️", "🎉", "😊"
  ];
  
  const negativeWords = [
    "悲しい", "残念", "悪い", "嫌", "つまらない", "最悪", "ひどい", "ダメ",
    "失敗", "困る", "問題", "不満", "心配", "bad", "terrible", "awful",
    "hate", "sad", "angry", "problem", "😢", "😞", "😠", "💔"
  ];
  
  const neutralWords = [
    "普通", "まあまあ", "そこそこ", "ok", "okay", "fine", "normal", "🤔", "😐"
  ];
  
  const lowerMessage = message.toLowerCase();
  let score = 50; // ベーススコア
  const foundKeywords: string[] = [];
  
  // ポジティブ単語の検出
  positiveWords.forEach(word => {
    if (lowerMessage.includes(word.toLowerCase())) {
      score += 15; // より大きなスコア変動
      if (foundKeywords.length < 3) foundKeywords.push(word);
    }
  });
  
  // ネガティブ単語の検出
  negativeWords.forEach(word => {
    if (lowerMessage.includes(word.toLowerCase())) {
      score -= 15;
      if (foundKeywords.length < 3) foundKeywords.push(word);
    }
  });
  
  // ニュートラル単語の検出
  neutralWords.forEach(word => {
    if (lowerMessage.includes(word.toLowerCase())) {
      score = 50; // 中立に調整
      if (foundKeywords.length < 3) foundKeywords.push(word);
    }
  });
  
  // 感嘆符や絵文字による調整
  const exclamationCount = (message.match(/[！!]/g) || []).length;
  const questionCount = (message.match(/[？?]/g) || []).length;
  
  if (exclamationCount > 0) score += exclamationCount * 5;
  if (questionCount > 1) score -= questionCount * 2; // 多くの疑問符は不安を示唆
  
  // スコアの範囲を0-100に制限
  score = Math.max(0, Math.min(100, score));
  
  // ラベルの決定（より細かな閾値）
  let label: "positive" | "neutral" | "negative";
  if (score >= 65) label = "positive";
  else if (score <= 35) label = "negative";
  else label = "neutral";
  
  return { score, label, keywords: foundKeywords };
}

/**
 * 貢献熱量度（kodomi）を計算
 *
 * 【新しいkodomi算出基準】
 * kodomi = 回数スコア + AI質的スコア + 連続ボーナス
 *
 * - 回数スコア: tNHTもJPYCも同じ重み（案A）
 * - AI質的スコア: メッセージの感情分析結果
 * - 連続ボーナス: 7日ごとに10%加算
 */
export function calculateKodomi(
  tipCount: number,
  avgSentiment: number,
  streak: number = 0
): number {
  // 回数スコア（1回 = 1ポイント）
  const countScore = tipCount;

  // AI質的スコア（0-100の感情スコアを0-50に正規化）
  // メッセージがない場合は50（中立）として扱う
  const qualityScore = (avgSentiment / 100) * 50;

  // 連続ボーナス（7日ごとに10%加算）
  const streakBonus = Math.floor(streak / 7) * 0.1;

  // 基本スコア = 回数 + AI質的評価
  const baseScore = countScore + qualityScore;

  // 連続ボーナス適用
  const kodomi = Math.round(baseScore * (1 + streakBonus));

  return kodomi;
}

/**
 * 貢献熱量スコアを計算（管理画面表示用 - 従来のheatScore）
 * ※ Admin Dashboardの表示互換性のために残す
 */
function calculateHeatScore(
  totalAmount: bigint,
  tipCount: number,
  avgSentiment: number,
  lastTipDate?: Date
): number {
  // 新しいkodomi算出を使用（streakは0として計算）
  let baseScore = calculateKodomi(tipCount, avgSentiment, 0);

  // 金額ボーナス（Admin表示用の追加評価）
  const amountBonus = Math.min(200, Number(ethers.utils.formatUnits(totalAmount, 18)) / 20);
  baseScore += amountBonus;

  // 時間減衰計算（最後のTipから経過時間に基づく）
  if (lastTipDate) {
    const now = new Date();
    const daysSinceLastTip = Math.floor((now.getTime() - lastTipDate.getTime()) / (1000 * 60 * 60 * 24));

    // 減衰係数計算（7日間で50%減衰、30日で25%まで減衰）
    let decayFactor = 1.0;
    if (daysSinceLastTip > 0) {
      // 指数関数的減衰：7日で50%、30日で25%
      const decayRate = 0.1; // 減衰率
      decayFactor = Math.exp(-decayRate * daysSinceLastTip / 7);
      decayFactor = Math.max(0.25, decayFactor); // 最低25%まで減衰
    }

    baseScore = Math.round(baseScore * decayFactor);
  }

  return baseScore;
}

/**
 * 熱量レベルを判定
 */
function getHeatLevel(heatScore: number): ContributionHeat["heatLevel"] {
  if (heatScore >= 800) return "🔥熱狂";
  if (heatScore >= 600) return "💎高額";
  if (heatScore >= 400) return "🎉アクティブ";
  return "😊ライト";
}

/**
 * 全ユーザーの貢献熱量を分析
 */
export async function analyzeContributionHeat(
  tips: TipData[],
  nameMap: Map<string, string>,
  onProgress?: (current: number, total: number) => void
): Promise<ContributionHeat[]> {
  // ユーザーごとにグループ化
  const userMap = new Map<string, {
    tips: TipData[];
    totalAmount: bigint;
    messages: string[];
  }>();
  
  for (const tip of tips) {
    const addr = tip.from.toLowerCase();
    if (!userMap.has(addr)) {
      userMap.set(addr, {
        tips: [],
        totalAmount: 0n,
        messages: [],
      });
    }
    
    const user = userMap.get(addr)!;
    user.tips.push(tip);
    user.totalAmount += tip.amount;
    if (tip.message) {
      user.messages.push(tip.message);
    }
  }
  
  // 各ユーザーの感情分析
  const results: ContributionHeat[] = [];
  const addresses = Array.from(userMap.keys());
  let current = 0;
  
  for (const addr of addresses) {
    const user = userMap.get(addr)!;
    
    // 各メッセージの感情分析
    const sentiments: SentimentAnalysis[] = [];
    for (const msg of user.messages) {
      const sentiment = await analyzeSentiment(msg);
      sentiments.push(sentiment);
    }
    
    // 平均感情スコア
    const avgSentiment = sentiments.length > 0
      ? sentiments.reduce((sum, s) => sum + s.score, 0) / sentiments.length
      : 50;
    
    // 最頻感情ラベル
    const labelCounts = { positive: 0, neutral: 0, negative: 0 };
    sentiments.forEach(s => labelCounts[s.label]++);
    const sentimentLabel = Object.keys(labelCounts).reduce((a, b) => 
      labelCounts[a as keyof typeof labelCounts] > labelCounts[b as keyof typeof labelCounts] ? a : b
    ) as SentimentAnalysis["label"];
    
    // キーワード集約
    const allKeywords = sentiments.flatMap(s => s.keywords);
    const keywordCount = new Map<string, number>();
    allKeywords.forEach(kw => {
      keywordCount.set(kw, (keywordCount.get(kw) || 0) + 1);
    });
    const topKeywords = Array.from(keywordCount.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([kw]) => kw);
    
    // タイムスタンプ
    const timestamps = user.tips.filter(t => t.timestamp).map(t => t.timestamp!);
    const firstTipDate = timestamps.length > 0 
      ? new Date(Math.min(...timestamps) * 1000).toISOString()
      : "";
    const lastTipDate = timestamps.length > 0
      ? new Date(Math.max(...timestamps) * 1000).toISOString()
      : "";
    
    // 熱量スコア計算（時間減衰を考慮）
    const lastTipDateObj = timestamps.length > 0 
      ? new Date(Math.max(...timestamps) * 1000) 
      : undefined;
    const heatScore = calculateHeatScore(user.totalAmount, user.tips.length, avgSentiment, lastTipDateObj);
    
    results.push({
      address: addr,
      name: nameMap.get(addr) || addr,
      totalAmount: ethers.utils.formatUnits(user.totalAmount, 18),
      amountRank: 0, // 後で設定
      tipCount: user.tips.length,
      messageCount: user.messages.length,
      sentimentScore: Math.round(avgSentiment),
      sentimentLabel,
      keywords: topKeywords,
      heatScore,
      heatLevel: getHeatLevel(heatScore),
      firstTipDate,
      lastTipDate,
    });
    
    current++;
    if (onProgress) {
      onProgress(current, addresses.length);
    }
  }
  
  // Tipランキング設定
  results.sort((a, b) => parseFloat(b.totalAmount) - parseFloat(a.totalAmount));
  results.forEach((r, i) => r.amountRank = i + 1);
  
  // 熱量スコア順にソート
  results.sort((a, b) => b.heatScore - a.heatScore);
  
  return results;
}

/**
 * JSON形式でエクスポート
 */
export function exportHeatAnalysisJSON(
  results: ContributionHeat[],
  period: string
): void {
  const payload = {
    generatedAt: new Date().toISOString(),
    period,
    analysisMethod: "OpenAI GPT-4o-mini",
    summary: {
      totalUsers: results.length,
      averageHeatScore: Math.round(
        results.reduce((sum, r) => sum + r.heatScore, 0) / results.length
      ),
      topContributors: results.slice(0, 10).length,
    },
    users: results,
  };
  
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `gifterra_heat_analysis_${Date.now()}.json`;
  a.click();
  URL.revokeObjectURL(url);
}