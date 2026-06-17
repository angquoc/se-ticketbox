import { SetMetadata } from '@nestjs/common';

export interface RateLimitConfig {
  /** Human-readable route identifier used as part of the Redis key. */
  route: string;
  /**
   * Maximum number of tokens in the bucket (burst size).
   * The user can consume up to this many requests in quick succession
   * before being throttled.
   */
  capacity: number;
  /**
   * Number of tokens refilled per second.
   * Determines the sustained request rate allowed.
   */
  refillRate: number;
  /**
   * Number of tokens consumed per request (default 1).
   * Set > 1 if a single API call costs multiple tokens.
   */
  tokensPerRequest?: number;
}

export const RATE_LIMIT_KEY = 'rateLimit';
export const RateLimit = (config: RateLimitConfig) =>
  SetMetadata(RATE_LIMIT_KEY, config);
