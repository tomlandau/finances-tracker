/**
 * TOTP Setup Component - Phase 6: Client Integration
 * Handles initial 2FA setup with QR code scanning
 */

import { useState, useEffect, FormEvent } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

interface TotpSetupProps {
  tempToken: string;
  onSuccess: () => void;
  onCancel: () => void;
}

interface SetupResponse {
  success: boolean;
  secret: string;
  qrCodeUrl: string;
  manualCode: string;
  username: string;
  issuer: string;
}

interface VerifyResponse {
  success: boolean;
  message: string;
  secret: string;
  instructions: {
    title: string;
    steps: string[];
  };
  envVarName: string;
  username: string;
}

const API_BASE = '/api';

export function TotpSetup({ tempToken, onSuccess, onCancel }: TotpSetupProps) {
  const [setupData, setSetupData] = useState<SetupResponse | null>(null);
  const [totpCode, setTotpCode] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verifyResult, setVerifyResult] = useState<VerifyResponse | null>(null);

  // Fetch setup data (QR code) on mount
  useEffect(() => {
    fetchSetupData();
  }, []);

  const fetchSetupData = async () => {
    try {
      const response = await fetch(`${API_BASE}/auth/2fa/setup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ tempToken }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to generate QR code');
      }

      const data = await response.json();
      setSetupData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'שגיאה ביצירת QR code');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerify = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    if (!/^\d{6}$/.test(totpCode)) {
      setError('יש להזין קוד בן 6 ספרות');
      return;
    }

    setIsVerifying(true);

    try {
      const response = await fetch(`${API_BASE}/auth/2fa/verify-setup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          tempToken,
          totpCode,
          secret: setupData?.secret,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'קוד שגוי');
      }

      const data = await response.json();
      setVerifyResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'שגיאה באימות הקוד');
      setTotpCode('');
    } finally {
      setIsVerifying(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">יוצר QR code...</p>
        </div>
      </div>
    );
  }

  if (verifyResult) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="max-w-2xl w-full bg-white rounded-lg shadow-lg p-8">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-green-600 mb-2">הגדרת 2FA הושלמה בהצלחה!</h2>
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
            <h3 className="font-semibold text-yellow-800 mb-2">
              {verifyResult.instructions.title}
            </h3>
            <ol className="list-decimal list-inside space-y-2 text-sm text-yellow-700">
              {verifyResult.instructions.steps.map((step, index) => (
                <li key={index} className="leading-relaxed">{step}</li>
              ))}
            </ol>
          </div>

          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <p className="text-sm text-gray-600 mb-2">הוסף שורה זו לקובץ .env.local:</p>
            <code className="block bg-gray-800 text-green-400 p-3 rounded font-mono text-sm break-all">
              {verifyResult.envVarName}={verifyResult.secret}
            </code>
          </div>

          <div className="space-y-3">
            <Button onClick={onSuccess} fullWidth>
              המשך להתחברות
            </Button>
            <p className="text-sm text-gray-500 text-center">
              לאחר שמירת הקוד בקובץ .env.local והפעלה מחדש של השרת, תוכל להתחבר עם 2FA
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
        <h1 className="text-2xl font-bold text-center mb-2">
          הגדרת אימות דו-שלבי
        </h1>
        <p className="text-gray-600 text-center mb-6">
          סרוק את ה-QR code באפליקציית Authenticator
        </p>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}

        {setupData && (
          <>
            {/* QR Code */}
            <div className="flex justify-center mb-6">
              <img
                src={setupData.qrCodeUrl}
                alt="2FA QR Code"
                className="w-64 h-64 border-2 border-gray-200 rounded-lg"
              />
            </div>

            {/* Manual code for backup */}
            <div className="mb-6 p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600 mb-2 text-center">
                או הזן את הקוד ידנית:
              </p>
              <code className="block text-center font-mono text-sm bg-white p-2 rounded border border-gray-200 break-all">
                {setupData.manualCode}
              </code>
            </div>

            {/* Verification form */}
            <form onSubmit={handleVerify} className="space-y-4">
              <div>
                <p className="text-sm text-gray-600 mb-2 text-center">
                  לאחר הסריקה, הזן את הקוד בן 6 הספרות:
                </p>
                <Input
                  type="text"
                  label="קוד אימות"
                  value={totpCode}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, '').slice(0, 6);
                    setTotpCode(value);
                  }}
                  placeholder="000000"
                  autoFocus
                  maxLength={6}
                  inputMode="numeric"
                  pattern="\d{6}"
                  className="text-center text-2xl tracking-widest font-mono"
                />
              </div>

              <div className="flex gap-2">
                <Button
                  type="button"
                  onClick={onCancel}
                  variant="secondary"
                  fullWidth
                  disabled={isVerifying}
                >
                  ביטול
                </Button>
                <Button
                  type="submit"
                  fullWidth
                  disabled={isVerifying || totpCode.length !== 6}
                >
                  {isVerifying ? 'מאמת...' : 'אמת והמשך'}
                </Button>
              </div>
            </form>
          </>
        )}

        <div className="mt-6 text-xs text-gray-500 text-center space-y-1">
          <p>אפליקציות Authenticator מומלצות:</p>
          <p>Google Authenticator, Microsoft Authenticator, Authy</p>
        </div>
      </div>
    </div>
  );
}
