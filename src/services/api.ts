import type { Category, IncomeEntry, ExpenseEntry, CategoryType } from '@/types';
import type { Transaction, HistoryFilters } from '@/types/history.types';
import { db } from './db';

const API_BASE = '/api';

export const api = {
  async fetchCategories(type: CategoryType = 'income'): Promise<Category[]> {
    const response = await fetch(`${API_BASE}/categories?type=${type}`, {
      credentials: 'include',
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || `Failed to fetch ${type} categories`);
    }

    const data = await response.json();
    return data.categories;
  },

  async submitIncome(entry: IncomeEntry): Promise<{ success: boolean; id: string }> {
    try {
      const response = await fetch(`${API_BASE}/income`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(entry),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to submit income');
      }

      return await response.json();
    } catch (error) {
      // If offline or network error, queue the submission
      if (!navigator.onLine || error instanceof TypeError) {
        await db.addPendingSubmission({
          endpoint: `${API_BASE}/income`,
          method: 'POST',
          body: entry,
          timestamp: Date.now(),
        });
        // Return optimistic response
        return { success: true, id: 'offline-' + Date.now() };
      }
      throw error;
    }
  },

  async submitExpense(entry: ExpenseEntry): Promise<{ success: boolean; id: string }> {
    try {
      const response = await fetch(`${API_BASE}/expense`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(entry),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to submit expense');
      }

      return await response.json();
    } catch (error) {
      // If offline or network error, queue the submission
      if (!navigator.onLine || error instanceof TypeError) {
        await db.addPendingSubmission({
          endpoint: `${API_BASE}/expense`,
          method: 'POST',
          body: entry,
          timestamp: Date.now(),
        });
        // Return optimistic response
        return { success: true, id: 'offline-' + Date.now() };
      }
      throw error;
    }
  },

  async fetchRecent(filters: HistoryFilters, limit: number = 20): Promise<Transaction[]> {
    const params = new URLSearchParams();
    params.append('type', filters.type);
    params.append('limit', limit.toString());

    if (filters.startDate) {
      params.append('startDate', filters.startDate);
    }
    if (filters.endDate) {
      params.append('endDate', filters.endDate);
    }
    if (filters.categoryId) {
      params.append('categoryId', filters.categoryId);
    }

    const response = await fetch(`${API_BASE}/recent?${params.toString()}`, {
      credentials: 'include',
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to fetch recent transactions');
    }

    const data = await response.json();
    return data.transactions;
  },

  async updateTransaction(
    id: string,
    type: 'income' | 'expense',
    fields: {
      amount?: number;
      categoryId?: string;
      date?: string;
      vat?: string;
      vatType?: string;
      description?: string;
      isRecurring?: boolean;
    }
  ): Promise<{ success: boolean; id: string }> {
    try {
      const response = await fetch(`${API_BASE}/update`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ id, type, fields }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update transaction');
      }

      return await response.json();
    } catch (error) {
      // If offline or network error, queue the submission
      if (!navigator.onLine || error instanceof TypeError) {
        await db.addPendingSubmission({
          endpoint: `${API_BASE}/update`,
          method: 'POST',
          body: { id, type, fields },
          timestamp: Date.now(),
        });
        // Return optimistic response
        return { success: true, id };
      }
      throw error;
    }
  },

  async deleteTransaction(id: string, type: 'income' | 'expense'): Promise<{ success: boolean; id: string }> {
    try {
      const response = await fetch(`${API_BASE}/delete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ id, type }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete transaction');
      }

      return await response.json();
    } catch (error) {
      // If offline or network error, queue the submission
      if (!navigator.onLine || error instanceof TypeError) {
        await db.addPendingSubmission({
          endpoint: `${API_BASE}/delete`,
          method: 'POST',
          body: { id, type },
          timestamp: Date.now(),
        });
        // Return optimistic response
        return { success: true, id };
      }
      throw error;
    }
  },
};
