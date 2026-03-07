import { AirtableHelper } from './airtable-helper';
import type { ClassificationRule } from './types';

/**
 * Rules Engine - מנוע התאמת תבניות ולמידה
 *
 * אחראי על:
 * 1. התאמת תנועות לחוקי סיווג קיימים
 * 2. יצירת חוקים חדשים מסיווגים ידניים
 * 3. שדרוג חוקים מ"אוטומטי" ל"מאושר" אחרי שימוש חוזר
 */
export class RulesEngine {
  private airtableHelper: AirtableHelper;
  private rulesCache: ClassificationRule[] = [];
  private cacheTimestamp: number = 0;
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  constructor(airtableHelper: AirtableHelper) {
    this.airtableHelper = airtableHelper;
  }

  /**
   * חיפוש חוק מתאים לתיאור תנועה
   *
   * @param description תיאור התנועה
   * @param userId מזהה משתמש (לסינון חוקים רלוונטיים)
   * @returns חוק מתאים אם נמצא, null אחרת
   */
  async findMatchingRule(
    description: string,
    _userId: string
  ): Promise<ClassificationRule | null> {
    try {
      console.log(`  🔍 Searching rules for: "${description}"`);

      // Get active rules (with caching)
      const rules = await this.getActiveRulesWithCache();

      if (rules.length === 0) {
        console.log(`  ⚠️ No rules found in database`);
        return null;
      }

      // Normalize description for matching (lowercase, trim)
      const normalizedDescription = description.toLowerCase().trim();

      // Find matching rules
      // Priority: ignore rules first, then מאושר confidence, then by times used
      const matchingRules = rules
        .filter(rule => this.isMatch(normalizedDescription, rule.pattern))
        .sort((a, b) => {
          // Ignore rules always win
          if (!!a.isIgnoreRule !== !!b.isIgnoreRule) {
            return a.isIgnoreRule ? -1 : 1;
          }
          // Sort by confidence (מאושר > אוטומטי)
          if (a.confidence !== b.confidence) {
            return a.confidence === 'מאושר' ? -1 : 1;
          }
          // Then by times used (descending)
          return b.timesUsed - a.timesUsed;
        });

      if (matchingRules.length === 0) {
        console.log(`  ⚠️ No matching rule found`);
        return null;
      }

      const bestMatch = matchingRules[0];
      console.log(`  ✅ Found matching rule: "${bestMatch.pattern}" (${bestMatch.confidence}, used ${bestMatch.timesUsed} times)`);

      return bestMatch;

    } catch (error) {
      console.error('❌ Rules engine error:', error);
      return null;
    }
  }

  /**
   * בדיקה האם תבנית מתאימה לתיאור
   * (case-insensitive substring match)
   */
  private isMatch(description: string, pattern: string): boolean {
    const normalizedPattern = pattern.toLowerCase().trim();
    return description.includes(normalizedPattern);
  }

  /**
   * עדכון מונה שימושים של חוק
   * ושדרוג ל"מאושר" אחרי 5 שימושים
   */
  async incrementRuleUsage(ruleId: string): Promise<void> {
    try {
      // Find rule in cache to get current count
      const rule = this.rulesCache.find(r => r.id === ruleId);
      const currentCount = rule?.timesUsed || 0;

      // Update in Airtable
      await this.airtableHelper.incrementRuleUsage(ruleId, currentCount);

      // Invalidate cache (will refresh on next query)
      this.invalidateCache();

    } catch (error) {
      console.error('❌ Failed to increment rule usage:', error);
    }
  }

  /**
   * יצירת חוק חדש מסיווג ידני
   *
   * @param description תיאור התנועה המקורית
   * @param categoryId ID הקטגוריה שנבחרה
   * @param entity הישות (בית/עסק תום/עסק יעל/משותף)
   * @param type סוג (income/expense)
   * @param userId מזהה המשתמש שיצר את החוק
   * @returns ID של החוק החדש
   */
  async createRuleFromManualClassification(
    description: string,
    categoryId: string,
    entity: string,
    type: 'income' | 'expense',
    userId: string
  ): Promise<string> {
    try {
      // Extract pattern from description
      const pattern = this.extractPattern(description);

      console.log(`  📝 Creating new rule: "${pattern}" → ${entity} (${type})`);

      // Check if similar rule already exists
      const existingRule = await this.findExistingRule(pattern, categoryId, entity);
      if (existingRule) {
        console.log(`  ⚠️ Similar rule already exists: ${existingRule.id}`);
        // Just increment usage instead of creating duplicate
        await this.incrementRuleUsage(existingRule.id);
        return existingRule.id;
      }

      // Create new rule in Airtable
      const ruleId = await this.airtableHelper.createRule(
        pattern,
        categoryId,
        entity,
        type,
        userId
      );

      // Invalidate cache
      this.invalidateCache();

      console.log(`  ✅ Created rule: ${ruleId}`);
      return ruleId;

    } catch (error) {
      console.error('❌ Failed to create rule:', error);
      throw error;
    }
  }

  /**
   * חילוץ תבנית מתיאור תנועה
   *
   * אסטרטגיה:
   * - אם תיאור קצר (<15 תווים): השתמש בכל התיאור
   * - אם תיאור ארוך: קח את 3-5 המילים הראשונות
   * - נקה: הסר מספרים, תאריכים, סכומים, סימני פיסוק מיותרים
   */
  private extractPattern(description: string): string {
    // Clean description
    let cleaned = description
      .trim()
      // Remove common prefixes
      .replace(/^(תשלום|העברה|משיכה|הפקדה)\s+/i, '')
      // Remove dates (DD/MM, DD/MM/YY, DD/MM/YYYY)
      .replace(/\d{1,2}\/\d{1,2}(\/\d{2,4})?/g, '')
      // Remove amounts (numbers with optional currency symbols)
      .replace(/₪?\s*\d+(\.\d+)?\s*₪?/g, '')
      // Remove extra whitespace
      .replace(/\s+/g, ' ')
      .trim();

    // If short, use entire cleaned description
    if (cleaned.length < 15) {
      return cleaned;
    }

    // Take first 3-5 words
    const words = cleaned.split(/\s+/);
    const numWords = Math.min(5, Math.max(3, words.length));
    const pattern = words.slice(0, numWords).join(' ');

    return pattern;
  }

  /**
   * חיפוש חוק קיים דומה
   */
  private async findExistingRule(
    pattern: string,
    categoryId: string,
    entity: string
  ): Promise<ClassificationRule | null> {
    const rules = await this.getActiveRulesWithCache();

    // Look for exact match on pattern + category + entity
    return rules.find(r =>
      r.pattern.toLowerCase() === pattern.toLowerCase() &&
      r.categoryId === categoryId &&
      r.entity === entity
    ) || null;
  }

  /**
   * שליפת חוקים פעילים עם caching
   */
  private async getActiveRulesWithCache(): Promise<ClassificationRule[]> {
    const now = Date.now();

    // Return cached rules if cache is fresh
    if (this.rulesCache.length > 0 && (now - this.cacheTimestamp) < this.CACHE_TTL) {
      return this.rulesCache;
    }

    // Fetch fresh rules from Airtable
    console.log(`  🔄 Refreshing rules cache...`);
    this.rulesCache = await this.airtableHelper.getActiveRules();
    this.cacheTimestamp = now;

    console.log(`  ✅ Loaded ${this.rulesCache.length} rules into cache`);
    return this.rulesCache;
  }

  /**
   * ביטול cache (לאחר יצירה/עדכון של חוק)
   */
  private invalidateCache(): void {
    this.rulesCache = [];
    this.cacheTimestamp = 0;
  }

  /**
   * קבלת כל החוקים (ללא cache - לשימוש ב-API)
   */
  async getAllRules(): Promise<ClassificationRule[]> {
    return await this.airtableHelper.getActiveRules();
  }

  /**
   * מחיקת חוק (יושם בעתיד)
   */
  async deleteRule(_ruleId: string): Promise<void> {
    // TODO: Implement rule deletion
    // - Delete from Airtable
    // - Invalidate cache
    throw new Error('Not implemented');
  }

  /**
   * עדכון חוק (יושם בעתיד)
   */
  async updateRule(
    _ruleId: string,
    _updates: Partial<ClassificationRule>
  ): Promise<void> {
    // TODO: Implement rule update
    // - Update in Airtable
    // - Invalidate cache
    throw new Error('Not implemented');
  }
}
