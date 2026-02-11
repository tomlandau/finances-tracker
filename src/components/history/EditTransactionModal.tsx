import { useState, FormEvent, useMemo, useContext } from 'react';
import type { Transaction } from '@/types/history.types';
import { CategoriesContext } from '@/context/CategoriesContext';
import { api } from '@/services/api';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Checkbox } from '@/components/ui/Checkbox';
import { Button } from '@/components/ui/Button';
import { VAT_OPTIONS, VAT_TYPE_OPTIONS } from '@/utils/constants';

interface EditTransactionModalProps {
  transaction: Transaction;
  onSuccess: () => void;
  onCancel: () => void;
}

export function EditTransactionModal({ transaction, onSuccess, onCancel }: EditTransactionModalProps) {
  const categoriesContext = useContext(CategoriesContext);
  const incomeCategories = categoriesContext?.incomeCategories || [];
  const expenseCategories = categoriesContext?.expenseCategories || [];
  const [formData, setFormData] = useState({
    amount: transaction.amount.toString(),
    categoryId: transaction.categoryId,
    date: transaction.date,
    vat: transaction.vat,
    vatType: transaction.vatType,
    description: transaction.description || '',
    isRecurring: transaction.isRecurring || false,
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isIncome = transaction.type === 'income';
  const categories = isIncome ? incomeCategories : expenseCategories;
  const categoryOptions = categories.map(cat => ({
    value: cat.id,
    label: cat.name
  }));

  // Calculate VAT preview
  const vatPreview = useMemo(() => {
    const amount = parseFloat(formData.amount) || 0;
    const vatRate = parseFloat(formData.vat);

    if (vatRate === 0) {
      return {
        net: amount,
        vat: 0,
        gross: amount
      };
    }

    if (formData.vatType === 'לפני/ללא מע"מ') {
      const net = amount;
      const vat = amount * vatRate;
      const gross = amount + vat;
      return { net, vat, gross };
    } else {
      const gross = amount;
      const net = amount / (1 + vatRate);
      const vat = amount - net;
      return { net, vat, gross };
    }
  }, [formData.amount, formData.vat, formData.vatType]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      await api.updateTransaction(transaction.id, transaction.type, {
        amount: parseFloat(formData.amount),
        categoryId: formData.categoryId,
        date: formData.date,
        vat: formData.vat,
        vatType: formData.vatType,
        description: formData.description || undefined,
        isRecurring: formData.isRecurring,
      });
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update transaction');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto" onClick={onCancel}>
      <div
        className="bg-white rounded-lg shadow-xl max-w-2xl w-full p-6 my-8"
        dir="rtl"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-xl font-bold mb-4 text-right">
          עריכת {isIncome ? 'הכנסה' : 'הוצאה'}
        </h3>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            type="date"
            label="תאריך"
            value={formData.date}
            onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
            required
          />

          <Select
            label={isIncome ? 'מקור הכנסה' : 'מקור הוצאה'}
            value={formData.categoryId}
            onChange={(e) => setFormData(prev => ({ ...prev, categoryId: e.target.value }))}
            options={categoryOptions}
            required
          />

          <Input
            type="number"
            label="סכום הזנה"
            value={formData.amount}
            onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
            placeholder="0.00"
            step="0.01"
            min="0"
            required
            inputMode="decimal"
          />

          <Select
            label='מע"מ'
            value={formData.vat}
            onChange={(e) => setFormData(prev => ({ ...prev, vat: e.target.value }))}
            options={VAT_OPTIONS}
            required
          />

          <Select
            label='הזנה עם או בלי מע"מ'
            value={formData.vatType}
            onChange={(e) => setFormData(prev => ({ ...prev, vatType: e.target.value }))}
            options={VAT_TYPE_OPTIONS}
            required
          />

          {/* VAT Preview */}
          <div className="bg-gray-50 p-4 rounded-lg space-y-2 text-sm" dir="rtl">
            <div className="flex justify-between">
              <span className="font-medium">סכום נטו:</span>
              <span>{vatPreview.net.toFixed(2)} ₪</span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium">מע"מ:</span>
              <span>{vatPreview.vat.toFixed(2)} ₪</span>
            </div>
            <div className="flex justify-between font-bold text-base border-t pt-2">
              <span>סכום ברוטו:</span>
              <span>{vatPreview.gross.toFixed(2)} ₪</span>
            </div>
          </div>

          <Checkbox
            label={isIncome ? 'יצירת הכנסה מחזורית' : 'יצירת הוצאה מחזורית'}
            checked={formData.isRecurring}
            onChange={(e) => setFormData(prev => ({ ...prev, isRecurring: e.target.checked }))}
          />

          <Input
            type="text"
            label="תיאור/הערות (אופציונלי)"
            value={formData.description}
            onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
            placeholder="הוסף הערות..."
          />

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-right">
              {error}
            </div>
          )}

          <div className="flex gap-3 justify-end pt-4">
            <button
              type="button"
              onClick={onCancel}
              disabled={submitting}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors disabled:opacity-50"
            >
              ביטול
            </button>
            <Button
              type="submit"
              disabled={submitting || !formData.amount || !formData.categoryId}
            >
              {submitting ? 'שומר...' : 'שמור שינויים'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
