# תכנית יישום: שלב 2 - מנוע סיווג + Telegram Bot

## Context - רקע ומטרה

### המצב הנוכחי (אחרי שלב 1)
- ✅ Scraper Manager פועל ומסקרף תנועות יומיות ב-04:00 UTC
- ✅ תנועות נשמרות בטבלת "תנועות" (Transactions) עם סטטוס "ממתין לסיווג"
- ✅ Telegram bot מוכן (polling כבוי, מוכן להפעלה)
- ✅ טבלאות Airtable קיימות: תנועות, חשבונות, חוקי סיווג, הוראות קבע

### מטרת שלב 2
להוסיף **מנוע סיווג אוטומטי** שמסווג תנועות לקטגוריות (הכנסות/הוצאות) באמצעות:
1. **Sumit API** - זיהוי חשבוניות עסקיות
2. **Client Airtable Bases** - התאמה לנתוני לקוחות מהעסקים
3. **Rules Engine** - pattern matching על בסיס חוקים שנלמדים
4. **Telegram Bot** - סיווג ידני אינטראקטיבי כאשר אוטומציה נכשלת

### תוצאה מצופה
- תנועות מסווגות אוטומטית ב-80%+ מהמקרים
- תנועות שלא סווגו נשלחות לטלגרם עם כפתורים לסיווג ידני
- למידה אוטומטית של חוקים חדשים מסיווגים ידניים
- Classifier worker שרץ כל שעה ומעבד תנועות חדשות

---

## ארכיטקטורה - תהליך הסיווג

### Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│  Classifier Worker (Cron: כל שעה)                           │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│  1. שליפת תנועות עם סטטוס "ממתין לסיווג"                    │
│     מטבלת Transactions                                      │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
         ┌───────────────────────┐
         │  לכל תנועה:           │
         └───────────┬───────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│  2. ניסיון #1: Sumit API                                     │
│     - חיפוש חשבונית לפי תאריך + סכום + תיאור               │
│     - אם נמצא → סיווג כהכנסה עסקית                          │
└────────────────────┬────────────────────────────────────────┘
                     │ לא נמצא
                     ▼
┌─────────────────────────────────────────────────────────────┐
│  3. ניסיון #2: Client Airtable Bases                        │
│     - חיפוש לקוח לפי תאריך + סכום (±10%)                   │
│     - אם נמצא → סיווג כהכנסה עסקית + קישור ללקוח            │
└────────────────────┬────────────────────────────────────────┘
                     │ לא נמצא
                     ▼
┌─────────────────────────────────────────────────────────────┐
│  4. ניסיון #3: Rules Engine                                 │
│     - חיפוש rule שמתאים לתיאור התנועה                       │
│     - סינון לפי רמת ביטחון (אוטומטי/מאושר)                  │
│     - אם נמצא → סיווג לפי החוק + עדכון מונה שימושים         │
└────────────────────┬────────────────────────────────────────┘
                     │ לא נמצא
                     ▼
┌─────────────────────────────────────────────────────────────┐
│  5. Fallback: Telegram Manual Classification                │
│     - שליחת הודעה עם inline keyboard                        │
│     - משתמש בוחר קטגוריה                                    │
│     - אפשרות ליצור rule חדש                                 │
└─────────────────────────────────────────────────────────────┘
```

### תהליך לאחר סיווג מוצלח

```
┌─────────────────────────────────────────────────────────────┐
│  Classification Successful                                  │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│  1. יצירת record בטבלת הכנסות/הוצאות                        │
│     - העתקת נתונים: תאריך, סכום, תיאור                     │
│     - קישור לקטגוריה                                        │
│     - ישות (בית/עסק תום/עסק יעל)                            │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│  2. עדכון Transaction                                       │
│     - סטטוס ← "סווג אוטומטית" / "סווג ידנית"               │
│     - קישור "רשומה מקושרת" ← record החדש                    │
│     - קישור "סווג על ידי חוק" (אם רלוונטי)                 │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│  3. Audit Logging                                           │
│     - action: 'classify_transaction'                        │
│     - resource: 'transaction'                               │
│     - מי סיווג: system / usr_tom_001 / usr_yael_001        │
└─────────────────────────────────────────────────────────────┘
```

---

## מבנה קבצים - קבצים חדשים לכתיבה

### 1. Classification Engine

```
classification/
├── types.ts                      # TypeScript interfaces
├── classifier.ts                 # Main classification orchestrator
├── sumit-client.ts              # Sumit API wrapper
├── clients-matcher.ts           # Client Airtable bases integration
├── rules-engine.ts              # Pattern matching + learning
└── airtable-helper.ts           # Airtable CRUD for classification
```

### 2. Telegram Bot (Interactive)

```
telegram/
├── bot.ts                        # Bot initialization + polling
├── handlers.ts                   # Callback query handlers
├── messages.ts                   # Hebrew message formatters
└── keyboards.ts                  # Inline keyboard builders
```

### 3. Background Jobs

```
jobs/
├── daily-scraper.ts             # [קיים - לא לגעת!]
└── classifier-worker.ts         # [חדש] Cron: כל שעה
```

### 4. API Endpoints

```
api/
├── transactions/
│   ├── pending.ts               # GET - תנועות ממתינות
│   └── classify.ts              # POST - סיווג ידני
└── classification-rules/
    ├── index.ts                 # GET/POST - רשימת חוקים
    ├── [id].ts                  # PUT/DELETE - עדכון/מחיקה
    └── learn.ts                 # POST - למידה מסיווג ידני
```

---

## פירוט קבצים קריטיים

### 1. classification/types.ts

```typescript
export interface ClassificationResult {
  success: boolean;
  method: 'sumit' | 'client_match' | 'rule' | 'manual' | 'failed';
  category: {
    id: string;
    name: string;
    type: 'income' | 'expense';
  } | null;
  entity: 'בית' | 'עסק תום' | 'עסק יעל' | 'עסק - משותף' | null;
  confidence: 'אוטומטי' | 'מאושר';
  ruleId?: string;
  metadata?: any;
}

export interface Transaction {
  id: string;
  hash: string;
  date: string;
  amount: number;
  description: string;
  source: string;
  userId: string;
  status: string;
}

export interface ClassificationRule {
  id: string;
  pattern: string;           // תבנית התאמה
  categoryId: string;        // קישור לקטגוריה
  entity: string;            // ישות
  type: 'income' | 'expense';
  confidence: 'אוטומטי' | 'מאושר';
  timesUsed: number;
  createdBy: string;
}

export interface SumitInvoice {
  id: string;
  date: string;
  amount: number;
  customerName: string;
  description: string;
}

export interface ClientRecord {
  id: string;
  name: string;
  expectedPaymentDate?: string;
  expectedAmount?: number;
  entity: 'עסק תום' | 'עסק יעל';
}
```

### 2. classification/classifier.ts

**Main orchestrator - מנהל את כל תהליך הסיווג**

```typescript
import { Transaction, ClassificationResult } from './types';
import { SumitClient } from './sumit-client';
import { ClientsMatcher } from './clients-matcher';
import { RulesEngine } from './rules-engine';
import { AirtableHelper } from './airtable-helper';

export class Classifier {
  private sumitClient: SumitClient;
  private clientsMatcher: ClientsMatcher;
  private rulesEngine: RulesEngine;
  private airtableHelper: AirtableHelper;

  async classifyTransaction(transaction: Transaction): Promise<ClassificationResult> {
    // 1. Try Sumit API
    const sumitResult = await this.sumitClient.findInvoice(
      transaction.date,
      transaction.amount,
      transaction.description
    );
    if (sumitResult) {
      return this.createIncomeFromSumit(transaction, sumitResult);
    }

    // 2. Try Client Airtable Bases
    const clientMatch = await this.clientsMatcher.findMatch(
      transaction.date,
      transaction.amount,
      transaction.userId
    );
    if (clientMatch) {
      return this.createIncomeFromClient(transaction, clientMatch);
    }

    // 3. Try Rules Engine
    const ruleMatch = await this.rulesEngine.findMatchingRule(
      transaction.description,
      transaction.userId
    );
    if (ruleMatch) {
      return this.applyRule(transaction, ruleMatch);
    }

    // 4. Return failed - will trigger Telegram notification
    return {
      success: false,
      method: 'failed',
      category: null,
      entity: null,
      confidence: 'אוטומטי'
    };
  }

  // Helper methods for creating records + updating transaction
  private async createIncomeFromSumit(...) { }
  private async createIncomeFromClient(...) { }
  private async applyRule(...) { }
}
```

### 3. classification/sumit-client.ts

**Sumit API Integration**

```typescript
export class SumitClient {
  private apiKey: string;
  private business1Id: string;
  private business2Id: string;

  constructor() {
    this.apiKey = process.env.SUMIT_API_KEY!;
    this.business1Id = process.env.SUMIT_BUSINESS_1_ID!;
    this.business2Id = process.env.SUMIT_BUSINESS_2_ID!;
  }

  async findInvoice(
    date: string,
    amount: number,
    description: string
  ): Promise<SumitInvoice | null> {
    // Query Sumit API for both businesses
    // Match by date (±3 days) + amount (exact or ±5%)
    // Return invoice if found
  }
}
```

**Environment Variables נדרשות:**
```bash
SUMIT_API_KEY=<API key from Sumit>
SUMIT_BUSINESS_1_ID=<Tom's business ID>
SUMIT_BUSINESS_2_ID=<Yael's business ID>
```

### 4. classification/clients-matcher.ts

**Client Airtable Bases Integration**

```typescript
export class ClientsMatcher {
  private business1BaseId: string;
  private business2BaseId: string;

  async findMatch(
    date: string,
    amount: number,
    userId: string
  ): Promise<ClientRecord | null> {
    // Query relevant base based on userId
    // Match by date (±7 days) + amount (±10%)
    // Return client record if found
  }
}
```

**Environment Variables נדרשות:**
```bash
AIRTABLE_BUSINESS_1_BASE_ID=appXXXXXXXXXXXXXX
AIRTABLE_BUSINESS_2_BASE_ID=appYYYYYYYYYYYYYY
AIRTABLE_CLIENTS_TABLE_NAME=Clients
AIRTABLE_CLIENT_NAME_FIELD=שם
AIRTABLE_CLIENT_PAYMENT_DATE_FIELD=תאריך תשלום
AIRTABLE_CLIENT_AMOUNT_FIELD=סכום
```

### 5. classification/rules-engine.ts

**Pattern Matching + Learning**

```typescript
export class RulesEngine {
  async findMatchingRule(
    description: string,
    userId: string
  ): Promise<ClassificationRule | null> {
    // 1. Get all active rules from Airtable (חוקי סיווג)
    // 2. Filter by confidence level (מאושר first, then אוטומטי)
    // 3. Match pattern (case-insensitive contains)
    // 4. Return best match
  }

  async incrementRuleUsage(ruleId: string): Promise<void> {
    // Increment timesUsed counter
    // If timesUsed >= 5 && confidence === 'אוטומטי':
    //   → Upgrade to 'מאושר'
  }

  async createRuleFromManualClassification(
    description: string,
    categoryId: string,
    entity: string,
    type: 'income' | 'expense',
    userId: string
  ): Promise<string> {
    // Extract pattern from description (first 3-5 words)
    // Create new rule with confidence='אוטומטי'
    // Return rule ID
  }
}
```

### 6. telegram/bot.ts

**Bot Initialization**

```typescript
import TelegramBot from 'node-telegram-bot-api';
import { handleCallbackQuery } from './handlers';

let bot: TelegramBot | null = null;

export function initTelegramBotPolling(): void {
  if (bot) {
    console.log('⚠️ Telegram bot already initialized');
    return;
  }

  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    throw new Error('TELEGRAM_BOT_TOKEN not set');
  }

  bot = new TelegramBot(token, {
    polling: true  // ✅ Enable polling for Phase 2
  });

  // Register handlers
  bot.on('callback_query', handleCallbackQuery);

  console.log('✅ Telegram bot polling started');
}

export function getTelegramBot(): TelegramBot {
  if (!bot) {
    throw new Error('Telegram bot not initialized');
  }
  return bot;
}
```

### 7. telegram/keyboards.ts

**Inline Keyboard Builders**

```typescript
import type { InlineKeyboardButton } from 'node-telegram-bot-api';

export function buildClassificationKeyboard(
  transactionId: string
): InlineKeyboardButton[][] {
  return [
    [
      { text: '🏠 הוצאה - בית', callback_data: `classify:${transactionId}:expense:בית` },
      { text: '💼 הוצאה - עסק תום', callback_data: `classify:${transactionId}:expense:עסק תום` }
    ],
    [
      { text: '💼 הוצאה - עסק יעל', callback_data: `classify:${transactionId}:expense:עסק יעל` },
      { text: '🤝 הוצאה - משותף', callback_data: `classify:${transactionId}:expense:עסק - משותף` }
    ],
    [
      { text: '💰 הכנסה - עסק תום', callback_data: `classify:${transactionId}:income:עסק תום` },
      { text: '💰 הכנסה - עסק יעל', callback_data: `classify:${transactionId}:income:עסק יעל` }
    ],
    [
      { text: '🚫 התעלם', callback_data: `ignore:${transactionId}` }
    ]
  ];
}

export function buildCategoryKeyboard(
  transactionId: string,
  type: 'income' | 'expense',
  entity: string,
  categories: Array<{ id: string; name: string }>
): InlineKeyboardButton[][] {
  const buttons: InlineKeyboardButton[][] = [];

  // Create buttons in rows of 2
  for (let i = 0; i < categories.length; i += 2) {
    const row: InlineKeyboardButton[] = [];
    row.push({
      text: categories[i].name,
      callback_data: `category:${transactionId}:${categories[i].id}`
    });
    if (i + 1 < categories.length) {
      row.push({
        text: categories[i + 1].name,
        callback_data: `category:${transactionId}:${categories[i + 1].id}`
      });
    }
    buttons.push(row);
  }

  // Add "Create Rule" button
  buttons.push([
    { text: '📝 צור חוק חדש', callback_data: `create_rule:${transactionId}:yes` }
  ]);

  return buttons;
}
```

### 8. telegram/handlers.ts

**Callback Query Handlers**

```typescript
import type { CallbackQuery } from 'node-telegram-bot-api';
import { getTelegramBot } from './bot';
import { Classifier } from '../classification/classifier';

export async function handleCallbackQuery(query: CallbackQuery): Promise<void> {
  const bot = getTelegramBot();
  const data = query.data!;
  const chatId = query.message!.chat.id;

  if (data.startsWith('classify:')) {
    // Format: classify:transactionId:type:entity
    const [_, txId, type, entity] = data.split(':');

    // Fetch categories for type + entity
    const categories = await fetchCategories(type as any, entity);

    // Send category selection keyboard
    await bot.editMessageReplyMarkup(
      { inline_keyboard: buildCategoryKeyboard(txId, type as any, entity, categories) },
      { chat_id: chatId, message_id: query.message!.message_id }
    );
  }

  else if (data.startsWith('category:')) {
    // Format: category:transactionId:categoryId
    const [_, txId, categoryId] = data.split(':');

    // Classify transaction
    const classifier = new Classifier();
    await classifier.manualClassify(txId, categoryId);

    // Update message
    await bot.editMessageText(
      '✅ התנועה סווגה בהצלחה!',
      { chat_id: chatId, message_id: query.message!.message_id }
    );
  }

  else if (data.startsWith('create_rule:')) {
    // Create rule from manual classification
    // ...
  }

  else if (data.startsWith('ignore:')) {
    // Mark transaction as ignored
    // ...
  }

  // Answer callback query to remove loading state
  await bot.answerCallbackQuery(query.id);
}
```

### 9. jobs/classifier-worker.ts

**Cron Job - רץ כל שעה**

```typescript
import cron from 'node-cron';
import { Classifier } from '../classification/classifier';
import { sendTelegramNotification } from '../lib/utils-telegram';
import { buildClassificationKeyboard } from '../telegram/keyboards';
import { formatTransactionMessage } from '../telegram/messages';

export function startClassifierWorker(): void {
  // Run every hour at :00
  cron.schedule('0 * * * *', async () => {
    console.log('🔄 Starting classification worker...');

    try {
      const classifier = new Classifier();
      const pendingTransactions = await classifier.getPendingTransactions();

      console.log(`📊 Found ${pendingTransactions.length} pending transactions`);

      let autoClassified = 0;
      let manualRequired = 0;

      for (const tx of pendingTransactions) {
        const result = await classifier.classifyTransaction(tx);

        if (result.success) {
          autoClassified++;
          console.log(`✅ Auto-classified: ${tx.description} (${result.method})`);
        } else {
          // Send to Telegram for manual classification
          manualRequired++;
          await sendClassificationRequest(tx);
        }
      }

      console.log(`✅ Classification complete: ${autoClassified} auto, ${manualRequired} manual`);

      // Send summary to users
      if (autoClassified > 0 || manualRequired > 0) {
        await sendTelegramNotification({
          message: `📊 סיכום סיווג:\n✅ ${autoClassified} סווגו אוטומטית\n⏳ ${manualRequired} ממתינות לסיווג ידני`,
          chatIds: [
            process.env.TELEGRAM_CHAT_ID_TOM!,
            process.env.TELEGRAM_CHAT_ID_YAEL!
          ]
        });
      }

    } catch (error) {
      console.error('❌ Classifier worker failed:', error);
      await sendTelegramNotification({
        message: `❌ שגיאה במנוע הסיווג:\n${error instanceof Error ? error.message : 'Unknown error'}`,
        chatIds: [process.env.TELEGRAM_CHAT_ID_TOM!]
      });
    }
  });

  console.log('✅ Classifier worker scheduled (hourly)');
}

async function sendClassificationRequest(transaction: Transaction): Promise<void> {
  const message = formatTransactionMessage(transaction);
  const keyboard = buildClassificationKeyboard(transaction.id);

  // Determine chat ID based on user
  const chatId = transaction.userId === 'usr_tom_001'
    ? process.env.TELEGRAM_CHAT_ID_TOM!
    : process.env.TELEGRAM_CHAT_ID_YAEL!;

  await sendTelegramNotification({
    message,
    keyboard,
    chatIds: [chatId]
  });
}
```

### 10. api/transactions/pending.ts

```typescript
import { withAuth, type AuthRequest } from '../../lib/middleware-auth';

export default withAuth(async (req: AuthRequest, res: Response) => {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { userId } = req.user!;

  // Get pending transactions from Airtable
  const Airtable = (await import('airtable')).default;
  const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY })
    .base(process.env.AIRTABLE_BASE_ID!);

  const records = await base(process.env.AIRTABLE_TRANSACTIONS_TABLE!)
    .select({
      filterByFormula: `AND(
        {${process.env.AIRTABLE_TRANSACTION_STATUS_FIELD!}} = 'ממתין לסיווג',
        {${process.env.AIRTABLE_TRANSACTION_USER_ID_FIELD!}} = '${userId}'
      )`,
      sort: [{ field: process.env.AIRTABLE_TRANSACTION_DATE_FIELD!, direction: 'desc' }]
    })
    .all();

  const transactions = records.map(r => ({
    id: r.id,
    date: r.get(process.env.AIRTABLE_TRANSACTION_DATE_FIELD!),
    amount: r.get(process.env.AIRTABLE_TRANSACTION_AMOUNT_FIELD!),
    description: r.get(process.env.AIRTABLE_TRANSACTION_DESCRIPTION_FIELD!),
    source: r.get(process.env.AIRTABLE_TRANSACTION_SOURCE_FIELD!),
  }));

  return res.status(200).json({ transactions });
});
```

### 11. telegram/messages.ts

**Message Formatters בעברית**

```typescript
import { Transaction } from '../classification/types';
import { format, parseISO } from 'date-fns';
import { he } from 'date-fns/locale';

export function formatTransactionMessage(transaction: Transaction): string {
  const date = format(parseISO(transaction.date), 'dd/MM/yyyy', { locale: he });
  const amount = Math.abs(transaction.amount).toFixed(2);
  const type = transaction.amount < 0 ? '💳 הוצאה' : '💰 הכנסה';

  return `
🔔 *תנועה חדשה לסיווג*

${type}: ₪${amount}
📅 תאריך: ${date}
🏦 מקור: ${transaction.source}
📝 תיאור: ${transaction.description}

אנא בחר קטגוריה:
  `.trim();
}

export function formatClassificationSuccess(
  categoryName: string,
  ruleCreated: boolean
): string {
  let message = `✅ *התנועה סווגה בהצלחה!*\n\n📁 קטגוריה: ${categoryName}`;

  if (ruleCreated) {
    message += '\n📝 חוק חדש נוצר לסיווג אוטומטי בעתיד';
  }

  return message;
}

export function formatDailySummary(
  totalTransactions: number,
  autoClassified: number,
  manualRequired: number
): string {
  return `
📊 *סיכום סיווג יומי*

🔄 סה"כ תנועות: ${totalTransactions}
✅ סווגו אוטומטית: ${autoClassified}
⏳ ממתינות לסיווג: ${manualRequired}
  `.trim();
}
```

### 12. classification/airtable-helper.ts

**Airtable CRUD Operations for Classification**

```typescript
import Airtable from 'airtable';
import type { Transaction, ClassificationRule } from './types';

export class AirtableHelper {
  private base: any;

  constructor() {
    this.base = new Airtable({
      apiKey: process.env.AIRTABLE_API_KEY
    }).base(process.env.AIRTABLE_BASE_ID!);
  }

  /**
   * יצירת record חדש בטבלת הכנסות
   */
  async createIncomeRecord(
    transaction: Transaction,
    categoryId: string,
    entity: string,
    source: 'sumit' | 'client' | 'rule' | 'manual'
  ): Promise<string> {
    const record = await this.base(process.env.AIRTABLE_INCOME_TABLE!).create({
      [process.env.AIRTABLE_INCOME_DATE_FIELD!]: transaction.date,
      [process.env.AIRTABLE_INCOME_CATEGORY_FIELD!]: [categoryId], // Link field
      [process.env.AIRTABLE_INCOME_AMOUNT_FIELD!]: Math.abs(transaction.amount),
      [process.env.AIRTABLE_INCOME_DESCRIPTION_FIELD!]:
        `${transaction.description} (סווג: ${source})`,
      [process.env.AIRTABLE_INCOME_VAT_TYPE_FIELD!]: 'ללא מע"מ',
    });

    return record.id;
  }

  /**
   * יצירת record חדש בטבלת הוצאות
   */
  async createExpenseRecord(
    transaction: Transaction,
    categoryId: string,
    entity: string,
    source: 'rule' | 'manual'
  ): Promise<string> {
    const record = await this.base(process.env.AIRTABLE_EXPENSE_TABLE!).create({
      [process.env.AIRTABLE_EXPENSE_DATE_FIELD!]: transaction.date,
      [process.env.AIRTABLE_EXPENSE_CATEGORY_FIELD!]: [categoryId], // Link field
      [process.env.AIRTABLE_EXPENSE_AMOUNT_FIELD!]: Math.abs(transaction.amount),
      [process.env.AIRTABLE_EXPENSE_DESCRIPTION_FIELD!]:
        `${transaction.description} (סווג: ${source})`,
      [process.env.AIRTABLE_EXPENSE_VAT_TYPE_FIELD!]: 'ללא מע"מ',
    });

    return record.id;
  }

  /**
   * עדכון סטטוס תנועה לאחר סיווג
   */
  async updateTransactionStatus(
    transactionId: string,
    status: 'סווג אוטומטית' | 'סווג ידנית' | 'התעלם',
    linkedRecordId: string | null,
    ruleId: string | null
  ): Promise<void> {
    const updateData: any = {
      [process.env.AIRTABLE_TRANSACTION_STATUS_FIELD!]: status
    };

    if (linkedRecordId) {
      updateData['רשומה מקושרת'] = [linkedRecordId];
    }

    if (ruleId) {
      updateData['סווג על ידי חוק'] = [ruleId];
    }

    await this.base(process.env.AIRTABLE_TRANSACTIONS_TABLE!)
      .update(transactionId, updateData);
  }

  /**
   * שליפת תנועות ממתינות לסיווג
   */
  async getPendingTransactions(): Promise<Transaction[]> {
    const records = await this.base(process.env.AIRTABLE_TRANSACTIONS_TABLE!)
      .select({
        filterByFormula: `{${process.env.AIRTABLE_TRANSACTION_STATUS_FIELD!}} = 'ממתין לסיווג'`,
        sort: [{
          field: process.env.AIRTABLE_TRANSACTION_DATE_FIELD!,
          direction: 'desc'
        }]
      })
      .all();

    return records.map(r => ({
      id: r.id,
      hash: r.get(process.env.AIRTABLE_TRANSACTION_HASH_FIELD!) as string,
      date: r.get(process.env.AIRTABLE_TRANSACTION_DATE_FIELD!) as string,
      amount: r.get(process.env.AIRTABLE_TRANSACTION_AMOUNT_FIELD!) as number,
      description: r.get(process.env.AIRTABLE_TRANSACTION_DESCRIPTION_FIELD!) as string,
      source: r.get(process.env.AIRTABLE_TRANSACTION_SOURCE_FIELD!) as string,
      userId: r.get(process.env.AIRTABLE_TRANSACTION_USER_ID_FIELD!) as string,
      status: r.get(process.env.AIRTABLE_TRANSACTION_STATUS_FIELD!) as string,
    }));
  }

  /**
   * שליפת כל חוקי הסיווג הפעילים
   */
  async getActiveRules(): Promise<ClassificationRule[]> {
    const records = await this.base(process.env.AIRTABLE_CLASSIFICATION_RULES_TABLE!)
      .select({
        // Sort by confidence (מאושר first) then by times used
        sort: [
          { field: process.env.AIRTABLE_RULE_CONFIDENCE_FIELD!, direction: 'desc' },
          { field: process.env.AIRTABLE_RULE_TIMES_USED_FIELD!, direction: 'desc' }
        ]
      })
      .all();

    return records.map(r => {
      const categoryIdArray = r.get(process.env.AIRTABLE_RULE_CATEGORY_FIELD!);
      const categoryId = Array.isArray(categoryIdArray)
        ? categoryIdArray[0]
        : categoryIdArray;

      return {
        id: r.id,
        pattern: r.get(process.env.AIRTABLE_RULE_PATTERN_FIELD!) as string,
        categoryId: categoryId as string,
        entity: r.get(process.env.AIRTABLE_RULE_ENTITY_FIELD!) as string,
        type: r.get(process.env.AIRTABLE_RULE_TYPE_FIELD!) as 'income' | 'expense',
        confidence: r.get(process.env.AIRTABLE_RULE_CONFIDENCE_FIELD!) as 'אוטומטי' | 'מאושר',
        timesUsed: r.get(process.env.AIRTABLE_RULE_TIMES_USED_FIELD!) as number || 0,
        createdBy: r.get(process.env.AIRTABLE_RULE_CREATED_BY_FIELD!) as string,
      };
    });
  }

  /**
   * יצירת חוק סיווג חדש
   */
  async createRule(
    pattern: string,
    categoryId: string,
    entity: string,
    type: 'income' | 'expense',
    userId: string
  ): Promise<string> {
    const record = await this.base(process.env.AIRTABLE_CLASSIFICATION_RULES_TABLE!)
      .create({
        [process.env.AIRTABLE_RULE_PATTERN_FIELD!]: pattern,
        [process.env.AIRTABLE_RULE_CATEGORY_FIELD!]: [categoryId],
        [process.env.AIRTABLE_RULE_ENTITY_FIELD!]: entity,
        [process.env.AIRTABLE_RULE_TYPE_FIELD!]: type === 'income' ? 'הכנסה' : 'הוצאה',
        [process.env.AIRTABLE_RULE_CONFIDENCE_FIELD!]: 'אוטומטי',
        [process.env.AIRTABLE_RULE_TIMES_USED_FIELD!]: 0,
        [process.env.AIRTABLE_RULE_CREATED_BY_FIELD!]: userId,
      });

    return record.id;
  }

  /**
   * עדכון מונה שימושים של חוק
   */
  async incrementRuleUsage(ruleId: string, currentCount: number): Promise<void> {
    const newCount = currentCount + 1;
    const updateData: any = {
      [process.env.AIRTABLE_RULE_TIMES_USED_FIELD!]: newCount
    };

    // Upgrade to confirmed after 5 uses
    if (newCount >= 5) {
      updateData[process.env.AIRTABLE_RULE_CONFIDENCE_FIELD!] = 'מאושר';
    }

    await this.base(process.env.AIRTABLE_CLASSIFICATION_RULES_TABLE!)
      .update(ruleId, updateData);
  }

  /**
   * שליפת קטגוריות לפי סוג וישות
   */
  async getCategories(
    type: 'income' | 'expense',
    entity: string
  ): Promise<Array<{ id: string; name: string }>> {
    const tableName = type === 'income'
      ? process.env.AIRTABLE_INCOME_CATEGORIES_TABLE!
      : process.env.AIRTABLE_EXPENSE_CATEGORIES_TABLE!;

    const nameField = type === 'income'
      ? process.env.AIRTABLE_CATEGORY_NAME_FIELD!
      : process.env.AIRTABLE_EXPENSE_CATEGORY_NAME_FIELD!;

    const statusField = type === 'income'
      ? process.env.AIRTABLE_CATEGORY_STATUS_FIELD!
      : process.env.AIRTABLE_EXPENSE_CATEGORY_STATUS_FIELD!;

    // Build filter - for expenses, filter by entity
    let filterFormula = `{${statusField}} = 'פעיל'`;

    if (type === 'expense') {
      filterFormula = `AND(
        {${statusField}} = 'פעיל',
        {${process.env.AIRTABLE_EXPENSE_BUSINESS_HOME_FIELD!}} = '${entity}'
      )`;
    }

    const records = await this.base(tableName)
      .select({
        filterByFormula: filterFormula,
        sort: [{ field: nameField, direction: 'asc' }]
      })
      .all();

    return records.map(r => ({
      id: r.id,
      name: r.get(nameField) as string
    }));
  }
}

---

## Environment Variables חדשות

**יש להוסיף ל-.env.local ול-Railway:**

```bash
# ========================================
# Sumit API (Phase 2)
# ========================================
SUMIT_API_KEY=<API key from Sumit>
SUMIT_BUSINESS_1_ID=<Tom's business ID>
SUMIT_BUSINESS_2_ID=<Yael's business ID>

# ========================================
# Client Airtable Bases (Phase 2)
# ========================================
AIRTABLE_BUSINESS_1_BASE_ID=appXXXXXXXXXXXXXX
AIRTABLE_BUSINESS_2_BASE_ID=appYYYYYYYYYYYYYY

# Client table field names
AIRTABLE_CLIENTS_TABLE_NAME=Clients
AIRTABLE_CLIENT_NAME_FIELD=שם
AIRTABLE_CLIENT_PAYMENT_DATE_FIELD=תאריך תשלום צפוי
AIRTABLE_CLIENT_AMOUNT_FIELD=סכום צפוי

# ========================================
# Classification Rules Table Fields (Phase 2)
# ========================================
AIRTABLE_CLASSIFICATION_RULES_TABLE=חוקי סיווג

AIRTABLE_RULE_PATTERN_FIELD=תבנית התאמה
AIRTABLE_RULE_CATEGORY_FIELD=קטגוריה
AIRTABLE_RULE_ENTITY_FIELD=ישות
AIRTABLE_RULE_TYPE_FIELD=סוג
AIRTABLE_RULE_CONFIDENCE_FIELD=רמת ביטחון
AIRTABLE_RULE_TIMES_USED_FIELD=מספר שימושים
AIRTABLE_RULE_CREATED_BY_FIELD=נוצר על ידי
AIRTABLE_RULE_DESCRIPTION_FIELD=תיאור
```

---

## עדכון Audit Types

**קובץ:** `lib/utils-audit.ts`

**להוסיף לtypes:**

```typescript
export type AuditAction =
  | 'login' | 'logout' | 'create' | 'update' | 'delete'
  | '2fa_setup' | '2fa_verify'
  | 'classify_transaction'  // ✅ חדש
  | 'create_rule'           // ✅ חדש
  | 'update_rule'           // ✅ חדש
  | 'delete_rule';          // ✅ חדש

export type AuditResource =
  | 'income' | 'expense' | 'category' | 'auth' | 'webauthn'
  | 'transaction'           // ✅ חדש
  | 'classification_rule';  // ✅ חדש
```

---

## עדכון server.ts

**קובץ:** `server.ts`

**שינויים נדרשים:**

```typescript
// Line ~35-37: Add new imports
import { startDailyScraperJob } from './jobs/daily-scraper';
import { startClassifierWorker } from './jobs/classifier-worker';  // ✅ חדש
import { initTelegramBot } from './lib/utils-telegram';
import { initTelegramBotPolling } from './telegram/bot';  // ✅ חדש

// Line ~113-126: Update initialization
if (process.env.NODE_ENV === 'production') {
  try {
    // Notification bot (polling off)
    initTelegramBot();

    // Interactive bot (polling on) - ✅ חדש
    initTelegramBotPolling();

    // Jobs
    startDailyScraperJob();
    startClassifierWorker();  // ✅ חדש

    console.log('✅ Jobs and services initialized');
  } catch (error) {
    console.error('❌ Failed to initialize jobs:', error);
  }
}

// Line ~71-97: Add new routes
app.get('/api/transactions/pending', async (req, res) => {
  const handler = (await import('./api/transactions/pending')).default;
  return handler(req, res);
});

app.post('/api/transactions/classify', async (req, res) => {
  const handler = (await import('./api/transactions/classify')).default;
  return handler(req, res);
});

app.get('/api/classification-rules', async (req, res) => {
  const handler = (await import('./api/classification-rules/index')).default;
  return handler(req, res);
});

app.post('/api/classification-rules', async (req, res) => {
  const handler = (await import('./api/classification-rules/index')).default;
  return handler(req, res);
});
```

---

## אסטרטגיית בדיקה (Verification)

### Phase 2.1: Classification Engine (ללא Telegram)

1. ✅ יצירת חוק ידני בטבלת "חוקי סיווג"
2. ✅ הרצת classifier על תנועה ידנית
3. ✅ בדיקה שהתנועה סווגה נכון
4. ✅ בדיקה שנוצר record בטבלת הכנסות/הוצאות
5. ✅ בדיקה שהתנועה מקושרת ל-record

### Phase 2.2: Telegram Interactive

1. ✅ שליחת תנועה ידנית לטלגרם
2. ✅ לחיצה על "הוצאה - בית"
3. ✅ בחירת קטגוריה
4. ✅ בדיקה שהתנועה סווגה
5. ✅ בדיקה שנוצר חוק חדש (אם נבחר)

### Phase 2.3: Classifier Worker

1. ✅ הוספת תנועות ידניות לטבלת Transactions
2. ✅ המתנה לשעה הבאה (או הרצה ידנית)
3. ✅ בדיקת logs
4. ✅ בדיקה שהתנועות סווגו
5. ✅ בדיקת הודעות טלגרם

### Phase 2.4: Sumit + Client Bases (לאחר קבלת credentials)

1. ✅ הוספת environment variables
2. ✅ בדיקת חיבור ל-Sumit API
3. ✅ בדיקת התאמה לחשבונית
4. ✅ בדיקת חיבור ל-Client Bases
5. ✅ בדיקת התאמה ללקוח

---

## סיכום קבצים קריטיים

| קובץ | פעולה | תיאור |
|------|-------|-------|
| `classification/types.ts` | ✅ יצירה | TypeScript interfaces |
| `classification/classifier.ts` | ✅ יצירה | Main orchestrator |
| `classification/sumit-client.ts` | ✅ יצירה | Sumit API |
| `classification/clients-matcher.ts` | ✅ יצירה | Client bases |
| `classification/rules-engine.ts` | ✅ יצירה | Pattern matching |
| `classification/airtable-helper.ts` | ✅ יצירה | Airtable CRUD |
| `telegram/bot.ts` | ✅ יצירה | Bot init + polling |
| `telegram/handlers.ts` | ✅ יצירה | Callback handlers |
| `telegram/keyboards.ts` | ✅ יצירה | Inline keyboards |
| `telegram/messages.ts` | ✅ יצירה | Message formatters |
| `jobs/classifier-worker.ts` | ✅ יצירה | Hourly cron job |
| `api/transactions/pending.ts` | ✅ יצירה | GET pending txs |
| `api/transactions/classify.ts` | ✅ יצירה | POST manual classify |
| `api/classification-rules/index.ts` | ✅ יצירה | CRUD rules |
| `lib/utils-audit.ts` | 🔧 עדכון | Add new types |
| `server.ts` | 🔧 עדכון | Add routes + jobs |
| `.env.example` | 🔧 עדכון | Add new vars |

**סה" כ:** 14 קבצים חדשים + 3 עדכונים

---

## זמן אומדן

- **Classification Engine**: 2 ימי עבודה
- **Telegram Interactive**: 2 ימי עבודה
- **Classifier Worker**: 1 יום עבודה
- **API Endpoints**: 1 יום עבודה
- **בדיקות**: 2 ימי עבודה
- **אינטגרציה Sumit + Clients**: 2 ימי עבודה (תלוי בקבלת credentials)

**סה" כ:** ~10 ימי עבודה (שבועיים)

---

## לקחים מהקוד הקיים - פטרנים לשימוש חוזר

### 1. Airtable Dynamic Import Pattern
**חובה לשימוש בכל endpoint** (Vercel compatibility):

```typescript
const Airtable = (await import('airtable')).default;
const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY })
  .base(process.env.AIRTABLE_BASE_ID!);
```

### 2. Authentication Middleware
**כל API endpoint חייב להיות עטוף:**

```typescript
import { withAuth, type AuthRequest } from '../lib/middleware-auth';

export default withAuth(async (req: AuthRequest, res: Response) => {
  const { userId, username } = req.user!;
  // ... logic
});
```

### 3. Linked Records Pattern
**קריטי:** Linked records תמיד מועברים כarray:

```typescript
// ✅ נכון
{
  [categoryField]: [categoryId]
}

// ❌ שגוי
{
  [categoryField]: categoryId
}
```

### 4. Field Normalization
**קריאת linked records יכולה להחזיר array או ערך בודד:**

```typescript
const categoryIdArray = record.get(categoryField);
const categoryId = Array.isArray(categoryIdArray)
  ? categoryIdArray[0]
  : categoryIdArray;
```

### 5. Audit Logging
**כל פעולה חייבת להירשם:**

```typescript
import { logSuccess, logFailure } from '../lib/utils-audit';

await logSuccess(userId, username, 'classify_transaction', 'transaction', req, {
  transactionId: txId,
  categoryId,
  method: 'auto'
});
```

### 6. Error Handling Pattern
**סטנדרט בכל endpoint:**

```typescript
try {
  // Validation
  if (!data) {
    return res.status(400).json({ error: 'Invalid data' });
  }

  // Operations
  const result = await doSomething();

  // Success
  return res.status(200).json({ success: true, data: result });

} catch (error) {
  console.error('Error:', error);
  return res.status(500).json({
    error: 'Operation failed',
    details: error instanceof Error ? error.message : 'Unknown error'
  });
}
```

### 7. Batch Processing (Airtable Limit: 10 records)

```typescript
const BATCH_SIZE = 10;

for (let i = 0; i < items.length; i += BATCH_SIZE) {
  const batch = items.slice(i, i + BATCH_SIZE);
  await processBatch(batch);
}
```

### 8. Environment Variables Fallback

```typescript
const FIELD_NAME = process.env.AIRTABLE_FIELD_NAME || 'ברירת מחדל';
```

### 9. Retry Logic (מתוך scraper-manager.ts)

```typescript
private async operationWithRetry<T>(
  operation: () => Promise<T>,
  maxRetries = 3
): Promise<T> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      if (attempt === maxRetries) throw error;

      const backoffMs = Math.pow(2, attempt) * 1000;
      console.log(`⏳ Retry ${attempt}/${maxRetries} after ${backoffMs}ms...`);
      await new Promise(resolve => setTimeout(resolve, backoffMs));
    }
  }
  throw new Error('Max retries exceeded');
}
```

---

## התייחסות ל-Airtable Schema

### טבלת תנועות - שדות קיימים

מתוך `transcations_airtable_schema.pdf`:

| שם השדה | סוג | תיאור |
|---------|-----|-------|
| מזהה תנועה | נוסחה (Primary) | Hash ייחודי |
| תאריך | תאריך | תאריך התנועה |
| סכום | מספר | סכום בש"ח |
| תיאור | טקסט | תיאור מהבנק |
| מקור | קישור | קישור לטבלת חשבונות |
| סטטוס | בחירה יחידה | ממתין לסיווג / סווג אוטומטית / סווג ידנית / התעלם |
| סווג על ידי חוק | קישור | קישור לטבלת חוקי סיווג |
| רשומה מקושרת | קישור | קישור להכנסות או הוצאות |
| מזהה משתמש | בחירה יחידה | usr_tom_001 / usr_yael_001 |
| תאריך יצירה | נוסחה | אוטומטי |

### טבלת חוקי סיווג - שדות קיימים

| שם השדה | סוג | תיאור |
|---------|-----|-------|
| תבנית התאמה | טקסט (Primary) | הטקסט לחיפוש |
| קטגוריה | קישור | קישור למקורות הכנסה/הוצאה |
| ישות | בחירה יחידה | בית / עסק תום / עסק יעל / עסק - משותף |
| סוג | בחירה יחידה | הוצאה / הכנסה |
| רמת ביטחון | בחירה יחידה | אוטומטי / מאושר |
| מספר שימושים | מספר | מונה שימושים |
| נוצר על ידי | בחירה יחידה | usr_tom_001 / usr_yael_001 / מערכת |
| תאריך יצירה | נוסחה | אוטומטי |
| תיאור | טקסט ארוך | הסבר על החוק |
| תנועות | קישור | קישור לטבלת תנועות |

**חשוב:** הערכים בשדה "סוג" בעברית: "הוצאה" / "הכנסה" (לא income/expense באנגלית!)

---

## נקודות חשובות לזכור

### 1. הפרדת Notification Bot ו-Interactive Bot

- **Notification Bot** (`lib/utils-telegram.ts`): polling=false, משמש רק לשליחת הודעות
- **Interactive Bot** (`telegram/bot.ts`): polling=true, מאזין ל-callback queries

**שני בוטים באותו token** - מותר כי רק אחד polling!

### 2. Environment-Aware Initialization

Jobs ו-polling מופעלים **רק ב-production**:

```typescript
if (process.env.NODE_ENV === 'production') {
  initTelegramBot();          // Notification (polling off)
  initTelegramBotPolling();   // Interactive (polling on)
  startDailyScraperJob();     // 04:00 UTC
  startClassifierWorker();    // Every hour
}
```

### 3. Expense Categories - Field Name

**קריטי:** שדה שם בטבלת מקורות הוצאה הוא `תיאור/הערות` (לא `שם`!)

```bash
AIRTABLE_EXPENSE_CATEGORY_NAME_FIELD=תיאור/הערות  # ⚠️ NOT "שם"!
```

### 4. Sumit API ו-Client Bases - יופעלו בהמשך

בשלב ראשון, נבנה את המנגנון אבל **לא נפעיל** את Sumit ו-Client Bases עד שנקבל:
1. API keys של Sumit
2. פרטי הטבלאות מבסיסי הנתונים של העסקים

הclassifier יעבוד עם Rules Engine + Telegram בלבד בינתיים.

### 5. Pattern Extraction Strategy

כאשר יוצרים rule מסיווג ידני, נחלץ pattern באופן הבא:
- **אם תיאור קצר (<15 תווים):** השתמש בכל התיאור
- **אם תיאור ארוך:** קח את 3-5 המילים הראשונות
- **נקה:** הסר מספרים, תאריכים, סכומים
- **דוגמה:** "שופרסל סניף ת״א 12/01" → pattern: "שופרסל"

### 6. Testing Strategy

**שלב א' - Local Testing (ללא Telegram):**
1. יצירת unit tests ל-classifier
2. בדיקת rules engine עם נתונים מדומים
3. בדיקת airtable-helper CRUD operations

**שלב ב' - Telegram Testing:**
1. שליחת הודעות ידניות
2. בדיקת callback handlers
3. בדיקת inline keyboards

**שלב ג' - Integration Testing:**
1. הרצת classifier worker ידנית
2. בדיקת flow מלא: scraper → classifier → telegram
3. בדיקת audit logs

**שלב ד' - Production:**
1. Deploy ל-Railway
2. מעקב אחרי logs
3. בדיקת cron jobs
4. בדיקת Telegram notifications

---

## סיכום - מה נבנה בפועל

### קבצים חדשים (14)

**Classification Engine (6 קבצים):**
- ✅ `classification/types.ts` - TypeScript interfaces
- ✅ `classification/classifier.ts` - Main orchestrator
- ✅ `classification/sumit-client.ts` - Sumit API (stub בינתיים)
- ✅ `classification/clients-matcher.ts` - Client bases (stub בינתיים)
- ✅ `classification/rules-engine.ts` - Pattern matching + learning
- ✅ `classification/airtable-helper.ts` - Airtable CRUD wrapper

**Telegram Interactive (4 קבצים):**
- ✅ `telegram/bot.ts` - Bot initialization + polling
- ✅ `telegram/handlers.ts` - Callback query handlers
- ✅ `telegram/keyboards.ts` - Inline keyboard builders
- ✅ `telegram/messages.ts` - Hebrew message formatters

**Jobs (1 קובץ):**
- ✅ `jobs/classifier-worker.ts` - Hourly cron job

**API Endpoints (3 קבצים):**
- ✅ `api/transactions/pending.ts` - GET pending transactions
- ✅ `api/transactions/classify.ts` - POST manual classification
- ✅ `api/classification-rules/index.ts` - CRUD rules

### עדכונים לקבצים קיימים (3)

- 🔧 `lib/utils-audit.ts` - Add new audit types
- 🔧 `server.ts` - Add routes + initialize jobs
- 🔧 `.env.example` - Add new environment variables

### Environment Variables חדשות (14)

```bash
# Sumit API
SUMIT_API_KEY=
SUMIT_BUSINESS_1_ID=
SUMIT_BUSINESS_2_ID=

# Client Bases
AIRTABLE_BUSINESS_1_BASE_ID=
AIRTABLE_BUSINESS_2_BASE_ID=
AIRTABLE_CLIENTS_TABLE_NAME=
AIRTABLE_CLIENT_NAME_FIELD=
AIRTABLE_CLIENT_PAYMENT_DATE_FIELD=
AIRTABLE_CLIENT_AMOUNT_FIELD=

# Classification Rules Table
AIRTABLE_CLASSIFICATION_RULES_TABLE=
AIRTABLE_RULE_PATTERN_FIELD=
AIRTABLE_RULE_CATEGORY_FIELD=
AIRTABLE_RULE_ENTITY_FIELD=
AIRTABLE_RULE_TYPE_FIELD=
AIRTABLE_RULE_CONFIDENCE_FIELD=
AIRTABLE_RULE_TIMES_USED_FIELD=
AIRTABLE_RULE_CREATED_BY_FIELD=
AIRTABLE_RULE_DESCRIPTION_FIELD=
```

---

## Success Metrics - איך נדע שהשלב הצליח?

### Metrics כמותיים

- ✅ **80%+ auto-classification rate** - לפחות 80% מהתנועות מסווגות אוטומטית
- ✅ **< 5 דקות סיווג ידני** - משך זמן ממוצע לסיווג תנועה דרך Telegram
- ✅ **0 כשלי classifier worker** - Worker רץ כל שעה ללא שגיאות
- ✅ **100% Telegram delivery** - כל ההודעות מגיעות למשתמשים

### Metrics איכותיים

- ✅ **Learning effectiveness** - חוקים משודרגים ל-"מאושר" אחרי 5 שימושים
- ✅ **User satisfaction** - משתמשים מדווחים על חיסכון בזמן
- ✅ **Rule accuracy** - פחות מ-5% false positives בסיווג אוטומטי
- ✅ **Telegram UX** - ממשק נוח ואינטואיטיבי

---

## תכנית גיבוי - אם משהו לא עובד

### אם Sumit API לא זמין
→ דלג על integration, המשך עם Rules + Telegram בלבד

### אם Client Bases לא מוכנות
→ דלג על integration, הוסף בשלב 5

### אם Telegram polling לא יציב
→ חזור ל-webhooks (דורש HTTPS endpoint)

### אם Airtable rate limits
→ הוסף exponential backoff + retry logic
→ הקטן תדירות classifier worker ל-2 שעות

---

## הבא - שלב 3

לאחר השלמת שלב 2, נעבור לשלב 3:
- **תחזית תזרים** (3 תרחישים: פסימי, ריאליסטי, אופטימי)
- **טבלת הוראות קבע** (Standing Orders)
- **Dashboard תזרים** (Frontend)

אבל זה רק אחרי ש**שלב 2 עובד ויציב** ✅
