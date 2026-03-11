import cron from 'node-cron';
import { Classifier } from '../classification/classifier';
import { sendTelegramNotification } from '../lib/utils-telegram';
import { getTelegramBot } from '../telegram/bot';
import { buildInitialClassificationKeyboard } from '../telegram/keyboards';
import { formatTransactionMessage, formatPaymentAppTransactionMessage, formatHourlySummary, formatClassifierError, formatAutoClassificationDigest } from '../telegram/messages';
import type { AutoClassificationItem } from '../telegram/messages';
import type { Transaction } from '../classification/types';

/**
 * Classifier Worker - worker שרץ כל יום ב-07:00 ומסווג תנועות ממתינות
 *
 * Flow:
 * 1. שליפת תנועות עם סטטוס "ממתין לסיווג"
 * 2. ניסיון סיווג אוטומטי (Sumit → Client → Rules)
 * 3. תנועות שלא סווגו נשלחות לטלגרם לסיווג ידני
 * 4. שליחת סיכום למשתמשים
 */

let isRunning = false;

/**
 * התחלת classifier worker
 * רץ כל יום ב-07:00 שעון ישראל
 */
export function startClassifierWorker(): void {
  console.log('⚙️ Scheduling classifier worker (daily at 07:00 Israel)...');

  // Run every day at 07:00 Israel time
  cron.schedule('0 7 * * *', async () => {
    // Prevent overlapping runs
    if (isRunning) {
      console.log('⚠️ Classifier worker already running, skipping this run');
      return;
    }

    isRunning = true;

    try {
      await runClassifierWorker();
    } catch (error) {
      console.error('❌ Classifier worker failed:', error);

      // Notify admin about failure
      await sendErrorNotification(error instanceof Error ? error.message : 'Unknown error');
    } finally {
      isRunning = false;
    }
  }, {
    timezone: 'Asia/Jerusalem'
  });

  console.log('✅ Classifier worker scheduled (runs daily at 07:00 Israel time)');

  // Optional: Run once immediately on startup (for testing)
  if (process.env.NODE_ENV === 'development') {
    console.log('🧪 Running classifier worker immediately (dev mode)...');
    setTimeout(() => {
      runClassifierWorker().catch(console.error);
    }, 5000); // Wait 5 seconds after startup
  }
}

/**
 * הרצת classifier worker
 */
async function runClassifierWorker(): Promise<void> {
  console.log('\n🔄 Starting classifier worker...');
  const startTime = Date.now();

  try {
    const classifier = new Classifier();

    // Step 1: Get pending transactions
    const pendingTransactions = await classifier.getPendingTransactions();
    const totalTransactions = pendingTransactions.length;

    console.log(`📊 Found ${totalTransactions} pending transactions`);

    if (totalTransactions === 0) {
      console.log('✅ No pending transactions, worker complete');
      return;
    }

    let autoClassified = 0;
    let manualRequired = 0;
    const failedTransactions: { transaction: Transaction; error: string }[] = [];
    const autoClassifiedDetails: AutoClassificationItem[] = [];

    // Step 2: Try to classify each transaction
    for (const transaction of pendingTransactions) {
      try {
        console.log(`\n📝 Processing: ${transaction.description} (₪${transaction.amount})`);

        const result = await classifier.classifyTransaction(transaction);

        if (result.success) {
          autoClassified++;
          console.log(`  ✅ Auto-classified via ${result.method}`);
          autoClassifiedDetails.push({
            description: transaction.description,
            amount: transaction.amount,
            date: transaction.date.split('-').reverse().join('/'),
            category: result.category?.name ?? '',
            entity: result.entity ?? '',
            method: result.method,
            rulePattern: (result.metadata as any)?.pattern,
            confidence: result.confidence,
            isPaymentApp: Classifier.isPaymentApp(transaction.description),
          });
        } else {
          // Send to Telegram for manual classification
          manualRequired++;
          await sendClassificationRequest(transaction);
          console.log(`  ⏳ Sent to Telegram for manual classification`);
        }

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error(`  ❌ Failed to process transaction:`, errorMessage);

        failedTransactions.push({
          transaction,
          error: errorMessage
        });
      }
    }

    // Send auto-classification digest to Tom only
    if (autoClassifiedDetails.length > 0) {
      try {
        const digestMsg = formatAutoClassificationDigest(autoClassifiedDetails);
        if (digestMsg) {
          await sendTelegramNotification({
            message: digestMsg,
            chatIds: [process.env.TELEGRAM_CHAT_ID_TOM!],
          });
        }
      } catch (e) {
        console.error('[DIGEST_ERROR]', e);
      }
    }

    // Step 3: Send summary
    const duration = ((Date.now() - startTime) / 1000).toFixed(1);

    console.log(`\n📊 Classifier worker complete (${duration}s):`);
    console.log(`  ✅ Auto-classified: ${autoClassified}`);
    console.log(`  ⏳ Manual required: ${manualRequired}`);
    console.log(`  ❌ Failed: ${failedTransactions.length}`);

    // Send summary to users (only if there was activity)
    if (autoClassified > 0 || manualRequired > 0) {
      const summaryMessage = formatHourlySummary(autoClassified, manualRequired);

      if (summaryMessage) {
        await sendTelegramNotification({
          message: summaryMessage,
          chatIds: [
            process.env.TELEGRAM_CHAT_ID_TOM!,
            process.env.TELEGRAM_CHAT_ID_YAEL!
          ]
        });
      }
    }

    // Send error notifications for failed transactions (to admin only)
    if (failedTransactions.length > 0) {
      const errorList = failedTransactions
        .map(f => `• ${f.transaction.description}: ${f.error}`)
        .join('\n');

      await sendTelegramNotification({
        message: `⚠️ ${failedTransactions.length} transactions failed to process:\n\n${errorList}`,
        chatIds: [process.env.TELEGRAM_CHAT_ID_TOM!]
      });
    }

  } catch (error) {
    console.error('❌ Classifier worker error:', error);
    throw error;
  }
}

/**
 * שליחת בקשת סיווג לטלגרם
 */
async function sendClassificationRequest(transaction: Transaction): Promise<void> {
  try {
    const bot = getTelegramBot();

    // Detect payment app transactions - show different message
    const isPaymentApp = Classifier.isPaymentApp(transaction.description);
    const message = isPaymentApp
      ? formatPaymentAppTransactionMessage(transaction)
      : formatTransactionMessage(transaction);

    const keyboard = buildInitialClassificationKeyboard(transaction.id, transaction.amount);

    // Determine chat ID based on user
    const chatId = transaction.userId === 'usr_tom_001'
      ? process.env.TELEGRAM_CHAT_ID_TOM!
      : process.env.TELEGRAM_CHAT_ID_YAEL!;

    await bot.sendMessage(chatId, message, {
      parse_mode: 'Markdown',
      reply_markup: keyboard
    });

    if (isPaymentApp) {
      console.log(`  📤 Sent payment app classification request to ${transaction.userId}`);
    } else {
      console.log(`  📤 Sent classification request to ${transaction.userId}`);
    }

  } catch (error) {
    console.error('❌ Failed to send classification request:', error);
    throw error;
  }
}

/**
 * שליחת הודעת שגיאה לאדמין
 */
async function sendErrorNotification(errorMessage: string): Promise<void> {
  try {
    await sendTelegramNotification({
      message: formatClassifierError(errorMessage),
      chatIds: [process.env.TELEGRAM_CHAT_ID_TOM!]
    });
  } catch (error) {
    console.error('❌ Failed to send error notification:', error);
  }
}

/**
 * הרצה ידנית של classifier worker
 * (לשימוש ב-testing או API endpoint)
 */
export async function runClassifierManually(): Promise<{
  totalTransactions: number;
  autoClassified: number;
  manualRequired: number;
  errors: number;
}> {
  if (isRunning) {
    throw new Error('Classifier worker is already running');
  }

  isRunning = true;

  try {
    const classifier = new Classifier();
    const pendingTransactions = await classifier.getPendingTransactions();
    const totalTransactions = pendingTransactions.length;

    let autoClassified = 0;
    let manualRequired = 0;
    let errors = 0;
    const autoClassifiedDetails: AutoClassificationItem[] = [];

    for (const transaction of pendingTransactions) {
      try {
        const result = await classifier.classifyTransaction(transaction);

        if (result.success) {
          autoClassified++;
          autoClassifiedDetails.push({
            description: transaction.description,
            amount: transaction.amount,
            date: transaction.date.split('-').reverse().join('/'),
            category: result.category?.name ?? '',
            entity: result.entity ?? '',
            method: result.method,
            rulePattern: (result.metadata as any)?.pattern,
            confidence: result.confidence,
            isPaymentApp: Classifier.isPaymentApp(transaction.description),
          });
        } else {
          manualRequired++;
          await sendClassificationRequest(transaction);
        }
      } catch (error) {
        errors++;
        console.error('Transaction processing error:', error);
      }
    }

    // Send auto-classification digest to Tom only
    if (autoClassifiedDetails.length > 0) {
      try {
        const digestMsg = formatAutoClassificationDigest(autoClassifiedDetails);
        if (digestMsg) {
          await sendTelegramNotification({
            message: digestMsg,
            chatIds: [process.env.TELEGRAM_CHAT_ID_TOM!],
          });
        }
      } catch (e) {
        console.error('[DIGEST_ERROR]', e);
      }
    }

    return {
      totalTransactions,
      autoClassified,
      manualRequired,
      errors
    };

  } finally {
    isRunning = false;
  }
}

/**
 * בדיקה האם worker פעיל כרגע
 */
export function isClassifierRunning(): boolean {
  return isRunning;
}
