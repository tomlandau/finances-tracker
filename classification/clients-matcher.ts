import Airtable from 'airtable';
import { parseISO, subDays, addDays, format } from 'date-fns';
import type { ClientRecord } from './types';

/**
 * Clients Matcher - אינטגרציה עם בסיסי נתונים של לקוחות העסקים
 *
 * Note: זהו stub - האינטגרציה המלאה תיושם כאשר נקבל:
 * 1. AIRTABLE_BUSINESS_1_BASE_ID (בסיס נתונים עסק תום)
 * 2. AIRTABLE_BUSINESS_2_BASE_ID (בסיס נתונים עסק יעל)
 * 3. סכמה מדויקת של טבלאות הלקוחות
 */
export class ClientsMatcher {
  private apiKey: string | undefined;
  private business1BaseId: string | undefined;
  private business2BaseId: string | undefined;
  private enabled: boolean = false;

  // Table and field names (will be configured when schemas are available)
  private readonly CLIENTS_TABLE = process.env.AIRTABLE_CLIENTS_TABLE_NAME || 'Clients';
  private readonly CLIENT_NAME_FIELD = process.env.AIRTABLE_CLIENT_NAME_FIELD || 'שם';
  private readonly CLIENT_PAYMENT_DATE_FIELD = process.env.AIRTABLE_CLIENT_PAYMENT_DATE_FIELD || 'תאריך תשלום צפוי';
  private readonly CLIENT_AMOUNT_FIELD = process.env.AIRTABLE_CLIENT_AMOUNT_FIELD || 'סכום צפוי';

  constructor() {
    this.apiKey = process.env.AIRTABLE_API_KEY;
    this.business1BaseId = process.env.AIRTABLE_BUSINESS_1_BASE_ID;
    this.business2BaseId = process.env.AIRTABLE_BUSINESS_2_BASE_ID;

    // Enable only if all credentials are present
    this.enabled = !!(this.apiKey && this.business1BaseId && this.business2BaseId);

    if (!this.enabled) {
      console.log('⚠️ Client Airtable bases disabled (missing configuration)');
    } else {
      console.log('✅ Client Airtable bases enabled');
    }
  }

  /**
   * חיפוש לקוח לפי תאריך וסכום
   *
   * @param date תאריך התנועה (YYYY-MM-DD)
   * @param amount סכום התנועה (חיובי)
   * @param userId מזהה משתמש (usr_tom_001 / usr_yael_001)
   * @returns רשומת לקוח אם נמצאה, null אחרת
   */
  async findMatch(
    date: string,
    amount: number,
    userId: string
  ): Promise<ClientRecord | null> {
    // If client bases are not enabled, return null
    if (!this.enabled) {
      return null;
    }

    try {
      // Determine which base to query based on userId
      const baseId = userId === 'usr_tom_001' ? this.business1BaseId : this.business2BaseId;
      const entity = userId === 'usr_tom_001' ? 'עסק תום' : 'עסק יעל';

      console.log(`  🔍 Searching ${entity} clients: ${date}, ₪${amount}`);

      // TODO: Implement actual Airtable query when base schemas are available
      //
      // Expected flow:
      // 1. Connect to business Airtable base
      // 2. Query clients table with filters:
      //    - Date range: ±7 days from transaction date
      //    - Amount range: ±10% tolerance
      // 3. Return best match
      //
      // Example implementation (pseudo-code):
      // const base = new Airtable({ apiKey: this.apiKey }).base(baseId);
      //
      // const dateFrom = format(subDays(parseISO(date), 7), 'yyyy-MM-dd');
      // const dateTo = format(addDays(parseISO(date), 7), 'yyyy-MM-dd');
      // const amountMin = amount * 0.9;
      // const amountMax = amount * 1.1;
      //
      // const records = await base(this.CLIENTS_TABLE)
      //   .select({
      //     filterByFormula: `AND(
      //       IS_AFTER({${this.CLIENT_PAYMENT_DATE_FIELD}}, '${dateFrom}'),
      //       IS_BEFORE({${this.CLIENT_PAYMENT_DATE_FIELD}}, '${dateTo}'),
      //       {${this.CLIENT_AMOUNT_FIELD}} >= ${amountMin},
      //       {${this.CLIENT_AMOUNT_FIELD}} <= ${amountMax}
      //     )`
      //   })
      //   .all();
      //
      // if (records.length > 0) {
      //   const record = records[0]; // Take first match
      //   return {
      //     id: record.id,
      //     name: record.get(this.CLIENT_NAME_FIELD) as string,
      //     expectedPaymentDate: record.get(this.CLIENT_PAYMENT_DATE_FIELD) as string,
      //     expectedAmount: record.get(this.CLIENT_AMOUNT_FIELD) as number,
      //     entity: entity as 'עסק תום' | 'עסק יעל'
      //   };
      // }

      // Stub: return null (no match)
      console.log(`  ⏸️ Client bases stub - skipping (implementation pending)`);
      return null;

    } catch (error) {
      console.error('❌ Client bases error:', error);
      return null;
    }
  }

  /**
   * קבלת כל הלקוחות עם תשלום צפוי בטווח תאריכים
   * (יושם בעתיד)
   */
  async getUpcomingPayments(
    userId: string,
    daysAhead: number = 30
  ): Promise<ClientRecord[]> {
    if (!this.enabled) {
      return [];
    }

    // TODO: Implement when client bases are configured
    // Useful for proactive notifications about expected payments

    return [];
  }

  /**
   * עדכון סטטוס תשלום של לקוח
   * (יושם בעתיד)
   */
  async markPaymentReceived(
    clientId: string,
    userId: string,
    transactionId: string
  ): Promise<void> {
    if (!this.enabled) {
      return;
    }

    // TODO: Implement when client bases are configured
    // Update client record with:
    // - Payment received date
    // - Actual amount
    // - Link to transaction
  }

  /**
   * בדיקה האם Client bases פעילים
   */
  isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * חיפוש לקוח לפי שם
   * (יושם בעתיד - שימושי לחיפוש ידני)
   */
  async searchByName(name: string, userId: string): Promise<ClientRecord[]> {
    if (!this.enabled) {
      return [];
    }

    // TODO: Implement fuzzy search by client name
    return [];
  }
}
