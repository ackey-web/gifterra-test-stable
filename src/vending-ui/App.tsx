// src/vending-ui/App.tsx
import { useState, useEffect } from "react";
import { ConnectWallet, useAddress } from "@thirdweb-dev/react";
import { formatUnits } from "viem";
import { useMetaverseContent } from "../hooks/useMetaverseContent";
import { publicClient, TOKEN, ERC20_MIN_ABI } from "../contract";
import VendingMachineShell from "./components/VendingMachineShell";

export default function VendingApp() {
  const address = useAddress();

  // URL パラメータから自販機IDを取得
  const urlParams = new URLSearchParams(window.location.search);
  const machineId = urlParams.get("machine") || "main";
  const spaceId = "default";

  // 管理データ
  const { contentSet, vendingMachine, error } = useMetaverseContent(spaceId, machineId);

  // デザイン色（フォールバック）
  const primaryColor = vendingMachine?.settings?.design?.primaryColor || "#8B5CF6";
  const secondaryColor = vendingMachine?.settings?.design?.secondaryColor || "#3B82F6";

  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [tnhtBalance, setTnhtBalance] = useState("0.0000");
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  // ヘッダー画像を取得（管理画面で設定）
  const headerImage = vendingMachine?.settings?.design?.headerImage;

  // tNHT残高を取得
  useEffect(() => {
    if (!address) {
      setTnhtBalance("0.0000");
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
        setTnhtBalance(Number(formatted).toFixed(4));
      } catch (err) {
        setTnhtBalance("0.0000");
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

  return (
    <VendingMachineShell
      primaryColor={primaryColor}
      secondaryColor={secondaryColor}
      headerTitle={vendingMachine?.settings?.displayName || vendingMachine?.name || "デジタル自販機"}
    >
      {/* ===== ディスプレイ窓 ===== */}
      <div className="relative z-10 px-5 pt-6">
        <div className="flex h-64 items-center justify-center rounded-2xl border border-white/10 bg-black/80 overflow-hidden">
          {previewImage ? (
            <img
              src={previewImage}
              alt="商品プレビュー"
              className="max-w-full max-h-full object-contain"
            />
          ) : headerImage ? (
            <img
              src={headerImage}
              alt="ヘッダー画像"
              className="w-full h-full object-cover"
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
            const price = isPlaceholder ? "準備中" : `${product.requiredTips} tNHT`;

            return isPlaceholder ? (
              <div
                key={`placeholder-${index}`}
                className="rounded-2xl p-4 text-center opacity-30"
                style={{
                  background: `linear-gradient(135deg, rgba(139,92,246,0.15), rgba(59,130,246,0.1))`,
                  backdropFilter: "blur(8px)",
                  border: "1px solid rgba(139,92,246,0.2)",
                  boxShadow: `0 4px 12px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.05)`,
                }}
              >
                <div className="text-base font-bold text-white/60 tracking-wide">{label}</div>
                <div className="mt-1 text-xs text-white/40 font-semibold">{price}</div>
              </div>
            ) : (
              <button
                key={product.contentId}
                type="button"
                onClick={() => handleProductSelect(product.contentId)}
                onMouseEnter={() => handleProductHover(product)}
                onMouseLeave={handleProductLeave}
                className="group relative overflow-hidden rounded-2xl p-4 text-center transition-all hover:-translate-y-[2px] active:translate-y-0"
                style={{
                  background: `linear-gradient(135deg, rgba(139,92,246,0.35), rgba(59,130,246,0.25))`,
                  backdropFilter: "blur(10px)",
                  border: "2px solid rgba(139,92,246,0.4)",
                  boxShadow: `0 0 30px rgba(139,92,246,0.4), 0 6px 16px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.15)`,
                }}
              >
                {/* ホバー時の発光レイヤー */}
                <div
                  className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
                  style={{
                    background: `radial-gradient(circle at 50% 0%, rgba(255,255,255,0.2), transparent 70%)`,
                  }}
                />
                <div className="relative text-base font-bold text-white tracking-wide">{label}</div>
                <div className="relative mt-1 text-sm text-white/90 font-semibold">{price}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ===== ステータス行（残高・ウォレット） ===== */}
      <div className="relative z-10 px-5 pb-5">
        {/* ロゴ（残高パネルの外側に配置） */}
        <div className="mb-3 flex items-center justify-start">
          <img
            src="/gifterra-logo.png"
            alt="Gifterra"
            className="w-12 h-12 object-contain opacity-90"
          />
        </div>

        <div className="flex items-stretch gap-3">
          {/* 残高パネル（ネオングリーン・添付画像風） */}
          <div className="flex flex-col justify-center flex-1 rounded-2xl border-2 px-5 py-3.5 relative overflow-hidden"
            style={{
              background: "linear-gradient(135deg, rgba(16,185,129,0.25), rgba(5,150,105,0.15))",
              borderColor: "#10B98160",
              backdropFilter: "blur(10px)",
              boxShadow: "0 0 40px rgba(16,185,129,0.3), 0 4px 12px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.1)",
            }}
          >
            {/* グローエフェクト */}
            <div
              className="absolute inset-0 opacity-40 pointer-events-none"
              style={{
                background: "radial-gradient(circle at 20% 20%, rgba(16,185,129,0.4), transparent 60%)",
              }}
            />
            {/* 残高テキスト */}
            <div className="relative">
              <div className="text-xs font-bold text-emerald-400/90 mb-0.5">残高</div>
              <div className="text-2xl font-black text-emerald-300 tracking-wide" style={{ textShadow: "0 0 20px rgba(16,185,129,0.6), 0 2px 4px rgba(0,0,0,0.3)" }}>
                {tnhtBalance} tNHT
              </div>
            </div>
          </div>

          {/* ウォレット接続ボタン */}
          <div className="flex-1">
            <ConnectWallet
              theme="dark"
              btnTitle={address ? `${address.slice(0, 6)}...${address.slice(-4)}` : "接続"}
              className="w-full h-full"
              style={{
                background: "linear-gradient(135deg, rgba(245,158,11,0.3), rgba(217,119,6,0.2))",
                borderColor: "#F59E0B60",
                border: "2px solid #F59E0B60",
                borderRadius: "1rem",
                backdropFilter: "blur(10px)",
                boxShadow: "0 0 35px rgba(245,158,11,0.35), 0 4px 12px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.1)",
                minHeight: "76px",
              }}
            />
          </div>
        </div>
      </div>

      {/* ===== 取り出し口 ===== */}
      <div className="relative z-10 px-5 pb-6">
        <div className="rounded-2xl border border-white/10 bg-black/50 p-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-bold text-yellow-400">商品取出し口</h3>
            <span
              className="rounded-full px-3 py-1 text-xs text-white"
              style={{ background: "linear-gradient(135deg, #EF4444, #DC2626)" }}
            >
              {selectedProducts.length}個の商品
            </span>
          </div>

          <div className="min-h-[100px] rounded-xl border border-white/5 bg-slate-900/50 p-4">
            {selectedProducts.length > 0 ? (
              <div className="space-y-2 text-sm text-white/70">
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
              <div className="text-center text-sm text-white/40">
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