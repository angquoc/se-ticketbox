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
  /** QR payload: {ticketId}:{rawToken}:{gateName} — used for QR code rendering */
  qrPayload?: string;
  /** Gate name assigned to this ticket (e.g. "GATE-A", not Gate.id/cuid) */
  gateId?: string;
}

export class TicketListResponseDto {
  data!: TicketResponseDto[];
  total!: number;
  page!: number;
  limit!: number;
  totalPages!: number;
}
