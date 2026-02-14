/**
 * Auth Types - Phase 4: Security Enhancement
 * Updated to support JWT authentication with 2FA (TOTP + WebAuthn)
 */

import type { User } from './user.types';

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  loading: boolean;
  twoFactorRequired: boolean;
  tempToken: string | null;
  requireSetup: boolean;
  login: (username: string, password: string) => Promise<LoginResult>;
  loginWithTotp: (tempToken: string, totpCode: string) => Promise<boolean>;
  loginWithWebAuthn: (tempToken: string) => Promise<boolean>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
  verify: () => Promise<void>;
}

export interface LoginResult {
  success: boolean;
  requireTotp: boolean;
  requireSetup: boolean;
  tempToken?: string;
  user?: User;
}

export type TwoFactorMethod = 'totp' | 'webauthn' | null;
