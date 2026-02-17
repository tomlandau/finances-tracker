import { format, parseISO } from 'date-fns';
import { he } from 'date-fns/locale';
import type { Transaction } from '../classification/types';
import { getEntityEmoji, getTypeEmoji } from './keyboards';

/**
 * Telegram Messages - פורמט הודעות בעברית לטלגרם
 *
 * כל הפונקציות מחזירות טקסט בפורמט Markdown
 */

/**
 * Escape special Markdown characters for Telegram
 * Prevents parsing errors when transaction descriptions contain *, _, [, etc.
 */
function escapeMarkdown(text: string): string {
  if (typeof text !== 'string') {
    text = String(text ?? '');
  }
  return text.replace(/([*_\[\]()~`>#+=|{}.!\\-])/g, '\\$1');
}

/**
 * הודעת תנועה חדשה לסיווג
 */
export function formatTransactionMessage(transaction: Transaction): string {
  const date = format(parseISO(transaction.date), 'dd/MM/yyyy', { locale: he });
  const amount = Math.abs(transaction.amount).toFixed(2);
  const type = transaction.amount < 0 ? '💳 הוצאה' : '💰 הכנסה';

  return `
🔔 *תנועה חדשה לסיווג*

${type}: ₪${amount}
📅 תאריך: ${date}
🏦 מקור: ${escapeMarkdown(transaction.source)}
📝 תיאור: ${escapeMarkdown(transaction.description)}

אנא בחר קטגוריה:
  `.trim();
}

/**
 * הודעת סיווג מוצלח
 */
export function formatClassificationSuccess(
  categoryName: string,
  entity: string,
  type: 'income' | 'expense',
  ruleCreated: boolean
): string {
  const emoji = getEntityEmoji(entity);
  const typeEmoji = getTypeEmoji(type);

  let message = `✅ *התנועה סווגה בהצלחה!*\n\n${typeEmoji} ${emoji} ${categoryName}`;

  if (ruleCreated) {
    message += '\n\n📝 חוק חדש נוצר לסיווג אוטומטי בעתיד';
  }

  return message;
}

/**
 * הודעת התעלמות מתנועה
 */
export function formatIgnoreMessage(): string {
  return '🚫 *התנועה סומנה להתעלמות*\n\nלא תופיע יותר ברשימת התנועות הממתינות';
}

/**
 * הודעת אישור התעלמות
 */
export function formatIgnoreConfirmation(transaction: Transaction): string {
  const date = format(parseISO(transaction.date), 'dd/MM/yyyy', { locale: he });
  const amount = Math.abs(transaction.amount).toFixed(2);

  return `
⚠️ *האם להתעלם מתנועה זו?*

₪${amount} | ${date}
${escapeMarkdown(transaction.description)}

התנועה לא תסווג ולא תופיע יותר ברשימה.
  `.trim();
}

/**
 * הודעת שגיאה כללית
 */
export function formatError(errorMessage?: string): string {
  let message = '❌ *אירעה שגיאה*\n\nלא הצלחנו לעבד את הבקשה.';

  if (errorMessage) {
    message += `\n\n${errorMessage}`;
  }

  message += '\n\nנסה שוב או פנה לתמיכה.';

  return message;
}

/**
 * הודעת סיכום יומי
 */
export function formatDailySummary(
  totalTransactions: number,
  autoClassified: number,
  manualRequired: number,
  date?: string
): string {
  const dateStr = date
    ? format(parseISO(date), 'dd/MM/yyyy', { locale: he })
    : format(new Date(), 'dd/MM/yyyy', { locale: he });

  return `
📊 *סיכום סיווג יומי*
📅 ${dateStr}

🔄 סה"כ תנועות: ${totalTransactions}
✅ סווגו אוטומטית: ${autoClassified}
⏳ ממתינות לסיווג: ${manualRequired}

${manualRequired > 0 ? '👇 התנועות הממתינות נשלחו לסיווג ידני' : '🎉 כל התנועות סווגו!'}
  `.trim();
}

/**
 * הודעת סיכום שעתי (classifier worker)
 */
export function formatHourlySummary(
  autoClassified: number,
  manualRequired: number
): string {
  if (autoClassified === 0 && manualRequired === 0) {
    return ''; // Don't send if no activity
  }

  return `
📊 *עדכון סיווג*

✅ סווגו אוטומטית: ${autoClassified}
⏳ ממתינות לסיווג: ${manualRequired}
  `.trim();
}

/**
 * הודעת שגיאה במנוע הסיווג (לאדמין)
 */
export function formatClassifierError(errorMessage: string): string {
  return `
❌ *שגיאה במנוע הסיווג*

\`\`\`
${errorMessage}
\`\`\`

בדוק לוגים לפרטים נוספים.
  `.trim();
}

/**
 * הודעת קטגוריה לא נמצאה
 */
export function formatCategoryNotFound(): string {
  return '⚠️ *קטגוריה לא נמצאה*\n\nנסה שוב או בחר קטגוריה אחרת.';
}

/**
 * הודעת תנועה לא נמצאה
 */
export function formatTransactionNotFound(): string {
  return '⚠️ *תנועה לא נמצאה*\n\nייתכן שכבר סווגה או נמחקה.';
}

/**
 * הודעת אישור יצירת חוק
 */
export function formatRuleConfirmation(
  categoryName: string,
  entity: string
): string {
  const emoji = getEntityEmoji(entity);

  return `
📝 *האם ליצור חוק סיווג?*

${emoji} ${categoryName}

אם תבחר כן, תנועות עתידיות עם תיאור דומה יסווגו אוטומטית לקטגוריה זו.
  `.trim();
}

/**
 * הודעת ברוכים הבאים (לבוט)
 */
export function formatWelcomeMessage(): string {
  return `
👋 *ברוך הבא למנהל הכספים*

אני אעזור לך לסווג תנועות בנקאיות ולנהל את התקציב.

*פקודות זמינות:*
/start - הודעת ברוכים הבאים
/help - עזרה ומידע
/stats - סטטיסטיקות
/rules - חוקי סיווג

תנועות חדשות יישלחו אליך אוטומטית לסיווג 🚀
  `.trim();
}

/**
 * הודעת עזרה
 */
export function formatHelpMessage(): string {
  return `
❓ *עזרה*

*איך זה עובד?*
1. המערכת סורקת חשבונות בנק פעם ביום
2. תנועות חדשות מסווגות אוטומטית (כשאפשר)
3. תנועות שלא סווגו נשלחות אליך לאישור
4. בחר קטגוריה וישות לכל תנועה
5. אפשר ליצור חוקי סיווג לעתיד

*טיפים:*
• צור חוקים לתנועות חוזרות
• החוקים משתדרגים אוטומטית אחרי 5 שימושים
• השתמש ב-/rules לניהול חוקים

זקוק לעזרה נוספת? פנה לתמיכה.
  `.trim();
}

/**
 * הודעת סטטיסטיקות (placeholder)
 */
export function formatStatsMessage(
  totalRules: number,
  confirmedRules: number,
  pendingTransactions: number
): string {
  return `
📈 *סטטיסטיקות*

📝 חוקי סיווג: ${totalRules}
✅ מאושרים: ${confirmedRules}
⏳ תנועות ממתינות: ${pendingTransactions}
  `.trim();
}
