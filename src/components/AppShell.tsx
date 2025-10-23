// src/components/AppShell.tsx
// リワードUI・TIP UI共通のモダンなシェルコンポーネント
import type { ReactNode } from "react";

interface AppShellProps {
  backgroundImage?: string;
  accentColor?: string; // メインアクセントカラー（グロー用）
  title: string;
  subtitle?: string;
  children: ReactNode;
}

/**
 * モダンでスマートなアプリケーションシェル
 * - GIFT HUBと統一感のあるダークメタルデザイン
 * - 背景画像に対してテキスト視認性を確保
 * - レスポンシブ対応
 * - ロゴ画像不要（背景が総柄のため）
 */
export default function AppShell({
  backgroundImage,
  accentColor = "#8B5CF6", // デフォルト: パープル
  title,
  subtitle,
  children,
}: AppShellProps) {
  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-slate-950 text-white">
      {/* === 背景画像 (総柄) ====================================== */}
      {backgroundImage && (
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-25"
          style={{
            backgroundImage: `url(${backgroundImage})`,
          }}
        />
      )}

      {/* === 背景グロー効果 ====================================== */}
      <div className="pointer-events-none absolute inset-0">
        {/* メインオーラ（上部）*/}
        <div
          className="absolute -top-24 left-1/2 h-[1000px] w-[1000px] -translate-x-1/2 rounded-full blur-[80px] opacity-40 animate-[glowPulse_7s_ease-in-out_infinite]"
          style={{
            background: `radial-gradient(ellipse at 50% 50%, ${accentColor}40, transparent 60%)`,
          }}
        />
        {/* サブオーラ（下部）*/}
        <div
          className="absolute bottom-0 left-1/2 h-[800px] w-[800px] -translate-x-1/2 rounded-full blur-[72px] opacity-20 animate-[glowPulse2_11s_ease-in-out_infinite]"
          style={{
            background: `radial-gradient(ellipse at 50% 50%, ${accentColor}30, transparent 70%)`,
          }}
        />
      </div>

      {/* === メインコンテンツ =============================================== */}
      <div className="relative z-10 flex min-h-screen items-center justify-center p-4 sm:p-6">
        {/* コンテンツカード */}
        <div className="w-full max-w-[420px] sm:max-w-[480px]">
          {/* ネオン輪郭（静的）*/}
          <div
            className="absolute -inset-[2px] rounded-[24px] blur-md opacity-60"
            style={{
              background: `linear-gradient(135deg, ${accentColor}80, ${accentColor}40)`,
            }}
          />

          {/* カードパネル（ダークメタル筐体）*/}
          <div
            className="relative overflow-hidden rounded-[20px]"
            style={{
              background: "linear-gradient(145deg, rgba(26, 31, 46, 0.95), rgba(15, 20, 25, 0.95))",
              boxShadow: `
                0 20px 50px rgba(0,0,0,0.6),
                inset 0 1px 0 rgba(255,255,255,0.06),
                inset 0 -1px 2px rgba(0,0,0,0.4)
              `,
              border: "1px solid rgba(255,255,255,0.06)",
              backdropFilter: "blur(12px)",
            }}
          >
            {/* 金属反射レイヤー */}
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                background: `
                  linear-gradient(165deg,
                    transparent 0%,
                    rgba(255,255,255,0.02) 20%,
                    transparent 40%,
                    rgba(255,255,255,0.01) 70%,
                    transparent 100%
                  )
                `,
              }}
            />

            {/* ヘッダーセクション */}
            <div
              className="relative px-6 py-8 sm:px-8 sm:py-10 text-center border-b"
              style={{
                borderColor: "rgba(255,255,255,0.06)",
                background: "linear-gradient(180deg, rgba(255,255,255,0.02) 0%, transparent 100%)",
              }}
            >
              <h1
                className="text-2xl sm:text-3xl font-bold mb-2"
                style={{
                  background: `linear-gradient(135deg, #ffffff, ${accentColor}40)`,
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                  textShadow: "0 2px 10px rgba(0,0,0,0.3)",
                }}
              >
                {title}
              </h1>
              {subtitle && (
                <p className="text-sm sm:text-base text-white/70 font-medium">
                  {subtitle}
                </p>
              )}
            </div>

            {/* コンテンツエリア */}
            <div className="relative px-5 py-6 sm:px-7 sm:py-8">
              {children}
            </div>

            {/* ボトムグロー */}
            <div
              className="absolute bottom-0 left-0 right-0 h-1 opacity-50"
              style={{
                background: `linear-gradient(90deg, transparent, ${accentColor}60, transparent)`,
                filter: "blur(4px)",
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
