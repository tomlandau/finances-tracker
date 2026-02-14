/**
 * WebAuthn Credentials List - Phase 5: Biometric Authentication
 * Returns list of registered credentials for authenticated user
 * Used to show user their registered devices and allow deletion
 */

import type { Response } from 'express';
import { withAuth, type AuthRequest } from '../../../lib/middleware-auth';
import { withErrorHandler } from '../../../lib/middleware-error';
import { getUserCredentials, deleteCredential } from '../../../lib/utils-webauthn';

async function handler(req: AuthRequest, res: Response) {
  const { userId } = req.user!;

  if (req.method === 'GET') {
    // Get all credentials for this user
    const credentials = await getUserCredentials(userId);

    return res.status(200).json({
      credentials: credentials.map(cred => ({
        id: cred.id,
        credentialID: cred.credentialID,
        deviceName: cred.deviceName,
        createdAt: cred.createdAt,
        lastUsed: cred.lastUsed,
      })),
    });
  }

  if (req.method === 'DELETE') {
    // Delete a specific credential
    const { credentialId } = req.body;

    if (!credentialId) {
      return res.status(400).json({ error: 'Credential ID required' });
    }

    const success = await deleteCredential(userId, credentialId);

    if (!success) {
      return res.status(404).json({ error: 'Credential not found' });
    }

    return res.status(200).json({ success: true });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

export default withAuth(withErrorHandler(handler));
