-- Atomic Lua script to RELEASE tickets when an order is EXPIRED or PAYMENT FAILED

-- This script ensures:
--   - Atomic release: stock increment, user counter decrement, reservation deletion
--     all happen in a single call with no interleaving
--   - Checkpoints prevent double-release (e.g., 2 workers expire the same order)
--   - Quantity is verified before releasing to ensure data integrity
--
-- INPUTS (from TypeScript calling RedisService.releaseReservation()):
--   KEYS[1] = stock:{ticketTypeId}                → remaining ticket stock
--   KEYS[2] = user_limit:{userId}:{ticketTypeId} → tickets user had reserved
--   KEYS[3] = reservation:{orderId}              → reservation record
--
--   ARGV[1] = quantity           tickets to release (for verification)
--   ARGV[2] = order_id           to verify reservation matches this order
--   ARGV[3] = user_id            to verify reservation matches this user
--   ARGV[4] = ticket_type_id    to verify reservation matches this ticket type
--
-- OUTPUT: JSON string containing success result or error
-- =============================================================================

-- =============================================================================
-- STEP 1: Check if reservation exists
-- If it doesn't exist → may have already been released, or no reservation exists
-- =============================================================================
local reservation_raw = redis.call('GET', KEYS[3])

if reservation_raw == false then
    return cjson.encode({
        ok = false,
        step = "RESERVATION_NOT_FOUND",
        error = "RESERVATION_NOT_FOUND",
        message = "Reservation not found, may have already been released",
        order_id = ARGV[2]
    })
end

-- =============================================================================
-- STEP 2: Parse JSON and verify reservation data
-- =============================================================================
local reservation = cjson.decode(reservation_raw)

-- Verify order_id matches
if reservation.order_id ~= ARGV[2] then
    return cjson.encode({
        ok = false,
        step = "ORDER_ID_MISMATCH",
        error = "ORDER_ID_MISMATCH",
        message = "Order ID in reservation does not match request",
        expected = ARGV[2],
        actual = reservation.order_id
    })
end

-- Verify user_id matches
if reservation.user_id ~= ARGV[3] then
    return cjson.encode({
        ok = false,
        step = "USER_ID_MISMATCH",
        error = "USER_ID_MISMATCH",
        message = "User ID in reservation does not match request",
        expected = ARGV[3],
        actual = reservation.user_id
    })
end

-- Verify ticket_type_id matches
if reservation.ticket_type_id ~= ARGV[4] then
    return cjson.encode({
        ok = false,
        step = "TICKET_TYPE_MISMATCH",
        error = "TICKET_TYPE_MISMATCH",
        message = "Ticket type ID in reservation does not match request",
        expected = ARGV[4],
        actual = reservation.ticket_type_id
    })
end

-- =============================================================================
-- STEP 3: Verify quantity in reservation matches ARGV[1]
-- =============================================================================
local reserved_qty = tonumber(reservation.quantity)
local requested_release_qty = tonumber(ARGV[1])

if reserved_qty ~= requested_release_qty then
    return cjson.encode({
        ok = false,
        step = "QUANTITY_MISMATCH",
        error = "QUANTITY_MISMATCH",
        message = "Requested release quantity does not match reservation",
        expected = requested_release_qty,
        actual = reserved_qty
    })
end

-- =============================================================================
-- STEP 4: All checkpoints passed → EXECUTE TICKET RELEASE
-- =============================================================================

-- 4a: Return tickets to stock (INCRBY to increase stock)
local new_stock = redis.call('INCRBY', KEYS[1], reserved_qty)

-- 4b: Decrement per-user counter (DECRBY to subtract user's reserved tickets)
local new_user_qty = redis.call('DECRBY', KEYS[2], reserved_qty)

-- If new_user_qty < 0 (data inconsistency), reset to 0
if new_user_qty < 0 then
    redis.call('SET', KEYS[2], 0)
    new_user_qty = 0
end

-- 4c: Delete reservation key (no longer valid)
redis.call('DEL', KEYS[3])

-- =============================================================================
-- STEP 5: Return SUCCESS result
-- =============================================================================
return cjson.encode({
    ok = true,
    step = "SUCCESS",
    error = nil,
    message = "Ticket release successful",
    released_qty = reserved_qty,
    new_stock = new_stock,
    new_user_qty = new_user_qty,
    order_id = ARGV[2]
})
