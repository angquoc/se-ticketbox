import type { Seat, SeatMapData, SeatStatus, TicketType } from '@/types/seatmap';

const CONCERT_NAMES: Record<string, string> = {
  'demo-concert': 'Sơn Tùng M-TP — SKY Tour 2026',
  'concert-001': 'BlackPink — Born Pink World Tour',
};

interface ZoneConfig {
  regionId: string;
  regionName: string;
  ticketTypeId: string;
  ticketTypeName: string;
  price: number;
  maxPerUser: number;
  rows: number;
  cols: number;
  startX: number;
  startY: number;
  colGap: number;
  rowGap: number;
  rowLabels: string[];
}

const ZONES: ZoneConfig[] = [
  {
    regionId: 'vip-floor',
    regionName: 'VIP Floor',
    ticketTypeId: 'tt-vip',
    ticketTypeName: 'VIP',
    price: 500_000,
    maxPerUser: 4,
    rows: 4,
    cols: 10,
    startX: 250,
    startY: 110,
    colGap: 26,
    rowGap: 28,
    rowLabels: ['A', 'B', 'C', 'D'],
  },
  {
    regionId: 'standard',
    regionName: 'Standard',
    ticketTypeId: 'tt-standard',
    ticketTypeName: 'Standard',
    price: 350_000,
    maxPerUser: 6,
    rows: 6,
    cols: 14,
    startX: 130,
    startY: 250,
    colGap: 24,
    rowGap: 26,
    rowLabels: ['E', 'F', 'G', 'H', 'I', 'J'],
  },
  {
    regionId: 'economy',
    regionName: 'Economy',
    ticketTypeId: 'tt-economy',
    ticketTypeName: 'Economy',
    price: 150_000,
    maxPerUser: 8,
    rows: 5,
    cols: 18,
    startX: 60,
    startY: 430,
    colGap: 22,
    rowGap: 24,
    rowLabels: ['K', 'L', 'M', 'N', 'O'],
  },
];

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

function generateSeats(concertId: string): Seat[] {
  const seats: Seat[] = [];

  for (const zone of ZONES) {
    for (let r = 0; r < zone.rows; r++) {
      for (let c = 0; c < zone.cols; c++) {
        const row = zone.rowLabels[r];
        const col = c + 1;
        const prefix =
          zone.ticketTypeId === 'tt-vip' ? 'VIP' : zone.ticketTypeId === 'tt-standard' ? 'STD' : 'ECO';
        const seatNumber = `${prefix}-${row}${col}`;

        seats.push({
          seatNumber,
          regionId: zone.regionId,
          ticketTypeId: zone.ticketTypeId,
          row,
          column: col,
          status: pickStatus(concertId, seatNumber),
          coords: {
            x: zone.startX + c * zone.colGap,
            y: zone.startY + r * zone.rowGap,
          },
        });
      }
    }
  }

  return seats;
}

function buildTicketTypes(seats: Seat[]): TicketType[] {
  return ZONES.map((zone) => {
    const zoneSeats = seats.filter((s) => s.regionId === zone.regionId);
    const availableCount = zoneSeats.filter((s) => s.status === 'AVAILABLE').length;
    const reservedCount = zoneSeats.filter((s) => s.status === 'RESERVED').length;
    const soldCount = zoneSeats.filter((s) => s.status === 'SOLD').length;

    return {
      id: zone.ticketTypeId,
      name: zone.ticketTypeName,
      price: zone.price,
      maxPerUser: zone.maxPerUser,
      totalQty: zoneSeats.length,
      soldQty: soldCount,
      reservedQty: reservedCount,
      seatRegions: [
        {
          regionId: zone.regionId,
          regionName: zone.regionName,
          seatCount: zoneSeats.length,
          availableCount,
          reservedCount,
          soldCount,
        },
      ],
    };
  });
}

export function getMockSeatMap(concertId: string): SeatMapData {
  const seats = generateSeats(concertId);
  const ticketTypes = buildTicketTypes(seats);

  return {
    concertId,
    concertName: CONCERT_NAMES[concertId] ?? `Concert ${concertId}`,
    seatMapUrl: '/seat-map.svg',
    ticketTypes,
    seats,
  };
}

export function getZoneBackgrounds() {
  return [
    { id: 'vip-floor', label: 'VIP', x: 220, y: 88, width: 360, height: 130, color: '#FEF3C7' },
    { id: 'standard', label: 'Standard', x: 100, y: 228, width: 600, height: 175, color: '#DBEAFE' },
    { id: 'economy', label: 'Economy', x: 40, y: 408, width: 720, height: 140, color: '#E0E7FF' },
  ];
}
