import { CompanyTypes } from 'israeli-bank-scrapers';

/**
 * Credentials לחיבור לבנק/כרטיס אשראי
 */
export interface BankCredentials {
  companyType: CompanyTypes;
  credentials: {
    id?: string;           // Discount (חובה), Max (אופציונלי)
    password?: string;     // כולם
    num?: string;          // Discount בלבד
    card6Digits?: string;  // לא בשימוש (Cal ו-Max משתמשים ב-username)
    username?: string;     // Cal ו-Max
  };
  accountName: string;     // "Discount - Tom", "Cal - Yael", "Max - Tom"
  userId: string;          // "usr_tom_001" או "usr_yael_001"
  accountNumbers?: string[]; // אופציונלי - מספרי חשבון/כרטיסים לסינון (רק אלו יסרקו)
}

/**
 * תנועה מנורמלת (אחרי סקרייפינג)
 */
export interface NormalizedTransaction {
  date: string;         // YYYY-MM-DD
  amount: number;       // סכום (חיובי להכנסה, שלילי להוצאה)
  description: string;  // תיאור התנועה
  source: string;       // שם החשבון (תואם ל-accountName)
  userId: string;       // "usr_tom_001" או "usr_yael_001"
  hash: string;         // MD5 hash למניעת כפילויות
}

/**
 * תוצאת סקרייפינג של חשבון בודד
 */
export interface ScrapeResult {
  accountName: string;
  success: boolean;
  transactions: NormalizedTransaction[];
  balance?: number;
  error?: string;
}

/**
 * סטטוס סקרייפינג כללי
 */
export interface ScraperStatus {
  lastRun: string | null;         // תאריך הרצה אחרונה
  totalAccounts: number;           // סה"כ חשבונות
  successfulAccounts: number;      // חשבונות שהצליחו
  failedAccounts: number;          // חשבונות שנכשלו
  newTransactions: number;         // תנועות חדשות
  errors: Array<{
    accountName: string;
    error: string;
  }>;
}
