// 自販機システムの型定義

export interface Product {
  id: string;
  name: string;
  price: number;
  description: string;
  imageUrl: string;
  stock: number;
  category: 'drink' | 'snack' | 'other';
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface VendingMachine {
  id: string;
  name: string;
  location: string;
  description: string;
  products: Product[];
  isActive: boolean;
  totalSales: number;
  totalAccessCount: number;
  totalDistributions: number;
  createdAt: string;
  updatedAt: string;
  settings: VendingMachineSettings;
}

export interface VendingMachineSettings {
  theme: 'default' | 'dark' | 'custom';
  displayName: string;
  welcomeMessage: string;
  thankYouMessage: string;
  maxSelectionsPerUser: number;
  operatingHours: {
    start: string; // HH:MM format
    end: string;   // HH:MM format
  };
  customCss?: string;
  // デザインカスタマイズ設定
  design?: {
    headerImage?: string;        // ヘッダー画像URL（自販機上部）
    backgroundImage?: string;     // 背景画像URL
    primaryColor?: string;        // メインカラー
    secondaryColor?: string;      // サブカラー
    accentColor?: string;         // アクセントカラー
    textColor?: string;           // テキストカラー
    buttonColor?: string;         // ボタンカラー
    cardBackgroundColor?: string; // カード背景色
  };
}

export interface VendingStats {
  machineId: string;
  date: string;
  sales: number;
  accessCount: number;
  distributions: number;
  popularProducts: {
    productId: string;
    productName: string;
    count: number;
  }[];
}

export interface VendingContextType {
  machines: VendingMachine[];
  currentMachine: VendingMachine | null;
  isLoading: boolean;
  error: string | null;
  
  // Actions
  createMachine: (machine: Omit<VendingMachine, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateMachine: (id: string, updates: Partial<VendingMachine>) => Promise<void>;
  deleteMachine: (id: string) => Promise<void>;
  selectMachine: (id: string) => void;
  
  // Product actions
  addProduct: (machineId: string, product: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateProduct: (machineId: string, productId: string, updates: Partial<Product>) => Promise<void>;
  deleteProduct: (machineId: string, productId: string) => Promise<void>;
}

// モックデータ用の型
export interface MockDataType {
  machines: VendingMachine[];
  stats: VendingStats[];
}