/**
 * orderService.ts
 * Service layer cho Admin Web — quản lý Orders.
 */

import { apiClient } from '@/lib/apiClient';
import type { PaginatedResponse } from '@/types/api';

export interface Order {
  id: string;
  userId: string;
  concertId: string;
  concertTitle: string;
  status: 'PENDING_PAYMENT' | 'PAID' | 'EXPIRED' | 'CANCELLED' | 'PAYMENT_FAILED' | 'REFUNDED';
  totalAmountInVnd: number;
  currency: string;
  expiresAt: string | null;
  paidAt: string | null;
  cancelledAt: string | null;
  createdAt: string;
  updatedAt: string;
  ticketCount: number;
}

/**
 * Lấy danh sách toàn bộ orders cho admin.
 */
export async function getAdminOrders(
  page = 1,
  limit = 100,
  status?: string,
  concertId?: string,
): Promise<PaginatedResponse<Order>> {
  const res = await apiClient.get<PaginatedResponse<Order>>('/admin/orders', {
    params: { page, limit, status, concertId },
  });
  return res.data;
}
