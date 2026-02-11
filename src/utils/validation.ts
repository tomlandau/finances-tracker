export const validation = {
  isValidAmount: (amount: string): boolean => {
    const num = parseFloat(amount);
    return !isNaN(num) && num > 0;
  },

  isValidDate: (date: string): boolean => {
    const parsed = new Date(date);
    return !isNaN(parsed.getTime());
  },

  isValidCategory: (categoryId: string): boolean => {
    return categoryId.trim().length > 0;
  },

  isValidVat: (vat: string): boolean => {
    return vat === '0' || vat === '0.18';
  },

  isValidVatType: (vatType: string): boolean => {
    return vatType === 'לפני/ללא מע"מ' || vatType === 'כולל מע"מ';
  },
};
