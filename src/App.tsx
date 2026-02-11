import { useAuth } from '@/hooks/useAuth';
import { useTransactionType } from '@/hooks/useTransactionType';
import { LoginForm } from '@/components/auth/LoginForm';
import { Layout } from '@/components/layout/Layout';
import { TransactionTabs } from '@/components/transaction/TransactionTabs';
import { IncomeForm } from '@/components/income/IncomeForm';
import { ExpenseForm } from '@/components/expense/ExpenseForm';
import { CategoriesProvider } from '@/context/CategoriesContext';
import { TransactionProvider } from '@/context/TransactionContext';

function AppContent() {
  const { type } = useTransactionType();

  return (
    <Layout>
      <div className="bg-white rounded-lg shadow-md p-6">
        <TransactionTabs />

        {type === 'income' ? (
          <>
            <h2 className="text-lg font-semibold mb-4 text-right">הוסף הכנסה חדשה</h2>
            <IncomeForm />
          </>
        ) : (
          <>
            <h2 className="text-lg font-semibold mb-4 text-right">הוסף הוצאה חדשה</h2>
            <ExpenseForm />
          </>
        )}
      </div>
    </Layout>
  );
}

function App() {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <LoginForm />;
  }

  return (
    <TransactionProvider>
      <CategoriesProvider>
        <AppContent />
      </CategoriesProvider>
    </TransactionProvider>
  );
}

export default App;
