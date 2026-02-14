/**
 * WebAuthn Types - Phase 4: Security Enhancement
 * Defines WebAuthn/Biometric authentication interfaces
 */

import type {
  PublicKeyCredentialCreationOptionsJSON,
  PublicKeyCredentialRequestOptionsJSON,
  RegistrationResponseJSON,
  AuthenticationResponseJSON,
} from '@simplewebauthn/browser';

export interface WebAuthnCredential {
  id: string;
  credentialId: string;
  userId: string;
  username: string;
  publicKey: string;
  counter: number;
  deviceName: string;
  createdAt: string;
  lastUsed: string;
  aaguid: string;
}

export interface WebAuthnRegistrationOptions {
  options: PublicKeyCredentialCreationOptionsJSON;
}

export interface WebAuthnAuthenticationOptions {
  options: PublicKeyCredentialRequestOptionsJSON;
}

export interface WebAuthnRegistrationRequest {
  tempToken: string;
  deviceName: string;
  response: RegistrationResponseJSON;
}

export interface WebAuthnAuthenticationRequest {
  tempToken: string;
  response: AuthenticationResponseJSON;
}

export {
  PublicKeyCredentialCreationOptionsJSON,
  PublicKeyCredentialRequestOptionsJSON,
  RegistrationResponseJSON,
  AuthenticationResponseJSON,
};
