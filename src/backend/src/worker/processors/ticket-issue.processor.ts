import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { TICKET_ISSUE_QUEUE, NOTIFICATION_QUEUE } from '../../modules/queue/queue.constants';
import { PrismaService } from '../../database/prisma.service';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { OrderStatus } from '@prisma/client';
import { createHash, randomUUID } from 'crypto';

@Processor(TICKET_ISSUE_QUEUE)
export class TicketIssueProcessor extends WorkerHost {
  constructor(
    private readonly prisma: PrismaService,

    @InjectQueue(NOTIFICATION_QUEUE)
    private readonly notificationQueue: Queue,
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

    if (order.tickets.length > 0) {
      return {
        skipped: true,
        reason: 'Tickets already issued',
        ticketCount: order.tickets.length,
      };
    }

    const createdTickets = [];

    await this.prisma.$transaction(async (tx) => {
      for (const item of order.items) {
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

    await this.notificationQueue.add(
      'send-order-paid-email',
      {
        orderId,
        userId: order.userId,
      },
      {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 3000,
        },
        removeOnComplete: true,
        removeOnFail: false,
      },
    );

    return {
      issued: true,
      ticketCount: createdTickets.length,
    };
  }
}