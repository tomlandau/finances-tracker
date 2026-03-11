import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Classifier } from '../../../classification/classifier';

// ─── Mocks for classifyTransaction trail tests ───────────────────────────────

vi.mock('../../../classification/airtable-helper', () => ({
  AirtableHelper: vi.fn(function (this: any) {
    this.findExistingIncomeRecord = vi.fn().mockResolvedValue(null);
    this.findExistingExpenseRecord = vi.fn().mockResolvedValue(null);
    this.updateTransactionStatus = vi.fn().mockResolvedValue(undefined);
    this.updateExpenseAmount = vi.fn().mockResolvedValue(undefined);
    this.getCategories = vi.fn().mockResolvedValue([{ id: 'cat-1', name: 'פרויקטים', type: 'income' }]);
    this.getCategoryById = vi.fn().mockResolvedValue({ id: 'cat-1', name: 'פרויקטים', type: 'income' });
    this.createIncomeRecord = vi.fn().mockResolvedValue('rec-income-1');
    this.createExpenseRecord = vi.fn().mockResolvedValue('rec-expense-1');
  }),
}));

vi.mock('../../../classification/sumit-client', () => ({
  SumitClient: vi.fn(function (this: any) {
    this.isEnabled = vi.fn().mockReturnValue(false);
    this.findInvoice = vi.fn().mockResolvedValue(null);
  }),
}));

vi.mock('../../../classification/clients-matcher', () => ({
  ClientsMatcher: vi.fn(function (this: any) {
    this.isEnabled = vi.fn().mockReturnValue(false);
    this.findMatch = vi.fn().mockResolvedValue(null);
  }),
}));

vi.mock('../../../classification/rules-engine', () => ({
  RulesEngine: vi.fn(function (this: any) {
    this.findMatchingRule = vi.fn().mockResolvedValue(null);
    this.incrementRuleUsage = vi.fn().mockResolvedValue(undefined);
    this.createRuleFromManualClassification = vi.fn().mockResolvedValue('rule-1');
    this.getAllRules = vi.fn().mockResolvedValue([]);
  }),
}));

describe('Classifier.isPaymentApp', () => {
  it('B1.1 - "ביט" at start of description matches', () => {
    expect(Classifier.isPaymentApp('ביט העברה')).toBe(true);
  });

  it('B1.2 - "ביט" at end of description matches', () => {
    expect(Classifier.isPaymentApp('העברה ביט')).toBe(true);
  });

  it('B1.3 - "ביטוח לאומי" does NOT match "ביט"', () => {
    expect(Classifier.isPaymentApp('ביטוח לאומי')).toBe(false);
  });

  it('B1.4 - "ביטחוני" does NOT match "ביט"', () => {
    expect(Classifier.isPaymentApp('ביטחוני')).toBe(false);
  });

  it('B1.5 - "BIT" case insensitive matches', () => {
    expect(Classifier.isPaymentApp('BIT payment')).toBe(true);
  });

  it('B1.6 - "פייבוקס" matches', () => {
    expect(Classifier.isPaymentApp('פייבוקס העברה')).toBe(true);
  });

  it('B1.7 - "paybox" matches', () => {
    expect(Classifier.isPaymentApp('paybox transfer')).toBe(true);
  });

  it('B1.8 - "הפועלים" matches', () => {
    expect(Classifier.isPaymentApp('בנק הפועלים')).toBe(true);
  });

  it('B1.9 - unrelated description does NOT match', () => {
    expect(Classifier.isPaymentApp('רכישה בסופר')).toBe(false);
  });

  it('B1.10 - empty string does NOT match', () => {
    expect(Classifier.isPaymentApp('')).toBe(false);
  });

  it('B1.11 - "ביט" alone matches', () => {
    expect(Classifier.isPaymentApp('ביט')).toBe(true);
  });
});

// ─── ClassificationTrail tests ───────────────────────────────────────────────

describe('Classifier.classifyTransaction trail', () => {
  const makeTransaction = (overrides = {}) => ({
    id: 'tx-test-1',
    hash: 'hash-1',
    date: '2026-03-10',
    amount: 500,
    description: 'תשלום לקוח',
    source: 'בנק לאומי',
    userId: 'usr_tom_001',
    status: 'pending',
    ...overrides,
  });

  it('B11.1 - result includes a trail with transactionId and description', async () => {
    const classifier = new Classifier();
    const result = await classifier.classifyTransaction(makeTransaction());
    expect(result.trail).toBeDefined();
    expect(result.trail!.transactionId).toBe('tx-test-1');
    expect(result.trail!.description).toBe('תשלום לקוח');
    expect(result.trail!.amount).toBe(500);
  });

  it('B11.2 - trail.finalMethod matches result.method', async () => {
    const classifier = new Classifier();
    const result = await classifier.classifyTransaction(makeTransaction());
    expect(result.trail!.finalMethod).toBe(result.method);
  });

  it('B11.3 - trail.finalSuccess matches result.success', async () => {
    const classifier = new Classifier();
    const result = await classifier.classifyTransaction(makeTransaction());
    expect(result.trail!.finalSuccess).toBe(result.success);
  });

  it('B11.4 - trail.steps has at least one entry', async () => {
    const classifier = new Classifier();
    const result = await classifier.classifyTransaction(makeTransaction());
    expect(result.trail!.steps.length).toBeGreaterThan(0);
  });

  it('B11.5 - each step has layer, tried, and matched fields', async () => {
    const classifier = new Classifier();
    const result = await classifier.classifyTransaction(makeTransaction());
    for (const step of result.trail!.steps) {
      expect(step.layer).toBeDefined();
      expect(typeof step.tried).toBe('boolean');
      expect(typeof step.matched).toBe('boolean');
    }
  });

  it('B11.6 - when rule matches, layer3 step has matched=true and detail', async () => {
    const { RulesEngine } = await import('../../../classification/rules-engine');
    vi.mocked(RulesEngine).mockImplementationOnce(function (this: any) {
      this.findMatchingRule = vi.fn().mockResolvedValue({
        id: 'rule-123',
        pattern: 'תשלום',
        categoryId: 'cat-1',
        entity: 'עסק תום',
        type: 'income',
        confidence: 'מאושר',
        timesUsed: 3,
      });
      this.incrementRuleUsage = vi.fn().mockResolvedValue(undefined);
      this.createRuleFromManualClassification = vi.fn();
      this.getAllRules = vi.fn();
    });

    const classifier = new Classifier();
    const result = await classifier.classifyTransaction(makeTransaction());
    const layer3 = result.trail!.steps.find(s => s.layer === 'layer3_rules');
    expect(layer3).toBeDefined();
    expect(layer3!.matched).toBe(true);
    expect(layer3!.detail).toContain('תשלום');
  });
});
