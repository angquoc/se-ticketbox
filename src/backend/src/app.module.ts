import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './database/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { ConcertModule } from './modules/concert/concert.module';
import { PaymentModule } from './modules/payment/payment.module';
import { QueueModule } from './modules/queue/queue.module';
import { IdempotencyModule } from './modules/idempotency/idempotency.module';
import { ScheduleModule } from '@nestjs/schedule';
import { TicketTypeModule } from './modules/ticket-type/ticket-type.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    QueueModule,
    PrismaModule,
    AuthModule,
    ConcertModule,
    IdempotencyModule,
    PaymentModule,
    ScheduleModule.forRoot(),
    TicketTypeModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
