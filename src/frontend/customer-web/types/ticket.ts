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
  gateId?: string;
}

/** Raw ticket shape from GET /tickets/me (before concert enrichment). */
export interface BackendTicket {
  id: string;
  orderId: string;
  concertId: string;
  ticketTypeId: string;
  ticketTypeName: string;
  status: TicketStatus;
  checkedInAt: string | null;
  qrPayload?: string;
  createdAt: string;
  gateId?: string;
}

export interface BackendTicketListResponse {
  data: BackendTicket[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface TicketListResponse {
  data: Ticket[];
  total: number;
  page?: number;
  limit?: number;
  totalPages?: number;
}
