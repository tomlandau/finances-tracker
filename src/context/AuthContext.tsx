import { createContext, useState, useEffect, ReactNode } from 'react';
import type { AuthState } from '@/types';
import { storage } from '@/services/storage';

// Simple password for MVP - NOT SECURE, for personal use only
const AUTH_PASSWORD = 'admin123';

export const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() =>
    storage.getAuth()
  );

  useEffect(() => {
    storage.setAuth(isAuthenticated);
  }, [isAuthenticated]);

  const login = async (password: string): Promise<boolean> => {
    // MVP: Simple client-side check
    // Production: Validate via API endpoint
    if (password === AUTH_PASSWORD) {
      setIsAuthenticated(true);
      return true;
    }
    return false;
  };

  const logout = () => {
    setIsAuthenticated(false);
    storage.clearAuth();
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
