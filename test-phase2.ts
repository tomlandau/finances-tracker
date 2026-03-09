/**
 * Phase 2 Integration Test
 * בדיקה שכל המערכות של שלב 2 מוכנות לעבודה
 */

import { config } from 'dotenv';
import { SumitClient } from './classification/sumit-client';
import { ClientsMatcher } from './classification/clients-matcher';
import { RulesEngine } from './classification/rules-engine';
import { Classifier } from './classification/classifier';
import { AirtableHelper } from './classification/airtable-helper';

// Load environment variables
config({ path: '.env.local' });

async function testPhase2() {
  console.log('🧪 Testing Phase 2 Components\n');

  // Test 1: Sumit Client
  console.log('1️⃣ Testing Sumit Client...');
  const sumitClient = new SumitClient();
  console.log(`   ${sumitClient.isEnabled() ? '✅' : '⚠️'} Sumit Client ${sumitClient.isEnabled() ? 'enabled' : 'disabled'}\n`);

  // Test 2: Clients Matcher
  console.log('2️⃣ Testing Clients Matcher...');
  const clientsMatcher = new ClientsMatcher();
  console.log(`   ${clientsMatcher.isEnabled() ? '✅' : '⚠️'} Clients Matcher ${clientsMatcher.isEnabled() ? 'enabled' : 'disabled'}\n`);

  // Test 3: Rules Engine
  console.log('3️⃣ Testing Rules Engine...');
  try {
    const rulesEngine = new RulesEngine(new AirtableHelper());
    console.log(`   ✅ Rules Engine initialized\n`);
  } catch (error) {
    console.log(`   ❌ Rules Engine error: ${error instanceof Error ? error.message : 'Unknown'}\n`);
  }

  // Test 4: Airtable Helper
  console.log('4️⃣ Testing Airtable Helper...');
  const airtableHelper = new AirtableHelper();
  try {
    const pendingTxs = await airtableHelper.getPendingTransactions();
    console.log(`   ✅ Airtable Helper initialized (${pendingTxs.length} pending transactions)\n`);
  } catch (error) {
    console.log(`   ❌ Airtable Helper error: ${error instanceof Error ? error.message : 'Unknown'}\n`);
  }

  // Test 5: Classifier
  console.log('5️⃣ Testing Classifier...');
  const classifier = new Classifier();
  try {
    const pendingTxs = await classifier.getPendingTransactions();
    console.log(`   ✅ Classifier initialized (${pendingTxs.length} pending transactions to classify)\n`);

    // Show categories
    const incomeCategories = await classifier.getCategories('income', 'עסק תום');
    const expenseCategories = await classifier.getCategories('expense', 'בית');
    console.log(`   ✅ Categories loaded:`);
    console.log(`      - Income (עסק תום): ${incomeCategories.length} categories`);
    console.log(`      - Expense (בית): ${expenseCategories.length} categories\n`);
  } catch (error) {
    console.log(`   ❌ Classifier error: ${error instanceof Error ? error.message : 'Unknown'}\n`);
  }

  // Test 6: Environment Variables
  console.log('6️⃣ Checking Environment Variables...');
  const requiredVars = [
    'SUMIT_API_KEY_TOM',
    'SUMIT_API_KEY_YAEL',
    'AIRTABLE_BUSINESS_TOM_BASE_ID',
    'AIRTABLE_BUSINESS_YAEL_BASE_ID',
    'AIRTABLE_CLASSIFICATION_RULES_TABLE',
    'TELEGRAM_BOT_TOKEN'
  ];

  const missingVars: string[] = [];
  for (const varName of requiredVars) {
    if (!process.env[varName]) {
      missingVars.push(varName);
    }
  }

  if (missingVars.length === 0) {
    console.log('   ✅ All required environment variables are set\n');
  } else {
    console.log('   ⚠️ Missing environment variables:');
    missingVars.forEach(v => console.log(`      - ${v}`));
    console.log();
  }

  // Summary
  console.log('━'.repeat(60));
  console.log('✅ Phase 2 test complete!');
  console.log('━'.repeat(60));
}

// Run the test
testPhase2().catch(error => {
  console.error('❌ Test failed:', error);
  process.exit(1);
});
