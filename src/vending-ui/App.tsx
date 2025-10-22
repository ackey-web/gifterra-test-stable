// src/vending-ui/App.tsx
import { useState, useEffect } from "react";
import { ConnectWallet, useAddress } from "@thirdweb-dev/react";
import { formatUnits, createWalletClient, custom } from "viem";
import { polygonAmoy } from "viem/chains";
import { useMetaverseContent } from "../hooks/useMetaverseContent";
import { useSupabaseProducts } from "../hooks/useSupabaseProducts";
import { purchaseProduct, type Product } from "../lib/purchase";
import { publicClient, TOKEN, ERC20_MIN_ABI } from "../contract";
import VendingMachineShell from "./components/VendingMachineShell";
import { GIFTERRAAIAssistant } from "../components/GIFTERRAAIAssistant";
import PurchaseConfirmDialog from "./components/PurchaseConfirmDialog";
import PurchaseCompleteAnimation from "./components/PurchaseCompleteAnimation";

export default function VendingApp() {
  const address = useAddress();

  // URL パラメータからGIFT HUB IDを取得
  const urlParams = new URLSearchParams(window.location.search);
  const machineId = urlParams.get("machine") || "main";
  const spaceId = "default";

  // 管理データ（vendingMachine設定のみ使用、contentSetは使わずSupabase特典を使用）
  const { contentSet: _contentSet, vendingMachine, error } = useMetaverseContent(spaceId, machineId);

  // Supabase特典データを取得（vendingMachine.idをtenantIdとして使用）
  const tenantId = vendingMachine?.id || "";

  // デバッグログ：tenantIdと製品取得状況を確認
  console.log('🔍 [GIFT HUB] Debug Info:', {
    machineId,
    vendingMachineId: vendingMachine?.id,
    vendingMachineName: vendingMachine?.name,
    tenantId,
    hasVendingMachine: !!vendingMachine
  });

  const { products: supabaseProducts, isLoading: productsLoading } = useSupabaseProducts({
    tenantId,
    isActive: true
  });

  // 特典取得後のデバッグログ
  console.log('📦 [GIFT HUB] Products loaded:', {
    tenantId,
    productsCount: supabaseProducts.length,
    products: supabaseProducts.map(p => ({ id: p.id, name: p.name, tenant_id: p.tenant_id }))
  });

  // デザイン色（フォールバック）
  const primaryColor = vendingMachine?.settings?.design?.primaryColor || "#8B5CF6";
  const secondaryColor = vendingMachine?.settings?.design?.secondaryColor || "#3B82F6";

  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [purchasedProducts, setPurchasedProducts] = useState<Array<{id: string, name: string, downloadUrl: string}>>([]);
  const [tnhtBalance, setTnhtBalance] = useState("0");
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [isPurchasing, setIsPurchasing] = useState(false);

  // 確認ダイアログと完了アニメーション用のState
  const [confirmingProduct, setConfirmingProduct] = useState<typeof supabaseProducts[0] | null>(null);
  const [completedPurchase, setCompletedPurchase] = useState<{product: typeof supabaseProducts[0], downloadUrl: string} | null>(null);

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
    // ウォレット接続チェック
    if (!address) {
      alert("ウォレットを接続してください");
      return;
    }

    // 受け取り中は複数クリック防止
    if (isPurchasing) {
      return;
    }

    // 特典を探す
    const product = supabaseProducts.find((p) => p.id === productId);
    if (!product) {
      alert("特典が見つかりません");
      return;
    }

    // MetaMaskチェック
    if (!window.ethereum) {
      alert("MetaMaskがインストールされていません");
      return;
    }

    // 確認ダイアログを表示
    setConfirmingProduct(product);
  };

  // 確認ダイアログでキャンセルされた場合
  const handleConfirmCancel = () => {
    setConfirmingProduct(null);
  };

  // 確認ダイアログで確認された場合 - 実際の購入処理を実行
  const handleConfirmPurchase = async () => {
    if (!confirmingProduct || !address) return;

    const product = confirmingProduct;
    const productId = product.id;

    // ダイアログを閉じる
    setConfirmingProduct(null);

    // 受け取り処理開始
    setIsPurchasing(true);
    setSelectedProducts((prev) => [...prev, productId]);

    try {
      // Viem walletClient を作成（既存のpurchaseProduct関数が必要とする）
      const walletClient = createWalletClient({
        chain: polygonAmoy,
        transport: custom(window.ethereum),
        account: address as `0x${string}`
      });

      // 既存のpurchaseProduct関数を呼び出し
      const result = await purchaseProduct(
        product as Product,
        address,
        walletClient,
        publicClient
      );

      if (result.success) {
        if (result.downloadUrl) {
          // 受け取り成功 - ダウンロードURLを取得済み特典に追加
          const downloadUrl = result.downloadUrl;
          setPurchasedProducts((prev) => [
            ...prev,
            {
              id: product.id,
              name: product.name,
              downloadUrl
            }
          ]);

          // 完了アニメーションを表示
          setCompletedPurchase({
            product,
            downloadUrl
          });
        } else {
          // ダウンロードURLが生成されなかった
          alert(`受け取りは完了しましたが、ダウンロードURLの生成に失敗しました。管理者にお問い合わせください。`);
          setSelectedProducts((prev) => prev.filter((id) => id !== productId));
        }
      } else {
        // 受け取り失敗 - AIアシスタントを起動
        alert(`受け取りに失敗しました: ${result.error || "不明なエラー"}\n\nAIアシスタントがサポートします。`);

        // カスタムイベントを発火してAIアシスタントを自動起動
        window.dispatchEvent(new CustomEvent('gifterraError', {
          detail: {
            type: 'CLAIM_FAILED',
            error: result.error,
            productId: product.id,
            productName: product.name
          }
        }));

        // 選択リストから削除
        setSelectedProducts((prev) => prev.filter((id) => id !== productId));
      }
    } catch (err) {
      console.error("❌ 受け取りエラー:", err);
      alert(`受け取りエラー: ${err instanceof Error ? err.message : String(err)}\n\nAIアシスタントがサポートします。`);

      // カスタムイベントを発火してAIアシスタントを自動起動
      window.dispatchEvent(new CustomEvent('gifterraError', {
        detail: {
          type: 'CLAIM_FAILED',
          error: err instanceof Error ? err.message : String(err),
          productId: product.id,
          productName: product.name
        }
      }));

      // 選択リストから削除
      setSelectedProducts((prev) => prev.filter((id) => id !== productId));
    } finally {
      setIsPurchasing(false);
    }
  };

  // 完了アニメーションを閉じる
  const handleCompleteClose = () => {
    setCompletedPurchase(null);
  };

  const handleProductHover = (product: any) => {
    if (product?.image_url) {
      setPreviewImage(product.image_url);
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
              alt="特典プレビュー"
              className="w-full h-full object-contain"
            />
          ) : headerImage ? (
            <img
              src={headerImage}
              alt="ヘッダー画像"
              className="w-full h-full object-contain"
            />
          ) : (
            <p className="text-sm text-white/50">特典プレビュー</p>
          )}
        </div>
      </div>

      {/* ===== 特典ボタン ===== */}
      <div className="relative z-10 px-5 py-5">
        <div className="grid grid-cols-3 gap-3">
          {productsLoading ? (
            // ローディング中
            [{}, {}, {}].map((_, index) => (
              <div
                key={`loading-${index}`}
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
                <div className="text-sm font-bold text-white/40 tracking-wide">
                  {String.fromCharCode(65 + index)}
                </div>
                <div className="mt-0.5 text-xs text-white/30 font-semibold">読込中...</div>
              </div>
            ))
          ) : (
            // Supabase特典を表示（最大3件）
            Array.from({ length: 3 }).map((_, index) => {
              const product = supabaseProducts[index];
              const label = String.fromCharCode(65 + index);
              const tokenSymbol = vendingMachine?.settings?.tokenSymbol || 'tNHT';

              if (!product) {
                // プレースホルダー
                return (
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
                    <div className="mt-0.5 text-xs text-white/30 font-semibold">準備中</div>
                  </div>
                );
              }

              // Wei → トークン単位に変換
              const priceInTokens = formatUnits(BigInt(product.price_amount_wei), TOKEN.DECIMALS);
              const price = `${Math.floor(Number(priceInTokens))} ${tokenSymbol}`;
              const isSelected = selectedProducts.includes(product.id);

              // 特典名の長さに応じてフォントサイズを調整
              const productName = product.name;
              const isLongName = productName.length > 8;

              return (
                <button
                  key={product.id}
                  type="button"
                  onClick={() => handleProductSelect(product.id)}
                  onMouseEnter={() => handleProductHover(product)}
                  onMouseLeave={handleProductLeave}
                  disabled={isPurchasing || isSelected}
                  className="group relative overflow-hidden rounded-xl py-2.5 px-3 text-center transition-all hover:-translate-y-[1px] active:translate-y-[1px] disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{
                    background: `linear-gradient(145deg, ${primaryColor}dd, ${secondaryColor}cc)`,
                    boxShadow: `
                      0 0 20px ${primaryColor}60,
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
                  {/* 特典名（長い場合は小さいフォントで2行表示） */}
                  <div
                    className="relative font-black text-white tracking-wider drop-shadow-lg"
                    style={{
                      fontSize: isLongName ? '11px' : '16px',
                      lineHeight: isLongName ? '1.2' : '1',
                      minHeight: isLongName ? '26px' : 'auto',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      wordBreak: 'break-word',
                      overflowWrap: 'break-word'
                    }}
                  >
                    {productName}
                  </div>
                  <div className="relative mt-0.5 text-xs text-white font-bold drop-shadow">{price}</div>
                  {isSelected && (
                    <div className="relative mt-1 text-[10px] text-yellow-300">
                      {isPurchasing ? "受け取り中..." : "選択済み"}
                    </div>
                  )}
                </button>
              );
            })
          )}
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
              <h3 className="font-bold text-yellow-300/90" style={{ textShadow: "0 0 10px rgba(253,224,71,0.5)" }}>特典取出し口</h3>
              <span
                className="rounded-full px-3 py-1.5 text-xs font-bold text-white"
                style={{
                  background: "linear-gradient(145deg, #dc2626, #991b1b)",
                  boxShadow: "0 2px 8px rgba(220,38,38,0.4), inset 0 1px 0 rgba(255,255,255,0.2)",
                }}
              >
                {selectedProducts.length}個の特典
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
              {purchasedProducts.length > 0 ? (
                <div className="space-y-3 text-sm text-white/80">
                  {purchasedProducts.map((product) => (
                    <div key={product.id} className="rounded-lg p-3 bg-emerald-900/20 border border-emerald-500/30">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-bold text-emerald-300">✅ {product.name}</span>
                      </div>
                      <a
                        href={product.downloadUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block text-xs text-blue-400 hover:text-blue-300 underline break-all"
                      >
                        🔗 ダウンロードURL: {product.downloadUrl}
                      </a>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center text-sm text-white/30">
                  <p className="mb-2">📦 受け取った特典がここに表示されます</p>
                  <p>上の特典ボタンから受け取ってください</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ===== 受け取り履歴リンク ===== */}
      {address && (
        <div className="relative z-10 px-5 pb-6">
          <a
            href="/claim-history"
            className="block text-center py-3 px-4 rounded-xl transition-all hover:-translate-y-[1px] active:translate-y-[1px]"
            style={{
              background: "linear-gradient(145deg, rgba(59, 130, 246, 0.15), rgba(37, 99, 235, 0.15))",
              border: "1px solid rgba(59, 130, 246, 0.3)",
              boxShadow: "0 2px 8px rgba(59, 130, 246, 0.2)",
              color: "#60A5FA",
              fontSize: 14,
              fontWeight: 600
            }}
          >
            📜 受け取り履歴を確認
          </a>
        </div>
      )}

      {/* ===== GIFTERRA AI アシスタント ===== */}
      <GIFTERRAAIAssistant />

      {/* ===== 確認ダイアログ ===== */}
      {confirmingProduct && (
        <PurchaseConfirmDialog
          product={confirmingProduct}
          onConfirm={handleConfirmPurchase}
          onCancel={handleConfirmCancel}
        />
      )}

      {/* ===== 購入完了アニメーション ===== */}
      {completedPurchase && (
        <PurchaseCompleteAnimation
          product={completedPurchase.product}
          downloadUrl={completedPurchase.downloadUrl}
          onClose={handleCompleteClose}
        />
      )}
    </VendingMachineShell>
  );
}