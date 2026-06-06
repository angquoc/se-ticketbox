import {
  ConflictException,
  Injectable,
} from '@nestjs/common';
import Redis from 'ioredis';
import { ConfigService } from '@nestjs/config';

type IdempotencyRecord = {
  status: 'PROCESSING' | 'COMPLETED' | 'FAILED';
  requestHash: string;
  responseBody?: unknown;
};

@Injectable()
export class IdempotencyService {
  private readonly redis: Redis;
  private readonly ttlSeconds = 15 * 60;

  constructor(private readonly config: ConfigService) {
    this.redis = new Redis({
      host: this.config.get<string>('REDIS_HOST', 'localhost'),
      port: Number(this.config.get<string>('REDIS_PORT', '6379')),
      password: this.config.get<string>('REDIS_PASSWORD') || undefined,
    });
  }

  private buildKey(userId: string, idempotencyKey: string) {
    return `idem:${userId}:${idempotencyKey}`;
  }

  async start(params: {
    userId: string;
    idempotencyKey: string;
    requestHash: string;
  }) {
    const redisKey = this.buildKey(params.userId, params.idempotencyKey);

    const existing = await this.redis.get(redisKey);

    if (!existing) {
      const record: IdempotencyRecord = {
        status: 'PROCESSING',
        requestHash: params.requestHash,
      };

      await this.redis.set(
        redisKey,
        JSON.stringify(record),
        'EX',
        this.ttlSeconds,
        'NX',
      );

      return {
        shouldProcess: true,
        cachedResponse: null,
      };
    }

    const parsed = JSON.parse(existing) as IdempotencyRecord;

    if (parsed.requestHash !== params.requestHash) {
      throw new ConflictException(
        'Idempotency-Key đã được dùng cho request khác',
      );
    }

    if (parsed.status === 'PROCESSING') {
      throw new ConflictException('Request đang được xử lý, vui lòng chờ');
    }

    if (parsed.status === 'COMPLETED') {
      return {
        shouldProcess: false,
        cachedResponse: parsed.responseBody,
      };
    }

    throw new ConflictException(
      'Giao dịch trước đó với Idempotency-Key này đã thất bại. Vui lòng bấm lại để tạo thao tác mới với Idempotency-Key mới.',
    );
  }

  async complete(params: {
    userId: string;
    idempotencyKey: string;
    requestHash: string;
    responseBody: unknown;
  }) {
    const redisKey = this.buildKey(params.userId, params.idempotencyKey);

    const record: IdempotencyRecord = {
      status: 'COMPLETED',
      requestHash: params.requestHash,
      responseBody: params.responseBody,
    };

    await this.redis.set(redisKey, JSON.stringify(record), 'EX', this.ttlSeconds);
  }

  async fail(params: {
    userId: string;
    idempotencyKey: string;
    requestHash: string;
  }) {
    const redisKey = this.buildKey(params.userId, params.idempotencyKey);

    const record: IdempotencyRecord = {
      status: 'FAILED',
      requestHash: params.requestHash,
    };

    await this.redis.set(redisKey, JSON.stringify(record), 'EX', this.ttlSeconds);
  }
}