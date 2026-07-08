import type { OrderItem } from '@/types/order';

export function totalTicketQuantity(items: OrderItem[]): number {
  return items.reduce((sum, item) => sum + item.quantity, 0);
}

/** Compact summary for order list cards, e.g. "VIP × 2, Standard × 1". */
export function formatOrderItemsSummary(items: OrderItem[]): string {
  if (items.length === 0) return '—';

  return items
    .map((item) => `${item.ticketTypeName} × ${item.quantity}`)
    .join(', ');
}
