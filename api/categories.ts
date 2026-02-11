import type { VercelRequest, VercelResponse } from '@vercel/node';

interface Category {
  id: string;
  name: string;
  active: boolean;
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get type from query param (default: 'income' for backwards compatibility)
    const type = (req.query.type as string) || 'income';

    // Validation
    if (!['income', 'expense'].includes(type)) {
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
      ? process.env.AIRTABLE_INCOME_CATEGORIES_TABLE!
      : process.env.AIRTABLE_EXPENSE_CATEGORIES_TABLE!;

    // Select correct field names based on type
    const nameField = type === 'income'
      ? process.env.AIRTABLE_CATEGORY_NAME_FIELD!
      : process.env.AIRTABLE_EXPENSE_CATEGORY_NAME_FIELD!;

    const statusField = type === 'income'
      ? process.env.AIRTABLE_CATEGORY_STATUS_FIELD!
      : process.env.AIRTABLE_EXPENSE_CATEGORY_STATUS_FIELD!;

    // Lookup field names based on type
    let ownerField, domainField, businessHomeField, expenseTypeField, renewalDateField;

    if (type === 'income') {
      ownerField = process.env.AIRTABLE_CATEGORY_OWNER_FIELD;
      domainField = process.env.AIRTABLE_CATEGORY_DOMAIN_FIELD;
    } else {
      businessHomeField = process.env.AIRTABLE_EXPENSE_BUSINESS_HOME_FIELD;
      domainField = process.env.AIRTABLE_EXPENSE_DOMAIN_FIELD;
      expenseTypeField = process.env.AIRTABLE_EXPENSE_TYPE_FIELD;
      renewalDateField = process.env.AIRTABLE_EXPENSE_RENEWAL_DATE_FIELD;
    }

    const table = base(tableName);

    // Fetch categories with status = "פעיל"
    const records = await table
      .select({
        filterByFormula: `{${statusField}} = "פעיל"`,
        sort: [{ field: nameField, direction: 'asc' }]
      })
      .all();

    // Helper to normalize field values (handle both string and array from Airtable)
    const normalizeField = (value: any): string | undefined => {
      if (!value) return undefined;
      if (Array.isArray(value)) return value.join(', ');
      return String(value);
    };

    const categories: Category[] = records.map(record => {
      const base = {
        id: record.id,
        name: record.get(nameField) as string,
        active: true
      };

      // Add type-specific fields
      if (type === 'income') {
        return {
          ...base,
          owner: normalizeField(ownerField ? record.get(ownerField) : undefined),
          domain: normalizeField(domainField ? record.get(domainField) : undefined),
        };
      } else {
        return {
          ...base,
          businessHome: normalizeField(businessHomeField ? record.get(businessHomeField) : undefined),
          domain: normalizeField(domainField ? record.get(domainField) : undefined),
          expenseType: normalizeField(expenseTypeField ? record.get(expenseTypeField) : undefined),
          renewalDate: normalizeField(renewalDateField ? record.get(renewalDateField) : undefined),
        };
      }
    });

    return res.status(200).json({ categories });
  } catch (error) {
    console.error('Error fetching categories:', error);
    return res.status(500).json({
      error: 'Failed to fetch categories',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
