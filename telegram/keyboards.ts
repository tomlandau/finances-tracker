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
 * מקלדת בחירת קטגוריה (עם pagination אם יש יותר מדי קטגוריות)
 *
 * @param transactionId ID התנועה
 * @param type סוג (income/expense)
 * @param entity ישות (בית/עסק תום/עסק יעל/משותף)
 * @param categories רשימת קטגוריות זמינות
 * @param page מספר עמוד (0-based, default: 0)
 * @returns inline keyboard markup
 */
export function buildCategoryKeyboard(
  transactionId: string,
  _type: 'income' | 'expense',
  _entity: string,
  categories: Category[],
  page: number = 0
): InlineKeyboardMarkup {
  const buttons: InlineKeyboardButton[][] = [];
  const PAGE_SIZE = 20; // Maximum 20 categories per page (10 rows)

  // Calculate pagination
  const totalPages = Math.ceil(categories.length / PAGE_SIZE);
  const startIndex = page * PAGE_SIZE;
  const endIndex = Math.min(startIndex + PAGE_SIZE, categories.length);
  const pageCategories = categories.slice(startIndex, endIndex);

  // יצירת כפתורים בשורות של 2
  for (let i = 0; i < pageCategories.length; i += 2) {
    const row: InlineKeyboardButton[] = [];

    // First category in row
    row.push({
      text: pageCategories[i].name,
      callback_data: `category:${transactionId}:${pageCategories[i].id}:false`
    });

    // Second category in row (if exists)
    if (i + 1 < pageCategories.length) {
      row.push({
        text: pageCategories[i + 1].name,
        callback_data: `category:${transactionId}:${pageCategories[i + 1].id}:false`
      });
    }

    buttons.push(row);
  }

  // Pagination buttons (if needed)
  if (totalPages > 1) {
    const paginationRow: InlineKeyboardButton[] = [];

    if (page > 0) {
      paginationRow.push({
        text: '◀️ קודם',
        callback_data: `page:${transactionId}:${page - 1}`
      });
    }

    paginationRow.push({
      text: `${page + 1}/${totalPages}`,
      callback_data: `noop:${transactionId}` // No-op button
    });

    if (page < totalPages - 1) {
      paginationRow.push({
        text: 'הבא ▶️',
        callback_data: `page:${transactionId}:${page + 1}`
      });
    }

    buttons.push(paginationRow);
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
 * מקלדת הצעה ליצירת חוק התעלמות קבוע
 * מוצגת אחרי שמשתמש לוחץ "התעלם" ידנית
 *
 * @param transactionId ID התנועה
 * @returns inline keyboard markup
 */
export function buildCreateIgnoreRuleKeyboard(
  transactionId: string
): InlineKeyboardMarkup {
  return {
    inline_keyboard: [
      [
        {
          text: '✅ כן, צור חוק קבוע',
          callback_data: `create_ignore_rule:${transactionId}`
        },
        {
          text: '❌ לא תודה',
          callback_data: `skip_ignore_rule:${transactionId}`
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
