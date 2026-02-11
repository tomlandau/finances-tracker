import { useContext } from 'react';
import { TransactionContext } from '@/context/TransactionContext';

export function useTransactionType() {
  const context = useContext(TransactionContext);

  if (!context) {
    throw new Error('useTransactionType must be used within TransactionProvider');
  }

  return context;
}
