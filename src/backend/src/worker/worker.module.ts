import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { QueueModule } from '../modules/queue/queue.module';
import { PrismaModule } from '../database/prisma.module';
import { StorageModule } from '../modules/storage/storage.module';
import { TicketIssueProcessor } from './processors/ticket-issue.processor';
import { NotificationModule } from '../modules/notification/notification.module';
import { AiBioProcessor } from './processors/ai-bio.processor';
import { CsvImportProcessor } from './processors/csv-import.processor';
import { NotificationProcessor } from './processors/notification.processor';
import { PdfExtractService } from './services/pdf-extract.service';
import { AiService } from './services/ai.service';
import { CsvParseService } from './services/csv-parse.service';

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
    CsvParseService,
    CsvImportProcessor,
  ],
})
export class WorkerModule {}
