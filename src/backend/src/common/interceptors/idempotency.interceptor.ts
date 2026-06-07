import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { Observable, of } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Request } from 'express';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';

interface AuthenticatedRequest extends Request {
  user?: { sub: string };
}

/**
 * Interceptor that deduplicates requests using an Idempotency-Key header.
 *
 * When a client sends a request with an `Idempotency-Key` header, this
 * interceptor:
 *   1. Checks if the key already exists in PostgreSQL.
 *   2. If not exists → registers PROCESSING, lets the request through,
 *      then updates the record with the response body.
 *   3. If PROCESSING → throws ConflictException (request already in flight).
 *   4. If COMPLETED  → returns the cached response body immediately.
 *
 * Supported endpoints:
 *   - POST /orders
 *   - Any POST endpoint that carries financial consequences.
 *
 * TTL for idempotency records: 15 minutes.
 */
@Injectable()
export class IdempotencyInterceptor implements NestInterceptor {
  private readonly logger = new Logger(IdempotencyInterceptor.name);
  private readonly TTL_MS = 15 * 60 * 1000; // 15 minutes

  constructor(private readonly prisma: PrismaService) {}

  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<unknown>> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const idempotencyKey = request.headers['idempotency-key'] as
      | string
      | undefined;

    if (!idempotencyKey) {
      return next.handle();
    }

    const userId = String(request.user?.sub ?? 'anonymous');
    const method = request.method ?? '';

    if (method !== 'POST') {
      return next.handle();
    }

    const existing = await this.prisma.idempotencyKey.findUnique({
      where: { userId_key: { userId, key: idempotencyKey } },
    });

    if (existing) {
      if (existing.status === 'PROCESSING') {
        this.logger.warn(
          `Idempotency key "${idempotencyKey}" for user ${userId} is still PROCESSING`,
        );
        throw new ConflictException(
          'A request with this idempotency key is already being processed. Please wait.',
        );
      }

      if (existing.status === 'COMPLETED' && existing.responseBody) {
        this.logger.debug(
          `Idempotency key "${idempotencyKey}" already COMPLETED — returning cached response`,
        );
        return of(existing.responseBody as unknown);
      }

      if (existing.status === 'FAILED') {
        this.logger.debug(
          `Idempotency key "${idempotencyKey}" previously FAILED — retrying`,
        );
        await this.prisma.idempotencyKey.update({
          where: { id: existing.id },
          data: {
            status: 'PROCESSING',
            requestHash: '',
            responseBody: undefined as unknown as Prisma.InputJsonValue,
            expiresAt: new Date(Date.now() + this.TTL_MS),
          },
        });
      }
    } else {
      await this.prisma.idempotencyKey.create({
        data: {
          userId,
          key: idempotencyKey,
          requestHash: '',
          status: 'PROCESSING',
          expiresAt: new Date(Date.now() + this.TTL_MS),
        },
      });
    }

    return next.handle().pipe(
      tap({
        next: (responseBody: unknown) => {
          void this.persistCompletedKey(userId, idempotencyKey, responseBody);
        },
        error: () => {
          // On error, mark as FAILED so client can retry
          void this.markFailed(userId, idempotencyKey);
        },
      }),
    );
  }

  private async persistCompletedKey(
    userId: string,
    idempotencyKey: string,
    responseBody: unknown,
  ): Promise<void> {
    try {
      await this.prisma.idempotencyKey.update({
        where: { userId_key: { userId, key: idempotencyKey } },
        data: {
          status: 'COMPLETED',
          responseBody: responseBody as Prisma.InputJsonValue,
          resourceType: 'ORDER',
        },
      });
      this.logger.debug(`Idempotency key "${idempotencyKey}" marked COMPLETED`);
    } catch (err) {
      this.logger.error(
        `Failed to persist idempotency response for key "${idempotencyKey}": ${err}`,
      );
    }
  }

  private async markFailed(
    userId: string,
    idempotencyKey: string,
  ): Promise<void> {
    try {
      await this.prisma.idempotencyKey.update({
        where: { userId_key: { userId, key: idempotencyKey } },
        data: { status: 'FAILED' },
      });
    } catch {
      // Silently ignore — best-effort only
    }
  }
}
