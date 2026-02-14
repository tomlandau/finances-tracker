/**
 * WebAuthn Registration Verification - Phase 5: Biometric Authentication
 * Verifies registration response and stores credential
 * Called after user completes fingerprint/FaceID registration
 */

import type { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import type { RegistrationResponseJSON } from '@simplewebauthn/server';
import { withErrorHandler, ApiError } from '../../../lib/middleware-error';
import { verifyAndStoreRegistration } from '../../../lib/utils-webauthn';
import { logSuccess, logFailure } from '../../../lib/utils-audit';

interface RegisterVerifyRequest {
  challengeToken: string;
  credential: RegistrationResponseJSON;
}

async function handler(req: Request, res: Response) {
  if (req.method !== 'POST') {
    throw new ApiError(405, 'Method not allowed', 'METHOD_NOT_ALLOWED');
  }

  const { challengeToken, credential } = req.body as RegisterVerifyRequest;

  if (!challengeToken || !credential) {
    throw new ApiError(400, 'Challenge token and credential required', 'MISSING_DATA');
  }

  // Verify challenge token
  let decoded: {
    userId: string;
    username: string;
    challenge: string;
    deviceName: string;
    stage: string;
  };
  try {
    decoded = jwt.verify(challengeToken, process.env.JWT_SECRET!) as any;
  } catch (error) {
    throw new ApiError(401, 'Invalid or expired challenge token', 'INVALID_TOKEN');
  }

  if (decoded.stage !== 'webauthn-registration') {
    throw new ApiError(403, 'Invalid token stage', 'INVALID_STAGE');
  }

  try {
    console.log('🔍 Verifying WebAuthn registration for user:', decoded.username);
    console.log('Challenge:', decoded.challenge);
    console.log('Credential ID:', credential.id);

    // Verify and store the credential
    const storedCredential = await verifyAndStoreRegistration(
      decoded.userId,
      decoded.username,
      credential,
      decoded.challenge,
      decoded.deviceName
    );

    // Log successful registration
    await logSuccess(
      decoded.userId,
      decoded.username,
      '2fa_setup',
      'webauthn',
      req,
      {
        credentialId: storedCredential.credentialID.substring(0, 20) + '...',
        deviceName: storedCredential.deviceName,
      }
    );

    return res.status(200).json({
      success: true,
      credential: {
        id: storedCredential.id,
        deviceName: storedCredential.deviceName,
        createdAt: storedCredential.createdAt,
      },
    });
  } catch (error) {
    console.error('❌ WebAuthn registration verification failed:', error);

    // Log failed registration
    await logFailure(
      decoded.userId,
      decoded.username,
      '2fa_setup',
      'webauthn',
      req,
      error instanceof Error ? error.message : 'Unknown error'
    );

    throw new ApiError(
      400,
      error instanceof Error ? error.message : 'Registration verification failed',
      'VERIFICATION_FAILED'
    );
  }
}

export default withErrorHandler(handler);
