import TelegramBot from 'node-telegram-bot-api';

let bot: TelegramBot | null = null;

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
    try {
      await telegramBot.sendMessage(chatId, message, {
        parse_mode: parseMode,
        reply_markup: keyboard
      });
    } catch (error) {
      console.error(`Failed to send Telegram message to ${chatId}:`, error);
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
