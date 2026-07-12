import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
  HttpCode,
  HttpStatus,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import { OrderService } from './order.service';
import { CreateOrderDto } from './dto';
import { AuthGuard } from '../auth/guards/auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import {
  CurrentUser,
  type AuthUser,
} from '../auth/decorators/current-user.decorator';
import { OrderStatus, Role } from '@prisma/client';
import { IdempotencyInterceptor } from '../../common/interceptors/idempotency.interceptor';
import { RateLimitGuard } from '../rate-limit/rate-limit.guard';
import { RateLimit } from '../rate-limit/rate-limit.decorator';
import { RATE_LIMIT_DEFAULTS } from '../rate-limit/rate-limit.service';

@Controller()
export class OrderController {
  constructor(private readonly orderService: OrderService) {}

  // ─── Customer endpoints ────────────────────────────────────────────────────

  /**
   * POST /orders
   * Create a new order and reserve tickets.
   * Requires authentication.
   *
   * Rate limit: 5 req/min/user + 5 req/min/IP (ORDER_RESERVE)
   */
  @Post('orders')
  @UseGuards(AuthGuard, RolesGuard, RateLimitGuard)
  @Roles(Role.CUSTOMER, Role.ORGANIZER, Role.ADMIN)
  @UseInterceptors(IdempotencyInterceptor)
  @RateLimit({
    route: '/orders',
    capacity: RATE_LIMIT_DEFAULTS.ORDER_RESERVE.capacity,
    refillRate: RATE_LIMIT_DEFAULTS.ORDER_RESERVE.refillRate,
    tokensPerRequest: RATE_LIMIT_DEFAULTS.ORDER_RESERVE.tokensPerRequest,
  })
  @HttpCode(HttpStatus.CREATED)
  async createOrder(
    @Body() dto: CreateOrderDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.orderService.createOrder(dto, user.sub);
  }

  /**
   * GET /orders/me
   * List the current user's orders.
   */
  @Get('orders/me')
  @UseGuards(AuthGuard)
  async getMyOrders(
    @CurrentUser() user: AuthUser,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
    @Query('status') status?: string,
  ) {
    return this.orderService.getMyOrders(
      user.sub,
      page,
      limit,
      status as OrderStatus | undefined,
    );
  }

  /**
   * GET /orders/:id
   * Get order details. Only the order owner can view.
   */
  @Get('orders/:id')
  @UseGuards(AuthGuard)
  async getOrder(@Param('id') orderId: string, @CurrentUser() user: AuthUser) {
    return this.orderService.getOrder(orderId, user.sub);
  }

  /**
   * POST /orders/:id/cancel
   * Cancel a PENDING_PAYMENT order.
   */
  @Post('orders/:id/cancel')
  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.OK)
  async cancelOrder(
    @Param('id') orderId: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.orderService.cancelOrder(orderId, user.sub);
  }

  // ─── Admin endpoints ──────────────────────────────────────────────────────

  /**
   * GET /admin/orders
   * List all orders with optional filters (admin only).
   */
  @Get('admin/orders')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.ORGANIZER)
  async getAllOrders(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @Query('status') status?: string,
    @Query('concertId') concertId?: string,
    @CurrentUser() user?: AuthUser,
  ) {
    const organizerId = user?.role === Role.ORGANIZER ? user.sub : undefined;
    return this.orderService.getAllOrders(page, limit, status, concertId, organizerId);
  }

  /**
   * GET /admin/orders/:id
   * Get any order's details (admin only).
   */
  @Get('admin/orders/:id')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.ORGANIZER)
  async getOrderAdmin(@Param('id') orderId: string) {
    return this.orderService.getOrderAdmin(orderId);
  }
}
