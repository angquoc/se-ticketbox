'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { authApi } from '@/lib/api-client';
import { isClientApiError } from '@/lib/api-error';
import { onAuthUnauthorized } from '@/lib/auth-session-events';
import {
  clearAuthSession,
  getAccessToken,
  getStoredUser,
  saveAuthSession,
} from '@/lib/auth-storage';
import type {
  AuthUser,
  ChangePasswordPayload,
  LoginPayload,
  RegisterPayload,
  UpdateProfilePayload,
} from '@/types/auth';

interface AuthContextValue {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (payload: LoginPayload) => Promise<void>;
  register: (payload: RegisterPayload) => Promise<void>;
  logout: () => void;
  updateProfile: (payload: UpdateProfilePayload) => Promise<void>;
  changePassword: (payload: ChangePasswordPayload) => Promise<string>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const logout = useCallback(() => {
    clearAuthSession();
    setUser(null);
  }, []);

  useEffect(() => {
    onAuthUnauthorized(logout);
    return () => onAuthUnauthorized(null);
  }, [logout]);

  useEffect(() => {
    let cancelled = false;

    async function bootstrapSession() {
      const token = getAccessToken();
      if (!token) {
        if (!cancelled) setIsLoading(false);
        return;
      }

      try {
        const currentUser = await authApi.getMe();
        if (cancelled) return;
        saveAuthSession(token, currentUser);
        setUser(currentUser);
      } catch (error) {
        if (cancelled) return;

        if (isClientApiError(error) && error.status === 401) {
          clearAuthSession();
          setUser(null);
        } else {
          const storedUser = getStoredUser();
          if (storedUser) setUser(storedUser);
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    void bootstrapSession();

    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(async (payload: LoginPayload) => {
    const response = await authApi.login(payload);
    saveAuthSession(response.accessToken, response.user);
    setUser(response.user);
  }, []);

  const register = useCallback(async (payload: RegisterPayload) => {
    const response = await authApi.register(payload);
    saveAuthSession(response.accessToken, response.user);
    setUser(response.user);
  }, []);

  const refreshUser = useCallback(async () => {
    const token = getAccessToken();
    if (!token) {
      setUser(null);
      return;
    }

    const currentUser = await authApi.getMe();
    saveAuthSession(token, currentUser);
    setUser(currentUser);
  }, []);

  const updateProfile = useCallback(async (payload: UpdateProfilePayload) => {
    const token = getAccessToken();
    if (!token) {
      throw new Error('Chưa đăng nhập');
    }

    const updatedUser = await authApi.updateProfile(payload);
    saveAuthSession(token, updatedUser);
    setUser(updatedUser);
  }, []);

  const changePassword = useCallback(async (payload: ChangePasswordPayload) => {
    const response = await authApi.changePassword(payload);
    return response.message;
  }, []);

  const value = useMemo(
    () => ({
      user,
      isAuthenticated: Boolean(user),
      isLoading,
      login,
      register,
      logout,
      updateProfile,
      changePassword,
      refreshUser,
    }),
    [user, isLoading, login, register, logout, updateProfile, changePassword, refreshUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
