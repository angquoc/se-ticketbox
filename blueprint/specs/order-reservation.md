# Đặc tả: Tạo đơn hàng và giữ chỗ vé (Order Reservation)

## Mô tả

Tính năng **Order Reservation** chịu trách nhiệm giữ vé tạm thời cho khách hàng khi họ bắt đầu quy trình mua vé. Sau khi giữ vé thành công, hệ thống tạo đơn hàng ở trạng thái `PENDING_PAYMENT` và chuyển khách hàng sang bước thanh toán (business workflow được mô tả chi tiết trong [payment.md](./payment.md)).

Đây là module trung gian giữa **Ticket Type Inventory** và **Payment**, là bước kết nối giữa việc kiểm tra tồn kho, giữ vé tạm thời, tạo order, với việc thanh toán và phát hành vé điện tử.

Cụ thể, luồng này chịu trách nhiệm với các tác vụ như:

- Kiểm tra tồn kho và giới hạn mua vé trước khi tạo order.
- Giữ vé tạm thời bằng Redis Lua Script để tránh oversell khi nhiều người mua cùng lúc.
- Tạo `Order` trạng thái `PENDING_PAYMENT` trong PostgreSQL làm reservation record chính thức.
- Tạo `OrderItem` cho từng loại vé.
- Khởi tạo `PaymentTransaction` trạng thái `INITIATED`.
- Chống double-click bằng Idempotency Key.
- Xử lý giữ chỗ hết hạn bằng BullMQ Delayed Job.
- Hoàn lại tồn kho khi order bị hủy hoặc hết hạn.

---

## Mô hình dữ liệu
Schema được mô tả chi tiết tại: [database-schema.md](./database-schema.md#order)

### `Order`

| Trường | Ý nghĩa |
|--------|---------|
| `status` | `PENDING_PAYMENT` → `PAID` → `EXPIRED` / `CANCELLED` / `PAYMENT_FAILED` / `REFUNDED` |
| `expiresAt` | Thời điểm hết hạn giữ chỗ — reservation TTL trong PostgreSQL |
| `totalAmountInVnd` | Tổng số tiền tính bằng VND (số nguyên) |
| `inventoryReleasedAt` | Thời điểm vé được hoàn lại tồn kho |
| `releaseReason` | Lý do hoàn vé: `PAYMENT_TIMEOUT`, `CANCELLED`, `PAYMENT_FAILED` |

### `OrderItem`

### Các bảng liên quan

| Bảng | Vai trò trong luồng reservation |
|-------|----------------------------------|
| `Order` | Bản ghi reservation chính thức, có `expiresAt` là TTL |
| `OrderItem` | Chi tiết từng loại vé trong order |
| `PaymentTransaction` | Khởi tạo ở trạng thái `INITIATED`, chờ webhook thanh toán |
| `IdempotencyKey` | Chống double-click và retry request |
| `UserTicketCounter` | Đồng bộ số vé user đã mua / đang giữ |
| `TicketType` | Cung cấp `soldQty`, `reservedQty` để kiểm tra tồn kho |

---

## Redis Keys

Mô tả chi tiết tại: [ticket-type-inventory.md](./ticket-type-inventory.md#2-redis-keys)

### 2.1. Inventory Keys

| Key | Kiểu | TTL | Ý nghĩa |
|-----|------|-----|---------|
| `stock:{ticketTypeId}` | String (integer) | Không có TTL | Số vé còn lại. Khởi tạo = `availableQty`. DECR khi reserve, INCR khi release. |
| `user-limit:{userId}:{ticketTypeId}` | String (integer) | Không có TTL | Tổng vé user đã mua + đang giữ. Kiểm tra `maxPerUser`. |
| `reservation:{orderId}` | Hash | `expiresAt - now()` | Thông tin giữ chỗ: `{ ticketTypeId: quantity, userId, createdAt }`. Tự động xóa khi TTL hết. |

### 2.2. Idempotency Key

| Key | Kiểu | TTL | Ý nghĩa |
|-----|------|-----|---------|
| `idem:{userId}:{idempotencyKey}` | String | 15 phút | Lưu trạng thái xử lý và kết quả order đã tạo |

### 2.3. Rate Limiting Keys (toàn hệ thống)

| Key | TTL | Ý nghĩa |
|-----|-----|---------|
| `rate-limit:{userId}:/orders` | 1 phút | Giới hạn request tạo order |
| `rate-limit:ip:{ip}:/orders` | 1 phút | Giới hạn theo IP |
| `waiting-room:token:{token}` | Thời gian chờ | Token hợp lệ để vào bước giữ vé |

---

## Luồng nghiệp vụ

### 3.1. Luồng đặt vé — từ bấm "Mua vé" đến khi tạo order có trạng thái `PENDING_PAYMENT`

Thành phần tham gia: Customer Web App, Backend API, Redis Lua Script, PostgreSQL, BullMQ.

Các bước xử lý:

**Bước 1 — Khán giả bấm "Mua vé"**

1. Customer Web App gửi request đến Backend:

   ```http
   POST /orders
   Authorization: Bearer <access_token>
   Idempotency-Key: <uuid>
   Content-Type: application/json

   {
     "concertId": "concert_abc123",
     "items": [
       { "ticketTypeId": "tt_vip_001", "quantity": 2 },
       { "ticketTypeId": "tt_std_002", "quantity": 1 }
     ]
   }
   ```

2. Frontend sinh `Idempotency-Key` dạng UUID cho mỗi lần bấm mua.

**Bước 2 — Xác thực JWT**

3. `JwtAuthGuard` kiểm tra JWT hợp lệ.
4. Backend trích xuất `userId`, `email`, `role` từ JWT.
5. Nếu role không phải `CUSTOMER`, `ORGANIZER` hoặc `ADMIN`, trả `403`.

**Bước 3 — Kiểm tra Rate Limit và Waiting Room**

6. Backend kiểm tra `rate-limit` theo user và IP.
7. Nếu vượt ngưỡng, trả `429 Too Many Requests`.
8. Nếu concert đang trong thời gian mở bán đông, kiểm tra waiting room token.
9. Nếu token không hợp lệ hoặc hết hạn, trả `403` yêu cầu vào hàng đợi.

**Bước 4 — Kiểm tra Idempotency Key**

10. Backend tra Redis: `idem:{userId}:{idempotencyKey}`.
11. Nếu key đã tồn tại và request trước đó đã hoàn tất → trả lại kết quả cũ (orderId, paymentUrl).
12. Nếu key đã tồn tại và request đang xử lý → trả `409` thông báo đang xử lý.
13. Nếu key chưa tồn tại → ghi `PROCESSING` vào Redis và tiếp tục.

**Bước 5 — Validate nghiệp vụ**

14. Kiểm tra concert tồn tại và có trạng thái cho phép mua vé (`PUBLISHED` hoặc `SALE_OPEN`).
15. Kiểm tra concert đã mở bán chưa (`saleStartsAt <= now`) và chưa đóng bán (`saleEndsAt > now` hoặc nullable).
16. Với từng `ticketTypeId` trong request:
    - Kiểm tra `TicketType` thuộc concert đó.
    - Kiểm tra `status = ACTIVE`.
    - Kiểm tra số lượng yêu cầu `>= 1` và `<= maxPerUser`.
17. Nếu có bất kỳ validation nào thất bại, trả lỗi ngay mà không giữ vé.

**Bước 6 — Giữ vé bằng Redis Lua Script (nguyên tử)**

18. Backend gọi Lua Script `reserve-ticket` trên Redis.

Lua Script thực hiện tuần tự:

```lua
-- Input: KEYS = [stockKey, userLimitKey, reservationKey]
--       ARGV = [quantity, userId, maxPerUser, reservationTTL, orderId, ticketTypeId]

-- 1. READ stock hiện tại
local stock = tonumber(redis.call('GET', KEYS[1]) or 0)

-- 2. READ counter per-user
local userCount = tonumber(redis.call('GET', KEYS[2]) or 0)

-- 3. CHECKPOINT — Số vé còn lại đủ không?
if stock < tonumber(ARGV[1]) then
  return {err = 'OUT_OF_STOCK', ticketTypeId = ARGV[6]}
end

-- 4. CHECKPOINT — Vượt giới hạn per-user không?
local newUserCount = userCount + tonumber(ARGV[1])
if newUserCount > tonumber(ARGV[3]) then
  return {err = 'EXCEED_USER_LIMIT', maxPerUser = ARGV[3], currentCount = userCount}
end

-- 5. CHECKPOINT — Reservation đã tồn tại chưa? (chống idempotency)
if redis.call('EXISTS', KEYS[3]) == 1 then
  return {err = 'RESERVATION_ALREADY_EXISTS'}
end

-- 6. DECRBY stock
redis.call('DECRBY', KEYS[1], ARGV[1])

-- 7. INCRBY user-limit
redis.call('INCRBY', KEYS[2], ARGV[1])

-- 8. SET reservation với TTL
local reservationData = cjson.encode({
  order_id = ARGV[5],
  user_id = ARGV[2],
  ticket_type_id = ARGV[6],
  quantity = tonumber(ARGV[1]),
  created_at = redis.call('TIME')[1]
})
redis.call('SETEX', KEYS[3], tonumber(ARGV[4]), reservationData)

return {ok = true}
```

19. Lua Script trả về `{ok = true}` hoặc `{err = 'OUT_OF_STOCK' | 'EXCEED_USER_LIMIT' | 'RESERVATION_ALREADY_EXISTS'}`.
20. Nếu script trả lỗi, Backend trả lỗi tương ứng mà không tạo order trong PostgreSQL.

**Bước 7 — Tạo Order trong PostgreSQL**

21. Backend mở transaction PostgreSQL.
22. Tạo bản ghi `Order`:
    - `userId`, `concertId` từ JWT và request.
    - `status = PENDING_PAYMENT`.
    - `totalAmountInVnd` = tổng `(quantity × unitPrice)` của tất cả OrderItem.
    - `expiresAt = now() + RESERVATION_TTL` (mặc định 15 phút, cấu hình qua biến môi trường).
23. Với từng `ticketTypeId`, tạo `OrderItem`:
    - `quantity`, `unitPrice` (lấy từ `TicketType.price` tại thời điểm tạo order).
    - `subtotal = quantity × unitPrice`.
24. Tạo `PaymentTransaction` trạng thái `INITIATED`.
25. Upsert `UserTicketCounter` — tăng `reservedQty` (không tăng `paidQty` vì chưa thanh toán).
26. Commit transaction.
27. Nếu bất kỳ bước nào lỗi, rollback toàn bộ và gọi Lua Script `release-ticket` để hoàn lại Redis.

**Bước 8 — Tạo Payment URL và trả kết quả**

28. Backend gọi Mock Payment Gateway để tạo payment URL.
29. Backend cập nhật `PaymentTransaction` với `paymentUrl` và `providerTransactionId`.
30. Backend cập nhật Redis Idempotency Key với kết quả: `{ orderId, paymentUrl, status: 'COMPLETED' }`.
31. Backend trả response cho frontend:

```json
{
  "orderId": "ord_xyz789",
  "status": "PENDING_PAYMENT",
  "expiresAt": "2026-06-07T12:15:00Z",
  "paymentUrl": "https://mock-payment.example.com/pay?orderId=ord_xyz789",
  "totalAmountInVnd": 2500000,
  "items": [
    { "ticketTypeId": "tt_vip_001", "name": "VIP", "quantity": 2, "unitPrice": 1000000, "subtotal": 2000000 },
    { "ticketTypeId": "tt_std_002", "name": "Standard", "quantity": 1, "unitPrice": 500000, "subtotal": 500000 }
  ]
}
```

**Bước 9 — Frontend chuyển sang trang thanh toán**

32. Frontend điều hướng người dùng sang `paymentUrl`.
33. Frontend hiển thị countdown thời gian giữ chỗ dựa trên `expiresAt`.

---

### 3.2. Luồng xử lý giữ chỗ hết hạn — Order expired

Thành phần tham gia: BullMQ Worker, PostgreSQL, Redis Lua Script.

**Trigger:** BullMQ Delayed Job kiểm tra định kỳ (hoặc scheduled job `OrderExpireProcessor`).

1. Job tìm tất cả `Order` có `status = PENDING_PAYMENT` và `expiresAt < now()`.
2. Với mỗi order hết hạn:
    - Cập nhật `Order.status = EXPIRED`.
    - Cập nhật `Order.inventoryReleasedAt = now()`.
    - Cập nhật `Order.releaseReason = 'PAYMENT_TIMEOUT'`.
    - Gọi Lua Script `release-ticket` để hoàn lại `stock` và giảm `user-limit`.
    - Upsert `UserTicketCounter` — giảm `reservedQty`.
    - Đẩy notification job `OrderExpired` để gửi email thông báo cho khách.

Lua Script `release-ticket`:

```lua
-- Input: KEYS = [reservationKey, stockKey, userLimitKey]
--       ARGV = [orderId, userId, ticketTypeId, quantity]

-- 1. GET reservation
local reservation = redis.call('GET', KEYS[1])
if not reservation then
  return {err = 'RESERVATION_NOT_FOUND'}
end

local data = cjson.decode(reservation)

-- 2. VERIFY khớp với request
if data.order_id ~= ARGV[1] or data.user_id ~= ARGV[2]
   or data.ticket_type_id ~= ARGV[3] or data.quantity ~= tonumber(ARGV[4]) then
  return {err = 'RESERVATION_MISMATCH'}
end

-- 3. INCRBY stock — hoàn vé về kho
redis.call('INCRBY', KEYS[2], ARGV[4])

-- 4. DECRBY user-limit — giảm counter
local newLimit = redis.call('DECRBY', KEYS[3], ARGV[4])
if tonumber(newLimit) < 0 then
  redis.call('SET', KEYS[3], 0)
end

-- 5. DEL reservation
redis.call('DEL', KEYS[1])

return {ok = true, releasedQty = ARGV[4]}
```

---

### 3.3. Luồng hủy order thủ công

1. Customer gọi `DELETE /orders/:orderId` hoặc `POST /orders/:orderId/cancel`.
2. Backend kiểm tra ownership: `order.userId == currentUser.userId`.
3. Backend kiểm tra `Order.status == PENDING_PAYMENT`.
4. Backend gọi Lua Script `release-ticket`.
5. Backend cập nhật `Order.status = CANCELLED`, `releaseReason = 'CANCELLED'`.
6. Backend upsert `UserTicketCounter` giảm `reservedQty`.

---

## Mô tả chi tiết API Endpoints

### 4.1. `POST /orders`

**Mô tả:** Tạo order và giữ chỗ vé.

**Authentication:** Required — JWT

**Headers:**

| Header | Bắt buộc | Mô tả |
|--------|---------|--------|
| `Authorization` | Có | `Bearer <access_token>` |
| `Idempotency-Key` | Có | UUID dạng chuỗi |

**Request Body:**

```json
{
  "concertId": "string",
  "items": [
    {
      "ticketTypeId": "string",
      "quantity": 1
    }
  ]
}
```

**Validation Rules:**

| Trường | Quy tắc |
|--------|---------|
| `concertId` | Required, phải tồn tại, phải ở trạng thái cho phép mua vé |
| `items` | Required, mảng không rỗng |
| `items[].ticketTypeId` | Required, phải thuộc concert, phải `ACTIVE`, phải còn vé |
| `items[].quantity` | Required, integer >= 1, không vượt `maxPerUser` của ticket type |

**Success Response — `201 Created`:**

```json
{
  "orderId": "ord_xyz789",
  "status": "PENDING_PAYMENT",
  "expiresAt": "2026-06-07T12:15:00Z",
  "paymentUrl": "https://mock-payment.example.com/pay?orderId=ord_xyz789",
  "totalAmountInVnd": 2500000,
  "items": [
    {
      "ticketTypeId": "tt_vip_001",
      "name": "VIP",
      "quantity": 2,
      "unitPrice": 1000000,
      "subtotal": 2000000
    }
  ]
}
```

**Error Responses:**

| Status | Trường hợp | Body |
|--------|-------------|------|
| `400` | Thiếu hoặc sai Idempotency-Key | `{ "message": "Missing Idempotency-Key header" }` |
| `400` | Validation thất bại | `{ "message": "...", "errors": [...] }` |
| `400` | `Idempotency-Key` dùng lại với request khác | `{ "message": "Idempotency key was already used with a different request" }` |
| `401` | Không có JWT hoặc JWT không hợp lệ | `{ "message": "Unauthorized" }` |
| `403` | Concert chưa mở bán / đã đóng bán / đã hủy | `{ "message": "Vé không còn được bán" }` |
| `404` | Concert hoặc TicketType không tồn tại | `{ "message": "Concert not found" }` |
| `409` | `Idempotency-Key` đang được xử lý | `{ "message": "Request is being processed" }` |
| `409` | Một `Idempotency-Key` đã hoàn thành | Trả kết quả order cũ |
| `422` | Hết vé (`OUT_OF_STOCK`) | `{ "message": "Vé đã hết", "ticketTypeId": "..." }` |
| `422` | Vượt giới hạn mua (`EXCEED_USER_LIMIT`) | `{ "message": "Vượt giới hạn mua vé", "maxPerUser": 4, "currentCount": 3 }` |
| `429` | Rate limit exceeded | `{ "message": "Too many requests" }` |
| `503` | Payment Gateway lỗi | `{ "message": "Cổng thanh toán đang tạm gián đoạn" }` |

---

### 4.2. `GET /orders/me`

**Mô tả:** Lấy danh sách order của người dùng hiện tại.

**Authentication:** Required — JWT (CUSTOMER)

**Query Parameters:**

| Tham số | Kiểu | Mô tả |
|---------|------|--------|
| `status` | `OrderStatus` | Lọc theo trạng thái |
| `page` | `number` | Số trang (mặc định: 1) |
| `limit` | `number` | Số item mỗi trang (mặc định: 10) |

**Response — `200 OK`:**

```json
{
  "data": [
    {
      "id": "ord_xyz789",
      "concertId": "concert_abc123",
      "status": "PENDING_PAYMENT",
      "totalAmountInVnd": 2500000,
      "expiresAt": "2026-06-07T12:15:00Z",
      "paidAt": null,
      "items": [
        { "ticketTypeId": "tt_vip_001", "name": "VIP", "quantity": 2, "unitPrice": 1000000 }
      ],
      "createdAt": "2026-06-07T12:00:00Z"
    }
  ],
  "total": 5,
  "page": 1,
  "limit": 10
}
```

---

### 4.3. `GET /orders/me/:orderId`

**Mô tả:** Lấy chi tiết một order.

**Authentication:** Required — JWT (CUSTOMER, owner only)

**Response — `200 OK`:**

```json
{
  "id": "ord_xyz789",
  "concertId": "concert_abc123",
  "status": "PAID",
  "totalAmountInVnd": 2500000,
  "expiresAt": "2026-06-07T12:15:00Z",
  "paidAt": "2026-06-07T12:05:00Z",
  "items": [
    {
      "ticketTypeId": "tt_vip_001",
      "name": "VIP",
      "quantity": 2,
      "unitPrice": 1000000,
      "subtotal": 2000000
    }
  ],
  "payment": {
    "provider": "MOCK",
    "status": "SUCCESS",
    "amount": 2500000,
    "paidAt": "2026-06-07T12:05:00Z"
  },
  "tickets": [
    { "id": "tkt_001", "status": "ISSUED" },
    { "id": "tkt_002", "status": "ISSUED" }
  ],
  "createdAt": "2026-06-07T12:00:00Z"
}
```

**Error — `403`:** Nếu `order.userId != currentUser.userId` và role không phải `ADMIN`.

---

### 4.4. `POST /orders/:orderId/cancel`

**Mô tả:** Hủy order đang ở trạng thái `PENDING_PAYMENT`.

**Authentication:** Required — JWT (CUSTOMER, owner only)

**Response — `200 OK`:**

```json
{
  "id": "ord_xyz789",
  "status": "CANCELLED",
  "inventoryReleasedAt": "2026-06-07T12:03:00Z",
  "releaseReason": "CANCELLED"
}
```

**Error — `400`:** Nếu order không ở trạng thái `PENDING_PAYMENT`.

**Error — `403`:** Nếu không phải chủ sở hữu.

---

## Mô tả chi tiết các kịch bản lỗi có thể xảy ra và cách xử lý

### 1. Không có Idempotency-Key

- Backend trả `400 Bad Request` với thông báo "Missing Idempotency-Key header".
- Không tạo order.

### 2. Idempotency-Key dùng lại với request body khác

- Backend tính `requestHash` (SHA-256 của normalized JSON body).
- So sánh với `requestHash` đã lưu.
- Nếu khác, trả `400 Bad Request` với "Idempotency key was already used with a different request".
- Không tạo order mới.

### 3. Idempotency-Key dùng lại với cùng request body

- Trả kết quả order đã tạo trước đó (orderId, paymentUrl, status).
- Không tạo order trùng.

### 4. Idempotency-Key đang được xử lý (concurrent request)

- Trả `409 Conflict` với "Request is being processed".
- Client nên chờ và retry sau.

### 5. Hết vé (OUT_OF_STOCK)

- Lua Script trả lỗi `OUT_OF_STOCK`.
- Backend trả `422 Unprocessable Entity`.
- Frontend hiển thị "Vé đã hết, vui lòng chọn loại vé khác".

### 6. Vượt giới hạn per-user (EXCEED_USER_LIMIT)

- Lua Script trả lỗi `EXCEED_USER_LIMIT`.
- Backend trả `422 Unprocessable Entity` kèm `maxPerUser` và `currentCount`.
- Frontend hiển thị "Bạn đã mua tối đa X vé cho loại vé này".

### 7. Hết thời gian giữ chỗ trước khi thanh toán

- BullMQ Delayed Job phát hiện `expiresAt < now()` và `status = PENDING_PAYMENT`.
- Chuyển order sang `EXPIRED`, hoàn lại tồn kho Redis, giảm `user-limit`.
- Gửi notification `OrderExpired` cho khách.
- User không thể thanh toán order đã expired.

### 8. Concert bị hủy sau khi đặt vé

- Nếu concert chuyển sang `CANCELLED`, các order `PENDING_PAYMENT` cần được expire ngay.
- Admin có thể trigger expire thủ công hoặc qua job.
- Khách được hoàn lại vé và thông báo.

### 9. Redis reserve thành công nhưng PostgreSQL insert thất bại

- Redis đã giữ vé (đã `DECRBY stock`, `INCRBY user-limit`, `SET reservation` với TTL).
- PostgreSQL `order.create` thất bại (ví dụ: unique constraint violation, database timeout, connection lost).
- Backend gọi `releaseReservation` cho **tất cả** ticket types trong order để hoàn lại `stock` và giảm `user-limit`.
- Backend log lỗi PostgreSQL kèm `orderId` để trace.
- Backend trả **400 Bad Request** cho khách: `"Failed to create order. Please try again."`.
- Không có orphan reservation trong Redis sau khi rollback hoàn tất.
- Nếu rollback cũng thất bại, log lỗi rollback riêng nhưng vẫn trả 400 cho khách.

**Luồng chi tiết:**

```
1. Redis Lua Script reserveTicket() → {ok: true} cho tất cả ticket types
2. PostgreSQL prisma.order.create() → THROWS (ví dụ: DB timeout)
3. catch block:
   a. log.error("Failed to persist order {orderId} to DB — rolling back Redis reservations", err)
   b. await releaseReservation() cho ticket_1
   c. await releaseReservation() cho ticket_2
   d. (tùy trường hợp) log.error nếu rollback lỗi
   e. throw BadRequestException("Failed to create order. Please try again.")
4. HTTP 400 → client hiển thị thông báo yêu cầu thử lại
```

### 10. Redis reserve thất bại giữa chừng (multi-item order)

- Khi order chứa nhiều ticket types, reserve chạy song song (`Promise.all`).
- Ticket type thứ 2/thứ 3 có thể thất bại (hết vé, vượt giới hạn) trong khi ticket type thứ 1 đã reserve thành công.
- Backend phát hiện reservation thất bại qua `failedIndex`, rollback **tất cả** reservation đã thành công trước đó (duyệt ngược từ `failedIndex - 1`).
- Backend trả **422 Unprocessable Entity** kèm lỗi cụ thể (`OUT_OF_STOCK` hoặc `EXCEED_USER_LIMIT`).
- Không có orphan reservation trong Redis.

**Luồng chi tiết:**

```
1. Redis reserveTicket() cho ticket_1 → {ok: true}  ✓
2. Redis reserveTicket() cho ticket_2 → {err: "OUT_OF_STOCK"}  ✗
3. Backend phát hiện failedIndex = 1
4. Backend log.warn("Reservation failed for ticket_2: OUT_OF_STOCK — rolling back 1 successful reservation")
5. Backend releaseReservation() cho ticket_1 → {ok: true}
6. Backend trả 422: "Vé đã hết"
```

---

### 11. Thanh toán thành công muộn (sau khi order expired)

- Webhook đến sau khi order đã `EXPIRED`.
- Backend ghi nhận trạng thái bất thường.
- Không phát hành vé tự động.
- Cần xử lý thủ công bởi Admin.

---

## Các ràng buộc

### Ràng buộc tính nhất quán

- Lua Script đảm bảo `stock` và `user-limit` được cập nhật nguyên tử, không có race condition.
- `Order PENDING` là reservation record duy nhất trong PostgreSQL.
- `expiresAt` trong PostgreSQL và TTL trong Redis phải khớp nhau.
- Khi order chuyển `PAID`, `user-limit` phải giảm (chuyển từ `reservedQty` sang `paidQty` trong counter).
- Khi order `EXPIRED` hoặc `CANCELLED`, cả `stock` và `user-limit` phải được hoàn lại.

### Ràng buộc bảo mật

- Chỉ `CUSTOMER`, `ORGANIZER` hoặc `ADMIN` mới được tạo order.
- Mỗi user chỉ xem được order của chính mình (trừ ADMIN).
- `Idempotency-Key` được gắn với `userId`, không dùng chung giữa các user.
- Reservation không thể chuyển nhượng giữa các user.

### Ràng buộc hiệu năng

- Kiểm tra tồn kho và giữ vé phải chạy nguyên tử trong Redis Lua Script, không qua nhiều lệnh Redis riêng lẻ.
- Lua Script phải có timeout (recommend 5 giây) để tránh block Redis.
- Idempotency check phải đọc Redis trước khi gọi Lua Script để tránh tạo reservation rồi mới phát hiện duplicate.
- Order creation trong PostgreSQL phải dùng transaction để đảm bảo atomicity.

### Ràng buộc về thời gian giữ chỗ

- `RESERVATION_TTL` mặc định: **15 phút** (cấu hình qua `ORDER_RESERVATION_TTL_MINUTES`).
- Thời gian giữ chỗ phải đủ dài để user hoàn tất thanh toán, nhưng không quá dài để ảnh hưởng tồn kho.
- Nên thông báo countdown cho user biết thời gian còn lại.

---

## Đồng bộ tồn kho

Chi tiết: [ticket-type-inventory.md](./ticket-type-inventory.md#5-đồng-bộ-tồn-kho)

Tóm tắt tại các thời điểm giao dịch:

| Thời điểm | Redis `stock` | Redis `user-limit` | PostgreSQL `TicketType.reservedQty` | PostgreSQL `TicketType.soldQty` |
|-----------|--------------|-------------------|-------------------------------------|--------------------------------|
| Tạo order (PENDING) | DECR | INCR | `+= quantity` | — |
| Thanh toán thành công (PAID) | DECR thêm 1 lần | Giữ nguyên (reserved → paid) | `-= quantity` | `+= quantity` |
| Order expired | INCR | DECR | `-= quantity` | — |
| Order cancelled | INCR | DECR | `-= quantity` | — |
| Order refunded | INCR | DECR | — | `-= quantity` |

---

## Các tiêu chí đánh giá     

### 1. Tạo order thành công

- User gửi request hợp lệ → hệ thống tạo `Order` trạng thái `PENDING_PAYMENT`.
- Redis Lua Script giữ vé thành công → `stock` giảm, `user-limit` tăng.
- `PaymentTransaction` được tạo ở trạng thái `INITIATED`.
- API trả về `orderId` và `paymentUrl`.
- `expiresAt` được set đúng (15 phút mặc định).

### 2. Chống double-click bằng Idempotency Key

- User bấm "Mua vé" 2 lần nhanh → chỉ 1 order được tạo.
- Request thứ hai nhận lại kết quả order đầu tiên.
- Không có orphan reservation trong Redis.

### 3. Hết vé không tạo order

- Khi `stock = 0`, Lua Script trả lỗi `OUT_OF_STOCK`.
- Backend trả `422` mà không tạo order.
- Không có bản ghi `Order` được tạo.

### 4. Vượt giới hạn per-user không tạo order

- Khi user đã giữ `maxPerUser` vé, request tiếp theo trả lỗi `EXCEED_USER_LIMIT`.
- Backend trả `422` kèm `maxPerUser` và `currentCount`.
- Không tạo order, không thay đổi Redis.

### 5. Order expired được hoàn vé

- Khi order `PENDING_PAYMENT` hết hạn, job expire order.
- `Order.status = EXPIRED`, `releaseReason = 'PAYMENT_TIMEOUT'`.
- Redis `stock` được tăng lại, `user-limit` được giảm.
- `UserTicketCounter.reservedQty` được cập nhật.
- Khách nhận notification `OrderExpired`.

### 6. Order cancelled được hoàn vé

- User hủy order → trạng thái `CANCELLED`.
- Tồn kho được hoàn lại tương tự expire.
- Không có vé bị "mất" khi user chủ động hủy.

### 7. Reservation với thời gian chính xác

- `Order.expiresAt` trong PostgreSQL và TTL của `reservation:{orderId}` trong Redis bằng nhau.
- Job expire chỉ xử lý order có `expiresAt < now()`.

### 8. Không oversell khi nhiều user mua đồng thời

- Lua Script đảm bảo atomic check-and-decrement.
- 100 request đồng thời cho 50 vé → chính xác 50 order được tạo, 50 order bị từ chối.
- Không có trường hợp `soldQty > totalQty`.

### 9. Concert chưa mở bán không cho mua

- Request mua vé cho concert chưa đến `saleStartsAt` → trả `403`.
- Request mua vé cho concert đã qua `saleEndsAt` → trả `403`.
- Request mua vé cho concert `CANCELLED` → trả `403`.

### 10. Unauthorized không tạo order

- Request không có JWT → `401 Unauthorized`.
- JWT không hợp lệ → `401 Unauthorized`.
- JWT hết hạn → `401 Unauthorized`.
- Không có order nào được tạo.

### 11. Redis reserve OK nhưng PostgreSQL lỗi → rollback và trả 400

- Khi PostgreSQL `order.create` thất bại, Backend gọi `releaseReservation` cho tất cả ticket types.
- Redis `stock` và `user-limit` được khôi phuc.
- Lỗi PostgreSQL được log kèm `orderId` để trace.
- Backend trả **400** cho khách.
- Không có orphan reservation trong Redis.

### 12. Redis reserve thất bại giữa chừng → rollback reservation đã thành công

- Khi multi-item order có ticket type reserve thất bại, Backend rollback các reservation đã thành công trước đó.
- Redis `stock` được hoàn lại đúng số lượng đã giữ.
- Backend trả **422** kèm lỗi cụ thể.
- Không có orphan reservation trong Redis.
