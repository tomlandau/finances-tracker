import Dexie, { Table } from 'dexie';
import type { Transaction } from '@/types/history.types';
import type { Category } from '@/types';

// Define database schema
export interface PendingSubmission {
  id?: number;
  endpoint: string;
  method: string;
  body: any;
  timestamp: number;
  retryCount?: number;
}

export class FinancesDB extends Dexie {
  transactions!: Table<Transaction, string>;
  incomeCategories!: Table<Category, string>;
  expenseCategories!: Table<Category, string>;
  pendingSubmissions!: Table<PendingSubmission, number>;

  constructor() {
    super('FinancesTrackerDB');

    this.version(1).stores({
      transactions: 'id, type, date, categoryId',
      incomeCategories: 'id, name',
      expenseCategories: 'id, name',
      pendingSubmissions: '++id, timestamp'
    });
  }

  // Transaction methods
  async addTransaction(transaction: Transaction) {
    return await this.transactions.put(transaction);
  }

  async updateTransaction(id: string, updates: Partial<Transaction>) {
    return await this.transactions.update(id, updates);
  }

  async deleteTransaction(id: string) {
    return await this.transactions.delete(id);
  }

  async getTransactions(type: 'income' | 'expense', startDate: string, endDate: string) {
    return await this.transactions
      .where('type')
      .equals(type)
      .and(t => t.date >= startDate && t.date <= endDate)
      .toArray();
  }

  async clearTransactions() {
    return await this.transactions.clear();
  }

  // Category methods
  async setIncomeCategories(categories: Category[]) {
    await this.incomeCategories.clear();
    return await this.incomeCategories.bulkPut(categories);
  }

  async setExpenseCategories(categories: Category[]) {
    await this.expenseCategories.clear();
    return await this.expenseCategories.bulkPut(categories);
  }

  async getIncomeCategories() {
    return await this.incomeCategories.toArray();
  }

  async getExpenseCategories() {
    return await this.expenseCategories.toArray();
  }

  // Pending submissions methods
  async addPendingSubmission(submission: Omit<PendingSubmission, 'id'>) {
    return await this.pendingSubmissions.add({
      ...submission,
      retryCount: 0
    });
  }

  async getPendingSubmissions() {
    return await this.pendingSubmissions.orderBy('timestamp').toArray();
  }

  async removePendingSubmission(id: number) {
    return await this.pendingSubmissions.delete(id);
  }

  async updatePendingSubmission(id: number, updates: Partial<PendingSubmission>) {
    return await this.pendingSubmissions.update(id, updates);
  }

  async clearPendingSubmissions() {
    return await this.pendingSubmissions.clear();
  }
}

// Export singleton instance
export const db = new FinancesDB();
