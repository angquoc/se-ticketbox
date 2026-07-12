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

export function orderStatusBadgeClass(status: OrderStatus): string {
  switch (status) {
    case 'PAID':
      return 'bg-emerald-100 text-emerald-800';
    case 'PENDING_PAYMENT':
      return 'bg-amber-100 text-amber-900';
    case 'EXPIRED':
    case 'PAYMENT_FAILED':
      return 'bg-red-100 text-red-800';
    case 'CANCELLED':
      return 'bg-slate-100 text-slate-600';
    case 'REFUNDED':
      return 'bg-violet-100 text-violet-800';
    default:
      return 'bg-slate-100 text-slate-700';
  }
}

export function orderStatusDescription(status: OrderStatus): string | null {
  switch (status) {
    case 'EXPIRED':
      return 'Đơn hàng đã hết thời gian giữ chỗ. Vé đã được hoàn lại tồn kho.';
    case 'CANCELLED':
      return 'Bạn đã hủy đơn hàng. Vé đã được hoàn lại tồn kho.';
    case 'PAYMENT_FAILED':
      return 'Thanh toán không thành công. Vé đã được hoàn lại tồn kho.';
    case 'REFUNDED':
      return 'Đơn hàng đã được hoàn tiền. Vé không còn hiệu lực.';
    default:
      return null;
  }
}

export function canRepurchaseOrder(status: OrderStatus): boolean {
  return status === 'EXPIRED' || status === 'CANCELLED' || status === 'PAYMENT_FAILED';
}
