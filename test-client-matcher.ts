/**
 * Test Client Matcher - בדיקת התאמה ללקוחות
 */

import { config } from 'dotenv';
import { ClientsMatcher } from './classification/clients-matcher';

config({ path: '.env.local' });

async function testClientMatcher() {
  console.log('🧪 Testing Client Matcher\n');

  const matcher = new ClientsMatcher();

  // Test Tom's clients
  console.log('1️⃣ Testing Tom\'s business (עסק תום)...');
  try {
    const result = await matcher.findMatch(
      '2024-01-15',  // תאריך
      500,           // סכום
      'usr_tom_001'  // תום
    );

    if (result) {
      console.log(`   ✅ Found client: ${result.name}`);
      console.log(`      Amount: ₪${result.expectedAmount}`);
      console.log(`      Date: ${result.expectedPaymentDate}`);
    } else {
      console.log(`   ⚠️ No client match found (expected if no clients in that date/amount range)`);
    }
  } catch (error) {
    console.log(`   ❌ Error: ${error instanceof Error ? error.message : 'Unknown'}`);
  }

  console.log();

  // Test Yael's clients
  console.log('2️⃣ Testing Yael\'s business (עסק יעל)...');
  try {
    const result = await matcher.findMatch(
      '2024-01-15',  // תאריך
      500,           // סכום
      'usr_yael_001' // יעל
    );

    if (result) {
      console.log(`   ✅ Found client: ${result.name}`);
      console.log(`      Amount: ₪${result.expectedAmount}`);
      console.log(`      Date: ${result.expectedPaymentDate}`);
    } else {
      console.log(`   ⚠️ No client match found (expected if no clients in that date/amount range)`);
    }
  } catch (error) {
    console.log(`   ❌ Error: ${error instanceof Error ? error.message : 'Unknown'}`);
  }

  console.log('\n✅ Client Matcher test complete!');
}

testClientMatcher().catch(error => {
  console.error('❌ Test failed:', error);
  process.exit(1);
});
