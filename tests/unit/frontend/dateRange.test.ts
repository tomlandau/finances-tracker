import { describe, it, expect } from 'vitest';
import { getMonthDateRange } from '../../../src/utils/dateRange';

describe('getMonthDateRange', () => {
  it('A8.1 - April 2026: starts 2026-04-01, ends 2026-04-30', () => {
    expect(getMonthDateRange('2026-04')).toEqual(['2026-04-01', '2026-04-30']);
  });

  it('A8.2 - February 2026 (non-leap): ends 2026-02-28', () => {
    expect(getMonthDateRange('2026-02')).toEqual(['2026-02-01', '2026-02-28']);
  });

  it('A8.3 - February 2024 (leap year): ends 2024-02-29', () => {
    expect(getMonthDateRange('2024-02')).toEqual(['2024-02-01', '2024-02-29']);
  });

  it('A8.4 - January 2026: ends 2026-01-31', () => {
    expect(getMonthDateRange('2026-01')).toEqual(['2026-01-01', '2026-01-31']);
  });

  it('A8.5 - December 2026: ends 2026-12-31', () => {
    expect(getMonthDateRange('2026-12')).toEqual(['2026-12-01', '2026-12-31']);
  });

  it('A8.6 - regression: end date is last day of month, not second-to-last (timezone bug)', () => {
    const [, end] = getMonthDateRange('2026-04');
    expect(end).toBe('2026-04-30');
  });
});
