/**
 * WebAuthn Authentication Options - Phase 5: Biometric Authentication
 * Generates authentication challenge for login
 * Called when user chooses to login with fingerprint/FaceID
 */

import type { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { withErrorHandler, ApiError } from '../../../lib/middleware-error';
import { generateAuthenticationOptionsForUser } from '../../../lib/utils-webauthn';

interface LoginOptionsRequest {
  tempToken: string;
}

async function handler(req: Request, res: Response) {
  if (req.method !== 'POST') {
    throw new ApiError(405, 'Method not allowed', 'METHOD_NOT_ALLOWED');
  }

  const { tempToken } = req.body as LoginOptionsRequest;

  if (!tempToken) {
    throw new ApiError(400, 'Temp token required', 'MISSING_TOKEN');
  }

  // Verify temp token (from initial login)
  let decoded: { userId: string; username: string; stage: string };
  try {
    decoded = jwt.verify(tempToken, process.env.JWT_SECRET!) as any;
  } catch (error) {
    throw new ApiError(401, 'Invalid or expired token', 'INVALID_TOKEN');
  }

  // Must be in awaiting-totp stage (after password validation)
  if (decoded.stage !== 'awaiting-totp') {
    throw new ApiError(403, 'Invalid token stage', 'INVALID_STAGE');
  }

  // Generate authentication options for this user
  const options = await generateAuthenticationOptionsForUser(decoded.userId);

  // Store the challenge in a new temp token for verification
  const challengeToken = jwt.sign(
    {
      userId: decoded.userId,
      username: decoded.username,
      challenge: options.challenge,
      stage: 'webauthn-authentication',
    },
    process.env.JWT_SECRET!,
    { expiresIn: '5m' }
  );

  return res.status(200).json({
    options,
    challengeToken,
  });
}

export default withErrorHandler(handler);
