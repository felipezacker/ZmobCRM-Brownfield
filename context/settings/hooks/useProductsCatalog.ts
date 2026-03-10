import { useState, useCallback, useEffect } from 'react';
import { Product } from '@/types';
import { productsService } from '@/lib/supabase';

export function useProductsCatalog() {
  const [products, setProducts] = useState<Product[]>([]);

  const refreshProducts = useCallback(async () => {
    try {
      const res = await productsService.getActive();
      if (res.error) {
        console.warn('[Settings] Falha ao carregar produtos:', res.error.message);
        return;
      }
      setProducts(res.data);
    } catch (e) {
      console.warn('[Settings] Falha ao carregar produtos:', e);
    }
  }, []);

  // Listen for custom event to reload catalog (e.g. Settings > Produtos page)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handler = () => {
      refreshProducts();
    };
    window.addEventListener('crm:products-updated', handler as EventListener);
    return () => window.removeEventListener('crm:products-updated', handler as EventListener);
  }, [refreshProducts]);

  return {
    products,
    refreshProducts,
  };
}
