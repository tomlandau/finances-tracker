/**
 * Settings Page - WebAuthn & 2FA Management
 * Allows users to manage their security settings
 */

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import {
  getWebAuthnCredentials,
  deleteWebAuthnCredential,
  registerWebAuthnCredential,
  isPlatformAuthenticatorAvailable,
  type WebAuthnCredential,
} from '@/services/webauthn';
import { WebAuthnSetup } from '@/components/auth/WebAuthnSetup';
import { Fingerprint, Trash2, Plus, Shield, Smartphone, AlertCircle, Check } from 'lucide-react';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';

export function SettingsPage() {
  const { user, logout } = useAuth();
  const [credentials, setCredentials] = useState<WebAuthnCredential[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddWebAuthn, setShowAddWebAuthn] = useState(false);
  const [tempToken, setTempToken] = useState<string | null>(null);
  const [isWebAuthnSupported, setIsWebAuthnSupported] = useState(false);

  useEffect(() => {
    loadCredentials();
    checkWebAuthnSupport();
  }, []);

  async function checkWebAuthnSupport() {
    const supported = await isPlatformAuthenticatorAvailable();
    setIsWebAuthnSupported(supported);
  }

  async function loadCredentials() {
    setLoading(true);
    setError(null);
    try {
      const creds = await getWebAuthnCredentials();
      setCredentials(creds);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'שגיאה בטעינת credentials');
    } finally {
      setLoading(false);
    }
  }

  async function handleDeleteCredential(credentialId: string) {
    if (!confirm('האם אתה בטוח שברצונך למחוק credential זה?')) {
      return;
    }

    try {
      await deleteWebAuthnCredential(credentialId);
      await loadCredentials();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'שגיאה במחיקת credential');
    }
  }

  async function handleAddWebAuthn() {
    // Generate a temp token for adding WebAuthn
    // We need to get this from a new endpoint or use the current session
    try {
      const response = await fetch('/api/auth/webauthn/generate-token', {
        method: 'POST',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to generate token');
      }

      const data = await response.json();
      setTempToken(data.tempToken);
      setShowAddWebAuthn(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'שגיאה ביצירת טוקן');
    }
  }

  function handleWebAuthnSuccess() {
    setShowAddWebAuthn(false);
    setTempToken(null);
    loadCredentials();
  }

  if (showAddWebAuthn && tempToken) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <WebAuthnSetup
          tempToken={tempToken}
          username={user?.username || ''}
          onSuccess={handleWebAuthnSuccess}
          onCancel={() => {
            setShowAddWebAuthn(false);
            setTempToken(null);
          }}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">הגדרות אבטחה</h1>
          <p className="text-gray-600">נהל את הגדרות האבטחה וה-2FA שלך</p>
        </div>

        {/* User Info */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center ml-4">
                <span className="text-xl font-bold text-blue-600">
                  {user?.username?.[0]?.toUpperCase()}
                </span>
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">{user?.username}</h2>
                <p className="text-sm text-gray-500">מחובר</p>
              </div>
            </div>
            <button
              onClick={logout}
              className="px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            >
              התנתק
            </button>
          </div>
        </div>

        {/* 2FA Status */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
            <Shield className="w-5 h-5 ml-2 text-blue-600" />
            סטטוס אבטחה
          </h2>

          <div className="space-y-3">
            {/* TOTP Status */}
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center">
                <Smartphone className="w-5 h-5 ml-3 text-gray-600" />
                <div>
                  <h3 className="font-medium text-gray-900">TOTP Authenticator</h3>
                  <p className="text-sm text-gray-500">קוד חד-פעמי מאפליקציה</p>
                </div>
              </div>
              {user?.has2FA ? (
                <div className="flex items-center text-green-600">
                  <Check className="w-5 h-5 ml-1" />
                  <span className="font-medium">פעיל</span>
                </div>
              ) : (
                <span className="text-gray-400">לא פעיל</span>
              )}
            </div>

            {/* WebAuthn Status */}
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center">
                <Fingerprint className="w-5 h-5 ml-3 text-gray-600" />
                <div>
                  <h3 className="font-medium text-gray-900">אימות ביומטרי</h3>
                  <p className="text-sm text-gray-500">טביעת אצבע או זיהוי פנים</p>
                </div>
              </div>
              {credentials.length > 0 ? (
                <div className="flex items-center text-green-600">
                  <Check className="w-5 h-5 ml-1" />
                  <span className="font-medium">{credentials.length} מכשירים</span>
                </div>
              ) : (
                <span className="text-gray-400">לא פעיל</span>
              )}
            </div>
          </div>
        </div>

        {/* WebAuthn Credentials */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900 flex items-center">
              <Fingerprint className="w-5 h-5 ml-2 text-blue-600" />
              מכשירים ביומטריים
            </h2>
            <button
              onClick={handleAddWebAuthn}
              disabled={!isWebAuthnSupported}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              <Plus className="w-4 h-4 ml-2" />
              הוסף מכשיר
            </button>
          </div>

          {!isWebAuthnSupported && (
            <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-start">
                <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5 ml-3" />
                <div>
                  <p className="text-sm text-yellow-800 font-medium">
                    אימות ביומטרי לא נתמך
                  </p>
                  <p className="text-sm text-yellow-700 mt-1">
                    המכשיר או הדפדפן שלך לא תומכים באימות ביומטרי.
                  </p>
                </div>
              </div>
            </div>
          )}

          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-start">
                <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 ml-3" />
                <p className="text-sm text-red-800">{error}</p>
              </div>
            </div>
          )}

          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-2"></div>
              <p className="text-gray-500">טוען...</p>
            </div>
          ) : credentials.length === 0 ? (
            <div className="text-center py-8">
              <Fingerprint className="w-16 h-16 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 mb-2">אין מכשירים רשומים</p>
              <p className="text-sm text-gray-400">
                הוסף מכשיר ביומטרי להתחברות מהירה ומאובטחת
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {credentials.map((credential) => (
                <div
                  key={credential.id}
                  className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center flex-1">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center ml-3">
                      <Fingerprint className="w-5 h-5 text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-900">{credential.deviceName}</h3>
                      <div className="flex items-center text-sm text-gray-500 mt-1">
                        <span>נוסף: {format(new Date(credential.createdAt), 'dd/MM/yyyy', { locale: he })}</span>
                        {credential.lastUsed && (
                          <>
                            <span className="mx-2">•</span>
                            <span>שימוש אחרון: {format(new Date(credential.lastUsed), 'dd/MM/yyyy HH:mm', { locale: he })}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDeleteCredential(credential.credentialID)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="מחק מכשיר"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Info Box */}
        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h3 className="font-medium text-blue-900 mb-2">💡 טיפים לאבטחה</h3>
          <ul className="text-sm text-blue-800 space-y-1 mr-5">
            <li className="list-disc">אימות ביומטרי מהיר ומאובטח יותר מ-TOTP</li>
            <li className="list-disc">אפשר לרשום מספר מכשירים (טלפון, מחשב נייד)</li>
            <li className="list-disc">אם מאבדים גישה למכשיר, השתמש ב-TOTP כ-fallback</li>
            <li className="list-disc">מומלץ לשמור גם את TOTP וגם WebAuthn פעילים</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
