import type { Transaction } from '@/types/history.types';
import { TransactionCard } from './TransactionCard';

interface TransactionListProps {
  transactions: Transaction[];
  onTransactionChanged?: () => void;
}

export function TransactionList({ transactions, onTransactionChanged }: TransactionListProps) {
  return (
    <div className="space-y-3">
      {transactions.map(transaction => (
        <TransactionCard
          key={transaction.id}
          transaction={transaction}
          onTransactionChanged={onTransactionChanged}
        />
      ))}
    </div>
  );
}
