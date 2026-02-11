import { calculateVat } from '@/utils/vat';
import { formatters } from '@/utils/formatters';

interface VatPreviewProps {
  amount: string;
  vat: string;
  vatType: string;
}

export function VatPreview({ amount, vat, vatType }: VatPreviewProps) {
  // Parse inputs
  const amountNum = parseFloat(amount);
  const vatNum = parseFloat(vat);

  // Only show if amount is valid
  if (isNaN(amountNum) || amountNum <= 0) {
    return null;
  }

  // Calculate VAT
  const calculation = calculateVat(
    amountNum,
    vatNum,
    vatType as 'לפני/ללא מע"מ' | 'כולל מע"מ'
  );

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-2">
      <h3 className="text-sm font-semibold text-blue-900 mb-2 text-right">
        חישוב מע"מ:
      </h3>
      <div className="flex justify-between text-sm">
        <span className="font-mono">{formatters.currency(calculation.netAmount)}</span>
        <span className="font-semibold">סכום נטו:</span>
      </div>
      <div className="flex justify-between text-sm">
        <span className="font-mono">{formatters.currency(calculation.vatAmount)}</span>
        <span className="font-semibold">סכום מע"מ:</span>
      </div>
      <div className="flex justify-between border-t pt-2 text-sm">
        <span className="font-mono font-bold">{formatters.currency(calculation.grossAmount)}</span>
        <span className="font-bold">סכום ברוטו:</span>
      </div>
    </div>
  );
}
