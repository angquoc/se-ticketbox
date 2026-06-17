import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { QueueModule } from '../modules/queue/queue.module';
import { PrismaModule } from '../database/prisma.module';
import { NotificationModule } from '../modules/notification/notification.module';
import { TicketIssueProcessor } from './processors/ticket-issue.processor';
import { NotificationProcessor } from './processors/notification.processor';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    QueueModule,
    PrismaModule,
    NotificationModule,
  ],
  providers: [TicketIssueProcessor, NotificationProcessor],
})
export class WorkerModule {}
