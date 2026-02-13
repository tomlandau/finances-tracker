import { useState, useEffect, useContext, useMemo } from 'react';
import type { TabConfig } from '@/types/tab.types';
import type { Transaction } from '@/types/history.types';
import type { TabFilters } from '@/types/filter.types';
import { useTabTransactions } from '@/hooks/useTabTransactions';
import { CategoriesContext } from '@/context/CategoriesContext';
import { SummaryCard } from './SummaryCard';
import { FilterPanel } from './FilterPanel';
import { TransactionsByDateView } from './TransactionsByDateView';
import { TransactionsByCategoryView } from './TransactionsByCategoryView';
import { PlannedTransactionsDrawer } from './PlannedTransactionsDrawer';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { Button } from '@/components/ui/Button';
import { SearchInput } from '@/components/ui/SearchInput';
import { Filter, Search } from 'lucide-react';

type ViewMode = 'by-date' | 'by-category';

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
  const [searchPanelOpen, setSearchPanelOpen] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('by-date');
  const [searchQuery, setSearchQuery] = useState('');

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
    transactions: rawTransactions,
    plannedTransactions,
    loading,
    error,
    summary,
    addOptimisticTransaction,
    removeOptimisticTransaction,
    clearOptimisticTransactions
  } = useTabTransactions(tab, selectedMonth, filters);

  // Filter transactions by search query
  const transactions = useMemo(() => {
    if (!searchQuery.trim()) {
      return rawTransactions;
    }

    const query = searchQuery.toLowerCase().trim();

    return rawTransactions.filter(transaction => {
      // Get full category details to access domain, owner, businessHome, expenseType
      const category = categoriesContext?.getCategoryById(transaction.categoryId);

      // Search in transaction fields
      const matchesCategory = transaction.categoryName?.toLowerCase().includes(query);
      const matchesDescription = transaction.description?.toLowerCase().includes(query);

      // Search in category fields
      const matchesDomain = category?.domain?.toLowerCase().includes(query);
      const matchesOwner = category?.owner?.toLowerCase().includes(query);
      const matchesBusinessHome = category?.businessHome?.toLowerCase().includes(query);
      const matchesExpenseType = category?.expenseType?.toLowerCase().includes(query);

      return matchesCategory || matchesDescription || matchesDomain || matchesOwner || matchesBusinessHome || matchesExpenseType;
    });
  }, [rawTransactions, searchQuery, categoriesContext]);

  // Calculate planned summary
  const plannedSummary = useMemo(() => {
    const total = plannedTransactions.reduce((sum, t) => sum + t.amount, 0);
    return {
      total,
      count: plannedTransactions.length,
    };
  }, [plannedTransactions]);

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
      <SummaryCard
        total={summary.total}
        count={summary.count}
        type={tab.transactionType}
        plannedTotal={plannedSummary.total}
        plannedCount={plannedSummary.count}
      />

      {/* View Mode Toggle + Action Buttons */}
      <div className="flex gap-2 items-center" dir="rtl">
        {/* Search and Filter buttons - Right side */}
        <Button
          type="button"
          variant="secondary"
          onClick={() => setSearchPanelOpen(!searchPanelOpen)}
          className="w-auto px-3 py-2"
        >
          <span className="flex items-center gap-2">
            <Search size={18} />
            {searchQuery && (
              <span className="inline-flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-green-600 rounded-full">
                {transactions.length}
              </span>
            )}
          </span>
        </Button>
        <Button
          type="button"
          variant="secondary"
          onClick={() => setFilterPanelOpen(!filterPanelOpen)}
          className="w-auto px-3 py-2"
        >
          <span className="flex items-center gap-2">
            <Filter size={18} />
            {activeFilterCount > 0 && (
              <span className="inline-flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-blue-600 rounded-full">
                {activeFilterCount}
              </span>
            )}
          </span>
        </Button>

        {/* Spacer */}
        <div className="flex-1"></div>

        {/* View mode buttons - Left side */}
        <button
          onClick={() => setViewMode('by-date')}
          className={`flex-1 px-3 py-2 rounded-lg font-medium text-sm transition-colors ${
            viewMode === 'by-date'
              ? 'bg-primary-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          לפי תאריך
        </button>
        <button
          onClick={() => setViewMode('by-category')}
          className={`flex-1 px-3 py-2 rounded-lg font-medium text-sm transition-colors ${
            viewMode === 'by-category'
              ? 'bg-primary-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          לפי קטגוריה
        </button>
      </div>

      {/* Collapsible Search Panel */}
      {searchPanelOpen && (
        <SearchInput
          value={searchQuery}
          onValueChange={setSearchQuery}
          placeholder="חיפוש לפי שם, תיאור, תחום, קטגוריה..."
        />
      )}

      {/* Filter Panel */}
      <FilterPanel
        filters={filters}
        onFilterChange={setFilters}
        tab={tab}
        categories={categories}
        isOpen={filterPanelOpen}
      />

      {/* Planned Transactions Drawer */}
      <PlannedTransactionsDrawer
        transactions={plannedTransactions}
        type={tab.transactionType}
        onTransactionChanged={onTransactionChanged}
      />

      {/* Transactions View - Based on View Mode */}
      {transactions.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500">אין תנועות לחודש זה</p>
        </div>
      ) : viewMode === 'by-date' ? (
        <TransactionsByDateView
          transactions={transactions}
          type={tab.transactionType}
          onTransactionChanged={onTransactionChanged}
        />
      ) : (
        <TransactionsByCategoryView
          transactions={transactions}
          type={tab.transactionType}
          onTransactionChanged={onTransactionChanged}
        />
      )}
    </div>
  );
}
