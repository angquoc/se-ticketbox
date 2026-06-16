// src/lib/revenueMockData.ts
import { Transaction } from '@/types/revenue';

export const ALL_TRANSACTIONS: Transaction[] = [
  { id: 'TX-9942A', event: 'Summer Music Fest 2024', ticketType: 'VIP Pass',           amount: 350.00, date: '2023-10-24T14:32:00Z', paymentStatus: 'Paid',    provider: 'VNPAY' },
  { id: 'TX-9941B', event: 'Tech Conference Alpha',  ticketType: 'Early Bird General',  amount: 150.00, date: '2023-10-24T13:15:00Z', paymentStatus: 'Paid',    provider: 'MoMo'  },
  { id: 'TX-9940C', event: 'Local Food & Wine',      ticketType: 'Standard Entry',      amount: 45.00,  date: '2023-10-24T11:05:00Z', paymentStatus: 'Failed',  provider: 'VNPAY' },
  { id: 'TX-9939D', event: 'Summer Music Fest 2024', ticketType: 'General Admission',   amount: 120.00, date: '2023-10-23T18:40:00Z', paymentStatus: 'Paid',    provider: 'MoMo'  },
  { id: 'TX-9938E', event: 'Tech Conference Alpha',  ticketType: 'Student Pass',        amount: 50.00,  date: '2023-10-23T16:22:00Z', paymentStatus: 'Pending', provider: 'MOCK'  },
  { id: 'TX-9937F', event: 'Summer Music Fest 2024', ticketType: 'VIP Pass',            amount: 350.00, date: '2023-10-23T12:10:00Z', paymentStatus: 'Paid',    provider: 'VNPAY' },
  { id: 'TX-9936G', event: 'Local Food & Wine',      ticketType: 'VIP Table',           amount: 220.00, date: '2023-10-22T20:00:00Z', paymentStatus: 'Paid',    provider: 'MoMo'  },
  { id: 'TX-9935H', event: 'Tech Conference Alpha',  ticketType: 'Early Bird General',  amount: 150.00, date: '2023-10-22T09:30:00Z', paymentStatus: 'Failed',  provider: 'VNPAY' },
  { id: 'TX-9934I', event: 'Summer Music Fest 2024', ticketType: 'General Admission',   amount: 120.00, date: '2023-10-21T17:00:00Z', paymentStatus: 'Paid',    provider: 'MOCK'  },
  { id: 'TX-9933J', event: 'Local Food & Wine',      ticketType: 'Standard Entry',      amount: 45.00,  date: '2023-10-21T14:45:00Z', paymentStatus: 'Pending', provider: 'MoMo'  },
  { id: 'TX-9932K', event: 'Tech Conference Alpha',  ticketType: 'VIP Pass',            amount: 350.00, date: '2023-10-20T11:20:00Z', paymentStatus: 'Paid',    provider: 'VNPAY' },
  { id: 'TX-9931L', event: 'Summer Music Fest 2024', ticketType: 'Early Bird General',  amount: 150.00, date: '2023-10-20T08:55:00Z', paymentStatus: 'Paid',    provider: 'MoMo'  },
  { id: 'TX-9930M', event: 'Local Food & Wine',      ticketType: 'General Admission',   amount: 120.00, date: '2023-10-19T19:30:00Z', paymentStatus: 'Paid',    provider: 'MOCK'  },
  { id: 'TX-9929N', event: 'Tech Conference Alpha',  ticketType: 'Student Pass',        amount: 50.00,  date: '2023-10-19T15:00:00Z', paymentStatus: 'Paid',    provider: 'VNPAY' },
  { id: 'TX-9928O', event: 'Summer Music Fest 2024', ticketType: 'VIP Pass',            amount: 350.00, date: '2023-10-18T10:10:00Z', paymentStatus: 'Failed',  provider: 'MoMo'  },
];

export const TOTAL_COUNT = 842;
export const TOTAL_REVENUE = 124500;
