export const APP_NAME = 'Finances Tracker';
export const AUTH_KEY = 'finances_auth';
export const DATE_FORMAT = 'yyyy-MM-dd';
export const DISPLAY_DATE_FORMAT = 'dd/MM/yyyy';

// Transaction types
export const TRANSACTION_TYPES = {
  INCOME: 'income' as const,
  EXPENSE: 'expense' as const,
};

// VAT options
export const VAT_OPTIONS = [
  { value: '0', label: 'ללא מע"מ (0%)' },
  { value: '0.18', label: 'מע"מ 18%' },
];

export const VAT_TYPE_OPTIONS = [
  { value: 'לפני/ללא מע"מ', label: 'לפני/ללא מע"מ' },
  { value: 'כולל מע"מ', label: 'כולל מע"מ' },
];

// Default values
export const DEFAULT_VAT = '0.18';
export const DEFAULT_VAT_TYPE = 'לפני/ללא מע"מ';
