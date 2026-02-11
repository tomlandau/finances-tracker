# Phase 3: History & Reports - Implementation Plan

## Context

The Finances Tracker PWA currently supports income and expense tracking (Phase 1-2). Users can submit new entries with categories, VAT calculation, and recurring flags. However, there's no way to view, edit, or delete existing transactions.

**Phase 3** adds transaction history viewing, filtering, editing, and deletion - essential features for managing financial records over time.

## Requirements (from SPECIFICATION.md)

- רשימת 20 רשומות אחרונות (List of 20 most recent records)
- פילטר לפי תאריך/קטגוריה (Filter by date/category)
- עריכה ומחיקה של רשומות (Edit and delete records)
- Pull-to-refresh

## Architecture Approach

**Navigation:** Add a third tab "היסטוריה" to the existing TransactionTabs component (maintains consistency with current income/expense tabs, no routing library needed).

**State Management:** Create a new `HistoryContext` following the established pattern used in TransactionContext and CategoriesContext.

**Data Fetching:** Fetch from both income and expense Airtable tables in parallel, merge results, sort by date descending.

**Edit Strategy:** Reuse existing IncomeForm/ExpenseForm components with optional `editMode` and `initialData` props. This avoids code duplication while maintaining consistency.

**Update Strategy:** Refetch history after edit/delete operations (simple, ensures consistency with Airtable's formula fields).

---

## Implementation Overview

### 1. API Layer (3 new endpoints)

#### `/api/recent.ts`
**Purpose:** Fetch recent transactions with filtering support

**Query Parameters:**
- `type`: 'all' | 'income' | 'expense' (default: 'all')
- `limit`: number (default: 20, max: 100)
- `startDate`: ISO date string (optional)
- `endDate`: ISO date string (optional)
- `categoryId`: Airtable record ID (optional)

**Implementation:**
1. Fetch from both `הכנסות` and `הוצאות` tables in parallel
2. Use Airtable's `filterByFormula` for date/category filtering:
   ```javascript
   // Date range
   AND(IS_AFTER({תאריך}, '2025-01-01'), IS_BEFORE({תאריך}, '2025-12-31'))

   // Category filter
   FIND('rec123abc', ARRAYJOIN({מקור הכנסה}))
   ```
3. Merge results, sort by date descending, take top N
4. Resolve category names using lookup fields (see Challenge 1 below)

**Response:**
```typescript
{
  transactions: [{
    id: string;
    type: 'income' | 'expense';
    date: string;
    amount: number;
    categoryId: string;
    categoryName: string; // From lookup field
    vat: string;
    vatType: string;
    description?: string;
    isRecurring?: boolean;
    netAmount?: number;
    vatAmount?: number;
    grossAmount?: number;
  }]
}
```

#### `/api/update.ts`
**Purpose:** Update existing income or expense transaction

**Request:**
```typescript
{
  id: string;
  type: 'income' | 'expense';
  fields: {
    amount?: number;
    categoryId?: string;
    date?: string;
    vat?: string;
    vatType?: string;
    description?: string;
    isRecurring?: boolean;
  }
}
```

**Implementation:** Call Airtable's `table.update(recordId, fields)` on the appropriate table based on type.

#### `/api/delete.ts`
**Purpose:** Delete a transaction

**Request:**
```typescript
{
  id: string;
  type: 'income' | 'expense';
}
```

**Implementation:** Call Airtable's `table.destroy(recordId)` on the appropriate table.

---

### 2. UI Structure

#### New Tab
**Modify:** `src/components/transaction/TransactionTabs.tsx`

Add third tab:
```typescript
const tabs = [
  { id: 'income', label: 'הכנסות' },
  { id: 'expense', label: 'הוצאות' },
  { id: 'history', label: 'היסטוריה' } // NEW
];
```

**Update:** `src/types/transaction.types.ts`
```typescript
export type TransactionType = 'income' | 'expense' | 'history';
```

#### History View Layout
```
<HistoryView>
  <HistoryFilters />        // Collapsible filter controls
  <TransactionList />        // List of transaction cards
    <TransactionCard />      // Individual card with Edit/Delete buttons
  <EditTransactionModal />   // Modal with pre-filled form
  <DeleteConfirmation />     // Confirmation modal
</HistoryView>
```

**Conditional Rendering in `src/App.tsx`:**
```typescript
{type === 'income' ? (
  <IncomeForm />
) : type === 'expense' ? (
  <ExpenseForm />
) : (
  <HistoryView /> // NEW
)}
```

#### TransactionCard Design
Visual differentiation: green accent for income, red accent for expense.

Display fields:
- Category name (with icon)
- Date
- Amount (gross)
- Net amount | VAT amount
- Recurring indicator (if applicable)
- Edit and Delete buttons

#### HistoryFilters Component
Collapsible filter panel with:
- Type dropdown: All/Income/Expense
- Category combobox (reuses existing Combobox component)
- Date range: start/end date inputs
- Apply/Clear buttons
- Active filter count badge

Default state: collapsed

---

### 3. State Management

**New Context:** `src/context/HistoryContext.tsx`

```typescript
interface HistoryState {
  transactions: Transaction[];
  filters: {
    type: 'all' | 'income' | 'expense';
    categoryId?: string;
    startDate?: string;
    endDate?: string;
  };
  loading: boolean;
  error?: string;

  // Actions
  fetchTransactions: () => Promise<void>;
  setFilters: (filters: Partial<Filters>) => void;
  clearFilters: () => void;
  refresh: () => Promise<void>;
  deleteTransaction: (id: string, type: 'income' | 'expense') => Promise<boolean>;
}
```

**Pattern:** Follows existing TransactionContext pattern with useCallback for actions.

---

### 4. Edit/Delete Functionality

#### Edit Flow
1. User clicks Edit button → opens `EditTransactionModal`
2. Modal renders IncomeForm or ExpenseForm based on transaction type
3. Form receives `editMode={true}` and `initialData={transaction}`
4. Form submission calls `/api/update` instead of `/api/income` or `/api/expense`
5. On success: close modal, show success message, refetch history

**Form Modifications:**
Update `src/components/income/IncomeForm.tsx` and `src/components/expense/ExpenseForm.tsx`:

```typescript
interface FormProps {
  editMode?: boolean;
  initialData?: Transaction;
  transactionId?: string;
  onSuccess?: () => void;
}

// Initialize form state
const [formData, setFormData] = useState<FormData>(
  initialData ? mapTransactionToFormData(initialData) : INITIAL_FORM_STATE
);

// Handle submit
if (editMode && transactionId) {
  await api.updateTransaction(transactionId, type, formData);
  onSuccess?.();
} else {
  await submit(formData);
}
```

#### Delete Flow
1. User clicks Delete → opens `DeleteConfirmation` modal
2. Modal shows transaction details (category, amount, date)
3. On confirm: call `/api/delete`, show success, refetch history
4. On cancel: close modal

---

### 5. Pull-to-Refresh

Use touch events for custom implementation:

```typescript
const handleTouchStart = (e: TouchEvent) => setStartY(e.touches[0].clientY);
const handleTouchMove = (e: TouchEvent) => {
  const diff = e.touches[0].clientY - startY;
  if (diff > 80 && window.scrollY === 0) setPulling(true);
};
const handleTouchEnd = async () => {
  if (pulling) {
    await refresh();
    setPulling(false);
  }
};
```

---

## Critical Files

### New Files (12)

**API (3):**
1. `/api/recent.ts` - Fetch transactions with filters
2. `/api/update.ts` - Update transaction
3. `/api/delete.ts` - Delete transaction

**Components (6):**
4. `/src/components/history/HistoryView.tsx` - Main container
5. `/src/components/history/HistoryFilters.tsx` - Filter controls
6. `/src/components/history/TransactionList.tsx` - List renderer
7. `/src/components/history/TransactionCard.tsx` - Individual transaction card
8. `/src/components/history/EditTransactionModal.tsx` - Edit modal
9. `/src/components/history/DeleteConfirmation.tsx` - Delete confirmation

**State & Types (3):**
10. `/src/context/HistoryContext.tsx` - History state management
11. `/src/hooks/useHistory.ts` - History context hook
12. `/src/types/history.types.ts` - Transaction, Filters types

### Modified Files (8)

13. `src/components/transaction/TransactionTabs.tsx` - Add history tab
14. `src/App.tsx` - Conditional rendering for HistoryView
15. `src/types/transaction.types.ts` - Extend TransactionType
16. `src/components/income/IncomeForm.tsx` - Add edit mode
17. `src/components/expense/ExpenseForm.tsx` - Add edit mode
18. `src/services/api.ts` - Add fetchRecent, updateTransaction, deleteTransaction
19. `.env.example` - Add formula/lookup field env vars
20. `dev-server.js` - Add routes for new API endpoints

**Total: 20 files (12 new, 8 modified)**

---

## Environment Variables

**Add to `.env.example` and `.env.local`:**

```bash
# Lookup Fields for Category Names
AIRTABLE_INCOME_CATEGORY_NAME_LOOKUP=שם מקור הכנסה
AIRTABLE_EXPENSE_CATEGORY_NAME_LOOKUP=שם מקור הוצאה

# Formula/Calculated Fields - הכנסות
AIRTABLE_INCOME_NET_FIELD=סכום נטו
AIRTABLE_INCOME_VAT_AMOUNT_FIELD=סכום מע"מ
AIRTABLE_INCOME_GROSS_FIELD=סכום ברוטו

# Formula/Calculated Fields - הוצאות
AIRTABLE_EXPENSE_NET_FIELD=סכום נטו
AIRTABLE_EXPENSE_VAT_AMOUNT_FIELD=סכום מע"מ
AIRTABLE_EXPENSE_GROSS_FIELD=סכום ברוטו
```

---

## Implementation Sequence

### Phase 3.1: Read-Only History (Foundation)
1. Add formula field env vars to `.env.example`
2. Create `history.types.ts`
3. Create `/api/recent.ts` + dev-server route
4. Create `HistoryContext.tsx` with basic fetch
5. Create `useHistory.ts` hook
6. Extend TransactionType to include 'history'
7. Add history tab to TransactionTabs
8. Create basic `HistoryView.tsx` with list display
9. Create `TransactionCard.tsx` (read-only)
10. Test basic display

### Phase 3.2: Filtering
11. Enhance HistoryContext with filters state
12. Create `HistoryFilters.tsx`
13. Enhance `/api/recent.ts` with filter logic
14. Test all filter combinations

### Phase 3.3: Pull-to-Refresh
15. Add refresh function to HistoryContext
16. Implement pull-to-refresh in HistoryView
17. Test on mobile device

### Phase 3.4: Delete
18. Create `/api/delete.ts` + dev-server route
19. Create `DeleteConfirmation.tsx`
20. Add delete function to HistoryContext and API service
21. Add delete button to TransactionCard
22. Test delete flow

### Phase 3.5: Edit
23. Create `/api/update.ts` + dev-server route
24. Modify IncomeForm for edit mode
25. Modify ExpenseForm for edit mode
26. Create `EditTransactionModal.tsx`
27. Add edit button to TransactionCard
28. Update API service with updateTransaction method
29. Test edit flow for both income and expense

### Phase 3.6: Polish
30. Add loading states (skeleton cards)
31. Add error states with retry
32. Add empty states
33. Test edge cases (empty history, filter with no results)
34. Mobile responsive testing
35. Update README if needed

---

## Key Challenges & Solutions

### Challenge 1: Resolving Category Names from Linked Records

**Problem:** Airtable linked records return only IDs, not names.

**Solution:** Use Airtable lookup fields in the transactions tables:
- In `הכנסות` table: Add lookup field "שם מקור הכנסה" → looks up "שם" from "מקור הכנסה"
- In `הוצאות` table: Add lookup field "שם מקור הוצאה" → looks up "תיאור/הערות" from "מקור הוצאה"

This allows the API to fetch category names directly without additional queries.

### Challenge 2: Merging Income + Expense Transactions

Fetch both tables in parallel, map to common Transaction type with `type` field, merge arrays, sort by date descending:

```typescript
const [incomeRecords, expenseRecords] = await Promise.all([
  incomeTable.select({ /* filters */ }).all(),
  expenseTable.select({ /* filters */ }).all()
]);

const allTransactions = [
  ...incomeRecords.map(r => ({ ...mapRecord(r), type: 'income' })),
  ...expenseRecords.map(r => ({ ...mapRecord(r), type: 'expense' }))
]
  .sort((a, b) => new Date(b.date) - new Date(a.date))
  .slice(0, limit);
```

### Challenge 3: Dev Server Synchronization

**Critical:** Both Vercel Edge Functions (`/api/*.ts`) and Express dev server (`dev-server.js`) must implement identical logic for all three new endpoints.

**Testing:** Test locally with dev server AND in Vercel preview deployment to ensure parity.

---

## Verification Plan

### Manual Testing Checklist

**History Display:**
- [ ] History tab appears and loads 20 recent transactions
- [ ] Shows both income and expense transactions
- [ ] Visual differentiation (green/red accents)
- [ ] All fields display correctly (date, category, amounts)

**Filtering:**
- [ ] Type filter (all/income/expense) works
- [ ] Category filter works
- [ ] Date range filter works (start only, end only, both)
- [ ] Clear filters resets all
- [ ] No results shows appropriate message

**Pull-to-Refresh:**
- [ ] Pull down on mobile triggers refresh
- [ ] Loading indicator shows
- [ ] Data updates after refresh

**Edit:**
- [ ] Edit button opens modal with pre-filled form
- [ ] All fields editable
- [ ] Validation works
- [ ] Submit updates Airtable record
- [ ] Success message appears
- [ ] List refreshes with updated data

**Delete:**
- [ ] Delete button opens confirmation
- [ ] Confirmation shows transaction details
- [ ] Cancel closes without deleting
- [ ] Confirm deletes record
- [ ] Success message appears
- [ ] List refreshes without deleted item

**Loading/Error States:**
- [ ] Initial load shows skeleton/spinner
- [ ] Network error shows error message with retry
- [ ] Edit/Delete errors display appropriately

**Edge Cases:**
- [ ] Empty history shows message
- [ ] No filter results shows message
- [ ] Long category names don't break layout
- [ ] Large amounts display correctly
- [ ] Recurring transactions show indicator

---

## Out of Scope (Future Enhancements)

- Infinite scroll / pagination beyond 20
- Batch delete
- Export to CSV/PDF
- Advanced filters (amount range, recurring only)
- Search by description text
- Sort options
- Undo delete
- Optimistic updates (currently refetch for simplicity)
