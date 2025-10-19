// src/vending-ui/App.tsx
import { useState } from "react";
import { ConnectWallet, useAddress } from "@thirdweb-dev/react";
import { useMetaverseContent } from "../hooks/useMetaverseContent";
import VendingMachineShell from "./components/VendingMachineShell";

export default function VendingApp() {
  const address = useAddress();

  // URL パラメータから自販機IDを取得
  const urlParams = new URLSearchParams(window.location.search);
  const machineId = urlParams.get("machine") || "main";
  const spaceId = "default";

  // 管理画面データを取得
  const { contentSet, vendingMachine, error } = useMetaverseContent(spaceId, machineId);

  // デザイン設定（フォールバック色）
  const primaryColor = vendingMachine?.settings?.design?.primaryColor || '#8B5CF6';
  const secondaryColor = vendingMachine?.settings?.design?.secondaryColor || '#3B82F6';

  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);

  const handleProductSelect = (productId: string) => {
    if (!selectedProducts.includes(productId)) {
      setSelectedProducts((prev) => [...prev, productId]);
    }
  };

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white">
        <div className="text-center">
          <p className="text-xl mb-2">エラーが発生しました</p>
          <p className="opacity-70 text-sm">{String(error)}</p>
        </div>
      </div>
    );
  }

  return (
    <VendingMachineShell
        primaryColor={primaryColor}
        secondaryColor={secondaryColor}
        headerTitle={vendingMachine?.settings?.displayName || vendingMachine?.name || "デジタル自販機"}
      >
        {/* ディスプレイ窓 */}
        <div className="px-5 pt-6">
          <div className="h-64 rounded-2xl bg-black/80 border border-white/10 flex items-center justify-center">
            <p className="text-white/50 text-sm">商品プレビュー</p>
          </div>
        </div>

        {/* 商品ボタン */}
        <div className="px-5 py-5">
          <div className="grid grid-cols-3 gap-3">
            {(contentSet?.contents && contentSet.contents.length > 0
              ? contentSet.contents.slice(0, 3)
              : [{}, {}, {}] // プレースホルダー3つ
            ).map((product: any, index: number) => {
              const isPlaceholder = !product?.contentId;
              const label = String.fromCharCode(65 + index);
              const price = isPlaceholder ? "準備中" : `${product.requiredTips} tNHT`;

              return isPlaceholder ? (
                <div
                  key={`placeholder-${index}`}
                  className="relative opacity-50 rounded-xl p-3 text-center"
                  style={{
                    background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})`,
                  }}
                >
                  <div className="text-white font-bold text-sm">{label}</div>
                  <div className="text-white/80 text-xs mt-1">{price}</div>
                </div>
              ) : (
                <button
                  key={product.contentId}
                  onClick={() => handleProductSelect(product.contentId)}
                  className="relative group rounded-xl p-3 text-center transition-transform hover:scale-[1.02] active:scale-[0.99]"
                  style={{
                    background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})`,
                  }}
                >
                  <div className="text-white font-bold text-sm">{label}</div>
                  <div className="text-white/80 text-xs mt-1">{price}</div>
                </button>
              );
            })}
          </div>
        </div>

        {/* ステータス行 */}
        <div className="px-5 pb-5">
          <div className="flex gap-3">
            {/* 残高 */}
            <div
              className="flex-1 rounded-xl border-2 px-4 py-3"
              style={{
                background: "linear-gradient(135deg, #10B981, #059669)",
                borderColor: "#10B98180",
              }}
            >
              <div className="text-xs opacity-80">残高</div>
              <div className="text-lg font-bold">0.0000 tNHT</div>
            </div>

            {/* ウォレット */}
            {address ? (
              <div
                className="flex-1 rounded-xl border-2 px-4 py-3"
                style={{
                  background: "linear-gradient(135deg, #F59E0B, #D97706)",
                  borderColor: "#F59E0B80",
                }}
              >
                <div className="text-xs opacity-80">🦊</div>
                <div className="text-sm truncate font-bold">
                  {address.slice(0, 6)}...{address.slice(-4)}
                </div>
              </div>
            ) : (
              <div className="flex-1">
                <ConnectWallet theme="dark" btnTitle="接続" className="w-full" />
              </div>
            )}
          </div>
        </div>

        {/* 取り出し口 */}
        <div className="px-5 pb-6">
          <div className="rounded-2xl border border-white/10 bg-black/50 p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-yellow-400 font-bold">商品取出し口</h3>
              <span
                className="text-white text-xs px-3 py-1 rounded-full"
                style={{ background: "linear-gradient(135deg, #EF4444, #DC2626)" }}
              >
                {selectedProducts.length}個の商品
              </span>
            </div>

            <div className="bg-slate-900/50 rounded-xl p-4 min-h-[100px] border border-white/5">
              {selectedProducts.length > 0 ? (
                <div className="text-white/70 text-sm space-y-2">
                  {selectedProducts.map((id) => {
                    const product = contentSet?.contents?.find((p: any) => p.contentId === id);
                    return (
                      <div key={id} className="flex items-center justify-between">
                        <span>✅ {product?.name ?? id}</span>
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
      </VendingMachineShell>
  );
}