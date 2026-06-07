import type { SeatStatus } from '@/types/seatmap';

export const SEAT_COLORS = {
  available: '#4CAF50',
  reserved: '#FFC107',
  sold: '#BDBDBD',
  selected: '#2196F3',
  hover: '#FF9800',
} as const;

export function getSeatFillColor(
  status: SeatStatus,
  isSelected: boolean,
  isHovered: boolean,
): string {
  if (isSelected) return SEAT_COLORS.selected;
  if (isHovered && status === 'AVAILABLE') return SEAT_COLORS.hover;
  switch (status) {
    case 'AVAILABLE':
      return SEAT_COLORS.available;
    case 'RESERVED':
      return SEAT_COLORS.reserved;
    case 'SOLD':
      return SEAT_COLORS.sold;
    default:
      return SEAT_COLORS.sold;
  }
}
