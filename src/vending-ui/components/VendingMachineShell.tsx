// src/vending-ui/components/VendingMachineShell.tsx
import type { ReactNode } from "react";

interface VendingMachineShellProps {
  primaryColor: string;
  secondaryColor: string;
  headerTitle: string;
  children: ReactNode;
}

/**
 * 自販機の筐体フレーム（中身＝children を差し替え）
 * - 外周グローは index.css の @keyframes glowPulse / glowPulse2 を使用
 * - 背景グローは pointer-events-none で操作を邪魔しない
 */
export default function VendingMachineShell({
  primaryColor,
  secondaryColor,
  headerTitle,
  children,
}: VendingMachineShellProps) {
  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-slate-950 text-white">
      {/* === 背景グロー（アニメ）====================================== */}
      <div className="pointer-events-none absolute inset-0">
        <div
          className="absolute -top-24 left-1/2 h-[1400px] w-[1400px] -translate-x-1/2 rounded-full blur-[64px] opacity-60 animate-[glowPulse_7s_ease-in-out_infinite]"
          style={{
            background: `radial-gradient(ellipse at 50% 50%, ${primaryColor}50, transparent 60%)`,
          }}
        />
        <div
          className="absolute bottom-[-10%] left-1/2 h-[1200px] w-[1200px] -translate-x-1/2 rounded-full blur-[72px] opacity-30 [mix-blend:screen] animate-[glowPulse2_11s_ease-in-out_infinite]"
          style={{
            background: `conic-gradient(from 0deg at 50% 50%, ${secondaryColor}40, transparent, ${primaryColor}40, transparent, ${secondaryColor}40)`,
          }}
        />
      </div>

      {/* === 筐体本体 =============================================== */}
      <div className="relative z-10 flex min-h-[100svh] items-center justify-center p-4">
        {/* 外枠（ベゼル光） */}
        <div className="relative w-[420px] max-w-[92vw]">
          {/* ネオン輪郭 */}
          <div
            className="absolute -inset-[3px] rounded-[28px] blur-lg opacity-70"
            style={{
              background: `conic-gradient(from 90deg at 50% 50%, ${primaryColor}, ${secondaryColor}, ${primaryColor})`,
              filter: "saturate(1.2)",
            }}
          />

          {/* 側面のリムライト */}
          <div className="absolute -left-2 top-1/4 h-1/2 w-1 rounded-full bg-white/10 blur-md" />
          <div className="absolute -right-2 top-1/4 h-1/2 w-1 rounded-full bg-white/10 blur-md" />

          {/* パネル（筐体の面） */}
          <div className="relative overflow-hidden rounded-[24px] border border-white/10 shadow-[0_20px_80px_rgba(0,0,0,0.6)]">
            {/* パネルのグラデ層 */}
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
              <div className="border-b border-white/10 bg-black/30 px-5 py-4">
                <h1 className="text-center font-bold tracking-wide">
                  {headerTitle}
                </h1>
              </div>

              {/* ディスプレイ/ボタン/取り出し口など（親から注入） */}
              {children}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}