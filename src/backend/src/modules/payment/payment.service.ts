import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { createHash } from 'crypto';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { CircuitBreakerState } from './services/payment-circuit-breaker.service';
import {
  OrderStatus,
  PaymentProvider,
  PaymentStatus,
  Prisma,
} from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { RedisService } from '../redis/redis.service';
import { IdempotencyService } from '../idempotency/idempotency.service';
import { NOTIFICATION_QUEUE } from '../queue/queue.constants';
import { PaymentCircuitBreakerService } from './services/payment-circuit-breaker.service';
import { MockGatewayService } from './services/mock-gateway.service';
import { MockPaymentResult, MockWebhookDto } from './dto/mock-webhook.dto';

@Injectable()
export class PaymentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly idempotencyService: IdempotencyService,
    private readonly circuitBreaker: PaymentCircuitBreakerService,
    private readonly mockGateway: MockGatewayService,
    private readonly redisService: RedisService,
    @InjectQueue(NOTIFICATION_QUEUE)
    private readonly notificationQueue: Queue,
  ) {}

  private hashRequest(payload: unknown) {
    return createHash('sha256').update(JSON.stringify(payload)).digest('hex');
  }

  private async recordLateWebhook(dto: MockWebhookDto) {
    await this.prisma.paymentTransaction.upsert({
      where: {
        provider_providerTransactionId: {
          provider: PaymentProvider.MOCK,
          providerTransactionId: dto.providerTransactionId,
        },
      },
      create: {
        orderId: dto.orderId,
        provider: PaymentProvider.MOCK,
        providerTransactionId: dto.providerTransactionId,
        status:
          dto.result === MockPaymentResult.SUCCESS
            ? PaymentStatus.SUCCESS
            : dto.result === MockPaymentResult.FAILED
              ? PaymentStatus.FAILED
              : PaymentStatus.TIMEOUT,
        amount: dto.amount,
        rawWebhook: dto as unknown as Prisma.InputJsonValue,
        receivedAt: new Date(),
      },
      update: {
        rawWebhook: dto as unknown as Prisma.InputJsonValue,
        receivedAt: new Date(),
      },
    });
  }

  async createPayment(params: {
    userId: string;
    idempotencyKey: string;
    orderId: string;
  }) {
    const requestHash = this.hashRequest({
      orderId: params.orderId,
    });

    const idem = await this.idempotencyService.start({
      userId: params.userId,
      idempotencyKey: params.idempotencyKey,
      requestHash,
    });

    if (!idem.shouldProcess) {
      return idem.cachedResponse;
    }

    try {
      const response = await this.createPaymentInternal(
        params.orderId,
        params.userId,
      );

      await this.idempotencyService.complete({
        userId: params.userId,
        idempotencyKey: params.idempotencyKey,
        requestHash,
        responseBody: response,
      });

      return response;
    } catch (error) {
      await this.idempotencyService.fail({
        userId: params.userId,
        idempotencyKey: params.idempotencyKey,
        requestHash,
      });

      throw error;
    }
  }

  private async createPaymentInternal(orderId: string, userId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { payments: true },
    });

    if (!order) {
      throw new NotFoundException('Không tìm thấy đơn hàng');
    }

    if (order.userId !== userId) {
      throw new BadRequestException(
        'Đơn hàng không thuộc về người dùng hiện tại',
      );
    }

    if (order.status !== OrderStatus.PENDING_PAYMENT) {
      throw new BadRequestException(
        'Chỉ có thể thanh toán đơn hàng đang chờ thanh toán',
      );
    }

    const existingPayment = order.payments.find(
      (payment) => payment.status === PaymentStatus.INITIATED,
    );

    if (existingPayment?.paymentUrl) {
      return {
        orderId: order.id,
        paymentUrl: existingPayment.paymentUrl,
        reused: true,
      };
    }

    const paymentUrl = await this.circuitBreaker.execute(async () => {
      return this.mockGateway.createPaymentUrl(
        order.id,
        order.totalAmountInVnd,
      );
    });

    await this.prisma.paymentTransaction.create({
      data: {
        orderId: order.id,
        provider: PaymentProvider.MOCK,
        status: PaymentStatus.INITIATED,
        amount: order.totalAmountInVnd,
        paymentUrl,
      },
    });

    return {
      orderId: order.id,
      paymentUrl,
      reused: false,
    };
  }

  async handleMockWebhook(dto: MockWebhookDto) {
    const payload = `${dto.orderId}:${dto.providerTransactionId}:${dto.result}:${dto.amount}`;

    const isValid = this.mockGateway.verifySignature(payload, dto.signature);

    if (!isValid) {
      throw new BadRequestException('Webhook signature không hợp lệ');
    }

    const order = await this.prisma.order.findUnique({
      where: { id: dto.orderId },
      include: { items: true },
    });

    if (!order) {
      throw new NotFoundException('Không tìm thấy đơn hàng');
    }

    if (order.totalAmountInVnd !== dto.amount) {
      throw new BadRequestException('Số tiền thanh toán không khớp');
    }

    if (order.status === OrderStatus.PAID) {
      return {
        message: 'Webhook trùng lặp, order đã PAID trước đó. Không xử lý lại.',
        orderId: order.id,
        status: order.status,
      };
    }

    if (order.status === OrderStatus.EXPIRED) {
      await this.recordLateWebhook(dto);

      return {
        message:
          'Webhook đến sau khi đơn hàng đã hết hạn. Không phát hành vé, cần xử lý hoàn tiền/mock refund.',
        orderId: order.id,
        status: order.status,
      };
    }

    if (order.status !== OrderStatus.PENDING_PAYMENT) {
      return {
        message: `Bỏ qua webhook vì order đang ở trạng thái ${order.status}`,
        orderId: order.id,
        status: order.status,
      };
    }

    if (dto.result === MockPaymentResult.FAILED) {
      await this.handlePaymentFailed(dto.orderId, order);

      return {
        message: 'Thanh toán thất bại',
        orderId: order.id,
        status: OrderStatus.PAYMENT_FAILED,
      };
    }

    if (dto.result === MockPaymentResult.TIMEOUT) {
      await this.handlePaymentTimeout(dto);

      return {
        message: 'Thanh toán timeout, chờ cronjob verify',
        orderId: order.id,
      };
    }

    await this.handlePaymentSuccess(dto, order);

    return {
      message: 'Thanh toán thành công, vé đã được phát hành',
      orderId: order.id,
      status: OrderStatus.PAID,
    };
  }

  /**
   * Handle payment FAILED webhook.
   * Releases inventory back to Redis and PostgreSQL.
   */
  private async handlePaymentFailed(
    orderId: string,
    order: {
      id: string;
      userId: string;
      items: { ticketTypeId: string; quantity: number }[];
    },
  ) {
    await this.prisma.$transaction(async (tx) => {
      const latestOrder = await tx.order.findUnique({
        where: { id: orderId },
      });

      if (!latestOrder || latestOrder.status !== OrderStatus.PENDING_PAYMENT) {
        return;
      }

      await tx.paymentTransaction.updateMany({
        where: { orderId, status: 'INITIATED' },
        data: { status: PaymentStatus.FAILED },
      });

      await tx.order.update({
        where: { id: orderId },
        data: {
          status: OrderStatus.PAYMENT_FAILED,
          inventoryReleasedAt: new Date(),
          releaseReason: 'PAYMENT_FAILED',
        },
      });

      for (const item of order.items) {
        await tx.ticketType.updateMany({
          where: {
            id: item.ticketTypeId,
            reservedQty: { gte: item.quantity },
          },
          data: { reservedQty: { decrement: item.quantity } },
        });

        await tx.userTicketCounter.updateMany({
          where: {
            userId: order.userId,
            ticketTypeId: item.ticketTypeId,
            reservedQty: { gte: item.quantity },
          },
          data: { reservedQty: { decrement: item.quantity } },
        });
      }
    });

    await Promise.all(
      order.items.map((item) =>
        this.redisService.releaseReservation({
          ticketTypeId: item.ticketTypeId,
          userId: order.userId,
          orderId: order.id,
          quantity: item.quantity,
        }),
      ),
    );
  }

  /**
   * Handle payment TIMEOUT webhook.
   * Only records the timeout status; order will be expired by cronjob.
   */
  private async handlePaymentTimeout(dto: MockWebhookDto) {
    await this.prisma.paymentTransaction.upsert({
      where: {
        provider_providerTransactionId: {
          provider: PaymentProvider.MOCK,
          providerTransactionId: dto.providerTransactionId,
        },
      },
      create: {
        orderId: dto.orderId,
        provider: PaymentProvider.MOCK,
        providerTransactionId: dto.providerTransactionId,
        status: PaymentStatus.TIMEOUT,
        amount: dto.amount,
        rawWebhook: dto as unknown as Prisma.InputJsonValue,
        receivedAt: new Date(),
      },
      update: {
        status: PaymentStatus.TIMEOUT,
        rawWebhook: dto as unknown as Prisma.InputJsonValue,
        receivedAt: new Date(),
      },
    });
  }

  /**
   * Handle payment SUCCESS webhook.
   * 1. Updates order → PAID
   * 2. Creates Ticket records
   * 3. Updates soldQty / reservedQty in PostgreSQL
   * 4. Cleans up Redis reservation + user_limit
   * 5. Queues notification email
   */
  private async handlePaymentSuccess(
    dto: MockWebhookDto,
    order: {
      id: string;
      userId: string;
      concertId: string;
      items: { id: string; ticketTypeId: string; quantity: number }[];
    },
  ) {
    await this.prisma.$transaction(async (tx) => {
      await tx.paymentTransaction.upsert({
        where: {
          provider_providerTransactionId: {
            provider: PaymentProvider.MOCK,
            providerTransactionId: dto.providerTransactionId,
          },
        },
        create: {
          orderId: dto.orderId,
          provider: PaymentProvider.MOCK,
          providerTransactionId: dto.providerTransactionId,
          status: PaymentStatus.SUCCESS,
          amount: dto.amount,
          rawWebhook: dto as unknown as Prisma.InputJsonValue,
          receivedAt: new Date(),
        },
        update: {
          status: PaymentStatus.SUCCESS,
          rawWebhook: dto as unknown as Prisma.InputJsonValue,
          receivedAt: new Date(),
        },
      });

      await tx.order.update({
        where: { id: dto.orderId },
        data: { status: OrderStatus.PAID, paidAt: new Date() },
      });

      // Create Ticket records
      for (const item of order.items) {
        for (let i = 0; i < item.quantity; i++) {
          await tx.ticket.create({
            data: {
              orderId: order.id,
              orderItemId: item.id,
              concertId: order.concertId,
              ticketTypeId: item.ticketTypeId,
              userId: order.userId,
              qrTokenHash: crypto.randomUUID(),
              status: 'ISSUED',
            },
          });
        }
      }

      // Update soldQty / reservedQty in PostgreSQL
      for (const item of order.items) {
        await tx.ticketType.update({
          where: { id: item.ticketTypeId },
          data: {
            soldQty: { increment: item.quantity },
            reservedQty: { decrement: item.quantity },
          },
        });
      }

      // Update per-user counters
      for (const item of order.items) {
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
      }
    });

    // Clean up Redis: delete reservation + decrement user_limit
    await this.redisService.del(`reservation:${dto.orderId}`);
    await Promise.all(
      order.items.map((item) =>
        this.redisService.decrementUserLimit({
          ticketTypeId: item.ticketTypeId,
          userId: order.userId,
          quantity: item.quantity,
        }),
      ),
    );

    // Queue notification email
    await this.notificationQueue.add(
      'send-order-paid-email',
      { orderId: dto.orderId, userId: order.userId },
      {
        attempts: 3,
        backoff: { type: 'exponential', delay: 3000 },
        removeOnComplete: true,
        removeOnFail: false,
      },
    );
  }

  async getPaymentStatus(orderId: string, userId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { payments: true, tickets: true },
    });

    if (!order) {
      throw new NotFoundException('Không tìm thấy đơn hàng');
    }

    if (order.userId !== userId) {
      throw new BadRequestException(
        'Đơn hàng không thuộc về người dùng hiện tại',
      );
    }

    return {
      orderId: order.id,
      status: order.status,
      payments: order.payments,
      ticketCount: order.tickets.length,
    };
  }

  getCircuitBreakerStatus(): CircuitBreakerState {
    return this.circuitBreaker.getStatus();
  }
}
