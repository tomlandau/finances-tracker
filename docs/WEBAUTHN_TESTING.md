# WebAuthn Testing Guide - Phase 5 Implementation

## מה יושם?

✅ **Backend (API Endpoints):**
- `/api/auth/webauthn/register-options` - יצירת challenge לרישום
- `/api/auth/webauthn/register-verify` - אימות ושמירת credential
- `/api/auth/webauthn/login-options` - יצירת challenge להתחברות
- `/api/auth/login-webauthn` - השלמת התחברות
- `/api/auth/webauthn/credentials` - רשימת credentials של משתמש

✅ **Frontend (Components):**
- `TwoFactorChoice` - בחירה בין TOTP ל-WebAuthn
- `WebAuthnSetup` - רישום טביעת אצבע/FaceID
- `WebAuthnPrompt` - התחברות עם ביומטריה
- עדכונים ל-`LoginForm` ו-`AuthContext`

✅ **Infrastructure:**
- טבלת Airtable: "WebAuthn Credentials"
- משתני סביבה: `WEBAUTHN_RP_ID`, `WEBAUTHN_ORIGIN`
- ספריות: `@simplewebauthn/server`, `@simplewebauthn/browser`

---

## דרישות מערכת

### תמיכה בדפדפנים:
- ✅ **Android Chrome 70+** - עם Fingerprint Sensor
- ✅ **Windows Chrome/Edge** - עם Windows Hello
- ✅ **Android PWA** - אפליקציה מותקנת
- ⚠️ **iOS Safari PWA** - רק אם PWA מותקן (לא Safari רגיל)
- ❌ **iOS Safari רגיל** - לא נתמך

### בדיקת תמיכה:
```javascript
// בקונסול הדפדפן:
PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()
  .then(available => console.log('WebAuthn supported:', available))
```

---

## הגדרת סביבת פיתוח

### 1. וידוא משתני סביבה

ב-`.env.local`:
```bash
# WebAuthn Configuration
WEBAUTHN_RP_ID=localhost
WEBAUTHN_ORIGIN=http://localhost:5173

# Airtable
AIRTABLE_WEBAUTHN_TABLE=WebAuthn Credentials
```

### 2. אתחול טבלת Airtable

וודא שטבלת "WebAuthn Credentials" קיימת עם השדות הבאים:
- `Credential ID` (Single Line Text)
- `User ID` (Single Line Text)
- `Username` (Single Line Text)
- `Public Key` (Long Text)
- `Counter` (Number)
- `Device Name` (Single Line Text)
- `Created At` (DateTime)
- `Last Used` (DateTime)
- `AAGUID` (Single Line Text)
- `Transports` (Long Text)

### 3. הפעלת שרת

```bash
npm run dev
```

---

## תרחישי בדיקה (Test Scenarios)

### Scenario 1: רישום WebAuthn למשתמש חדש

**תנאי התחלה:** משתמש ללא 2FA

**שלבים:**
1. התחבר עם username + password
2. המערכת תציג: "בחר שיטת אימות"
3. לחץ על "אימות ביומטרי"
4. (אופציונלי) הזן שם מכשיר (לדוגמה: "Pixel 8 של תום")
5. לחץ "הפעל אימות ביומטרי"
6. **הדפדפן יבקש:** סריקת טביעת אצבע/FaceID
7. סרוק טביעת אצבע
8. ✅ הצלחה: "האימות הביומטרי הופעל בהצלחה!"
9. מעבר לאפליקציה הראשית

**בדיקת Airtable:**
- טבלת "WebAuthn Credentials" צריכה להכיל רשומה חדשה
- `Username` = שם המשתמש שלך
- `Device Name` = השם שהזנת
- `Created At` = זמן הרישום

**בדיקת Audit Log:**
- Action = "2fa_setup"
- Resource = "webauthn"
- Success = true

---

### Scenario 2: התחברות עם WebAuthn

**תנאי התחלה:** משתמש עם WebAuthn רשום

**שלבים:**
1. התחבר עם username + password
2. המערכת תציג אוטומטית: "אימות ביומטרי"
3. **הדפדפן יבקש:** סריקת טביעת אצבע/FaceID
4. סרוק טביעת אצבע
5. ✅ הצלחה: מעבר ישירות לאפליקציה

**בדיקת Airtable:**
- טבלת "WebAuthn Credentials"
- `Last Used` עודכן לזמן ההתחברות
- `Counter` עלה ב-1 (מונה חתימות)

**בדיקת Audit Log:**
- Action = "login"
- Resource = "webauthn"
- Details = device name

---

### Scenario 3: החלפה בין WebAuthn ל-TOTP

**תנאי התחלה:** משתמש עם TOTP וגם WebAuthn

**שלבים (התחברות):**
1. התחבר עם username + password
2. המערכת תציג WebAuthn prompt (default)
3. לחץ "השתמש ב-TOTP במקום"
4. ✅ המערכת תציג הזנת קוד TOTP
5. הזן קוד → התחברות מצליחה

**שלבים (החלפה בכיוון ההפוך):**
1. במסך TOTP, לחץ "השתמש באימות ביומטרי במקום"
2. ✅ המערכת תציג WebAuthn prompt

---

### Scenario 4: מכשיר לא תומך

**תנאי התחלה:** דפדפן ללא תמיכת WebAuthn

**שלבים:**
1. התחבר עם username + password
2. במסך "בחר שיטת אימות"
3. ✅ אפשרות "אימות ביומטרי" מושבתת
4. הודעה: "אימות ביומטרי לא זמין"
5. לחץ "אפליקציית Authenticator" → TOTP setup

---

### Scenario 5: ביטול רישום

**שלבים:**
1. במסך WebAuthn setup
2. לחץ "דלג" לפני סריקת טביעת אצבע
3. ✅ חזרה למסך "בחר שיטת אימות"
4. אפשר לבחור TOTP במקום

---

### Scenario 6: שגיאת אימות

**שלבים:**
1. התחבר עם username + password
2. במסך WebAuthn prompt
3. לחץ "ביטול" בחלון הדפדפן (לא סרק טביעת אצבע)
4. ✅ הודעת שגיאה: "האימות בוטל"
5. כפתור "נסה שוב" זמין
6. אפשרות "השתמש ב-TOTP במקום"

---

## בדיקות אבטחה (Security Tests)

### Test 1: Replay Attack Prevention
**מטרה:** וודא שלא ניתן לשחזר תגובת authentication

**שלבים:**
1. התחבר עם WebAuthn (פתוח DevTools > Network)
2. שמור את ה-request ל-`/api/auth/login-webauthn`
3. התנתק
4. נסה לשלוח שוב את אותו request (Replay)
5. ✅ צריך להיכשל עם "Invalid challenge"

### Test 2: Counter Validation
**מטרה:** וודא שה-counter עולה בכל שימוש

**שלבים:**
1. בדוק counter באיירטייבל (לדוגמה: 5)
2. התחבר עם WebAuthn
3. בדוק counter שוב
4. ✅ צריך להיות 6 (עלה ב-1)

### Test 3: Cross-User Attack
**מטרה:** וודא שלא ניתן להשתמש ב-credential של משתמש אחר

**שלבים:**
1. רשום WebAuthn עבור tom
2. התנתק
3. התחבר בתור yael עם password
4. נסה להשתמש בטביעת האצבע של tom
5. ✅ צריך להיכשל

---

## Debugging

### בדיקת Support בדפדפן
```javascript
// בקונסול:
console.log('WebAuthn support:', window.PublicKeyCredential !== undefined);
console.log('Platform authenticator:', await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable());
```

### בדיקת Errors
אם הרישום נכשל, בדוק:

1. **"WebAuthn is not supported"**
   - דפדפן לא תומך
   - נסה Chrome/Edge
   - ב-iOS - התקן כ-PWA

2. **"Not allowed"**
   - HTTPS נדרש (לוקלהוסט OK)
   - Origin לא תואם ל-WEBAUTHN_ORIGIN
   - בדוק משתני סביבה

3. **"Registration verification failed"**
   - Challenge לא תקף (פג תוקף אחרי 5 דקות)
   - RP ID לא תואם
   - בדוק WEBAUTHN_RP_ID=localhost

4. **"Credential not found"**
   - לא נמצא credential באיירטייבל
   - בדוק שהטבלה "WebAuthn Credentials" קיימת
   - בדוק ש-User ID תואם

### Network Inspection

**רישום מצליח:**
```
POST /api/auth/webauthn/register-options
→ { options, challengeToken }

POST /api/auth/webauthn/register-verify
→ { success: true, credential }
```

**התחברות מצליחה:**
```
POST /api/auth/login
→ { requireTotp: true, hasWebAuthn: true, tempToken }

POST /api/auth/webauthn/login-options
→ { options, challengeToken }

POST /api/auth/login-webauthn
→ { success: true, user }
+ Set-Cookie: accessToken, refreshToken
```

---

## Production Deployment

### Vercel Environment Variables

הוסף ב-Vercel Dashboard:
```bash
WEBAUTHN_RP_ID=your-app.vercel.app
WEBAUTHN_ORIGIN=https://your-app.vercel.app
AIRTABLE_WEBAUTHN_TABLE=WebAuthn Credentials
```

### Railway Environment Variables

הוסף ב-Railway Dashboard:
```bash
WEBAUTHN_RP_ID=your-app.up.railway.app
WEBAUTHN_ORIGIN=https://your-app.up.railway.app
AIRTABLE_WEBAUTHN_TABLE=WebAuthn Credentials
```

**⚠️ חשוב:**
- Production דורש HTTPS (לא HTTP)
- RP ID צריך להיות domain בלבד (ללא protocol)
- Origin צריך להיות URL מלא (עם https://)

---

## Known Limitations

1. **iOS Safari** - לא תומך ב-WebAuthn מחוץ ל-PWA
2. **Multiple Devices** - כל מכשיר צריך רישום נפרד
3. **Backup** - אם המשתמש מאבד את המכשיר, צריך TOTP כ-fallback
4. **Cross-Device** - Credential של Android לא עובד ב-Windows וההפך

---

## Success Criteria

✅ **Must Pass:**
- [ ] רישום WebAuthn מצליח על Android Chrome
- [ ] התחברות עם WebAuthn מצליחה
- [ ] Counter עולה בכל שימוש
- [ ] Audit log נוצר
- [ ] Replay attack נכשל
- [ ] Graceful fallback ל-TOTP אם WebAuthn נכשל

✅ **Nice to Have:**
- [ ] עובד על Windows Hello
- [ ] הודעות שגיאה ברורות בעברית
- [ ] UI/UX חלק ללא lag

---

## Next Steps

1. **בדיקות ידניות** - עבור על כל התרחישים
2. **בדיקה על מכשירים שונים** - Android, Windows, iOS PWA
3. **Documentation** - הוסף הוראות למשתמשים
4. **Monitoring** - עקוב אחרי Audit Log לשימושים
5. **Backup Codes** (אופציונלי) - למקרה של אובדן מכשיר

