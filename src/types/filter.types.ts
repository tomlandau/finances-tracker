export interface TabFilters {
  categoryId?: string;
  expenseType?: string;
  recurringOnly?: boolean;
  dateRange?: {
    start: string;
    end: string;
  } | null;
}
