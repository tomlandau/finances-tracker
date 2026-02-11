import { useState, useRef, TouchEvent } from 'react';
import { useHistory } from '@/hooks/useHistory';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { HistoryFilters } from './HistoryFilters';
import { TransactionList } from './TransactionList';

export function HistoryView() {
  const { transactions, loading, error, fetchTransactions, refresh } = useHistory();
  const [isPulling, setIsPulling] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const startY = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleTouchStart = (e: TouchEvent) => {
    if (containerRef.current && containerRef.current.scrollTop === 0) {
      startY.current = e.touches[0].clientY;
    }
  };

  const handleTouchMove = (e: TouchEvent) => {
    if (!containerRef.current || containerRef.current.scrollTop > 0) {
      return;
    }

    const currentY = e.touches[0].clientY;
    const diff = currentY - startY.current;

    if (diff > 0) {
      setPullDistance(Math.min(diff, 100));
      if (diff > 80) {
        setIsPulling(true);
      }
    }
  };

  const handleTouchEnd = async () => {
    if (isPulling) {
      setIsPulling(false);
      setPullDistance(0);
      await refresh();
    } else {
      setPullDistance(0);
    }
  };

  return (
    <div
      ref={containerRef}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      className="relative"
    >
      {pullDistance > 0 && (
        <div
          className="absolute top-0 left-0 right-0 flex justify-center items-center transition-opacity"
          style={{ height: `${pullDistance}px`, opacity: pullDistance / 100 }}
        >
          <div className="text-primary-600">
            {isPulling ? '↻ שחרר לרענון...' : '↓ משוך למטה לרענון'}
          </div>
        </div>
      )}

      <h2 className="text-lg font-semibold mb-4 text-right">היסטוריית תנועות</h2>

      <HistoryFilters />

      {loading && transactions.length === 0 ? (
        <div className="flex justify-center items-center py-12">
          <LoadingSpinner />
        </div>
      ) : error ? (
        <div className="text-center py-12">
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={fetchTransactions}
            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
          >
            נסה שוב
          </button>
        </div>
      ) : transactions.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <p>אין רשומות להצגה</p>
        </div>
      ) : (
        <TransactionList transactions={transactions} />
      )}
    </div>
  );
}
