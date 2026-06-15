import type { ZoneStatus } from '@/types/seatmap';

export const ZONE_COLORS = {
  available: '#4CAF50',
  reserved: '#FFC107',
  soldOut: '#BDBDBD',
  selected: '#2196F3',
  hover: '#FF9800',
} as const;

/** @deprecated Use ZONE_COLORS */
export const SEAT_COLORS = ZONE_COLORS;

export function getZoneFillColor(
  status: ZoneStatus,
  isSelected: boolean,
  isHovered: boolean,
): string {
  if (isSelected) return ZONE_COLORS.selected;
  if (isHovered && status === 'AVAILABLE') return ZONE_COLORS.hover;
  switch (status) {
    case 'AVAILABLE':
      return ZONE_COLORS.available;
    case 'RESERVED':
      return ZONE_COLORS.reserved;
    case 'SOLD_OUT':
      return ZONE_COLORS.soldOut;
    default:
      return ZONE_COLORS.soldOut;
  }
}
