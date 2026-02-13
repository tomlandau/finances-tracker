import { useState, useEffect, useMemo, useContext } from 'react';
import { api } from '@/services/api';
import { CategoriesContext } from '@/context/CategoriesContext';
import type { Transaction } from '@/types/history.types';
import type {
  MonthlySummary,
  CategorySummary,
  YearlyAnalytics,
  PeriodType,
  TabBreakdown,
  OwnerBreakdown,
  BusinessHomeBreakdown
} from '@/types/analytics.types';

const HEBREW_MONTHS = [
  'ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני',
  'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'
];

export function useAnalytics(
  year: number,
  periodType: PeriodType = 'monthly',
  selectedPeriods: number[] = [] // Array of period indices (0-11 for monthly, 0-5 for bi-monthly)
) {
  const categoriesContext = useContext(CategoriesContext);
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
    // Filter transactions by selected periods if any are selected
    let filteredIncomeTransactions = incomeTransactions;
    let filteredExpenseTransactions = expenseTransactions;

    if (selectedPeriods.length > 0) {
      if (periodType === 'monthly') {
        // Filter by selected months (0-11)
        filteredIncomeTransactions = incomeTransactions.filter(t => {
          const txMonth = parseInt(t.date.split('-')[1]) - 1; // Convert to 0-based index
          return selectedPeriods.includes(txMonth);
        });
        filteredExpenseTransactions = expenseTransactions.filter(t => {
          const txMonth = parseInt(t.date.split('-')[1]) - 1;
          return selectedPeriods.includes(txMonth);
        });
      } else {
        // Filter by selected bi-monthly periods (0-5)
        const selectedMonths = new Set<number>();
        selectedPeriods.forEach(periodIndex => {
          // Each bi-monthly period contains 2 months
          selectedMonths.add(periodIndex * 2 + 1);
          selectedMonths.add(periodIndex * 2 + 2);
        });
        filteredIncomeTransactions = incomeTransactions.filter(t => {
          const txMonth = parseInt(t.date.split('-')[1]);
          return selectedMonths.has(txMonth);
        });
        filteredExpenseTransactions = expenseTransactions.filter(t => {
          const txMonth = parseInt(t.date.split('-')[1]);
          return selectedMonths.has(txMonth);
        });
      }
    }

    // Helper to categorize transaction by tab
    const categorizeTransaction = (transaction: Transaction): Partial<TabBreakdown> => {
      const category = categoriesContext?.getCategoryById(transaction.categoryId);
      const amount = transaction.type === 'income'
        ? (transaction.grossAmount || transaction.amount)
        : transaction.amount;

      if (transaction.type === 'income') {
        if (category?.owner === 'תום') return { tomIncome: amount };
        if (category?.owner === 'יעל') return { yaelIncome: amount };
      } else {
        const businessHome = category?.businessHome;
        // Log uncategorized expenses for debugging
        if (!businessHome) {
          console.warn('Expense transaction without businessHome:', {
            id: transaction.id,
            date: transaction.date,
            categoryId: transaction.categoryId,
            categoryName: transaction.categoryName,
            amount
          });
        }
        if (businessHome === 'עסק תום') return { tomBusiness: amount };
        if (businessHome === 'עסק יעל') return { yaelBusiness: amount };
        if (businessHome === 'עסק - משותף') return { sharedBusiness: amount };
        if (businessHome === 'בית') return { home: amount };
      }
      return {};
    };

    // Helper to sum tab breakdowns
    const sumTabBreakdowns = (breakdowns: Partial<TabBreakdown>[]): TabBreakdown => {
      const initial: TabBreakdown = {
        tomIncome: 0,
        yaelIncome: 0,
        tomBusiness: 0,
        yaelBusiness: 0,
        sharedBusiness: 0,
        home: 0
      };

      return breakdowns.reduce<TabBreakdown>(
        (acc, b) => ({
          tomIncome: acc.tomIncome + (b.tomIncome || 0),
          yaelIncome: acc.yaelIncome + (b.yaelIncome || 0),
          tomBusiness: acc.tomBusiness + (b.tomBusiness || 0),
          yaelBusiness: acc.yaelBusiness + (b.yaelBusiness || 0),
          sharedBusiness: acc.sharedBusiness + (b.sharedBusiness || 0),
          home: acc.home + (b.home || 0),
        }),
        initial
      );
    };

    // Calculate summaries based on period type
    const monthlySummaries: MonthlySummary[] = [];

    // Determine which periods to show
    const periodsToShow = selectedPeriods.length > 0
      ? selectedPeriods
      : (periodType === 'monthly' ? Array.from({ length: 12 }, (_, i) => i) : Array.from({ length: 6 }, (_, i) => i));

    if (periodType === 'monthly') {
      periodsToShow.forEach(monthIndex => {
        const month = monthIndex + 1; // Convert from 0-based to 1-based
        const monthStr = month.toString().padStart(2, '0');
        const monthKey = `${year}-${monthStr}`;

        const monthIncomeTransactions = incomeTransactions.filter(t => t.date.startsWith(monthKey));
        const monthExpenseTransactions = expenseTransactions.filter(t => t.date.startsWith(monthKey));

        // Debug logging for January (month 1)
        if (month === 1) {
          console.log('January expenses count:', monthExpenseTransactions.length);
          console.log('January expenses:', monthExpenseTransactions);
          const categorized = monthExpenseTransactions.map(categorizeTransaction);
          console.log('January categorized:', categorized);
        }

        const tabBreakdown = sumTabBreakdowns([
          ...monthIncomeTransactions.map(categorizeTransaction),
          ...monthExpenseTransactions.map(categorizeTransaction)
        ]);

        const monthIncome = tabBreakdown.tomIncome + tabBreakdown.yaelIncome;
        const monthExpense = tabBreakdown.tomBusiness + tabBreakdown.yaelBusiness +
          tabBreakdown.sharedBusiness + tabBreakdown.home;

        monthlySummaries.push({
          month: monthKey,
          monthName: HEBREW_MONTHS[month - 1],
          income: monthIncome,
          expense: monthExpense,
          balance: monthIncome - monthExpense,
          tabBreakdown
        });
      });
    } else {
      // Bi-monthly periods
      const biMonthlyPeriods = [
        { months: [1, 2], name: 'ינואר-פברואר' },
        { months: [3, 4], name: 'מרץ-אפריל' },
        { months: [5, 6], name: 'מאי-יוני' },
        { months: [7, 8], name: 'יולי-אוגוסט' },
        { months: [9, 10], name: 'ספטמבר-אוקטובר' },
        { months: [11, 12], name: 'נובמבר-דצמבר' }
      ];

      periodsToShow.forEach(periodIndex => {
        const period = biMonthlyPeriods[periodIndex];
        const [month1, month2] = period.months;
        const monthKey = `${year}-${month1.toString().padStart(2, '0')}-${month2.toString().padStart(2, '0')}`;

        const periodIncomeTransactions = incomeTransactions.filter(t => {
          const txMonth = parseInt(t.date.split('-')[1]);
          return txMonth === month1 || txMonth === month2;
        });

        const periodExpenseTransactions = expenseTransactions.filter(t => {
          const txMonth = parseInt(t.date.split('-')[1]);
          return txMonth === month1 || txMonth === month2;
        });

        const tabBreakdown = sumTabBreakdowns([
          ...periodIncomeTransactions.map(categorizeTransaction),
          ...periodExpenseTransactions.map(categorizeTransaction)
        ]);

        const periodIncome = tabBreakdown.tomIncome + tabBreakdown.yaelIncome;
        const periodExpense = tabBreakdown.tomBusiness + tabBreakdown.yaelBusiness +
          tabBreakdown.sharedBusiness + tabBreakdown.home;

        monthlySummaries.push({
          month: monthKey,
          monthName: period.name,
          income: periodIncome,
          expense: periodExpense,
          balance: periodIncome - periodExpense,
          tabBreakdown
        });
      });
    }

    // Calculate total income (use filtered transactions)
    const totalIncome = filteredIncomeTransactions.reduce(
      (sum, t) => sum + (t.grossAmount || t.amount), 0
    );

    // Calculate total expense (use filtered transactions)
    const totalExpense = filteredExpenseTransactions.reduce(
      (sum, t) => sum + t.amount, 0
    );

    // Calculate top income categories (use filtered transactions)
    const incomeCategoryTotals = new Map<string, { name: string; total: number }>();
    filteredIncomeTransactions.forEach(t => {
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

    // Calculate top expense categories (use filtered transactions)
    const expenseCategoryTotals = new Map<string, { name: string; total: number }>();
    filteredExpenseTransactions.forEach(t => {
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

    // Calculate income breakdown by owner and domain (use filtered transactions)
    const incomeByOwnerMap = new Map<string, { total: number; domainTotals: Map<string, number> }>();

    filteredIncomeTransactions.forEach(t => {
      const category = categoriesContext?.getCategoryById(t.categoryId);
      const owner = category?.owner || 'אחר';
      const domain = category?.domain || 'לא מוגדר';
      const amount = t.grossAmount || t.amount;

      if (!incomeByOwnerMap.has(owner)) {
        incomeByOwnerMap.set(owner, { total: 0, domainTotals: new Map() });
      }

      const ownerData = incomeByOwnerMap.get(owner)!;
      ownerData.total += amount;
      ownerData.domainTotals.set(domain, (ownerData.domainTotals.get(domain) || 0) + amount);
    });

    const incomeByOwner: OwnerBreakdown[] = Array.from(incomeByOwnerMap.entries())
      .map(([owner, data]) => ({
        owner,
        total: data.total,
        percentage: totalIncome > 0 ? (data.total / totalIncome) * 100 : 0,
        domainBreakdown: Array.from(data.domainTotals.entries())
          .map(([domain, total]) => ({
            domain,
            total,
            percentage: data.total > 0 ? (total / data.total) * 100 : 0
          }))
          .sort((a, b) => b.total - a.total)
      }))
      .sort((a, b) => b.total - a.total);

    // Calculate expense breakdown by businessHome and domain (use filtered transactions)
    const expenseByBusinessHomeMap = new Map<string, { total: number; domainTotals: Map<string, number> }>();

    filteredExpenseTransactions.forEach(t => {
      const category = categoriesContext?.getCategoryById(t.categoryId);
      const businessHome = category?.businessHome || 'לא מוגדר';
      const domain = category?.domain || 'לא מוגדר';
      const amount = t.amount;

      if (!expenseByBusinessHomeMap.has(businessHome)) {
        expenseByBusinessHomeMap.set(businessHome, { total: 0, domainTotals: new Map() });
      }

      const bhData = expenseByBusinessHomeMap.get(businessHome)!;
      bhData.total += amount;
      bhData.domainTotals.set(domain, (bhData.domainTotals.get(domain) || 0) + amount);
    });

    const expenseByBusinessHome: BusinessHomeBreakdown[] = Array.from(expenseByBusinessHomeMap.entries())
      .map(([businessHome, data]) => ({
        businessHome,
        total: data.total,
        percentage: totalExpense > 0 ? (data.total / totalExpense) * 100 : 0,
        domainBreakdown: Array.from(data.domainTotals.entries())
          .map(([domain, total]) => ({
            domain,
            total,
            percentage: data.total > 0 ? (total / data.total) * 100 : 0
          }))
          .sort((a, b) => b.total - a.total)
      }))
      .sort((a, b) => b.total - a.total);

    return {
      year,
      monthlySummaries,
      totalIncome,
      totalExpense,
      totalBalance: totalIncome - totalExpense,
      topIncomeCategories,
      topExpenseCategories,
      incomeByOwner,
      expenseByBusinessHome
    };
  }, [year, periodType, selectedPeriods, incomeTransactions, expenseTransactions, categoriesContext]);

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
