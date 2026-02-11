import type { Category, IncomeEntry } from '@/types';

const API_BASE = '/api';

export const api = {
  async fetchCategories(): Promise<Category[]> {
    const response = await fetch(`${API_BASE}/categories`);

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to fetch categories');
    }

    const data = await response.json();
    return data.categories;
  },

  async submitIncome(entry: IncomeEntry): Promise<{ success: boolean; id: string }> {
    const response = await fetch(`${API_BASE}/income`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(entry),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to submit income');
    }

    return await response.json();
  },
};
