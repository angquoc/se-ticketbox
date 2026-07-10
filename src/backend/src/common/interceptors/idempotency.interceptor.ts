import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { Observable, of } from 'rxjs';
import { tap } from 'rxjs/operators';
import { createHash } from 'crypto';
import { Request } from 'express';
import { RedisService } from '../../modules/redis/redis.service';

interface AuthenticatedRequest extends Request {
  user?: { sub: string };
}

interface IdempotencyRecord {
  status: 'PROCESSING' | 'COMPLETED';
  requestHash: string;
  responseBody?: any;
}

/**
 * Interceptor that deduplicates POST requests using an Idempotency-Key header.
 * Stores request hash and cached responses in Redis.
 * TTL for idempotency records: 15 minutes.
 */
@Injectable()
export class IdempotencyInterceptor implements NestInterceptor {
  private readonly logger = new Logger(IdempotencyInterceptor.name);
  private readonly TTL_SECONDS = 15 * 60; // 15 minutes

  constructor(private readonly redis: RedisService) {}

  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<unknown>> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const idempotencyKey = request.headers['idempotency-key'] as
      | string
      | undefined;

    if (!idempotencyKey) {
      throw new BadRequestException('Thiếu header Idempotency-Key');
    }

    const userId = String(request.user?.sub ?? 'anonymous');
    const method = request.method ?? '';

    if (method !== 'POST') {
      return next.handle();
    }

    const requestHash = this.hashBody(request.body);
    const redisKey = `idem:${userId}:${idempotencyKey}`;

    const cachedStr = await this.redis.get(redisKey);

    if (cachedStr) {
      const cached = JSON.parse(cachedStr) as IdempotencyRecord;

      if (cached.status === 'PROCESSING') {
        this.logger.warn(
          `Idempotency key "${idempotencyKey}" for user ${userId} is still PROCESSING`,
        );
        throw new ConflictException('Request đang được xử lý');
      }

      if (cached.requestHash && cached.requestHash !== requestHash) {
        throw new ConflictException(
          'Idempotency key was already used with a different request',
        );
      }

      if (cached.status === 'COMPLETED' && cached.responseBody) {
        this.logger.debug(
          `Idempotency key "${idempotencyKey}" already COMPLETED — returning cached response`,
        );
        return of(cached.responseBody);
      }
    }

    // Register as PROCESSING in Redis
    const initialRecord: IdempotencyRecord = {
      status: 'PROCESSING',
      requestHash,
    };
    await this.redis.set(
      redisKey,
      JSON.stringify(initialRecord),
      this.TTL_SECONDS,
    );

    return next.handle().pipe(
      tap({
        next: async (responseBody: unknown) => {
          const completedRecord: IdempotencyRecord = {
            status: 'COMPLETED',
            requestHash,
            responseBody,
          };
          await this.redis.set(
            redisKey,
            JSON.stringify(completedRecord),
            this.TTL_SECONDS,
          );
          this.logger.debug(
            `Idempotency key "${idempotencyKey}" marked COMPLETED in Redis`,
          );
        },
        error: async () => {
          // Delete on failure so client can retry immediately
          await this.redis.del(redisKey);
          this.logger.debug(`Idempotency key "${idempotencyKey}" deleted on error`);
        },
      }),
    );
  }

  /**
   * SHA-256 hash of the normalized request body.
   * Normalization: sort object keys, strip undefined values.
   */
  private hashBody(body: unknown): string {
    return createHash('sha256')
      .update(JSON.stringify(this.normalize(body)))
      .digest('hex');
  }

  private normalize(value: unknown): unknown {
    if (value === null || value === undefined) return undefined;
    if (Array.isArray(value)) return value.map((v) => this.normalize(v));
    if (typeof value === 'object') {
      return Object.keys(value as object)
        .sort()
        .reduce<Record<string, unknown>>((acc, key) => {
          const n = this.normalize((value as Record<string, unknown>)[key]);
          if (n !== undefined) acc[key] = n;
          return acc;
        }, {});
    }
    return value;
  }
}
