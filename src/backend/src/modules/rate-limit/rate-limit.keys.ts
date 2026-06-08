/**
 * Redis key naming conventions for TicketBox — Rate Limiting.
 *
 * Naming pattern: prefix:identifier:route
 *
 * Rate limit keys do NOT have TTL because Token Bucket state is
 * maintained indefinitely; tokens are refilled automatically over time.
 * Cleanup is implicit via the app resetting or overwriting stale buckets.
 */

/**
 * rate-limit:user:{userId}:{route}
 *
 * Token Bucket for an authenticated user hitting a specific route.
 * Keyed by userId so each user has an independent rate limit.
 *
 * Example: rate-limit:user:usr_abc123:/orders → Redis Hash { tokens, lastRefill }
 */
export const REDIS_KEY_RATE_LIMIT_USER = (
  userId: string,
  route: string,
): string => `rate-limit:user:${userId}:${route}`;

/**
 * rate-limit:ip:{ip}:{route}
 *
 * Token Bucket for an IP address hitting a specific route.
 * Fallback layer when user is not authenticated.
 *
 * Example: rate-limit:ip:192.168.1.1:/orders → Redis Hash { tokens, lastRefill }
 */
export const REDIS_KEY_RATE_LIMIT_IP = (
  ip: string,
  route: string,
): string => `rate-limit:ip:${ip}:${route}`;
