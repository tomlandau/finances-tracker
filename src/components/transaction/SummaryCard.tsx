interface SummaryCardProps {
  total: number;
  count: number;
  type: 'income' | 'expense';
}

export function SummaryCard({ total, count, type }: SummaryCardProps) {
  const label = type === 'income' ? 'סה"כ הכנסות' : 'סה"כ הוצאות';
  const transactionsLabel = count === 1 ? 'תנועה אחת' : `${count} תנועות`;

  return (
    <div className="bg-primary-600 rounded-lg p-4 mb-4 text-white">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm opacity-90 mb-1">{label}</p>
          <p className="text-2xl font-bold">
            ₪{total.toLocaleString('he-IL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
        </div>
        <div className="text-left">
          <p className="text-sm opacity-90">{transactionsLabel}</p>
        </div>
      </div>
    </div>
  );
}
