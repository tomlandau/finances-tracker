/**
 * Two-Factor Choice Component - Phase 5: Biometric Authentication
 * Allows user to choose between TOTP and WebAuthn during setup
 */

import { useState, useEffect } from 'react';
import { isPlatformAuthenticatorAvailable } from '@/services/webauthn';
import { Fingerprint, Smartphone, ArrowLeft } from 'lucide-react';

interface TwoFactorChoiceProps {
  username: string;
  onChooseTotp: () => void;
  onChooseWebAuthn: () => void;
  onBack: () => void;
}

export function TwoFactorChoice({
  username,
  onChooseTotp,
  onChooseWebAuthn,
  onBack,
}: TwoFactorChoiceProps) {
  const [webAuthnSupported, setWebAuthnSupported] = useState<boolean | null>(null);

  useEffect(() => {
    checkWebAuthnSupport();
  }, []);

  async function checkWebAuthnSupport() {
    const supported = await isPlatformAuthenticatorAvailable();
    setWebAuthnSupported(supported);
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          בחר שיטת אימות
        </h2>
        <p className="text-gray-600">
          שלום {username}! בחר איך תרצה לאמת את זהותך בכל התחברות
        </p>
      </div>

      <div className="space-y-4">
        {/* WebAuthn Option */}
        <button
          onClick={onChooseWebAuthn}
          disabled={!webAuthnSupported}
          className={`w-full p-6 rounded-lg border-2 text-right transition-all ${
            webAuthnSupported
              ? 'border-blue-200 hover:border-blue-400 hover:bg-blue-50'
              : 'border-gray-200 bg-gray-50 cursor-not-allowed opacity-60'
          }`}
        >
          <div className="flex items-start">
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center ml-4">
              <Fingerprint className="w-6 h-6 text-blue-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-gray-900 mb-1">
                אימות ביומטרי
                {webAuthnSupported && (
                  <span className="mr-2 text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">
                    מומלץ
                  </span>
                )}
              </h3>
              <p className="text-sm text-gray-600 mb-2">
                טביעת אצבע, זיהוי פנים, או Windows Hello
              </p>
              <ul className="text-xs text-gray-500 space-y-1">
                <li>✓ מהיר וקל לשימוש</li>
                <li>✓ אבטחה מקסימלית</li>
                <li>✓ לא צריך אפליקציה נוספת</li>
              </ul>
              {!webAuthnSupported && webAuthnSupported !== null && (
                <p className="text-xs text-red-600 mt-2">
                  לא נתמך במכשיר זה
                </p>
              )}
            </div>
          </div>
        </button>

        {/* TOTP Option */}
        <button
          onClick={onChooseTotp}
          className="w-full p-6 rounded-lg border-2 border-gray-200 hover:border-gray-400 hover:bg-gray-50 text-right transition-all"
        >
          <div className="flex items-start">
            <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center ml-4">
              <Smartphone className="w-6 h-6 text-gray-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-gray-900 mb-1">
                אפליקציית Authenticator
              </h3>
              <p className="text-sm text-gray-600 mb-2">
                קוד בן 6 ספרות מאפליקציה (Google Authenticator, Authy וכו')
              </p>
              <ul className="text-xs text-gray-500 space-y-1">
                <li>✓ עובד על כל מכשיר</li>
                <li>✓ עובד גם offline</li>
                <li>✓ תקן תעשייתי</li>
              </ul>
            </div>
          </div>
        </button>
      </div>

      <div className="mt-6 pt-6 border-t border-gray-200">
        <button
          onClick={onBack}
          className="flex items-center text-gray-600 hover:text-gray-800 text-sm mx-auto"
        >
          <ArrowLeft className="w-4 h-4 ml-1" />
          חזור להתחברות
        </button>
      </div>

      <div className="mt-4 p-4 bg-gray-50 rounded-lg">
        <p className="text-xs text-gray-600 text-center">
          💡 <strong>טיפ:</strong> תוכל לשנות את שיטת האימות בכל עת בהגדרות
        </p>
      </div>
    </div>
  );
}
