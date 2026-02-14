# תכנית מלאה: הפיכת מערכת ניהול הכספים למערכת אוטומטית

## Context - למה אנחנו עושים את זה?

### הבעיה הנוכחית

משפחה של שני עצמאים עם הזנה **ידנית מלאה** של הכנסות והוצאות. ב-10 לכל חודש יורדים בו-זמנית: כרטיסי אשראי, משכנתא, גן פרטי, והוראות קבע - לפעמים לפני שהכספים הספיקו להיכנס. **אין תמונת תזרים אמיתית**, אין אפשרות לדעת מראש אם החודש מסתיים בפלוס או במינוס, ואין זיהוי אוטומטי של הוצאות.

### המטרה

להפוך את האפליקציה הקיימת ל**מערכת אוטומטית** עם:
1. **סקרייפינג יומי** מבנק דיסקונט ו-8 כרטיסי אשראי (כאל ומקס)
2. **סיווג חכם** של תנועות (Sumit API + למידת חוקים)
3. **תחזית תזרים** ל-10 לחודש (3 תרחישים: פסימי, ריאליסטי, אופטימי)
4. **תובנות** - לאן הולך הכסף ואיפה אפשר לחסוך
5. **Telegram bot** לסיווג ידני אינטראקטיבי
6. **אינטגרציה עם Airtable לקוחות** (הכנסות עתידיות)

### המצב הנוכחי

✅ **כבר בנוי:**
- React PWA מושלמת עם הזנה ידנית של הכנסות/הוצאות
- אימות מלא: JWT + TOTP 2FA + WebAuthn (ביומטרי)
- אינטגרציה עם Airtable (4 טבלאות: הכנסות, הוצאות, מקורות הכנסה, מקורות הוצאה)
- Express backend על Railway מוכן לפריסה
- Offline support עם IndexedDB
- Analytics + CSV export
- Audit logging

❌ **חסר ויש לבנות:**
- סקרייפר בנק/אשראי + cron job
- טבלאות Airtable חדשות: Transactions, Classification Rules, Accounts, Standing Orders
- מנוע סיווג (Sumit API + pattern matching)
- Telegram bot
- מודל תחזית תזרים
- דשבורד תובנות מתקדם

---

## אסטרטגיית יישום: 6 שלבים

הפרויקט יבוצע ב-6 שלבים נפרדים, כאשר כל שלב בנוי על הקודם. **החידוש המרכזי:** האפליקציה הקיימת ממשיכה לעבוד ללא שינויים - הסקרייפר והסיווג עובדים במקביל במבנה טבלאות נפרד.

### שלב 1: סקרייפר + Railway Cron (שבועיים)
- סקרייפר יומי ב-06:00 עם `israeli-bank-scrapers`
- טבלאות חדשות: **Transactions**, **Accounts**
- הצפנת credentials (AES על Railway env vars)
- התראות Telegram בסיסיות (הצלחה/כשל)
- זיהוי כפילויות (hash-based)

### שלב 2: מנוע סיווג + Telegram Bot (שבועיים)
- טבלה חדשה: **Classification Rules**
- Sumit API integration (cross-reference חשבוניות)
- **Client Airtable bases integration** - סיווג תנועות לפי נתוני לקוחות (עסק א׳ + עסק ב׳)
- Rules engine - pattern matching + למידה (confidence: auto → confirmed)
- Telegram bot עם inline buttons לסיווג ידני
- Classifier worker - רץ כל שעה ומסווג תנועות חדשות

### שלב 3: תחזית תזרים (שבוע)
- טבלה חדשה: **Standing Orders**
- מודל חישוב 3 תרחישים (פסימי, ריאליסטי, אופטימי)
- API endpoint: `GET /api/forecast`
- דשבורד תזרים (frontend)

### שלב 4: תובנות (Insights) (שבוע)
- ניתוח הוצאות לפי קטגוריה/ישות
- טרנדים חודשיים
- השוואה חודש לחודש
- API endpoint: `GET /api/insights`

### שלב 5: אינטגרציה עם Airtable לקוחות (3 ימים)
- חיבור ל-2 bases נפרדים (עסק א׳ + עסק ב׳)
- שליפת הכנסות עתידיות להזנה לתחזית אופטימית
- **שימוש בנתוני לקוחות לסיווג תנועות** - אם תנועה תואמת שם לקוח + סכום + תאריך, סיווג אוטומטי כהכנסה עסקית

### שלב 6: שיפורי Frontend (שבוע)
- מסך סיווג תנועות (`TransactionsPage.tsx`)
- דשבורד תזרים (`ForecastPage.tsx`)
- מסך תובנות מתקדם (`InsightsPage.tsx`)
- גרפים (pie chart, line chart)

---

## מבנה תיקיות חדש

```
/Users/tomlandau/Code/finances-tracker/
│
├── lib/                                # Utilities משותפות
│   ├── middleware-auth.ts              # [קיים] JWT verification
│   ├── utils-audit.ts                  # [קיים] Audit logging
│   ├── utils-crypto.ts                 # [חדש] AES encryption לסיסמאות
│   ├── utils-hash.ts                   # [חדש] Transaction hash (MD5)
│   ├── utils-telegram.ts               # [חדש] Telegram helpers
│   └── utils-airtable.ts               # [חדש] Airtable CRUD helpers
│
├── scrapers/                           # [חדש] מנועי סקרייפינג
│   ├── types.ts                        # Interfaces
│   ├── credentials-manager.ts          # פענוח credentials מוצפנים
│   ├── scraper-manager.ts              # אורקסטרציה של כל הסקרייפרים
│   ├── discount-scraper.ts             # [אופציונלי] ספציפי לדיסקונט
│   ├── isracard-scraper.ts             # [אופציונלי] ספציפי לכאל
│   └── max-scraper.ts                  # [אופציונלי] ספציפי למקס
│
├── classification/                     # [חדש] מנוע סיווג
│   ├── types.ts                        # Interfaces
│   ├── classifier.ts                   # לוגיקה ראשית (Sumit → Rules → Manual)
│   ├── sumit-client.ts                 # Sumit API wrapper
│   ├── rules-engine.ts                 # Pattern matching + למידה
│   └── learning-engine.ts              # [אופציונלי] שדרוג confidence
│
├── telegram/                           # [חדש] Telegram bot
│   ├── bot.ts                          # אתחול בוט + polling
│   ├── handlers.ts                     # Callback queries (כפתורים)
│   ├── messages.ts                     # פורמט הודעות (עברית)
│   └── keyboards.ts                    # Inline keyboards
│
├── forecast/                           # [חדש] תחזית תזרים
│   ├── types.ts                        # Interfaces
│   ├── calculator.ts                   # חישוב 3 תרחישים
│   ├── clients-integration.ts          # אינטגרציה עם client bases
│   └── standing-orders.ts              # [אופציונלי] מנהל הוראות קבע
│
├── jobs/                               # [חדש] Background jobs
│   ├── daily-scraper.ts                # Cron: 06:00 יומי
│   ├── classifier-worker.ts            # Cron: כל שעה
│   └── telegram-summary.ts             # [אופציונלי] סיכום יומי
│
├── api/                                # API endpoints
│   ├── [קיימים]                        # categories, income, expense, recent, etc.
│   ├── transactions.ts                 # [חדש] GET /api/transactions
│   ├── transactions-classify.ts        # [חדש] POST /api/transactions/classify
│   ├── transactions-pending.ts         # [חדש] GET /api/transactions/pending
│   ├── classification-rules.ts         # [חדש] CRUD חוקים
│   ├── standing-orders.ts              # [חדש] CRUD הוראות קבע
│   ├── forecast.ts                     # [חדש] GET /api/forecast
│   ├── insights.ts                     # [חדש] GET /api/insights
│   ├── scraper-status.ts               # [חדש] GET /api/scraper/status
│   └── scraper-trigger.ts              # [חדש] POST /api/scraper/trigger (ידני)
│
├── src/                                # Frontend (React PWA)
│   ├── pages/
│   │   ├── TransactionsPage.tsx        # [חדש] סיווג תנועות
│   │   ├── ForecastPage.tsx            # [חדש] דשבורד תזרים
│   │   └── InsightsPage.tsx            # [חדש] תובנות מתקדמות
│   ├── components/
│   │   ├── transactions/               # [חדש]
│   │   │   ├── TransactionClassifier.tsx
│   │   │   └── PendingList.tsx
│   │   ├── forecast/                   # [חדש]
│   │   │   ├── ScenarioCards.tsx
│   │   │   ├── UpcomingCharges.tsx
│   │   │   └── TrendChart.tsx
│   │   └── insights/                   # [חדש]
│   │       ├── CategoryPieChart.tsx
│   │       ├── EntityBreakdown.tsx
│   │       └── MonthlyComparison.tsx
│   └── services/
│       ├── api.ts                      # [לעדכן] הוספת endpoints חדשים
│       └── transactions.ts             # [חדש] Transaction API client
│
├── server.ts                           # [לעדכן] הוספת routes + jobs
└── package.json                        # [לעדכן] הוספת dependencies
```

---

## סכמת Airtable - טבלאות חדשות

### 1. Transactions (תנועות מסוקרפות)

**שדות:**
- `transaction_id` (Formula/Text): hash MD5 של `date + amount + description + source`
- `date` (Date): תאריך התנועה
- `amount` (Currency): סכום (שלילי = הוצאה, חיובי = הכנסה)
- `description` (Single line text): תיאור מקורי מהסקרייפר
- `source` (Single select): "Discount - Tom", "Isracard *1234 - Yael", וכו׳
- `status` (Single select): pending / auto_classified / manually_classified / ignored
- `classified_by_rule` (Link to Classification Rules): [אופציונלי]
- `linked_record` (Link to הכנסות או הוצאות): [אופציונלי]
- `user_id` (Single select): usr_tom_001 / usr_yael_001
- `created_at` (Created time): אוטומטי

**הערה קריטית:** שדה `transaction_id` הוא hash ייחודי למניעת כפילויות!

### 2. Accounts (חשבונות)

**שדות:**
- `name` (Single line text): "Discount - Tom", "Isracard *1234 - Yael"
- `type` (Single select): bank / credit_card
- `last_balance` (Currency): יתרה אחרונה
- `last_scraped` (Date): תאריך סקרייפינג אחרון
- `credentials_key` (Single line text): שם env var (למשל: CREDENTIALS_DISCOUNT_TOM)
- `user_id` (Single select): usr_tom_001 / usr_yael_001

### 3. Classification Rules (חוקי סיווג)

**שדות:**
- `match_pattern` (Single line text): "שופרסל", "רמי לוי", "דור אלון"
- `category` (Link to מקורות הכנסה או מקורות הוצאה): קישור לקטגוריה
- `entity` (Single select): בית / עסק א׳ / עסק ב׳
- `type` (Single select): expense / income
- `confidence` (Single select): auto / confirmed
- `times_used` (Number): ברירת מחדל 0
- `created_by` (Single select): usr_tom_001 / usr_yael_001 / system
- `created_at` (Created time): אוטומטי

**לוגיקת למידה:**
- חוק חדש נוצר עם `confidence=auto`
- אחרי 5 שימושים מוצלחים ← שדרוג ל-`confidence=confirmed`

### 4. Standing Orders (הוראות קבע)

**שדות:**
- `name` (Single line text): "משכנתא", "גן פרטי", "פנסיה"
- `amount` (Currency): סכום חודשי קבוע
- `day_of_month` (Number): יום בחודש (לרוב 10)
- `entity` (Single select): בית / עסק א׳ / עסק ב׳
- `category` (Link to מקורות הוצאה): קישור לקטגוריה
- `active` (Checkbox): ברירת מחדל true

---

## קבצים קריטיים לכל שלב

### שלב 1: סקרייפר

**קבצים לכתיבה:**
1. `/Users/tomlandau/Code/finances-tracker/lib/utils-crypto.ts` - הצפנת/פענוח credentials (AES-256-CBC)
2. `/Users/tomlandau/Code/finances-tracker/lib/utils-hash.ts` - יצירת transaction hash (MD5)
3. `/Users/tomlandau/Code/finances-tracker/scrapers/types.ts` - Interfaces
4. `/Users/tomlandau/Code/finances-tracker/scrapers/credentials-manager.ts` - טעינת credentials מוצפנים מ-env vars
5. `/Users/tomlandau/Code/finances-tracker/scrapers/scraper-manager.ts` - הלוגיקה המרכזית
6. `/Users/tomlandau/Code/finances-tracker/jobs/daily-scraper.ts` - Cron job (06:00)
7. `/Users/tomlandau/Code/finances-tracker/lib/utils-telegram.ts` - שליחת הודעות
8. `/Users/tomlandau/Code/finances-tracker/api/transactions.ts` - GET /api/transactions
9. `/Users/tomlandau/Code/finances-tracker/api/scraper-trigger.ts` - POST /api/scraper/trigger

**קבצים לעדכון:**
- `/Users/tomlandau/Code/finances-tracker/server.ts` - הוספת routes + אתחול cron
- `/Users/tomlandau/Code/finances-tracker/package.json` - הוספת dependencies

### שלב 2: סיווג + Telegram

**קבצים לכתיבה:**
1. `/Users/tomlandau/Code/finances-tracker/classification/types.ts`
2. `/Users/tomlandau/Code/finances-tracker/classification/sumit-client.ts` - Sumit API wrapper
3. `/Users/tomlandau/Code/finances-tracker/classification/rules-engine.ts` - pattern matching
4. `/Users/tomlandau/Code/finances-tracker/classification/classifier.ts` - לוגיקה ראשית
5. `/Users/tomlandau/Code/finances-tracker/telegram/bot.ts` - אתחול בוט
6. `/Users/tomlandau/Code/finances-tracker/telegram/handlers.ts` - callback queries
7. `/Users/tomlandau/Code/finances-tracker/telegram/messages.ts` - פורמט הודעות עברית
8. `/Users/tomlandau/Code/finances-tracker/telegram/keyboards.ts` - inline buttons
9. `/Users/tomlandau/Code/finances-tracker/jobs/classifier-worker.ts` - רץ כל שעה
10. `/Users/tomlandau/Code/finances-tracker/api/classification-rules.ts`
11. `/Users/tomlandau/Code/finances-tracker/api/transactions-classify.ts`
12. `/Users/tomlandau/Code/finances-tracker/api/transactions-pending.ts`

**קבצים לעדכון:**
- `/Users/tomlandau/Code/finances-tracker/server.ts` - אתחול בוט + routes

### שלב 3: תחזית תזרים

**קבצים לכתיבה:**
1. `/Users/tomlandau/Code/finances-tracker/forecast/types.ts`
2. `/Users/tomlandau/Code/finances-tracker/forecast/calculator.ts` - 3 תרחישים
3. `/Users/tomlandau/Code/finances-tracker/api/forecast.ts`
4. `/Users/tomlandau/Code/finances-tracker/api/standing-orders.ts`

### שלב 4: תובנות

**קבצים לכתיבה:**
1. `/Users/tomlandau/Code/finances-tracker/api/insights.ts` - ניתוח נתונים

### שלב 5: אינטגרציה Airtable לקוחות

**קבצים לכתיבה:**
1. `/Users/tomlandau/Code/finances-tracker/forecast/clients-integration.ts`

**קבצים לעדכון:**
- `/Users/tomlandau/Code/finances-tracker/forecast/calculator.ts` - שילוב הכנסות עתידיות

### שלב 6: Frontend

**קבצים לכתיבה:**
1. `/Users/tomlandau/Code/finances-tracker/src/pages/TransactionsPage.tsx`
2. `/Users/tomlandau/Code/finances-tracker/src/pages/ForecastPage.tsx`
3. `/Users/tomlandau/Code/finances-tracker/src/pages/InsightsPage.tsx`
4. `/Users/tomlandau/Code/finances-tracker/src/components/transactions/TransactionClassifier.tsx`
5. `/Users/tomlandau/Code/finances-tracker/src/components/transactions/PendingList.tsx`
6. `/Users/tomlandau/Code/finances-tracker/src/components/forecast/ScenarioCards.tsx`
7. `/Users/tomlandau/Code/finances-tracker/src/components/forecast/UpcomingCharges.tsx`
8. `/Users/tomlandau/Code/finances-tracker/src/components/forecast/TrendChart.tsx`
9. `/Users/tomlandau/Code/finances-tracker/src/components/insights/CategoryPieChart.tsx`
10. `/Users/tomlandau/Code/finances-tracker/src/components/insights/EntityBreakdown.tsx`
11. `/Users/tomlandau/Code/finances-tracker/src/components/insights/MonthlyComparison.tsx`
12. `/Users/tomlandau/Code/finances-tracker/src/services/transactions.ts`

**קבצים לעדכון:**
- `/Users/tomlandau/Code/finances-tracker/src/services/api.ts` - הוספת endpoints

---

## Dependencies חדשות

### לבדוק ב-package.json

```json
{
  "engines": {
    "node": ">=22.12.0"  // עדכון מ-18.0.0 (נדרש ל-israeli-bank-scrapers)
  },
  "dependencies": {
    "israeli-bank-scrapers": "^8.0.0",
    "node-telegram-bot-api": "^0.66.0",
    "node-cron": "^3.0.3"
  },
  "devDependencies": {
    "@types/node-telegram-bot-api": "^0.66.0",
    "@types/node-cron": "^3.0.3"
  }
}
```

---

## Environment Variables חדשות (Railway)

```bash
# ========================================
# הצפנת Credentials
# ========================================

# מפתח הצפנה (32 בתים hex)
# ליצור עם: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
CREDENTIALS_ENCRYPTION_KEY=<32-byte-hex>

# Credentials מוצפנים עם AES-256-CBC (JSON מוצפן)
# פורמט JSON: {"id":"123456789","password":"mypass","num":"12"}
CREDENTIALS_DISCOUNT_TOM=<encrypted-json>
CREDENTIALS_DISCOUNT_YAEL=<encrypted-json>
CREDENTIALS_ISRACARD_TOM=<encrypted-json>  # {"id":"123456789","card6Digits":"123456","password":"mypass"}
CREDENTIALS_ISRACARD_YAEL=<encrypted-json>
CREDENTIALS_MAX_TOM=<encrypted-json>  # {"username":"user","password":"pass"}
CREDENTIALS_MAX_YAEL=<encrypted-json>

# ========================================
# Telegram
# ========================================

TELEGRAM_BOT_TOKEN=<from @BotFather>
TELEGRAM_CHAT_ID_TOM=<Tom's chat ID>
TELEGRAM_CHAT_ID_YAEL=<Yael's chat ID>

# ========================================
# Airtable - טבלאות חדשות
# ========================================

AIRTABLE_TRANSACTIONS_TABLE=Transactions
AIRTABLE_ACCOUNTS_TABLE=Accounts
AIRTABLE_CLASSIFICATION_RULES_TABLE=Classification Rules
AIRTABLE_STANDING_ORDERS_TABLE=Standing Orders

# ========================================
# Sumit API (שלב 2)
# ========================================

SUMIT_API_KEY=<from Sumit>
SUMIT_BUSINESS_1_ID=<Business A ID>
SUMIT_BUSINESS_2_ID=<Business B ID>

# ========================================
# Client Airtable Bases (שלב 5)
# ========================================

AIRTABLE_BUSINESS_1_BASE_ID=appXXXXXXXXXXXXXX
AIRTABLE_BUSINESS_2_BASE_ID=appYYYYYYYYYYYYYY
CLIENTS_TABLE_NAME=Clients  # או שם הטבלה בפועל
```

---

## פטרנים לשימוש חוזר מהקוד הקיים

### 1. Middleware Pattern (Auth)

```typescript
// מתוך: /Users/tomlandau/Code/finances-tracker/lib/middleware-auth.ts
import { withAuth, type AuthRequest } from '../lib/middleware-auth';

export default withAuth(async (req: AuthRequest, res: Response) => {
  // גישה ל: req.user.userId, req.user.username
  // אימות JWT אוטומטי
});
```

### 2. Audit Logging

```typescript
// מתוך: /Users/tomlandau/Code/finances-tracker/lib/utils-audit.ts
import { logSuccess, logFailure } from '../lib/utils-audit';

await logSuccess(userId, username, 'create', 'transaction', req, { details });
```

**הרחבה נדרשת ל-audit types:**
```typescript
export type AuditAction = 'login' | 'logout' | 'create' | 'update' | 'delete'
  | '2fa_setup' | '2fa_verify' | 'scraper_trigger' | 'classify_transaction' | 'create_rule';

export type AuditResource = 'income' | 'expense' | 'category' | 'auth' | 'webauthn'
  | 'transaction' | 'classification_rule' | 'scraper';
```

### 3. Airtable CRUD Pattern

```typescript
// מתוך: /Users/tomlandau/Code/finances-tracker/api/income.ts
const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY })
  .base(process.env.AIRTABLE_BASE_ID!);

const record = await base(tableName).create({ fields });
```

---

## אסטרטגיית אבטחה

### שכבות הצפנה (Credentials)

1. **שכבה 1:** Railway environment variables (הצפנה ברמת הפלטפורמה)
2. **שכבה 2:** AES-256-CBC encryption (הצפנה ברמת האפליקציה)

**יתרון:** גם אם מישהו מקבל גישה ל-env vars, הוא צריך גם את `CREDENTIALS_ENCRYPTION_KEY`.

### Telegram Security

- Bot token שמור כ-env var
- Chat IDs של Tom ו-Yael בלבד (whitelist)
- אין credentials רגישים בהודעות Telegram
- Callback data מכיל רק IDs, לא נתונים פרטיים

### Audit Logging מורחב

**מה לתעד:**
- טריגר ידני של סקרייפר (action='scraper_trigger')
- סיווג ידני (action='classify_transaction', resource='transaction')
- יצירת חוק (action='create_rule', resource='classification_rule')

---

## Retry Logic + Error Handling

### סקרייפר - Retry עם Exponential Backoff

```typescript
private async scrapeWithRetry(bankCreds: BankCredentials, maxRetries = 3): Promise<ScrapeResult> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await this.scrapeAccount(bankCreds);
    } catch (error) {
      if (attempt === maxRetries) throw error;

      // Exponential backoff: 2^attempt seconds
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
    }
  }
  throw new Error('Max retries exceeded');
}
```

### התראת Telegram על כשל

```typescript
await sendTelegramNotification({
  message: `❌ סקרייפינג נכשל: ${accountName}\n\nשגיאה: ${error.message}`,
  chatIds: [process.env.TELEGRAM_CHAT_ID_TOM!]
});
```

### Airtable Rate Limits

- **Free tier:** 5 requests/second, 50,000 records
- **Batch inserts:** שימוש ב-`base.create([...])` במקום creates בודדים
- **Exponential backoff על 429 errors**

---

## אסטרטגיית Migration: ידני → אוטומטי

### עיקרון המפתח: ללא שינויים שוברים (No Breaking Changes)

1. **הזנה ידנית ממשיכה לעבוד**
   - כל ה-API endpoints הקיימים (`/api/income`, `/api/expense`) נשארים זהים
   - תנועות ידניות הולכות ישירות ל-`הכנסות` ו-`הוצאות`
   - התנועות המסוקרפות הולכות ל-`Transactions` (טבלה נפרדת)

2. **מערכות מקבילות**
   - סקרייפר + סיווג → `Transactions` → `הכנסות`/`הוצאות`
   - הזנה ידנית → ישירות ל-`הכנסות`/`הוצאות`
   - אין overlap - כל תנועה מגיעה ממקור אחד בלבד

3. **Deduplication**
   - Transaction hash (MD5) מונע כפילויות בסקרייפר
   - **עתידי:** merge של הזנות ידניות שכבר נסקרפו (Phase 7)

### Rollout הדרגתי

**שבוע 1-2: שלב 1**
- פריסת סקרייפר עם credentials של Tom בלבד
- בדיקה שאין השפעה על הזנה ידנית
- Tom ממשיך להזין ידנית במקביל (כדי לאמת)

**שבוע 3-4: שלב 2**
- הוספת credentials של Yael
- הפעלת Telegram bot
- Tom + Yael מסווגים דרך Telegram

**שבוע 5-6: שלב 3-4**
- תחזית תזרים + תובנות
- מילוי ידני של טבלת Standing Orders

**שבוע 7+: שלבים 5-6**
- אינטגרציה עם client bases
- שיפורי frontend

---

## אימות (Verification) - איך לבדוק שהכל עובד

### שלב 1: סקרייפר

**בדיקות לוקאליות:**
1. ✅ טעינת credentials מוצפנים מצליחה
2. ✅ סקרייפר מחזיר תנועות (לפחות 1)
3. ✅ Hash generation עובד (אותה תנועה = אותו hash)
4. ✅ Deduplication עובד (הרצה שנייה = 0 תנועות חדשות)
5. ✅ עדכון `last_scraped` בטבלת Accounts

**בדיקות Railway:**
1. ✅ Cron job רץ ב-06:00 (בדיקה ב-logs)
2. ✅ התראת Telegram מגיעה
3. ✅ טבלת Transactions מתמלאת

### שלב 2: סיווג

**בדיקות:**
1. ✅ חוק חדש נוצר דרך Telegram
2. ✅ התאמת pattern עובדת (תיאור מתאים ← סיווג אוטומטי)
3. ✅ שדרוג confidence אחרי 5 שימושים
4. ✅ Sumit API integration (אם יש חשבוניות)
5. ✅ יצירת linked record ב-`הכנסות`/`הוצאות`

### שלב 3: תחזית

**בדיקות:**
1. ✅ חישוב 3 תרחישים מחזיר ערכים סבירים
2. ✅ פסימי < ריאליסטי < אופטימי
3. ✅ Standing orders נכללים בחישוב
4. ✅ דשבורד מציג נכון

---

## Deployment Checklist - Railway

### לפני Deploy

- [ ] יצירת 4 טבלאות חדשות ב-Airtable
- [ ] מילוי טבלת Accounts בשמות החשבונות
- [ ] יצירת Telegram bot דרך @BotFather
- [ ] קבלת chat IDs (Tom + Yael)
- [ ] יצירת `CREDENTIALS_ENCRYPTION_KEY`
- [ ] הצפנת כל ה-credentials
- [ ] עדכון `package.json` engines ל-22.12.0

### אחרי Deploy

- [ ] בדיקת health check: `https://your-app.railway.app/health`
- [ ] טריגר ידני של הסקרייפר: `POST /api/scraper/trigger`
- [ ] בדיקה שהתנועות מגיעות ל-Airtable
- [ ] שליחת הודעת Telegram בדיקה
- [ ] בדיקת inline buttons
- [ ] בדיקת cron logs (ב-06:00 למחרת)

---

## סיכום: מה זה אומר בפועל?

### מה משתנה למשתמש?

**היום:**
- הזנה ידנית מלאה
- אין תמונת תזרים
- אין יכולת לחזות את ה-10 לחודש

**אחרי היישום:**
- **בוקר:** הודעת Telegram עם סיכום: "15 תנועות חדשות, 12 סווגו אוטומטית, 3 ממתינות לסיווג"
- **סיווג מהיר:** לחיצה על כפתור בטלגרם במקום פתיחת האפליקציה
- **תחזית בזמן אמת:** "על פי התחזית הריאליסטית, ביום 10 תהיה לך יתרה של ₪5,200"
- **תובנות:** "החודש הוצאת 20% יותר על אוכל מהחודש שעבר"
- **הזנה ידנית עדיין עובדת** - אפשר להמשיך להזין במקביל

### עומס תחזוקה

- **יומי:** 0 - הכל אוטומטי
- **שבועי:** סיווג של 5-10 תנועות חדשות (דרך Telegram)
- **חודשי:** בדיקת Standing Orders שלא השתנו
- **שנתי:** בדיקה שסקרייפרים לא נשברו (התראה אוטומטית אם יש בעיה)

---

זו תכנית מקיפה שמאפשרת לכם **לקפוץ פנימה בכל שלב** - אפשר להתחיל מהסקרייפר ולעצור אחרי שלב 1 לראות איך זה עובד, או לעשות את כל 6 השלבים ברצף.

**הנקודה החשובה ביותר:** שום דבר לא נשבר. האפליקציה הקיימת ממשיכה לעבוד בדיוק כמו היום, והאוטומציה נוספת בהדרגה.
