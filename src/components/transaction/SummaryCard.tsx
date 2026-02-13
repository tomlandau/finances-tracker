interface SummaryCardProps {
  total: number;
  count: number;
  type: 'income' | 'expense';
  plannedTotal?: number;
  plannedCount?: number;
}

export function SummaryCard({ total, count, type, plannedTotal = 0, plannedCount = 0 }: SummaryCardProps) {
  const label = type === 'income' ? 'סה"כ הכנסות' : 'סה"כ הוצאות';
  const transactionsLabel = count === 1 ? 'תנועה אחת' : `${count} תנועות`;

  const hasPlanned = plannedTotal > 0;
  const currentTotal = total;
  const grandTotal = total + plannedTotal;

  return (
    <div className="bg-primary-600 rounded-lg p-4 mb-4 text-white">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-sm opacity-90 mb-1">{label}</p>
          {hasPlanned ? (
            <>
              <p className="text-2xl font-bold">
                ₪{grandTotal.toLocaleString('he-IL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
              <div className="mt-2 text-sm opacity-90 space-y-1">
                <div>
                  {type === 'income' ? 'הכנסות עד כה: ' : 'הוצאות עד כה: '}
                  <span className="font-medium">
                    ₪{currentTotal.toLocaleString('he-IL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
                <div>
                  {type === 'income' ? 'הכנסות מתוכננות: ' : 'הוצאות מתוכננות: '}
                  <span className="font-medium">
                    ₪{plannedTotal.toLocaleString('he-IL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </>
          ) : (
            <p className="text-2xl font-bold">
              ₪{total.toLocaleString('he-IL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          )}
        </div>
        <div className="text-left">
          <p className="text-sm opacity-90">{transactionsLabel}</p>
          {hasPlanned && plannedCount > 0 && (
            <p className="text-xs opacity-75 mt-1">
              + {plannedCount} {plannedCount === 1 ? 'מתוכננת' : 'מתוכננות'}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
