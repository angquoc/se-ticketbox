import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { NOTIFICATION_QUEUE } from '../../modules/queue/queue.constants';
import { PrismaService } from '../../database/prisma.service';

@Processor(NOTIFICATION_QUEUE)
export class NotificationProcessor extends WorkerHost {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async process(job: Job<{ orderId: string; userId: string }>) {
    const { orderId, userId } = job.data;

    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        user: true,
        tickets: true,
      },
    });

    if (!order) {
      throw new Error(`Order ${orderId} not found`);
    }

    console.log('[Notification] Send order paid email');
    console.log({
      to: order.user.email,
      orderId,
      ticketCount: order.tickets.length,
      userId,
    });

    return {
      sent: true,
      to: order.user.email,
      orderId,
      ticketCount: order.tickets.length,
    };
  }
}