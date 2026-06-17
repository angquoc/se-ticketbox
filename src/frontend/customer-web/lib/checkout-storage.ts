import type { ZoneSelection } from '@/types/seatmap';

const SELECTION_PREFIX = 'zone-selection:';
const PENDING_ORDER_PREFIX = 'pending-order:';

export function saveZoneSelection(concertId: string, selection: ZoneSelection): void {
  sessionStorage.setItem(`${SELECTION_PREFIX}${concertId}`, JSON.stringify(selection));
}

export function readZoneSelection(concertId: string): ZoneSelection | null {
  const raw = sessionStorage.getItem(`${SELECTION_PREFIX}${concertId}`);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as ZoneSelection;
  } catch {
    return null;
  }
}

export function clearZoneSelection(concertId: string): void {
  sessionStorage.removeItem(`${SELECTION_PREFIX}${concertId}`);
}

export function savePendingOrder(concertId: string, orderId: string): void {
  sessionStorage.setItem(`${PENDING_ORDER_PREFIX}${concertId}`, orderId);
}

export function readPendingOrder(concertId: string): string | null {
  return sessionStorage.getItem(`${PENDING_ORDER_PREFIX}${concertId}`);
}

export function clearPendingOrder(concertId: string): void {
  sessionStorage.removeItem(`${PENDING_ORDER_PREFIX}${concertId}`);
}
