/**
 * Refresh Token Endpoint - Phase 4: Security Enhancement
 * Refreshes access token using refresh token
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import jwt from 'jsonwebtoken';
import { parse } from 'cookie';
import { withErrorHandler, ApiError } from '../_middleware-error';

/**
 * Gets username from user ID
 */
function getUsernameById(userId: string): string {
  if (userId === process.env.AUTH_USER_TOM_ID) {
    return process.env.AUTH_USER_TOM_USERNAME!;
  }
  if (userId === process.env.AUTH_USER_YAEL_ID) {
    return process.env.AUTH_USER_YAEL_USERNAME!;
  }
  return 'unknown';
}

async function handler(req: VercelRequest, res: VercelResponse) {
  // Only POST allowed
  if (req.method !== 'POST') {
    throw new ApiError(405, 'Method not allowed', 'METHOD_NOT_ALLOWED');
  }

  // Extract refresh token from cookie
  const cookies = parse(req.headers.cookie || '');
  const refreshToken = cookies.refreshToken;

  if (!refreshToken) {
    throw new ApiError(401, 'No refresh token provided', 'NO_REFRESH_TOKEN');
  }

  const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;
  if (!JWT_REFRESH_SECRET) {
    console.error('JWT_REFRESH_SECRET is not defined');
    throw new ApiError(500, 'Server configuration error');
  }

  try {
    // Verify refresh token
    const decoded = jwt.verify(refreshToken, JWT_REFRESH_SECRET) as {
      userId: string;
      tokenVersion: number;
    };

    // Get username from user ID
    const username = getUsernameById(decoded.userId);

    if (username === 'unknown') {
      throw new ApiError(401, 'Invalid user', 'INVALID_USER');
    }

    // Generate new access token
    const JWT_SECRET = process.env.JWT_SECRET!;
    const newAccessToken = jwt.sign(
      { userId: decoded.userId, username },
      JWT_SECRET,
      { expiresIn: '15m' }
    );

    // Set new access token cookie
    const isProduction = process.env.NODE_ENV === 'production';
    const domain = isProduction ? undefined : 'localhost';

    res.setHeader(
      'Set-Cookie',
      `accessToken=${newAccessToken}; HttpOnly; ${isProduction ? 'Secure;' : ''} SameSite=Strict; Path=/; Max-Age=${15 * 60}; ${domain ? `Domain=${domain}` : ''}`
    );

    return res.status(200).json({
      success: true,
      message: 'Access token refreshed'
    });
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new ApiError(401, 'Refresh token expired', 'REFRESH_TOKEN_EXPIRED');
    }
    if (error instanceof jwt.JsonWebTokenError) {
      throw new ApiError(401, 'Invalid refresh token', 'INVALID_REFRESH_TOKEN');
    }
    throw error;
  }
}

export default withErrorHandler(handler);
