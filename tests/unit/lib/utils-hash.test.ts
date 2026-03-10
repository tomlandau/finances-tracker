import { describe, it, expect } from 'vitest';
import { generateTransactionHash, hashTransaction } from '../../../lib/utils-hash';

describe('utils-hash', () => {
  describe('generateTransactionHash', () => {
    it('A1.1 - same inputs produce same hash (deterministic)', () => {
      const hash1 = generateTransactionHash('2026-03-10', 100, 'סופר', 'בנק הפועלים', 'usr_tom_001');
      const hash2 = generateTransactionHash('2026-03-10', 100, 'סופר', 'בנק הפועלים', 'usr_tom_001');
      expect(hash1).toBe(hash2);
    });

    it('A1.2 - different amount produces different hash', () => {
      const hash1 = generateTransactionHash('2026-03-10', 100, 'סופר', 'בנק הפועלים', 'usr_tom_001');
      const hash2 = generateTransactionHash('2026-03-10', 200, 'סופר', 'בנק הפועלים', 'usr_tom_001');
      expect(hash1).not.toBe(hash2);
    });

    it('A1.2 - different date produces different hash', () => {
      const hash1 = generateTransactionHash('2026-03-10', 100, 'סופר', 'בנק הפועלים', 'usr_tom_001');
      const hash2 = generateTransactionHash('2026-03-11', 100, 'סופר', 'בנק הפועלים', 'usr_tom_001');
      expect(hash1).not.toBe(hash2);
    });

    it('A1.3 - Hebrew description produces valid MD5 hex', () => {
      const hash = generateTransactionHash('2026-03-10', 50, 'קנייה בסופרמרקט', 'לאומי', 'usr_tom_001');
      expect(hash).toMatch(/^[0-9a-f]{32}$/);
    });

    it('A1.4 - negative amount produces valid hash', () => {
      const hash = generateTransactionHash('2026-03-10', -100, 'תשלום', 'ויזה', 'usr_tom_001');
      expect(hash).toMatch(/^[0-9a-f]{32}$/);
    });

    it('A1.5 - empty description produces valid hash', () => {
      const hash = generateTransactionHash('2026-03-10', 100, '', 'בנק', 'usr_tom_001');
      expect(hash).toMatch(/^[0-9a-f]{32}$/);
    });
  });

  describe('hashTransaction', () => {
    it('produces same result as generateTransactionHash', () => {
      const tx = {
        date: '2026-03-10',
        amount: 150,
        description: 'שופרסל',
        source: 'לאומי',
        userId: 'usr_yael_001',
      };
      const expected = generateTransactionHash(tx.date, tx.amount, tx.description, tx.source, tx.userId);
      expect(hashTransaction(tx)).toBe(expected);
    });
  });
});
