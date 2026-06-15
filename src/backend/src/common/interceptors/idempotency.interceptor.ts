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
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';

interface AuthenticatedRequest extends Request {
  user?: { sub: string };
}

/**
 * Interceptor that deduplicates POST requests using an Idempotency-Key header.
 *
 * When a client sends a request with an `Idempotency-Key` header, this
 * interceptor:
 *   1. Throws 400 if the header is absent.
 *   2. Checks if the key already exists in PostgreSQL.
 *   3. If not exists → registers PROCESSING, lets the request through,
 *      then updates the record with the response body.
 *   4. If PROCESSING → throws ConflictException (request already in flight).
 *   5. If COMPLETED  → returns the cached response body immediately.
 *   6. If FAILED     → resets to PROCESSING and lets the request retry.
 *
 * The requestHash is computed as SHA-256 of the normalized (sorted keys,
 * stripped undefined) JSON body, matching the spec requirement.
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
      throw new BadRequestException('Thiếu header Idempotency-Key');
    }

    const userId = String(request.user?.sub ?? 'anonymous');
    const method = request.method ?? '';

    if (method !== 'POST') {
      return next.handle();
    }

    const requestHash = this.hashBody(request.body);

    const existing = await this.prisma.idempotencyKey.findUnique({
      where: { userId_key: { userId, key: idempotencyKey } },
    });

    if (existing) {
      if (existing.status === 'PROCESSING') {
        this.logger.warn(
          `Idempotency key "${idempotencyKey}" for user ${userId} is still PROCESSING`,
        );
        throw new ConflictException('Request đang được xử lý');
      }

      if (existing.requestHash && existing.requestHash !== requestHash) {
        throw new ConflictException(
          'Idempotency key was already used with a different request',
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
            requestHash,
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
          requestHash,
          status: 'PROCESSING',
          expiresAt: new Date(Date.now() + this.TTL_MS),
        },
      });
    }

    return next.handle().pipe(
      tap({
        next: (responseBody: unknown) => {
          let orderId: string | undefined;
          if (typeof responseBody === 'object' && responseBody !== null) {
            const body = responseBody as Record<string, unknown>;
            const id =
              body['orderId'] ??
              (body['order'] as Record<string, unknown> | undefined)?.['id'];
            if (typeof id === 'string') {
              orderId = id;
            }
          }
          void this.persistCompletedKey(
            userId,
            idempotencyKey,
            responseBody,
            orderId,
          );
        },
        error: () => {
          void this.markFailed(userId, idempotencyKey);
        },
      }),
    );
  }

  /**
   * SHA-256 hash of the normalized request body.
   * Normalization: sort object keys, strip undefined values.
   * Matches the spec: "SHA-256 của normalized JSON body".
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
      return Object.keys(value)
        .sort()
        .reduce<Record<string, unknown>>((acc, key) => {
          const n = this.normalize((value as Record<string, unknown>)[key]);
          if (n !== undefined) acc[key] = n;
          return acc;
        }, {});
    }
    return value;
  }

  private async persistCompletedKey(
    userId: string,
    idempotencyKey: string,
    responseBody: unknown,
    orderId?: string,
  ): Promise<void> {
    try {
      const data = {
        status: 'COMPLETED' as const,
        responseBody: responseBody as Prisma.InputJsonValue,
        resourceType: 'ORDER',
        ...(orderId ? { orderId } : {}),
      };
      await this.prisma.idempotencyKey.update({
        where: { userId_key: { userId, key: idempotencyKey } },
        data,
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
