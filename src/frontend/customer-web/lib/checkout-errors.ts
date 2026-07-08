/**
 * Dịch thông báo lỗi từ backend sang tiếng Việt theo order-reservation.md / ticket-purchase.md.
 */
export function translateCheckoutErrorMessage(message: string, status: number): string {
  const lower = message.toLowerCase();

  if (status === 429 || lower.includes('too many requests')) {
    return 'Bạn gửi quá nhiều yêu cầu. Vui lòng chờ một phút rồi thử lại.';
  }

  if (status === 400) {
    if (lower.includes('failed to create order')) {
      return 'Không thể tạo đơn hàng. Vui lòng thử lại.';
    }
    if (lower.includes('idempotency') && lower.includes('different')) {
      return 'Mã yêu cầu đã được dùng cho nội dung khác. Vui lòng tải lại trang và thử lại.';
    }
    if (lower.includes('missing idempotency')) {
      return 'Thiếu mã yêu cầu. Vui lòng tải lại trang và thử lại.';
    }
  }

  if (status === 403) {
    if (lower.includes('vé không còn') || lower.includes('not on sale') || lower.includes('sale')) {
      return 'Vé không còn được bán cho sự kiện này.';
    }
  }

  if (status === 422) {
    if (
      lower.includes('not enough tickets') ||
      lower.includes('out_of_stock') ||
      lower.includes('vé đã hết')
    ) {
      return 'Vé đã hết, vui lòng chọn loại vé hoặc khu vực khác.';
    }

    const remainingMatch = message.match(/buy up to (\d+) more ticket/i);
    if (remainingMatch) {
      return `Bạn đã vượt giới hạn mua vé. Bạn chỉ có thể mua thêm tối đa ${remainingMatch[1]} vé cho loại vé này.`;
    }

    if (lower.includes('purchase limit') || lower.includes('vượt giới hạn')) {
      return 'Bạn đã vượt giới hạn mua vé cho loại vé này.';
    }
  }

  return message;
}
