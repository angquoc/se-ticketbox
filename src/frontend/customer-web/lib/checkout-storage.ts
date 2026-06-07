import type { SelectedSeat } from '@/types/seatmap';

const SELECTION_PREFIX = 'seat-selection:';
const PENDING_ORDER_PREFIX = 'pending-order:';

export function saveSeatSelection(concertId: string, seats: SelectedSeat[]): void {
  sessionStorage.setItem(`${SELECTION_PREFIX}${concertId}`, JSON.stringify(seats));
}

export function readSeatSelection(concertId: string): SelectedSeat[] | null {
  const raw = sessionStorage.getItem(`${SELECTION_PREFIX}${concertId}`);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as SelectedSeat[];
  } catch {
    return null;
  }
}

export function clearSeatSelection(concertId: string): void {
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
