import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import {
  appConfig,
  authConfig,
  databaseConfig,
  emailConfig,
  envValidationSchema,
  redisConfig,
} from '../config';
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
    // Must load emailConfig — otherwise EmailService gets undefined host and
    // nodemailer falls back to 127.0.0.1:587 (ECONNREFUSED inside Docker).
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig, authConfig, databaseConfig, redisConfig, emailConfig],
      validationSchema: envValidationSchema,
    }),
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
