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
  
  // 金額的貢献
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
export async function analyzeSentiment(message: string): Promise<SentimentAnalysis> {
  const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
  
  if (!apiKey) {
    console.warn("OpenAI API key not found, using mock analysis");
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
    return mockSentimentAnalysis(message);
  }
}

/**
 * APIキーがない場合のモック分析（開発用）
 */
function mockSentimentAnalysis(message: string): SentimentAnalysis {
  if (!message) {
    return { score: 50, label: "neutral", keywords: [] };
  }
  
  // 簡易的なキーワードマッチング
  const positiveWords = ["最高", "感動", "ありがとう", "素晴らしい", "良い", "好き", "応援", "頑張"];
  const negativeWords = ["悲しい", "残念", "悪い", "嫌", "つまらない"];
  
  const lowerMessage = message.toLowerCase();
  let score = 50;
  
  positiveWords.forEach(word => {
    if (lowerMessage.includes(word)) score += 10;
  });
  
  negativeWords.forEach(word => {
    if (lowerMessage.includes(word)) score -= 10;
  });
  
  score = Math.max(0, Math.min(100, score));
  
  const label = score >= 60 ? "positive" : score <= 40 ? "negative" : "neutral";
  const keywords: string[] = [];
  
  positiveWords.forEach(word => {
    if (lowerMessage.includes(word) && keywords.length < 3) {
      keywords.push(word);
    }
  });
  
  return { score, label, keywords };
}

/**
 * 貢献熱量スコアを計算
 */
function calculateHeatScore(
  totalAmount: bigint,
  tipCount: number,
  avgSentiment: number
): number {
  // 金額スコア（0-400）
  const amountScore = Math.min(400, Number(ethers.utils.formatUnits(totalAmount, 18)) / 10);
  
  // 頻度スコア（0-300）
  const frequencyScore = Math.min(300, tipCount * 10);
  
  // 感情スコア（0-300）
  const sentimentScore = (avgSentiment / 100) * 300;
  
  return Math.round(amountScore + frequencyScore + sentimentScore);
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
    
    // 熱量スコア計算
    const heatScore = calculateHeatScore(user.totalAmount, user.tips.length, avgSentiment);
    
    // タイムスタンプ
    const timestamps = user.tips.filter(t => t.timestamp).map(t => t.timestamp!);
    const firstTipDate = timestamps.length > 0 
      ? new Date(Math.min(...timestamps) * 1000).toISOString()
      : "";
    const lastTipDate = timestamps.length > 0
      ? new Date(Math.max(...timestamps) * 1000).toISOString()
      : "";
    
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
  
  // 金額ランキング設定
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