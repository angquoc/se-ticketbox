const CHECKOUT_IDEM_PREFIX = 'ticketbox:checkout-idem:';
const PAYMENT_IDEM_PREFIX = 'ticketbox:payment-idem:';

export function createIdempotencyKey(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

export function getCheckoutIdempotencyKey(concertId: string): string {
  const storageKey = `${CHECKOUT_IDEM_PREFIX}${concertId}`;
  const existing = sessionStorage.getItem(storageKey);
  if (existing) return existing;

  const key = createIdempotencyKey();
  sessionStorage.setItem(storageKey, key);
  return key;
}

export function clearCheckoutIdempotencyKey(concertId: string): void {
  sessionStorage.removeItem(`${CHECKOUT_IDEM_PREFIX}${concertId}`);
}

export function getPaymentIdempotencyKey(orderId: string): string {
  const storageKey = `${PAYMENT_IDEM_PREFIX}${orderId}`;
  const existing = sessionStorage.getItem(storageKey);
  if (existing) return existing;

  const key = createIdempotencyKey();
  sessionStorage.setItem(storageKey, key);
  return key;
}

export function clearPaymentIdempotencyKey(orderId: string): void {
  sessionStorage.removeItem(`${PAYMENT_IDEM_PREFIX}${orderId}`);
}
