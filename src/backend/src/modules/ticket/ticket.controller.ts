import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import { TicketService } from './ticket.service';
import { AuthGuard } from '../auth/guards/auth.guard';
import {
  CurrentUser,
  type AuthUser,
} from '../auth/decorators/current-user.decorator';

@Controller('tickets')
@UseGuards(AuthGuard)
export class TicketController {
  constructor(private readonly ticketService: TicketService) {}

  /**
   * GET /tickets/me
   * List the current user's tickets (paginated).
   */
  @Get('me')
  async getMyTickets(
    @CurrentUser() user: AuthUser,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ) {
    return this.ticketService.getMyTickets(user.sub, page, limit);
  }

  /**
   * GET /tickets/me/concerts/:concertId
   * Get all tickets the current user holds for a specific concert.
   */
  @Get('me/concerts/:concertId')
  async getMyTicketsForConcert(
    @Param('concertId') concertId: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.ticketService.getMyTicketsForConcert(user.sub, concertId);
  }

  /**
   * GET /tickets/:id
   * Get a single ticket's details. Only the owner can view.
   */
  @Get(':id')
  async getTicket(
    @Param('id') ticketId: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.ticketService.getTicket(ticketId, user.sub);
  }

  /**
   * GET /tickets/:id/qr
   * Get the QR token for a ticket. Only the owner can view.
   */
  @Get(':id/qr')
  async getTicketQr(
    @Param('id') ticketId: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.ticketService.getTicketQrData(ticketId, user.sub);
  }
}
