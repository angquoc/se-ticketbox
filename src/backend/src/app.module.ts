import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import {
  appConfig,
  authConfig,
  databaseConfig,
  emailConfig,
  envValidationSchema,
  redisConfig,
} from './config';
import { PrismaModule } from './database/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { ConcertModule } from './modules/concert/concert.module';
import { PaymentModule } from './modules/payment/payment.module';
import { QueueModule } from './modules/queue/queue.module';
import { IdempotencyModule } from './modules/idempotency/idempotency.module';
import { TicketTypeModule } from './modules/ticket-type/ticket-type.module';
import { RedisModule } from './modules/redis/redis.module';
import { HealthModule } from './modules/health/health.module';
import { OrderModule } from './modules/order/order.module';
import { TicketModule } from './modules/ticket/ticket.module';
import { NotificationModule } from './modules/notification/notification.module';
import { CheckinModule } from './modules/checkin/checkin.module';
import { GateModule } from './modules/gate/gate.module';
import { WorkerModule } from './worker/worker.module';
import { RateLimitModule } from './modules/rate-limit/rate-limit.module';
import { UploadsModule } from './modules/uploads/uploads.module';
import { AdminModule } from './modules/admin/admin.module';
import { SeatmapModule } from './modules/seatmap/seatmap.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig, authConfig, databaseConfig, redisConfig, emailConfig],
      validationSchema: envValidationSchema,
    }),
    QueueModule,
    PrismaModule,
    AuthModule,
    ConcertModule,
    IdempotencyModule,
    PaymentModule,
    TicketTypeModule,
    RedisModule,
    HealthModule,
    OrderModule,
    TicketModule,
    NotificationModule,
    CheckinModule,
    GateModule,
    WorkerModule,
    RateLimitModule,
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const url = config.get<string>('REDIS_URL') || config.get<string>('redis.url') || 'redis://localhost:6379';
        const isTls = url.startsWith('rediss://') || url.includes('upstash');
        const isUpstash = url.includes('upstash');
        return {
          connection: {
            url,
            family: isUpstash ? 0 : 4,
            ...(isTls ? { tls: { rejectUnauthorized: false } } : {}),
          },
        };
      },
    }),
    UploadsModule,
    AdminModule,
    SeatmapModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
