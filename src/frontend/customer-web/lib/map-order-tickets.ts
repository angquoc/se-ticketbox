import type { Order, OrderTicket } from '@/types/order';
import type { Ticket, TicketListResponse } from '@/types/ticket';

interface ConcertMeta {
  venue: string;
  startsAt: string;
}

function toIsoString(value: string | Date): string {
  return typeof value === 'string' ? value : value.toISOString();
}

export function mapOrderTicketsToList(
  order: Order,
  concert?: ConcertMeta | null,
): TicketListResponse {
  const venue = concert?.venue ?? '';
  const startsAt = concert?.startsAt ? toIsoString(concert.startsAt) : '';

  const data: Ticket[] = (order.tickets ?? []).map((ticket: OrderTicket) => ({
    id: ticket.id,
    orderId: order.id,
    concertId: order.concertId,
    concertTitle: order.concertTitle,
    concertVenue: venue,
    concertStartsAt: startsAt,
    ticketTypeId: ticket.ticketTypeId,
    ticketTypeName: ticket.ticketTypeName,
    status: ticket.status,
    checkedInAt: ticket.checkedInAt,
    qrPayload: ticket.qrPayload,
    createdAt: ticket.createdAt,
    gateId: ticket.gateId,
  }));

  return { data, total: data.length };
}
