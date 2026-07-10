import { Module } from '@nestjs/common';
import { OrderController } from './order.controller';
import { OrderService } from './order.service';
import { OrderExpireProcessor } from './processors/order-expire.processor';
import { RedisModule } from '../redis/redis.module';
import { PaymentModule } from '../payment/payment.module';
import { QueueModule } from '../queue/queue.module';
import { IdempotencyInterceptor } from '../../common/interceptors/idempotency.interceptor';
import { SeatmapModule } from '../seatmap/seatmap.module';

@Module({
  imports: [RedisModule, PaymentModule, QueueModule, SeatmapModule],
  controllers: [OrderController],
  providers: [OrderService, OrderExpireProcessor, IdempotencyInterceptor],
  exports: [OrderService],
})
export class OrderModule {}
