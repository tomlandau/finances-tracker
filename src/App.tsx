import { useState, useMemo, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useTab } from '@/hooks/useTab';
import { LoginForm } from '@/components/auth/LoginForm';
import { Layout } from '@/components/layout/Layout';
import { TransactionTabs } from '@/components/transaction/TransactionTabs';
import { TabView, type OptimisticTransactionHandlers } from '@/components/transaction/TabView';
import { FAB } from '@/components/ui/FAB';
import { AddTransactionModal } from '@/components/transaction/AddTransactionModal';
import { CategoriesProvider } from '@/context/CategoriesContext';
import { TabProvider } from '@/context/TabContext';
import { HistoryProvider } from '@/context/HistoryContext';
import { TAB_CONFIGS } from '@/utils/tabConfigs';

function AppContent() {
  const { currentTab } = useTab();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
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

  if (!tabConfig) {
    return null; // Should never happen
  }

  return (
    <>
      <Layout>
        <div className="bg-white rounded-lg shadow-md p-6">
          <TransactionTabs />
          <TabView
            tab={tabConfig}
            key={`${tabConfig.id}-${refreshTrigger}`}
            onOptimisticHandlersReady={(handlers) => {
              optimisticHandlersRef.current = handlers;
            }}
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
