import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { TICKET_ISSUE_QUEUE } from '../../modules/queue/queue.constants';
import { PrismaService } from '../../database/prisma.service';
import { OrderStatus, Ticket } from '@prisma/client';
import { createHash, randomUUID } from 'crypto';

@Processor(TICKET_ISSUE_QUEUE)
export class TicketIssueProcessor extends WorkerHost {
  constructor(private readonly prisma: PrismaService) {
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

    const createdTickets: Ticket[] = [];

    await this.prisma.$transaction(async (tx) => {
      for (const item of order.items) {
        // Move tickets from "reserved" to "sold" in DB
        await tx.ticketType.update({
          where: { id: item.ticketTypeId },
          data: {
            soldQty: {
              increment: item.quantity,
            },
            reservedQty: {
              decrement: item.quantity,
            },
          },
        });

        // Update per-user paid/reserved counters
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
            paidQty: {
              increment: item.quantity,
            },
            reservedQty: {
              decrement: item.quantity,
            },
          },
        });

        // Create one Ticket record per purchased quantity
        for (let i = 0; i < item.quantity; i++) {
          const rawQrToken = randomUUID();

          const qrTokenHash = createHash('sha256')
            .update(rawQrToken)
            .digest('hex');

          const ticket = await tx.ticket.create({
            data: {
              orderId: order.id,
              orderItemId: item.id,
              concertId: order.concertId,
              ticketTypeId: item.ticketTypeId,
              userId: order.userId,
              qrTokenHash,
              qrSignature: `mock_signed_payload_${rawQrToken}`,
            },
          });

          createdTickets.push(ticket);
        }
      }
    });

    // NOTE: Redis stock sync and user_limit decrement are handled by the
    // caller (PaymentService.markPaymentSuccessAndQueueTicketIssue or
    // OrderService.finalizePayment) before/after queueing this job.
    // This processor focuses solely on persisting tickets in PostgreSQL.

    return {
      issued: true,
      ticketCount: createdTickets.length,
    };
  }
}
