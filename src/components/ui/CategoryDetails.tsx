import type { Category } from '@/types';

interface CategoryDetailsProps {
  category: Category | undefined;
  type: 'income' | 'expense';
}

export function CategoryDetails({ category, type }: CategoryDetailsProps) {
  if (!category) return null;

  // Helper to check if field has value
  const hasValue = (field: string | undefined): boolean => {
    return !!field && field.trim() !== '';
  };

  // Show nothing if no additional fields available
  const hasAnyField = type === 'income'
    ? (hasValue(category.owner) || hasValue(category.domain))
    : (hasValue(category.businessHome) || hasValue(category.domain) ||
       hasValue(category.expenseType) || hasValue(category.renewalDate));

  if (!hasAnyField) return null;

  return (
    <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-sm text-right">
      <div className="text-gray-600 font-medium mb-2">פרטי הקטגוריה:</div>

      {type === 'income' ? (
        <div className="space-y-1 text-gray-700">
          {hasValue(category.owner) && (
            <div className="flex justify-between">
              <span className="font-medium">של מי ההכנסה:</span>
              <span>{category.owner}</span>
            </div>
          )}
          {hasValue(category.domain) && (
            <div className="flex justify-between">
              <span className="font-medium">תחום:</span>
              <span>{category.domain}</span>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-1 text-gray-700">
          {hasValue(category.businessHome) && (
            <div className="flex justify-between">
              <span className="font-medium">עסקי/בית:</span>
              <span>{category.businessHome}</span>
            </div>
          )}
          {hasValue(category.domain) && (
            <div className="flex justify-between">
              <span className="font-medium">תחום:</span>
              <span>{category.domain}</span>
            </div>
          )}
          {hasValue(category.expenseType) && (
            <div className="flex justify-between">
              <span className="font-medium">סוג הוצאה:</span>
              <span>{category.expenseType}</span>
            </div>
          )}
          {hasValue(category.renewalDate) && (
            <div className="flex justify-between">
              <span className="font-medium">תאריך חידוש:</span>
              <span>{category.renewalDate}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
