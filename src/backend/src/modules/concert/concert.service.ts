import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { ConcertStatus, Concert, TicketType, Prisma } from '@prisma/client';
import { CreateConcertDto, UpdateConcertDto, ConcertQueryDto } from './dto';
import {
  ConcertResponseDto,
  ConcertListResponseDto,
} from './dto/concert-response.dto';

// Định nghĩa payload
type ConcertPayload = Concert & {
  organizer?: { fullName: string | null } | null;
  ticketTypes?: TicketType[];
};

@Injectable()
export class ConcertService {
  constructor(private prisma: PrismaService) {}

  /**
   * Transform raw concert data from Prisma into a structured response DTO.
   * Includes organizer name for convenience.
   */
  private toResponse(concert: ConcertPayload): ConcertResponseDto {
    return {
      id: concert.id,
      title: concert.title,
      slug: concert.slug,
      description: concert.description,
      artistBio: concert.artistBio,
      venue: concert.venue,
      startsAt: concert.startsAt,
      saleStartsAt: concert.saleStartsAt,
      saleEndsAt: concert.saleEndsAt,
      status: concert.status,
      seatMapUrl: concert.seatMapUrl,
      coverImageUrl: concert.coverImageUrl,
      organizerId: concert.organizerId,
      organizerName: concert.organizer?.fullName ?? null,
      createdAt: concert.createdAt,
      updatedAt: concert.updatedAt,
      ticketTypes: concert.ticketTypes
        ? concert.ticketTypes.map((tt: TicketType) => ({
            id: tt.id,
            name: tt.name,
            price: tt.price,
            totalQty: tt.totalQty,
            soldQty: tt.soldQty,
            reservedQty: tt.reservedQty,
            status: tt.status,
            saleStartsAt: tt.saleStartsAt,
            saleEndsAt: tt.saleEndsAt,
          }))
        : undefined,
    };
  }

  /**
   * List all public concerts with optional status filter and pagination.
   * Public endpoint - only returns published concerts by default.
   */
  async findAll(query: ConcertQueryDto): Promise<ConcertListResponseDto> {
    const { status, page = 1, limit = 20 } = query;
    const skip = (page - 1) * limit;

    // For public listing, we show PUBLISHED and SALE_OPEN concerts by default
    const statusFilter = status || ConcertStatus.PUBLISHED;

    const where: Prisma.ConcertWhereInput = {
      status: statusFilter,
    };

    const [concerts, total] = await Promise.all([
      this.prisma.concert.findMany({
        where,
        skip,
        take: limit,
        orderBy: { startsAt: 'asc' },
        include: {
          organizer: {
            select: { fullName: true },
          },
        },
      }),
      this.prisma.concert.count({ where }),
    ]);

    return {
      data: concerts.map((c) => this.toResponse(c)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Get a single concert by ID with all ticket types.
   * Public endpoint - only returns published concerts.
   */
  async findOne(id: string): Promise<ConcertResponseDto> {
    const concert = await this.prisma.concert.findUnique({
      where: { id },
      include: {
        organizer: {
          select: { fullName: true },
        },
        ticketTypes: {
          orderBy: { price: 'desc' },
        },
      },
    });

    if (!concert) {
      throw new NotFoundException(`Concert with ID "${id}" not found`);
    }

    // Only allow viewing published concerts publicly
    if (
      concert.status !== ConcertStatus.PUBLISHED &&
      concert.status !== ConcertStatus.SALE_OPEN
    ) {
      throw new NotFoundException(`Concert with ID "${id}" not found`);
    }

    return this.toResponse(concert);
  }

  /**
   * Get a single concert by slug (alternative to ID lookup).
   * Public endpoint - only returns published concerts.
   */
  async findBySlug(slug: string): Promise<ConcertResponseDto> {
    const concert = await this.prisma.concert.findUnique({
      where: { slug },
      include: {
        organizer: {
          select: { fullName: true },
        },
        ticketTypes: {
          orderBy: { price: 'desc' },
        },
      },
    });

    if (!concert) {
      throw new NotFoundException(`Concert with slug "${slug}" not found`);
    }

    // Only allow viewing published concerts publicly
    if (
      concert.status !== ConcertStatus.PUBLISHED &&
      concert.status !== ConcertStatus.SALE_OPEN
    ) {
      throw new NotFoundException(`Concert with slug "${slug}" not found`);
    }

    return this.toResponse(concert);
  }

  /**
   * Create a new concert. Admin only.
   */
  async create(dto: CreateConcertDto): Promise<ConcertResponseDto> {
    // Check for duplicate slug
    const existing = await this.prisma.concert.findUnique({
      where: { slug: dto.slug },
    });

    if (existing) {
      throw new ConflictException(
        `Concert with slug "${dto.slug}" already exists`,
      );
    }

    const concert = await this.prisma.concert.create({
      data: {
        title: dto.title,
        slug: dto.slug,
        description: dto.description,
        artistBio: dto.artistBio,
        venue: dto.venue,
        startsAt: new Date(dto.startsAt),
        saleStartsAt: dto.saleStartsAt ? new Date(dto.saleStartsAt) : null,
        saleEndsAt: dto.saleEndsAt ? new Date(dto.saleEndsAt) : null,
        status: dto.status || ConcertStatus.DRAFT,
        seatMapUrl: dto.seatMapUrl,
        coverImageUrl: dto.coverImageUrl,
        organizerId: dto.organizerId || '',
      },
      include: {
        organizer: {
          select: { fullName: true },
        },
      },
    });

    return this.toResponse(concert);
  }

  /**
   * Update an existing concert. Admin only.
   */
  async update(id: string, dto: UpdateConcertDto): Promise<ConcertResponseDto> {
    // Check if concert exists
    const existing = await this.prisma.concert.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException(`Concert with ID "${id}" not found`);
    }

    // If slug is being updated, check for conflicts
    if (dto.slug && dto.slug !== existing.slug) {
      const slugConflict = await this.prisma.concert.findUnique({
        where: { slug: dto.slug },
      });

      if (slugConflict) {
        throw new ConflictException(
          `Concert with slug "${dto.slug}" already exists`,
        );
      }
    }

    const concert = await this.prisma.concert.update({
      where: { id },
      data: {
        ...(dto.title !== undefined && { title: dto.title }),
        ...(dto.slug !== undefined && { slug: dto.slug }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.artistBio !== undefined && { artistBio: dto.artistBio }),
        ...(dto.venue !== undefined && { venue: dto.venue }),
        ...(dto.startsAt !== undefined && { startsAt: new Date(dto.startsAt) }),
        ...(dto.saleStartsAt !== undefined && {
          saleStartsAt: dto.saleStartsAt ? new Date(dto.saleStartsAt) : null,
        }),
        ...(dto.saleEndsAt !== undefined && {
          saleEndsAt: dto.saleEndsAt ? new Date(dto.saleEndsAt) : null,
        }),
        ...(dto.status !== undefined && { status: dto.status }),
        ...(dto.seatMapUrl !== undefined && { seatMapUrl: dto.seatMapUrl }),
        ...(dto.coverImageUrl !== undefined && {
          coverImageUrl: dto.coverImageUrl,
        }),
      },
      include: {
        organizer: {
          select: { fullName: true },
        },
        ticketTypes: {
          orderBy: { price: 'desc' },
        },
      },
    });

    return this.toResponse(concert);
  }

  /**
   * Delete a concert. Admin only.
   * Note: This will fail if the concert has existing orders.
   */
  async remove(id: string): Promise<{ message: string }> {
    const concert = await this.prisma.concert.findUnique({
      where: { id },
      include: {
        orders: { where: { status: { in: ['PENDING_PAYMENT', 'PAID'] } } },
      },
    });

    if (!concert) {
      throw new NotFoundException(`Concert with ID "${id}" not found`);
    }

    // Prevent deletion if concert has active orders
    if (concert.orders.length > 0) {
      throw new BadRequestException(
        `Cannot delete concert with ${concert.orders.length} active orders. Cancel orders first.`,
      );
    }

    // Delete in proper order to respect foreign key constraints
    await this.prisma.$transaction([
      // Delete checkin logs
      this.prisma.checkinLog.deleteMany({
        where: { concertId: id },
      }),
      // Delete tickets
      this.prisma.ticket.deleteMany({
        where: { concertId: id },
      }),
      // Delete order items (tickets are deleted, so we need to clean up order items first)
      this.prisma.orderItem.deleteMany({
        where: {
          order: {
            concertId: id,
          },
        },
      }),
      // Delete orders
      this.prisma.order.deleteMany({
        where: { concertId: id },
      }),
      // Delete ticket types
      this.prisma.ticketType.deleteMany({
        where: { concertId: id },
      }),
      // Delete guest list entries
      this.prisma.guestListEntry.deleteMany({
        where: { concertId: id },
      }),
      // Delete uploaded files
      this.prisma.uploadedFile.deleteMany({
        where: { concertId: id },
      }),
      // Finally delete the concert
      this.prisma.concert.delete({
        where: { id },
      }),
    ]);

    return { message: `Concert "${concert.title}" deleted successfully` };
  }
}
