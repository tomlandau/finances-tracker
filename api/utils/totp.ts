/**
 * TOTP (Time-based One-Time Password) Utility - Phase 4: 2FA
 * Provides TOTP generation and verification using the speakeasy library
 */

import speakeasy from 'speakeasy';
import QRCode from 'qrcode';

/**
 * Generates a new TOTP secret for a user
 *
 * @param username - The username to associate with this secret
 * @param issuer - The application name (default: "Finances Tracker")
 * @returns Object containing the secret and OTP auth URL
 *
 * @example
 * ```typescript
 * const { secret, otpauthUrl } = generateTotpSecret('tomlandau');
 * // secret: "JBSWY3DPEHPK3PXP"
 * // otpauthUrl: "otpauth://totp/Finances%20Tracker:tomlandau?secret=JBSWY3DPEHPK3PXP&issuer=Finances%20Tracker"
 * ```
 */
export function generateTotpSecret(username: string, issuer: string = 'Finances Tracker') {
  const secret = speakeasy.generateSecret({
    name: `${issuer}:${username}`,
    issuer: issuer,
    length: 32 // 32 bytes = 256 bits of entropy
  });

  return {
    secret: secret.base32,
    otpauthUrl: secret.otpauth_url!
  };
}

/**
 * Generates a QR code data URL from an OTP auth URL
 *
 * @param otpauthUrl - The OTP auth URL to encode
 * @returns Promise resolving to a base64 data URL of the QR code image
 *
 * @example
 * ```typescript
 * const qrCodeUrl = await generateQRCode(otpauthUrl);
 * // Returns: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA..."
 * // Can be used directly in an <img src="..."> tag
 * ```
 */
export async function generateQRCode(otpauthUrl: string): Promise<string> {
  try {
    // Generate QR code as base64 data URL
    return await QRCode.toDataURL(otpauthUrl);
  } catch (error) {
    console.error('Error generating QR code:', error);
    throw new Error('Failed to generate QR code');
  }
}

/**
 * Verifies a TOTP code against a secret
 *
 * @param secret - The base32-encoded TOTP secret
 * @param code - The 6-digit code to verify
 * @param window - Number of time steps to check before/after current time (default: 1)
 * @returns true if the code is valid, false otherwise
 *
 * @example
 * ```typescript
 * const isValid = verifyTotpCode('JBSWY3DPEHPK3PXP', '123456');
 * if (isValid) {
 *   console.log('Code is correct!');
 * } else {
 *   console.log('Code is incorrect or expired');
 * }
 * ```
 *
 * Note: window=1 means we accept codes from:
 * - 30 seconds ago (previous time step)
 * - Current time step
 * - 30 seconds in the future (next time step)
 * This provides a 90-second window of validity to account for clock drift
 */
export function verifyTotpCode(secret: string, code: string, window: number = 1): boolean {
  try {
    return speakeasy.totp.verify({
      secret,
      encoding: 'base32',
      token: code,
      window // Allow codes from ±30 seconds (1 time step before/after)
    });
  } catch (error) {
    console.error('Error verifying TOTP code:', error);
    return false;
  }
}

/**
 * Generates the current TOTP code for a secret (mainly for testing)
 *
 * @param secret - The base32-encoded TOTP secret
 * @returns The current 6-digit TOTP code
 *
 * @example
 * ```typescript
 * const code = getCurrentTotpCode('JBSWY3DPEHPK3PXP');
 * console.log('Current code:', code); // "123456"
 * ```
 */
export function getCurrentTotpCode(secret: string): string {
  return speakeasy.totp({
    secret,
    encoding: 'base32'
  });
}
