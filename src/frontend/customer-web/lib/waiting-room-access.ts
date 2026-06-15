import {
  readAdmittedToken,
  readWaitingSession,
  storeAdmittedToken,
  writeWaitingSession,
} from '@/lib/waiting-room-storage';
import type { WaitingRoomJoinResponse } from '@/types/waiting-room';

export type PurchaseAccessResult =
  | { granted: true; token: string }
  | { granted: false; waitingRoomRequired: true };

export async function requestPurchaseAccess(
  concertId: string,
): Promise<PurchaseAccessResult> {
  const existingToken = readAdmittedToken(concertId);
  if (existingToken) {
    return { granted: true, token: existingToken };
  }

  const existing = readWaitingSession(concertId);

  const res = await fetch(`/api/concerts/${concertId}/waiting-room`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionId: existing?.sessionId }),
  });

  if (!res.ok) {
    throw new Error('Không thể xác minh quyền truy cập');
  }

  const json = await res.json();
  const data = json.data as WaitingRoomJoinResponse;

  writeWaitingSession(concertId, {
    sessionId: data.sessionId,
    concertId,
  });

  if (data.status === 'admitted' && data.token) {
    storeAdmittedToken(concertId, data.token, data.tokenExpiresAt);
    return { granted: true, token: data.token };
  }

  return { granted: false, waitingRoomRequired: true };
}
