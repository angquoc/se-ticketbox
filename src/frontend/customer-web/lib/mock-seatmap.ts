import { DEFAULT_SEATMAP_URL } from '@/lib/seatmap-config';
import { loadSeatmapConfig } from '@/lib/seatmap-config.server';
import { buildSeatMapData } from '@/lib/seat-layout';
import { loadParsedSvgSeats } from '@/lib/seatmap-svg.server';
import { normalizeTicketTypeName } from '@/lib/seat-layout-helpers';
import type { SeatMapData } from '@/types/seatmap';

interface MockSeatMapOptions {
  concertSlug?: string;
  concertName?: string;
}

function estimateMockInventory(capacity: number) {
  return {
    totalQty: capacity,
    soldQty: Math.floor(capacity * 0.35),
    reservedQty: Math.floor(capacity * 0.08),
  };
}

export async function getMockSeatMap(
  concertId: string,
  options: MockSeatMapOptions = {},
): Promise<SeatMapData> {
  const seatmapConfig = options.concertSlug
    ? await loadSeatmapConfig(options.concertSlug)
    : null;

  const seatMapUrl = seatmapConfig?.seatMapUrl ?? DEFAULT_SEATMAP_URL;
  const svgData = await loadParsedSvgSeats(seatMapUrl);

  const ticketTypeInputs = [];

  if (svgData && svgData.seats.length > 0) {
    const counts = new Map<string, number>();
    for (const seat of svgData.seats) {
      const key = normalizeTicketTypeName(seat.ticketTypeName);
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }

    for (const [normalizedName, capacity] of counts.entries()) {
      const sample = svgData.seats.find(
        (seat) => normalizeTicketTypeName(seat.ticketTypeName) === normalizedName,
      );
      const name = sample?.ticketTypeName ?? normalizedName;
      ticketTypeInputs.push({
        id: name,
        name,
        price: 1_000_000,
        maxPerUser: 4,
        ...estimateMockInventory(capacity),
      });
    }
  } else {
    ticketTypeInputs.push({
      id: 'VIP',
      name: 'VIP',
      price: 1_000_000,
      maxPerUser: 4,
      totalQty: 24,
      soldQty: 8,
      reservedQty: 2,
    });
  }

  const seatMap = await buildSeatMapData({
    concertId,
    concertName: options.concertName ?? seatmapConfig?.title ?? 'Concert Demo',
    seatMapUrl: null,
    ticketTypes: ticketTypeInputs,
    seatmapConfig,
  });

  if (!seatMap) {
    throw new Error('Không thể tạo sơ đồ ghế demo');
  }

  return seatMap;
}
