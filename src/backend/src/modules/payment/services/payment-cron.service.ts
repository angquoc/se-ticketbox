import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { OrderStatus, PaymentStatus, PaymentProvider } from '@prisma/client';
import { PrismaService } from '../../../database/prisma.service';

@Injectable()
export class PaymentCronService {
  private readonly logger = new Logger(PaymentCronService.name);

  constructor(private readonly prisma: PrismaService) {}

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
            status: OrderStatus.EXPIRED,
            inventoryReleasedAt: new Date(),
            releaseReason: 'PAYMENT_VERIFY_TIMEOUT',
          },
        });

        await tx.paymentTransaction.create({
          data: {
            orderId: order.id,
            provider: PaymentProvider.MOCK,
            status: PaymentStatus.TIMEOUT,
            amount: order.totalAmountInVnd,
            receivedAt: new Date(),
          },
        });

        for (const item of order.items) {
          await tx.ticketType.update({
            where: { id: item.ticketTypeId },
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
            },
            data: {
              reservedQty: {
                decrement: item.quantity,
              },
            },
          });
        }
      });

      this.logger.log(`Expired stuck pending payment order ${order.id}`);
    }
  }
}