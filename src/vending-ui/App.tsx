// src/vending-ui/App.tsx
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

/* ========================================
   🏪 自販機フロントUIアプリ

   🎯 用途: 管理画面で作成した自販機のフロントUI
   🔗 URL: /content?machine={machineId}
   ⚡ 機能: チップシステム + デジタルコンテンツ配布
   📦 対応: NFT/SBT/GLB/FBX/VRM等のデジタルアセット
======================================== */

export default function VendingApp() {
  const address = useAddress();
  const { contract } = useContract(CONTRACT_ADDRESS, CONTRACT_ABI);
  
  // URL パラメータから空間・マシン情報を取得
  const urlParams = new URLSearchParams(window.location.search);
  let spaceId = urlParams.get("space") || "default";
  let machineId = urlParams.get("machine") || "main";
  
  // テンプレート文字列の場合はデフォルト値を使用
  if (spaceId === "{spaceId}") {
    spaceId = "default";
  }
  if (machineId === "{machineId}") {
    machineId = "main";
  }
  
  // デバッグ用ログ
  console.log("🔍 URL Debug:", {
    url: window.location.href,
    search: window.location.search,
    originalSpaceId: urlParams.get("space"),
    originalMachineId: urlParams.get("machine"),
    processedSpaceId: spaceId,
    processedMachineId: machineId
  });

  // 🎮 メタバース空間・コンテンツ情報
  const {
    spaceInfo,
    machineInfo,
    contentSet,
    vendingMachine,
    isLoading: contentLoading,
    error: contentError
  } = useMetaverseContent(spaceId, machineId);
  
  // デバッグ用ログ
  console.log("🎯 Content Hook Result:", {
    spaceInfo,
    machineInfo,
    contentSet,
    vendingMachine,
    isLoading: contentLoading,
    error: contentError
  });

  // localStorageの内容を確認
  console.log("📦 localStorage data:", localStorage.getItem('vending_machines_data'));

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

  // 🔍 テンプレート文字列が使われた場合の特別な警告
  const isTemplateUrl = urlParams.get("space") === "{spaceId}" || urlParams.get("machine") === "{machineId}";
  
  // ❌ エラー処理
  if (contentError) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <div className="text-center text-white max-w-2xl mx-auto p-8">
          <h1 className="text-2xl font-bold mb-4">
            {isTemplateUrl ? "⚠️ URLフォーマット エラー" : "🚫 アクセスエラー"}
          </h1>
          <p className="mb-4">
            {isTemplateUrl 
              ? "URLのテンプレート文字列を実際の値に置き換えてください" 
              : "指定された空間またはマシンが見つかりません"
            }
          </p>
          <div className="bg-black/20 p-4 rounded-lg mb-6">
            <p className="text-sm opacity-75 mb-2">
              <strong>リクエスト情報:</strong>
            </p>
            <p className="text-sm opacity-75">Space: {spaceId}</p>
            <p className="text-sm opacity-75">Machine: {machineId}</p>
            <p className="text-sm opacity-75 mt-2">
              <strong>エラー詳細:</strong>
            </p>
            <p className="text-sm opacity-75 text-red-300">{contentError}</p>
          </div>
          
          {isTemplateUrl && (
            <div className="bg-yellow-600/20 border border-yellow-400/30 p-4 rounded-lg mb-6">
              <p className="text-sm font-semibold text-yellow-200 mb-2">
                📝 正しいURL形式の例:
              </p>
              <div className="text-xs text-yellow-100 space-y-1">
                <p>✅ /content?space=world-1&machine=entrance-01</p>
                <p>✅ /content?space=gallery-a&machine=gallery-01</p>
                <p>✅ /content?space=default&machine=main</p>
                <p className="text-red-300 mt-2">❌ /content?space={"{spaceId}"}&machine={"{machineId}"}</p>
              </div>
            </div>
          )}
          
          <div className="text-sm opacity-60">
            <p className="mb-2">利用可能な空間・マシン:</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
              <div>
                <p className="font-semibold mb-1">🏰 世界:</p>
                <p>world-1 (メインワールド)</p>
                <p>gallery-a (アートギャラリー)</p>
                <p>default (デフォルト空間)</p>
              </div>
              <div>
                <p className="font-semibold mb-1">🏪 マシン:</p>
                <p>entrance-01, vip-lounge</p>
                <p>gallery-01, creator-corner</p>
                <p>main</p>
              </div>
            </div>
          </div>
          <div className="mt-6">
            <a href="/metaverse-test.html" 
               className="inline-block bg-blue-600 hover:bg-blue-700 px-6 py-2 rounded-lg transition-colors">
              🔙 テストページに戻る
            </a>
          </div>
        </div>
      </div>
    );
  }

  // デザイン設定を取得
  const primaryColor = vendingMachine?.settings?.design?.primaryColor || '#3B82F6';
  const secondaryColor = vendingMachine?.settings?.design?.secondaryColor || '#8B5CF6';
  const backgroundColor = vendingMachine?.settings?.design?.cardBackgroundColor || '#1F2937';
  const backgroundImage = vendingMachine?.settings?.design?.backgroundImage;

  return (
    <div
      className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900"
      style={{
        backgroundImage: backgroundImage ? `url(${backgroundImage})` : undefined,
        backgroundSize: 'cover',
        backgroundPosition: 'center'
      }}
    >
      {/* 🎯 ヘッダー - 自販機名表示 */}
      {vendingMachine && (
        <div className="relative overflow-hidden bg-black/20 backdrop-blur-sm border-b border-white/10">
          <div className="container mx-auto px-4 py-6">
            <div className="text-center">
              <h1 className="text-3xl font-bold text-white mb-2">
                🏪 {vendingMachine.settings.displayName || vendingMachine.name}
              </h1>
              {vendingMachine.settings.welcomeMessage && (
                <p className="text-white/70">{vendingMachine.settings.welcomeMessage}</p>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="container mx-auto px-4 py-8">
        {/* 🔗 ウォレット接続ボタン（常に表示） */}
        {!address && (
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
        )}

        {/* 💰 チップ情報表示（ウォレット接続時のみ） */}
        {address && (
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

          </>
        )}

        {/* 📦 コンテンツ表示（常に表示） */}
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
              primaryColor={primaryColor}
              secondaryColor={secondaryColor}
              backgroundColor={backgroundColor}
            />

            {address && (
              <DownloadManager
                availableContent={availableContent}
                userAddress={address}
                spaceId={spaceId}
                machineId={machineId}
              />
            )}
          </>
        ) : (
          <div className="text-center text-white">
            <p>コンテンツセットが設定されていません</p>
          </div>
        )}
      </div>

      {/* 🎨 背景エフェクト */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div
          className="absolute -top-1/2 -right-1/2 w-96 h-96 rounded-full blur-3xl animate-pulse"
          style={{ backgroundColor: primaryColor + '20' }}
        ></div>
        <div
          className="absolute -bottom-1/2 -left-1/2 w-96 h-96 rounded-full blur-3xl animate-pulse"
          style={{ backgroundColor: secondaryColor + '20' }}
        ></div>
      </div>
    </div>
  );
}