// src/vending-ui/App.tsx
import { useEffect, useState } from "react";
import {
  ConnectWallet,
  useAddress,
  useContract,
  useContractWrite,
} from "@thirdweb-dev/react";
import { CONTRACT_ADDRESS, CONTRACT_ABI } from "../contract";
import { ethers } from "ethers";
import { tipSuccessConfetti } from "../utils/confetti";
import "./VendingMachine.css";

/* ========================================
   🏪 GIFTERRA 自販機 UI システム
   
   🎯 用途: 本格的な自販機体験でデジタルコンテンツを販売
   🔗 URL: /vending/machine-1, /vending/machine-2, /vending/machine-3
   ⚡ 機能: 商品購入 + 制限付きダウンロード配布
======================================== */

interface Product {
  slot: 'A' | 'B' | 'C';
  title: string;
  price: number; // ETH単位
  buttonLabel: string; // "A1", "B2", "C3"
  isActive: boolean;
  fileType: 'GLB' | 'MP3' | 'IMAGE' | 'ZIP';
}

interface VendingMachine {
  id: number;
  name: string;
  slug: string;
  displayImage: string; // 837x768比率の商品画像
  headerImage?: string; // カスタムヘッダー画像
  backgroundImage?: string; // 背景画像
  products: Product[];
  isActive: boolean;
}

interface DownloadItem {
  id: string;
  filename: string;
  fileType: string;
  downloadUrl: string;
  expiresAt: Date;
  isExpired: boolean;
}

// モック自販機データ（後でSupabaseから取得）
const MOCK_MACHINES: VendingMachine[] = [
  {
    id: 1,
    name: "アート & 3D コレクション",
    slug: "machine-1", 
    displayImage: "https://via.placeholder.com/837x768/2a2a2a/FFD700?text=ART+%26+3D+COLLECTION",
    headerImage: "https://via.placeholder.com/400x120/1a1a1a/FFD700?text=EXCLUSIVE+ART+COLLECTION",
    backgroundImage: "https://via.placeholder.com/1920x1080/1a1a1a/333333?text=BACKGROUND",
    isActive: true,
    products: [
      {
        slot: 'A',
        title: "限定3Dモデル",
        price: 0.01,
        buttonLabel: "A1",
        isActive: true,
        fileType: 'GLB'
      },
      {
        slot: 'B', 
        title: "プレミアムBGM",
        price: 0.02,
        buttonLabel: "B2",
        isActive: true,
        fileType: 'MP3'
      },
      {
        slot: 'C',
        title: "デジタルアート",
        price: 0.05,
        buttonLabel: "C3", 
        isActive: true,
        fileType: 'IMAGE'
      }
    ]
  },
  {
    id: 2,
    name: "ゲーム & エンタメ",
    slug: "machine-2",
    displayImage: "https://via.placeholder.com/837x768/2a2a2a/9370DB?text=GAME+%26+ENTERTAINMENT",
    headerImage: "https://via.placeholder.com/400x120/1a1a1a/9370DB?text=GAME+COLLECTION",
    backgroundImage: "https://via.placeholder.com/1920x1080/1a1a2a/444444?text=GAME+BACKGROUND",
    isActive: true,
    products: [
      {
        slot: 'A',
        title: "ゲームアセット",
        price: 0.03,
        buttonLabel: "A1",
        isActive: true,
        fileType: 'ZIP'
      },
      {
        slot: 'B',
        title: "効果音パック", 
        price: 0.015,
        buttonLabel: "B2",
        isActive: true,
        fileType: 'MP3'
      },
      {
        slot: 'C',
        title: "キャラクター3D",
        price: 0.08,
        buttonLabel: "C3",
        isActive: true,
        fileType: 'GLB'
      }
    ]
  },
  {
    id: 3,
    name: "クリエイター限定",
    slug: "machine-3",
    displayImage: "https://via.placeholder.com/837x768/2a2a2a/FF8C00?text=CREATOR+EXCLUSIVE",
    headerImage: "https://via.placeholder.com/400x120/1a1a1a/FF8C00?text=CREATOR+COLLECTION",
    backgroundImage: "https://via.placeholder.com/1920x1080/2a1a1a/555555?text=CREATOR+BACKGROUND",
    isActive: true,
    products: [
      {
        slot: 'A',
        title: "制作ツール",
        price: 0.06,
        buttonLabel: "A1",
        isActive: true,
        fileType: 'ZIP'
      },
      {
        slot: 'B',
        title: "テンプレート集",
        price: 0.04,
        buttonLabel: "B2",
        isActive: true,
        fileType: 'ZIP'
      },
      {
        slot: 'C',
        title: "限定エディション",
        price: 0.1,
        buttonLabel: "C3",
        isActive: true,
        fileType: 'GLB'
      }
    ]
  }
];

export default function VendingApp() {
  const address = useAddress();
  const { contract } = useContract(CONTRACT_ADDRESS, CONTRACT_ABI);
  const { mutateAsync: sendTip } = useContractWrite(contract, "sendTip");
  
  // URLから自販機IDを取得
  const machineSlug = window.location.pathname.split('/').pop() || 'machine-1';
  const machine = MOCK_MACHINES.find(m => m.slug === machineSlug) || MOCK_MACHINES[0];
  
  const [balance, setBalance] = useState<string>("0.0");
  const [downloads, setDownloads] = useState<DownloadItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isPurchasing, setIsPurchasing] = useState(false);

  // ウォレット残高取得
  useEffect(() => {
    if (address && window.ethereum) {
      const updateBalance = async () => {
        try {
          const provider = new ethers.providers.Web3Provider(window.ethereum);
          const balance = await provider.getBalance(address);
          setBalance(ethers.utils.formatEther(balance));
        } catch (error) {
          console.error("残高取得エラー:", error);
        }
      };
      updateBalance();
    }
  }, [address]);

  // 商品購入処理
  const handlePurchase = async (product: Product) => {
    if (!address || !contract) {
      alert("ウォレットを接続してください");
      return;
    }

    if (isPurchasing) {
      alert('処理中です。しばらくお待ちください。');
      return;
    }

    setIsPurchasing(true);
    setIsLoading(true);
    try {
      // ETHをweiに変換
      const priceInWei = ethers.utils.parseEther(product.price.toString());
      
      console.log(`🛒 購入処理開始: ${product.title} (${product.price} ETH)`);
      
      // トランザクション送信
      const tx = await sendTip({ 
        overrides: {
          value: priceInWei,
        }
      });

      console.log("📝 トランザクション送信完了:", tx.receipt?.transactionHash);
      
      // 購入成功エフェクト
      tipSuccessConfetti();
      
      // モックダウンロードアイテム生成（実際はAPIで生成）
      const downloadItem: DownloadItem = {
        id: Date.now().toString(),
        filename: `${product.title.replace(/\s/g, '_')}.${product.fileType.toLowerCase()}`,
        fileType: product.fileType,
        downloadUrl: "#", // 実際のダウンロードURL
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24時間後
        isExpired: false
      };
      
      setDownloads(prev => [...prev, downloadItem]);
      
      alert(`🎉 ${product.title} を購入しました！\n取り出し口をご確認ください。`);
      
    } catch (error: any) {
      console.error("購入エラー:", error);
      alert(`購入に失敗しました: ${error.message || '不明なエラー'}`);
    } finally {
      setIsLoading(false);
      setIsPurchasing(false);
    }
  };

  // ファイルアイコン取得
  const getFileIcon = (fileType: string): string => {
    const icons: Record<string, string> = {
      'GLB': '🗿',
      'MP3': '🎵', 
      'IMAGE': '🎨',
      'ZIP': '📦'
    };
    return icons[fileType] || '📄';
  };

  // 有効期限フォーマット
  const formatExpiry = (date: Date): string => {
    const diff = date.getTime() - Date.now();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (diff <= 0) return "期限切れ";
    if (hours > 0) return `${hours}時間${minutes}分`;
    return `${minutes}分`;
  };

  return (
    <div className="vending-app" style={{
      backgroundImage: machine.backgroundImage ? `url(${machine.backgroundImage})` : 'none',
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      backgroundRepeat: 'no-repeat',
      minHeight: '100vh',
      padding: '20px 0'
    }}>
    <div className="vending-machine">
      {/* 統合商品表示エリア（837×768比率） */}
      <div className="unified-display">
        <div className="main-image-container">
          <img 
            src={machine.displayImage} 
            alt={machine.name}
            className="main-display-image"
          />
        </div>
      </div>

      {/* コンパクト購入ボタンエリア（外部配置） */}
      <div className="compact-buttons">
        {machine.products.map(product => (
          <button 
            key={product.slot}
            className={`compact-purchase-btn ${(!product.isActive || isPurchasing) ? 'disabled' : ''}`}
            onClick={() => handlePurchase(product)}
            disabled={!product.isActive || isLoading || isPurchasing}
            title={`${product.title} - ${product.price} tNHT`}
          >
            <span className="button-label">{product.buttonLabel}</span>
            <span className="button-price">{product.price} tNHT</span>
          </button>
        ))}
      </div>

      {/* ウォレット接続エリア */}
      <div className="wallet-section">
        {/* ギフテラロゴ */}
        <img 
          src="https://avatars.githubusercontent.com/u/182478703?s=200&v=4" 
          alt="Gifterra Logo" 
          className="gifterra-logo"
        />
        
        {/* 残高表示 */}
        {address && (
          <div className="balance-display">
            {parseFloat(balance).toFixed(4)} tNHT
          </div>
        )}
        
        {/* 接続ボタン */}
        <ConnectWallet 
          theme="dark"
          btnTitle="ウォレット接続"
          className="connect-wallet-btn"
        />
      </div>

      {/* 取り出し口 */}
      <div className="pickup-area">
        <div className="pickup-header">
          <h3>商品取出し口</h3>
          <span className="pickup-count">{downloads.length}個の商品</span>
        </div>
        <div className="pickup-tray">
          {downloads.length === 0 ? (
            <div className="empty-tray">
              <p>🛒 購入した商品がここに表示されます</p>
              <p>上の商品ボタンから購入してください</p>
            </div>
          ) : (
            downloads.map(item => (
              <div key={item.id} className="download-item">
                <div className="item-icon">
                  {getFileIcon(item.fileType)}
                </div>
                <div className="item-details">
                  <span className="filename">{item.filename}</span>
                  <span className="expiry">
                    有効期限: {formatExpiry(item.expiresAt)}
                  </span>
                </div>
                <button 
                  className={`download-btn ${item.isExpired ? 'expired' : ''}`}
                  onClick={() => {
                    if (!item.isExpired) {
                      // 実際のダウンロード処理
                      alert(`${item.filename} のダウンロードを開始します`);
                    }
                  }}
                  disabled={item.isExpired}
                >
                  {item.isExpired ? '期限切れ' : '📥 DOWNLOAD'}
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
    </div>
  );
}