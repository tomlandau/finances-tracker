import { CompanyTypes } from 'israeli-bank-scrapers';
import { decrypt } from '../lib/utils-crypto';
import type { BankCredentials } from './types';

/**
 * מנהל credentials - טוען ומפענח את ה-credentials מ-environment variables
 */
export class CredentialsManager {
  private credentials: BankCredentials[] = [];

  constructor() {
    this.loadCredentials();
  }

  /**
   * טעינת כל ה-credentials מ-environment variables
   */
  private loadCredentials(): void {
    // Discount - Tom
    this.loadCredential(
      'CREDENTIALS_DISCOUNT_TOM',
      CompanyTypes.discount,
      'Discount - Tom',
      'usr_tom_001'
    );

    // Discount - Yael
    this.loadCredential(
      'CREDENTIALS_DISCOUNT_YAEL',
      CompanyTypes.discount,
      'Discount - Yael',
      'usr_yael_001'
    );

    // Cal (כאל) - Tom (כרטיסים מרובים)
    this.loadCredential(
      'CREDENTIALS_CAL_TOM',
      CompanyTypes.visaCal,
      'Cal - Tom',
      'usr_tom_001'
    );

    // Cal (כאל) - Yael
    this.loadCredential(
      'CREDENTIALS_CAL_YAEL',
      CompanyTypes.visaCal,
      'Cal - Yael',
      'usr_yael_001'
    );

    // Max - Tom
    this.loadCredential(
      'CREDENTIALS_MAX_TOM',
      CompanyTypes.max,
      'Max - Tom',
      'usr_tom_001'
    );

    // Max - Yael
    this.loadCredential(
      'CREDENTIALS_MAX_YAEL',
      CompanyTypes.max,
      'Max - Yael',
      'usr_yael_001'
    );

    console.log(`✅ Loaded ${this.credentials.length} account credentials`);
  }

  /**
   * טעינת credential בודד
   */
  private loadCredential(
    envVarName: string,
    companyType: CompanyTypes,
    accountName: string,
    userId: string
  ): void {
    const encryptedCreds = process.env[envVarName];

    if (!encryptedCreds) {
      console.warn(`⚠️  ${envVarName} not found, skipping ${accountName}`);
      return;
    }

    try {
      const decrypted = decrypt(encryptedCreds);
      const creds = JSON.parse(decrypted);

      this.credentials.push({
        companyType,
        credentials: creds,
        accountName,
        userId
      });

      console.log(`✅ Loaded credentials for ${accountName}`);
    } catch (error) {
      console.error(`❌ Failed to decrypt ${envVarName}:`, error);
    }
  }

  /**
   * קבלת כל ה-credentials
   */
  getAll(): BankCredentials[] {
    return this.credentials;
  }

  /**
   * קבלת credentials לפי שם חשבון
   */
  getByAccountName(accountName: string): BankCredentials | undefined {
    return this.credentials.find(c => c.accountName === accountName);
  }

  /**
   * קבלת credentials לפי user
   */
  getByUserId(userId: string): BankCredentials[] {
    return this.credentials.filter(c => c.userId === userId);
  }
}
