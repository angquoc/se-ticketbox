import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule, ConfigService } from '@nestjs/config';
import {
  TICKET_ISSUE_QUEUE,
  NOTIFICATION_QUEUE,
  ORDER_EXPIRE_QUEUE,
  AI_BIO_QUEUE,
  CSV_IMPORT_QUEUE,
} from './queue.constants';

@Module({
  imports: [
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const url =
          config.get<string>('REDIS_URL') ||
          config.get<string>('redis.url') ||
          'redis://localhost:6379';
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

    BullModule.registerQueue(
      { name: TICKET_ISSUE_QUEUE },
      { name: NOTIFICATION_QUEUE },
      {
        name: ORDER_EXPIRE_QUEUE,
        defaultJobOptions: {
          attempts: 3,
          backoff: { type: 'exponential', delay: 5000 },
          removeOnComplete: true,
          removeOnFail: false,
        },
      },
      { name: AI_BIO_QUEUE },
      { name: CSV_IMPORT_QUEUE },
    ),
  ],
  exports: [BullModule],
})
export class QueueModule {}
