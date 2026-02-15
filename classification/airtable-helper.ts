import Airtable from 'airtable';
import type { Transaction, ClassificationRule, Category } from './types';

/**
 * Airtable Helper - מנהל את כל פעולות ה-CRUD עם Airtable עבור מנוע הסיווג
 */
export class AirtableHelper {
  private base: any;

  // Table names
  private readonly TRANSACTIONS_TABLE = process.env.AIRTABLE_TRANSACTIONS_TABLE || 'תנועות';
  private readonly INCOME_TABLE = process.env.AIRTABLE_INCOME_TABLE || 'הכנסות';
  private readonly EXPENSE_TABLE = process.env.AIRTABLE_EXPENSE_TABLE || 'הוצאות';
  private readonly INCOME_CATEGORIES_TABLE = process.env.AIRTABLE_INCOME_CATEGORIES_TABLE || 'מקורות הכנסה';
  private readonly EXPENSE_CATEGORIES_TABLE = process.env.AIRTABLE_EXPENSE_CATEGORIES_TABLE || 'מקורות הוצאה';
  private readonly CLASSIFICATION_RULES_TABLE = process.env.AIRTABLE_CLASSIFICATION_RULES_TABLE || 'חוקי סיווג';

  // Transaction table fields
  private readonly TX_HASH_FIELD = process.env.AIRTABLE_TRANSACTION_HASH_FIELD || 'TransactionHash';
  private readonly TX_DATE_FIELD = process.env.AIRTABLE_TRANSACTION_DATE_FIELD || 'תאריך';
  private readonly TX_AMOUNT_FIELD = process.env.AIRTABLE_TRANSACTION_AMOUNT_FIELD || 'סכום';
  private readonly TX_DESCRIPTION_FIELD = process.env.AIRTABLE_TRANSACTION_DESCRIPTION_FIELD || 'תיאור';
  private readonly TX_SOURCE_FIELD = process.env.AIRTABLE_TRANSACTION_SOURCE_FIELD || 'מקור';
  private readonly TX_STATUS_FIELD = process.env.AIRTABLE_TRANSACTION_STATUS_FIELD || 'סטטוס';
  private readonly TX_USER_ID_FIELD = process.env.AIRTABLE_TRANSACTION_USER_ID_FIELD || 'מזהה משתמש';

  // Income table fields
  private readonly INCOME_DATE_FIELD = process.env.AIRTABLE_INCOME_DATE_FIELD || 'תאריך';
  private readonly INCOME_CATEGORY_FIELD = process.env.AIRTABLE_INCOME_CATEGORY_FIELD || 'מקור הכנסה';
  private readonly INCOME_AMOUNT_FIELD = process.env.AIRTABLE_INCOME_AMOUNT_FIELD || 'סכום הזנה';
  private readonly INCOME_DESCRIPTION_FIELD = process.env.AIRTABLE_INCOME_DESCRIPTION_FIELD || 'תיאור/הערות';
  private readonly INCOME_VAT_TYPE_FIELD = process.env.AIRTABLE_INCOME_VAT_TYPE_FIELD || 'הזנה עם או בלי מע"מ';

  // Expense table fields
  private readonly EXPENSE_DATE_FIELD = process.env.AIRTABLE_EXPENSE_DATE_FIELD || 'תאריך';
  private readonly EXPENSE_CATEGORY_FIELD = process.env.AIRTABLE_EXPENSE_CATEGORY_FIELD || 'מקור הוצאה';
  private readonly EXPENSE_AMOUNT_FIELD = process.env.AIRTABLE_EXPENSE_AMOUNT_FIELD || 'סכום הזנה';
  private readonly EXPENSE_DESCRIPTION_FIELD = process.env.AIRTABLE_EXPENSE_DESCRIPTION_FIELD || 'הערות נוספות';
  private readonly EXPENSE_VAT_TYPE_FIELD = process.env.AIRTABLE_EXPENSE_VAT_TYPE_FIELD || 'הזנה עם או בלי מע"מ';

  // Category table fields
  private readonly CATEGORY_NAME_FIELD = process.env.AIRTABLE_CATEGORY_NAME_FIELD || 'שם';
  private readonly CATEGORY_STATUS_FIELD = process.env.AIRTABLE_CATEGORY_STATUS_FIELD || 'סטטוס';
  private readonly EXPENSE_CATEGORY_NAME_FIELD = process.env.AIRTABLE_EXPENSE_CATEGORY_NAME_FIELD || 'תיאור/הערות';
  private readonly EXPENSE_CATEGORY_STATUS_FIELD = process.env.AIRTABLE_EXPENSE_CATEGORY_STATUS_FIELD || 'סטטוס';
  private readonly EXPENSE_BUSINESS_HOME_FIELD = process.env.AIRTABLE_EXPENSE_BUSINESS_HOME_FIELD || 'עסקי/בית';

  // Classification Rules table fields
  private readonly RULE_PATTERN_FIELD = process.env.AIRTABLE_RULE_PATTERN_FIELD || 'תבנית התאמה';
  private readonly RULE_CATEGORY_FIELD = process.env.AIRTABLE_RULE_CATEGORY_FIELD || 'קטגוריה';
  private readonly RULE_ENTITY_FIELD = process.env.AIRTABLE_RULE_ENTITY_FIELD || 'ישות';
  private readonly RULE_TYPE_FIELD = process.env.AIRTABLE_RULE_TYPE_FIELD || 'סוג';
  private readonly RULE_CONFIDENCE_FIELD = process.env.AIRTABLE_RULE_CONFIDENCE_FIELD || 'רמת ביטחון';
  private readonly RULE_TIMES_USED_FIELD = process.env.AIRTABLE_RULE_TIMES_USED_FIELD || 'מספר שימושים';
  private readonly RULE_CREATED_BY_FIELD = process.env.AIRTABLE_RULE_CREATED_BY_FIELD || 'נוצר על ידי';
  // private readonly RULE_DESCRIPTION_FIELD = process.env.AIRTABLE_RULE_DESCRIPTION_FIELD || 'תיאור';

  constructor() {
    const apiKey = process.env.AIRTABLE_API_KEY;
    const baseId = process.env.AIRTABLE_BASE_ID;

    if (!apiKey || !baseId) {
      throw new Error('Missing Airtable configuration');
    }

    this.base = new Airtable({ apiKey }).base(baseId);
  }

  /**
   * יצירת record חדש בטבלת הכנסות
   */
  async createIncomeRecord(
    transaction: Transaction,
    categoryId: string,
    _entity: string,
    source: 'sumit' | 'client' | 'rule' | 'manual'
  ): Promise<string> {
    const record = await this.base(this.INCOME_TABLE).create({
      [this.INCOME_DATE_FIELD]: transaction.date,
      [this.INCOME_CATEGORY_FIELD]: [categoryId], // Link field - must be array
      [this.INCOME_AMOUNT_FIELD]: Math.abs(transaction.amount),
      [this.INCOME_DESCRIPTION_FIELD]: `${transaction.description} (סווג: ${source})`,
      [this.INCOME_VAT_TYPE_FIELD]: 'ללא מע"מ',
    });

    console.log(`  ✅ Created income record: ${record.id} (${source})`);
    return record.id;
  }

  /**
   * יצירת record חדש בטבלת הוצאות
   */
  async createExpenseRecord(
    transaction: Transaction,
    categoryId: string,
    _entity: string,
    source: 'rule' | 'manual'
  ): Promise<string> {
    const record = await this.base(this.EXPENSE_TABLE).create({
      [this.EXPENSE_DATE_FIELD]: transaction.date,
      [this.EXPENSE_CATEGORY_FIELD]: [categoryId], // Link field - must be array
      [this.EXPENSE_AMOUNT_FIELD]: Math.abs(transaction.amount),
      [this.EXPENSE_DESCRIPTION_FIELD]: `${transaction.description} (סווג: ${source})`,
      [this.EXPENSE_VAT_TYPE_FIELD]: 'ללא מע"מ',
    });

    console.log(`  ✅ Created expense record: ${record.id} (${source})`);
    return record.id;
  }

  /**
   * עדכון סטטוס תנועה לאחר סיווג
   */
  async updateTransactionStatus(
    transactionId: string,
    status: 'סווג אוטומטית' | 'סווג ידנית' | 'התעלם',
    linkedRecordId: string | null,
    ruleId: string | null
  ): Promise<void> {
    const updateData: any = {
      [this.TX_STATUS_FIELD]: status
    };

    if (linkedRecordId) {
      updateData['רשומה מקושרת'] = [linkedRecordId];
    }

    if (ruleId) {
      updateData['סווג על ידי חוק'] = [ruleId];
    }

    await this.base(this.TRANSACTIONS_TABLE).update(transactionId, updateData);
    console.log(`  ✅ Updated transaction status: ${transactionId} → ${status}`);
  }

  /**
   * שליפת תנועות ממתינות לסיווג
   */
  async getPendingTransactions(): Promise<Transaction[]> {
    const records = await this.base(this.TRANSACTIONS_TABLE)
      .select({
        filterByFormula: `{${this.TX_STATUS_FIELD}} = 'ממתין לסיווג'`,
        sort: [{
          field: this.TX_DATE_FIELD,
          direction: 'desc'
        }]
      })
      .all();

    return records.map((r: any) => ({
      id: r.id,
      hash: r.get(this.TX_HASH_FIELD) as string,
      date: r.get(this.TX_DATE_FIELD) as string,
      amount: r.get(this.TX_AMOUNT_FIELD) as number,
      description: r.get(this.TX_DESCRIPTION_FIELD) as string,
      source: r.get(this.TX_SOURCE_FIELD) as string,
      userId: r.get(this.TX_USER_ID_FIELD) as string,
      status: r.get(this.TX_STATUS_FIELD) as string,
    }));
  }

  /**
   * שליפת כל חוקי הסיווג הפעילים
   */
  async getActiveRules(): Promise<ClassificationRule[]> {
    const records = await this.base(this.CLASSIFICATION_RULES_TABLE)
      .select({
        // Sort by confidence (מאושר first) then by times used
        sort: [
          { field: this.RULE_CONFIDENCE_FIELD, direction: 'desc' },
          { field: this.RULE_TIMES_USED_FIELD, direction: 'desc' }
        ]
      })
      .all();

    return records.map((r: any) => {
      // Normalize categoryId - can be array or single value
      const categoryIdArray = r.get(this.RULE_CATEGORY_FIELD);
      const categoryId = Array.isArray(categoryIdArray)
        ? categoryIdArray[0]
        : categoryIdArray;

      // Convert Hebrew type to English
      const typeHebrew = r.get(this.RULE_TYPE_FIELD) as string;
      const type = typeHebrew === 'הוצאה' ? 'expense' : 'income';

      return {
        id: r.id,
        pattern: r.get(this.RULE_PATTERN_FIELD) as string,
        categoryId: categoryId as string,
        entity: r.get(this.RULE_ENTITY_FIELD) as string,
        type: type as 'income' | 'expense',
        confidence: r.get(this.RULE_CONFIDENCE_FIELD) as 'אוטומטי' | 'מאושר',
        timesUsed: r.get(this.RULE_TIMES_USED_FIELD) as number || 0,
        createdBy: r.get(this.RULE_CREATED_BY_FIELD) as string,
      };
    });
  }

  /**
   * יצירת חוק סיווג חדש
   */
  async createRule(
    pattern: string,
    categoryId: string,
    entity: string,
    type: 'income' | 'expense',
    userId: string
  ): Promise<string> {
    // Convert English type to Hebrew for Airtable
    const typeHebrew = type === 'income' ? 'הכנסה' : 'הוצאה';

    const record = await this.base(this.CLASSIFICATION_RULES_TABLE).create({
      [this.RULE_PATTERN_FIELD]: pattern,
      [this.RULE_CATEGORY_FIELD]: [categoryId], // Link field - must be array
      [this.RULE_ENTITY_FIELD]: entity,
      [this.RULE_TYPE_FIELD]: typeHebrew,
      [this.RULE_CONFIDENCE_FIELD]: 'אוטומטי',
      [this.RULE_TIMES_USED_FIELD]: 0,
      [this.RULE_CREATED_BY_FIELD]: userId,
    });

    console.log(`  ✅ Created rule: ${pattern} → ${entity} (${typeHebrew})`);
    return record.id;
  }

  /**
   * עדכון מונה שימושים של חוק
   */
  async incrementRuleUsage(ruleId: string, currentCount: number): Promise<void> {
    const newCount = currentCount + 1;
    const updateData: any = {
      [this.RULE_TIMES_USED_FIELD]: newCount
    };

    // Upgrade to confirmed after 5 uses
    if (newCount >= 5) {
      updateData[this.RULE_CONFIDENCE_FIELD] = 'מאושר';
      console.log(`  🎓 Rule ${ruleId} upgraded to מאושר (${newCount} uses)`);
    }

    await this.base(this.CLASSIFICATION_RULES_TABLE).update(ruleId, updateData);
    console.log(`  ✅ Incremented rule usage: ${ruleId} → ${newCount}`);
  }

  /**
   * שליפת קטגוריות לפי סוג וישות
   */
  async getCategories(
    type: 'income' | 'expense',
    entity?: string
  ): Promise<Category[]> {
    const tableName = type === 'income'
      ? this.INCOME_CATEGORIES_TABLE
      : this.EXPENSE_CATEGORIES_TABLE;

    const nameField = type === 'income'
      ? this.CATEGORY_NAME_FIELD
      : this.EXPENSE_CATEGORY_NAME_FIELD;

    const statusField = type === 'income'
      ? this.CATEGORY_STATUS_FIELD
      : this.EXPENSE_CATEGORY_STATUS_FIELD;

    // Build filter - for expenses, optionally filter by entity
    let filterFormula = `{${statusField}} = 'פעיל'`;

    if (type === 'expense' && entity) {
      filterFormula = `AND(
        {${statusField}} = 'פעיל',
        {${this.EXPENSE_BUSINESS_HOME_FIELD}} = '${entity}'
      )`;
    }

    const records = await this.base(tableName)
      .select({
        filterByFormula: filterFormula,
        sort: [{ field: nameField, direction: 'asc' }]
      })
      .all();

    return records.map((r: any) => ({
      id: r.id,
      name: r.get(nameField) as string,
      type,
      entity: entity
    }));
  }

  /**
   * שליפת תנועה בודדת לפי ID
   */
  async getTransactionById(transactionId: string): Promise<Transaction | null> {
    try {
      const record = await this.base(this.TRANSACTIONS_TABLE).find(transactionId);

      return {
        id: record.id,
        hash: record.get(this.TX_HASH_FIELD) as string,
        date: record.get(this.TX_DATE_FIELD) as string,
        amount: record.get(this.TX_AMOUNT_FIELD) as number,
        description: record.get(this.TX_DESCRIPTION_FIELD) as string,
        source: record.get(this.TX_SOURCE_FIELD) as string,
        userId: record.get(this.TX_USER_ID_FIELD) as string,
        status: record.get(this.TX_STATUS_FIELD) as string,
      };
    } catch (error) {
      console.error(`Transaction not found: ${transactionId}`, error);
      return null;
    }
  }

  /**
   * שליפת קטגוריה בודדת לפי ID
   */
  async getCategoryById(categoryId: string, type: 'income' | 'expense'): Promise<Category | null> {
    try {
      const tableName = type === 'income'
        ? this.INCOME_CATEGORIES_TABLE
        : this.EXPENSE_CATEGORIES_TABLE;

      const nameField = type === 'income'
        ? this.CATEGORY_NAME_FIELD
        : this.EXPENSE_CATEGORY_NAME_FIELD;

      const record = await this.base(tableName).find(categoryId);

      return {
        id: record.id,
        name: record.get(nameField) as string,
        type
      };
    } catch (error) {
      console.error(`Category not found: ${categoryId}`, error);
      return null;
    }
  }
}
