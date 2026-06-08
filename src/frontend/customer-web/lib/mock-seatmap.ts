import {
  getActiveTicketTypes,
  getConcertTicketConfig,
  getDefaultTicketConfig,
  type TicketTypeConfig,
} from '@/lib/ticket-type-config';
import type { Seat, SeatMapData, SeatStatus, TicketType } from '@/types/seatmap';

interface MockSeatMapOptions {
  concertSlug?: string;
  concertName?: string;
}

function pseudoRandom(seed: string): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash << 5) - hash + seed.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash % 100) / 100;
}

function pickStatus(concertId: string, seatNumber: string): SeatStatus {
  const r = pseudoRandom(`${concertId}:${seatNumber}`);
  if (r < 0.12) return 'SOLD';
  if (r < 0.2) return 'RESERVED';
  return 'AVAILABLE';
}

function generateSeatsForType(
  concertId: string,
  ticketType: TicketTypeConfig,
  zoneIndex: number,
): Seat[] {
  const seats: Seat[] = [];
  const { layout } = ticketType;
  const regionId = `zone-${ticketType.mockId}`;
  const rowLabels = Array.from({ length: layout.rows }, (_, i) =>
    String.fromCharCode(65 + i),
  );

  for (let r = 0; r < layout.rows; r++) {
    for (let c = 0; c < layout.cols; c++) {
      const row = rowLabels[r];
      const col = c + 1;
      const seatNumber = `${ticketType.seatPrefix}-${row}${col}`;

      seats.push({
        seatNumber,
        regionId,
        ticketTypeId: ticketType.mockId,
        row,
        column: col,
        status: pickStatus(concertId, seatNumber),
        coords: {
          x: layout.startX + c * layout.colGap,
          y: layout.startY + r * layout.rowGap + zoneIndex * 8,
        },
      });
    }
  }

  return seats;
}

function buildTicketTypeEntry(
  ticketType: TicketTypeConfig,
  zoneSeats: Seat[],
): TicketType {
  const availableCount = zoneSeats.filter((s) => s.status === 'AVAILABLE').length;
  const reservedCount = zoneSeats.filter((s) => s.status === 'RESERVED').length;
  const soldCount = zoneSeats.filter((s) => s.status === 'SOLD').length;
  const regionId = `zone-${ticketType.mockId}`;

  return {
    id: ticketType.mockId,
    name: ticketType.name,
    price: ticketType.price,
    maxPerUser: ticketType.maxPerUser,
    totalQty: zoneSeats.length,
    soldQty: soldCount,
    reservedQty: reservedCount,
    seatRegions: [
      {
        regionId,
        regionName: ticketType.name,
        seatCount: zoneSeats.length,
        availableCount,
        reservedCount,
        soldCount,
      },
    ],
  };
}

export function getMockSeatMap(concertId: string, options: MockSeatMapOptions = {}): SeatMapData {
  const config =
    (options.concertSlug ? getConcertTicketConfig(options.concertSlug) : undefined) ??
    getDefaultTicketConfig();

  const ticketTypeDefs = options.concertSlug
    ? getActiveTicketTypes(options.concertSlug)
    : config.ticketTypes.filter((t) => t.active);

  const seats: Seat[] = [];
  const ticketTypes: TicketType[] = [];

  ticketTypeDefs.forEach((ticketType, index) => {
    const zoneSeats = generateSeatsForType(concertId, ticketType, index);
    seats.push(...zoneSeats);
    ticketTypes.push(buildTicketTypeEntry(ticketType, zoneSeats));
  });

  return {
    concertId,
    concertName: options.concertName ?? config.title,
    seatMapUrl: '/seat-map.svg',
    ticketTypes,
    seats,
  };
}
