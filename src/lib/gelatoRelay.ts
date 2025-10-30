// src/lib/gelatoRelay.ts
// Gelato Relay設定 - ガスレストランザクションを実現

import { GelatoRelay, SponsoredCallRequest } from "@gelatonetwork/relay-sdk";
import { ethers } from "ethers";

/**
 * Gelato Relayクライアント
 *
 * 無料枠: 月1000リクエストまで無料
 * 以降: 従量課金（ガス代のみ）
 */
export const relay = new GelatoRelay();

/**
 * アクティブチェーンID
 * Polygon Amoy Testnet = 80002
 */
export const CHAIN_ID = 80002;

/**
 * Gelato Relayを使用してガスレスでERC20トークンを送金
 *
 * @param signer - ユーザーのSigner（署名用）
 * @param tokenAddress - 送金するトークンのアドレス
 * @param recipientAddress - 受取人のアドレス
 * @param amount - 送金額（wei単位）
 * @returns トランザクションハッシュ
 */
export async function sendTokenGasless(
  signer: ethers.Signer,
  tokenAddress: string,
  recipientAddress: string,
  amount: string
): Promise<string> {
  // ERC20 transfer()のエンコード
  const erc20Interface = new ethers.utils.Interface([
    "function transfer(address to, uint256 amount) returns (bool)",
  ]);

  const data = erc20Interface.encodeFunctionData("transfer", [
    recipientAddress,
    amount,
  ]);

  // Gelato Relayリクエストの構築
  const request: SponsoredCallRequest = {
    chainId: BigInt(CHAIN_ID),
    target: tokenAddress,
    data: data,
  };

  // Gelato Relayで送信（ガスレス）
  const response = await relay.sponsoredCall(request, signer as any);

  console.log("✅ Gasless transaction sent:", response.taskId);

  return response.taskId;
}

/**
 * Gelato Relayを使用して一括送金（ガスレス）
 *
 * @param signer - ユーザーのSigner
 * @param tokenAddress - 送金するトークンのアドレス
 * @param recipients - 受取人のリスト [{ address: string, amount: string }]
 * @returns トランザクションハッシュのリスト
 */
export async function bulkSendTokenGasless(
  signer: ethers.Signer,
  tokenAddress: string,
  recipients: { address: string; amount: string }[]
): Promise<string[]> {
  const taskIds: string[] = [];

  // 各受取人に対して送金
  for (const recipient of recipients) {
    const taskId = await sendTokenGasless(
      signer,
      tokenAddress,
      recipient.address,
      recipient.amount
    );
    taskIds.push(taskId);
  }

  return taskIds;
}

/**
 * タスクステータスの確認
 *
 * @param taskId - Gelato RelayのタスクID
 * @returns タスクステータス
 */
export async function getTaskStatus(taskId: string) {
  const status = await relay.getTaskStatus(taskId);
  return status;
}

/**
 * Gelato Relayの設定情報
 */
export const GELATO_CONFIG = {
  // 無料枠
  freeQuota: {
    requestsPerMonth: 1000,
    description: "月間1000リクエストまで無料",
  },

  // サポートチェーン
  supportedChains: [
    {
      chainId: 80002,
      name: "Polygon Amoy Testnet",
    },
    {
      chainId: 137,
      name: "Polygon Mainnet",
    },
  ],

  // ドキュメント
  docs: "https://docs.gelato.network/web3-services/relay",
};
