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
    // Import Airtable dynamically
    const Airtable = (await import('airtable')).default;

    // Initialize Airtable
    const base = new Airtable({
      apiKey: process.env.AIRTABLE_API_KEY
    }).base(process.env.AIRTABLE_BASE_ID!);

    const table = base(process.env.AIRTABLE_INCOME_CATEGORIES_TABLE!);

    // Fetch categories with status = "פעיל"
    const records = await table
      .select({
        filterByFormula: `{${process.env.AIRTABLE_CATEGORY_STATUS_FIELD}} = "פעיל"`,
        sort: [{ field: process.env.AIRTABLE_CATEGORY_NAME_FIELD!, direction: 'asc' }]
      })
      .all();

    const categories: Category[] = records.map(record => ({
      id: record.id,
      name: record.get(process.env.AIRTABLE_CATEGORY_NAME_FIELD!) as string,
      active: true
    }));

    return res.status(200).json({ categories });
  } catch (error) {
    console.error('Error fetching categories:', error);
    return res.status(500).json({
      error: 'Failed to fetch categories',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
