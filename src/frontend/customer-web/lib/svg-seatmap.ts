import { SEAT_SIZE } from '@/lib/seat-layout-helpers';

export interface ParsedSvgSeat {
  seatNumber: string;
  ticketTypeName: string;
  row: string;
  column: number;
  coords: { x: number; y: number };
}

export interface SvgViewBox {
  width: number;
  height: number;
}

const SEAT_ATTR_RE =
  /<(?:rect|circle|g)\b[^>]*\bdata-seat="([^"]+)"[^>]*>/gi;

function readAttr(tag: string, name: string): string | null {
  const quoted = new RegExp(`\\b${name}="([^"]*)"`, 'i').exec(tag);
  if (quoted) return quoted[1];

  const single = new RegExp(`\\b${name}='([^']*)'`, 'i').exec(tag);
  return single?.[1] ?? null;
}

function readNumberAttr(tag: string, name: string, fallback = 0): number {
  const raw = readAttr(tag, name);
  if (!raw) return fallback;
  const value = Number.parseFloat(raw);
  return Number.isFinite(value) ? value : fallback;
}

function parseCoordsFromTag(tag: string): { x: number; y: number } {
  const x = readNumberAttr(tag, 'x');
  const y = readNumberAttr(tag, 'y');
  const cx = readNumberAttr(tag, 'cx');
  const cy = readNumberAttr(tag, 'cy');
  const r = readNumberAttr(tag, 'r', SEAT_SIZE / 2);

  if (tag.includes('cx=')) {
    return { x: cx - r, y: cy - r };
  }

  return { x, y };
}

function parseRowColumn(
  seatNumber: string,
  rowAttr: string | null,
  columnAttr: string | null,
): { row: string; column: number } {
  if (rowAttr && columnAttr) {
    const column = Number.parseInt(columnAttr, 10);
    return { row: rowAttr, column: Number.isFinite(column) ? column : 1 };
  }

  const match = seatNumber.match(/-([A-Z])(\d+)$/i);
  if (match) {
    return { row: match[1].toUpperCase(), column: Number.parseInt(match[2], 10) };
  }

  return { row: 'A', column: 1 };
}

export function parseSvgViewBox(svgText: string): SvgViewBox {
  const match = /viewBox="([^"]+)"/i.exec(svgText);
  if (!match) {
    return { width: 800, height: 580 };
  }

  const parts = match[1].trim().split(/\s+/).map(Number);
  if (parts.length === 4 && parts.every((value) => Number.isFinite(value))) {
    return { width: parts[2], height: parts[3] };
  }

  return { width: 800, height: 580 };
}

export function parseSvgSeats(svgText: string): ParsedSvgSeat[] {
  const seats: ParsedSvgSeat[] = [];
  const seen = new Set<string>();

  for (const match of svgText.matchAll(SEAT_ATTR_RE)) {
    const tag = match[0];
    const seatNumber = match[1]?.trim();
    if (!seatNumber || seen.has(seatNumber)) continue;

    const ticketTypeName = readAttr(tag, 'data-ticket-type')?.trim();
    if (!ticketTypeName) continue;

    const { row, column } = parseRowColumn(
      seatNumber,
      readAttr(tag, 'data-row'),
      readAttr(tag, 'data-column'),
    );

    seen.add(seatNumber);
    seats.push({
      seatNumber,
      ticketTypeName,
      row,
      column,
      coords: parseCoordsFromTag(tag),
    });
  }

  return seats;
}

export function stripSvgWrapper(svgText: string): string {
  const openTagEnd = svgText.indexOf('>');
  const closeTagStart = svgText.lastIndexOf('</svg>');
  if (openTagEnd === -1 || closeTagStart === -1 || closeTagStart <= openTagEnd) {
    return svgText;
  }
  return svgText.slice(openTagEnd + 1, closeTagStart).trim();
}
