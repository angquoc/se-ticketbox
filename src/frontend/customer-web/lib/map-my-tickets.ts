import type { BackendTicket, BackendTicketListResponse, Ticket, TicketListResponse } from '@/types/ticket';

interface ConcertMeta {
  title: string;
  venue: string;
  startsAt: string;
}

function toIsoString(value: string | Date): string {
  return typeof value === 'string' ? value : value.toISOString();
}

export function mapMyTicketsToList(
  response: BackendTicketListResponse,
  concertsById: Map<string, ConcertMeta>,
): TicketListResponse {
  const data: Ticket[] = response.data.map((ticket: BackendTicket) => {
    const concert = concertsById.get(ticket.concertId);

    return {
      id: ticket.id,
      orderId: ticket.orderId,
      concertId: ticket.concertId,
      concertTitle: concert?.title ?? 'Sự kiện',
      concertVenue: concert?.venue ?? '',
      concertStartsAt: concert?.startsAt ? toIsoString(concert.startsAt) : '',
      ticketTypeId: ticket.ticketTypeId,
      ticketTypeName: ticket.ticketTypeName,
      status: ticket.status,
      checkedInAt: ticket.checkedInAt,
      qrPayload: ticket.qrPayload ?? '',
      createdAt: ticket.createdAt,
      gateId: ticket.gateId,
    };
  });

  return {
    data,
    total: response.total,
    page: response.page,
    limit: response.limit,
    totalPages: response.totalPages,
  };
}
