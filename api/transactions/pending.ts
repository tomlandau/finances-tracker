import { withAuth, type AuthRequest } from '../../lib/middleware-auth';
import type { Response } from 'express';

/**
 * GET /api/transactions/pending
 *
 * מחזיר רשימת תנועות ממתינות לסיווג של המשתמש
 *
 * Response:
 * {
 *   transactions: Transaction[]
 * }
 */
export default withAuth(async (req: AuthRequest, res: Response) => {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { userId, username } = req.user!;

    console.log(`📊 Fetching pending transactions for ${username}`);

    // Use dynamic import for Airtable (Vercel compatibility)
    const Airtable = (await import('airtable')).default;
    const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY })
      .base(process.env.AIRTABLE_BASE_ID!);

    // Table and field names
    const TRANSACTIONS_TABLE = process.env.AIRTABLE_TRANSACTIONS_TABLE || 'תנועות';
    const TX_STATUS_FIELD = process.env.AIRTABLE_TRANSACTION_STATUS_FIELD || 'סטטוס';
    const TX_USER_ID_FIELD = process.env.AIRTABLE_TRANSACTION_USER_ID_FIELD || 'מזהה משתמש';
    const TX_DATE_FIELD = process.env.AIRTABLE_TRANSACTION_DATE_FIELD || 'תאריך';
    const TX_AMOUNT_FIELD = process.env.AIRTABLE_TRANSACTION_AMOUNT_FIELD || 'סכום';
    const TX_DESCRIPTION_FIELD = process.env.AIRTABLE_TRANSACTION_DESCRIPTION_FIELD || 'תיאור';
    const TX_SOURCE_FIELD = process.env.AIRTABLE_TRANSACTION_SOURCE_FIELD || 'מקור';
    const TX_HASH_FIELD = process.env.AIRTABLE_TRANSACTION_HASH_FIELD || 'TransactionHash';

    // Query pending transactions for this user
    const records = await base(TRANSACTIONS_TABLE)
      .select({
        filterByFormula: `AND(
          {${TX_STATUS_FIELD}} = 'ממתין לסיווג',
          {${TX_USER_ID_FIELD}} = '${userId}'
        )`,
        sort: [{ field: TX_DATE_FIELD, direction: 'desc' }]
      })
      .all();

    // Map to transaction objects
    const transactions = records.map(r => ({
      id: r.id,
      hash: r.get(TX_HASH_FIELD) as string,
      date: r.get(TX_DATE_FIELD) as string,
      amount: r.get(TX_AMOUNT_FIELD) as number,
      description: r.get(TX_DESCRIPTION_FIELD) as string,
      source: r.get(TX_SOURCE_FIELD) as string || '',
      userId: r.get(TX_USER_ID_FIELD) as string,
      status: r.get(TX_STATUS_FIELD) as string
    }));

    console.log(`  ✅ Found ${transactions.length} pending transactions`);

    return res.status(200).json({
      success: true,
      transactions
    });

  } catch (error) {
    console.error('❌ Error fetching pending transactions:', error);

    return res.status(500).json({
      error: 'Failed to fetch pending transactions',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});
