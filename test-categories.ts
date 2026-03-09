/**
 * Test Categories Loading
 */

import { config } from 'dotenv';
import { Classifier } from './classification/classifier';

config({ path: '.env.local' });

async function testCategories() {
  console.log('🧪 Testing Categories Loading\n');

  const classifier = new Classifier();

  // Test all combinations
  const tests = [
    { type: 'income' as const, entity: 'עסק תום' },
    { type: 'income' as const, entity: 'עסק יעל' },
    { type: 'income' as const, entity: 'בית' },
    { type: 'expense' as const, entity: 'בית' },
    { type: 'expense' as const, entity: 'עסק תום' },
    { type: 'expense' as const, entity: 'עסק יעל' },
    { type: 'expense' as const, entity: 'עסק - משותף' },
  ];

  for (const test of tests) {
    try {
      const categories = await classifier.getCategories(test.type, test.entity);
      console.log(`${test.type === 'income' ? '💰' : '💳'} ${test.type} - ${test.entity}: ${categories.length} categories`);

      if (categories.length > 0 && categories.length <= 5) {
        // Show first few categories as examples
        categories.forEach(c => console.log(`   - ${c.name}`));
      }
    } catch (error) {
      console.log(`❌ ${test.type} - ${test.entity}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  console.log('\n✅ Category test complete!');
}

testCategories().catch(error => {
  console.error('❌ Test failed:', error);
  process.exit(1);
});
