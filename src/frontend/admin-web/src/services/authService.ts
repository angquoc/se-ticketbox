/**
 * authService.ts
 * Service layer cho Authentication — Đăng nhập & Đăng ký.
 * Sử dụng apiClient để thực hiện các cuộc gọi API và quản lý token.
 */

import { apiClient } from '@/lib/apiClient';

export interface AuthResponse {
  accessToken: string;
  user: {
    id: string;
    email: string;
    fullName: string | null;
    role: string;
  };
}

/**
 * Đăng nhập tài khoản.
 * Lưu accessToken và user info vào localStorage nếu thành công.
 */
export async function login(email: string, password: string): Promise<AuthResponse> {
  const res = await apiClient.post<AuthResponse>('/auth/login', {
    email,
    password,
  });
  
  if (res.data && res.data.accessToken) {
    localStorage.setItem('accessToken', res.data.accessToken);
    localStorage.setItem('user', JSON.stringify(res.data.user));
  }
  
  return res.data;
}

/**
 * Đăng ký tài khoản mới.
 * Lưu accessToken và user info vào localStorage nếu thành công.
 */
export async function register(
  email: string,
  password: string,
  fullName?: string,
): Promise<AuthResponse> {
  const res = await apiClient.post<AuthResponse>('/auth/register', {
    email,
    password,
    fullName,
  });

  if (res.data && res.data.accessToken) {
    localStorage.setItem('accessToken', res.data.accessToken);
    localStorage.setItem('user', JSON.stringify(res.data.user));
  }

  return res.data;
}

/**
 * Đăng xuất khỏi hệ thống.
 * Xóa toàn bộ token/user info và chuyển hướng về trang login.
 */
export function logout(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('user');
    window.location.href = '/login';
  }
}
