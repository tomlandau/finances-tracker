# Tests Directory

## Test Scripts

קבצי bash לבדיקת endpoints ידנית:

- **test-auth.sh** - בדיקות כלליות של authentication endpoints
- **test-login-flow.sh** - בדיקת flow מלא של login
- **test-login-simple.sh** - בדיקה פשוטה של login

## שימוש

```bash
# הרצת בדיקות
cd tests
chmod +x test-auth.sh
./test-auth.sh
```

**הערה:** סקריפטים אלו נוצרו עבור Phase 2-6 ויכולים להידרש עדכון עבור Phase 5 (WebAuthn).

## WebAuthn Testing

לבדיקת WebAuthn, ראה:
- [../docs/WEBAUTHN_TESTING.md](../docs/WEBAUTHN_TESTING.md)

WebAuthn דורש דפדפן עם תמיכה ביומטרית ולא ניתן לבדוק עם curl.
