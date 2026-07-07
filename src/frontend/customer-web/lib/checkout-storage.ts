import type { ZoneSelection } from '@/types/seatmap';

const SELECTION_PREFIX = 'zone-selection:';
const PENDING_ORDER_PREFIX = 'pending-order:';

function getSessionStorage(): Storage | null {
  if (typeof window === 'undefined') return null;
  return sessionStorage;
}

export function saveZoneSelection(concertId: string, selection: ZoneSelection): void {
  getSessionStorage()?.setItem(`${SELECTION_PREFIX}${concertId}`, JSON.stringify(selection));
}

export function readZoneSelection(concertId: string): ZoneSelection | null {
  const raw = getSessionStorage()?.getItem(`${SELECTION_PREFIX}${concertId}`);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as ZoneSelection;
  } catch {
    return null;
  }
}

export function clearZoneSelection(concertId: string): void {
  getSessionStorage()?.removeItem(`${SELECTION_PREFIX}${concertId}`);
}

export function savePendingOrder(concertId: string, orderId: string): void {
  getSessionStorage()?.setItem(`${PENDING_ORDER_PREFIX}${concertId}`, orderId);
}

export function readPendingOrder(concertId: string): string | null {
  return getSessionStorage()?.getItem(`${PENDING_ORDER_PREFIX}${concertId}`) ?? null;
}

export function clearPendingOrder(concertId: string): void {
  getSessionStorage()?.removeItem(`${PENDING_ORDER_PREFIX}${concertId}`);
}
