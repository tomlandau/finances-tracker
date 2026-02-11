import { createContext, useState, ReactNode } from 'react';
import type { TransactionState, TransactionType } from '@/types';

export const TransactionContext = createContext<TransactionState | null>(null);

export function TransactionProvider({ children }: { children: ReactNode }) {
  const [type, setType] = useState<TransactionType>('income');

  return (
    <TransactionContext.Provider value={{ type, setType }}>
      {children}
    </TransactionContext.Provider>
  );
}
