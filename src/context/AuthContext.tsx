import { createContext, useState, useEffect, ReactNode } from 'react';
import type { AuthState, LoginResult } from '@/types/auth.types';
import type { User } from '@/types/user.types';
import { API_BASE } from '@/config/api';
import { authenticateWithWebAuthn } from '@/services/webauthn';

export const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [twoFactorRequired, setTwoFactorRequired] = useState<boolean>(false);
  const [tempToken, setTempToken] = useState<string | null>(null);
  const [requireSetup, setRequireSetup] = useState<boolean>(false);
  const [hasTotp, setHasTotp] = useState<boolean>(false);
  const [hasWebAuthn, setHasWebAuthn] = useState<boolean>(false);

  const isAuthenticated = user !== null;

  // Verify current session on mount
  useEffect(() => {
    verify();
  }, []);

  const verify = async () => {
    try {
      const response = await fetch(`${API_BASE}/auth/verify`, {
        method: 'GET',
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
      } else {
        setUser(null);
      }
    } catch (error) {
      console.error('Session verification failed:', error);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const login = async (username: string, password: string): Promise<LoginResult> => {
    try {
      const response = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ username, password }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Login failed');
      }

      const data = await response.json();

      // Check if 2FA is required
      if (data.requireTotp) {
        setTwoFactorRequired(true);
        setTempToken(data.tempToken);
        setHasTotp(data.hasTotp || false);
        setHasWebAuthn(data.hasWebAuthn || false);
        return {
          success: false,
          requireTotp: true,
          requireSetup: false,
          tempToken: data.tempToken,
          hasTotp: data.hasTotp,
          hasWebAuthn: data.hasWebAuthn,
        };
      }

      // Check if setup is required
      if (data.requireSetup) {
        setRequireSetup(true);
        setTempToken(data.tempToken);
        return {
          success: false,
          requireTotp: false,
          requireSetup: true,
          tempToken: data.tempToken,
        };
      }

      // Direct login (no 2FA)
      setUser(data.user);
      setTwoFactorRequired(false);
      setTempToken(null);
      setRequireSetup(false);

      return {
        success: true,
        requireTotp: false,
        requireSetup: false,
        user: data.user,
      };
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  };

  const loginWithTotp = async (token: string, totpCode: string): Promise<boolean> => {
    try {
      const response = await fetch(`${API_BASE}/auth/login-totp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ tempToken: token, totpCode }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'TOTP verification failed');
      }

      const data = await response.json();
      setUser(data.user);
      setTwoFactorRequired(false);
      setTempToken(null);
      setRequireSetup(false);

      return true;
    } catch (error) {
      console.error('TOTP login error:', error);
      throw error;
    }
  };

  const loginWithWebAuthn = async (token: string): Promise<boolean> => {
    try {
      const userData = await authenticateWithWebAuthn(token);
      setUser(userData);
      setTwoFactorRequired(false);
      setTempToken(null);
      setRequireSetup(false);
      setHasTotp(false);
      setHasWebAuthn(false);

      return true;
    } catch (error) {
      console.error('WebAuthn login error:', error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await fetch(`${API_BASE}/auth/logout`, {
        method: 'POST',
        credentials: 'include',
      });
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setUser(null);
      setTwoFactorRequired(false);
      setTempToken(null);
      setRequireSetup(false);
    }
  };

  const refresh = async () => {
    try {
      const response = await fetch(`${API_BASE}/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
      });

      if (response.ok) {
        // Access token refreshed in httpOnly cookie
        await verify();
      } else {
        // Refresh failed, user needs to log in again
        setUser(null);
      }
    } catch (error) {
      console.error('Token refresh failed:', error);
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
        loading,
        twoFactorRequired,
        tempToken,
        requireSetup,
        hasTotp,
        hasWebAuthn,
        login,
        loginWithTotp,
        loginWithWebAuthn,
        logout,
        refresh,
        verify,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
