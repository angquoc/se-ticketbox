import { Controller, Post, Body, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { CheckinService } from './checkin.service';
import { VerifyTicketDto, SyncCheckinDto } from './dto';
import { AuthGuard } from '../auth/guards/auth.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser, type AuthUser } from '../auth/decorators/current-user.decorator';
import { RateLimitGuard } from '../rate-limit/rate-limit.guard';
import { RateLimit } from '../rate-limit/rate-limit.decorator';
import { RATE_LIMIT_DEFAULTS } from '../rate-limit/rate-limit.service';

@Controller('checkin')
export class CheckinController {
  constructor(private readonly checkinService: CheckinService) {}

  /**
   * POST /checkin/verify
   * Staff/Admin: Scan and verify a ticket QR code.
   * Accepts: ticketId, token (qrTokenHash from QR payload), deviceId, gate (optional)
   *
   * Rate limit: 30 req/min/staff (CHECKIN_VERIFY)
   */
  @Post('verify')
  @UseGuards(AuthGuard, RateLimitGuard)
  @Roles('STAFF', 'ADMIN')
  @RateLimit({
    route: '/checkin/verify',
    capacity: RATE_LIMIT_DEFAULTS.CHECKIN_VERIFY.capacity,
    refillRate: RATE_LIMIT_DEFAULTS.CHECKIN_VERIFY.refillRate,
    tokensPerRequest: RATE_LIMIT_DEFAULTS.CHECKIN_VERIFY.tokensPerRequest,
  })
  @HttpCode(HttpStatus.OK)
  async verifyTicket(
    @Body() dto: VerifyTicketDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.checkinService.verifyAndCheckin(dto, user.sub);
  }

  /**
   * POST /checkin/sync
   * Staff/Admin: Sync a batch of offline check-in records from the mobile app.
   * Accepts an array of records, each with offlineEventId + deviceId for idempotency.
   *
   * Rate limit: 10 req/min/staff (CHECKIN_SYNC)
   */
  @Post('sync')
  @UseGuards(AuthGuard, RateLimitGuard)
  @Roles('STAFF', 'ADMIN')
  @RateLimit({
    route: '/checkin/sync',
    capacity: RATE_LIMIT_DEFAULTS.CHECKIN_SYNC.capacity,
    refillRate: RATE_LIMIT_DEFAULTS.CHECKIN_SYNC.refillRate,
    tokensPerRequest: RATE_LIMIT_DEFAULTS.CHECKIN_SYNC.tokensPerRequest,
  })
  @HttpCode(HttpStatus.OK)
  async syncCheckin(
    @Body() dto: SyncCheckinDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.checkinService.syncCheckin(dto, user.sub);
  }
}
