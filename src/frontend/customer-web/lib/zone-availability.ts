import type { Zone, ZoneStatus } from '@/types/seatmap';

export type AvailabilityFilter = 'all' | ZoneStatus;

export const ALL_AVAILABILITY = 'all' as const;

export function zoneAvailabilityLabel(zone: Zone): string {
  if (zone.status === 'SOLD_OUT') return 'Đã bán hết';
  if (zone.status === 'RESERVED') return 'Gần hết';
  return 'Còn chỗ';
}

export function zoneAvailabilityBadgeClass(status: ZoneStatus): string {
  switch (status) {
    case 'AVAILABLE':
      return 'bg-emerald-100 text-emerald-800';
    case 'RESERVED':
      return 'bg-amber-100 text-amber-800';
    case 'SOLD_OUT':
      return 'bg-slate-200 text-slate-600';
    default:
      return 'bg-slate-100 text-slate-700';
  }
}
