export interface IncomeEntry {
  amount: number;
  categoryId: string;
  date: string; // ISO date string
  vat: string; // "0" or "0.18"
  vatType: string; // "לפני/ללא מע"מ" or "כולל מע"מ"
  description?: string;
}

export interface IncomeFormData {
  amount: string;
  categoryId: string;
  date: string;
  vat: string;
  vatType: string;
  description: string;
}

export interface IncomeSubmitResult {
  success: boolean;
  error?: string;
}

export interface VatCalculation {
  netAmount: number;
  vatAmount: number;
  grossAmount: number;
}
