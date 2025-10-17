import React, { useState, useRef } from 'react';
import type { VendingMachine, Product } from '../../types/vending';

// モックデータ
const mockProducts: Product[] = [
  {
    id: 'product-1',
    name: 'コカ・コーラ',
    price: 150,
    description: '炭酸飲料の定番',
    imageUrl: 'https://images.unsplash.com/photo-1561758033-d89a9ad46330?w=400',
    stock: 25,
    category: 'drink',
    isActive: true,
    createdAt: '2024-01-15T10:30:00Z',
    updatedAt: '2024-01-15T10:30:00Z'
  },
  {
    id: 'product-2',
    name: 'ポテトチップス',
    price: 120,
    description: 'うすしお味',
    imageUrl: 'https://images.unsplash.com/photo-1566478989037-eec170784d0b?w=400',
    stock: 15,
    category: 'snack',
    isActive: true,
    createdAt: '2024-01-15T10:30:00Z',
    updatedAt: '2024-01-15T10:30:00Z'
  }
];

const mockMachines: VendingMachine[] = [
  {
    id: 'machine-1',
    name: '本社1F自販機',
    location: '東京本社 1階エントランス',
    description: '社員向け飲み物・軽食自販機',
    products: mockProducts,
    isActive: true,
    totalSales: 125000,
    totalAccessCount: 1250,
    totalDistributions: 850,
    createdAt: '2024-01-10T09:00:00Z',
    updatedAt: '2024-01-15T16:45:00Z',
    settings: {
      theme: 'default',
      displayName: '本社1F自販機',
      welcomeMessage: 'いらっしゃいませ！',
      thankYouMessage: 'ありがとうございました！',
      maxSelectionsPerUser: 3,
      operatingHours: {
        start: '08:00',
        end: '20:00'
      },
      design: {
        primaryColor: '#3B82F6',
        secondaryColor: '#8B5CF6',
        accentColor: '#10B981',
        textColor: '#FFFFFF',
        buttonColor: '#2563EB',
        cardBackgroundColor: '#1F2937'
      }
    }
  },
  {
    id: 'machine-2',
    name: '開発室自販機',
    location: '東京本社 3階開発室',
    description: 'エンジニア向け自販機',
    products: mockProducts.slice(0, 1),
    isActive: true,
    totalSales: 89000,
    totalAccessCount: 890,
    totalDistributions: 620,
    createdAt: '2024-01-12T14:30:00Z',
    updatedAt: '2024-01-15T12:20:00Z',
    settings: {
      theme: 'dark',
      displayName: 'Dev Room Vending',
      welcomeMessage: 'Welcome, Developer!',
      thankYouMessage: 'Keep coding!',
      maxSelectionsPerUser: 5,
      operatingHours: {
        start: '00:00',
        end: '23:59'
      },
      design: {
        primaryColor: '#7C3AED',
        secondaryColor: '#EC4899',
        accentColor: '#F59E0B',
        textColor: '#F3F4F6',
        buttonColor: '#6D28D9',
        cardBackgroundColor: '#111827'
      }
    }
  }
];

// プリセットテーマ
const PRESET_THEMES = {
  blue: {
    name: 'ブルー',
    primaryColor: '#3B82F6',
    secondaryColor: '#8B5CF6',
    accentColor: '#10B981',
    textColor: '#FFFFFF',
    buttonColor: '#2563EB',
    cardBackgroundColor: '#1F2937'
  },
  purple: {
    name: 'パープル',
    primaryColor: '#7C3AED',
    secondaryColor: '#EC4899',
    accentColor: '#F59E0B',
    textColor: '#F3F4F6',
    buttonColor: '#6D28D9',
    cardBackgroundColor: '#111827'
  },
  green: {
    name: 'グリーン',
    primaryColor: '#10B981',
    secondaryColor: '#14B8A6',
    accentColor: '#F59E0B',
    textColor: '#FFFFFF',
    buttonColor: '#059669',
    cardBackgroundColor: '#064E3B'
  },
  red: {
    name: 'レッド',
    primaryColor: '#EF4444',
    secondaryColor: '#F97316',
    accentColor: '#FBBF24',
    textColor: '#FFFFFF',
    buttonColor: '#DC2626',
    cardBackgroundColor: '#7F1D1D'
  },
  pink: {
    name: 'ピンク',
    primaryColor: '#EC4899',
    secondaryColor: '#F472B6',
    accentColor: '#A78BFA',
    textColor: '#FFFFFF',
    buttonColor: '#DB2777',
    cardBackgroundColor: '#831843'
  }
};

interface VendingDashboardProps {
  onNavigateToEditor?: (machineId: string) => void;
  onNavigateToPreview?: (machineId: string) => void;
  onNavigateToStats?: (machineId: string) => void;
}

type ViewMode = 'overview' | 'product-management' | 'design' | 'settings' | 'stats';

const VendingDashboard: React.FC<VendingDashboardProps> = ({
  onNavigateToEditor,
  onNavigateToPreview,
  onNavigateToStats
}) => {
  const [machines, setMachines] = useState<VendingMachine[]>(mockMachines);
  const [selectedMachine, setSelectedMachine] = useState<VendingMachine | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('overview');

  // モーダル状態
  const [showCreateMachineModal, setShowCreateMachineModal] = useState(false);
  const [showProductModal, setShowProductModal] = useState(false);
  const [showDesignPreview, setShowDesignPreview] = useState(false);

  // 新規自販機作成
  const [newMachineName, setNewMachineName] = useState('');
  const [newMachineLocation, setNewMachineLocation] = useState('');
  const [newMachineDescription, setNewMachineDescription] = useState('');

  // 商品管理
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [productForm, setProductForm] = useState({
    name: '',
    price: 0,
    description: '',
    imageUrl: '',
    stock: 0,
    category: 'drink' as 'drink' | 'snack' | 'other',
    isActive: true
  });
  const productImageInputRef = useRef<HTMLInputElement>(null);

  // デザイン設定
  const [designForm, setDesignForm] = useState({
    headerImage: '',
    backgroundImage: '',
    primaryColor: '#3B82F6',
    secondaryColor: '#8B5CF6',
    accentColor: '#10B981',
    textColor: '#FFFFFF',
    buttonColor: '#2563EB',
    cardBackgroundColor: '#1F2937'
  });
  const headerImageInputRef = useRef<HTMLInputElement>(null);
  const backgroundImageInputRef = useRef<HTMLInputElement>(null);

  // 基本設定
  const [settingsForm, setSettingsForm] = useState({
    theme: 'default' as 'default' | 'dark' | 'custom',
    displayName: '',
    welcomeMessage: '',
    thankYouMessage: '',
    maxSelectionsPerUser: 3,
    operatingHours: {
      start: '08:00',
      end: '20:00'
    }
  });

  // 自販機作成
  const handleCreateMachine = () => {
    if (!newMachineName.trim() || !newMachineLocation.trim()) return;

    const newMachine: VendingMachine = {
      id: `machine-${Date.now()}`,
      name: newMachineName,
      location: newMachineLocation,
      description: newMachineDescription || '新規作成された自販機',
      products: [],
      isActive: true,
      totalSales: 0,
      totalAccessCount: 0,
      totalDistributions: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      settings: {
        theme: 'default',
        displayName: newMachineName,
        welcomeMessage: 'いらっしゃいませ！',
        thankYouMessage: 'ありがとうございました！',
        maxSelectionsPerUser: 3,
        operatingHours: {
          start: '08:00',
          end: '20:00'
        },
        design: {
          primaryColor: '#3B82F6',
          secondaryColor: '#8B5CF6',
          accentColor: '#10B981',
          textColor: '#FFFFFF',
          buttonColor: '#2563EB',
          cardBackgroundColor: '#1F2937'
        }
      }
    };

    setMachines(prev => [...prev, newMachine]);
    setNewMachineName('');
    setNewMachineLocation('');
    setNewMachineDescription('');
    setShowCreateMachineModal(false);
  };

  // 自販機削除
  const handleDeleteMachine = (machineId: string) => {
    if (window.confirm('この自販機を削除しますか？')) {
      setMachines(prev => prev.filter(m => m.id !== machineId));
      if (selectedMachine?.id === machineId) {
        setSelectedMachine(null);
        setViewMode('overview');
      }
    }
  };

  // 自販機選択
  const handleSelectMachine = (machine: VendingMachine) => {
    setSelectedMachine(machine);
    setViewMode('product-management');

    // デザインフォーム初期化
    if (machine.settings.design) {
      setDesignForm({
        headerImage: machine.settings.design.headerImage || '',
        backgroundImage: machine.settings.design.backgroundImage || '',
        primaryColor: machine.settings.design.primaryColor || '#3B82F6',
        secondaryColor: machine.settings.design.secondaryColor || '#8B5CF6',
        accentColor: machine.settings.design.accentColor || '#10B981',
        textColor: machine.settings.design.textColor || '#FFFFFF',
        buttonColor: machine.settings.design.buttonColor || '#2563EB',
        cardBackgroundColor: machine.settings.design.cardBackgroundColor || '#1F2937'
      });
    }

    // 基本設定フォーム初期化
    setSettingsForm({
      theme: machine.settings.theme,
      displayName: machine.settings.displayName,
      welcomeMessage: machine.settings.welcomeMessage,
      thankYouMessage: machine.settings.thankYouMessage,
      maxSelectionsPerUser: machine.settings.maxSelectionsPerUser,
      operatingHours: machine.settings.operatingHours
    });
  };

  // 商品追加・編集モーダルを開く
  const openProductModal = (product?: Product) => {
    if (product) {
      setEditingProduct(product);
      setProductForm({
        name: product.name,
        price: product.price,
        description: product.description,
        imageUrl: product.imageUrl,
        stock: product.stock,
        category: product.category,
        isActive: product.isActive
      });
    } else {
      setEditingProduct(null);
      setProductForm({
        name: '',
        price: 0,
        description: '',
        imageUrl: '',
        stock: 0,
        category: 'drink',
        isActive: true
      });
    }
    setShowProductModal(true);
  };

  // 画像アップロード処理（Base64変換）
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, target: 'product' | 'header' | 'background') => {
    const file = e.target.files?.[0];
    if (!file) return;

    // ファイルサイズチェック（5MB制限）
    if (file.size > 5 * 1024 * 1024) {
      alert('ファイルサイズは5MB以下にしてください');
      return;
    }

    // 画像形式チェック
    if (!file.type.startsWith('image/')) {
      alert('画像ファイルを選択してください');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;

      if (target === 'product') {
        setProductForm(prev => ({ ...prev, imageUrl: result }));
      } else if (target === 'header') {
        setDesignForm(prev => ({ ...prev, headerImage: result }));
      } else if (target === 'background') {
        setDesignForm(prev => ({ ...prev, backgroundImage: result }));
      }
    };
    reader.readAsDataURL(file);
  };

  // プリセットテーマ適用
  const applyPresetTheme = (themeKey: keyof typeof PRESET_THEMES) => {
    const theme = PRESET_THEMES[themeKey];
    setDesignForm(prev => ({
      ...prev,
      primaryColor: theme.primaryColor,
      secondaryColor: theme.secondaryColor,
      accentColor: theme.accentColor,
      textColor: theme.textColor,
      buttonColor: theme.buttonColor,
      cardBackgroundColor: theme.cardBackgroundColor
    }));
  };

  // 商品保存
  const handleSaveProduct = () => {
    if (!selectedMachine) return;
    if (!productForm.name.trim()) {
      alert('商品名を入力してください');
      return;
    }

    setMachines(prev => prev.map(machine => {
      if (machine.id !== selectedMachine.id) return machine;

      let updatedProducts: Product[];

      if (editingProduct) {
        updatedProducts = machine.products.map(p =>
          p.id === editingProduct.id
            ? {
                ...p,
                ...productForm,
                updatedAt: new Date().toISOString()
              }
            : p
        );
      } else {
        const newProduct: Product = {
          id: `product-${Date.now()}`,
          ...productForm,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        updatedProducts = [...machine.products, newProduct];
      }

      const updatedMachine = {
        ...machine,
        products: updatedProducts,
        updatedAt: new Date().toISOString()
      };

      setSelectedMachine(updatedMachine);
      return updatedMachine;
    }));

    setShowProductModal(false);
    setEditingProduct(null);
  };

  // 商品削除
  const handleDeleteProduct = (productId: string) => {
    if (!selectedMachine) return;
    if (!window.confirm('この商品を削除しますか？')) return;

    setMachines(prev => prev.map(machine => {
      if (machine.id !== selectedMachine.id) return machine;

      const updatedMachine = {
        ...machine,
        products: machine.products.filter(p => p.id !== productId),
        updatedAt: new Date().toISOString()
      };

      setSelectedMachine(updatedMachine);
      return updatedMachine;
    }));
  };

  // デザイン保存
  const handleSaveDesign = () => {
    if (!selectedMachine) return;

    setMachines(prev => prev.map(machine => {
      if (machine.id !== selectedMachine.id) return machine;

      const updatedMachine = {
        ...machine,
        settings: {
          ...machine.settings,
          design: designForm
        },
        updatedAt: new Date().toISOString()
      };

      setSelectedMachine(updatedMachine);
      return updatedMachine;
    }));

    alert('デザイン設定を保存しました');
  };

  // 基本設定保存
  const handleSaveSettings = () => {
    if (!selectedMachine) return;

    setMachines(prev => prev.map(machine => {
      if (machine.id !== selectedMachine.id) return machine;

      const updatedMachine = {
        ...machine,
        settings: {
          ...machine.settings,
          ...settingsForm
        },
        updatedAt: new Date().toISOString()
      };

      setSelectedMachine(updatedMachine);
      return updatedMachine;
    }));

    alert('基本設定を保存しました');
  };

  // metaverse-uiプレビューURL生成
  const getMetaversePreviewUrl = (machineId: string) => {
    const baseUrl = window.location.origin;
    return `${baseUrl}/content?space=default&machine=${machineId}`;
  };

  // フォーマット関数
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ja-JP', {
      style: 'currency',
      currency: 'JPY'
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // 概要ビュー
  const renderOverview = () => (
    <>
      {/* 統計サマリー */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">総自販機数</p>
              <p className="text-3xl font-bold text-gray-900">{machines.length}</p>
            </div>
            <div className="p-3 bg-blue-100 rounded-xl">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">総売上</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(machines.reduce((sum, m) => sum + m.totalSales, 0))}
              </p>
            </div>
            <div className="p-3 bg-green-100 rounded-xl">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">総配布数</p>
              <p className="text-3xl font-bold text-gray-900">
                {machines.reduce((sum, m) => sum + m.totalDistributions, 0).toLocaleString()}
              </p>
            </div>
            <div className="p-3 bg-purple-100 rounded-xl">
              <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">総アクセス数</p>
              <p className="text-3xl font-bold text-gray-900">
                {machines.reduce((sum, m) => sum + m.totalAccessCount, 0).toLocaleString()}
              </p>
            </div>
            <div className="p-3 bg-orange-100 rounded-xl">
              <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* 自販機一覧 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {machines.map((machine) => (
          <div key={machine.id} className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden hover:shadow-xl transition-all duration-300">
            {/* カラープレビュー */}
            {machine.settings.design && (
              <div
                className="h-2"
                style={{
                  background: `linear-gradient(to right, ${machine.settings.design.primaryColor}, ${machine.settings.design.secondaryColor})`
                }}
              />
            )}

            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-gray-900 mb-1">{machine.name}</h3>
                  <p className="text-gray-600 text-sm mb-2">{machine.location}</p>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      machine.isActive
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {machine.isActive ? '稼働中' : '停止中'}
                    </span>
                    <span className="text-xs text-gray-500">
                      {machine.products.length}種類
                    </span>
                    <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      {machine.settings.theme}
                    </span>
                  </div>
                </div>
              </div>

              <div className="space-y-2 mb-6">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">売上</span>
                  <span className="font-semibold text-green-600">{formatCurrency(machine.totalSales)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">配布数</span>
                  <span className="font-semibold">{machine.totalDistributions.toLocaleString()}</span>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <button
                  onClick={() => handleSelectMachine(machine)}
                  className="w-full px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors text-sm"
                >
                  🎨 管理画面を開く
                </button>
                <div className="grid grid-cols-2 gap-2">
                  <a
                    href={getMetaversePreviewUrl(machine.id)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2 bg-green-50 hover:bg-green-100 text-green-700 rounded-lg font-medium transition-colors text-sm text-center flex items-center justify-center gap-1"
                  >
                    👁️ プレビュー
                  </a>
                  <button
                    onClick={() => handleDeleteMachine(machine.id)}
                    className="px-4 py-2 bg-red-50 hover:bg-red-100 text-red-700 rounded-lg font-medium transition-colors text-sm"
                  >
                    🗑️ 削除
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </>
  );

  // 商品管理ビュー
  const renderProductManagement = () => {
    if (!selectedMachine) return null;

    return (
      <div className="space-y-6">
        {/* ヘッダー */}
        <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-100">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-1">📦 商品管理</h2>
              <p className="text-gray-600">{selectedMachine.name} の商品一覧</p>
            </div>
            <button
              onClick={() => openProductModal()}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium flex items-center gap-2 transition-colors shadow-lg"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              新規商品を追加
            </button>
          </div>
        </div>

        {/* 商品一覧 */}
        {selectedMachine.products.length === 0 ? (
          <div className="bg-white p-12 rounded-2xl shadow-lg border border-gray-100 text-center">
            <div className="text-6xl mb-4">🏪</div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">商品がまだ登録されていません</h3>
            <p className="text-gray-600 mb-6">「新規商品を追加」ボタンから商品を登録してください</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {selectedMachine.products.map((product) => (
              <div key={product.id} className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden hover:shadow-xl transition-all duration-300">
                {/* 商品画像 */}
                <div className="relative h-48 bg-gradient-to-br from-gray-100 to-gray-200">
                  {product.imageUrl ? (
                    <img
                      src={product.imageUrl}
                      alt={product.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400">
                      <div className="text-center">
                        <svg className="w-16 h-16 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <p className="text-sm">画像なし</p>
                      </div>
                    </div>
                  )}
                  <div className="absolute top-2 right-2 flex gap-2">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium backdrop-blur-sm ${
                      product.isActive
                        ? 'bg-green-500/90 text-white'
                        : 'bg-gray-500/90 text-white'
                    }`}>
                      {product.isActive ? '販売中' : '停止中'}
                    </span>
                  </div>
                  <div className="absolute top-2 left-2">
                    <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-500/90 backdrop-blur-sm text-white">
                      {product.category === 'drink' ? '🥤 飲料' : product.category === 'snack' ? '🍿 スナック' : '📦 その他'}
                    </span>
                  </div>
                </div>

                {/* 商品情報 */}
                <div className="p-4">
                  <h3 className="text-lg font-bold text-gray-900 mb-2">{product.name}</h3>
                  <p className="text-sm text-gray-600 mb-3 line-clamp-2 min-h-[40px]">{product.description}</p>

                  <div className="space-y-2 mb-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">💰 価格</span>
                      <span className="text-lg font-bold text-green-600">{formatCurrency(product.price)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">📊 在庫</span>
                      <span className={`font-semibold ${product.stock < 10 ? 'text-red-600' : 'text-gray-900'}`}>
                        {product.stock}個 {product.stock < 10 && '⚠️'}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => openProductModal(product)}
                      className="px-3 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg font-medium transition-colors text-sm"
                    >
                      ✏️ 編集
                    </button>
                    <button
                      onClick={() => handleDeleteProduct(product.id)}
                      className="px-3 py-2 bg-red-50 hover:bg-red-100 text-red-700 rounded-lg font-medium transition-colors text-sm"
                    >
                      🗑️ 削除
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  // デザインビュー
  const renderDesign = () => {
    if (!selectedMachine) return null;

    return (
      <div className="space-y-6">
        <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-100">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-1">🎨 デザインカスタマイズ</h2>
              <p className="text-gray-600">{selectedMachine.name} の見た目を設定</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowDesignPreview(true)}
                className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg font-medium transition-colors shadow-lg flex items-center gap-2"
              >
                👁️ プレビュー表示
              </button>
              <button
                onClick={handleSaveDesign}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors shadow-lg flex items-center gap-2"
              >
                💾 保存
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* 左側: 画像設定 */}
            <div className="space-y-6">
              <div>
                <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <span className="text-2xl">🖼️</span>
                  画像設定
                </h3>

                {/* ヘッダー画像 */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    ヘッダー画像（自販機上部）
                  </label>
                  {designForm.headerImage && (
                    <div className="relative w-full h-32 bg-gray-100 rounded-lg overflow-hidden mb-3">
                      <img
                        src={designForm.headerImage}
                        alt="ヘッダープレビュー"
                        className="w-full h-full object-cover"
                      />
                      <button
                        onClick={() => setDesignForm({ ...designForm, headerImage: '' })}
                        className="absolute top-2 right-2 p-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors"
                      >
                        ❌
                      </button>
                    </div>
                  )}
                  <input
                    ref={headerImageInputRef}
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleImageUpload(e, 'header')}
                    className="hidden"
                  />
                  <button
                    onClick={() => headerImageInputRef.current?.click()}
                    className="w-full px-4 py-3 bg-gradient-to-r from-blue-50 to-purple-50 hover:from-blue-100 hover:to-purple-100 text-gray-700 rounded-lg font-medium transition-colors border border-blue-200 flex items-center justify-center gap-2"
                  >
                    📤 ヘッダー画像をアップロード
                  </button>
                  <p className="text-xs text-gray-500 mt-2">
                    推奨サイズ: 1200x300px / 5MB以下
                  </p>
                </div>

                {/* 背景画像 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    背景画像
                  </label>
                  {designForm.backgroundImage && (
                    <div className="relative w-full h-32 bg-gray-100 rounded-lg overflow-hidden mb-3">
                      <img
                        src={designForm.backgroundImage}
                        alt="背景プレビュー"
                        className="w-full h-full object-cover"
                      />
                      <button
                        onClick={() => setDesignForm({ ...designForm, backgroundImage: '' })}
                        className="absolute top-2 right-2 p-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors"
                      >
                        ❌
                      </button>
                    </div>
                  )}
                  <input
                    ref={backgroundImageInputRef}
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleImageUpload(e, 'background')}
                    className="hidden"
                  />
                  <button
                    onClick={() => backgroundImageInputRef.current?.click()}
                    className="w-full px-4 py-3 bg-gradient-to-r from-green-50 to-blue-50 hover:from-green-100 hover:to-blue-100 text-gray-700 rounded-lg font-medium transition-colors border border-green-200 flex items-center justify-center gap-2"
                  >
                    📤 背景画像をアップロード
                  </button>
                  <p className="text-xs text-gray-500 mt-2">
                    推奨サイズ: 1920x1080px / 5MB以下
                  </p>
                </div>
              </div>
            </div>

            {/* 右側: カラー設定 */}
            <div className="space-y-6">
              <div>
                <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <span className="text-2xl">🎨</span>
                  カラーテーマ
                </h3>

                {/* プリセットテーマ */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    プリセットテーマを選択
                  </label>
                  <div className="grid grid-cols-3 gap-3">
                    {Object.entries(PRESET_THEMES).map(([key, theme]) => (
                      <button
                        key={key}
                        onClick={() => applyPresetTheme(key as keyof typeof PRESET_THEMES)}
                        className="group relative p-4 rounded-lg border-2 border-gray-200 hover:border-gray-400 transition-all"
                        style={{
                          background: `linear-gradient(135deg, ${theme.primaryColor}, ${theme.secondaryColor})`
                        }}
                      >
                        <div className="absolute inset-0 bg-black opacity-0 group-hover:opacity-20 transition-opacity rounded-lg" />
                        <p className="relative text-white font-bold text-sm text-center drop-shadow-lg">
                          {theme.name}
                        </p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* カスタムカラー */}
                <div className="space-y-4">
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    カスタムカラー
                  </label>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs text-gray-600 mb-2">メインカラー</label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={designForm.primaryColor}
                          onChange={(e) => setDesignForm({ ...designForm, primaryColor: e.target.value })}
                          className="w-12 h-12 rounded-lg border-2 border-gray-300 cursor-pointer"
                        />
                        <input
                          type="text"
                          value={designForm.primaryColor}
                          onChange={(e) => setDesignForm({ ...designForm, primaryColor: e.target.value })}
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs text-gray-600 mb-2">サブカラー</label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={designForm.secondaryColor}
                          onChange={(e) => setDesignForm({ ...designForm, secondaryColor: e.target.value })}
                          className="w-12 h-12 rounded-lg border-2 border-gray-300 cursor-pointer"
                        />
                        <input
                          type="text"
                          value={designForm.secondaryColor}
                          onChange={(e) => setDesignForm({ ...designForm, secondaryColor: e.target.value })}
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs text-gray-600 mb-2">アクセントカラー</label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={designForm.accentColor}
                          onChange={(e) => setDesignForm({ ...designForm, accentColor: e.target.value })}
                          className="w-12 h-12 rounded-lg border-2 border-gray-300 cursor-pointer"
                        />
                        <input
                          type="text"
                          value={designForm.accentColor}
                          onChange={(e) => setDesignForm({ ...designForm, accentColor: e.target.value })}
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs text-gray-600 mb-2">ボタンカラー</label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={designForm.buttonColor}
                          onChange={(e) => setDesignForm({ ...designForm, buttonColor: e.target.value })}
                          className="w-12 h-12 rounded-lg border-2 border-gray-300 cursor-pointer"
                        />
                        <input
                          type="text"
                          value={designForm.buttonColor}
                          onChange={(e) => setDesignForm({ ...designForm, buttonColor: e.target.value })}
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // 基本設定ビュー
  const renderSettings = () => {
    if (!selectedMachine) return null;

    return (
      <div className="space-y-6">
        <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-100">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-1">⚙️ 基本設定</h2>
              <p className="text-gray-600">{selectedMachine.name}</p>
            </div>
            <button
              onClick={handleSaveSettings}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors shadow-lg flex items-center gap-2"
            >
              💾 保存
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h3 className="font-semibold text-gray-900 mb-3">表示設定</h3>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  表示名
                </label>
                <input
                  type="text"
                  value={settingsForm.displayName}
                  onChange={(e) => setSettingsForm({ ...settingsForm, displayName: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="自販機の表示名"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  テーマ
                </label>
                <select
                  value={settingsForm.theme}
                  onChange={(e) => setSettingsForm({ ...settingsForm, theme: e.target.value as 'default' | 'dark' | 'custom' })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="default">デフォルト</option>
                  <option value="dark">ダーク</option>
                  <option value="custom">カスタム</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  ウェルカムメッセージ
                </label>
                <input
                  type="text"
                  value={settingsForm.welcomeMessage}
                  onChange={(e) => setSettingsForm({ ...settingsForm, welcomeMessage: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="いらっしゃいませ！"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  サンキューメッセージ
                </label>
                <input
                  type="text"
                  value={settingsForm.thankYouMessage}
                  onChange={(e) => setSettingsForm({ ...settingsForm, thankYouMessage: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="ありがとうございました！"
                />
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="font-semibold text-gray-900 mb-3">動作設定</h3>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  ユーザーあたり最大選択数
                </label>
                <input
                  type="number"
                  value={settingsForm.maxSelectionsPerUser}
                  onChange={(e) => setSettingsForm({ ...settingsForm, maxSelectionsPerUser: Number(e.target.value) })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  min="1"
                  max="10"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    営業開始時間
                  </label>
                  <input
                    type="time"
                    value={settingsForm.operatingHours.start}
                    onChange={(e) => setSettingsForm({
                      ...settingsForm,
                      operatingHours: { ...settingsForm.operatingHours, start: e.target.value }
                    })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    営業終了時間
                  </label>
                  <input
                    type="time"
                    value={settingsForm.operatingHours.end}
                    onChange={(e) => setSettingsForm({
                      ...settingsForm,
                      operatingHours: { ...settingsForm.operatingHours, end: e.target.value }
                    })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* metaverse-ui プレビュー */}
        <div className="bg-gradient-to-br from-purple-50 to-blue-50 p-6 rounded-2xl border border-purple-200">
          <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <span className="text-2xl">🌐</span>
            メタバースUI プレビュー
          </h3>
          <p className="text-sm text-gray-600 mb-4">
            この自販機は3D空間からアクセスできます。以下のURLでプレビューできます。
          </p>
          <div className="bg-white p-4 rounded-lg border border-gray-200 mb-3">
            <code className="text-sm text-blue-600 break-all font-mono">
              {getMetaversePreviewUrl(selectedMachine.id)}
            </code>
          </div>
          <a
            href={getMetaversePreviewUrl(selectedMachine.id)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg font-medium transition-colors shadow-lg"
          >
            🚀 新しいタブで開く
          </a>
        </div>
      </div>
    );
  };

  // 統計ビュー
  const renderStats = () => {
    if (!selectedMachine) return null;

    const conversionRate = selectedMachine.totalAccessCount > 0
      ? ((selectedMachine.totalDistributions / selectedMachine.totalAccessCount) * 100).toFixed(1)
      : '0.0';

    const avgSale = selectedMachine.totalDistributions > 0
      ? selectedMachine.totalSales / selectedMachine.totalDistributions
      : 0;

    return (
      <div className="space-y-6">
        <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-100">
          <h2 className="text-2xl font-bold text-gray-900 mb-1">📊 統計情報</h2>
          <p className="text-gray-600">{selectedMachine.name}</p>
        </div>

        {/* KPI カード */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-gradient-to-br from-green-50 to-green-100 p-6 rounded-2xl shadow-lg border border-green-200">
            <p className="text-sm font-medium text-green-700 mb-2">💰 総売上</p>
            <p className="text-2xl font-bold text-green-900">{formatCurrency(selectedMachine.totalSales)}</p>
          </div>
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-6 rounded-2xl shadow-lg border border-blue-200">
            <p className="text-sm font-medium text-blue-700 mb-2">📦 総配布数</p>
            <p className="text-2xl font-bold text-blue-900">{selectedMachine.totalDistributions.toLocaleString()}個</p>
          </div>
          <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-6 rounded-2xl shadow-lg border border-purple-200">
            <p className="text-sm font-medium text-purple-700 mb-2">📈 コンバージョン率</p>
            <p className="text-2xl font-bold text-purple-900">{conversionRate}%</p>
          </div>
          <div className="bg-gradient-to-br from-orange-50 to-orange-100 p-6 rounded-2xl shadow-lg border border-orange-200">
            <p className="text-sm font-medium text-orange-700 mb-2">💵 平均単価</p>
            <p className="text-2xl font-bold text-orange-900">{formatCurrency(avgSale)}</p>
          </div>
        </div>

        {/* 商品別統計 */}
        <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-100">
          <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <span className="text-2xl">🏆</span>
            商品別パフォーマンス
          </h3>
          {selectedMachine.products.length === 0 ? (
            <p className="text-gray-500 text-center py-8">商品が登録されていません</p>
          ) : (
            <div className="space-y-4">
              {selectedMachine.products.map((product, index) => (
                <div key={product.id} className="flex items-center gap-4 p-4 bg-gradient-to-r from-gray-50 to-white rounded-lg border border-gray-200">
                  <div className="text-2xl font-bold text-gray-400 w-8 text-center">#{index + 1}</div>
                  {product.imageUrl && (
                    <img
                      src={product.imageUrl}
                      alt={product.name}
                      className="w-16 h-16 object-cover rounded-lg"
                    />
                  )}
                  <div className="flex-1">
                    <h4 className="font-semibold text-gray-900">{product.name}</h4>
                    <p className="text-sm text-gray-600">{formatCurrency(product.price)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-600">在庫</p>
                    <p className={`font-bold ${product.stock < 10 ? 'text-red-600' : 'text-gray-900'}`}>
                      {product.stock}個
                    </p>
                  </div>
                  <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                    product.isActive
                      ? 'bg-green-100 text-green-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {product.isActive ? '販売中' : '停止中'}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* ヘッダー */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8">
        <div>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            {selectedMachine ? `🏪 ${selectedMachine.name}` : '🏪 自販機管理'}
          </h1>
          <p className="text-gray-600">
            {selectedMachine ? selectedMachine.location : '登録済み自販機の管理と新規作成'}
          </p>
        </div>
        {!selectedMachine && (
          <button
            onClick={() => setShowCreateMachineModal(true)}
            className="mt-4 sm:mt-0 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-8 py-4 rounded-xl font-bold flex items-center gap-3 transition-all shadow-lg hover:shadow-xl text-lg"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            新規自販機を追加
          </button>
        )}
      </div>

      {/* ナビゲーション（自販機選択時） */}
      {selectedMachine && (
        <div className="bg-white p-4 rounded-xl shadow-lg border border-gray-100 mb-6">
          <div className="flex items-center gap-3 flex-wrap">
            <button
              onClick={() => {
                setSelectedMachine(null);
                setViewMode('overview');
              }}
              className="text-blue-600 hover:text-blue-700 font-bold flex items-center gap-2 transition-colors px-4 py-2 rounded-lg hover:bg-blue-50"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              一覧に戻る
            </button>
            <div className="h-6 w-px bg-gray-300" />
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => setViewMode('product-management')}
                className={`px-5 py-2 rounded-lg font-bold transition-all ${
                  viewMode === 'product-management'
                    ? 'bg-blue-600 text-white shadow-lg'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                📦 商品管理
              </button>
              <button
                onClick={() => setViewMode('design')}
                className={`px-5 py-2 rounded-lg font-bold transition-all ${
                  viewMode === 'design'
                    ? 'bg-blue-600 text-white shadow-lg'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                🎨 デザイン
              </button>
              <button
                onClick={() => setViewMode('settings')}
                className={`px-5 py-2 rounded-lg font-bold transition-all ${
                  viewMode === 'settings'
                    ? 'bg-blue-600 text-white shadow-lg'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                ⚙️ 設定
              </button>
              <button
                onClick={() => setViewMode('stats')}
                className={`px-5 py-2 rounded-lg font-bold transition-all ${
                  viewMode === 'stats'
                    ? 'bg-blue-600 text-white shadow-lg'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                📊 統計
              </button>
            </div>
          </div>
        </div>
      )}

      {/* コンテンツ表示 */}
      {viewMode === 'overview' && renderOverview()}
      {viewMode === 'product-management' && renderProductManagement()}
      {viewMode === 'design' && renderDesign()}
      {viewMode === 'settings' && renderSettings()}
      {viewMode === 'stats' && renderStats()}

      {/* デザインプレビューモーダル */}
      {showDesignPreview && selectedMachine && (
        <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-2xl w-full max-w-4xl my-8">
            <div className="p-6 border-b border-gray-200 flex justify-between items-center">
              <h2 className="text-2xl font-bold text-gray-900">👁️ デザインプレビュー</h2>
              <button
                onClick={() => setShowDesignPreview(false)}
                className="text-gray-500 hover:text-gray-700 text-3xl leading-none"
              >
                ×
              </button>
            </div>

            <div
              className="p-8"
              style={{
                background: designForm.backgroundImage
                  ? `url(${designForm.backgroundImage}) center/cover`
                  : `linear-gradient(to bottom right, ${designForm.primaryColor}, ${designForm.secondaryColor})`,
                minHeight: '500px'
              }}
            >
              {/* ヘッダー画像 */}
              {designForm.headerImage && (
                <div className="mb-6 rounded-xl overflow-hidden shadow-2xl">
                  <img
                    src={designForm.headerImage}
                    alt="ヘッダー"
                    className="w-full h-48 object-cover"
                  />
                </div>
              )}

              {/* プレビューカード */}
              <div
                className="p-6 rounded-2xl shadow-2xl backdrop-blur-sm border-2"
                style={{
                  backgroundColor: designForm.cardBackgroundColor + 'DD',
                  borderColor: designForm.accentColor
                }}
              >
                <h3
                  className="text-2xl font-bold mb-4"
                  style={{ color: designForm.textColor }}
                >
                  {selectedMachine.settings.displayName}
                </h3>
                <p
                  className="mb-4"
                  style={{ color: designForm.textColor + 'DD' }}
                >
                  {selectedMachine.settings.welcomeMessage}
                </p>
                <button
                  className="px-6 py-3 rounded-lg font-bold text-white shadow-lg"
                  style={{ backgroundColor: designForm.buttonColor }}
                >
                  商品を選択
                </button>
              </div>
            </div>

            <div className="p-6 border-t border-gray-200">
              <button
                onClick={() => setShowDesignPreview(false)}
                className="w-full px-6 py-3 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-bold transition-colors"
              >
                閉じる
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 新規自販機作成モーダル */}
      {showCreateMachineModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-8 w-full max-w-md shadow-2xl">
            <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
              <span className="text-3xl">🏪</span>
              新規自販機を作成
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  自販機名 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={newMachineName}
                  onChange={(e) => setNewMachineName(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="例: 本社2F自販機"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  設置場所 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={newMachineLocation}
                  onChange={(e) => setNewMachineLocation(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="例: 東京本社 2階休憩室"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  説明（任意）
                </label>
                <textarea
                  value={newMachineDescription}
                  onChange={(e) => setNewMachineDescription(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  rows={3}
                  placeholder="自販機の説明を入力してください"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-8">
              <button
                onClick={() => {
                  setShowCreateMachineModal(false);
                  setNewMachineName('');
                  setNewMachineLocation('');
                  setNewMachineDescription('');
                }}
                className="flex-1 px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-lg font-bold hover:bg-gray-50 transition-colors"
              >
                キャンセル
              </button>
              <button
                onClick={handleCreateMachine}
                disabled={!newMachineName.trim() || !newMachineLocation.trim()}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:from-gray-300 disabled:to-gray-400 text-white rounded-lg font-bold transition-all shadow-lg disabled:shadow-none"
              >
                作成
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 商品追加・編集モーダル */}
      {showProductModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-2xl p-8 w-full max-w-2xl my-8 shadow-2xl">
            <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
              <span className="text-3xl">{editingProduct ? '✏️' : '➕'}</span>
              {editingProduct ? '商品を編集' : '新規商品を追加'}
            </h2>

            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    商品名 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={productForm.name}
                    onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="例: コカ・コーラ"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    カテゴリ
                  </label>
                  <select
                    value={productForm.category}
                    onChange={(e) => setProductForm({ ...productForm, category: e.target.value as 'drink' | 'snack' | 'other' })}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="drink">🥤 飲料</option>
                    <option value="snack">🍿 スナック</option>
                    <option value="other">📦 その他</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  説明
                </label>
                <textarea
                  value={productForm.description}
                  onChange={(e) => setProductForm({ ...productForm, description: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  rows={3}
                  placeholder="商品の説明を入力してください"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    💰 価格（円）
                  </label>
                  <input
                    type="number"
                    value={productForm.price}
                    onChange={(e) => setProductForm({ ...productForm, price: Number(e.target.value) })}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="150"
                    min="0"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    📊 在庫数
                  </label>
                  <input
                    type="number"
                    value={productForm.stock}
                    onChange={(e) => setProductForm({ ...productForm, stock: Number(e.target.value) })}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="25"
                    min="0"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  🖼️ 商品画像
                </label>
                <div className="space-y-3">
                  {productForm.imageUrl && (
                    <div className="relative w-full h-48 bg-gray-100 rounded-lg overflow-hidden border-2 border-gray-300">
                      <img
                        src={productForm.imageUrl}
                        alt="プレビュー"
                        className="w-full h-full object-cover"
                      />
                      <button
                        onClick={() => setProductForm({ ...productForm, imageUrl: '' })}
                        className="absolute top-2 right-2 p-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors font-bold"
                      >
                        ❌
                      </button>
                    </div>
                  )}
                  <div className="flex gap-2">
                    <input
                      ref={productImageInputRef}
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleImageUpload(e, 'product')}
                      className="hidden"
                    />
                    <button
                      onClick={() => productImageInputRef.current?.click()}
                      className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-50 to-purple-50 hover:from-blue-100 hover:to-purple-100 text-gray-700 rounded-lg font-bold transition-colors border-2 border-blue-200 flex items-center justify-center gap-2"
                    >
                      📤 画像をアップロード
                    </button>
                    <input
                      type="text"
                      value={productForm.imageUrl}
                      onChange={(e) => setProductForm({ ...productForm, imageUrl: e.target.value })}
                      className="flex-1 px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="または画像URLを入力"
                    />
                  </div>
                  <p className="text-xs text-gray-500">
                    ファイルサイズ: 5MB以下 / 形式: JPG, PNG, GIF, WebP
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={productForm.isActive}
                  onChange={(e) => setProductForm({ ...productForm, isActive: e.target.checked })}
                  className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <label htmlFor="isActive" className="text-sm font-bold text-gray-700">
                  ✅ 販売中にする
                </label>
              </div>
            </div>

            <div className="flex gap-3 mt-8">
              <button
                onClick={() => {
                  setShowProductModal(false);
                  setEditingProduct(null);
                }}
                className="flex-1 px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-lg font-bold hover:bg-gray-50 transition-colors"
              >
                キャンセル
              </button>
              <button
                onClick={handleSaveProduct}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-lg font-bold transition-all shadow-lg"
              >
                💾 保存
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VendingDashboard;
