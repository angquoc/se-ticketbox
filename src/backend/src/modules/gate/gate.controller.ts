import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { GateService } from './gate.service';
import { CreateGateDto, UpdateGateDto } from './dto';
import { AuthGuard } from '../auth/guards/auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';

@Controller('admin')
@UseGuards(AuthGuard, RolesGuard)
@Roles(Role.ADMIN, Role.ORGANIZER)
export class GateController {
  constructor(private readonly gateService: GateService) {}

  /**
   * GET /admin/concerts/:concertId/gates
   * List all gates for a concert with ticket counts.
   */
  @Get('concerts/:concertId/gates')
  async list(@Param('concertId') concertId: string) {
    return this.gateService.list(concertId);
  }

  /**
   * POST /admin/concerts/:concertId/gates
   * Create a new gate for a concert.
   */
  @Post('concerts/:concertId/gates')
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Param('concertId') concertId: string,
    @Body() dto: CreateGateDto,
  ) {
    return this.gateService.create(concertId, dto);
  }

  /**
   * PATCH /admin/gates/:gateId
   * Update a gate (e.g. rename).
   */
  @Patch('gates/:gateId')
  async update(@Param('gateId') gateId: string, @Body() dto: UpdateGateDto) {
    return this.gateService.update(gateId, dto);
  }

  /**
   * DELETE /admin/gates/:gateId
   * Delete a gate. Tickets are reassigned to another gate automatically.
   */
  @Delete('gates/:gateId')
  @HttpCode(HttpStatus.OK)
  async remove(@Param('gateId') gateId: string) {
    return this.gateService.remove(gateId);
  }

  /**
   * POST /admin/concerts/:concertId/gates/rebalance
   * Rebalance ticket distribution across all gates.
   * Re-signs QR codes for all tickets with changed gate assignments
   * and sends updated QR codes to affected customers.
   */
  @Post('concerts/:concertId/gates/rebalance')
  @HttpCode(HttpStatus.OK)
  async rebalance(@Param('concertId') concertId: string) {
    return this.gateService.rebalance(concertId);
  }
}
