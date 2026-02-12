import { useState, useEffect, useCallback, useMemo, useContext } from 'react';
import type { TabConfig } from '@/types/tab.types';
import type { Transaction } from '@/types/history.types';
import type { TabFilters } from '@/types/filter.types';
import { api } from '@/services/api';
import { CategoriesContext } from '@/context/CategoriesContext';

export function useTabTransactions(tab: TabConfig, selectedMonth: string, filters?: TabFilters) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [optimisticTransactions, setOptimisticTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | undefined>(undefined);

  const context = useContext(CategoriesContext);
  if (!context) {
    throw new Error('useTabTransactions must be used within CategoriesProvider');
  }

  const { incomeCategories, expenseCategories } = context;

  // Get the appropriate categories for this tab
  const categories = tab.transactionType === 'income' ? incomeCategories : expenseCategories;

  // Filter categories based on tab filters
  const filteredCategories = useMemo(() => {
    return categories.filter((category) => {
      if (tab.transactionType === 'income' && tab.filters.owner) {
        return category.owner === tab.filters.owner;
      }
      if (tab.transactionType === 'expense' && tab.filters.businessHome) {
        return category.businessHome === tab.filters.businessHome;
      }
      return true;
    });
  }, [categories, tab.filters, tab.transactionType]);

  // Get category IDs for filtering transactions
  const categoryIds = useMemo(() => {
    return new Set(filteredCategories.map((cat) => cat.id));
  }, [filteredCategories]);

  // Derive start and end dates from selectedMonth or filters.dateRange
  const [startDate, endDate] = useMemo(() => {
    // Use custom date range if provided, otherwise use selectedMonth
    if (filters?.dateRange?.start || filters?.dateRange?.end) {
      return [
        filters.dateRange.start || '',
        filters.dateRange.end || ''
      ];
    }

    const [year, month] = selectedMonth.split('-').map(Number);
    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 0); // Last day of month

    const startStr = start.toISOString().split('T')[0];
    const endStr = end.toISOString().split('T')[0];

    return [startStr, endStr];
  }, [selectedMonth, filters?.dateRange]);

  const fetchTransactions = useCallback(async () => {
    setLoading(true);
    setError(undefined);
    try {
      const data = await api.fetchRecent(
        {
          type: tab.transactionType,
          startDate,
          endDate,
          ...(filters?.categoryId && { categoryId: filters.categoryId }),
        },
        1000 // High limit to get all transactions for the month
      );

      // Filter by category IDs (tab-level filtering)
      let filtered = data.filter((transaction) => categoryIds.has(transaction.categoryId));

      // Apply additional client-side filters
      if (filters?.expenseType && tab.transactionType === 'expense') {
        filtered = filtered.filter(t => {
          const category = categories.find(c => c.id === t.categoryId);
          return category?.expenseType === filters.expenseType;
        });
      }

      // Filter by recurring only
      if (filters?.recurringOnly) {
        filtered = filtered.filter(t => t.isRecurring === true);
      }

      setTransactions(filtered);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load transactions';
      setError(errorMessage);
      console.error('Failed to fetch transactions:', err);
    } finally {
      setLoading(false);
    }
  }, [tab.transactionType, startDate, endDate, categoryIds, filters, categories]);

  // Fetch transactions when dependencies change
  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  // Merge optimistic transactions with real ones
  const allTransactions = useMemo(() => {
    // Optimistic transactions appear first
    return [...optimisticTransactions, ...transactions];
  }, [optimisticTransactions, transactions]);

  // Calculate summary
  const summary = useMemo(() => {
    const total = allTransactions.reduce((sum, t) => sum + t.amount, 0);
    return {
      total,
      count: allTransactions.length,
    };
  }, [allTransactions]);

  // Add optimistic transaction
  const addOptimisticTransaction = useCallback((transaction: Transaction) => {
    setOptimisticTransactions((prev) => [transaction, ...prev]);
  }, []);

  // Remove optimistic transaction
  const removeOptimisticTransaction = useCallback((id: string) => {
    setOptimisticTransactions((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Clear all optimistic transactions
  const clearOptimisticTransactions = useCallback(() => {
    setOptimisticTransactions([]);
  }, []);

  return {
    transactions: allTransactions,
    loading,
    error,
    refresh: fetchTransactions,
    summary,
    addOptimisticTransaction,
    removeOptimisticTransaction,
    clearOptimisticTransactions,
  };
}
