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
