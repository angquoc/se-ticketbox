import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import {
  appConfig,
  authConfig,
  databaseConfig,
  envValidationSchema,
  redisConfig,
} from './config';
import { PrismaModule } from './database/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { ConcertModule } from './modules/concert/concert.module';
import { TicketTypeModule } from './modules/ticket-type/ticket-type.module';
import { RedisModule } from './modules/redis/redis.module';
import { HealthModule } from './modules/health/health.module';
import { OrderModule } from './modules/order/order.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig, authConfig, databaseConfig, redisConfig],
      validationSchema: envValidationSchema,
    }),
    PrismaModule,
    AuthModule,
    ConcertModule,
    TicketTypeModule,
    RedisModule,
    HealthModule,
    OrderModule,
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        connection: {
          url: configService.get<string>('redis.url', 'redis://localhost:6379'),
        },
      }),
    }),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
