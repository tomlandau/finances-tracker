# Plan: Add Ignore Rules + Scraping Diagnosis

## Context
The project has a working daily scraper (bank + credit cards) and classification engine. Two issues to address:
1. No "permanent ignore" rule type - when a recurring transaction should always be skipped, user must manually click "התעלם" each time in Telegram
2. Credit card scraping fails periodically - need to diagnose and surface the errors better

---

## Part 1: Implement "Ignore Rule" Type

### Current State
- `חוקי סיווג` table has rules that always create income/expense records
- `shouldIgnoreTransaction()` in `scraper-manager.ts` only has 2 hardcoded patterns
- When user clicks "התעלם" in Telegram → marks transaction as "התעלם", but no rule is created

### Goal
- Add an "ignore" rule type to `חוקי סיווג`
- Transactions matching an ignore rule → automatically marked "התעלם" without Telegram notification
- When user clicks "התעלם" in Telegram → offer to also create a permanent ignore rule

### Airtable Change Required (manual)
Add a checkbox field `התעלם` (boolean) to the `חוקי סיווג` table in Airtable.
- Rules with this field checked = ignore rules
- No category field required for ignore rules - just `תיאור` (pattern) and `התעלם` checkbox

### Code Changes

#### 1. `classification/types.ts`
- Add `isIgnoreRule?: boolean` to the `ClassificationRule` interface
- Add `'ignored'` as a valid `ClassificationMethod`

#### 2. `classification/rules-engine.ts`
- In `loadRules()`: fetch the `התעלם` field from Airtable, map to `isIgnoreRule`
- In `findMatchingRule()`: return ignore rules at highest priority (before income/expense rules)
- Return a special result indicating "ignore this transaction"

#### 3. `classification/classifier.ts`
- In the Layer 3 handling: if rules engine returns ignore result →
  - Call `airtableHelper.updateTransactionStatus(id, 'התעלם')`
  - Return `{ success: true, method: 'ignored' }` - no income/expense record created

#### 4. `telegram/handlers.ts`
- When user confirms "התעלם" action → after marking as ignored, send follow-up message:
  "האם ליצור חוק קבוע? הודעות דומות יסוננו אוטומטית."
  with Yes/No buttons
- If Yes → call `airtableHelper.createIgnoreRule(description, pattern)`

#### 5. `classification/airtable-helper.ts`
- Add `createIgnoreRule(transactionDescription: string)` method:
  - Extracts a reasonable pattern from description (or uses full description)
  - Creates record in `חוקי סיווג` with `התעלם: true`, pattern from description

### Files to Modify
- `classification/types.ts`
- `classification/rules-engine.ts`
- `classification/classifier.ts`
- `telegram/handlers.ts`
- `classification/airtable-helper.ts`

---

## Part 2: Scraping Failure Diagnosis

### How to Check What's Failing
1. Open Telegram and scroll back to last scraper notification (sent at ~06:00 Israel time)
2. The message shows per-account success/failure + error messages
3. If needed: hit `GET /api/scraper/status` to see last run details
4. Vercel logs: Dashboard → Functions → daily-scraper or scraper-trigger

### Common Failures for CAL/Max
- `INVALID_PASSWORD` → credentials expired, need to re-encrypt and update env var
- Timeout / network errors → site changed, need `israeli-bank-scrapers` version bump
- `ACCOUNT_BLOCKED` → requires manual login on bank website first

### Code Change: Better Error Surface (optional)
Currently errors are logged but may not surface the root cause clearly. We can add:
- Include the exact `errorMessage` from the scraper in the Telegram failure notification (already partially implemented in `daily-scraper.ts`)
- Add retry with delay of 10 minutes for the specific failed accounts (separate cron run)

This part is diagnostic first - once we see the actual errors, we'll know if code changes are needed.

---

## Verification
1. In Airtable, add a rule with `התעלם: true` and a matching pattern
2. Insert a test transaction with that pattern (or wait for next scrape)
3. Run classifier manually via API → verify transaction gets status "התעלם" without Telegram message
4. In Telegram, click "התעלם" on a real transaction → verify "create permanent rule" offer appears
5. Confirm rule created in Airtable `חוקי סיווג` table
