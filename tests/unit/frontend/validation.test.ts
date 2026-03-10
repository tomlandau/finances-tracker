import { describe, it, expect } from 'vitest';
import { validation } from '../../../src/utils/validation';

describe('validation', () => {
  describe('isValidAmount', () => {
    it('A3.1 - valid positive amount returns true', () => {
      expect(validation.isValidAmount('100')).toBe(true);
    });

    it('A3.2 - zero amount returns false', () => {
      expect(validation.isValidAmount('0')).toBe(false);
    });

    it('A3.3 - negative amount returns false', () => {
      expect(validation.isValidAmount('-5')).toBe(false);
    });

    it('A3.4 - non-numeric text returns false', () => {
      expect(validation.isValidAmount('abc')).toBe(false);
    });

    it('decimal positive amount returns true', () => {
      expect(validation.isValidAmount('99.99')).toBe(true);
    });
  });

  describe('isValidDate', () => {
    it('A3.5 - valid ISO date returns true', () => {
      expect(validation.isValidDate('2026-03-10')).toBe(true);
    });

    it('A3.6 - invalid date string returns false', () => {
      expect(validation.isValidDate('not-a-date')).toBe(false);
    });
  });
});
