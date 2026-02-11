import { useTransactionType } from '@/hooks/useTransactionType';
import type { TransactionType } from '@/types';

export function TransactionTabs() {
  const { type, setType } = useTransactionType();

  const tabs: Array<{ id: TransactionType; label: string }> = [
    { id: 'income', label: 'הכנסות' },
    { id: 'expense', label: 'הוצאות' },
    { id: 'history', label: 'היסטוריה' }
  ];

  return (
    <div className="flex gap-2 mb-6" role="tablist">
      {tabs.map(tab => (
        <button
          key={tab.id}
          role="tab"
          aria-selected={type === tab.id}
          onClick={() => setType(tab.id)}
          className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors
            ${type === tab.id
              ? 'bg-primary-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
