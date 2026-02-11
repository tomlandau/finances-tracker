import { createContext, useState, useEffect, ReactNode, useCallback } from 'react';
import type { CategoriesState, Category } from '@/types';
import { api } from '@/services/api';

export const CategoriesContext = createContext<CategoriesState | null>(null);

export function CategoriesProvider({ children }: { children: ReactNode }) {
  const [incomeCategories, setIncomeCategories] = useState<Category[]>([]);
  const [expenseCategories, setExpenseCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchIncome = useCallback(async () => {
    try {
      setError(null);
      const data = await api.fetchCategories('income');
      setIncomeCategories(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load income categories');
      throw err; // Re-throw to handle in loadAll
    }
  }, []);

  const fetchExpense = useCallback(async () => {
    try {
      setError(null);
      const data = await api.fetchCategories('expense');
      setExpenseCategories(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load expense categories');
      throw err; // Re-throw to handle in loadAll
    }
  }, []);

  // Load both on mount
  useEffect(() => {
    const loadAll = async () => {
      setLoading(true);
      setError(null);
      try {
        await Promise.all([fetchIncome(), fetchExpense()]);
      } catch (err) {
        // Error already set in individual fetch functions
        console.error('Failed to load categories:', err);
      } finally {
        setLoading(false);
      }
    };
    loadAll();
  }, [fetchIncome, fetchExpense]);

  return (
    <CategoriesContext.Provider
      value={{
        incomeCategories,
        expenseCategories,
        loading,
        error,
        refetchIncome: fetchIncome,
        refetchExpense: fetchExpense,
      }}
    >
      {children}
    </CategoriesContext.Provider>
  );
}
