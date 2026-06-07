import { TicketStatus } from '@prisma/client';

export class TicketResponseDto {
  id!: string;
  concertId!: string;
  ticketTypeId!: string;
  ticketTypeName!: string;
  orderId!: string;
  status!: TicketStatus;
  checkedInAt!: Date | null;
  createdAt!: Date;
}

export class TicketListResponseDto {
  data!: TicketResponseDto[];
  total!: number;
  page!: number;
  limit!: number;
  totalPages!: number;
}
