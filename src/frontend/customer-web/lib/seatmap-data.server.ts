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

function groupSvgZonesByTicketType(zones: ParsedSvgZone[]): Map<string, ParsedSvgZone[]> {
  const grouped = new Map<string, ParsedSvgZone[]>();
  for (const zone of zones) {
    const name = normalizeName(zone.ticketTypeName);
    if (!grouped.has(name)) {
      grouped.set(name, []);
    }
    grouped.get(name)!.push(zone);
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
    const parsedZones = svgZonesByTicketType.get(normalizeName(ticketType.name)) ?? [];
    
    const zonesList: Zone[] = [];
    if (parsedZones.length > 0) {
      for (const pz of parsedZones) {
        zonesList.push(buildZone(ticketType, pz));
      }
    } else {
      zonesList.push(buildZone(ticketType, null));
    }

    ticketTypes.push({
      id: ticketType.id,
      name: ticketType.name,
      price: ticketType.price,
      maxPerUser: ticketType.maxPerUser,
      totalQty: ticketType.totalQty,
      soldQty: ticketType.soldQty,
      reservedQty: ticketType.reservedQty,
      zones: zonesList,
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
