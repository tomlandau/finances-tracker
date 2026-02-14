import type { Response } from 'express';
import { withAuth, type AuthRequest } from '../lib/middleware-auth';
import Airtable from 'airtable';

/**
 * GET /api/transactions
 * קבלת רשימת תנועות עם סינון
 */
export default withAuth(async (req: AuthRequest, res: Response) => {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const status = (req.query.status as string) || 'all';
    const userId = req.query.userId as string;
    const limit = Math.min(parseInt(req.query.limit as string) || 100, 1000);
    const offset = parseInt(req.query.offset as string) || 0;

    const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY })
      .base(process.env.AIRTABLE_BASE_ID!);

    // בניית פורמולת סינון
    const filters: string[] = [];

    if (status !== 'all') {
      filters.push(`{סטטוס} = '${status}'`);
    }

    if (userId) {
      filters.push(`{מזהה משתמש} = '${userId}'`);
    }

    const filterFormula = filters.length > 0
      ? `AND(${filters.join(', ')})`
      : '';

    const records = await base('תנועות')
      .select({
        ...(filterFormula && { filterByFormula: filterFormula }),
        sort: [{ field: 'תאריך', direction: 'desc' }],
        maxRecords: limit
      })
      .all();

    const transactions = records.map(r => ({
      id: r.id,
      transactionId: r.get('מזהה תנועה'),
      date: r.get('תאריך'),
      amount: r.get('סכום'),
      description: r.get('תיאור'),
      source: r.get('מקור'), // זה יהיה array של IDs
      status: r.get('סטטוס'),
      userId: r.get('מזהה משתמש'),
      classifiedByRule: r.get('סווג על ידי חוק'),
      linkedRecord: r.get('רשומה מקושרת')
    }));

    return res.status(200).json({
      transactions,
      total: transactions.length,
      offset,
      limit
    });
  } catch (error) {
    console.error('Error fetching transactions:', error);
    return res.status(500).json({ error: 'Failed to fetch transactions' });
  }
});
