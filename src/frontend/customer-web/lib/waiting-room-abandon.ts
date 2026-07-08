import { clearPurchaseIntent } from '@/lib/waiting-room-intent';
import { clearWaitingRoomData } from '@/lib/waiting-room-storage';

function collectKeys(prefix: string): string[] {
  if (typeof window === 'undefined') return [];
  const keys: string[] = [];
  for (let i = 0; i < sessionStorage.length; i++) {
    const key = sessionStorage.key(i);
    if (key?.startsWith(prefix)) {
      keys.push(key);
    }
  }
  return keys;
}

/** Hủy luồng mua vé đang chờ của một concert (rời phòng chờ / sang thanh toán). */
export function abandonPurchaseFlow(concertId: string): void {
  clearPurchaseIntent(concertId);
  clearWaitingRoomData(concertId);
}

/** Hủy mọi luồng mua vé đang chờ khi user chủ động rời (logo, menu). */
export function abandonAllPurchaseFlows(): void {
  for (const key of collectKeys('waiting-room-purchase-intent:')) {
    sessionStorage.removeItem(key);
  }
  for (const key of collectKeys('waiting-room-session:')) {
    sessionStorage.removeItem(key);
  }
  for (const key of collectKeys('waiting-room-token:')) {
    sessionStorage.removeItem(key);
  }
}
