export interface MonthlySummary {
  month: string; // Format: "2025-01"
  monthName: string; // Hebrew month name
  income: number;
  expense: number;
  balance: number;
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
