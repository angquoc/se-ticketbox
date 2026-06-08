export type ConcertStatus =
  | 'DRAFT'
  | 'PUBLISHED'
  | 'SALE_OPEN'
  | 'SALE_CLOSED'
  | 'CANCELLED'
  | 'COMPLETED';

export type TicketTypeStatus = 'ACTIVE' | 'INACTIVE' | 'SOLD_OUT';

export interface TicketTypeSummary {
  id: string;
  name: string;
  price: number;
  totalQty: number;
  soldQty: number;
  reservedQty: number;
  availableQty?: number;
  maxPerUser?: number;
  status: TicketTypeStatus;
  saleStartsAt: string;
  saleEndsAt: string | null;
}

export interface Concert {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  artistBio: string | null;
  venue: string;
  startsAt: string;
  saleStartsAt: string | null;
  saleEndsAt: string | null;
  status: ConcertStatus;
  seatMapUrl: string | null;
  coverImageUrl: string | null;
  organizerId: string;
  organizerName: string | null;
  ticketTypes?: TicketTypeSummary[];
}

export interface ConcertListResponse {
  data: Concert[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ConcertCardData {
  id: string;
  title: string;
  venue: string;
  startsAt: string;
  status: ConcertStatus;
  coverImageUrl: string | null;
}
