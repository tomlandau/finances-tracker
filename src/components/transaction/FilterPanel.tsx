import { useMemo } from 'react';
import type { TabFilters } from '@/types/filter.types';
import type { TabConfig } from '@/types/tab.types';
import type { Category } from '@/types';
import { Combobox } from '@/components/ui/Combobox';
import { Select } from '@/components/ui/Select';
import { Checkbox } from '@/components/ui/Checkbox';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

interface FilterPanelProps {
  filters: TabFilters;
  onFilterChange: (filters: TabFilters) => void;
  tab: TabConfig;
  categories: Category[];
  isOpen: boolean;
}

const EXPENSE_TYPE_OPTIONS = [
  { value: '', label: 'כל הסוגים' },
  { value: 'קבועה חודשית', label: 'קבועה חודשית' },
  { value: 'קבועה שנתית', label: 'קבועה שנתית' },
  { value: 'משתנה', label: 'משתנה' },
  { value: 'חד פעמית', label: 'חד פעמית' },
  { value: 'קבועה דו שנתית', label: 'קבועה דו שנתית' },
  { value: 'קבועה שבוטלה', label: 'קבועה שבוטלה' },
  { value: 'קבועה דו חודשית', label: 'קבועה דו חודשית' },
  { value: 'קבועה חודשית עם סכום משתנה', label: 'קבועה חודשית עם סכום משתנה' },
];

export function FilterPanel({ filters, onFilterChange, tab, categories, isOpen }: FilterPanelProps) {
  const isExpense = tab.transactionType === 'expense';

  // Category options for Combobox
  const categoryOptions = useMemo(() =>
    categories.map(cat => ({ value: cat.id, label: cat.name })),
    [categories]
  );

  // Find selected category name
  const selectedCategoryName = useMemo(() => {
    if (!filters.categoryId) return '';
    const category = categories.find(c => c.id === filters.categoryId);
    return category?.name || '';
  }, [filters.categoryId, categories]);

  const handleCategoryChange = (value: string) => {
    // Find category by name
    const category = categories.find(c => c.name === value);
    onFilterChange({
      ...filters,
      categoryId: category?.id || undefined,
    });
  };

  const handleExpenseTypeChange = (value: string) => {
    onFilterChange({
      ...filters,
      expenseType: value || undefined,
    });
  };

  const handleRecurringChange = (checked: boolean) => {
    onFilterChange({
      ...filters,
      recurringOnly: checked || undefined,
    });
  };

  const handleDateRangeChange = (field: 'start' | 'end', value: string) => {
    const currentRange = filters.dateRange || { start: '', end: '' };
    const newRange = {
      ...currentRange,
      [field]: value,
    };

    // Only set dateRange if at least one field has a value
    if (newRange.start || newRange.end) {
      onFilterChange({
        ...filters,
        dateRange: newRange,
      });
    } else {
      onFilterChange({
        ...filters,
        dateRange: null,
      });
    }
  };

  const handleClearAll = () => {
    onFilterChange({});
  };

  // Count active filters (excluding dateRange which replaces month selector)
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.categoryId) count++;
    if (filters.expenseType) count++;
    if (filters.recurringOnly) count++;
    return count;
  }, [filters]);

  if (!isOpen) return null;

  return (
    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-4 mb-4" dir="rtl">
      {/* Category Filter */}
      <Combobox
        id="filter-category"
        label="קטגוריה"
        value={selectedCategoryName}
        onChange={(e) => handleCategoryChange(e.target.value)}
        options={categoryOptions}
        placeholder="כל הקטגוריות"
      />

      {/* Expense Type Filter (only for expenses) */}
      {isExpense && (
        <Select
          label="סוג הוצאה"
          value={filters.expenseType || ''}
          onChange={(e) => handleExpenseTypeChange(e.target.value)}
          options={EXPENSE_TYPE_OPTIONS}
        />
      )}

      {/* Recurring Only Filter */}
      <Checkbox
        label={`הצג רק ${isExpense ? 'הוצאות' : 'הכנסות'} מחזוריות`}
        checked={filters.recurringOnly || false}
        onChange={(e) => handleRecurringChange(e.target.checked)}
      />

      {/* Date Range Filter */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700 text-right">
          טווח תאריכים
        </label>
        <div className="grid grid-cols-2 gap-2">
          <Input
            type="date"
            label="מתאריך"
            value={filters.dateRange?.start || ''}
            onChange={(e) => handleDateRangeChange('start', e.target.value)}
          />
          <Input
            type="date"
            label="עד תאריך"
            value={filters.dateRange?.end || ''}
            onChange={(e) => handleDateRangeChange('end', e.target.value)}
          />
        </div>
        <p className="text-xs text-gray-500 text-right">
          השאר ריק כדי להשתמש בחודש הנבחר
        </p>
      </div>

      {/* Clear All Button */}
      {activeFilterCount > 0 && (
        <Button
          type="button"
          variant="secondary"
          fullWidth
          onClick={handleClearAll}
        >
          נקה סינונים ({activeFilterCount})
        </Button>
      )}
    </div>
  );
}
