import { format, parseISO } from 'date-fns';

export const formatters = {
  currency: (amount: number): string => {
    return new Intl.NumberFormat('he-IL', {
      style: 'currency',
      currency: 'ILS',
    }).format(amount);
  },

  date: (isoDate: string): string => {
    try {
      return format(parseISO(isoDate), 'dd/MM/yyyy');
    } catch {
      return isoDate;
    }
  },

  number: (value: number): string => {
    return new Intl.NumberFormat('he-IL', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  },
};
