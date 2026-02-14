/**
 * Login Endpoint - Phase 4: Security Enhancement
 * Authenticates user with username + password
 * Returns temp token if 2FA is required, otherwise returns JWT tokens
 */

import type { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { withErrorHandler, ApiError } from '../../lib/middleware-error';
import { logAuditEvent, getClientIp } from '../../lib/utils-audit';
import { userHasWebAuthnCredentials } from '../../lib/utils-webauthn';

interface LoginRequest {
  username: string;
  password: string;
}

interface UserConfig {
  id: string;
  username: string;
  passwordHash: string;
  totpSecret?: string;
}

/**
 * Gets user configuration from environment variables
 */
function getUserByUsername(username: string): UserConfig | null {
  if (username === process.env.AUTH_USER_TOM_USERNAME) {
    return {
      id: process.env.AUTH_USER_TOM_ID!,
      username: process.env.AUTH_USER_TOM_USERNAME!,
      passwordHash: process.env.AUTH_USER_TOM_PASSWORD_HASH!,
      totpSecret: process.env.AUTH_USER_TOM_TOTP_SECRET
    };
  }
  if (username === process.env.AUTH_USER_YAEL_USERNAME) {
    return {
      id: process.env.AUTH_USER_YAEL_ID!,
      username: process.env.AUTH_USER_YAEL_USERNAME!,
      passwordHash: process.env.AUTH_USER_YAEL_PASSWORD_HASH!,
      totpSecret: process.env.AUTH_USER_YAEL_TOTP_SECRET
    };
  }
  return null;
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
  // In production (cross-origin), use SameSite=None; in dev use Strict
  const sameSite = isProduction ? 'None' : 'Strict';

  res.setHeader('Set-Cookie', [
    `accessToken=${accessToken}; HttpOnly; ${isProduction ? 'Secure;' : ''} SameSite=${sameSite}; Path=/; Max-Age=${15 * 60}; ${domain ? `Domain=${domain}` : ''}`,
    `refreshToken=${refreshToken}; HttpOnly; ${isProduction ? 'Secure;' : ''} SameSite=${sameSite}; Path=/api/auth/refresh; Max-Age=${7 * 24 * 60 * 60}; ${domain ? `Domain=${domain}` : ''}`
  ]);
}

async function handler(req: Request, res: Response) {
  // Only POST allowed
  if (req.method !== 'POST') {
    throw new ApiError(405, 'Method not allowed', 'METHOD_NOT_ALLOWED');
  }

  const { username, password } = req.body as LoginRequest;

  // Validation
  if (!username || !password) {
    throw new ApiError(400, 'Username and password required', 'MISSING_CREDENTIALS');
  }

  // Find user
  const user = getUserByUsername(username);
  if (!user) {
    // Log failed attempt (use placeholder for unknown user)
    await logAuditEvent({
      userId: 'unknown',
      username: username || 'unknown',
      action: 'login',
      resource: 'auth',
      success: false,
      ip: getClientIp(req),
      details: 'User not found'
    });

    throw new ApiError(401, 'Invalid credentials', 'INVALID_CREDENTIALS');
  }

  // Verify password
  const isValid = await bcrypt.compare(password, user.passwordHash);
  if (!isValid) {
    // Log failed attempt
    await logAuditEvent({
      userId: user.id,
      username: user.username,
      action: 'login',
      resource: 'auth',
      success: false,
      ip: getClientIp(req),
      details: 'Invalid password'
    });

    throw new ApiError(401, 'Invalid credentials', 'INVALID_CREDENTIALS');
  }

  // Check if 2FA is enabled (TOTP secret exists or WebAuthn credentials)
  const hasTotp = !!user.totpSecret;
  const hasWebAuthn = await userHasWebAuthnCredentials(user.id);
  const has2FA = hasTotp || hasWebAuthn;

  if (has2FA) {
    // User has 2FA enabled - return temp token
    // The client will then call /api/auth/login-totp or /api/auth/login-webauthn
    const tempToken = jwt.sign(
      { userId: user.id, username: user.username, stage: 'awaiting-totp' },
      process.env.JWT_SECRET!,
      { expiresIn: '5m' } // Temp token expires in 5 minutes
    );

    return res.status(200).json({
      requireTotp: true,
      tempToken,
      hasTotp,
      hasWebAuthn,
    });
  }

  // No 2FA - check if setup is required
  if (!hasTotp && !hasWebAuthn) {
    // User doesn't have any 2FA set up yet
    // Return temp token for 2FA setup flow
    const tempToken = jwt.sign(
      { userId: user.id, username: user.username, stage: 'awaiting-setup' },
      process.env.JWT_SECRET!,
      { expiresIn: '10m' }
    );

    return res.status(200).json({
      requireTotp: false,
      requireSetup: true,
      tempToken
    });
  }

  // No 2FA and not required - proceed with direct login
  // Set auth cookies
  setAuthCookies(res, user.id, user.username);

  // Log successful login
  await logAuditEvent({
    userId: user.id,
    username: user.username,
    action: 'login',
    resource: 'auth',
    success: true,
    ip: getClientIp(req),
    details: 'Direct login (no 2FA)'
  });

  // Return user info (NOT the tokens - they're in httpOnly cookies)
  return res.status(200).json({
    success: true,
    user: {
      id: user.id,
      username: user.username,
      has2FA: has2FA,
      hasWebAuthn: hasWebAuthn
    }
  });
}

export default withErrorHandler(handler);
