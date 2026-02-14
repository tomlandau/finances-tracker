/**
 * TOTP Login Endpoint - Phase 4: Security Enhancement
 * Completes the login process after TOTP verification
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import jwt from 'jsonwebtoken';
import { verifyTotpCode } from '../../lib/utils/totp';
import { logSuccess, logFailure, getClientIp } from '../../lib/utils/auditLog';

interface LoginTotpRequest {
  tempToken: string;
  totpCode: string;
}

interface TempTokenPayload {
  userId: string;
  username: string;
  stage: string;
  iat: number;
  exp: number;
}

/**
 * Helper to get TOTP secret for a user from environment variables
 */
function getUserTotpSecret(userId: string): string | null {
  if (userId === process.env.AUTH_USER_TOM_ID) {
    return process.env.AUTH_USER_TOM_TOTP_SECRET || null;
  }
  if (userId === process.env.AUTH_USER_YAEL_ID) {
    return process.env.AUTH_USER_YAEL_TOTP_SECRET || null;
  }
  return null;
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { tempToken, totpCode } = req.body as LoginTotpRequest;

    // Validation
    if (!tempToken || !totpCode) {
      return res.status(400).json({
        error: 'Missing required fields',
        details: 'tempToken and totpCode are required'
      });
    }

    const JWT_SECRET = process.env.JWT_SECRET;
    const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;

    if (!JWT_SECRET || !JWT_REFRESH_SECRET) {
      console.error('JWT secrets not defined');
      return res.status(500).json({ error: 'Server configuration error' });
    }

    // Verify temp token
    let decoded: TempTokenPayload;
    try {
      decoded = jwt.verify(tempToken, JWT_SECRET) as TempTokenPayload;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        return res.status(401).json({
          error: 'Temp token expired. Please log in again.',
          code: 'TOKEN_EXPIRED'
        });
      }
      return res.status(403).json({
        error: 'Invalid temp token',
        code: 'INVALID_TOKEN'
      });
    }

    // Verify token is for TOTP stage
    if (decoded.stage !== 'awaiting-totp') {
      return res.status(403).json({
        error: 'Invalid token stage',
        details: `Expected 'awaiting-totp', got '${decoded.stage}'`
      });
    }

    // Get user's TOTP secret
    const totpSecret = getUserTotpSecret(decoded.userId);
    if (!totpSecret) {
      // User doesn't have 2FA set up - this shouldn't happen
      await logFailure(
        decoded.userId,
        decoded.username,
        'login',
        'auth',
        req,
        '2FA not configured for user'
      );

      return res.status(500).json({
        error: '2FA not configured for this user',
        details: 'Please contact administrator'
      });
    }

    // Verify TOTP code
    const isValid = verifyTotpCode(totpSecret, totpCode);

    if (!isValid) {
      // Log failed attempt
      await logFailure(
        decoded.userId,
        decoded.username,
        'login',
        'auth',
        req,
        'Invalid TOTP code'
      );

      return res.status(401).json({
        error: 'Invalid TOTP code',
        details: 'The code you entered is incorrect or has expired'
      });
    }

    // TOTP verified successfully! Generate auth tokens
    const accessToken = jwt.sign(
      { userId: decoded.userId, username: decoded.username },
      JWT_SECRET,
      { expiresIn: '15m' }
    );

    const refreshToken = jwt.sign(
      { userId: decoded.userId, tokenVersion: 1 },
      JWT_REFRESH_SECRET,
      { expiresIn: '7d' }
    );

    // Set httpOnly cookies
    res.setHeader('Set-Cookie', [
      `accessToken=${accessToken}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${15 * 60}`,
      `refreshToken=${refreshToken}; HttpOnly; SameSite=Strict; Path=/api/auth/refresh; Max-Age=${7 * 24 * 60 * 60}`
    ]);

    // Log successful login
    await logSuccess(
      decoded.userId,
      decoded.username,
      'login',
      'auth',
      req,
      'Login with 2FA successful'
    );

    return res.status(200).json({
      success: true,
      user: {
        id: decoded.userId,
        username: decoded.username,
        has2FA: true,
        hasWebAuthn: false
      }
    });
  } catch (error) {
    console.error('TOTP login error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
