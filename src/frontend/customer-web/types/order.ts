export type OrderStatus =
  | 'PENDING_PAYMENT'
  | 'PAID'
  | 'EXPIRED'
  | 'CANCELLED'
  | 'PAYMENT_FAILED'
  | 'REFUNDED';

export type PaymentStatus =
  | 'INITIATED'
  | 'SUCCESS'
  | 'FAILED'
  | 'TIMEOUT'
  | 'CANCELLED';

export type OrderTicketStatus = 'ISSUED' | 'CHECKED_IN' | 'CANCELLED' | 'REFUNDED';

export interface OrderTicket {
  id: string;
  ticketTypeId: string;
  ticketTypeName: string;
  status: OrderTicketStatus;
  checkedInAt: string | null;
  createdAt: string;
  qrPayload: string;
}

export interface OrderItem {
  id: string;
  ticketTypeId: string;
  ticketTypeName: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  ticketCount: number;
}

export interface PaymentTransaction {
  id: string;
  provider: string;
  status: PaymentStatus;
  amount: number;
  providerTransactionId: string | null;
  paymentUrl: string | null;
  receivedAt: string | null;
  createdAt: string;
}

export interface Order {
  id: string;
  userId: string;
  concertId: string;
  concertTitle: string;
  status: OrderStatus;
  totalAmountInVnd: number;
  currency: string;
  expiresAt: string | null;
  paidAt: string | null;
  cancelledAt: string | null;
  createdAt: string;
  updatedAt: string;
  items: OrderItem[];
  paymentUrl?: string | null;
  ticketCount: number;
  /** Present when status is PAID — includes QR payloads for e-tickets */
  tickets?: OrderTicket[];
}

export interface CreateOrderResponse {
  order: Order;
  paymentUrl: string | null;
}

export interface CreatePaymentResponse {
  orderId: string;
  paymentUrl: string;
  reused?: boolean;
}

export interface PaymentStatusResponse {
  orderId: string;
  status: OrderStatus;
  payments: PaymentTransaction[];
  ticketCount: number;
}

export type TicketTypeStatus = 'ACTIVE' | 'INACTIVE' | 'SOLD_OUT';

export interface TicketTypeAvailability {
  id: string;
  concertId: string;
  name: string;
  price: number;
  totalQty: number;
  soldQty: number;
  reservedQty: number;
  availableQty: number;
  maxPerUser: number;
  saleStartsAt: string;
  saleEndsAt: string | null;
  status: TicketTypeStatus;
}
