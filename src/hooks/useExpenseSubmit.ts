import { useState } from 'react';
import { api } from '@/services/api';
import type { ExpenseEntry } from '@/types';

export function useExpenseSubmit() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (entry: ExpenseEntry): Promise<boolean> => {
    try {
      setLoading(true);
      setError(null);
      await api.submitExpense(entry);
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit expense');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setError(null);
  };

  return { submit, loading, error, reset };
}
