import type { InlineKeyboardButton, InlineKeyboardMarkup } from 'node-telegram-bot-api';
import type { Category } from '../classification/types';

/**
 * Telegram Inline Keyboards - בוני מקלדות אינליין לסיווג תנועות
 *
 * Callback Data Format:
 * - classify:{transactionId}:{type}:{entity}
 * - category:{transactionId}:{categoryId}:{createRule}
 * - ignore:{transactionId}
 * - toggle_rule:{transactionId}:{categoryId}:{currentState}
 */

/**
 * מקלדת ראשונית - בחירת סוג תנועה וישות
 *
 * @param transactionId ID התנועה
 * @param amount סכום התנועה (להצגת הודעה רלוונטית)
 * @returns inline keyboard markup
 */
export function buildInitialClassificationKeyboard(
  transactionId: string,
  amount: number
): InlineKeyboardMarkup {
  const isIncome = amount > 0;

  const buttons: InlineKeyboardButton[][] = [];

  if (isIncome) {
    // הכנסה - רק עסקים
    buttons.push([
      {
        text: '💼 הכנסה - עסק תום',
        callback_data: `classify:${transactionId}:income:עסק תום`
      },
      {
        text: '💼 הכנסה - עסק יעל',
        callback_data: `classify:${transactionId}:income:עסק יעל`
      }
    ]);
  } else {
    // הוצאה - כל האפשרויות
    buttons.push([
      {
        text: '🏠 הוצאה - בית',
        callback_data: `classify:${transactionId}:expense:בית`
      },
      {
        text: '💼 הוצאה - עסק תום',
        callback_data: `classify:${transactionId}:expense:עסק תום`
      }
    ]);
    buttons.push([
      {
        text: '💼 הוצאה - עסק יעל',
        callback_data: `classify:${transactionId}:expense:עסק יעל`
      },
      {
        text: '🤝 הוצאה - משותף',
        callback_data: `classify:${transactionId}:expense:עסק - משותף`
      }
    ]);
  }

  // כפתור התעלם
  buttons.push([
    {
      text: '🚫 התעלם',
      callback_data: `ignore:${transactionId}`
    }
  ]);

  return { inline_keyboard: buttons };
}

/**
 * מקלדת בחירת קטגוריה
 *
 * @param transactionId ID התנועה
 * @param type סוג (income/expense)
 * @param entity ישות (בית/עסק תום/עסק יעל/משותף)
 * @param categories רשימת קטגוריות זמינות
 * @returns inline keyboard markup
 */
export function buildCategoryKeyboard(
  transactionId: string,
  _type: 'income' | 'expense',
  _entity: string,
  categories: Category[]
): InlineKeyboardMarkup {
  const buttons: InlineKeyboardButton[][] = [];

  // יצירת כפתורים בשורות של 2
  for (let i = 0; i < categories.length; i += 2) {
    const row: InlineKeyboardButton[] = [];

    // First category in row
    row.push({
      text: categories[i].name,
      callback_data: `category:${transactionId}:${categories[i].id}:false`
    });

    // Second category in row (if exists)
    if (i + 1 < categories.length) {
      row.push({
        text: categories[i + 1].name,
        callback_data: `category:${transactionId}:${categories[i + 1].id}:false`
      });
    }

    buttons.push(row);
  }

  // כפתור חזרה
  buttons.push([
    {
      text: '« חזור',
      callback_data: `back:${transactionId}`
    }
  ]);

  return { inline_keyboard: buttons };
}

/**
 * מקלדת אישור יצירת חוק
 * (מוצג אחרי בחירת קטגוריה)
 *
 * @param transactionId ID התנועה
 * @param categoryId ID הקטגוריה שנבחרה
 * @param categoryName שם הקטגוריה (להצגה)
 * @returns inline keyboard markup
 */
export function buildRuleConfirmationKeyboard(
  transactionId: string,
  categoryId: string,
  _categoryName: string
): InlineKeyboardMarkup {
  return {
    inline_keyboard: [
      [
        {
          text: '✅ סווג ללא חוק',
          callback_data: `category:${transactionId}:${categoryId}:false`
        }
      ],
      [
        {
          text: '📝 סווג + צור חוק',
          callback_data: `category:${transactionId}:${categoryId}:true`
        }
      ],
      [
        {
          text: '« חזור לקטגוריות',
          callback_data: `back_to_categories:${transactionId}`
        }
      ]
    ]
  };
}

/**
 * מקלדת הצלחה (אחרי סיווג מוצלח)
 *
 * @param showRuleCreated האם חוק נוצר
 * @returns inline keyboard markup או null (אין כפתורים)
 */
export function buildSuccessKeyboard(_showRuleCreated: boolean): InlineKeyboardMarkup | null {
  // בינתיים ללא כפתורים - רק הודעת הצלחה
  // בעתיד אפשר להוסיף "ביטול" או "עריכה"
  return null;
}

/**
 * מקלדת התעלמות (אישור התעלמות מתנועה)
 *
 * @param transactionId ID התנועה
 * @returns inline keyboard markup
 */
export function buildIgnoreConfirmationKeyboard(
  transactionId: string
): InlineKeyboardMarkup {
  return {
    inline_keyboard: [
      [
        {
          text: '✅ כן, התעלם',
          callback_data: `confirm_ignore:${transactionId}`
        },
        {
          text: '❌ ביטול',
          callback_data: `cancel_ignore:${transactionId}`
        }
      ]
    ]
  };
}

/**
 * Helper: המרת entity לאמוג'י
 */
export function getEntityEmoji(entity: string): string {
  switch (entity) {
    case 'בית':
      return '🏠';
    case 'עסק תום':
      return '💼';
    case 'עסק יעל':
      return '💼';
    case 'עסק - משותף':
      return '🤝';
    default:
      return '📁';
  }
}

/**
 * Helper: המרת type לאמוג'י
 */
export function getTypeEmoji(type: 'income' | 'expense'): string {
  return type === 'income' ? '💰' : '💳';
}
