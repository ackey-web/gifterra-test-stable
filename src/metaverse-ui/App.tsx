// src/metaverse-ui/App.tsx
import { useEffect, useState } from "react";
import {
  ConnectWallet,
  useAddress,
  useContract,
  useContractRead,
} from "@thirdweb-dev/react";
import { CONTRACT_ADDRESS, CONTRACT_ABI } from "../contract";
import { useMetaverseContent } from "../hooks/useMetaverseContent";
import ContentDisplay from "./ContentDisplay";
import DownloadManager from "./DownloadManager";
import SpaceIdentifier from "./SpaceIdentifier";

/* ========================================
   🏪 メタバース自販機専用アプリ
   
   🎯 用途: 3D空間の自販機からアクセスする専用UI
   🔗 URL: /content?space={spaceId}&machine={machineId}
   ⚡ 機能: 既存チップシステム + デジタルコンテンツ配布
======================================== */

export default function MetaverseApp() {
  const address = useAddress();
  const { contract } = useContract(CONTRACT_ADDRESS, CONTRACT_ABI);
  
  // URL パラメータから空間・マシン情報を取得
  const urlParams = new URLSearchParams(window.location.search);
  const spaceId = urlParams.get("space") || "default";
  const machineId = urlParams.get("machine") || "main";

  // 🎮 メタバース空間・コンテンツ情報
  const {
    spaceInfo,
    machineInfo,
    contentSet,
    isLoading: contentLoading,
    error: contentError
  } = useMetaverseContent(spaceId, machineId);

  // 💰 既存チップシステム連携
  const { data: totalTipsReceived } = useContractRead(
    contract,
    "getTotalTipsReceived",
    [address || ""]
  );

  const [userTips, setUserTips] = useState<number>(0);
  const [availableContent, setAvailableContent] = useState<any[]>([]);

  // チップ数に基づくコンテンツ表示制御
  useEffect(() => {
    if (totalTipsReceived && contentSet) {
      const tips = Number(totalTipsReceived.toString());
      setUserTips(tips);
      
      // チップ数に応じて利用可能なコンテンツをフィルタリング
      const available = contentSet.contents.filter(
        content => tips >= content.requiredTips
      );
      setAvailableContent(available);
    }
  }, [totalTipsReceived, contentSet]);

  // ❌ エラー処理
  if (contentError) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <div className="text-center text-white">
          <h1 className="text-2xl font-bold mb-4">🚫 アクセスエラー</h1>
          <p className="mb-4">指定された空間またはマシンが見つかりません</p>
          <p className="text-sm opacity-75">Space: {spaceId} | Machine: {machineId}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
      {/* 🎯 ヘッダー - 空間・マシン情報 */}
      <div className="relative overflow-hidden bg-black/20 backdrop-blur-sm border-b border-white/10">
        <div className="container mx-auto px-4 py-6">
          <SpaceIdentifier 
            spaceInfo={spaceInfo}
            machineInfo={machineInfo}
            isLoading={contentLoading}
          />
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* 🔗 ウォレット接続 */}
        {!address ? (
          <div className="text-center mb-8">
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-8 border border-white/20 max-w-md mx-auto">
              <h2 className="text-2xl font-bold text-white mb-4">
                🏪 {machineInfo?.machineName || "デジタル自販機"}
              </h2>
              <p className="text-white/80 mb-6">
                デジタルコンテンツを取得するためにウォレットを接続してください
              </p>
              <ConnectWallet 
                theme="dark"
                btnTitle="ウォレット接続"
                className="w-full"
              />
            </div>
          </div>
        ) : (
          <>
            {/* 💰 チップ情報表示 */}
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20 mb-8">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold text-white mb-2">あなたのチップ残高</h3>
                  <p className="text-3xl font-bold text-yellow-400">
                    {userTips.toLocaleString()} TIPS
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-white/60 text-sm">利用可能コンテンツ</p>
                  <p className="text-2xl font-bold text-green-400">
                    {availableContent.length} / {contentSet?.contents.length || 0}
                  </p>
                </div>
              </div>
            </div>

            {/* 📦 コンテンツ表示 */}
            {contentLoading ? (
              <div className="text-center text-white">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
                <p>コンテンツを読み込んでいます...</p>
              </div>
            ) : contentSet ? (
              <>
                <ContentDisplay 
                  contentSet={contentSet}
                  availableContent={availableContent}
                  userTips={userTips}
                />
                
                <DownloadManager 
                  availableContent={availableContent}
                  userAddress={address}
                  spaceId={spaceId}
                  machineId={machineId}
                />
              </>
            ) : (
              <div className="text-center text-white">
                <p>コンテンツセットが設定されていません</p>
              </div>
            )}
          </>
        )}
      </div>

      {/* 🎨 背景エフェクト */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-1/2 -right-1/2 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-1/2 -left-1/2 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
      </div>
    </div>
  );
}