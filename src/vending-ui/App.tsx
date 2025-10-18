// src/vending-ui/App.tsx
import { useState } from "react";
import { ConnectWallet, useAddress } from "@thirdweb-dev/react";
import { useMetaverseContent } from "../hooks/useMetaverseContent";

export default function VendingApp() {
  const address = useAddress();

  // URL パラメータから自販機IDを取得
  const urlParams = new URLSearchParams(window.location.search);
  const machineId = urlParams.get("machine") || "main";
  const spaceId = "default";

  // 管理画面データを取得
  const {
    contentSet,
    vendingMachine,
    error
  } = useMetaverseContent(spaceId, machineId);

  // デザイン設定を取得
  const primaryColor = vendingMachine?.settings?.design?.primaryColor || '#8B5CF6';
  const secondaryColor = vendingMachine?.settings?.design?.secondaryColor || '#3B82F6';

  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);

  // 商品選択
  const handleProductSelect = (productId: string) => {
    if (!selectedProducts.includes(productId)) {
      setSelectedProducts([...selectedProducts, productId]);
    }
  };

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center">
        <div className="text-white text-center">
          <p className="text-xl mb-4">エラーが発生しました</p>
          <p className="text-sm opacity-70">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center p-4 relative overflow-hidden">
      {/* グローエフェクト */}
      <div className="absolute inset-0 pointer-events-none">
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full blur-3xl opacity-30"
          style={{
            background: `radial-gradient(circle, ${primaryColor}80, transparent 70%)`
          }}
        />
      </div>

      {/* 自販機パネル */}
      <div className="relative w-full max-w-md">
        {/* 外側のグロー */}
        <div
          className="absolute inset-0 rounded-3xl blur-2xl opacity-50"
          style={{
            background: `linear-gradient(135deg, ${primaryColor}60, ${secondaryColor}60)`,
            transform: 'scale(1.02)'
          }}
        />

        {/* メインパネル */}
        <div
          className="relative bg-gradient-to-br from-slate-800/90 to-slate-900/90 backdrop-blur-xl rounded-3xl border-2 shadow-2xl overflow-hidden"
          style={{
            borderColor: `${primaryColor}40`
          }}
        >
          {/* ヘッダー */}
          <div className="bg-black/40 p-4 text-center border-b border-white/10">
            <h1 className="text-white text-lg font-bold flex items-center justify-center gap-2">
              <span>🎨</span>
              {vendingMachine?.settings?.displayName || vendingMachine?.name || "デジタル自販機"}
            </h1>
          </div>

          {/* メインディスプレイエリア */}
          <div className="p-6">
            <div className="bg-black rounded-2xl h-64 mb-4 flex items-center justify-center border border-white/10">
              <p className="text-white/50 text-sm">商品プレビュー</p>
            </div>

            {/* 商品選択ボタン */}
            <div className="grid grid-cols-3 gap-3 mb-4">
              {contentSet?.contents.slice(0, 3).map((product, index) => (
                <button
                  key={product.contentId}
                  onClick={() => handleProductSelect(product.contentId)}
                  className="relative group"
                  style={{
                    background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})`,
                    padding: '12px',
                    borderRadius: '12px',
                    transition: 'all 0.3s ease'
                  }}
                >
                  <div className="text-white font-bold text-sm">
                    {String.fromCharCode(65 + index)}{index + 1}
                  </div>
                  <div className="text-white/80 text-xs mt-1">
                    {product.requiredTips} tNHT
                  </div>
                </button>
              )) || (
                <>
                  {[0, 1, 2].map((i) => (
                    <div
                      key={i}
                      className="relative opacity-50"
                      style={{
                        background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})`,
                        padding: '12px',
                        borderRadius: '12px'
                      }}
                    >
                      <div className="text-white font-bold text-sm">
                        {String.fromCharCode(65 + i)}{i + 1}
                      </div>
                      <div className="text-white/80 text-xs mt-1">準備中</div>
                    </div>
                  ))}
                </>
              )}
            </div>

            {/* 残高とウォレット */}
            <div className="flex gap-3 mb-4">
              {/* 残高表示 */}
              <button
                className="flex-1 text-white font-bold py-3 px-4 rounded-xl border-2 transition-all"
                style={{
                  background: 'linear-gradient(135deg, #10B981, #059669)',
                  borderColor: '#10B98180'
                }}
              >
                <div className="text-xs opacity-80">残高</div>
                <div className="text-lg">0.0000 tNHT</div>
              </button>

              {/* ウォレット接続 */}
              {address ? (
                <button
                  className="flex-1 text-white font-bold py-3 px-4 rounded-xl border-2 transition-all"
                  style={{
                    background: 'linear-gradient(135deg, #F59E0B, #D97706)',
                    borderColor: '#F59E0B80'
                  }}
                >
                  <div className="text-xs opacity-80">🦊</div>
                  <div className="text-sm truncate">{address.slice(0, 6)}...{address.slice(-4)}</div>
                </button>
              ) : (
                <div className="flex-1">
                  <ConnectWallet
                    theme="dark"
                    btnTitle="接続"
                    className="w-full"
                  />
                </div>
              )}
            </div>

            {/* 商品取出し口 */}
            <div className="bg-black/60 rounded-2xl p-4 border border-white/10">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-yellow-400 font-bold">商品取出しロ</h3>
                <span
                  className="text-white text-xs px-3 py-1 rounded-full"
                  style={{
                    background: 'linear-gradient(135deg, #EF4444, #DC2626)'
                  }}
                >
                  {selectedProducts.length}個の商品
                </span>
              </div>

              <div className="bg-slate-900/50 rounded-xl p-4 min-h-[100px] border border-white/5">
                {selectedProducts.length > 0 ? (
                  <div className="text-white/70 text-sm space-y-2">
                    {selectedProducts.map((id) => {
                      const product = contentSet?.contents.find(p => p.contentId === id);
                      return (
                        <div key={id} className="flex items-center justify-between">
                          <span>✅ {product?.name}</span>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center text-white/40 text-sm">
                    <p className="mb-2">📦 購入した商品がここに表示されます</p>
                    <p>上の商品ボタンから購入してください</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
