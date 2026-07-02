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

export function getCheckoutErrorMessage(error: unknown): string {
  if (isClientApiError(error)) {
    if (error.status === 503) {
      return 'Cổng thanh toán đang tạm gián đoạn, vui lòng thử lại sau.';
    }
    if (error.status === 409) {
      return 'Đơn hàng đang được xử lý. Vui lòng chờ trong giây lát rồi thử lại.';
    }
    if (error.status === 422) {
      return error.message;
    }
  }

  return error instanceof Error ? error.message : 'Không thể tạo đơn hàng';
}
