# תוכנית יישום: Finances Tracker PWA - MVP

## הקשר (Context)

המשתמש רוצה לבנות Progressive Web App (PWA) למעקב הכנסות והוצאות עם אינטגרציה לאיירטייבל. האפליקציה תותקן על מסך הבית של הטלפון ותאפשר הזנה מהירה של נתונים פינסיים.

**מצב נוכחי:** הפרויקט ריק לחלוטין - אין קבצים, אין תלויות, התחלה מאפס.

**מטרה:** בניית MVP ממוקד בהתחברות + הכנסות בלבד, עם אפשרות להרחבה בעתיד.

**הסיבה למיזם:** צורך באפליקציה פשוטה וזמינה למעקב פיננסי בסיסי, עם גישה מהירה ממכשירים ניידים.

---

## Stack Technolוגי

- **Frontend:** React 18 + TypeScript + Vite
- **Styling:** Tailwind CSS (תמיכה RTL)
- **State Management:** React Context API
- **Backend:** Vercel Edge Functions
- **Database:** Airtable API
- **PWA:** vite-plugin-pwa
- **Deployment:** Vercel
- **Date Handling:** date-fns
- **Icons:** lucide-react

---

## ארכיטקטורת המערכת

```
React PWA (Frontend)
    ↓ API calls
Vercel Edge Functions (Backend API)
    ↓ Airtable SDK
Airtable Base (Database)
```

**זרימת נתונים:**
1. משתמש מתחבר עם סיסמה (authentication)
2. טעינת קטגוריות הכנסה מאיירטייבל
3. הזנת הכנסה חדשה
4. שמירה באיירטייבל דרך Edge Function

---

## מבנה קבצים (Directory Structure)

```
/finances-tracker
├── .env.example                    # Template for Airtable credentials
├── .gitignore
├── package.json
├── tsconfig.json
├── tsconfig.node.json
├── vite.config.ts                  # Vite + PWA configuration
├── tailwind.config.js
├── postcss.config.js
├── vercel.json                     # Vercel Edge Functions config
├── index.html
├── /public
│   ├── manifest.json              # PWA manifest
│   └── icons/
│       ├── icon-192.png           # Placeholder icon
│       └── icon-512.png           # Placeholder icon
├── /api                           # Vercel Edge Functions
│   ├── categories.ts              # GET - Fetch income categories
│   └── income.ts                  # POST - Create income entry
└── /src
    ├── main.tsx                   # Entry point
    ├── App.tsx                    # Root component
    ├── index.css                  # Tailwind + global styles
    ├── vite-env.d.ts
    ├── /components
    │   ├── /auth
    │   │   └── LoginForm.tsx      # Password login component
    │   ├── /income
    │   │   ├── IncomeForm.tsx     # Income entry form (main)
    │   │   └── VatPreview.tsx     # Live VAT calculation display
    │   ├── /layout
    │   │   ├── Header.tsx         # App header with logout
    │   │   └── Layout.tsx         # Main layout wrapper
    │   └── /ui
    │       ├── Button.tsx         # Reusable button
    │       ├── Input.tsx          # Reusable input
    │       ├── Select.tsx         # Reusable select dropdown
    │       └── LoadingSpinner.tsx # Loading indicator
    ├── /context
    │   ├── AuthContext.tsx        # Authentication state
    │   └── CategoriesContext.tsx  # Categories data & loading
    ├── /hooks
    │   ├── useAuth.ts            # Auth convenience hook
    │   ├── useCategories.ts      # Categories hook
    │   └── useIncomeSubmit.ts    # Income submission hook
    ├── /services
    │   ├── api.ts                # API client (fetch wrappers)
    │   └── storage.ts            # localStorage utilities
    ├── /types
    │   ├── auth.types.ts         # Auth interfaces
    │   ├── category.types.ts     # Category interfaces
    │   ├── income.types.ts       # Income interfaces
    │   └── index.ts              # Central exports
    └── /utils
        ├── constants.ts          # App constants
        ├── validation.ts         # Form validation
        ├── formatters.ts         # Number/date formatters
        └── vat.ts                # VAT calculation logic
```

---

## קבצים קריטיים (Critical Files)

### 1. `/src/App.tsx`
**אחראי על:** זרימת Authentication, ניתוב בין Login ל-Main App, עטיפת Providers

**לוגיקה מרכזית:**
- בדיקת `isAuthenticated` מ-`useAuth()`
- אם לא מחובר: הצגת `<LoginForm />`
- אם מחובר: הצגת `<Layout>` עם `<IncomeForm />`
- עטיפה ב-`CategoriesProvider` למשתמשים מחוברים

### 2. `/api/categories.ts`
**אחראי על:** שליפת קטגוריות הכנסה מאיירטייבל

**API Signature:**
```typescript
GET /api/categories
Response: {
  categories: Array<{
    id: string,
    name: string
  }>
}
```

**לוגיקה:**
- חיבור ל-Airtable באמצעות SDK
- שאילתה לטבלת קטגוריות עם פילטר `פעיל = TRUE`
- מיון לפי שם בסדר עולה
- החזרת מערך קטגוריות

**טיפול בשגיאות:**
- 500 אם יש בעיה בחיבור ל-Airtable
- Log מפורט ל-console
- החזרת הודעת שגיאה גנרית ללקוח

### 3. `/api/income.ts`
**אחראי על:** יצירת רשומת הכנסה חדשה באיירטייבל

**API Signature:**
```typescript
POST /api/income
Body: {
  amount: number,
  categoryId: string,
  date: string (ISO),
  vat: string,           // "0" or "0.18"
  vatType: string,       // "לפני/ללא מע"מ" or "לא כולל מע"מ"
  description?: string
}
Response: {
  success: boolean,
  id: string
}
```

**לוגיקה:**
- Validation: amount > 0, categoryId לא ריק, תאריך תקין, vat תקין, vatType תקין
- יצירת record באיירטייבל בטבלת הכנסות
- מיפוי שדות לפי environment variables
- האיירטייבל יחשב אוטומטית את סכום נטו/ברוטו/מע"מ לפי הפורמולות שלו
- החזרת record ID בהצלחה

**Validation Rules:**
- `amount`: חייב להיות מספר חיובי
- `categoryId`: חייב להיות string לא ריק
- `date`: חייב להיות ISO date string תקין
- `vat`: חייב להיות "0" או "0.18"
- `vatType`: חייב להיות אחד מהערכים התקינים
- `description`: אופציונלי

**שדות שנשלחים לאיירטייבל:**
- תאריך
- מקור הכנסה (Linked Record)
- סכום הזנה
- מע"מ
- הזנה עם או בלי מע"מ
- תיאור/הערות (אם קיים)

### 4. `/src/components/income/IncomeForm.tsx`
**אחראי על:** טופס הזנת הכנסה עם validation, VAT calculation ו-UX

**State Management:**
```typescript
{
  amount: string,
  categoryId: string,
  date: string,          // Default: today (yyyy-MM-dd)
  vat: string,           // Default: "0.18"
  vatType: string,       // Default: "לפני/ללא מע"מ"
  description: string
}
```

**תכונות:**
- Auto-focus על שדה הסכום
- תאריך default = היום (format: yyyy-MM-dd)
- מע"מ default = 0.18
- סוג מע"מ default = "לפני/ללא מע"מ" (כולל מע"מ)
- Dropdown קטגוריות נטען מ-`useCategories()`
- **Live VAT Calculation:** הצגת סכום נטו/ברוטו/מע"מ בזמן אמת
- הצגת Loading Spinner בזמן שליחה
- Success message למשך 3 שניות
- Error message אם נכשל
- ניקוי הטופס אחרי הצלחה (חזרה ל-defaults)
- כפתור disabled כשטופס לא תקין או בזמן שליחה

**Flow:**
1. משתמש ממלא שדות (תאריך, קטגוריה, סכום)
2. משתמש בחור מע"מ וסוג מע"מ
3. האפליקציה מחשבת ומציגה: נטו/ברוטו/מע"מ (live preview)
4. לחיצה על "שמור הכנסה"
5. קריאה ל-`useIncomeSubmit().submit()`
6. הצגת "שומר..." על הכפתור
7. הצלחה: הודעה ירוקה + ניקוי טופס + reset ל-defaults
8. כשלון: הודעה אדומה עם פרטי שגיאה

**Live Calculation Component:**
קומפוננטה נפרדת או seection בטופס שמציגה:
```
סכום נטו: ₪5,084.75
סכום מע"מ: ₪915.25
סכום ברוטו: ₪6,000.00
```
(דוגמה עבור: סכום הזנה=6000, מע"מ=0.18, סוג="לפני/ללא מע"מ")

### 5. `/vite.config.ts`
**אחראי על:** הגדרות Build, PWA, Aliases

**תכונות מרכזיות:**
- React plugin
- PWA plugin עם manifest configuration
- Path alias: `@/*` → `./src/*`
- Service Worker: prompt mode (לא אוטומטי)
- PWA manifest: RTL, Hebrew, standalone mode

**PWA Configuration:**
- `registerType: 'prompt'` - המתן לאישור משתמש
- Icons: 192x192 ו-512x512
- `dir: 'rtl'`, `lang: 'he'`
- `display: 'standalone'` - fullscreen app experience
- `theme_color: '#2563eb'` (כחול)

---

## קבצים נוספים חשובים

### `/src/utils/vat.ts`
**אחראי על:** חישוב מע"מ ב-client side (לתצוגה בלבד)

**פונקציה מרכזית:**
```typescript
export function calculateVat(
  amount: number,
  vatRate: number,  // 0 or 0.18
  vatType: "לפני/ללא מע\"מ" | "לא כולל מע\"מ"
): VatCalculation {
  // Implementation based on logic documented above
  return {
    netAmount: number,
    vatAmount: number,
    grossAmount: number
  }
}
```

**שימוש:** קומפוננטת IncomeForm קוראת לפונקציה הזאת כל פעם שמשתנה סכום/מע"מ/סוג כדי להציג live preview.

### `/src/components/income/VatPreview.tsx`
**אחראי על:** הצגת חישובי המע"מ בזמן אמת

**Props:**
```typescript
{
  amount: string,
  vat: string,
  vatType: string
}
```

**תצוגה:**
```tsx
<div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-2">
  <div className="flex justify-between">
    <span className="font-semibold">סכום נטו:</span>
    <span className="font-mono">₪5,084.75</span>
  </div>
  <div className="flex justify-between">
    <span className="font-semibold">סכום מע"מ:</span>
    <span className="font-mono">₪915.25</span>
  </div>
  <div className="flex justify-between border-t pt-2">
    <span className="font-bold">סכום ברוטו:</span>
    <span className="font-mono font-bold">₪6,000.00</span>
  </div>
</div>
```

**לוגיקה:** מקבלת props, קוראת ל-`calculateVat()`, מציגה תוצאות מפורמטות.

---

## Context Providers

### AuthContext
**מטרה:** ניהול מצב התחברות

**State:**
- `isAuthenticated: boolean`
- `login: (password: string) => Promise<boolean>`
- `logout: () => void`

**אחסון:** localStorage (`finances_auth` key)

**MVP Implementation:** בדיקת סיסמה ב-client side (לא מאובטח, מתאים לשימוש אישי בלבד)

**Future:** העברת validation לשרת עם JWT tokens

### CategoriesContext
**מטרה:** ניהול קטגוריות הכנסה

**State:**
- `categories: Category[]`
- `loading: boolean`
- `error: string | null`
- `refetch: () => Promise<void>`

**טעינה:** אוטומטית ב-`useEffect()` בעת mount

**Cache Strategy (Future):** שמירה ב-sessionStorage, רענון פעם ביום

---

## API Endpoints Detailed

### `/api/categories.ts`

**Method:** GET

**Environment Variables Required:**
- `AIRTABLE_API_KEY`
- `AIRTABLE_BASE_ID`
- `AIRTABLE_CATEGORIES_TABLE`
- `AIRTABLE_CATEGORY_NAME_FIELD`
- `AIRTABLE_CATEGORY_ACTIVE_FIELD`

**Airtable Query:**
```javascript
base(tableName).select({
  filterByFormula: `{פעיל} = TRUE()`,
  sort: [{ field: 'שם', direction: 'asc' }]
})
```

**Response Format:**
```json
{
  "categories": [
    { "id": "rec123abc", "name": "משכורת" },
    { "id": "rec456def", "name": "פרילנס" }
  ]
}
```

### `/api/income.ts`

**Method:** POST

**Environment Variables Required:**
- `AIRTABLE_API_KEY`
- `AIRTABLE_BASE_ID`
- `AIRTABLE_INCOME_TABLE`
- `AIRTABLE_INCOME_DATE_FIELD`
- `AIRTABLE_INCOME_CATEGORY_FIELD`
- `AIRTABLE_INCOME_AMOUNT_FIELD`
- `AIRTABLE_INCOME_VAT_FIELD`
- `AIRTABLE_INCOME_VAT_TYPE_FIELD`
- `AIRTABLE_INCOME_DESCRIPTION_FIELD`

**Request Validation:**
```typescript
if (!amount || amount <= 0) return 400
if (!categoryId) return 400
if (!date) return 400
if (!vat || !["0", "0.18"].includes(vat)) return 400
if (!vatType || !["לפני/ללא מע\"מ", "לא כולל מע\"מ"].includes(vatType)) return 400
```

**Airtable Create:**
```javascript
table.create({
  [dateField]: "2025-01-15",
  [categoryField]: ["rec123abc"],  // Array of linked records
  [amountField]: 6000,
  [vatField]: "0.18",
  [vatTypeField]: "לפני/ללא מע\"מ",
  ...(description && { [descriptionField]: "הערה אופציונלית" })
})
```

**הערה חשובה:** האיירטייבל מחשב אוטומטית את השדות הבאים בעזרת פורמולות:
- סכום נטו
- סכום מע"מ
- סכום ברוטו
לכן, אנחנו לא שולחים אותם מהאפליקציה!

**Success Response:**
```json
{
  "success": true,
  "id": "rec789xyz"
}
```

**Error Response:**
```json
{
  "error": "Failed to create income entry",
  "details": "Network timeout"
}
```

---

## סדר יישום (Implementation Order)

### שלב 1: Project Setup (30-45 דקות)

1. **Initialize npm project**
   ```bash
   cd /Users/tomlandau/Code/finances-tracker
   npm init -y
   ```

2. **Install dependencies**
   ```bash
   # Core dependencies
   npm install react react-dom airtable date-fns lucide-react

   # Dev dependencies
   npm install -D vite @vitejs/plugin-react typescript \
     @types/react @types/react-dom \
     tailwindcss postcss autoprefixer \
     vite-plugin-pwa workbox-window vercel
   ```

3. **Initialize Tailwind**
   ```bash
   npx tailwindcss init -p
   ```

4. **Create configuration files:**
   - `tsconfig.json` - TypeScript configuration
   - `tsconfig.node.json` - Node-specific TS config
   - `vite.config.ts` - Vite + PWA plugin
   - `tailwind.config.js` - Tailwind customization
   - `postcss.config.js` - PostCSS for Tailwind
   - `vercel.json` - Edge Functions configuration
   - `.env.example` - Template for credentials
   - `.gitignore` - Exclude node_modules, .env, dist

5. **Create directory structure:**
   ```bash
   mkdir -p src/{components/{auth,income,layout,ui},context,hooks,services,types,utils}
   mkdir -p api
   mkdir -p public/icons
   ```

### שלב 2: Type Definitions (15 דקות)

6. **Create TypeScript types:**
   - `/src/types/auth.types.ts` - AuthState interface
   - `/src/types/category.types.ts` - Category, CategoriesState
   - `/src/types/income.types.ts` - IncomeEntry, IncomeFormData
   - `/src/types/index.ts` - Re-export all types

### שלב 3: Utilities & Services (20 דקות)

7. **Create utility files:**
   - `/src/utils/constants.ts` - App name, keys, formats, VAT options
   - `/src/utils/validation.ts` - Form validation functions
   - `/src/utils/formatters.ts` - Currency, date formatters
   - `/src/utils/vat.ts` - VAT calculation functions

8. **Create services:**
   - `/src/services/storage.ts` - localStorage helpers (auth)
   - `/src/services/api.ts` - API client (fetch wrappers)

**Important:** `/src/utils/vat.ts` חייב להכיל את לוגיקת חישוב המע"מ (נטו/ברוטו/מע"מ) לפי:
- סכום הזנה
- אחוז מע"מ (0 או 0.18)
- סוג הזנה (לפני/אחרי מע"מ)

### שלב 4: Backend API (45 דקות)

9. **Create Edge Functions:**
   - `/api/categories.ts` - Fetch categories from Airtable
   - `/api/income.ts` - Create income entry in Airtable

10. **Setup environment:**
    - Create `.env.example` with placeholder values
    - Document required Airtable field names

**Testing:** Use curl/Postman to test endpoints locally with `vercel dev`

### שלב 5: Context & Hooks (30 דקות)

11. **Build Context providers:**
    - `/src/context/AuthContext.tsx` - Auth state + login/logout
    - `/src/context/CategoriesContext.tsx` - Categories data + loading

12. **Create custom hooks:**
    - `/src/hooks/useAuth.ts` - Shortcut to AuthContext
    - `/src/hooks/useCategories.ts` - Shortcut to CategoriesContext
    - `/src/hooks/useIncomeSubmit.ts` - Income submission logic

### שלב 6: Base UI Components (45 דקות)

13. **Build reusable UI components:**
    - `/src/components/ui/Button.tsx` - Primary/secondary variants
    - `/src/components/ui/Input.tsx` - With label, error display
    - `/src/components/ui/Select.tsx` - Dropdown with options array
    - `/src/components/ui/LoadingSpinner.tsx` - CSS spinner

**Style:** כל הקומפוננטות עם Tailwind, תמיכה RTL, focus states

### שלב 7: Layout Components (20 דקות)

14. **Build layout structure:**
    - `/src/components/layout/Header.tsx` - Title + logout button
    - `/src/components/layout/Layout.tsx` - Wrapper with header + main

### שלב 8: Feature Components (75 דקות)

15. **Build authentication:**
    - `/src/components/auth/LoginForm.tsx` - Password input, validation

16. **Build VAT preview:**
    - `/src/components/income/VatPreview.tsx` - Live calculation display
    - Uses `calculateVat()` from `/src/utils/vat.ts`
    - Shows net/vat/gross amounts formatted

17. **Build income form:**
    - `/src/components/income/IncomeForm.tsx` - Main feature, all fields
    - Integrates `<VatPreview />` component
    - Updates preview when amount/vat/vatType changes

**Key Requirements:**
- Auto-focus על amount input
- Default date = today
- Default VAT = 0.18
- Default VAT type = "לפני/ללא מע\"מ"
- Live VAT calculation preview
- Disable submit when invalid
- Loading states
- Success/error messages
- Form reset after success (back to defaults)

### שלב 9: Application Assembly (30 דקות)

17. **Create root files:**
    - `/index.html` - HTML entry point, RTL, Hebrew lang
    - `/src/index.css` - Tailwind imports, RTL direction
    - `/src/App.tsx` - Main app logic, conditional rendering
    - `/src/main.tsx` - ReactDOM.render with providers
    - `/src/vite-env.d.ts` - Vite type definitions

### שלב 10: PWA Assets (20 דקות)

18. **Add PWA configuration:**
    - `/public/manifest.json` - App name, icons, RTL, Hebrew
    - Create placeholder icons in `/public/icons/`
      - `icon-192.png` - 192x192 blue square with ₪ symbol
      - `icon-512.png` - 512x512 blue square with ₪ symbol

**Tool for Icons:** Use any online SVG-to-PNG converter or placeholder generator

### שלב 11: Local Testing (45 דקות)

19. **Test locally:**
   ```bash
   npm run dev
   ```

**Test Checklist:**
- [ ] Login succeeds with correct password
- [ ] Login fails with wrong password
- [ ] Categories load from Airtable (need real credentials)
- [ ] Income form displays all fields
- [ ] Amount validation works
- [ ] Category dropdown populated
- [ ] Date defaults to today
- [ ] Form submits successfully
- [ ] Success message appears
- [ ] Form resets after submission
- [ ] Error handling works (disconnect network)
- [ ] Logout button works
- [ ] RTL layout correct
- [ ] Mobile responsive

### שלב 12: Airtable Configuration (30 דקות)

20. **Configure Airtable:**
    - Get Base ID from Airtable URL
    - Generate Personal Access Token
    - Note exact table names (Hebrew)
    - Note exact field names (Hebrew)
    - Update `.env.local` with real values

### שלב 13: Vercel Deployment (30 דקות)

21. **Initialize git & push:**
    ```bash
    git init
    git add .
    git commit -m "Initial commit: Finances Tracker MVP"
    git remote add origin <your-repo-url>
    git push -u origin main
    ```

22. **Deploy to Vercel:**
    ```bash
    vercel
    ```
    - Link to GitHub repository
    - Configure environment variables in dashboard
    - Deploy production

23. **Verify production:**
    - Test login
    - Test category loading
    - Test income submission
    - Check Airtable records created

### שלב 14: PWA Testing (30 דקות)

24. **Test PWA functionality:**
    - Open on mobile device (iOS Safari / Android Chrome)
    - Verify "Add to Home Screen" prompt
    - Install app
    - Test standalone mode (no browser UI)
    - Verify icon displays correctly
    - Test app launch from home screen

---

## מבנה Airtable (המדויק)

### טבלאות:
1. **הכנסות** - רשומות הכנסה
2. **מקורות הכנסה** - קטגוריות/מקורות (פעיל/לא פעיל)
3. **הוצאות** - רשומות הוצאה (עתידי)
4. **מקורות הוצאה** - קטגוריות הוצאה (עתידי)

### שדות בטבלת "הכנסות":
- **תאריך** - Date field
- **מקור הכנסה** - Link to record (→ מקורות הכנסה)
- **של מי ההכנסה** - Lookup from מקור הכנסה
- **תחום** - Lookup from מקור הכנסה
- **תיאור/הערות** - Long text (אופציונלי ב-MVP)
- **יצירת הכנסות מחזוריות** - Checkbox (לא ב-MVP)
- **מע"מ** - Single select: `0`, `0.18`
- **הזנה עם או בלי מע"מ** - Single select: `לפני/ללא מע"מ`, `לא כולל מע"מ`
- **סכום הזנה** - Number (זה הסכום שהמשתמש מזין)
- **סכום מע"מ** - Formula (מחושב אוטומטית באיירטייבל)
- **סכום ברוטו** - Formula (מחושב אוטומטית)
- **סכום נטו** - Formula (מחושב אוטומטית)
- **הערות נוספות** - Long text (לא ב-MVP)

### שדות בטבלת "מקורות הכנסה":
- **שם** - Single line text (שם המקור, למשל "משכורת", "פרילנס")
- **של מי ההכנסה** - Single select: `יעל`, `תום`
- **תחום** - Single select (רשימה סגורה, רק לקריאה)
- **סטטוס** - Single select: `פעיל`, `לא פעיל`

### שדות להזנה ב-MVP (בסדר התצוגה):
1. **תאריך** - Date input, default = היום
2. **מקור הכנסה** - Dropdown (רק מקורות עם סטטוס = פעיל)
3. **סכום הזנה** - Number input
4. **מע"מ** - Dropdown: 0, 0.18
5. **הזנה עם או בלי מע"מ** - Dropdown: "לפני/ללא מע"מ", "לא כולל מע"מ"
6. **תיאור/הערות** - Text area (אופציונלי)

### הצגת חישובים (Live Preview):
אחרי שהמשתמש בחר סכום + מע"מ + סוג הזנה, להציג:
- **סכום נטו:** [מחושב]
- **סכום מע"מ:** [מחושב]
- **סכום ברוטו:** [מחושב]

**לוגיקת חישוב המע"מ:**

אם `מע"מ = 0`:
```
סכום נטו = סכום ברוטו = סכום הזנה
סכום מע"מ = 0
```

אם `הזנה עם או בלי מע"מ = "לפני/ללא מע"מ"` (כלומר כולל מע"מ):
```
סכום ברוטו = סכום הזנה
סכום נטו = סכום ברוטו / (1 + מע"מ)
סכום מע"מ = סכום ברוטו - סכום נטו
```

אם `הזנה עם או בלי מע"מ = "לא כולל מע"מ"`:
```
סכום נטו = סכום הזנה
סכום מע"מ = סכום נטו * מע"מ
סכום ברוטו = סכום נטו + סכום מע"מ
```

---

## Environment Variables

### `.env.example` Template

```bash
# Airtable Configuration
AIRTABLE_API_KEY=keyXXXXXXXXXXXXXX
AIRTABLE_BASE_ID=appXXXXXXXXXXXXXX

# Table Names (Hebrew - exact names)
AIRTABLE_INCOME_TABLE=הכנסות
AIRTABLE_INCOME_CATEGORIES_TABLE=מקורות הכנסה
AIRTABLE_EXPENSE_TABLE=הוצאות
AIRTABLE_EXPENSE_CATEGORIES_TABLE=מקורות הוצאה

# Field Names - מקורות הכנסה Table
AIRTABLE_CATEGORY_NAME_FIELD=שם
AIRTABLE_CATEGORY_STATUS_FIELD=סטטוס
AIRTABLE_CATEGORY_OWNER_FIELD=של מי ההכנסה
AIRTABLE_CATEGORY_DOMAIN_FIELD=תחום

# Field Names - הכנסות Table
AIRTABLE_INCOME_DATE_FIELD=תאריך
AIRTABLE_INCOME_CATEGORY_FIELD=מקור הכנסה
AIRTABLE_INCOME_AMOUNT_FIELD=סכום הזנה
AIRTABLE_INCOME_VAT_FIELD=מע"מ
AIRTABLE_INCOME_VAT_TYPE_FIELD=הזנה עם או בלי מע"מ
AIRTABLE_INCOME_DESCRIPTION_FIELD=תיאור/הערות
```

---

## אסטרטגיית Styling (Tailwind CSS)

### עקרונות עיצוב:
- **Mobile-first:** כל העיצוב מתחיל ממובייל
- **RTL:** `dir="rtl"` ב-HTML, `text-right` בברירת מחדל
- **עברית:** פונטים שתומכים בעברית
- **נגישות:** Focus states, keyboard navigation
- **צבעים:**
  - Primary: `#2563eb` (כחול)
  - Success: ירוק (`bg-green-50`, `text-green-700`)
  - Error: אדום (`bg-red-50`, `text-red-700`)
  - Gray scale: Tailwind default

### דוגמת קומפוננטה:
```tsx
<button className="w-full px-4 py-2 rounded-lg font-medium
  bg-primary-600 text-white hover:bg-primary-700
  focus:outline-none focus:ring-2 focus:ring-primary-500
  disabled:opacity-50 transition-colors">
  שמור הכנסה
</button>
```

---

## אסטרטגיית Error Handling

### Client-Side Errors:
1. **Form Validation:** הצגת שגיאות תחת שדות
2. **API Errors:** הצגת הודעה בעברית בראש הטופס
3. **Network Errors:** הצגת "בדוק חיבור לאינטרנט"
4. **Loading States:** Spinner + disable buttons

### Server-Side Errors:
1. **Validation (400):** החזרת שגיאה ספציפית לשדה
2. **Server Error (500):** Log מפורט, החזרת הודעה גנרית
3. **Airtable Errors:** Catch, log, החזרת שגיאה ידידותית

### Error Messages (Hebrew):
- "סכום לא תקין"
- "נא לבחור קטגוריה"
- "תאריך לא תקין"
- "שגיאה בשמירת הנתונים"
- "בדוק חיבור לאינטרנט"

---

## Verification (איך לבדוק שהכל עובד)

### Local Development Testing:
```bash
# Terminal 1: Start dev server
npm run dev

# Terminal 2: Test API endpoints
vercel dev
```

### Manual Test Flow:
1. פתח `http://localhost:5173`
2. הזן סיסמה (ברירת מחדל: `admin123`)
3. וודא שקטגוריות נטענו
4. מלא טופס הכנסה:
   - סכום: 1000
   - קטגוריה: (בחר מהרשימה)
   - תאריך: (השאר היום)
   - הערות: "בדיקה"
5. לחץ "שמור הכנסה"
6. וודא הודעת הצלחה
7. בדוק באיירטייבל שהרשומה נוצרה
8. התנתק ווודא שחזרת ל-login
9. התחבר שוב ווודא ש-session נשמר

### Production Testing:
1. Deploy ל-Vercel
2. פתח את ה-URL הציבורי במובייל
3. הוסף לבית
4. פתח את האפליקציה
5. וודא שהיא נפתחת במצב standalone
6. חזור על Test Flow למעלה

### PWA Testing:
```bash
npm run build
npm run preview
```
- פתח בדפדפן במצב incognito
- בדוק ש-Service Worker נרשם
- בדוק את ה-manifest ב-DevTools > Application
- נסה "Add to Home Screen"

---

## שיפורים עתידיים (Out of Scope for MVP)

### Phase 2: Expense Tracking
- טבלת הוצאות באיירטייבל
- קטגוריות הוצאות
- טופס הוצאות
- Toggle בין הכנסות/הוצאות
- `/api/expense.ts` endpoint

### Phase 3: History View
- רשימת 20 רשומות אחרונות
- Pull-to-refresh
- פילטר לפי תאריך/קטגוריה
- עריכה/מחיקה של רשומות
- `/api/recent.ts` endpoint

### Phase 4: Offline Support
- Service Worker caching מלא
- Queue של submissions כשאופליין
- Sync כשחוזר online
- IndexedDB לאחסון מקומי

### Phase 5: Analytics
- סיכום חודשי
- Charts (הכנסות vs הוצאות)
- התראות על תקציב
- ייצוא CSV/PDF

### Phase 6: Security Enhancement
- JWT authentication
- Refresh tokens
- Server-side password validation
- Rate limiting
- CSRF protection

---

## פתרון בעיות נפוצות (Troubleshooting)

### בעיה: קטגוריות לא נטענות
**פתרון:**
- בדוק credentials ב-`.env.local`
- בדוק שמות טבלאות ושדות באיירטייבל
- בדוק Network tab ב-DevTools
- בדוק logs של Vercel Functions

### בעיה: טופס לא מתאפס אחרי שליחה
**פתרון:**
- וודא שקוראים ל-`setFormData(INITIAL_FORM_STATE)` בהצלחה
- בדוק שה-`success` state מתעדכן

### בעיה: PWA לא מציג prompt להתקנה
**פתרון:**
- וודא HTTPS (Vercel תמיד HTTPS)
- בדוק `manifest.json` ב-DevTools
- בדוק ש-icons קיימים
- iOS: צריך לעשות ידנית דרך Share > Add to Home Screen

### בעיה: RTL לא עובד
**פתרון:**
- וודא `dir="rtl"` ב-`index.html`
- וודא `direction: rtl` ב-`index.css`
- השתמש ב-`text-right` במקום `text-left`

### בעיה: Vercel Functions timeout
**פתרון:**
- Edge Functions יש להן timeout של 10 שניות
- אופטימיזציה של Airtable queries
- שקול caching של קטגוריות

---

## סיכום

זוהי תוכנית מפורטת לבניית MVP של Finances Tracker PWA. התוכנית מתמקדת בפונקציונליות בסיסית (התחברות + הכנסות) תוך שמירה על ארכיטקטורה מודולרית שמאפשרת הרחבה עתידית.

**זמן משוער:** 6-8 שעות עבודה לבניית MVP מלא

**Critical Success Factors:**
1. Airtable base מוכן עם הטבלאות והשדות הנכונים
2. Environment variables מוגדרים נכון
3. בדיקה מקיפה על מכשיר מובייל אמיתי
4. הבנה שה-authentication הוא פשוט ולא מאובטח (MVP בלבד)

**הערה לעתיד:** תוכנית זו מתעדת גם את השיפורים העתידיים (הוצאות, היסטוריה, offline) כדי שנוכל להמשיך בשלבים הבאים בקלות.
