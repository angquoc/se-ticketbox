import type { WaitingRoomPollResponse } from '@/types/waiting-room';

const TOKEN_TTL_MS = 5 * 60 * 1000;
const MIN_WAIT_MS = 12_000;
const MAX_WAIT_MS = 38_000;

/** Cửa sổ đo tải theo design (80k requests / 5 phút) */
const LOAD_WINDOW_MS = 5 * 60 * 1000;

const DEFAULT_JOIN_THRESHOLD = 12;

interface WaitingSessionRecord {
  sessionId: string;
  concertId: string;
  createdAt: number;
  admitAt: number;
  admitted: boolean;
  waitingRoomRequired: boolean;
  token?: string;
  tokenExpiresAt?: number;
}

const sessions = new Map<string, WaitingSessionRecord>();
const joinTimestamps = new Map<string, number[]>();

function getJoinThreshold(): number {
  const raw = process.env.WAITING_ROOM_JOIN_THRESHOLD;
  const parsed = raw ? Number.parseInt(raw, 10) : DEFAULT_JOIN_THRESHOLD;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_JOIN_THRESHOLD;
}

function isForceWaitingRoom(): boolean {
  return process.env.FORCE_WAITING_ROOM === 'true';
}

function pruneJoinTimestamps(concertId: string, now: number): number[] {
  const entries = (joinTimestamps.get(concertId) ?? []).filter(
    (timestamp) => now - timestamp < LOAD_WINDOW_MS,
  );
  joinTimestamps.set(concertId, entries);
  return entries;
}

function countActiveWaitingSessions(concertId: string): number {
  let count = 0;
  for (const record of sessions.values()) {
    if (record.concertId === concertId && !record.admitted && record.waitingRoomRequired) {
      count += 1;
    }
  }
  return count;
}

/** Đo tải hiện tại trước khi user mới vào — chỉ bật waiting room khi vượt ngưỡng. */
export function isWaitingRoomRequired(concertId: string): boolean {
  if (isForceWaitingRoom()) return true;

  const now = Date.now();
  const recentJoins = pruneJoinTimestamps(concertId, now).length;
  const activeWaiting = countActiveWaitingSessions(concertId);
  const threshold = getJoinThreshold();

  return recentJoins + activeWaiting >= threshold;
}

function recordJoin(concertId: string): void {
  const now = Date.now();
  const entries = pruneJoinTimestamps(concertId, now);
  entries.push(now);
  joinTimestamps.set(concertId, entries);
}

function randomWaitMs(): number {
  return MIN_WAIT_MS + Math.floor(Math.random() * (MAX_WAIT_MS - MIN_WAIT_MS));
}

function generateToken(): string {
  return `wr_${crypto.randomUUID().replace(/-/g, '')}`;
}

function admitImmediately(
  concertId: string,
  waitingRoomRequired: boolean,
): { sessionId: string; response: WaitingRoomPollResponse } {
  const now = Date.now();
  const sessionId = crypto.randomUUID();
  const record: WaitingSessionRecord = {
    sessionId,
    concertId,
    createdAt: now,
    admitAt: now,
    admitted: true,
    waitingRoomRequired,
    token: generateToken(),
    tokenExpiresAt: now + TOKEN_TTL_MS,
  };

  sessions.set(sessionId, record);

  return {
    sessionId,
    response: toPollResponse(record),
  };
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

  const waitingRoomRequired = isWaitingRoomRequired(concertId);
  recordJoin(concertId);

  if (!waitingRoomRequired) {
    return admitImmediately(concertId, false);
  }

  const sessionId = crypto.randomUUID();
  const now = Date.now();
  const record: WaitingSessionRecord = {
    sessionId,
    concertId,
    createdAt: now,
    admitAt: now + randomWaitMs(),
    admitted: false,
    waitingRoomRequired: true,
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

  if (!record.admitted && record.waitingRoomRequired && Date.now() >= record.admitAt) {
    record.admitted = true;
    record.token = generateToken();
    record.tokenExpiresAt = Date.now() + TOKEN_TTL_MS;
  }

  return toPollResponse(record);
}

function getQueuePosition(record: WaitingSessionRecord): number {
  let position = 1;
  for (const other of sessions.values()) {
    if (other.concertId !== record.concertId) continue;
    if (!other.waitingRoomRequired || other.admitted) continue;
    if (other.admitAt < record.admitAt) {
      position += 1;
      continue;
    }
    if (other.admitAt === record.admitAt && other.createdAt < record.createdAt) {
      position += 1;
    }
  }
  return position;
}

function toPollResponse(record: WaitingSessionRecord): WaitingRoomPollResponse {
  if (record.admitted && record.token) {
    return {
      status: 'admitted',
      waitingRoomRequired: record.waitingRoomRequired,
      token: record.token,
      tokenExpiresAt: record.tokenExpiresAt,
    };
  }

  const now = Date.now();
  const estimatedWaitSeconds = Math.max(0, Math.ceil((record.admitAt - now) / 1000));

  return {
    status: 'waiting',
    waitingRoomRequired: record.waitingRoomRequired,
    position: record.waitingRoomRequired ? getQueuePosition(record) : undefined,
    estimatedWaitSeconds: record.waitingRoomRequired ? estimatedWaitSeconds : undefined,
  };
}
