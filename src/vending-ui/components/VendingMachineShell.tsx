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
      {/* 背景グロー */}
      <div className="pointer-events-none absolute inset-0">
        <div
          className="absolute -top-20 left-1/2 -translate-x-1/2 w-[1200px] h-[1200px] rounded-full blur-3xl opacity-30"
          style={{ background: `radial-gradient(ellipse, ${primaryColor}55, transparent 60%)` }}
        />
        <div
          className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[900px] h-[900px] rounded-full blur-3xl opacity-30"
          style={{ background: `radial-gradient(ellipse, ${secondaryColor}55, transparent 60%)` }}
        />
      </div>

      {/* 筐体本体 */}
      <div className="relative z-10 flex items-center justify-center min-h-[100svh] p-4">
        {/* 外枠 + ベゼル光沢 + 側面ライト */}
        <div className="relative w-[420px] max-w-[92vw]">
          {/* 枠のネオン輪郭 */}
          <div
            className="absolute -inset-[3px] rounded-[28px] blur-lg opacity-70"
            style={{
              background: `conic-gradient(from 90deg at 50% 50%, ${primaryColor}, ${secondaryColor}, ${primaryColor})`,
              filter: "saturate(1.2)",
            }}
          />
          {/* 側面リムライト */}
          <div className="absolute -left-2 top-1/4 h-1/2 w-1 rounded-full bg-white/10 blur-md" />
          <div className="absolute -right-2 top-1/4 h-1/2 w-1 rounded-full bg-white/10 blur-md" />

          {/* パネル（筐体面） */}
          <div className="relative rounded-[24px] border border-white/10 overflow-hidden shadow-[0_20px_80px_rgba(0,0,0,0.6)]">
            {/* パネルのグラデ */}
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
