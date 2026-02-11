export interface ExpenseEntry {
  amount: number;
  categoryId: string;
  date: string;
  vat: string;
  vatType: string;
  description?: string;
}

export interface ExpenseFormData {
  amount: string;
  categoryId: string;
  date: string;
  vat: string;
  vatType: string;
  description: string;
}

export interface ExpenseSubmitResult {
  success: boolean;
  error?: string;
}
