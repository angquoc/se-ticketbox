import { ConcertStatus } from '@prisma/client';

export class ConcertResponseDto {
  id!: string;
  title!: string;
  slug!: string;
  description!: string | null;
  artistBio!: string | null;
  venue!: string;
  startsAt!: Date;
  saleStartsAt!: Date | null;
  saleEndsAt!: Date | null;
  status!: ConcertStatus;
  seatMapUrl!: string | null;
  coverImageUrl!: string | null;
  organizerId!: string;
  organizerName!: string | null;
  createdAt!: Date;
  updatedAt!: Date;
  ticketTypes?: TicketTypeSummary[];
}

export class TicketTypeSummary {
  id!: string;
  name!: string;
  price!: number;
  totalQty!: number;
  soldQty!: number;
  reservedQty!: number;
  status!: string;
  saleStartsAt!: Date;
  saleEndsAt!: Date | null;
}

export class ConcertListResponseDto {
  data!: ConcertResponseDto[];
  total!: number;
  page!: number;
  limit!: number;
  totalPages!: number;
}
