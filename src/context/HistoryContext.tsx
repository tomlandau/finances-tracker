import { createContext, useState, useEffect, ReactNode, useCallback } from 'react';
import type { HistoryState, Transaction, HistoryFilters } from '@/types/history.types';
import { api } from '@/services/api';

export const HistoryContext = createContext<HistoryState | null>(null);

const DEFAULT_FILTERS: HistoryFilters = {
  type: 'all',
};

export function HistoryProvider({ children }: { children: ReactNode }) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [filters, setFiltersState] = useState<HistoryFilters>(DEFAULT_FILTERS);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | undefined>(undefined);

  const fetchTransactions = useCallback(async () => {
    setLoading(true);
    setError(undefined);
    try {
      const data = await api.fetchRecent(filters, 20);
      setTransactions(data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load transactions';
      setError(errorMessage);
      console.error('Failed to fetch transactions:', err);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  // Automatically refetch when filters change
  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  const setFilters = useCallback((newFilters: Partial<HistoryFilters>) => {
    setFiltersState(prev => ({ ...prev, ...newFilters }));
  }, []);

  const clearFilters = useCallback(() => {
    setFiltersState(DEFAULT_FILTERS);
  }, []);

  const refresh = useCallback(async () => {
    await fetchTransactions();
  }, [fetchTransactions]);

  const deleteTransaction = useCallback(async (id: string, type: 'income' | 'expense'): Promise<boolean> => {
    try {
      await api.deleteTransaction(id, type);
      // Refetch transactions after successful deletion
      await fetchTransactions();
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete transaction';
      setError(errorMessage);
      console.error('Failed to delete transaction:', err);
      return false;
    }
  }, [fetchTransactions]);

  return (
    <HistoryContext.Provider
      value={{
        transactions,
        filters,
        loading,
        error,
        fetchTransactions,
        setFilters,
        clearFilters,
        refresh,
        deleteTransaction,
      }}
    >
      {children}
    </HistoryContext.Provider>
  );
}
