/**
 * format.ts
 * Các hàm tiện ích thuần túy (pure functions) để định dạng dữ liệu hiển thị.
 * Không có side effects, không import React.
 */

/** Định dạng số tiền theo đơn vị VND */
export function formatVnd(amount: number): string {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(amount);
}

/** Định dạng ISO string thành ngày giờ tiếng Việt (GMT+7) */
export function formatDate(iso?: string | null): string {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '—';
    return new Intl.DateTimeFormat('vi-VN', {
      dateStyle: 'medium',
      timeStyle: 'short',
      timeZone: 'Asia/Ho_Chi_Minh',
    }).format(d);
  } catch (e) {
    return '—';
  }
}


/** Định dạng số bytes thành B / KB / MB */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Tạo ISO string từ date string + time string (múi giờ GMT+7) */
export function toIso(dateStr: string, timeStr: string): string {
  if (!dateStr || !timeStr) return '';
  return new Date(`${dateStr}T${timeStr}:00+07:00`).toISOString();
}
