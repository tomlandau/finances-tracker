# Feature: Auto-Classification Alerts & Logging

## מה
הוספת התראות Telegram (לתום בלבד) עם סיכום יומי של כל תנועה שסווגה אוטומטית, יחד עם logging מובנה של שרשרת ההחלטות (classification trail) לכל תנועה.

## למה
סיווגים אוטומטיים שגויים עברו מתחת לרדאר — לא הייתה שום התרעה כשחוק סיווג תפס תנועה שגויה (כמו תשלומי ביט שסווגו כהכנסה). הפיצ'ר יאפשר לתום לראות ולאמת את כל הסיווגים האוטומטיים.

## Acceptance Criteria
- [ ] `formatAutoClassificationDigest(items)` מחזיר `null` אם אין פריטים, ו-HTML message אחרת
- [ ] הודעה כוללת: סכום ₪, תאריך, קטגוריה, pattern של חוק, ⚠️ לאפליקציות תשלום
- [ ] רשימה נחתכת ב-15 פריטים עם "ועוד N..."
- [ ] תווי HTML (‹, ›, &) מוחלפים ב-HTML entities
- [ ] `ClassificationTrail` נבנה בכל ריצת סיווג ומצורף ל-`ClassificationResult`
- [ ] כל layer מתועד ב-trail עם `tried`, `matched`, `detail`, `durationMs`
- [ ] Worker שולח digest לתום בסיום כל ריצה שיש בה ≥1 סיווגים אוטומטיים
- [ ] כשל בשליחת digest לא קורס את הווקר
- [ ] כל הטסטים עוברים (`npm test`)

## קבצים צפויים להשתנות
- `classification/types.ts` — Add `ClassificationTrailStep`, `ClassificationTrail`, `trail?` on `ClassificationResult`
- `classification/classifier.ts` — Build trail per layer, attach to result, log JSON
- `telegram/messages.ts` — Add `escapeHtml()`, `AutoClassificationItem`, `formatAutoClassificationDigest()`
- `jobs/classifier-worker.ts` — Collect auto-classification details, send digest to Tom only
- `tests/unit/telegram/messages.test.ts` — Digest formatter tests (Step 1)
- `tests/unit/classification/classifier.test.ts` — Trail tests (Step 3)
- `tests/unit/classification/classifier-worker.test.ts` — **קובץ חדש** — Worker digest tests (Step 5)

## הערות
- TDD: Red → Green → Refactor (ראה CLAUDE.md ו-docs/auto-classification-alerts-plan.md)
- הדייג'סט נשלח לתום בלבד (TOM_CHAT_ID), לא ליעל
- הסיכום הקיים לתום ויעל נשאר ללא שינוי
- ה-trail מודפס ל-console כ-JSON: `[CLASSIFICATION_TRAIL] {...}`
