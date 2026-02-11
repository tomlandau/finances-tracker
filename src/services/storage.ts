import { AUTH_KEY } from '@/utils/constants';

export const storage = {
  setAuth: (authenticated: boolean): void => {
    localStorage.setItem(AUTH_KEY, JSON.stringify(authenticated));
  },

  getAuth: (): boolean => {
    try {
      const value = localStorage.getItem(AUTH_KEY);
      return value ? JSON.parse(value) : false;
    } catch {
      return false;
    }
  },

  clearAuth: (): void => {
    localStorage.removeItem(AUTH_KEY);
  },
};
