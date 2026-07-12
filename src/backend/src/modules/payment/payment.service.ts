import { ConfigService } from '@nestjs/config';
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { createHash, createHmac } from 'crypto';
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
import { SeatmapBroadcastService } from '../seatmap/seatmap-broadcast.service';
import { ConcertService } from '../concert/concert.service';

/**
 * Generates a cryptographically secure QR token for a ticket.
 * - rawToken: a random UUID (sent to frontend for QR rendering, stored in DB)
 * - qrTokenHash: SHA-256 of rawToken (stored in DB, used for verification)
 * - qrSignature: HMAC-SHA256 of {ticketId}:{qrTokenHash}:{gateId} (stored in DB, used for tamper detection)
 *
 * The QR payload format: {ticketId}:{rawToken}:{gateId}
 *
 * At check-in time, the backend:
 *   1. Looks up the ticket by ticketId
 *   2. Recomputes HMAC-SHA256({ticketId}:{qrTokenHash}:{gateId}) with QR_SIGNATURE_SECRET
 *   3. Compares against the stored qrSignature
 *   4. Hashes the rawToken from QR and compares against qrTokenHash
 *
 * NOTE: gateId in signature = Gate.name (e.g. "GATE-A"), consistent with
 *       Ticket.gateId which stores the gate name for human-readable QR comparison.
 */
function generateQrToken(
  ticketId: string,
  gateId: string,
  secret: string,
): {
  rawToken: string;
  qrTokenHash: string;
  qrSignature: string;
} {
  const rawToken = crypto.randomUUID();
  const qrTokenHash = createHash('sha256').update(rawToken).digest('hex');
  const signaturePayload = `${ticketId}:${qrTokenHash}:${gateId}`;
  const qrSignature = createHmac('sha256', secret)
    .update(signaturePayload)
    .digest('hex');
  return { rawToken, qrTokenHash, qrSignature };
}

@Injectable()
export class PaymentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly idempotencyService: IdempotencyService,
    private readonly circuitBreaker: PaymentCircuitBreakerService,
    private readonly mockGateway: MockGatewayService,
    private readonly redisService: RedisService,
    private readonly configService: ConfigService,
    private readonly seatmapBroadcastService: SeatmapBroadcastService,
    private readonly concertService: ConcertService,
    @InjectQueue(NOTIFICATION_QUEUE)
    private readonly notificationQueue: Queue,
  ) {}

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
    const requestHash = this.idempotencyService.hashRequest({
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
      const { paymentUrl } = await this.createPaymentUrl({
        orderId: params.orderId,
        userId: params.userId,
      });

      const response = { orderId: params.orderId, paymentUrl, reused: false };

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

  /**
   * Creates a payment URL for an existing PENDING_PAYMENT order.
   * Called by OrderService.createOrder to embed payment URL in the order response,
   * fulfilling the spec: "gọi Mock Payment Gateway → trả paymentUrl".
   *
   * If a URL already exists on an INITIATED transaction, returns the existing one.
   * Throws BadRequestException if order is not PENDING_PAYMENT.
   * Throws ServiceUnavailableException if the circuit breaker is OPEN.
   */
  async createPaymentUrl(params: {
    orderId: string;
    userId: string;
  }): Promise<{ paymentUrl: string; reused: boolean }> {
    const order = await this.prisma.order.findUnique({
      where: { id: params.orderId },
      include: { payments: true },
    });

    if (!order) {
      throw new NotFoundException('Không tìm thấy đơn hàng');
    }

    if (order.userId !== params.userId) {
      throw new BadRequestException(
        'Đơn hàng không thuộc về người dùng hiện tại',
      );
    }

    if (order.status !== OrderStatus.PENDING_PAYMENT) {
      throw new BadRequestException(
        'Chỉ có thể tạo payment URL cho đơn hàng đang chờ thanh toán',
      );
    }

    const existingInititated = order.payments.find(
      (payment) => payment.status === PaymentStatus.INITIATED,
    );

    const isStaleMockPaymentUrl = (url: string) =>
      url.includes('/payment/mock-page') || /localhost:3000/i.test(url);

    if (
      existingInititated?.paymentUrl &&
      !isStaleMockPaymentUrl(existingInititated.paymentUrl)
    ) {
      return { paymentUrl: existingInititated.paymentUrl, reused: true };
    }

    const paymentUrl = await this.circuitBreaker.execute(async () => {
      return this.mockGateway.createPaymentUrl(
        order.id,
        order.totalAmountInVnd,
      );
    });

    if (existingInititated) {
      await this.prisma.paymentTransaction.update({
        where: { id: existingInititated.id },
        data: { paymentUrl },
      });
      return { paymentUrl, reused: false };
    }

    await this.prisma.paymentTransaction.create({
      data: {
        orderId: order.id,
        provider: PaymentProvider.MOCK,
        status: PaymentStatus.INITIATED,
        amount: order.totalAmountInVnd,
        paymentUrl,
      },
    });

    return { paymentUrl, reused: false };
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
      concertId: string;
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

    // Broadcast seatmap updates
    for (const item of order.items) {
      void this.seatmapBroadcastService.refreshAndBroadcast(
        order.concertId,
        item.ticketTypeId,
      );
    }
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
   * 2. Creates Ticket records (with secure QR tokens)
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
    const qrSecret = this.configService.get<string>(
      'QR_SIGNATURE_SECRET',
      'dev_qr_secret',
    );

    // Resolve the least-loaded gate for the concert BEFORE the transaction.
    // This must happen outside the transaction to avoid locking issues.
    // Uses gate name (Gate.name, e.g. "GATE-A") as the gate identifier throughout,
    // consistent with how Ticket.gateId stores the gate name.
    const gate = await this.findLeastLoadedGate(order.concertId);
    const gateName = gate?.name ?? '';

    // Pre-generate ticket IDs and QR tokens before the transaction.
    // This is necessary because ticket ID must be known before calling create()
    // to generate the correct HMAC signature.
    type TicketCreationPlan = {
      orderItemId: string;
      ticketTypeId: string;
      ticketId: string;
      rawToken: string;
      qrTokenHash: string;
      qrSignature: string;
      gateName: string;
    };
    const plans: TicketCreationPlan[] = [];
    for (const item of order.items) {
      for (let i = 0; i < item.quantity; i++) {
        const ticketId = crypto.randomUUID();
        const { rawToken, qrTokenHash, qrSignature } = generateQrToken(
          ticketId,
          gateName,
          qrSecret,
        );
        plans.push({
          orderItemId: item.id,
          ticketTypeId: item.ticketTypeId,
          ticketId,
          rawToken,
          qrTokenHash,
          qrSignature,
          gateName,
        });
      }
    }

    // Phase 1: Create all tickets in a single transaction
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

      // Create all tickets with pre-generated IDs, QR data, and gate assignment
      for (const plan of plans) {
        await tx.ticket.create({
          data: {
            id: plan.ticketId,
            orderId: order.id,
            orderItemId: plan.orderItemId,
            concertId: order.concertId,
            ticketTypeId: plan.ticketTypeId,
            userId: order.userId,
            // gateId stores gate name for human-readable QR payload comparison
            gateId: gateName || null,
            qrRawToken: plan.rawToken,
            qrTokenHash: plan.qrTokenHash,
            qrSignature: plan.qrSignature,
            status: 'ISSUED',
          },
        });
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

    // Invalidate concert cache so soldQty / availability reflect the purchase
    void this.concertService.invalidateCache(order.concertId);

    // Queue notification email — processor fetches ticket data directly from DB
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

    // Broadcast seatmap updates
    for (const item of order.items) {
      void this.seatmapBroadcastService.refreshAndBroadcast(
        order.concertId,
        item.ticketTypeId,
      );
    }
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

  /**
   * Finds the gate with the fewest issued tickets for the given concert.
   * Returns null if no gates are configured (backward compatibility).
   *
   * NOTE: Ticket.gateId stores Gate.name, so the count map is keyed by gate name
   * for correct round-robin distribution.
   */
  private async findLeastLoadedGate(
    concertId: string,
  ): Promise<{ id: string; name: string } | null> {
    const gates = await this.prisma.gate.findMany({
      where: { concertId },
      select: { id: true, name: true },
    });

    if (gates.length === 0) return null;

    const ticketCounts = await this.prisma.ticket.groupBy({
      by: ['gateId'],
      where: {
        concertId,
        status: { in: ['ISSUED', 'CHECKED_IN'] },
        gateId: { not: null },
      },
      _count: { id: true },
    });

    const countMap = new Map(ticketCounts.map((c) => [c.gateId, c._count.id]));
    let leastLoaded = gates[0];
    let minCount = countMap.get(gates[0].name) ?? 0;

    for (const gate of gates) {
      const count = countMap.get(gate.name) ?? 0;
      if (count < minCount) {
        minCount = count;
        leastLoaded = gate;
      }
    }

    return leastLoaded;
  }
}
