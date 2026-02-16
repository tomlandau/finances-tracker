#!/usr/bin/env tsx
/**
 * סקריפט לתיקון תנועות שנשמרו עם סימן הפוך
 *
 * מה הסקריפט עושה:
 * 1. מוחק את כל התנועות עם סטטוס "ממתין לסיווג"
 * 2. מאפשר לסקריפר להריץ מחדש ולשלוף את התנועות עם הסימן הנכון
 *
 * שימוש:
 * npx tsx scripts/fix-wrong-transactions.ts
 */

import Airtable from 'airtable';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const TRANSACTIONS_TABLE = process.env.AIRTABLE_TRANSACTIONS_TABLE || 'תנועות';
const TX_STATUS_FIELD = process.env.AIRTABLE_TRANSACTION_STATUS_FIELD || 'סטטוס';

async function main() {
  console.log('🔧 Starting transaction cleanup...\n');

  const apiKey = process.env.AIRTABLE_API_KEY;
  const baseId = process.env.AIRTABLE_BASE_ID;

  if (!apiKey || !baseId) {
    throw new Error('Missing Airtable configuration');
  }

  const base = new Airtable({ apiKey }).base(baseId);

  // Step 1: Find all pending transactions
  console.log('📊 Finding pending transactions...');

  const pendingRecords = await base(TRANSACTIONS_TABLE)
    .select({
      filterByFormula: `{${TX_STATUS_FIELD}} = 'ממתין לסיווג'`,
      fields: ['תאריך', 'סכום', 'תיאור', TX_STATUS_FIELD]
    })
    .all();

  console.log(`   Found ${pendingRecords.length} pending transactions\n`);

  if (pendingRecords.length === 0) {
    console.log('✅ No pending transactions to delete. Done!');
    return;
  }

  // Show sample
  console.log('📋 Sample transactions to be deleted:');
  pendingRecords.slice(0, 5).forEach((record: any) => {
    console.log(`   - ${record.get('תאריך')}: ${record.get('תיאור')} (₪${record.get('סכום')})`);
  });
  if (pendingRecords.length > 5) {
    console.log(`   ... and ${pendingRecords.length - 5} more\n`);
  } else {
    console.log('');
  }

  // Step 2: Delete in batches of 10 (Airtable limit)
  console.log('🗑️  Deleting pending transactions...');

  const BATCH_SIZE = 10;
  let deleted = 0;

  for (let i = 0; i < pendingRecords.length; i += BATCH_SIZE) {
    const batch = pendingRecords.slice(i, i + BATCH_SIZE);
    const recordIds = batch.map((r: any) => r.id);

    await base(TRANSACTIONS_TABLE).destroy(recordIds);
    deleted += recordIds.length;

    console.log(`   Deleted ${deleted}/${pendingRecords.length} transactions...`);
  }

  console.log(`\n✅ Successfully deleted ${deleted} pending transactions`);
  console.log('\n📝 Next steps:');
  console.log('   1. Deploy the fixed scraper code to production');
  console.log('   2. Run the scraper again: npm run trigger-scraper');
  console.log('   3. New transactions will be saved with the correct sign\n');
}

main()
  .then(() => {
    console.log('Done!');
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Error:', error);
    process.exit(1);
  });
