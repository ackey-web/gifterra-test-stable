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
  
  // URLから自販機IDを取得（管理画面からのプレビュー対応）
  const urlParams = new URLSearchParams(window.location.search);
  const machineParam = urlParams.get('machine');
  const machineSlug = machineParam || window.location.pathname.split('/').pop() || 'machine-1';
  
  // 管理画面のデータを取得（プレビュー時）
  const getAdminMachineData = () => {
    try {
      // localStorage から管理画面のデータを取得
      const adminData = localStorage.getItem('gifterra-admin-machines');
      if (adminData) {
        const machines = JSON.parse(adminData);
        const adminMachine = machines.find((m: any) => m.slug === machineSlug);
        if (adminMachine) {
          console.log('管理画面データ:', adminMachine);
          console.log('背景画像URL:', adminMachine.theme.backgroundImageUrl);
          console.log('自販機画像URL:', adminMachine.theme.machineImageUrl);
          
          // 管理画面のデータ形式を自販機UI用に変換
          return {
            id: parseInt(adminMachine.id.replace('vm_', '')) || 1,
            name: adminMachine.name,
            slug: adminMachine.slug,
            displayImage: adminMachine.theme.machineImageUrl || "https://via.placeholder.com/837x768/2a2a2a/FFD700?text=" + encodeURIComponent(adminMachine.name),
            headerImage: adminMachine.theme.logoUrl,
            backgroundImage: adminMachine.theme.backgroundImageUrl,
            isActive: adminMachine.isPublished,
            products: [
              {
                slot: 'A' as const,
                title: "商品A", 
                price: 0.01,
                buttonLabel: "A1",
                isActive: true,
                fileType: 'GLB' as const
              },
              {
                slot: 'B' as const,
                title: "商品B",
                price: 0.02, 
                buttonLabel: "B2",
                isActive: true,
                fileType: 'MP3' as const
              },
              {
                slot: 'C' as const,
                title: "商品C",
                price: 0.05,
                buttonLabel: "C3",
                isActive: true,
                fileType: 'IMAGE' as const
              }
            ]
          };
        }
      }
    } catch (error) {
      console.log('管理画面データの取得に失敗、モックデータを使用:', error);
    }
    return null;
  };
  
  // 管理画面のデータがあればそれを使用、なければモックデータ
  const adminMachine = getAdminMachineData();
  const machine = adminMachine || MOCK_MACHINES.find(m => m.slug === machineSlug) || MOCK_MACHINES[0];
  
  const [balance, setBalance] = useState<string>("0.0");
  const [downloads, setDownloads] = useState<DownloadItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isPurchasing, setIsPurchasing] = useState(false);

  // tNHTトークン残高取得
  useEffect(() => {
    if (address && window.ethereum) {
      const updateBalance = async () => {
        try {
          const provider = new ethers.providers.Web3Provider(window.ethereum);
          // tNHTトークンコントラクトアドレス
          const tNHTAddress = "0xdB738C7A83FE7738299a67741Ae2AbE42B3BA2Ea"; // tNHTトークンアドレス
          const tokenABI = [
            "function balanceOf(address owner) view returns (uint256)",
            "function decimals() view returns (uint8)"
          ];
          
          const tokenContract = new ethers.Contract(tNHTAddress, tokenABI, provider);
          const balance = await tokenContract.balanceOf(address);
          const decimals = await tokenContract.decimals();
          const formattedBalance = ethers.utils.formatUnits(balance, decimals);
          // 小数点以下切り捨て
          const integerBalance = Math.floor(parseFloat(formattedBalance));
          setBalance(integerBalance.toString());
        } catch (error) {
          console.error("tNHT残高取得エラー:", error);
          // フォールバック: POL残高を表示
          try {
            const provider = new ethers.providers.Web3Provider(window.ethereum);
            const balance = await provider.getBalance(address);
            const formattedBalance = ethers.utils.formatEther(balance);
            // 小数点以下切り捨て
            const integerBalance = Math.floor(parseFloat(formattedBalance));
            setBalance(integerBalance.toString());
          } catch (fallbackError) {
            console.error("POL残高取得エラー:", fallbackError);
          }
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

  // 管理画面のテーマカラーを取得
  const getThemeColors = () => {
    if (adminMachine) {
      try {
        const adminData = localStorage.getItem('gifterra-admin-machines');
        if (adminData) {
          const machines = JSON.parse(adminData);
          const adminMachineData = machines.find((m: any) => m.slug === machineSlug);
          if (adminMachineData?.theme) {
            return {
              primary: adminMachineData.theme.primaryColor || '#3b82f6',
              background: adminMachineData.theme.backgroundColor || '#1e40af',
              text: adminMachineData.theme.textColor || '#ffffff'
            };
          }
        }
      } catch (error) {
        console.log('テーマカラー取得エラー:', error);
      }
    }
    return {
      primary: '#3b82f6',
      background: '#1e40af', 
      text: '#ffffff'
    };
  };
  
  const themeColors = getThemeColors();
  
  // グローエフェクト用のCSS変数を計算
  const hexToRgba = (hex: string, alpha: number) => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  };

  return (
    <div 
      className="vending-app" 
      style={{
        backgroundImage: machine.backgroundImage ? `url(${machine.backgroundImage})` : 'none',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        minHeight: '100vh',
        padding: '20px 0',
        // CSS変数としてテーマカラーを設定
        '--theme-primary': themeColors.primary,
        '--theme-background': themeColors.background,
        '--theme-text': themeColors.text,
        // グローエフェクト用のCSS変数
        '--theme-primary-glow-1': hexToRgba(themeColors.primary, 0.4),
        '--theme-primary-glow-2': hexToRgba(themeColors.primary, 0.3),
        '--theme-primary-glow-strong': hexToRgba(themeColors.primary, 0.5),
        '--theme-primary-glow-stronger': hexToRgba(themeColors.primary, 0.6),
        '--theme-background-glow': hexToRgba(themeColors.background, 0.3)
      } as React.CSSProperties}
    >
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
          src="/gifterra-logo.png" 
          alt="Gifterra Logo" 
          className="gifterra-logo"
        />
        
        {/* 残高表示 */}
        {address && (
          <div className="balance-display">
            <span className="balance-label">残高</span>
            <span className="balance-amount">{balance} tNHT</span>
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