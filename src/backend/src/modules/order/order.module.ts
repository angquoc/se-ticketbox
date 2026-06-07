import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { OrderController } from './order.controller';
import { OrderService } from './order.service';
import {
  OrderExpireProcessor,
  ORDER_EXPIRE_QUEUE,
} from './processors/order-expire.processor';
import { RedisModule } from '../redis/redis.module';

@Module({
  imports: [
    RedisModule,
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
  providers: [OrderService, OrderExpireProcessor],
  exports: [OrderService],
})
export class OrderModule {}
