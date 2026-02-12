import { useState, useMemo, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useTab } from '@/hooks/useTab';
import { LoginForm } from '@/components/auth/LoginForm';
import { Layout } from '@/components/layout/Layout';
import { TransactionTabs } from '@/components/transaction/TransactionTabs';
import { TabView, type OptimisticTransactionHandlers } from '@/components/transaction/TabView';
import { MonthSelector } from '@/components/transaction/MonthSelector';
import { FAB } from '@/components/ui/FAB';
import { AddTransactionModal } from '@/components/transaction/AddTransactionModal';
import { CategoriesProvider } from '@/context/CategoriesContext';
import { TabProvider } from '@/context/TabContext';
import { HistoryProvider } from '@/context/HistoryContext';
import { TAB_CONFIGS } from '@/utils/tabConfigs';

function getCurrentMonth(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

function AppContent() {
  const { currentTab } = useTab();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonth());
  const optimisticHandlersRef = useRef<OptimisticTransactionHandlers | null>(null);

  // Find the current tab config
  const tabConfig = useMemo(
    () => TAB_CONFIGS.find((tab) => tab.id === currentTab),
    [currentTab]
  );

  const handleTransactionAdded = () => {
    // Trigger refresh of transactions
    setRefreshTrigger((prev) => prev + 1);
  };

  const handleTransactionChanged = () => {
    // Trigger refresh after edit/delete
    setRefreshTrigger((prev) => prev + 1);
  };

  if (!tabConfig) {
    return null; // Should never happen
  }

  return (
    <>
      <Layout>
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="mb-4">
            <MonthSelector selectedMonth={selectedMonth} onMonthChange={setSelectedMonth} />
          </div>
          <TransactionTabs />
          <TabView
            tab={tabConfig}
            selectedMonth={selectedMonth}
            key={`${tabConfig.id}-${refreshTrigger}`}
            onOptimisticHandlersReady={(handlers) => {
              optimisticHandlersRef.current = handlers;
            }}
            onTransactionChanged={handleTransactionChanged}
          />
        </div>
      </Layout>

      {/* FAB for adding transactions */}
      <FAB onClick={() => setIsModalOpen(true)} />

      {/* Add transaction modal */}
      <AddTransactionModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        tab={tabConfig}
        onSuccess={handleTransactionAdded}
        optimisticHandlers={optimisticHandlersRef.current}
      />
    </>
  );
}

function App() {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <LoginForm />;
  }

  return (
    <TabProvider>
      <CategoriesProvider>
        <HistoryProvider>
          <AppContent />
        </HistoryProvider>
      </CategoriesProvider>
    </TabProvider>
  );
}

export default App;
