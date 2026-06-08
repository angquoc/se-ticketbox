import { loadSeatmapConfig } from '@/lib/seatmap-config.server';
import { buildSeatMapData } from '@/lib/seat-layout';
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

  const ticketTypeInputs = [];

  if (seatmapConfig && seatmapConfig.zonesByTicketTypeName.size > 0) {
    for (const zone of seatmapConfig.zonesByTicketTypeName.values()) {
      if (!zone.ticketTypeName) continue;
      const capacity = zone.layout.rows * zone.layout.cols;
      const inventory = estimateMockInventory(capacity);
      ticketTypeInputs.push({
        id: zone.ticketTypeName,
        name: zone.ticketTypeName,
        price: 1_000_000,
        maxPerUser: 4,
        ...inventory,
      });
    }
  } else if (seatmapConfig && seatmapConfig.templateZones.length > 0) {
    seatmapConfig.templateZones.forEach((zone, index) => {
      const capacity = zone.layout.rows * zone.layout.cols;
      const inventory = estimateMockInventory(capacity);
      const name = zone.seatPrefix ? `Zone ${zone.seatPrefix}` : `Zone ${index + 1}`;
      ticketTypeInputs.push({
        id: name,
        name,
        price: 1_000_000,
        maxPerUser: 4,
        ...inventory,
      });
    });
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

  const seatMap = buildSeatMapData({
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
