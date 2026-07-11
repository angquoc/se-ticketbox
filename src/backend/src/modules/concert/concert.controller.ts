import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ConcertService } from './concert.service';
import { CreateConcertDto, UpdateConcertDto, ConcertQueryDto } from './dto';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { AuthGuard } from '../auth/guards/auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthUser } from '../auth/decorators/current-user.decorator';
import { RateLimitGuard } from '../rate-limit/rate-limit.guard';
import { RateLimit } from '../rate-limit/rate-limit.decorator';
import { RATE_LIMIT_DEFAULTS } from '../rate-limit/rate-limit.service';

@Controller()
export class ConcertController {
  constructor(private readonly concertService: ConcertService) {}

  /**
   * GET /concerts
   * Public endpoint - returns a paginated list of published concerts.
   * Supports optional status filter and pagination parameters.
   *
   * Rate limit: 60 req/min/IP (CONCERT_LIST)
   */
  @Get('concerts')
  @UseGuards(RateLimitGuard)
  @RateLimit({
    route: '/concerts',
    capacity: RATE_LIMIT_DEFAULTS.CONCERT_LIST.capacity,
    refillRate: RATE_LIMIT_DEFAULTS.CONCERT_LIST.refillRate,
    tokensPerRequest: RATE_LIMIT_DEFAULTS.CONCERT_LIST.tokensPerRequest,
  })
  async findAll(@Query() query: ConcertQueryDto) {
    return this.concertService.findAll(query);
  }

  /**
   * GET /concerts/:id
   * Public endpoint - returns a single concert by ID.
   * Only published concerts are visible to the public.
   *
   * Rate limit: 120 req/min/IP (CONCERT_DETAIL)
   */
  @Get('concerts/:id')
  @UseGuards(RateLimitGuard)
  @RateLimit({
    route: '/concerts/:id',
    capacity: RATE_LIMIT_DEFAULTS.CONCERT_DETAIL.capacity,
    refillRate: RATE_LIMIT_DEFAULTS.CONCERT_DETAIL.refillRate,
    tokensPerRequest: RATE_LIMIT_DEFAULTS.CONCERT_DETAIL.tokensPerRequest,
  })
  async findOne(@Param('id') id: string) {
    return this.concertService.findOne(id);
  }

  /**
   * GET /concerts/slug/:slug
   * Public endpoint - returns a single concert by slug.
   * Alternative lookup method for SEO-friendly URLs.
   */
  @Get('concerts/slug/:slug')
  async findBySlug(@Param('slug') slug: string) {
    return this.concertService.findBySlug(slug);
  }

  /**
   * GET /admin/concerts
   * Admin only - returns all concerts including drafts.
   * Supports optional status filter and pagination.
   */
  @Get('admin/concerts')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.ORGANIZER)
  async findAdminAll(@Query() query: ConcertQueryDto) {
    return this.concertService.findAdminAll(query);
  }

  /**
   * GET /admin/concerts/:id
   * Admin only - returns concert details including drafts, ticket types, and uploaded files.
   */
  @Get('admin/concerts/:id')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.ORGANIZER)
  async findAdminOne(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.concertService.findAdminOne(id, user.sub, user.role);
  }

  /**
   * GET /admin/concerts/:id/guests
   * Admin/Organizer only - returns the list of guests imported for this concert.
   */
  @Get('admin/concerts/:id/guests')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.ORGANIZER)
  async findAdminGuests(
    @Param('id') id: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.concertService.findAdminGuests(id, user.sub, user.role);
  }

  /**
   * POST /admin/concerts

   * Admin only - creates a new concert.
   * Requires ADMIN or ORGANIZER role.
   */
  @Post('admin/concerts')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.ORGANIZER)
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() dto: CreateConcertDto, @CurrentUser() user: AuthUser) {
    return this.concertService.create(dto, user.sub);
  }

  /**
   * PATCH /admin/concerts/:id
   * Admin only - updates an existing concert.
   * Requires ADMIN or ORGANIZER role.
   */
  @Patch('admin/concerts/:id')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.ORGANIZER)
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateConcertDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.concertService.update(id, dto, user.sub, user.role);
  }

  /**
   * DELETE /admin/concerts/:id
   * Admin only - deletes a concert and all related data.
   * Requires ADMIN role.
   * Note: Will fail if concert has active orders.
   */
  @Delete('admin/concerts/:id')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.OK)
  async remove(@Param('id') id: string) {
    return this.concertService.remove(id);
  }
}
