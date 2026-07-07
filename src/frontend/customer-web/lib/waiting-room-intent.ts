const INTENT_KEY = (concertId: string) => `waiting-room-purchase-intent:${concertId}`;

/** Đánh dấu user chủ động bắt đầu luồng mua vé (design: chỉ lúc này mới vào phòng chờ). */
export function setPurchaseIntent(concertId: string): void {
  if (typeof window === 'undefined') return;
  sessionStorage.setItem(INTENT_KEY(concertId), String(Date.now()));
}

export function hasPurchaseIntent(concertId: string): boolean {
  if (typeof window === 'undefined') return false;
  return sessionStorage.getItem(INTENT_KEY(concertId)) !== null;
}

export function clearPurchaseIntent(concertId: string): void {
  if (typeof window === 'undefined') return;
  sessionStorage.removeItem(INTENT_KEY(concertId));
}
