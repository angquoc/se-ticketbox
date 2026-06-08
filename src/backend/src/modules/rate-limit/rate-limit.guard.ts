import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { RateLimitService } from './rate-limit.service';
import {
  RATE_LIMIT_KEY,
  RateLimitConfig,
} from './rate-limit.decorator';
import { AuthUser } from '../auth/decorators/current-user.decorator';

@Injectable()
export class RateLimitGuard implements CanActivate {
  private readonly logger = new Logger(RateLimitGuard.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly rateLimitService: RateLimitService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const config = this.reflector.get<RateLimitConfig>(
      RATE_LIMIT_KEY,
      context.getHandler(),
    );

    if (!config) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request & { user?: AuthUser }>();
    const response = context.switchToHttp().getResponse();

    const userId = request.user?.sub ?? null;
    const ip = this.extractIp(request);

    const result = await this.rateLimitService.checkAndConsume(
      userId,
      ip,
      config.route,
      config.capacity,
      config.refillRate,
      config.tokensPerRequest ?? 1,
    );

    // Always attach rate-limit headers so the client knows the state
    response.setHeader('X-RateLimit-Remaining', String(result.remaining));
    response.setHeader('X-RateLimit-Limit', String(config.capacity));
    if (!result.allowed) {
      response.setHeader('Retry-After', String(result.retryAfter));
    }

    if (!result.allowed) {
      this.logger.warn(
        `Rate limit exceeded [bucketType=${result.bucketType}] user=${userId ?? 'anonymous'} ip=${ip} route=${config.route}`,
      );
      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          message: 'Too many requests. Please slow down.',
          error: 'Too Many Requests',
          retryAfter: result.retryAfter,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    return true;
  }

  /**
   * Extract client IP address from the request.
   * Respects X-Forwarded-For when behind a proxy/load balancer.
   */
  private extractIp(request: Request): string {
    const forwardedFor = request.headers['x-forwarded-for'];
    if (typeof forwardedFor === 'string') {
      return forwardedFor.split(',')[0].trim();
    }
    if (Array.isArray(forwardedFor) && forwardedFor.length > 0) {
      return String(forwardedFor[0]).split(',')[0].trim();
    }
    return request.ip ?? request.socket.remoteAddress ?? 'unknown';
  }
}
