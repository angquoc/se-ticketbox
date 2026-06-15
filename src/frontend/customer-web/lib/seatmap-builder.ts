import { loadSeatmapConfig } from '@/lib/seatmap-config.server';
import { buildSeatMapData } from '@/lib/seatmap-data.server';
import type { TicketTypeInput } from '@/lib/seatmap-data';
import type { SeatMapData } from '@/types/seatmap';
import type { TicketTypeAvailability } from '@/types/order';

interface BuildSeatMapInput {
  concertId: string;
  concertName: string;
  concertSlug?: string;
  venueName?: string;
  seatMapUrl: string | null;
  ticketTypes: TicketTypeAvailability[];
}

function toTicketTypeInput(ticketType: TicketTypeAvailability): TicketTypeInput {
  return {
    id: ticketType.id,
    name: ticketType.name,
    price: ticketType.price,
    maxPerUser: ticketType.maxPerUser,
    totalQty: ticketType.totalQty,
    soldQty: ticketType.soldQty,
    reservedQty: ticketType.reservedQty,
    availableQty: ticketType.availableQty,
  };
}

export async function buildSeatMapFromBackend(
  input: BuildSeatMapInput,
): Promise<SeatMapData | null> {
  const seatmapConfig = input.concertSlug
    ? await loadSeatmapConfig(input.concertSlug)
    : null;

  return buildSeatMapData({
    concertId: input.concertId,
    concertName: input.concertName,
    venueName: input.venueName,
    seatMapUrl: input.seatMapUrl,
    ticketTypes: input.ticketTypes.map(toTicketTypeInput),
    seatmapConfig,
  });
}
