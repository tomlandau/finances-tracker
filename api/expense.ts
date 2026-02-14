import type { VercelResponse } from '@vercel/node';
import { withAuth, type AuthRequest } from './_lib/middleware/auth';
import { logSuccess } from './_lib/utils/auditLog';

interface ExpenseRequest {
  amount: number;
  categoryId: string;
  date: string;
  description?: string;
  isRecurring?: boolean;
}

export default withAuth(async (
  req: AuthRequest,
  res: VercelResponse
) => {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { amount, categoryId, date, description, isRecurring } = req.body as ExpenseRequest;

    // Validation
    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Invalid amount' });
    }
    if (!categoryId) {
      return res.status(400).json({ error: 'Category is required' });
    }
    if (!date) {
      return res.status(400).json({ error: 'Date is required' });
    }

    // Import Airtable dynamically
    const Airtable = (await import('airtable')).default;

    // Initialize Airtable
    const base = new Airtable({
      apiKey: process.env.AIRTABLE_API_KEY
    }).base(process.env.AIRTABLE_BASE_ID!);

    const table = base(process.env.AIRTABLE_EXPENSE_TABLE!);

    // Create record
    const record = await table.create({
      [process.env.AIRTABLE_EXPENSE_DATE_FIELD!]: date,
      [process.env.AIRTABLE_EXPENSE_CATEGORY_FIELD!]: [categoryId], // Linked record
      [process.env.AIRTABLE_EXPENSE_AMOUNT_FIELD!]: amount,
      ...(description && { [process.env.AIRTABLE_EXPENSE_DESCRIPTION_FIELD!]: description }),
      ...(isRecurring !== undefined && { [process.env.AIRTABLE_EXPENSE_RECURRING_FIELD!]: isRecurring })
    });

    // Log audit event
    await logSuccess(
      req.user!.userId,
      req.user!.username,
      'create',
      'expense',
      req,
      { recordId: record.id, amount, categoryId, date }
    );

    return res.status(201).json({
      success: true,
      id: record.id
    });
  } catch (error) {
    console.error('Error creating expense entry:', error);
    return res.status(500).json({
      error: 'Failed to create expense entry',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});
