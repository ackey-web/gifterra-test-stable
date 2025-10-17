// src/metaverse-ui/DownloadManager.tsx
import { useState } from "react";

interface DigitalContent {
  contentId: string;
  name: string;
  type: "GLB" | "MP3" | "PNG" | "PDF" | "ZIP";
  description?: string;
  fileSize?: string;
  requiredTips: number;
}

interface DownloadManagerProps {
  availableContent: DigitalContent[];
  userAddress: string;
  spaceId: string;
  machineId: string;
}

/* ========================================
   📥 ダウンロード管理コンポーネント
   
   🎯 役割: セキュアなダウンロードURL生成・管理
   🔐 機能: 一時的なダウンロードリンク生成
======================================== */

const DownloadManager = ({ 
  availableContent, 
  userAddress, 
  spaceId, 
  machineId 
}: DownloadManagerProps) => {
  const [downloadingIds, setDownloadingIds] = useState<Set<string>>(new Set());
  const [downloadHistory, setDownloadHistory] = useState<string[]>([]);

  // 🔗 セキュアダウンロードURL生成
  const generateDownloadUrl = async (content: DigitalContent): Promise<string> => {
    // 実際の実装では、バックエンドAPIを呼び出してセキュアなURLを生成
    // ここではモック実装
    
    const timestamp = Date.now();
    const hash = btoa(`${userAddress}-${content.contentId}-${timestamp}`);
    
    // 一時的なダウンロードURL (1時間有効)
    const downloadUrl = `/api/download/${content.contentId}?token=${hash}&expires=${timestamp + 3600000}`;
    
    return downloadUrl;
  };

  // 📥 ダウンロード実行
  const handleDownload = async (content: DigitalContent) => {
    setDownloadingIds(prev => new Set(prev).add(content.contentId));
    
    try {
      // セキュアURL生成
      await generateDownloadUrl(content);
      
      // ダウンロード実行 (実際の実装)
      // const downloadUrl = await generateDownloadUrl(content);
      // window.open(downloadUrl, '_blank');
      
      // モック: ダウンロード履歴に追加
      setDownloadHistory(prev => [...prev, content.contentId]);
      
      // ダウンロード完了通知
      alert(`✅ ${content.name} のダウンロードを開始しました！`);
      
      // ダウンロード履歴をlocalStorageに保存
      const history = JSON.parse(localStorage.getItem('gifterra-download-history') || '[]');
      const newEntry = {
        contentId: content.contentId,
        contentName: content.name,
        downloadedAt: new Date().toISOString(),
        userAddress,
        spaceId,
        machineId
      };
      history.push(newEntry);
      localStorage.setItem('gifterra-download-history', JSON.stringify(history));
      
    } catch (error) {
      console.error('Download failed:', error);
      alert('❌ ダウンロードに失敗しました。しばらく後にお試しください。');
    } finally {
      setDownloadingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(content.contentId);
        return newSet;
      });
    }
  };

  // 📊 ダウンロード統計
  const totalAvailable = availableContent.length;
  const totalDownloaded = downloadHistory.length;

  if (availableContent.length === 0) {
    return (
      <div className="bg-white/10 backdrop-blur-sm rounded-xl p-8 border border-white/20 text-center">
        <div className="text-6xl mb-4">🔒</div>
        <h3 className="text-xl font-bold text-white mb-2">利用可能なコンテンツがありません</h3>
        <p className="text-white/70">
          より多くのチップを獲得して、デジタルコンテンツをアンロックしましょう！
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 📊 ダウンロード統計 */}
      <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
        <h3 className="text-xl font-bold text-white mb-4 flex items-center">
          📥 ダウンロードセンター
        </h3>
        
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center">
            <p className="text-2xl font-bold text-green-400">{totalAvailable}</p>
            <p className="text-white/60 text-sm">利用可能</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-blue-400">{totalDownloaded}</p>
            <p className="text-white/60 text-sm">ダウンロード済み</p>
          </div>
        </div>
      </div>

      {/* 📥 ダウンロードリスト */}
      <div className="space-y-4">
        {availableContent.map((content) => {
          const isDownloading = downloadingIds.has(content.contentId);
          const isDownloaded = downloadHistory.includes(content.contentId);

          return (
            <div
              key={content.contentId}
              className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20 flex items-center justify-between"
            >
              <div className="flex items-center space-x-4">
                <div className="text-2xl">
                  {content.type === "GLB" && "🎨"}
                  {content.type === "MP3" && "🎵"}
                  {content.type === "PNG" && "🖼️"}
                  {content.type === "PDF" && "📄"}
                  {content.type === "ZIP" && "📦"}
                </div>
                
                <div>
                  <h4 className="text-white font-bold">{content.name}</h4>
                  <div className="flex items-center space-x-2 text-sm text-white/60">
                    <span>{content.type}</span>
                    {content.fileSize && (
                      <>
                        <span>•</span>
                        <span>{content.fileSize}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                {isDownloaded && (
                  <span className="text-green-400 text-sm flex items-center space-x-1">
                    <span>✅</span>
                    <span>ダウンロード済み</span>
                  </span>
                )}

                <button
                  onClick={() => handleDownload(content)}
                  disabled={isDownloading}
                  className={`
                    px-4 py-2 rounded-lg font-bold transition-all duration-300
                    ${isDownloading 
                      ? 'bg-gray-600 text-gray-400 cursor-not-allowed' 
                      : 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white hover:shadow-lg hover:shadow-blue-500/25'
                    }
                  `}
                >
                  {isDownloading ? (
                    <div className="flex items-center space-x-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>処理中...</span>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-2">
                      <span>📥</span>
                      <span>ダウンロード</span>
                    </div>
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* ⚠️ 注意事項 */}
      <div className="bg-yellow-500/10 backdrop-blur-sm rounded-xl p-4 border border-yellow-500/30">
        <div className="flex items-start space-x-3">
          <span className="text-yellow-400 text-xl">⚠️</span>
          <div>
            <h4 className="text-yellow-400 font-bold mb-2">ダウンロードに関する注意事項</h4>
            <ul className="text-yellow-100/80 text-sm space-y-1">
              <li>• ダウンロードリンクは1時間で無効になります</li>
              <li>• コンテンツの再配布は禁止されています</li>
              <li>• 技術的な問題が発生した場合は管理者にお問い合わせください</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DownloadManager;