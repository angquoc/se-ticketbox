import { translateCheckoutErrorMessage } from '@/lib/checkout-errors';
import { isWaitingRoomAccessDenied } from '@/lib/waiting-room-constants';

export class ClientApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = 'ClientApiError';
  }
}

export function isClientApiError(error: unknown): error is ClientApiError {
  return error instanceof ClientApiError;
}

export function isWaitingRoomOrderError(error: unknown): boolean {
  return isClientApiError(error) && error.status === 403 && isWaitingRoomAccessDenied(error.message);
}

export function getCheckoutErrorMessage(error: unknown): string {
  if (isClientApiError(error)) {
    if (error.status === 503) {
      return 'Cổng thanh toán đang tạm gián đoạn, vui lòng thử lại sau.';
    }
    if (error.status === 409) {
      return 'Đơn hàng đang được xử lý. Vui lòng chờ trong giây lát rồi thử lại.';
    }
    if (error.status === 403 && isWaitingRoomAccessDenied(error.message)) {
      return 'Lượt mua vé đã hết hạn hoặc chưa đến lượt. Vui lòng vào phòng chờ và thử lại.';
    }
    return translateCheckoutErrorMessage(error.message, error.status);
  }

  return error instanceof Error ? error.message : 'Không thể tạo đơn hàng';
}
