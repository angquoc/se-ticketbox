import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';
import { NOTIFICATION_QUEUE } from '../../modules/queue/queue.constants';
import { PrismaService } from '../../database/prisma.service';
import { EmailService } from '../../modules/notification/services/email.service';

interface TicketToken {
  ticketId: string;
  rawToken: string;
}

interface OrderPaidJobData {
  orderId: string;
  userId: string;
  ticketTokens?: TicketToken[];
}

@Processor(NOTIFICATION_QUEUE)
export class NotificationProcessor extends WorkerHost {
  private readonly logger = new Logger(NotificationProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
  ) {
    super();
  }

  async process(job: Job<OrderPaidJobData>) {
    const { orderId, ticketTokens = [] } = job.data;

    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        user: true,
        tickets: true,
        concert: { select: { title: true } },
      },
    });

    if (!order) {
      throw new Error(`Order ${orderId} not found`);
    }

    if (job.name === 'send-order-paid-email') {
      // Build a map from ticketId → rawToken for QR payload construction
      const tokenMap = new Map(ticketTokens.map((t) => [t.ticketId, t.rawToken]));

      const qrPayloads = order.tickets.map((ticket) => {
        const rawToken = tokenMap.get(ticket.id) ?? '';
        // QR payload format: {ticketId}:{qrTokenHash}:{timestamp}:{qrSignature}
        // The signature was already computed when the ticket was created.
        // For email purposes we include the rawToken so the user can reconstruct
        // their QR code, and the qrSignature for offline verification.
        return {
          ticketId: ticket.id,
          rawToken,
          qrTokenHash: ticket.qrTokenHash,
          qrSignature: ticket.qrSignature ?? '',
        };
      });

      await this.emailService.sendOrderConfirmation({
        to: order.user.email,
        orderId,
        concertTitle: order.concert.title,
        ticketCount: order.tickets.length,
        totalAmount: order.totalAmountInVnd,
        qrPayloads,
      });
    }

    this.logger.log(
      `[Notification] Email sent for order ${orderId} to ${order.user.email}`,
    );
    return { sent: true, to: order.user.email, orderId };
  }
}
