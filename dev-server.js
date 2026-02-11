import express from 'express';
import cors from 'cors';
import { config } from 'dotenv';

// Load environment variables
config({ path: '.env.local' });

const app = express();
app.use(cors());
app.use(express.json());

// Import API handlers
const categoriesHandler = async (req, res) => {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get type from query param (default: 'income' for backwards compatibility)
    const type = req.query.type || 'income';

    // Validation
    if (!['income', 'expense'].includes(type)) {
      return res.status(400).json({ error: 'Invalid type. Must be "income" or "expense"' });
    }

    // Select correct table based on type
    const tableName = type === 'income'
      ? process.env.AIRTABLE_INCOME_CATEGORIES_TABLE
      : process.env.AIRTABLE_EXPENSE_CATEGORIES_TABLE;

    // Select correct field names based on type
    const nameField = type === 'income'
      ? process.env.AIRTABLE_CATEGORY_NAME_FIELD
      : process.env.AIRTABLE_EXPENSE_CATEGORY_NAME_FIELD;

    const statusField = type === 'income'
      ? process.env.AIRTABLE_CATEGORY_STATUS_FIELD
      : process.env.AIRTABLE_EXPENSE_CATEGORY_STATUS_FIELD;

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

    const Airtable = (await import('airtable')).default;
    const base = new Airtable({
      apiKey: process.env.AIRTABLE_API_KEY
    }).base(process.env.AIRTABLE_BASE_ID);

    const table = base(tableName);

    // Fetch categories with status = "פעיל"
    const records = await table
      .select({
        filterByFormula: `{${statusField}} = "פעיל"`,
        sort: [{ field: nameField, direction: 'asc' }]
      })
      .all();

    console.log('Records found:', records.length);

    // Helper to normalize field values (handle both string and array)
    const normalizeField = (value) => {
      if (!value) return undefined;
      if (Array.isArray(value)) return value.join(', ');
      return value;
    };

    const categories = records.map(record => {
      const base = {
        id: record.id,
        name: record.get(nameField),
        active: true
      };

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
};

const incomeHandler = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { amount, categoryId, date, vat, vatType, description, isRecurring } = req.body;

    console.log('=== Income Submission Debug ===');
    console.log('Request body:', req.body);
    console.log('Environment variables:');
    console.log('  AIRTABLE_INCOME_TABLE:', process.env.AIRTABLE_INCOME_TABLE);
    console.log('  AIRTABLE_INCOME_DATE_FIELD:', process.env.AIRTABLE_INCOME_DATE_FIELD);
    console.log('  AIRTABLE_INCOME_CATEGORY_FIELD:', process.env.AIRTABLE_INCOME_CATEGORY_FIELD);
    console.log('  AIRTABLE_INCOME_AMOUNT_FIELD:', process.env.AIRTABLE_INCOME_AMOUNT_FIELD);
    console.log('  AIRTABLE_INCOME_VAT_FIELD:', process.env.AIRTABLE_INCOME_VAT_FIELD);
    console.log('  AIRTABLE_INCOME_VAT_TYPE_FIELD:', process.env.AIRTABLE_INCOME_VAT_TYPE_FIELD);
    console.log('  AIRTABLE_INCOME_DESCRIPTION_FIELD:', process.env.AIRTABLE_INCOME_DESCRIPTION_FIELD);

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
    if (!vat) {
      return res.status(400).json({ error: 'Invalid VAT rate' });
    }
    if (!vatType) {
      return res.status(400).json({ error: 'Invalid VAT type' });
    }

    const Airtable = (await import('airtable')).default;
    const base = new Airtable({
      apiKey: process.env.AIRTABLE_API_KEY
    }).base(process.env.AIRTABLE_BASE_ID);

    const table = base(process.env.AIRTABLE_INCOME_TABLE);

    const recordData = {
      [process.env.AIRTABLE_INCOME_DATE_FIELD]: date,
      [process.env.AIRTABLE_INCOME_CATEGORY_FIELD]: [categoryId],
      [process.env.AIRTABLE_INCOME_AMOUNT_FIELD]: amount,
      [process.env.AIRTABLE_INCOME_VAT_FIELD]: vat,
      [process.env.AIRTABLE_INCOME_VAT_TYPE_FIELD]: vatType,
      ...(description && { [process.env.AIRTABLE_INCOME_DESCRIPTION_FIELD]: description }),
      ...(isRecurring !== undefined && { [process.env.AIRTABLE_INCOME_RECURRING_FIELD]: isRecurring })
    };

    console.log('Creating record with data:', recordData);

    const record = await table.create(recordData);

    console.log('Record created successfully:', record.id);
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
};

const expenseHandler = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { amount, categoryId, date, vat, vatType, description, isRecurring } = req.body;

    console.log('=== Expense Submission Debug ===');
    console.log('Request body:', req.body);

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
    if (!vat) {
      return res.status(400).json({ error: 'Invalid VAT rate' });
    }
    if (!vatType) {
      return res.status(400).json({ error: 'Invalid VAT type' });
    }

    const Airtable = (await import('airtable')).default;
    const base = new Airtable({
      apiKey: process.env.AIRTABLE_API_KEY
    }).base(process.env.AIRTABLE_BASE_ID);

    const table = base(process.env.AIRTABLE_EXPENSE_TABLE);

    const recordData = {
      [process.env.AIRTABLE_EXPENSE_DATE_FIELD]: date,
      [process.env.AIRTABLE_EXPENSE_CATEGORY_FIELD]: [categoryId],
      [process.env.AIRTABLE_EXPENSE_AMOUNT_FIELD]: amount,
      [process.env.AIRTABLE_EXPENSE_VAT_FIELD]: vat,
      [process.env.AIRTABLE_EXPENSE_VAT_TYPE_FIELD]: vatType,
      ...(description && { [process.env.AIRTABLE_EXPENSE_DESCRIPTION_FIELD]: description }),
      ...(isRecurring !== undefined && { [process.env.AIRTABLE_EXPENSE_RECURRING_FIELD]: isRecurring })
    };

    console.log('Creating expense record with data:', recordData);

    const record = await table.create(recordData);

    console.log('Expense record created successfully:', record.id);
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
};

const recentHandler = async (req, res) => {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const type = req.query.type || 'all';
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    const startDate = req.query.startDate;
    const endDate = req.query.endDate;
    const categoryId = req.query.categoryId;

    if (!['all', 'income', 'expense'].includes(type)) {
      return res.status(400).json({ error: 'Invalid type. Must be "all", "income", or "expense"' });
    }

    const Airtable = (await import('airtable')).default;
    const base = new Airtable({
      apiKey: process.env.AIRTABLE_API_KEY
    }).base(process.env.AIRTABLE_BASE_ID);

    const buildFilterFormula = (dateField, categoryField) => {
      const conditions = [];
      if (startDate) {
        conditions.push(`IS_AFTER({${dateField}}, '${startDate}')`);
      }
      if (endDate) {
        conditions.push(`IS_BEFORE({${dateField}}, '${endDate}')`);
      }
      if (categoryId) {
        conditions.push(`FIND('${categoryId}', ARRAYJOIN({${categoryField}}))`);
      }
      return conditions.length > 0 ? `AND(${conditions.join(', ')})` : '';
    };

    const normalizeField = (value) => {
      if (!value) return undefined;
      if (Array.isArray(value)) return value.join(', ');
      return String(value);
    };

    const getNumberField = (record, fieldName) => {
      if (!fieldName) return undefined;
      const value = record.get(fieldName);
      return value ? Number(value) : undefined;
    };

    const transactions = [];

    if (type === 'all' || type === 'income') {
      const incomeTable = base(process.env.AIRTABLE_INCOME_TABLE);
      const incomeFilter = buildFilterFormula(
        process.env.AIRTABLE_INCOME_DATE_FIELD,
        process.env.AIRTABLE_INCOME_CATEGORY_FIELD
      );

      const incomeRecords = await incomeTable
        .select({
          ...(incomeFilter && { filterByFormula: incomeFilter }),
          sort: [{ field: process.env.AIRTABLE_INCOME_DATE_FIELD, direction: 'desc' }],
          maxRecords: type === 'income' ? limit : limit * 2
        })
        .all();

      for (const record of incomeRecords) {
        const categoryIdArray = record.get(process.env.AIRTABLE_INCOME_CATEGORY_FIELD);
        const categoryNameArray = record.get(process.env.AIRTABLE_INCOME_CATEGORY_NAME_LOOKUP);

        transactions.push({
          id: record.id,
          type: 'income',
          date: record.get(process.env.AIRTABLE_INCOME_DATE_FIELD),
          amount: Number(record.get(process.env.AIRTABLE_INCOME_AMOUNT_FIELD)),
          categoryId: Array.isArray(categoryIdArray) ? categoryIdArray[0] : categoryIdArray,
          categoryName: Array.isArray(categoryNameArray) ? categoryNameArray[0] : categoryNameArray || 'לא ידוע',
          vat: record.get(process.env.AIRTABLE_INCOME_VAT_FIELD),
          vatType: record.get(process.env.AIRTABLE_INCOME_VAT_TYPE_FIELD),
          description: normalizeField(record.get(process.env.AIRTABLE_INCOME_DESCRIPTION_FIELD)),
          isRecurring: record.get(process.env.AIRTABLE_INCOME_RECURRING_FIELD),
          netAmount: getNumberField(record, process.env.AIRTABLE_INCOME_NET_FIELD),
          vatAmount: getNumberField(record, process.env.AIRTABLE_INCOME_VAT_AMOUNT_FIELD),
          grossAmount: getNumberField(record, process.env.AIRTABLE_INCOME_GROSS_FIELD)
        });
      }
    }

    if (type === 'all' || type === 'expense') {
      const expenseTable = base(process.env.AIRTABLE_EXPENSE_TABLE);
      const expenseFilter = buildFilterFormula(
        process.env.AIRTABLE_EXPENSE_DATE_FIELD,
        process.env.AIRTABLE_EXPENSE_CATEGORY_FIELD
      );

      const expenseRecords = await expenseTable
        .select({
          ...(expenseFilter && { filterByFormula: expenseFilter }),
          sort: [{ field: process.env.AIRTABLE_EXPENSE_DATE_FIELD, direction: 'desc' }],
          maxRecords: type === 'expense' ? limit : limit * 2
        })
        .all();

      for (const record of expenseRecords) {
        const categoryIdArray = record.get(process.env.AIRTABLE_EXPENSE_CATEGORY_FIELD);
        const categoryNameArray = record.get(process.env.AIRTABLE_EXPENSE_CATEGORY_NAME_LOOKUP);

        transactions.push({
          id: record.id,
          type: 'expense',
          date: record.get(process.env.AIRTABLE_EXPENSE_DATE_FIELD),
          amount: Number(record.get(process.env.AIRTABLE_EXPENSE_AMOUNT_FIELD)),
          categoryId: Array.isArray(categoryIdArray) ? categoryIdArray[0] : categoryIdArray,
          categoryName: Array.isArray(categoryNameArray) ? categoryNameArray[0] : categoryNameArray || 'לא ידוע',
          vat: record.get(process.env.AIRTABLE_EXPENSE_VAT_FIELD),
          vatType: record.get(process.env.AIRTABLE_EXPENSE_VAT_TYPE_FIELD),
          description: normalizeField(record.get(process.env.AIRTABLE_EXPENSE_DESCRIPTION_FIELD)),
          isRecurring: record.get(process.env.AIRTABLE_EXPENSE_RECURRING_FIELD),
          netAmount: getNumberField(record, process.env.AIRTABLE_EXPENSE_NET_FIELD),
          vatAmount: getNumberField(record, process.env.AIRTABLE_EXPENSE_VAT_AMOUNT_FIELD),
          grossAmount: getNumberField(record, process.env.AIRTABLE_EXPENSE_GROSS_FIELD)
        });
      }
    }

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
};

const updateHandler = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { id, type, fields } = req.body;

    if (!id) {
      return res.status(400).json({ error: 'Transaction ID is required' });
    }
    if (!type || !['income', 'expense'].includes(type)) {
      return res.status(400).json({ error: 'Invalid type. Must be "income" or "expense"' });
    }
    if (!fields || Object.keys(fields).length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    const Airtable = (await import('airtable')).default;
    const base = new Airtable({
      apiKey: process.env.AIRTABLE_API_KEY
    }).base(process.env.AIRTABLE_BASE_ID);

    const tableName = type === 'income'
      ? process.env.AIRTABLE_INCOME_TABLE
      : process.env.AIRTABLE_EXPENSE_TABLE;

    const dateField = type === 'income'
      ? process.env.AIRTABLE_INCOME_DATE_FIELD
      : process.env.AIRTABLE_EXPENSE_DATE_FIELD;

    const categoryField = type === 'income'
      ? process.env.AIRTABLE_INCOME_CATEGORY_FIELD
      : process.env.AIRTABLE_EXPENSE_CATEGORY_FIELD;

    const amountField = type === 'income'
      ? process.env.AIRTABLE_INCOME_AMOUNT_FIELD
      : process.env.AIRTABLE_EXPENSE_AMOUNT_FIELD;

    const vatField = type === 'income'
      ? process.env.AIRTABLE_INCOME_VAT_FIELD
      : process.env.AIRTABLE_EXPENSE_VAT_FIELD;

    const vatTypeField = type === 'income'
      ? process.env.AIRTABLE_INCOME_VAT_TYPE_FIELD
      : process.env.AIRTABLE_EXPENSE_VAT_TYPE_FIELD;

    const descriptionField = type === 'income'
      ? process.env.AIRTABLE_INCOME_DESCRIPTION_FIELD
      : process.env.AIRTABLE_EXPENSE_DESCRIPTION_FIELD;

    const recurringField = type === 'income'
      ? process.env.AIRTABLE_INCOME_RECURRING_FIELD
      : process.env.AIRTABLE_EXPENSE_RECURRING_FIELD;

    const table = base(tableName);

    const updateFields = {};

    if (fields.date !== undefined) {
      updateFields[dateField] = fields.date;
    }
    if (fields.categoryId !== undefined) {
      updateFields[categoryField] = [fields.categoryId];
    }
    if (fields.amount !== undefined) {
      updateFields[amountField] = fields.amount;
    }
    if (fields.vat !== undefined) {
      updateFields[vatField] = fields.vat;
    }
    if (fields.vatType !== undefined) {
      updateFields[vatTypeField] = fields.vatType;
    }
    if (fields.description !== undefined) {
      updateFields[descriptionField] = fields.description;
    }
    if (fields.isRecurring !== undefined) {
      updateFields[recurringField] = fields.isRecurring;
    }

    const record = await table.update(id, updateFields);

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
};

const deleteHandler = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { id, type } = req.body;

    if (!id) {
      return res.status(400).json({ error: 'Transaction ID is required' });
    }
    if (!type || !['income', 'expense'].includes(type)) {
      return res.status(400).json({ error: 'Invalid type. Must be "income" or "expense"' });
    }

    const Airtable = (await import('airtable')).default;
    const base = new Airtable({
      apiKey: process.env.AIRTABLE_API_KEY
    }).base(process.env.AIRTABLE_BASE_ID);

    const tableName = type === 'income'
      ? process.env.AIRTABLE_INCOME_TABLE
      : process.env.AIRTABLE_EXPENSE_TABLE;

    const table = base(tableName);

    await table.destroy(id);

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
};

// Routes
app.get('/api/categories', categoriesHandler);
app.post('/api/income', incomeHandler);
app.post('/api/expense', expenseHandler);
app.get('/api/recent', recentHandler);
app.post('/api/update', updateHandler);
app.post('/api/delete', deleteHandler);

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`Dev API server running on http://localhost:${PORT}`);
});
