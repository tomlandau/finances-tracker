/**
 * Login Form Component - Phase 6: Client Integration
 * Handles multi-stage authentication flow:
 * 1. Username/Password
 * 2. TOTP verification (if user has 2FA)
 * 3. Setup flow (if user needs to configure 2FA)
 */

import { useState, FormEvent } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { TotpInput } from './TotpInput';
import { TotpSetup } from './TotpSetup';

export function LoginForm() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { login, loginWithTotp, twoFactorRequired, requireSetup, tempToken } = useAuth();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    if (!username || !password) {
      setError('יש להזין שם משתמש וסיסמה');
      return;
    }

    setIsSubmitting(true);

    try {
      await login(username, password);
      // If login succeeds, the AuthContext will update and handle the next steps
      // (showing TOTP input, setup, or logging in directly)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'שגיאה בהתחברות');
      setPassword('');
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
    setPassword('');
    setError('');
  };

  // Show TOTP setup screen if required
  if (requireSetup && tempToken) {
    return (
      <TotpSetup
        tempToken={tempToken}
        onSuccess={handleSetupSuccess}
        onCancel={handleCancel}
      />
    );
  }

  // Show TOTP input screen if 2FA is required
  if (twoFactorRequired && tempToken) {
    return (
      <TotpInput
        tempToken={tempToken}
        onSuccess={handleTotpSuccess}
        onCancel={handleCancel}
        loginWithTotp={loginWithTotp}
      />
    );
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
          <Input
            type="password"
            label="סיסמה"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="הזן סיסמה"
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
