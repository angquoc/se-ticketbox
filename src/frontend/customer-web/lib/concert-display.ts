import type { ConcertStatus } from '@/types/concert';

export function formatConcertDate(iso: string): string {
  return new Date(iso).toLocaleDateString('vi-VN', {
    weekday: 'long',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

export function formatConcertDateTime(iso: string): string {
  return new Date(iso).toLocaleString('vi-VN', {
    weekday: 'long',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatShortDate(iso: string): string {
  return new Date(iso).toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

export function concertStatusLabel(status: ConcertStatus): string {
  switch (status) {
    case 'SALE_OPEN':
      return 'Đang mở bán';
    case 'PUBLISHED':
      return 'Sắp mở bán';
    case 'COMPLETED':
      return 'Đã diễn ra';
    case 'SALE_CLOSED':
      return 'Đóng bán';
    case 'CANCELLED':
      return 'Đã hủy';
    case 'DRAFT':
      return 'Nháp';
    default:
      return status;
  }
}

export function concertStatusBadgeClass(status: ConcertStatus): string {
  switch (status) {
    case 'SALE_OPEN':
      return 'bg-emerald-100 text-emerald-800';
    case 'PUBLISHED':
      return 'bg-blue-100 text-blue-800';
    case 'COMPLETED':
      return 'bg-slate-100 text-slate-600';
    case 'SALE_CLOSED':
      return 'bg-amber-100 text-amber-800';
    case 'CANCELLED':
      return 'bg-red-100 text-red-800';
    default:
      return 'bg-slate-100 text-slate-600';
  }
}

export interface SaleWindowInfo {
  isOpen: boolean;
  reason: string | null;
}

export function getSaleWindowInfo(
  status: ConcertStatus,
  saleStartsAt: string | null,
  saleEndsAt: string | null,
): SaleWindowInfo {
  if (status === 'CANCELLED') {
    return { isOpen: false, reason: 'Sự kiện đã bị hủy' };
  }
  if (status === 'COMPLETED') {
    return { isOpen: false, reason: 'Sự kiện đã diễn ra' };
  }
  if (status === 'SALE_CLOSED') {
    return { isOpen: false, reason: 'Đã đóng bán vé' };
  }
  if (status !== 'PUBLISHED' && status !== 'SALE_OPEN') {
    return { isOpen: false, reason: 'Sự kiện chưa mở bán' };
  }

  const now = Date.now();
  if (saleStartsAt && new Date(saleStartsAt).getTime() > now) {
    return {
      isOpen: false,
      reason: `Mở bán từ ${formatConcertDateTime(saleStartsAt)}`,
    };
  }
  if (saleEndsAt && new Date(saleEndsAt).getTime() <= now) {
    return { isOpen: false, reason: 'Đã hết thời gian mua vé' };
  }

  return { isOpen: true, reason: null };
}

export function canViewSeatmap(status: ConcertStatus): boolean {
  return status !== 'CANCELLED' && status !== 'DRAFT';
}
