import { useAuth } from '@/hooks/useAuth';
import { LoginForm } from '@/components/auth/LoginForm';
import { Layout } from '@/components/layout/Layout';
import { IncomeForm } from '@/components/income/IncomeForm';
import { CategoriesProvider } from '@/context/CategoriesContext';

function App() {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <LoginForm />;
  }

  return (
    <CategoriesProvider>
      <Layout>
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-lg font-semibold mb-4 text-right">הוסף הכנסה חדשה</h2>
          <IncomeForm />
        </div>
      </Layout>
    </CategoriesProvider>
  );
}

export default App;
