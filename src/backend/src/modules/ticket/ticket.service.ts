import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { TicketStatus } from '@prisma/client';
import {
  TicketResponseDto,
  TicketListResponseDto,
} from './dto/ticket-response.dto';
import { buildQrPayload } from './utils/qr-payload.util';

@Injectable()
export class TicketService {
  private readonly logger = new Logger(TicketService.name);

  constructor(private readonly prisma: PrismaService) {}

  private toTicketResponse(ticket: {
    id: string;
    concertId: string;
    ticketTypeId: string;
    orderId: string;
    status: TicketStatus;
    checkedInAt: Date | null;
    createdAt: Date;
    ticketType: { name: string };
    qrRawToken: string;
  }): TicketResponseDto {
    return {
      id: ticket.id,
      concertId: ticket.concertId,
      ticketTypeId: ticket.ticketTypeId,
      ticketTypeName: ticket.ticketType.name,
      orderId: ticket.orderId,
      status: ticket.status,
      checkedInAt: ticket.checkedInAt,
      createdAt: ticket.createdAt,
      qrPayload: buildQrPayload({ id: ticket.id, rawToken: ticket.qrRawToken }),
    };
  }

  /**
   * GET /tickets/me
   * Customer: List their own tickets with pagination.
   */
  async getMyTickets(
    userId: string,
    page = 1,
    limit = 20,
  ): Promise<TicketListResponseDto> {
    const skip = (page - 1) * limit;

    const [tickets, total] = await Promise.all([
      this.prisma.ticket.findMany({
        where: { userId },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          concertId: true,
          ticketTypeId: true,
          orderId: true,
          status: true,
          checkedInAt: true,
          createdAt: true,
          qrRawToken: true,
          ticketType: { select: { name: true } },
        },
      }),
      this.prisma.ticket.count({ where: { userId } }),
    ]);

    return {
      data: tickets.map((t) => this.toTicketResponse(t)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * GET /tickets/me/:concertId
   * Customer: Get tickets for a specific concert.
   */
  async getMyTicketsForConcert(
    userId: string,
    concertId: string,
  ): Promise<TicketResponseDto[]> {
    const tickets = await this.prisma.ticket.findMany({
      where: { userId, concertId },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        concertId: true,
        ticketTypeId: true,
        orderId: true,
        status: true,
        checkedInAt: true,
        createdAt: true,
        ticketType: { select: { name: true } },
        qrRawToken: true,
      },
    });

    return tickets.map((t) => this.toTicketResponse(t));
  }

  /**
   * GET /tickets/:id
   * Customer: Get ticket detail. Only the ticket owner can view.
   */
  async getTicket(
    ticketId: string,
    userId: string,
  ): Promise<TicketResponseDto> {
    const ticket = await this.prisma.ticket.findUnique({
      where: { id: ticketId },
      select: {
        id: true,
        concertId: true,
        ticketTypeId: true,
        orderId: true,
        status: true,
        checkedInAt: true,
        createdAt: true,
        userId: true,
        qrRawToken: true,
        ticketType: { select: { name: true } },
        concert: { select: { title: true, venue: true, startsAt: true } },
      },
    });

    if (!ticket) {
      throw new NotFoundException(`Ticket "${ticketId}" not found`);
    }

    if (ticket.userId !== userId) {
      throw new ForbiddenException(
        'You do not have permission to view this ticket',
      );
    }

    return {
      id: ticket.id,
      concertId: ticket.concertId,
      ticketTypeId: ticket.ticketTypeId,
      ticketTypeName: ticket.ticketType.name,
      orderId: ticket.orderId,
      status: ticket.status,
      checkedInAt: ticket.checkedInAt,
      createdAt: ticket.createdAt,
      qrPayload: buildQrPayload({ id: ticket.id, rawToken: ticket.qrRawToken }),
    };
  }

  /**
   * GET /tickets/:id/qr
   * Customer: Get QR token data for the ticket.
   * Returns the raw QR token (in production this would be a signed JWT or
   * similar). The frontend uses this to render the QR code.
   */
  async getTicketQrData(
    ticketId: string,
    userId: string,
  ): Promise<{ qrToken: string }> {
    const ticket = await this.prisma.ticket.findUnique({
      where: { id: ticketId },
      select: {
        id: true,
        userId: true,
        qrRawToken: true,
        status: true,
      },
    });

    if (!ticket) {
      throw new NotFoundException(`Ticket "${ticketId}" not found`);
    }

    if (ticket.userId !== userId) {
      throw new ForbiddenException(
        'You do not have permission to view this ticket',
      );
    }

    if (ticket.status !== TicketStatus.ISSUED) {
      throw new ForbiddenException(
        `Ticket is ${ticket.status.toLowerCase()} and cannot be used for check-in`,
      );
    }

    // Return the full QR payload so the frontend can render the QR code directly
    const qrPayload = buildQrPayload({ id: ticket.id, rawToken: ticket.qrRawToken });
    this.logger.debug(`QR data requested for ticket ${ticketId}`);
    return { qrToken: qrPayload };
  }
}
