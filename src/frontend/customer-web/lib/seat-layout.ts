import { resolveSeatMapUrl, type ResolvedSeatmapConfig } from '@/lib/seatmap-config';
import { normalizeTicketTypeName } from '@/lib/seat-layout-helpers';
import { loadParsedSvgSeats } from '@/lib/seatmap-svg.server';
import type { ParsedSvgSeat } from '@/lib/svg-seatmap';
import type { Seat, SeatMapData, SeatStatus, TicketType } from '@/types/seatmap';

import { MAX_SEATS_PER_TYPE } from '@/lib/seat-layout-helpers';

export interface TicketTypeInput {
  id: string;
  name: string;
  price: number;
  maxPerUser: number;
  totalQty: number;
  soldQty: number;
  reservedQty: number;
  availableQty?: number;
}

export interface BuildSeatMapOptions {
  concertId: string;
  concertName: string;
  seatMapUrl?: string | null;
  ticketTypes: TicketTypeInput[];
  seatmapConfig?: ResolvedSeatmapConfig | null;
}

export function pseudoRandom(seed: string): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash << 5) - hash + seed.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash % 10000) / 10000;
}

/**
 * Gán trạng thái ghế theo tỷ lệ tồn kho (soldQty / reservedQty / availableQty).
 */
export function assignSeatStatuses(
  seatNumbers: string[],
  concertId: string,
  totalQty: number,
  soldQty: number,
  reservedQty: number,
): Map<string, SeatStatus> {
  const displayCount = seatNumbers.length;
  if (displayCount === 0) return new Map();

  const inventoryTotal = Math.max(totalQty, 1);
  const soldTarget = Math.min(
    displayCount,
    Math.round((soldQty / inventoryTotal) * displayCount),
  );
  const reservedTarget = Math.min(
    displayCount - soldTarget,
    Math.round((reservedQty / inventoryTotal) * displayCount),
  );

  const ordered = [...seatNumbers].sort(
    (a, b) => pseudoRandom(`${concertId}:${a}`) - pseudoRandom(`${concertId}:${b}`),
  );

  const statusMap = new Map<string, SeatStatus>();
  ordered.forEach((seatNumber, index) => {
    if (index < soldTarget) {
      statusMap.set(seatNumber, 'SOLD');
    } else if (index < soldTarget + reservedTarget) {
      statusMap.set(seatNumber, 'RESERVED');
    } else {
      statusMap.set(seatNumber, 'AVAILABLE');
    }
  });

  return statusMap;
}

function groupSvgSeatsByTicketType(seats: ParsedSvgSeat[]): Map<string, ParsedSvgSeat[]> {
  const grouped = new Map<string, ParsedSvgSeat[]>();
  for (const seat of seats) {
    const key = normalizeTicketTypeName(seat.ticketTypeName);
    const list = grouped.get(key) ?? [];
    list.push(seat);
    grouped.set(key, list);
  }
  return grouped;
}

function toSeat(
  parsed: ParsedSvgSeat,
  ticketTypeId: string,
  regionId: string,
  status: SeatStatus,
): Seat {
  return {
    seatNumber: parsed.seatNumber,
    regionId,
    ticketTypeId,
    row: parsed.row,
    column: parsed.column,
    status,
    coords: parsed.coords,
  };
}

export async function buildSeatMapData(options: BuildSeatMapOptions): Promise<SeatMapData | null> {
  if (options.ticketTypes.length === 0) return null;

  const seatMapUrl = resolveSeatMapUrl(options.seatMapUrl, options.seatmapConfig ?? null);
  const svgData = await loadParsedSvgSeats(seatMapUrl);
  if (!svgData || svgData.seats.length === 0) return null;

  const seatsByTicketType = groupSvgSeatsByTicketType(svgData.seats);
  const seats: Seat[] = [];
  const ticketTypes: TicketType[] = [];

  for (const ticketType of options.ticketTypes) {
    const svgSeats = seatsByTicketType.get(normalizeTicketTypeName(ticketType.name)) ?? [];
    if (svgSeats.length === 0) continue;

    const seatCount = Math.min(
      Math.max(ticketType.totalQty, 1),
      svgSeats.length,
      MAX_SEATS_PER_TYPE,
    );
    const selectedSeats = svgSeats.slice(0, seatCount);
    const regionId = `zone-${ticketType.id}`;
    const seatNumbers = selectedSeats.map((seat) => seat.seatNumber);

    const statusMap = assignSeatStatuses(
      seatNumbers,
      options.concertId,
      ticketType.totalQty,
      ticketType.soldQty,
      ticketType.reservedQty,
    );

    const zoneSeats = selectedSeats.map((parsed) =>
      toSeat(parsed, ticketType.id, regionId, statusMap.get(parsed.seatNumber) ?? 'AVAILABLE'),
    );

    seats.push(...zoneSeats);

    ticketTypes.push({
      id: ticketType.id,
      name: ticketType.name,
      price: ticketType.price,
      maxPerUser: ticketType.maxPerUser,
      totalQty: zoneSeats.length,
      soldQty: zoneSeats.filter((seat) => seat.status === 'SOLD').length,
      reservedQty: zoneSeats.filter((seat) => seat.status === 'RESERVED').length,
      seatRegions: [
        {
          regionId,
          regionName: ticketType.name,
          seatCount: zoneSeats.length,
          availableCount: zoneSeats.filter((seat) => seat.status === 'AVAILABLE').length,
          reservedCount: zoneSeats.filter((seat) => seat.status === 'RESERVED').length,
          soldCount: zoneSeats.filter((seat) => seat.status === 'SOLD').length,
        },
      ],
    });
  }

  if (seats.length === 0) return null;

  return {
    concertId: options.concertId,
    concertName: options.concertName,
    seatMapUrl,
    ticketTypes,
    seats,
  };
}

export function getSeatAvailability(
  seats: Seat[],
  seatNumbers: string[],
): Record<string, SeatStatus> {
  const seatMap = new Map(seats.map((seat) => [seat.seatNumber, seat.status]));
  const availability: Record<string, SeatStatus> = {};

  for (const seatNumber of seatNumbers) {
    availability[seatNumber] = seatMap.get(seatNumber) ?? 'SOLD';
  }

  return availability;
}

export { MAX_SEATS_PER_TYPE } from '@/lib/seat-layout-helpers';
