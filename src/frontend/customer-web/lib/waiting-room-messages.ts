const EARLY_MESSAGES = [
  'Đang chuẩn bị cho bạn...',
  'Hệ thống đang xử lý yêu cầu của bạn',
  'Vui lòng giữ màn hình này mở',
  'Chúng tôi đang sắp xếp lượt truy cập của bạn',
];

const MID_MESSAGES = [
  'Bạn đang được ưu tiên xếp hàng',
  'Đang kiểm tra kết nối của bạn',
  'Hệ thống đang làm việc cho bạn',
  'Cảm ơn bạn đã kiên nhẫn chờ đợi',
];

const LATE_MESSAGES = [
  'Sắp đến lượt của bạn...',
  'Gần tới rồi, chỉ còn chút nữa thôi!',
  'Sắp xong rồi...',
  'Đang mở cổng mua vé cho bạn...',
];

const TIPS = [
  'Không tắt hoặc làm mới trang trong lúc chờ',
  'Sau khi vào, bạn sẽ có vài phút để hoàn tất chọn ghế',
  'Mỗi tài khoản có giới hạn số ghế — hãy chọn cẩn thận',
  'Thanh toán trong thời gian giữ chỗ để không mất ghế đã chọn',
];

function pickFrom<T>(items: T[], seed: number): T {
  return items[seed % items.length];
}

export function getWaitingMessage(elapsedMs: number, tick: number): string {
  const band =
    elapsedMs < 12_000 ? EARLY_MESSAGES : elapsedMs < 28_000 ? MID_MESSAGES : LATE_MESSAGES;
  return pickFrom(band, tick);
}

export function getWaitingTip(tick: number): string {
  return pickFrom(TIPS, Math.floor(tick / 3));
}
