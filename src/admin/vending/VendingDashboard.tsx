import React, { useState } from 'react';
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
        start: '24:00',
        end: '24:00'
      }
    }
  }
];

interface VendingDashboardProps {
  onNavigateToEditor?: (machineId: string) => void;
  onNavigateToPreview?: (machineId: string) => void;
  onNavigateToStats?: (machineId: string) => void;
}

const VendingDashboard: React.FC<VendingDashboardProps> = ({
  onNavigateToEditor,
  onNavigateToPreview,
  onNavigateToStats
}) => {
  const [machines, setMachines] = useState<VendingMachine[]>(mockMachines);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newMachineName, setNewMachineName] = useState('');
  const [newMachineLocation, setNewMachineLocation] = useState('');

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
        operatingHours: {
          start: '08:00',
          end: '20:00'
        }
      }
    };

    setMachines(prev => [...prev, newMachine]);
    setNewMachineName('');
    setNewMachineLocation('');
    setShowCreateModal(false);
  };

  const handleDeleteMachine = (machineId: string) => {
    if (window.confirm('この自販機を削除しますか？')) {
      setMachines(prev => prev.filter(m => m.id !== machineId));
    }
  };

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
      day: 'numeric'
    });
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* ヘッダー */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">自販機管理</h1>
          <p className="text-gray-600">登録済み自販機の管理と新規作成</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="mt-4 sm:mt-0 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium flex items-center gap-2 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          新規自販機を追加
        </button>
      </div>

      {/* 統計サマリー */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
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
              <p className="text-3xl font-bold text-gray-900">
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
      </div>

      {/* 自販機一覧 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {machines.map((machine) => (
          <div key={machine.id} className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-gray-900 mb-1">{machine.name}</h3>
                  <p className="text-gray-600 text-sm mb-2">{machine.location}</p>
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      machine.isActive 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {machine.isActive ? '稼働中' : '停止中'}
                    </span>
                    <span className="text-xs text-gray-500">
                      {machine.products.length}種類の商品
                    </span>
                  </div>
                </div>
              </div>

              <div className="space-y-3 mb-6">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">売上</span>
                  <span className="font-semibold">{formatCurrency(machine.totalSales)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">アクセス数</span>
                  <span className="font-semibold">{machine.totalAccessCount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">配布数</span>
                  <span className="font-semibold">{machine.totalDistributions.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">最終更新</span>
                  <span className="text-sm text-gray-500">{formatDate(machine.updatedAt)}</span>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => onNavigateToEditor?.(machine.id)}
                    className="px-4 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg font-medium transition-colors text-sm"
                  >
                    編集
                  </button>
                  <button
                    onClick={() => onNavigateToPreview?.(machine.id)}
                    className="px-4 py-2 bg-green-50 hover:bg-green-100 text-green-700 rounded-lg font-medium transition-colors text-sm"
                  >
                    プレビュー
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => onNavigateToStats?.(machine.id)}
                    className="px-4 py-2 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-lg font-medium transition-colors text-sm"
                  >
                    統計
                  </button>
                  <button
                    onClick={() => handleDeleteMachine(machine.id)}
                    className="px-4 py-2 bg-red-50 hover:bg-red-100 text-red-700 rounded-lg font-medium transition-colors text-sm"
                  >
                    削除
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* 新規作成モーダル */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md">
            <h2 className="text-xl font-bold text-gray-900 mb-4">新規自販機を作成</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  自販機名
                </label>
                <input
                  type="text"
                  value={newMachineName}
                  onChange={(e) => setNewMachineName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="例: 本社2F自販機"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  設置場所
                </label>
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
                onClick={() => setShowCreateModal(false)}
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
    </div>
  );
};

export default VendingDashboard;