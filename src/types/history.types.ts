export interface Transaction {
  id: string;
  type: 'income' | 'expense';
  date: string;
  amount: number;
  categoryId: string;
  categoryName: string;
  vat: string;
  vatType: string;
  description?: string;
  isRecurring?: boolean;
  netAmount?: number;
  vatAmount?: number;
  grossAmount?: number;
}

export interface HistoryFilters {
  type: 'all' | 'income' | 'expense';
  categoryId?: string;
  startDate?: string;
  endDate?: string;
}

export interface HistoryState {
  transactions: Transaction[];
  filters: HistoryFilters;
  loading: boolean;
  error?: string;

  // Actions
  fetchTransactions: () => Promise<void>;
  setFilters: (filters: Partial<HistoryFilters>) => void;
  clearFilters: () => void;
  refresh: () => Promise<void>;
  deleteTransaction: (id: string, type: 'income' | 'expense') => Promise<boolean>;
}
