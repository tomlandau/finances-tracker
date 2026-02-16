/**
 * Trigger scraper on Railway production
 * Run with: npx tsx scripts/trigger-scraper.ts
 */

import { config } from 'dotenv';
import readline from 'readline';

// Load local environment (for passwords if needed)
config({ path: '.env.local' });

const RAILWAY_URL = process.env.RAILWAY_URL || 'https://finances-tracker-production.up.railway.app';

// Create readline interface for TOTP input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function prompt(question: string): Promise<string> {
  return new Promise(resolve => {
    rl.question(question, answer => {
      resolve(answer);
    });
  });
}

async function triggerScraper() {
  console.log('🔐 Logging in to Railway...');
  console.log(`📡 URL: ${RAILWAY_URL}\n`);

  try {
    // Step 0: Check health
    console.log('🏥 Checking if Railway is accessible...');
    try {
      const healthResponse = await fetch(`${RAILWAY_URL}/health`);
      const healthData = await healthResponse.json();
      console.log('✅ Railway is accessible:', healthData);
    } catch (error) {
      console.error('❌ Cannot reach Railway:', error);
      console.error('\n💡 Make sure RAILWAY_URL is correct in your environment');
      throw error;
    }

    // Step 1: Login
    const password = await prompt('\nEnter Tom\'s password: ');
    console.log('\n🔐 Attempting login...');

    const loginResponse = await fetch(`${RAILWAY_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'tomlandau',
        password: password
      }),
      credentials: 'include'
    });

    console.log(`📡 Response status: ${loginResponse.status}`);
    const loginData = await loginResponse.json();
    console.log('📋 Login response:', JSON.stringify(loginData, null, 2));

    let cookies = loginResponse.headers.get('set-cookie') || '';

    // Step 2: Handle TOTP if required
    if (loginData.requireTotp) {  // Fixed: was requiresTOTP
      console.log('\n🔑 TOTP required');
      const totpCode = await prompt('Enter 2FA code: ');

      const totpResponse = await fetch(`${RAILWAY_URL}/api/auth/login-totp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': cookies
        },
        body: JSON.stringify({
          tempToken: loginData.tempToken,  // Use tempToken from login response
          totpCode
        }),
        credentials: 'include'
      });

      console.log(`📡 TOTP response status: ${totpResponse.status}`);
      const totpData = await totpResponse.json();
      console.log('📋 TOTP login response:', JSON.stringify(totpData, null, 2));

      if (!totpData.success) {
        console.error('❌ TOTP verification failed!');
        throw new Error('TOTP verification failed');
      }

      cookies = totpResponse.headers.get('set-cookie') || cookies;
    } else if (!loginData.success) {
      console.error('❌ Login failed!');
      throw new Error('Login failed');
    }

    console.log('\n✅ Logged in successfully!\n');

    // Step 3: Trigger scraper
    console.log('🔄 Triggering scraper on Railway...\n');

    const scraperResponse = await fetch(`${RAILWAY_URL}/api/scraper/trigger`, {
      method: 'POST',
      headers: {
        'Cookie': cookies
      },
      credentials: 'include'
    });

    const scraperData = await scraperResponse.json();

    if (scraperData.success) {
      console.log('✅ Scraper completed successfully!\n');
      console.log('📊 Summary:');
      console.log(`   Total accounts: ${scraperData.summary.totalAccounts}`);
      console.log(`   Successful: ${scraperData.summary.successfulAccounts}`);
      console.log(`   Failed: ${scraperData.summary.failedAccounts}`);
      console.log(`   New transactions: ${scraperData.summary.totalNewTransactions}\n`);

      console.log('📝 Results:');
      scraperData.results.forEach((result: any) => {
        const status = result.success ? '✅' : '❌';
        console.log(`   ${status} ${result.accountName}: ${result.transactionsCount} transactions${result.balance ? ` (Balance: ₪${result.balance})` : ''}`);
        if (result.error) {
          console.log(`      Error: ${result.error}`);
        }
      });
    } else {
      console.error('❌ Scraper failed!');
      console.error('Error:', scraperData.error);
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    rl.close();
  }
}

// Run
triggerScraper();
