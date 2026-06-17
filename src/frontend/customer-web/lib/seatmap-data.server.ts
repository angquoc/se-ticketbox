import { resolveSeatMapUrl, type ResolvedSeatmapConfig } from '@/lib/seatmap-config';
import { loadParsedSvgZones } from '@/lib/seatmap-svg.server';
import type { ParsedSvgZone } from '@/lib/svg-seatmap';
import {
  deriveZoneStatus,
  zoneIdForTicketType,
  type BuildSeatMapOptions,
  type TicketTypeInput,
} from '@/lib/seatmap-data';
import type { SeatMapData, TicketType, Zone } from '@/types/seatmap';

function normalizeName(name: string): string {
  return name.trim().toLowerCase();
}

function buildZone(
  ticketType: TicketTypeInput,
  parsedZone: ParsedSvgZone | null,
): Zone {
  const availableCount =
    ticketType.availableQty ??
    Math.max(0, ticketType.totalQty - ticketType.soldQty - ticketType.reservedQty);

  return {
    zoneId: parsedZone?.zoneId ?? zoneIdForTicketType(ticketType.id),
    zoneName: parsedZone?.zoneName ?? ticketType.name,
    availableCount,
    reservedCount: ticketType.reservedQty,
    soldCount: ticketType.soldQty,
    status: deriveZoneStatus(availableCount, ticketType.reservedQty),
  };
}

function groupSvgZonesByTicketType(zones: ParsedSvgZone[]): Map<string, ParsedSvgZone> {
  const grouped = new Map<string, ParsedSvgZone>();
  for (const zone of zones) {
    grouped.set(normalizeName(zone.ticketTypeName), zone);
  }
  return grouped;
}

export async function buildSeatMapData(
  options: BuildSeatMapOptions,
): Promise<SeatMapData | null> {
  if (options.ticketTypes.length === 0) return null;

  const seatMapUrl = resolveSeatMapUrl(options.seatMapUrl, options.seatmapConfig ?? null);
  const svgData = await loadParsedSvgZones(seatMapUrl);
  const svgZonesByTicketType = groupSvgZonesByTicketType(svgData?.zones ?? []);

  const ticketTypes: TicketType[] = [];

  for (const ticketType of options.ticketTypes) {
    const parsedZone = svgZonesByTicketType.get(normalizeName(ticketType.name)) ?? null;
    const zone = buildZone(ticketType, parsedZone);

    ticketTypes.push({
      id: ticketType.id,
      name: ticketType.name,
      price: ticketType.price,
      maxPerUser: ticketType.maxPerUser,
      totalQty: ticketType.totalQty,
      soldQty: ticketType.soldQty,
      reservedQty: ticketType.reservedQty,
      zones: [zone],
    });
  }

  if (ticketTypes.length === 0) return null;

  return {
    concertId: options.concertId,
    concertName: options.concertName,
    venueName: options.venueName,
    seatMapUrl,
    ticketTypes,
  };
}

export type { BuildSeatMapOptions, TicketTypeInput };
