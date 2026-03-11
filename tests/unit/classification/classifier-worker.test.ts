import { describe, it, expect, vi, beforeEach } from 'vitest';
import { formatAutoClassificationDigest } from '../../../telegram/messages';
import { sendTelegramNotification } from '../../../lib/utils-telegram';

// ─── Mocks ────────────────────────────────────────────────────────────────────

const {
  mockClassifyTransaction,
  mockGetPendingTransactions,
  mockSendTelegramNotification,
  mockFormatAutoClassificationDigest,
} = vi.hoisted(() => ({
  mockClassifyTransaction: vi.fn(),
  mockGetPendingTransactions: vi.fn(),
  mockSendTelegramNotification: vi.fn().mockResolvedValue(undefined),
  mockFormatAutoClassificationDigest: vi.fn().mockReturnValue('🤖 digest message'),
}));

vi.mock('node-cron', () => ({ default: { schedule: vi.fn() } }));

vi.mock('../../../classification/classifier', () => {
  const MockClassifier = vi.fn(function (this: any) {
    this.getPendingTransactions = mockGetPendingTransactions;
    this.classifyTransaction = mockClassifyTransaction;
  }) as any;
  MockClassifier.isPaymentApp = vi.fn().mockReturnValue(false);
  return { Classifier: MockClassifier };
});

vi.mock('../../../lib/utils-telegram', () => ({
  sendTelegramNotification: mockSendTelegramNotification,
}));

vi.mock('../../../telegram/messages', () => ({
  formatAutoClassificationDigest: mockFormatAutoClassificationDigest,
  formatHourlySummary: vi.fn().mockReturnValue(''),
  formatTransactionMessage: vi.fn().mockReturnValue('msg'),
  formatPaymentAppTransactionMessage: vi.fn().mockReturnValue('msg'),
  formatClassifierError: vi.fn().mockReturnValue('error'),
}));

vi.mock('../../../telegram/bot', () => ({
  getTelegramBot: vi.fn(() => ({
    sendMessage: vi.fn().mockResolvedValue(undefined),
  })),
}));

vi.mock('../../../telegram/keyboards', () => ({
  buildInitialClassificationKeyboard: vi.fn().mockReturnValue({}),
}));

// ─── Tests ────────────────────────────────────────────────────────────────────

const makeTransaction = (id: string) => ({
  id,
  hash: `hash-${id}`,
  date: '2026-03-10',
  amount: 500,
  description: 'תשלום לקוח',
  source: 'בנק לאומי',
  userId: 'usr_tom_001',
  status: 'pending',
});

const successResult = {
  success: true,
  method: 'rule' as const,
  category: { id: 'cat-1', name: 'פרויקטים', type: 'income' as const },
  entity: 'עסק תום' as const,
  confidence: 'מאושר' as const,
  metadata: { pattern: 'תשלום' },
};

const failedResult = {
  success: false,
  method: 'failed' as const,
  category: null,
  entity: null,
  confidence: 'אוטומטי' as const,
};

describe('classifier-worker digest', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    mockSendTelegramNotification.mockResolvedValue(undefined);
    mockFormatAutoClassificationDigest.mockReturnValue('🤖 digest message');
  });

  it('C3.1 - no auto-classified transactions → formatAutoClassificationDigest not called', async () => {
    mockGetPendingTransactions.mockResolvedValue([makeTransaction('tx-1')]);
    mockClassifyTransaction.mockResolvedValue(failedResult);

    const { runClassifierManually } = await import('../../../jobs/classifier-worker');
    await runClassifierManually();

    expect(mockFormatAutoClassificationDigest).not.toHaveBeenCalled();
  });

  it('C3.2 - ≥1 auto-classified → sendTelegramNotification called for digest with Tom chat ID', async () => {
    mockGetPendingTransactions.mockResolvedValue([makeTransaction('tx-1'), makeTransaction('tx-2')]);
    mockClassifyTransaction.mockResolvedValue(successResult);

    const { runClassifierManually } = await import('../../../jobs/classifier-worker');
    await runClassifierManually();

    expect(mockFormatAutoClassificationDigest).toHaveBeenCalledOnce();

    const digestCall = mockSendTelegramNotification.mock.calls.find(
      call => call[0]?.chatIds?.includes(process.env.TELEGRAM_CHAT_ID_TOM) &&
              call[0]?.chatIds?.length === 1 &&
              call[0]?.message === '🤖 digest message'
    );
    expect(digestCall).toBeDefined();
  });

  it('C3.3 - digest send failure does not crash the worker', async () => {
    mockGetPendingTransactions.mockResolvedValue([makeTransaction('tx-1')]);
    mockClassifyTransaction.mockResolvedValue(successResult);
    mockSendTelegramNotification.mockRejectedValueOnce(new Error('Telegram down'));

    const { runClassifierManually } = await import('../../../jobs/classifier-worker');
    await expect(runClassifierManually()).resolves.toBeDefined();
  });
});
