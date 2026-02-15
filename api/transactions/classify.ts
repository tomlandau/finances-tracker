import { withAuth, type AuthRequest } from '../../lib/middleware-auth';
import { logSuccess, logFailure } from '../../lib/utils-audit';
import { Classifier } from '../../classification/classifier';
import type { Response } from 'express';

/**
 * POST /api/transactions/classify
 *
 * סיווג ידני של תנועה
 *
 * Body:
 * {
 *   transactionId: string;
 *   categoryId: string;
 *   entity: 'בית' | 'עסק תום' | 'עסק יעל' | 'עסק - משותף';
 *   type: 'income' | 'expense';
 *   createRule?: boolean;
 * }
 *
 * Response:
 * {
 *   success: true;
 *   result: ClassificationResult;
 * }
 */
export default withAuth(async (req: AuthRequest, res: Response) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { userId, username } = req.user!;
    const { transactionId, categoryId, entity, type, createRule = false } = req.body;

    // Validation
    if (!transactionId || !categoryId || !entity || !type) {
      await logFailure(userId, username, 'classify_transaction', 'transaction', req, {
        error: 'Missing required fields'
      });

      return res.status(400).json({
        error: 'Missing required fields',
        required: ['transactionId', 'categoryId', 'entity', 'type']
      });
    }

    // Validate entity
    const validEntities = ['בית', 'עסק תום', 'עסק יעל', 'עסק - משותף'];
    if (!validEntities.includes(entity)) {
      await logFailure(userId, username, 'classify_transaction', 'transaction', req, {
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
      await logFailure(userId, username, 'classify_transaction', 'transaction', req, {
        error: 'Invalid type',
        providedType: type
      });

      return res.status(400).json({
        error: 'Invalid type',
        validValues: ['income', 'expense']
      });
    }

    console.log(`📝 Manual classification: ${transactionId} → ${categoryId} (${entity}, ${type})`);

    // Perform classification
    const classifier = new Classifier();
    const result = await classifier.manualClassify(
      transactionId,
      categoryId,
      entity,
      type,
      userId,
      createRule
    );

    if (!result.success) {
      throw new Error('Classification failed');
    }

    // Log success
    await logSuccess(userId, username, 'classify_transaction', 'transaction', req, {
      transactionId,
      categoryId,
      entity,
      type,
      createRule,
      method: 'api',
      ruleId: result.ruleId
    });

    console.log(`  ✅ Classification successful`);

    return res.status(200).json({
      success: true,
      result
    });

  } catch (error) {
    console.error('❌ Classification error:', error);

    const { userId, username } = req.user!;
    await logFailure(userId, username, 'classify_transaction', 'transaction', req, {
      error: error instanceof Error ? error.message : 'Unknown error'
    });

    return res.status(500).json({
      error: 'Classification failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});
