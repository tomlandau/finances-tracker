import type { Transaction } from '@/types/history.types';

interface DeleteConfirmationProps {
  transaction: Transaction;
  onConfirm: () => void;
  onCancel: () => void;
  isDeleting: boolean;
}

export function DeleteConfirmation({ transaction, onConfirm, onCancel, isDeleting }: DeleteConfirmationProps) {
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return new Intl.DateTimeFormat('he-IL', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(date);
  };

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('he-IL', {
      style: 'currency',
      currency: 'ILS',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={onCancel}>
      <div
        className="bg-white rounded-lg shadow-xl max-w-md w-full p-6"
        dir="rtl"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-xl font-bold mb-4 text-right text-red-600">מחיקת רשומה</h3>

        <p className="text-gray-700 mb-4 text-right">
          האם אתה בטוח שברצונך למחוק את הרשומה הזו?
        </p>

        <div className="bg-gray-50 p-4 rounded-lg mb-6 space-y-2 text-right">
          <div>
            <span className="font-medium">קטגוריה:</span> {transaction.categoryName}
          </div>
          <div>
            <span className="font-medium">סכום:</span>{' '}
            {formatAmount(transaction.grossAmount || transaction.amount)}
          </div>
          <div>
            <span className="font-medium">תאריך:</span> {formatDate(transaction.date)}
          </div>
          <div>
            <span className="font-medium">סוג:</span>{' '}
            {transaction.type === 'income' ? 'הכנסה' : 'הוצאה'}
          </div>
        </div>

        <div className="flex gap-3 justify-end">
          <button
            type="button"
            onClick={onCancel}
            disabled={isDeleting}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors disabled:opacity-50"
          >
            ביטול
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isDeleting}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
          >
            {isDeleting ? 'מוחק...' : 'מחק'}
          </button>
        </div>
      </div>
    </div>
  );
}
