import { describe, it, expect } from 'vitest';
import {
  escapeMarkdown,
  formatTransactionMessage,
  formatPaymentAppTransactionMessage,
  formatClassificationSuccess,
  formatIgnoreMessage,
  formatIgnoreRuleOffer,
} from '../../../telegram/messages';
import type { Transaction } from '../../../classification/types';

const makeTransaction = (amount: number): Transaction => ({
  id: 'tx-1',
  hash: 'abc123',
  date: '2026-03-10',
  amount,
  description: 'תשלום לסופר',
  source: 'בנק לאומי',
  userId: 'usr_tom_001',
  status: 'pending',
});

describe('messages', () => {
  describe('escapeMarkdown', () => {
    it('A6.1 - escapes special Markdown characters', () => {
      const result = escapeMarkdown('*_[]()');
      expect(result).toBe('\\*\\_\\[\\]\\(\\)');
    });

    it('A6.2 - null-like input returns empty string', () => {
      // @ts-expect-error testing non-string input
      expect(escapeMarkdown(null)).toBe('');
    });

    it('A6.3 - Hebrew text with special chars escaped correctly', () => {
      const result = escapeMarkdown('שלום *world* [test]');
      expect(result).toBe('שלום \\*world\\* \\[test\\]');
    });

    it('plain text is unchanged', () => {
      expect(escapeMarkdown('hello world')).toBe('hello world');
    });

    it('Hebrew without special chars is unchanged', () => {
      expect(escapeMarkdown('שלום עולם')).toBe('שלום עולם');
    });
  });

  describe('formatTransactionMessage', () => {
    it('A6.4 - income transaction contains "הכנסה"', () => {
      const msg = formatTransactionMessage(makeTransaction(500));
      expect(msg).toContain('הכנסה');
    });

    it('A6.5 - expense transaction contains "הוצאה"', () => {
      const msg = formatTransactionMessage(makeTransaction(-200));
      expect(msg).toContain('הוצאה');
    });

    it('includes the amount', () => {
      const msg = formatTransactionMessage(makeTransaction(500));
      expect(msg).toContain('500.00');
    });

    it('includes the date formatted as DD/MM/YYYY', () => {
      const msg = formatTransactionMessage(makeTransaction(100));
      expect(msg).toContain('10/03/2026');
    });
  });

  describe('formatPaymentAppTransactionMessage', () => {
    it('A6.6 - contains warning about payment app', () => {
      const msg = formatPaymentAppTransactionMessage(makeTransaction(300));
      expect(msg).toContain('לא מומלץ ליצור חוק קבוע');
    });

    it('contains payment app mention', () => {
      const msg = formatPaymentAppTransactionMessage(makeTransaction(300));
      expect(msg).toContain('אפליקציית תשלום');
    });
  });

  describe('formatClassificationSuccess', () => {
    it('contains category name', () => {
      const msg = formatClassificationSuccess('מזון', 'בית', 'expense', false);
      expect(msg).toContain('מזון');
    });

    it('mentions rule created when createRule=true', () => {
      const msg = formatClassificationSuccess('מזון', 'בית', 'expense', true);
      expect(msg).toContain('חוק חדש');
    });

    it('no rule mention when createRule=false', () => {
      const msg = formatClassificationSuccess('מזון', 'בית', 'expense', false);
      expect(msg).not.toContain('חוק חדש');
    });
  });

  describe('formatIgnoreMessage', () => {
    it('contains ignore confirmation text', () => {
      const msg = formatIgnoreMessage();
      expect(msg).toContain('התעלמות');
    });
  });

  describe('formatIgnoreRuleOffer', () => {
    it('contains the description', () => {
      const msg = formatIgnoreRuleOffer('שירות אינטרנט');
      expect(msg).toContain('שירות אינטרנט');
    });
  });
});
