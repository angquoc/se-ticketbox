import { TicketTypeStatus } from '@prisma/client';

export class TicketTypeResponseDto {
  id!: string;
  concertId!: string;
  name!: string;
  price!: number;
  totalQty!: number;
  soldQty!: number;
  reservedQty!: number;
  availableQty!: number;
  maxPerUser!: number;
  saleStartsAt!: Date;
  saleEndsAt!: Date | null;
  status!: TicketTypeStatus;
  createdAt!: Date;
  updatedAt!: Date;
}

export class TicketTypeListResponseDto {
  data!: TicketTypeResponseDto[];
  total!: number;
}
