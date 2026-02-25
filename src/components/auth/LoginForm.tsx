/**
 * Login Form Component - Phase 6: Client Integration
 * Handles multi-stage authentication flow:
 * 1. Username/Password
 * 2. TOTP/WebAuthn verification (if user has 2FA)
 * 3. Setup flow (if user needs to configure 2FA)
 */

import { useState, FormEvent } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { TotpInput } from './TotpInput';
import { TotpSetup } from './TotpSetup';
import { WebAuthnSetup } from './WebAuthnSetup';
import { WebAuthnPrompt } from './WebAuthnPrompt';
import { TwoFactorChoice } from './TwoFactorChoice';
import type { TwoFactorMethod } from '@/types/auth.types';

export function LoginForm() {
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [setupMethod, setSetupMethod] = useState<TwoFactorMethod>(null);
  const [loginMethod, setLoginMethod] = useState<TwoFactorMethod>(null);
  const {
    login,
    loginWithTotp,
    loginWithWebAuthn,
    twoFactorRequired,
    requireSetup,
    tempToken,
    hasTotp,
    hasWebAuthn,
  } = useAuth();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    if (!username) {
      setError('יש להזין שם משתמש');
      return;
    }

    setIsSubmitting(true);

    try {
      await login(username);
      // If login succeeds, the AuthContext will update and handle the next steps
      // (showing TOTP input, setup, or logging in directly)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'שגיאה בהתחברות');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTotpSuccess = () => {
    // After successful TOTP, the AuthContext will update isAuthenticated
    // and the App component will show the main app
  };

  const handleSetupSuccess = () => {
    // After setup is complete, redirect back to login
    window.location.reload();
  };

  const handleCancel = () => {
    // Reset to initial login state
    setUsername('');
    setError('');
    setSetupMethod(null);
    setLoginMethod(null);
  };

  const handleWebAuthnSuccess = () => {
    // After successful WebAuthn login, the AuthContext will update isAuthenticated
    // and the App component will show the main app
  };

  // Show 2FA setup flow if required
  if (requireSetup && tempToken) {
    // First, let user choose between TOTP and WebAuthn
    if (!setupMethod) {
      return (
        <TwoFactorChoice
          username={username}
          onChooseTotp={() => setSetupMethod('totp')}
          onChooseWebAuthn={() => setSetupMethod('webauthn')}
          onBack={handleCancel}
        />
      );
    }

    // Show the chosen setup method
    if (setupMethod === 'totp') {
      return (
        <TotpSetup
          tempToken={tempToken}
          onSuccess={handleSetupSuccess}
          onCancel={handleCancel}
        />
      );
    }

    if (setupMethod === 'webauthn') {
      return (
        <WebAuthnSetup
          tempToken={tempToken}
          username={username}
          onSuccess={handleSetupSuccess}
          onCancel={() => setSetupMethod(null)}
        />
      );
    }
  }

  // Show 2FA verification if required
  if (twoFactorRequired && tempToken) {
    // If user hasn't chosen a method yet, show options or auto-select
    if (!loginMethod) {
      // If only one method is available, auto-select it
      if (hasTotp && !hasWebAuthn) {
        setLoginMethod('totp');
      } else if (hasWebAuthn && !hasTotp) {
        setLoginMethod('webauthn');
      } else if (hasTotp && hasWebAuthn) {
        // Both available - let user choose (default to WebAuthn)
        setLoginMethod('webauthn');
      }
      return null; // Will re-render with method selected
    }

    // Show TOTP input
    if (loginMethod === 'totp') {
      return (
        <TotpInput
          tempToken={tempToken}
          onSuccess={handleTotpSuccess}
          onCancel={handleCancel}
          loginWithTotp={loginWithTotp}
          onUseWebAuthnInstead={hasWebAuthn ? () => setLoginMethod('webauthn') : undefined}
        />
      );
    }

    // Show WebAuthn prompt
    if (loginMethod === 'webauthn') {
      return (
        <WebAuthnPrompt
          tempToken={tempToken}
          username={username}
          onSuccess={handleWebAuthnSuccess}
          onCancel={handleCancel}
          onUseTotpInstead={() => setLoginMethod('totp')}
          loginWithWebAuthn={loginWithWebAuthn}
        />
      );
    }
  }

  // Initial login screen
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
        <h1 className="text-2xl font-bold text-center mb-2">
          מעקב הכנסות והוצאות
        </h1>
        <p className="text-gray-600 text-center mb-6">
          התחבר כדי להמשיך
        </p>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            type="text"
            label="שם משתמש"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="הזן שם משתמש"
            autoFocus
            disabled={isSubmitting}
          />
          <Button type="submit" fullWidth disabled={isSubmitting}>
            {isSubmitting ? 'מתחבר...' : 'התחבר'}
          </Button>
        </form>

        <div className="mt-6 text-xs text-gray-500 text-center">
          <p>אבטחה מתקדמת עם אימות דו-שלבי (2FA)</p>
        </div>
      </div>
    </div>
  );
}
