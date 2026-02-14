/**
 * Auth Middleware - Phase 4: Security Enhancement
 * JWT verification middleware for protecting API endpoints
 */

import type { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { parse } from 'cookie';

/**
 * Extended request type with user information
 */
export interface AuthRequest extends Request {
  user?: {
    userId: string;
    username: string;
  };
}

/**
 * Higher-order function that wraps API handlers with JWT authentication
 *
 * @param handler - The API handler function to protect
 * @returns Protected handler that requires valid JWT
 *
 * @example
 * ```typescript
 * export default withAuth(async (req, res) => {
 *   const { userId, username} = req.user!;
 *   // ... your endpoint logic
 * });
 * ```
 */
export function withAuth(
  handler: (req: AuthRequest, res: Response) => Promise<void | Response>
) {
  return async (req: AuthRequest, res: Response) => {
    try {
      // Extract token from cookie
      const cookies = parse(req.headers.cookie || '');
      const token = cookies.accessToken;

      if (!token) {
        return res.status(401).json({
          error: 'Unauthorized - No token provided',
          code: 'NO_TOKEN'
        });
      }

      // Verify JWT
      const JWT_SECRET = process.env.JWT_SECRET;
      if (!JWT_SECRET) {
        console.error('JWT_SECRET is not defined in environment variables');
        return res.status(500).json({
          error: 'Server configuration error'
        });
      }

      const decoded = jwt.verify(token, JWT_SECRET) as {
        userId: string;
        username: string;
      };

      // Attach user to request
      req.user = {
        userId: decoded.userId,
        username: decoded.username
      };

      // Continue to handler
      return handler(req, res);
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        return res.status(401).json({
          error: 'Token expired',
          code: 'TOKEN_EXPIRED'
        });
      }
      if (error instanceof jwt.JsonWebTokenError) {
        return res.status(403).json({
          error: 'Invalid token',
          code: 'INVALID_TOKEN'
        });
      }
      // Unexpected error
      console.error('Auth middleware error:', error);
      return res.status(500).json({
        error: 'Authentication error'
      });
    }
  };
}
