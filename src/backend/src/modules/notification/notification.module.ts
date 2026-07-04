import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { QueueModule } from '../queue/queue.module';
import { PrismaModule } from '../../database/prisma.module';
import { EmailService } from './services/email.service';
import { ReminderService } from './reminder.service';

@Module({
  imports: [ConfigModule, QueueModule, PrismaModule],
  providers: [EmailService, ReminderService],
  exports: [EmailService, ReminderService],
})
export class NotificationModule {}
