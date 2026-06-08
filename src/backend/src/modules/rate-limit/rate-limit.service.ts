import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { RedisService } from '../redis/redis.service';
import { readFileSync } from 'fs';
import { join } from 'path';

export interface TokenBucketResult {
  allowed: boolean;
  remaining: number;
  retryAfter: number;
  bucketType: 'user' | 'ip' | 'both';
  key: string;
}

/** Default limits as specified in design.md and checkin.md */
export const RATE_LIMIT_DEFAULTS = {
  /** Concert listing endpoints — 60 req/min per IP */
  CONCERT_LIST: { capacity: 60, refillRate: 1.0, tokensPerRequest: 1 },
  /** Concert detail endpoint — 120 req/min per IP */
  CONCERT_DETAIL: { capacity: 120, refillRate: 2.0, tokensPerRequest: 1 },
  /** Order reservation (POST /orders) — 5 req/min per user + 5 req/min per IP */
  ORDER_RESERVE: { capacity: 5, refillRate: 5 / 60, tokensPerRequest: 1 },
  /** Login/Register — 10 req/min per IP */
  AUTH_LOGIN: { capacity: 10, refillRate: 10 / 60, tokensPerRequest: 1 },
  /** Check-in verify — 30 req/min per staff */
  CHECKIN_VERIFY: { capacity: 30, refillRate: 30 / 60, tokensPerRequest: 1 },
  /** Check-in sync — 10 req/min per staff */
  CHECKIN_SYNC: { capacity: 10, refillRate: 10 / 60, tokensPerRequest: 1 },
} as const;

export type RateLimitRoute = keyof typeof RATE_LIMIT_DEFAULTS;

@Injectable()
export class RateLimitService implements OnModuleInit {
  private readonly logger = new Logger(RateLimitService.name);

  private readonly scriptCache = new Map<string, string>();

  constructor(private readonly redisService: RedisService) {}

  async onModuleInit(): Promise<void> {
    await this.loadScript();
  }

  private getScriptPath(filename: string): string {
    // At runtime __dirname = dist/src/modules/rate-limit/
    // Source files are at src/modules/rate-limit/scripts/
    // distRoot = src/backend/ (4 levels up from dist/src/modules/rate-limit/)
    const distRoot = join(__dirname, '..', '..', '..', '..');
    return join(distRoot, 'src', 'modules', 'rate-limit', 'scripts', filename);
  }

  private async loadScript(): Promise<void> {
    const filename = 'token-bucket.lua';
    try {
      const scriptPath = this.getScriptPath(filename);
      const scriptBody = readFileSync(scriptPath, 'utf8');
      const sha = (await this.redisService
        .getClient()
        .script('LOAD', scriptBody)) as string;
      this.scriptCache.set(filename, sha);
      this.logger.log(`Loaded Lua script: ${filename} (SHA: ${sha})`);
    } catch (err) {
      this.logger.warn(
        `Could not pre-load Lua script ${filename}. Falling back to EVAL at runtime.`,
        err instanceof Error ? err.message : String(err),
      );
    }
  }

  private async runTokenBucketScript(
    keys: string[],
    args: (string | number)[],
  ): Promise<TokenBucketResult> {
    const filename = 'token-bucket.lua';
    const sha = this.scriptCache.get(filename);

    let raw: unknown;

    if (sha) {
      try {
        raw = await this.redisService
          .getClient()
          .evalsha(sha, keys.length, ...keys, ...args);
      } catch (err) {
        if (err instanceof Error && err.message.includes('NOSCRIPT')) {
          this.logger.warn(
            `EVALSHA NOSCRIPT for "${filename}", falling back to EVAL`,
          );
          const scriptPath = this.getScriptPath(filename);
          const scriptBody = readFileSync(scriptPath, 'utf8');
          raw = await this.redisService
            .getClient()
            .eval(scriptBody, keys.length, ...keys, ...args);
        } else {
          throw err;
        }
      }
    } else {
      const scriptPath = this.getScriptPath(filename);
      const scriptBody = readFileSync(scriptPath, 'utf8');
      raw = await this.redisService
        .getClient()
        .eval(scriptBody, keys.length, ...keys, ...args);
    }

    if (typeof raw !== 'string') {
      throw new Error(
        `Lua script "${filename}" returned non-string: ${typeof raw}`,
      );
    }

    return JSON.parse(raw) as TokenBucketResult;
  }

  /**
   * Check and consume a token from the rate limit bucket.
   *
   * Both user-bucket and IP-bucket are checked atomically inside the Lua script.
   * The request is denied if EITHER bucket is exhausted.
   *
   * @param userId   User ID from JWT. If null/undefined, only IP bucket is checked.
   * @param ip       Client IP address. Required.
   * @param route    Route identifier used as part of the Redis key.
   * @param capacity Max tokens in the bucket (burst size).
   * @param refillRate Tokens refilled per second.
   * @param tokensNeeded Tokens consumed per request (default 1).
   */
  async checkAndConsume(
    userId: string | null | undefined,
    ip: string,
    route: string,
    capacity: number,
    refillRate: number,
    tokensNeeded = 1,
  ): Promise<TokenBucketResult> {
    const now = Math.floor(Date.now() / 1000);

    const userKey = userId
      ? `rate-limit:user:${userId}:${route}`
      : '__none__';
    const ipKey = `rate-limit:ip:${ip}:${route}`;

    // When userId is not available, pass a dummy key that the Lua script
    // will treat as non-existent (which means it will be initialized as allowed)
    const keys = [userKey, ipKey];

    const result = await this.runTokenBucketScript(keys, [
      capacity,
      refillRate,
      tokensNeeded,
      now,
    ]);

    return result;
  }

  /**
   * Convenience method that uses predefined route limits.
   */
  async checkRoute(
    userId: string | null | undefined,
    ip: string,
    route: RateLimitRoute,
  ): Promise<TokenBucketResult> {
    const config = RATE_LIMIT_DEFAULTS[route];
    return this.checkAndConsume(
      userId,
      ip,
      route,
      config.capacity,
      config.refillRate,
      config.tokensPerRequest,
    );
  }
}
