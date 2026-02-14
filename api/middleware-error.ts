/**
 * Error Handler Middleware - Phase 4: Security Enhancement
 * Centralized error handling for consistent API responses
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';

export class ApiError extends Error {
  constructor(
    public statusCode: number,
    public message: string,
    public code?: string
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/**
 * Standardized error response format
 */
export interface ErrorResponse {
  error: string;
  code?: string;
  details?: string;
}

/**
 * Higher-order function that wraps API handlers with error handling
 *
 * @param handler - The API handler function to wrap
 * @returns Handler with automatic error catching and formatting
 *
 * @example
 * ```typescript
 * export default withErrorHandler(async (req, res) => {
 *   if (!req.body.username) {
 *     throw new ApiError(400, 'Username is required', 'MISSING_USERNAME');
 *   }
 *   // ... rest of handler
 * });
 * ```
 */
export function withErrorHandler(
  handler: (req: VercelRequest, res: VercelResponse) => Promise<void | VercelResponse>
) {
  return async (req: VercelRequest, res: VercelResponse) => {
    try {
      return await handler(req, res);
    } catch (error) {
      // Handle ApiError instances
      if (error instanceof ApiError) {
        return res.status(error.statusCode).json({
          error: error.message,
          code: error.code
        } as ErrorResponse);
      }

      // Handle unexpected errors
      console.error('Unexpected error in API handler:', error);

      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      return res.status(500).json({
        error: 'Internal server error',
        details: process.env.NODE_ENV === 'development' ? errorMessage : undefined
      } as ErrorResponse);
    }
  };
}

/**
 * Combines auth middleware with error handling
 *
 * @example
 * ```typescript
 * import { withAuthAndErrorHandler } from './middleware/errorHandler';
 *
 * export default withAuthAndErrorHandler(async (req, res) => {
 *   // req.user is available and errors are handled
 * });
 * ```
 */
export function withAuthAndErrorHandler(
  handler: (req: any, res: VercelResponse) => Promise<void | VercelResponse>
) {
  const { withAuth } = require('./auth');
  return withErrorHandler(withAuth(handler));
}
