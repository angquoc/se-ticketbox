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

@Injectable()
export class RedisService implements OnModuleDestroy, OnModuleInit {
  private readonly logger = new Logger(RedisService.name);
  private readonly client: Redis;

  constructor(private readonly configService: ConfigService) {
    const redisUrl = this.configService.get<string>(
      'redis.url',
      'redis://localhost:6379',
    );

    this.client = new Redis(redisUrl, {
      maxRetriesPerRequest: 1,
      enableReadyCheck: true,
    });

    this.client.on('connect', () => {
      this.logger.log('Connected to Redis');
    });

    this.client.on('error', (error) => {
      this.logger.error('Redis connection error', error);
    });
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
        const sha = await this.client.script('LOAD', scriptBody) as string;
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
      // EVALSHA: use cached SHA (faster, avoids re-sending script body)
      raw = await this.client.evalsha(sha, keys.length, ...keys, ...args);
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

  getClient(): Redis {
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
      return this.client.set(key, value, 'EX', ttlSeconds);
    }

    return this.client.set(key, value);
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
    const userLimitKey = REDIS_KEY_USER_LIMIT(params.userId, params.ticketTypeId);
    const reservationKey = REDIS_KEY_RESERVATION(params.orderId);

    return this.runScript('reserve-ticket.lua', [stockKey, userLimitKey, reservationKey], [
      params.quantity,
      params.maxPerUser,
      params.ttlSeconds,
      params.orderId,
      params.userId,
      params.ticketTypeId,
    ]);
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
    const userLimitKey = REDIS_KEY_USER_LIMIT(params.userId, params.ticketTypeId);
    const reservationKey = REDIS_KEY_RESERVATION(params.orderId);

    return this.runScript('release-reservation.lua', [stockKey, userLimitKey, reservationKey], [
      params.quantity,
      params.orderId,
      params.userId,
      params.ticketTypeId,
    ]);
  }

  async onModuleDestroy(): Promise<void> {
    await this.client.quit();
  }
}

