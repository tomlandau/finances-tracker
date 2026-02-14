/**
 * 2FA Setup Verification Endpoint - Phase 4: Security Enhancement
 * Verifies that the user successfully scanned the QR code and can generate valid TOTP codes
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import jwt from 'jsonwebtoken';
import { verifyTotpCode } from '../../utils/totp';

interface VerifySetupRequest {
  tempToken: string;
  totpCode: string;
  secret: string;
}

interface TempTokenPayload {
  userId: string;
  username: string;
  stage: string;
  iat: number;
  exp: number;
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { tempToken, totpCode, secret } = req.body as VerifySetupRequest;

    // Validation
    if (!tempToken || !totpCode || !secret) {
      return res.status(400).json({
        error: 'Missing required fields',
        details: 'tempToken, totpCode, and secret are required'
      });
    }

    const JWT_SECRET = process.env.JWT_SECRET;
    if (!JWT_SECRET) {
      console.error('JWT_SECRET is not defined');
      return res.status(500).json({ error: 'Server configuration error' });
    }

    // Verify temp token
    let decoded: TempTokenPayload;
    try {
      decoded = jwt.verify(tempToken, JWT_SECRET) as TempTokenPayload;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        return res.status(401).json({
          error: 'Temp token expired',
          code: 'TOKEN_EXPIRED'
        });
      }
      return res.status(403).json({
        error: 'Invalid temp token',
        code: 'INVALID_TOKEN'
      });
    }

    // Verify token is for setup stage
    if (decoded.stage !== 'awaiting-setup') {
      return res.status(403).json({
        error: 'Invalid token stage',
        details: `Expected 'awaiting-setup', got '${decoded.stage}'`
      });
    }

    // Verify TOTP code with the secret
    const isValid = verifyTotpCode(secret, totpCode);

    if (!isValid) {
      return res.status(401).json({
        error: 'Invalid TOTP code',
        details: 'The code you entered is incorrect or has expired. Please try again.'
      });
    }

    // Success! Return the secret that needs to be saved to environment variables
    const envVarName = `AUTH_USER_${decoded.username.toUpperCase()}_TOTP_SECRET`;

    return res.status(200).json({
      success: true,
      message: '2FA setup successful!',
      secret,
      instructions: {
        title: 'Save this secret to complete setup',
        steps: [
          `Add the following line to your .env.local file:`,
          `${envVarName}=${secret}`,
          'Restart your development server',
          'You can now log in with 2FA'
        ]
      },
      envVarName,
      username: decoded.username
    });
  } catch (error) {
    console.error('2FA verify setup error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
