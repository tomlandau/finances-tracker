# Finances Tracker PWA

Progressive Web App למעקב הכנסות והוצאות אישיות עם אינטגרציה ל-Airtable.

## ✨ Features (MVP)

- 📱 **PWA** - התקנה על מסך הבית
- 💰 **Income Tracking** - מעקב הכנסות עם 38 קטגוריות
- 🧮 **Live VAT Calculator** - חישוב מע"מ בזמן אמת
- 🔍 **Autocomplete Search** - חיפוש מהיר של קטגוריות
- 🇮🇱 **RTL Hebrew** - ממשק מלא בעברית
- 📊 **Airtable Integration** - שמירה אוטומטית בענן

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- Airtable account with configured base

### Installation

```bash
# Install dependencies
npm install

# Create environment file
cp .env.example .env.local
# Edit .env.local with your Airtable credentials

# Run development server
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

## 📚 Documentation

- [📋 Full Specification](docs/SPECIFICATION.md) - אפיון מפורט
- [📝 Implementation Plan](docs/PLAN.md) - תוכנית יישום

## 🛠 Tech Stack

- **Frontend:** React 18 + TypeScript + Vite
- **Styling:** Tailwind CSS 3.x
- **Backend:** Vercel Edge Functions (Express in dev)
- **Database:** Airtable
- **PWA:** vite-plugin-pwa

## 📦 Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run preview      # Preview production build
npm run type-check   # Run TypeScript checks
```

## 🔐 Environment Variables

Required variables in `.env.local`:

```bash
AIRTABLE_API_KEY=patXXXXXXXXXXXXXX
AIRTABLE_BASE_ID=appXXXXXXXXXXXXXX
# ... see .env.example for full list
```

## 📱 PWA Installation

### iOS (Safari)
1. Open the app in Safari
2. Tap Share button
3. Tap "Add to Home Screen"

### Android (Chrome)
1. Open the app in Chrome
2. Tap the menu (⋮)
3. Tap "Add to Home Screen"

## 🎯 MVP Scope

**Included:**
- ✅ Authentication (simple password)
- ✅ Income entry form
- ✅ Live VAT calculation
- ✅ Category autocomplete
- ✅ Airtable integration

**Future Phases:**
- 📝 Expense tracking
- 📊 History & reports
- 📴 Offline support
- 🔒 Enhanced security (JWT)

## 🐛 Known Limitations

- Client-side auth only (not secure for production)
- Single user support
- No editing of past entries
- Requires internet connection

## 📸 Screenshots

> Add screenshots here after deployment

## 🤝 Contributing

This is a personal project. For major changes, please open an issue first.

## 📄 License

ISC

---

**Status:** ✅ MVP Complete
**Version:** 1.0.0
**Last Updated:** 2025-01-10

Built with ❤️ and Claude Code
