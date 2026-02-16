import TelegramBot from 'node-telegram-bot-api';
import { logError, logWarn } from './utils-logger';

let bot: TelegramBot | null = null;

// Cache of failed chat IDs to avoid repeated attempts
const failedChatIds = new Set<string>();
const failedChatIdReasons = new Map<string, string>();

/**
 * אתחול בוט Telegram (יש לקרוא פעם אחת בעת הרצת השרת)
 */
export function initTelegramBot(): TelegramBot {
  if (bot) {
    return bot;
  }

  const token = process.env.TELEGRAM_BOT_TOKEN;

  if (!token) {
    throw new Error('TELEGRAM_BOT_TOKEN environment variable is not set');
  }

  // polling רק ב-production (ב-dev נשתמש בו בעתיד לסיווג אינטראקטיבי)
  bot = new TelegramBot(token, {
    polling: false // נפעיל את polling בשלב 2
  });

  console.log('✅ Telegram bot initialized');
  return bot;
}

/**
 * קבלת instance של הבוט
 */
export function getTelegramBot(): TelegramBot {
  if (!bot) {
    return initTelegramBot();
  }
  return bot;
}

/**
 * שליחת הודעת Telegram למשתמשים
 * @param params - פרמטרים להודעה
 */
export async function sendTelegramNotification(params: {
  message: string;
  chatIds: string[];
  keyboard?: TelegramBot.InlineKeyboardMarkup;
  parseMode?: 'HTML' | 'Markdown';
}): Promise<void> {
  const telegramBot = getTelegramBot();
  const { message, chatIds, keyboard, parseMode = 'HTML' } = params;

  for (const chatId of chatIds) {
    // Skip chat IDs that have previously failed
    if (failedChatIds.has(chatId)) {
      const reason = failedChatIdReasons.get(chatId);
      logWarn(
        `telegram-skip-${chatId}`,
        `Skipping Telegram message to ${chatId} (previously failed: ${reason})`
      );
      continue;
    }

    try {
      await telegramBot.sendMessage(chatId, message, {
        parse_mode: parseMode,
        reply_markup: keyboard
      });
    } catch (error: any) {
      // Check if it's a "chat not found" error
      const errorMessage = error?.message || String(error);
      const isChatNotFound = errorMessage.includes('chat not found') || error?.response?.body?.error_code === 400;

      if (isChatNotFound) {
        // Mark this chat ID as permanently failed
        failedChatIds.add(chatId);
        failedChatIdReasons.set(chatId, 'Chat not found');

        logError(
          `telegram-invalid-chat-${chatId}`,
          `❌ CRITICAL: Invalid Telegram chat ID ${chatId} - chat not found. This chat ID has been disabled. Please update TELEGRAM_CHAT_ID_TOM or TELEGRAM_CHAT_ID_YAEL in .env.local`,
          {
            error: errorMessage,
            suggestion: 'Get correct chat ID by messaging your bot and visiting https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getUpdates'
          }
        );
      } else {
        // Other errors - log with rate limiting but don't permanently disable
        logError(
          `telegram-error-${chatId}`,
          `Failed to send Telegram message to ${chatId}`,
          error
        );
      }

      // ממשיכים לשלוח להודעות הבאות גם אם אחת נכשלה
    }
  }
}

/**
 * שליחת הודעה לשני המשתמשים (Tom & Yael)
 * @param message - ההודעה לשליחה
 * @param keyboard - אופציונלי - מקלדת inline
 */
export async function sendToAllUsers(
  message: string,
  keyboard?: TelegramBot.InlineKeyboardMarkup
): Promise<void> {
  const chatIds = [
    process.env.TELEGRAM_CHAT_ID_TOM,
    process.env.TELEGRAM_CHAT_ID_YAEL
  ].filter((id): id is string => !!id);

  if (chatIds.length === 0) {
    console.warn('No Telegram chat IDs configured');
    return;
  }

  await sendTelegramNotification({ message, chatIds, keyboard });
}

/**
 * ניקוי cache של chat IDs שנכשלו
 * (לשימוש לאחר תיקון ה-chat ID בקובץ .env)
 */
export function clearFailedChatIds(): void {
  failedChatIds.clear();
  failedChatIdReasons.clear();
  console.log('✅ Cleared failed chat IDs cache');
}

/**
 * קבלת רשימת chat IDs שנכשלו
 */
export function getFailedChatIds(): Array<{ chatId: string; reason: string }> {
  return Array.from(failedChatIds).map(chatId => ({
    chatId,
    reason: failedChatIdReasons.get(chatId) || 'Unknown'
  }));
}

/**
 * בדיקת תקינות chat IDs
 * מנסה לשלוח הודעת בדיקה לכל chat ID ומדווח על בעיות
 */
export async function validateChatIds(): Promise<{
  valid: string[];
  invalid: Array<{ chatId: string; error: string }>;
}> {
  const telegramBot = getTelegramBot();
  const chatIds = [
    process.env.TELEGRAM_CHAT_ID_TOM,
    process.env.TELEGRAM_CHAT_ID_YAEL
  ].filter((id): id is string => !!id);

  const valid: string[] = [];
  const invalid: Array<{ chatId: string; error: string }> = [];

  for (const chatId of chatIds) {
    try {
      // Try to get chat info (doesn't send a message)
      await telegramBot.getChat(chatId);
      valid.push(chatId);
      console.log(`✅ Chat ID ${chatId} is valid`);
    } catch (error: any) {
      const errorMessage = error?.message || String(error);
      invalid.push({ chatId, error: errorMessage });
      console.error(`❌ Chat ID ${chatId} is invalid:`, errorMessage);
    }
  }

  return { valid, invalid };
}
