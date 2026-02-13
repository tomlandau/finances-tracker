import { useState, useEffect, useContext, useMemo } from 'react';
import type { TabConfig } from '@/types/tab.types';
import type { Transaction } from '@/types/history.types';
import type { TabFilters } from '@/types/filter.types';
import { useTabTransactions } from '@/hooks/useTabTransactions';
import { CategoriesContext } from '@/context/CategoriesContext';
import { SummaryCard } from './SummaryCard';
import { FilterPanel } from './FilterPanel';
import { TransactionList } from '@/components/history/TransactionList';
import { PlannedTransactionsDrawer } from './PlannedTransactionsDrawer';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { Button } from '@/components/ui/Button';
import { ChevronDown, ChevronUp } from 'lucide-react';

export interface OptimisticTransactionHandlers {
  addOptimisticTransaction: (transaction: Transaction) => void;
  removeOptimisticTransaction: (id: string) => void;
  clearOptimisticTransactions: () => void;
}

interface TabViewProps {
  tab: TabConfig;
  selectedMonth: string;
  onOptimisticHandlersReady?: (handlers: OptimisticTransactionHandlers) => void;
  onTransactionChanged?: () => void;
}

export function TabView({ tab, selectedMonth, onOptimisticHandlersReady, onTransactionChanged }: TabViewProps) {
  const [filters, setFilters] = useState<TabFilters>({});
  const [filterPanelOpen, setFilterPanelOpen] = useState(false);

  const categoriesContext = useContext(CategoriesContext);
  const incomeCategories = categoriesContext?.incomeCategories || [];
  const expenseCategories = categoriesContext?.expenseCategories || [];

  // Get filtered categories for this tab
  const categories = useMemo(() => {
    if (tab.transactionType === 'income') {
      return incomeCategories.filter(cat => {
        if (tab.filters.owner) {
          return cat.owner === tab.filters.owner;
        }
        return true;
      });
    } else {
      return expenseCategories.filter(cat => {
        if (tab.filters.businessHome) {
          return cat.businessHome === tab.filters.businessHome;
        }
        return true;
      });
    }
  }, [tab, incomeCategories, expenseCategories]);

  const {
    transactions,
    plannedTransactions,
    loading,
    error,
    summary,
    addOptimisticTransaction,
    removeOptimisticTransaction,
    clearOptimisticTransactions
  } = useTabTransactions(tab, selectedMonth, filters);

  // Count active filters (must be before early returns!)
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.categoryId) count++;
    if (filters.expenseType) count++;
    if (filters.recurringOnly) count++;
    return count;
  }, [filters]);

  // Expose optimistic handlers to parent
  useEffect(() => {
    if (onOptimisticHandlersReady) {
      onOptimisticHandlersReady({
        addOptimisticTransaction,
        removeOptimisticTransaction,
        clearOptimisticTransactions,
      });
    }
  }, [onOptimisticHandlersReady, addOptimisticTransaction, removeOptimisticTransaction, clearOptimisticTransactions]);

  if (loading && transactions.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
        <p className="text-red-700 text-sm">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <SummaryCard total={summary.total} count={summary.count} type={tab.transactionType} />

      {/* Filter Toggle Button */}
      <Button
        type="button"
        variant="secondary"
        fullWidth
        onClick={() => setFilterPanelOpen(!filterPanelOpen)}
      >
        <span className="flex items-center justify-center gap-2">
          סינונים
          {activeFilterCount > 0 && (
            <span className="inline-flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-blue-600 rounded-full">
              {activeFilterCount}
            </span>
          )}
          {filterPanelOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </span>
      </Button>

      {/* Filter Panel */}
      <FilterPanel
        filters={filters}
        onFilterChange={setFilters}
        tab={tab}
        categories={categories}
        isOpen={filterPanelOpen}
      />

      {transactions.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500">אין תנועות לחודש זה</p>
        </div>
      ) : (
        <TransactionList transactions={transactions} onTransactionChanged={onTransactionChanged} />
      )}

      {/* Planned Transactions Drawer */}
      <PlannedTransactionsDrawer
        transactions={plannedTransactions}
        type={tab.transactionType}
        onTransactionChanged={onTransactionChanged}
      />
    </div>
  );
}
