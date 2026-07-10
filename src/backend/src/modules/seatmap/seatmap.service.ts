import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { RedisService } from '../redis/redis.service';

const AVAILABILITY_TTL_SEC = 3; // 3 seconds

export interface ZoneAvailability {
  zoneId: string;
  zoneName: string;
  availableCount: number;
  reservedCount: number;
  soldCount: number;
  status: 'AVAILABLE' | 'RESERVED' | 'SOLD_OUT';
}

interface TicketTypeAvailability {
  id: string;
  name: string;
  price: number;
  zones: ZoneAvailability[];
  maxPerUser: number;
  totalQty: number;
  soldQty: number;
  reservedQty: number;
}

export interface SeatmapResponse {
  concertId: string;
  seatMapUrl: string | null;
  venueName: string;
  ticketTypes: TicketTypeAvailability[];
}

export interface ZoneUpdatePayload {
  ticketTypeId: string;
  zoneId: string;
  oldStatus: string;
  newStatus: string;
  availableCount: number;
  timestamp: string;
}

@Injectable()
export class SeatmapService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redisService: RedisService,
  ) {}

  private zoneAvailabilityCacheKey(
    concertId: string,
    ticketTypeId: string,
  ): string {
    return `seatmap:${concertId}:${ticketTypeId}:zones`;
  }

  /**
   * GET /concerts/:concertId/seatmap
   * Returns seat layout, ticket types with zone availability.
   * Availability cached in Redis for 30s, recomputed on cache miss.
   */
  async getSeatmap(concertId: string): Promise<SeatmapResponse> {
    const concert = await this.prisma.concert.findUnique({
      where: { id: concertId },
      select: {
        id: true,
        venue: true,
        seatMapUrl: true,
        status: true,
      },
    });

    if (!concert) {
      throw new NotFoundException('Không tìm thấy concert');
    }

    if (concert.status !== 'PUBLISHED' && concert.status !== 'SALE_OPEN') {
      throw new NotFoundException('Không tìm thấy concert');
    }

    const ticketTypes = await this.prisma.ticketType.findMany({
      where: { concertId },
      orderBy: { price: 'desc' },
    });

    // Parallel fetch of zone availability from Redis cache
    const zoneAvailabilityList = await Promise.all(
      ticketTypes.map(async (tt) => {
        const cached = await this.redisService.get(
          this.zoneAvailabilityCacheKey(concertId, tt.id),
        );

        if (cached) {
          return {
            ticketTypeId: tt.id,
            zones: JSON.parse(cached) as ZoneAvailability[],
          };
        }

        const zones = this.computeZoneAvailability(tt);
        await this.redisService.set(
          this.zoneAvailabilityCacheKey(concertId, tt.id),
          JSON.stringify(zones),
          AVAILABILITY_TTL_SEC,
        );
        return { ticketTypeId: tt.id, zones };
      }),
    );

    const zoneMap = new Map(
      zoneAvailabilityList.map((z) => [z.ticketTypeId, z.zones]),
    );

    return {
      concertId: concert.id,
      seatMapUrl: concert.seatMapUrl,
      venueName: concert.venue,
      ticketTypes: ticketTypes.map((tt) => {
        const zones = zoneMap.get(tt.id) ?? [];
        return {
          id: tt.id,
          name: tt.name,
          price: Number(tt.price),
          zones,
          maxPerUser: tt.maxPerUser,
          totalQty: tt.totalQty,
          soldQty: tt.soldQty,
          reservedQty: tt.reservedQty,
        };
      }),
    };
  }

  /**
   * GET /concerts/:concertId/seatmap/availability
   * Returns real-time availability for all zones.
   * Reads from Redis cache (30s TTL), falls back to DB.
   */
  async getAvailability(
    concertId: string,
  ): Promise<{ updates: ZoneAvailability[] }> {
    const ticketTypes = await this.prisma.ticketType.findMany({
      where: { concertId },
      select: { id: true },
    });

    const allZones: ZoneAvailability[] = [];

    for (const tt of ticketTypes) {
      const cached = await this.redisService.get(
        this.zoneAvailabilityCacheKey(concertId, tt.id),
      );

      if (cached) {
        allZones.push(...(JSON.parse(cached) as ZoneAvailability[]));
      } else {
        const ticketType = await this.prisma.ticketType.findUnique({
          where: { id: tt.id },
        });
        if (ticketType) {
          const zones = this.computeZoneAvailability(ticketType);
          await this.redisService.set(
            this.zoneAvailabilityCacheKey(concertId, tt.id),
            JSON.stringify(zones),
            AVAILABILITY_TTL_SEC,
          );
          allZones.push(...zones);
        }
      }
    }

    return { updates: allZones };
  }

  /**
   * Invalidate zone availability cache after order/payment events and
   * recompute fresh availability.
   *
   * Returns the updated zone payload for WebSocket broadcasting.
   */
  async invalidateAndBroadcast(
    concertId: string,
    ticketTypeId: string,
  ): Promise<ZoneUpdatePayload | null> {
    const ticketType = await this.prisma.ticketType.findUnique({
      where: { id: ticketTypeId },
    });

    if (!ticketType) return null;

    // Read old status before invalidation
    const oldCached = await this.redisService.get(
      this.zoneAvailabilityCacheKey(concertId, ticketTypeId),
    );
    const oldStatus = oldCached
      ? (JSON.parse(oldCached) as ZoneAvailability[])[0]?.status
      : null;

    // Invalidate cache
    await this.redisService.del(
      this.zoneAvailabilityCacheKey(concertId, ticketTypeId),
    );

    // Recompute and re-cache
    const zones = this.computeZoneAvailability(ticketType);
    await this.redisService.set(
      this.zoneAvailabilityCacheKey(concertId, ticketTypeId),
      JSON.stringify(zones),
      AVAILABILITY_TTL_SEC,
    );

    const newStatus = zones[0]?.status;

    if (oldStatus && newStatus && oldStatus !== newStatus) {
      return {
        ticketTypeId,
        zoneId: zones[0]?.zoneId ?? ticketTypeId,
        oldStatus,
        newStatus,
        availableCount: zones[0]?.availableCount ?? 0,
        timestamp: new Date().toISOString(),
      };
    }

    return null;
  }

  /**
   * Compute zone availability from a TicketType row.
   * Models each TicketType as a single synthetic zone.
   * Extensible when a Zone model is added to the schema.
   */
  private computeZoneAvailability(ticketType: {
    id: string;
    name: string;
    totalQty: number;
    soldQty: number;
    reservedQty: number;
  }): ZoneAvailability[] {
    const available =
      ticketType.totalQty - ticketType.soldQty - ticketType.reservedQty;

    let status: ZoneAvailability['status'] = 'AVAILABLE';
    if (available <= 0) status = 'SOLD_OUT';
    else if (ticketType.reservedQty > 0) status = 'RESERVED';

    return [
      {
        zoneId: ticketType.id,
        zoneName: ticketType.name,
        availableCount: Math.max(0, available),
        reservedCount: ticketType.reservedQty,
        soldCount: ticketType.soldQty,
        status,
      },
    ];
  }
}
