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
    console.log('=== Debug Info ===');
    console.log('API Key exists:', !!process.env.AIRTABLE_API_KEY);
    console.log('API Key prefix:', process.env.AIRTABLE_API_KEY?.substring(0, 10) + '...');
    console.log('Base ID:', process.env.AIRTABLE_BASE_ID);
    console.log('Table name:', process.env.AIRTABLE_INCOME_CATEGORIES_TABLE);
    console.log('Status field:', process.env.AIRTABLE_CATEGORY_STATUS_FIELD);
    console.log('Name field:', process.env.AIRTABLE_CATEGORY_NAME_FIELD);

    const Airtable = (await import('airtable')).default;
    const base = new Airtable({
      apiKey: process.env.AIRTABLE_API_KEY
    }).base(process.env.AIRTABLE_BASE_ID);

    const table = base(process.env.AIRTABLE_INCOME_CATEGORIES_TABLE);

    // Try without filter first to see all records
    const records = await table
      .select({
        // filterByFormula: `{${process.env.AIRTABLE_CATEGORY_STATUS_FIELD}} = "פעיל"`,
        sort: [{ field: process.env.AIRTABLE_CATEGORY_NAME_FIELD, direction: 'asc' }]
      })
      .all();

    console.log('Records found:', records.length);
    console.log('Filter formula:', `{${process.env.AIRTABLE_CATEGORY_STATUS_FIELD}} = "פעיל"`);

    const categories = records.map(record => ({
      id: record.id,
      name: record.get(process.env.AIRTABLE_CATEGORY_NAME_FIELD),
      active: true
    }));

    console.log('Categories:', categories);
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
    const { amount, categoryId, date, vat, vatType, description } = req.body;

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
      ...(description && { [process.env.AIRTABLE_INCOME_DESCRIPTION_FIELD]: description })
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

// Routes
app.get('/api/categories', categoriesHandler);
app.post('/api/income', incomeHandler);

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`Dev API server running on http://localhost:${PORT}`);
});
