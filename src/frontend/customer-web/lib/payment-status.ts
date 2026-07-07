import type { PaymentStatus, PaymentTransaction } from '@/types/order';

export function paymentStatusLabel(status: PaymentStatus): string {
  switch (status) {
    case 'INITIATED':
      return 'Đang khởi tạo';
    case 'SUCCESS':
      return 'Thành công';
    case 'FAILED':
      return 'Thất bại';
    case 'TIMEOUT':
      return 'Hết thời gian';
    case 'CANCELLED':
      return 'Đã hủy';
    default:
      return status;
  }
}

export function paymentProviderLabel(provider: string): string {
  switch (provider) {
    case 'MOCK':
      return 'Mock Gateway';
    case 'VNPAY':
      return 'VNPay';
    case 'MOMO':
      return 'MoMo';
    default:
      return provider;
  }
}

/** Prefer the latest successful payment; otherwise the most recent transaction. */
export function getDisplayPayment(
  payments: PaymentTransaction[],
): PaymentTransaction | null {
  if (payments.length === 0) return null;

  const success = [...payments]
    .filter((payment) => payment.status === 'SUCCESS')
    .sort(
      (a, b) =>
        new Date(b.receivedAt ?? b.createdAt).getTime() -
        new Date(a.receivedAt ?? a.createdAt).getTime(),
    );

  if (success.length > 0) return success[0];

  return [...payments].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  )[0];
}
