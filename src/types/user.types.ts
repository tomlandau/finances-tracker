/**
 * User Types - Phase 4: Security Enhancement
 * Defines user-related interfaces for JWT authentication
 */

export interface User {
  id: string;
  username: string;
  has2FA: boolean;
  hasWebAuthn: boolean;
}

export interface UserCredentials {
  username: string;
  password: string;
}

export interface LoginResponse {
  requireTotp: boolean;
  requireSetup: boolean;
  tempToken?: string;
  user?: User;
}

export interface TotpSetupResponse {
  secret: string;
  qrCodeUrl: string;
  manualCode: string;
}

export interface TotpVerifyRequest {
  tempToken: string;
  totpCode: string;
  secret?: string;
}
