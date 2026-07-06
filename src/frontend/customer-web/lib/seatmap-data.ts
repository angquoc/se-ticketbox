import type { ResolvedSeatmapConfig } from '@/lib/seatmap-config';
import type { SeatMapData, ZoneStatus } from '@/types/seatmap';

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
  venueName?: string;
  seatMapUrl?: string | null;
  ticketTypes: TicketTypeInput[];
  seatmapConfig?: ResolvedSeatmapConfig | null;
}

export function zoneIdForTicketType(ticketTypeId: string): string {
  return `zone-${ticketTypeId}`;
}

export function deriveZoneStatus(
  availableCount: number,
  reservedCount: number,
): ZoneStatus {
  if (availableCount <= 0) return 'SOLD_OUT';
  if (reservedCount > 0 && availableCount <= reservedCount) return 'RESERVED';
  return 'AVAILABLE';
}

export function applyZoneAvailabilityUpdates(
  data: SeatMapData,
  updates: Array<{
    ticketTypeId: string;
    zoneId: string;
    status: ZoneStatus;
    availableCount: number;
    reservedCount?: number;
    soldCount?: number;
  }>,
): SeatMapData {
  if (updates.length === 0) return data;

  const updateMap = new Map(
    updates.map((update) => [`${update.ticketTypeId}:${update.zoneId}`, update]),
  );

  return {
    ...data,
    ticketTypes: data.ticketTypes.map((ticketType) => ({
      ...ticketType,
      zones: ticketType.zones.map((zone) => {
        const update = updateMap.get(`${ticketType.id}:${zone.zoneId}`);
        if (!update) return zone;

        return {
          ...zone,
          status: update.status,
          availableCount: update.availableCount,
          reservedCount: update.reservedCount ?? zone.reservedCount,
          soldCount: update.soldCount ?? zone.soldCount,
        };
      }),
    })),
  };
}

export interface SocketZoneStatusUpdate {
  ticketTypeId: string;
  zoneId: string;
  oldStatus?: string;
  newStatus: string;
  availableCount: number;
  reservedCount?: number;
  soldCount?: number;
  timestamp?: string;
  updatedAt?: string;
}

export function mapSocketZoneUpdates(
  updates: SocketZoneStatusUpdate[],
): Array<{
  ticketTypeId: string;
  zoneId: string;
  status: ZoneStatus;
  availableCount: number;
  reservedCount?: number;
  soldCount?: number;
}> {
  return updates.map((update) => ({
    ticketTypeId: update.ticketTypeId,
    zoneId: update.zoneId,
    status: update.newStatus as ZoneStatus,
    availableCount: update.availableCount,
    reservedCount: update.reservedCount,
    soldCount: update.soldCount,
  }));
}

export function collectZoneAvailabilityUpdates(data: SeatMapData) {
  const updates = [];
  for (const ticketType of data.ticketTypes) {
    for (const zone of ticketType.zones) {
      updates.push({
        ticketTypeId: ticketType.id,
        zoneId: zone.zoneId,
        status: zone.status,
        availableCount: zone.availableCount,
        reservedCount: zone.reservedCount,
        soldCount: zone.soldCount,
        updatedAt: new Date().toISOString(),
      });
    }
  }
  return updates;
}
