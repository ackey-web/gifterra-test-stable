// src/metaverse-ui/SpaceIdentifier.tsx
import { type FC } from "react";

interface SpaceInfo {
  spaceId: string;
  spaceName: string;
  description: string;
  isActive: boolean;
}

interface MachineInfo {
  machineId: string;
  machineName: string;
  spaceId: string;
  position?: { x: number; y: number; z: number };
}

interface SpaceIdentifierProps {
  spaceInfo: SpaceInfo | null;
  machineInfo: MachineInfo | null;
  isLoading: boolean;
}

/* ========================================
   🎮 空間・マシン識別コンポーネント
   
   🎯 役割: メタバース空間と自販機の情報を表示
   📍 表示内容: 空間名、マシン名、位置情報、状態
======================================== */

const SpaceIdentifier: FC<SpaceIdentifierProps> = ({
  spaceInfo,
  machineInfo,
  isLoading
}) => {
  if (isLoading) {
    return (
      <div className="flex items-center space-x-4">
        <div className="animate-pulse">
          <div className="h-4 bg-white/20 rounded w-24 mb-2"></div>
          <div className="h-6 bg-white/20 rounded w-32"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center space-x-6">
        {/* 🏰 空間情報 */}
        <div>
          <p className="text-white/60 text-sm">メタバース空間</p>
          <h1 className="text-2xl font-bold text-white flex items-center">
            🏰 {spaceInfo?.spaceName || "未知の空間"}
            {spaceInfo?.isActive && (
              <span className="ml-2 px-2 py-1 bg-green-500/20 text-green-400 text-xs rounded-full border border-green-500/30">
                ACTIVE
              </span>
            )}
          </h1>
          {spaceInfo?.description && (
            <p className="text-white/70 text-sm mt-1">{spaceInfo.description}</p>
          )}
        </div>

        {/* 🏪 マシン情報 */}
        <div className="border-l border-white/20 pl-6">
          <p className="text-white/60 text-sm">デジタル自販機</p>
          <h2 className="text-xl font-bold text-yellow-400 flex items-center">
            🏪 {machineInfo?.machineName || "メイン自販機"}
          </h2>
          
          {/* 📍 位置情報 (あれば表示) */}
          {machineInfo?.position && (
            <p className="text-white/50 text-xs mt-1">
              📍 座標: ({machineInfo.position.x}, {machineInfo.position.y}, {machineInfo.position.z})
            </p>
          )}
        </div>
      </div>

      {/* 🔗 空間ID・マシンID (デバッグ用) */}
      <div className="text-right text-white/40 text-xs">
        <p>Space ID: {spaceInfo?.spaceId || "unknown"}</p>
        <p>Machine ID: {machineInfo?.machineId || "unknown"}</p>
      </div>
    </div>
  );
};

export default SpaceIdentifier;