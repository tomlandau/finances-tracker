/**
 * Generate Token for WebAuthn Setup - Settings Page
 * Creates a temp token for adding WebAuthn from settings
 */

import type { Response } from 'express';
import jwt from 'jsonwebtoken';
import { withAuth, type AuthRequest } from '../../../lib/middleware-auth';
import { withErrorHandler } from '../../../lib/middleware-error';

async function handler(req: AuthRequest, res: Response) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { userId, username } = req.user!;

  // Generate temp token for WebAuthn setup
  const tempToken = jwt.sign(
    { userId, username, stage: 'awaiting-setup' },
    process.env.JWT_SECRET!,
    { expiresIn: '10m' }
  );

  return res.status(200).json({
    tempToken,
  });
}

export default withAuth(withErrorHandler(handler));
