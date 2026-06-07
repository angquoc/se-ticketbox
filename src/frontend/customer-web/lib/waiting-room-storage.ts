import type { WaitingRoomSession } from '@/types/waiting-room';

const SESSION_KEY = (concertId: string) => `waiting-room-session:${concertId}`;
const TOKEN_KEY = (concertId: string) => `waiting-room-token:${concertId}`;

export function readWaitingSession(concertId: string): WaitingRoomSession | null {
  if (typeof window === 'undefined') return null;
  const raw = sessionStorage.getItem(SESSION_KEY(concertId));
  if (!raw) return null;
  try {
    return JSON.parse(raw) as WaitingRoomSession;
  } catch {
    return null;
  }
}

export function writeWaitingSession(concertId: string, session: WaitingRoomSession): void {
  sessionStorage.setItem(SESSION_KEY(concertId), JSON.stringify(session));
}

export function storeAdmittedToken(
  concertId: string,
  token: string,
  tokenExpiresAt?: number,
): void {
  sessionStorage.setItem(
    TOKEN_KEY(concertId),
    JSON.stringify({ token, tokenExpiresAt: tokenExpiresAt ?? Date.now() + 5 * 60 * 1000 }),
  );
}

export function readAdmittedToken(concertId: string): string | null {
  if (typeof window === 'undefined') return null;
  const raw = sessionStorage.getItem(TOKEN_KEY(concertId));
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as { token: string; tokenExpiresAt: number };
    if (Date.now() > parsed.tokenExpiresAt) {
      sessionStorage.removeItem(TOKEN_KEY(concertId));
      return null;
    }
    return parsed.token;
  } catch {
    return null;
  }
}

export function clearWaitingRoomData(concertId: string): void {
  sessionStorage.removeItem(SESSION_KEY(concertId));
  sessionStorage.removeItem(TOKEN_KEY(concertId));
}
