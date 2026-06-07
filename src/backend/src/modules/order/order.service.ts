import {
  Injectable,
  NotFoundException,
  BadRequestException,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrismaService } from '../../database/prisma.service';
import { RedisService } from '../redis/redis.service';
import {
  ConcertStatus,
  TicketTypeStatus,
  Order,
  OrderItem,
  TicketType,
  PaymentTransaction,
  Ticket,
  Prisma,
} from '@prisma/client';
import { CreateOrderDto } from './dto/create-order.dto';
import {
  OrderResponseDto,
  OrderListResponseDto,
  OrderItemResponseDto,
  CreateOrderResponseDto,
} from './dto/order-response.dto';
import { ORDER_EXPIRE_QUEUE } from './processors/order-expire.processor';

const DEFAULT_RESERVATION_TTL_SECONDS = 15 * 60; // 15 minutes

// ─────────────────────────────────────────────────────────────────────────────
type OrderItemWithType = OrderItem & {
  ticketType: Pick<TicketType, 'name'>;
  tickets: Pick<Ticket, 'id'>[];
};

type OrderWithRelations = Order & {
  items: OrderItemWithType[];
  concert: { title: string };
  payments: PaymentTransaction[];
};

// ─────────────────────────────────────────────────────────────────────────────

@Injectable()
export class OrderService {
  private readonly logger = new Logger(OrderService.name);

  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
    private configService: ConfigService,
    @InjectQueue(ORDER_EXPIRE_QUEUE) private readonly expireQueue: Queue,
  ) {}

  // ─────────────────────────────────────────────────────────────────────────────
  // Mapping helpers
  // ─────────────────────────────────────────────────────────────────────────────

  private toOrderItemResponse(item: OrderItemWithType): OrderItemResponseDto {
    return {
      id: item.id,
      ticketTypeId: item.ticketTypeId,
      ticketTypeName: item.ticketType.name,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      subtotal: item.subtotal,
      ticketCount: item.tickets?.length ?? 0,
    };
  }

  private toOrderResponse(
    order: OrderWithRelations,
    paymentUrl?: string | null,
  ): OrderResponseDto {
    return {
      id: order.id,
      userId: order.userId,
      concertId: order.concertId,
      concertTitle: order.concert.title,
      status: order.status,
      totalAmountInVnd: order.totalAmountInVnd,
      currency: order.currency,
      expiresAt: order.expiresAt,
      paidAt: order.paidAt,
      cancelledAt: order.cancelledAt,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
      items: (order.items ?? []).map((item) => this.toOrderItemResponse(item)),
      paymentUrl,
      ticketCount: (order.items ?? []).reduce(
        (sum, item) => sum + (item.tickets?.length ?? 0),
        0,
      ),
    };
  }

  private buildOrderInclude() {
    return {
      items: {
        include: {
          ticketType: { select: { name: true } },
          tickets: { select: { id: true } },
        },
      },
      concert: { select: { title: true } },
      payments: { orderBy: { createdAt: 'desc' } as never },
    } as const;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Internal helpers
  // ─────────────────────────────────────────────────────────────────────────────

  private async validateTicketType(
    concertId: string,
    ticketTypeId: string,
  ): Promise<{ maxPerUser: number; unitPrice: number }> {
    const concert = await this.prisma.concert.findUnique({
      where: { id: concertId },
      select: { id: true, status: true },
    });

    if (!concert) {
      throw new NotFoundException(`Concert with ID "${concertId}" not found`);
    }

    if (
      concert.status !== ConcertStatus.PUBLISHED &&
      concert.status !== ConcertStatus.SALE_OPEN
    ) {
      throw new BadRequestException(
        `Concert is not open for ticket sales (current status: ${concert.status})`,
      );
    }

    const now = new Date();

    const ticketType = await this.prisma.ticketType.findUnique({
      where: { id: ticketTypeId },
      select: {
        id: true,
        concertId: true,
        status: true,
        maxPerUser: true,
        price: true,
        saleStartsAt: true,
        saleEndsAt: true,
      },
    });

    if (!ticketType) {
      throw new NotFoundException(
        `Ticket type with ID "${ticketTypeId}" not found`,
      );
    }

    if (ticketType.concertId !== concertId) {
      throw new BadRequestException(
        `Ticket type "${ticketTypeId}" does not belong to concert "${concertId}"`,
      );
    }

    if (ticketType.status !== TicketTypeStatus.ACTIVE) {
      throw new BadRequestException(
        `Ticket type is not active (status: ${ticketType.status})`,
      );
    }

    if (ticketType.saleStartsAt > now) {
      throw new BadRequestException('Ticket sales have not started yet');
    }

    if (ticketType.saleEndsAt && ticketType.saleEndsAt < now) {
      throw new BadRequestException('Ticket sales have ended');
    }

    return { maxPerUser: ticketType.maxPerUser, unitPrice: ticketType.price };
  }

  private async ensureRedisStock(ticketTypeId: string): Promise<void> {
    const key = `stock:${ticketTypeId}`;
    const exists = await this.redis.exists(key);
    if (!exists) {
      const tt = await this.prisma.ticketType.findUnique({
        where: { id: ticketTypeId },
        select: { totalQty: true, soldQty: true, reservedQty: true },
      });
      if (tt) {
        const available = tt.totalQty - tt.soldQty - tt.reservedQty;
        await this.redis.set(key, String(Math.max(0, available)));
        this.logger.debug(
          `Seeded Redis stock for ${ticketTypeId}: ${available}`,
        );
      }
    }
  }

  private getReservationTtl(): number {
    return (
      this.configService.get<number>('order.reservationTtlSeconds') ??
      DEFAULT_RESERVATION_TTL_SECONDS
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Create Order
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * POST /orders
   * Customer: Create a new order and reserve tickets.
   */
  async createOrder(
    dto: CreateOrderDto,
    userId: string,
  ): Promise<CreateOrderResponseDto> {
    const ttl = this.getReservationTtl();
    const expiresAt = new Date(Date.now() + ttl * 1000);

    // Step 1: Validate all ticket types and collect metadata
    const ticketMeta: Array<{
      ticketTypeId: string;
      quantity: number;
      maxPerUser: number;
      unitPrice: number;
    }> = [];

    for (const item of dto.items) {
      const meta = await this.validateTicketType(
        dto.concertId,
        item.ticketTypeId,
      );
      ticketMeta.push({
        ticketTypeId: item.ticketTypeId,
        quantity: item.quantity,
        ...meta,
      });
    }

    // Step 2: Seed Redis stock for each ticket type
    await Promise.all(
      ticketMeta.map((m) => this.ensureRedisStock(m.ticketTypeId)),
    );

    // Step 3: Generate order ID before calling Redis
    const orderId = crypto.randomUUID();

    // Step 4: Call Redis Lua Script for EACH ticket type atomically
    const reserveResults = await Promise.all(
      ticketMeta.map((m) =>
        this.redis.reserveTicket({
          ticketTypeId: m.ticketTypeId,
          userId,
          orderId,
          quantity: m.quantity,
          maxPerUser: m.maxPerUser,
          ttlSeconds: ttl,
        }),
      ),
    );

    // Rollback if any reservation failed
    const failedIndex = reserveResults.findIndex((r) => !r.ok);
    if (failedIndex !== -1) {
      const failedResult = reserveResults[failedIndex];
      this.logger.warn(
        `Reservation failed for ${ticketMeta[failedIndex].ticketTypeId}: ${failedResult.error} — rolling back ${failedIndex} successful reservations`,
      );

      for (let i = failedIndex - 1; i >= 0; i--) {
        const rolledBack = await this.redis.releaseReservation({
          ticketTypeId: ticketMeta[i].ticketTypeId,
          userId,
          orderId,
          quantity: ticketMeta[i].quantity,
        });
        if (!rolledBack.ok) {
          this.logger.error(
            `Rollback failed for ticketType=${ticketMeta[i].ticketTypeId}: ${rolledBack.error}`,
          );
        }
      }

      if (failedResult.error === 'OUT_OF_STOCK') {
        throw new BadRequestException(
          `Not enough tickets available for ticket type "${ticketMeta[failedIndex].ticketTypeId}"`,
        );
      }
      if (failedResult.error === 'EXCEED_USER_LIMIT') {
        const remaining = (failedResult as Record<string, unknown>)
          .remaining_can_buy as number | undefined;
        throw new BadRequestException(
          `Purchase limit exceeded. You can buy up to ${remaining ?? 0} more ticket(s) for this ticket type`,
        );
      }
      throw new BadRequestException(
        `Reservation failed: ${failedResult.error} — ${failedResult.message}`,
      );
    }

    // Step 5: All reservations succeeded → create order in PostgreSQL
    const subtotals = ticketMeta.map((m) => ({
      ticketTypeId: m.ticketTypeId,
      quantity: m.quantity,
      unitPrice: m.unitPrice,
      subtotal: m.unitPrice * m.quantity,
    }));

    const totalAmount = subtotals.reduce((sum, s) => sum + s.subtotal, 0);

    let order: OrderWithRelations | null = null;

    try {
      const created = await this.prisma.order.create({
        data: {
          id: orderId,
          userId,
          concertId: dto.concertId,
          status: 'PENDING_PAYMENT',
          totalAmountInVnd: totalAmount,
          currency: 'VND',
          expiresAt,
          items: {
            create: subtotals.map((s) => ({
              ticketTypeId: s.ticketTypeId,
              quantity: s.quantity,
              unitPrice: s.unitPrice,
              subtotal: s.subtotal,
            })),
          },
          payments: {
            create: {
              provider: 'MOCK',
              status: 'INITIATED',
              amount: totalAmount,
            },
          },
        },
        include: {
          items: {
            include: {
              ticketType: { select: { name: true } },
              tickets: { select: { id: true } },
            },
          },
          concert: { select: { title: true } },
          payments: { take: 1, orderBy: { createdAt: 'desc' } as never },
        },
      });

      order = created;
    } catch (err) {
      this.logger.error(
        `Failed to persist order ${orderId} to DB — rolling back Redis reservations`,
        err,
      );

      await Promise.all(
        ticketMeta.map((m) =>
          this.redis.releaseReservation({
            ticketTypeId: m.ticketTypeId,
            userId,
            orderId,
            quantity: m.quantity,
          }),
        ),
      );

      throw new BadRequestException(
        'Failed to create order. Please try again.',
      );
    }

    const paymentUrl = (order.payments ?? [])[0]?.paymentUrl ?? null;
    this.logger.log(
      `Order ${orderId} created, payment URL: ${paymentUrl ?? 'N/A'}`,
    );

    // Schedule delayed job to expire this order if payment is not received
    const delayMs = ttl * 1000;
    await this.expireQueue.add(
      'expire',
      { orderId },
      { delay: delayMs, jobId: `expire-${orderId}` },
    );
    this.logger.debug(`Expire job scheduled for order ${orderId} in ${ttl}s`);

    return {
      order: this.toOrderResponse(order, paymentUrl),
      paymentUrl,
    };
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Get Order by ID (customer)
  // ─────────────────────────────────────────────────────────────────────────────

  async getOrder(orderId: string, userId: string): Promise<OrderResponseDto> {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: {
          include: {
            ticketType: { select: { name: true } },
            tickets: { select: { id: true } },
          },
        },
        concert: { select: { title: true } },
        payments: { take: 1, orderBy: { createdAt: 'desc' } as never },
      },
    });

    if (!order) {
      throw new NotFoundException(`Order with ID "${orderId}" not found`);
    }

    if (order.userId !== userId) {
      throw new UnauthorizedException(
        'You do not have permission to view this order',
      );
    }

    return this.toOrderResponse(order, null);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // List Orders for current user
  // ─────────────────────────────────────────────────────────────────────────────

  async getMyOrders(
    userId: string,
    page = 1,
    limit = 10,
  ): Promise<OrderListResponseDto> {
    const skip = (page - 1) * limit;

    const [orders, total] = await Promise.all([
      this.prisma.order.findMany({
        where: { userId },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          items: {
            include: {
              ticketType: { select: { name: true } },
              tickets: { select: { id: true } },
            },
          },
          concert: { select: { title: true } },
          payments: { take: 1, orderBy: { createdAt: 'desc' } as never },
        },
      }),
      this.prisma.order.count({ where: { userId } }),
    ]);

    return {
      data: (orders as unknown as OrderWithRelations[]).map((o) =>
        this.toOrderResponse(o, null),
      ),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Cancel Order
  // ─────────────────────────────────────────────────────────────────────────────

  async cancelOrder(
    orderId: string,
    userId: string,
  ): Promise<OrderResponseDto> {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: {
          include: {
            ticketType: { select: { name: true } },
            tickets: { select: { id: true } },
          },
        },
        concert: { select: { title: true } },
        payments: { take: 1, orderBy: { createdAt: 'desc' } as never },
      },
    });

    if (!order) {
      throw new NotFoundException(`Order with ID "${orderId}" not found`);
    }

    if (order.userId !== userId) {
      throw new UnauthorizedException(
        'You do not have permission to cancel this order',
      );
    }

    if (order.status !== 'PENDING_PAYMENT') {
      throw new BadRequestException(
        `Only PENDING_PAYMENT orders can be cancelled (current status: ${order.status})`,
      );
    }

    await Promise.all(
      order.items.map((item) =>
        this.redis.releaseReservation({
          ticketTypeId: item.ticketTypeId,
          userId,
          orderId,
          quantity: item.quantity,
        }),
      ),
    );

    const updated = await this.prisma.order.update({
      where: { id: orderId },
      data: {
        status: 'CANCELLED',
        cancelledAt: new Date(),
        releaseReason: 'User requested cancellation',
        inventoryReleasedAt: new Date(),
      },
      include: {
        items: {
          include: {
            ticketType: { select: { name: true } },
            tickets: { select: { id: true } },
          },
        },
        concert: { select: { title: true } },
        payments: { take: 1, orderBy: { createdAt: 'desc' } as never },
      },
    });

    this.logger.log(`Order ${orderId} cancelled by user ${userId}`);
    return this.toOrderResponse(updated, null);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Admin: List all orders
  // ─────────────────────────────────────────────────────────────────────────────

  async getAllOrders(
    page = 1,
    limit = 20,
    status?: string,
    concertId?: string,
  ): Promise<OrderListResponseDto> {
    const skip = (page - 1) * limit;

    const where: Prisma.OrderWhereInput = {};
    if (status) where.status = status as Prisma.OrderWhereInput['status'];
    if (concertId) where.concertId = concertId;

    const [orders, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          items: {
            include: {
              ticketType: { select: { name: true } },
              tickets: { select: { id: true } },
            },
          },
          concert: { select: { title: true } },
          payments: { take: 1, orderBy: { createdAt: 'desc' } as never },
        },
      }),
      this.prisma.order.count({ where }),
    ]);

    return {
      data: (orders as unknown as OrderWithRelations[]).map((o) =>
        this.toOrderResponse(o, null),
      ),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Admin: Get order detail
  // ─────────────────────────────────────────────────────────────────────────────

  async getOrderAdmin(orderId: string): Promise<OrderResponseDto> {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: {
          include: {
            ticketType: { select: { name: true } },
            tickets: { select: { id: true } },
          },
        },
        concert: { select: { title: true } },
        payments: { orderBy: { createdAt: 'desc' } as never },
      },
    });

    if (!order) {
      throw new NotFoundException(`Order with ID "${orderId}" not found`);
    }

    const paymentUrl = (order.payments ?? [])[0]?.paymentUrl ?? null;
    return this.toOrderResponse(order, paymentUrl);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Payment Webhook Handler
  // ─────────────────────────────────────────────────────────────────────────────

  async handlePaymentWebhook(
    provider: string,
    payload: {
      providerTransactionId: string;
      orderId: string;
      amount: number;
      status: 'SUCCESS' | 'FAILED' | 'CANCELLED';
      signature?: string;
    },
  ): Promise<{ received: boolean; orderId: string; status: string }> {
    this.logger.log(
      `Payment webhook from ${provider}: order=${payload.orderId}, tx=${payload.providerTransactionId}, status=${payload.status}`,
    );

    const order = await this.prisma.order.findUnique({
      where: { id: payload.orderId },
      include: {
        items: {
          include: {
            ticketType: { select: { id: true, name: true } },
            tickets: { select: { id: true } },
          },
        },
        payments: { orderBy: { createdAt: 'desc' } as never },
      },
    });

    if (!order) {
      throw new NotFoundException(`Order "${payload.orderId}" not found`);
    }

    if (order.status === 'PAID') {
      this.logger.log(
        `Order ${payload.orderId} already PAID — idempotent skip`,
      );
      return { received: true, orderId: payload.orderId, status: 'PAID' };
    }

    if (order.status === 'EXPIRED' || order.status === 'CANCELLED') {
      this.logger.warn(
        `Order ${payload.orderId} already ${order.status} — idempotent skip`,
      );
      return { received: true, orderId: payload.orderId, status: order.status };
    }

    if (payload.status === 'SUCCESS') {
      return this.finalizePayment(order, payload);
    }
    if (payload.status === 'FAILED') {
      return this.handlePaymentFailed(order);
    }
    if (payload.status === 'CANCELLED') {
      return this.handlePaymentCancelled(order);
    }

    throw new BadRequestException(
      `Unknown payment status: ${String(payload.status)}`,
    );
  }

  private async finalizePayment(
    order: Order & {
      items: Array<
        OrderItem & {
          ticketType: Pick<TicketType, 'id' | 'name'>;
          tickets: Pick<Ticket, 'id'>[];
        }
      >;
      payments: PaymentTransaction[];
    },
    payload: { providerTransactionId: string; amount: number },
  ): Promise<{ received: boolean; orderId: string; status: string }> {
    await this.prisma.$transaction(async (tx) => {
      await tx.order.update({
        where: { id: order.id },
        data: { status: 'PAID', paidAt: new Date() },
      });

      await tx.paymentTransaction.updateMany({
        where: { orderId: order.id, status: 'INITIATED' },
        data: {
          status: 'SUCCESS',
          providerTransactionId: payload.providerTransactionId,
          receivedAt: new Date(),
          rawWebhook: payload,
        },
      });

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

      for (const item of order.items) {
        await tx.ticketType.update({
          where: { id: item.ticketTypeId },
          data: { soldQty: { increment: item.quantity } },
        });
      }

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
          update: { paidQty: { increment: item.quantity } },
        });
      }
    });

    await this.redis.del(`reservation:${order.id}`);
    this.logger.log(`Order ${order.id} finalized — PAID, tickets issued`);
    return { received: true, orderId: order.id, status: 'PAID' };
  }

  private async handlePaymentFailed(
    order: Order & {
      items: Array<OrderItem & { ticketType: Pick<TicketType, 'id'> }>;
      payments: PaymentTransaction[];
    },
  ): Promise<{ received: boolean; orderId: string; status: string }> {
    await this.prisma.$transaction(async (tx) => {
      await tx.order.update({
        where: { id: order.id },
        data: {
          status: 'PAYMENT_FAILED',
          inventoryReleasedAt: new Date(),
          releaseReason: 'Payment failed',
        },
      });
      await tx.paymentTransaction.updateMany({
        where: { orderId: order.id, status: 'INITIATED' },
        data: { status: 'FAILED' },
      });
    });

    await Promise.all(
      order.items.map((item) =>
        this.redis.releaseReservation({
          ticketTypeId: item.ticketTypeId,
          userId: order.userId,
          orderId: order.id,
          quantity: item.quantity,
        }),
      ),
    );

    this.logger.log(
      `Order ${order.id} marked PAYMENT_FAILED — inventory released`,
    );
    return { received: true, orderId: order.id, status: 'PAYMENT_FAILED' };
  }

  private async handlePaymentCancelled(
    order: Order & {
      items: Array<OrderItem & { ticketType: Pick<TicketType, 'id'> }>;
      payments: PaymentTransaction[];
    },
  ): Promise<{ received: boolean; orderId: string; status: string }> {
    await this.prisma.$transaction(async (tx) => {
      await tx.order.update({
        where: { id: order.id },
        data: {
          status: 'CANCELLED',
          cancelledAt: new Date(),
          inventoryReleasedAt: new Date(),
          releaseReason: 'Payment cancelled by user',
        },
      });
      await tx.paymentTransaction.updateMany({
        where: { orderId: order.id, status: 'INITIATED' },
        data: { status: 'CANCELLED' },
      });
    });

    await Promise.all(
      order.items.map((item) =>
        this.redis.releaseReservation({
          ticketTypeId: item.ticketTypeId,
          userId: order.userId,
          orderId: order.id,
          quantity: item.quantity,
        }),
      ),
    );

    this.logger.log(
      `Order ${order.id} marked CANCELLED after payment cancellation`,
    );
    return { received: true, orderId: order.id, status: 'CANCELLED' };
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Expire Order (called by BullMQ worker)
  // ─────────────────────────────────────────────────────────────────────────────

  async expireOrder(orderId: string): Promise<void> {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: { include: { ticketType: { select: { id: true } } } },
      },
    });

    if (!order) {
      this.logger.warn(`Expire job: order ${orderId} not found`);
      return;
    }

    if (order.status !== 'PENDING_PAYMENT') {
      this.logger.debug(
        `Expire job: order ${orderId} is ${order.status} — skip`,
      );
      return;
    }

    if (order.expiresAt && order.expiresAt > new Date()) {
      this.logger.debug(`Expire job: order ${orderId} not yet expired`);
      return;
    }

    await Promise.all(
      order.items.map((item) =>
        this.redis.releaseReservation({
          ticketTypeId: item.ticketTypeId,
          userId: order.userId,
          orderId: order.id,
          quantity: item.quantity,
        }),
      ),
    );

    await this.prisma.order.update({
      where: { id: orderId },
      data: {
        status: 'EXPIRED',
        inventoryReleasedAt: new Date(),
        releaseReason: 'Payment not received within reservation window',
      },
    });

    this.logger.log(`Order ${orderId} expired — inventory released`);
  }
}
