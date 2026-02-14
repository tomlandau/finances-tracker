import cron from 'node-cron';
import { ScraperManager } from '../scrapers/scraper-manager';
import { sendToAllUsers } from '../lib/utils-telegram';

/**
 * אתחול cron job יומי לסקרייפינג
 * רץ בכל יום ב-06:00 בבוקר (Israel time)
 */
export function startDailyScraperJob(): void {
  // 06:00 Israel Time = 04:00 UTC (Standard) or 03:00 UTC (DST)
  // נשתמש ב-04:00 UTC לבטח
  const cronExpression = '0 4 * * *'; // כל יום ב-04:00 UTC

  cron.schedule(cronExpression, async () => {
    console.log('\n' + '='.repeat(60));
    console.log('🔄 Daily scraper job started at', new Date().toISOString());
    console.log('='.repeat(60) + '\n');

    await runDailyScraper();
  });

  console.log('✅ Daily scraper job scheduled for 04:00 UTC (06:00 Israel)');
}

/**
 * הרצת הסקרייפר היומי
 * פונקציה נפרדת שניתן לקרוא לה גם ידנית
 */
export async function runDailyScraper(): Promise<void> {
  const startTime = Date.now();
  const manager = new ScraperManager();

  try {
    const results = await manager.scrapeAll();

    const successCount = results.filter(r => r.success).length;
    const totalCount = results.length;
    const totalTransactions = results.reduce((sum, r) => sum + r.transactions.length, 0);
    const failures = results.filter(r => !r.success);

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    // סיכום לוג
    console.log('\n' + '='.repeat(60));
    console.log('✅ Daily scraper completed');
    console.log(`   Success: ${successCount}/${totalCount} accounts`);
    console.log(`   New transactions: ${totalTransactions}`);
    console.log(`   Duration: ${duration}s`);

    if (failures.length > 0) {
      console.log(`   ❌ Failures:`);
      failures.forEach(f => {
        console.log(`      - ${f.accountName}: ${f.error}`);
      });
    }
    console.log('='.repeat(60) + '\n');

    // שליחת התראת Telegram
    await sendScraperNotification(results, duration);
  } catch (error) {
    console.error('❌ Daily scraper failed:', error);

    // שליחת התראת כשל
    await sendErrorNotification(error);
  }
}

/**
 * שליחת התראת Telegram על תוצאות הסקרייפינג
 */
async function sendScraperNotification(
  results: any[],
  duration: string
): Promise<void> {
  const successCount = results.filter(r => r.success).length;
  const totalCount = results.length;
  const totalTransactions = results.reduce((sum, r) => sum + r.transactions.length, 0);
  const failures = results.filter(r => !r.success);

  let message = `🔄 <b>סקרייפינג יומי הסתיים</b>\n\n`;
  message += `✅ ${successCount}/${totalCount} חשבונות\n`;
  message += `📊 ${totalTransactions} תנועות חדשות\n`;
  message += `⏱ ${duration} שניות\n`;

  if (failures.length > 0) {
    message += `\n❌ <b>כשלים:</b>\n`;
    failures.forEach(f => {
      message += `   • ${f.accountName}\n`;
    });
  }

  message += `\n<i>${new Date().toLocaleString('he-IL')}</i>`;

  try {
    await sendToAllUsers(message);
  } catch (error) {
    console.error('Failed to send Telegram notification:', error);
  }
}

/**
 * שליחת התראת שגיאה
 */
async function sendErrorNotification(error: unknown): Promise<void> {
  const errorMessage = error instanceof Error ? error.message : 'Unknown error';

  const message = `❌ <b>סקרייפינג נכשל</b>\n\n` +
    `שגיאה: ${errorMessage}\n\n` +
    `<i>${new Date().toLocaleString('he-IL')}</i>`;

  try {
    await sendToAllUsers(message);
  } catch (telegramError) {
    console.error('Failed to send error notification:', telegramError);
  }
}
