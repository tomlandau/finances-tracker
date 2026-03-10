import { describe, it, expect } from 'vitest';
import {
  buildInitialClassificationKeyboard,
  buildCategoryKeyboard,
  getEntityEmoji,
  getTypeEmoji,
} from '../../../telegram/keyboards';
import type { Category } from '../../../classification/types';

const makeCategories = (n: number): Category[] =>
  Array.from({ length: n }, (_, i) => ({
    id: `cat-${i}`,
    name: `קטגוריה ${i}`,
    type: 'expense' as const,
  }));

describe('keyboards', () => {
  describe('buildInitialClassificationKeyboard', () => {
    it('A5.1 - income (amount>0): 3 income buttons + ignore', () => {
      const kb = buildInitialClassificationKeyboard('tx1', 100);
      const allButtons = kb.inline_keyboard.flat();
      const incomeButtons = allButtons.filter(b => b.callback_data.startsWith('classify:tx1:income:'));
      const ignoreButtons = allButtons.filter(b => b.callback_data.startsWith('ignore:'));
      expect(incomeButtons).toHaveLength(3);
      expect(ignoreButtons).toHaveLength(1);
    });

    it('A5.2 - expense (amount<0): 4 expense buttons + ignore', () => {
      const kb = buildInitialClassificationKeyboard('tx1', -50);
      const allButtons = kb.inline_keyboard.flat();
      const expenseButtons = allButtons.filter(b => b.callback_data.startsWith('classify:tx1:expense:'));
      const ignoreButtons = allButtons.filter(b => b.callback_data.startsWith('ignore:'));
      expect(expenseButtons).toHaveLength(4);
      expect(ignoreButtons).toHaveLength(1);
    });

    it('A5.3 - callback data format: classify:{id}:{type}:{entity}', () => {
      const kb = buildInitialClassificationKeyboard('txABC', 100);
      const firstButton = kb.inline_keyboard[0][0];
      expect(firstButton.callback_data).toMatch(/^classify:txABC:income:.+/);
    });
  });

  describe('buildCategoryKeyboard', () => {
    it('A5.4 - 5 categories: single page, no pagination', () => {
      const kb = buildCategoryKeyboard('tx1', 'expense', 'בית', makeCategories(5));
      const rows = kb.inline_keyboard;
      const paginationRow = rows.find(row =>
        row.some(b => b.callback_data.startsWith('page:'))
      );
      expect(paginationRow).toBeUndefined();
      // Back button is always present
      const backRow = rows[rows.length - 1];
      expect(backRow[0].callback_data).toBe('back:tx1');
    });

    it('A5.5 - 25 categories: 2 pages with navigation buttons', () => {
      const kb = buildCategoryKeyboard('tx1', 'expense', 'בית', makeCategories(25), 0);
      const rows = kb.inline_keyboard;
      const paginationRow = rows.find(row =>
        row.some(b => b.callback_data.startsWith('page:'))
      );
      expect(paginationRow).toBeDefined();
      const nextButton = paginationRow!.find(b => b.callback_data === 'page:tx1:1');
      expect(nextButton).toBeDefined();
    });

    it('A5.6 - page 1 of 2: has "קודם" button', () => {
      const kb = buildCategoryKeyboard('tx1', 'expense', 'בית', makeCategories(25), 1);
      const allButtons = kb.inline_keyboard.flat();
      const prevButton = allButtons.find(b => b.callback_data === 'page:tx1:0');
      expect(prevButton).toBeDefined();
    });

    it('A5.7 - odd number of categories: last one alone in its row', () => {
      const kb = buildCategoryKeyboard('tx1', 'expense', 'בית', makeCategories(5));
      const rows = kb.inline_keyboard;
      // 5 categories → rows: [0,1], [2,3], [4] (then possibly pagination/back)
      const categoryRows = rows.filter(row =>
        row.some(b => b.callback_data.startsWith('category:'))
      );
      const lastCategoryRow = categoryRows[categoryRows.length - 1];
      expect(lastCategoryRow).toHaveLength(1);
    });

    it('A5.8 - back button always in last row', () => {
      const kb = buildCategoryKeyboard('tx1', 'expense', 'בית', makeCategories(10));
      const lastRow = kb.inline_keyboard[kb.inline_keyboard.length - 1];
      expect(lastRow[0].callback_data).toBe('back:tx1');
    });
  });

  describe('getEntityEmoji', () => {
    it('בית → 🏠', () => expect(getEntityEmoji('בית')).toBe('🏠'));
    it('עסק תום → 💼', () => expect(getEntityEmoji('עסק תום')).toBe('💼'));
    it('עסק יעל → 💼', () => expect(getEntityEmoji('עסק יעל')).toBe('💼'));
    it('עסק - משותף → 🤝', () => expect(getEntityEmoji('עסק - משותף')).toBe('🤝'));
    it('unknown → 📁', () => expect(getEntityEmoji('other')).toBe('📁'));
  });

  describe('getTypeEmoji', () => {
    it('income → 💰', () => expect(getTypeEmoji('income')).toBe('💰'));
    it('expense → 💳', () => expect(getTypeEmoji('expense')).toBe('💳'));
  });
});
