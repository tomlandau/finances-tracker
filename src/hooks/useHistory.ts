import { useContext } from 'react';
import { HistoryContext } from '@/context/HistoryContext';
import type { HistoryState } from '@/types/history.types';

export function useHistory(): HistoryState {
  const context = useContext(HistoryContext);

  if (!context) {
    throw new Error('useHistory must be used within a HistoryProvider');
  }

  return context;
}
