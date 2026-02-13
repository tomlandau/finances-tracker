import { useState } from 'react';
import { useAnalytics } from '@/hooks/useAnalytics';
import { MonthlySummary } from './MonthlySummary';
import { CategoryBreakdown } from './CategoryBreakdown';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { exportTransactionsToCSV } from '@/utils/exportCSV';
import { Download } from 'lucide-react';

export function AnalyticsView() {
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear);

  const { analytics, allTransactions, loading, error } = useAnalytics(selectedYear);

  const handleExportCSV = () => {
    const filename = `transactions-${selectedYear}.csv`;
    exportTransactionsToCSV(allTransactions, filename);
  };

  // Generate year options (current year and 2 previous years)
  const yearOptions = [currentYear, currentYear - 1, currentYear - 2];

  if (loading) {
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
    <div className="space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">דוחות וניתוחים</h1>

        <div className="flex items-center gap-4">
          {/* Year Selector */}
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {yearOptions.map(year => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>

          {/* Export CSV Button */}
          <button
            onClick={handleExportCSV}
            disabled={allTransactions.length === 0}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download size={20} />
            ייצוא ל-CSV
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <p className="text-sm text-green-700 mb-1">סה"כ הכנסות</p>
          <p className="text-2xl font-bold text-green-600">
            {new Intl.NumberFormat('he-IL', {
              style: 'currency',
              currency: 'ILS',
              minimumFractionDigits: 0
            }).format(analytics.totalIncome)}
          </p>
        </div>

        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-sm text-red-700 mb-1">סה"כ הוצאות</p>
          <p className="text-2xl font-bold text-red-600">
            {new Intl.NumberFormat('he-IL', {
              style: 'currency',
              currency: 'ILS',
              minimumFractionDigits: 0
            }).format(analytics.totalExpense)}
          </p>
        </div>

        <div className={`border rounded-lg p-4 ${
          analytics.totalBalance >= 0
            ? 'bg-blue-50 border-blue-200'
            : 'bg-orange-50 border-orange-200'
        }`}>
          <p className={`text-sm mb-1 ${
            analytics.totalBalance >= 0 ? 'text-blue-700' : 'text-orange-700'
          }`}>
            יתרה
          </p>
          <p className={`text-2xl font-bold ${
            analytics.totalBalance >= 0 ? 'text-blue-600' : 'text-orange-600'
          }`}>
            {new Intl.NumberFormat('he-IL', {
              style: 'currency',
              currency: 'ILS',
              minimumFractionDigits: 0,
              signDisplay: 'always'
            }).format(analytics.totalBalance)}
          </p>
        </div>
      </div>

      {/* Monthly Summary Table */}
      <MonthlySummary
        monthlySummaries={analytics.monthlySummaries}
        totalIncome={analytics.totalIncome}
        totalExpense={analytics.totalExpense}
        totalBalance={analytics.totalBalance}
      />

      {/* Category Breakdown */}
      <CategoryBreakdown
        incomeCategories={analytics.topIncomeCategories}
        expenseCategories={analytics.topExpenseCategories}
      />
    </div>
  );
}
