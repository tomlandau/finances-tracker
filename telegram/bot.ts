import TelegramBot from 'node-telegram-bot-api';
import { handleCallbackQuery } from './handlers';

/**
 * Telegram Interactive Bot - בוט אינטראקטיבי לסיווג ידני
 *
 * שימוש:
 * - initTelegramBotPolling() - התחלת הבוט עם polling (רק ב-production)
 * - getTelegramBot() - קבלת instance של הבוט לשליחת הודעות
 *
 * חשוב:
 * - זה בוט נפרד מבוט ההתראות (lib/utils-telegram.ts)
 * - שני הבוטים משתמשים באותו token אבל רק האינטראקטיבי מריץ polling
 * - בוט ההתראות משמש רק לשליחת הודעות (polling=false)
 * - הבוט האינטראקטיבי מאזין ל-callback queries ומטפל בסיווג ידני
 */

let bot: TelegramBot | null = null;

/**
 * התחלת בוט טלגרם עם polling
 * (נקרא רק ב-production)
 */
export function initTelegramBotPolling(): void {
  if (bot) {
    console.log('⚠️ Telegram interactive bot already initialized');
    return;
  }

  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    throw new Error('TELEGRAM_BOT_TOKEN not set');
  }

  console.log('🤖 Initializing Telegram interactive bot...');

  bot = new TelegramBot(token, {
    polling: {
      interval: 1000,      // Poll every second
      autoStart: true,     // Start polling automatically
      params: {
        timeout: 10        // Long polling timeout (seconds)
      }
    }
  });

  // Register callback query handler
  bot.on('callback_query', async (query) => {
    try {
      await handleCallbackQuery(query);
    } catch (error) {
      console.error('❌ Error handling callback query:', error);

      // Answer the callback query with error
      if (query.id) {
        try {
          await bot!.answerCallbackQuery(query.id, {
            text: 'שגיאה בעיבוד הבקשה',
            show_alert: true
          });
        } catch (answerError) {
          console.error('❌ Failed to answer callback query:', answerError);
        }
      }
    }
  });

  // Error handling
  bot.on('polling_error', (error) => {
    console.error('❌ Telegram polling error:', error);
  });

  bot.on('error', (error) => {
    console.error('❌ Telegram bot error:', error);
  });

  console.log('✅ Telegram interactive bot polling started');
}

/**
 * קבלת instance של הבוט
 * (לשימוש בשליחת הודעות)
 */
export function getTelegramBot(): TelegramBot {
  if (!bot) {
    throw new Error('Telegram interactive bot not initialized. Call initTelegramBotPolling() first.');
  }
  return bot;
}

/**
 * עצירת הבוט
 * (לשימוש ב-testing או shutdown)
 */
export function stopTelegramBot(): void {
  if (bot) {
    console.log('🛑 Stopping Telegram interactive bot...');
    bot.stopPolling();
    bot = null;
    console.log('✅ Telegram interactive bot stopped');
  }
}

/**
 * בדיקה האם הבוט פעיל
 */
export function isBotRunning(): boolean {
  return bot !== null;
}
