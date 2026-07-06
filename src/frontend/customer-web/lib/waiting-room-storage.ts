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

export interface AdmittedTokenRecord {
  token: string;
  tokenExpiresAt: number;
}

export function readAdmittedTokenRecord(concertId: string): AdmittedTokenRecord | null {
  if (typeof window === 'undefined') return null;
  const raw = sessionStorage.getItem(TOKEN_KEY(concertId));
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as AdmittedTokenRecord;
    if (Date.now() > parsed.tokenExpiresAt) {
      sessionStorage.removeItem(TOKEN_KEY(concertId));
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function readAdmittedToken(concertId: string): string | null {
  return readAdmittedTokenRecord(concertId)?.token ?? null;
}

export function getAdmittedTokenRemainingMs(concertId: string): number | null {
  const record = readAdmittedTokenRecord(concertId);
  if (!record) return null;
  return Math.max(0, record.tokenExpiresAt - Date.now());
}

export function clearWaitingRoomData(concertId: string): void {
  sessionStorage.removeItem(SESSION_KEY(concertId));
  sessionStorage.removeItem(TOKEN_KEY(concertId));
}
