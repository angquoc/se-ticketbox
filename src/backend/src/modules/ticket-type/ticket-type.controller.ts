import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { TicketTypeService } from './ticket-type.service';
import { CreateTicketTypeDto, UpdateTicketTypeDto } from './dto';
import { AuthGuard } from '../auth/guards/auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthUser } from '../auth/decorators/current-user.decorator';
import { Role } from '@prisma/client';
import type { TicketTypeStatus } from '@prisma/client';

/**
 * Admin / Organizer endpoints for managing ticket types.
 * Protected by AuthGuard + RolesGuard + ownership check.
 */
@Controller('admin/concerts/:concertId/ticket-types')
@UseGuards(AuthGuard, RolesGuard)
@Roles(Role.ADMIN, Role.ORGANIZER)
export class TicketTypeController {
  constructor(private readonly ticketTypeService: TicketTypeService) {}

  /**
   * GET /admin/concerts/:concertId/ticket-types?status=ACTIVE
   * List all ticket types for a concert (admin).
   * Supports optional status filter.
   */
  @Get()
  async findAll(
    @Param('concertId') concertId: string,
    @Query('status') status: TicketTypeStatus | undefined,
    @CurrentUser() user: AuthUser,
  ) {
    return this.ticketTypeService.findAll(
      concertId,
      user.sub,
      user.role,
      status,
    );
  }

  /**
   * GET /admin/concerts/:concertId/ticket-types/:id
   * Returns a single ticket type by ID.
   */
  @Get(':id')
  async findOne(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.ticketTypeService.findOne(id, user.sub, user.role);
  }

  /**
   * POST /admin/concerts/:concertId/ticket-types
   * Creates a new ticket type for the concert.
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Param('concertId') concertId: string,
    @Body() dto: CreateTicketTypeDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.ticketTypeService.create(concertId, dto, user.sub, user.role);
  }

  /**
   * PATCH /admin/concerts/:concertId/ticket-types/:id
   * Updates an existing ticket type.
   * Note: soldQty/reservedQty can only be changed by ADMIN.
   */
  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateTicketTypeDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.ticketTypeService.update(id, dto, user.sub, user.role);
  }

  /**
   * DELETE /admin/concerts/:concertId/ticket-types/:id
   * Deletes a ticket type.
   * Cannot delete if tickets have been sold or reserved.
   */
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async remove(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.ticketTypeService.remove(id, user.sub, user.role);
  }
}

/**
 * Public endpoint for customers to view available ticket types.
 * No auth required.
 */
@Controller('concerts/:concertId/ticket-types')
export class TicketTypePublicController {
  constructor(private readonly ticketTypeService: TicketTypeService) {}

  /**
   * GET /concerts/:concertId/ticket-types
   * Returns only ACTIVE ticket types that are currently on sale.
   * Used by customers to see available tickets before purchasing.
   */
  @Get()
  async findAvailable(@Param('concertId') concertId: string) {
    return this.ticketTypeService.findAvailable(concertId);
  }
}
