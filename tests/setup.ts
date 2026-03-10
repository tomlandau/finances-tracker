/**
 * Vitest global test setup
 * Sets env vars and global mocks for all tests
 */

// Auth
process.env.JWT_SECRET = 'test-jwt-secret-key-for-tests-only-do-not-use-in-prod';

// Crypto - 64 hex chars = 32 bytes for AES-256
process.env.CREDENTIALS_ENCRYPTION_KEY = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';

// Airtable (stubs - tests that need real values should set per-test)
process.env.AIRTABLE_API_KEY = 'test_key';
process.env.AIRTABLE_BASE_ID = 'test_base';
process.env.AIRTABLE_TRANSACTIONS_TABLE = 'תנועות';
process.env.AIRTABLE_INCOME_TABLE = 'הכנסות';
process.env.AIRTABLE_EXPENSE_TABLE = 'הוצאות';
process.env.AIRTABLE_INCOME_CATEGORIES_TABLE = 'מקורות הכנסה';
process.env.AIRTABLE_EXPENSE_CATEGORIES_TABLE = 'מקורות הוצאה';
process.env.AIRTABLE_CLASSIFICATION_RULES_TABLE = 'חוקי סיווג';
