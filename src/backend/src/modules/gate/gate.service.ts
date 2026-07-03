import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../database/prisma.service';
import { EmailService } from '../notification/services/email.service';
import { createHmac } from 'crypto';
import { CreateGateDto, UpdateGateDto, GateResponseDto } from './dto';

@Injectable()
export class GateService {
  private readonly logger = new Logger(GateService.name);
  private readonly qrSecret: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly emailService: EmailService,
  ) {
    this.qrSecret = this.configService.get<string>(
      'QR_SIGNATURE_SECRET',
      'dev_qr_secret',
    );
  }

  async list(concertId: string): Promise<GateResponseDto[]> {
    const gates = await this.prisma.gate.findMany({
      where: { concertId },
      include: {
        _count: { select: { tickets: true } },
      },
      orderBy: { name: 'asc' },
    });

    return gates.map((g) => ({
      id: g.id,
      name: g.name,
      concertId: g.concertId,
      ticketCount: g._count.tickets,
      createdAt: g.createdAt,
    }));
  }

  async create(concertId: string, dto: CreateGateDto): Promise<GateResponseDto> {
    const existing = await this.prisma.gate.findUnique({
      where: { concertId_name: { concertId, name: dto.name } },
    });
    if (existing) {
      throw new ConflictException(
        `Gate "${dto.name}" already exists for this concert`,
      );
    }

    const gate = await this.prisma.gate.create({
      data: { concertId, name: dto.name },
      include: { _count: { select: { tickets: true } } },
    });

    this.logger.log(`Created gate ${gate.name} for concert ${concertId}`);
    return {
      id: gate.id,
      name: gate.name,
      concertId: gate.concertId,
      ticketCount: gate._count.tickets,
      createdAt: gate.createdAt,
    };
  }

  async update(gateId: string, dto: UpdateGateDto): Promise<GateResponseDto> {
    const gate = await this.prisma.gate.findUnique({ where: { id: gateId } });
    if (!gate) {
      throw new NotFoundException(`Gate ${gateId} not found`);
    }

    if (dto.name && dto.name !== gate.name) {
      const existing = await this.prisma.gate.findUnique({
        where: { concertId_name: { concertId: gate.concertId, name: dto.name } },
      });
      if (existing) {
        throw new ConflictException(
          `Gate "${dto.name}" already exists for this concert`,
        );
      }
    }

    const updated = await this.prisma.gate.update({
      where: { id: gateId },
      data: dto,
      include: { _count: { select: { tickets: true } } },
    });

    this.logger.log(`Updated gate ${gateId}`);
    return {
      id: updated.id,
      name: updated.name,
      concertId: updated.concertId,
      ticketCount: updated._count.tickets,
      createdAt: updated.createdAt,
    };
  }

  async remove(gateId: string): Promise<void> {
    const gate = await this.prisma.gate.findUnique({
      where: { id: gateId },
      include: { _count: { select: { tickets: true } } },
    });
    if (!gate) {
      throw new NotFoundException(`Gate ${gateId} not found`);
    }

    if (gate._count.tickets > 0) {
      // Re-assign tickets to another gate before deletion
      const otherGates = await this.prisma.gate.findMany({
        where: { concertId: gate.concertId, id: { not: gateId } },
        orderBy: { name: 'asc' },
      });

      if (otherGates.length === 0) {
        throw new BadRequestException(
          'Cannot delete the last gate while tickets are assigned to it. Create another gate first.',
        );
      }

      // Move tickets to the first available gate
      await this.prisma.ticket.updateMany({
        where: { gateId },
        data: { gateId: otherGates[0].id },
      });

      this.logger.log(
        `Reassigned ${gate._count.tickets} tickets from gate ${gateId} to ${otherGates[0].id}`,
      );
    }

    await this.prisma.gate.delete({ where: { id: gateId } });
    this.logger.log(`Deleted gate ${gateId}`);
  }

  /**
   * Rebalance all issued tickets across available gates for a concert.
   * Sends updated QR codes to affected customers.
   */
  async rebalance(concertId: string): Promise<{
    totalTicketsUpdated: number;
    gates: { id: string; name: string; ticketCount: number }[];
  }> {
    const concert = await this.prisma.concert.findUnique({
      where: { id: concertId },
      select: { title: true },
    });
    if (!concert) {
      throw new NotFoundException(`Concert ${concertId} not found`);
    }

    const gates = await this.prisma.gate.findMany({
      where: { concertId },
      orderBy: { name: 'asc' },
    });
    if (gates.length === 0) {
      throw new BadRequestException('No gates configured for this concert');
    }

    const tickets = await this.prisma.ticket.findMany({
      where: {
        concertId,
        status: 'ISSUED',
      },
      select: { id: true, userId: true },
      orderBy: { createdAt: 'asc' },
    });

    if (tickets.length === 0) {
      const gateStats = gates.map((g) => ({ id: g.id, name: g.name, ticketCount: 0 }));
      return { totalTicketsUpdated: 0, gates: gateStats };
    }

    // Round-robin assignment: distribute tickets evenly across gates
    const updatedTickets: { id: string; userId: string; oldGateId: string; newGateId: string }[] = [];
    const updatedGateCounts = new Map(gates.map((g) => [g.id, 0]));

    for (let i = 0; i < tickets.length; i++) {
      const gateIndex = i % gates.length;
      const newGate = gates[gateIndex];

      const ticket = tickets[i];

      // Get current gate from DB
      const currentTicket = await this.prisma.ticket.findUnique({
        where: { id: ticket.id },
        select: { gateId: true, userId: true },
      });

      if (currentTicket?.gateId === newGate.id) {
        // No change needed
        continue;
      }

      updatedTickets.push({
        id: ticket.id,
        userId: currentTicket?.userId ?? ticket.userId,
        oldGateId: currentTicket?.gateId ?? '',
        newGateId: newGate.id,
      });

      updatedGateCounts.set(newGate.id, (updatedGateCounts.get(newGate.id) ?? 0) + 1);
    }

    // Batch update tickets with new gate assignments and re-signed QR
    for (const update of updatedTickets) {
      // Fetch qrTokenHash to recompute signature
      const ticketData = await this.prisma.ticket.findUnique({
        where: { id: update.id },
        select: { qrTokenHash: true },
      });

      if (!ticketData) continue;

      const newSignature = createHmac('sha256', this.qrSecret)
        .update(`${update.id}:${ticketData.qrTokenHash}:${update.newGateId}`)
        .digest('hex');

      await this.prisma.ticket.update({
        where: { id: update.id },
        data: {
          gateId: update.newGateId,
          qrSignature: newSignature,
        },
      });
    }

    // Collect user emails for tickets that changed gate
    const changedUserIds = [...new Set(updatedTickets.map((t) => t.userId))];
    const users = await this.prisma.user.findMany({
      where: { id: { in: changedUserIds } },
      select: { id: true, email: true },
    });
    const userMap = new Map(users.map((u) => [u.id, u.email]));

    // Get updated tickets with raw token for QR generation
    const updatedTicketIds = updatedTickets.map((t) => t.id);
    const updatedTicketData = await this.prisma.ticket.findMany({
      where: { id: { in: updatedTicketIds } },
      select: { id: true, qrRawToken: true, gateId: true, userId: true },
    });

    // Group by user and send notification emails
    const ticketsByUser = new Map<string, typeof updatedTicketData>();
    for (const t of updatedTicketData) {
      const list = ticketsByUser.get(t.userId) ?? [];
      list.push(t);
      ticketsByUser.set(t.userId, list);
    }

    for (const [userId, userTickets] of ticketsByUser) {
      const email = userMap.get(userId);
      if (!email) continue;

      const ticketQrData = userTickets.map((t) => ({
        id: t.id,
        rawToken: t.qrRawToken,
        gateId: t.gateId ?? '',
      }));

      await this.sendGateUpdateNotification({
        to: email,
        concertTitle: concert.title,
        ticketQrData,
      });
    }

    const gateStats = gates.map((g) => ({
      id: g.id,
      name: g.name,
      ticketCount: updatedGateCounts.get(g.id) ?? 0,
    }));

    this.logger.log(
      `Rebalanced ${updatedTickets.length} tickets across ${gates.length} gates for concert ${concertId}`,
    );

    return {
      totalTicketsUpdated: updatedTickets.length,
      gates: gateStats,
    };
  }

  private async sendGateUpdateNotification(params: {
    to: string;
    concertTitle: string;
    ticketQrData: { id: string; rawToken: string; gateId: string }[];
  }): Promise<void> {
    const ticketListHtml = params.ticketQrData
      .map((t, i) => {
        const gateName = t.gateId; // gate name from the ticket
        return `
      <div class="ticket-item">
        <div class="ticket-number">Ticket ${i + 1}</div>
        <div class="ticket-id">ID: ${t.id.slice(0, 8).toUpperCase()}</div>
        <div class="ticket-gate">Cổng: <strong>${gateName}</strong></div>
      </div>
    `;
      })
      .join(
        '<hr style="border:none;border-top:1px solid #e0e0e0;margin:10px 0;"/>',
      );

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <style>
    body { font-family: Arial, sans-serif; background: #f5f5f5; margin: 0; padding: 20px; }
    .container { background: white; border-radius: 8px; padding: 32px; max-width: 600px; margin: auto; }
    h1 { color: #1a1a1a; font-size: 24px; }
    .highlight { color: #2563eb; font-weight: bold; }
    .ticket-card { background: #f0f7ff; border-radius: 6px; padding: 16px; margin: 16px 0; }
    .ticket-item { margin-bottom: 8px; }
    .ticket-number { color: #1a1a1a; font-size: 14px; font-weight: bold; }
    .ticket-gate { color: #444; font-size: 13px; }
    .ticket-id { color: #888; font-size: 12px; font-family: monospace; }
    .cta-button { display: inline-block; background: #2563eb; color: white !important; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: bold; font-size: 14px; margin: 16px 0; }
    .footer { margin-top: 24px; font-size: 12px; color: #999; text-align: center; }
  </style>
</head>
<body>
  <div class="container">
    <h1>Thông Tin Cổng Check-in Đã Được Cập Nhật</h1>
    <p>Xin chào!</p>
    <p>Thông tin cổng check-in cho các vé của bạn tại <strong>${params.concertTitle}</strong> đã được cập nhật. Vui lòng kiểm tra thông tin bên dưới.</p>

    <div class="ticket-card">
      <div style="color:#666;font-size:12px;text-transform:uppercase;margin-bottom:8px;">Vé Của Bạn</div>
      ${ticketListHtml}
    </div>

    <p>
      <a class="cta-button" href="${'http://localhost:3000/my-tickets'}">Xem Vé Của Tôi</a>
    </p>

    <p style="color:#555;font-size:13px;line-height:1.6;">
      Nếu bạn cần hỗ trợ, vui lòng liên hệ với chúng tôi qua email hoặc hotline hỗ trợ.
    </p>

    <div class="footer">
      <p>TicketBox — Your event ticketing platform</p>
    </div>
  </div>
</body>
</html>`;

    try {
      await this.emailService.sendOrderConfirmation({
        to: params.to,
        orderId: 'GATE-UPDATE',
        concertTitle: params.concertTitle,
        ticketCount: params.ticketQrData.length,
        totalAmount: 0,
        ticketInfos: params.ticketQrData.map((t) => ({
          ticketId: t.id,
          ticketTypeName: `Cổng: ${t.gateId}`,
        })),
      });
    } catch (err) {
      this.logger.warn(
        `Failed to send gate update notification to ${params.to}: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
    }
  }
}
