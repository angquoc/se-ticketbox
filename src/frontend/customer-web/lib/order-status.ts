import type { OrderStatus } from '@/types/order';

export function orderStatusLabel(status: OrderStatus): string {
  switch (status) {
    case 'PAID':
      return 'Đã thanh toán';
    case 'PENDING_PAYMENT':
      return 'Chờ thanh toán';
    case 'EXPIRED':
      return 'Hết hạn';
    case 'PAYMENT_FAILED':
      return 'Thanh toán thất bại';
    case 'CANCELLED':
      return 'Đã hủy';
    case 'REFUNDED':
      return 'Đã hoàn tiền';
    default:
      return status;
  }
}
