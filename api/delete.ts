import type { VercelResponse } from '@vercel/node';
import { withAuth, type AuthRequest } from '../lib/middleware-auth';
import { logSuccess } from '../lib/utils-audit';

interface DeleteRequest {
  id: string;
  type: 'income' | 'expense';
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
    const { id, type } = req.body as DeleteRequest;

    // Validation
    if (!id) {
      return res.status(400).json({ error: 'Transaction ID is required' });
    }
    if (!type || !['income', 'expense'].includes(type)) {
      return res.status(400).json({ error: 'Invalid type. Must be "income" or "expense"' });
    }

    // Import Airtable dynamically
    const Airtable = (await import('airtable')).default;

    // Initialize Airtable
    const base = new Airtable({
      apiKey: process.env.AIRTABLE_API_KEY
    }).base(process.env.AIRTABLE_BASE_ID!);

    // Select correct table based on type
    const tableName = type === 'income'
      ? process.env.AIRTABLE_INCOME_TABLE!
      : process.env.AIRTABLE_EXPENSE_TABLE!;

    const table = base(tableName);

    // Delete record
    await table.destroy(id);

    // Log audit event
    await logSuccess(
      req.user!.userId,
      req.user!.username,
      'delete',
      type === 'income' ? 'income' : 'expense',
      req,
      { recordId: id, type }
    );

    return res.status(200).json({
      success: true,
      id: id
    });
  } catch (error) {
    console.error('Error deleting transaction:', error);
    return res.status(500).json({
      error: 'Failed to delete transaction',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});
