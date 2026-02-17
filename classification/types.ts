/**
 * Classification Engine Types
 *
 * TypeScript interfaces for the transaction classification system
 */

export interface ClassificationResult {
  success: boolean;
  method: 'sumit' | 'client_match' | 'rule' | 'manual' | 'already_recorded' | 'failed';
  category: {
    id: string;
    name: string;
    type: 'income' | 'expense';
  } | null;
  entity: 'בית' | 'עסק תום' | 'עסק יעל' | 'עסק - משותף' | null;
  confidence: 'אוטומטי' | 'מאושר';
  ruleId?: string;
  metadata?: any;
}

export interface Transaction {
  id: string;
  hash: string;
  date: string;          // YYYY-MM-DD
  amount: number;        // Negative = expense, Positive = income
  description: string;
  source: string;        // Account name
  userId: string;        // usr_tom_001 / usr_yael_001
  status: string;
  linkedRecordId?: string;  // ID of linked income/expense record (if already classified)
}

export interface ClassificationRule {
  id: string;
  pattern: string;           // תבנית התאמה
  categoryId: string;        // קישור לקטגוריה
  entity: string;            // ישות
  type: 'income' | 'expense';
  confidence: 'אוטומטי' | 'מאושר';
  timesUsed: number;
  createdBy: string;
  overrideAmount?: number;   // סכום מוגדר - שדה אופציונלי לדריסת הסכום האמיתי (למשל 019, Cloudways)
  isPaymentApp?: boolean;    // סימון לחוקים שנוצרו מאפליקציות תשלום - לא להשתמש כחוק קבוע
}

export interface SumitInvoice {
  id: string;
  date: string;
  amount: number;
  customerName: string;
  description: string;
  vatIncluded: boolean;  // האם הסכום כולל מע"מ (מגיע ישירות מ-Sumit)
}

export interface ClientRecord {
  id: string;
  name: string;
  expectedPaymentDate?: string;
  expectedAmount?: number;
  entity: 'עסק תום' | 'עסק יעל';
}

export interface Category {
  id: string;
  name: string;
  type: 'income' | 'expense';
  entity?: string;
}
