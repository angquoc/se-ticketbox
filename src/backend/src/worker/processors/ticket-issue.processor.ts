import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { ConfigService } from '@nestjs/config';
import { TICKET_ISSUE_QUEUE } from '../../modules/queue/queue.constants';
import { PrismaService } from '../../database/prisma.service';
import { OrderStatus, Ticket } from '@prisma/client';
import { createHash, createHmac, randomUUID } from 'crypto';

/**
 * Generates a secure QR token for a ticket — same logic as PaymentService.generateQrToken.
 * Uses a local copy to avoid circular dependencies.
 */
function generateQrToken(
  ticketId: string,
  secret: string,
): { rawToken: string; qrTokenHash: string; qrSignature: string } {
  const rawToken = randomUUID();
  const qrTokenHash = createHash('sha256').update(rawToken).digest('hex');
  const signaturePayload = `${ticketId}:${qrTokenHash}`;
  const qrSignature = createHmac('sha256', secret)
    .update(signaturePayload)
    .digest('hex');
  return { rawToken, qrTokenHash, qrSignature };
}

@Processor(TICKET_ISSUE_QUEUE)
export class TicketIssueProcessor extends WorkerHost {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {
    super();
  }

  async process(job: Job<{ orderId: string }>) {
    const { orderId } = job.data;

    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: true,
        tickets: true,
      },
    });

    if (!order) {
      throw new Error(`Order ${orderId} not found`);
    }

    if (order.status !== OrderStatus.PAID) {
      return {
        skipped: true,
        reason: `Order status is ${order.status}`,
      };
    }

    if (order.items.length === 0) {
      console.log('[TicketIssue] Order has no items', {
        orderId: order.id,
        userId: order.userId,
        status: order.status,
      });

      throw new Error(`Order ${order.id} has no order items`);
    }

    if (order.tickets.length > 0) {
      return {
        skipped: true,
        reason: 'Tickets already issued',
        ticketCount: order.tickets.length,
      };
    }

    const qrSecret = this.configService.get<string>(
      'QR_SIGNATURE_SECRET',
      'dev_qr_secret',
    );
    const createdTickets: Ticket[] = [];

    await this.prisma.$transaction(async (tx) => {
      for (const item of order.items) {
        await tx.ticketType.update({
          where: { id: item.ticketTypeId },
          data: {
            soldQty: { increment: item.quantity },
            reservedQty: { decrement: item.quantity },
          },
        });

        await tx.userTicketCounter.upsert({
          where: {
            userId_ticketTypeId: {
              userId: order.userId,
              ticketTypeId: item.ticketTypeId,
            },
          },
          create: {
            userId: order.userId,
            ticketTypeId: item.ticketTypeId,
            paidQty: item.quantity,
            reservedQty: 0,
          },
          update: {
            paidQty: { increment: item.quantity },
            reservedQty: { decrement: item.quantity },
          },
        });

        for (let i = 0; i < item.quantity; i++) {
          const ticketId = randomUUID();
          const { rawToken, qrTokenHash, qrSignature } = generateQrToken(
            ticketId,
            qrSecret,
          );

          const ticket = await tx.ticket.create({
            data: {
              id: ticketId,
              orderId: order.id,
              orderItemId: item.id,
              concertId: order.concertId,
              ticketTypeId: item.ticketTypeId,
              userId: order.userId,
              qrRawToken: rawToken,
              qrTokenHash,
              qrSignature,
            },
          });

          createdTickets.push(ticket);
        }
      }
    });

    return {
      issued: true,
      ticketCount: createdTickets.length,
    };
  }
}
