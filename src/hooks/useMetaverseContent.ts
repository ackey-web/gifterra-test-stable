// src/hooks/useMetaverseContent.ts
import { useState, useEffect } from "react";

// 🗄️ 型定義
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
  contentSetId: string;
}

interface DigitalContent {
  contentId: string;
  name: string;
  type: "GLB" | "MP3" | "PNG" | "PDF" | "ZIP";
  description?: string;
  fileSize?: string;
  requiredTips: number;
  metadata?: {
    author?: string;
    createdAt?: string;
    tags?: string[];
  };
}

interface ContentSet {
  contentSetId: string;
  name: string;
  description: string;
  contents: DigitalContent[];
}

/* ========================================
   🎮 メタバースコンテンツ管理フック
   
   🎯 役割: 空間・マシン・コンテンツ情報の管理
   📦 機能: モックデータ提供 (将来的にAPI連携)
======================================== */

// 🏗️ モックデータ - 実際の実装では外部APIまたはコントラクトから取得
const MOCK_SPACES: Record<string, SpaceInfo> = {
  "world-1": {
    spaceId: "world-1",
    spaceName: "メインワールド",
    description: "ギフテラの中心となるメタバース空間",
    isActive: true,
  },
  "gallery-a": {
    spaceId: "gallery-a", 
    spaceName: "アートギャラリー",
    description: "クリエイター作品を展示するアート空間",
    isActive: true,
  },
  "game-zone": {
    spaceId: "game-zone",
    spaceName: "ゲームゾーン", 
    description: "ゲーム関連コンテンツの配布エリア",
    isActive: true,
  },
  "default": {
    spaceId: "default",
    spaceName: "デフォルト空間",
    description: "標準的なコンテンツ配布空間",
    isActive: true,
  }
};

const MOCK_MACHINES: Record<string, MachineInfo> = {
  "entrance-01": {
    machineId: "entrance-01",
    machineName: "エントランス自販機",
    spaceId: "world-1",
    position: { x: 0, y: 0, z: 5 },
    contentSetId: "starter-pack",
  },
  "vip-lounge": {
    machineId: "vip-lounge", 
    machineName: "VIPラウンジ",
    spaceId: "world-1",
    position: { x: 10, y: 2, z: -5 },
    contentSetId: "premium-collection",
  },
  "gallery-01": {
    machineId: "gallery-01",
    machineName: "ギャラリー自販機",
    spaceId: "gallery-a",
    position: { x: -5, y: 0, z: 0 },
    contentSetId: "art-collection",
  },
  "creator-corner": {
    machineId: "creator-corner",
    machineName: "クリエーターコーナー", 
    spaceId: "gallery-a",
    position: { x: 5, y: 1, z: 3 },
    contentSetId: "creator-pack",
  },
  "main": {
    machineId: "main",
    machineName: "メイン自販機",
    spaceId: "default", 
    contentSetId: "starter-pack",
  }
};

const MOCK_CONTENT_SETS: Record<string, ContentSet> = {
  "starter-pack": {
    contentSetId: "starter-pack",
    name: "スターターパック",
    description: "初心者向けの基本コンテンツセット",
    contents: [
      {
        contentId: "avatar-basic-001",
        name: "ベーシックアバター.glb",
        type: "GLB",
        description: "初心者向けの3Dアバターモデル",
        fileSize: "2.4MB",
        requiredTips: 50,
        metadata: {
          author: "Gifterra Team",
          createdAt: "2024-01-15",
          tags: ["avatar", "basic", "3d"]
        }
      },
      {
        contentId: "welcome-sound-001", 
        name: "ウェルカムサウンド.mp3",
        type: "MP3",
        description: "ギフテラへようこそのBGM",
        fileSize: "3.2MB",
        requiredTips: 25,
        metadata: {
          author: "Sound Designer",
          createdAt: "2024-01-10",
          tags: ["music", "welcome", "bgm"]
        }
      }
    ]
  },
  "premium-collection": {
    contentSetId: "premium-collection", 
    name: "プレミアムコレクション",
    description: "限定的なプレミアムコンテンツ",
    contents: [
      {
        contentId: "avatar-premium-001",
        name: "プレミアムアバター.glb", 
        type: "GLB",
        description: "高品質なプレミアム3Dアバター",
        fileSize: "8.7MB",
        requiredTips: 500,
        metadata: {
          author: "Premium Artist",
          createdAt: "2024-02-01",
          tags: ["avatar", "premium", "limited"]
        }
      },
      {
        contentId: "exclusive-bgm-001",
        name: "限定BGM.mp3",
        type: "MP3", 
        description: "VIP専用のオリジナルBGM",
        fileSize: "5.1MB",
        requiredTips: 300,
        metadata: {
          author: "Exclusive Composer",
          createdAt: "2024-02-05",
          tags: ["music", "exclusive", "vip"]
        }
      },
      {
        contentId: "special-item-001",
        name: "スペシャルアイテム.glb",
        type: "GLB",
        description: "特別な3Dアクセサリー",
        fileSize: "4.2MB", 
        requiredTips: 200,
        metadata: {
          author: "Item Designer",
          createdAt: "2024-02-10",
          tags: ["item", "accessory", "special"]
        }
      }
    ]
  },
  "art-collection": {
    contentSetId: "art-collection",
    name: "アートコレクション", 
    description: "アーティスト作品のデジタルコレクション",
    contents: [
      {
        contentId: "art-glb-001",
        name: "限定アート作品.glb",
        type: "GLB",
        description: "著名アーティストの3D作品",
        fileSize: "12.3MB",
        requiredTips: 100,
        metadata: {
          author: "Famous Artist",
          createdAt: "2024-01-20",
          tags: ["art", "sculpture", "limited"]
        }
      }
    ]
  },
  "creator-pack": {
    contentSetId: "creator-pack",
    name: "クリエーターパック",
    description: "クリエイター制作のオリジナルコンテンツ",
    contents: [
      {
        contentId: "creator-bgm-001",
        name: "制作者オリジナルBGM.mp3",
        type: "MP3",
        description: "クリエイターによるオリジナル楽曲",
        fileSize: "4.8MB",
        requiredTips: 150,
        metadata: {
          author: "Indie Creator",
          createdAt: "2024-01-25", 
          tags: ["music", "original", "creator"]
        }
      }
    ]
  }
};

export const useMetaverseContent = (spaceId: string, machineId: string) => {
  const [spaceInfo, setSpaceInfo] = useState<SpaceInfo | null>(null);
  const [machineInfo, setMachineInfo] = useState<MachineInfo | null>(null);
  const [contentSet, setContentSet] = useState<ContentSet | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadContent = async () => {
      setIsLoading(true);
      setError(null);

      try {
        // 🏰 空間情報取得
        const space = MOCK_SPACES[spaceId];
        if (!space) {
          throw new Error(`Space not found: ${spaceId}`);
        }
        setSpaceInfo(space);

        // 🏪 マシン情報取得
        const machine = MOCK_MACHINES[machineId];
        if (!machine) {
          throw new Error(`Machine not found: ${machineId}`);
        }
        
        // マシンが指定された空間に属しているかチェック
        if (machine.spaceId !== spaceId && spaceId !== "default") {
          console.warn(`Machine ${machineId} belongs to space ${machine.spaceId}, but requested space is ${spaceId}`);
        }
        setMachineInfo(machine);

        // 📦 コンテンツセット取得
        const content = MOCK_CONTENT_SETS[machine.contentSetId];
        if (!content) {
          throw new Error(`Content set not found: ${machine.contentSetId}`);
        }
        setContentSet(content);

      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error occurred");
      } finally {
        setIsLoading(false);
      }
    };

    loadContent();
  }, [spaceId, machineId]);

  return {
    spaceInfo,
    machineInfo, 
    contentSet,
    isLoading,
    error
  };
};