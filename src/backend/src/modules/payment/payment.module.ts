import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PaymentController } from './payment.controller';
import { PaymentService } from './payment.service';
import { MockPaymentService } from './mock-payment.service';
import { CircuitBreakerService } from './circuit-breaker.service';
import { PrismaModule } from '../../database/prisma.module';

@Module({
  imports: [ConfigModule, PrismaModule],
  controllers: [PaymentController],
  providers: [PaymentService, MockPaymentService, CircuitBreakerService],
  exports: [PaymentService],
})
export class PaymentModule {}