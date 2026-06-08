# Đặc tả: Rate Limiting (Token Bucket)

## 1. Mô tả

**Rate Limiting** là cơ chế kiểm soát số lượng request mà một user hoặc IP address có thể gửi đến một endpoint trong một khoảng thời gian. Mục tiêu:

- Ngăn chặn hành vi spam API bởi người dùng hoặc bot.
- Bảo vệ hệ thống khỏi tải đột biến (traffic spikes).
- Đảm bảo công bằng cho người dùng thật trong giờ cao điểm mở bán concert.
- Là một trong nhiều lớp bảo vệ (layered defense) — kết hợp với Waiting Room, Bot Protection, Idempotency Key và Redis Lua Script.

**Module `RateLimitModule`** cung cấp:
- `RateLimitService`: thực thi Token Bucket bằng Redis Lua Script.
- `RateLimitGuard`: NestJS Guard kiểm tra limit trước khi request vào business logic.
- Decorator `@RateLimit()`: gắn cấu hình limit vào từng endpoint.

---

## 2. Lựa chọn thuật toán: Tại sao Token Bucket?

### Các lựa chọn thay thế

| Thuật toán | Ưu điểm | Nhược điểm | Phù hợp? |
|------------|----------|-------------|-----------|
| **Fixed Window** | Đơn giản | Boundary burst — 2× limit ở ranh giới window | Không |
| **Sliding Window Log** | Chính xác, không burst | Lưu timestamp mỗi request → tốn RAM | Không |
| **Sliding Window Counter** | Chính xác hơn Fixed Window | Cần Redis Sorted Set hoặc nhiều key | Có thể |
| **Token Bucket** | Cho phép burst nhỏ, tiết kiệm RAM, tính toán đơn giản | Không chính xác tuyệt đối | **Phù hợp nhất** |
| **Leaking Bucket** | Tốc độ ra đều | Phức tạp hơn, không burst | Không |

### Lý do chọn Token Bucket cho TicketBox

**1. Phù hợp với hành vi người dùng thật:**

Khi mở bán concert, người dùng thật có thể:
- Bấm "Mua vé" 1-3 lần nhanh trong vài giây (burst nhỏ).
- Rời đi, quay lại sau 30-60 giây.

Token Bucket cho phép burst 5 request trong 1 phút — đủ cho hành vi bình thường mà vẫn chặn được bot spam 50-100 request liên tục.

**2. Tiết kiệm RAM so với Sliding Window:**

Sliding Window Log lưu timestamp mỗi request. Với 80.000 user × 5 phút × 1 req/12s = ~200KB, trong khi Token Bucket chỉ lưu 2 fields (`tokens`, `lastRefill`) cho mỗi bucket.

**3. Tính toán refill trong Lua Script tại Redis — không tốn round-trip:**

Token Bucket dùng công thức: `tokens = min(capacity, tokens + elapsed × refillRate)`. Toán tử này chạy nguyên tử trong Redis Lua Script, không cần nhiều round-trip.

**4. Redis là nguồn dữ liệu phù hợp:**

Redis chạy single-threaded, đảm bảo tính nguyên tử của Lua Script. Không cần distributed lock hay thêm dependency như Redis Sorted Set (cho Sliding Window).

**5. Quen thuộc và dễ debug:**

Token Bucket là pattern phổ biến, dễ giải thích cho team, dễ cấu hình `capacity` (burst) và `refillRate` (tốc độ trung bình).

### Đánh đổi

- Token Bucket không chính xác tuyệt đối về thời gian (khác với Sliding Window Log), nhưng sai số nhỏ và chấp nhận được cho use case này.
- Không phân biệt được "ai spam nhiều" trong cùng một burst — nhưng IP bucket layer giải quyết vấn đề này.

---

## 3. Kiến trúc

```
Request → AuthGuard → RateLimitGuard
                          │
                          ├── Đọc @RateLimit() decorator config
                          │
                          ├── extract userId (JWT) + IP (X-Forwarded-For / request.ip)
                          │
                          ├── RateLimitService.checkAndConsume()
                          │       │
                          │       └── Lua Script token-bucket.lua
                          │               │
                          │               ├── Check user bucket: rate-limit:user:{userId}:{route}
                          │               │       └── 1. Refill tokens
                          │               │       └── 2. Check tokens >= needed
                          │               │       └── 3. DECR tokens
                          │               │
                          │               └── Check IP bucket: rate-limit:ip:{ip}:{route}
                          │                       └── (same atomic steps)
                          │
                          ├── Nếu allowed → set X-RateLimit-* headers → next()
                          └── Nếu denied  → HTTP 429 + Retry-After header
```

### Hai lớp kiểm tra (Dual-Layer Bucket)

Mỗi request được kiểm tra qua **2 Token Bucket liên tiếp**, cả 2 đều chạy nguyên tử trong cùng Lua Script:

1. **User Bucket** (`rate-limit:user:{userId}:{route}`): Nếu user đã đăng nhập, mỗi user có bucket riêng. Ai spam sẽ bị limit riêng, không ảnh hưởng user khác.

2. **IP Bucket** (`rate-limit:ip:{ip}:{route}`): Lớp fallback cho anonymous requests (không có JWT) và bảo vệ khỏi bot không đăng nhập.

- Nếu **user bucket denied** → request bị chặn ngay (IP bucket không cần kiểm tra).
- Nếu **user bucket allowed** nhưng **IP bucket denied** → vẫn bị chặn.

---

## 4. Cấu trúc Redis Keys

### Key Format

```
rate-limit:user:{userId}:{route}
rate-limit:ip:{ip}:{route}
```

### Redis Hash Structure

Mỗi bucket là một Redis Hash với 2 fields:

```
HSET rate-limit:user:usr_abc123:/orders tokens 3.5 lastRefill 1750000020
```

| Field | Kiểu | Ý nghĩa |
|-------|------|---------|
| `tokens` | Float | Số token còn lại trong bucket. Ban đầu = `capacity`. |
| `lastRefill` | Integer | Unix timestamp (seconds) của lần refill gần nhất. |

### TTL

> **Không có TTL** trên rate limit keys.

Token Bucket state được quản lý bởi ứng dụng (application-managed), không dựa vào Redis TTL. Mỗi request tính toán lại `tokens` dựa trên `elapsed = now - lastRefill`. Nếu user không gửi request trong thời gian dài, bucket sẽ đầy lại tự nhiên qua công thức refill.

---

## 5. Token Bucket Lua Script

### File

```
src/modules/rate-limit/scripts/token-bucket.lua
```

### Inputs

```
KEYS[1] = rate-limit:user:{userId}:{route}    # User bucket (hoặc __none__ nếu anonymous)
KEYS[2] = rate-limit:ip:{ip}:{route}          # IP bucket

ARGV[1] = max_capacity     — Số token tối đa (burst size)
ARGV[2] = refill_rate      — Token refill mỗi giây (float)
ARGV[3] = tokens_needed    — Số token tiêu tốn mỗi request (default 1)
ARGV[4] = current_time     — Unix timestamp (seconds)
```

### Output (JSON)

**Khi được phép:**
```json
{
  "allowed": true,
  "remaining": 4,
  "retryAfter": 0,
  "bucketType": "both",
  "key": "rate-limit:user:usr_abc123:/orders"
}
```

**Khi bị chặn:**
```json
{
  "allowed": false,
  "remaining": 0,
  "retryAfter": 12,
  "bucketType": "user",
  "key": "rate-limit:user:usr_abc123:/orders"
}
```

### Thuật toán chi tiết (chạy nguyên tử trong Redis)

```
1. Read user bucket (tokens, lastRefill)
2. If bucket exists:
     refilled = clamp(tokens + (now - lastRefill) × refillRate, 0, capacity)
     if refilled >= tokens_needed:
       remaining = refilled - tokens_needed
       allowed = true
     else:
       remaining = refilled
       allowed = false
       retryAfter = ceil((tokens_needed - refilled) / refillRate)
   Else (bucket mới):
     allowed = true
     remaining = capacity - tokens_needed
3. Save user bucket
4. If not allowed → return denied

5. Read IP bucket (same logic as steps 1-3)
6. If not allowed → return denied

7. Return allowed
```

### Tính nguyên tử

Lua Script chạy trong Redis single-threaded engine — không có request nào có thể đọc/ghi Redis trong khi script đang chạy. Điều này đảm bảo:

- Không race condition giữa 2 request đồng thời.
- Không thể "hack" bằng cách gửi nhiều request cùng lúc để lấy token trùng lặp.

---

## 6. Cấu hình giới hạn

### Bảng cấu hình

| Route Key | Endpoint(s) | Capacity | Refill Rate | Ý nghĩa |
|-----------|------------|----------|-------------|---------|
| `CONCERT_LIST` | `GET /concerts` | 60 | 1.0 token/s | 60 req/phút/IP — đọc danh sách |
| `CONCERT_DETAIL` | `GET /concerts/:id` | 120 | 2.0 token/s | 120 req/phút/IP — xem chi tiết |
| `ORDER_RESERVE` | `POST /orders` | 5 | 5/60 token/s | 5 req/phút/user + 5 req/phút/IP |
| `AUTH_LOGIN` | `POST /auth/login`, `POST /auth/register` | 10 | 10/60 token/s | 10 req/phút/IP |
| `CHECKIN_VERIFY` | `POST /checkin/verify` | 30 | 30/60 token/s | 30 req/phút/staff |
| `CHECKIN_SYNC` | `POST /checkin/sync` | 10 | 10/60 token/s | 10 req/phút/staff |

> **Refill Rate = capacity / 60** nghĩa là bucket sẽ đầy lại đúng 1 lần mỗi phút. Ví dụ: `ORDER_RESERVE` với capacity 5 và refillRate 5/60 có nghĩa là mỗi 12 giây, 1 token được thêm vào.

### Cách cấu hình endpoint mới

Dùng decorator `@RateLimit()`:

```typescript
import { RateLimit } from '../rate-limit/rate-limit.service';

// Ví dụ: endpoint sensitive với limit riêng
@Post('sensitive-action')
@UseGuards(AuthGuard, RateLimitGuard)
@RateLimit({
  route: 'SENSITIVE_ACTION',
  capacity: 2,
  refillRate: 2 / 60,  // 2 req/phút
  tokensPerRequest: 1,
})
async sensitiveAction(@Body() dto: Dto) { ... }
```

Thêm vào `RATE_LIMIT_DEFAULTS` trong `rate-limit.service.ts`:

```typescript
SENSITIVE_ACTION: { capacity: 2, refillRate: 2 / 60, tokensPerRequest: 1 },
```

---

## 7. API Endpoints được bảo vệ

| Method | Route | Roles | Limit | Bucket |
|--------|-------|-------|-------|--------|
| `POST` | `/orders` | CUSTOMER, ORGANIZER, ADMIN | 5 req/phút/user | User + IP |
| `POST` | `/checkin/verify` | STAFF, ADMIN | 30 req/phút/staff | User + IP |
| `POST` | `/checkin/sync` | STAFF, ADMIN | 10 req/phút/staff | User + IP |

### Thứ tự Guard

```
POST /orders
  1. AuthGuard         → Xác thực JWT, trích xuất userId
  2. RolesGuard        → Kiểm tra role
  3. RateLimitGuard    → Kiểm tra Token Bucket (user + IP)
  4. IdempotencyInterceptor → Chống double-click
  ↓
  Business logic: OrderService.createOrder()
```

---

## 8. Response Headers

Mọi response từ endpoint có Rate Limit đều chứa headers:

| Header | Giá trị | Ý nghĩa |
|--------|---------|---------|
| `X-RateLimit-Limit` | Số nguyên | Tổng số token trong bucket (capacity) |
| `X-RateLimit-Remaining` | Số nguyên | Số token còn lại sau request này |
| `Retry-After` | Số nguyên (chỉ khi denied) | Số giây cần chờ trước khi thử lại |

**Ví dụ response thành công:**

```http
HTTP/1.1 201 Created
X-RateLimit-Limit: 5
X-RateLimit-Remaining: 4
```

**Ví dụ response bị limit:**

```http
HTTP/1.1 429 Too Many Requests
X-RateLimit-Limit: 5
X-RateLimit-Remaining: 0
Retry-After: 12
```

---

## 9. Error Response khi bị limit

Khi Token Bucket exhausted, hệ thống trả về HTTP `429 Too Many Requests`:

```json
{
  "statusCode": 429,
  "message": "Too many requests. Please slow down.",
  "error": "Too Many Requests",
  "retryAfter": 12
}
```

**retryAfter** = số giây (làm tròn lên) mà client cần chờ trước khi có đủ 1 token mới trong bucket.

### Cách client nên xử lý

```typescript
async function createOrder() {
  try {
    return await api.post('/orders', body);
  } catch (err) {
    if (err.status === 429) {
      const waitMs = err.data.retryAfter * 1000;
      console.warn(`Rate limited. Retrying in ${waitMs}ms...`);
      await new Promise(resolve => setTimeout(resolve, waitMs));
      return api.post('/orders', body);
    }
    throw err;
  }
}
```

---

## 10. Hành vi chi tiết

### 10.1. Anonymous user (không có JWT)

Khi `userId = null`, Lua Script bỏ qua user bucket và chỉ kiểm tra IP bucket. User bucket không được tạo.

### 10.2. First request (bucket mới)

Khi bucket chưa tồn tại trong Redis, Lua Script coi như bucket đầy (`tokens = capacity`) và cho phép request ngay lập tức.

→ Điều này có nghĩa: user mới luôn được phục vụ request đầu tiên mà không bị delay.

### 10.3. Concurrent requests

Nếu 2 request đến cùng lúc từ cùng user/IP, Lua Script chạy lần lượt trong Redis single-threaded. Request thứ 2 sẽ thấy tokens đã bị trừ bởi request thứ 1. Không có race condition.

### 10.4. Redis unavailable

Nếu Redis không khả dụng:
- `RateLimitGuard.canActivate()` throw exception → NestJS trả HTTP 500.
- Đây là **fail-open hay fail-closed**? Hiện tại: **fail-closed** (ném exception).
- Có thể cấu hình `failOpen: true` trong tương lai để cho phép request đi qua khi Redis lỗi.

### 10.5. Token Bucket vs. Sliding Window trên cùng endpoint

Hệ thống chỉ dùng **Token Bucket**. Không dùng Sliding Window cho cùng một endpoint.

### 10.6. Multiple buckets cho cùng user trên nhiều route

Mỗi route có bucket riêng. User có thể gửi 5 req/phút đến `/orders` **VÀ** 30 req/phút đến `/checkin/verify` đồng thời — 2 bucket độc lập.

---

## 11. Các ràng buộc

### 11.1. Ràng buộc tính nguyên tử

- Token Bucket check-and-decrement phải chạy nguyên tử trong Lua Script. Không được tách thành nhiều lệnh Redis riêng lẻ.
- Cả user bucket và IP bucket phải được kiểm tra trong cùng một Lua Script call để đảm bảo tính nguyên tử.
- `RateLimitService.runTokenBucketScript()` phải xử lý `NOSCRIPT` fallback (khi Redis restart và xóa script cache).

### 11.2. Ràng buộc hiệu năng

- Lua Script phải có timeout ≤ 5 giây (Redis default). Không chạy blocking operation bên trong script.
- Script phải dùng `evalsha` ( cached SHA) thay vì `eval` (gửi script body mỗi lần) khi script đã được load.
- Redis script cache được load một lần trong `onModuleInit()`.

### 11.3. Ràng buộc bảo mật

- IP extraction phải ưu tiên `X-Forwarded-For` (khi behind proxy/load balancer).
- Anonymous requests (không JWT) vẫn bị limit bởi IP bucket.
- Rate limit headers không được tiết lộ thông tin nhạy cảm.

### 11.4. Ràng buộc nhất quán với design.md

| Thiết kế trong design.md | Implement trong RateLimitModule |
|--------------------------|--------------------------------|
| Token Bucket Rate Limiting | ✅ Lua Script `token-bucket.lua` |
| Cấu trúc Hash: tokens + lastRefill + refillRate + capacity | ✅ Redis Hash `HSET tokens lastRefill` |
| Giới hạn: 5 req/phút/user cho reserve | ✅ `ORDER_RESERVE: capacity=5, refillRate=5/60` |
| Giới hạn: 30 req/phút/staff cho verify | ✅ `CHECKIN_VERIFY: capacity=30, refillRate=30/60` |
| Giới hạn: 10 req/phút/staff cho sync | ✅ `CHECKIN_SYNC: capacity=10, refillRate=10/60` |
| Redis key: `rate-limit:{userId}:{route}` | ✅ `rate-limit:user:{userId}:{route}` |
| HTTP 429 khi exceeded | ✅ `HttpException(429)` |
| Token Bucket tiết kiệm RAM hơn Sliding Window | ✅ Không lưu timestamp mỗi request |

---

## 12. Tiêu chí đánh giá

### 1. User đăng nhập gửi 5 request trong 1 phút → tất cả được phục vụ

- 5 request đầu tiên được phép (tokens đủ).
- Request thứ 6 trả HTTP 429.

### 2. User gửi request nhanh (5 request trong 5 giây)

- Tất cả 5 request đầu được phép (burst = capacity = 5).
- Sau 5 giây, chỉ có 0.4 token được refill (~12 giây cho đủ 1 token). Request thứ 6 bị 429.

### 3. User gửi request đều đặn (1 request mỗi 15 giây)

- 60 giây = 4 token được refill → luôn có token → tất cả được phục vụ.

### 4. Anonymous user (không JWT) gửi 5 request trong 1 phút đến `/orders`

- User bucket không tồn tại → bị skip.
- IP bucket: 5 request được phép.
- Request thứ 6 → HTTP 429.

### 5. Bot gửi 100 request đồng thời đến `/orders`

- Lua Script chạy tuần tự trong Redis single-threaded.
- 5 request đầu được phép, 95 request còn lại nhận HTTP 429.

### 6. Redis restart (script cache bị flush)

- `evalsha` throw `NOSCRIPT` error.
- `RateLimitService` fallback sang `eval` (gửi script body).
- Hệ thống vẫn hoạt động đúng sau khi fallback.

### 7. IP extraction đúng qua X-Forwarded-For

- Request với header `X-Forwarded-For: 1.2.3.4, 10.0.0.1` → IP = `1.2.3.4`.
- Request không có proxy header → `request.ip` được dùng.

### 8. Headers trả về đúng

- Mọi response từ protected endpoint chứa `X-RateLimit-Limit` và `X-RateLimit-Remaining`.
- Khi denied: thêm `Retry-After`.

### 9. Rate limit áp dụng đúng thứ tự: AuthGuard → RateLimitGuard

- Request không có JWT → `AuthGuard` throw 401 **TRƯỚC KHI** `RateLimitGuard` được gọi.
- Rate limit chỉ chạy khi user đã xác thực thành công.
