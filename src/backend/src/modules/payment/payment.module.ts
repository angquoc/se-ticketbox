import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PaymentController } from './payment.controller';
import { PaymentService } from './payment.service';
import { PrismaModule } from '../../database/prisma.module';
import { QueueModule } from '../queue/queue.module';
import { IdempotencyModule } from '../idempotency/idempotency.module';
import { PaymentCircuitBreakerService } from './services/payment-circuit-breaker.service';
import { MockGatewayService } from './services/mock-gateway.service';
import { PaymentCronService } from './services/payment-cron.service';

@Module({
  imports: [
    ConfigModule,
    PrismaModule,
    QueueModule,
    IdempotencyModule,
  ],
  controllers: [PaymentController],
  providers: [
    PaymentService,
    PaymentCircuitBreakerService,
    MockGatewayService,
    PaymentCronService,
  ],
  exports: [PaymentService],
})
export class PaymentModule {}