import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import type { Transaction } from '@/types/history.types';
import { TransactionList } from '@/components/history/TransactionList';

interface PlannedTransactionsDrawerProps {
  transactions: Transaction[];
  type: 'income' | 'expense';
  onTransactionChanged?: () => void;
}

export function PlannedTransactionsDrawer({
  transactions,
  type,
  onTransactionChanged
}: PlannedTransactionsDrawerProps) {
  const [isOpen, setIsOpen] = useState(false);

  // Don't render if no planned transactions
  if (transactions.length === 0) {
    return null;
  }

  // Calculate total
  const total = transactions.reduce((sum, t) => sum + t.amount, 0);
  const count = transactions.length;

  const label = type === 'income' ? 'הכנסות מתוכננות' : 'הוצאות מתוכננות';
  const transactionsLabel = count === 1 ? 'תנועה אחת' : `${count} תנועות`;

  return (
    <div className="border border-blue-200 rounded-lg overflow-hidden bg-blue-50">
      {/* Drawer Header - Always visible */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full bg-transparent hover:bg-blue-100 text-blue-900 border-0 text-right p-4 transition-colors cursor-pointer"
      >
        <div className="flex items-center justify-between w-full">
          <div className="text-right">
            <p className="text-sm font-medium mb-1">{label}</p>
            <p className="text-xl font-bold">
              ₪{total.toLocaleString('he-IL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <p className="text-sm opacity-75">{transactionsLabel}</p>
            {isOpen ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
          </div>
        </div>
      </button>

      {/* Drawer Content - Expandable */}
      <div
        className={`overflow-hidden transition-all duration-300 ease-in-out ${
          isOpen ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        <div className="px-4 pb-4 border-t border-blue-200 pt-4 bg-white">
          <TransactionList
            transactions={transactions}
            onTransactionChanged={onTransactionChanged}
          />
        </div>
      </div>
    </div>
  );
}
