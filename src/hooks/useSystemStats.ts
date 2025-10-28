// src/hooks/useSystemStats.ts
// システム全体の統計情報を取得するフック

import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useContract, useContractRead } from '@thirdweb-dev/react';
import { SBT_CONTRACT, JPYC_TOKEN } from '../contract';
import { PAYMENT_SPLITTER_V2_ABI } from '../contract';

/**
 * プラットフォーム全体の統計情報
 */
export interface SystemStats {
  // GIFT HUB統計
  totalHubs: number;
  activeHubs: number;
  totalProducts: number;

  // 配布統計
  totalDistributions: number;
  totalRevenue: string; // wei単位（JPYC）

  // ユーザー統計
  totalUsers: number;
  activeUsersToday: number;
  activeUsersWeek: number;

  // テナント統計
  totalTenants: number;
  activeTenants: number;

  // トランザクション統計
  totalTransactions: number;
  transactionsToday: number;

  // ランク分布
  rankDistribution: {
    bronze: number;
    silver: number;
    gold: number;
    platinum: number;
    diamond: number;
  };
}

/**
 * システム統計取得フック
 */
export function useSystemStats() {
  const [stats, setStats] = useState<SystemStats>({
    totalHubs: 0,
    activeHubs: 0,
    totalProducts: 0,
    totalDistributions: 0,
    totalRevenue: '0',
    totalUsers: 0,
    activeUsersToday: 0,
    activeUsersWeek: 0,
    totalTenants: 1, // 現在はデフォルトテナントのみ
    activeTenants: 1,
    totalTransactions: 0,
    transactionsToday: 0,
    rankDistribution: {
      bronze: 0,
      silver: 0,
      gold: 0,
      platinum: 0,
      diamond: 0,
    },
  });

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /**
   * Supabaseからデータを取得
   */
  useEffect(() => {
    const fetchStats = async () => {
      try {
        setIsLoading(true);

        // GIFT HUB統計を取得
        const { data: hubs, error: hubsError } = await supabase
          .from('vending_machines')
          .select('id, is_active, total_distributions');

        if (hubsError) throw hubsError;

        const totalHubs = hubs?.length || 0;
        const activeHubs = hubs?.filter(h => h.is_active).length || 0;
        const totalDistributions = hubs?.reduce((sum, h) => sum + (h.total_distributions || 0), 0) || 0;

        // 商品統計を取得
        const { data: products, error: productsError } = await supabase
          .from('products')
          .select('id, is_active');

        if (productsError) throw productsError;

        const totalProducts = products?.filter(p => p.is_active).length || 0;

        // 配布履歴統計を取得
        const { data: purchases, error: purchasesError } = await supabase
          .from('purchase_history')
          .select('id, amount, created_at');

        if (purchasesError) throw purchasesError;

        const totalRevenue = purchases?.reduce((sum, p) => sum + BigInt(p.amount || 0), BigInt(0)).toString() || '0';

        // 今日と今週のフィルタリング
        const now = new Date();
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

        const transactionsToday = purchases?.filter(p => new Date(p.created_at) >= todayStart).length || 0;
        const totalTransactions = purchases?.length || 0;

        // 統計を更新
        setStats(prev => ({
          ...prev,
          totalHubs,
          activeHubs,
          totalProducts,
          totalDistributions,
          totalRevenue,
          totalTransactions,
          transactionsToday,
        }));

        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch stats');
      } finally {
        setIsLoading(false);
      }
    };

    fetchStats();

    // 🔄 Supabase Realtimeでリアルタイム更新
    console.log('🔄 Supabase Realtimeをサブスクライブ中...');

    // purchase_historyテーブルの変更を監視
    const purchaseChannel = supabase
      .channel('purchase_history_changes')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'purchase_history' },
        (payload) => {
          console.log('🔔 purchase_history更新:', payload);
          fetchStats(); // データを再取得
        }
      )
      .subscribe();

    // vending_machinesテーブルの変更を監視
    const vmChannel = supabase
      .channel('vending_machines_changes')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'vending_machines' },
        (payload) => {
          console.log('🔔 vending_machines更新:', payload);
          fetchStats(); // データを再取得
        }
      )
      .subscribe();

    return () => {
      console.log('🔄 Supabase Realtimeサブスクリプション解除');
      supabase.removeChannel(purchaseChannel);
      supabase.removeChannel(vmChannel);
    };
  }, []);

  return {
    stats,
    isLoading,
    error,
    refetch: () => {
      // 手動で再取得をトリガー
      setIsLoading(true);
    },
  };
}

/**
 * リアルタイム統計（簡易版）
 * より頻繁に更新が必要な統計用
 */
export function useRealtimeStats() {
  const [realtimeData, setRealtimeData] = useState({
    currentOnlineUsers: 0,
    activeTransactions: 0,
    systemLoad: 0, // 0-100%
  });

  useEffect(() => {
    // TODO: WebSocketまたはSupabase Realtime subscriptionで実装
    // 現在はモックデータ
    const mockUpdate = () => {
      setRealtimeData({
        currentOnlineUsers: Math.floor(Math.random() * 50) + 10,
        activeTransactions: Math.floor(Math.random() * 5),
        systemLoad: Math.floor(Math.random() * 30) + 20,
      });
    };

    // 5秒ごとに更新
    const interval = setInterval(mockUpdate, 5000);
    mockUpdate(); // 初回実行

    return () => clearInterval(interval);
  }, []);

  return realtimeData;
}

/**
 * PaymentSplitter収益統計
 */
export function usePaymentSplitterStats(splitterAddress?: string) {
  const { contract } = useContract(splitterAddress, PAYMENT_SPLITTER_V2_ABI);

  // 統計取得
  const { data: splitterStats } = useContractRead(
    contract,
    'getStats',
    []
  );

  // 受益者数取得
  const { data: payeeCount } = useContractRead(
    contract,
    'payeeCount',
    []
  );

  // 総シェア数取得
  const { data: totalShares } = useContractRead(
    contract,
    'totalShares',
    []
  );

  return {
    payeeCount: payeeCount ? Number(payeeCount) : 0,
    totalShares: totalShares ? Number(totalShares) : 0,
    nativeBalance: splitterStats?.[2] ? splitterStats[2].toString() : '0',
    totalNativeReceived: splitterStats?.[3] ? splitterStats[3].toString() : '0',
    isPaused: splitterStats?.[4] || false,
  };
}
