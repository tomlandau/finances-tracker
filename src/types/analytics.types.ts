export type PeriodType = 'monthly' | 'bi-monthly';

export interface TabBreakdown {
  tomIncome: number;
  yaelIncome: number;
  tomBusiness: number;
  yaelBusiness: number;
  sharedBusiness: number;
  home: number;
}

export interface MonthlySummary {
  month: string; // Format: "2025-01" or "2025-01-02" for bi-monthly
  monthName: string; // Hebrew month name or range
  income: number;
  expense: number;
  balance: number;
  tabBreakdown: TabBreakdown;
}

export interface CategorySummary {
  categoryId: string;
  categoryName: string;
  total: number;
  percentage: number;
}

export interface YearlyAnalytics {
  year: number;
  monthlySummaries: MonthlySummary[];
  totalIncome: number;
  totalExpense: number;
  totalBalance: number;
  topIncomeCategories: CategorySummary[];
  topExpenseCategories: CategorySummary[];
}
