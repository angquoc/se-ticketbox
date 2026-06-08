-- Token Bucket Rate Limiting Lua Script
--
-- All steps run atomically inside Redis (single-threaded),
-- so concurrent requests cannot interfere with each other.
--
-- KEYS[1] = rate-limit:user:{userId}:{route}   (bucket for authenticated user)
-- KEYS[2] = rate-limit:ip:{ip}:{route}       (bucket for IP address)
--
-- ARGV[1] = max_capacity   -- max tokens in bucket (burst size)
-- ARGV[2] = refill_rate    -- tokens added per second
-- ARGV[3] = tokens_needed  -- tokens to consume (default 1)
-- ARGV[4] = current_time    -- Unix timestamp in seconds
--
-- OUTPUT: JSON string
--   Allowed:  { allowed: true,  remaining: <number>, retryAfter: 0 }
--   Denied:   { allowed: false, remaining: <number>, retryAfter: <seconds until next token> }

local bucket_key = KEYS[1]
local ip_key     = KEYS[2]

local max_capacity  = tonumber(ARGV[1])
local refill_rate   = tonumber(ARGV[2])
local tokens_needed = tonumber(ARGV[3]) or 1
local now           = tonumber(ARGV[4])

-- Helper: clamp value between min and max
local function clamp(val, min_val, max_val)
    if val < min_val then return min_val end
    if val > max_val then return max_val end
    return val
end

-- Helper: read or initialize bucket from Redis Hash
local function get_or_init_bucket(key)
    local exists = redis.call('EXISTS', key)
    if exists == 1 then
        local tokens    = redis.call('HGET', key, 'tokens')
        local last_refill = redis.call('HGET', key, 'lastRefill')
        return tonumber(tokens), tonumber(last_refill)
    else
        return nil, nil
    end
end

-- Helper: save bucket to Redis Hash (no TTL -- managed by app)
local function save_bucket(key, tokens, last_refill)
    redis.call('HSET', key, 'tokens', tokens, 'lastRefill', last_refill)
end

-- Helper: apply token refill based on elapsed time
local function refill(tokens, last_refill, now, max_capacity, refill_rate)
    local elapsed = now - last_refill
    if elapsed < 0 then elapsed = 0 end
    local new_tokens = tokens + (elapsed * refill_rate)
    return clamp(new_tokens, 0, max_capacity)
end

-- Route 1: Check/apply user bucket
local user_tokens, user_last_refill = get_or_init_bucket(bucket_key)

local user_remaining = 0
local user_allowed   = false
local user_retry_after = 0

if user_tokens ~= nil then
    local refilled = refill(user_tokens, user_last_refill, now, max_capacity, refill_rate)
    if refilled >= tokens_needed then
        user_allowed   = true
        user_remaining = refilled - tokens_needed
        user_last_refill = now
    else
        user_allowed     = false
        user_remaining   = refilled
        user_retry_after = math.ceil((tokens_needed - refilled) / refill_rate)
        if user_retry_after < 1 then user_retry_after = 1 end
    end
    save_bucket(bucket_key, user_remaining, user_last_refill)
else
    user_allowed   = true
    user_remaining = max_capacity - tokens_needed
    user_last_refill = now
    save_bucket(bucket_key, user_remaining, user_last_refill)
end

-- If user bucket denied, deny immediately
if not user_allowed then
    return cjson.encode({
        allowed    = false,
        remaining  = 0,
        retryAfter = user_retry_after,
        bucketType = "user",
        key        = bucket_key
    })
end

-- Route 2: Check/apply IP bucket (secondary layer)
local ip_tokens, ip_last_refill = get_or_init_bucket(ip_key)

local ip_remaining = 0
local ip_allowed   = false
local ip_retry_after = 0

if ip_tokens ~= nil then
    local refilled = refill(ip_tokens, ip_last_refill, now, max_capacity, refill_rate)
    if refilled >= tokens_needed then
        ip_allowed   = true
        ip_remaining = refilled - tokens_needed
        ip_last_refill = now
    else
        ip_allowed     = false
        ip_remaining   = refilled
        ip_retry_after = math.ceil((tokens_needed - refilled) / refill_rate)
        if ip_retry_after < 1 then ip_retry_after = 1 end
    end
    save_bucket(ip_key, ip_remaining, ip_last_refill)
else
    ip_allowed   = true
    ip_remaining = max_capacity - tokens_needed
    ip_last_refill = now
    save_bucket(ip_key, ip_remaining, ip_last_refill)
end

if not ip_allowed then
    return cjson.encode({
        allowed    = false,
        remaining  = 0,
        retryAfter = ip_retry_after,
        bucketType = "ip",
        key        = ip_key
    })
end

-- Both buckets allowed
return cjson.encode({
    allowed    = true,
    remaining  = user_remaining,
    retryAfter = 0,
    bucketType = "both",
    key        = bucket_key
})
