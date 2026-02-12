import { useState, useEffect } from 'react';
import type { TabConfig } from '@/types/tab.types';
import type { Transaction } from '@/types/history.types';
import { useTabTransactions } from '@/hooks/useTabTransactions';
import { MonthSelector } from './MonthSelector';
import { SummaryCard } from './SummaryCard';
import { TransactionList } from '@/components/history/TransactionList';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

export interface OptimisticTransactionHandlers {
  addOptimisticTransaction: (transaction: Transaction) => void;
  removeOptimisticTransaction: (id: string) => void;
  clearOptimisticTransactions: () => void;
}

interface TabViewProps {
  tab: TabConfig;
  onOptimisticHandlersReady?: (handlers: OptimisticTransactionHandlers) => void;
  onTransactionChanged?: () => void;
}

function getCurrentMonth(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

export function TabView({ tab, onOptimisticHandlersReady, onTransactionChanged }: TabViewProps) {
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonth());

  const {
    transactions,
    loading,
    error,
    summary,
    addOptimisticTransaction,
    removeOptimisticTransaction,
    clearOptimisticTransactions
  } = useTabTransactions(tab, selectedMonth);

  // Expose optimistic handlers to parent
  useEffect(() => {
    if (onOptimisticHandlersReady) {
      onOptimisticHandlersReady({
        addOptimisticTransaction,
        removeOptimisticTransaction,
        clearOptimisticTransactions,
      });
    }
  }, [onOptimisticHandlersReady, addOptimisticTransaction, removeOptimisticTransaction, clearOptimisticTransactions]);

  if (loading && transactions.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
        <p className="text-red-700 text-sm">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <MonthSelector selectedMonth={selectedMonth} onMonthChange={setSelectedMonth} />

      <SummaryCard total={summary.total} count={summary.count} type={tab.transactionType} />

      {transactions.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500">אין תנועות לחודש זה</p>
        </div>
      ) : (
        <TransactionList transactions={transactions} onTransactionChanged={onTransactionChanged} />
      )}
    </div>
  );
}
