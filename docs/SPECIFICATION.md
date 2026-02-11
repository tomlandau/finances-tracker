# Finances Tracker - Technical Specification

## Overview
Progressive Web App (PWA) למעקב הכנסות והוצאות אישיות עם אינטגרציה מלאה ל-Airtable.

## Scope - MVP
**פאזה 1 (MVP):** התחברות + מעקב הכנסות בלבד
**פאזות עתידיות:** הוצאות, היסטוריה, offline support, analytics

---

## Tech Stack

### Frontend
- **Framework:** React 18 + TypeScript
- **Build Tool:** Vite
- **Styling:** Tailwind CSS 3.x
- **State Management:** React Context API
- **Date Handling:** date-fns
- **Icons:** lucide-react
- **PWA:** vite-plugin-pwa

### Backend
- **Development:** Express dev server (localhost:3001)
- **Production:** Vercel Edge Functions
- **Database:** Airtable (via REST API)

### Development Tools
- TypeScript 5.x
- ESLint + Prettier
- Git for version control

---

## Features - MVP

### 1. Authentication
- **Type:** Client-side password validation (MVP only)
- **Storage:** localStorage
- **Security Note:** לא מאובטח, מתאים לשימוש אישי בלבד
- **Future:** JWT tokens + server-side validation

### 2. Income Tracking
**טופס הזנת הכנסה:**
- תאריך (default: היום)
- מקור הכנסה (autocomplete dropdown מ-38 קטגוריות)
- סכום הזנה (number input)
- מע"מ (0% או 18%)
- סוג הזנה (לפני/ללא מע"מ או כולל מע"מ)
- תיאור/הערות (אופציונלי)

**Live VAT Calculation:**
- תצוגה בזמן אמת של:
  - סכום נטו
  - סכום מע"מ
  - סכום ברוטו
- חישוב אוטומטי בהתאם לסוג ההזנה

### 3. Category Management
- טעינה דינמית מ-Airtable
- רק קטגוריות פעילות
- Autocomplete search
- מיון אלפביתי

### 4. PWA Features
- Installable on mobile home screen
- RTL support (Hebrew)
- Responsive design (mobile-first)
- Manifest.json with icons
- Service Worker (prompt mode)

---

## Airtable Structure

### Tables

#### 1. הכנסות (Income Records)
| Field Name | Type | Description |
|------------|------|-------------|
| תאריך | Date | תאריך ההכנסה |
| מקור הכנסה | Linked Record | קישור לטבלת מקורות הכנסה |
| סכום הזנה | Number | הסכום שהמשתמש מזין |
| מע"מ | Single Select | "0" או "0.18" |
| הזנה עם או בלי מע"מ | Single Select | "לפני/ללא מע"מ" או "כולל מע"מ" |
| תיאור/הערות | Long Text | אופציונלי |
| סכום נטו | Formula | מחושב אוטומטית |
| סכום מע"מ | Formula | מחושב אוטומטית |
| סכום ברוטו | Formula | מחושב אוטומטית |

#### 2. מקורות הכנסה (Income Categories)
| Field Name | Type | Description |
|------------|------|-------------|
| שם | Single Line Text | שם הקטגוריה |
| סטטוס | Single Select | "פעיל" או "לא פעיל" |
| של מי ההכנסה | Single Select | בעלות |
| תחום | Single Select | תחום העיסוק |

---

## VAT Calculation Logic

### אם מע"מ = 0:
```
סכום נטו = סכום ברוטו = סכום הזנה
סכום מע"מ = 0
```

### אם הזנה = "לפני/ללא מע"מ" (NET):
```
סכום נטו = סכום הזנה
סכום מע"מ = סכום נטו × מע"מ
סכום ברוטו = סכום נטו + סכום מע"מ
```

**דוגמה:** הזנה 1000₪, מע"מ 18%
- נטו: 1000₪
- מע"מ: 180₪
- ברוטו: 1180₪

### אם הזנה = "כולל מע"מ" (GROSS):
```
סכום ברוטו = סכום הזנה
סכום נטו = סכום ברוטו ÷ (1 + מע"מ)
סכום מע"מ = סכום ברוטו - סכום נטו
```

**דוגמה:** הזנה 1180₪, מע"מ 18%
- ברוטו: 1180₪
- נטו: 1000₪
- מע"מ: 180₪

---

## API Endpoints

### GET /api/categories
**Purpose:** שליפת קטגוריות הכנסה פעילות

**Response:**
```json
{
  "categories": [
    {
      "id": "rec123abc",
      "name": "משכורת"
    }
  ]
}
```

**Airtable Query:**
- Table: מקורות הכנסה
- Filter: סטטוס = "פעיל"
- Sort: שם (ascending)

### POST /api/income
**Purpose:** יצירת רשומת הכנסה חדשה

**Request Body:**
```json
{
  "amount": 1000,
  "categoryId": "rec123abc",
  "date": "2025-01-15",
  "vat": "0.18",
  "vatType": "לפני/ללא מע\"מ",
  "description": "הערה אופציונלית"
}
```

**Response:**
```json
{
  "success": true,
  "id": "rec789xyz"
}
```

**Validation:**
- amount > 0
- categoryId not empty
- date valid ISO format
- vat in ["0", "0.18"]
- vatType in ["לפני/ללא מע\"מ", "כולל מע\"מ"]

---

## Environment Variables

### Required for Development (.env.local)
```bash
# Airtable Authentication
AIRTABLE_API_KEY=patXXXXXXXXXXXXXX

# Airtable Base
AIRTABLE_BASE_ID=appXXXXXXXXXXXXXX

# Table Names
AIRTABLE_INCOME_TABLE=הכנסות
AIRTABLE_INCOME_CATEGORIES_TABLE=מקורות הכנסה

# Category Fields
AIRTABLE_CATEGORY_NAME_FIELD=שם
AIRTABLE_CATEGORY_STATUS_FIELD=סטטוס

# Income Fields
AIRTABLE_INCOME_DATE_FIELD=תאריך
AIRTABLE_INCOME_CATEGORY_FIELD=מקור הכנסה
AIRTABLE_INCOME_AMOUNT_FIELD=סכום הזנה
AIRTABLE_INCOME_VAT_FIELD=מע"מ
AIRTABLE_INCOME_VAT_TYPE_FIELD=הזנה עם או בלי מע"מ
AIRTABLE_INCOME_DESCRIPTION_FIELD=תיאור/הערות
```

---

## UI/UX Requirements

### Design Principles
- **Mobile-First:** כל העיצוב מתחיל ממובייל
- **RTL:** תמיכה מלאה בעברית מימין לשמאל
- **Accessibility:** Focus states, keyboard navigation
- **Simplicity:** ממשק נקי ופשוט לשימוש

### Color Palette
- **Primary:** #2563eb (כחול)
- **Success:** ירוק (bg-green-50, text-green-700)
- **Error:** אדום (bg-red-50, text-red-700)
- **Gray Scale:** Tailwind default

### Responsive Breakpoints
- Mobile: < 640px
- Tablet: 640px - 1024px
- Desktop: > 1024px

---

## File Structure
```
/finances-tracker
├── docs/
│   ├── SPECIFICATION.md (this file)
│   └── PLAN.md
├── api/
│   ├── categories.ts
│   └── income.ts
├── src/
│   ├── components/
│   │   ├── auth/
│   │   ├── income/
│   │   ├── layout/
│   │   └── ui/
│   ├── context/
│   ├── hooks/
│   ├── services/
│   ├── types/
│   └── utils/
├── public/
│   ├── icons/
│   └── manifest.json
├── dev-server.js
├── vite.config.ts
├── tailwind.config.js
└── package.json
```

---

## Phase 2: Expense Tracking ✅

### Tables

#### 3. הוצאות (Expense Records)
| Field Name | Type | Description |
|------------|------|-------------|
| תאריך | Date | תאריך ההוצאה |
| מקור הוצאה | Linked Record | קישור לטבלת מקורות הוצאה |
| עסקי/בית | Lookup | מ-מקור הוצאה |
| תחום | Lookup | מ-מקור הוצאה |
| סוג הוצאה | Lookup | מ-מקור הוצאה |
| תאריך חידוש הוצאה | Formula | חישוב תאריך ההוצאה הבאה לפי סוג ההוצאה |
| יצירת הוצאות מחזוריות | Checkbox | האם ליצור אוטומטית הוצאות חוזרות |
| מע"מ | Single Select | "0" או "0.18" |
| הזנה עם או בלי מע"מ | Single Select | "לפני/ללא מע"מ" או "כולל מע"מ" |
| סכום הזנה | Number | הסכום שהמשתמש מזין |
| סכום נטו | Formula | מחושב אוטומטית |
| סכום מע"מ | Formula | מחושב אוטומטית |
| סכום ברוטו | Formula | מחושב אוטומטית |
| הערות נוספות | Long Text | אופציונלי |

#### 4. מקורות הוצאה (Expense Categories)
| Field Name | Type | Options/Description |
|------------|------|---------------------|
| תיאור/הערות | Long Text | **שם הקטגוריה** (משמש כ-name field) |
| עסקי/בית | Single Select | עסק תום, עסק יעל, עסק - משותף, בית |
| תחום | Single Select | רשימה פנימית בטבלה |
| סוג הוצאה | Single Select | קבועה חודשית, קבועה שנתית, משתנה, קבועה דו שנתית, חד פעמית, קבועה שבוטלה, קבועה דו חודשית, קבועה חודשית עם סכום משתנה |
| סטטוס | Single Select | "פעיל" או "לא פעיל" |

**Important Note:** Unlike income categories which use "שם" as the name field, expense categories use **"תיאור/הערות"** as the category name field.

### API Endpoints - Phase 2

#### GET /api/categories?type=expense
**Purpose:** שליפת קטגוריות הוצאה פעילות

**Response:**
```json
{
  "categories": [
    {
      "id": "rec123abc",
      "name": "Sumit - תום"
    }
  ]
}
```

**Airtable Query:**
- Table: מקורות הוצאה
- Filter: סטטוס = "פעיל"
- Sort: תיאור/הערות (ascending)

#### POST /api/expense
**Purpose:** יצירת רשומת הוצאה חדשה

**Request Body:**
```json
{
  "amount": 1000,
  "categoryId": "rec123abc",
  "date": "2025-01-15",
  "vat": "0.18",
  "vatType": "לפני/ללא מע\"מ",
  "description": "הערה אופציונלית"
}
```

**Response:**
```json
{
  "success": true,
  "id": "rec789xyz"
}
```

### Environment Variables - Phase 2

Add to .env.local:
```bash
# Expense Tables
AIRTABLE_EXPENSE_TABLE=הוצאות
AIRTABLE_EXPENSE_CATEGORIES_TABLE=מקורות הוצאה

# Expense Category Fields
AIRTABLE_EXPENSE_CATEGORY_NAME_FIELD=תיאור/הערות
AIRTABLE_EXPENSE_CATEGORY_STATUS_FIELD=סטטוס

# Expense Record Fields
AIRTABLE_EXPENSE_DATE_FIELD=תאריך
AIRTABLE_EXPENSE_CATEGORY_FIELD=מקור הוצאה
AIRTABLE_EXPENSE_AMOUNT_FIELD=סכום הזנה
AIRTABLE_EXPENSE_VAT_FIELD=מע"מ
AIRTABLE_EXPENSE_VAT_TYPE_FIELD=הזנה עם או בלי מע"מ
AIRTABLE_EXPENSE_DESCRIPTION_FIELD=הערות נוספות
```

## Future Enhancements (Out of Scope)

### Phase 3: History & Reports
- רשימת 20 רשומות אחרונות
- פילטר לפי תאריך/קטגוריה
- עריכה ומחיקה של רשומות
- Pull-to-refresh

### Phase 3: History & Reports
- רשימת 20 רשומות אחרונות
- פילטר לפי תאריך/קטגוריה
- עריכה ומחיקה של רשומות
- Pull-to-refresh

### Phase 4: Offline Support
- Service Worker caching מלא
- Queue של submissions כשאופליין
- Sync כשחוזר online
- IndexedDB לאחסון מקומי

### Phase 5: Analytics & Reports
- סיכום חודשי
- גרפים (הכנסות vs הוצאות)
- התראות על תקציב
- ייצוא CSV/PDF

### Phase 6: Security Enhancement
- JWT authentication
- Refresh tokens
- Server-side password validation
- Rate limiting
- CSRF protection

---

## Development Setup

### Prerequisites
- Node.js 18+
- npm or yarn
- Airtable account with configured base

### Installation
```bash
# Clone repository
git clone <repo-url>
cd finances-tracker

# Install dependencies
npm install

# Create .env.local with Airtable credentials
cp .env.example .env.local
# Edit .env.local with your values

# Run development server
npm run dev
```

### Available Scripts
- `npm run dev` - Start dev server (Vite + Express)
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run type-check` - TypeScript type checking

---

## Deployment

### Vercel (Recommended)
1. Push code to GitHub
2. Connect repository to Vercel
3. Add environment variables in Vercel dashboard
4. Deploy

### Environment Variables (Production)
- Set all Airtable variables in Vercel dashboard
- Never commit .env.local to git

---

## Testing Checklist

### Functionality
- [ ] Login works with correct password
- [ ] Categories load from Airtable
- [ ] All form fields display correctly
- [ ] VAT calculation updates live
- [ ] Form submission succeeds
- [ ] Success message appears
- [ ] Form resets after success
- [ ] Error handling works
- [ ] Logout works

### UI/UX
- [ ] RTL layout correct
- [ ] Mobile responsive
- [ ] Autocomplete works
- [ ] All text in Hebrew
- [ ] Loading states visible
- [ ] Error messages in Hebrew

### PWA
- [ ] Manifest loads correctly
- [ ] Icons display
- [ ] "Add to Home Screen" works
- [ ] Standalone mode works
- [ ] Offline page (future)

---

## Known Limitations (MVP)

1. **Security:** Client-side authentication only
2. **Single User:** No multi-user support
3. **No History:** Can't view past entries in app
4. **No Editing:** Can't edit entries after creation
5. **No Offline:** Requires internet connection
6. **No Validation:** Limited client-side validation only

---

## Contact & Support
For issues or questions, refer to the main README.md

---

**Document Version:** 1.0
**Last Updated:** 2025-01-10
**Status:** MVP Complete ✅
