import { AirtableHelper } from './airtable-helper';
import { SumitClient } from './sumit-client';
import { ClientsMatcher } from './clients-matcher';
import { RulesEngine } from './rules-engine';
import type { Transaction, ClassificationResult, ClassificationRule } from './types';

/**
 * Classifier - המנצח של מנוע הסיווג
 *
 * אחראי על תיאום כל שכבות הסיווג:
 * 1. Sumit API - זיהוי חשבוניות
 * 2. Client Airtable Bases - התאמה ללקוחות
 * 3. Rules Engine - pattern matching
 * 4. Fallback - החזרת failed (יישלח לטלגרם)
 */
export class Classifier {
  private airtableHelper: AirtableHelper;
  private sumitClient: SumitClient;
  private clientsMatcher: ClientsMatcher;
  private rulesEngine: RulesEngine;

  constructor() {
    this.airtableHelper = new AirtableHelper();
    this.sumitClient = new SumitClient();
    this.clientsMatcher = new ClientsMatcher();
    this.rulesEngine = new RulesEngine(this.airtableHelper);
  }

  /**
   * סיווג תנועה בודדת
   * מנסה את כל השכבות לפי סדר עדיפות
   */
  async classifyTransaction(transaction: Transaction): Promise<ClassificationResult> {
    console.log(`\n🔍 Classifying transaction: ${transaction.description} (₪${transaction.amount})`);

    try {
      // Layer 1: Try Sumit API (only for income)
      if (transaction.amount > 0 && this.sumitClient.isEnabled()) {
        const sumitResult = await this.trySumit(transaction);
        if (sumitResult) {
          return sumitResult;
        }
      }

      // Layer 2: Try Client Airtable Bases (only for income)
      if (transaction.amount > 0 && this.clientsMatcher.isEnabled()) {
        const clientResult = await this.tryClientMatch(transaction);
        if (clientResult) {
          return clientResult;
        }
      }

      // Layer 3: Try Rules Engine (both income and expense)
      const ruleResult = await this.tryRulesEngine(transaction);
      if (ruleResult) {
        return ruleResult;
      }

      // Layer 4: Failed - will trigger Telegram notification
      console.log(`  ⚠️ No classification method succeeded - manual intervention required`);
      return {
        success: false,
        method: 'failed',
        category: null,
        entity: null,
        confidence: 'אוטומטי'
      };

    } catch (error) {
      console.error('❌ Classification error:', error);
      return {
        success: false,
        method: 'failed',
        category: null,
        entity: null,
        confidence: 'אוטומטי',
        metadata: {
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      };
    }
  }

  /**
   * ניסיון #1: Sumit API
   */
  private async trySumit(transaction: Transaction): Promise<ClassificationResult | null> {
    try {
      const invoice = await this.sumitClient.findInvoice(
        transaction.date,
        Math.abs(transaction.amount),
        transaction.description,
        transaction.userId
      );

      if (!invoice) {
        return null;
      }

      console.log(`  ✅ Matched Sumit invoice: ${invoice.customerName}`);

      // Determine entity based on userId
      const entity = transaction.userId === 'usr_tom_001' ? 'עסק תום' : 'עסק יעל';

      // Get income categories for this entity
      const categories = await this.airtableHelper.getCategories('income', entity);
      if (categories.length === 0) {
        console.error(`  ❌ No income categories found for ${entity}`);
        return null;
      }

      // Use first category (or implement logic to choose based on invoice metadata)
      const category = categories[0];

      // Create income record
      const recordId = await this.airtableHelper.createIncomeRecord(
        transaction,
        category.id,
        entity,
        'sumit'
      );

      // Update transaction status
      await this.airtableHelper.updateTransactionStatus(
        transaction.id,
        'סווג אוטומטית',
        recordId,
        null
      );

      return {
        success: true,
        method: 'sumit',
        category: {
          id: category.id,
          name: category.name,
          type: 'income'
        },
        entity: entity as any,
        confidence: 'מאושר',
        metadata: {
          invoiceId: invoice.id,
          customerName: invoice.customerName
        }
      };

    } catch (error) {
      console.error('  ❌ Sumit classification failed:', error);
      return null;
    }
  }

  /**
   * ניסיון #2: Client Airtable Bases
   */
  private async tryClientMatch(transaction: Transaction): Promise<ClassificationResult | null> {
    try {
      const clientRecord = await this.clientsMatcher.findMatch(
        transaction.date,
        Math.abs(transaction.amount),
        transaction.userId
      );

      if (!clientRecord) {
        return null;
      }

      console.log(`  ✅ Matched client: ${clientRecord.name} (${clientRecord.entity})`);

      // Get income categories for this entity
      const categories = await this.airtableHelper.getCategories('income', clientRecord.entity);
      if (categories.length === 0) {
        console.error(`  ❌ No income categories found for ${clientRecord.entity}`);
        return null;
      }

      // Use first category (or implement logic to choose based on client metadata)
      const category = categories[0];

      // Create income record
      const recordId = await this.airtableHelper.createIncomeRecord(
        transaction,
        category.id,
        clientRecord.entity,
        'client'
      );

      // Update transaction status
      await this.airtableHelper.updateTransactionStatus(
        transaction.id,
        'סווג אוטומטית',
        recordId,
        null
      );

      return {
        success: true,
        method: 'client_match',
        category: {
          id: category.id,
          name: category.name,
          type: 'income'
        },
        entity: clientRecord.entity as any,
        confidence: 'מאושר',
        metadata: {
          clientId: clientRecord.id,
          clientName: clientRecord.name
        }
      };

    } catch (error) {
      console.error('  ❌ Client match failed:', error);
      return null;
    }
  }

  /**
   * ניסיון #3: Rules Engine
   */
  private async tryRulesEngine(transaction: Transaction): Promise<ClassificationResult | null> {
    try {
      const rule = await this.rulesEngine.findMatchingRule(
        transaction.description,
        transaction.userId
      );

      if (!rule) {
        return null;
      }

      console.log(`  ✅ Matched rule: "${rule.pattern}" → ${rule.entity} (${rule.type})`);

      // Get category details
      const category = await this.airtableHelper.getCategoryById(rule.categoryId, rule.type);
      if (!category) {
        console.error(`  ❌ Category not found: ${rule.categoryId}`);
        return null;
      }

      // Create record (income or expense)
      let recordId: string;
      if (rule.type === 'income') {
        recordId = await this.airtableHelper.createIncomeRecord(
          transaction,
          rule.categoryId,
          rule.entity,
          'rule'
        );
      } else {
        recordId = await this.airtableHelper.createExpenseRecord(
          transaction,
          rule.categoryId,
          rule.entity,
          'rule'
        );
      }

      // Update transaction status
      await this.airtableHelper.updateTransactionStatus(
        transaction.id,
        'סווג אוטומטית',
        recordId,
        rule.id
      );

      // Increment rule usage
      await this.rulesEngine.incrementRuleUsage(rule.id);

      return {
        success: true,
        method: 'rule',
        category: {
          id: category.id,
          name: category.name,
          type: rule.type
        },
        entity: rule.entity as any,
        confidence: rule.confidence,
        ruleId: rule.id,
        metadata: {
          pattern: rule.pattern,
          timesUsed: rule.timesUsed + 1
        }
      };

    } catch (error) {
      console.error('  ❌ Rules engine failed:', error);
      return null;
    }
  }

  /**
   * סיווג ידני של תנועה (מטלגרם או API)
   *
   * @param transactionId ID התנועה
   * @param categoryId ID הקטגוריה
   * @param entity הישות
   * @param type סוג (income/expense)
   * @param userId מזהה המשתמש שביצע את הסיווג
   * @param createRule האם ליצור חוק חדש מסיווג זה
   */
  async manualClassify(
    transactionId: string,
    categoryId: string,
    entity: string,
    type: 'income' | 'expense',
    userId: string,
    createRule: boolean = false
  ): Promise<ClassificationResult> {
    try {
      console.log(`\n📝 Manual classification: Transaction ${transactionId} → Category ${categoryId}`);

      // Get transaction details
      const transaction = await this.airtableHelper.getTransactionById(transactionId);
      if (!transaction) {
        throw new Error('Transaction not found');
      }

      // Get category details
      const category = await this.airtableHelper.getCategoryById(categoryId, type);
      if (!category) {
        throw new Error('Category not found');
      }

      // Create record (income or expense)
      let recordId: string;
      if (type === 'income') {
        recordId = await this.airtableHelper.createIncomeRecord(
          transaction,
          categoryId,
          entity,
          'manual'
        );
      } else {
        recordId = await this.airtableHelper.createExpenseRecord(
          transaction,
          categoryId,
          entity,
          'manual'
        );
      }

      // Create rule if requested
      let ruleId: string | undefined;
      if (createRule) {
        ruleId = await this.rulesEngine.createRuleFromManualClassification(
          transaction.description,
          categoryId,
          entity,
          type,
          userId
        );
      }

      // Update transaction status
      await this.airtableHelper.updateTransactionStatus(
        transaction.id,
        'סווג ידנית',
        recordId,
        ruleId || null
      );

      console.log(`  ✅ Manual classification complete`);

      return {
        success: true,
        method: 'manual',
        category: {
          id: category.id,
          name: category.name,
          type
        },
        entity: entity as any,
        confidence: 'מאושר',
        ruleId,
        metadata: {
          createdRule: createRule
        }
      };

    } catch (error) {
      console.error('❌ Manual classification failed:', error);
      throw error;
    }
  }

  /**
   * שליפת תנועות ממתינות לסיווג
   */
  async getPendingTransactions(): Promise<Transaction[]> {
    return await this.airtableHelper.getPendingTransactions();
  }

  /**
   * קבלת כל חוקי הסיווג
   */
  async getAllRules(): Promise<ClassificationRule[]> {
    return await this.rulesEngine.getAllRules();
  }

  /**
   * קבלת קטגוריות לפי סוג וישות
   */
  async getCategories(type: 'income' | 'expense', entity?: string) {
    return await this.airtableHelper.getCategories(type, entity);
  }
}
