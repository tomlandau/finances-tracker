import type { VercelResponse } from '@vercel/node';
import { withAuth, type AuthRequest } from './middleware/auth';
import { logSuccess } from './utils/auditLog';

interface IncomeRequest {
  amount: number;
  categoryId: string;
  date: string;
  vat: string;
  vatType: string;
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
    const { amount, categoryId, date, vat, vatType, description, isRecurring } = req.body as IncomeRequest;

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
    if (!vat || !['0', '0.18'].includes(vat)) {
      return res.status(400).json({ error: 'Invalid VAT rate' });
    }
    if (!vatType || !['לפני/ללא מע"מ', 'לא כולל מע"מ'].includes(vatType)) {
      return res.status(400).json({ error: 'Invalid VAT type' });
    }

    // Import Airtable dynamically
    const Airtable = (await import('airtable')).default;

    // Initialize Airtable
    const base = new Airtable({
      apiKey: process.env.AIRTABLE_API_KEY
    }).base(process.env.AIRTABLE_BASE_ID!);

    const table = base(process.env.AIRTABLE_INCOME_TABLE!);

    // Create record - Airtable will calculate net/vat/gross amounts automatically
    const record = await table.create({
      [process.env.AIRTABLE_INCOME_DATE_FIELD!]: date,
      [process.env.AIRTABLE_INCOME_CATEGORY_FIELD!]: [categoryId], // Linked record
      [process.env.AIRTABLE_INCOME_AMOUNT_FIELD!]: amount,
      [process.env.AIRTABLE_INCOME_VAT_FIELD!]: vat,
      [process.env.AIRTABLE_INCOME_VAT_TYPE_FIELD!]: vatType,
      ...(description && { [process.env.AIRTABLE_INCOME_DESCRIPTION_FIELD!]: description }),
      ...(isRecurring !== undefined && { [process.env.AIRTABLE_INCOME_RECURRING_FIELD!]: isRecurring })
    });

    // Log audit event
    await logSuccess(
      req.user!.userId,
      req.user!.username,
      'create',
      'income',
      req,
      { recordId: record.id, amount, categoryId, date }
    );

    return res.status(201).json({
      success: true,
      id: record.id
    });
  } catch (error) {
    console.error('Error creating income entry:', error);
    return res.status(500).json({
      error: 'Failed to create income entry',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});
