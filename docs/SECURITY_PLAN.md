# תכנית יישום: שלב אבטחה (Phase 4/6 - Security Enhancement)

## הקשר (Context)

### למה אנחנו עושים את זה?

האפליקציה כרגע **חסרת אבטחה לחלוטין**:
- סיסמה hardcoded (`'admin123'`) בקוד הקליינט - כל מי שרואה את הקוד יודע את הסיסמה
- אין אימות על ה-API endpoints - כל אחד עם ה-URL יכול ליצור/לערוך/למחוק הכנסות והוצאות
- אין זיהוי משתמש - לא יודעים מי עשה מה
- אין audit log - אי אפשר לעקוב אחרי פעולות

**הסיכונים:**
1. אם מישהו מגלה את ה-URL של האפליקציה, הוא יכול לגשת ישירות ל-`/api/income` ולהוסיף/למחוק נתונים
2. אין דרך לדעת מי הוסיף רשומה (תום או יעל)
3. הסיסמה חשופה בקוד המקור

**המטרה:**
ליצור שכבת אבטחה production-ready עם:
- Authentication מבוסס JWT (JSON Web Tokens)
- Username + Password לכל משתמש (tom/yael)
- **2FA עם 2 אפשרויות:**
  - **TOTP** - קוד חד-פעמי מאפליקציית Authenticator (Google/Microsoft/Authy)
  - **WebAuthn/Biometric** - טביעת אצבע/FaceID במובייל (אנדרואיד בעיקר)
- הגנה על כל ה-API endpoints
- Audit logging לעקיבה אחרי פעולות
- גישה משותפת מלאה (שניכם רואים ומנהלים הכל)

---

## החלטות ארכיטקטוניות

### 1. שיטת Authentication: JWT עם httpOnly Cookies

**למה JWT?**
- ✅ **Stateless** - מושלם ל-Vercel Edge Functions (אין צורך ב-session store)
- ✅ **Self-contained** - הטוקן מכיל את זהות המשתמש, לא צריך לבדוק במסד נתונים
- ✅ **תקן תעשייתי** - ספריות בשלות ונבדקות

**למה httpOnly Cookies (ולא localStorage)?**
- 🔒 **הגנה מפני XSS** - JavaScript לא יכול לגשת לטוקן
- 🔄 **שליחה אוטומטית** - הדפדפן שולח אוטומטית את הטוקן בכל בקשה
- 🛡️ **CSRF Protection** - עם `SameSite=Strict` זה בלתי אפשרי לגנוב טוקן

### 2. אחסון Credentials: Environment Variables

למה לא Airtable?
- רק 2 משתמשים קבועים (tom, yael)
- אין צורך ביכולת להוסיף משתמשים דינמית
- פשוט יותר וללא overhead של Airtable query בכל login

**המבנה:**
```bash
AUTH_USER_TOM_USERNAME=tom
AUTH_USER_TOM_PASSWORD_HASH=$2b$10$xxxx...  # bcrypt hash
AUTH_USER_TOM_ID=usr_tom_001

AUTH_USER_YAEL_USERNAME=yael
AUTH_USER_YAEL_PASSWORD_HASH=$2b$10$yyyy...
AUTH_USER_YAEL_ID=usr_yael_001

JWT_SECRET=<64-character random hex>
JWT_REFRESH_SECRET=<different 64-character random hex>
```

### 3. Token Strategy

**Access Token (קצר טווח):**
- תוקף: 15 דקות
- שימוש: אימות API requests
- מכיל: `{ userId, username, iat, exp }`
- Cookie name: `accessToken`

**Refresh Token (ארוך טווח):**
- תוקף: 7 ימים
- שימוש: חידוש access token
- מכיל: `{ userId, tokenVersion, iat, exp }`
- Cookie name: `refreshToken`

**למה 2 טוקנים?**
- Access token קצר → אם נגנב, הנזק מוגבל ל-15 דקות
- Refresh token ארוך → חוויית משתמש טובה (לא צריך login כל 15 דקות)
- Refresh token נשמר רק ב-`/api/auth/refresh` path → חשיפה מינימלית

### 4. Authorization Strategy

**החלטה: גישה משותפת מלאה**
- תום ויעל רואים את כל ההכנסות/הוצאות של שניהם
- שניהם יכולים לערוך ולמחוק כל רשומה
- הפשטה: לא צריך לבדוק ownership ב-API endpoints

**למה?**
- בחרת ב"גישה מלאה משותפת" בשאלון
- מתאים למשפחה שמנהלת פיננסים ביחד
- יישום פשוט יותר

### 5. Rate Limiting

**החלטה: דילוג בשלב זה**
- בחרת "ללא rate limiting לעת עתה"
- לשימוש אישי עם 2 משתמשים זה לא קריטי
- **אפשר להוסיף בעתיד** אם יש צורך

### 6. Two-Factor Authentication (2FA)

**החלטה: יישום מלא בשלב זה**
- בחרת "כלול 2FA עכשיו - אבטחה מקסימלית מההתחלה"
- שימוש ב-TOTP (Time-based One-Time Password) algorithm
- תואם ל-Google Authenticator, Microsoft Authenticator, Authy, וכו'

**איך זה עובד:**
1. **Setup (חד-פעמי לכל משתמש):**
   - משתמש מתחבר בפעם הראשונה עם username+password
   - המערכת יוצרת secret key ייחודי
   - המערכת מציגה QR code
   - משתמש סורק את ה-QR code באפליקציית Authenticator
   - משתמש מזין קוד 6 ספרות לאימות
   - Secret נשמר ב-environment variables

2. **Login (כל התחברות):**
   - משתמש מזין username + password
   - אם נכונים → בקשה לקוד 2FA
   - משתמש מזין קוד 6 ספרות מאפליקציית Authenticator
   - אם הקוד נכון (תוך 30 שניות) → יצירת JWT tokens

**ספריה: `speakeasy`**
- תקן TOTP (RFC 6238)
- תואם לכל אפליקציות Authenticator
- יצירת secrets, QR codes, אימות קודים

**אחסון:**
```bash
AUTH_USER_TOM_TOTP_SECRET=<base32-encoded-secret>
AUTH_USER_YAEL_TOTP_SECRET=<base32-encoded-secret>
```

**Backup Codes (אופציונלי):**
- 10 קודים חד-פעמיים למקרה שהמשתמש מאבד גישה לטלפון
- נשמרים encrypted ב-environment variables

### 7. WebAuthn / Biometric Authentication

**החלטה: יישום מלא - אלטרנטיבה ל-TOTP**
- בחרת "הוסף ביומטריה עכשיו - שתי אפשרויות"
- שימוש ב-**WebAuthn API** (W3C standard)
- תומך ב-Fingerprint, FaceID, Windows Hello

**איך זה עובד:**
1. **Setup (חד-פעמי):**
   - משתמש בוחר "Login with Fingerprint" במקום TOTP
   - הדפדפן מבקש טביעת אצבע (או FaceID)
   - המערכת שומרת public key ב-Airtable (לא ב-env vars)
   - המכשיר שומר private key באופן מאובטח

2. **Login:**
   - משתמש מזין username + password
   - לוחץ "Use Fingerprint"
   - הדפדפן מבקש טביעת אצבע
   - אם נכון → יצירת JWT tokens

**ספריה: `@simplewebauthn/server` + `@simplewebauthn/browser`**
- תקן W3C WebAuthn
- תואם ל-FIDO2
- תמיכה בכל סוגי authenticators

**אחסון:**
- Public keys נשמרים ב-**Airtable table חדשה: "WebAuthn Credentials"**
- לא דורש environment variables
- כל משתמש יכול להרשם ממספר מכשירים

**תמיכה:**
- ✅ Android Chrome 70+ (Fingerprint)
- ✅ Android PWA מותקן
- ✅ Windows Chrome/Edge (Windows Hello)
- ⚠️ iOS Safari - רק אם PWA מותקן
- ❌ iOS Safari רגיל - לא תומך

**אסטרטגיה:**
- המשתמש **בוחר** בין TOTP או WebAuthn ב-setup
- אפשר להרשם לשניהם (fallback)
- בזמן login: בוחר איזה שיטה להשתמש

---

## מבנה הקבצים

### קבצים חדשים (23 קבצים)

```
/api
├── auth/
│   ├── login.ts              # POST - אימות username+password, החזרת requireTotp
│   ├── login-totp.ts         # POST - אימות TOTP code, יצירת tokens
│   ├── login-webauthn.ts     # POST - אימות WebAuthn, יצירת tokens
│   ├── logout.ts             # POST - ניקוי cookies
│   ├── refresh.ts            # POST - חידוש access token
│   ├── verify.ts             # GET - בדיקת session נוכחי
│   ├── 2fa/
│   │   ├── setup.ts          # POST - יצירת TOTP secret, QR code
│   │   ├── verify-setup.ts   # POST - אימות TOTP setup
│   │   └── disable.ts        # POST - השבתת 2FA (דורש password)
│   └── webauthn/
│       ├── register-options.ts   # POST - יצירת registration challenge
│       ├── register-verify.ts    # POST - אימות registration + שמירת credential
│       ├── login-options.ts      # POST - יצירת authentication challenge
│       └── credentials.ts        # GET - רשימת credentials של משתמש
├── middleware/
│   ├── auth.ts               # Middleware לאימות JWT
│   └── errorHandler.ts       # טיפול מרכזי בשגיאות
└── utils/
    ├── auditLog.ts           # רישום פעולות ל-Airtable
    ├── totp.ts               # TOTP helpers (generate, verify)
    └── webauthn.ts           # WebAuthn helpers (challenge, verify)

/src
├── services/
│   ├── auth.ts               # API calls לאימות (+ 2FA + WebAuthn)
│   └── webauthn.ts           # WebAuthn client helpers
├── components/
│   └── auth/
│       ├── TotpSetup.tsx     # הצגת QR code + אימות setup
│       ├── TotpInput.tsx     # קומפוננטת 6 ספרות
│       ├── WebAuthnSetup.tsx # Setup Fingerprint/FaceID
│       ├── WebAuthnPrompt.tsx # בקשת טביעת אצבע ב-login
│       └── TwoFactorChoice.tsx # בחירה בין TOTP/WebAuthn
└── types/
    ├── user.types.ts         # User interface
    └── webauthn.types.ts     # WebAuthn credential types
```

### קבצים משתנים (9 קבצים)

```
/api
├── categories.ts             # הוספת authMiddleware
├── income.ts                 # הוספת authMiddleware + audit log
├── expense.ts                # הוספת authMiddleware + audit log
├── recent.ts                 # הוספת authMiddleware
├── update.ts                 # הוספת authMiddleware + audit log
└── delete.ts                 # הוספת authMiddleware + audit log

/src
├── context/AuthContext.tsx   # התחברות דרך API, User state, 2FA state
├── components/auth/LoginForm.tsx  # username + password, 2FA flow
├── services/api.ts           # credentials: 'include', token refresh
├── types/auth.types.ts       # User interface + 2FA state
└── App.tsx                   # טיפול ב-2FA setup flow
```

### קבצים נמחקים

```
/src/services/storage.ts      # הפונקציה getAuth/setAuth (לא צריך localStorage auth)
```

**סה"כ:** 23 חדש + 9 משתנים + 1 מחיקה חלקית = **33 קבצים**

---

## זרימות (Flows)

### Flow 1: Login (עם 2FA)

```
1. משתמש פותח את האפליקציה
   ↓
2. AuthContext קורא ל-/api/auth/verify (בדיקת session)
   ↓
3. אם יש token תקף → כניסה אוטומטית
   אם אין → הצגת LoginForm
   ↓
4. משתמש מזין username (tom/yael) + password
   ↓
5. POST /api/auth/login
   ↓
6. שרת מוודא username קיים
   ↓
7. שרת משווה password עם bcrypt hash
   ↓
8a. אם password שגוי → 401 Unauthorized
8b. אם password נכון:
    ↓
    שרת בודק אם למשתמש יש TOTP secret מוגדר
    ↓
    9a. אין TOTP → מחזיר { requireTotp: false, requireSetup: true, tempToken }
        (צריך setup 2FA)
    9b. יש TOTP → מחזיר { requireTotp: true, tempToken }
        (ממתין לקוד 2FA)
    ↓
10. Client מציג TotpInput או TotpSetup
    ↓
11. משתמש מזין קוד 6 ספרות
    ↓
12. POST /api/auth/login-totp { tempToken, totpCode }
    ↓
13. שרת מאמת TOTP code (תוך 30 שניות)
    ↓
14a. קוד שגוי → 401 Invalid TOTP code
14b. קוד נכון:
     ↓
     שרת יוצר 2 טוקנים (access + refresh)
     ↓
     שרת מגדיר httpOnly cookies
     ↓
     מחזיר { success: true, user: { id, username, has2FA: true } }
     ↓
15. Client שומר user ב-AuthContext
    ↓
16. ניתוב לאפליקציה הראשית
```

**Endpoints:**

**`/api/auth/login.ts`** (שלב ראשון)
```typescript
Input:  { username: string, password: string }
Output:
  - Success: { requireTotp: true, tempToken: string }  // יש 2FA
  - Success: { requireTotp: false, requireSetup: true, tempToken: string }  // אין 2FA
  - Error: 401 Invalid credentials
```

**`/api/auth/login-totp.ts`** (שלב שני)
```typescript
Input:  { tempToken: string, totpCode: string }
Output: { success: true, user: { id, username, has2FA: true } }
Cookies: accessToken (15min), refreshToken (7 days)
Status: 200 OK | 401 Invalid TOTP
```

**Temp Token:**
- JWT קצר טווח (5 דקות)
- מכיל: `{ userId, username, stage: 'awaiting-totp' }`
- מאפשר רק קריאה ל-`/api/auth/login-totp`
- לא מאפשר גישה ל-API endpoints אחרים

### Flow 2: Protected API Request

```
1. Client קורא ל-fetch('/api/income', { credentials: 'include' })
   ↓
2. הדפדפן שולח accessToken cookie אוטומטית
   ↓
3. authMiddleware מחלץ את הטוקן מה-cookie
   ↓
4. authMiddleware מאמת JWT signature + expiry
   ↓
5a. תקף → מוסיף req.user = { userId, username }
    ↓
    ממשיך ל-endpoint logic
    ↓
    מחזיר תגובה

5b. לא תקף/פג תוקף → מחזיר 401/403
    ↓
    Client מנסה refresh (אם 401)
```

**Middleware: `/api/middleware/auth.ts`**

```typescript
export function withAuth(handler) {
  return async (req, res) => {
    const token = parse(req.headers.cookie).accessToken;

    if (!token) return res.status(401).json({ error: 'Unauthorized' });

    try {
      const user = jwt.verify(token, JWT_SECRET);
      req.user = user;
      return handler(req, res);
    } catch {
      return res.status(401).json({ error: 'Token expired', code: 'TOKEN_EXPIRED' });
    }
  };
}
```

### Flow 3: Token Refresh

```
1. Client מקבל 401 עם code: 'TOKEN_EXPIRED'
   ↓
2. Client קורא ל-POST /api/auth/refresh
   ↓
3. הדפדפן שולח refreshToken cookie
   ↓
4. שרת מאמת refresh token
   ↓
5. שרת יוצר access token חדש
   ↓
6. שרת מגדיר accessToken cookie חדש
   ↓
7. שרת מחזיר { success: true }
   ↓
8. Client חוזר על הבקשה המקורית (עם token חדש)
```

**למה זה חשוב?**
- המשתמש לא מרגיש שום דבר
- ה-session נשאר פעיל במשך 7 ימים
- אבל אם הטוקן נגנב, הנזק מוגבל ל-15 דקות

### Flow 4: 2FA Setup (חד-פעמי)

```
1. משתמש מתחבר בפעם הראשונה (אין TOTP secret)
   ↓
2. POST /api/auth/login → { requireTotp: false, requireSetup: true, tempToken }
   ↓
3. Client מציג TotpSetup component
   ↓
4. POST /api/auth/2fa/setup { tempToken }
   ↓
5. שרת יוצר TOTP secret חדש
   ↓
6. שרת מחזיר { secret, qrCodeUrl, manualCode }
   ↓
7. Client מציג QR code + הוראות
   ↓
8. משתמש סורק QR code באפליקציית Authenticator
   ↓
9. משתמש מזין קוד 6 ספרות מהאפליקציה
   ↓
10. POST /api/auth/2fa/verify-setup { tempToken, totpCode }
    ↓
11. שרת מאמת שהקוד נכון
    ↓
12a. קוד שגוי → "הקוד שגוי, נסה שוב"
12b. קוד נכון:
     ↓
     **Admin צריך לשמור את ה-secret ב-environment variables!**
     ↓
     מחזיר { success: true, secret }
     ↓
13. Client מציג הודעה: "2FA הופעל בהצלחה"
    ↓
14. Client מפנה ל-login מחדש
    ↓
15. משתמש עובר דרך flow רגיל עם 2FA
```

**חשוב:**
- ה-secret מוצג פעם אחת בלבד
- Admin צריך להעתיק את ה-secret ל-`.env.local`:
  ```bash
  AUTH_USER_TOM_TOTP_SECRET=<secret-from-response>
  ```
- אחרי restart של dev server, 2FA פעיל

### Flow 5: Logout

```
1. משתמש לוחץ על כפתור התנתק
   ↓
2. POST /api/auth/logout
   ↓
3. שרת מוחק את ה-cookies (Max-Age=0)
   ↓
4. Client מנקה את AuthContext
   ↓
5. ניתוב ל-LoginForm
```

### Flow 6: Audit Log (כל פעולה)

```
בכל create/update/delete:
1. Endpoint מבצע פעולה
   ↓
2. אם הצליח → קריאה ל-logAuditEvent()
   ↓
3. יצירת רשומה ב-Airtable "Audit Log":
   - Timestamp
   - User ID (usr_tom_001)
   - Username (tom)
   - Action (create/update/delete)
   - Resource (income/expense)
   - Details (JSON של הנתונים)
   - IP Address
   - Success (true)
```

**למה Audit Log?**
- עקיבה אחרי פעולות ("מי מחק את הרשומה הזאת?")
- אבטחה (זיהוי פעילות חשודה)
- Debugging (מה קרה בזמן X?)

---

## קבצים קריטיים (Critical Files)

### 1. `/api/middleware/auth.ts`

**אחראי על:** אימות JWT בכל בקשה

```typescript
import type { VercelRequest, VercelResponse } from '@vercel/node';
import jwt from 'jsonwebtoken';
import { parse } from 'cookie';

export interface AuthRequest extends VercelRequest {
  user?: {
    userId: string;
    username: string;
  };
}

export function withAuth(
  handler: (req: AuthRequest, res: VercelResponse) => Promise<void>
) {
  return async (req: AuthRequest, res: VercelResponse) => {
    // Extract token from cookie
    const cookies = parse(req.headers.cookie || '');
    const token = cookies.accessToken;

    if (!token) {
      return res.status(401).json({
        error: 'Unauthorized - No token provided'
      });
    }

    try {
      // Verify JWT
      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as {
        userId: string;
        username: string;
      };

      // Attach user to request
      req.user = {
        userId: decoded.userId,
        username: decoded.username
      };

      // Continue to handler
      return handler(req, res);
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        return res.status(401).json({
          error: 'Token expired',
          code: 'TOKEN_EXPIRED'
        });
      }
      return res.status(403).json({ error: 'Invalid token' });
    }
  };
}
```

**שימוש:**
```typescript
// /api/income.ts
import { withAuth } from './middleware/auth';

export default withAuth(async (req, res) => {
  // req.user זמין כאן!
  const { userId, username } = req.user!;

  // ... endpoint logic
});
```

### 2. `/api/auth/login.ts`

**אחראי על:** אימות משתמש ויצירת tokens

```typescript
import type { VercelRequest, VercelResponse } from '@vercel/node';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

interface LoginRequest {
  username: string;
  password: string;
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { username, password } = req.body as LoginRequest;

  // Validation
  if (!username || !password) {
    return res.status(400).json({
      error: 'Username and password required'
    });
  }

  // Find user from environment variables
  const user = getUserByUsername(username);
  if (!user) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  // Verify password with bcrypt
  const isValid = await bcrypt.compare(password, user.passwordHash);
  if (!isValid) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  // Generate tokens
  const accessToken = jwt.sign(
    { userId: user.id, username: user.username },
    process.env.JWT_SECRET!,
    { expiresIn: '15m' }
  );

  const refreshToken = jwt.sign(
    { userId: user.id, tokenVersion: 1 },
    process.env.JWT_REFRESH_SECRET!,
    { expiresIn: '7d' }
  );

  // Set httpOnly cookies
  res.setHeader('Set-Cookie', [
    `accessToken=${accessToken}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=${15 * 60}`,
    `refreshToken=${refreshToken}; HttpOnly; Secure; SameSite=Strict; Path=/api/auth/refresh; Max-Age=${7 * 24 * 60 * 60}`
  ]);

  // Return user info (NOT the tokens!)
  return res.status(200).json({
    success: true,
    user: {
      id: user.id,
      username: user.username
    }
  });
}

function getUserByUsername(username: string) {
  // Load from environment variables
  if (username === process.env.AUTH_USER_TOM_USERNAME) {
    return {
      id: process.env.AUTH_USER_TOM_ID!,
      username: process.env.AUTH_USER_TOM_USERNAME!,
      passwordHash: process.env.AUTH_USER_TOM_PASSWORD_HASH!
    };
  }
  if (username === process.env.AUTH_USER_YAEL_USERNAME) {
    return {
      id: process.env.AUTH_USER_YAEL_ID!,
      username: process.env.AUTH_USER_YAEL_USERNAME!,
      passwordHash: process.env.AUTH_USER_YAEL_PASSWORD_HASH!
    };
  }
  return null;
}
```

### 3. `/api/auth/refresh.ts`

**אחראי על:** חידוש access token

```typescript
import type { VercelRequest, VercelResponse } from '@vercel/node';
import jwt from 'jsonwebtoken';
import { parse } from 'cookie';

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const cookies = parse(req.headers.cookie || '');
  const refreshToken = cookies.refreshToken;

  if (!refreshToken) {
    return res.status(401).json({ error: 'No refresh token' });
  }

  try {
    const decoded = jwt.verify(
      refreshToken,
      process.env.JWT_REFRESH_SECRET!
    ) as {
      userId: string;
      tokenVersion: number;
    };

    // Get username from user ID (helper function)
    const username = getUsernameById(decoded.userId);

    // Generate new access token
    const newAccessToken = jwt.sign(
      { userId: decoded.userId, username },
      process.env.JWT_SECRET!,
      { expiresIn: '15m' }
    );

    // Set new cookie
    res.setHeader(
      'Set-Cookie',
      `accessToken=${newAccessToken}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=${15 * 60}`
    );

    return res.status(200).json({ success: true });
  } catch (error) {
    return res.status(401).json({ error: 'Invalid refresh token' });
  }
}

function getUsernameById(userId: string): string {
  if (userId === process.env.AUTH_USER_TOM_ID) {
    return process.env.AUTH_USER_TOM_USERNAME!;
  }
  if (userId === process.env.AUTH_USER_YAEL_ID) {
    return process.env.AUTH_USER_YAEL_USERNAME!;
  }
  return 'unknown';
}
```

### 4. `/api/auth/verify.ts`

**אחראי על:** בדיקת session נוכחי (לטעינה ראשונית)

```typescript
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { withAuth, AuthRequest } from '../middleware/auth';

export default withAuth(async (req: AuthRequest, res: VercelResponse) => {
  // If we got here, token is valid (middleware verified it)
  return res.status(200).json({
    user: {
      id: req.user!.userId,
      username: req.user!.username
    }
  });
});
```

### 5. `/src/context/AuthContext.tsx`

**אחראי על:** ניהול מצב אימות בצד הקליינט

```typescript
import { createContext, useState, useEffect, ReactNode } from 'react';
import type { AuthState, User } from '@/types';
import { authApi } from '@/services/auth';

export const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // On mount, verify session
  useEffect(() => {
    verifySession();
  }, []);

  const verifySession = async () => {
    try {
      const userData = await authApi.verify();
      setUser(userData);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const login = async (username: string, password: string): Promise<boolean> => {
    try {
      const userData = await authApi.login(username, password);
      setUser(userData);
      return true;
    } catch {
      return false;
    }
  };

  const logout = async () => {
    try {
      await authApi.logout();
    } catch {
      // Logout anyway
    } finally {
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        loading,
        login,
        logout
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
```

### 6. `/src/services/auth.ts`

**אחראי על:** API calls לאימות

```typescript
import type { User } from '@/types';

const API_BASE = '/api/auth';

export const authApi = {
  async login(username: string, password: string): Promise<User> {
    const response = await fetch(`${API_BASE}/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include', // CRITICAL: Include cookies
      body: JSON.stringify({ username, password }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Login failed');
    }

    const data = await response.json();
    return data.user;
  },

  async logout(): Promise<void> {
    await fetch(`${API_BASE}/logout`, {
      method: 'POST',
      credentials: 'include',
    });
  },

  async verify(): Promise<User> {
    const response = await fetch(`${API_BASE}/verify`, {
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error('Not authenticated');
    }

    const data = await response.json();
    return data.user;
  },

  async refresh(): Promise<void> {
    const response = await fetch(`${API_BASE}/refresh`, {
      method: 'POST',
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error('Refresh failed');
    }
  },
};
```

### 7. `/src/services/api.ts` (שינויים)

**אחראי על:** הוספת token refresh אוטומטי

```typescript
// הוספה לכל fetch request:
credentials: 'include'

// הוספת לוגיקת retry עם refresh:
async function fetchWithAuth(url: string, options: RequestInit = {}) {
  const response = await fetch(url, {
    ...options,
    credentials: 'include',
  });

  // If token expired, try refresh and retry
  if (response.status === 401) {
    const error = await response.json();
    if (error.code === 'TOKEN_EXPIRED') {
      await authApi.refresh();
      // Retry original request
      return fetch(url, {
        ...options,
        credentials: 'include',
      });
    }
  }

  return response;
}
```

### 8. `/src/components/auth/LoginForm.tsx` (שינויים)

**אחראי על:** הוספת שדה username

```typescript
const [username, setUsername] = useState('');
const [password, setPassword] = useState('');

// ...

<Input
  type="text"
  label="שם משתמש"
  value={username}
  onChange={(e) => setUsername(e.target.value)}
  placeholder="tom או yael"
  autoFocus
/>
<Input
  type="password"
  label="סיסמה"
  value={password}
  onChange={(e) => setPassword(e.target.value)}
  placeholder="הזן סיסמה"
  error={error}
/>

// Submit:
const success = await login(username, password);
```

### 9. `/api/utils/totp.ts`

**אחראי על:** TOTP helpers (יצירה ואימות קודים)

```typescript
import speakeasy from 'speakeasy';
import QRCode from 'qrcode';

export function generateTotpSecret(username: string) {
  const secret = speakeasy.generateSecret({
    name: `Finances Tracker (${username})`,
    issuer: 'Finances Tracker',
    length: 32
  });

  return {
    secret: secret.base32,
    otpauthUrl: secret.otpauth_url!
  };
}

export async function generateQRCode(otpauthUrl: string): Promise<string> {
  // Returns base64 data URL
  return QRCode.toDataURL(otpauthUrl);
}

export function verifyTotpCode(secret: string, code: string): boolean {
  return speakeasy.totp.verify({
    secret,
    encoding: 'base32',
    token: code,
    window: 1 // Allow 1 step before/after (30 sec tolerance)
  });
}
```

### 10. `/api/auth/2fa/setup.ts`

**אחראי על:** יצירת TOTP secret ו-QR code

```typescript
import type { VercelRequest, VercelResponse } from '@vercel/node';
import jwt from 'jsonwebtoken';
import { parse } from 'cookie';
import { generateTotpSecret, generateQRCode } from '../../utils/totp';

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Extract temp token
    const { tempToken } = req.body;

    if (!tempToken) {
      return res.status(401).json({ error: 'No temp token' });
    }

    // Verify temp token
    const decoded = jwt.verify(tempToken, process.env.JWT_SECRET!) as {
      userId: string;
      username: string;
      stage: string;
    };

    if (decoded.stage !== 'awaiting-totp') {
      return res.status(403).json({ error: 'Invalid token stage' });
    }

    // Generate TOTP secret
    const { secret, otpauthUrl } = generateTotpSecret(decoded.username);

    // Generate QR code
    const qrCodeDataUrl = await generateQRCode(otpauthUrl);

    return res.status(200).json({
      secret,
      qrCodeUrl: qrCodeDataUrl,
      manualCode: secret // For manual entry if QR doesn't work
    });
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}
```

### 11. `/api/auth/2fa/verify-setup.ts`

**אחראי על:** אימות ש-TOTP setup עבד

```typescript
import type { VercelRequest, VercelResponse } from '@vercel/node';
import jwt from 'jsonwebtoken';
import { verifyTotpCode } from '../../utils/totp';

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { tempToken, totpCode, secret } = req.body;

    if (!tempToken || !totpCode || !secret) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Verify temp token
    const decoded = jwt.verify(tempToken, process.env.JWT_SECRET!) as {
      userId: string;
      username: string;
      stage: string;
    };

    if (decoded.stage !== 'awaiting-totp') {
      return res.status(403).json({ error: 'Invalid token stage' });
    }

    // Verify TOTP code with the secret
    const isValid = verifyTotpCode(secret, totpCode);

    if (!isValid) {
      return res.status(401).json({ error: 'Invalid TOTP code' });
    }

    // Return success with the secret
    // IMPORTANT: Admin must save this secret to environment variables!
    return res.status(200).json({
      success: true,
      secret,
      message: `2FA setup successful! Save this to .env.local:\nAUTH_USER_${decoded.username.toUpperCase()}_TOTP_SECRET=${secret}`
    });
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token or code' });
  }
}
```

### 12. `/api/utils/auditLog.ts`

**אחראי על:** רישום פעולות ל-Airtable

```typescript
import Airtable from 'airtable';

interface AuditEvent {
  userId: string;
  username: string;
  action: 'login' | 'logout' | 'create' | 'update' | 'delete';
  resource: 'income' | 'expense' | 'category';
  ip: string;
  success: boolean;
  details?: string;
}

export async function logAuditEvent(event: AuditEvent) {
  try {
    const base = new Airtable({
      apiKey: process.env.AIRTABLE_API_KEY
    }).base(process.env.AIRTABLE_BASE_ID!);

    await base('Audit Log').create({
      'Timestamp': new Date().toISOString(),
      'User ID': event.userId,
      'Username': event.username,
      'Action': event.action,
      'Resource': event.resource,
      'IP Address': event.ip,
      'Success': event.success,
      'Details': event.details || ''
    });
  } catch (error) {
    // Don't fail the request if logging fails
    console.error('Audit log failed:', error);
  }
}

export function getClientIp(req: any): string {
  return (
    req.headers['x-forwarded-for'] ||
    req.headers['x-real-ip'] ||
    'unknown'
  );
}
```

---

## Airtable Schema

### טבלה חדשה 1: "Audit Log"

```
Fields:
┌─────────────────┬──────────────┬────────────────────────────────┐
│ Field Name      │ Type         │ Options                        │
├─────────────────┼──────────────┼────────────────────────────────┤
│ Timestamp       │ DateTime     │ Include time                   │
│ User ID         │ Single Line  │ usr_tom_001, usr_yael_001      │
│ Username        │ Single Line  │ tom, yael                      │
│ Action          │ Single Select│ login, logout, create,         │
│                 │              │ update, delete                 │
│ Resource        │ Single Select│ income, expense, category      │
│ IP Address      │ Single Line  │                                │
│ Success         │ Checkbox     │                                │
│ Details         │ Long Text    │ JSON או תיאור טקסט            │
└─────────────────┴──────────────┴────────────────────────────────┘
```

**דוגמאות לרשומות:**

| Timestamp           | User ID       | Username | Action | Resource | Success | Details                      |
|---------------------|---------------|----------|--------|----------|---------|------------------------------|
| 2026-02-14 10:30:00 | usr_tom_001   | tom      | login  | -        | ✓       | IP: 192.168.1.100            |
| 2026-02-14 10:31:15 | usr_tom_001   | tom      | create | income   | ✓       | Amount: 5000, Category: פרילנס |
| 2026-02-14 11:45:22 | usr_yael_001  | yael     | delete | expense  | ✓       | ID: rec123abc                |

### טבלה חדשה 2: "WebAuthn Credentials"

```
Fields:
┌─────────────────────┬──────────────┬────────────────────────────────┐
│ Field Name          │ Type         │ Options                        │
├─────────────────────┼──────────────┼────────────────────────────────┤
│ Credential ID       │ Single Line  │ Base64 encoded                 │
│ User ID             │ Single Line  │ usr_tom_001, usr_yael_001      │
│ Username            │ Single Line  │ tom, yael                      │
│ Public Key          │ Long Text    │ Base64 encoded public key      │
│ Counter             │ Number       │ Signature counter              │
│ Device Name         │ Single Line  │ "Tom's Pixel 8", "Yael iPhone" │
│ Created At          │ DateTime     │ Registration timestamp         │
│ Last Used           │ DateTime     │ Last authentication            │
│ AAGUID              │ Single Line  │ Authenticator GUID             │
└─────────────────────┴──────────────┴────────────────────────────────┘
```

**דוגמאות לרשומות:**

| Credential ID | User ID     | Username | Device Name      | Created At          | Last Used           |
|---------------|-------------|----------|------------------|---------------------|---------------------|
| AQIDBAoL...   | usr_tom_001 | tom      | Tom's Pixel 8    | 2026-02-14 10:00:00 | 2026-02-14 15:30:00 |
| ZXhhbXBs... | usr_yael_001 | yael    | Yael iPhone 15   | 2026-02-14 11:00:00 | 2026-02-14 16:00:00 |

---

## Environment Variables

### קובץ `.env.example` (עדכון)

```bash
# ========================================
# Airtable Configuration (EXISTING)
# ========================================
AIRTABLE_API_KEY=patXXXXXXXXXXXXXX
AIRTABLE_BASE_ID=appXXXXXXXXXXXXXX

# Table Names
AIRTABLE_INCOME_TABLE=הכנסות
AIRTABLE_INCOME_CATEGORIES_TABLE=מקורות הכנסה
AIRTABLE_EXPENSE_TABLE=הוצאות
AIRTABLE_EXPENSE_CATEGORIES_TABLE=מקורות הוצאה

# [... all existing field names ...]

# ========================================
# Authentication (NEW - Phase 4)
# ========================================

# JWT Secrets (generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
JWT_SECRET=<64-character-random-hex-string>
JWT_REFRESH_SECRET=<different-64-character-random-hex-string>

# Token Expiry
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d

# User 1: Tom
AUTH_USER_TOM_USERNAME=tom
AUTH_USER_TOM_PASSWORD_HASH=<bcrypt-hash>
AUTH_USER_TOM_ID=usr_tom_001

# User 2: Yael
AUTH_USER_YAEL_USERNAME=yael
AUTH_USER_YAEL_PASSWORD_HASH=<bcrypt-hash>
AUTH_USER_YAEL_ID=usr_yael_001

# Security
ALLOWED_ORIGINS=https://your-app.vercel.app,http://localhost:5173
```

### הוראות ליצירת Secrets

```bash
# 1. יצירת JWT secrets
node -e "console.log('JWT_SECRET=' + require('crypto').randomBytes(32).toString('hex'))"
node -e "console.log('JWT_REFRESH_SECRET=' + require('crypto').randomBytes(32).toString('hex'))"

# 2. יצירת password hashes (צריך להתקין bcrypt-cli)
npm install -g bcrypt-cli

# Hash password for Tom
bcrypt-cli hash "TomSecurePassword123!" 10

# Hash password for Yael
bcrypt-cli hash "YaelSecurePassword456!" 10

# 3. העתקה ל-.env.local
```

---

## סדר יישום (Implementation Order)

### Phase 1: Setup & Infrastructure (יום 1, 2-3 שעות)

1. **התקנת Dependencies**
   ```bash
   npm install jsonwebtoken @types/jsonwebtoken
   npm install bcryptjs @types/bcryptjs
   npm install cookie @types/cookie
   npm install speakeasy @types/speakeasy
   npm install qrcode @types/qrcode
   ```

2. **יצירת Secrets**
   - JWT_SECRET ו-JWT_REFRESH_SECRET
   - Password hashes לתום ויעל
   - עדכון `.env.local`

3. **יצירת 2 טבלאות חדשות באיירטייבל**
   - **Audit Log** - 8 שדות (Timestamp, User ID, Username, Action, Resource, IP, Success, Details)
   - **WebAuthn Credentials** - 9 שדות (Credential ID, User ID, Username, Public Key, Counter, Device Name, Created At, Last Used, AAGUID)

4. **יצירת Types**
   - `/src/types/user.types.ts`
   - עדכון `/src/types/auth.types.ts`
   - עדכון `/src/types/index.ts`

### Phase 2: Backend Authentication (יום 1-2, 4-5 שעות)

5. **Middleware**
   - `/api/middleware/auth.ts` - JWT verification
   - `/api/middleware/errorHandler.ts` - Standardized errors

6. **Auth Endpoints**
   - `/api/auth/login.ts`
   - `/api/auth/logout.ts`
   - `/api/auth/refresh.ts`
   - `/api/auth/verify.ts`

7. **Audit Logging**
   - `/api/utils/auditLog.ts`

8. **בדיקה:**
   - curl/Postman test של login endpoint
   - וידוא שה-cookies מוגדרים נכון
   - בדיקת verify endpoint

### Phase 3: Protect Existing Endpoints (יום 2, 2-3 שעות)

9. **הוספת withAuth ל-6 endpoints:**
   - `/api/categories.ts` → `export default withAuth(async (req, res) => { ... })`
   - `/api/income.ts` → + audit log
   - `/api/expense.ts` → + audit log
   - `/api/recent.ts`
   - `/api/update.ts` → + audit log
   - `/api/delete.ts` → + audit log

10. **בדיקה:**
    - נסיון לקרוא ל-`/api/categories` ללא token → 401
    - login + קריאה ל-`/api/categories` → 200

### Phase 4: 2FA (TOTP) Implementation (יום 3, 3-4 שעות)

11. **2FA Utils & Endpoints**
    - `/api/utils/totp.ts` - TOTP generation & verification
    - `/api/auth/2fa/setup.ts` - QR code generation
    - `/api/auth/2fa/verify-setup.ts` - Setup verification
    - `/api/auth/2fa/disable.ts` - Disable 2FA (requires password)

12. **Modified Login Flow**
    - עדכון `/api/auth/login.ts` - החזרת tempToken
    - יצירת `/api/auth/login-totp.ts` - TOTP verification

13. **Client Components**
    - `/src/components/auth/TotpInput.tsx` - 6-digit input
    - `/src/components/auth/TotpSetup.tsx` - QR code display

14. **בדיקה:**
    - Setup flow: QR code → scan → verify
    - Login flow: username+password → TOTP code → success
    - Invalid codes rejection

### Phase 5: WebAuthn (Biometric) Implementation (יום 4, 3-4 שעות)

15. **WebAuthn Utils & Endpoints**
    - התקנה: `npm install @simplewebauthn/server @simplewebauthn/browser`
    - `/api/utils/webauthn.ts` - Challenge generation & verification
    - `/api/auth/webauthn/register-options.ts` - Registration challenge
    - `/api/auth/webauthn/register-verify.ts` - Verify registration
    - `/api/auth/webauthn/login-options.ts` - Authentication challenge
    - `/api/auth/login-webauthn.ts` - Complete authentication

16. **Client Components**
    - `/src/services/webauthn.ts` - WebAuthn client helpers
    - `/src/components/auth/WebAuthnSetup.tsx` - Registration flow
    - `/src/components/auth/WebAuthnPrompt.tsx` - Login fingerprint prompt
    - `/src/components/auth/TwoFactorChoice.tsx` - Choose TOTP vs WebAuthn

17. **בדיקה:**
    - Registration flow: Click "Use Fingerprint" → Device prompt → Success
    - Login flow: username+password → fingerprint → success
    - Works only on supported devices (Android Chrome)
    - Graceful fallback to TOTP if WebAuthn not supported

### Phase 6: Client-Side Integration (יום 4-5, 3-4 שעות)

18. **Services**
    - עדכון `/src/services/auth.ts` - Auth API calls (+ TOTP + WebAuthn)
    - עדכון `/src/services/api.ts` - credentials: 'include' + refresh logic

19. **Context**
    - עדכון `/src/context/AuthContext.tsx` - User state, 2FA state, WebAuthn state

20. **Components**
    - עדכון `/src/components/auth/LoginForm.tsx` - 2FA choice + flow integration
    - עדכון `/src/App.tsx` - TotpSetup + WebAuthnSetup routing

21. **Storage Cleanup**
    - הסרת `getAuth/setAuth/clearAuth` מ-`/src/services/storage.ts`
    - הסרת קריאות ל-storage auth מכל הקבצים

### Phase 7: Testing (יום 5-6, 4-5 שעות)

22. **Manual Testing**
    ```
    [ ] Login עם username/password נכונים
    [ ] Login נכשל עם סיסמה שגויה
    [ ] Login נכשל עם username שלא קיים
    [ ] 2FA setup: QR code מוצג
    [ ] 2FA setup: סריקת QR code באפליקציה
    [ ] 2FA setup: אימות קוד מצליח
    [ ] 2FA setup: קוד שגוי נדחה
    [ ] Login עם 2FA: בקשת TOTP code
    [ ] Login עם 2FA: קוד נכון מצליח
    [ ] Login עם 2FA: קוד שגוי נדחה
    [ ] Login עם 2FA: קוד פג תוקף (30 שניות)
    [ ] WebAuthn setup: בחירה ב"Use Fingerprint"
    [ ] WebAuthn setup: Device prompt מופיע
    [ ] WebAuthn setup: Registration מצליח
    [ ] WebAuthn login: Fingerprint prompt מופיע
    [ ] WebAuthn login: אימות מצליח
    [ ] WebAuthn: Graceful fallback אם device לא תומך
    [ ] Access token פג תוקף אחרי 15 דקות
    [ ] Refresh token מחדש את access token
    [ ] Logout מנקה cookies
    [ ] Protected endpoints דוחים בקשות ללא token
    [ ] Protected endpoints מאפשרים בקשות עם token
    [ ] Audit log נוצר בהכנסה/עריכה/מחיקה
    [ ] Tokens הם httpOnly (לא נגישים ב-JavaScript)
    [ ] Cookies עם Secure flag (production)
    [ ] Session נשאר פעיל אחרי רענון דף
    [ ] Token refresh אוטומטי עובד
    ```

23. **Edge Cases**
    ```
    [ ] מה קורה אם JWT_SECRET חסר?
    [ ] מה קורה אם password hash לא תקין?
    [ ] מה קורה אם TOTP secret חסר?
    [ ] מה קורה אם QR code לא טוען?
    [ ] מה קורה אם המשתמש מאבד גישה לטלפון?
    [ ] מה קורה אם Airtable Audit Log נכשל?
    [ ] מה קורה ב-cold start של Edge Function?
    [ ] מה קורה אם refreshToken גם פג תוקף?
    [ ] מה קורה אם tempToken פג תוקף לפני TOTP?
    [ ] מה קורה אם WebAuthn לא נתמך בדפדפן?
    [ ] מה קורה אם המשתמש מאבד את המכשיר המורשה?
    [ ] מה קורה אם יש 2 credentials (TOTP + WebAuthn)?
    ```

24. **Security Audit**
    ```
    [ ] Passwords מוצפנים עם bcrypt (לא plaintext)
    [ ] TOTP secrets מאובטחים ב-environment variables
    [ ] JWT secrets לא hardcoded בקוד
    [ ] Cookies עם httpOnly + Secure + SameSite
    [ ] Error messages לא חושפים מידע רגיש
    [ ] Audit log לא כולל סיסמאות או TOTP codes
    [ ] QR codes לא נשמרים לאחר setup
    [ ] Temp tokens פגי תוקף (5 דקות)
    [ ] WebAuthn challenges חד-פעמיים
    [ ] Public keys נשמרים באיירטייבל מוצפנים
    [ ] Credential counter מונע replay attacks
    ```

### Phase 8: Deployment (יום 6, 1-2 שעות)

25. **Vercel Environment Variables**
    - הוספת כל ה-AUTH_* variables
    - הוספת JWT_SECRET, JWT_REFRESH_SECRET
    - וידוא ש-ALLOWED_ORIGINS נכון

26. **Deploy**
    ```bash
    git add .
    git commit -m "Add JWT authentication, 2FA (TOTP + WebAuthn), and audit logging"
    git push
    vercel --prod
    ```

27. **Production Testing**
    - התחברות מ-production URL
    - בדיקת cookies ב-DevTools
    - וידוא audit log נוצר
    - בדיקה ממכשיר נייד

---

## Verification (איך לבדוק שהכל עובד)

### Local Development Testing

```bash
# Terminal 1: Run dev server
npm run dev

# Terminal 2: Test login
curl -X POST http://localhost:5173/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"tom","password":"TomPassword123"}' \
  -c cookies.txt

# Terminal 2: Test protected endpoint
curl http://localhost:5173/api/categories \
  -b cookies.txt

# Should return categories (authenticated)

# Terminal 2: Test without cookie
curl http://localhost:5173/api/categories

# Should return 401 Unauthorized
```

### Manual Test Flow

1. **Login Success:**
   - פתח http://localhost:5173
   - הזן username: `tom`
   - הזן password: `<TomPassword>`
   - לחץ התחבר
   - ✅ מנותב לאפליקציה
   - ✅ Audit log: Action=login, Success=true

2. **Login Failure:**
   - הזן username: `tom`
   - הזן password: `wrongpassword`
   - לחץ התחבר
   - ❌ הודעת שגיאה: "Invalid credentials"
   - ❌ נשאר ב-login screen

3. **Protected Endpoints:**
   - התחבר בהצלחה
   - פתח DevTools > Network
   - נווט לטאב "הכנסות תום"
   - ✅ בקשה ל-`/api/categories?type=income` עם status 200
   - ✅ Cookie `accessToken` נשלח בבקשה
   - התנתק
   - רענן דף
   - ❌ אין access לאפליקציה, חזרה ל-login

4. **Token Refresh:**
   - התחבר
   - המתן 15 דקות (או שנה את JWT_ACCESS_EXPIRY ל-`10s` לבדיקה)
   - בצע פעולה (הוסף הכנסה)
   - ✅ Client מזהה 401 + TOKEN_EXPIRED
   - ✅ Client קורא ל-`/api/auth/refresh`
   - ✅ פעולה מצליחה

5. **Audit Log:**
   - התחבר כ-tom
   - הוסף הכנסה
   - עבור ל-Airtable > טבלת Audit Log
   - ✅ רשומה: Username=tom, Action=create, Resource=income

### Production Testing

```bash
# 1. Deploy to Vercel
vercel --prod

# 2. Get production URL
# https://finances-tracker.vercel.app

# 3. Open in browser (Desktop)
# - Login with username/password
# - Test all features
# - Check cookies in DevTools > Application > Cookies
# - Verify httpOnly, Secure, SameSite flags

# 4. Open in browser (Mobile)
# - Install PWA to home screen
# - Test login
# - Test offline mode (if applicable)
# - Verify tokens persist after app restart
```

---

## Security Checklist

### ✅ מה המערכת מגנה עליו

- **Unauthorized API Access** → כל ה-endpoints דורשים JWT token תקף
- **Password Exposure** → סיסמאות מוצפנות עם bcrypt, לא בקוד
- **XSS Token Theft** → Tokens ב-httpOnly cookies, JavaScript לא יכול לגשת
- **CSRF Attacks** → SameSite=Strict cookies
- **Man-in-the-Middle** → HTTPS (Vercel), Secure cookies
- **Session Hijacking** → Access tokens קצרי טווח (15 דקות)
- **Unaudited Actions** → כל create/update/delete נרשם ב-Audit Log

### ⚠️ מגבלות ידועות

- **No Rate Limiting** → לפי בקשתך, לא מיושם בשלב זה (אפשר להוסיף בעתיד)
- **No Password Reset** → צריך ליצור contact עם admin לאיפוס סיסמה
- **No 2FA** → Single-factor authentication בלבד (username + password)
- **No Account Lockout** → אין הגבלה על מספר ניסיונות login כושלים
- **2 Users Only** → לא scalable ל-multi-tenant, מתאים לשימוש אישי
- **Shared Access** → שני המשתמשים רואים ומנהלים הכל (לפי בקשתך)

### 🔒 Best Practices מיושמים

- ✅ Passwords hashed with bcrypt (10 rounds)
- ✅ JWT tokens with expiry
- ✅ httpOnly + Secure + SameSite cookies
- ✅ Secrets in environment variables (not code)
- ✅ Audit logging for accountability
- ✅ HTTPS enforcement (Vercel)
- ✅ Server-side validation
- ✅ Error messages don't leak sensitive info

---

## תלויות חדשות (Dependencies)

```json
{
  "dependencies": {
    "jsonwebtoken": "^9.0.2",
    "bcryptjs": "^2.4.3",
    "cookie": "^0.6.0",
    "speakeasy": "^2.0.0",
    "qrcode": "^1.5.3",
    "@simplewebauthn/server": "^10.0.0",
    "@simplewebauthn/browser": "^10.0.0"
  },
  "devDependencies": {
    "@types/jsonwebtoken": "^9.0.5",
    "@types/bcryptjs": "^2.4.6",
    "@types/cookie": "^0.6.0",
    "@types/speakeasy": "^2.0.10",
    "@types/qrcode": "^1.5.5"
  }
}
```

**התקנה:**
```bash
npm install jsonwebtoken bcryptjs cookie speakeasy qrcode @simplewebauthn/server @simplewebauthn/browser
npm install -D @types/jsonwebtoken @types/bcryptjs @types/cookie @types/speakeasy @types/qrcode
```

---

## פתרון בעיות נפוצות (Troubleshooting)

### בעיה: Cookies לא נשלחים מ-Client

**סימפטום:** Endpoints מחזירים 401 למרות login מוצלח

**פתרון:**
1. וודא `credentials: 'include'` בכל fetch request
2. בדוק ש-CORS מוגדר נכון ב-Vercel
3. וודא ש-`ALLOWED_ORIGINS` כולל את ה-localhost וה-production URL
4. בדוק ב-DevTools > Application > Cookies שה-cookies קיימים

### בעיה: JWT verification נכשל

**סימפטום:** 403 Invalid token למרות token תקף

**פתרון:**
1. וודא ש-`JWT_SECRET` זהה בין development ו-production
2. בדוק שאין רווחים או line breaks ב-environment variable
3. וודא שהסיקרט הוא string תקין (64 characters hex)

### בעיה: bcrypt.compare תמיד מחזיר false

**סימפטום:** Login נכשל עם הסיסמה הנכונה

**פתרון:**
1. וודא שה-password hash נוצר עם `bcrypt hash <password> 10`
2. בדוק שאין `$2y$` במקום `$2b$` (bcrypt versions)
3. וודא שאין רווחים או line breaks ב-environment variable
4. נסה ליצור hash חדש:
   ```bash
   bcrypt-cli hash "YourPassword" 10
   ```

### בעיה: Audit Log לא נוצר

**סימפטום:** אין רשומות ב-Airtable Audit Log

**פתרון:**
1. בדוק שהטבלה "Audit Log" קיימת באיירטייבל
2. וודא ששמות השדות תואמים בדיוק (case-sensitive)
3. בדוק logs ב-Vercel Functions (console.error)
4. וודא שיש הרשאות write ל-Airtable API key

### בעיה: Token refresh לא עובד

**סימפטום:** אחרי 15 דקות המשתמש מנותק

**פתרון:**
1. בדוק ש-`refreshToken` cookie קיים (DevTools > Cookies)
2. וודא ש-`JWT_REFRESH_SECRET` שונה מ-`JWT_SECRET`
3. בדוק שה-Path של refreshToken הוא `/api/auth/refresh`
4. וודא שה-client קורא ל-`authApi.refresh()` ב-catch של 401

---

## הרחבות עתידיות (Out of Scope)

### Phase 5: Rate Limiting (אופציונלי)

אם בעתיד תרצה להוסיף:
1. הרשם ל-Upstash Redis (free tier)
2. הוסף environment variables: `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`
3. התקן: `npm install @upstash/redis`
4. יצור `/api/middleware/rateLimit.ts`
5. הוסף למידלוור של auth endpoints

### Phase 6: 2FA (Two-Factor Authentication)

1. התקן `speakeasy` ו-`qrcode`
2. הוסף שדה `totpSecret` לכל משתמש
3. יצור `/api/auth/2fa/setup` endpoint
4. יצור `/api/auth/2fa/verify` endpoint
5. עדכון LoginForm להכיל שדה TOTP

### Phase 7: Password Reset

1. יצור Airtable table "Password Resets"
2. יצור `/api/auth/reset-request` endpoint
3. שלח email עם token (Resend/SendGrid)
4. יצור `/api/auth/reset-confirm` endpoint
5. יצור UI לבקשת איפוס + אישור

---

## סיכום

תכנית זו מיישמת **production-ready security** עבור אפליקציית finances tracker:

✅ **JWT Authentication** - tokens מאובטחים עם httpOnly cookies
✅ **Username + Password** - כל משתמש עם credentials נפרדים
✅ **Protected Endpoints** - כל ה-APIs דורשים אימות
✅ **Audit Logging** - עקיבה אחרי כל פעולה
✅ **Token Refresh** - session נשאר פעיל 7 ימים
✅ **bcrypt Hashing** - סיסמאות מוצפנות
✅ **Shared Access** - שני המשתמשים רואים ומנהלים הכל

**זמן משוער:** 4-5 ימי עבודה (16-20 שעות) - כולל 2FA

**קבצים שישתנו:** 27 (17 חדש + 9 משתנים + 1 מחיקה חלקית)

**תלויות חדשות:** 5 (jsonwebtoken, bcryptjs, cookie, speakeasy, qrcode)

**אבני דרך:**
- יום 1: Setup + Backend auth
- יום 2: Protect endpoints
- יום 3: 2FA implementation
- יום 4: Client changes + Integration
- יום 5: Testing + Deployment

---

**Critical Success Factors:**
1. ✅ JWT secrets מאובטחים ב-environment variables
2. ✅ Password hashes נכונים (bcrypt 10 rounds)
3. ✅ טבלת Audit Log קיימת באיירטייבל
4. ✅ בדיקה מקיפה ב-local לפני deployment
5. ✅ Vercel environment variables מוגדרים נכון
