import type { VercelRequest, VercelResponse } from '@vercel/node';

interface ExpenseRequest {
  amount: number;
  categoryId: string;
  date: string;
  vat: string;
  vatType: string;
  description?: string;
  isRecurring?: boolean;
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { amount, categoryId, date, vat, vatType, description, isRecurring } = req.body as ExpenseRequest;

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
    if (!vatType || !['לפני/ללא מע"מ', 'כולל מע"מ'].includes(vatType)) {
      return res.status(400).json({ error: 'Invalid VAT type' });
    }

    // Import Airtable dynamically
    const Airtable = (await import('airtable')).default;

    // Initialize Airtable
    const base = new Airtable({
      apiKey: process.env.AIRTABLE_API_KEY
    }).base(process.env.AIRTABLE_BASE_ID!);

    const table = base(process.env.AIRTABLE_EXPENSE_TABLE!);

    // Create record - Airtable will calculate net/vat/gross amounts automatically
    const record = await table.create({
      [process.env.AIRTABLE_EXPENSE_DATE_FIELD!]: date,
      [process.env.AIRTABLE_EXPENSE_CATEGORY_FIELD!]: [categoryId], // Linked record
      [process.env.AIRTABLE_EXPENSE_AMOUNT_FIELD!]: amount,
      [process.env.AIRTABLE_EXPENSE_VAT_FIELD!]: vat,
      [process.env.AIRTABLE_EXPENSE_VAT_TYPE_FIELD!]: vatType,
      ...(description && { [process.env.AIRTABLE_EXPENSE_DESCRIPTION_FIELD!]: description }),
      ...(isRecurring !== undefined && { [process.env.AIRTABLE_EXPENSE_RECURRING_FIELD!]: isRecurring })
    });

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
}
