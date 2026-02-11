# 📱 מדריך למובייל - Finances Tracker PWA

## בדיקה במחשב (Chrome DevTools)

### 1. הרץ את האפליקציה:
```bash
npm run dev
```

### 2. פתח Chrome DevTools:
- לחץ F12 או Cmd+Option+I (Mac)
- בחר "Device Toolbar" (Ctrl+Shift+M / Cmd+Shift+M)
- בחר מכשיר: iPhone 14 Pro / Galaxy S23 וכו'

### 3. בדוק PWA:
- פתח את ה-Application tab ב-DevTools
- בחר "Service Workers" - ודא שה-SW רשום
- בחר "Manifest" - ודא שכל הפרטים נכונים

## התקנה על מובייל אמיתי

### iOS (Safari):
1. פתח את האתר ב-Safari
2. לחץ על כפתור השיתוף (↑)
3. גלול למטה ובחר "Add to Home Screen"
4. תן שם לאפליקציה ולחץ "Add"
5. האייקון יופיע על המסך הראשי

### Android (Chrome):
1. פתח את האתר ב-Chrome
2. לחץ על התפריט (⋮)
3. בחר "Add to Home screen" או "Install app"
4. אשר את ההתקנה
5. האפליקציה תופיע כאפליקציה רגילה

## תכונות PWA

✅ **עבודה אופליין** - האפליקציה תעבוד גם ללא אינטרנט (המידע יישמר מקומית)

✅ **התראות על עדכונים** - תקבל התראה כשיש גרסה חדשה

✅ **מסך מלא** - האפליקציה תופעל במסך מלא ללא כפתורי הדפדפן

✅ **אייקון על המסך הראשי** - נראית כמו אפליקציה רגילה

✅ **תמיכה ב-notch** - הממשק מתאים למכשירים עם notch/dynamic island

## בדיקות שכדאי לעשות

### חוויית משתמש:
- [ ] פתיחת מקלדת מספרית בשדה הסכום
- [ ] גודל כפתורים נוח למגע
- [ ] אין זום לא רצוי בעת מילוי טפסים
- [ ] Autocomplete עובד חלק
- [ ] התראת הצלחה/שגיאה קריאות

### PWA:
- [ ] התקנה על המסך הראשי עובדת
- [ ] האפליקציה נפתחת במסך מלא
- [ ] התראה על גרסה חדשה מופיעה
- [ ] Service Worker רשום ב-DevTools

### עיצוב:
- [ ] כל הטקסט קריא (גודל מינימלי)
- [ ] הכפתורים לא קטנים מדי
- [ ] אין overlap עם notch/status bar
- [ ] הצבעים והגופנים נכונים

## בעיות ידועות ופתרונות

### ⚠️ אייקונים PNG חסרים
**הבעיה:** האייקונים PNG (192x192, 512x512) עדיין לא נוצרו

**הפתרון:** השתמש באחת מהאפשרויות:
1. **Online Tool**: https://svgtopng.com
   - העלה את `public/icons/icon.svg`
   - צור שני גדלים: 192x192 ו-512x512
   - שמור בתיקיית `public/icons/`

2. **ImageMagick** (אם מותקן):
   ```bash
   brew install imagemagick
   cd public/icons
   convert icon.svg -resize 192x192 icon-192.png
   convert icon.svg -resize 512x512 icon-512.png
   ```

3. **Figma/Photoshop**: פתח את ה-SVG וייצא כ-PNG בגדלים הנדרשים

### אין אינטרנט בטלפון
- האפליקציה תשתמש ב-Service Worker cache
- נתונים חדשים יישמרו מקומית ויסונכרנו כשיש חיבור

### האפליקציה לא מתעדכנת
- רענן את הדפדפן (Pull to refresh)
- אם יש גרסה חדשה, תקבל התראה עם אפשרות לרענן

## Deploy ל-Production

כשאתה מפרסם ל-Vercel:

```bash
npm run build
vercel --prod
```

הקפד:
1. לוודא שה-.env.local מוגדר ב-Vercel
2. לבדוק את האפליקציה על מובייל אמיתי אחרי הדיפלוי
3. לבדוק שה-HTTPS עובד (נדרש ל-PWA)

## טיפים נוספים

- **iOS Safari**: לפעמים צריך לרענן פעמיים אחרי התקנה
- **Chrome Android**: מומלץ להשתמש בדפדפן Chrome ולא ב-WebView של אפליקציות אחרות
- **Testing**: השתמש ב-Lighthouse (DevTools → Lighthouse) כדי לבדוק את ציון ה-PWA

## קישורים שימושיים

- [PWA Checklist](https://web.dev/pwa-checklist/)
- [iOS PWA Guidelines](https://developer.apple.com/documentation/webkit/adding_a_web_app_to_the_home_screen)
- [Android PWA Guidelines](https://developer.chrome.com/docs/android/trusted-web-activity/)
