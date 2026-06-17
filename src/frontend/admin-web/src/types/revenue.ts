// src/types/revenue.ts

export type PaymentStatus = 'Paid' | 'Failed' | 'Pending';
export type PaymentMethod = 'All Methods' | 'VNPAY' | 'MoMo' | 'MOCK';

export interface Transaction {
  id: string;           // TX-9942A
  event: string;
  ticketType: string;
  amount: number;       // VND
  date: string;         // ISO string
  paymentStatus: PaymentStatus;
  provider: PaymentMethod;
}

export interface RevenueFilters {
  event: string;        // 'All Events' | concertId
  dateFrom: string;     // YYYY-MM-DD
  dateTo: string;
  method: PaymentMethod;
}
