# Đặc tả: Mua vé — Ticket Purchase

## Mô tả

Tính năng **Ticket Purchase** là luồng nghiệp vụ tổng hợp, mô tả toàn bộ quá trình một khán giả đi từ lúc bấm "Mua vé" trên Customer Web App cho đến khi nhận được e-ticket trong email. Luồng này tích hợp chặt chẽ với các module con:

- **Order Reservation** — giữ vé tạm thời bằng Redis Lua Script, tạo order `PENDING_PAYMENT` trong PostgreSQL.
- **Payment** — tạo payment URL, nhận webhook, cập nhật trạng thái thanh toán.
- **Ticket Type Inventory** — quản lý tồn kho vé, giới hạn mua per-user.
- **Idempotency** — chống double-click, double-payment.

---

## 1. Luồng dữ liệu tổng thể

```
Customer bấm "Mua vé"
        │
        ▼
Frontend gửi POST /orders
(kèm JWT + Idempotency-Key header)
        │
        ▼
┌───────────────────────────────────────┐
│  1. JwtAuthGuard → xác thực user     │
│  2. RolesGuard → kiểm tra role       │
│  3. IdempotencyInterceptor            │
│     (PostgreSQL IdempotencyKey)       │
│  4. Kiểm tra concert & ticket type   │
│  5. Seed Redis stock (nếu chưa có)   │
│  6. Lua Script reserve-ticket         │
│  7. Tạo Order + OrderItem (PostgreSQL)│
│  8. createPaymentUrl (Mock Gateway)   │
│  9. Schedule BullMQ expire job        │
└───────────────────────────────────────┘
        │
        ▼
Frontend nhận { orderId, paymentUrl }
        │
        ▼
User thanh toán trên trang Mock Gateway
        │
        ▼
Gateway gửi POST /payment/mock-callback
        │
        ▼
PaymentService.handleMockWebhook()
  ├─ verify signature
  ├─ kiểm tra order status
  ├─ FAILED  → handlePaymentFailed()
  ├─ TIMEOUT → handlePaymentTimeout()
  └─ SUCCESS → handlePaymentSuccess()
                ├─ upsert PaymentTransaction
                ├─ update Order → PAID
                ├─ create Ticket records
                ├─ update soldQty / reservedQty
                ├─ update UserTicketCounter
                ├─ delete Redis reservation
                ├─ decrement Redis user-limit
                └─ queue send-order-paid-email (chỉ orderId, không chứa rawToken)
        │
        ▼
Worker gửi email xác nhận đã thanh toán
(không chứa QR token — user xem QR trên web app)
        │
        ▼
Customer đăng nhập web app → xem QR tại trang /my-tickets
```

---

## 2. Mô hình dữ liệu

Schema được mô tả chi tiết tại: [database-schema.md](./database-schema.md)

### Các bảng chính trong luồng mua vé

| Bảng | Vai trò |
|------|---------|
| `Order` | Reservation record chính thức, `PENDING_PAYMENT` → `PAID` → `EXPIRED` / `CANCELLED` / `PAYMENT_FAILED` / `REFUNDED` |
| `OrderItem` | Chi tiết từng loại vé trong order |
| `Ticket` | Vé điện tử với QR code, sinh khi thanh toán thành công |
| `PaymentTransaction` | Giao dịch thanh toán: `INITIATED` → `SUCCESS` / `FAILED` / `TIMEOUT` |
| `TicketType` | Cấu hình loại vé: `totalQty`, `soldQty`, `reservedQty`, `maxPerUser` |
| `UserTicketCounter` | Bộ đếm per-user: `paidQty` + `reservedQty` theo từng ticket type |
| `IdempotencyKey` | Chống double-click (PostgreSQL) |

---

## 3. Redis Keys

Mô tả chi tiết tại: [ticket-type-inventory.md](./ticket-type-inventory.md#2-redis-keys)

### 3.1. Inventory

| Key | Kiểu | TTL | Ý nghĩa |
|-----|------|-----|---------|
| `stock:{ticketTypeId}` | String (integer) | Không có | Số vé còn lại. Khởi tạo = `availableQty`. DECR khi reserve. |
| `user-limit:{userId}:{ticketTypeId}` | String (integer) | Không có | Tổng vé đã mua + đang giữ. Kiểm tra `maxPerUser`. |
| `reservation:{orderId}` | String (JSON) | `expiresAt - now()` | Thông tin giữ chỗ: `{order_id, user_id, ticket_type_id, quantity}`. Auto-delete khi TTL hết. |

### 3.2. Idempotency

| Key | Storage | TTL | Ý nghĩa |
|-----|---------|-----|---------|
| `IdempotencyKey` table (PostgreSQL) | Row | 15 phút | Primary storage cho `POST /orders`: lưu `PROCESSING` → `COMPLETED`, `requestHash`, `responseBody`, `orderId` |
| `idem:{userId}:{idempotencyKey}` (Redis) | String | 15 phút | Dùng bởi `IdempotencyService` cho `PaymentService.createPayment()` |

### 3.3. Rate Limiting

| Key | TTL | Ý nghĩa |
|-----|-----|---------|
| `rate-limit:{userId}:/orders` | 1 phút | Giới hạn request tạo order |
| `rate-limit:ip:{ip}:/orders` | 1 phút | Giới hạn theo IP |
| `waiting-room:token:{token}` | Thời gian chờ | Token hợp lệ để vào bước giữ vé |

---

## 4. Redis Lua Scripts

### 4.1. `reserve-ticket.lua`

Thực hiện nguyên tử: đọc stock, kiểm tra giới hạn, giữ vé.

```lua
-- KEYS = [stockKey, userLimitKey, reservationKey]
-- ARGV = [quantity, maxPerUser, ttlSeconds, orderId, userId, ticketTypeId]

local stock = tonumber(redis.call('GET', KEYS[1]) or 0)
local userCount = tonumber(redis.call('GET', KEYS[2]) or 0)

if stock < tonumber(ARGV[1]) then
  return cjson.encode({ok = false, step = "stock_check", error = "OUT_OF_STOCK", message = "Not enough tickets"})
end

local newUserCount = userCount + tonumber(ARGV[1])
if newUserCount > tonumber(ARGV[2]) then
  return cjson.encode({ok = false, step = "user_limit_check", error = "EXCEED_USER_LIMIT", message = "Purchase limit exceeded", remaining_can_buy = math.max(0, tonumber(ARGV[2]) - userCount)})
end

if redis.call('EXISTS', KEYS[3]) == 1 then
  return cjson.encode({ok = false, step = "reservation_check", error = "RESERVATION_ALREADY_EXISTS", message = "Reservation already exists"})
end

redis.call('DECRBY', KEYS[1], ARGV[1])
redis.call('INCRBY', KEYS[2], ARGV[1])
local reservationData = cjson.encode({
  order_id = ARGV[4],
  user_id = ARGV[5],
  ticket_type_id = ARGV[6],
  quantity = tonumber(ARGV[1])
})
redis.call('SETEX', KEYS[3], tonumber(ARGV[3]), reservationData)

return cjson.encode({ok = true, step = "reserved", error = nil, message = "Reservation successful"})
```

### 4.2. `release-reservation.lua`

Thực hiện nguyên tử: xác minh reservation, hoàn stock, giảm user-limit, xóa reservation.

```lua
-- KEYS = [reservationKey, stockKey, userLimitKey]
-- ARGV = [quantity, orderId, userId, ticketTypeId]

local reservation = redis.call('GET', KEYS[1])
if not reservation then
  return cjson.encode({ok = false, step = "get_reservation", error = "RESERVATION_NOT_FOUND", message = "Reservation not found"})
end

local data = cjson.decode(reservation)
if data.order_id ~= ARGV[2] or data.user_id ~= ARGV[3]
   or data.ticket_type_id ~= ARGV[4] or data.quantity ~= tonumber(ARGV[1]) then
  return cjson.encode({ok = false, step = "verify_reservation", error = "RESERVATION_MISMATCH", message = "Reservation data mismatch"})
end

redis.call('INCRBY', KEYS[2], ARGV[1])
local newLimit = redis.call('DECRBY', KEYS[3], ARGV[1])
if tonumber(newLimit) < 0 then
  redis.call('SET', KEYS[3], 0)
end
redis.call('DEL', KEYS[1])

return cjson.encode({ok = true, step = "released", error = nil, message = "Reservation released", releasedQty = ARGV[1]})
```

---

## 5. Luồng nghiệp vụ chi tiết

### 5.1. Luồng mua vé — tạo order đến khi thanh toán thành công

Thành phần tham gia: Customer Web App → Backend API → Redis Lua Script → PostgreSQL → Mock Payment Gateway → Payment Webhook → Ticket Issue

**Bước 1 — Frontend gửi request**

```http
POST /orders
Authorization: Bearer <access_token>
Idempotency-Key: <uuid-v4>
Content-Type: application/json

{
  "concertId": "concert_abc123",
  "items": [
    { "ticketTypeId": "tt_vip_001", "quantity": 2 },
    { "ticketTypeId": "tt_std_002", "quantity": 1 }
  ]
}
```

Frontend sinh `Idempotency-Key` dạng UUID cho mỗi lần bấm mua.

**Bước 2 — JWT xác thực**

`JwtAuthGuard` kiểm tra JWT hợp lệ, trích xuất `userId`, `email`, `role`.
`RolesGuard` kiểm tra role: `CUSTOMER`, `ORGANIZER` hoặc `ADMIN` mới được tạo order.

**Bước 3 — IdempotencyInterceptor (PostgreSQL)**

Tìm row `IdempotencyKey` với `userId` + `key`:

| Trạng thái key | Hành vi |
|-----------------|---------|
| Chưa tồn tại | INSERT với `status = PROCESSING`, tiếp tục xử lý |
| `PROCESSING` | Trả `409 Conflict` "Request đang được xử lý, vui lòng chờ" |
| `COMPLETED` | Trả `responseBody` đã cache (orderId, paymentUrl) |
| `FAILED` | Reset về `PROCESSING`, cho retry |

**Bước 4 — Kiểm tra nghiệp vụ concert và ticket type**

Với từng `ticketTypeId` trong request:

1. Concert tồn tại và `status` = `PUBLISHED` hoặc `SALE_OPEN`.
2. Concert đã mở bán: `saleStartsAt <= now`.
3. Concert chưa đóng bán: `saleEndsAt IS NULL OR saleEndsAt > now`.
4. Ticket type thuộc concert đó, `status = ACTIVE`.
5. `saleStartsAt <= now` (không so sới concert sale window).
6. `saleEndsAt IS NULL OR saleEndsAt > now`.
7. Số lượng `>= 1` và `<= maxPerUser`.

**Bước 5 — Seed Redis stock**

Nếu `stock:{ticketTypeId}` chưa tồn tại trong Redis, khởi tạo:
`stock = totalQty - soldQty - reservedQty` (từ PostgreSQL).

**Bước 6 — Redis Lua Script `reserve-ticket` (nguyên tử)**

Gọi song song cho mỗi ticket type. Lua Script thực hiện:

1. READ stock → kiểm tra `stock >= quantity`
2. READ user-limit → kiểm tra `userCount + quantity <= maxPerUser`
3. CHECK reservation chưa tồn tại
4. DECRBY stock
5. INCRBY user-limit
6. SET reservation với TTL

Nếu bất kỳ ticket type nào thất bại → rollback **tất cả** reservation đã thành công (duyệt ngược từ `failedIndex - 1`).

**Bước 7 — Tạo Order + OrderItem trong PostgreSQL**

Trong cùng một transaction:
- `Order` với `status = PENDING_PAYMENT`, `expiresAt = now() + TTL`
- `OrderItem` cho từng ticket type: `quantity`, `unitPrice`, `subtotal`
- Upsert `UserTicketCounter`: tăng `reservedQty`

Nếu PostgreSQL insert thất bại → rollback **tất cả** Redis reservation đã giữ.

**Bước 8 — Tạo Payment URL**

`PaymentService.createPaymentUrl()`:
1. Kiểm tra order tồn tại và `status = PENDING_PAYMENT`.
2. Nếu đã có `PaymentTransaction INITIATED` với `paymentUrl`, trả lại URL cũ (`reused: true`).
3. Gọi `CircuitBreaker.execute()` → `MockGatewayService.createPaymentUrl()`.
4. Tạo `PaymentTransaction` với `status = INITIATED`, lưu `paymentUrl`.
5. Nếu gateway thất bại → Circuit Breaker mở, rollback order + Redis reservation + UserTicketCounter.

**Bước 9 — Cập nhật IdempotencyKey**

`IdempotencyInterceptor` cập nhật `IdempotencyKey` row:
- `status = COMPLETED`
- `responseBody = { orderId, paymentUrl }`

**Bước 10 — Schedule BullMQ delayed job**

```typescript
expireQueue.add('expire', { orderId }, { delay: ttl * 1000, jobId: `expire-${orderId}` })
```

**Bước 11 — Response**

```json
{
  "order": {
    "id": "ord_xyz789",
    "concertId": "concert_abc123",
    "concertTitle": "MTP Fan Meeting 2026",
    "status": "PENDING_PAYMENT",
    "totalAmountInVnd": 2500000,
    "currency": "VND",
    "expiresAt": "2026-06-08T12:15:00Z",
    "paidAt": null,
    "cancelledAt": null,
    "createdAt": "2026-06-08T12:00:00Z",
    "items": [
      { "id": "oi_001", "ticketTypeId": "tt_vip_001", "ticketTypeName": "VIP", "quantity": 2, "unitPrice": 1000000, "subtotal": 2000000, "ticketCount": 0 },
      { "id": "oi_002", "ticketTypeId": "tt_std_002", "ticketTypeName": "Standard", "quantity": 1, "unitPrice": 500000, "subtotal": 500000, "ticketCount": 0 }
    ],
    "ticketCount": 0
  },
  "paymentUrl": "https://mock-payment.example.com/pay?orderId=ord_xyz789&amount=2500000"
}
```

---

### 5.2. Luồng thanh toán — Mock Gateway Callback

Endpoint: `POST /payment/mock-callback`

**Request:**

```json
{
  "orderId": "ord_xyz789",
  "providerTransactionId": "MOCK_ord_xyz789_1719123456",
  "result": "SUCCESS",
  "amount": 2500000,
  "signature": "hmac_sha256..."
}
```

**Bước 1 — Verify signature**

`MockGatewayService.verifySignature(payload, signature)` — HMAC-SHA256 với `PAYMENT_WEBHOOK_SECRET`.

**Bước 2 — Kiểm tra lượng tiền**

`order.totalAmountInVnd` phải khớp với `amount` trong callback.

**Bước 3 — Xử lý theo Order status hiện tại**

| Order status | Hành vi |
|--------------|---------|
| `PAID` | Trả idempotent success, không xử lý lại |
| `EXPIRED` | Ghi nhận late webhook, không phát hành vé, `requiresManualAction: true` |
| `CANCELLED` / `PAYMENT_FAILED` / `REFUNDED` | Bỏ qua, trả success |
| `PENDING_PAYMENT` | Tiếp tục xử lý theo `result` |

**Bước 4 — Xử lý theo callback result**

#### FAILED → `handlePaymentFailed()`

1. Update `PaymentTransaction` → `FAILED`.
2. Update `Order` → `PAYMENT_FAILED`, `releaseReason = 'PAYMENT_FAILED'`.
3. `TicketType.reservedQty -= quantity` (PostgreSQL).
4. `UserTicketCounter.reservedQty -= quantity` (PostgreSQL).
5. `RedisService.releaseReservation()` cho từng ticket type.

#### TIMEOUT → `handlePaymentTimeout()`

1. Upsert `PaymentTransaction` → `TIMEOUT`.
2. Order giữ nguyên `PENDING_PAYMENT` — cronjob sẽ expire.

#### SUCCESS → `handlePaymentSuccess()`

Thực hiện trong một PostgreSQL `$transaction`:

1. **Upsert PaymentTransaction** → `SUCCESS`, lưu `rawWebhook`, `receivedAt`.
2. **Update Order** → `PAID`, `paidAt = now()`.
3. **Pre-generate ticket IDs và QR tokens** (trước transaction, vì cần biết `ticketId` trước khi ký HMAC).
4. **Create Ticket records** — mỗi `OrderItem.quantity = N` sinh N bản ghi:
   - `qrRawToken = randomUUID()` (lưu trong DB, gửi về frontend để render QR)
   - `qrTokenHash = SHA-256(qrRawToken)`
   - `gateId = findLeastLoadedGate(concertId)` (cổng có ít vé nhất; null nếu chưa có gate nào)
   - `qrSignature = HMAC-SHA256({ticketId}:{qrTokenHash}:{gateId}, QR_SIGNATURE_SECRET)`
     *(NOTE: Nếu `gateId = null`, signature format là HMAC({ticketId}:{qrTokenHash}:, secret))*
5. **Update TicketType**: `soldQty += quantity`, `reservedQty -= quantity`.
6. **Update UserTicketCounter**: `paidQty += quantity`, `reservedQty -= quantity`.

Sau transaction thành công:
7. **Clean up Redis**: `DEL reservation:{orderId}`.
8. **Decrement user-limit**: `decrementUserLimit()` cho từng ticket type.
9. **Queue notification**: BullMQ job `send-order-paid-email` với `{ orderId, userId }` (không chứa token — processor tự query DB để lấy ticket info). Email gửi cho user link đến trang web `/my-tickets` thay vì chứa QR token.

---

### 5.3. Luồng hủy order thủ công

**Trigger:** `POST /orders/:orderId/cancel`

1. Kiểm tra ownership: `order.userId == userId`.
2. Kiểm tra `Order.status == PENDING_PAYMENT`.
3. `RedisService.releaseReservation()` cho từng ticket type.
4. `UserTicketCounter.reservedQty -= quantity` (PostgreSQL).
5. Update `Order` → `CANCELLED`, `releaseReason = 'CANCELLED'`, `inventoryReleasedAt = now()`.
6. Xóa BullMQ expire job (`expire-{orderId}`).

---

### 5.4. Luồng order expired tự động

**Trigger:** BullMQ delayed job `expire-{orderId}` sau `ttl` giây.

1. Tìm `Order` có `status = PENDING_PAYMENT` và `expiresAt < now()`.
2. Skip nếu đã thanh toán hoặc đã expired.
3. `RedisService.releaseReservation()` cho từng ticket type.
4. `UserTicketCounter.reservedQty -= quantity` (PostgreSQL).
5. `TicketType.reservedQty -= quantity` (PostgreSQL).
6. Update `Order` → `EXPIRED`, `releaseReason = 'PAYMENT_TIMEOUT'`, `inventoryReleasedAt = now()`.

---

## 6. Đồng bộ tồn kho

Tại các thời điểm giao dịch:

| Sự kiện | Redis `stock` | Redis `user-limit` | PostgreSQL `reservedQty` | PostgreSQL `soldQty` |
|---------|---------------|-------------------|------------------------|---------------------|
| Tạo order (PENDING) | DECR | INCR | `+= quantity` | — |
| Thanh toán thành công (PAID) | DEL reservation | DECR (paid tickets no longer count) | `-= quantity` | `+= quantity` |
| Order expired | INCR | DECR | `-= quantity` | — |
| Order cancelled | INCR | DECR | `-= quantity` | — |
| Order payment failed | INCR | DECR | `-= quantity` | — |
| Order refunded | INCR | DECR | — | `-= quantity` |

---

## 7. Mô tả API Endpoints

### 7.1. `POST /orders` — Tạo order và giữ vé

**Authentication:** Required — JWT (`CUSTOMER`, `ORGANIZER`, `ADMIN`)

**Headers:**

| Header | Bắt buộc | Mô tả |
|--------|-----------|--------|
| `Authorization` | Có | `Bearer <access_token>` |
| `Idempotency-Key` | Có | UUID dạng chuỗi |

**Request Body:**

```json
{
  "concertId": "string",
  "items": [
    { "ticketTypeId": "string", "quantity": 1 }
  ]
}
```

**Validation:**

| Trường | Quy tắc |
|--------|---------|
| `concertId` | Required, tồn tại, trạng thái `PUBLISHED`/`SALE_OPEN`, đã mở bán |
| `items` | Required, mảng không rỗng |
| `items[].ticketTypeId` | Required, thuộc concert, `ACTIVE`, còn vé |
| `items[].quantity` | Integer >= 1, không vượt `maxPerUser` |

**Success Response — `201 Created`:**

```json
{
  "order": { /* OrderResponseDto */ },
  "paymentUrl": "https://mock-payment.example.com/pay?orderId=..."
}
```

**Error Responses:**

| Status | Trường hợp |
|--------|-------------|
| `400` | Thiếu Idempotency-Key / validation thất bại / request hash mismatch |
| `401` | JWT không hợp lệ |
| `403` | Concert chưa mở bán / đã đóng bán / đã hủy |
| `404` | Concert hoặc TicketType không tồn tại |
| `409` | Idempotency-Key đang xử lý → trả response cũ |
| `422` | `OUT_OF_STOCK` / `EXCEED_USER_LIMIT` / `RESERVATION_ALREADY_EXISTS` |
| `429` | Rate limit exceeded |
| `503` | Payment gateway lỗi (Circuit Breaker OPEN) |

---

### 7.2. `GET /orders/me` — Danh sách order của user

**Authentication:** Required — JWT

**Query Parameters:**

| Tham số | Kiểu | Mô tả |
|---------|------|--------|
| `status` | `OrderStatus` | Lọc theo trạng thái |
| `page` | `number` | Số trang (mặc định: 1) |
| `limit` | `number` | Item/trang (mặc định: 10) |

**Response — `200 OK`:**

```json
{
  "data": [
    {
      "id": "ord_xyz789",
      "concertId": "concert_abc123",
      "concertTitle": "MTP Fan Meeting 2026",
      "status": "PENDING_PAYMENT",
      "totalAmountInVnd": 2500000,
      "currency": "VND",
      "expiresAt": "2026-06-08T12:15:00Z",
      "paidAt": null,
      "cancelledAt": null,
      "createdAt": "2026-06-08T12:00:00Z",
      "updatedAt": "2026-06-08T12:00:00Z",
      "items": [
        { "id": "oi_001", "ticketTypeId": "tt_vip_001", "ticketTypeName": "VIP", "quantity": 2, "unitPrice": 1000000, "subtotal": 2000000, "ticketCount": 0 }
      ],
      "ticketCount": 0
    }
  ],
  "total": 5,
  "page": 1,
  "limit": 10,
  "totalPages": 1
}
```

---

### 7.3. `GET /orders/me/:orderId` — Chi tiết order

**Authentication:** Required — JWT (owner only)

**Response — `200 OK`:**

```json
{
  "id": "ord_xyz789",
  "concertId": "concert_abc123",
  "concertTitle": "MTP Fan Meeting 2026",
  "status": "PAID",
  "totalAmountInVnd": 2500000,
  "currency": "VND",
  "expiresAt": "2026-06-08T12:15:00Z",
  "paidAt": "2026-06-08T12:05:00Z",
  "cancelledAt": null,
  "createdAt": "2026-06-08T12:00:00Z",
  "updatedAt": "2026-06-08T12:05:00Z",
  "items": [
    { "id": "oi_001", "ticketTypeId": "tt_vip_001", "ticketTypeName": "VIP", "quantity": 2, "unitPrice": 1000000, "subtotal": 2000000, "ticketCount": 2 }
  ],
  "paymentUrl": null,
  "ticketCount": 3,
  "tickets": [
    {
      "id": "tkt_001",
      "ticketTypeId": "tt_vip_001",
      "ticketTypeName": "VIP",
      "status": "ISSUED",
      "checkedInAt": null,
      "createdAt": "2026-06-08T12:05:00Z",
      "qrPayload": "tkt_001:<uuid-raw-token>:gate-id-abc123",
      "gateId": "gate-id-abc123"
    }
  ]
}
```

**Error — `403`:** Nếu `order.userId != currentUser.userId` và role không phải `ADMIN`.

**Error — `404`:** Order không tồn tại.

---

### 7.4. `POST /orders/:orderId/cancel` — Hủy order

**Authentication:** Required — JWT (owner only)

**Response — `200 OK`:**

```json
{
  "id": "ord_xyz789",
  "concertId": "concert_abc123",
  "concertTitle": "...",
  "status": "CANCELLED",
  "totalAmountInVnd": 2500000,
  "currency": "VND",
  "expiresAt": "2026-06-08T12:15:00Z",
  "paidAt": null,
  "cancelledAt": "2026-06-08T12:03:00Z",
  "createdAt": "2026-06-08T12:00:00Z",
  "updatedAt": "2026-06-08T12:03:00Z",
  "items": [ /* OrderItemResponseDto[] */ ],
  "paymentUrl": null,
  "ticketCount": 0
}
```

**Error — `400`:** Order không ở trạng thái `PENDING_PAYMENT`.

**Error — `403`:** Không phải chủ sở hữu.

---

### 7.5. `POST /payment/mock-callback` — Mock payment webhook

**Authentication:** Không cần JWT (verify bằng signature)

**Request:**

```json
{
  "orderId": "ord_xyz789",
  "providerTransactionId": "MOCK_ord_xyz789_1719123456",
  "result": "SUCCESS",
  "amount": 2500000,
  "signature": "hmac_sha256(orderId:providerTransactionId:result:amount, secret)"
}
```

**Validation:**

| Trường | Quy tắc |
|--------|---------|
| `orderId` | Required, tồn tại |
| `providerTransactionId` | Required, unique cặp `provider + providerTransactionId` |
| `result` | Enum: `SUCCESS`, `FAILED`, `TIMEOUT` |
| `amount` | Phải khớp `Order.totalAmountInVnd` |
| `signature` | HMAC-SHA256 hợp lệ |

**Response — `200 OK` (idempotent, đã xử lý trước đó):**

```json
{
  "success": true,
  "message": "Webhook trùng lặp, order đã PAID trước đó. Không xử lý lại.",
  "orderId": "ord_xyz789",
  "status": "PAID"
}
```

**Response — `200 OK` (lần đầu, SUCCESS):**

```json
{
  "success": true,
  "message": "Thanh toán thành công, vé đã được phát hành",
  "orderId": "ord_xyz789",
  "status": "PAID"
}
```

**Response — `200 OK` (late webhook, order đã EXPIRED):**

```json
{
  "success": false,
  "message": "Webhook đến sau khi đơn hàng đã hết hạn. Không phát hành vé, cần xử lý hoàn tiền/mock refund.",
  "orderId": "ord_xyz789",
  "status": "EXPIRED"
}
```

**Error Responses:**

| Status | Trường hợp |
|--------|-------------|
| `400` | Signature không hợp lệ / số tiền không khớp |
| `404` | Order không tồn tại |

---

### 7.6. `GET /admin/orders` — Danh sách tất cả order (admin)

**Authentication:** Required — JWT (`ADMIN`, `ORGANIZER`)

**Query Parameters:**

| Tham số | Kiểu | Mô tả |
|---------|------|--------|
| `status` | `string` | Lọc theo trạng thái |
| `concertId` | `string` | Lọc theo concert |
| `page` | `number` | Số trang (mặc định: 1) |
| `limit` | `number` | Item/trang (mặc định: 20) |

**Response — `200 OK`:**

```json
{
  "data": [ /* OrderResponseDto[] */ ],
  "total": 100,
  "page": 1,
  "limit": 20,
  "totalPages": 5
}
```

---

### 7.7. `GET /admin/orders/:id` — Chi tiết order (admin)

**Authentication:** Required — JWT (`ADMIN`, `ORGANIZER`)

**Response — `200 OK`:** `OrderResponseDto` (giống 7.4)

---

## 8. Kịch bản lỗi chi tiết

### 1. Không có Idempotency-Key

- `IdempotencyInterceptor` trả `400 Bad Request`: "Missing Idempotency-Key header".
- Không tạo order.

### 2. Idempotency-Key dùng lại với body khác

- `IdempotencyInterceptor` tính `requestHash` (SHA-256 normalized JSON).
- So sánh với hash đã lưu → khác nhau → `400 Bad Request`.
- Message: "Idempotency-Key đã được dùng cho request khác".

### 3. Idempotency-Key dùng lại với cùng body

- Trả `201 Created` với kết quả order đã tạo trước đó (from `responseBody`).
- Không tạo order trùng.

### 4. Idempotency-Key đang xử lý (concurrent)

- Trả `409 Conflict`: "Request đang được xử lý, vui lòng chờ".

### 5. Hết vé (OUT_OF_STOCK)

- Lua Script `reserve-ticket` trả lỗi.
- Backend trả `422 Unprocessable Entity`.
- Tất cả reservation đã giữ trước đó được rollback.
- Không có orphan reservation trong Redis.

### 6. Vượt giới hạn per-user (EXCEED_USER_LIMIT)

- Lua Script trả lỗi kèm `remaining_can_buy`.
- Backend trả `422 Unprocessable Entity`.
- Message: "Purchase limit exceeded. You can buy up to X more ticket(s) for this ticket type".

### 7. Concert chưa mở bán / đã đóng / đã hủy

- `validateTicketType()` throw `BadRequestException`.
- Backend trả `400 Bad Request`.
- Không giữ vé, không tạo order.

### 8. Redis reserve OK nhưng PostgreSQL lỗi

- PostgreSQL `order.create` throw (ví dụ: DB timeout, unique constraint violation).
- catch block:
  - Log lỗi kèm `orderId`.
  - Gọi `releaseReservation()` cho **tất cả** ticket types.
  - Trả `400 Bad Request`: "Failed to create order. Please try again."
- Không có orphan reservation.

### 9. Redis reserve thất bại giữa chừng (multi-item order)

- `Promise.all` chạy reserve song song.
- Ticket type N thất bại (OUT_OF_STOCK hoặc EXCEED_USER_LIMIT).
- `failedIndex = N` → rollback các reservation từ 0 đến N-1.
- Trả `422 Unprocessable Entity` với lỗi cụ thể.

### 10. Thanh toán thành công muộn (order đã EXPIRED)

- `PaymentService.handleMockWebhook()` kiểm tra `order.status === EXPIRED`.
- Gọi `recordLateWebhook()` — upsert `PaymentTransaction SUCCESS`.
- Trả `200 OK` với `requiresManualAction: true` (trong message).
- Không phát hành vé, không tạo ticket.
- Admin cần xử lý hoàn tiền thủ công.

### 11. Webhook trùng lặp (callback gửi 2 lần)

- `PaymentService` kiểm tra `order.status === PAID`.
- Trả `200 OK` idempotent success, không phát hành vé lần 2.
- Unique constraint `(provider, providerTransactionId)` là lớp bảo vệ cuối cùng.

### 12. Payment gateway Circuit Breaker OPEN

- `CircuitBreaker.execute()` throw `ServiceUnavailableException`.
- Backend rollback order + Redis reservation + UserTicketCounter.
- Trả `503 Service Unavailable`: "Cổng thanh toán đang tạm gián đoạn, vui lòng thử lại sau."

### 13. Concert bị hủy sau khi đặt vé

- Order vẫn ở `PENDING_PAYMENT` đến khi hết hạn.
- BullMQ expire job xử lý: chuyển `EXPIRED`, hoàn lại tồn kho.
- Khách không bị trừ tiền (chưa thanh toán).

---

## 9. Ràng buộc

### 9.1. Ràng buộc tính nhất quán

- Lua Script đảm bảo `stock` và `user-limit` được cập nhật nguyên tử — không race condition.
- `Order PENDING` là reservation record duy nhất trong PostgreSQL.
- `expiresAt` trong PostgreSQL và TTL của `reservation:{orderId}` trong Redis bằng nhau.
- Khi order `PAID`, `user-limit` Redis phải được giảm (chuyển từ `reservedQty` → `paidQty`).
- Khi order `EXPIRED` / `CANCELLED` / `PAYMENT_FAILED`, cả `stock` và `user-limit` phải được hoàn lại.

### 9.2. Ràng buộc bảo mật

- Chỉ `CUSTOMER`, `ORGANIZER` hoặc `ADMIN` được tạo order.
- Mỗi user chỉ xem được order của chính mình (trừ ADMIN).
- `Idempotency-Key` được gắn với `userId` — không dùng chung giữa các user.
- Webhook phải verify signature trước khi xử lý.
- Không lưu thông tin thẻ ngân hàng trong hệ thống.

### 9.3. Ràng buộc hiệu năng

- Kiểm tra tồn kho và giữ vé chạy nguyên tử trong Redis Lua Script.
- Lua Script dùng `EVALSHA` (fallback `EVAL` nếu Redis restart).
- Order creation trong PostgreSQL dùng transaction.
- Pre-generate ticket IDs và QR tokens **trước** PostgreSQL transaction (vì cần `ticketId` để ký HMAC).
- Gửi email, phát hành notification chạy qua BullMQ — không block HTTP response.

### 9.4. Ràng buộc thời gian giữ chỗ

- `RESERVATION_TTL` mặc định: **15 phút** (cấu hình qua `order.reservationTtlSeconds` env).
- BullMQ delayed job schedule với delay = TTL.
- Redis `reservation:{orderId}` có TTL = TTL để auto-cleanup.
- Nếu order chưa `PAID` sau TTL → expire tự động.

---

## 10. Tiêu chí chấp nhận

### Mua vé

- [ ] User gửi request hợp lệ → tạo `Order` trạng thái `PENDING_PAYMENT`.
- [ ] Redis Lua Script giữ vé → `stock` giảm, `user-limit` tăng.
- [ ] `PaymentTransaction` được tạo ở trạng thái `INITIATED` với `paymentUrl`.
- [ ] `IdempotencyInterceptor` trả `201` với kết quả order.
- [ ] BullMQ delayed job được schedule với delay = TTL.

### Idempotency

- [ ] User bấm "Mua vé" 2 lần nhanh → chỉ 1 order được tạo.
- [ ] Request thứ hai nhận lại kết quả order đầu tiên.
- [ ] Không có orphan reservation trong Redis.

### Tồn kho

- [ ] Khi `stock = 0`, Lua Script trả lỗi `OUT_OF_STOCK`, Backend trả `422`.
- [ ] Khi `stock >= 1` sau seed, reserve thành công.
- [ ] Khi order cancelled/expired, stock được hoàn lại.

### Giới hạn per-user

- [ ] Khi user đã giữ `maxPerUser` vé, request tiếp theo trả `EXCEED_USER_LIMIT` kèm `remaining_can_buy`.

### Thanh toán thành công

- [ ] Webhook SUCCESS → order chuyển `PAID`, `paidAt` được set.
- [ ] Đúng số lượng ticket được tạo (mỗi `OrderItem.quantity = N` → N ticket).
- [ ] `qrTokenHash` là SHA-256 hash, `qrSignature` là HMAC-SHA256 (với gateId).
- [ ] `qrRawToken` được lưu trong DB, **không bao giờ** được gửi qua email.
- [ ] Email xác nhận không chứa QR token — chỉ chứa link đến `/my-tickets`.
- [ ] `soldQty` tăng, `reservedQty` giảm trong PostgreSQL.
- [ ] `paidQty` tăng, `reservedQty` giảm trong `UserTicketCounter`.
- [ ] Redis `reservation:{orderId}` bị xóa.
- [ ] Redis `user-limit` được giảm.
- [ ] BullMQ job `send-order-paid-email` được queue.
- [ ] Mỗi ticket được gán vào cổng có ít vé nhất (round-robin).
- [ ] QR payload format v2: `{ticketId}:{rawToken}:{gateId}`.
- [ ] Ticket response có field `gateId` và `qrPayload` đầy đủ.

### Thanh toán thất bại

- [ ] Webhook FAILED → order chuyển `PAYMENT_FAILED`, tồn kho được hoàn.

### Late webhook

- [ ] Webhook SUCCESS cho order đã `EXPIRED` → không phát hành vé, `requiresManualAction: true`.

### Webhook trùng lặp

- [ ] Cùng `providerTransactionId` gửi 2 lần → lần 2 trả idempotent success, không tạo thêm vé.

### Concurrency

- [ ] 100 request đồng thời cho 50 vé → chính xác 50 order được tạo, 50 order bị từ chối.
- [ ] Không có oversell (`soldQty` không vượt `totalQty`).

### Redis rollback

- [ ] PostgreSQL lỗi sau khi Redis reserve OK → rollback Redis, trả `400`.
- [ ] Multi-item order: ticket type N thất bại → rollback N-1 reservation đã thành công.

### Unauthorized

- [ ] Request không có JWT → `401 Unauthorized`.
- [ ] Request có JWT không hợp lệ → `401 Unauthorized`.
