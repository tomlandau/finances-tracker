import { useState, useContext } from 'react';
import type { Transaction } from '@/types/history.types';
import { useHistory } from '@/hooks/useHistory';
import { CategoriesContext } from '@/context/CategoriesContext';
import { DeleteConfirmation } from './DeleteConfirmation';
import { EditTransactionModal } from './EditTransactionModal';

interface TransactionCardProps {
  transaction: Transaction;
  onTransactionChanged?: () => void;
}

export function TransactionCard({ transaction, onTransactionChanged }: TransactionCardProps) {
  const { deleteTransaction, refresh } = useHistory();
  const categoriesContext = useContext(CategoriesContext);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Get full category details
  const category = categoriesContext?.getCategoryById(transaction.categoryId);

  const isIncome = transaction.type === 'income';
  const accentColor = isIncome ? 'border-green-500' : 'border-red-500';
  const bgColor = isIncome ? 'bg-green-50' : 'bg-red-50';
  const textColor = isIncome ? 'text-green-700' : 'text-red-700';

  const handleDelete = async () => {
    setIsDeleting(true);
    const success = await deleteTransaction(transaction.id, transaction.type);
    if (success) {
      setShowDeleteModal(false);
      // Trigger refresh in parent
      if (onTransactionChanged) {
        onTransactionChanged();
      }
    }
    setIsDeleting(false);
  };

  const handleEditSuccess = async () => {
    setShowEditModal(false);
    await refresh();
    // Trigger refresh in parent
    if (onTransactionChanged) {
      onTransactionChanged();
    }
  };

  // Format amount with currency
  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('he-IL', {
      style: 'currency',
      currency: 'ILS',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  return (
    <div
      className={`border-r-4 ${accentColor} ${bgColor} rounded-lg p-4 shadow-sm ${
        transaction.pending ? 'opacity-60' : ''
      }`}
      dir="rtl"
    >
      <div className="flex justify-between items-start mb-2">
        <div className="flex items-center gap-2">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-gray-900">{transaction.categoryName}</h3>
              {category && isIncome && category.domain && (
                <span className="inline-block px-2 py-0.5 text-xs bg-purple-100 text-purple-700 rounded">
                  {category.domain}
                </span>
              )}
              {category && !isIncome && (
                <>
                  {category.domain && (
                    <span className="inline-block px-2 py-0.5 text-xs bg-purple-100 text-purple-700 rounded">
                      {category.domain}
                    </span>
                  )}
                  {category.expenseType && (
                    <span className="inline-block px-2 py-0.5 text-xs bg-orange-100 text-orange-700 rounded">
                      {category.expenseType}
                    </span>
                  )}
                </>
              )}
              {transaction.pending && (
                <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-800 rounded">
                  ממתין...
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="text-left">
          <p className={`text-xl font-bold ${textColor}`}>
            {formatAmount(transaction.grossAmount || transaction.amount)}
          </p>
          <p className="text-xs text-gray-500">
            {isIncome ? 'הכנסה' : 'הוצאה'}
          </p>
        </div>
      </div>

      {isIncome && (
        <div className="grid grid-cols-2 gap-2 text-sm text-gray-700 mb-2">
          <div>
            <span className="font-medium">סכום נטו:</span>{' '}
            {transaction.netAmount ? formatAmount(transaction.netAmount) : '-'}
          </div>
          <div>
            <span className="font-medium">מע"מ:</span>{' '}
            {transaction.vatAmount ? formatAmount(transaction.vatAmount) : '-'}
          </div>
        </div>
      )}

      {transaction.description && (
        <p className="text-sm text-gray-600 mb-2">
          <span className="font-medium">תיאור:</span> {transaction.description}
        </p>
      )}

      <div className="flex items-center gap-2 mt-3">
        {transaction.isRecurring && (
          <span className="inline-block px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded">
            מחזורי
          </span>
        )}
        {!transaction.pending && (
          <div className="mr-auto flex gap-2">
            <button
              onClick={() => setShowEditModal(true)}
              className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
            >
              ערוך
            </button>
            <button
              onClick={() => setShowDeleteModal(true)}
              className="px-3 py-1 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors"
            >
              מחק
            </button>
          </div>
        )}
      </div>

      {showEditModal && (
        <EditTransactionModal
          transaction={transaction}
          onSuccess={handleEditSuccess}
          onCancel={() => setShowEditModal(false)}
        />
      )}

      {showDeleteModal && (
        <DeleteConfirmation
          transaction={transaction}
          onConfirm={handleDelete}
          onCancel={() => setShowDeleteModal(false)}
          isDeleting={isDeleting}
        />
      )}
    </div>
  );
}
