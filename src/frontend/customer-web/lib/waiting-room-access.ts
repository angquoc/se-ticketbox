import {
  clearWaitingSession,
  readAdmittedToken,
  readWaitingSession,
  storeAdmittedToken,
} from '@/lib/waiting-room-storage';
import type { WaitingRoomPollResponse } from '@/types/waiting-room';

export type PurchaseAccessResult =
  | { granted: true; token?: string }
  | { granted: false; waitingRoomRequired: true };

async function pollExistingSession(
  concertId: string,
  sessionId: string,
): Promise<PurchaseAccessResult | null> {
  const res = await fetch(
    `/api/concerts/${concertId}/waiting-room?sessionId=${encodeURIComponent(sessionId)}`,
  );

  if (!res.ok) {
    return null;
  }

  const json = await res.json();
  const data = json.data as WaitingRoomPollResponse;

  if (data.status === 'admitted' && data.token) {
    storeAdmittedToken(concertId, data.token, data.tokenExpiresAt);
    return { granted: true, token: data.token };
  }

  if (data.status === 'waiting' && data.waitingRoomRequired !== false) {
    return { granted: false, waitingRoomRequired: true };
  }

  return null;
}

/**
 * Kiểm tra quyền mua vé mà không tự động join hàng đợi.
 * Join chỉ xảy ra trên trang /waiting (useWaitingRoom).
 */
export async function requestPurchaseAccess(
  concertId: string,
  options: { requireToken: boolean },
): Promise<PurchaseAccessResult> {
  const existingToken = readAdmittedToken(concertId);
  if (existingToken) {
    return { granted: true, token: existingToken };
  }

  if (!options.requireToken) {
    return { granted: true };
  }

  const existing = readWaitingSession(concertId);
  if (existing?.sessionId) {
    const polled = await pollExistingSession(concertId, existing.sessionId);
    if (polled) {
      return polled;
    }
    clearWaitingSession(concertId);
  }

  return { granted: false, waitingRoomRequired: true };
}
