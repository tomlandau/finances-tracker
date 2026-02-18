import type { SumitInvoice } from './types';

const SUMIT_BASE_URL = 'https://api.sumit.co.il';

interface UserConfig {
  apiKey: string;
  companyId: number;
  docType: string;
  businessName: string;
}

/**
 * Sumit API Client - אינטגרציה עם Sumit לזיהוי חשבוניות
 *
 * Note: כל עסק משתמש ב-API key ו-Company ID נפרד משלו
 * - תום: InvoiceAndReceipt (1) - חשבונית מס/קבלה
 * - יעל: Receipt (2) - קבלה
 */
export class SumitClient {
  private configs: Record<string, UserConfig> = {};
  private enabled: boolean = false;

  constructor() {
    const apiKeyTom = process.env.SUMIT_API_KEY_TOM;
    const apiKeyYael = process.env.SUMIT_API_KEY_YAEL;
    const companyIdTom = process.env.SUMIT_COMPANY_ID_TOM;
    const companyIdYael = process.env.SUMIT_COMPANY_ID_YAEL;

    const missing = [];
    if (!apiKeyTom) missing.push('SUMIT_API_KEY_TOM');
    if (!apiKeyYael) missing.push('SUMIT_API_KEY_YAEL');
    if (!companyIdTom) missing.push('SUMIT_COMPANY_ID_TOM');
    if (!companyIdYael) missing.push('SUMIT_COMPANY_ID_YAEL');

    if (missing.length > 0) {
      console.log('⚠️ Sumit API disabled (missing credentials):', missing.join(', '));
      return;
    }

    this.configs['usr_tom_001'] = {
      apiKey: apiKeyTom!,
      companyId: parseInt(companyIdTom!),
      docType: 'InvoiceAndReceipt (1)',
      businessName: 'תום',
    };

    this.configs['usr_yael_001'] = {
      apiKey: apiKeyYael!,
      companyId: parseInt(companyIdYael!),
      docType: 'Receipt (2)',
      businessName: 'יעל',
    };

    this.enabled = true;
    console.log('✅ Sumit API enabled');
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
    userId: string
  ): Promise<SumitInvoice | null> {
    if (!this.enabled) return null;

    const config = this.configs[userId];
    if (!config) {
      console.log(`  ⚠️ No Sumit config for userId: ${userId}`);
      return null;
    }

    console.log(`  🔍 Searching Sumit (${config.businessName}) for: ${date}, ₪${amount}, ${description}`);

    try {
      const dateFrom = offsetDate(date, -7);
      const dateTo = offsetDate(date, 7);

      const response = await fetch(`${SUMIT_BASE_URL}/accounting/documents/list/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          Credentials: { CompanyID: config.companyId, APIKey: config.apiKey },
          DocumentTypes: [config.docType],
          DateFrom: `${dateFrom}T00:00:00`,
          DateTo: `${dateTo}T23:59:59`,
          IncludeDrafts: false,
          Paging: null,
        }),
      });

      if (!response.ok) {
        console.error(`  ❌ Sumit list HTTP error: ${response.status}`);
        return null;
      }

      const data = await response.json();

      if (data.Status !== 'Success (0)') {
        console.error(`  ❌ Sumit list error: ${data.UserErrorMessage || data.Status}`);
        return null;
      }

      const documents: any[] = data.Data?.Documents ?? [];

      if (documents.length === 0) {
        console.log(`  ℹ️ Sumit: no documents found in date range`);
        return null;
      }

      // מציאת התאמה לפי סכום (±1%) וקרבה לתאריך
      const matched = findBestMatch(documents, amount, date);

      if (!matched) {
        console.log(`  ℹ️ Sumit: no amount match for ₪${amount}`);
        return null;
      }

      // קביעת vatIncluded
      let vatIncluded: boolean;
      if (userId === 'usr_yael_001') {
        vatIncluded = false;
      } else {
        // תום: לפרסר מתוך פרטי המסמך
        vatIncluded = await this.getVatIncludedFromDetails(
          matched.DocumentID,
          config.docType,
          config.companyId,
          config.apiKey
        );
      }

      const docDate = parseDocumentDate(matched.DocumentDate ?? matched.Date ?? date);

      console.log(`  ✅ Sumit match found: מסמך #${matched.DocumentNumber}, ₪${matched.CompanyValue}, vatIncluded=${vatIncluded}`);

      return {
        id: String(matched.DocumentID),
        date: docDate,
        amount: matched.CompanyValue,
        customerName: matched.CustomerName ?? '',
        description: `מסמך #${matched.DocumentNumber}`,
        vatIncluded,
      };

    } catch (error) {
      console.error('❌ Sumit findInvoice error:', error);
      return null;
    }
  }

  /**
   * קריאת פרטי מסמך ובדיקה אם כולל מע"מ לפי שדות Items
   */
  private async getVatIncludedFromDetails(
    documentId: number,
    documentType: string,
    companyId: number,
    apiKey: string
  ): Promise<boolean> {
    try {
      const response = await fetch(`${SUMIT_BASE_URL}/accounting/documents/getdetails/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          Credentials: { CompanyID: companyId, APIKey: apiKey },
          DocumentID: documentId,
          DocumentType: documentType,
        }),
      });

      if (!response.ok) {
        console.error(`  ❌ Sumit getdetails HTTP error: ${response.status}`);
        return true; // ברירת מחדל לתום - כולל מע"מ
      }

      const data = await response.json();

      if (data.Status !== 'Success (0)') {
        console.error(`  ❌ Sumit getdetails error: ${data.UserErrorMessage || data.Status}`);
        return true;
      }

      const items: any[] = data.Data?.Document?.Items ?? [];
      const hasVat = items.some((item: any) => (item.VAT ?? 0) > 0);

      return hasVat;

    } catch (error) {
      console.error('❌ Sumit getdetails error:', error);
      return true; // ברירת מחדל לתום
    }
  }

  /**
   * בדיקה האם Sumit API פעיל
   */
  isEnabled(): boolean {
    return this.enabled;
  }
}

// ─── Helpers ───────────────────────────────────────────────────────────────

function offsetDate(dateStr: string, days: number): string {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

function parseDocumentDate(raw: string): string {
  // Sumit might return dates as ISO strings or /Date(...)/ format
  if (raw.startsWith('/Date(')) {
    const ms = parseInt(raw.replace(/\/Date\((\d+)[^)]*\)\//, '$1'));
    return new Date(ms).toISOString().split('T')[0];
  }
  // ISO or YYYY-MM-DD
  return raw.split('T')[0];
}

function findBestMatch(documents: any[], amount: number, date: string): any | null {
  const TOLERANCE = 0.01; // 1%

  const candidates = documents.filter((doc) => {
    const docAmount = doc.CompanyValue ?? doc.DocumentValue ?? 0;
    if (docAmount === 0) return false;
    return Math.abs(docAmount - amount) / amount <= TOLERANCE;
  });

  if (candidates.length === 0) return null;
  if (candidates.length === 1) return candidates[0];

  // בחירת הקרוב ביותר לתאריך
  const targetMs = new Date(date).getTime();
  candidates.sort((a, b) => {
    const dateA = parseDocumentDate(a.DocumentDate ?? a.Date ?? date);
    const dateB = parseDocumentDate(b.DocumentDate ?? b.Date ?? date);
    return Math.abs(new Date(dateA).getTime() - targetMs) - Math.abs(new Date(dateB).getTime() - targetMs);
  });

  return candidates[0];
}
