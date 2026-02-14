import { createScraper, type Transaction as ScrapedTransaction } from 'israeli-bank-scrapers';
import Airtable from 'airtable';
import { format, subDays } from 'date-fns';
import { CredentialsManager } from './credentials-manager';
import { generateTransactionHash } from '../lib/utils-hash';
import type { ScrapeResult, NormalizedTransaction, BankCredentials } from './types';

/**
 * מנהל הסקרייפינג - אחראי על כל תהליך הסקרייפינג
 */
export class ScraperManager {
  private credentialsManager: CredentialsManager;
  private base: any;

  constructor() {
    this.credentialsManager = new CredentialsManager();

    const apiKey = process.env.AIRTABLE_API_KEY;
    const baseId = process.env.AIRTABLE_BASE_ID;

    if (!apiKey || !baseId) {
      throw new Error('Missing Airtable configuration');
    }

    this.base = new Airtable({ apiKey }).base(baseId);
  }

  /**
   * סקרייפינג כל החשבונות
   */
  async scrapeAll(): Promise<ScrapeResult[]> {
    const results: ScrapeResult[] = [];
    const allCredentials = this.credentialsManager.getAll();

    console.log(`🔄 Starting scrape for ${allCredentials.length} accounts...`);

    for (const bankCreds of allCredentials) {
      console.log(`\n📊 Scraping ${bankCreds.accountName}...`);

      try {
        const result = await this.scrapeAccountWithRetry(bankCreds);
        results.push(result);

        // עדכון טבלת חשבונות
        if (result.success) {
          await this.updateAccountStatus(
            bankCreds.accountName,
            result.balance,
            bankCreds.userId
          );
          console.log(`✅ ${bankCreds.accountName}: ${result.transactions.length} new transactions`);
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error(`❌ ${bankCreds.accountName} failed:`, errorMessage);

        results.push({
          accountName: bankCreds.accountName,
          success: false,
          transactions: [],
          error: errorMessage
        });
      }
    }

    return results;
  }

  /**
   * סקרייפינג חשבון בודד עם retry
   */
  private async scrapeAccountWithRetry(
    bankCreds: BankCredentials,
    maxRetries = 3
  ): Promise<ScrapeResult> {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await this.scrapeAccount(bankCreds);
      } catch (error) {
        // Log full error details on first attempt
        if (attempt === 1) {
          console.error(`❌ Error details:`, error);
          if (error instanceof Error) {
            console.error(`   Stack: ${error.stack}`);
          }
        }

        if (attempt === maxRetries) {
          throw error;
        }

        const backoffMs = Math.pow(2, attempt) * 1000;
        console.log(`⏳ Retry ${attempt}/${maxRetries} after ${backoffMs}ms...`);
        await new Promise(resolve => setTimeout(resolve, backoffMs));
      }
    }

    throw new Error('Max retries exceeded');
  }

  /**
   * סקרייפינג חשבון בודד
   */
  private async scrapeAccount(bankCreds: BankCredentials): Promise<ScrapeResult> {
    // קביעת תאריך התחלה (30 יום אחורה או מהסקרייפינג האחרון)
    const startDate = await this.getLastScrapedDate(bankCreds.accountName);

    console.log(`  📅 Scraping from ${startDate.toISOString().split('T')[0]}`);

    // יצירת scraper עם options
    const scraper = createScraper({
      companyId: bankCreds.companyType,
      startDate: startDate,
      combineInstallments: false,
      showBrowser: false
    });

    // הרצת הסקרייפינג עם credentials
    // Using 'as any' because each company has different credential types
    const scrapeResult = await scraper.scrape(bankCreds.credentials as any);

    if (!scrapeResult.success) {
      throw new Error(scrapeResult.errorMessage || 'Scraping failed');
    }

    // סינון חשבונות לפי accountNumbers (אם צוין)
    let accounts = scrapeResult.accounts;
    if (bankCreds.accountNumbers && bankCreds.accountNumbers.length > 0) {
      const originalCount = accounts.length;
      accounts = accounts.filter(account =>
        bankCreds.accountNumbers!.includes(account.accountNumber)
      );
      console.log(`  🔍 Filtered ${originalCount} accounts → ${accounts.length} accounts (by accountNumbers)`);
    }

    // נרמול התנועות
    const allTransactions = accounts.flatMap(account => account.txns || []);
    const normalized = this.normalizeTransactions(allTransactions, bankCreds);

    console.log(`  📄 Found ${normalized.length} total transactions`);

    // סינון תנועות חדשות (deduplication)
    const newTransactions = await this.filterNewTransactions(normalized);

    console.log(`  ✨ ${newTransactions.length} new transactions`);

    // הכנסת תנועות חדשות ל-Airtable
    if (newTransactions.length > 0) {
      await this.insertTransactions(newTransactions);
    }

    // קבלת יתרה (מהחשבון הראשון)
    const balance = scrapeResult.accounts[0]?.balance;

    return {
      accountName: bankCreds.accountName,
      success: true,
      transactions: newTransactions,
      balance
    };
  }

  /**
   * נרמול תנועות מהסקרייפר לפורמט שלנו
   */
  private normalizeTransactions(
    txns: ScrapedTransaction[],
    bankCreds: BankCredentials
  ): NormalizedTransaction[] {
    return txns.map(txn => {
      // המרת תאריך לפורמט YYYY-MM-DD
      const date = format(new Date(txn.date), 'yyyy-MM-dd');

      // israeli-bank-scrapers מחזיר הוצאות כחיוביות - נהפוך לשליליות
      // סוג התנועה: charge = הוצאה, installments = תשלומים
      const amount = txn.type === 'normal' || txn.type === 'installments'
        ? -Math.abs(txn.chargedAmount)
        : Math.abs(txn.chargedAmount);

      const normalized: NormalizedTransaction = {
        date,
        amount,
        description: txn.description,
        source: bankCreds.accountName,
        userId: bankCreds.userId,
        hash: '' // נמלא בשלב הבא
      };

      // יצירת hash
      normalized.hash = generateTransactionHash(
        normalized.date,
        normalized.amount,
        normalized.description,
        normalized.source,
        normalized.userId
      );

      return normalized;
    });
  }

  /**
   * סינון תנועות חדשות (בדיקת כפילויות)
   */
  private async filterNewTransactions(
    transactions: NormalizedTransaction[]
  ): Promise<NormalizedTransaction[]> {
    if (transactions.length === 0) {
      return [];
    }

    const hashes = transactions.map(t => t.hash);

    // שאילתה ל-Airtable - בדיקת אילו hashes כבר קיימים
    const existingRecords = await this.base('תנועות')
      .select({
        filterByFormula: `OR(${hashes.map(h => `{TransactionHash} = '${h}'`).join(', ')})`,
        fields: ['TransactionHash']
      })
      .all();

    const existingHashes = new Set(
      existingRecords.map((r: any) => r.get('TransactionHash'))
    );

    // סינון רק תנועות שלא קיימות
    return transactions.filter(t => !existingHashes.has(t.hash));
  }

  /**
   * הכנסת תנועות חדשות ל-Airtable
   */
  private async insertTransactions(transactions: NormalizedTransaction[]): Promise<void> {
    // Airtable מגביל ל-10 records בכל קריאה, נעבוד בקבוצות
    const BATCH_SIZE = 10;

    for (let i = 0; i < transactions.length; i += BATCH_SIZE) {
      const batch = transactions.slice(i, i + BATCH_SIZE);

      const records = await Promise.all(batch.map(async txn => ({
        fields: {
          'TransactionHash': txn.hash,
          'תאריך': txn.date,
          'סכום': txn.amount,
          'תיאור': txn.description,
          'מקור': [await this.getAccountRecordId(txn.source)], // Link field
          'סטטוס': 'ממתין לסיווג',
          'מזהה משתמש': txn.userId
        }
      })));

      await this.base('תנועות').create(records);
    }

    console.log(`  💾 Inserted ${transactions.length} transactions to Airtable`);
  }

  /**
   * קבלת Record ID של חשבון מטבלת חשבונות (לצורך קישור)
   */
  private async getAccountRecordId(accountName: string): Promise<string> {
    const records = await this.base('חשבונות')
      .select({
        filterByFormula: `{שם} = '${accountName}'`,
        maxRecords: 1
      })
      .firstPage();

    if (records.length === 0) {
      // אם החשבון לא קיים, ניצור אותו
      return await this.createAccount(accountName);
    }

    return records[0].id;
  }

  /**
   * יצירת חשבון חדש בטבלת חשבונות
   */
  private async createAccount(accountName: string): Promise<string> {
    // זיהוי סוג וuserID מתוך שם החשבון
    const type = accountName.includes('Discount') ? 'חשבון בנק' : 'כרטיס אשראי';
    const userId = accountName.includes('Tom') ? 'usr_tom_001' : 'usr_yael_001';

    const record = await this.base('חשבונות').create({
      'שם': accountName,
      'סוג': type,
      'מזהה משתמש': userId,
      'פעיל': true
    });

    console.log(`  ✨ Created new account: ${accountName}`);
    return record.id;
  }

  /**
   * עדכון סטטוס חשבון (יתרה + תאריך סקרייפינג)
   */
  private async updateAccountStatus(
    accountName: string,
    balance: number | undefined,
    userId: string
  ): Promise<void> {
    const records = await this.base('חשבונות')
      .select({
        filterByFormula: `{שם} = '${accountName}'`,
        maxRecords: 1
      })
      .firstPage();

    const updateData: any = {
      'סקרייפינג אחרון': format(new Date(), 'yyyy-MM-dd')
    };

    if (balance !== undefined) {
      updateData['יתרה אחרונה'] = balance;
    }

    if (records.length > 0) {
      await this.base('חשבונות').update(records[0].id, updateData);
    } else {
      // יצירת חשבון חדש
      await this.base('חשבונות').create({
        'שם': accountName,
        'סוג': accountName.includes('Discount') ? 'חשבון בנק' : 'כרטיס אשראי',
        'מזהה משתמש': userId,
        'פעיל': true,
        ...updateData
      });
    }
  }

  /**
   * קבלת תאריך הסקרייפינג האחרון
   */
  private async getLastScrapedDate(accountName: string): Promise<Date> {
    try {
      const records = await this.base('חשבונות')
        .select({
          filterByFormula: `{שם} = '${accountName}'`,
          maxRecords: 1,
          fields: ['סקרייפינג אחרון']
        })
        .firstPage();

      if (records.length > 0) {
        const lastScraped = records[0].get('סקרייפינג אחרון');
        if (lastScraped) {
          return new Date(lastScraped as string);
        }
      }
    } catch (error) {
      console.warn(`Could not get last scraped date for ${accountName}, using default`);
    }

    // ברירת מחדל: 30 יום אחורה
    return subDays(new Date(), 30);
  }
}
