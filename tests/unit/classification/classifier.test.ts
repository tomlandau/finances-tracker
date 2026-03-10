import { describe, it, expect } from 'vitest';
import { Classifier } from '../../../classification/classifier';

describe('Classifier.isPaymentApp', () => {
  it('B1.1 - "ביט" at start of description matches', () => {
    expect(Classifier.isPaymentApp('ביט העברה')).toBe(true);
  });

  it('B1.2 - "ביט" at end of description matches', () => {
    expect(Classifier.isPaymentApp('העברה ביט')).toBe(true);
  });

  it('B1.3 - "ביטוח לאומי" does NOT match "ביט"', () => {
    expect(Classifier.isPaymentApp('ביטוח לאומי')).toBe(false);
  });

  it('B1.4 - "ביטחוני" does NOT match "ביט"', () => {
    expect(Classifier.isPaymentApp('ביטחוני')).toBe(false);
  });

  it('B1.5 - "BIT" case insensitive matches', () => {
    expect(Classifier.isPaymentApp('BIT payment')).toBe(true);
  });

  it('B1.6 - "פייבוקס" matches', () => {
    expect(Classifier.isPaymentApp('פייבוקס העברה')).toBe(true);
  });

  it('B1.7 - "paybox" matches', () => {
    expect(Classifier.isPaymentApp('paybox transfer')).toBe(true);
  });

  it('B1.8 - "הפועלים" matches', () => {
    expect(Classifier.isPaymentApp('בנק הפועלים')).toBe(true);
  });

  it('B1.9 - unrelated description does NOT match', () => {
    expect(Classifier.isPaymentApp('רכישה בסופר')).toBe(false);
  });

  it('B1.10 - empty string does NOT match', () => {
    expect(Classifier.isPaymentApp('')).toBe(false);
  });

  it('B1.11 - "ביט" alone matches', () => {
    expect(Classifier.isPaymentApp('ביט')).toBe(true);
  });
});
