import type { SumitInvoice } from './types';

/**
 * Sumit API Client - אינטגרציה עם Sumit לזיהוי חשבוניות
 *
 * Note: זהו stub - האינטגרציה המלאה תיושם כאשר נקבל:
 * 1. SUMIT_API_KEY
 * 2. SUMIT_BUSINESS_1_ID (עסק תום)
 * 3. SUMIT_BUSINESS_2_ID (עסק יעל)
 */
export class SumitClient {
  private apiKey: string | undefined;
  private business1Id: string | undefined;
  private business2Id: string | undefined;
  private enabled: boolean = false;

  constructor() {
    this.apiKey = process.env.SUMIT_API_KEY;
    this.business1Id = process.env.SUMIT_BUSINESS_1_ID;
    this.business2Id = process.env.SUMIT_BUSINESS_2_ID;

    // Enable only if all credentials are present
    this.enabled = !!(this.apiKey && this.business1Id && this.business2Id);

    if (!this.enabled) {
      console.log('⚠️ Sumit API disabled (missing credentials)');
    } else {
      console.log('✅ Sumit API enabled');
    }
  }

  /**
   * חיפוש חשבונית לפי תאריך, סכום ותיאור
   *
   * @param date תאריך התנועה (YYYY-MM-DD)
   * @param amount סכום התנועה (חיובי)
   * @param description תיאור התנועה
   * @param userId מזהה משתמש (usr_tom_001 / usr_yael_001)
   * @returns חשבונית אם נמצאה, null אחרת
   */
  async findInvoice(
    date: string,
    amount: number,
    description: string,
    _userId: string
  ): Promise<SumitInvoice | null> {
    // If Sumit is not enabled, return null
    if (!this.enabled) {
      return null;
    }

    try {
      // Determine which business to query based on userId
      // const businessId = userId === 'usr_tom_001' ? this.business1Id : this.business2Id;

      console.log(`  🔍 Searching Sumit for invoice: ${date}, ₪${amount}, ${description}`);

      // TODO: Implement actual Sumit API call when credentials are available
      //
      // Expected API flow:
      // 1. Query Sumit API: GET /api/v1/invoices
      // 2. Filter by:
      //    - businessId
      //    - date range: ±3 days from transaction date
      //    - amount: exact match OR ±5% tolerance
      // 3. Match description (fuzzy matching on customer name)
      // 4. Return best match
      //
      // Example API call (pseudo-code):
      // const response = await fetch(`https://api.sumit.co.il/v1/invoices`, {
      //   headers: {
      //     'Authorization': `Bearer ${this.apiKey}`,
      //     'Content-Type': 'application/json'
      //   },
      //   params: {
      //     businessId,
      //     dateFrom: subDays(parseISO(date), 3).toISOString(),
      //     dateTo: addDays(parseISO(date), 3).toISOString(),
      //     amountMin: amount * 0.95,
      //     amountMax: amount * 1.05
      //   }
      // });
      //
      // const invoices = await response.json();
      // return this.findBestMatch(invoices, description);

      // Stub: return null (no match)
      console.log(`  ⏸️ Sumit API stub - skipping (implementation pending)`);
      return null;

    } catch (error) {
      console.error('❌ Sumit API error:', error);
      return null;
    }
  }

  /**
   * מציאת התאמה הטובה ביותר מתוך רשימת חשבוניות
   * (יושם בעתיד כשיהיה Sumit API פעיל)
   */
  // private findBestMatch(_invoices: any[], _description: string): SumitInvoice | null {
  //   // TODO: Implement fuzzy matching logic
  //   // - Compare customer names with transaction description
  //   // - Calculate similarity score
  //   // - Return invoice with highest score (above threshold)
  //
  //   return null;
  // }

  /**
   * בדיקה האם Sumit API פעיל
   */
  isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * קבלת פרטי חשבונית ספציפית לפי ID
   * (יושם בעתיד)
   */
  async getInvoiceById(_invoiceId: string): Promise<SumitInvoice | null> {
    if (!this.enabled) {
      return null;
    }

    // TODO: Implement when Sumit API is available
    return null;
  }

  /**
   * רענון מטמון חשבוניות
   * (יושם בעתיד אם נחליט להשתמש במטמון)
   */
  async refreshCache(): Promise<void> {
    if (!this.enabled) {
      return;
    }

    // TODO: Implement caching strategy if needed
    // - Fetch recent invoices (last 90 days)
    // - Store in memory or Redis
    // - Refresh every X hours
  }
}
