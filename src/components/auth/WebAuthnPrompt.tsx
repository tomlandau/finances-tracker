/**
 * WebAuthn Login Prompt - Phase 5: Biometric Authentication
 * Shows during login to authenticate with fingerprint/FaceID
 */

import { useState, useEffect } from 'react';
import {
  authenticateWithWebAuthn,
  getWebAuthnErrorMessage,
} from '@/services/webauthn';
import { Fingerprint, AlertCircle, Loader2 } from 'lucide-react';

interface WebAuthnPromptProps {
  tempToken: string;
  username: string;
  onSuccess: (user: { id: string; username: string; has2FA: boolean; hasWebAuthn: boolean }) => void;
  onCancel: () => void;
  onUseTotpInstead: () => void;
}

export function WebAuthnPrompt({
  tempToken,
  username,
  onSuccess,
  onCancel,
  onUseTotpInstead,
}: WebAuthnPromptProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [autoStarted, setAutoStarted] = useState(false);

  // Auto-start authentication on mount
  useEffect(() => {
    if (!autoStarted) {
      setAutoStarted(true);
      handleAuthenticate();
    }
  }, [autoStarted]);

  async function handleAuthenticate() {
    setLoading(true);
    setError(null);

    try {
      const user = await authenticateWithWebAuthn(tempToken);
      onSuccess(user);
    } catch (err) {
      const errorMessage = err instanceof Error ? getWebAuthnErrorMessage(err) : 'שגיאה באימות';
      setError(errorMessage);
      setLoading(false);
    }
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full">
      <div className="text-center mb-6">
        <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
          <Fingerprint className={`w-8 h-8 text-blue-600 ${loading ? 'animate-pulse' : ''}`} />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          אימות ביומטרי
        </h2>
        <p className="text-gray-600">
          {loading
            ? 'סרוק את טביעת האצבע או הפנים שלך'
            : 'לחץ להתחבר עם אימות ביומטרי'}
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <div className="flex items-start">
            <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 ml-3" />
            <div className="flex-1">
              <p className="text-sm text-red-800 font-medium mb-2">{error}</p>
              <button
                onClick={handleAuthenticate}
                className="text-sm text-red-700 hover:text-red-800 underline"
              >
                נסה שוב
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {!error && (
          <button
            onClick={handleAuthenticate}
            disabled={loading}
            className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-wait transition-colors flex items-center justify-center"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 ml-2 animate-spin" />
                מאמת...
              </>
            ) : (
              <>
                <Fingerprint className="w-5 h-5 ml-2" />
                התחבר עם טביעת אצבע
              </>
            )}
          </button>
        )}

        <button
          onClick={onUseTotpInstead}
          disabled={loading}
          className="w-full py-3 px-4 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          השתמש ב-TOTP במקום
        </button>

        <button
          onClick={onCancel}
          disabled={loading}
          className="w-full text-gray-600 hover:text-gray-800 py-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
        >
          ביטול
        </button>
      </div>

      <div className="mt-6 pt-6 border-t border-gray-200">
        <p className="text-xs text-gray-500 text-center">
          משתמש: <span className="font-medium">{username}</span>
        </p>
      </div>
    </div>
  );
}
