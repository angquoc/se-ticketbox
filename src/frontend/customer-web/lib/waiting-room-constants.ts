/** Header gửi kèm POST /orders khi concert đang trong waiting room (design: order-reservation). */
export const WAITING_ROOM_TOKEN_HEADER = 'X-Waiting-Room-Token';

/** Kiểm tra lỗi 403 yêu cầu vào hàng đợi từ backend (khi module waiting room được bật). */
export function isWaitingRoomAccessDenied(message: string): boolean {
  const normalized = message.toLowerCase();
  return (
    normalized.includes('waiting room') ||
    normalized.includes('waiting-room') ||
    normalized.includes('phòng chờ') ||
    normalized.includes('hàng đợi')
  );
}
