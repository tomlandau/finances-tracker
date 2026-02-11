import { createContext, useState, useEffect, ReactNode, useCallback } from 'react';
import type { CategoriesState, Category } from '@/types';
import { api } from '@/services/api';

export const CategoriesContext = createContext<CategoriesState | null>(null);

export function CategoriesProvider({ children }: { children: ReactNode }) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCategories = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.fetchCategories();
      setCategories(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load categories');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  return (
    <CategoriesContext.Provider
      value={{ categories, loading, error, refetch: fetchCategories }}
    >
      {children}
    </CategoriesContext.Provider>
  );
}
