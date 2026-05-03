import { describe, it, expect } from 'vitest';
import { calculateVat } from '../../../src/utils/vat';
import { VAT_TYPE_OPTIONS, VAT_OPTIONS } from '../../../src/utils/constants';

describe('vat - calculateVat', () => {
  it('A2.1 - no VAT (rate=0): all amounts equal input', () => {
    const result = calculateVat(100, 0, 'לפני/ללא מע"מ');
    expect(result).toEqual({ netAmount: 100, vatAmount: 0, grossAmount: 100 });
  });

  it('A2.2 - before VAT 18%: gross = net + vat', () => {
    const result = calculateVat(100, 0.18, 'לפני/ללא מע"מ');
    expect(result).toEqual({ netAmount: 100, vatAmount: 18, grossAmount: 118 });
  });

  it('A2.3 - including VAT 18% (118 → net 100)', () => {
    const result = calculateVat(118, 0.18, 'כולל מע"מ');
    expect(result).toEqual({ netAmount: 100, vatAmount: 18, grossAmount: 118 });
  });

  it('A2.4 - rounding to 2 decimal places (117 כולל)', () => {
    const result = calculateVat(117, 0.18, 'כולל מע"מ');
    expect(result.netAmount).toBe(99.15);
    expect(result.vatAmount).toBe(17.85);
    expect(result.grossAmount).toBe(117);
  });

  it('A2.5 - zero amount: all zeros', () => {
    const result = calculateVat(0, 0.18, 'לפני/ללא מע"מ');
    expect(result).toEqual({ netAmount: 0, vatAmount: 0, grossAmount: 0 });
  });
});

describe('vat - constants consistency', () => {
  it('A2.6 - VAT_TYPE_OPTIONS includes "כולל מע"מ" (regression: API must accept this value)', () => {
    const values = VAT_TYPE_OPTIONS.map(o => o.value);
    expect(values).toContain('כולל מע"מ');
  });

  it('A2.7 - VAT_TYPE_OPTIONS includes "לפני/ללא מע"מ"', () => {
    const values = VAT_TYPE_OPTIONS.map(o => o.value);
    expect(values).toContain('לפני/ללא מע"מ');
  });

  it('A2.8 - VAT_OPTIONS includes "0" for exempt/no-VAT', () => {
    const values = VAT_OPTIONS.map(o => o.value);
    expect(values).toContain('0');
  });

  it('A2.9 - calculateVat accepts all VAT_TYPE_OPTIONS values without throwing', () => {
    for (const opt of VAT_TYPE_OPTIONS) {
      expect(() => calculateVat(100, 0.18, opt.value as 'לפני/ללא מע"מ' | 'כולל מע"מ')).not.toThrow();
    }
  });
});
