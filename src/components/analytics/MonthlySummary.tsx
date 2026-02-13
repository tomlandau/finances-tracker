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
      <h2 className="text-xl font-bold mb-4">סיכום חודשי</h2>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b-2 border-gray-300">
              <th className="text-right py-3 px-4 font-semibold">חודש</th>
              <th className="text-right py-3 px-4 font-semibold">הכנסות</th>
              <th className="text-right py-3 px-4 font-semibold">הוצאות</th>
              <th className="text-right py-3 px-4 font-semibold">יתרה</th>
            </tr>
          </thead>
          <tbody>
            {monthlySummaries.map((summary) => (
              <tr key={summary.month} className="border-b border-gray-200 hover:bg-gray-50">
                <td className="py-3 px-4">{summary.monthName}</td>
                <td className="py-3 px-4 text-green-600 font-medium">
                  {formatAmount(summary.income)}
                </td>
                <td className="py-3 px-4 text-red-600 font-medium">
                  {formatAmount(summary.expense)}
                </td>
                <td className={`py-3 px-4 font-bold ${summary.balance >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                  {formatBalance(summary.balance)}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-gray-300 bg-gray-50">
              <td className="py-3 px-4 font-bold">סה"כ שנתי</td>
              <td className="py-3 px-4 text-green-600 font-bold">
                {formatAmount(totalIncome)}
              </td>
              <td className="py-3 px-4 text-red-600 font-bold">
                {formatAmount(totalExpense)}
              </td>
              <td className={`py-3 px-4 font-bold text-lg ${totalBalance >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                {formatBalance(totalBalance)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
