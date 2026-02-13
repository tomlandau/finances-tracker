import type { MonthlySummary as MonthlySummaryType } from '@/types/analytics.types';

interface MonthlySummaryProps {
  monthlySummaries: MonthlySummaryType[];
  totalIncome: number;
  totalExpense: number;
  totalBalance: number;
}

export function MonthlySummary({
  monthlySummaries,
  totalIncome,
  totalExpense,
  totalBalance
}: MonthlySummaryProps) {
  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('he-IL', {
      style: 'currency',
      currency: 'ILS',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const formatBalance = (balance: number) => {
    const formatted = formatAmount(Math.abs(balance));
    return balance >= 0 ? `+${formatted}` : `-${formatted}`;
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6" dir="rtl">
      <h2 className="text-xl font-bold mb-4">סיכום חודשי - פירוט לפי טאבים</h2>

      <div className="overflow-x-auto">
        <table className="w-full text-xs sm:text-sm">
          <thead>
            <tr className="border-b-2 border-gray-300">
              <th className="text-right py-2 px-2 font-semibold sticky right-0 bg-white">תקופה</th>
              <th className="text-right py-2 px-2 font-semibold text-green-700">הכנסות תום</th>
              <th className="text-right py-2 px-2 font-semibold text-green-700">הכנסות יעל</th>
              <th className="text-right py-2 px-2 font-semibold text-red-700">עסק תום</th>
              <th className="text-right py-2 px-2 font-semibold text-red-700">עסק יעל</th>
              <th className="text-right py-2 px-2 font-semibold text-red-700">עסק משותף</th>
              <th className="text-right py-2 px-2 font-semibold text-red-700">בית</th>
              <th className="text-right py-2 px-2 font-semibold bg-gray-50">הכנסות</th>
              <th className="text-right py-2 px-2 font-semibold bg-gray-50">הוצאות</th>
              <th className="text-right py-2 px-2 font-semibold bg-gray-50">יתרה</th>
            </tr>
          </thead>
          <tbody>
            {monthlySummaries.map((summary) => (
              <tr key={summary.month} className="border-b border-gray-200 hover:bg-gray-50">
                <td className="py-2 px-2 font-medium sticky right-0 bg-white">{summary.monthName}</td>
                <td className="py-2 px-2 text-green-600">
                  {summary.tabBreakdown.tomIncome > 0 ? formatAmount(summary.tabBreakdown.tomIncome) : '-'}
                </td>
                <td className="py-2 px-2 text-green-600">
                  {summary.tabBreakdown.yaelIncome > 0 ? formatAmount(summary.tabBreakdown.yaelIncome) : '-'}
                </td>
                <td className="py-2 px-2 text-red-600">
                  {summary.tabBreakdown.tomBusiness > 0 ? formatAmount(summary.tabBreakdown.tomBusiness) : '-'}
                </td>
                <td className="py-2 px-2 text-red-600">
                  {summary.tabBreakdown.yaelBusiness > 0 ? formatAmount(summary.tabBreakdown.yaelBusiness) : '-'}
                </td>
                <td className="py-2 px-2 text-red-600">
                  {summary.tabBreakdown.sharedBusiness > 0 ? formatAmount(summary.tabBreakdown.sharedBusiness) : '-'}
                </td>
                <td className="py-2 px-2 text-red-600">
                  {summary.tabBreakdown.home > 0 ? formatAmount(summary.tabBreakdown.home) : '-'}
                </td>
                <td className="py-2 px-2 text-green-600 font-medium bg-gray-50">
                  {formatAmount(summary.income)}
                </td>
                <td className="py-2 px-2 text-red-600 font-medium bg-gray-50">
                  {formatAmount(summary.expense)}
                </td>
                <td className={`py-2 px-2 font-bold bg-gray-50 ${summary.balance >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                  {formatBalance(summary.balance)}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-gray-300 bg-gray-100">
              <td className="py-3 px-2 font-bold sticky right-0 bg-gray-100">סה"כ</td>
              <td className="py-3 px-2 text-green-600 font-bold">
                {formatAmount(monthlySummaries.reduce((sum, s) => sum + s.tabBreakdown.tomIncome, 0))}
              </td>
              <td className="py-3 px-2 text-green-600 font-bold">
                {formatAmount(monthlySummaries.reduce((sum, s) => sum + s.tabBreakdown.yaelIncome, 0))}
              </td>
              <td className="py-3 px-2 text-red-600 font-bold">
                {formatAmount(monthlySummaries.reduce((sum, s) => sum + s.tabBreakdown.tomBusiness, 0))}
              </td>
              <td className="py-3 px-2 text-red-600 font-bold">
                {formatAmount(monthlySummaries.reduce((sum, s) => sum + s.tabBreakdown.yaelBusiness, 0))}
              </td>
              <td className="py-3 px-2 text-red-600 font-bold">
                {formatAmount(monthlySummaries.reduce((sum, s) => sum + s.tabBreakdown.sharedBusiness, 0))}
              </td>
              <td className="py-3 px-2 text-red-600 font-bold">
                {formatAmount(monthlySummaries.reduce((sum, s) => sum + s.tabBreakdown.home, 0))}
              </td>
              <td className="py-3 px-2 text-green-600 font-bold bg-gray-50">
                {formatAmount(totalIncome)}
              </td>
              <td className="py-3 px-2 text-red-600 font-bold bg-gray-50">
                {formatAmount(totalExpense)}
              </td>
              <td className={`py-3 px-2 font-bold text-lg bg-gray-50 ${totalBalance >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                {formatBalance(totalBalance)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
