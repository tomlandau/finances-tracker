#!/usr/bin/env tsx

/**
 * Script להצפנת credentials לשימוש ב-environment variables
 *
 * שימוש:
 * npm run encrypt-creds
 *
 * או ישירות:
 * tsx scripts/encrypt-credentials.ts
 */

import { config } from 'dotenv';
import { encrypt, generateEncryptionKey } from '../lib/utils-crypto';
import * as readline from 'readline';

// טען .env.local אם קיים
config({ path: '.env.local' });

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(prompt: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(prompt, (answer) => {
      resolve(answer);
    });
  });
}

async function main() {
  console.log('\n==============================================');
  console.log('    🔐 Credentials Encryption Tool');
  console.log('==============================================\n');

  // בדיקה אם קיים CREDENTIALS_ENCRYPTION_KEY
  if (!process.env.CREDENTIALS_ENCRYPTION_KEY) {
    console.log('⚠️  CREDENTIALS_ENCRYPTION_KEY לא נמצא ב-.env.local\n');
    console.log('האם ליצור מפתח הצפנה חדש? (y/n)');
    const answer = await question('> ');

    if (answer.toLowerCase() === 'y') {
      const newKey = generateEncryptionKey();
      console.log('\n✅ מפתח הצפנה חדש נוצר:');
      console.log('\nCREDENTIALS_ENCRYPTION_KEY=' + newKey);
      console.log('\n⚠️  העתק את המפתח הזה ל-.env.local לפני שממשיכים!');
      rl.close();
      return;
    } else {
      console.log('\n❌ לא ניתן להצפין ללא מפתח הצפנה.');
      rl.close();
      return;
    }
  }

  console.log('✅ מפתח הצפנה נטען מ-.env.local\n');
  console.log('בחר סוג חשבון:');
  console.log('1. Discount (דיסקונט)');
  console.log('2. Cal (כאל)');
  console.log('3. Max (מקס)');
  console.log('');

  const type = await question('בחירה (1-3): ');

  let credentialsJson: string;

  switch (type) {
    case '1': {
      console.log('\n📋 Discount Credentials:');
      const id = await question('  מספר זהות (id): ');
      const password = await question('  סיסמה (password): ');
      const num = await question('  מספר חשבון (num): ');

      credentialsJson = JSON.stringify({ id, password, num });
      break;
    }

    case '2': {
      console.log('\n📋 Cal (כאל) Credentials:');
      const username = await question('  שם משתמש (username): ');
      const password = await question('  סיסמה (password): ');

      credentialsJson = JSON.stringify({ username, password });
      break;
    }

    case '3': {
      console.log('\n📋 Max Credentials:');
      const username = await question('  שם משתמש (username): ');
      const password = await question('  סיסמה (password): ');
      const id = await question('  מספר זהות (id) [אופציונלי, Enter לדילוג]: ');

      credentialsJson = id.trim()
        ? JSON.stringify({ username, password, id })
        : JSON.stringify({ username, password });
      break;
    }

    default:
      console.log('❌ בחירה לא חוקית');
      rl.close();
      return;
  }

  // שאלה אופציונלית: סינון כרטיסים/חשבונות
  console.log('\n🔍 סינון כרטיסים/חשבונות (אופציונלי):');
  console.log('אם יש כמה כרטיסים בחשבון אבל אתה רוצה לסרוק רק חלק מהם,');
  console.log('הזן את מספרי הכרטיסים/חשבונות מופרדים בפסיקים.');
  console.log('דוגמה: 1234,5678,9012');
  console.log('להשארת כל הכרטיסים - פשוט לחץ Enter.');
  const accountNumbersInput = await question('\nמספרי חשבונות לסינון [Enter לדילוג]: ');

  // הוספת accountNumbers ל-JSON אם צוין
  if (accountNumbersInput.trim()) {
    const accountNumbers = accountNumbersInput.split(',').map(n => n.trim()).filter(n => n);
    const credsObj = JSON.parse(credentialsJson);
    credsObj.accountNumbers = accountNumbers;
    credentialsJson = JSON.stringify(credsObj);
    console.log(`✅ יסרקו רק ${accountNumbers.length} כרטיסים: ${accountNumbers.join(', ')}`);
  }

  // הצפנה
  const encrypted = encrypt(credentialsJson);

  console.log('\n✅ Credentials הוצפנו בהצלחה!\n');
  console.log('==============================================');
  console.log('Encrypted value (להעתקה ל-.env.local):');
  console.log('==============================================\n');
  console.log(encrypted);
  console.log('\n==============================================\n');
  console.log('דוגמה לשימוש ב-.env.local:');
  console.log('CREDENTIALS_DISCOUNT_TOM=' + encrypted);
  console.log('\n⚠️  שמור את הערך המוצפן במשתנה הסביבה המתאים!\n');

  rl.close();
}

main().catch((error) => {
  console.error('❌ שגיאה:', error);
  rl.close();
  process.exit(1);
});
