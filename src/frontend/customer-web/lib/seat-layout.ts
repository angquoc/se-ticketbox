import {
  resolveSeatMapUrl,
  resolveZoneLayout,
  type ResolvedSeatmapConfig,
} from '@/lib/seatmap-config';
import { slugPrefixFromName, type TicketTypeZoneLayout } from '@/lib/seat-layout-helpers';
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

function generateSeatsForLayout(
  ticketTypeId: string,
  regionId: string,
  seatPrefix: string,
  layout: TicketTypeZoneLayout,
  seatCount: number,
  statusMap: Map<string, SeatStatus>,
): Seat[] {
  const seats: Seat[] = [];
  let generated = 0;

  for (let r = 0; r < layout.rows && generated < seatCount; r++) {
    for (let c = 0; c < layout.cols && generated < seatCount; c++) {
      const row = String.fromCharCode(65 + r);
      const col = c + 1;
      const seatNumber = `${seatPrefix}-${row}${col}`;

      seats.push({
        seatNumber,
        regionId,
        ticketTypeId,
        row,
        column: col,
        status: statusMap.get(seatNumber) ?? 'AVAILABLE',
        coords: {
          x: layout.startX + c * layout.colGap,
          y: layout.startY + r * layout.rowGap,
        },
      });
      generated += 1;
    }
  }

  return seats;
}

function countLayoutCapacity(layout: TicketTypeZoneLayout): number {
  return layout.rows * layout.cols;
}

export function buildSeatMapData(options: BuildSeatMapOptions): SeatMapData | null {
  if (options.ticketTypes.length === 0) return null;

  const seats: Seat[] = [];
  const ticketTypes: TicketType[] = [];

  options.ticketTypes.forEach((ticketType, zoneIndex) => {
    const layout = resolveZoneLayout(
      options.seatmapConfig ?? null,
      ticketType.name,
      zoneIndex,
      ticketType.totalQty,
    );
    const layoutCapacity = countLayoutCapacity(layout);
    const seatCount = Math.min(
      Math.max(ticketType.totalQty, 1),
      layoutCapacity,
      MAX_SEATS_PER_TYPE,
    );
    const regionId = `zone-${ticketType.id}`;
    const seatPrefix = layout.seatPrefix ?? slugPrefixFromName(ticketType.name);

    const seatNumbers: string[] = [];
    let generated = 0;
    for (let r = 0; r < layout.rows && generated < seatCount; r++) {
      for (let c = 0; c < layout.cols && generated < seatCount; c++) {
        const row = String.fromCharCode(65 + r);
        const col = c + 1;
        seatNumbers.push(`${seatPrefix}-${row}${col}`);
        generated += 1;
      }
    }

    const statusMap = assignSeatStatuses(
      seatNumbers,
      options.concertId,
      ticketType.totalQty,
      ticketType.soldQty,
      ticketType.reservedQty,
    );

    const zoneSeats = generateSeatsForLayout(
      ticketType.id,
      regionId,
      seatPrefix,
      layout,
      seatCount,
      statusMap,
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
  });

  return {
    concertId: options.concertId,
    concertName: options.concertName,
    seatMapUrl: resolveSeatMapUrl(options.seatMapUrl, options.seatmapConfig ?? null),
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
