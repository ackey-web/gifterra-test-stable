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
      operatingHours: { start: '08:00', end: '20:00' },
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
      operatingHours: { start: '00:00', end: '23:59' },
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

const PRESET_THEMES = {
  blue: { name: 'ブルー', primaryColor: '#3B82F6', secondaryColor: '#8B5CF6', accentColor: '#10B981', textColor: '#FFFFFF', buttonColor: '#2563EB', cardBackgroundColor: '#1F2937' },
  purple: { name: 'パープル', primaryColor: '#7C3AED', secondaryColor: '#EC4899', accentColor: '#F59E0B', textColor: '#F3F4F6', buttonColor: '#6D28D9', cardBackgroundColor: '#111827' },
  green: { name: 'グリーン', primaryColor: '#10B981', secondaryColor: '#14B8A6', accentColor: '#F59E0B', textColor: '#FFFFFF', buttonColor: '#059669', cardBackgroundColor: '#064E3B' },
  red: { name: 'レッド', primaryColor: '#EF4444', secondaryColor: '#F97316', accentColor: '#FBBF24', textColor: '#FFFFFF', buttonColor: '#DC2626', cardBackgroundColor: '#7F1D1D' },
  pink: { name: 'ピンク', primaryColor: '#EC4899', secondaryColor: '#F472B6', accentColor: '#A78BFA', textColor: '#FFFFFF', buttonColor: '#DB2777', cardBackgroundColor: '#831843' }
};

type PanelView = 'products' | 'sales' | 'design' | 'settings';

const VendingDashboard: React.FC = () => {
  const [machines, setMachines] = useState<VendingMachine[]>(mockMachines);
  const [expandedMachineId, setExpandedMachineId] = useState<string | null>(null);
  const [panelView, setPanelView] = useState<PanelView>('products');

  // モーダル
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showProductModal, setShowProductModal] = useState(false);
  const [showDesignPreview, setShowDesignPreview] = useState(false);

  // フォーム
  const [newMachineName, setNewMachineName] = useState('');
  const [newMachineLocation, setNewMachineLocation] = useState('');
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [productForm, setProductForm] = useState({
    name: '', price: 0, description: '', imageUrl: '', stock: 0,
    category: 'drink' as 'drink' | 'snack' | 'other', isActive: true
  });
  const [designForm, setDesignForm] = useState({
    headerImage: '', backgroundImage: '',
    primaryColor: '#3B82F6', secondaryColor: '#8B5CF6', accentColor: '#10B981',
    textColor: '#FFFFFF', buttonColor: '#2563EB', cardBackgroundColor: '#1F2937'
  });
  const [settingsForm, setSettingsForm] = useState({
    displayName: '', welcomeMessage: '', thankYouMessage: '',
    maxSelectionsPerUser: 3, operatingHours: { start: '08:00', end: '20:00' }
  });

  const productImageInputRef = useRef<HTMLInputElement>(null);
  const headerImageInputRef = useRef<HTMLInputElement>(null);
  const backgroundImageInputRef = useRef<HTMLInputElement>(null);

  const expandedMachine = machines.find(m => m.id === expandedMachineId);

  // 自販機展開/折りたたみ
  const toggleMachine = (machineId: string) => {
    if (expandedMachineId === machineId) {
      setExpandedMachineId(null);
    } else {
      setExpandedMachineId(machineId);
      setPanelView('products');
      const machine = machines.find(m => m.id === machineId);
      if (machine?.settings.design) {
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
      setSettingsForm({
        displayName: machine?.settings.displayName || '',
        welcomeMessage: machine?.settings.welcomeMessage || '',
        thankYouMessage: machine?.settings.thankYouMessage || '',
        maxSelectionsPerUser: machine?.settings.maxSelectionsPerUser || 3,
        operatingHours: machine?.settings.operatingHours || { start: '08:00', end: '20:00' }
      });
    }
  };

  // 自販機作成
  const handleCreateMachine = () => {
    if (!newMachineName.trim() || !newMachineLocation.trim()) return;
    const newMachine: VendingMachine = {
      id: `machine-${Date.now()}`,
      name: newMachineName,
      location: newMachineLocation,
      description: '新規作成された自販機',
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
        operatingHours: { start: '08:00', end: '20:00' },
        design: {
          primaryColor: '#3B82F6', secondaryColor: '#8B5CF6', accentColor: '#10B981',
          textColor: '#FFFFFF', buttonColor: '#2563EB', cardBackgroundColor: '#1F2937'
        }
      }
    };
    setMachines(prev => [...prev, newMachine]);
    setNewMachineName('');
    setNewMachineLocation('');
    setShowCreateModal(false);
  };

  // 自販機削除
  const handleDeleteMachine = (machineId: string) => {
    if (window.confirm('この自販機を削除しますか？')) {
      setMachines(prev => prev.filter(m => m.id !== machineId));
      if (expandedMachineId === machineId) setExpandedMachineId(null);
    }
  };

  // 商品モーダル
  const openProductModal = (product?: Product) => {
    if (product) {
      setEditingProduct(product);
      setProductForm({
        name: product.name, price: product.price, description: product.description,
        imageUrl: product.imageUrl, stock: product.stock, category: product.category, isActive: product.isActive
      });
    } else {
      setEditingProduct(null);
      setProductForm({ name: '', price: 0, description: '', imageUrl: '', stock: 0, category: 'drink', isActive: true });
    }
    setShowProductModal(true);
  };

  // 画像アップロード
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, target: 'product' | 'header' | 'background') => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { alert('ファイルサイズは5MB以下にしてください'); return; }
    if (!file.type.startsWith('image/')) { alert('画像ファイルを選択してください'); return; }
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      if (target === 'product') setProductForm(prev => ({ ...prev, imageUrl: result }));
      else if (target === 'header') setDesignForm(prev => ({ ...prev, headerImage: result }));
      else if (target === 'background') setDesignForm(prev => ({ ...prev, backgroundImage: result }));
    };
    reader.readAsDataURL(file);
  };

  // テーマ適用
  const applyPresetTheme = (themeKey: keyof typeof PRESET_THEMES) => {
    const theme = PRESET_THEMES[themeKey];
    setDesignForm(prev => ({
      ...prev, primaryColor: theme.primaryColor, secondaryColor: theme.secondaryColor,
      accentColor: theme.accentColor, textColor: theme.textColor,
      buttonColor: theme.buttonColor, cardBackgroundColor: theme.cardBackgroundColor
    }));
  };

  // 商品保存
  const handleSaveProduct = () => {
    if (!expandedMachine || !productForm.name.trim()) { alert('商品名を入力してください'); return; }
    setMachines(prev => prev.map(machine => {
      if (machine.id !== expandedMachine.id) return machine;
      let updatedProducts: Product[];
      if (editingProduct) {
        updatedProducts = machine.products.map(p =>
          p.id === editingProduct.id ? { ...p, ...productForm, updatedAt: new Date().toISOString() } : p
        );
      } else {
        updatedProducts = [...machine.products, {
          id: `product-${Date.now()}`, ...productForm,
          createdAt: new Date().toISOString(), updatedAt: new Date().toISOString()
        }];
      }
      return { ...machine, products: updatedProducts, updatedAt: new Date().toISOString() };
    }));
    setShowProductModal(false);
    setEditingProduct(null);
  };

  // 商品削除
  const handleDeleteProduct = (productId: string) => {
    if (!expandedMachine || !window.confirm('この商品を削除しますか？')) return;
    setMachines(prev => prev.map(machine => {
      if (machine.id !== expandedMachine.id) return machine;
      return { ...machine, products: machine.products.filter(p => p.id !== productId), updatedAt: new Date().toISOString() };
    }));
  };

  // デザイン保存
  const handleSaveDesign = () => {
    if (!expandedMachine) return;
    setMachines(prev => prev.map(machine => {
      if (machine.id !== expandedMachine.id) return machine;
      return {
        ...machine,
        settings: { ...machine.settings, design: designForm },
        updatedAt: new Date().toISOString()
      };
    }));
    alert('デザイン設定を保存しました');
  };

  // 設定保存
  const handleSaveSettings = () => {
    if (!expandedMachine) return;
    setMachines(prev => prev.map(machine => {
      if (machine.id !== expandedMachine.id) return machine;
      return {
        ...machine,
        settings: { ...machine.settings, ...settingsForm },
        updatedAt: new Date().toISOString()
      };
    }));
    alert('基本設定を保存しました');
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY' }).format(amount);
  };

  const getMetaversePreviewUrl = (machineId: string) => {
    return `${window.location.origin}/content?space=default&machine=${machineId}`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* トップバー */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">自販機管理システム</h1>
              <p className="text-sm text-gray-500 mt-1">Vending Machine Management</p>
            </div>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl font-medium shadow-lg hover:shadow-xl transition-all flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              新規作成
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* 統計サマリー */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <div className="text-sm font-medium text-gray-600 mb-2">総自販機数</div>
            <div className="text-3xl font-bold text-gray-900">{machines.length}</div>
          </div>
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <div className="text-sm font-medium text-gray-600 mb-2">総売上</div>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(machines.reduce((sum, m) => sum + m.totalSales, 0))}
            </div>
          </div>
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <div className="text-sm font-medium text-gray-600 mb-2">総配布数</div>
            <div className="text-3xl font-bold text-gray-900">
              {machines.reduce((sum, m) => sum + m.totalDistributions, 0).toLocaleString()}
            </div>
          </div>
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <div className="text-sm font-medium text-gray-600 mb-2">総アクセス数</div>
            <div className="text-3xl font-bold text-gray-900">
              {machines.reduce((sum, m) => sum + m.totalAccessCount, 0).toLocaleString()}
            </div>
          </div>
        </div>

        {/* 自販機パネルリスト */}
        <div className="space-y-4">
          {machines.map((machine) => {
            const isExpanded = expandedMachineId === machine.id;
            const conversionRate = machine.totalAccessCount > 0
              ? ((machine.totalDistributions / machine.totalAccessCount) * 100).toFixed(1)
              : '0.0';

            return (
              <div
                key={machine.id}
                className={`bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden transition-all duration-300 ${
                  isExpanded ? 'shadow-xl border-blue-300' : 'hover:shadow-md'
                }`}
              >
                {/* パネルヘッダー */}
                <div
                  className="p-6 cursor-pointer hover:bg-gray-50 transition-colors"
                  onClick={() => toggleMachine(machine.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 flex-1">
                      {/* ステータスインジケーター */}
                      <div className={`w-3 h-3 rounded-full ${machine.isActive ? 'bg-green-500' : 'bg-gray-400'}`} />

                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-bold text-gray-900">{machine.name}</h3>
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                            machine.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                          }`}>
                            {machine.isActive ? '稼働中' : '停止中'}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600">{machine.location}</p>
                      </div>

                      {/* クイック統計 */}
                      <div className="hidden lg:flex items-center gap-6">
                        <div className="text-center">
                          <div className="text-xs text-gray-500 mb-1">売上</div>
                          <div className="text-sm font-semibold text-green-600">{formatCurrency(machine.totalSales)}</div>
                        </div>
                        <div className="text-center">
                          <div className="text-xs text-gray-500 mb-1">商品数</div>
                          <div className="text-sm font-semibold text-gray-900">{machine.products.length}</div>
                        </div>
                        <div className="text-center">
                          <div className="text-xs text-gray-500 mb-1">配布数</div>
                          <div className="text-sm font-semibold text-gray-900">{machine.totalDistributions}</div>
                        </div>
                        <div className="text-center">
                          <div className="text-xs text-gray-500 mb-1">CV率</div>
                          <div className="text-sm font-semibold text-purple-600">{conversionRate}%</div>
                        </div>
                      </div>
                    </div>

                    {/* 展開アイコン */}
                    <div className={`ml-4 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}>
                      <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>
                </div>

                {/* 展開コンテンツ */}
                {isExpanded && expandedMachine && (
                  <div className="border-t border-gray-200 bg-gray-50">
                    {/* タブナビゲーション */}
                    <div className="border-b border-gray-200 bg-white">
                      <div className="flex gap-1 px-6 py-3">
                        {[
                          { key: 'products', label: '商品管理', icon: 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4' },
                          { key: 'sales', label: '売上・統計', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' },
                          { key: 'design', label: 'デザイン', icon: 'M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01' },
                          { key: 'settings', label: '設定', icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z' }
                        ].map((tab) => (
                          <button
                            key={tab.key}
                            onClick={() => setPanelView(tab.key as PanelView)}
                            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                              panelView === tab.key
                                ? 'bg-blue-600 text-white shadow-md'
                                : 'text-gray-600 hover:bg-gray-100'
                            }`}
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={tab.icon} />
                            </svg>
                            {tab.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* タブコンテンツ */}
                    <div className="p-6">
                      {/* 商品管理 */}
                      {panelView === 'products' && (
                        <div>
                          <div className="flex items-center justify-between mb-6">
                            <h4 className="text-lg font-semibold text-gray-900">商品一覧</h4>
                            <button
                              onClick={() => openProductModal()}
                              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                              </svg>
                              商品追加
                            </button>
                          </div>

                          {expandedMachine.products.length === 0 ? (
                            <div className="text-center py-12 bg-white rounded-xl border-2 border-dashed border-gray-300">
                              <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                              </svg>
                              <p className="text-gray-600 font-medium">商品が登録されていません</p>
                              <p className="text-gray-500 text-sm mt-1">「商品追加」ボタンから登録してください</p>
                            </div>
                          ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                              {expandedMachine.products.map((product) => (
                                <div key={product.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
                                  <div className="relative h-40 bg-gray-100">
                                    {product.imageUrl ? (
                                      <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
                                    ) : (
                                      <div className="w-full h-full flex items-center justify-center text-gray-400">
                                        <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                        </svg>
                                      </div>
                                    )}
                                    <div className="absolute top-2 right-2">
                                      <span className={`px-2 py-1 rounded-lg text-xs font-medium ${
                                        product.isActive ? 'bg-green-500 text-white' : 'bg-gray-500 text-white'
                                      }`}>
                                        {product.isActive ? '販売中' : '停止中'}
                                      </span>
                                    </div>
                                  </div>
                                  <div className="p-4">
                                    <h5 className="font-semibold text-gray-900 mb-1">{product.name}</h5>
                                    <p className="text-xs text-gray-600 mb-3 line-clamp-2">{product.description}</p>
                                    <div className="flex items-center justify-between mb-3">
                                      <span className="text-lg font-bold text-green-600">{formatCurrency(product.price)}</span>
                                      <span className={`text-sm ${product.stock < 10 ? 'text-red-600 font-semibold' : 'text-gray-600'}`}>
                                        在庫: {product.stock}個
                                      </span>
                                    </div>
                                    <div className="flex gap-2">
                                      <button
                                        onClick={() => openProductModal(product)}
                                        className="flex-1 px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium transition-colors"
                                      >
                                        編集
                                      </button>
                                      <button
                                        onClick={() => handleDeleteProduct(product.id)}
                                        className="px-3 py-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg text-sm font-medium transition-colors"
                                      >
                                        削除
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                      {/* 売上・統計 */}
                      {panelView === 'sales' && (
                        <div>
                          <h4 className="text-lg font-semibold text-gray-900 mb-6">売上・統計情報</h4>
                          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                            <div className="bg-white rounded-xl p-4 border border-gray-200">
                              <div className="text-xs text-gray-500 mb-1">総売上</div>
                              <div className="text-xl font-bold text-green-600">{formatCurrency(expandedMachine.totalSales)}</div>
                            </div>
                            <div className="bg-white rounded-xl p-4 border border-gray-200">
                              <div className="text-xs text-gray-500 mb-1">総配布数</div>
                              <div className="text-xl font-bold text-blue-600">{expandedMachine.totalDistributions.toLocaleString()}個</div>
                            </div>
                            <div className="bg-white rounded-xl p-4 border border-gray-200">
                              <div className="text-xs text-gray-500 mb-1">コンバージョン率</div>
                              <div className="text-xl font-bold text-purple-600">{conversionRate}%</div>
                            </div>
                            <div className="bg-white rounded-xl p-4 border border-gray-200">
                              <div className="text-xs text-gray-500 mb-1">平均単価</div>
                              <div className="text-xl font-bold text-orange-600">
                                {formatCurrency(expandedMachine.totalDistributions > 0 ? expandedMachine.totalSales / expandedMachine.totalDistributions : 0)}
                              </div>
                            </div>
                          </div>

                          <div className="bg-white rounded-xl border border-gray-200 p-4">
                            <h5 className="font-semibold text-gray-900 mb-4">商品別パフォーマンス</h5>
                            {expandedMachine.products.length === 0 ? (
                              <p className="text-gray-500 text-center py-8">商品が登録されていません</p>
                            ) : (
                              <div className="space-y-3">
                                {expandedMachine.products.map((product, index) => (
                                  <div key={product.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                                    <div className="text-lg font-bold text-gray-400 w-8">#{index + 1}</div>
                                    {product.imageUrl && (
                                      <img src={product.imageUrl} alt={product.name} className="w-12 h-12 object-cover rounded-lg" />
                                    )}
                                    <div className="flex-1">
                                      <div className="font-medium text-gray-900">{product.name}</div>
                                      <div className="text-sm text-gray-600">{formatCurrency(product.price)}</div>
                                    </div>
                                    <div className="text-right">
                                      <div className="text-sm text-gray-600">在庫</div>
                                      <div className={`font-semibold ${product.stock < 10 ? 'text-red-600' : 'text-gray-900'}`}>
                                        {product.stock}個
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* デザイン */}
                      {panelView === 'design' && (
                        <div>
                          <div className="flex items-center justify-between mb-6">
                            <h4 className="text-lg font-semibold text-gray-900">デザインカスタマイズ</h4>
                            <div className="flex gap-2">
                              <button
                                onClick={() => setShowDesignPreview(true)}
                                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-medium transition-colors"
                              >
                                プレビュー
                              </button>
                              <button
                                onClick={handleSaveDesign}
                                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
                              >
                                保存
                              </button>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* 画像設定 */}
                            <div className="bg-white rounded-xl border border-gray-200 p-4">
                              <h5 className="font-semibold text-gray-900 mb-4">画像設定</h5>

                              <div className="space-y-4">
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-2">ヘッダー画像</label>
                                  {designForm.headerImage && (
                                    <div className="relative mb-2">
                                      <img src={designForm.headerImage} alt="ヘッダー" className="w-full h-24 object-cover rounded-lg" />
                                      <button
                                        onClick={() => setDesignForm({ ...designForm, headerImage: '' })}
                                        className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-lg text-xs"
                                      >
                                        削除
                                      </button>
                                    </div>
                                  )}
                                  <input ref={headerImageInputRef} type="file" accept="image/*" onChange={(e) => handleImageUpload(e, 'header')} className="hidden" />
                                  <button
                                    onClick={() => headerImageInputRef.current?.click()}
                                    className="w-full px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium transition-colors"
                                  >
                                    画像を選択
                                  </button>
                                </div>

                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-2">背景画像</label>
                                  {designForm.backgroundImage && (
                                    <div className="relative mb-2">
                                      <img src={designForm.backgroundImage} alt="背景" className="w-full h-24 object-cover rounded-lg" />
                                      <button
                                        onClick={() => setDesignForm({ ...designForm, backgroundImage: '' })}
                                        className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-lg text-xs"
                                      >
                                        削除
                                      </button>
                                    </div>
                                  )}
                                  <input ref={backgroundImageInputRef} type="file" accept="image/*" onChange={(e) => handleImageUpload(e, 'background')} className="hidden" />
                                  <button
                                    onClick={() => backgroundImageInputRef.current?.click()}
                                    className="w-full px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium transition-colors"
                                  >
                                    画像を選択
                                  </button>
                                </div>
                              </div>
                            </div>

                            {/* カラー設定 */}
                            <div className="bg-white rounded-xl border border-gray-200 p-4">
                              <h5 className="font-semibold text-gray-900 mb-4">カラーテーマ</h5>

                              <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-700 mb-2">プリセット</label>
                                <div className="grid grid-cols-5 gap-2">
                                  {Object.entries(PRESET_THEMES).map(([key, theme]) => (
                                    <button
                                      key={key}
                                      onClick={() => applyPresetTheme(key as keyof typeof PRESET_THEMES)}
                                      className="h-10 rounded-lg border-2 border-gray-300 hover:border-gray-400 transition-colors"
                                      style={{ background: `linear-gradient(135deg, ${theme.primaryColor}, ${theme.secondaryColor})` }}
                                      title={theme.name}
                                    />
                                  ))}
                                </div>
                              </div>

                              <div className="space-y-3">
                                {[
                                  { key: 'primaryColor', label: 'メインカラー' },
                                  { key: 'secondaryColor', label: 'サブカラー' },
                                  { key: 'accentColor', label: 'アクセント' },
                                  { key: 'buttonColor', label: 'ボタン' }
                                ].map((color) => (
                                  <div key={color.key} className="flex items-center gap-2">
                                    <input
                                      type="color"
                                      value={designForm[color.key as keyof typeof designForm] as string}
                                      onChange={(e) => setDesignForm({ ...designForm, [color.key]: e.target.value })}
                                      className="w-10 h-10 rounded-lg border-2 border-gray-300 cursor-pointer"
                                    />
                                    <label className="text-sm text-gray-700 flex-1">{color.label}</label>
                                    <input
                                      type="text"
                                      value={designForm[color.key as keyof typeof designForm] as string}
                                      onChange={(e) => setDesignForm({ ...designForm, [color.key]: e.target.value })}
                                      className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm font-mono w-28"
                                    />
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* 設定 */}
                      {panelView === 'settings' && (
                        <div>
                          <div className="flex items-center justify-between mb-6">
                            <h4 className="text-lg font-semibold text-gray-900">基本設定</h4>
                            <button
                              onClick={handleSaveSettings}
                              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
                            >
                              保存
                            </button>
                          </div>

                          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <div className="bg-white rounded-xl border border-gray-200 p-4">
                              <h5 className="font-semibold text-gray-900 mb-4">表示設定</h5>
                              <div className="space-y-4">
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-2">表示名</label>
                                  <input
                                    type="text"
                                    value={settingsForm.displayName}
                                    onChange={(e) => setSettingsForm({ ...settingsForm, displayName: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                  />
                                </div>
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-2">ウェルカムメッセージ</label>
                                  <input
                                    type="text"
                                    value={settingsForm.welcomeMessage}
                                    onChange={(e) => setSettingsForm({ ...settingsForm, welcomeMessage: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                  />
                                </div>
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-2">サンキューメッセージ</label>
                                  <input
                                    type="text"
                                    value={settingsForm.thankYouMessage}
                                    onChange={(e) => setSettingsForm({ ...settingsForm, thankYouMessage: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                  />
                                </div>
                              </div>
                            </div>

                            <div className="bg-white rounded-xl border border-gray-200 p-4">
                              <h5 className="font-semibold text-gray-900 mb-4">動作設定</h5>
                              <div className="space-y-4">
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-2">最大選択数</label>
                                  <input
                                    type="number"
                                    value={settingsForm.maxSelectionsPerUser}
                                    onChange={(e) => setSettingsForm({ ...settingsForm, maxSelectionsPerUser: Number(e.target.value) })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    min="1"
                                  />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                  <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">開始時間</label>
                                    <input
                                      type="time"
                                      value={settingsForm.operatingHours.start}
                                      onChange={(e) => setSettingsForm({
                                        ...settingsForm,
                                        operatingHours: { ...settingsForm.operatingHours, start: e.target.value }
                                      })}
                                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">終了時間</label>
                                    <input
                                      type="time"
                                      value={settingsForm.operatingHours.end}
                                      onChange={(e) => setSettingsForm({
                                        ...settingsForm,
                                        operatingHours: { ...settingsForm.operatingHours, end: e.target.value }
                                      })}
                                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* プレビューリンク */}
                          <div className="mt-6 bg-gradient-to-r from-purple-50 to-blue-50 rounded-xl border border-purple-200 p-4">
                            <h5 className="font-semibold text-gray-900 mb-2">メタバースUIプレビュー</h5>
                            <p className="text-sm text-gray-600 mb-3">3D空間からアクセスできるURL</p>
                            <div className="bg-white rounded-lg p-3 mb-3 border border-gray-200">
                              <code className="text-sm text-blue-600 break-all">{getMetaversePreviewUrl(expandedMachine.id)}</code>
                            </div>
                            <a
                              href={getMetaversePreviewUrl(expandedMachine.id)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-medium transition-colors"
                            >
                              新しいタブで開く
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                              </svg>
                            </a>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* パネルフッター */}
                    <div className="border-t border-gray-200 bg-white px-6 py-4">
                      <div className="flex items-center justify-between">
                        <button
                          onClick={() => setExpandedMachineId(null)}
                          className="text-sm text-gray-600 hover:text-gray-900 font-medium transition-colors"
                        >
                          閉じる
                        </button>
                        <button
                          onClick={() => handleDeleteMachine(machine.id)}
                          className="px-4 py-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg text-sm font-medium transition-colors"
                        >
                          自販機を削除
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* 新規作成モーダル */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <h3 className="text-xl font-bold text-gray-900 mb-4">新規自販機を作成</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">自販機名 *</label>
                <input
                  type="text"
                  value={newMachineName}
                  onChange={(e) => setNewMachineName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="例: 本社2F自販機"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">設置場所 *</label>
                <input
                  type="text"
                  value={newMachineLocation}
                  onChange={(e) => setNewMachineLocation(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="例: 東京本社 2階休憩室"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setNewMachineName('');
                  setNewMachineLocation('');
                }}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
              >
                キャンセル
              </button>
              <button
                onClick={handleCreateMachine}
                disabled={!newMachineName.trim() || !newMachineLocation.trim()}
                className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white rounded-lg font-medium transition-colors"
              >
                作成
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 商品モーダル */}
      {showProductModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-2xl p-6 w-full max-w-2xl my-8 shadow-2xl">
            <h3 className="text-xl font-bold text-gray-900 mb-4">
              {editingProduct ? '商品を編集' : '新規商品を追加'}
            </h3>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">商品名 *</label>
                  <input
                    type="text"
                    value={productForm.name}
                    onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">カテゴリ</label>
                  <select
                    value={productForm.category}
                    onChange={(e) => setProductForm({ ...productForm, category: e.target.value as 'drink' | 'snack' | 'other' })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="drink">飲料</option>
                    <option value="snack">スナック</option>
                    <option value="other">その他</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">説明</label>
                <textarea
                  value={productForm.description}
                  onChange={(e) => setProductForm({ ...productForm, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  rows={2}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">価格（円）</label>
                  <input
                    type="number"
                    value={productForm.price}
                    onChange={(e) => setProductForm({ ...productForm, price: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    min="0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">在庫数</label>
                  <input
                    type="number"
                    value={productForm.stock}
                    onChange={(e) => setProductForm({ ...productForm, stock: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    min="0"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">商品画像</label>
                {productForm.imageUrl && (
                  <div className="relative mb-2">
                    <img src={productForm.imageUrl} alt="プレビュー" className="w-full h-40 object-cover rounded-lg" />
                    <button
                      onClick={() => setProductForm({ ...productForm, imageUrl: '' })}
                      className="absolute top-2 right-2 p-2 bg-red-500 text-white rounded-lg text-xs font-medium"
                    >
                      削除
                    </button>
                  </div>
                )}
                <div className="flex gap-2">
                  <input ref={productImageInputRef} type="file" accept="image/*" onChange={(e) => handleImageUpload(e, 'product')} className="hidden" />
                  <button
                    onClick={() => productImageInputRef.current?.click()}
                    className="flex-1 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition-colors"
                  >
                    画像をアップロード
                  </button>
                  <input
                    type="text"
                    value={productForm.imageUrl}
                    onChange={(e) => setProductForm({ ...productForm, imageUrl: e.target.value })}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="またはURLを入力"
                  />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={productForm.isActive}
                  onChange={(e) => setProductForm({ ...productForm, isActive: e.target.checked })}
                  className="w-4 h-4 text-blue-600 rounded"
                />
                <label htmlFor="isActive" className="text-sm text-gray-700">販売中にする</label>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowProductModal(false);
                  setEditingProduct(null);
                }}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
              >
                キャンセル
              </button>
              <button
                onClick={handleSaveProduct}
                className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
              >
                保存
              </button>
            </div>
          </div>
        </div>
      )}

      {/* デザインプレビューモーダル */}
      {showDesignPreview && expandedMachine && (
        <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl w-full max-w-4xl">
            <div className="p-6 border-b border-gray-200 flex justify-between items-center">
              <h3 className="text-xl font-bold text-gray-900">デザインプレビュー</h3>
              <button onClick={() => setShowDesignPreview(false)} className="text-gray-500 hover:text-gray-700">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
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
              {designForm.headerImage && (
                <div className="mb-6 rounded-xl overflow-hidden shadow-2xl">
                  <img src={designForm.headerImage} alt="ヘッダー" className="w-full h-48 object-cover" />
                </div>
              )}
              <div
                className="p-6 rounded-2xl shadow-2xl backdrop-blur-sm border-2"
                style={{
                  backgroundColor: designForm.cardBackgroundColor + 'DD',
                  borderColor: designForm.accentColor
                }}
              >
                <h3 className="text-2xl font-bold mb-4" style={{ color: designForm.textColor }}>
                  {expandedMachine.settings.displayName}
                </h3>
                <p className="mb-4" style={{ color: designForm.textColor + 'DD' }}>
                  {expandedMachine.settings.welcomeMessage}
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
                className="w-full px-6 py-3 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-medium transition-colors"
              >
                閉じる
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VendingDashboard;
