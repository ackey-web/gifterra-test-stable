// src/hooks/useSupabaseProducts.ts
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

export interface SupabaseProduct {
  id: string;
  tenant_id: string;
  name: string;
  description: string | null;
  content_path: string;
  image_url: string | null;
  price_token: string;
  price_amount_wei: string;
  stock: number;
  is_unlimited: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface UseSupabaseProductsOptions {
  tenantId: string;
  isActive?: boolean;
}

export function useSupabaseProducts({ tenantId, isActive = true }: UseSupabaseProductsOptions) {
  const [products, setProducts] = useState<SupabaseProduct[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProducts = useCallback(async () => {
    console.log('🔄 [useSupabaseProducts] refetch開始:', { tenantId, isActive });
    setIsLoading(true);
    setError(null);

    try {
      console.log('📦 Fetching products from Supabase:', { tenantId, isActive });

      let query = supabase
        .from('products')
        .select('*')
        .eq('tenant_id', tenantId);

      if (isActive !== undefined) {
        query = query.eq('is_active', isActive);
      }

      // created_at の降順でソート
      query = query.order('created_at', { ascending: false });

      const { data, error: fetchError } = await query;

      if (fetchError) {
        console.error('❌ Failed to fetch products:', fetchError);
        throw new Error(fetchError.message);
      }

      console.log(`✅ Fetched ${data?.length || 0} products from Supabase`, data);
      setProducts(data || []);

    } catch (err) {
      console.error('❌ Error fetching products:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
      console.log('✅ [useSupabaseProducts] refetch完了');
    }
  }, [tenantId, isActive]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  return { products, isLoading, error, refetch: fetchProducts };
}
