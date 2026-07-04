import { Injectable } from '@nestjs/common';
import { SeatmapGateway } from './seatmap.gateway';
import { SeatmapService, ZoneUpdatePayload } from './seatmap.service';

/**
 * Wrapper that other services use to trigger seatmap WebSocket broadcasts
 * after inventory changes (order creation, payment success, order expiration).
 */
@Injectable()
export class SeatmapBroadcastService {
  constructor(
    private readonly seatmapService: SeatmapService,
    private readonly gateway: SeatmapGateway,
  ) {}

  /**
   * Invalidate cache for a concert's ticket type, recompute availability,
   * and broadcast zone update to all WebSocket subscribers.
   */
  async refreshAndBroadcast(
    concertId: string,
    ticketTypeId: string,
  ): Promise<void> {
    const payload = await this.seatmapService.invalidateAndBroadcast(
      concertId,
      ticketTypeId,
    );

    if (payload) {
      this.gateway.broadcastZoneUpdate(concertId, payload);
    }
  }
}
