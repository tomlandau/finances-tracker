import type { Response } from 'express';
import { withAuth, type AuthRequest } from '../lib/middleware-auth';
import { ScraperManager } from '../scrapers/scraper-manager';
import { logSuccess, logFailure } from '../lib/utils-audit';

/**
 * POST /api/scraper/trigger
 * הפעלה ידנית של הסקרייפר
 */
export default withAuth(async (req: AuthRequest, res: Response) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  console.log(`🔄 Manual scraper trigger by ${req.user!.username}`);

  try {
    const manager = new ScraperManager();
    const results = await manager.scrapeAll();

    const successCount = results.filter(r => r.success).length;
    const totalTransactions = results.reduce((sum, r) => sum + r.transactions.length, 0);

    // Audit log
    await logSuccess(
      req.user!.userId,
      req.user!.username,
      'create',
      'auth', // אין resource type מתאים, נשתמש ב-auth
      req,
      {
        action: 'manual_scraper_trigger',
        accountsScraped: results.length,
        successfulAccounts: successCount,
        newTransactions: totalTransactions
      }
    );

    return res.status(200).json({
      success: true,
      results: results.map(r => ({
        accountName: r.accountName,
        success: r.success,
        transactionsCount: r.transactions.length,
        balance: r.balance,
        error: r.error
      })),
      summary: {
        totalAccounts: results.length,
        successfulAccounts: successCount,
        failedAccounts: results.length - successCount,
        totalNewTransactions: totalTransactions
      }
    });
  } catch (error) {
    console.error('Manual scraper trigger failed:', error);

    await logFailure(
      req.user!.userId,
      req.user!.username,
      'create',
      'auth',
      req,
      error instanceof Error ? error.message : 'Unknown error'
    );

    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Scraper failed'
    });
  }
});
