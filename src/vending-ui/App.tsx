// src/vending-ui/App.tsx
import { useState } from "react";
import { ConnectWallet, useAddress } from "@thirdweb-dev/react";
import { useMetaverseContent } from "../hooks/useMetaverseContent";
import VendingMachineShell from "./components/VendingMachineShell";

export default function VendingApp() {
  const address = useAddress();

  // URL パラメータ → 自販機ID
  const urlParams = new URLSearchParams(window.location.search);
  const machineId = urlParams.get("machine") || "main";
  const spaceId = "default";

  // 管理画面データ
  const { contentSet, vendingMachine, error } = useMetaverseContent(spaceId, machineId);

  // デザイン色（フォールバック）
  const primaryColor   = vendingMachine?.settings?.design?.primaryColor   || "#8B5CF6";
  const secondaryColor = vendingMachine?.settings?.design?.secondaryColor || "#3B82F6";

  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);

  // 商品ボタン押下
  const handleProductSelect = (productId: string) => {
    if (!selectedProducts.includes(productId)) {
      setSelectedProducts(prev => [...prev, productId]);
    }
  };

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0B1120] text-white">
        <div className="text-center">
          <p className="text-xl mb-2">エラーが発生しました</p>
          <p className="opacity-70 text-sm">{String(error)}</p>
        </div>
      </div>
    );
  }

  // 3つ分のアイテム（足りなければプレースホルダー）
  const items = (contentSet?.contents || []).slice(0, 3);
  while (items.length < 3) items.push(undefined as any);

  return (
    <VendingMachineShell
      primaryColor={primaryColor}
      secondaryColor={secondaryColor}
      headerTitle={vendingMachine?.settings?.displayName || vendingMachine?.name || "新しい自販機"}
    >
      {/* ディスプレイ窓 */}
      <div className="px-5 pt-6">
        <div className="h-[260px] rounded-[16px] bg-black/86 border border-white/10 flex items-center justify-center
                        shadow-[inset_0_1px_0_rgba(255,255,255,.06),inset_0_-10px_30px_rgba(0,0,0,.55)]">
          <p className="text-white/45 text-sm">商品プレビュー</p>
        </div>
      </div>

      {/* 商品ボタン列（A1/B2/C3 風の光るピル） */}
      <div className="px-5 pt-5">
        <div className="grid grid-cols-3 gap-3">
          {items.map((product: any, index: number) => {
            const isPlaceholder = !product?.contentId;
            const label = `${String.fromCharCode(65 + index)}${index + 1}`;
            const price = isPlaceholder ? "準備中" : `${product.requiredTips} tNHT`;

            const base =
              "rounded-2xl px-4 py-3 text-center font-semibold text-white select-none transition-transform " +
              "shadow-[0_8px_24px_rgba(59,130,246,0.35),inset_0_1px_0_rgba(255,255,255,0.18)]";

            const style = {
              background: `linear-gradient(180deg, ${primaryColor}, ${secondaryColor})`,
              filter: "saturate(1.05)",
            } as const;

            if (isPlaceholder) {
              return (
                <div key={`ph-${index}`} className={base + " opacity-50"} style={style}>
                  <div className="text-sm">{label}</div>
                  <div className="text-xs opacity-90 mt-1">{price}</div>
                </div>
              );
            }

            return (
              <button
                key={product.contentId}
                onClick={() => handleProductSelect(product.contentId)}
                className={base + " hover:scale-[1.02] active:scale-[0.98]"}
                style={style}
              >
                <div className="text-sm">{label}</div>
                <div className="text-xs opacity-90 mt-1">{price}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ステータス行（残高／ウォレット） */}
      <div className="px-5 pt-4">
        <div className="grid grid-cols-2 gap-3">
          {/* 残高カード（緑グロウ） */}
          <div
            className="rounded-2xl border-2 px-4 py-3 text-white shadow-[0_10px_26px_rgba(16,185,129,.35)]"
            style={{ background: "linear-gradient(180deg,#10B981,#059669)", borderColor: "#10B98180" }}
          >
            <div className="text-[11px] opacity-85">残高</div>
            <div className="text-[18px] font-extrabold tracking-wide">0.0000 tNHT</div>
          </div>

          {/* ウォレット（オレンジグロウ） */}
          {address ? (
            <div
              className="rounded-2xl border-2 px-4 py-3 text-white shadow-[0_10px_26px_rgba(245,158,11,.35)]"
              style={{ background: "linear-gradient(180deg,#F59E0B,#D97706)", borderColor: "#F59E0B80" }}
            >
              <div className="text-[11px] opacity-85">🦊</div>
              <div className="text-[14px] font-bold truncate">{address.slice(0, 6)}...{address.slice(-4)}</div>
              <div className="text-[11px] opacity-85 mt-0.5">MATIC</div>
            </div>
          ) : (
            <div className="rounded-2xl overflow-hidden">
              <ConnectWallet theme="dark" btnTitle="接続" className="w-full" />
            </div>
          )}
        </div>
      </div>

      {/* 取り出し口（ラベル＋赤バッジ＋インセットの受け皿） */}
      <div className="px-5 py-5">
        <div className="rounded-[18px] border border-white/12 bg-[#0E142C]/70 p-4 shadow-[inset_0_2px_10px_rgba(0,0,0,.55)]">
          <div className="flex items-center justify-between mb-3">
            <div
              className="px-3 py-1 rounded-md text-[13px] font-bold text-[#ffd85e] border border-yellow-400/40"
              style={{ background: "linear-gradient(180deg,#1b1f33,#0f1426)" }}
            >
              商品取出し口
            </div>
            <span
              className="text-white text-[12px] px-3 py-1 rounded-full"
              style={{ background: "linear-gradient(180deg,#EF4444,#DC2626)" }}
            >
              {selectedProducts.length}個の商品
            </span>
          </div>

          <div className="rounded-xl border border-white/8 bg-[#0B1024]/70 p-4 min-h-[110px] shadow-[inset_0_6px_18px_rgba(0,0,0,.6)]">
            {selectedProducts.length > 0 ? (
              <div className="text-white/80 text-sm space-y-2">
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