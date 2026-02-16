import Airtable from 'airtable';
import { parseISO, subDays, addDays, format } from 'date-fns';
import type { ClientRecord } from './types';

/**
 * Clients Matcher - אינטגרציה עם בסיסי נתונים של לקוחות העסקים
 *
 * עסק תום: טבלת "רישום לקוחות" (שם, מחיר, תאריך פגישה)
 * עסק יעל: טבלת "עבודות" (שם, מחיר, תאריך)
 */
export class ClientsMatcher {
  private apiKey: string | undefined;
  private businessTomBaseId: string | undefined;
  private businessYaelBaseId: string | undefined;
  private enabled: boolean = false;

  // Tom's table configuration
  private readonly TOM_CLIENTS_TABLE = process.env.AIRTABLE_TOM_CLIENTS_TABLE || 'רישום לקוחות';
  private readonly TOM_CLIENT_NAME_FIELD = process.env.AIRTABLE_TOM_CLIENT_NAME_FIELD || 'שם';
  private readonly TOM_CLIENT_AMOUNT_FIELD = process.env.AIRTABLE_TOM_CLIENT_AMOUNT_FIELD || 'מחיר';
  private readonly TOM_CLIENT_DATE_FIELD = process.env.AIRTABLE_TOM_CLIENT_DATE_FIELD || 'תאריך פגישה';

  // Yael's table configuration
  private readonly YAEL_CLIENTS_TABLE = process.env.AIRTABLE_YAEL_CLIENTS_TABLE || 'עבודות';
  private readonly YAEL_CLIENT_NAME_FIELD = process.env.AIRTABLE_YAEL_CLIENT_NAME_FIELD || 'שם';
  private readonly YAEL_CLIENT_AMOUNT_FIELD = process.env.AIRTABLE_YAEL_CLIENT_AMOUNT_FIELD || 'מחיר';
  private readonly YAEL_CLIENT_DATE_FIELD = process.env.AIRTABLE_YAEL_CLIENT_DATE_FIELD || 'תאריך';

  constructor() {
    this.apiKey = process.env.AIRTABLE_API_KEY;
    this.businessTomBaseId = process.env.AIRTABLE_BUSINESS_TOM_BASE_ID;
    this.businessYaelBaseId = process.env.AIRTABLE_BUSINESS_YAEL_BASE_ID;

    // Enable only if all credentials are present
    this.enabled = !!(this.apiKey && this.businessTomBaseId && this.businessYaelBaseId);

    if (!this.enabled) {
      console.log('⚠️ Client Airtable bases disabled (missing configuration)');
      if (!this.apiKey) console.log('  Missing: AIRTABLE_API_KEY');
      if (!this.businessTomBaseId) console.log('  Missing: AIRTABLE_BUSINESS_TOM_BASE_ID');
      if (!this.businessYaelBaseId) console.log('  Missing: AIRTABLE_BUSINESS_YAEL_BASE_ID');
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
      // Determine which base and configuration to use based on userId
      const isTom = userId === 'usr_tom_001';
      const baseId = isTom ? this.businessTomBaseId : this.businessYaelBaseId;
      const entity = isTom ? 'עסק תום' : 'עסק יעל';
      const tableName = isTom ? this.TOM_CLIENTS_TABLE : this.YAEL_CLIENTS_TABLE;
      const nameField = isTom ? this.TOM_CLIENT_NAME_FIELD : this.YAEL_CLIENT_NAME_FIELD;
      const amountField = isTom ? this.TOM_CLIENT_AMOUNT_FIELD : this.YAEL_CLIENT_AMOUNT_FIELD;
      const dateField = isTom ? this.TOM_CLIENT_DATE_FIELD : this.YAEL_CLIENT_DATE_FIELD;

      console.log(`  🔍 Searching ${entity} clients: ${date}, ₪${amount}`);

      // Connect to business Airtable base
      const base = new Airtable({ apiKey: this.apiKey }).base(baseId!);

      // Calculate date range (±7 days)
      const parsedDate = parseISO(date);
      const dateFrom = format(subDays(parsedDate, 7), 'yyyy-MM-dd');
      const dateTo = format(addDays(parsedDate, 7), 'yyyy-MM-dd');

      // Calculate amount range (±10%)
      const amountMin = amount * 0.9;
      const amountMax = amount * 1.1;

      // Query clients table
      const records = await base(tableName)
        .select({
          filterByFormula: `AND(
            IS_AFTER({${dateField}}, '${dateFrom}'),
            IS_BEFORE({${dateField}}, '${dateTo}'),
            {${amountField}} >= ${amountMin},
            {${amountField}} <= ${amountMax}
          )`,
          maxRecords: 5 // Limit to avoid large responses
        })
        .all();

      if (records.length > 0) {
        const record = records[0]; // Take first match (closest date/amount)
        const clientName = record.get(nameField) as string;
        const clientAmount = record.get(amountField) as number;
        const clientDate = record.get(dateField) as string;

        console.log(`  ✅ Found client match: ${clientName} (₪${clientAmount}, ${clientDate})`);

        return {
          id: record.id,
          name: clientName,
          expectedPaymentDate: clientDate,
          expectedAmount: clientAmount,
          entity: entity as 'עסק תום' | 'עסק יעל'
        };
      }

      console.log(`  ⚠️ No client match found`);
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
    _userId: string,
    _daysAhead: number = 30
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
    _clientId: string,
    _userId: string,
    _transactionId: string
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
  async searchByName(_name: string, _userId: string): Promise<ClientRecord[]> {
    if (!this.enabled) {
      return [];
    }

    // TODO: Implement fuzzy search by client name
    return [];
  }
}
