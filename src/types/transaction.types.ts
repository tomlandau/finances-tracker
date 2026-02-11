export type TransactionType = 'income' | 'expense';

export interface TransactionState {
  type: TransactionType;
  setType: (type: TransactionType) => void;
}
