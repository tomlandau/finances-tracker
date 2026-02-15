import { withAuth, type AuthRequest } from '../../lib/middleware-auth';
import { logSuccess, logFailure } from '../../lib/utils-audit';
import { Classifier } from '../../classification/classifier';
import type { Response } from 'express';

/**
 * GET /api/classification-rules
 * POST /api/classification-rules
 *
 * GET - מחזיר רשימת חוקי סיווג
 * POST - יוצר חוק סיווג חדש
 */
export default withAuth(async (req: AuthRequest, res: Response) => {
  if (req.method === 'GET') {
    return await handleGet(req, res);
  } else if (req.method === 'POST') {
    return await handlePost(req, res);
  } else {
    return res.status(405).json({ error: 'Method not allowed' });
  }
});

/**
 * GET - קבלת רשימת חוקי סיווג
 *
 * Query params:
 * - type?: 'income' | 'expense' - סינון לפי סוג
 * - entity?: string - סינון לפי ישות
 * - confidence?: 'אוטומטי' | 'מאושר' - סינון לפי רמת ביטחון
 *
 * Response:
 * {
 *   rules: ClassificationRule[]
 * }
 */
async function handleGet(req: AuthRequest, res: Response) {
  try {
    const { userId, username } = req.user!;
    const { type, entity, confidence } = req.query;

    console.log(`📊 Fetching classification rules for ${username}`);

    const classifier = new Classifier();
    let rules = await classifier.getAllRules();

    // Apply filters
    if (type) {
      rules = rules.filter(r => r.type === type);
    }

    if (entity) {
      rules = rules.filter(r => r.entity === entity);
    }

    if (confidence) {
      rules = rules.filter(r => r.confidence === confidence);
    }

    console.log(`  ✅ Found ${rules.length} rules`);

    return res.status(200).json({
      success: true,
      rules
    });

  } catch (error) {
    console.error('❌ Error fetching rules:', error);

    return res.status(500).json({
      error: 'Failed to fetch rules',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

/**
 * POST - יצירת חוק סיווג חדש
 *
 * Body:
 * {
 *   pattern: string;
 *   categoryId: string;
 *   entity: string;
 *   type: 'income' | 'expense';
 * }
 *
 * Response:
 * {
 *   success: true;
 *   ruleId: string;
 * }
 */
async function handlePost(req: AuthRequest, res: Response) {
  try {
    const { userId, username } = req.user!;
    const { pattern, categoryId, entity, type } = req.body;

    // Validation
    if (!pattern || !categoryId || !entity || !type) {
      await logFailure(userId, username, 'create_rule', 'classification_rule', req, {
        error: 'Missing required fields'
      });

      return res.status(400).json({
        error: 'Missing required fields',
        required: ['pattern', 'categoryId', 'entity', 'type']
      });
    }

    // Validate entity
    const validEntities = ['בית', 'עסק תום', 'עסק יעל', 'עסק - משותף'];
    if (!validEntities.includes(entity)) {
      await logFailure(userId, username, 'create_rule', 'classification_rule', req, {
        error: 'Invalid entity',
        providedEntity: entity
      });

      return res.status(400).json({
        error: 'Invalid entity',
        validValues: validEntities
      });
    }

    // Validate type
    if (type !== 'income' && type !== 'expense') {
      await logFailure(userId, username, 'create_rule', 'classification_rule', req, {
        error: 'Invalid type',
        providedType: type
      });

      return res.status(400).json({
        error: 'Invalid type',
        validValues: ['income', 'expense']
      });
    }

    console.log(`📝 Creating rule: "${pattern}" → ${entity} (${type})`);

    // Use dynamic import for Airtable (Vercel compatibility)
    const { AirtableHelper } = await import('../../classification/airtable-helper');
    const airtableHelper = new AirtableHelper();

    // Create rule
    const ruleId = await airtableHelper.createRule(
      pattern,
      categoryId,
      entity,
      type,
      userId
    );

    // Log success
    await logSuccess(userId, username, 'create_rule', 'classification_rule', req, {
      ruleId,
      pattern,
      categoryId,
      entity,
      type
    });

    console.log(`  ✅ Rule created: ${ruleId}`);

    return res.status(201).json({
      success: true,
      ruleId
    });

  } catch (error) {
    console.error('❌ Error creating rule:', error);

    const { userId, username } = req.user!;
    await logFailure(userId, username, 'create_rule', 'classification_rule', req, {
      error: error instanceof Error ? error.message : 'Unknown error'
    });

    return res.status(500).json({
      error: 'Failed to create rule',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
