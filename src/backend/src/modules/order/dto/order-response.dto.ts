import {
  OrderStatus,
  PaymentProvider,
  PaymentStatus,
  TicketStatus,
} from '@prisma/client';

export class OrderTicketResponseDto {
  id!: string;
  ticketTypeId!: string;
  ticketTypeName!: string;
  status!: TicketStatus;
  checkedInAt!: Date | null;
  createdAt!: Date;
  /** QR payload: {ticketId}:{rawToken} */
  qrPayload!: string;
}

export class OrderItemResponseDto {
  id!: string;
  ticketTypeId!: string;
  ticketTypeName!: string;
  quantity!: number;
  unitPrice!: number;
  subtotal!: number;
  ticketCount!: number;
}

export class PaymentTransactionResponseDto {
  id!: string;
  provider!: PaymentProvider;
  status!: PaymentStatus;
  amount!: number;
  providerTransactionId!: string | null;
  paymentUrl!: string | null;
  receivedAt!: Date | null;
  createdAt!: Date;
}

export class OrderResponseDto {
  id!: string;
  userId!: string;
  concertId!: string;
  concertTitle!: string;
  status!: OrderStatus;
  totalAmountInVnd!: number;
  currency!: string;
  expiresAt!: Date | null;
  paidAt!: Date | null;
  cancelledAt!: Date | null;
  createdAt!: Date;
  updatedAt!: Date;
  items!: OrderItemResponseDto[];
  paymentUrl?: string | null;
  ticketCount!: number;
  /** Full ticket records with QR payloads (only available when status = PAID) */
  tickets?: OrderTicketResponseDto[];
  serverTime?: Date;
}

export class OrderListResponseDto {
  data!: OrderResponseDto[];
  total!: number;
  page!: number;
  limit!: number;
  totalPages!: number;
}

export class CreateOrderResponseDto {
  order!: OrderResponseDto;
  paymentUrl!: string | null;
}
