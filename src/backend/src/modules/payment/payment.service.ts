import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { createHash } from 'crypto';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import {
  OrderStatus,
  PaymentProvider,
  PaymentStatus,
} from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { IdempotencyService } from '../idempotency/idempotency.service';
import { TICKET_ISSUE_QUEUE } from '../queue/queue.constants';
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

    @InjectQueue(TICKET_ISSUE_QUEUE)
    private readonly ticketIssueQueue: Queue,
  ) {}

  private hashRequest(payload: unknown) {
    return createHash('sha256')
      .update(JSON.stringify(payload))
      .digest('hex');
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
        rawWebhook: dto as any,
        receivedAt: new Date(),
      },
      update: {
        rawWebhook: dto as any,
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
      const response = await this.circuitBreaker.execute(async () => {
        return this.createPaymentInternal(params.orderId, params.userId);
      });

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
      throw new BadRequestException('Đơn hàng không thuộc về người dùng hiện tại');
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

    const paymentUrl = await this.mockGateway.createPaymentUrl(
      order.id,
      order.totalAmountInVnd,
    );

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
      include: {
        payments: true,
      },
    });

    if (!order) {
      throw new NotFoundException('Không tìm thấy đơn hàng');
    }

    if (order.totalAmountInVnd !== dto.amount) {
      throw new BadRequestException('Số tiền thanh toán không khớp');
    }

    if (order.status === OrderStatus.PAID) {
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
      await this.markPaymentFailed(dto);

      return {
        message: 'Thanh toán thất bại',
        orderId: order.id,
        status: OrderStatus.PAYMENT_FAILED,
      };
    }

    if (dto.result === MockPaymentResult.TIMEOUT) {
      await this.markPaymentTimeout(dto);

      return {
        message: 'Thanh toán timeout, chờ cronjob verify',
        orderId: order.id,
      };
    }

    await this.markPaymentSuccessAndQueueTicketIssue(dto);

    return {
      message: 'Thanh toán thành công, đã đưa job phát hành vé vào queue',
      orderId: order.id,
      status: OrderStatus.PAID,
    };
  }

  private async markPaymentFailed(dto: MockWebhookDto) {
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
          status: PaymentStatus.FAILED,
          amount: dto.amount,
          rawWebhook: dto as any,
          receivedAt: new Date(),
        },
        update: {
          status: PaymentStatus.FAILED,
          rawWebhook: dto as any,
          receivedAt: new Date(),
        },
      });

      await tx.order.update({
        where: { id: dto.orderId },
        data: {
          status: OrderStatus.PAYMENT_FAILED,
        },
      });
    });
  }

  private async markPaymentTimeout(dto: MockWebhookDto) {
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
        rawWebhook: dto as any,
        receivedAt: new Date(),
      },
      update: {
        status: PaymentStatus.TIMEOUT,
        rawWebhook: dto as any,
        receivedAt: new Date(),
      },
    });
  }

  private async markPaymentSuccessAndQueueTicketIssue(dto: MockWebhookDto) {
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
          rawWebhook: dto as any,
          receivedAt: new Date(),
        },
        update: {
          status: PaymentStatus.SUCCESS,
          rawWebhook: dto as any,
          receivedAt: new Date(),
        },
      });

      await tx.order.update({
        where: { id: dto.orderId },
        data: {
          status: OrderStatus.PAID,
          paidAt: new Date(),
        },
      });
    });

    await this.ticketIssueQueue.add(
      'issue-ticket-for-paid-order',
      {
        orderId: dto.orderId,
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
  }

  async getPaymentStatus(orderId: string, userId: string) {
    const order = await this.prisma.order.findUnique({
        where: { id: orderId },
        include: {
        payments: true,
        tickets: true,
        },
    });

    if (!order) {
        throw new NotFoundException('Không tìm thấy đơn hàng');
    }

    if (order.userId !== userId) {
        throw new BadRequestException('Đơn hàng không thuộc về người dùng hiện tại');
    }

    return {
        orderId: order.id,
        status: order.status,
        payments: order.payments,
        ticketCount: order.tickets.length,
    };
  }

  getCircuitBreakerStatus() {
    return this.circuitBreaker.getStatus();
  }
}