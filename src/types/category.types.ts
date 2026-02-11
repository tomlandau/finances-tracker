export type CategoryType = 'income' | 'expense';

export interface Category {
  id: string;
  name: string;
  active: boolean;
}

export interface CategoriesState {
  incomeCategories: Category[];
  expenseCategories: Category[];
  loading: boolean;
  error: string | null;
  refetchIncome: () => Promise<void>;
  refetchExpense: () => Promise<void>;
}
