import {
  Injectable,
  NotFoundException,
  BadRequestException,
  UnauthorizedException,
  UnprocessableEntityException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrismaService } from '../../database/prisma.service';
import { RedisService } from '../redis/redis.service';
import { buildQrPayload } from '../ticket/utils/qr-payload.util';
import {
  ConcertStatus,
  TicketTypeStatus,
  Order,
  OrderItem,
  TicketType,
  Prisma,
  OrderStatus,
  TicketStatus,
} from '@prisma/client';
import { CreateOrderDto } from './dto/create-order.dto';
import {
  OrderResponseDto,
  OrderListResponseDto,
  OrderItemResponseDto,
  OrderTicketResponseDto,
  CreateOrderResponseDto,
} from './dto/order-response.dto';
import {
  ORDER_EXPIRE_QUEUE,
  NOTIFICATION_QUEUE,
} from '../queue/queue.constants';
import { PaymentService } from '../payment/payment.service';
import { SeatmapBroadcastService } from '../seatmap/seatmap-broadcast.service';
import { ConcertService } from '../concert/concert.service';

const DEFAULT_RESERVATION_TTL_SECONDS = 15 * 60; // 15 minutes

// ─────────────────────────────────────────────────────────────────────────────
type TicketWithQr = {
  id: string;
  ticketTypeId: string;
  status: TicketStatus;
  checkedInAt: Date | null;
  createdAt: Date;
  qrRawToken: string;
  gateId: string | null;
  ticketType: Pick<TicketType, 'name'>;
};

// OrderWithRelations: used when full ticket data is needed (e.g. GET /orders/:id)
type OrderWithFullTickets = Order & {
  items: (OrderItem & {
    ticketType: Pick<TicketType, 'name'>;
    tickets: TicketWithQr[];
  })[];
  concert: { title: string };
  payments: { status: string; paymentUrl: string | null }[];
};

// OrderWithMinimalTickets: used when only ticket count is needed
type OrderWithMinimalTickets = Order & {
  items: (OrderItem & {
    ticketType: Pick<TicketType, 'name'>;
    tickets: { id: string }[];
  })[];
  concert: { title: string };
  payments: { status: string; paymentUrl: string | null }[];
};

// ─────────────────────────────────────────────────────────────────────────────

@Injectable()
export class OrderService {
  private readonly logger = new Logger(OrderService.name);

  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
    private configService: ConfigService,
    private paymentService: PaymentService,
    private readonly seatmapBroadcastService: SeatmapBroadcastService,
    private readonly concertService: ConcertService,
    @InjectQueue(ORDER_EXPIRE_QUEUE) private readonly expireQueue: Queue,
    @InjectQueue(NOTIFICATION_QUEUE) private readonly notificationQueue: Queue,
  ) { }

  // ─────────────────────────────────────────────────────────────────────────────
  // Mapping helpers
  // ─────────────────────────────────────────────────────────────────────────────

  private buildQrPayload(ticket: {
    id: string;
    qrRawToken: string;
    gateId: string | null;
  }): string {
    return buildQrPayload({
      id: ticket.id,
      rawToken: ticket.qrRawToken,
      gateId: ticket.gateId ?? '',
    });
  }

  private toOrderItemResponse(item: {
    id: string;
    ticketTypeId: string;
    ticketType: { name: string };
    quantity: number;
    unitPrice: number;
    subtotal: number;
    tickets?: { id: string }[];
  }): OrderItemResponseDto {
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

  private toTicketResponse(ticket: TicketWithQr): OrderTicketResponseDto {
    return {
      id: ticket.id,
      ticketTypeId: ticket.ticketTypeId,
      ticketTypeName: ticket.ticketType.name,
      status: ticket.status,
      checkedInAt: ticket.checkedInAt,
      createdAt: ticket.createdAt,
      qrPayload: this.buildQrPayload(ticket),
    };
  }

  /**
   * Maps an order with full ticket data (QR payloads) — used for GET /orders/:id.
   */
  private toOrderResponseFull(
    order: OrderWithFullTickets,
    paymentUrl?: string | null,
  ): OrderResponseDto {
    const tickets: OrderTicketResponseDto[] = [];
    for (const item of order.items ?? []) {
      for (const ticket of item.tickets ?? []) {
        tickets.push(this.toTicketResponse(ticket));
      }
    }

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
      ticketCount: tickets.length,
      tickets: order.status === OrderStatus.PAID ? tickets : undefined,
      serverTime: new Date(),
    };
  }

  /**
   * Maps an order with minimal ticket data (count only) — used for list/cancel/create.
   */
  private toOrderResponseMinimal(
    order: OrderWithMinimalTickets,
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
      serverTime: new Date(),
    };
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

  /**
   * Lazy-seed Redis stock only if the key is missing.
   * Uses SET NX so concurrent first-hits cannot overwrite a stock value that
   * another request has already decremented (EXISTS+SET race → oversell).
   * Prefer seeding at ticket-type create / health reset instead of this path.
   */
  private async ensureRedisStock(ticketTypeId: string): Promise<void> {
    const key = `stock:${ticketTypeId}`;
    if (await this.redis.exists(key)) {
      return;
    }

    const tt = await this.prisma.ticketType.findUnique({
      where: { id: ticketTypeId },
      select: { totalQty: true, soldQty: true, reservedQty: true },
    });
    if (!tt) {
      return;
    }

    const available = Math.max(0, tt.totalQty - tt.soldQty - tt.reservedQty);
    const seeded = await this.redis.setNx(key, String(available));
    if (seeded) {
      this.logger.debug(
        `Seeded Redis stock for ${ticketTypeId}: ${available}`,
      );
    }
  }

  private async ensureRedisUserLimit(userId: string, ticketTypeId: string): Promise<void> {
    const key = `user_limit:${userId}:${ticketTypeId}`;
    if (await this.redis.exists(key)) {
      return;
    }

    const counter = await this.prisma.userTicketCounter.findUnique({
      where: {
        userId_ticketTypeId: { userId, ticketTypeId },
      },
      select: { paidQty: true, reservedQty: true },
    });

    const currentCount = counter ? (counter.paidQty + counter.reservedQty) : 0;
    const seeded = await this.redis.setNx(key, String(currentCount));
    if (seeded) {
      this.logger.debug(
        `Seeded Redis user limit for user ${userId}, ticketType ${ticketTypeId}: ${currentCount}`,
      );
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

    // Step 2: Seed Redis stock and user limit for each ticket type
    await Promise.all(
      ticketMeta.flatMap((m) => [
        this.ensureRedisStock(m.ticketTypeId),
        this.ensureRedisUserLimit(userId, m.ticketTypeId),
      ]),
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
        throw new UnprocessableEntityException(
          `Not enough tickets available for ticket type "${ticketMeta[failedIndex].ticketTypeId}"`,
        );
      }
      if (failedResult.error === 'EXCEED_USER_LIMIT') {
        const remaining = (failedResult as Record<string, unknown>)
          .remaining_can_buy as number | undefined;
        throw new UnprocessableEntityException(
          `Purchase limit exceeded. You can buy up to ${remaining ?? 0} more ticket(s) for this ticket type`,
        );
      }
      throw new UnprocessableEntityException(
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

    let created: any = null;

    try {
      created = await this.prisma.order.create({
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

    // Sync PostgreSQL inventory counters (second defense against oversell:
    // reject if reservedQty + soldQty + qty would exceed totalQty)
    try {
      await this.prisma.$transaction(async (tx) => {
        for (const m of ticketMeta) {
          const affected = await tx.$executeRaw`
            UPDATE "TicketType"
            SET "reservedQty" = "reservedQty" + ${m.quantity},
                "updatedAt" = NOW()
            WHERE "id" = ${m.ticketTypeId}
              AND ("reservedQty" + "soldQty" + ${m.quantity}) <= "totalQty"
          `;
          if (Number(affected) === 0) {
            throw new UnprocessableEntityException(
              `Not enough tickets available for ticket type "${m.ticketTypeId}"`,
            );
          }

          await tx.userTicketCounter.upsert({
            where: {
              userId_ticketTypeId: { userId, ticketTypeId: m.ticketTypeId },
            },
            create: {
              userId,
              ticketTypeId: m.ticketTypeId,
              reservedQty: m.quantity,
            },
            update: { reservedQty: { increment: m.quantity } },
          });
        }
      });
    } catch (inventoryErr) {
      this.logger.error(
        `Failed to sync inventory for order ${orderId} — rolling back Redis + order`,
        inventoryErr,
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
      await this.prisma.order
        .delete({ where: { id: orderId } })
        .catch(() => undefined);

      if (inventoryErr instanceof UnprocessableEntityException) {
        throw inventoryErr;
      }
      throw new BadRequestException(
        'Failed to create order. Please try again.',
      );
    }

    // Create PaymentTransaction and get payment URL from gateway
    let paymentUrl: string;
    try {
      const result = await this.paymentService.createPaymentUrl({
        orderId,
        userId,
      });
      paymentUrl = result.paymentUrl;
    } catch (gatewayErr) {
      // Payment gateway failed → rollback everything
      this.logger.error(
        `Payment gateway failed for order ${orderId}: ${gatewayErr} — rolling back`,
      );

      // Rollback Redis reservations
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

      // Rollback PostgreSQL inventory counters
      await Promise.all([
        ...ticketMeta.map((m) =>
          this.prisma.ticketType.update({
            where: { id: m.ticketTypeId },
            data: { reservedQty: { decrement: m.quantity } },
          }),
        ),
        ...ticketMeta.map((m) =>
          this.prisma.userTicketCounter.update({
            where: {
              userId_ticketTypeId: { userId, ticketTypeId: m.ticketTypeId },
            },
            data: { reservedQty: { decrement: m.quantity } },
          }),
        ),
      ]);

      // Delete the order record (it only exists because payment failed)
      await this.prisma.order.delete({ where: { id: orderId } });

      throw gatewayErr;
    }
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

    // Broadcast seatmap updates
    for (const m of ticketMeta) {
      void this.seatmapBroadcastService.refreshAndBroadcast(
        dto.concertId,
        m.ticketTypeId,
      );
    }

    // reservedQty changed — refresh concert detail/list cache
    void this.concertService.invalidateCache(dto.concertId);

    return {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      order: this.toOrderResponseMinimal(created, paymentUrl),
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
            tickets: {
              select: {
                id: true,
                ticketTypeId: true,
                status: true,
                checkedInAt: true,
                createdAt: true,
                qrRawToken: true,
                gateId: true,
                ticketType: { select: { name: true } },
              },
            },
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

    return this.toOrderResponseFull(order, null);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // List Orders for current user
  // ─────────────────────────────────────────────────────────────────────────────

  async getMyOrders(
    userId: string,
    page = 1,
    limit = 10,
    status?: OrderStatus,
  ): Promise<OrderListResponseDto> {
    const skip = (page - 1) * limit;

    const [orders, total] = await Promise.all([
      this.prisma.order.findMany({
        where: { userId, ...(status ? { status } : {}) },
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
      data: (orders as OrderWithMinimalTickets[]).map((o) =>
        this.toOrderResponseMinimal(o, null),
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

    // Release PostgreSQL inventory counters
    await Promise.all([
      ...order.items.map((item) =>
        this.prisma.ticketType.update({
          where: { id: item.ticketTypeId },
          data: { reservedQty: { decrement: item.quantity } },
        }),
      ),
      ...order.items.map((item) =>
        this.prisma.userTicketCounter.update({
          where: {
            userId_ticketTypeId: { userId, ticketTypeId: item.ticketTypeId },
          },
          data: { reservedQty: { decrement: item.quantity } },
        }),
      ),
    ]);

    const updated = await this.prisma.order.update({
      where: { id: orderId },
      data: {
        status: 'CANCELLED',
        cancelledAt: new Date(),
        releaseReason: 'CANCELLED',
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

    // Broadcast seatmap updates
    for (const item of updated.items) {
      void this.seatmapBroadcastService.refreshAndBroadcast(
        updated.concertId,
        item.ticketTypeId,
      );
    }

    void this.concertService.invalidateCache(updated.concertId);

    return this.toOrderResponseMinimal(updated, null);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Admin: List all orders
  // ─────────────────────────────────────────────────────────────────────────────

  async getAllOrders(
    page = 1,
    limit = 20,
    status?: string,
    concertId?: string,
    organizerId?: string,
  ): Promise<OrderListResponseDto> {
    const skip = (page - 1) * limit;

    const where: Prisma.OrderWhereInput = {};
    if (status) where.status = status as Prisma.OrderWhereInput['status'];
    if (concertId) where.concertId = concertId;
    if (organizerId) {
      where.concert = { organizerId };
    }

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
      data: (orders as OrderWithMinimalTickets[]).map((o) =>
        this.toOrderResponseMinimal(o, null),
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
    return this.toOrderResponseMinimal(order, paymentUrl);
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

    // Release Redis reservations
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

    // Decrement per-user counter in PostgreSQL
    await Promise.all(
      order.items.map((item) =>
        this.prisma.userTicketCounter.update({
          where: {
            userId_ticketTypeId: {
              userId: order.userId,
              ticketTypeId: item.ticketType.id,
            },
          },
          data: { reservedQty: { decrement: item.quantity } },
        }),
      ),
    );

    // Decrement reservedQty on TicketType in PostgreSQL
    await Promise.all(
      order.items.map((item) =>
        this.prisma.ticketType.update({
          where: { id: item.ticketTypeId },
          data: { reservedQty: { decrement: item.quantity } },
        }),
      ),
    );

    await this.prisma.order.update({
      where: { id: orderId },
      data: {
        status: 'EXPIRED',
        inventoryReleasedAt: new Date(),
        releaseReason: 'PAYMENT_TIMEOUT',
      },
    });

    this.logger.log(`Order ${orderId} expired and inventory released`);

    // Broadcast seatmap updates
    for (const item of order.items) {
      void this.seatmapBroadcastService.refreshAndBroadcast(
        order.concertId,
        item.ticketTypeId,
      );
    }

    void this.concertService.invalidateCache(order.concertId);
  }
}
