import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CircuitBreakerService } from './circuit-breaker.service';
import { MockPaymentService } from './mock-payment.service';
import { MockPaymentResult, MockWebhookDto } from './dto/mock-webhook.dto';
import { PaymentProvider, PaymentStatus, OrderStatus } from '@prisma/client';

@Injectable()
export class PaymentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly circuitBreaker: CircuitBreakerService,
    private readonly mockPaymentService: MockPaymentService,
  ) {}

  async createPayment(orderId: string) {
    this.circuitBreaker.beforeRequest();

    try {
      const order = await this.prisma.order.findUnique({
        where: { id: orderId },
        include: { payments: true },
      });

      if (!order) {
        throw new NotFoundException('Không tìm thấy đơn hàng');
      }

      if (order.status !== OrderStatus.PENDING_PAYMENT) {
        throw new BadRequestException(
          'Chỉ có thể thanh toán đơn hàng đang chờ thanh toán',
        );
      }

      const existingPayment = order.payments.find(
        (payment) => payment.status === PaymentStatus.INITIATED,
      );

      if (existingPayment?.paymentUrl) {
        return {
          orderId: order.id,
          paymentUrl: existingPayment.paymentUrl,
          reused: true,
        };
      }

      const paymentUrl = this.mockPaymentService.createPaymentUrl(
        order.id,
        order.totalAmountInVnd,
      );

      await this.prisma.paymentTransaction.create({
        data: {
          orderId: order.id,
          provider: PaymentProvider.MOCK,
          status: PaymentStatus.INITIATED,
          amount: order.totalAmountInVnd,
          paymentUrl,
        },
      });

      this.circuitBreaker.recordSuccess();

      return {
        orderId: order.id,
        paymentUrl,
        reused: false,
      };
    } catch (error) {
      this.circuitBreaker.recordFailure();
      throw error;
    }
  }

  async handleMockWebhook(dto: MockWebhookDto) {
    const payload = `${dto.orderId}:${dto.providerTransactionId}:${dto.result}:${dto.amount}`;

    if (!dto.signature) {
      throw new BadRequestException('Thiếu chữ ký webhook');
    }

    const validSignature = this.mockPaymentService.verifySignature(
      payload,
      dto.signature,
    );

    if (!validSignature) {
      throw new BadRequestException('Webhook signature không hợp lệ');
    }

    const order = await this.prisma.order.findUnique({
      where: { id: dto.orderId },
      include: {
        items: true,
        payments: true,
      },
    });

    if (!order) {
      throw new NotFoundException('Không tìm thấy đơn hàng');
    }

    if (order.totalAmountInVnd !== dto.amount) {
      throw new BadRequestException('Số tiền thanh toán không khớp');
    }

    if (order.status === OrderStatus.PAID) {
      return {
        message: 'Webhook đã được xử lý trước đó',
        orderId: order.id,
        status: order.status,
      };
    }

    if (order.status !== OrderStatus.PENDING_PAYMENT) {
      throw new BadRequestException(
        `Không thể xử lý webhook cho order status ${order.status}`,
      );
    }

    if (dto.result === MockPaymentResult.FAILED) {
      await this.prisma.$transaction(async (tx) => {
        await tx.paymentTransaction.create({
          data: {
            orderId: order.id,
            provider: PaymentProvider.MOCK,
            providerTransactionId: dto.providerTransactionId,
            status: PaymentStatus.FAILED,
            amount: dto.amount,
            rawWebhook: dto as any,
            receivedAt: new Date(),
          },
        });

        await tx.order.update({
          where: { id: order.id },
          data: {
            status: OrderStatus.PAYMENT_FAILED,
          },
        });
      });

      return {
        message: 'Thanh toán thất bại',
        orderId: order.id,
        status: OrderStatus.PAYMENT_FAILED,
      };
    }

    if (dto.result === MockPaymentResult.TIMEOUT) {
      await this.prisma.paymentTransaction.create({
        data: {
          orderId: order.id,
          provider: PaymentProvider.MOCK,
          providerTransactionId: dto.providerTransactionId,
          status: PaymentStatus.TIMEOUT,
          amount: dto.amount,
          rawWebhook: dto as any,
          receivedAt: new Date(),
        },
      });

      return {
        message: 'Thanh toán timeout, chờ cronjob verify',
        orderId: order.id,
      };
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.paymentTransaction.create({
        data: {
          orderId: order.id,
          provider: PaymentProvider.MOCK,
          providerTransactionId: dto.providerTransactionId,
          status: PaymentStatus.SUCCESS,
          amount: dto.amount,
          rawWebhook: dto as any,
          receivedAt: new Date(),
        },
      });

      await tx.order.update({
        where: { id: order.id },
        data: {
          status: OrderStatus.PAID,
          paidAt: new Date(),
        },
      });

      for (const item of order.items) {
        await tx.ticketType.update({
          where: { id: item.ticketTypeId },
          data: {
            soldQty: {
              increment: item.quantity,
            },
            reservedQty: {
              decrement: item.quantity,
            },
          },
        });

        await tx.userTicketCounter.upsert({
          where: {
            userId_ticketTypeId: {
              userId: order.userId,
              ticketTypeId: item.ticketTypeId,
            },
          },
          create: {
            userId: order.userId,
            ticketTypeId: item.ticketTypeId,
            paidQty: item.quantity,
            reservedQty: 0,
          },
          update: {
            paidQty: {
              increment: item.quantity,
            },
            reservedQty: {
              decrement: item.quantity,
            },
          },
        });

        for (let i = 0; i < item.quantity; i++) {
          await tx.ticket.create({
            data: {
              orderId: order.id,
              orderItemId: item.id,
              concertId: order.concertId,
              ticketTypeId: item.ticketTypeId,
              userId: order.userId,
              qrTokenHash: `mock_qr_hash_${order.id}_${item.id}_${i}`,
              qrSignature: `mock_signature_${order.id}_${item.id}_${i}`,
            },
          });
        }
      }
    });

    return {
      message: 'Thanh toán thành công, order đã chuyển PAID',
      orderId: order.id,
      status: OrderStatus.PAID,
    };
  }

  async getPaymentStatus(orderId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        payments: true,
        tickets: true,
      },
    });

    if (!order) {
      throw new NotFoundException('Không tìm thấy đơn hàng');
    }

    return {
      orderId: order.id,
      status: order.status,
      payments: order.payments,
      ticketCount: order.tickets.length,
    };
  }

  getCircuitBreakerStatus() {
    return this.circuitBreaker.getState();
  }
}