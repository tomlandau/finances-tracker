import { describe, it, expect } from 'vitest';
import { calculateVat } from '../../../src/utils/vat';

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
