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
        const redisUrl = config.get<string>('REDIS_URL') || config.get<string>('redis.url');
        if (redisUrl) {
          const isTls = redisUrl.startsWith('rediss://');
          return {
            connection: {
              url: redisUrl,
              tls: isTls ? { rejectUnauthorized: false } : undefined,
            },
          };
        }
        const host = config.get<string>('REDIS_HOST', 'localhost');
        const port = Number(config.get<string>('REDIS_PORT', '6379'));
        const password = config.get<string>('REDIS_PASSWORD') || undefined;
        const isTls =
          config.get<string>('REDIS_TLS') === 'true' ||
          host.includes('upstash.io') ||
          host.includes('railway') ||
          port === 6380;
        return {
          connection: {
            host,
            port,
            password,
            tls: isTls ? { rejectUnauthorized: false } : undefined,
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
