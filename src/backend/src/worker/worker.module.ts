import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { QueueModule } from '../modules/queue/queue.module';
import { PrismaModule } from '../database/prisma.module';
import { TicketIssueProcessor } from './processors/ticket-issue.processor';
import { NotificationProcessor } from './processors/notification.processor';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    QueueModule,
    PrismaModule,
  ],
  providers: [
    TicketIssueProcessor,
    NotificationProcessor,
  ],
})
export class WorkerModule {}