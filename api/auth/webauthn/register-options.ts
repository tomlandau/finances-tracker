/**
 * WebAuthn Registration Options - Phase 5: Biometric Authentication
 * Generates registration challenge for new credential
 * Called when user wants to register a fingerprint/FaceID
 */

import type { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { withErrorHandler, ApiError } from '../../../lib/middleware-error';
import { generateRegistrationOptionsForUser } from '../../../lib/utils-webauthn';

interface RegisterOptionsRequest {
  tempToken: string;
  deviceName?: string;
}

async function handler(req: Request, res: Response) {
  if (req.method !== 'POST') {
    throw new ApiError(405, 'Method not allowed', 'METHOD_NOT_ALLOWED');
  }

  const { tempToken, deviceName } = req.body as RegisterOptionsRequest;

  if (!tempToken) {
    throw new ApiError(400, 'Temp token required', 'MISSING_TOKEN');
  }

  // Verify temp token
  let decoded: { userId: string; username: string; stage: string };
  try {
    decoded = jwt.verify(tempToken, process.env.JWT_SECRET!) as any;
  } catch (error) {
    throw new ApiError(401, 'Invalid or expired token', 'INVALID_TOKEN');
  }

  // Must be in awaiting-setup or awaiting-totp stage
  if (decoded.stage !== 'awaiting-setup' && decoded.stage !== 'awaiting-totp') {
    throw new ApiError(403, 'Invalid token stage', 'INVALID_STAGE');
  }

  // Generate registration options
  const options = await generateRegistrationOptionsForUser(
    decoded.userId,
    decoded.username
  );

  // Store the challenge in a new temp token for verification
  // This prevents replay attacks
  const challengeToken = jwt.sign(
    {
      userId: decoded.userId,
      username: decoded.username,
      challenge: options.challenge,
      deviceName: deviceName || `${decoded.username}'s device`,
      stage: 'webauthn-registration',
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
