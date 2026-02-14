/**
 * Audit Log Utility - Phase 4: Security Enhancement
 * Records user actions to Airtable for security and accountability
 */

import Airtable from 'airtable';
import type { VercelRequest } from '@vercel/node';

/**
 * Action types that can be logged
 */
export type AuditAction = 'login' | 'logout' | 'create' | 'update' | 'delete' | '2fa_setup' | '2fa_verify';

/**
 * Resource types that actions are performed on
 */
export type AuditResource = 'income' | 'expense' | 'category' | 'auth' | 'webauthn';

/**
 * Audit event data structure
 */
export interface AuditEvent {
  userId: string;
  username: string;
  action: AuditAction;
  resource: AuditResource;
  success: boolean;
  ip: string;
  details?: string | object;
}

/**
 * Extracts client IP address from request
 *
 * @param req - Vercel request object
 * @returns Client IP address or 'unknown'
 */
export function getClientIp(req: VercelRequest): string {
  // Check Vercel/proxy headers first
  const forwardedFor = req.headers['x-forwarded-for'];
  if (forwardedFor) {
    // x-forwarded-for can be a comma-separated list, take the first one
    return Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor.split(',')[0].trim();
  }

  const realIp = req.headers['x-real-ip'];
  if (realIp) {
    return Array.isArray(realIp) ? realIp[0] : realIp;
  }

  // Fallback (won't work in Vercel but useful for local testing)
  return 'unknown';
}

/**
 * Logs an audit event to Airtable
 *
 * @param event - The audit event to log
 * @returns Promise that resolves when logging is complete
 *
 * @example
 * ```typescript
 * await logAuditEvent({
 *   userId: 'usr_tom_001',
 *   username: 'tom',
 *   action: 'create',
 *   resource: 'income',
 *   success: true,
 *   ip: getClientIp(req),
 *   details: { amount: 5000, category: 'Freelance' }
 * });
 * ```
 */
export async function logAuditEvent(event: AuditEvent): Promise<void> {
  try {
    const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
    const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;
    const AIRTABLE_AUDIT_LOG_TABLE = process.env.AIRTABLE_AUDIT_LOG_TABLE || 'Audit Log';

    if (!AIRTABLE_API_KEY || !AIRTABLE_BASE_ID) {
      console.error('Airtable configuration missing for audit log');
      return;
    }

    const base = new Airtable({
      apiKey: AIRTABLE_API_KEY
    }).base(AIRTABLE_BASE_ID);

    // Convert details to JSON string if it's an object
    const detailsString = typeof event.details === 'object'
      ? JSON.stringify(event.details)
      : event.details || '';

    await base(AIRTABLE_AUDIT_LOG_TABLE).create({
      'Timestamp': new Date().toISOString(),
      'User ID': event.userId,
      'Username': event.username,
      'Action': event.action,
      'Resource': event.resource,
      'IP Address': event.ip,
      'Success': event.success,
      'Details': detailsString
    });

    // Log success in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`[Audit] ${event.username} - ${event.action} ${event.resource} - ${event.success ? 'SUCCESS' : 'FAILED'}`);
    }
  } catch (error) {
    // Don't fail the request if audit logging fails
    // Just log the error for debugging
    console.error('Failed to write audit log:', error);
  }
}

/**
 * Helper to log successful actions
 */
export async function logSuccess(
  userId: string,
  username: string,
  action: AuditAction,
  resource: AuditResource,
  req: VercelRequest,
  details?: string | object
): Promise<void> {
  await logAuditEvent({
    userId,
    username,
    action,
    resource,
    success: true,
    ip: getClientIp(req),
    details
  });
}

/**
 * Helper to log failed actions
 */
export async function logFailure(
  userId: string,
  username: string,
  action: AuditAction,
  resource: AuditResource,
  req: VercelRequest,
  details?: string | object
): Promise<void> {
  await logAuditEvent({
    userId,
    username,
    action,
    resource,
    success: false,
    ip: getClientIp(req),
    details
  });
}
