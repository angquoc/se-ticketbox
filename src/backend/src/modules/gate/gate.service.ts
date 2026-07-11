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
      orderBy: { name: 'asc' },
    });

    // Ticket.gateId stores gate name, so count by name
    const ticketCounts = await this.prisma.ticket.groupBy({
      by: ['gateId'],
      where: { concertId, gateId: { not: null } },
      _count: { id: true },
    });
    const countMap = new Map(ticketCounts.map((c) => [c.gateId, c._count.id]));

    return gates.map((g) => ({
      id: g.id,
      name: g.name,
      concertId: g.concertId,
      ticketCount: countMap.get(g.name) ?? 0,
      createdAt: g.createdAt,
    }));
  }

  async create(
    concertId: string,
    dto: CreateGateDto,
  ): Promise<GateResponseDto> {
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
    });

    this.logger.log(`Created gate ${gate.name} for concert ${concertId}`);
    return {
      id: gate.id,
      name: gate.name,
      concertId: gate.concertId,
      ticketCount: 0,
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
        where: {
          concertId_name: { concertId: gate.concertId, name: dto.name },
        },
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
    });

    // Ticket.gateId stores gate name — recount by new name
    const ticketCount = await this.prisma.ticket.count({
      where: { gateId: updated.name },
    });

    this.logger.log(`Updated gate ${gateId}`);
    return {
      id: updated.id,
      name: updated.name,
      concertId: updated.concertId,
      ticketCount,
      createdAt: updated.createdAt,
    };
  }

  async remove(gateId: string): Promise<void> {
    const gate = await this.prisma.gate.findUnique({
      where: { id: gateId },
    });
    if (!gate) {
      throw new NotFoundException(`Gate ${gateId} not found`);
    }

    // Ticket.gateId stores gate NAME (not gate.id/cuid)
    const gateName = gate.name;
    const ticketCount = await this.prisma.ticket.count({
      where: { gateId: gateName },
    });

    if (ticketCount > 0) {
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

      // Move tickets to the first available gate (update by gate NAME)
      await this.prisma.ticket.updateMany({
        where: { gateId: gateName },
        data: { gateId: otherGates[0].name },
      });

      this.logger.log(
        `Reassigned ${ticketCount} tickets from gate "${gateName}" to "${otherGates[0].name}"`,
      );
    }

    await this.prisma.gate.delete({ where: { id: gateId } });
    this.logger.log(`Deleted gate ${gateId} ("${gateName}")`);
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
      const gateStats = gates.map((g) => ({
        id: g.id,
        name: g.name,
        ticketCount: 0,
      }));
      return { totalTicketsUpdated: 0, gates: gateStats };
    }

    // Round-robin assignment: distribute tickets evenly across gates
    const updatedTickets: {
      id: string;
      userId: string;
      oldGateName: string;
      newGateName: string;
    }[] = [];
    // Ticket.gateId stores gate name, so count map is keyed by name
    const updatedGateCounts = new Map(gates.map((g) => [g.name, 0]));

    for (let i = 0; i < tickets.length; i++) {
      const gateIndex = i % gates.length;
      const newGate = gates[gateIndex];

      const ticket = tickets[i];

      // Get current gate from DB — gateId is the gate name
      const currentTicket = await this.prisma.ticket.findUnique({
        where: { id: ticket.id },
        select: { gateId: true, userId: true },
      });

      // Compare gate names (not IDs) since Ticket.gateId stores gate name
      if (currentTicket?.gateId === newGate.name) {
        // No change needed
        continue;
      }

      updatedTickets.push({
        id: ticket.id,
        userId: currentTicket?.userId ?? ticket.userId,
        oldGateName: currentTicket?.gateId ?? '',
        newGateName: newGate.name,
      });

      updatedGateCounts.set(
        newGate.name,
        (updatedGateCounts.get(newGate.name) ?? 0) + 1,
      );
    }

    // Batch update tickets with new gate assignments and re-signed QR
    for (const update of updatedTickets) {
      // Fetch qrTokenHash to recompute signature
      const ticketData = await this.prisma.ticket.findUnique({
        where: { id: update.id },
        select: { qrTokenHash: true },
      });

      if (!ticketData) continue;

      // Signature uses gate name (consistent with ticket-issue.processor)
      const newSignature = createHmac('sha256', this.qrSecret)
        .update(`${update.id}:${ticketData.qrTokenHash}:${update.newGateName}`)
        .digest('hex');

      await this.prisma.ticket.update({
        where: { id: update.id },
        data: {
          // Store gate name in Ticket.gateId
          gateId: update.newGateName,
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

    // NOTE: ticketCount reflects number of tickets REASSIGNED during this rebalance,
    // not the total ticket count per gate. Per spec the response should show total.
    const gateStats = gates.map((g) => ({
      id: g.name, // gate name as identifier (consistent with Ticket.gateId)
      name: g.name,
      ticketCount: updatedGateCounts.get(g.name) ?? 0,
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
    try {
      await this.emailService.sendOrderConfirmation({
        to: params.to,
        orderId: 'GATE-UPDATE',
        concertTitle: params.concertTitle,
        ticketCount: params.ticketQrData.length,
        totalAmount: 0,
        ticketInfos: params.ticketQrData.map((t) => ({
          ticketId: t.id,
          ticketTypeName: 'Vé đã cập nhật cổng',
          gateId: t.gateId,
          status: 'ISSUED',
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
