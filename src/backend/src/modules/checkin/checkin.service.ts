import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../database/prisma.service';
import { TicketStatus, CheckinStatus } from '@prisma/client';
import { createHash, createHmac } from 'crypto';
import {
  VerifyTicketDto,
  VerifyTicketResponseDto,
  SyncCheckinDto,
  SyncCheckinResponseDto,
  SyncCheckinResultDto,
} from './dto';

/**
 * Recomputes the HMAC-SHA256 signature for a ticket.
 * Must stay in sync with generateQrToken() in ticket-issue.processor.ts.
 * QR payload format v2: {ticketId}:{qrTokenHash}:{gateId}
 * NOTE: gateId used in signature = Gate.name (not Gate.id/cuid).
 *       This is consistent with Ticket.gateId which stores gate name.
 */
function recomputeSignature(
  ticketId: string,
  qrTokenHash: string,
  gateId: string,
  secret: string,
): string {
  return createHmac('sha256', secret)
    .update(`${ticketId}:${qrTokenHash}:${gateId}`)
    .digest('hex');
}

@Injectable()
export class CheckinService {
  private readonly logger = new Logger(CheckinService.name);
  private readonly qrSecret: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {
    this.qrSecret = this.configService.get<string>(
      'QR_SIGNATURE_SECRET',
      'dev_qr_secret',
    );
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  /**
   * POST /checkin/verify
   * Staff: Verify and check-in a ticket using QR token hash.
   *
   * Steps:
   * 1. Extract staffId from JWT (provided by controller).
   * 2. Hash the token from the request.
   * 3. Find ticket by ticketId.
   * 4. Compare hash with stored qrTokenHash in DB.
   * 5. Atomic update: SET status = CHECKED_IN WHERE status = ISSUED.
   * 6. If affected rows = 0 → ALREADY_CHECKED_IN or INVALID_TICKET.
   * 7. Log success/failure to CheckinLog.
   */
  async verifyAndCheckin(
    dto: VerifyTicketDto,
    staffId: string,
  ): Promise<VerifyTicketResponseDto> {
    const tokenHash = this.hashToken(dto.token);

    // Step 1-3: Find ticket by ticketId
    const ticket = await this.prisma.ticket.findUnique({
      where: { id: dto.ticketId },
      select: {
        id: true,
        concertId: true,
        ticketType: { select: { name: true } },
        gateId: true,
        qrTokenHash: true,
        qrSignature: true,
      },
    });

    if (!ticket) {
      // Log failed attempt — invalid ticket
      await this.logCheckinAttempt({
        ticketId: dto.ticketId,
        staffId,
        deviceId: dto.deviceId,
        gate: dto.gateId,
        status: CheckinStatus.INVALID_TICKET,
        reason: `Ticket ${dto.ticketId} not found`,
      });
      throw new NotFoundException('Vé không tồn tại');
    }

    // Gate mismatch check: verify the QR's assigned gate matches this device's gate
    // NOTE: ticket.gateId stores gate name (e.g. "GATE-A"), matching the PWA device config
    if (dto.gateId && ticket.gateId && dto.gateId !== ticket.gateId) {
      await this.logCheckinAttempt({
        ticketId: dto.ticketId,
        staffId,
        deviceId: dto.deviceId,
        gate: dto.gateId,
        status: CheckinStatus.GATE_MISMATCH,
        reason: `Gate mismatch: ticket assigned to ${ticket.gateId}, device at ${dto.gateId}`,
      });
      throw new BadRequestException(
        `Vé này thuộc cổng ${ticket.gateId}, bạn đang ở cổng khác`,
      );
    }

    // Step 4a: Verify HMAC signature (tamper detection)
    // Only verify if qrSignature is present (tickets created with new flow)
    if (ticket.qrSignature) {
      const expectedSig = recomputeSignature(
        ticket.id,
        ticket.qrTokenHash,
        ticket.gateId ?? '',
        this.qrSecret,
      );
      if (expectedSig !== ticket.qrSignature) {
        await this.logCheckinAttempt({
          ticketId: dto.ticketId,
          staffId,
          deviceId: dto.deviceId,
          gate: dto.gateId,
          status: CheckinStatus.INVALID_TICKET,
          reason:
            'HMAC signature mismatch — ticket may have been tampered with',
        });
        throw new BadRequestException('Mã QR không hợp lệ');
      }
    }

    // Step 4b: Compare token hash
    if (ticket.qrTokenHash !== tokenHash) {
      await this.logCheckinAttempt({
        ticketId: dto.ticketId,
        staffId,
        deviceId: dto.deviceId,
        gate: dto.gateId,
        status: CheckinStatus.INVALID_TICKET,
        reason: 'Token hash mismatch',
      });
      throw new BadRequestException('Mã QR không hợp lệ');
    }

    // Step 5-6: Atomic update — only succeeds if status is ISSUED
    const result = await this.prisma.ticket.updateMany({
      where: {
        id: dto.ticketId,
        status: TicketStatus.ISSUED,
      },
      data: {
        status: TicketStatus.CHECKED_IN,
        checkedInAt: new Date(),
      },
    });

    if (result.count === 0) {
      // Ticket exists and hash matches, but status is not ISSUED → already checked in
      const currentTicket = await this.prisma.ticket.findUnique({
        where: { id: dto.ticketId },
        select: { status: true },
      });

      const reason =
        currentTicket?.status === TicketStatus.CHECKED_IN
          ? 'Ticket already checked in'
          : `Ticket status is ${currentTicket?.status}`;

      await this.logCheckinAttempt({
        ticketId: dto.ticketId,
        staffId,
        deviceId: dto.deviceId,
        gate: dto.gateId,
        status: CheckinStatus.ALREADY_CHECKED_IN,
        reason,
      });
      throw new BadRequestException('Vé đã được check-in trước đó');
    }

    // Step 7: Log success
    await this.logCheckinAttempt({
      ticketId: dto.ticketId,
      staffId,
      concertId: ticket.concertId,
      deviceId: dto.deviceId,
      gate: dto.gateId,
      status: CheckinStatus.SUCCESS,
    });

    this.logger.log(
      `Check-in SUCCESS: ticket=${dto.ticketId} staff=${staffId} device=${dto.deviceId} gate=${dto.gateId ?? 'N/A'}`,
    );

    return {
      success: true,
      ticketId: ticket.id,
      concertId: ticket.concertId,
      ticketTypeName: ticket.ticketType.name,
      status: TicketStatus.CHECKED_IN,
      message: 'Check-in thành công',
    };
  }

  /**
   * POST /checkin/sync
   * Staff: Sync a batch of offline check-in records from the mobile app.
   *
   * Each record is processed independently:
   * 1. Check idempotency via (deviceId, offlineEventId) unique constraint.
   *    If the pair already exists in CheckinLog → skip (idempotent).
   * 2. Hash the token and find the ticket.
   * 3. Atomic update: SET status = CHECKED_IN WHERE status = ISSUED.
   * 4. Log success or conflict to CheckinLog.
   *
   * Designed for offline-first PWA: mobile generates a unique offlineEventId per
   * scan so the same record can be retried safely without creating duplicates.
   */
  async syncCheckin(
    dto: SyncCheckinDto,
    staffId: string,
  ): Promise<SyncCheckinResponseDto> {
    const results: SyncCheckinResultDto[] = [];
    let success = 0;
    let failed = 0;
    let conflicts = 0;

    for (const record of dto.records) {
      const result = await this.processSyncRecord(record, staffId);
      results.push(result);
      if (result.success && !result.conflict) success++;
      else if (result.conflict) conflicts++;
      else failed++;
    }

    this.logger.log(
      `Sync completed: total=${dto.records.length} success=${success} conflicts=${conflicts} failed=${failed}`,
    );

    return { total: dto.records.length, success, failed, conflicts, results };
  }

  private async processSyncRecord(
    record: SyncCheckinDto['records'][number],
    staffId: string,
  ): Promise<SyncCheckinResultDto> {
    const tokenHash = this.hashToken(record.token);

    // Idempotency: check if (deviceId, offlineEventId) already logged
    const existingLog = await this.prisma.checkinLog.findUnique({
      where: {
        deviceId_offlineEventId: {
          deviceId: record.deviceId,
          offlineEventId: record.offlineEventId,
        },
      },
    });

    if (existingLog) {
      this.logger.debug(
        `Skipping duplicate sync record: device=${record.deviceId} offlineEventId=${record.offlineEventId}`,
      );
      return {
        ticketId: record.ticketId,
        offlineEventId: record.offlineEventId,
        success: true,
        status: existingLog.status,
        conflict: existingLog.conflict,
        message: 'Bản ghi đã được đồng bộ trước đó (idempotent)',
      };
    }

    // Find ticket
    const ticket = await this.prisma.ticket.findUnique({
      where: { id: record.ticketId },
      select: {
        id: true,
        concertId: true,
        ticketType: { select: { name: true } },
        gateId: true,
        qrTokenHash: true,
        qrSignature: true,
      },
    });

    if (!ticket) {
      await this.logCheckinAttempt({
        ticketId: record.ticketId,
        staffId,
        deviceId: record.deviceId,
        gate: record.gateId,
        offlineEventId: record.offlineEventId,
        status: CheckinStatus.INVALID_TICKET,
        reason: `Ticket ${record.ticketId} not found`,
        isOffline: true,
      });
      return {
        ticketId: record.ticketId,
        offlineEventId: record.offlineEventId,
        success: false,
        status: CheckinStatus.INVALID_TICKET,
        conflict: false,
        message: 'Vé không tồn tại',
      };
    }

    // Gate mismatch check for offline sync: verify the device's gate matches the ticket's gate
    // NOTE: ticket.gateId stores gate name (e.g. "GATE-A"), matching the PWA device config
    if (record.gateId && ticket.gateId && record.gateId !== ticket.gateId) {
      await this.logCheckinAttempt({
        ticketId: record.ticketId,
        staffId,
        deviceId: record.deviceId,
        gate: record.gateId,
        offlineEventId: record.offlineEventId,
        status: CheckinStatus.GATE_MISMATCH,
        reason: `Offline gate mismatch: ticket assigned to ${ticket.gateId}, device at ${record.gateId}`,
        isOffline: true,
      });
      return {
        ticketId: record.ticketId,
        offlineEventId: record.offlineEventId,
        success: false,
        status: CheckinStatus.GATE_MISMATCH,
        conflict: false,
        message: `Vé này thuộc cổng ${ticket.gateId}, bạn đang ở cổng khác`,
      };
    }

    // Verify HMAC signature (tamper detection) — only if ticket has signature
    if (ticket.qrSignature) {
      const expectedSig = recomputeSignature(
        ticket.id,
        ticket.qrTokenHash,
        ticket.gateId ?? '',
        this.qrSecret,
      );
      if (expectedSig !== ticket.qrSignature) {
        await this.logCheckinAttempt({
          ticketId: record.ticketId,
          staffId,
          deviceId: record.deviceId,
          gate: record.gateId,
          offlineEventId: record.offlineEventId,
          status: CheckinStatus.INVALID_TICKET,
          reason:
            'HMAC signature mismatch — ticket may have been tampered with',
          isOffline: true,
        });
        return {
          ticketId: record.ticketId,
          offlineEventId: record.offlineEventId,
          success: false,
          status: CheckinStatus.INVALID_TICKET,
          conflict: false,
          message: 'Mã QR không hợp lệ',
        };
      }
    }

    // Verify token hash
    if (ticket.qrTokenHash !== tokenHash) {
      await this.logCheckinAttempt({
        ticketId: record.ticketId,
        staffId,
        deviceId: record.deviceId,
        gate: record.gateId,
        offlineEventId: record.offlineEventId,
        status: CheckinStatus.INVALID_TICKET,
        reason: 'Token hash mismatch',
        isOffline: true,
      });
      return {
        ticketId: record.ticketId,
        offlineEventId: record.offlineEventId,
        success: false,
        status: CheckinStatus.INVALID_TICKET,
        conflict: false,
        message: 'Mã QR không hợp lệ',
      };
    }

    // Atomic update
    const updateResult = await this.prisma.ticket.updateMany({
      where: {
        id: record.ticketId,
        status: TicketStatus.ISSUED,
      },
      data: {
        status: TicketStatus.CHECKED_IN,
        checkedInAt: new Date(),
      },
    });

    if (updateResult.count === 0) {
      // Already checked in (possibly by online scan at another gate)
      await this.logCheckinAttempt({
        ticketId: record.ticketId,
        staffId,
        deviceId: record.deviceId,
        gate: record.gateId,
        offlineEventId: record.offlineEventId,
        status: CheckinStatus.REJECTED_CONFLICT,
        reason: 'Ticket already checked in via another device or gate',
        isOffline: true,
        conflict: true,
      });
      return {
        ticketId: record.ticketId,
        offlineEventId: record.offlineEventId,
        success: false,
        status: CheckinStatus.REJECTED_CONFLICT,
        conflict: true,
        message: 'Vé đã được check-in từ thiết bị/cổng khác',
      };
    }

    // Success
    await this.logCheckinAttempt({
      ticketId: record.ticketId,
      staffId,
      concertId: ticket.concertId,
      deviceId: record.deviceId,
      gate: record.gateId,
      offlineEventId: record.offlineEventId,
      status: CheckinStatus.SUCCESS,
      isOffline: true,
    });

    this.logger.log(
      `Sync check-in SUCCESS: ticket=${record.ticketId} staff=${staffId} device=${record.deviceId} offlineEventId=${record.offlineEventId}`,
    );

    return {
      ticketId: record.ticketId,
      offlineEventId: record.offlineEventId,
      success: true,
      status: CheckinStatus.SUCCESS,
      conflict: false,
      message: 'Check-in thành công',
    };
  }

  private logCheckinAttempt(params: {
    ticketId?: string;
    staffId: string;
    concertId?: string;
    deviceId: string;
    gate?: string;
    offlineEventId?: string;
    status: CheckinStatus;
    reason?: string;
    isOffline?: boolean;
    conflict?: boolean;
  }) {
    return this.prisma.checkinLog.create({
      data: {
        ticketId: params.ticketId ?? null,
        staffId: params.staffId,
        concertId: params.concertId ?? null,
        deviceId: params.deviceId,
        gate: params.gate ?? null,
        offlineEventId: params.offlineEventId ?? null,
        status: params.status,
        reason: params.reason ?? null,
        isOffline: params.isOffline ?? false,
        conflict: params.conflict ?? false,
        scannedAt: new Date(),
        syncedAt: params.isOffline ? null : new Date(),
      },
    });
  }
}
