import { describe, it, expect } from 'vitest';
import { TAB_CONFIGS, getTabById } from '../../../src/utils/tabConfigs';

describe('tabConfigs', () => {
  it('A7.1 - there are exactly 7 tabs', () => {
    expect(TAB_CONFIGS).toHaveLength(7);
  });

  it('A7.2 - getTabById("home") returns הוצאות בית tab', () => {
    const tab = getTabById('home');
    expect(tab).toBeDefined();
    expect(tab!.label).toBe('הוצאות בית');
    expect(tab!.transactionType).toBe('expense');
  });

  it('A7.3 - getTabById with unknown id returns undefined', () => {
    // @ts-expect-error testing invalid id
    expect(getTabById('invalid')).toBeUndefined();
  });

  it('A7.4 - tom-income tab has filter { owner: "תום" }', () => {
    const tab = getTabById('tom-income');
    expect(tab!.filters).toEqual({ owner: 'תום' });
  });

  it('A7.5 - tom-business tab has filter { businessHome: "עסק תום" }', () => {
    const tab = getTabById('tom-business');
    expect(tab!.filters).toEqual({ businessHome: 'עסק תום' });
  });

  it('A7.6 - shared-income tab has filter { owner: "משותף" }', () => {
    const tab = getTabById('shared-income');
    expect(tab!.filters).toEqual({ owner: 'משותף' });
  });

  it('all income tabs have transactionType="income"', () => {
    const incomeTabs = TAB_CONFIGS.filter(t => t.transactionType === 'income');
    expect(incomeTabs).toHaveLength(3);
  });

  it('all expense tabs have transactionType="expense"', () => {
    const expenseTabs = TAB_CONFIGS.filter(t => t.transactionType === 'expense');
    expect(expenseTabs).toHaveLength(4);
  });
});
