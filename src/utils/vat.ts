import type { VatCalculation } from '@/types';

/**
 * Calculate VAT amounts based on input amount, VAT rate, and VAT type
 * @param amount - The input amount entered by the user
 * @param vatRate - The VAT rate (0 or 0.18)
 * @param vatType - Whether the amount includes VAT or not
 * @returns VatCalculation with net, vat, and gross amounts
 */
export function calculateVat(
  amount: number,
  vatRate: number,
  vatType: 'לפני/ללא מע"מ' | 'כולל מע"מ'
): VatCalculation {
  // If VAT rate is 0, all amounts are the same
  if (vatRate === 0) {
    return {
      netAmount: amount,
      vatAmount: 0,
      grossAmount: amount,
    };
  }

  // If amount includes VAT (כולל מע"מ means "includes VAT")
  if (vatType === 'כולל מע"מ') {
    const grossAmount = amount;
    const netAmount = grossAmount / (1 + vatRate);
    const vatAmount = grossAmount - netAmount;

    return {
      netAmount: Number(netAmount.toFixed(2)),
      vatAmount: Number(vatAmount.toFixed(2)),
      grossAmount: Number(grossAmount.toFixed(2)),
    };
  }

  // If amount does not include VAT (לפני/ללא מע"מ)
  const netAmount = amount;
  const vatAmount = netAmount * vatRate;
  const grossAmount = netAmount + vatAmount;

  return {
    netAmount: Number(netAmount.toFixed(2)),
    vatAmount: Number(vatAmount.toFixed(2)),
    grossAmount: Number(grossAmount.toFixed(2)),
  };
}
