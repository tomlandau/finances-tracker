/**
 * 2FA Management Endpoint - Phase 4: Security Enhancement
 * Handles both setup and verification of TOTP 2FA
 *
 * POST /api/auth/2fa?action=setup - Generate QR code
 * POST /api/auth/2fa?action=verify - Verify setup completion
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import jwt from 'jsonwebtoken';
import { generateTotpSecret, generateQRCode, verifyTotpCode } from '../_utils-totp';

interface TempTokenPayload {
  userId: string;
  username: string;
  stage: string;
  iat: number;
  exp: number;
}

interface SetupRequest {
  tempToken: string;
}

interface VerifySetupRequest {
  tempToken: string;
  totpCode: string;
  secret: string;
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const action = req.query.action as string;

  if (action === 'setup') {
    return handleSetup(req, res);
  } else if (action === 'verify') {
    return handleVerifySetup(req, res);
  } else {
    return res.status(400).json({
      error: 'Invalid action',
      details: 'Use ?action=setup or ?action=verify'
    });
  }
}

/**
 * Handle 2FA setup - generate QR code
 */
async function handleSetup(req: VercelRequest, res: VercelResponse) {
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

/**
 * Handle 2FA setup verification
 */
async function handleVerifySetup(req: VercelRequest, res: VercelResponse) {
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
