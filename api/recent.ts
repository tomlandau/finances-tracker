import type { VercelResponse } from '@vercel/node';
import { withAuth, type AuthRequest } from './middleware/auth';

interface Transaction {
  id: string;
  type: 'income' | 'expense';
  date: string;
  amount: number;
  categoryId: string;
  categoryName: string;
  vat: string;
  vatType: string;
  description?: string;
  isRecurring?: boolean;
  netAmount?: number;
  vatAmount?: number;
  grossAmount?: number;
}

export default withAuth(async (
  req: AuthRequest,
  res: VercelResponse
) => {
  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get query parameters
    const type = (req.query.type as string) || 'all';
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 10000);
    const startDate = req.query.startDate as string;
    const endDate = req.query.endDate as string;
    const categoryId = req.query.categoryId as string;

    // Validation
    if (!['all', 'income', 'expense'].includes(type)) {
      return res.status(400).json({ error: 'Invalid type. Must be "all", "income", or "expense"' });
    }

    // Import Airtable dynamically
    const Airtable = (await import('airtable')).default;

    // Initialize Airtable
    const base = new Airtable({
      apiKey: process.env.AIRTABLE_API_KEY
    }).base(process.env.AIRTABLE_BASE_ID!);

    // Helper to build filter formula
    const buildFilterFormula = (
      dateField: string,
      categoryField: string,
      _categoryLookupField: string
    ): string => {
      const conditions: string[] = [];

      // Date range filters (inclusive)
      if (startDate) {
        conditions.push(`{${dateField}} >= '${startDate}'`);
      }
      if (endDate) {
        conditions.push(`{${dateField}} <= '${endDate}'`);
      }

      // Category filter
      if (categoryId) {
        conditions.push(`FIND('${categoryId}', ARRAYJOIN({${categoryField}}))`);
      }

      return conditions.length > 0 ? `AND(${conditions.join(', ')})` : '';
    };

    // Helper to normalize field values
    const normalizeField = (value: any): string | undefined => {
      if (!value) return undefined;
      if (Array.isArray(value)) return value.join(', ');
      return String(value);
    };

    // Helper to get number field
    const getNumberField = (record: any, fieldName: string | undefined): number | undefined => {
      if (!fieldName) return undefined;
      const value = record.get(fieldName);
      return value ? Number(value) : undefined;
    };

    const transactions: Transaction[] = [];

    // Fetch income records if needed
    if (type === 'all' || type === 'income') {
      const incomeTable = base(process.env.AIRTABLE_INCOME_TABLE!);
      const incomeFilter = buildFilterFormula(
        process.env.AIRTABLE_INCOME_DATE_FIELD!,
        process.env.AIRTABLE_INCOME_CATEGORY_FIELD!,
        process.env.AIRTABLE_INCOME_CATEGORY_NAME_LOOKUP!
      );

      const incomeRecords = await incomeTable
        .select({
          ...(incomeFilter && { filterByFormula: incomeFilter }),
          sort: [{ field: process.env.AIRTABLE_INCOME_DATE_FIELD!, direction: 'desc' }],
          maxRecords: type === 'income' ? limit : limit * 2 // Fetch more if merging
        })
        .all();

      for (const record of incomeRecords) {
        const categoryIdArray = record.get(process.env.AIRTABLE_INCOME_CATEGORY_FIELD!) as string[];
        const categoryNameArray = record.get(process.env.AIRTABLE_INCOME_CATEGORY_NAME_LOOKUP!) as string[];

        transactions.push({
          id: record.id,
          type: 'income',
          date: record.get(process.env.AIRTABLE_INCOME_DATE_FIELD!) as string,
          amount: Number(record.get(process.env.AIRTABLE_INCOME_AMOUNT_FIELD!)),
          categoryId: Array.isArray(categoryIdArray) ? categoryIdArray[0] : categoryIdArray,
          categoryName: Array.isArray(categoryNameArray) ? categoryNameArray[0] : categoryNameArray || 'לא ידוע',
          vat: record.get(process.env.AIRTABLE_INCOME_VAT_FIELD!) as string,
          vatType: record.get(process.env.AIRTABLE_INCOME_VAT_TYPE_FIELD!) as string,
          description: normalizeField(record.get(process.env.AIRTABLE_INCOME_DESCRIPTION_FIELD!)),
          isRecurring: record.get(process.env.AIRTABLE_INCOME_RECURRING_FIELD!) as boolean,
          netAmount: getNumberField(record, process.env.AIRTABLE_INCOME_NET_FIELD),
          vatAmount: getNumberField(record, process.env.AIRTABLE_INCOME_VAT_AMOUNT_FIELD),
          grossAmount: getNumberField(record, process.env.AIRTABLE_INCOME_GROSS_FIELD)
        });
      }
    }

    // Fetch expense records if needed
    if (type === 'all' || type === 'expense') {
      const expenseTable = base(process.env.AIRTABLE_EXPENSE_TABLE!);
      const expenseFilter = buildFilterFormula(
        process.env.AIRTABLE_EXPENSE_DATE_FIELD!,
        process.env.AIRTABLE_EXPENSE_CATEGORY_FIELD!,
        process.env.AIRTABLE_EXPENSE_CATEGORY_NAME_LOOKUP!
      );

      const expenseRecords = await expenseTable
        .select({
          ...(expenseFilter && { filterByFormula: expenseFilter }),
          sort: [{ field: process.env.AIRTABLE_EXPENSE_DATE_FIELD!, direction: 'desc' }],
          maxRecords: type === 'expense' ? limit : limit * 2 // Fetch more if merging
        })
        .all();

      for (const record of expenseRecords) {
        const categoryIdArray = record.get(process.env.AIRTABLE_EXPENSE_CATEGORY_FIELD!) as string[];
        const categoryNameArray = record.get(process.env.AIRTABLE_EXPENSE_CATEGORY_NAME_LOOKUP!) as string[];

        transactions.push({
          id: record.id,
          type: 'expense',
          date: record.get(process.env.AIRTABLE_EXPENSE_DATE_FIELD!) as string,
          amount: Number(record.get(process.env.AIRTABLE_EXPENSE_AMOUNT_FIELD!)),
          categoryId: Array.isArray(categoryIdArray) ? categoryIdArray[0] : categoryIdArray,
          categoryName: Array.isArray(categoryNameArray) ? categoryNameArray[0] : categoryNameArray || 'לא ידוע',
          vat: record.get(process.env.AIRTABLE_EXPENSE_VAT_FIELD!) as string,
          vatType: record.get(process.env.AIRTABLE_EXPENSE_VAT_TYPE_FIELD!) as string,
          description: normalizeField(record.get(process.env.AIRTABLE_EXPENSE_DESCRIPTION_FIELD!)),
          isRecurring: record.get(process.env.AIRTABLE_EXPENSE_RECURRING_FIELD!) as boolean,
          netAmount: getNumberField(record, process.env.AIRTABLE_EXPENSE_NET_FIELD),
          vatAmount: getNumberField(record, process.env.AIRTABLE_EXPENSE_VAT_AMOUNT_FIELD),
          grossAmount: getNumberField(record, process.env.AIRTABLE_EXPENSE_GROSS_FIELD)
        });
      }
    }

    // Sort by date descending and limit
    const sortedTransactions = transactions
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, limit);

    return res.status(200).json({ transactions: sortedTransactions });
  } catch (error) {
    console.error('Error fetching recent transactions:', error);
    return res.status(500).json({
      error: 'Failed to fetch recent transactions',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});
