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

// ── Profile Management ────────────────────────────────────────────────────

export interface ProfileUpdateDto {
  fullName?: string;
  phone?: string;
}

/**
 * Lấy profile user hiện tại từ localStorage (đã lưu khi login).
 */
export function getStoredUser(): AuthResponse['user'] | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem('user');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/**
 * Cập nhật profile user.
 * Gọi PATCH /auth/profile nếu backend có, đồng thời update localStorage.
 */
export async function updateProfile(dto: ProfileUpdateDto): Promise<void> {
  try {
    await apiClient.patch('/auth/profile', dto);
  } catch {
    // Backend chưa có endpoint này — chỉ update localStorage
  }
  // Luôn update localStorage để UI phản ánh ngay
  if (typeof window !== 'undefined') {
    const raw = localStorage.getItem('user');
    if (raw) {
      const stored = JSON.parse(raw);
      const updated = { ...stored, ...dto };
      localStorage.setItem('user', JSON.stringify(updated));
    }
  }
}

/**
 * Đổi mật khẩu.
 * Gọi POST /auth/change-password.
 */
export async function changePassword(
  currentPassword: string,
  newPassword: string,
): Promise<void> {
  await apiClient.post('/auth/change-password', { currentPassword, newPassword });
}
