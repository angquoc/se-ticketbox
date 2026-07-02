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

    if (job.name === 'send-order-paid-email') {
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
    }

    this.logger.log(
      `[Notification] Email sent for order ${orderId} to ${order.user.email}`,
    );
    return { sent: true, to: order.user.email, orderId };
  }
}
