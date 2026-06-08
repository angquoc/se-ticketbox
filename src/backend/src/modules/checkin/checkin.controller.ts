import { Controller, Post, Body, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { CheckinService } from './checkin.service';
import { VerifyTicketDto, SyncCheckinDto } from './dto';
import { AuthGuard } from '../auth/guards/auth.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser, type AuthUser } from '../auth/decorators/current-user.decorator';

@Controller('checkin')
@UseGuards(AuthGuard)
export class CheckinController {
  constructor(private readonly checkinService: CheckinService) {}

  /**
   * POST /checkin/verify
   * Staff/Admin: Scan and verify a ticket QR code.
   * Accepts: ticketId, token (qrTokenHash from QR payload), deviceId, gate (optional)
   */
  @Post('verify')
  @Roles('STAFF', 'ADMIN')
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
   */
  @Post('sync')
  @Roles('STAFF', 'ADMIN')
  @HttpCode(HttpStatus.OK)
  async syncCheckin(
    @Body() dto: SyncCheckinDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.checkinService.syncCheckin(dto, user.sub);
  }
}
