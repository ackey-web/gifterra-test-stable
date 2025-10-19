// src/vending-ui/App.tsx
import { useState, useEffect } from "react";
import { ConnectWallet, useAddress } from "@thirdweb-dev/react";
import { formatUnits } from "viem";
import { useMetaverseContent } from "../hooks/useMetaverseContent";
import { publicClient, TOKEN, ERC20_MIN_ABI } from "../contract";
import VendingMachineShell from "./components/VendingMachineShell";

export default function VendingApp() {
  const address = useAddress();

  // URL パラメータからGIFT HUB IDを取得
  const urlParams = new URLSearchParams(window.location.search);
  const machineId = urlParams.get("machine") || "main";
  const spaceId = "default";

  // 管理データ
  const { contentSet, vendingMachine, error } = useMetaverseContent(spaceId, machineId);

  // デザイン色（フォールバック）
  const primaryColor = vendingMachine?.settings?.design?.primaryColor || "#8B5CF6";
  const secondaryColor = vendingMachine?.settings?.design?.secondaryColor || "#3B82F6";
  const buttonColor = vendingMachine?.settings?.design?.buttonColor || "#2563EB";

  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [tnhtBalance, setTnhtBalance] = useState("0");
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  // ヘッダー画像を取得（管理画面で設定）
  const headerImage = vendingMachine?.settings?.design?.headerImage;

  // tNHT残高を取得
  useEffect(() => {
    if (!address) {
      setTnhtBalance("0");
      return;
    }

    const fetchBalance = async () => {
      try {
        const balance = await publicClient.readContract({
          address: TOKEN.ADDRESS,
          abi: ERC20_MIN_ABI,
          functionName: "balanceOf",
          args: [address as `0x${string}`],
        });
        const formatted = formatUnits(balance, TOKEN.DECIMALS);
        setTnhtBalance(Math.floor(Number(formatted)).toString());
      } catch (err) {
        setTnhtBalance("0");
      }
    };

    fetchBalance();
  }, [address]);

  const handleProductSelect = (productId: string) => {
    if (!selectedProducts.includes(productId)) {
      setSelectedProducts((prev) => [...prev, productId]);
    }
  };

  const handleProductHover = (product: any) => {
    if (product?.imageUrl) {
      setPreviewImage(product.imageUrl);
    }
  };

  const handleProductLeave = () => {
    setPreviewImage(null);
  };

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-900 text-white">
        <div className="text-center">
          <p className="mb-2 text-xl">エラーが発生しました</p>
          <p className="text-sm opacity-70">{String(error)}</p>
        </div>
      </div>
    );
  }

  const backgroundImage = vendingMachine?.settings?.design?.backgroundImage;

  return (
    <VendingMachineShell
      primaryColor={primaryColor}
      secondaryColor={secondaryColor}
      headerTitle={vendingMachine?.settings?.displayName || vendingMachine?.name || "GIFT HUB"}
      backgroundImage={backgroundImage}
    >
      {/* ===== ディスプレイ窓（正方形・1100x1200対応） ===== */}
      <div className="relative z-10 px-5 pt-6">
        <div
          className="flex items-center justify-center rounded-2xl overflow-hidden"
          style={{
            aspectRatio: "1 / 1",
            background: "linear-gradient(145deg, #0a0e14, #12171f)",
            border: "1px solid rgba(255,255,255,0.08)",
            boxShadow: "inset 0 4px 12px rgba(0,0,0,0.8), inset 0 1px 0 rgba(0,0,0,0.9)",
          }}
        >
          {previewImage ? (
            <img
              src={previewImage}
              alt="商品プレビュー"
              className="w-full h-full object-contain"
            />
          ) : headerImage ? (
            <img
              src={headerImage}
              alt="ヘッダー画像"
              className="w-full h-full object-contain"
            />
          ) : (
            <p className="text-sm text-white/50">商品プレビュー</p>
          )}
        </div>
      </div>

      {/* ===== 商品ボタン ===== */}
      <div className="relative z-10 px-5 py-5">
        <div className="grid grid-cols-3 gap-3">
          {(contentSet?.contents && contentSet.contents.length > 0
            ? contentSet.contents.slice(0, 3)
            : [{}, {}, {}] // プレースホルダー
          ).map((product: any, index: number) => {
            const isPlaceholder = !product?.contentId;
            const label = String.fromCharCode(65 + index);
            const tokenSymbol = vendingMachine?.settings?.tokenSymbol || 'tNHT';
            const price = isPlaceholder ? "準備中" : `${product.requiredTips} ${tokenSymbol}`;

            return isPlaceholder ? (
              <div
                key={`placeholder-${index}`}
                className="rounded-xl py-2.5 px-3 text-center"
                style={{
                  background: "linear-gradient(145deg, #2a2f3e, #1f2330)",
                  boxShadow: `
                    0 4px 12px rgba(0,0,0,0.4),
                    inset 0 1px 0 rgba(255,255,255,0.05),
                    inset 0 -1px 2px rgba(0,0,0,0.4)
                  `,
                  border: "1px solid rgba(255,255,255,0.06)",
                }}
              >
                <div className="text-sm font-bold text-white/40 tracking-wide">{label}</div>
                <div className="mt-0.5 text-xs text-white/30 font-semibold">{price}</div>
              </div>
            ) : (
              <button
                key={product.contentId}
                type="button"
                onClick={() => handleProductSelect(product.contentId)}
                onMouseEnter={() => handleProductHover(product)}
                onMouseLeave={handleProductLeave}
                className="group relative overflow-hidden rounded-xl py-2.5 px-3 text-center transition-all hover:-translate-y-[1px] active:translate-y-[1px]"
                style={{
                  background: `linear-gradient(145deg, ${buttonColor}dd, ${buttonColor}cc)`,
                  boxShadow: `
                    0 0 20px ${buttonColor}60,
                    0 6px 16px rgba(0,0,0,0.4),
                    inset 0 1px 0 rgba(255,255,255,0.2),
                    inset 0 -2px 4px rgba(0,0,0,0.3)
                  `,
                  border: "1px solid rgba(255,255,255,0.15)",
                }}
              >
                {/* 金属反射 */}
                <div
                  className="absolute inset-0 pointer-events-none"
                  style={{
                    background: "linear-gradient(165deg, transparent 0%, rgba(255,255,255,0.1) 30%, transparent 60%)",
                  }}
                />
                {/* ホバー時の発光レイヤー */}
                <div
                  className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
                  style={{
                    background: `radial-gradient(circle at 50% 0%, rgba(255,255,255,0.15), transparent 70%)`,
                  }}
                />
                <div className="relative text-base font-black text-white tracking-wider drop-shadow-lg">{label}</div>
                <div className="relative mt-0.5 text-xs text-white font-bold drop-shadow">{price}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ===== 操作パネル（ロゴ・残高・ウォレット） ===== */}
      <div className="relative z-10 px-5 pb-5">
        <div
          className="rounded-2xl p-3 relative overflow-hidden"
          style={{
            background: "linear-gradient(145deg, #1a1f2e, #0f1419)",
            boxShadow: `
              0 4px 12px rgba(0,0,0,0.5),
              0 1px 3px rgba(0,0,0,0.3),
              inset 0 1px 0 rgba(255,255,255,0.08),
              inset 0 -1px 2px rgba(0,0,0,0.3)
            `,
            border: "1px solid rgba(255,255,255,0.08)",
          }}
        >
          {/* 金属反射（アウトセット用） */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: "linear-gradient(165deg, rgba(255,255,255,0.05) 0%, transparent 40%, rgba(0,0,0,0.2) 100%)",
            }}
          />

          {/* ロゴ・残高・ウォレットの横並び */}
          <div className="relative flex items-stretch gap-3">
            {/* ロゴ（左端） */}
            <div className="flex items-center justify-center">
              <img
                src="/gifterra-logo.png"
                alt="Gifterra"
                className="w-12 h-12 object-contain opacity-90"
              />
            </div>

            {/* 残高パネル（中央・金属質感・ネオングリーン） */}
            <div
              className="flex items-center justify-center flex-1 rounded-xl px-4 relative overflow-hidden"
              style={{
                background: "linear-gradient(145deg, #1a3d2f, #0f2419)",
                boxShadow: `
                  0 0 35px rgba(16,185,129,0.4),
                  0 8px 20px rgba(0,0,0,0.5),
                  inset 0 1px 0 rgba(16,185,129,0.3),
                  inset 0 -2px 4px rgba(0,0,0,0.5)
                `,
                border: "1px solid rgba(16,185,129,0.4)",
              }}
            >
              {/* 金属反射 */}
              <div
                className="absolute inset-0 pointer-events-none"
                style={{
                  background: "linear-gradient(165deg, transparent 0%, rgba(16,185,129,0.15) 30%, transparent 60%)",
                }}
              />
              {/* グローエフェクト */}
              <div
                className="absolute inset-0 opacity-50 pointer-events-none"
                style={{
                  background: "radial-gradient(circle at 20% 20%, rgba(16,185,129,0.3), transparent 60%)",
                }}
              />
              {/* 残高テキスト */}
              <div className="relative flex items-center gap-2">
                <div className="text-xs font-bold text-emerald-300/80">残高</div>
                <div className="text-base font-black text-emerald-200 tracking-wide" style={{ textShadow: "0 0 25px rgba(16,185,129,0.8), 0 2px 6px rgba(0,0,0,0.5)" }}>
                  {tnhtBalance} {vendingMachine?.settings?.tokenSymbol || 'tNHT'}
                </div>
              </div>
            </div>

            {/* ウォレット接続ボタン（右側・金属質感） */}
            <div className="flex-1">
              <ConnectWallet
                theme="dark"
                btnTitle={address ? `${address.slice(0, 6)}...${address.slice(-4)}` : "接続"}
                className="w-full h-full"
                style={{
                  background: "linear-gradient(145deg, #4a3520, #3a2810)",
                  border: "1px solid rgba(245,158,11,0.4)",
                  borderRadius: "0.75rem",
                  boxShadow: `
                    0 0 30px rgba(245,158,11,0.4),
                    0 8px 20px rgba(0,0,0,0.5),
                    inset 0 1px 0 rgba(245,158,11,0.3),
                    inset 0 -2px 4px rgba(0,0,0,0.5)
                  `,
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* ===== 取り出し口（金属インセット） ===== */}
      <div className="relative z-10 px-5 pb-6">
        <div
          className="rounded-2xl p-5 relative overflow-hidden"
          style={{
            background: "linear-gradient(145deg, #0f1419, #1a1f2e)",
            boxShadow: `
              inset 0 3px 8px rgba(0,0,0,0.6),
              inset 0 1px 0 rgba(0,0,0,0.8),
              0 1px 0 rgba(255,255,255,0.03)
            `,
            border: "1px solid rgba(0,0,0,0.5)",
          }}
        >
          {/* 内側の陰影 */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: "radial-gradient(circle at 50% 0%, rgba(0,0,0,0.4), transparent 50%)",
            }}
          />

          <div className="relative">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-bold text-yellow-300/90" style={{ textShadow: "0 0 10px rgba(253,224,71,0.5)" }}>商品取出し口</h3>
              <span
                className="rounded-full px-3 py-1.5 text-xs font-bold text-white"
                style={{
                  background: "linear-gradient(145deg, #dc2626, #991b1b)",
                  boxShadow: "0 2px 8px rgba(220,38,38,0.4), inset 0 1px 0 rgba(255,255,255,0.2)",
                }}
              >
                {selectedProducts.length}個の商品
              </span>
            </div>

            <div
              className="min-h-[110px] rounded-xl p-4"
              style={{
                background: "linear-gradient(145deg, #0a0e14, #12171f)",
                boxShadow: "inset 0 2px 6px rgba(0,0,0,0.7)",
                border: "1px solid rgba(255,255,255,0.03)",
              }}
            >
              {selectedProducts.length > 0 ? (
                <div className="space-y-2 text-sm text-white/80">
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
                <div className="text-center text-sm text-white/30">
                  <p className="mb-2">📦 購入した商品がここに表示されます</p>
                  <p>上の商品ボタンから購入してください</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </VendingMachineShell>
  );
}