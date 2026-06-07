import type { WaitingRoomPollResponse } from '@/types/waiting-room';

const TOKEN_TTL_MS = 5 * 60 * 1000;
const MIN_WAIT_MS = 12_000;
const MAX_WAIT_MS = 38_000;

interface WaitingSessionRecord {
  sessionId: string;
  concertId: string;
  createdAt: number;
  admitAt: number;
  admitted: boolean;
  token?: string;
  tokenExpiresAt?: number;
}

const sessions = new Map<string, WaitingSessionRecord>();

function randomWaitMs(): number {
  return MIN_WAIT_MS + Math.floor(Math.random() * (MAX_WAIT_MS - MIN_WAIT_MS));
}

function generateToken(): string {
  return `wr_${crypto.randomUUID().replace(/-/g, '')}`;
}

export function joinWaitingRoom(
  concertId: string,
  existingSessionId?: string,
): { sessionId: string; response: WaitingRoomPollResponse } {
  if (existingSessionId) {
    const existing = sessions.get(existingSessionId);
    if (existing && existing.concertId === concertId) {
      return {
        sessionId: existing.sessionId,
        response: toPollResponse(existing),
      };
    }
  }

  const sessionId = crypto.randomUUID();
  const now = Date.now();
  const record: WaitingSessionRecord = {
    sessionId,
    concertId,
    createdAt: now,
    admitAt: now + randomWaitMs(),
    admitted: false,
  };

  sessions.set(sessionId, record);

  return {
    sessionId,
    response: toPollResponse(record),
  };
}

export function pollWaitingRoom(sessionId: string): WaitingRoomPollResponse | null {
  const record = sessions.get(sessionId);
  if (!record) return null;

  if (!record.admitted && Date.now() >= record.admitAt) {
    record.admitted = true;
    record.token = generateToken();
    record.tokenExpiresAt = Date.now() + TOKEN_TTL_MS;
  }

  return toPollResponse(record);
}

function toPollResponse(record: WaitingSessionRecord): WaitingRoomPollResponse {
  if (record.admitted && record.token) {
    return {
      status: 'admitted',
      token: record.token,
      tokenExpiresAt: record.tokenExpiresAt,
    };
  }

  return { status: 'waiting' };
}
