/**
 * Logout Endpoint - Phase 4: Security Enhancement
 * Clears authentication cookies and logs the logout event
 */

import type { VercelResponse } from '@vercel/node';
import { withAuth, AuthRequest } from '../../lib/middleware/auth';
import { withErrorHandler, ApiError } from '../../lib/middleware/errorHandler';
import { logAuditEvent, getClientIp } from '../../lib/utils/auditLog';

async function handler(req: AuthRequest, res: VercelResponse) {
  // Only POST allowed
  if (req.method !== 'POST') {
    throw new ApiError(405, 'Method not allowed', 'METHOD_NOT_ALLOWED');
  }

  // Get user info from auth middleware
  const user = req.user!;

  // Clear cookies by setting Max-Age to 0
  const isProduction = process.env.NODE_ENV === 'production';
  const domain = isProduction ? undefined : 'localhost';

  res.setHeader('Set-Cookie', [
    `accessToken=; HttpOnly; ${isProduction ? 'Secure;' : ''} SameSite=Strict; Path=/; Max-Age=0; ${domain ? `Domain=${domain}` : ''}`,
    `refreshToken=; HttpOnly; ${isProduction ? 'Secure;' : ''} SameSite=Strict; Path=/api/auth/refresh; Max-Age=0; ${domain ? `Domain=${domain}` : ''}`
  ]);

  // Log logout
  await logAuditEvent({
    userId: user.userId,
    username: user.username,
    action: 'logout',
    resource: 'auth',
    success: true,
    ip: getClientIp(req)
  });

  return res.status(200).json({
    success: true,
    message: 'Logged out successfully'
  });
}

// Combine error handler with auth middleware
const withAuthAndErrorHandler = (handler: any) => withErrorHandler(withAuth(handler));

export default withAuthAndErrorHandler(handler);
