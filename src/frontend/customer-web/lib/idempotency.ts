const CHECKOUT_IDEM_PREFIX = 'ticketbox:checkout-idem:';
const PAYMENT_IDEM_PREFIX = 'ticketbox:payment-idem:';

const checkoutKeyMemory = new Map<string, string>();
const paymentKeyMemory = new Map<string, string>();

export function createIdempotencyKey(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

function getOrCreateScopedKey(
  scopeId: string,
  memory: Map<string, string>,
  storagePrefix: string,
): string {
  const cached = memory.get(scopeId);
  if (cached) return cached;

  const storageKey = `${storagePrefix}${scopeId}`;
  const existing = sessionStorage.getItem(storageKey);
  if (existing) {
    memory.set(scopeId, existing);
    return existing;
  }

  const key = createIdempotencyKey();
  memory.set(scopeId, key);
  sessionStorage.setItem(storageKey, key);
  return key;
}

function clearScopedKey(
  scopeId: string,
  memory: Map<string, string>,
  storagePrefix: string,
): void {
  memory.delete(scopeId);
  sessionStorage.removeItem(`${storagePrefix}${scopeId}`);
}

export function getCheckoutIdempotencyKey(concertId: string): string {
  return getOrCreateScopedKey(concertId, checkoutKeyMemory, CHECKOUT_IDEM_PREFIX);
}

export function clearCheckoutIdempotencyKey(concertId: string): void {
  clearScopedKey(concertId, checkoutKeyMemory, CHECKOUT_IDEM_PREFIX);
}

export function getPaymentIdempotencyKey(orderId: string): string {
  return getOrCreateScopedKey(orderId, paymentKeyMemory, PAYMENT_IDEM_PREFIX);
}

export function clearPaymentIdempotencyKey(orderId: string): void {
  clearScopedKey(orderId, paymentKeyMemory, PAYMENT_IDEM_PREFIX);
}
