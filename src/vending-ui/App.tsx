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
  const { contentSet, vendingMachine, error } = useMetaverseContent(spaceId, machineId);

  // デザイン設定（未設定時のフォールバック）
  const primaryColor = vendingMachine?.settings?.design?.primaryColor || "#8B5CF6"; // 紫
  const secondaryColor = vendingMachine?.settings?.design?.secondaryColor || "#3B82F6"; // 青
  const frameAccent = vendingMachine?.settings?.design?.accentColor || "#22D3EE"; // シアン

  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);

  const handleProductSelect = (productId: string) => {
    if (!selectedProducts.includes(productId)) {
      setSelectedProducts((prev) => [...prev, productId]);
    }
  };

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <div className="text-white text-center">
          <p className="text-xl mb-2">エラーが発生しました</p>
          <p className="text-sm opacity-70">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-slate-950 flex items-center justify-center p-6">
      {/* 背景グロー（ステージ） */}
      <div className="pointer-events-none absolute inset-0">
        <div
          className="absolute -top-20 left-1/2 -translate-x-1/2 w-[1200px] h-[1200px] rounded-full blur-[120px] opacity-25"
          style={{ background: `radial-gradient(ellipse, ${primaryColor}55, transparent 60%)` }}
        />
        <div
          className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[900px] h-[500px] rounded-[50%] blur-[80px] opacity-20"
          style={{ background: `radial-gradient(ellipse, ${secondaryColor}55, transparent 60%)` }}
        />
      </div>

      {/* ─────────────────────────────
          筐体（外枠＋ベゼル＋光沢＋側面ライト）
         ───────────────────────────── */}
      <div className="relative w-[420px] max-w-[92vw]">
        {/* 外枠のネオン輪郭 */}
        <div
          className="absolute -inset-2 rounded-[32px] blur-xl opacity-70"
          style={{
            background: `linear-gradient(135deg, ${primaryColor}80, ${secondaryColor}80)`,
          }}
        />

        {/* 筐体本体（外装） */}
        <div className="relative rounded-[28px] overflow-hidden shadow-[0_40px_120px_rgba(0,0,0,.45)]">
          {/* 外装の金属感グラデ */}
          <div className="absolute inset-0 bg-gradient-to-br from-slate-800 via-slate-900 to-black" />

          {/* 角の光沢（上辺/左辺のハイライト） */}
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute top-0 left-0 right-0 h-[1px] bg-white/10" />
            <div className="absolute top-0 left-0 bottom-0 w-[1px] bg-white/10" />
          </div>

          {/* 側面ライト（左右のネオンバー） */}
          <div className="pointer-events-none absolute inset-y-10 -left-2 w-[6px] rounded-full"
               style={{ background: `linear-gradient(${frameAccent}80, transparent)` }}/>
          <div className="pointer-events-none absolute inset-y-10 -right-2 w-[6px] rounded-full"
               style={{ background: `linear-gradient(transparent, ${frameAccent}80)` }}/>

          {/* ベゼル（内側の縁） */}
          <div className="relative m-2 rounded-[22px] border border-white/10 bg-black/40 backdrop-blur-sm">
            {/* 画面（プレビュー窓） */}
            <div className="p-3">
              <div className="relative h-[260px] rounded-[18px] overflow-hidden border border-white/10 bg-black">
                {/* 画面内のガラス反射 */}
                <div className="pointer-events-none absolute inset-0">
                  <div className="absolute -top-10 -left-10 w-1/2 h-1/2 rotate-12 bg-white/10 blur-3xl" />
                  <div className="absolute bottom-0 right-0 w-2/3 h-1/3 bg-gradient-to-t from-white/5 to-transparent" />
                </div>

                {/* タイトル（画面内上部） */}
                <div className="absolute top-2 left-3 text-xs font-semibold tracking-wide text-white/70">
                  {vendingMachine?.settings?.displayName || vendingMachine?.name || "アート＆3Dコレクション"}
                </div>

                {/* 将来：プレビュー画像や動画をここに描画 */}
                <div className="flex h-full w-full items-center justify-center">
                  <p className="text-white/40 text-sm">プレビュー</p>
                </div>
              </div>
            </div>

            {/* 商品ボタン列 */}
            <div className="px-3 pb-3">
              <div className="grid grid-cols-3 gap-3">
                {(contentSet?.contents && contentSet.contents.length > 0
                  ? contentSet.contents.slice(0, 3)
                  : [0, 1, 2].map((i) => ({
                      contentId: `placeholder-${i}`,
                      requiredTips: null as unknown as number,
                    }))
                ).map((product: any, index: number) => {
                  const label = `${String.fromCharCode(65 + index)}${index + 1}`;
                  const isPlaceholder = typeof product.requiredTips !== "number";
                  return isPlaceholder ? (
                    <div
                      key={label}
                      className="h-12 rounded-xl border border-white/10 bg-gradient-to-br from-slate-700/30 to-slate-900/40 text-center flex flex-col items-center justify-center opacity-60"
                      style={{ boxShadow: `inset 0 0 0 1px ${primaryColor}26` }}
                    >
                      <div className="text-white/80 text-sm font-bold">{label}</div>
                      <div className="text-[11px] text-white/50 mt-0.5">準備中</div>
                    </div>
                  ) : (
                    <button
                      key={product.contentId}
                      onClick={() => handleProductSelect(product.contentId)}
                      className="h-12 rounded-xl text-center flex flex-col items-center justify-center transition-transform active:scale-[0.98]"
                      style={{
                        background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})`,
                        boxShadow:
                          "0 8px 24px rgba(0,0,0,.35), inset 0 0 0 1px rgba(255,255,255,.12)",
                      }}
                    >
                      <div className="text-white text-sm font-extrabold drop-shadow">{label}</div>
                      <div className="text-[11px] text-white/90 mt-0.5">
                        {product.requiredTips} tNHT
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* インフォ・操作エリア（残高／ウォレット） */}
            <div className="px-3 pb-3">
              <div className="flex gap-3">
                {/* 残高 */}
                <div
                  className="flex-1 rounded-xl border bg-gradient-to-br from-emerald-500 to-emerald-600 text-white py-3 px-4"
                  style={{ borderColor: "rgba(255,255,255,.12)" }}
                >
                  <div className="text-[11px] opacity-85">残高</div>
                  <div className="text-lg font-bold tracking-wide">0.0000 tNHT</div>
                </div>

                {/* ウォレット */}
                {address ? (
                  <div
                    className="flex-1 rounded-xl border bg-gradient-to-br from-amber-500 to-amber-600 text-white py-3 px-4"
                    style={{ borderColor: "rgba(255,255,255,.12)" }}
                  >
                    <div className="text-[11px] opacity-85">🦊 接続中</div>
                    <div className="text-sm font-semibold truncate">
                      {address.slice(0, 6)}…{address.slice(-4)}
                    </div>
                  </div>
                ) : (
                  <div className="flex-1">
                    <ConnectWallet theme="dark" btnTitle="接続" className="w-full" />
                  </div>
                )}
              </div>
            </div>

            {/* 取出口（商品リスト） */}
            <div className="px-3 pb-4">
              <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-3">
                {/* 見出しバー（取出口プレート） */}
                <div className="mb-3 flex items-center justify-between">
                  <div
                    className="text-[13px] font-extrabold tracking-wider text-amber-300 px-3 py-1 rounded-md"
                    style={{ background: "linear-gradient(180deg, #1f2937, #0b1220)" }}
                  >
                    商品取出し口
                  </div>
                  <div className="text-[11px] text-white/90 bg-rose-500/90 px-2 py-1 rounded-full">
                    {selectedProducts.length}個の商品
                  </div>
                </div>

                {/* 取出口の内側（段差＋ガラスガード） */}
                <div className="relative rounded-xl border border-white/5 bg-black/60 p-4 min-h-[100px]">
                  <div className="pointer-events-none absolute inset-0 rounded-xl">
                    <div className="absolute inset-x-0 top-0 h-[18px] bg-gradient-to-b from-white/8 to-transparent rounded-t-xl" />
                    <div className="absolute inset-y-0 right-0 w-[1px] bg-white/10" />
                  </div>

                  {selectedProducts.length > 0 ? (
                    <div className="space-y-2 text-sm text-white/80">
                      {selectedProducts.map((id) => {
                        const p = contentSet?.contents.find((x) => x.contentId === id);
                        return (
                          <div
                            key={id}
                            className="flex items-center justify-between rounded-lg border border-white/10 bg-slate-800/40 px-3 py-2"
                          >
                            <span>✅ {p?.name ?? "選択商品"}</span>
                            <span className="text-white/60 text-xs">
                              {typeof p?.requiredTips === "number" ? `${p?.requiredTips} tNHT` : ""}
                            </span>
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

          {/* 足元の影（筐体を床に置いた感じ） */}
          <div className="absolute -bottom-6 left-1/2 h-6 w-3/4 -translate-x-1/2 rounded-full opacity-60 blur-md"
               style={{ background: "radial-gradient(ellipse at center, rgba(0,0,0,.55), transparent 70%)" }}/>

          {/* ロゴやシールを置く帯（任意） */}
          <div className="absolute -left-1 top-[52px] h-[60px] w-[6px] rounded-r-full"
               style={{ background: `linear-gradient(${primaryColor}AA, transparent)` }}/>
          <div className="absolute -right-1 top-[120px] h-[90px] w-[6px] rounded-l-full"
               style={{ background: `linear-gradient(transparent, ${secondaryColor}AA)` }}/>
        </div>
      </div>
    </div>
  );
}