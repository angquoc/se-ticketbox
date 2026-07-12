import type { AuthLoginRequest, AuthLoginResponse, StoredUser } from '@/types/api';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';
const TOKEN_KEY = 'checkin_access_token';
const USER_KEY = 'checkin_user';
const GATE_KEY = 'checkin_gate';

// ─────────────────────────────────────────────────────────────────────────────
// Login
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Authenticates a staff member.
 * Maps the staffId field to the `email` field expected by the backend.
 * Throws if the HTTP response is not ok.
 */
export async function loginStaff(
  staffId: string,
  password: string,
  gate: string
): Promise<AuthLoginResponse> {
  const body: AuthLoginRequest = { email: staffId, password };

  const res = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    let message = 'Đăng nhập thất bại.';
    try {
      const err = (await res.json()) as { message?: string };
      if (err.message) message = err.message;
    } catch {
      // ignore JSON parse errors
    }
    throw new Error(message);
  }

  const data = (await res.json()) as AuthLoginResponse;

  // Persist token + user info
  localStorage.setItem(TOKEN_KEY, data.accessToken);
  localStorage.setItem(USER_KEY, JSON.stringify(data.user));
  localStorage.setItem(GATE_KEY, gate);

  return data;
}

// ─────────────────────────────────────────────────────────────────────────────
// Session helpers
// ─────────────────────────────────────────────────────────────────────────────

export function getAccessToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function getStoredUser(): StoredUser | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? (JSON.parse(raw) as StoredUser) : null;
  } catch {
    return null;
  }
}

export function getStoredGate(): string {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem(GATE_KEY) ?? '';
}

export function clearSession(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  localStorage.removeItem(GATE_KEY);
}

export function isAuthenticated(): boolean {
  return !!getAccessToken();
}
