// api/ai/chat.ts
// GIFTERRA AI アシスタント - GPT-4 Turbo Function Calling

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { createPublicClient, http } from 'viem';
import { polygonAmoy } from 'viem/chains';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceRole = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const openaiApiKey = process.env.OPENAI_API_KEY!;
const alchemyRpcUrl = process.env.ALCHEMY_RPC_URL!;

const supabase = createClient(supabaseUrl, supabaseServiceRole);
const publicClient = createPublicClient({
  chain: polygonAmoy,
  transport: http(alchemyRpcUrl),
});

// GPT-4 Turbo用のFunction定義
const FUNCTIONS = [
  {
    name: 'get_claim_history',
    description: 'ユーザーの特典受け取り履歴を取得します。受け取り済み・失敗・期限切れなどの状態を確認できます。',
    parameters: {
      type: 'object',
      properties: {
        walletAddress: {
          type: 'string',
          description: 'ユーザーのウォレットアドレス（0x...）'
        }
      },
      required: ['walletAddress']
    }
  },
  {
    name: 'reissue_claim_token',
    description: '特典受け取りに失敗した場合、新しいダウンロードトークンを再発行します。トランザクションを検証し、24時間有効なトークンを生成します。',
    parameters: {
      type: 'object',
      properties: {
        walletAddress: {
          type: 'string',
          description: 'ユーザーのウォレットアドレス'
        },
        txHash: {
          type: 'string',
          description: 'チップのトランザクションハッシュ'
        }
      },
      required: ['walletAddress', 'txHash']
    }
  },
  {
    name: 'get_kodomi_analysis',
    description: 'ユーザーの貢献熱量（Kodomi）分析を取得します。Tip UIでのチップ履歴、GIFT HUBでの特典受け取り履歴から総合的なエンゲージメントレベルを分析します。',
    parameters: {
      type: 'object',
      properties: {
        walletAddress: {
          type: 'string',
          description: 'ユーザーのウォレットアドレス'
        }
      },
      required: ['walletAddress']
    }
  }
];

// システムプロンプト（法的コンプライアンス）
const SYSTEM_PROMPT = `あなたはGIFTERRAの特典配布サポートAIアシスタント「ギフティ」です。

【あなたの名前】
- あなたの名前は「ギフティ」です
- 自己紹介する際は必ず「ギフティ」と名乗ってください
- 親しみやすく、フレンドリーな口調で対応してください

【重要な用語規則】
- 「購入」「買う」という表現は絶対に使用しないでください
- 「受け取り」「配布」「特典」を使用してください
- 「商品」ではなく「特典」と表記してください
- 「価格」ではなく「必要TIP数」と表記してください

【あなたの役割】
1. 特典の受け取りに問題が発生したユーザーをサポート
2. 受け取り履歴を確認し、失敗原因を特定
3. トランザクションが完了している場合、新しいダウンロードURLを自動発行
4. 貢献熱量（Kodomi）に基づいておすすめの特典を提案（将来機能）

【対応方針】
- 親切で丁寧な日本語で対応
- 専門用語を避け、わかりやすく説明
- 問題解決まで寄り添う姿勢
- チップが完了していることを確認してから再発行

【利用可能な機能】
1. get_claim_history: 受け取り履歴の確認
2. reissue_claim_token: ダウンロードトークンの再発行（チップ完了済みの場合のみ）
3. get_kodomi_analysis: 貢献熱量分析の取得

【対応フロー】
1. ユーザーの状況をヒアリング
2. get_claim_historyで履歴を確認
3. トランザクションハッシュを聞き出す
4. reissue_claim_tokenで新しいURLを発行
5. 24時間有効なダウンロードリンクを案内`;

// Function実装: 受け取り履歴取得
async function getClaimHistory(walletAddress: string) {
  try {
    const { data: purchases, error } = await supabase
      .from('purchases')
      .select(`
        *,
        products (
          name,
          description
        ),
        download_tokens (
          token,
          is_consumed,
          expires_at,
          consumed_at
        )
      `)
      .eq('buyer', walletAddress)
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) {
      console.error('❌ 受け取り履歴取得エラー:', error);
      return { success: false, error: error.message };
    }

    const formatted = purchases?.map(p => ({
      txHash: p.tx_hash,
      productName: p.products?.name || '不明',
      claimedAt: p.created_at,
      status: p.download_tokens?.[0]?.is_consumed
        ? '受け取り済み'
        : p.download_tokens?.[0]?.expires_at && new Date(p.download_tokens[0].expires_at) < new Date()
        ? '期限切れ'
        : p.download_tokens?.[0]
        ? '受け取り可能'
        : '処理中',
      hasValidToken: p.download_tokens?.some(
        t => !t.is_consumed && new Date(t.expires_at) > new Date()
      )
    }));

    return { success: true, claims: formatted };
  } catch (error) {
    console.error('❌ getClaimHistory エラー:', error);
    return { success: false, error: String(error) };
  }
}

// Function実装: トークン再発行
async function reissueClaimToken(walletAddress: string, txHash: string) {
  try {
    console.log('🔄 トークン再発行開始:', { walletAddress, txHash });

    // 1. トランザクションをブロックチェーンで検証
    const receipt = await publicClient.getTransactionReceipt({
      hash: txHash as `0x${string}`
    });

    if (!receipt) {
      return { success: false, error: 'トランザクションが見つかりません' };
    }

    if (receipt.status !== 'success') {
      return { success: false, error: 'トランザクションが失敗しています' };
    }

    console.log('✅ トランザクション検証OK:', { blockNumber: receipt.blockNumber });

    // 2. 既存の購入レコードを取得
    const { data: purchase, error: purchaseError } = await supabase
      .from('purchases')
      .select('*')
      .eq('tx_hash', txHash)
      .eq('buyer', walletAddress)
      .single();

    if (purchaseError || !purchase) {
      return {
        success: false,
        error: '受け取り履歴が見つかりません。トランザクションハッシュを確認してください。'
      };
    }

    console.log('✅ 受け取り履歴確認:', purchase.id);

    // 3. 既存の有効なトークンをチェック
    const { data: existingTokens } = await supabase
      .from('download_tokens')
      .select('*')
      .eq('purchase_id', purchase.id)
      .eq('is_consumed', false)
      .gte('expires_at', new Date().toISOString());

    if (existingTokens && existingTokens.length > 0) {
      console.log('ℹ️ 既に有効なトークンが存在します');
      const baseUrl = process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : 'http://localhost:3000';

      return {
        success: true,
        token: existingTokens[0].token,
        downloadUrl: `${baseUrl}/api/download/${existingTokens[0].token}`,
        expiresAt: existingTokens[0].expires_at,
        message: '既存の有効なトークンを返却しました'
      };
    }

    // 4. 新しいトークンを発行（24時間有効、3回ダウンロード可能）
    const { data: newToken, error: tokenError } = await supabase
      .rpc('create_download_token', {
        p_purchase_id: purchase.id,
        p_product_id: purchase.product_id,
        p_ttl_seconds: 86400 // 24時間
      });

    if (tokenError || !newToken) {
      console.error('❌ トークン発行エラー:', tokenError);
      return { success: false, error: 'トークンの発行に失敗しました' };
    }

    console.log('✅ 新しいトークン発行:', newToken);

    const baseUrl = process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : 'http://localhost:3000';

    return {
      success: true,
      token: newToken,
      downloadUrl: `${baseUrl}/api/download/${newToken}`,
      expiresAt: new Date(Date.now() + 86400 * 1000).toISOString(),
      message: '新しいダウンロードリンクを発行しました'
    };
  } catch (error) {
    console.error('❌ reissueClaimToken エラー:', error);
    return { success: false, error: String(error) };
  }
}

// Function実装: Kodomi分析取得（簡易版）
async function getKodomiAnalysis(walletAddress: string) {
  // この関数はフロントエンドのkodomi-integration.tsと同等の処理
  // APIとして独立して呼び出せるようにする
  try {
    const { data: purchases } = await supabase
      .from('purchases')
      .select('*, products(*)')
      .eq('buyer', walletAddress);

    const claimCount = purchases?.length || 0;
    const totalTipped = purchases?.reduce(
      (sum, p) => sum + BigInt(p.amount_wei || '0'),
      0n
    ) || 0n;

    return {
      success: true,
      giftHub: {
        claimCount,
        totalTipped: totalTipped.toString(),
        lastClaimDate: purchases?.[0]?.created_at || null
      }
    };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS設定
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { walletAddress, message, context, kodomiProfile } = req.body;

    if (!walletAddress || !message) {
      return res.status(400).json({ error: 'walletAddress と message は必須です' });
    }

    console.log('💬 AI Chat リクエスト:', { walletAddress, context });

    // ユーザーコンテキストを構築
    const userContext = `
【ユーザー情報】
ウォレットアドレス: ${walletAddress}
貢献熱量レベル: ${kodomiProfile?.heatLevel || '不明'}
エンゲージメント: ${kodomiProfile?.combined?.engagementLevel || '不明'}
`;

    const contextMessage = context === 'CLAIM_FAILED'
      ? '【状況】このユーザーは特典の受け取りに失敗しています。受け取り履歴を確認して、適切にサポートしてください。'
      : '';

    // GPT-4 Turboにリクエスト
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openaiApiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4-turbo-preview',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'system', content: userContext + '\n' + contextMessage },
          { role: 'user', content: message }
        ],
        functions: FUNCTIONS,
        function_call: 'auto',
        temperature: 0.7,
        max_tokens: 800
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ OpenAI API エラー:', response.status, errorText);
      throw new Error(`OpenAI API Error: ${response.status}`);
    }

    const data = await response.json();
    const choice = data.choices[0];

    // Function Callがリクエストされた場合
    if (choice.message.function_call) {
      const functionName = choice.message.function_call.name;
      const functionArgs = JSON.parse(choice.message.function_call.arguments);

      console.log('🔧 Function Call:', functionName, functionArgs);

      let functionResult;

      switch (functionName) {
        case 'get_claim_history':
          functionResult = await getClaimHistory(functionArgs.walletAddress);
          break;
        case 'reissue_claim_token':
          functionResult = await reissueClaimToken(
            functionArgs.walletAddress,
            functionArgs.txHash
          );
          break;
        case 'get_kodomi_analysis':
          functionResult = await getKodomiAnalysis(functionArgs.walletAddress);
          break;
        default:
          functionResult = { error: 'Unknown function' };
      }

      // Function結果をGPTに返して最終応答を生成
      const followUpResponse = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${openaiApiKey}`
        },
        body: JSON.stringify({
          model: 'gpt-4-turbo-preview',
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'system', content: userContext + '\n' + contextMessage },
            { role: 'user', content: message },
            choice.message,
            {
              role: 'function',
              name: functionName,
              content: JSON.stringify(functionResult)
            }
          ],
          temperature: 0.7,
          max_tokens: 800
        })
      });

      const followUpData = await followUpResponse.json();
      const finalMessage = followUpData.choices[0].message.content;

      return res.json({
        message: finalMessage,
        functionCalled: functionName,
        functionResult
      });
    }

    // 通常の応答
    return res.json({
      message: choice.message.content
    });
  } catch (error) {
    console.error('❌ AI Chat エラー:', error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : '内部サーバーエラー'
    });
  }
}
