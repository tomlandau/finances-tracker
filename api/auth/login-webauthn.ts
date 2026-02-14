/**
 * WebAuthn Login Completion - Phase 5: Biometric Authentication
 * Verifies authentication response and creates JWT session
 * Called after user provides fingerprint/FaceID for login
 */

import type { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import type { AuthenticationResponseJSON } from '@simplewebauthn/types';
import { withErrorHandler, ApiError } from '../../lib/middleware-error';
import { verifyAuthenticationAndUpdateCounter } from '../../lib/utils-webauthn';
import { logSuccess, logFailure, getClientIp } from '../../lib/utils-audit';

interface LoginWebAuthnRequest {
  challengeToken: string;
  credential: AuthenticationResponseJSON;
}

/**
 * Creates JWT tokens and sets them as httpOnly cookies
 */
function setAuthCookies(res: Response, userId: string, username: string): void {
  const JWT_SECRET = process.env.JWT_SECRET!;
  const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET!;

  // Generate access token (15 minutes)
  const accessToken = jwt.sign(
    { userId, username },
    JWT_SECRET,
    { expiresIn: '15m' }
  );

  // Generate refresh token (7 days)
  const refreshToken = jwt.sign(
    { userId, tokenVersion: 1 },
    JWT_REFRESH_SECRET,
    { expiresIn: '7d' }
  );

  // Set httpOnly cookies
  const isProduction = process.env.NODE_ENV === 'production';
  const domain = isProduction ? undefined : 'localhost';
  const sameSite = isProduction ? 'None' : 'Strict';

  res.setHeader('Set-Cookie', [
    `accessToken=${accessToken}; HttpOnly; ${isProduction ? 'Secure;' : ''} SameSite=${sameSite}; Path=/; Max-Age=${15 * 60}; ${domain ? `Domain=${domain}` : ''}`,
    `refreshToken=${refreshToken}; HttpOnly; ${isProduction ? 'Secure;' : ''} SameSite=${sameSite}; Path=/api/auth/refresh; Max-Age=${7 * 24 * 60 * 60}; ${domain ? `Domain=${domain}` : ''}`
  ]);
}

async function handler(req: Request, res: Response) {
  if (req.method !== 'POST') {
    throw new ApiError(405, 'Method not allowed', 'METHOD_NOT_ALLOWED');
  }

  const { challengeToken, credential } = req.body as LoginWebAuthnRequest;

  if (!challengeToken || !credential) {
    throw new ApiError(400, 'Challenge token and credential required', 'MISSING_DATA');
  }

  // Verify challenge token
  let decoded: {
    userId: string;
    username: string;
    challenge: string;
    stage: string;
  };
  try {
    decoded = jwt.verify(challengeToken, process.env.JWT_SECRET!) as any;
  } catch (error) {
    throw new ApiError(401, 'Invalid or expired challenge token', 'INVALID_TOKEN');
  }

  if (decoded.stage !== 'webauthn-authentication') {
    throw new ApiError(403, 'Invalid token stage', 'INVALID_STAGE');
  }

  try {
    // Verify the authentication response
    const { verified, credential: storedCredential } = await verifyAuthenticationAndUpdateCounter(
      decoded.userId,
      credential,
      decoded.challenge
    );

    if (!verified) {
      // Log failed login
      await logFailure(
        decoded.userId,
        decoded.username,
        'login',
        'webauthn',
        req,
        'Authentication verification failed'
      );

      throw new ApiError(401, 'Authentication verification failed', 'VERIFICATION_FAILED');
    }

    // Authentication successful - set auth cookies
    setAuthCookies(res, decoded.userId, decoded.username);

    // Log successful login
    await logSuccess(
      decoded.userId,
      decoded.username,
      'login',
      'webauthn',
      req,
      {
        method: 'webauthn',
        deviceName: storedCredential.deviceName,
      }
    );

    // Return user info (NOT the tokens - they're in httpOnly cookies)
    return res.status(200).json({
      success: true,
      user: {
        id: decoded.userId,
        username: decoded.username,
        has2FA: true, // WebAuthn counts as 2FA
        hasWebAuthn: true,
      },
    });
  } catch (error) {
    // Log failed login
    await logFailure(
      decoded.userId,
      decoded.username,
      'login',
      'webauthn',
      req,
      error instanceof Error ? error.message : 'Unknown error'
    );

    throw new ApiError(
      401,
      error instanceof Error ? error.message : 'Authentication failed',
      'AUTHENTICATION_FAILED'
    );
  }
}

export default withErrorHandler(handler);
