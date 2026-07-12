import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import {
  ConcertStatus,
  TicketTypeStatus,
  Role,
  TicketType,
  Prisma,
} from '@prisma/client';
import { CreateTicketTypeDto, UpdateTicketTypeDto } from './dto';
import {
  TicketTypeResponseDto,
  TicketTypeListResponseDto,
} from './dto/ticket-type-response.dto';
import { ConcertService } from '../concert/concert.service';
import { RedisService } from '../redis/redis.service';

type TicketTypeWithAvailability = TicketType & {
  availableQty?: number;
};

@Injectable()
export class TicketTypeService {
  constructor(
    private prisma: PrismaService,
    private readonly concertService: ConcertService,
    private readonly redis: RedisService,
  ) {}

  private toResponse(tt: TicketTypeWithAvailability): TicketTypeResponseDto {
    return {
      id: tt.id,
      concertId: tt.concertId,
      name: tt.name,
      price: tt.price,
      totalQty: tt.totalQty,
      soldQty: tt.soldQty,
      reservedQty: tt.reservedQty,
      availableQty:
        tt.availableQty ?? tt.totalQty - tt.soldQty - tt.reservedQty,
      maxPerUser: tt.maxPerUser,
      saleStartsAt: tt.saleStartsAt,
      saleEndsAt: tt.saleEndsAt,
      status: tt.status,
      createdAt: tt.createdAt,
      updatedAt: tt.updatedAt,
    };
  }

  /**
   * Verify that the user owns the concert.
   * ADMIN can access any concert. ORGANIZER can only access their own.
   */
  private async checkConcertOwnership(
    concertId: string,
    userId: string,
    userRole: Role,
  ): Promise<{ id: string; organizerId: string }> {
    const concert = await this.prisma.concert.findUnique({
      where: { id: concertId },
      select: { id: true, organizerId: true },
    });

    if (!concert) {
      throw new NotFoundException(`Concert with ID "${concertId}" not found`);
    }

    if (userRole !== Role.ADMIN && concert.organizerId !== userId) {
      throw new ForbiddenException(
        'You do not have permission to manage ticket types for this concert',
      );
    }

    return concert;
  }

  /**
   * List all ticket types for a concert (admin).
   * Supports optional status filter to leverage [concertId, status] index.
   */
  async findAll(
    concertId: string,
    userId: string,
    userRole: Role,
    status?: TicketTypeStatus,
  ): Promise<TicketTypeListResponseDto> {
    await this.checkConcertOwnership(concertId, userId, userRole);

    const where: Prisma.TicketTypeWhereInput = { concertId };
    if (status) {
      where.status = status;
    }

    const ticketTypes = await this.prisma.ticketType.findMany({
      where,
      orderBy: { price: 'desc' },
    });

    return {
      data: ticketTypes.map((tt) => this.toResponse(tt)),
      total: ticketTypes.length,
    };
  }

  /**
   * Get a single ticket type by ID (admin).
   */
  async findOne(
    id: string,
    userId: string,
    userRole: Role,
  ): Promise<TicketTypeResponseDto> {
    const ticketType = await this.prisma.ticketType.findUnique({
      where: { id },
      include: { concert: { select: { id: true, organizerId: true } } },
    });

    if (!ticketType) {
      throw new NotFoundException(`Ticket type with ID "${id}" not found`);
    }

    await this.checkConcertOwnership(ticketType.concertId, userId, userRole);

    return this.toResponse(ticketType);
  }

  /**
   * Create a new ticket type for a concert.
   * Organizer can only create for their own concerts.
   */
  async create(
    concertId: string,
    dto: CreateTicketTypeDto,
    userId: string,
    userRole: Role,
  ): Promise<TicketTypeResponseDto> {
    await this.checkConcertOwnership(concertId, userId, userRole);

    // Check for duplicate name within the same concert
    const existing = await this.prisma.ticketType.findUnique({
      where: {
        concertId_name: {
          concertId,
          name: dto.name,
        },
      },
    });

    if (existing) {
      throw new ConflictException(
        `Ticket type "${dto.name}" already exists for this concert`,
      );
    }

    // Cannot create ticket types for completed/cancelled concerts
    const fullConcert = await this.prisma.concert.findUnique({
      where: { id: concertId },
      select: { status: true },
    });

    if (
      fullConcert &&
      (fullConcert.status === ConcertStatus.COMPLETED ||
        fullConcert.status === ConcertStatus.CANCELLED)
    ) {
      throw new BadRequestException(
        'Cannot add ticket types to a completed or cancelled concert',
      );
    }

    const ticketType = await this.prisma.ticketType.create({
      data: {
        concertId,
        name: dto.name,
        price: dto.price,
        totalQty: dto.totalQty,
        soldQty: 0,
        reservedQty: 0,
        maxPerUser: dto.maxPerUser,
        saleStartsAt: new Date(dto.saleStartsAt),
        saleEndsAt: dto.saleEndsAt ? new Date(dto.saleEndsAt) : null,
        status: dto.status ?? TicketTypeStatus.ACTIVE,
      },
    });

    // Design: seed Redis stock:{ticketTypeId} = totalQty at create time
    await this.redis.seedStock(ticketType.id, ticketType.totalQty);

    void this.concertService.invalidateCache(concertId);

    return this.toResponse(ticketType);
  }

  /**
   * Update an existing ticket type.
   * Organizer can only update ticket types of their own concerts.
   */
  async update(
    id: string,
    dto: UpdateTicketTypeDto,
    userId: string,
    userRole: Role,
  ): Promise<TicketTypeResponseDto> {
    const existing = await this.prisma.ticketType.findUnique({
      where: { id },
      include: { concert: { select: { id: true, organizerId: true } } },
    });

    if (!existing) {
      throw new NotFoundException(`Ticket type with ID "${id}" not found`);
    }

    await this.checkConcertOwnership(existing.concertId, userId, userRole);

    // If renaming, check for duplicate name
    if (dto.name !== undefined && dto.name !== existing.name) {
      const duplicate = await this.prisma.ticketType.findUnique({
        where: {
          concertId_name: {
            concertId: existing.concertId,
            name: dto.name,
          },
        },
      });

      if (duplicate) {
        throw new ConflictException(
          `Ticket type "${dto.name}" already exists for this concert`,
        );
      }
    }

    // Prevent reducing totalQty below soldQty + reservedQty
    if (dto.totalQty !== undefined) {
      const sold = dto.soldQty ?? existing.soldQty;
      const reserved = dto.reservedQty ?? existing.reservedQty;

      if (dto.totalQty < sold + reserved) {
        throw new BadRequestException(
          `Cannot reduce total quantity to ${dto.totalQty}. Already sold: ${sold}, reserved: ${reserved}. Minimum allowed: ${sold + reserved}`,
        );
      }
    }

    // soldQty/reservedQty can only be updated by ADMIN (internal operations)
    if (
      (dto.soldQty !== undefined || dto.reservedQty !== undefined) &&
      userRole !== Role.ADMIN
    ) {
      throw new ForbiddenException(
        'Only ADMIN can manually adjust soldQty or reservedQty',
      );
    }

    const updateData: Prisma.TicketTypeUpdateInput = {
      ...(dto.name !== undefined && { name: dto.name }),
      ...(dto.price !== undefined && { price: dto.price }),
      ...(dto.totalQty !== undefined && { totalQty: dto.totalQty }),
      ...(dto.soldQty !== undefined && { soldQty: dto.soldQty }),
      ...(dto.reservedQty !== undefined && { reservedQty: dto.reservedQty }),
      ...(dto.maxPerUser !== undefined && { maxPerUser: dto.maxPerUser }),
      ...(dto.saleStartsAt !== undefined && {
        saleStartsAt: new Date(dto.saleStartsAt),
      }),
      ...(dto.saleEndsAt !== undefined && {
        saleEndsAt: dto.saleEndsAt ? new Date(dto.saleEndsAt) : null,
      }),
      ...(dto.status !== undefined && { status: dto.status }),
    };

    const ticketType = await this.prisma.ticketType.update({
      where: { id },
      data: updateData,
    });

    // Keep Redis stock in sync when inventory fields change
    if (
      dto.totalQty !== undefined ||
      dto.soldQty !== undefined ||
      dto.reservedQty !== undefined
    ) {
      const available =
        ticketType.totalQty - ticketType.soldQty - ticketType.reservedQty;
      await this.redis.seedStock(ticketType.id, available);
    }

    // Auto-set SOLD_OUT status if available qty reaches 0
    if (
      ticketType.totalQty - ticketType.soldQty - ticketType.reservedQty === 0 &&
      ticketType.status !== TicketTypeStatus.SOLD_OUT
    ) {
      const updated = await this.prisma.ticketType.update({
        where: { id },
        data: { status: TicketTypeStatus.SOLD_OUT },
      });
      void this.concertService.invalidateCache(existing.concertId);
      return this.toResponse(updated);
    }

    void this.concertService.invalidateCache(existing.concertId);
    return this.toResponse(ticketType);
  }

  /**
   * Delete a ticket type.
   * Cannot delete if tickets have been sold or reserved.
   */
  async remove(
    id: string,
    userId: string,
    userRole: Role,
  ): Promise<{ message: string }> {
    const ticketType = await this.prisma.ticketType.findUnique({
      where: { id },
      include: {
        concert: { select: { id: true, organizerId: true } },
      },
    });

    if (!ticketType) {
      throw new NotFoundException(`Ticket type with ID "${id}" not found`);
    }

    await this.checkConcertOwnership(ticketType.concertId, userId, userRole);

    if (ticketType.soldQty > 0 || ticketType.reservedQty > 0) {
      throw new BadRequestException(
        `Cannot delete ticket type with soldQty=${ticketType.soldQty} and reservedQty=${ticketType.reservedQty}. Cancel or process orders first.`,
      );
    }

    await this.prisma.ticketType.delete({
      where: { id },
    });

    await this.redis.del(`stock:${id}`);

    void this.concertService.invalidateCache(ticketType.concertId);

    return {
      message: `Ticket type "${ticketType.name}" deleted successfully`,
    };
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Public endpoints (no auth required)
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Public: List active ticket types for a concert.
   * Only returns ACTIVE ticket types that are currently on sale.
   * Used by customers to see available tickets.
   */
  async findAvailable(concertId: string): Promise<TicketTypeListResponseDto> {
    const concert = await this.prisma.concert.findUnique({
      where: { id: concertId },
      select: { status: true },
    });

    if (!concert) {
      throw new NotFoundException(`Concert with ID "${concertId}" not found`);
    }

    // Only show ticket types for published concerts
    if (
      concert.status !== ConcertStatus.PUBLISHED &&
      concert.status !== ConcertStatus.SALE_OPEN
    ) {
      return { data: [], total: 0 };
    }

    const now = new Date();

    const ticketTypes = await this.prisma.ticketType.findMany({
      where: {
        concertId,
        status: TicketTypeStatus.ACTIVE,
        saleStartsAt: { lte: now },
        OR: [{ saleEndsAt: null }, { saleEndsAt: { gt: now } }],
      },
      orderBy: { price: 'desc' },
    });

    return {
      data: ticketTypes.map((tt) => this.toResponse(tt)),
      total: ticketTypes.length,
    };
  }
}
