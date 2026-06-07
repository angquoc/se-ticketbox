import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { readFileSync } from 'fs';
import { join } from 'path';
import {
  REDIS_KEY_STOCK,
  REDIS_KEY_USER_LIMIT,
  REDIS_KEY_RESERVATION,
} from './redis-keys';

export interface LuaScriptResult {
  ok: boolean;
  step: string;
  error: string | null;
  message: string;
  [key: string]: unknown;
}

/**
 * Exposed for unit-testing: the RedisService constructor accepts an optional
 * pre-configured client so tests can inject a mock/stub without needing a real
 * Redis server.
 */
export interface RedisClient {
  script(cmd: 'LOAD', body: string): Promise<string>;
  evalsha(sha: string, numKeys: number, ...args: (string | number)[]): Promise<unknown>;
  eval(body: string, numKeys: number, ...args: (string | number)[]): Promise<unknown>;
  get(key: string): Promise<string | null>;
  set(key: string, value: string, ...args: (string | number)[]): Promise<unknown>;
  del(key: string): Promise<number>;
  exists(key: string): Promise<number>;
  ping(): Promise<string>;
  quit(): Promise<string>;
  on(event: 'connect' | 'error', cb: (arg?: unknown) => void): void;
}

@Injectable()
export class RedisService implements OnModuleDestroy, OnModuleInit {
  private readonly logger = new Logger(RedisService.name);
  private readonly client: RedisClient;

  /**
   * @param configService NestJS config service
   * @param client Optional Redis client (for testing). If omitted, a real ioredis
   *               client is created from REDIS_URL environment variable.
   */
  constructor(
    private readonly configService: ConfigService,
    client?: RedisClient,
  ) {
    if (client) {
      this.client = client;
    } else {
      const redisUrl = this.configService.get<string>(
        'redis.url',
        'redis://localhost:6379',
      );
      const redis = new Redis(redisUrl, {
        maxRetriesPerRequest: 1,
        enableReadyCheck: true,
      });

      redis.on('connect', () => this.logger.log('Connected to Redis'));
      redis.on('error', (error) => this.logger.error('Redis connection error', error));

      this.client = redis as unknown as RedisClient;
    }
  }

  async onModuleInit(): Promise<void> {
    await this.ping();
    await this.initScripts();
  }

  // Script caches keyed by filename
  private readonly scriptCache = new Map<string, string>();

  /**
   * Load all Lua scripts into Redis and cache their SHA digests.
   * Called once on module init. EVALSHA will be used for subsequent calls.
   */
  private async initScripts(): Promise<void> {
    const scripts = ['reserve-ticket.lua', 'release-reservation.lua'];

    for (const filename of scripts) {
      try {
        const scriptPath = join(__dirname, 'scripts', filename);
        const scriptBody = readFileSync(scriptPath, 'utf8');
        const sha = (await this.client.script('LOAD', scriptBody)) as string;
        this.scriptCache.set(filename, sha);
        this.logger.log(`Loaded Lua script: ${filename} (SHA: ${sha})`);
      } catch (err) {
        this.logger.warn(
          `Could not load Lua script ${filename}. ` +
            'Scripts will fall back to EVAL instead of EVALSHA.',
          err instanceof Error ? err.message : String(err),
        );
      }
    }
  }

  private async runScript(
    filename: string,
    keys: string[],
    args: (string | number)[],
  ): Promise<LuaScriptResult> {
      const sha = this.scriptCache.get(filename);

    let raw: unknown;

    if (sha) {
      try {
        // EVALSHA: use cached SHA (faster, avoids re-sending script body)
        raw = await this.client.evalsha(sha, keys.length, ...keys, ...args);
      } catch (err) {
        // NOSCRIPT: Redis restarted and script cache was flushed → fall back to EVAL
        if (err instanceof Error && err.message.includes('NOSCRIPT')) {
          this.logger.warn(`EVALSHA NOSCRIPT for "${filename}", falling back to EVAL`);
          const scriptPath = join(__dirname, 'scripts', filename);
          const scriptBody = readFileSync(scriptPath, 'utf8');
          raw = await this.client.eval(scriptBody, keys.length, ...keys, ...args);
        } else {
          throw err;
        }
      }
    } else {
      // EVAL: fallback to sending script body directly
      const scriptPath = join(__dirname, 'scripts', filename);
      const scriptBody = readFileSync(scriptPath, 'utf8');
      raw = await this.client.eval(scriptBody, keys.length, ...keys, ...args);
    }

    if (typeof raw !== 'string') {
      throw new Error(
        `Lua script "${filename}" returned non-string: ${typeof raw}`,
      );
    }

    return JSON.parse(raw) as LuaScriptResult;
  }

  getClient(): RedisClient {
    return this.client;
  }

  async ping(): Promise<string> {
    return this.client.ping();
  }

  async get(key: string): Promise<string | null> {
    return this.client.get(key);
  }

  async set(
    key: string,
    value: string,
    ttlSeconds?: number,
  ): Promise<'OK' | null> {
    if (ttlSeconds) {
      return this.client.set(key, value, 'EX', ttlSeconds) as Promise<'OK' | null>;
    }

    return this.client.set(key, value) as Promise<'OK' | null>;
  }

  async del(key: string): Promise<number> {
    return this.client.del(key);
  }

  async exists(key: string): Promise<boolean> {
    return (await this.client.exists(key)) === 1;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Ticket Reservation Lua Script methods
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Atomically reserve tickets using a Lua script.
   *
   * Steps in the script:
   *  1. READ current stock
   *  2. READ user current reserved qty
   *  3. CHECK stock >= requested qty  →  OUT_OF_STOCK if fail
   *  4. CHECK user_qty + requested <= max_per_user  →  EXCEED_USER_LIMIT if fail
   *  5. CHECK reservation doesn't already exist  →  RESERVATION_ALREADY_EXISTS if fail
   *  6. DECRBY stock
   *  7. INCRBY user-limit
   *  8. SET reservation with TTL
   */
  async reserveTicket(params: {
    ticketTypeId: string;
    userId: string;
    orderId: string;
    quantity: number;
    maxPerUser: number;
    ttlSeconds: number;
  }): Promise<LuaScriptResult> {
    const stockKey = REDIS_KEY_STOCK(params.ticketTypeId);
    const userLimitKey = REDIS_KEY_USER_LIMIT(
      params.userId,
      params.ticketTypeId,
    );
    const reservationKey = REDIS_KEY_RESERVATION(params.orderId);

    return this.runScript(
      'reserve-ticket.lua',
      [stockKey, userLimitKey, reservationKey],
      [
        params.quantity,
        params.maxPerUser,
        params.ttlSeconds,
        params.orderId,
        params.userId,
        params.ticketTypeId,
      ],
    );
  }

  /**
   * Atomically release a reservation and return tickets to the pool.
   * Used when order is EXPIRED or PAYMENT_FAILED.
   *
   * Steps in the script:
   *  1. CHECK reservation exists  →  RESERVATION_NOT_FOUND if fail
   *  2. CHECK order_id matches  →  ORDER_ID_MISMATCH if fail
   *  3. CHECK quantity matches  →  QUANTITY_MISMATCH if fail
   *  4. INCRBY stock (return tickets)
   *  5. DECRBY user-limit
   *  6. DEL reservation
   */
  async releaseReservation(params: {
    ticketTypeId: string;
    userId: string;
    orderId: string;
    quantity: number;
  }): Promise<LuaScriptResult> {
    const stockKey = REDIS_KEY_STOCK(params.ticketTypeId);
    const userLimitKey = REDIS_KEY_USER_LIMIT(
      params.userId,
      params.ticketTypeId,
    );
    const reservationKey = REDIS_KEY_RESERVATION(params.orderId);

    return this.runScript(
      'release-reservation.lua',
      [stockKey, userLimitKey, reservationKey],
      [params.quantity, params.orderId, params.userId, params.ticketTypeId],
    );
  }

  /**
   * Decrement the per-user reserved-ticket counter in Redis.
   * Called when a reservation converts to a confirmed purchase (payment SUCCESS),
   * so the paid tickets no longer count toward the user's "in-flight" limit.
   */
  async decrementUserLimit(params: {
    ticketTypeId: string;
    userId: string;
    quantity: number;
  }): Promise<void> {
    const userLimitKey = REDIS_KEY_USER_LIMIT(
      params.userId,
      params.ticketTypeId,
    );
    const raw = await this.client.get(userLimitKey);
    if (raw === null) return;

    const current = parseInt(raw, 10);
    const newVal = Math.max(0, current - params.quantity);
    await this.client.set(userLimitKey, String(newVal));
  }

  async onModuleDestroy(): Promise<void> {
    await this.client.quit();
  }
}
