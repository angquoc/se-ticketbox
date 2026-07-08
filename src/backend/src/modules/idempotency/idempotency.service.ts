import { ConflictException, Injectable } from '@nestjs/common';
import { createHash } from 'crypto';
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

  /**
   * Normalizes a request payload by sorting keys and removing undefined values,
   * then returns a SHA-256 hex digest.
   */
  hashRequest(payload: unknown): string {
    return createHash('sha256')
      .update(JSON.stringify(this.normalizePayload(payload)))
      .digest('hex');
  }

  /** Recursively strips undefined values and sorts object keys. */
  private normalizePayload(value: unknown): unknown {
    if (value === null || value === undefined) return undefined;
    if (Array.isArray(value)) return value.map((v) => this.normalizePayload(v));
    if (typeof value === 'object') {
      const sorted = Object.keys(value)
        .sort()
        .reduce<Record<string, unknown>>((acc, key) => {
          const normalized = this.normalizePayload(
            (value as Record<string, unknown>)[key],
          );
          if (normalized !== undefined) {
            acc[key] = normalized;
          }
          return acc;
        }, {});
      return sorted;
    }
    return value;
  }

  constructor(private readonly config: ConfigService) {
    const url = this.config.get<string>('redis.url') || process.env.REDIS_URL || 'redis://localhost:6379';
    const isTls = url.startsWith('rediss://') || url.includes('upstash');
    const isUpstash = url.includes('upstash');
    this.redis = new Redis(url, {
      family: isUpstash ? 0 : 4,
      ...(isTls ? { tls: { rejectUnauthorized: false } } : {}),
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

    await this.redis.set(
      redisKey,
      JSON.stringify(record),
      'EX',
      this.ttlSeconds,
    );
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

    await this.redis.set(
      redisKey,
      JSON.stringify(record),
      'EX',
      this.ttlSeconds,
    );
  }
}
