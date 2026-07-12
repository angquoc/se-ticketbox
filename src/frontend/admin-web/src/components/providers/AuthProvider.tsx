'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export interface AuthUser {
  id: string;
  email: string;
  fullName: string | null;
  role: string;
}

interface AuthContextType {
  user: AuthUser | null;
  isAdmin: boolean;
  isOrganizer: boolean;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isAdmin: false,
  isOrganizer: false,
  isLoading: true,
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    const userStr = localStorage.getItem('user');

    if (!token || !userStr) {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('user');
      router.push('/login');
      return;
    }

    try {
      const parsedUser = JSON.parse(userStr) as AuthUser;
      if (parsedUser.role !== 'ADMIN' && parsedUser.role !== 'ORGANIZER') {
        alert('Tài khoản của bạn không có quyền truy cập trang quản trị!');
        localStorage.removeItem('accessToken');
        localStorage.removeItem('user');
        router.push('/login');
        return;
      }
      setUser(parsedUser);
    } catch (e) {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('user');
      router.push('/login');
    } finally {
      setIsLoading(false);
    }
  }, [router]);

  const isAdmin = user?.role === 'ADMIN';
  const isOrganizer = user?.role === 'ORGANIZER';

  return (
    <AuthContext.Provider value={{ user, isAdmin, isOrganizer, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
