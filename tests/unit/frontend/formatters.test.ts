import { describe, it, expect } from 'vitest';
import { formatters } from '../../../src/utils/formatters';

describe('formatters', () => {
  describe('currency', () => {
    it('A4.1 - formats number as ILS currency with ₪ symbol', () => {
      const result = formatters.currency(100);
      expect(result).toContain('100');
      expect(result).toContain('₪');
    });
  });

  describe('date', () => {
    it('A4.2 - formats ISO date as DD/MM/YYYY', () => {
      expect(formatters.date('2026-03-10')).toBe('10/03/2026');
    });

    it('A4.3 - invalid date returns original string', () => {
      expect(formatters.date('invalid')).toBe('invalid');
    });
  });

  describe('number', () => {
    it('A4.4 - formats number with 2 decimal places', () => {
      const result = formatters.number(1234.5);
      // Check that it contains the digits and 2 decimal places
      expect(result).toContain('234');
      expect(result).toMatch(/50$/);
    });
  });
});
