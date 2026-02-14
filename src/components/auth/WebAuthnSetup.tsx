/**
 * WebAuthn Setup Component - Phase 5: Biometric Authentication
 * Guides user through fingerprint/FaceID registration
 */

import { useState } from 'react';
import {
  registerWebAuthnCredential,
  isPlatformAuthenticatorAvailable,
  getWebAuthnErrorMessage,
} from '@/services/webauthn';
import { Fingerprint, Check, AlertCircle, Loader2 } from 'lucide-react';

interface WebAuthnSetupProps {
  tempToken: string;
  username: string;
  onSuccess: (credential: { id: string; deviceName: string }) => void;
  onCancel: () => void;
}

export function WebAuthnSetup({ tempToken, username, onSuccess, onCancel }: WebAuthnSetupProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isSupported, setIsSupported] = useState<boolean | null>(null);
  const [deviceName, setDeviceName] = useState('');

  // Check support on mount
  useState(() => {
    checkSupport();
  });

  async function checkSupport() {
    const supported = await isPlatformAuthenticatorAvailable();
    setIsSupported(supported);

    if (!supported) {
      setError('האימות הביומטרי אינו נתמך במכשיר זה');
    }
  }

  async function handleRegister() {
    if (!isSupported) return;

    setLoading(true);
    setError(null);

    try {
      const credential = await registerWebAuthnCredential(
        tempToken,
        deviceName || `${username}'s device`
      );

      setSuccess(true);
      setTimeout(() => {
        onSuccess(credential);
      }, 1500);
    } catch (err) {
      const errorMessage = err instanceof Error ? getWebAuthnErrorMessage(err) : 'שגיאה באימות';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full">
      <div className="text-center mb-6">
        <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
          <Fingerprint className="w-8 h-8 text-blue-600" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          הגדרת אימות ביומטרי
        </h2>
        <p className="text-gray-600">
          הוסף טביעת אצבע או זיהוי פנים להתחברות מהירה ומאובטחת
        </p>
      </div>

      {success ? (
        <div className="text-center py-8">
          <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
            <Check className="w-8 h-8 text-green-600" />
          </div>
          <p className="text-green-600 font-medium mb-2">האימות הביומטרי הופעל בהצלחה!</p>
          <p className="text-gray-600 text-sm">מעביר אותך למערכת...</p>
        </div>
      ) : (
        <>
          {!isSupported && isSupported !== null ? (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
              <div className="flex items-start">
                <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5 ml-3" />
                <div>
                  <p className="text-sm text-yellow-800 font-medium">
                    אימות ביומטרי לא זמין
                  </p>
                  <p className="text-sm text-yellow-700 mt-1">
                    המכשיר או הדפדפן שלך לא תומכים באימות ביומטרי.
                    תוכל להשתמש ב-TOTP במקום.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <>
              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    שם המכשיר (אופציונלי)
                  </label>
                  <input
                    type="text"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder={`${username}'s device`}
                    value={deviceName}
                    onChange={(e) => setDeviceName(e.target.value)}
                    disabled={loading}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    לדוגמה: "אייפון של תום" או "גלקסי של יעל"
                  </p>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h3 className="font-medium text-blue-900 mb-2">איך זה עובד?</h3>
                  <ol className="text-sm text-blue-800 space-y-2 mr-5">
                    <li className="list-decimal">לחץ על "הפעל אימות ביומטרי"</li>
                    <li className="list-decimal">הדפדפן יבקש ממך טביעת אצבע או זיהוי פנים</li>
                    <li className="list-decimal">סרוק את טביעת האצבע/הפנים שלך</li>
                    <li className="list-decimal">מעתה תוכל להתחבר בטביעת אצבע!</li>
                  </ol>
                </div>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                  <div className="flex items-start">
                    <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 ml-3" />
                    <p className="text-sm text-red-800">{error}</p>
                  </div>
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={handleRegister}
                  disabled={loading || !isSupported}
                  className="flex-1 bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-5 h-5 ml-2 animate-spin" />
                      מגדיר...
                    </>
                  ) : (
                    <>
                      <Fingerprint className="w-5 h-5 ml-2" />
                      הפעל אימות ביומטרי
                    </>
                  )}
                </button>

                <button
                  onClick={onCancel}
                  disabled={loading}
                  className="px-6 py-3 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  דלג
                </button>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
