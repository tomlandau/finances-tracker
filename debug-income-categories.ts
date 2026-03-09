/**
 * Debug Income Categories - בדיקה מה יש בפועל בטבלה
 */

import { config } from 'dotenv';
import Airtable from 'airtable';

config({ path: '.env.local' });

async function debugIncomeCategories() {
  console.log('🔍 Debugging Income Categories Table\n');

  const base = new Airtable({
    apiKey: process.env.AIRTABLE_API_KEY
  }).base(process.env.AIRTABLE_BASE_ID!);

  const tableName = process.env.AIRTABLE_INCOME_CATEGORIES_TABLE || 'מקורות הכנסה';
  const nameField = process.env.AIRTABLE_CATEGORY_NAME_FIELD || 'שם';
  const statusField = process.env.AIRTABLE_CATEGORY_STATUS_FIELD || 'סטטוס';
  const ownerField = process.env.AIRTABLE_CATEGORY_OWNER_FIELD || 'של מי ההכנסה';

  console.log('📋 Configuration:');
  console.log(`   Table: ${tableName}`);
  console.log(`   Name Field: ${nameField}`);
  console.log(`   Status Field: ${statusField}`);
  console.log(`   Owner Field: ${ownerField}\n`);

  try {
    // Get all active income categories
    const records = await base(tableName)
      .select({
        filterByFormula: `{${statusField}} = 'פעיל'`,
        maxRecords: 10
      })
      .all();

    console.log(`✅ Found ${records.length} active income categories:\n`);

    records.forEach((record, index) => {
      const name = record.get(nameField);
      const owner = record.get(ownerField);
      console.log(`${index + 1}. ${name}`);
      console.log(`   Owner (${ownerField}): "${owner}"`);
      console.log(`   Type: ${typeof owner}`);
      console.log();
    });

    // Show unique owner values
    const uniqueOwners = [...new Set(records.map(r => r.get(ownerField)))];
    console.log('\n📊 Unique owner values in the table:');
    uniqueOwners.forEach(owner => {
      console.log(`   - "${owner}" (${typeof owner})`);
    });

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

debugIncomeCategories().catch(error => {
  console.error('❌ Debug failed:', error);
  process.exit(1);
});
