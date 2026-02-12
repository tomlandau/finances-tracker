# App Redesign: 6-Tab Architecture with FAB

## Context

The current finances tracker has a 3-tab system (Income/Expense/History) where forms are embedded in tabs. Users requested a redesign for better operational workflow:

**Problem:**
- Need to see transactions grouped by owner/category
- Want quick access to add transactions without switching modes
- Monthly view more relevant than all-time history

**Solution:**
- 6 tabs showing filtered transactions (Tom/Yael income, business expenses by owner, home expenses)
- Each tab defaults to current month with month selector
- Floating Action Button (FAB) for quick add
- Summary totals at top of each tab

## Requirements

### Tab Structure (6 tabs)
1. **הכנסות תום** - Filter: income, של מי ההכנסה=תום
2. **הכנסות יעל** - Filter: income, של מי ההכנסה=יעל
3. **הוצאות עסק תום** - Filter: expense, עסקי/בית=עסק תום
4. **הוצאות עסק יעל** - Filter: expense, עסקי/בית=עסק יעל
5. **הוצאות עסק משותף** - Filter: expense, עסקי/בית=עסק - משותף
6. **הוצאות בית** - Filter: expense, עסקי/בית=בית (DEFAULT)

### Features Per Tab
- Default filter: current month
- Month selector (prev/next navigation)
- Summary card showing total income/expense
- Transaction list
- FAB (Floating Action Button) opens add modal with pre-filtered categories

### Changes from Current
- ✅ Remove "היסטוריה" all-view tab
- ✅ Remove embedded forms from tabs
- ✅ Add FAB for quick entry
- ✅ Add month filtering and navigation
- ✅ Add summary totals

---

## Architecture Design

### 1. New Tab System

**Replace TransactionContext with TabContext:**

```typescript
// types/tab.types.ts
export type TabId = 'tom-income' | 'yael-income' | 'tom-business' |
                    'yael-business' | 'shared-business' | 'home';

export interface TabConfig {
  id: TabId;
  label: string;
  transactionType: 'income' | 'expense';
  filters: {
    owner?: 'תום' | 'יעל';              // For income
    businessHome?: string;              // For expense
  };
}
```

**Tab Configurations (utils/tabConfigs.ts):**
```typescript
export const TAB_CONFIGS: TabConfig[] = [
  { id: 'tom-income', label: 'הכנסות תום', transactionType: 'income', filters: { owner: 'תום' } },
  { id: 'yael-income', label: 'הכנסות יעל', transactionType: 'income', filters: { owner: 'יעל' } },
  { id: 'tom-business', label: 'הוצאות עסק תום', transactionType: 'expense', filters: { businessHome: 'עסק תום' } },
  { id: 'yael-business', label: 'הוצאות עסק יעל', transactionType: 'expense', filters: { businessHome: 'עסק יעל' } },
  { id: 'shared-business', label: 'הוצאות עסק משותף', transactionType: 'expense', filters: { businessHome: 'עסק - משותף' } },
  { id: 'home', label: 'הוצאות בית', transactionType: 'expense', filters: { businessHome: 'בית' } }
];

export const DEFAULT_TAB: TabId = 'home';
```

**TabContext (context/TabContext.tsx):**
- Manages current tab selection
- Persists selection to localStorage('selected-tab')
- Provides `useTab()` hook

---

### 2. Transaction View (TabView Component)

**New Component: components/transaction/TabView.tsx**

Replaces current HistoryView. For each tab:

```typescript
<TabView tab={tabConfig}>
  <MonthSelector />           // Prev/next buttons + "ינואר 2026"
  <SummaryCard />             // Total: ₪X,XXX.XX (Y תנועות)
  <TransactionList />         // Same as current, reused
</TabView>
```

**Month State:**
- Default: current month (format: 'yyyy-MM')
- Derives startDate/endDate from selected month
- Fetches transactions via `useTabTransactions(tab, startDate, endDate)`

**MonthSelector UI (RTL):**
```
[>] [ינואר 2026] [<]
```

**SummaryCard:**
- Shows total (sum of transaction amounts)
- Shows count
- Color: primary blue background

---

### 3. FAB (Floating Action Button)

**New Component: components/ui/FAB.tsx**

**Position:** Bottom-left (RTL standard)
- Desktop: `bottom: 24px; left: 24px;`
- Mobile: `bottom: 16px; left: 16px;`

**Design:**
- 56px circle (14 = 3.5rem on desktop, 12 = 3rem on mobile)
- Primary blue bg
- White + icon
- Tooltip on hover: "הוסף תנועה"
- Opens AddTransactionModal

---

### 4. Add Form Modal

**New Component: components/transaction/AddTransactionModal.tsx**

Wraps existing IncomeForm/ExpenseForm:

```typescript
<AddTransactionModal isOpen onClose tab={currentTab}>
  {tab.transactionType === 'income' ? (
    <IncomeForm onSuccess={close} filterOwner={tab.filters.owner} />
  ) : (
    <ExpenseForm onSuccess={close} filterBusinessHome={tab.filters.businessHome} />
  )}
</AddTransactionModal>
```

**Pattern:** Reuses EditTransactionModal structure (full-screen overlay, click-outside-to-close)

**Form Modifications:**
- Add optional `filterOwner` prop to IncomeForm
- Add optional `filterBusinessHome` prop to ExpenseForm
- Add optional `onSuccess` callback (closes modal, refreshes transactions)

---

### 5. Category Filtering

**Client-Side Filtering in CategoriesContext:**

```typescript
// Add to CategoriesContext:
getFilteredIncomeCategories(owner?: string): Category[]
getFilteredExpenseCategories(businessHome?: string): Category[]
```

**Forms use filtered categories:**
```typescript
const { getFilteredIncomeCategories } = useCategories();
const categories = getFilteredIncomeCategories(filterOwner);
```

**Backend Enhancement (api/recent.ts):**
- Currently returns: `categoryName: string`
- Should return: Full category object with metadata (owner, businessHome, etc.)
- Enables client-side filtering by category fields

---

### 6. App Structure

**New App.tsx:**

```typescript
<TabProvider>
  <CategoriesProvider>
    <HistoryProvider>
      <AppContent>
        <Layout>
          <TransactionTabs />  {/* 6 tabs */}
          <TabView />          {/* Current tab view */}
        </Layout>
        <FAB />                {/* Fixed position */}
        <AddTransactionModal /> {/* Conditional render */}
      </AppContent>
    </HistoryProvider>
  </CategoriesProvider>
</TabProvider>
```

**Removed:**
- Conditional IncomeForm/ExpenseForm rendering
- TransactionContext (replaced by TabContext)
- HistoryFilters component (filtering now via tabs)

---

## Implementation Plan

### New Files (10)

1. **`src/types/tab.types.ts`** - TabId, TabConfig types
2. **`src/utils/tabConfigs.ts`** - TAB_CONFIGS constant, DEFAULT_TAB
3. **`src/context/TabContext.tsx`** - Tab state + localStorage persistence
4. **`src/hooks/useTab.ts`** - Hook for TabContext
5. **`src/hooks/useTabTransactions.ts`** - Fetch transactions for tab + month
6. **`src/components/transaction/TabView.tsx`** - Main tab display component
7. **`src/components/transaction/MonthSelector.tsx`** - Month navigation UI
8. **`src/components/transaction/SummaryCard.tsx`** - Summary totals display
9. **`src/components/ui/FAB.tsx`** - Floating action button
10. **`src/components/transaction/AddTransactionModal.tsx`** - Add form wrapper

### Modified Files (8)

11. **`src/App.tsx`** - Complete restructure (remove forms, add FAB, use TabContext)
12. **`src/components/transaction/TransactionTabs.tsx`** - Update to 6 tabs, use TabContext
13. **`src/components/income/IncomeForm.tsx`** - Add `filterOwner` and `onSuccess` props
14. **`src/components/expense/ExpenseForm.tsx`** - Add `filterBusinessHome` and `onSuccess` props
15. **`src/context/CategoriesContext.tsx`** - Add filtered getters
16. **`src/types/index.ts`** - Export new tab types
17. **`api/recent.ts`** - Return full category metadata (not just name)
18. **`dev-server.js`** - Mirror api/recent.ts changes

### Removed Files (3)

19. **`src/components/history/HistoryFilters.tsx`** - No longer needed
20. **`src/context/TransactionContext.tsx`** - Replaced by TabContext
21. **`src/hooks/useTransactionType.ts`** - Replaced by useTab

**Total:** 21 files touched (10 new, 8 modified, 3 removed)

---

## Implementation Sequence

### Phase 1: Foundation
1. Create tab types and configs
2. Create TabContext + useTab hook
3. Create FAB component (test independently)

### Phase 2: View Components
4. Create MonthSelector component
5. Create SummaryCard component
6. Create useTabTransactions hook
7. Create TabView component

### Phase 3: Forms & Modal
8. Create AddTransactionModal
9. Modify IncomeForm (add filter props)
10. Modify ExpenseForm (add filter props)
11. Update CategoriesContext (add filtered getters)

### Phase 4: Integration
12. Update App.tsx (new structure)
13. Update TransactionTabs (6 tabs)
14. Update API for category metadata
15. Remove deprecated files
16. Test all edge cases

### Phase 5: Polish
17. Mobile testing
18. Accessibility audit
19. Performance optimization

---

## Critical Files

**Must modify first (core architecture):**
- `src/types/tab.types.ts`
- `src/utils/tabConfigs.ts`
- `src/context/TabContext.tsx`
- `src/App.tsx`
- `src/components/transaction/TabView.tsx`

**High priority (core features):**
- `src/hooks/useTabTransactions.ts`
- `src/components/ui/FAB.tsx`
- `src/components/transaction/AddTransactionModal.tsx`
- `src/context/CategoriesContext.tsx`
- `api/recent.ts`

---

## Verification Plan

### Manual Testing Checklist

**Tab Navigation:**
- [ ] All 6 tabs appear correctly
- [ ] Tab labels in Hebrew
- [ ] Default tab is "הוצאות בית"
- [ ] Tab selection persists on page reload (localStorage)
- [ ] Clicking tab switches view

**Month Filtering:**
- [ ] Default month is current month
- [ ] Prev/next arrows navigate months correctly
- [ ] Month display in Hebrew (ינואר 2026)
- [ ] Transactions filter to selected month
- [ ] Empty state shows when no transactions

**Summary Display:**
- [ ] Shows correct total for visible transactions
- [ ] Shows transaction count
- [ ] Updates when month changes
- [ ] Different labels for income vs expense

**FAB:**
- [ ] Appears at bottom-left on all tabs
- [ ] Tooltip shows on hover
- [ ] Opens modal on click
- [ ] Responsive size (smaller on mobile)

**Add Modal:**
- [ ] Opens with correct form (income vs expense)
- [ ] Categories pre-filtered by tab
- [ ] Close on click outside
- [ ] Close on cancel button
- [ ] Close on successful submit
- [ ] Refreshes transactions after submit

**Category Filtering:**
- [ ] Tom income shows only Tom categories
- [ ] Yael income shows only Yael categories
- [ ] Business expense tabs show correct עסקי/בית values
- [ ] Home expense shows only "בית" categories

**Edge Cases:**
- [ ] Empty category list handling
- [ ] No transactions for selected month
- [ ] Network errors display properly
- [ ] Tab switch closes modal
- [ ] Form validation still works
- [ ] Long category lists scroll properly

**Mobile:**
- [ ] FAB positioned correctly
- [ ] Month selector usable with touch
- [ ] Modal scrolls properly
- [ ] RTL layout correct

---

## Reused Components (No Changes)

All UI components remain unchanged:
- Button, Input, Select, Combobox, Checkbox
- LoadingSpinner, CategoryDetails, VatPreview
- TransactionCard, TransactionList
- EditTransactionModal, DeleteConfirmation
- Layout, Header

This minimizes risk and maintains consistency.
