// src/metaverse-ui/ContentDisplay.tsx
import { useState } from "react";

interface DigitalContent {
  contentId: string;
  name: string;
  type: "GLB" | "MP3" | "PNG" | "PDF" | "ZIP";
  description?: string;
  fileSize?: string;
  requiredTips: number;
  metadata?: {
    author?: string;
    createdAt?: string;
    tags?: string[];
  };
}

interface ContentSet {
  contentSetId: string;
  name: string;
  description: string;
  contents: DigitalContent[];
}

interface ContentDisplayProps {
  contentSet: ContentSet;
  availableContent: DigitalContent[];
  userTips: number;
  primaryColor?: string;
  secondaryColor?: string;
  backgroundColor?: string;
}

/* ========================================
   📦 コンテンツ表示コンポーネント
   
   🎯 役割: 利用可能なデジタルコンテンツの表示
   🔒 制御: チップ数に基づく表示制御
======================================== */

const ContentDisplay = ({
  contentSet,
  availableContent,
  userTips,
  primaryColor = '#3B82F6',
  secondaryColor = '#8B5CF6',
  backgroundColor = '#1F2937'
}: ContentDisplayProps) => {
  const [selectedContent, setSelectedContent] = useState<DigitalContent | null>(null);

  // 📁 コンテンツタイプ別アイコン
  const getContentIcon = (type: string) => {
    switch (type) {
      case "GLB": return "🎨";
      case "MP3": return "🎵";
      case "PNG": return "🖼️";
      case "PDF": return "📄";
      case "ZIP": return "📦";
      default: return "📎";
    }
  };

  // 🎨 コンテンツタイプ別カラー
  const getContentColor = (type: string) => {
    switch (type) {
      case "GLB": return "from-purple-500/20 to-pink-500/20 border-purple-500/30";
      case "MP3": return "from-green-500/20 to-blue-500/20 border-green-500/30";
      case "PNG": return "from-yellow-500/20 to-orange-500/20 border-yellow-500/30";
      case "PDF": return "from-red-500/20 to-pink-500/20 border-red-500/30";
      case "ZIP": return "from-gray-500/20 to-slate-500/20 border-gray-500/30";
      default: return "from-blue-500/20 to-indigo-500/20 border-blue-500/30";
    }
  };

  return (
    <div className="space-y-8">
      {/* 📋 コンテンツセット情報 */}
      <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
        <h2 className="text-2xl font-bold text-white mb-2">
          📦 {contentSet.name}
        </h2>
        <p className="text-white/70">{contentSet.description}</p>
        
        <div className="flex items-center space-x-4 mt-4 text-sm">
          <span className="text-white/60">
            総コンテンツ数: <span className="text-blue-400 font-bold">{contentSet.contents.length}</span>
          </span>
          <span className="text-white/60">
            利用可能: <span className="text-green-400 font-bold">{availableContent.length}</span>
          </span>
        </div>
      </div>

      {/* 📱 コンテンツグリッド */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {contentSet.contents.length === 0 ? (
          // 商品が0件の場合のプレースホルダー
          <>
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="relative bg-gradient-to-br backdrop-blur-sm rounded-xl p-6 border opacity-50"
                style={{
                  backgroundColor: backgroundColor + '40',
                  borderColor: primaryColor + '40',
                  boxShadow: `0 0 20px ${primaryColor}10`
                }}
              >
                <div className="text-center">
                  <div className="text-4xl mb-3">📦</div>
                  <h3 className="text-lg font-bold text-white/50 mb-2">準備中</h3>
                  <p className="text-white/40 text-sm mb-3">
                    コンテンツは近日公開予定です
                  </p>
                  <div className="mt-3 pt-3 border-t border-white/10">
                    <div className="flex items-center justify-center space-x-2">
                      <span style={{ color: secondaryColor + '60' }}>💎</span>
                      <span className="font-bold text-white/40">
                        --- TIPS
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </>
        ) : (
          contentSet.contents.map((content) => {
          const isAvailable = availableContent.some(c => c.contentId === content.contentId);
          const isLocked = !isAvailable;

          return (
            <div
              key={content.contentId}
              className={`
                relative bg-gradient-to-br ${getContentColor(content.type)}
                backdrop-blur-sm rounded-xl p-6 border cursor-pointer
                transition-all duration-300 hover:scale-105
                ${isLocked ? 'opacity-60 cursor-not-allowed' : 'hover:shadow-xl hover:shadow-white/10'}
              `}
              style={{
                backgroundColor: backgroundColor + '40',
                borderColor: primaryColor + '60',
                boxShadow: `0 0 20px ${primaryColor}20`
              }}
              onClick={() => !isLocked && setSelectedContent(content)}
            >
              {/* 🔒 ロック状態表示 */}
              {isLocked && (
                <div className="absolute top-2 right-2">
                  <div className="bg-red-500/20 text-red-400 px-2 py-1 rounded-full text-xs border border-red-500/30 flex items-center space-x-1">
                    <span>🔒</span>
                    <span>{content.requiredTips - userTips} TIPS不足</span>
                  </div>
                </div>
              )}

              {/* ✅ 利用可能状態表示 */}
              {isAvailable && (
                <div className="absolute top-2 right-2">
                  <div
                    className="px-2 py-1 rounded-full text-xs border"
                    style={{
                      backgroundColor: primaryColor + '30',
                      color: primaryColor,
                      borderColor: primaryColor + '60'
                    }}
                  >
                    ✅ 利用可能
                  </div>
                </div>
              )}

              {/* 📄 コンテンツ情報 */}
              <div className="text-center">
                <div className="text-4xl mb-3">{getContentIcon(content.type)}</div>
                <h3 className="text-lg font-bold text-white mb-2">{content.name}</h3>
                
                {content.description && (
                  <p className="text-white/70 text-sm mb-3">{content.description}</p>
                )}
                
                <div className="flex items-center justify-between text-sm">
                  <span className="text-white/60">{content.type}</span>
                  {content.fileSize && (
                    <span className="text-white/60">{content.fileSize}</span>
                  )}
                </div>
                
                <div className="mt-3 pt-3 border-t border-white/10">
                  <div className="flex items-center justify-center space-x-2">
                    <span style={{ color: secondaryColor }}>💎</span>
                    <span className="font-bold" style={{ color: secondaryColor }}>
                      {content.requiredTips.toLocaleString()} TIPS
                    </span>
                  </div>
                </div>
              </div>
            </div>
          );
        })
        )}
      </div>

      {/* 🔍 詳細モーダル */}
      {selectedContent && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gradient-to-br from-gray-900 to-black rounded-xl border border-white/20 max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-white">コンテンツ詳細</h3>
              <button
                onClick={() => setSelectedContent(null)}
                className="text-white/60 hover:text-white text-2xl"
              >
                ×
              </button>
            </div>
            
            <div className="text-center mb-6">
              <div className="text-6xl mb-4">{getContentIcon(selectedContent.type)}</div>
              <h4 className="text-lg font-bold text-white mb-2">{selectedContent.name}</h4>
              {selectedContent.description && (
                <p className="text-white/70 text-sm mb-4">{selectedContent.description}</p>
              )}
            </div>

            {/* 📊 メタデータ */}
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-white/60">タイプ:</span>
                <span className="text-white">{selectedContent.type}</span>
              </div>
              {selectedContent.fileSize && (
                <div className="flex justify-between">
                  <span className="text-white/60">ファイルサイズ:</span>
                  <span className="text-white">{selectedContent.fileSize}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-white/60">必要TIPS:</span>
                <span className="text-yellow-400 font-bold">{selectedContent.requiredTips.toLocaleString()}</span>
              </div>
              
              {selectedContent.metadata && (
                <>
                  {selectedContent.metadata.author && (
                    <div className="flex justify-between">
                      <span className="text-white/60">作者:</span>
                      <span className="text-white">{selectedContent.metadata.author}</span>
                    </div>
                  )}
                  {selectedContent.metadata.createdAt && (
                    <div className="flex justify-between">
                      <span className="text-white/60">作成日:</span>
                      <span className="text-white">{selectedContent.metadata.createdAt}</span>
                    </div>
                  )}
                </>
              )}
            </div>

            <button
              onClick={() => setSelectedContent(null)}
              className="w-full mt-6 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg transition-colors"
            >
              閉じる
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ContentDisplay;