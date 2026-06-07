export type TicketStatus = 'ISSUED' | 'CHECKED_IN' | 'CANCELLED' | 'REFUNDED';

export interface Ticket {
  id: string;
  orderId: string;
  concertId: string;
  concertTitle: string;
  concertVenue: string;
  concertStartsAt: string;
  ticketTypeId: string;
  ticketTypeName: string;
  status: TicketStatus;
  checkedInAt: string | null;
  qrPayload: string;
  createdAt: string;
}

export interface TicketListResponse {
  data: Ticket[];
  total: number;
}
