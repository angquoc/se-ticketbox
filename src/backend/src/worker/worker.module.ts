import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { QueueModule } from '../modules/queue/queue.module';
import { PrismaModule } from '../database/prisma.module';
import { StorageModule } from '../modules/storage/storage.module';
import { TicketIssueProcessor } from './processors/ticket-issue.processor';
import { NotificationModule } from '../modules/notification/notification.module';
import { AiBioProcessor } from './processors/ai-bio.processor';
import { NotificationProcessor } from './processors/notification.processor';
import { PdfExtractService } from './services/pdf-extract.service';
import { AiService } from './services/ai.service';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    QueueModule,
    PrismaModule,
    NotificationModule,
    StorageModule,
  ],
  providers: [
    TicketIssueProcessor,
    NotificationProcessor,
    AiBioProcessor,
    PdfExtractService,
    AiService,
  ],
})
export class WorkerModule {}
