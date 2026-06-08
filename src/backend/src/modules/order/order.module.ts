import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { OrderController } from './order.controller';
import { OrderService } from './order.service';
import { OrderExpireProcessor } from './processors/order-expire.processor';
import { ORDER_EXPIRE_QUEUE } from './order.queue';
import { RedisModule } from '../redis/redis.module';
import { PaymentModule } from '../payment/payment.module';
import { IdempotencyInterceptor } from '../../common/interceptors/idempotency.interceptor';

@Module({
  imports: [
    RedisModule,
    PaymentModule,
    BullModule.registerQueue({
      name: ORDER_EXPIRE_QUEUE,
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
        removeOnComplete: true,
        removeOnFail: false,
      },
    }),
  ],
  controllers: [OrderController],
  providers: [OrderService, OrderExpireProcessor, IdempotencyInterceptor],
  exports: [OrderService],
})
export class OrderModule {}
