import { useState } from 'react';
import { api } from '@/services/api';
import type { IncomeEntry } from '@/types';

export function useIncomeSubmit() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (entry: IncomeEntry): Promise<boolean> => {
    try {
      setLoading(true);
      setError(null);
      await api.submitIncome(entry);
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit');
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
