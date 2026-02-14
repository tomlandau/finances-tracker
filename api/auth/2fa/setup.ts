/**
 * 2FA Setup Endpoint - Phase 4: Security Enhancement
 * Generates TOTP secret and QR code for initial 2FA setup
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import jwt from 'jsonwebtoken';
import { generateTotpSecret, generateQRCode } from '../../utils/totp';

interface SetupRequest {
  tempToken: string;
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
    const { tempToken } = req.body as SetupRequest;

    if (!tempToken) {
      return res.status(401).json({ error: 'No temp token provided' });
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

    // Generate TOTP secret
    const { secret, otpauthUrl } = generateTotpSecret(decoded.username);

    // Generate QR code
    const qrCodeDataUrl = await generateQRCode(otpauthUrl);

    return res.status(200).json({
      success: true,
      secret,
      qrCodeUrl: qrCodeDataUrl,
      manualCode: secret, // For manual entry if QR scan doesn't work
      username: decoded.username,
      issuer: 'Finances Tracker'
    });
  } catch (error) {
    console.error('2FA setup error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
