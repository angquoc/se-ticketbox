import { orderApi } from '@/lib/api-client';
import { resolveBackendConcertId } from '@/lib/concert-backend-mapping';
import type { Order } from '@/types/order';

export interface TicketTypeUsage {
  paidQty: number;
  reservedQty: number;
}

export type TicketTypeUsageMap = Map<string, TicketTypeUsage>;

const COUNTABLE_STATUSES: Order['status'][] = ['PAID', 'PENDING_PAYMENT'];

function accumulateOrderUsage(
  map: TicketTypeUsageMap,
  order: Order,
  backendConcertId: string,
): void {
  if (order.concertId !== backendConcertId) return;
  if (!COUNTABLE_STATUSES.includes(order.status)) return;

  for (const item of order.items) {
    const current = map.get(item.ticketTypeId) ?? { paidQty: 0, reservedQty: 0 };
    if (order.status === 'PAID') {
      current.paidQty += item.quantity;
    } else {
      current.reservedQty += item.quantity;
    }
    map.set(item.ticketTypeId, current);
  }
}

/**
 * Loads how many tickets the current user already holds per ticket type
 * for a concert (paid + pending payment), per interactive-seatmap spec.
 */
export async function fetchUserTicketUsage(
  frontendConcertId: string,
): Promise<TicketTypeUsageMap> {
  const backendConcertId = resolveBackendConcertId(frontendConcertId);
  const usage: TicketTypeUsageMap = new Map();

  const [paidOrders, pendingOrders] = await Promise.all([
    orderApi.listMine({ status: 'PAID', limit: 100 }),
    orderApi.listMine({ status: 'PENDING_PAYMENT', limit: 100 }),
  ]);

  for (const order of paidOrders.data) {
    accumulateOrderUsage(usage, order, backendConcertId);
  }
  for (const order of pendingOrders.data) {
    accumulateOrderUsage(usage, order, backendConcertId);
  }

  return usage;
}

export function remainingTicketAllowance(
  ticketTypeId: string,
  maxPerUser: number,
  usage: TicketTypeUsageMap,
): number {
  const current = usage.get(ticketTypeId);
  const used = (current?.paidQty ?? 0) + (current?.reservedQty ?? 0);
  return Math.max(0, maxPerUser - used);
}
