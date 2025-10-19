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
                className="rounded-xl p-3 text-center opacity-50"
                style={{
                  background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})`,
                }}
              >
                <div className="text-sm font-bold text-white">{label}</div>
                <div className="mt-1 text-xs text-white/80">{price}</div>
              </div>
            ) : (
              <button
                key={product.contentId}
                type="button"
                onClick={() => handleProductSelect(product.contentId)}
                onMouseEnter={() => handleProductHover(product)}
                onMouseLeave={handleProductLeave}
                className="group relative overflow-hidden rounded-xl p-3 text-center transition-all hover:-translate-y-[2px] active:translate-y-0 shadow-[0_8px_22px_rgba(0,0,0,0.35)] hover:shadow-[0_12px_32px_rgba(139,92,246,0.4)]"
                style={{
                  background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})`,
                }}
              >
                {/* ホバー時の発光レイヤー */}
                <div
                  className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
                  style={{
                    background: `radial-gradient(circle at 50% 0%, rgba(255,255,255,0.2), transparent 70%)`,
                  }}
                />
                <div className="relative text-sm font-bold text-white">{label}</div>
                <div className="relative mt-1 text-xs text-white/80">{price}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ===== ステータス行（残高・ウォレット） ===== */}
      <div className="relative z-10 px-5 pb-5">
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
            <div className="text-lg font-bold">{tnhtBalance} tNHT</div>
          </div>

          {/* ウォレット */}
          <div className="flex-1">
            <ConnectWallet
              theme="dark"
              btnTitle={address ? `${address.slice(0, 6)}...${address.slice(-4)}` : "接続"}
              className="w-full"
              style={{
                background: "linear-gradient(135deg, #F59E0B, #D97706)",
                borderColor: "#F59E0B80",
                border: "2px solid #F59E0B80",
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