import { Controller, Get, Param } from '@nestjs/common';
import { SeatmapService } from './seatmap.service';

@Controller('concerts/:concertId/seatmap')
export class SeatmapController {
  constructor(private readonly seatmapService: SeatmapService) {}

  /**
   * GET /concerts/:concertId/seatmap
   * Returns seat layout, ticket types with zone availability.
   * Availability cached in Redis for 30s.
   * Public endpoint — no auth required.
   */
  @Get()
  async getSeatmap(@Param('concertId') concertId: string) {
    return this.seatmapService.getSeatmap(concertId);
  }

  /**
   * GET /concerts/:concertId/seatmap/availability
   * Returns real-time zone availability from Redis cache (30s TTL).
   * Public endpoint — no auth required.
   */
  @Get('availability')
  async getAvailability(@Param('concertId') concertId: string) {
    return this.seatmapService.getAvailability(concertId);
  }
}
