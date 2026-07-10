import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { OrderStatus, PaymentStatus, PaymentProvider } from '@prisma/client';
import { PrismaService } from '../../../database/prisma.service';
import { MockGatewayService } from './mock-gateway.service';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { TICKET_ISSUE_QUEUE } from '../../queue/queue.constants';
import { RedisService } from '../../redis/redis.service';
import { SeatmapBroadcastService } from '../../seatmap/seatmap-broadcast.service';

@Injectable()
export class PaymentCronService {
  private readonly logger = new Logger(PaymentCronService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mockGateway: MockGatewayService,
    private readonly redisService: RedisService,
    private readonly seatmapBroadcastService: SeatmapBroadcastService,

    @InjectQueue(TICKET_ISSUE_QUEUE)
    private readonly ticketIssueQueue: Queue,
  ) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async verifyStuckPendingPayments() {
    const now = new Date();

    const stuckOrders = await this.prisma.order.findMany({
      where: {
        status: OrderStatus.PENDING_PAYMENT,
        expiresAt: {
          lt: now,
        },
      },
      include: {
        items: true,
      },
      take: 50,
    });

    for (const order of stuckOrders) {
      const verifyResult = await this.mockGateway.verifyTransaction(order.id);

      if (verifyResult === 'SUCCESS') {
        await this.markOrderPaidFromCron(order.id, order.totalAmountInVnd);
        this.logger.log(`Cron verified paid order ${order.id}`);
        continue;
      }

      await this.expireOrderAndReleaseInventory(order, verifyResult);
      this.logger.log(`Expired stuck pending payment order ${order.id}`);
    }
  }

  private async markOrderPaidFromCron(orderId: string, amount: number) {
    await this.prisma.$transaction(async (tx) => {
      const latestOrder = await tx.order.findUnique({
        where: { id: orderId },
      });

      if (!latestOrder || latestOrder.status !== OrderStatus.PENDING_PAYMENT) {
        return;
      }

      await tx.paymentTransaction.create({
        data: {
          orderId,
          provider: PaymentProvider.MOCK,
          status: PaymentStatus.SUCCESS,
          amount,
          receivedAt: new Date(),
          rawWebhook: {
            source: 'CRON_VERIFY',
            result: 'SUCCESS',
          },
        },
      });

      await tx.order.update({
        where: { id: orderId },
        data: {
          status: OrderStatus.PAID,
          paidAt: new Date(),
        },
      });
    });

    await this.ticketIssueQueue.add(
      'issue-ticket-for-paid-order',
      { orderId },
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
  }

  private async expireOrderAndReleaseInventory(
    order: {
      id: string;
      userId: string;
      concertId: string;
      totalAmountInVnd: number;
      items: Array<{
        ticketTypeId: string;
        quantity: number;
      }>;
    },
    verifyResult: 'FAILED' | 'PENDING',
  ) {
    await this.prisma.$transaction(async (tx) => {
      const latestOrder = await tx.order.findUnique({
        where: { id: order.id },
      });

      if (!latestOrder || latestOrder.status !== OrderStatus.PENDING_PAYMENT) {
        return;
      }

      await tx.order.update({
        where: { id: order.id },
        data: {
          status:
            verifyResult === 'FAILED'
              ? OrderStatus.PAYMENT_FAILED
              : OrderStatus.EXPIRED,
          inventoryReleasedAt: new Date(),
          releaseReason:
            verifyResult === 'FAILED'
              ? 'CRON_VERIFY_PAYMENT_FAILED'
              : 'PAYMENT_VERIFY_TIMEOUT',
        },
      });

      await tx.paymentTransaction.create({
        data: {
          orderId: order.id,
          provider: PaymentProvider.MOCK,
          status:
            verifyResult === 'FAILED'
              ? PaymentStatus.FAILED
              : PaymentStatus.TIMEOUT,
          amount: order.totalAmountInVnd,
          receivedAt: new Date(),
          rawWebhook: {
            source: 'CRON_VERIFY',
            result: verifyResult,
          },
        },
      });

      for (const item of order.items) {
        await tx.ticketType.updateMany({
          where: {
            id: item.ticketTypeId,
            reservedQty: {
              gte: item.quantity,
            },
          },
          data: {
            reservedQty: {
              decrement: item.quantity,
            },
          },
        });

        await tx.userTicketCounter.updateMany({
          where: {
            userId: order.userId,
            ticketTypeId: item.ticketTypeId,
            reservedQty: {
              gte: item.quantity,
            },
          },
          data: {
            reservedQty: {
              decrement: item.quantity,
            },
          },
        });
      }
    });

    // Release Redis reservations after transaction completes successfully
    await Promise.all(
      order.items.map((item) =>
        this.redisService.releaseReservation({
          ticketTypeId: item.ticketTypeId,
          userId: order.userId,
          orderId: order.id,
          quantity: item.quantity,
        }),
      ),
    ).catch((err) => {
      this.logger.error(
        `Cron release reservation failed for order ${order.id}: ${err}`,
      );
    });

    // Broadcast seatmap updates
    await Promise.all(
      order.items.map((item) =>
        this.seatmapBroadcastService.refreshAndBroadcast(
          order.concertId,
          item.ticketTypeId,
        ),
      ),
    ).catch((err) => {
      this.logger.error(
        `Cron seatmap broadcast failed for order ${order.id}: ${err}`,
      );
    });
  }
}
