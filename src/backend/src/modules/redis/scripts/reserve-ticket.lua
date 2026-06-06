-- Atomic Lua script to RESERVE tickets when a user purchases
--
-- Lua scripts run INSIDE Redis (single-threaded), so:
--   - All steps: read → check → decrement → write
--     execute sequentially with no interleaving
--   - No other request can read/write Redis while the script runs
--   - Result: no oversell, no race condition
--
-- INPUTS (from TypeScript calling RedisService.reserveTicket()):
--   KEYS[1] = stock:{ticketTypeId}                → remaining ticket stock
--   KEYS[2] = user_limit:{userId}:{ticketTypeId} → tickets user has reserved
--   KEYS[3] = reservation:{orderId}              → reservation record
--
--   ARGV[1] = quantity           tickets to purchase
--   ARGV[2] = max_per_user      per-user purchase limit
--   ARGV[3] = ttl_seconds       reservation TTL (seconds)
--   ARGV[4] = order_id          order ID for reservation
--   ARGV[5] = user_id           user ID
--   ARGV[6] = ticket_type_id    ticket type ID
--
-- OUTPUT: JSON string containing success result or error
-- =============================================================================

-- =============================================================================
-- STEP 1: Read current stock
-- =============================================================================
local current_stock = tonumber(redis.call('GET', KEYS[1]))

-- If key doesn't exist (concert not yet on sale or not initialized), treat as 0
if current_stock == nil then
    current_stock = 0
end

-- =============================================================================
-- STEP 2: Read how many tickets this user has already reserved for this type
-- =============================================================================
local user_current_qty = tonumber(redis.call('GET', KEYS[2]))

-- If key doesn't exist, user hasn't reserved any yet
if user_current_qty == nil then
    user_current_qty = 0
end

-- =============================================================================
-- STEP 3: CHECKPOINT — Is there enough stock?
-- If not enough stock → abort immediately, return OUT_OF_STOCK error
-- =============================================================================
local requested_qty = tonumber(ARGV[1])

if current_stock < requested_qty then
    return cjson.encode({
        ok = false,
        step = "STOCK_CHECK",
        error = "OUT_OF_STOCK",
        message = "Not enough tickets available",
        remaining_stock = current_stock,
        requested_qty = requested_qty
    })
end

-- =============================================================================
-- STEP 4: CHECKPOINT — Would this exceed the per-user limit?
-- If (already reserved + requested) > max_per_user → abort
-- =============================================================================
local max_per_user = tonumber(ARGV[2])
local total_after_reserve = user_current_qty + requested_qty

if total_after_reserve > max_per_user then
    return cjson.encode({
        ok = false,
        step = "USER_LIMIT_CHECK",
        error = "EXCEED_USER_LIMIT",
        message = "Purchase would exceed per-user ticket limit",
        user_current_qty = user_current_qty,
        requested_qty = requested_qty,
        max_per_user = max_per_user,
        remaining_can_buy = max_per_user - user_current_qty
    })
end

-- =============================================================================
-- STEP 5: CHECKPOINT — Does this reservation already exist?
-- Prevents duplicate calls with the same orderId (idempotency guard)
-- =============================================================================
local reservation_exists = redis.call('EXISTS', KEYS[3])

if reservation_exists == 1 then
    return cjson.encode({
        ok = false,
        step = "RESERVATION_EXISTS",
        error = "RESERVATION_ALREADY_EXISTS",
        message = "Reservation already exists, possible duplicate request",
        order_id = ARGV[4]
    })
end

-- =============================================================================
-- STEP 6: All checkpoints passed → EXECUTE RESERVATION
-- =============================================================================

-- 6a: Decrement Redis stock
-- DECRBY key amount → subtracts amount and RETURNS THE NEW VALUE
local new_stock = redis.call('DECRBY', KEYS[1], requested_qty)

-- 6b: Increment user's reserved ticket counter
local new_user_qty = redis.call('INCRBY', KEYS[2], requested_qty)

-- 6c: Create reservation record with TTL
-- Stores metadata so we know who reserved, how many, and when
local reservation_data = cjson.encode({
    order_id = ARGV[4],
    user_id = ARGV[5],
    ticket_type_id = ARGV[6],
    quantity = requested_qty,
    -- redis.call('TIME')[1] returns current Unix timestamp in seconds
    created_at = tonumber(redis.call('TIME')[1])
})

-- SET key value EX seconds → sets value, auto-EXPIRES after N seconds
redis.call('SET', KEYS[3], reservation_data, 'EX', tonumber(ARGV[3]))

-- =============================================================================
-- STEP 7: Return SUCCESS result
-- Backend reads this to create a PENDING Order in PostgreSQL
-- =============================================================================
return cjson.encode({
    ok = true,
    step = "SUCCESS",
    error = nil,
    message = "Ticket reservation successful",
    reserved_qty = requested_qty,
    new_stock = new_stock,
    new_user_qty = new_user_qty,
    expires_in_seconds = tonumber(ARGV[3]),
    order_id = ARGV[4]
})
