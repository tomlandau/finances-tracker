import { useContext } from 'react';
import { CategoriesContext } from '@/context/CategoriesContext';
import type { CategoryType } from '@/types';

export function useCategories(type: CategoryType = 'income') {
  const context = useContext(CategoriesContext);

  if (!context) {
    throw new Error('useCategories must be used within CategoriesProvider');
  }

  const categories = type === 'income'
    ? context.incomeCategories
    : context.expenseCategories;

  const refetch = type === 'income'
    ? context.refetchIncome
    : context.refetchExpense;

  return {
    categories,
    loading: context.loading,
    error: context.error,
    refetch
  };
}
