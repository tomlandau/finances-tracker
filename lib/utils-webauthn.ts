/**
 * WebAuthn Utility - Phase 5: Biometric Authentication
 * Handles WebAuthn (FIDO2) credential registration and authentication
 * Supports Fingerprint, FaceID, Windows Hello, etc.
 */

import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
  type VerifiedRegistrationResponse,
  type VerifiedAuthenticationResponse,
  type PublicKeyCredentialCreationOptionsJSON,
  type PublicKeyCredentialRequestOptionsJSON,
  type RegistrationResponseJSON,
  type AuthenticationResponseJSON,
} from '@simplewebauthn/server';
import { isoUint8Array } from '@simplewebauthn/server/helpers';
import Airtable from 'airtable';

/**
 * WebAuthn credential stored in Airtable
 */
export interface StoredCredential {
  id: string; // Airtable record ID
  credentialID: string; // Base64 encoded credential ID
  userId: string;
  username: string;
  publicKey: string; // Base64 encoded public key
  counter: number;
  deviceName: string;
  createdAt: string;
  lastUsed?: string;
  aaguid?: string;
  transports?: string; // JSON array
}

/**
 * RP (Relying Party) configuration
 * These values identify your application to the authenticator
 */
const rpName = 'Finances Tracker';
const rpID = process.env.WEBAUTHN_RP_ID || 'localhost'; // e.g., 'your-app.vercel.app' in production
const origin = process.env.WEBAUTHN_ORIGIN || 'http://localhost:5173'; // e.g., 'https://your-app.vercel.app' in production

/**
 * Gets Airtable base for WebAuthn credentials
 */
function getCredentialsTable() {
  const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
  const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;
  const AIRTABLE_WEBAUTHN_TABLE = process.env.AIRTABLE_WEBAUTHN_TABLE || 'WebAuthn Credentials';

  if (!AIRTABLE_API_KEY || !AIRTABLE_BASE_ID) {
    throw new Error('Airtable configuration missing');
  }

  const base = new Airtable({ apiKey: AIRTABLE_API_KEY }).base(AIRTABLE_BASE_ID);
  return base(AIRTABLE_WEBAUTHN_TABLE);
}

/**
 * Generate registration options for a new credential
 *
 * @param userId - User's unique ID (e.g., 'usr_tom_001')
 * @param username - User's username (e.g., 'tom')
 * @returns Registration options to send to client
 */
export async function generateRegistrationOptionsForUser(
  userId: string,
  username: string
): Promise<PublicKeyCredentialCreationOptionsJSON> {
  // Get existing credentials for this user to prevent duplicate registrations
  const existingCredentials = await getUserCredentials(userId);

  // Convert userId string to Uint8Array as required by @simplewebauthn v11+
  const userIdBuffer = isoUint8Array.fromUTF8String(userId);

  const options = await generateRegistrationOptions({
    rpName,
    rpID,
    userID: userIdBuffer,
    userName: username,
    userDisplayName: username,
    // Exclude existing credentials (user can't register same authenticator twice)
    excludeCredentials: existingCredentials.map(cred => ({
      id: cred.credentialID, // Already base64 encoded string
      type: 'public-key',
      transports: cred.transports ? JSON.parse(cred.transports) : undefined,
    })),
    authenticatorSelection: {
      // Allow platform authenticators (Touch ID, Face ID, Windows Hello)
      // and cross-platform (USB security keys)
      authenticatorAttachment: 'platform', // Prefer built-in (fingerprint/face)
      userVerification: 'required', // Require biometric/PIN
      residentKey: 'preferred', // Enable passwordless in the future
    },
    // Support both newer and older authenticators
    attestationType: 'none', // We don't need attestation for this use case
  });

  return options;
}

/**
 * Verify and store a registration response from the client
 *
 * @param userId - User's unique ID
 * @param username - User's username
 * @param response - Registration response from client
 * @param expectedChallenge - Challenge that was sent to client
 * @param deviceName - Optional device name (e.g., "Tom's iPhone")
 * @returns Stored credential data
 */
export async function verifyAndStoreRegistration(
  userId: string,
  username: string,
  response: RegistrationResponseJSON,
  expectedChallenge: string,
  deviceName?: string
): Promise<StoredCredential> {
  // Verify the registration response
  let verification: VerifiedRegistrationResponse;
  try {
    verification = await verifyRegistrationResponse({
      response,
      expectedChallenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
      requireUserVerification: true,
    });
  } catch (error) {
    throw new Error(`Registration verification failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  const { verified, registrationInfo } = verification;

  if (!verified || !registrationInfo) {
    throw new Error('Registration verification failed');
  }

  // @simplewebauthn/server v13+ returns credential data in a nested structure
  const {
    credential,
    aaguid,
  } = registrationInfo;

  const {
    id: credentialID,
    publicKey: credentialPublicKey,
    counter,
  } = credential;

  // Store credential in Airtable
  const table = getCredentialsTable();

  // Encode binary data to base64 for storage
  const credentialIDBase64 = Buffer.from(credentialID).toString('base64');
  const publicKeyBase64 = Buffer.from(credentialPublicKey).toString('base64');
  const aaguidString = aaguid ? Buffer.from(aaguid).toString('hex') : '';

  // Extract transports if available
  const transports = response.response.transports || [];

  const record = await table.create({
    'Credential ID': credentialIDBase64,
    'User ID': userId,
    'Username': username,
    'Public Key': publicKeyBase64,
    'Counter': counter,
    'Device Name': deviceName || `${username}'s device`,
    'Created At': new Date().toISOString(),
    'AAGUID': aaguidString,
    'Transports': JSON.stringify(transports),
  });

  return {
    id: record.id,
    credentialID: credentialIDBase64,
    userId,
    username,
    publicKey: publicKeyBase64,
    counter,
    deviceName: deviceName || `${username}'s device`,
    createdAt: new Date().toISOString(),
    aaguid: aaguidString,
    transports: JSON.stringify(transports),
  };
}

/**
 * Generate authentication options for login
 *
 * @param userId - Optional user ID to get their specific credentials
 * @returns Authentication options to send to client
 */
export async function generateAuthenticationOptionsForUser(
  userId?: string
): Promise<PublicKeyCredentialRequestOptionsJSON> {
  // Get user's credentials if userId provided, otherwise allow any credential
  const credentials = userId ? await getUserCredentials(userId) : [];

  const options = await generateAuthenticationOptions({
    rpID,
    userVerification: 'required',
    // If we have credentials, specify them (for non-discoverable)
    // If not, allow any credential (for discoverable/resident keys)
    allowCredentials: credentials.length > 0
      ? credentials.map(cred => ({
          id: cred.credentialID, // Already base64 encoded string
          type: 'public-key',
          transports: cred.transports ? JSON.parse(cred.transports) : undefined,
        }))
      : [],
  });

  return options;
}

/**
 * Verify an authentication response and update credential counter
 *
 * @param userId - User's unique ID
 * @param response - Authentication response from client
 * @param expectedChallenge - Challenge that was sent to client
 * @returns Verification result and credential info
 */
export async function verifyAuthenticationAndUpdateCounter(
  userId: string,
  response: AuthenticationResponseJSON,
  expectedChallenge: string
): Promise<{ verified: boolean; credential: StoredCredential }> {
  // Get the credential from Airtable
  const credential = await getCredentialById(userId, response.id);

  if (!credential) {
    throw new Error('Credential not found');
  }

  // Verify the authentication response
  let verification: VerifiedAuthenticationResponse;
  try {
    verification = await verifyAuthenticationResponse({
      response,
      expectedChallenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
      credential: {
        id: credential.credentialID, // Already base64 encoded string
        publicKey: new Uint8Array(Buffer.from(credential.publicKey, 'base64')),
        counter: credential.counter,
      },
      requireUserVerification: true,
    });
  } catch (error) {
    throw new Error(`Authentication verification failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  const { verified, authenticationInfo } = verification;

  if (!verified) {
    throw new Error('Authentication verification failed');
  }

  // Update counter and last used timestamp
  const table = getCredentialsTable();
  await table.update(credential.id, {
    'Counter': authenticationInfo.newCounter,
    'Last Used': new Date().toISOString(),
  });

  return {
    verified: true,
    credential: {
      ...credential,
      counter: authenticationInfo.newCounter,
      lastUsed: new Date().toISOString(),
    },
  };
}

/**
 * Get all credentials for a user
 *
 * @param userId - User's unique ID
 * @returns Array of stored credentials
 */
export async function getUserCredentials(userId: string): Promise<StoredCredential[]> {
  try {
    const table = getCredentialsTable();
    const records = await table
      .select({
        filterByFormula: `{User ID} = '${userId}'`,
      })
      .all();

    return records.map(record => ({
      id: record.id,
      credentialID: record.get('Credential ID') as string,
      userId: record.get('User ID') as string,
      username: record.get('Username') as string,
      publicKey: record.get('Public Key') as string,
      counter: record.get('Counter') as number,
      deviceName: record.get('Device Name') as string,
      createdAt: record.get('Created At') as string,
      lastUsed: record.get('Last Used') as string | undefined,
      aaguid: record.get('AAGUID') as string | undefined,
      transports: record.get('Transports') as string | undefined,
    }));
  } catch (error) {
    console.error('Error fetching user credentials:', error);
    return [];
  }
}

/**
 * Get a specific credential by credential ID and user ID
 *
 * @param userId - User's unique ID
 * @param credentialId - Base64 encoded credential ID
 * @returns Stored credential or null
 */
export async function getCredentialById(
  userId: string,
  credentialId: string
): Promise<StoredCredential | null> {
  try {
    const table = getCredentialsTable();
    const records = await table
      .select({
        filterByFormula: `AND({User ID} = '${userId}', {Credential ID} = '${credentialId}')`,
      })
      .all();

    if (records.length === 0) {
      return null;
    }

    const record = records[0];
    return {
      id: record.id,
      credentialID: record.get('Credential ID') as string,
      userId: record.get('User ID') as string,
      username: record.get('Username') as string,
      publicKey: record.get('Public Key') as string,
      counter: record.get('Counter') as number,
      deviceName: record.get('Device Name') as string,
      createdAt: record.get('Created At') as string,
      lastUsed: record.get('Last Used') as string | undefined,
      aaguid: record.get('AAGUID') as string | undefined,
      transports: record.get('Transports') as string | undefined,
    };
  } catch (error) {
    console.error('Error fetching credential:', error);
    return null;
  }
}

/**
 * Delete a credential
 *
 * @param userId - User's unique ID
 * @param credentialId - Credential ID to delete
 * @returns Success status
 */
export async function deleteCredential(userId: string, credentialId: string): Promise<boolean> {
  try {
    const credential = await getCredentialById(userId, credentialId);
    if (!credential) {
      return false;
    }

    const table = getCredentialsTable();
    await table.destroy(credential.id);
    return true;
  } catch (error) {
    console.error('Error deleting credential:', error);
    return false;
  }
}

/**
 * Check if user has any WebAuthn credentials
 *
 * @param userId - User's unique ID
 * @returns True if user has at least one credential
 */
export async function userHasWebAuthnCredentials(userId: string): Promise<boolean> {
  const credentials = await getUserCredentials(userId);
  return credentials.length > 0;
}
