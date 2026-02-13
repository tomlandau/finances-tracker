import { useState, useMemo, useContext } from 'react';
import type { Transaction } from '@/types/history.types';
import { TransactionList } from '@/components/history/TransactionList';
import { CategoriesContext } from '@/context/CategoriesContext';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface TransactionsByCategoryViewProps {
  transactions: Transaction[];
  type: 'income' | 'expense';
  onTransactionChanged?: () => void;
}

interface CategoryGroup {
  groupKey: string;
  groupName: string;
  transactions: Transaction[];
  total: number;
  count: number;
}

export function TransactionsByCategoryView({
  transactions,
  type,
  onTransactionChanged
}: TransactionsByCategoryViewProps) {
  const categoriesContext = useContext(CategoriesContext);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

  // Group transactions by category or domain
  const categoryGroups = useMemo(() => {
    const groups = new Map<string, Transaction[]>();

    // Group transactions
    transactions.forEach(transaction => {
      let groupKey: string;

      if (type === 'expense') {
        // For expenses, group by domain
        const category = categoriesContext?.getCategoryById(transaction.categoryId);
        groupKey = category?.domain || 'ללא תחום';
      } else {
        // For income, group by categoryId (original behavior)
        groupKey = transaction.categoryId;
      }

      if (!groups.has(groupKey)) {
        groups.set(groupKey, []);
      }
      groups.get(groupKey)!.push(transaction);
    });

    // Convert to array and sort by total amount descending
    const sortedGroups: CategoryGroup[] = Array.from(groups.entries())
      .map(([groupKey, transactions]) => {
        // Sort transactions within group by date descending
        const sortedTransactions = [...transactions].sort((a, b) =>
          b.date.localeCompare(a.date)
        );

        const total = transactions.reduce((sum, t) => sum + (t.grossAmount || t.amount), 0);

        let groupName: string;
        if (type === 'expense') {
          // For expenses, use the domain as the group name
          groupName = groupKey;
        } else {
          // For income, use the category name
          groupName = transactions[0]?.categoryName || 'ללא קטגוריה';
        }

        return {
          groupKey,
          groupName,
          transactions: sortedTransactions,
          total,
          count: transactions.length,
        };
      })
      .sort((a, b) => b.total - a.total);

    return sortedGroups;
  }, [transactions, type, categoriesContext]);

  // Toggle group expansion
  const toggleGroup = (groupKey: string) => {
    setExpandedCategories(prev => {
      const newSet = new Set(prev);
      if (newSet.has(groupKey)) {
        newSet.delete(groupKey);
      } else {
        newSet.add(groupKey);
      }
      return newSet;
    });
  };

  // Format amount with currency
  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('he-IL', {
      style: 'currency',
      currency: 'ILS',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  // Get group badges (for income only - expenses don't need badges in group header since domain is the group name)
  const getGroupBadges = (groupKey: string) => {
    if (type === 'income') {
      const category = categoriesContext?.getCategoryById(groupKey);
      if (!category) return null;

      return category.domain ? (
        <span className="inline-block px-2 py-0.5 text-xs bg-purple-100 text-purple-700 rounded">
          {category.domain}
        </span>
      ) : null;
    }
    return null;
  };

  const accentColor = type === 'income' ? 'text-green-700' : 'text-red-700';
  const bgColor = type === 'income' ? 'bg-green-50' : 'bg-red-50';
  const borderColor = type === 'income' ? 'border-green-200' : 'border-red-200';

  if (categoryGroups.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">אין תנועות להצגה</p>
      </div>
    );
  }

  return (
    <div className="space-y-3" dir="rtl">
      {categoryGroups.map((group) => {
        const isExpanded = expandedCategories.has(group.groupKey);

        return (
          <div key={group.groupKey} className={`border ${borderColor} rounded-lg overflow-hidden`}>
            {/* Group Header - Clickable */}
            <button
              onClick={() => toggleGroup(group.groupKey)}
              className={`w-full ${bgColor} p-4 flex items-center justify-between hover:opacity-80 transition-opacity`}
            >
              <div className="flex items-center gap-2 flex-1">
                <div className="flex flex-col items-start">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-gray-900">{group.groupName}</h3>
                    {getGroupBadges(group.groupKey)}
                  </div>
                  <span className="text-xs text-gray-600">
                    {group.count} {group.count === 1 ? 'תנועה' : 'תנועות'}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <span className={`text-lg font-bold ${accentColor}`}>
                  {formatAmount(group.total)}
                </span>
                {isExpanded ? (
                  <ChevronUp size={20} className="text-gray-600" />
                ) : (
                  <ChevronDown size={20} className="text-gray-600" />
                )}
              </div>
            </button>

            {/* Expandable Transaction List */}
            <div
              className={`overflow-hidden transition-all duration-300 ease-in-out ${
                isExpanded ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'
              }`}
            >
              <div className="p-4 bg-white border-t border-gray-200">
                <TransactionList
                  transactions={group.transactions}
                  onTransactionChanged={onTransactionChanged}
                />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
