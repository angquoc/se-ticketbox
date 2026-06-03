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

@Controller()
export class ConcertController {
  constructor(private readonly concertService: ConcertService) {}

  /**
   * GET /concerts
   * Public endpoint - returns a paginated list of published concerts.
   * Supports optional status filter and pagination parameters.
   */
  @Get('concerts')
  async findAll(@Query() query: ConcertQueryDto) {
    return this.concertService.findAll(query);
  }

  /**
   * GET /concerts/:id
   * Public endpoint - returns a single concert by ID.
   * Only published concerts are visible to the public.
   */
  @Get('concerts/:id')
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
   * POST /admin/concerts
   * Admin only - creates a new concert.
   * Requires ADMIN or ORGANIZER role.
   */
  @Post('admin/concerts')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.ORGANIZER)
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() dto: CreateConcertDto) {
    return this.concertService.create(dto);
  }

  /**
   * PATCH /admin/concerts/:id
   * Admin only - updates an existing concert.
   * Requires ADMIN or ORGANIZER role.
   */
  @Patch('admin/concerts/:id')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.ORGANIZER)
  async update(@Param('id') id: string, @Body() dto: UpdateConcertDto) {
    return this.concertService.update(id, dto);
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
