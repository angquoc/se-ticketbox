import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
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
import { Role } from '@prisma/client';
import { IsString, IsOptional } from 'class-validator';

class PaymentWebhookDto {
  @IsString()
  providerTransactionId!: string;

  @IsString()
  orderId!: string;

  @IsOptional()
  @IsString()
  amount?: number;

  @IsString()
  status!: 'SUCCESS' | 'FAILED' | 'CANCELLED';

  @IsOptional()
  @IsString()
  signature?: string;
}

@Controller()
export class OrderController {
  constructor(private readonly orderService: OrderService) {}

  // ─── Customer endpoints ────────────────────────────────────────────────────

  /**
   * POST /orders
   * Create a new order and reserve tickets.
   * Requires authentication.
   */
  @Post('orders')
  @UseGuards(AuthGuard)
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
  ) {
    return this.orderService.getMyOrders(user.sub, page, limit);
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
  ) {
    return this.orderService.getAllOrders(page, limit, status, concertId);
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

  // ─── Webhook endpoint ─────────────────────────────────────────────────────

  /**
   * POST /webhooks/payment/:provider
   * Payment gateway calls this after user completes payment.
   * No auth — verified by signature check.
   */
  @Post('webhooks/payment/:provider')
  @HttpCode(HttpStatus.OK)
  async paymentWebhook(
    @Param('provider') provider: string,
    @Body() payload: PaymentWebhookDto,
  ) {
    return this.orderService.handlePaymentWebhook(provider, {
      providerTransactionId: payload.providerTransactionId,
      orderId: payload.orderId,
      amount: payload.amount ?? 0,
      status: payload.status,
      signature: payload.signature,
    });
  }
}
