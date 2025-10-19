// src/vending-ui/components/VendingMachineShell.tsx
import type { ReactNode } from "react";

interface VendingMachineShellProps {
  primaryColor: string;
  secondaryColor: string;
  headerTitle: string;
  children: ReactNode;
}

export default function VendingMachineShell({
  primaryColor,
  secondaryColor,
  headerTitle,
  children,
}: VendingMachineShellProps) {
  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-slate-950 text-white">
      {/* --- 背景オーラ（外周グロー／アニメ） --- */}
      <div className="pointer-events-none absolute inset-0">
        {/* メインの大きなオーラ（鼓動） */}
        <div
          className="
            absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2
            w-[1400px] h-[1400px] rounded-full mix-blend-screen
            opacity-60 animate-[glowPulse_7s_ease-in-out_infinite]
          "
          style={{
            background: `radial-gradient(circle at center,
              ${primaryColor}33 0%,
              ${primaryColor}24 35%,
              transparent 70%)`,
          }}
        />
        {/* セカンダリの補助オーラ（位相ずらし） */}
        <div
          className="
            absolute left-1/2 top-[58%] -translate-x-1/2
            w-[1000px] h-[1000px] rounded-full mix-blend-screen
            opacity-50 animate-[glowPulse2_8s_ease-in-out_infinite]
          "
          style={{
            background: `radial-gradient(circle at center,
              ${secondaryColor}2f 0%,
              transparent 65%)`,
          }}
        />
        {/* うっすらコニック光（質感アップ） */}
        <div
          className="
            absolute left-1/2 top-[42%] -translate-x-1/2
            w-[1200px] h-[1200px] rounded-full blur-[180px] opacity-45
          "
          style={{
            background: `conic-gradient(from 0deg,
              ${primaryColor}22, ${secondaryColor}22, ${primaryColor}22)`,
          }}
        />
      </div>

      {/* --- 筐体本体 --- */}
      <div className="relative z-10 flex items-center justify-center min-h-[100svh] p-4">
        <div className="relative w-[420px] max-w-[92vw]">
          {/* 外周ソフトグロー（筐体の外側に深い光） */}
          <div className="pointer-events-none absolute -inset-7 rounded-[30px] shadow-[0_0_180px_60px_rgba(88,113,255,0.28)]" />

          {/* 外枠ネオン輪郭 */}
          <div
            className="pointer-events-none absolute -inset-[3px] rounded-[28px] blur-lg opacity-70"
            style={{
              background: `conic-gradient(from 90deg at 50% 50%, ${primaryColor}, ${secondaryColor}, ${primaryColor})`,
              filter: "saturate(1.2)",
            }}
          />

          {/* 側面リムライト */}
          <div className="pointer-events-none absolute -left-2 top-1/4 h-1/2 w-1 rounded-full bg-white/10 blur-md" />
          <div className="pointer-events-none absolute -right-2 top-1/4 h-1/2 w-1 rounded-full bg-white/10 blur-md" />

          {/* パネル（筐体面） */}
          <div className="relative rounded-[24px] border border-white/10 overflow-hidden shadow-[0_20px_80px_rgba(0,0,0,0.6)]">
            {/* パネルの微グラデ層 */}
            <div
              className="absolute inset-0"
              style={{
                background:
                  "linear-gradient(180deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.02) 60%, rgba(0,0,0,0.2) 100%)",
              }}
            />

            {/* 内側の背景 */}
            <div className="relative bg-slate-900/70 backdrop-blur-xl">
              {/* ヘッダー */}
              <div className="px-5 py-4 border-b border-white/10 bg-black/30">
                <h1 className="text-center font-bold">{headerTitle}</h1>
              </div>

              {/* 子コンポーネント（ディスプレイ、ボタン、取り出し口など） */}
              {children}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}