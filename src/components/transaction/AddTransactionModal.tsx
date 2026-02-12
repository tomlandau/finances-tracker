import type { TabConfig } from '@/types/tab.types';
import type { OptimisticTransactionHandlers } from './TabView';
import { IncomeForm } from '@/components/income/IncomeForm';
import { ExpenseForm } from '@/components/expense/ExpenseForm';
import { XMarkIcon } from '@heroicons/react/24/outline';

interface AddTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  tab: TabConfig;
  onSuccess?: () => void;
  optimisticHandlers: OptimisticTransactionHandlers | null;
}

export function AddTransactionModal({ isOpen, onClose, tab, onSuccess, optimisticHandlers }: AddTransactionModalProps) {
  if (!isOpen) return null;

  const handleSuccess = () => {
    if (onSuccess) {
      onSuccess();
    }
    onClose();
  };

  const isIncome = tab.transactionType === 'income';
  const title = isIncome ? 'הוסף הכנסה חדשה' : 'הוסף הוצאה חדשה';

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg shadow-xl max-w-2xl w-full p-6 my-8"
        dir="rtl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900">{title}</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            aria-label="סגור"
          >
            <XMarkIcon className="w-6 h-6 text-gray-500" />
          </button>
        </div>

        {/* Form */}
        <div className="max-h-[calc(100vh-200px)] overflow-y-auto">
          {isIncome ? (
            <IncomeForm
              filterOwner={tab.filters.owner}
              onSuccess={handleSuccess}
              optimisticHandlers={optimisticHandlers}
            />
          ) : (
            <ExpenseForm
              filterBusinessHome={tab.filters.businessHome}
              onSuccess={handleSuccess}
              optimisticHandlers={optimisticHandlers}
            />
          )}
        </div>
      </div>
    </div>
  );
}
