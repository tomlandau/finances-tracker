import crypto from 'crypto';

const ALGORITHM = 'aes-256-cbc';

/**
 * הצפנת מחרוזת באמצעות AES-256-CBC
 * @param text - הטקסט להצפנה
 * @returns מחרוזת מוצפנת בפורמט: iv:encryptedData
 */
export function encrypt(text: string): string {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  const encrypted = Buffer.concat([
    cipher.update(text, 'utf8'),
    cipher.final()
  ]);

  return iv.toString('hex') + ':' + encrypted.toString('hex');
}

/**
 * פענוח מחרוזת שהוצפנה עם encrypt()
 * @param encryptedText - מחרוזת מוצפנת בפורמט: iv:encryptedData
 * @returns הטקסט המקורי
 */
export function decrypt(encryptedText: string): string {
  const key = getEncryptionKey();
  const [ivHex, encryptedHex] = encryptedText.split(':');

  if (!ivHex || !encryptedHex) {
    throw new Error('Invalid encrypted text format');
  }

  const iv = Buffer.from(ivHex, 'hex');
  const encrypted = Buffer.from(encryptedHex, 'hex');
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);

  const decrypted = Buffer.concat([
    decipher.update(encrypted),
    decipher.final()
  ]);

  return decrypted.toString('utf8');
}

/**
 * קבלת מפתח ההצפנה מ-environment variables
 * @returns Buffer של 32 בתים (256 ביט)
 */
function getEncryptionKey(): Buffer {
  const keyHex = process.env.CREDENTIALS_ENCRYPTION_KEY;

  if (!keyHex) {
    throw new Error('CREDENTIALS_ENCRYPTION_KEY environment variable is not set');
  }

  const key = Buffer.from(keyHex, 'hex');

  if (key.length !== 32) {
    throw new Error('CREDENTIALS_ENCRYPTION_KEY must be 32 bytes (64 hex characters)');
  }

  return key;
}

/**
 * יצירת מפתח הצפנה חדש (להרצה חד-פעמית)
 * @returns מפתח hex של 32 בתים
 */
export function generateEncryptionKey(): string {
  return crypto.randomBytes(32).toString('hex');
}
