import { useState, useEffect, useMemo } from 'react';
import { api } from '@/services/api';
import type { Transaction } from '@/types/history.types';
import type { MonthlySummary, CategorySummary, YearlyAnalytics } from '@/types/analytics.types';

const HEBREW_MONTHS = [
  'ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני',
  'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'
];

export function useAnalytics(year: number) {
  const [incomeTransactions, setIncomeTransactions] = useState<Transaction[]>([]);
  const [expenseTransactions, setExpenseTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchYearData = async () => {
      setLoading(true);
      setError(null);
      try {
        const startDate = `${year}-01-01`;
        const endDate = `${year}-12-31`;

        // Fetch income and expense in parallel
        const [income, expense] = await Promise.all([
          api.fetchRecent({ type: 'income', startDate, endDate }, 10000),
          api.fetchRecent({ type: 'expense', startDate, endDate }, 10000)
        ]);

        setIncomeTransactions(income);
        setExpenseTransactions(expense);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch analytics data');
      } finally {
        setLoading(false);
      }
    };

    fetchYearData();
  }, [year]);

  const analytics: YearlyAnalytics = useMemo(() => {
    // Calculate monthly summaries
    const monthlySummaries: MonthlySummary[] = [];

    for (let month = 1; month <= 12; month++) {
      const monthStr = month.toString().padStart(2, '0');
      const monthKey = `${year}-${monthStr}`;

      const monthIncome = incomeTransactions
        .filter(t => t.date.startsWith(monthKey))
        .reduce((sum, t) => sum + (t.grossAmount || t.amount), 0);

      const monthExpense = expenseTransactions
        .filter(t => t.date.startsWith(monthKey))
        .reduce((sum, t) => sum + t.amount, 0);

      monthlySummaries.push({
        month: monthKey,
        monthName: HEBREW_MONTHS[month - 1],
        income: monthIncome,
        expense: monthExpense,
        balance: monthIncome - monthExpense
      });
    }

    // Calculate total income
    const totalIncome = incomeTransactions.reduce(
      (sum, t) => sum + (t.grossAmount || t.amount), 0
    );

    // Calculate total expense
    const totalExpense = expenseTransactions.reduce(
      (sum, t) => sum + t.amount, 0
    );

    // Calculate top income categories
    const incomeCategoryTotals = new Map<string, { name: string; total: number }>();
    incomeTransactions.forEach(t => {
      const existing = incomeCategoryTotals.get(t.categoryId);
      if (existing) {
        existing.total += t.grossAmount || t.amount;
      } else {
        incomeCategoryTotals.set(t.categoryId, {
          name: t.categoryName,
          total: t.grossAmount || t.amount
        });
      }
    });

    const topIncomeCategories: CategorySummary[] = Array.from(incomeCategoryTotals.entries())
      .map(([id, data]) => ({
        categoryId: id,
        categoryName: data.name,
        total: data.total,
        percentage: totalIncome > 0 ? (data.total / totalIncome) * 100 : 0
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 10);

    // Calculate top expense categories
    const expenseCategoryTotals = new Map<string, { name: string; total: number }>();
    expenseTransactions.forEach(t => {
      const existing = expenseCategoryTotals.get(t.categoryId);
      if (existing) {
        existing.total += t.amount;
      } else {
        expenseCategoryTotals.set(t.categoryId, {
          name: t.categoryName,
          total: t.amount
        });
      }
    });

    const topExpenseCategories: CategorySummary[] = Array.from(expenseCategoryTotals.entries())
      .map(([id, data]) => ({
        categoryId: id,
        categoryName: data.name,
        total: data.total,
        percentage: totalExpense > 0 ? (data.total / totalExpense) * 100 : 0
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 10);

    return {
      year,
      monthlySummaries,
      totalIncome,
      totalExpense,
      totalBalance: totalIncome - totalExpense,
      topIncomeCategories,
      topExpenseCategories
    };
  }, [year, incomeTransactions, expenseTransactions]);

  const allTransactions = useMemo(
    () => [...incomeTransactions, ...expenseTransactions].sort((a, b) =>
      b.date.localeCompare(a.date)
    ),
    [incomeTransactions, expenseTransactions]
  );

  return {
    analytics,
    allTransactions,
    loading,
    error
  };
}
