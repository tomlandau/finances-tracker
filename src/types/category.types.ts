export type CategoryType = 'income' | 'expense';

export interface Category {
  id: string;
  name: string;
  active: boolean;
  // Income category fields
  owner?: string;        // של מי ההכנסה (Single Select)
  domain?: string;       // תחום (Single Select)
  // Expense category fields
  businessHome?: string; // עסקי/בית (Single Select)
  expenseType?: string;  // סוג הוצאה (Single Select)
  renewalDate?: string;  // תאריך חידוש הוצאה (אם קיים)
}

export interface CategoriesState {
  incomeCategories: Category[];
  expenseCategories: Category[];
  loading: boolean;
  error: string | null;
  refetchIncome: () => Promise<void>;
  refetchExpense: () => Promise<void>;
}
