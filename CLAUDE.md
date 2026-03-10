# Finances Tracker - Claude Code Instructions

## TDD Workflow (חובה!)

**מעכשיו עובדים TDD: Red → Green → Refactor**

### עקרון ה-TDD
1. **Red** - כתוב טסט שנכשל *לפני* שכותבים קוד
2. **Green** - כתוב את המינימום קוד כדי שהטסט יעבור
3. **Refactor** - נקה את הקוד, ודא שהטסטים עדיין עוברים

### לפני כל פיצ'ר חדש או באג פיקס:
1. כתוב טסט קודם ב-`tests/` בתיקייה המתאימה
2. הרץ `npm test` וודא שהטסט נכשל (Red)
3. כתוב קוד עד שהטסט עובר (Green)
4. רפקטר אם צריך, הרץ שוב (Refactor)

---

## פקודות טסטים

```bash
npm test                  # הרצת כל הטסטים (CI mode)
npm run test:watch        # watch mode לפיתוח
npm run test:coverage     # עם כיסוי קוד
```

**Target**: 80%+ כיסוי על `classification/`, `lib/`, `telegram/`

---

## מבנה תיקיות טסטים

```
tests/
  setup.ts                    # env vars גלובליים לטסטים
  unit/
    lib/                      # lib/*.ts
    classification/           # classification/*.ts
    telegram/                 # telegram/*.ts
    frontend/                 # src/utils/*.ts
  integration/                # טסטי אינטגרציה
  e2e/                        # טסטים end-to-end
```

---

## כללים לכתיבת טסטים

### מה לכלול
- כל פונקציה ציבורית חדשה → טסט unit
- כל endpoint API חדש → טסט integration
- כל באג שתוקן → טסט regression (שמוכיח שהבאג נפתר)
- edge cases: null, empty string, Hebrew text, negative numbers

### מה להימנע
- אל תכתוב טסטים ש-mock כל דבר (unit + integration יחד)
- אל תבדוק implementation details - בדוק behavior
- אל תשתמש ב-`any` כדי לעקוף TypeScript בטסטים

### Mocking
- Airtable: השתמש ב-`vi.fn().mockResolvedValue(...)` עם interface מלא
- Express req/res: צור `makeReq`/`makeRes` helpers
- Timers: `vi.useFakeTimers()` + `vi.useRealTimers()` ב-afterEach

---

## שלבי הטסטים (סטטוס נוכחי)

### Phase 1 ✅ - פונקציות טהורות (ללא mocks)
- [x] `utils-hash.test.ts`
- [x] `vat.test.ts`
- [x] `validation.test.ts`
- [x] `formatters.test.ts`
- [x] `keyboards.test.ts`
- [x] `messages.test.ts`
- [x] `tabConfigs.test.ts`

### Phase 2 ✅ - לוגיקה עסקית (עם mocks)
- [x] `classifier.test.ts` (isPaymentApp)
- [x] `rules-engine.test.ts` (matching, priority, cache)
- [x] `middleware-auth.test.ts`
- [x] `utils-crypto.test.ts`

### Phase 2 (המשך) - TODO
- [ ] `airtable-helper.test.ts` (B6-B10: dedup, entity mapping, override amount, 422 handling)
- [ ] `classifier.test.ts` (B11: classifyTransaction pipeline)
- [ ] `sumit-client.test.ts` (B12)
- [ ] `clients-matcher.test.ts` (B13)

### Phase 3 - Integration - TODO
- [ ] `classification-pipeline.test.ts`
- [ ] `api-endpoints.test.ts`
- [ ] `telegram-flows.test.ts`

### Phase 4 - Scrapers & Workers - TODO
- [ ] `scraper-manager.test.ts`
- [ ] `classifier-worker.test.ts`

---

## Framework

- **Vitest** (תואם ל-Vite + ESM + TypeScript)
- **Config**: `vitest.config.ts` בשורש הפרויקט
- **Setup**: `tests/setup.ts` (env vars גלובליים)
- `globals: true` - אפשר `describe`, `it`, `expect` ללא import

---

## חוקי Git (עבור Claude)

1. **תמיד** הרץ `npm test` לפני commit
2. אם הטסטים נכשלים → תקן לפני commit
3. כל PR חייב לכלול טסטים לקוד החדש
4. אל תדלג על טסטים בגלל "לא חשוב" - כל קוד חייב טסט
