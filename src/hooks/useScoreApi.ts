/**
 * @file スコアAPI フック
 * @description スコアシステムAPIと連携するReact Hooks
 */

import { useState, useEffect, useCallback } from 'react';
import type { RankingEntry } from '../components/score/RankingPanel';
import type { TenantScoreData } from '../components/score/TenantScoreCard';
import type { Achievement } from '../components/score/BadgeSystem';

// ========================================
// 型定義
// ========================================

export interface UserScoreData {
  userId: string;
  address: string;
  economic: {
    score: number;
    level: number;
    displayLevel: number;
    raw: string;
    tokens: { [token: string]: string };
  };
  resonance: {
    score: number;
    level: number;
    displayLevel: number;
    count: number;
    streak: number;
    longestStreak: number;
    lastDate?: string;
    actions: {
      tips: number;
      utilityTokenTips: number;  // tNHT等のユーティリティトークン（重み1.0）
      economicTokenTips: number; // JPYC等のEconomic軸トークン（重み0.3）
      purchases: number;
      claims: number;
      logins: number;
    };
  };
  composite: {
    score: number;
    economicWeight: number;
    resonanceWeight: number;
    curve: string;
    formula: string;
  };
  lastUpdated: string;
}

export interface RankingResponse {
  success: boolean;
  data: {
    axis: string;
    rankings: RankingEntry[];
    pagination: {
      limit: number;
      offset: number;
      total: number;
      hasMore: boolean;
    };
  };
}

export interface AllRankingsResponse {
  success: boolean;
  data: {
    economic: RankingEntry[];
    resonance: RankingEntry[];
    composite: RankingEntry[];
  };
}

// ========================================
// API設定
// ========================================

const API_BASE_URL = import.meta.env.VITE_SCORE_API_URL || 'http://localhost:3001/api';

// ========================================
// ユーザースコアフック
// ========================================

export function useUserScore(userId: string | undefined) {
  const [data, setData] = useState<UserScoreData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchUserScore = useCallback(async () => {
    if (!userId) {
      setData(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE_URL}/profile/${userId}`);
      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || 'Failed to fetch user score');
      }

      setData(result.data);
    } catch (err) {
      setError(err as Error);
      console.error('Error fetching user score:', err);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchUserScore();
  }, [fetchUserScore]);

  return {
    data,
    loading,
    error,
    refetch: fetchUserScore,
  };
}

// ========================================
// ユーザーランクフック
// ========================================

export function useUserRank(userId: string | undefined) {
  const [data, setData] = useState<{
    userId: string;
    ranks: {
      economic: number | null;
      resonance: number | null;
      composite: number | null;
    };
    totalUsers: number;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!userId) {
      setData(null);
      return;
    }

    const fetchUserRank = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(`${API_BASE_URL}/profile/${userId}/rank`);
        const result = await response.json();

        if (!response.ok || !result.success) {
          throw new Error(result.message || 'Failed to fetch user rank');
        }

        setData(result.data);
      } catch (err) {
        setError(err as Error);
        console.error('Error fetching user rank:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchUserRank();
  }, [userId]);

  return { data, loading, error };
}

// ========================================
// ランキングフック（単一軸）
// ========================================

export function useRankings(axis: 'economic' | 'resonance' | 'composite', limit = 100, offset = 0) {
  const [data, setData] = useState<RankingEntry[]>([]);
  const [pagination, setPagination] = useState({
    limit: 0,
    offset: 0,
    total: 0,
    hasMore: false,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchRankings = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE_URL}/rankings/${axis}?limit=${limit}&offset=${offset}`);
      const result: RankingResponse = await response.json();

      if (!response.ok || !result.success) {
        throw new Error('Failed to fetch rankings');
      }

      setData(result.data.rankings);
      setPagination(result.data.pagination);
    } catch (err) {
      setError(err as Error);
      console.error('Error fetching rankings:', err);
    } finally {
      setLoading(false);
    }
  }, [axis, limit, offset]);

  useEffect(() => {
    fetchRankings();
  }, [fetchRankings]);

  return {
    data,
    pagination,
    loading,
    error,
    refetch: fetchRankings,
  };
}

// ========================================
// 全ランキングフック
// ========================================

export function useAllRankings(limit = 100) {
  const [data, setData] = useState<{
    economic: RankingEntry[];
    resonance: RankingEntry[];
    composite: RankingEntry[];
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchAllRankings = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE_URL}/rankings/all?limit=${limit}`);
      const result: AllRankingsResponse = await response.json();

      if (!response.ok || !result.success) {
        throw new Error('Failed to fetch rankings');
      }

      setData(result.data);
    } catch (err) {
      setError(err as Error);
      console.error('Error fetching all rankings:', err);
    } finally {
      setLoading(false);
    }
  }, [limit]);

  useEffect(() => {
    fetchAllRankings();
  }, [fetchAllRankings]);

  return {
    data,
    loading,
    error,
    refetch: fetchAllRankings,
  };
}

// ========================================
// テナントスコアフック（モック）
// ========================================

/**
 * テナント別スコアを取得（将来実装予定）
 */
export function useTenantScores(userId: string | undefined): {
  data: TenantScoreData[];
  loading: boolean;
  error: Error | null;
  toggleFavorite: (tenantId: string) => void;
} {
  const [data, setData] = useState<TenantScoreData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error] = useState<Error | null>(null);

  useEffect(() => {
    if (!userId) {
      setData([]);
      return;
    }

    // TODO: 実際のAPIエンドポイントから取得
    // 現在はモックデータ
    setLoading(true);
    setTimeout(() => {
      setData([
        // モックデータは実装時に削除
      ]);
      setLoading(false);
    }, 500);
  }, [userId]);

  const toggleFavorite = useCallback((tenantId: string) => {
    setData((prev) =>
      prev.map((tenant) =>
        tenant.tenantId === tenantId ? { ...tenant, isFavorite: !tenant.isFavorite } : tenant
      )
    );
  }, []);

  return { data, loading, error, toggleFavorite };
}

// ========================================
// 実績フック（モック）
// ========================================

/**
 * ユーザーの実績を取得（将来実装予定）
 */
export function useAchievements(userId: string | undefined): {
  data: Achievement[];
  loading: boolean;
  error: Error | null;
} {
  const [data, setData] = useState<Achievement[]>([]);
  const [loading, setLoading] = useState(false);
  const [error] = useState<Error | null>(null);

  useEffect(() => {
    if (!userId) {
      setData([]);
      return;
    }

    // TODO: 実際のAPIエンドポイントから取得
    // 現在は基本的な実績のモックデータ
    setLoading(true);
    setTimeout(() => {
      setData([
        {
          id: 'first_tip',
          name: '初TIP',
          description: '初めてTIPしました',
          emoji: '🎉',
          unlocked: true,
          unlockedAt: new Date('2025-01-15'),
        },
        {
          id: 'week_streak',
          name: '7日連続',
          description: '7日連続で応援しました',
          emoji: '🔥',
          unlocked: false,
          progress: 60,
        },
        {
          id: 'level_10',
          name: 'レベル10',
          description: 'レベル10に到達しました',
          emoji: '⭐',
          unlocked: false,
          progress: 45,
        },
        {
          id: 'top_100',
          name: 'トップ100',
          description: 'ランキングトップ100に入りました',
          emoji: '🏆',
          unlocked: false,
          progress: 0,
        },
      ]);
      setLoading(false);
    }, 500);
  }, [userId]);

  return { data, loading, error };
}

// ========================================
// スナップショットフック
// ========================================

export function useLatestSnapshot() {
  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchSnapshot = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(`${API_BASE_URL}/snapshot/latest`);
        const result = await response.json();

        if (!response.ok || !result.success) {
          throw new Error('Failed to fetch snapshot');
        }

        setData(result.data);
      } catch (err) {
        setError(err as Error);
        console.error('Error fetching snapshot:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchSnapshot();
  }, []);

  return { data, loading, error };
}
