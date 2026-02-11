import type { Category, IncomeEntry, ExpenseEntry, CategoryType } from '@/types';

const API_BASE = '/api';

export const api = {
  async fetchCategories(type: CategoryType = 'income'): Promise<Category[]> {
    const response = await fetch(`${API_BASE}/categories?type=${type}`);

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || `Failed to fetch ${type} categories`);
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

  async submitExpense(entry: ExpenseEntry): Promise<{ success: boolean; id: string }> {
    const response = await fetch(`${API_BASE}/expense`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(entry),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to submit expense');
    }

    return await response.json();
  },
};
