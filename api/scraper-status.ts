import type { Response } from 'express';
import { withAuth, type AuthRequest } from '../lib/middleware-auth';
import Airtable from 'airtable';

/**
 * GET /api/scraper/status
 * קבלת סטטוס הסקרייפר - מתי רץ לאחרונה, כמה חשבונות וכו'
 */
export default withAuth(async (req: AuthRequest, res: Response) => {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY })
      .base(process.env.AIRTABLE_BASE_ID!);

    // קבלת כל החשבונות
    const accounts = await base('חשבונות')
      .select({
        fields: ['שם', 'סוג', 'סקרייפינג אחרון', 'יתרה אחרונה', 'פעיל', 'מזהה משתמש']
      })
      .all();

    const accountsData = accounts.map(r => ({
      name: r.get('שם'),
      type: r.get('סוג'),
      lastScraped: r.get('סקרייפינג אחרון'),
      lastBalance: r.get('יתרה אחרונה'),
      active: r.get('פעיל'),
      userId: r.get('מזהה משתמש')
    }));

    // קבלת תנועות אחרונות (24 שעות)
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    const recentTransactions = await base('תנועות')
      .select({
        filterByFormula: `{תאריך יצירה} >= '${yesterdayStr}'`,
        fields: ['מזהה תנועה', 'סטטוס']
      })
      .all();

    const transactionStats = {
      total: recentTransactions.length,
      pending: recentTransactions.filter(r => r.get('סטטוס') === 'ממתין לסיווג').length,
      autoClassified: recentTransactions.filter(r => r.get('סטטוס') === 'סווג אוטומטית').length,
      manuallyClassified: recentTransactions.filter(r => r.get('סטטוס') === 'סווג ידנית').length
    };

    // מציאת הרצה אחרונה
    const lastRun = accountsData.reduce((latest: string | null, account: any) => {
      const scraped = account.lastScraped;
      if (!scraped) return latest;
      if (!latest) return scraped;
      return scraped > latest ? scraped : latest;
    }, null);

    return res.status(200).json({
      lastRun,
      accounts: accountsData,
      accountsCount: {
        total: accountsData.length,
        active: accountsData.filter((a: any) => a.active).length,
        bank: accountsData.filter((a: any) => a.type === 'חשבון בנק').length,
        creditCard: accountsData.filter((a: any) => a.type === 'כרטיס אשראי').length
      },
      recentTransactions: transactionStats
    });
  } catch (error) {
    console.error('Error fetching scraper status:', error);
    return res.status(500).json({ error: 'Failed to fetch scraper status' });
  }
});
