/**
 * Redis key naming conventions for TicketBox.
 *
 * Each data type has its own prefix to:
 *  1. Prevent key collisions between modules
 *  2. Make filtering easy in Redis CLI: KEYS stock:*
 *  3. Allow per-key TTL configuration
 *
 * Naming pattern: prefix:entityId:subId (nesting via colons)
 */

/**
 * stock:{ticketTypeId}
 *
 * Stores the remaining ticket count for a ticket type.
 * DECRBY on successful reservation, INCRBY on release (expire/fail).
 *
 * Example: stock:ticket_vip_001 → "847"
 */
export const REDIS_KEY_STOCK = (ticketTypeId: string): string =>
  `stock:${ticketTypeId}`;

/**
 * user_limit:{userId}:{ticketTypeId}
 *
 * Stores the number of tickets a user has reserved (unpaid + paid)
 * for a specific ticket type.
 * Used to enforce maxPerUser limit.
 *
 * Example: user_limit:usr_abc123:ticket_vip_001 → "2"
 */
export const REDIS_KEY_USER_LIMIT = (
  userId: string,
  ticketTypeId: string,
): string => `user_limit:${userId}:${ticketTypeId}`;

/**
 * reservation:{orderId}
 *
 * Stores a temporary reservation record when a user successfully reserves tickets.
 * This key has a TTL = reservation hold duration (e.g., 15 minutes).
 * The key is deleted when TTL expires or when the order is paid.
 *
 * Value is JSON: { orderId, userId, ticketTypeId, quantity, createdAt }
 *
 * Example: reservation:ord_xyz789 → '{"orderId":"ord_xyz789",...}'
 */
export const REDIS_KEY_RESERVATION = (orderId: string): string =>
  `reservation:${orderId}`;
