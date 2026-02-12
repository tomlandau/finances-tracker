import { useState, FormEvent, useMemo, useContext } from 'react';
import { format } from 'date-fns';
import { CategoriesContext } from '@/context/CategoriesContext';
import { useIncomeSubmit } from '@/hooks/useIncomeSubmit';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Combobox } from '@/components/ui/Combobox';
import { Checkbox } from '@/components/ui/Checkbox';
import { CategoryDetails } from '@/components/ui/CategoryDetails';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { VatPreview } from './VatPreview';
import type { IncomeFormData, Category } from '@/types';
import type { Transaction } from '@/types/history.types';
import type { OptimisticTransactionHandlers } from '@/components/transaction/TabView';
import { VAT_OPTIONS, VAT_TYPE_OPTIONS, DEFAULT_VAT, DEFAULT_VAT_TYPE } from '@/utils/constants';

const INITIAL_FORM_STATE: IncomeFormData = {
  amount: '',
  categoryId: '',
  date: format(new Date(), 'yyyy-MM-dd'),
  vat: DEFAULT_VAT,
  vatType: DEFAULT_VAT_TYPE,
  description: '',
  isRecurring: false
};

interface IncomeFormProps {
  filterOwner?: string;
  onSuccess?: () => void;
  optimisticHandlers?: OptimisticTransactionHandlers | null;
}

export function IncomeForm({ filterOwner, onSuccess, optimisticHandlers }: IncomeFormProps = {}) {
  const [formData, setFormData] = useState<IncomeFormData>(INITIAL_FORM_STATE);
  const [categoryName, setCategoryName] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<Category | undefined>(undefined);
  const [success, setSuccess] = useState(false);

  const context = useContext(CategoriesContext);
  if (!context) {
    throw new Error('IncomeForm must be used within CategoriesProvider');
  }

  const { loading: categoriesLoading, getFilteredIncomeCategories } = context;
  const categories = useMemo(
    () => getFilteredIncomeCategories(filterOwner),
    [getFilteredIncomeCategories, filterOwner]
  );

  const { submit, loading: submitting, error } = useIncomeSubmit();

  // Create category name to ID map
  const categoryMap = useMemo(() => {
    const map = new Map<string, string>();
    categories.forEach(cat => map.set(cat.name, cat.id));
    return map;
  }, [categories]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    // Get category ID from name
    const categoryId = categoryMap.get(categoryName) || formData.categoryId;
    const amount = parseFloat(formData.amount);

    // Generate temporary ID for optimistic transaction
    const tempId = `temp-${Date.now()}-${Math.random()}`;

    // Create optimistic transaction
    const optimisticTransaction: Transaction = {
      id: tempId,
      type: 'income',
      date: formData.date,
      amount,
      categoryId,
      categoryName,
      vat: formData.vat,
      vatType: formData.vatType,
      description: formData.description,
      isRecurring: formData.isRecurring,
      pending: true, // Mark as pending
    };

    // Add optimistic transaction to the list
    if (optimisticHandlers) {
      optimisticHandlers.addOptimisticTransaction(optimisticTransaction);
    }

    // Submit to API
    const success = await submit({
      amount,
      categoryId,
      date: formData.date,
      vat: formData.vat,
      vatType: formData.vatType,
      description: formData.description || undefined,
      isRecurring: formData.isRecurring
    });

    if (success) {
      // Remove optimistic transaction (real one will come from refresh)
      if (optimisticHandlers) {
        optimisticHandlers.removeOptimisticTransaction(tempId);
      }

      setFormData(INITIAL_FORM_STATE);
      setCategoryName('');
      setSelectedCategory(undefined);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);

      // Call onSuccess callback if provided
      if (onSuccess) {
        onSuccess();
      }
    } else {
      // Remove optimistic transaction on failure
      if (optimisticHandlers) {
        optimisticHandlers.removeOptimisticTransaction(tempId);
      }
    }
  };

  if (categoriesLoading) {
    return (
      <div className="flex justify-center py-12">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  const categoryOptions = categories.map(cat => ({ value: cat.id, label: cat.name }));

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input
        type="date"
        label="תאריך"
        value={formData.date}
        onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
        required
      />

      <Combobox
        id="category"
        label="מקור הכנסה"
        value={categoryName}
        onChange={(e) => {
          const name = e.target.value;
          setCategoryName(name);
          // Update categoryId if exact match found
          const id = categoryMap.get(name);
          if (id) {
            setFormData(prev => ({ ...prev, categoryId: id }));
            // Find and set the full category object
            const cat = categories.find(c => c.id === id);
            setSelectedCategory(cat);
          } else {
            setSelectedCategory(undefined);
          }
        }}
        options={categoryOptions}
        placeholder="הקלד או בחר מקור הכנסה..."
        required
      />

      <CategoryDetails category={selectedCategory} type="income" />

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
        autoFocus
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

      <VatPreview
        amount={formData.amount}
        vat={formData.vat}
        vatType={formData.vatType}
      />

      <Checkbox
        label="יצירת הכנסה מחזורית"
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

      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-right">
          ההכנסה נשמרה בהצלחה!
        </div>
      )}

      <Button
        type="submit"
        fullWidth
        disabled={submitting || !formData.amount || !categoryName}
      >
        {submitting ? 'שומר...' : 'שמור הכנסה'}
      </Button>
    </form>
  );
}
