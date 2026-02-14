import type { VercelResponse } from '@vercel/node';
import { withAuth, type AuthRequest } from './_middleware-auth';
import { logSuccess } from './_utils-audit';

interface UpdateRequest {
  id: string;
  type: 'income' | 'expense';
  fields: {
    amount?: number;
    categoryId?: string;
    date?: string;
    vat?: string;
    vatType?: string;
    description?: string;
    isRecurring?: boolean;
  };
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
    const { id, type, fields } = req.body as UpdateRequest;

    // Validation
    if (!id) {
      return res.status(400).json({ error: 'Transaction ID is required' });
    }
    if (!type || !['income', 'expense'].includes(type)) {
      return res.status(400).json({ error: 'Invalid type. Must be "income" or "expense"' });
    }
    if (!fields || Object.keys(fields).length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    // Validate amount if provided
    if (fields.amount !== undefined && fields.amount <= 0) {
      return res.status(400).json({ error: 'Invalid amount' });
    }

    // Validate VAT if provided (only for income)
    if (type === 'income') {
      if (fields.vat !== undefined && !['0', '0.18'].includes(fields.vat)) {
        return res.status(400).json({ error: 'Invalid VAT rate' });
      }

      if (fields.vatType !== undefined && !['לפני/ללא מע"מ', 'לא כולל מע"מ'].includes(fields.vatType)) {
        return res.status(400).json({ error: 'Invalid VAT type' });
      }
    }

    // Import Airtable dynamically
    const Airtable = (await import('airtable')).default;

    // Initialize Airtable
    const base = new Airtable({
      apiKey: process.env.AIRTABLE_API_KEY
    }).base(process.env.AIRTABLE_BASE_ID!);

    // Select correct table and field names based on type
    const tableName = type === 'income'
      ? process.env.AIRTABLE_INCOME_TABLE!
      : process.env.AIRTABLE_EXPENSE_TABLE!;

    const dateField = type === 'income'
      ? process.env.AIRTABLE_INCOME_DATE_FIELD!
      : process.env.AIRTABLE_EXPENSE_DATE_FIELD!;

    const categoryField = type === 'income'
      ? process.env.AIRTABLE_INCOME_CATEGORY_FIELD!
      : process.env.AIRTABLE_EXPENSE_CATEGORY_FIELD!;

    const amountField = type === 'income'
      ? process.env.AIRTABLE_INCOME_AMOUNT_FIELD!
      : process.env.AIRTABLE_EXPENSE_AMOUNT_FIELD!;

    const vatField = type === 'income'
      ? process.env.AIRTABLE_INCOME_VAT_FIELD!
      : process.env.AIRTABLE_EXPENSE_VAT_FIELD!;

    const vatTypeField = type === 'income'
      ? process.env.AIRTABLE_INCOME_VAT_TYPE_FIELD!
      : process.env.AIRTABLE_EXPENSE_VAT_TYPE_FIELD!;

    const descriptionField = type === 'income'
      ? process.env.AIRTABLE_INCOME_DESCRIPTION_FIELD!
      : process.env.AIRTABLE_EXPENSE_DESCRIPTION_FIELD!;

    const recurringField = type === 'income'
      ? process.env.AIRTABLE_INCOME_RECURRING_FIELD!
      : process.env.AIRTABLE_EXPENSE_RECURRING_FIELD!;

    const table = base(tableName);

    // Build update object with only provided fields
    const updateFields: Record<string, any> = {};

    if (fields.date !== undefined) {
      updateFields[dateField] = fields.date;
    }
    if (fields.categoryId !== undefined) {
      updateFields[categoryField] = [fields.categoryId]; // Linked record
    }
    if (fields.amount !== undefined) {
      updateFields[amountField] = fields.amount;
    }
    // VAT fields only for income
    if (type === 'income') {
      if (fields.vat !== undefined) {
        updateFields[vatField] = fields.vat;
      }
      if (fields.vatType !== undefined) {
        updateFields[vatTypeField] = fields.vatType;
      }
    }
    if (fields.description !== undefined) {
      updateFields[descriptionField] = fields.description;
    }
    if (fields.isRecurring !== undefined) {
      updateFields[recurringField] = fields.isRecurring;
    }

    // Update record
    const record = await table.update(id, updateFields);

    // Log audit event
    await logSuccess(
      req.user!.userId,
      req.user!.username,
      'update',
      type === 'income' ? 'income' : 'expense',
      req,
      { recordId: record.id, type, fields }
    );

    return res.status(200).json({
      success: true,
      id: record.id
    });
  } catch (error) {
    console.error('Error updating transaction:', error);
    return res.status(500).json({
      error: 'Failed to update transaction',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});
