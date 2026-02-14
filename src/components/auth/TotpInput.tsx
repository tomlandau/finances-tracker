/**
 * TOTP Input Component - Phase 6: Client Integration
 * 6-digit input for Time-based One-Time Password codes
 */

import { useState, FormEvent } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

interface TotpInputProps {
  tempToken: string;
  onSuccess: () => void;
  onCancel: () => void;
  loginWithTotp: (tempToken: string, totpCode: string) => Promise<boolean>;
  onUseWebAuthnInstead?: () => void;
}

export function TotpInput({ tempToken, onSuccess, onCancel, loginWithTotp, onUseWebAuthnInstead }: TotpInputProps) {
  const [totpCode, setTotpCode] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    // Validate code format
    if (!/^\d{6}$/.test(totpCode)) {
      setError('יש להזין קוד בן 6 ספרות');
      return;
    }

    setIsSubmitting(true);

    try {
      await loginWithTotp(tempToken, totpCode);
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'קוד שגוי');
      setTotpCode('');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
        <h1 className="text-2xl font-bold text-center mb-2">
          אימות דו-שלבי
        </h1>
        <p className="text-gray-600 text-center mb-6">
          הזן את הקוד בן 6 הספרות מאפליקציית ה-Authenticator
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            type="text"
            label="קוד אימות"
            value={totpCode}
            onChange={(e) => {
              const value = e.target.value.replace(/\D/g, '').slice(0, 6);
              setTotpCode(value);
            }}
            placeholder="000000"
            error={error}
            autoFocus
            maxLength={6}
            inputMode="numeric"
            pattern="\d{6}"
            className="text-center text-2xl tracking-widest font-mono"
          />

          <div className="flex gap-2">
            <Button
              type="button"
              onClick={onCancel}
              variant="secondary"
              fullWidth
              disabled={isSubmitting}
            >
              ביטול
            </Button>
            <Button
              type="submit"
              fullWidth
              disabled={isSubmitting || totpCode.length !== 6}
            >
              {isSubmitting ? 'מאמת...' : 'אמת'}
            </Button>
          </div>
        </form>

        <div className="mt-6 text-sm text-gray-500 text-center">
          <p>הקוד מתחדש כל 30 שניות</p>
          <p className="mt-1">אם הקוד לא עובד, נסה להמתין לקוד הבא</p>
        </div>

        {onUseWebAuthnInstead && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <button
              onClick={onUseWebAuthnInstead}
              disabled={isSubmitting}
              className="w-full text-sm text-blue-600 hover:text-blue-700 py-2 disabled:opacity-50"
            >
              השתמש באימות ביומטרי במקום
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
