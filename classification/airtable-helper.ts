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
  // Optional: lookup/formula field that resolves linked account name to text
  // Add a Lookup field in Airtable: "שם מקור" → looks up "שם" from the linked account record
  private readonly TX_SOURCE_NAME_FIELD = process.env.AIRTABLE_TRANSACTION_SOURCE_NAME_FIELD || '';
  private readonly TX_STATUS_FIELD = process.env.AIRTABLE_TRANSACTION_STATUS_FIELD || 'סטטוס';
  private readonly TX_USER_ID_FIELD = process.env.AIRTABLE_TRANSACTION_USER_ID_FIELD || 'מזהה משתמש';
  private readonly TX_LINKED_RECORD_FIELD = process.env.AIRTABLE_TRANSACTION_LINKED_RECORD_FIELD || 'רשומה מקושרת';

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
  private readonly CATEGORY_OWNER_FIELD = process.env.AIRTABLE_CATEGORY_OWNER_FIELD || 'של מי ההכנסה';
  private readonly EXPENSE_CATEGORY_NAME_FIELD = process.env.AIRTABLE_EXPENSE_CATEGORY_NAME_FIELD || 'תיאור/הערות';
  private readonly EXPENSE_CATEGORY_STATUS_FIELD = process.env.AIRTABLE_EXPENSE_CATEGORY_STATUS_FIELD || 'סטטוס';
  private readonly EXPENSE_BUSINESS_HOME_FIELD = process.env.AIRTABLE_EXPENSE_BUSINESS_HOME_FIELD || 'עסקי/בית';

  // Classification Rules table fields
  private readonly RULE_PATTERN_FIELD = process.env.AIRTABLE_RULE_PATTERN_FIELD || 'תבנית התאמה';
  private readonly RULE_INCOME_CATEGORY_FIELD = process.env.AIRTABLE_RULE_INCOME_CATEGORY_FIELD || 'קטגוריית הכנסה';
  private readonly RULE_EXPENSE_CATEGORY_FIELD = process.env.AIRTABLE_RULE_EXPENSE_CATEGORY_FIELD || 'קטגוריית הוצאה';
  private readonly RULE_ENTITY_FIELD = process.env.AIRTABLE_RULE_ENTITY_FIELD || 'ישות';
  private readonly RULE_TYPE_FIELD = process.env.AIRTABLE_RULE_TYPE_FIELD || 'סוג';
  private readonly RULE_CONFIDENCE_FIELD = process.env.AIRTABLE_RULE_CONFIDENCE_FIELD || 'רמת ביטחון';
  private readonly RULE_TIMES_USED_FIELD = process.env.AIRTABLE_RULE_TIMES_USED_FIELD || 'מספר שימושים';
  private readonly RULE_CREATED_BY_FIELD = process.env.AIRTABLE_RULE_CREATED_BY_FIELD || 'נוצר על ידי';
  private readonly RULE_OVERRIDE_AMOUNT_FIELD = process.env.AIRTABLE_RULE_OVERRIDE_AMOUNT_FIELD || 'סכום מוגדר';
  private readonly RULE_IGNORE_FIELD = process.env.AIRTABLE_RULE_IGNORE_FIELD || 'התעלם';
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
   * נרמול שדה מקור - עשוי להיות טקסט או linked record (מחזיר מזהים)
   * אם TX_SOURCE_NAME_FIELD מוגדר (lookup/formula field) - ישתמש בו לשם קריא
   */
  private normalizeSource(record: any): string {
    // Try the display name field first (lookup/formula field)
    if (this.TX_SOURCE_NAME_FIELD) {
      const nameValue = record.get(this.TX_SOURCE_NAME_FIELD);
      if (nameValue && typeof nameValue === 'string' && nameValue.trim()) {
        return nameValue;
      }
      // Lookup fields return arrays
      if (Array.isArray(nameValue) && nameValue.length > 0) {
        return String(nameValue[0]);
      }
    }

    // Fallback to raw source field
    const raw = record.get(this.TX_SOURCE_FIELD);
    if (typeof raw === 'string') return raw;
    // Linked record field returns array of record IDs - show first ID as fallback
    if (Array.isArray(raw) && raw.length > 0) return String(raw[0]);
    return '';
  }

  /**
   * מיפוי ישות למבנה טבלת הכנסות
   * Income categories use: "תום", "יעל", "משותף"
   * But the system uses: "עסק תום", "עסק יעל", "עסק - משותף"
   */
  private mapEntityForIncome(entity: string): string {
    const mapping: Record<string, string> = {
      'עסק תום': 'תום',
      'עסק יעל': 'יעל',
      'עסק - משותף': 'משותף',
      'בית': 'בית', // Keep as-is if exists
    };

    return mapping[entity] || entity;
  }

  /**
   * מיפוי ישות לערך בשדה "עסקי/בית" בקטגוריות הוצאה
   * The expense "עסקי/בית" field has values: "עסקי" or "בית"
   * But the system entity names are: "עסק תום", "עסק יעל", "עסק - משותף", "בית"
   */
  private mapEntityForExpense(entity: string): string {
    if (entity === 'בית') return 'בית';
    // All business entities map to 'עסקי'
    return 'עסקי';
  }

  /**
   * יצירת record חדש בטבלת הכנסות
   */
  async createIncomeRecord(
    transaction: Transaction,
    categoryId: string,
    entity: string,
    source: 'sumit' | 'client' | 'rule' | 'manual',
    vatIncluded?: boolean
  ): Promise<string> {
    // vatIncluded מגיע מ-Sumit ישירות (אם זמין), אחרת לוגיקת ברירת מחדל:
    // רק לקוחות תום כוללים מע"מ; יעל + שאר המקורות — ללא מע"מ
    const resolvedVatIncluded = vatIncluded ?? (source === 'client' && entity === 'עסק תום');
    const vatType = resolvedVatIncluded ? 'כולל מע"מ' : 'לפני/ללא מע"מ';
    const record = await this.base(this.INCOME_TABLE).create({
      [this.INCOME_DATE_FIELD]: transaction.date,
      [this.INCOME_CATEGORY_FIELD]: [categoryId], // Link field - must be array
      [this.INCOME_AMOUNT_FIELD]: Math.abs(transaction.amount),
      [this.INCOME_DESCRIPTION_FIELD]: `${transaction.description} (סווג: ${source})`,
      [this.INCOME_VAT_TYPE_FIELD]: vatType,
    });

    console.log(`  ✅ Created income record: ${record.id} (${source})`);
    return record.id;
  }

  /**
   * יצירת record חדש בטבלת הוצאות
   * @param overrideAmount סכום לרישום - אם מוגדר, ישמש במקום הסכום האמיתי (למשל 019, Cloudways)
   */
  async createExpenseRecord(
    transaction: Transaction,
    categoryId: string,
    _entity: string,
    source: 'rule' | 'manual',
    overrideAmount?: number
  ): Promise<string> {
    const amount = overrideAmount ?? Math.abs(transaction.amount);
    const record = await this.base(this.EXPENSE_TABLE).create({
      [this.EXPENSE_DATE_FIELD]: transaction.date,
      [this.EXPENSE_CATEGORY_FIELD]: [categoryId], // Link field - must be array
      [this.EXPENSE_AMOUNT_FIELD]: amount,
      [this.EXPENSE_DESCRIPTION_FIELD]: `${transaction.description} (סווג: ${source})`,
      [this.EXPENSE_VAT_TYPE_FIELD]: 'לפני/ללא מע"מ',
    });

    if (overrideAmount !== undefined) {
      console.log(`  ✅ Created expense record: ${record.id} (${source}, סכום מוגדר: ₪${overrideAmount} במקום ₪${Math.abs(transaction.amount)})`);
    } else {
      console.log(`  ✅ Created expense record: ${record.id} (${source})`);
    }
    return record.id;
  }

  /**
   * עדכון סטטוס תנועה לאחר סיווג
   * הקישור לרשומה מקושרת הוא אופציונלי - אם נכשל, הסיווג עדיין מצליח
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
      updateData[this.TX_LINKED_RECORD_FIELD] = [linkedRecordId];
    }

    if (ruleId) {
      updateData['סווג על ידי חוק'] = [ruleId];
    }

    try {
      await this.base(this.TRANSACTIONS_TABLE).update(transactionId, updateData);
      console.log(`  ✅ Updated transaction status: ${transactionId} → ${status}`);
    } catch (error: any) {
      // If linking fails due to wrong field name, retry without the linked record
      if (linkedRecordId && error?.statusCode === 422) {
        console.warn(`  ⚠️ Could not set linked record field "${this.TX_LINKED_RECORD_FIELD}" - updating status only`);
        const statusOnlyData = { [this.TX_STATUS_FIELD]: status };
        if (ruleId) (statusOnlyData as any)['סווג על ידי חוק'] = [ruleId];
        await this.base(this.TRANSACTIONS_TABLE).update(transactionId, statusOnlyData);
        console.log(`  ✅ Updated transaction status (no link): ${transactionId} → ${status}`);
      } else {
        throw error;
      }
    }
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
      description: String(r.get(this.TX_DESCRIPTION_FIELD) ?? ''),
      source: this.normalizeSource(r),
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
      // Convert Hebrew type to English first (needed to determine which category field to read)
      const typeHebrew = r.get(this.RULE_TYPE_FIELD) as string;
      const type = typeHebrew === 'הוצאה' ? 'expense' : 'income';

      // Read category from the correct field based on type
      // Income rules → קטגוריית הכנסה (links to מקורות הכנסה)
      // Expense rules → קטגוריית הוצאה (links to מקורות הוצאה)
      const categoryField = type === 'income' ? this.RULE_INCOME_CATEGORY_FIELD : this.RULE_EXPENSE_CATEGORY_FIELD;
      const categoryIdArray = r.get(categoryField);
      const categoryId = Array.isArray(categoryIdArray)
        ? categoryIdArray[0]
        : categoryIdArray;

      const overrideAmountRaw = r.get(this.RULE_OVERRIDE_AMOUNT_FIELD);
      const overrideAmount = typeof overrideAmountRaw === 'number' && overrideAmountRaw > 0
        ? overrideAmountRaw
        : undefined;

      const isIgnoreRule = r.get(this.RULE_IGNORE_FIELD) === true;

      return {
        id: r.id,
        pattern: r.get(this.RULE_PATTERN_FIELD) as string,
        categoryId: categoryId as string,
        entity: r.get(this.RULE_ENTITY_FIELD) as string,
        type: type as 'income' | 'expense',
        confidence: r.get(this.RULE_CONFIDENCE_FIELD) as 'אוטומטי' | 'מאושר',
        timesUsed: r.get(this.RULE_TIMES_USED_FIELD) as number || 0,
        createdBy: r.get(this.RULE_CREATED_BY_FIELD) as string,
        overrideAmount,
        isIgnoreRule: isIgnoreRule || undefined,
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

    // Write category to the correct field based on type
    const categoryField = type === 'income' ? this.RULE_INCOME_CATEGORY_FIELD : this.RULE_EXPENSE_CATEGORY_FIELD;

    const record = await this.base(this.CLASSIFICATION_RULES_TABLE).create({
      [this.RULE_PATTERN_FIELD]: pattern,
      [categoryField]: [categoryId], // Link field - must be array, in the correct table-specific field
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
   * יצירת חוק התעלמות קבוע מתיאור תנועה
   * תנועות עתידיות שיתאימו לתבנית יסומנו אוטומטית כ"התעלם"
   *
   * @param description תיאור התנועה המקורית
   * @param userId מזהה המשתמש שיצר את החוק
   * @returns ID של החוק החדש
   */
  async createIgnoreRule(description: string, userId: string): Promise<string> {
    // Extract a reasonable pattern from description (remove numbers/dates)
    const pattern = description
      .trim()
      .replace(/\d{1,2}\/\d{1,2}(\/\d{2,4})?/g, '')
      .replace(/₪?\s*\d+(\.\d+)?\s*₪?/g, '')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 50); // Cap at 50 chars

    const record = await this.base(this.CLASSIFICATION_RULES_TABLE).create({
      [this.RULE_PATTERN_FIELD]: pattern,
      [this.RULE_IGNORE_FIELD]: true,
      [this.RULE_CONFIDENCE_FIELD]: 'מאושר',
      [this.RULE_TIMES_USED_FIELD]: 0,
      [this.RULE_CREATED_BY_FIELD]: userId,
    });

    console.log(`  ✅ Created ignore rule: "${pattern}" (${record.id})`);
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

    // Build filter - filter by entity for both income and expense
    let filterFormula = `{${statusField}} = 'פעיל'`;

    if (entity) {
      if (type === 'income') {
        // For income, filter by "של מי ההכנסה" field
        // Map entity: "עסק תום" → "תום", "עסק יעל" → "יעל", etc.
        const mappedEntity = this.mapEntityForIncome(entity);
        filterFormula = `AND(
          {${statusField}} = 'פעיל',
          {${this.CATEGORY_OWNER_FIELD}} = '${mappedEntity}'
        )`;
      } else {
        // For expense, filter by "עסקי/בית" field
        // Map entity: "עסק תום"/"עסק יעל"/"עסק - משותף" → "עסקי", "בית" → "בית"
        const mappedEntity = this.mapEntityForExpense(entity);
        filterFormula = `AND(
          {${statusField}} = 'פעיל',
          {${this.EXPENSE_BUSINESS_HOME_FIELD}} = '${mappedEntity}'
        )`;
      }
    }

    // Note: expense nameField is "תיאור/הערות" (Long Text) which Airtable cannot sort by.
    // Only add sort for income categories where nameField is a sortable Single Line Text.
    const selectOptions: any = { filterByFormula: filterFormula };
    if (type === 'income') {
      selectOptions.sort = [{ field: nameField, direction: 'asc' }];
    }

    const records = await this.base(tableName)
      .select(selectOptions)
      .all();

    return records.map((r: any) => ({
      id: r.id,
      name: r.get(nameField) as string,
      type,
      entity: entity
    }));
  }

  /**
   * חיפוש הכנסה קיימת לפי סכום ותאריך
   * משמש למניעת כפילות כשחשבונית כבר נרשמה ידנית (למשל דרך Sumit)
   *
   * @param amount סכום חיובי
   * @param date תאריך YYYY-MM-DD
   * @returns ID של הרשומה הקיימת, או null אם לא נמצאה
   */
  async findExistingIncomeRecord(amount: number, date: string): Promise<string | null> {
    try {
      // חיפוש מדויק לפי סכום ותאריך
      const records = await this.base(this.INCOME_TABLE)
        .select({
          filterByFormula: `AND(
            {${this.INCOME_DATE_FIELD}} = '${date}',
            {${this.INCOME_AMOUNT_FIELD}} = ${amount}
          )`,
          maxRecords: 1
        })
        .all();

      if (records.length > 0) {
        console.log(`  🔍 Found existing income record: ${records[0].id} (₪${amount}, ${date})`);
        return records[0].id;
      }

      return null;
    } catch (error) {
      console.error('  ⚠️ Error checking existing income records:', error);
      return null; // Don't block classification on lookup failure
    }
  }

  /**
   * חיפוש הוצאה קיימת לפי סכום ותאריך (טווח ±5% ו-±5 ימים)
   * משמש למניעת כפילות כשהוצאה כבר נרשמה ידנית או הוגדרה כהוצאה מחזורית
   *
   * @param amount סכום חיובי
   * @param date תאריך YYYY-MM-DD
   * @returns ID של הרשומה הקיימת, או null אם לא נמצאה
   */
  async findExistingExpenseRecord(amount: number, date: string): Promise<string | null> {
    try {
      const amountMin = amount * 0.95;
      const amountMax = amount * 1.05;

      const dateObj = new Date(date);
      const dateMinObj = new Date(dateObj);
      dateMinObj.setDate(dateMinObj.getDate() - 5);
      const dateMaxObj = new Date(dateObj);
      dateMaxObj.setDate(dateMaxObj.getDate() + 5);
      const dateMinStr = dateMinObj.toISOString().split('T')[0];
      const dateMaxStr = dateMaxObj.toISOString().split('T')[0];

      const records = await this.base(this.EXPENSE_TABLE)
        .select({
          filterByFormula: `AND(
            {${this.EXPENSE_DATE_FIELD}} >= '${dateMinStr}',
            {${this.EXPENSE_DATE_FIELD}} <= '${dateMaxStr}',
            {${this.EXPENSE_AMOUNT_FIELD}} >= ${amountMin},
            {${this.EXPENSE_AMOUNT_FIELD}} <= ${amountMax}
          )`,
          maxRecords: 1
        })
        .all();

      if (records.length > 0) {
        console.log(`  🔍 Found existing expense record: ${records[0].id} (₪${amount}, ${date})`);
        return records[0].id;
      }

      return null;
    } catch (error) {
      console.error('  ⚠️ Error checking existing expense records:', error);
      return null; // Don't block classification on lookup failure
    }
  }

  /**
   * עדכון סכום מדויק על רשומת הוצאה קיימת (לאחר התאמה לתנועת בנק)
   *
   * @param recordId ID של רשומת ההוצאה
   * @param exactAmount הסכום המדויק מהסקרייפינג
   */
  async updateExpenseAmount(recordId: string, exactAmount: number): Promise<void> {
    try {
      await this.base(this.EXPENSE_TABLE).update(recordId, {
        [this.EXPENSE_AMOUNT_FIELD]: exactAmount
      });
      console.log(`  ✅ Updated expense amount to ₪${exactAmount} for record ${recordId}`);
    } catch (error) {
      console.warn(`  ⚠️ Could not update expense amount for record ${recordId}:`, error);
      // Non-blocking - classification still succeeds even if amount update fails
    }
  }

  /**
   * שליפת תנועה בודדת לפי ID
   */
  async getTransactionById(transactionId: string): Promise<Transaction | null> {
    try {
      const record = await this.base(this.TRANSACTIONS_TABLE).find(transactionId);

      // Read linked record array - take first element if exists
      const linkedRecordArray = record.get(this.TX_LINKED_RECORD_FIELD) as string[] | undefined;
      const linkedRecordId = Array.isArray(linkedRecordArray) && linkedRecordArray.length > 0
        ? linkedRecordArray[0]
        : undefined;

      return {
        id: record.id,
        hash: record.get(this.TX_HASH_FIELD) as string,
        date: record.get(this.TX_DATE_FIELD) as string,
        amount: record.get(this.TX_AMOUNT_FIELD) as number,
        description: String(record.get(this.TX_DESCRIPTION_FIELD) ?? ''),
        source: this.normalizeSource(record),
        userId: record.get(this.TX_USER_ID_FIELD) as string,
        status: record.get(this.TX_STATUS_FIELD) as string,
        linkedRecordId,
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
