import { DEFAULT_SEATMAP_URL } from '@/lib/seatmap-config';
import { loadSeatmapConfig } from '@/lib/seatmap-config.server';
import { buildSeatMapData } from '@/lib/seatmap-data.server';
import { loadParsedSvgZones } from '@/lib/seatmap-svg.server';
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

function normalizeName(name: string): string {
  return name.trim().toLowerCase();
}

export async function getMockSeatMap(
  concertId: string,
  options: MockSeatMapOptions = {},
): Promise<SeatMapData> {
  const seatmapConfig = options.concertSlug
    ? await loadSeatmapConfig(options.concertSlug)
    : null;

  const seatMapUrl = seatmapConfig?.seatMapUrl ?? DEFAULT_SEATMAP_URL;
  const svgData = await loadParsedSvgZones(seatMapUrl);

  const ticketTypeInputs = [];

  if (svgData && svgData.zones.length > 0) {
    const seen = new Set<string>();
    for (const zone of svgData.zones) {
      const key = normalizeName(zone.ticketTypeName);
      if (seen.has(key)) continue;
      seen.add(key);

      ticketTypeInputs.push({
        id: zone.zoneId,
        name: zone.ticketTypeName,
        price: 1_000_000,
        maxPerUser: 4,
        ...estimateMockInventory(100),
      });
    }
  } else {
    ticketTypeInputs.push({
      id: 'vip',
      name: 'VIP',
      price: 1_000_000,
      maxPerUser: 4,
      totalQty: 100,
      soldQty: 35,
      reservedQty: 8,
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
