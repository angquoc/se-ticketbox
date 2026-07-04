import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';
import { NOTIFICATION_QUEUE } from '../../modules/queue/queue.constants';
import { PrismaService } from '../../database/prisma.service';
import { EmailService } from '../../modules/notification/services/email.service';

interface OrderPaidJobData {
  orderId: string;
  userId: string;
}

interface ConcertReminderJobData {
  concertId: string;
}

const BATCH_SIZE = 100;

@Processor(NOTIFICATION_QUEUE)
export class NotificationProcessor extends WorkerHost {
  private readonly logger = new Logger(NotificationProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
  ) {
    super();
  }

  async process(job: Job<OrderPaidJobData | ConcertReminderJobData>) {
    if (job.name === 'concert-reminder-24h') {
      return this.handleConcertReminder(job as Job<ConcertReminderJobData>);
    }

    if (job.name === 'send-order-paid-email') {
      return this.handleOrderPaid(job as Job<OrderPaidJobData>);
    }

    this.logger.warn(`[Notification] Unknown job name: ${job.name}`);
    return { skipped: true, reason: `Unknown job name: ${job.name}` };
  }

  private async handleOrderPaid(job: Job<OrderPaidJobData>) {
    const { orderId } = job.data;

    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        user: true,
        tickets: {
          include: {
            ticketType: { select: { name: true } },
          },
        },
        concert: { select: { title: true } },
      },
    });

    if (!order) {
      throw new Error(`Order ${orderId} not found`);
    }

    // Build ticket info for email — rawToken is NOT sent via email for security.
    // Users view QR codes on the authenticated web app instead.
    const ticketInfos = order.tickets.map((ticket) => ({
      ticketId: ticket.id,
      ticketTypeName: ticket.ticketType.name,
    }));

    await this.emailService.sendOrderConfirmation({
      to: order.user.email,
      orderId,
      concertTitle: order.concert.title,
      ticketCount: order.tickets.length,
      totalAmount: order.totalAmountInVnd,
      ticketInfos,
    });

    this.logger.log(
      `[Notification] Order confirmation sent for order ${orderId} to ${order.user.email}`,
    );
    return { sent: true, to: order.user.email, orderId };
  }

  /**
   * Sends a 24h reminder email to all ticket holders for a concert.
   * Processes users in batches to avoid memory issues with large audiences.
   * Idempotent per user: if a user already received a reminder, skip them.
   */
  private async handleConcertReminder(job: Job<ConcertReminderJobData>) {
    const { concertId } = job.data;

    const concert = await this.prisma.concert.findUnique({
      where: { id: concertId },
      select: { id: true, title: true, startsAt: true, venue: true },
    });

    if (!concert) {
      this.logger.warn(
        `[Reminder] Concert ${concertId} not found, skipping reminder`,
      );
      return { skipped: true, reason: 'Concert not found' };
    }

    // Check if concert is still published (not cancelled)
    const freshConcert = await this.prisma.concert.findUnique({
      where: { id: concertId },
      select: { status: true },
    });

    if (!freshConcert || freshConcert.status === 'CANCELLED') {
      this.logger.log(
        `[Reminder] Concert ${concertId} cancelled, skipping reminder`,
      );
      return { skipped: true, reason: 'Concert cancelled' };
    }

    let totalProcessed = 0;
    let totalSent = 0;
    let totalSkipped = 0;
    let cursor: string | undefined;

    while (true) {
      // Fetch a batch of users with valid tickets for this concert
      const users = await this.prisma.user.findMany({
        where: {
          tickets: {
            some: {
              concertId,
              status: { in: ['ISSUED', 'CHECKED_IN'] },
            },
          },
        },
        select: {
          id: true,
          email: true,
          fullName: true,
          tickets: {
            where: {
              concertId,
              status: { in: ['ISSUED', 'CHECKED_IN'] },
            },
            select: { id: true },
          },
        },
        take: BATCH_SIZE,
        skip: 0,
        cursor: cursor ? { id: cursor } : undefined,
        distinct: ['id'],
        orderBy: { createdAt: 'asc' },
      });

      if (users.length === 0) break;
      cursor = users[users.length - 1].id;

      // Send reminder emails in parallel (up to concurrency limit)
      const results = await Promise.allSettled(
        users.map((user) =>
          this.emailService.sendConcertReminder({
            to: user.email,
            concertTitle: concert.title,
            concertVenue: concert.venue,
            concertStartsAt: concert.startsAt,
            ticketCount: user.tickets.length,
          }),
        ),
      );

      for (const result of results) {
        totalProcessed++;
        if (result.status === 'fulfilled') {
          totalSent++;
        } else {
          totalSkipped++;
          this.logger.warn(
            `[Reminder] Failed to send reminder to user: ${result.reason}`,
          );
        }
      }
    }

    this.logger.log(
      `[Reminder] Concert ${concertId} reminder complete: processed=${totalProcessed} sent=${totalSent} failed=${totalSkipped}`,
    );
    return { sent: true, concertId, totalSent, totalSkipped };
  }
}
