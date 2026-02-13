import { useMemo } from 'react';
import type { Transaction } from '@/types/history.types';
import { TransactionList } from '@/components/history/TransactionList';

interface TransactionsByDateViewProps {
  transactions: Transaction[];
  type: 'income' | 'expense';
  onTransactionChanged?: () => void;
}

interface DateGroup {
  date: string;
  label: string;
  transactions: Transaction[];
  total: number;
}

export function TransactionsByDateView({
  transactions,
  type,
  onTransactionChanged
}: TransactionsByDateViewProps) {
  // Format date label (Today, Yesterday, or full date)
  const formatDateLabel = (dateStr: string) => {
    const date = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    // Normalize dates to compare only date part (not time)
    const normalizeDate = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const normalizedDate = normalizeDate(date);
    const normalizedToday = normalizeDate(today);
    const normalizedYesterday = normalizeDate(yesterday);

    if (normalizedDate.getTime() === normalizedToday.getTime()) {
      return 'היום';
    } else if (normalizedDate.getTime() === normalizedYesterday.getTime()) {
      return 'אתמול';
    } else {
      // Full date format in Hebrew
      return new Intl.DateTimeFormat('he-IL', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }).format(date);
    }
  };

  // Group transactions by date
  const dateGroups = useMemo(() => {
    const groups = new Map<string, Transaction[]>();

    // Group transactions by date
    transactions.forEach(transaction => {
      const date = transaction.date;
      if (!groups.has(date)) {
        groups.set(date, []);
      }
      groups.get(date)!.push(transaction);
    });

    // Convert to array and sort by date descending
    const sortedGroups: DateGroup[] = Array.from(groups.entries())
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([date, transactions]) => {
        const total = transactions.reduce((sum, t) => sum + (t.grossAmount || t.amount), 0);
        return {
          date,
          label: formatDateLabel(date),
          transactions,
          total,
        };
      });

    return sortedGroups;
  }, [transactions, formatDateLabel]);

  // Format amount with currency
  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('he-IL', {
      style: 'currency',
      currency: 'ILS',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const accentColor = type === 'income' ? 'text-green-700' : 'text-red-700';

  if (dateGroups.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">אין תנועות להצגה</p>
      </div>
    );
  }

  return (
    <div className="space-y-6" dir="rtl">
      {dateGroups.map((group) => (
        <div key={group.date} className="space-y-2">
          {/* Date Header */}
          <div className="flex items-center justify-between border-b border-gray-200 pb-2">
            <h3 className="text-sm font-semibold text-gray-700">{group.label}</h3>
            <span className={`text-sm font-bold ${accentColor}`}>
              {formatAmount(group.total)}
            </span>
          </div>

          {/* Transactions for this date */}
          <TransactionList
            transactions={group.transactions}
            onTransactionChanged={onTransactionChanged}
          />
        </div>
      ))}
    </div>
  );
}
