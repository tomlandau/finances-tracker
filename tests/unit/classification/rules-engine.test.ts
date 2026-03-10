import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { RulesEngine } from '../../../classification/rules-engine';
import type { ClassificationRule } from '../../../classification/types';

const makeRule = (overrides: Partial<ClassificationRule> = {}): ClassificationRule => ({
  id: 'r1',
  pattern: 'שופרסל',
  categoryId: 'cat-1',
  entity: 'בית',
  type: 'expense',
  confidence: 'אוטומטי',
  timesUsed: 0,
  createdBy: 'usr_tom_001',
  ...overrides,
});

const makeMockAirtable = (rules: ClassificationRule[]) => ({
  getActiveRules: vi.fn().mockResolvedValue(rules),
  incrementRuleUsage: vi.fn().mockResolvedValue(undefined),
  createRule: vi.fn().mockResolvedValue('new-rule-id'),
});

describe('RulesEngine - pattern matching (B2)', () => {
  it('B2.1 - exact match returns rule', async () => {
    const rules = [makeRule({ pattern: 'שופרסל' })];
    const engine = new RulesEngine(makeMockAirtable(rules) as any);
    const result = await engine.findMatchingRule('שופרסל', 'usr_tom_001');
    expect(result).not.toBeNull();
    expect(result!.id).toBe('r1');
  });

  it('B2.2 - substring match returns rule', async () => {
    const rules = [makeRule({ pattern: 'שופרסל' })];
    const engine = new RulesEngine(makeMockAirtable(rules) as any);
    const result = await engine.findMatchingRule('שופרסל דיל תל אביב', 'usr_tom_001');
    expect(result).not.toBeNull();
  });

  it('B2.3 - case insensitive match', async () => {
    const rules = [makeRule({ pattern: 'SUPERMARKET' })];
    const engine = new RulesEngine(makeMockAirtable(rules) as any);
    const result = await engine.findMatchingRule('supermarket branch 1', 'usr_tom_001');
    expect(result).not.toBeNull();
  });

  it('B2.4 - no match returns null', async () => {
    const rules = [makeRule({ pattern: 'שופרסל' })];
    const engine = new RulesEngine(makeMockAirtable(rules) as any);
    const result = await engine.findMatchingRule('רכישה בסופר', 'usr_tom_001');
    expect(result).toBeNull();
  });

  it('B2.5 - Hebrew with numbers in description matches', async () => {
    const rules = [makeRule({ pattern: 'חשבון 123' })];
    const engine = new RulesEngine(makeMockAirtable(rules) as any);
    const result = await engine.findMatchingRule('חשבון 123 ינואר', 'usr_tom_001');
    expect(result).not.toBeNull();
  });

  it('B2.6 - empty description returns null', async () => {
    const rules = [makeRule({ pattern: 'שופרסל' })];
    const engine = new RulesEngine(makeMockAirtable(rules) as any);
    const result = await engine.findMatchingRule('', 'usr_tom_001');
    expect(result).toBeNull();
  });
});

describe('RulesEngine - rule priority (B3)', () => {
  it('B3.1 - ignore rule beats regular rule with higher confidence', async () => {
    const rules = [
      makeRule({ id: 'r1', pattern: 'test', isIgnoreRule: false, confidence: 'מאושר', timesUsed: 10 }),
      makeRule({ id: 'r2', pattern: 'test', isIgnoreRule: true, confidence: 'אוטומטי', timesUsed: 0 }),
    ];
    const engine = new RulesEngine(makeMockAirtable(rules) as any);
    const result = await engine.findMatchingRule('test transaction', 'usr_tom_001');
    expect(result!.id).toBe('r2');
  });

  it('B3.2 - "מאושר" confidence beats "אוטומטי"', async () => {
    const rules = [
      makeRule({ id: 'r1', pattern: 'test', confidence: 'אוטומטי', timesUsed: 5 }),
      makeRule({ id: 'r2', pattern: 'test', confidence: 'מאושר', timesUsed: 0 }),
    ];
    const engine = new RulesEngine(makeMockAirtable(rules) as any);
    const result = await engine.findMatchingRule('test desc', 'usr_tom_001');
    expect(result!.id).toBe('r2');
  });

  it('B3.3 - higher timesUsed wins when confidence is equal', async () => {
    const rules = [
      makeRule({ id: 'r1', pattern: 'test', confidence: 'אוטומטי', timesUsed: 10 }),
      makeRule({ id: 'r2', pattern: 'test', confidence: 'אוטומטי', timesUsed: 3 }),
    ];
    const engine = new RulesEngine(makeMockAirtable(rules) as any);
    const result = await engine.findMatchingRule('test desc', 'usr_tom_001');
    expect(result!.id).toBe('r1');
  });

  it('B3.4 - no matching rules returns null', async () => {
    const rules = [makeRule({ pattern: 'unrelated' })];
    const engine = new RulesEngine(makeMockAirtable(rules) as any);
    const result = await engine.findMatchingRule('something else', 'usr_tom_001');
    expect(result).toBeNull();
  });
});

describe('RulesEngine - cache (B4)', () => {
  it('B4.1 - first call fetches from Airtable', async () => {
    const mockAirtable = makeMockAirtable([makeRule()]);
    const engine = new RulesEngine(mockAirtable as any);
    await engine.findMatchingRule('שופרסל', 'usr_tom_001');
    expect(mockAirtable.getActiveRules).toHaveBeenCalledTimes(1);
  });

  it('B4.2 - second call within TTL uses cache', async () => {
    const mockAirtable = makeMockAirtable([makeRule()]);
    const engine = new RulesEngine(mockAirtable as any);
    await engine.findMatchingRule('שופרסל', 'usr_tom_001');
    await engine.findMatchingRule('שופרסל', 'usr_tom_001');
    expect(mockAirtable.getActiveRules).toHaveBeenCalledTimes(1);
  });

  it('B4.3 - call after cache TTL re-fetches', async () => {
    vi.useFakeTimers();
    const mockAirtable = makeMockAirtable([makeRule()]);
    const engine = new RulesEngine(mockAirtable as any);

    await engine.findMatchingRule('שופרסל', 'usr_tom_001');
    vi.advanceTimersByTime(5 * 60 * 1000 + 1); // advance past 5 minutes
    await engine.findMatchingRule('שופרסל', 'usr_tom_001');

    expect(mockAirtable.getActiveRules).toHaveBeenCalledTimes(2);
    vi.useRealTimers();
  });

  it('B4.4 - incrementRuleUsage invalidates cache', async () => {
    const mockAirtable = makeMockAirtable([makeRule()]);
    const engine = new RulesEngine(mockAirtable as any);

    await engine.findMatchingRule('שופרסל', 'usr_tom_001'); // populates cache
    await engine.incrementRuleUsage('r1');                   // invalidates cache
    await engine.findMatchingRule('שופרסל', 'usr_tom_001'); // should re-fetch

    expect(mockAirtable.getActiveRules).toHaveBeenCalledTimes(2);
  });
});
