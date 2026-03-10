# תכנית טסטים - Finances Tracker

## Context
הפרויקט הוא מערכת מעקב פיננסי מלאה (PWA) עם סיווג אוטומטי של תנועות בנק, בוט טלגרם אינטראקטיבי, ואינטגרציה עם Airtable. כרגע אין framework לטסטים - רק סקריפטי bash. המטרה: לבנות תשתית טסטים מקיפה עם Vitest.

---

## שלב 1: תשתית

**Framework**: Vitest (תואם ל-Vite + ESM + TypeScript)
**Dependencies**: `vitest`, `@testing-library/react`, `@testing-library/jest-dom`, `@testing-library/user-event`, `supertest`, `msw`

**מבנה תיקיות:**
```
tests/
  setup.ts                          # env vars, global mocks
  mocks/
    airtable.ts                     # in-memory Airtable mock
    telegram-bot.ts
    sumit-api.ts
    bank-scrapers.ts
  unit/
    classification/
    lib/
    telegram/
    scrapers/
    frontend/
  integration/
  e2e/
```

---

## שלב 2: רשימת תרחישי טסטים

### A. Unit Tests - פונקציות טהורות (ללא mocks)

#### A1. `utils-hash.ts` - Hash תנועות
| # | תרחיש | קלט | תוצאה צפויה |
|---|--------|------|-------------|
| 1 | אותם קלטים → אותו hash | זהה פעמיים | deterministic |
| 2 | שינוי בשדה אחד → hash שונה | שדה אחד שונה | hash שונה |
| 3 | טקסט בעברית | תיאור בעברית | MD5 hex תקין |
| 4 | סכום שלילי | amount=-100 | hash תקין |
| 5 | תיאור ריק | description='' | hash תקין |

#### A2. `vat.ts` - חישוב מע"מ
| # | תרחיש | קלט | תוצאה צפויה |
|---|--------|------|-------------|
| 1 | ללא מע"מ | 100, rate=0 | net=100, vat=0, gross=100 |
| 2 | לפני מע"מ 18% | 100, 0.18, 'לפני' | net=100, vat=18, gross=118 |
| 3 | כולל מע"מ 18% | 118, 0.18, 'כולל' | net=100, vat=18, gross=118 |
| 4 | עיגול מספרים | 117, 0.18, 'כולל' | עיגול ל-2 ספרות |
| 5 | סכום אפס | 0, 0.18 | הכל אפסים |

#### A3. `validation.ts` - ולידציה
| # | תרחיש | קלט | תוצאה |
|---|--------|------|--------|
| 1 | סכום תקין | '100' | true |
| 2 | סכום אפס | '0' | false |
| 3 | סכום שלילי | '-5' | false |
| 4 | טקסט | 'abc' | false |
| 5 | תאריך תקין | '2026-03-10' | true |
| 6 | תאריך לא תקין | 'not-a-date' | false |

#### A4. `formatters.ts` - פורמט
| # | תרחיש | קלט | תוצאה |
|---|--------|------|--------|
| 1 | מטבע | 100 | פורמט ₪ |
| 2 | תאריך | '2026-03-10' | '10/03/2026' |
| 3 | תאריך לא תקין | 'invalid' | מחזיר כמו שהוא |
| 4 | מספר | 1234.5 | פורמט עם 2 ספרות |

#### A5. `keyboards.ts` - מקלדות טלגרם
| # | תרחיש | תוצאה |
|---|--------|--------|
| 1 | הכנסה (amount>0) | 3 כפתורי הכנסה + התעלם |
| 2 | הוצאה (amount<0) | 4 כפתורי הוצאה + התעלם |
| 3 | פורמט callback data | `classify:{id}:{type}:{entity}` |
| 4 | 5 קטגוריות | עמוד אחד, ללא pagination |
| 5 | 25 קטגוריות | 2 עמודים, כפתורי ניווט |
| 6 | עמוד 1 מ-2 | כפתור "הקודם" |
| 7 | מספר אי-זוגי של קטגוריות | אחרון לבד בשורה |
| 8 | כפתור "חזרה" | תמיד בשורה אחרונה |

#### A6. `messages.ts` - הודעות טלגרם
| # | תרחיש | תוצאה |
|---|--------|--------|
| 1 | escapeMarkdown עם תווים מיוחדים | `*_[]()` escaped |
| 2 | escapeMarkdown עם null | מחזיר '' |
| 3 | escapeMarkdown עברית + תווים | escaped נכון |
| 4 | formatTransactionMessage הכנסה | מכיל "הכנסה" |
| 5 | formatTransactionMessage הוצאה | מכיל "הוצאה" |
| 6 | formatPaymentAppTransactionMessage | מכיל אזהרה |

#### A7. `tabConfigs.ts` - הגדרות טאבים
| # | תרחיש | תוצאה |
|---|--------|--------|
| 1 | 7 טאבים | length === 7 |
| 2 | getTabById('home') | טאב הוצאות בית |
| 3 | getTabById('invalid') | undefined |
| 4 | פילטר הכנסות תום | `{ owner: 'תום' }` |
| 5 | פילטר הוצאות עסק תום | `{ businessHome: 'עסק תום' }` |
| 6 | הכנסות משותף | `{ owner: 'משותף' }` |

---

### B. Unit Tests - לוגיקה עסקית (עם mocks)

#### B1. `Classifier.isPaymentApp()` - זיהוי אפליקציות תשלום
| # | תרחיש | קלט | תוצאה |
|---|--------|------|--------|
| 1 | 'ביט' בתחילה | 'ביט העברה' | true |
| 2 | 'ביט' בסוף | 'העברה ביט' | true |
| 3 | **'ביטוח לאומי' לא תואם 'ביט'** | 'ביטוח לאומי' | **false** |
| 4 | 'ביטחוני' לא תואם | 'ביטחוני' | false |
| 5 | 'bit' case insensitive | 'BIT payment' | true |
| 6 | 'פייבוקס' | 'פייבוקס העברה' | true |
| 7 | 'paybox' | 'paybox transfer' | true |
| 8 | 'הפועלים' | 'בנק הפועלים' | true |
| 9 | ללא התאמה | 'רכישה בסופר' | false |
| 10 | מחרוזת ריקה | '' | false |
| 11 | 'ביט' לבד | 'ביט' | true |

#### B2. `RulesEngine` - התאמת חוקים
| # | תרחיש | תוצאה |
|---|--------|--------|
| 1 | התאמה מדויקת | match |
| 2 | substring | match |
| 3 | case insensitive | match |
| 4 | ללא התאמה | null |
| 5 | עברית עם מספרים | match |
| 6 | תיאור ריק | null |

#### B3. `RulesEngine` - סדר עדיפויות חוקים
| # | תרחיש | תוצאה |
|---|--------|--------|
| 1 | חוק ignore vs רגיל | ignore מנצח |
| 2 | 'מאושר' vs 'אוטומטי' | 'מאושר' מנצח |
| 3 | שימושים 10 vs 3 | 10 מנצח |
| 4 | ללא חוקים תואמים | null |

#### B4. `RulesEngine` - Cache
| # | תרחיש | תוצאה |
|---|--------|--------|
| 1 | קריאה ראשונה | fetch מ-Airtable |
| 2 | קריאה שנייה תוך 5 דקות | cache |
| 3 | קריאה אחרי 5 דקות | re-fetch |
| 4 | invalidateCache | קריאה הבאה מ-Airtable |

#### B5. `RulesEngine` - שדרוג ביטחון
| # | שימושים | תוצאה |
|---|---------|--------|
| 1 | 0→1 | נשאר 'אוטומטי' |
| 2 | 3→4 | נשאר 'אוטומטי' |
| 3 | 4→5 | משודרג ל-'מאושר' |
| 4 | 10→11 | נשאר 'מאושר' |

#### B6. `AirtableHelper` - מציאת רשומות כפולות
**הכנסות (exact match):**
| # | תרחיש | תוצאה |
|---|--------|--------|
| 1 | סכום + תאריך זהים | record ID |
| 2 | סכום זהה, תאריך שונה | null |
| 3 | תאריך זהה, סכום שונה | null |
| 4 | שגיאת Airtable | null (graceful) |

**הוצאות (fuzzy match):**
| # | תרחיש | סכום | תאריך | תוצאה |
|---|--------|------|--------|--------|
| 1 | exact | 100 vs 100 | same | record ID |
| 2 | +4% (בטווח) | 100 vs 104 | same | record ID |
| 3 | +6% (מחוץ לטווח) | 100 vs 106 | same | null |
| 4 | -5% (גבול) | 100 vs 95 | same | record ID |
| 5 | +4 ימים (בטווח) | same | +4d | record ID |
| 6 | +6 ימים (מחוץ) | same | +6d | null |
| 7 | שגיאת Airtable | any | any | null |

#### B7. `AirtableHelper` - מיפוי ישויות
**הכנסות:**
| קלט | תוצאה |
|------|--------|
| 'עסק תום' | 'תום' |
| 'עסק יעל' | 'יעל' |
| 'עסק - משותף' | 'משותף' |
| 'בית' | 'בית' |

**הוצאות:**
| קלט | תוצאה |
|------|--------|
| 'בית' | 'בית' |
| 'עסק תום' | 'עסקי' |
| 'עסק יעל' | 'עסקי' |
| 'עסק - משותף' | 'עסקי' |

#### B8. `AirtableHelper` - שדות קטגוריה
| # | תרחיש | תוצאה |
|---|--------|--------|
| 1 | קטגוריות הכנסה | שדה 'שם' |
| 2 | קטגוריות הוצאה | שדה 'תיאור/הערות' |
| 3 | חוק הכנסה | שדה 'קטגוריית הכנסה' |
| 4 | חוק הוצאה | שדה 'קטגוריית הוצאה' |

#### B9. `AirtableHelper` - override amount
| # | overrideAmount | סכום בפועל | סכום שנרשם |
|---|---------------|------------|------------|
| 1 | undefined | -155 | 155 |
| 2 | 54.39 (019) | -155 | 54.39 |
| 3 | 100 (Cloudways) | -120 | 100 |

#### B10. `AirtableHelper` - טיפול ב-422
| # | תרחיש | תוצאה |
|---|--------|--------|
| 1 | עדכון תקין עם linked record | כל השדות מתעדכנים |
| 2 | שגיאת 422 על שדה linked record | retry בלי linked record, סטטוס מתעדכן |
| 3 | שגיאה אחרת | throws |

#### B11. `Classifier.classifyTransaction()` - pipeline מלא
| # | תרחיש | תוצאה |
|---|--------|--------|
| 1 | הכנסה עם רשומה קיימת | method='already_recorded' |
| 2 | הוצאה עם רשומה קיימת | method='already_recorded' |
| 3 | הכנסה - התאמת Sumit | method='sumit' |
| 4 | הכנסה - התאמת לקוח | method='client_match' |
| 5 | הכנסה - התאמת חוק | method='rule' |
| 6 | הוצאה - התאמת חוק | method='rule' |
| 7 | חוק ignore | method='ignored' |
| 8 | שום דבר לא תואם | method='failed' |
| 9 | הוצאה → דילוג על Sumit | Layer 1 skipped |
| 10 | הוצאה → דילוג על clients | Layer 2 skipped |
| 11 | שגיאה בשכבה → ממשיך הלאה | לא חוסם |

#### B12. `SumitClient`
| # | תרחיש | תוצאה |
|---|--------|--------|
| 1 | credentials חסרים | null |
| 2 | userId לא מוכר | null |
| 3 | סכום בטווח 1% | invoice |
| 4 | סכום מחוץ ל-1% | null |
| 5 | מספר תוצאות, הקרוב בתאריך | closest |
| 6 | יעל: vatIncluded=false תמיד | false |
| 7 | תום: vatIncluded מפרטי חשבונית | check items |

#### B13. `ClientsMatcher`
| # | תרחיש | תוצאה |
|---|--------|--------|
| 1 | config חסר | null |
| 2 | תום → טבלת 'רישום לקוחות' | query נכון |
| 3 | יעל → טבלת 'עבודות' | query נכון |
| 4 | סכום ±10%, תאריך ±7 ימים | match |
| 5 | סכום מחוץ ל-10% | null |
| 6 | תאריך מחוץ ל-7 ימים | null |

#### B14. `middleware-auth.ts` - JWT
| # | תרחיש | תוצאה |
|---|--------|--------|
| 1 | ללא token | 401 |
| 2 | token תקין | handler נקרא עם req.user |
| 3 | token פג תוקף | 401 |
| 4 | token מזויף | 403 |

#### B15. `utils-crypto.ts` - הצפנה
| # | תרחיש | תוצאה |
|---|--------|--------|
| 1 | encrypt → decrypt | טקסט מקורי |
| 2 | עברית | encrypt/decrypt תקין |
| 3 | JSON credentials | round-trip תקין |
| 4 | מפתח חסר | throws |
| 5 | פורמט מוצפן לא תקין | throws |
| 6 | כל encrypt → ciphertext שונה | IV שונה |

#### B16. Scrapers
**shouldIgnoreTransaction:**
| # | תיאור | תוצאה |
|---|--------|--------|
| 1 | 'חיוב זמני למפתח מזומן' | ignored |
| 2 | 'חיוב לכרטיס ויזה 1234' | ignored |
| 3 | 'מקס איט חיוב' | ignored |
| 4 | 'שופרסל דיל' | not ignored |
| 5 | 'חיוב רגיל' | not ignored |

**Pending transactions:**
| # | תרחיש | תוצאה |
|---|--------|--------|
| 1 | status='pending' | skipped |
| 2 | status='completed' | included |

---

### C. Integration Tests

#### C1. Classification Pipeline
| # | תרחיש | רכיבים | תוצאה |
|---|--------|--------|--------|
| 1 | הכנסה מלאה עם Sumit | Classifier+Sumit+Airtable | record נוצר |
| 2 | הכנסה עם fallback ללקוח | Classifier+Clients+Airtable | עובר Sumit, תואם לקוח |
| 3 | הכנסה עם fallback לחוק | Classifier+Rules+Airtable | עובר Sumit+Client, תואם חוק |
| 4 | הוצאה עם חוק override | Classifier+Rules+Airtable | סכום 54.39 במקום 155 |
| 5 | חוק ignore | Classifier+Rules+Airtable | סטטוס 'התעלם', ללא record |
| 6 | סיווג ידני + יצירת חוק | Classifier+Rules+Airtable | record + חוק חדש |
| 7 | מניעת כפילות הכנסה | Classifier+Airtable | רשומה קיימת מקושרת |
| 8 | מניעת כפילות הוצאה (fuzzy) | Classifier+Airtable | רשומה בטולרנס |
| 9 | שדרוג ביטחון אחרי 5 שימושים | Rules+Airtable | confidence='מאושר' |

#### C2. API Endpoints (Supertest)
| # | Endpoint | תרחיש | תוצאה |
|---|----------|--------|--------|
| 1 | POST /api/income | בקשה תקינה + auth | 201 |
| 2 | POST /api/income | ללא סכום | 400 |
| 3 | POST /api/income | ללא auth | 401 |
| 4 | POST /api/expense | בקשה תקינה | 201 |
| 5 | POST /api/expense | ללא קטגוריה | 400 |
| 6 | GET /api/categories?type=income | תקין | קטגוריות הכנסה |
| 7 | GET /api/categories?type=expense | תקין | קטגוריות הוצאה (שדה 'תיאור/הערות') |
| 8 | GET /api/transactions/pending | עם auth | תנועות ממתינות |
| 9 | POST /api/transactions/classify | סיווג תקין | 200 |
| 10 | GET /api/classification-rules | רשימת חוקים | כל החוקים |
| 11 | GET /health | ללא auth | 200 |

#### C3. Telegram Bot Flows
| # | תרחיש | תוצאה |
|---|--------|--------|
| 1 | classify → בחירת קטגוריה → סיווג | flow מלא, הודעה מתעדכנת |
| 2 | ignore → אישור → הצעת חוק | תנועה ignored, הצעת חוק |
| 3 | ignore → אישור → יצירת חוק ignore | חוק ignore ב-Airtable |
| 4 | ignore → ביטול | חזרה למקלדת |
| 5 | ניווט עמודים בקטגוריות | עמוד הבא מוצג |
| 6 | payment app detected | הודעת אזהרה |
| 7 | chat ID תום → usr_tom_001 | userId נכון |
| 8 | chat ID יעל → usr_yael_001 | userId נכון |

#### C4. Scraper Flow
| # | תרחיש | תוצאה |
|---|--------|--------|
| 1 | scrape + dedup | חדשים נכנסים, כפולים נדחים |
| 2 | batch insert >10 | batches של 10 |
| 3 | retry on failure | עד 3 ניסיונות |

#### C5. Classifier Worker
| # | תרחיש | תוצאה |
|---|--------|--------|
| 1 | ללא תנועות ממתינות | סיום מיידי |
| 2 | מיקס auto + manual | auto מסווגים, manual לטלגרם |
| 3 | מניעת ריצה כפולה | ריצה שנייה נדחית |
| 4 | שגיאה בתנועה בודדת | שאר התנועות ממשיכות |

---

### D. E2E Tests

| # | תרחיש | צעדים | תוצאה |
|---|--------|-------|--------|
| 1 | scrape → classify → record | mock bank, classify via rules, verify record | pipeline מלא |
| 2 | scrape → Telegram → manual | scrape, fail auto, Telegram notification, manual classify | flow עם התערבות ידנית |
| 3 | Sumit invoice → scrape → dedup | income via Sumit, scrape same, no duplicate | Layer 0 מונע כפילות |
| 4 | login → create income → verify | auth flow + CRUD | record מופיע ב-recent |
| 5 | login → create expense → verify | auth flow + CRUD | record מופיע |

---

## סדר עדיפויות ליישום

**Phase 1** - פונקציות טהורות (ערך גבוה, ללא mocks):
1. `utils-hash.test.ts`
2. `vat.test.ts`
3. `validation.test.ts`
4. `formatters.test.ts`
5. `keyboards.test.ts`
6. `messages.test.ts`
7. `tabConfigs.test.ts`

**Phase 2** - לוגיקה עסקית (עם mocks):
8. `classifier.test.ts` (isPaymentApp + classifyTransaction)
9. `rules-engine.test.ts`
10. `airtable-helper.test.ts`
11. `middleware-auth.test.ts`
12. `utils-crypto.test.ts`

**Phase 3** - Integration:
13. `classification-pipeline.test.ts`
14. `api-endpoints.test.ts`
15. `telegram-flows.test.ts`

**Phase 4** - Scrapers & Workers:
16. `scraper-manager.test.ts`
17. `classifier-worker.test.ts`

**Phase 5** - Frontend & E2E:
18. Component tests
19. E2E workflow tests

## אימות
- `npx vitest run` - הרצת כל הטסטים
- `npx vitest run --coverage` - עם כיסוי קוד
- target: 80%+ כיסוי על classification/, lib/, telegram/
