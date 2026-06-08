import type { Seat, SeatMapData, SeatStatus, TicketType } from '@/types/seatmap';
import type { TicketTypeAvailability } from '@/types/order';

interface BuildSeatMapInput {
  concertId: string;
  concertName: string;
  seatMapUrl: string | null;
  ticketTypes: TicketTypeAvailability[];
}

const ZONE_COLORS = ['#FEF3C7', '#DBEAFE', '#E0E7FF', '#DCFCE7', '#FCE7F3', '#FFEDD5'];
const MAX_SEATS_PER_TYPE = 80;

function pseudoRandom(seed: string): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash << 5) - hash + seed.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash % 100) / 100;
}

function pickStatus(concertId: string, seatNumber: string, soldRatio: number): SeatStatus {
  const r = pseudoRandom(`${concertId}:${seatNumber}`);
  if (r < soldRatio) return 'SOLD';
  if (r < soldRatio + 0.08) return 'RESERVED';
  return 'AVAILABLE';
}

function slugPrefix(name: string): string {
  const cleaned = name.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
  return cleaned.slice(0, 3) || 'TKT';
}

export function buildSeatMapFromBackend(input: BuildSeatMapInput): SeatMapData | null {
  if (input.ticketTypes.length === 0) return null;

  const seats: Seat[] = [];
  const ticketTypes: TicketType[] = [];
  let zoneIndex = 0;

  for (const ticketType of input.ticketTypes) {
    const capacity = ticketType.totalQty ?? ticketType.availableQty;
    const seatCount = Math.min(Math.max(capacity, 1), MAX_SEATS_PER_TYPE);
    const cols = Math.min(14, Math.max(4, Math.ceil(Math.sqrt(seatCount * 1.4))));
    const rows = Math.ceil(seatCount / cols);
    const regionId = `zone-${ticketType.id}`;
    const regionName = ticketType.name;
    const prefix = slugPrefix(ticketType.name);
    const startX = 60 + (zoneIndex % 2) * 120;
    const startY = 110 + zoneIndex * 130;
    const soldRatio =
      ticketType.availableQty <= 0
        ? 0.85
        : Math.min(0.85, 1 - ticketType.availableQty / (ticketType.availableQty + 10));

    let generated = 0;
    for (let r = 0; r < rows && generated < seatCount; r++) {
      for (let c = 0; c < cols && generated < seatCount; c++) {
        const row = String.fromCharCode(65 + r);
        const col = c + 1;
        const seatNumber = `${prefix}-${row}${col}`;

        seats.push({
          seatNumber,
          regionId,
          ticketTypeId: ticketType.id,
          row,
          column: col,
          status: pickStatus(input.concertId, seatNumber, soldRatio),
          coords: {
            x: startX + c * 24,
            y: startY + r * 26,
          },
        });
        generated += 1;
      }
    }

    const zoneSeats = seats.filter((seat) => seat.regionId === regionId);
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
          regionName,
          seatCount: zoneSeats.length,
          availableCount: zoneSeats.filter((seat) => seat.status === 'AVAILABLE').length,
          reservedCount: zoneSeats.filter((seat) => seat.status === 'RESERVED').length,
          soldCount: zoneSeats.filter((seat) => seat.status === 'SOLD').length,
        },
      ],
    });

    zoneIndex += 1;
  }

  return {
    concertId: input.concertId,
    concertName: input.concertName,
    seatMapUrl: input.seatMapUrl ?? '/seat-map.svg',
    ticketTypes,
    seats,
  };
}

export function getZoneBackgrounds(ticketTypes: TicketType[]) {
  return ticketTypes.flatMap((ticketType, index) => {
    const region = ticketType.seatRegions[0];
    if (!region) return [];
    return [
      {
        id: region.regionId,
        label: ticketType.name,
        x: 30 + (index % 2) * 100,
        y: 88 + index * 130,
        width: 720,
        height: 120,
        color: ZONE_COLORS[index % ZONE_COLORS.length],
      },
    ];
  });
}
