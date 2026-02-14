/**
 * Verify Session Endpoint - Phase 4: Security Enhancement
 * Verifies the current session and returns user info
 * Used for initial page load to check if user is authenticated
 */

import type { VercelResponse } from '@vercel/node';
import { withAuth, AuthRequest } from '../../lib/middleware-auth';
import { withErrorHandler, ApiError } from '../../lib/middleware-error';

/**
 * Checks if user has 2FA enabled
 */
function getUserHas2FA(userId: string): boolean {
  if (userId === process.env.AUTH_USER_TOM_ID) {
    return !!process.env.AUTH_USER_TOM_TOTP_SECRET;
  }
  if (userId === process.env.AUTH_USER_YAEL_ID) {
    return !!process.env.AUTH_USER_YAEL_TOTP_SECRET;
  }
  return false;
}

async function handler(req: AuthRequest, res: VercelResponse) {
  // Only GET allowed
  if (req.method !== 'GET') {
    throw new ApiError(405, 'Method not allowed', 'METHOD_NOT_ALLOWED');
  }

  // If we got here, the auth middleware has verified the token
  // req.user is populated with user info
  const user = req.user!;

  const has2FA = getUserHas2FA(user.userId);

  // Return user info
  return res.status(200).json({
    user: {
      id: user.userId,
      username: user.username,
      has2FA,
      hasWebAuthn: false // Will be implemented in Phase 5
    }
  });
}

// Combine error handler with auth middleware
const withAuthAndErrorHandler = (handler: any) => withErrorHandler(withAuth(handler));

export default withAuthAndErrorHandler(handler);
