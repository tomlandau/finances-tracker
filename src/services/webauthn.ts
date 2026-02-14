/**
 * WebAuthn Client Service - Phase 5: Biometric Authentication
 * Handles browser WebAuthn API calls for fingerprint/FaceID authentication
 */

import {
  startRegistration,
  startAuthentication,
  browserSupportsWebAuthn,
} from '@simplewebauthn/browser';
import type {
  PublicKeyCredentialCreationOptionsJSON,
  PublicKeyCredentialRequestOptionsJSON,
  RegistrationResponseJSON,
  AuthenticationResponseJSON,
} from '@simplewebauthn/types';

const API_BASE = '/api/auth/webauthn';

export interface WebAuthnCredential {
  id: string;
  credentialID: string;
  deviceName: string;
  createdAt: string;
  lastUsed?: string;
}

/**
 * Check if browser supports WebAuthn
 */
export function isWebAuthnSupported(): boolean {
  return browserSupportsWebAuthn();
}

/**
 * Check if platform authenticator is available (fingerprint/FaceID)
 */
export async function isPlatformAuthenticatorAvailable(): Promise<boolean> {
  if (!browserSupportsWebAuthn()) {
    return false;
  }

  try {
    return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
  } catch {
    return false;
  }
}

/**
 * Register a new WebAuthn credential (fingerprint/FaceID)
 *
 * @param tempToken - Temporary token from login
 * @param deviceName - Optional device name
 * @returns Registration result
 */
export async function registerWebAuthnCredential(
  tempToken: string,
  deviceName?: string
): Promise<WebAuthnCredential> {
  if (!browserSupportsWebAuthn()) {
    throw new Error('WebAuthn is not supported in this browser');
  }

  // Get registration options from server
  const optionsResponse = await fetch(`${API_BASE}/register-options`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify({ tempToken, deviceName }),
  });

  if (!optionsResponse.ok) {
    const error = await optionsResponse.json();
    throw new Error(error.error || 'Failed to get registration options');
  }

  const { options, challengeToken }: {
    options: PublicKeyCredentialCreationOptionsJSON;
    challengeToken: string;
  } = await optionsResponse.json();

  // Start browser registration flow (this will show fingerprint/FaceID prompt)
  let credential: RegistrationResponseJSON;
  try {
    credential = await startRegistration(options);
  } catch (error) {
    // User cancelled or error occurred
    throw new Error(
      error instanceof Error ? error.message : 'Registration cancelled or failed'
    );
  }

  // Send credential to server for verification
  const verifyResponse = await fetch(`${API_BASE}/register-verify`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify({ challengeToken, credential }),
  });

  if (!verifyResponse.ok) {
    const error = await verifyResponse.json();
    throw new Error(error.error || 'Registration verification failed');
  }

  const result = await verifyResponse.json();
  return result.credential;
}

/**
 * Authenticate using WebAuthn (fingerprint/FaceID)
 *
 * @param tempToken - Temporary token from login
 * @returns User data if successful
 */
export async function authenticateWithWebAuthn(
  tempToken: string
): Promise<{ id: string; username: string; has2FA: boolean; hasWebAuthn: boolean }> {
  if (!browserSupportsWebAuthn()) {
    throw new Error('WebAuthn is not supported in this browser');
  }

  // Get authentication options from server
  const optionsResponse = await fetch(`${API_BASE}/login-options`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify({ tempToken }),
  });

  if (!optionsResponse.ok) {
    const error = await optionsResponse.json();
    throw new Error(error.error || 'Failed to get authentication options');
  }

  const { options, challengeToken }: {
    options: PublicKeyCredentialRequestOptionsJSON;
    challengeToken: string;
  } = await optionsResponse.json();

  // Start browser authentication flow (this will show fingerprint/FaceID prompt)
  let credential: AuthenticationResponseJSON;
  try {
    credential = await startAuthentication(options);
  } catch (error) {
    // User cancelled or error occurred
    throw new Error(
      error instanceof Error ? error.message : 'Authentication cancelled or failed'
    );
  }

  // Send credential to server for verification and login
  const loginResponse = await fetch('/api/auth/login-webauthn', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify({ challengeToken, credential }),
  });

  if (!loginResponse.ok) {
    const error = await loginResponse.json();
    throw new Error(error.error || 'Authentication failed');
  }

  const result = await loginResponse.json();
  return result.user;
}

/**
 * Get list of registered WebAuthn credentials for current user
 */
export async function getWebAuthnCredentials(): Promise<WebAuthnCredential[]> {
  const response = await fetch(`${API_BASE}/credentials`, {
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error('Failed to fetch credentials');
  }

  const data = await response.json();
  return data.credentials;
}

/**
 * Delete a WebAuthn credential
 *
 * @param credentialId - ID of credential to delete
 */
export async function deleteWebAuthnCredential(credentialId: string): Promise<void> {
  const response = await fetch(`${API_BASE}/credentials`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify({ credentialId }),
  });

  if (!response.ok) {
    throw new Error('Failed to delete credential');
  }
}

/**
 * Get user-friendly error messages for common WebAuthn errors
 */
export function getWebAuthnErrorMessage(error: Error): string {
  const message = error.message.toLowerCase();

  if (message.includes('not supported')) {
    return 'האימות הביומטרי אינו נתמך בדפדפן זה';
  }

  if (message.includes('not available')) {
    return 'אימות ביומטרי אינו זמין במכשיר זה';
  }

  if (message.includes('cancelled') || message.includes('abort')) {
    return 'האימות בוטל';
  }

  if (message.includes('timeout')) {
    return 'פג הזמן לאימות';
  }

  if (message.includes('invalid')) {
    return 'האימות נכשל - נסה שוב';
  }

  if (message.includes('not allowed')) {
    return 'הדפדפן לא מאפשר אימות ביומטרי';
  }

  return error.message || 'שגיאה באימות ביומטרי';
}
