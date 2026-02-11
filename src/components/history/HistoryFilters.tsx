import { useState } from 'react';
import { useHistory } from '@/hooks/useHistory';
import { useCategories } from '@/hooks/useCategories';
import { Select } from '@/components/ui/Select';
import { Input } from '@/components/ui/Input';

export function HistoryFilters() {
  const { filters, setFilters, clearFilters } = useHistory();
  const { incomeCategories, expenseCategories } = useCategories();
  const [isExpanded, setIsExpanded] = useState(false);

  // Combine all categories for the filter
  const allCategories = [
    ...incomeCategories.map(cat => ({ value: cat.id, label: cat.name, type: 'income' })),
    ...expenseCategories.map(cat => ({ value: cat.id, label: cat.name, type: 'expense' }))
  ];

  // Count active filters (excluding 'all' type which is default)
  const activeFilterCount = [
    filters.type !== 'all' ? 1 : 0,
    filters.categoryId ? 1 : 0,
    filters.startDate ? 1 : 0,
    filters.endDate ? 1 : 0,
  ].reduce((sum, val) => sum + val, 0);

  const handleTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setFilters({ type: e.target.value as 'all' | 'income' | 'expense' });
  };

  const handleCategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setFilters({ categoryId: e.target.value || undefined });
  };

  const handleStartDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFilters({ startDate: e.target.value || undefined });
  };

  const handleEndDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFilters({ endDate: e.target.value || undefined });
  };

  const handleClear = () => {
    clearFilters();
  };

  return (
    <div className="mb-4 border border-gray-200 rounded-lg" dir="rtl">
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex justify-between items-center p-4 hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="font-medium">סינון</span>
          {activeFilterCount > 0 && (
            <span className="inline-flex items-center justify-center w-5 h-5 text-xs bg-primary-600 text-white rounded-full">
              {activeFilterCount}
            </span>
          )}
        </div>
        <svg
          className={`w-5 h-5 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isExpanded && (
        <div className="p-4 border-t border-gray-200 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select
              label="סוג תנועה"
              value={filters.type}
              onChange={handleTypeChange}
              options={[
                { value: 'all', label: 'הכל' },
                { value: 'income', label: 'הכנסות' },
                { value: 'expense', label: 'הוצאות' }
              ]}
            />

            <div className="w-full">
              <label className="block text-sm font-medium text-gray-700 mb-1 text-right">
                קטגוריה
              </label>
              <select
                value={filters.categoryId || ''}
                onChange={handleCategoryChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-right
                  focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="">כל הקטגוריות</option>
                {allCategories.map(cat => (
                  <option key={cat.value} value={cat.value}>
                    {cat.label} ({cat.type === 'income' ? 'הכנסה' : 'הוצאה'})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              type="date"
              label="מתאריך"
              value={filters.startDate || ''}
              onChange={handleStartDateChange}
            />

            <Input
              type="date"
              label="עד תאריך"
              value={filters.endDate || ''}
              onChange={handleEndDateChange}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={handleClear}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              נקה סינון
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
