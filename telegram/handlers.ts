import type { CallbackQuery } from 'node-telegram-bot-api';
import { getTelegramBot } from './bot';
import { Classifier } from '../classification/classifier';
import {
  buildInitialClassificationKeyboard,
  buildCategoryKeyboard,
  buildIgnoreConfirmationKeyboard
} from './keyboards';
import {
  formatClassificationSuccess,
  formatIgnoreMessage,
  formatIgnoreConfirmation,
  formatError,
  formatCategoryNotFound,
  formatTransactionNotFound
} from './messages';
import { logSuccess } from '../lib/utils-audit';

/**
 * Telegram Callback Query Handler - מטפל מרכזי לכל ה-callback queries
 *
 * Callback Data Formats:
 * - classify:{transactionId}:{type}:{entity}
 * - category:{transactionId}:{categoryId}:{createRule}
 * - ignore:{transactionId}
 * - confirm_ignore:{transactionId}
 * - cancel_ignore:{transactionId}
 * - back:{transactionId}
 * - back_to_categories:{transactionId}
 */

// Cache for storing flow state (transactionId → {type, entity})
const flowState = new Map<string, { type: 'income' | 'expense'; entity: string }>();

export async function handleCallbackQuery(query: CallbackQuery): Promise<void> {
  const bot = getTelegramBot();
  const data = query.data!;
  const chatId = query.message!.chat.id;
  const messageId = query.message!.message_id;

  console.log(`📱 Callback query: ${data}`);

  try {
    // Parse callback data
    const [action, ...params] = data.split(':');

    switch (action) {
      case 'classify':
        await handleClassifyAction(query, params);
        break;

      case 'category':
        await handleCategoryAction(query, params);
        break;

      case 'ignore':
        await handleIgnoreAction(query, params);
        break;

      case 'confirm_ignore':
        await handleConfirmIgnoreAction(query, params);
        break;

      case 'cancel_ignore':
        await handleCancelIgnoreAction(query, params);
        break;

      case 'back':
        await handleBackAction(query, params);
        break;

      case 'back_to_categories':
        await handleBackToCategoriesAction(query, params);
        break;

      case 'page':
        await handlePageAction(query, params);
        break;

      case 'noop':
        // No-op - just answer the callback to remove the loading state
        await bot.answerCallbackQuery(query.id);
        break;

      default:
        console.warn(`Unknown callback action: ${action}`);
        await bot.answerCallbackQuery(query.id, {
          text: 'פעולה לא מזוהה',
          show_alert: true
        });
    }

  } catch (error) {
    console.error('❌ Callback handler error:', error);

    // Show error to user
    await bot.editMessageText(
      formatError(error instanceof Error ? error.message : undefined),
      {
        chat_id: chatId,
        message_id: messageId,
        parse_mode: 'Markdown'
      }
    );

    // Answer callback query
    await bot.answerCallbackQuery(query.id, {
      text: 'שגיאה בעיבוד',
      show_alert: true
    });
  }
}

/**
 * טיפול בבחירת סוג תנועה וישות
 * Format: classify:{transactionId}:{type}:{entity}
 */
async function handleClassifyAction(query: CallbackQuery, params: string[]): Promise<void> {
  const bot = getTelegramBot();
  const [transactionId, type, entity] = params;
  const chatId = query.message!.chat.id;
  const messageId = query.message!.message_id;

  console.log(`  → Classify: ${transactionId} as ${type}/${entity}`);

  // Store flow state
  flowState.set(transactionId, {
    type: type as 'income' | 'expense',
    entity
  });

  // Fetch categories
  const classifier = new Classifier();
  const categories = await classifier.getCategories(type as any, entity);

  if (categories.length === 0) {
    await bot.editMessageText(
      formatCategoryNotFound(),
      {
        chat_id: chatId,
        message_id: messageId,
        parse_mode: 'Markdown'
      }
    );

    await bot.answerCallbackQuery(query.id, {
      text: 'לא נמצאו קטגוריות',
      show_alert: true
    });
    return;
  }

  // Show category selection keyboard
  const keyboard = buildCategoryKeyboard(transactionId, type as any, entity, categories);

  await bot.editMessageReplyMarkup(keyboard, {
    chat_id: chatId,
    message_id: messageId
  });

  await bot.answerCallbackQuery(query.id, {
    text: `נמצאו ${categories.length} קטגוריות`
  });
}

/**
 * טיפול בבחירת קטגוריה
 * Format: category:{transactionId}:{categoryId}:{createRule}
 */
async function handleCategoryAction(query: CallbackQuery, params: string[]): Promise<void> {
  const bot = getTelegramBot();
  const [transactionId, categoryId, createRuleStr] = params;
  const createRule = createRuleStr === 'true';
  const chatId = query.message!.chat.id;
  const messageId = query.message!.message_id;

  console.log(`  → Category: ${transactionId} → ${categoryId}, createRule=${createRule}`);

  // Get flow state
  const state = flowState.get(transactionId);
  if (!state) {
    throw new Error('Flow state not found');
  }

  // Determine userId from chatId
  const userId = chatId.toString() === process.env.TELEGRAM_CHAT_ID_TOM
    ? 'usr_tom_001'
    : 'usr_yael_001';

  // Classify transaction
  const classifier = new Classifier();
  const result = await classifier.manualClassify(
    transactionId,
    categoryId,
    state.entity,
    state.type,
    userId,
    createRule
  );

  if (!result.success) {
    throw new Error('Classification failed');
  }

  // Get category name
  const category = await classifier.getCategories(state.type, state.entity);
  const categoryName = category.find(c => c.id === categoryId)?.name || 'Unknown';

  // Update message with success
  await bot.editMessageText(
    formatClassificationSuccess(categoryName, state.entity, state.type, createRule),
    {
      chat_id: chatId,
      message_id: messageId,
      parse_mode: 'Markdown'
    }
  );

  // Clean up flow state
  flowState.delete(transactionId);

  // Log audit
  await logSuccess(userId, userId === 'usr_tom_001' ? 'tomlandau' : 'yael', 'classify_transaction', 'transaction', null, {
    transactionId,
    categoryId,
    entity: state.entity,
    type: state.type,
    createRule,
    method: 'telegram'
  });

  await bot.answerCallbackQuery(query.id, {
    text: '✅ סווג בהצלחה!'
  });
}

/**
 * טיפול בלחיצה על "התעלם"
 * Format: ignore:{transactionId}
 */
async function handleIgnoreAction(query: CallbackQuery, params: string[]): Promise<void> {
  const bot = getTelegramBot();
  const [transactionId] = params;
  const chatId = query.message!.chat.id;
  const messageId = query.message!.message_id;

  console.log(`  → Ignore: ${transactionId}`);

  // Get transaction details for confirmation
  const classifier = new Classifier();
  const transactions = await classifier.getPendingTransactions();
  const transaction = transactions.find(t => t.id === transactionId);

  if (!transaction) {
    await bot.editMessageText(
      formatTransactionNotFound(),
      {
        chat_id: chatId,
        message_id: messageId,
        parse_mode: 'Markdown'
      }
    );

    await bot.answerCallbackQuery(query.id, {
      text: 'תנועה לא נמצאה',
      show_alert: true
    });
    return;
  }

  // Show confirmation keyboard
  const keyboard = buildIgnoreConfirmationKeyboard(transactionId);

  await bot.editMessageText(
    formatIgnoreConfirmation(transaction),
    {
      chat_id: chatId,
      message_id: messageId,
      parse_mode: 'Markdown',
      reply_markup: keyboard
    }
  );

  await bot.answerCallbackQuery(query.id);
}

/**
 * טיפול באישור התעלמות
 * Format: confirm_ignore:{transactionId}
 */
async function handleConfirmIgnoreAction(query: CallbackQuery, params: string[]): Promise<void> {
  const bot = getTelegramBot();
  const [transactionId] = params;
  const chatId = query.message!.chat.id;
  const messageId = query.message!.message_id;

  console.log(`  → Confirm ignore: ${transactionId}`);

  // Update transaction status to "התעלם"
  const { AirtableHelper } = await import('../classification/airtable-helper');
  const airtableHelper = new AirtableHelper();

  await airtableHelper.updateTransactionStatus(
    transactionId,
    'התעלם',
    null,
    null
  );

  // Update message
  await bot.editMessageText(
    formatIgnoreMessage(),
    {
      chat_id: chatId,
      message_id: messageId,
      parse_mode: 'Markdown'
    }
  );

  // Clean up flow state
  flowState.delete(transactionId);

  // Determine userId
  const userId = chatId.toString() === process.env.TELEGRAM_CHAT_ID_TOM
    ? 'usr_tom_001'
    : 'usr_yael_001';

  // Log audit
  await logSuccess(userId, userId === 'usr_tom_001' ? 'tomlandau' : 'yael', 'classify_transaction', 'transaction', null, {
    transactionId,
    action: 'ignore',
    method: 'telegram'
  });

  await bot.answerCallbackQuery(query.id, {
    text: '✅ התעלם'
  });
}

/**
 * טיפול בביטול התעלמות
 * Format: cancel_ignore:{transactionId}
 */
async function handleCancelIgnoreAction(query: CallbackQuery, params: string[]): Promise<void> {
  const bot = getTelegramBot();
  const [transactionId] = params;
  const chatId = query.message!.chat.id;
  const messageId = query.message!.message_id;

  console.log(`  → Cancel ignore: ${transactionId}`);

  // Get transaction details
  const classifier = new Classifier();
  const transactions = await classifier.getPendingTransactions();
  const transaction = transactions.find(t => t.id === transactionId);

  if (!transaction) {
    await bot.editMessageText(
      formatTransactionNotFound(),
      {
        chat_id: chatId,
        message_id: messageId,
        parse_mode: 'Markdown'
      }
    );

    await bot.answerCallbackQuery(query.id, {
      text: 'תנועה לא נמצאה',
      show_alert: true
    });
    return;
  }

  // Restore original classification keyboard
  const keyboard = buildInitialClassificationKeyboard(transactionId, transaction.amount);

  await bot.editMessageReplyMarkup(keyboard, {
    chat_id: chatId,
    message_id: messageId
  });

  await bot.answerCallbackQuery(query.id, {
    text: 'בוטל'
  });
}

/**
 * טיפול בכפתור "חזור"
 * Format: back:{transactionId}
 */
async function handleBackAction(query: CallbackQuery, params: string[]): Promise<void> {
  const bot = getTelegramBot();
  const [transactionId] = params;
  const chatId = query.message!.chat.id;
  const messageId = query.message!.message_id;

  console.log(`  → Back: ${transactionId}`);

  // Get transaction details
  const classifier = new Classifier();
  const transactions = await classifier.getPendingTransactions();
  const transaction = transactions.find(t => t.id === transactionId);

  if (!transaction) {
    await bot.answerCallbackQuery(query.id, {
      text: 'תנועה לא נמצאה',
      show_alert: true
    });
    return;
  }

  // Restore initial keyboard
  const keyboard = buildInitialClassificationKeyboard(transactionId, transaction.amount);

  await bot.editMessageReplyMarkup(keyboard, {
    chat_id: chatId,
    message_id: messageId
  });

  // Clean up flow state
  flowState.delete(transactionId);

  await bot.answerCallbackQuery(query.id);
}

/**
 * טיפול בכפתור "חזור לקטגוריות"
 * Format: back_to_categories:{transactionId}
 */
async function handleBackToCategoriesAction(query: CallbackQuery, params: string[]): Promise<void> {
  const bot = getTelegramBot();
  const [transactionId] = params;
  const chatId = query.message!.chat.id;
  const messageId = query.message!.message_id;

  console.log(`  → Back to categories: ${transactionId}`);

  // Get flow state
  const state = flowState.get(transactionId);
  if (!state) {
    throw new Error('Flow state not found');
  }

  // Fetch categories again
  const classifier = new Classifier();
  const categories = await classifier.getCategories(state.type, state.entity);

  // Restore category keyboard (page 0)
  const keyboard = buildCategoryKeyboard(transactionId, state.type, state.entity, categories, 0);

  await bot.editMessageReplyMarkup(keyboard, {
    chat_id: chatId,
    message_id: messageId
  });

  await bot.answerCallbackQuery(query.id);
}

/**
 * טיפול בניווט בין עמודים של קטגוריות
 * Format: page:{transactionId}:{pageNumber}
 */
async function handlePageAction(query: CallbackQuery, params: string[]): Promise<void> {
  const bot = getTelegramBot();
  const [transactionId, pageStr] = params;
  const page = parseInt(pageStr, 10);
  const chatId = query.message!.chat.id;
  const messageId = query.message!.message_id;

  console.log(`  → Page navigation: ${transactionId}, page ${page}`);

  // Get flow state
  const state = flowState.get(transactionId);
  if (!state) {
    throw new Error('Flow state not found');
  }

  // Fetch categories
  const classifier = new Classifier();
  const categories = await classifier.getCategories(state.type, state.entity);

  // Build keyboard for requested page
  const keyboard = buildCategoryKeyboard(transactionId, state.type, state.entity, categories, page);

  await bot.editMessageReplyMarkup(keyboard, {
    chat_id: chatId,
    message_id: messageId
  });

  await bot.answerCallbackQuery(query.id, {
    text: `עמוד ${page + 1}`
  });
}
