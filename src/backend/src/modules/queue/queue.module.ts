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
