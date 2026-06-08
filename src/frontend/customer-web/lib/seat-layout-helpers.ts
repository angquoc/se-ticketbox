export const SEAT_SIZE = 20;
export const MAX_SEATS_PER_TYPE = 80;

export interface TicketTypeZoneLayout {
  rows: number;
  cols: number;
  startX: number;
  startY: number;
  colGap: number;
  rowGap: number;
  seatPrefix?: string;
}

export function normalizeTicketTypeName(name: string): string {
  return name.trim().toLowerCase();
}

export function slugPrefixFromName(name: string): string {
  const cleaned = name.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
  return cleaned.slice(0, 3) || 'TKT';
}

export function buildFallbackLayout(zoneIndex: number, totalQty: number): TicketTypeZoneLayout {
  const seatCount = Math.min(Math.max(totalQty, 4), MAX_SEATS_PER_TYPE);
  const cols = Math.min(14, Math.max(4, Math.ceil(Math.sqrt(seatCount * 1.4))));
  const rows = Math.ceil(seatCount / cols);
  return {
    rows,
    cols,
    startX: 60 + (zoneIndex % 2) * 120,
    startY: 110 + zoneIndex * 130,
    colGap: 24,
    rowGap: 26,
    seatPrefix: undefined,
  };
}
