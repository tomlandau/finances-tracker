import { useState } from 'react';
import { useAnalytics } from '@/hooks/useAnalytics';
import { MonthlySummary } from './MonthlySummary';
import { CategoryBreakdown } from './CategoryBreakdown';
import { DomainAnalysis } from './DomainAnalysis';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { exportTransactionsToCSV } from '@/utils/exportCSV';
import { Download } from 'lucide-react';
import type { PeriodType } from '@/types/analytics.types';

const HEBREW_MONTHS = [
  'ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני',
  'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'
];

const BI_MONTHLY_PERIODS = [
  'ינואר-פברואר', 'מרץ-אפריל', 'מאי-יוני',
  'יולי-אוגוסט', 'ספטמבר-אוקטובר', 'נובמבר-דצמבר'
];

export function AnalyticsView() {
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [periodType, setPeriodType] = useState<PeriodType>('monthly');
  const [selectedPeriods, setSelectedPeriods] = useState<number[]>([]);

  const { analytics, allTransactions, loading, error } = useAnalytics(selectedYear, periodType, selectedPeriods);

  const handleExportCSV = () => {
    const filename = `transactions-${selectedYear}.csv`;
    exportTransactionsToCSV(allTransactions, filename);
  };

  const handlePeriodTypeChange = (newPeriodType: PeriodType) => {
    setPeriodType(newPeriodType);
    setSelectedPeriods([]); // Clear selection when changing period type
  };

  const togglePeriod = (periodIndex: number) => {
    setSelectedPeriods(prev =>
      prev.includes(periodIndex)
        ? prev.filter(p => p !== periodIndex)
        : [...prev, periodIndex]
    );
  };

  const clearPeriodSelection = () => {
    setSelectedPeriods([]);
  };

  const selectAllPeriods = () => {
    const maxPeriods = periodType === 'monthly' ? 12 : 6;
    setSelectedPeriods(Array.from({ length: maxPeriods }, (_, i) => i));
  };

  // Generate year options (current year and 2 previous years)
  const yearOptions = [currentYear, currentYear - 1, currentYear - 2];

  // Get period names based on period type
  const periodNames = periodType === 'monthly' ? HEBREW_MONTHS : BI_MONTHLY_PERIODS;

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
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h1 className="text-2xl font-bold">דוחות וניתוחים</h1>

        <div className="flex items-center gap-4 flex-wrap">
          {/* Period Type Selector */}
          <div className="flex gap-2">
            <button
              onClick={() => handlePeriodTypeChange('monthly')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                periodType === 'monthly'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              חודשי
            </button>
            <button
              onClick={() => handlePeriodTypeChange('bi-monthly')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                periodType === 'bi-monthly'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              דו חודשי
            </button>
          </div>

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

      {/* Period Filter */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">סינון תקופות לדוחות</h2>
          <div className="flex gap-2">
            <button
              onClick={clearPeriodSelection}
              className="px-3 py-1 text-sm bg-gray-200 hover:bg-gray-300 rounded-lg transition-colors"
            >
              נקה הכל
            </button>
            <button
              onClick={selectAllPeriods}
              className="px-3 py-1 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              בחר הכל
            </button>
          </div>
        </div>
        <p className="text-sm text-gray-600 mb-3">
          {selectedPeriods.length === 0
            ? 'מציג את כל התקופות'
            : `מציג ${selectedPeriods.length} תקופות נבחרות`}
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
          {periodNames.map((name, index) => (
            <button
              key={index}
              onClick={() => togglePeriod(index)}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                selectedPeriods.includes(index)
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {name}
            </button>
          ))}
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

      {/* Domain Analysis with Pie Charts */}
      <DomainAnalysis
        incomeByOwner={analytics.incomeByOwner}
        expenseByBusinessHome={analytics.expenseByBusinessHome}
      />
    </div>
  );
}
