export type TransactionType = 'income' | 'expense' | 'history';

export interface TransactionState {
  type: TransactionType;
  setType: (type: TransactionType) => void;
}
