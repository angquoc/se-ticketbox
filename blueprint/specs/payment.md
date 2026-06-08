# Đặc tả: Thanh toán và chống trừ tiền hai lần

## Mô tả

Tính năng thanh toán cho phép khán giả thanh toán đơn mua vé sau khi hệ thống giữ vé thành công. Trong phạm vi đồ án, TicketBox sử dụng Mock Payment Gateway để mô phỏng cổng thanh toán VNPAY/MoMo. Tuy nhiên, thiết kế vẫn bám theo luồng tích hợp cổng thanh toán thật, bao gồm payment URL, webhook, verify chữ ký, transaction code, idempotency key, circuit breaker và cronjob xác minh trạng thái giao dịch.

Tính năng này chịu trách nhiệm:

* Tạo giao dịch thanh toán cho đơn hàng đang ở trạng thái `PENDING_PAYMENT`.
* Trả về payment URL để người dùng chuyển sang màn hình thanh toán.
* Nhận webhook từ cổng thanh toán để cập nhật kết quả giao dịch.
* Đảm bảo một thao tác thanh toán chỉ được xử lý đúng một lần bằng Idempotency Key.
* Chống tạo nhiều đơn hàng hoặc nhiều giao dịch thanh toán do người dùng double-click, refresh trang, retry request hoặc mạng chập chờn.
* Bảo vệ hệ thống khi cổng thanh toán lỗi hoặc timeout liên tục bằng Circuit Breaker.
* Cho phép các chức năng không liên quan đến thanh toán như xem concert, xem vé còn lại, admin và check-in vẫn hoạt động khi payment gateway gặp sự cố.

---

## Luồng chính

### 1. Tạo yêu cầu thanh toán

1. Khán giả chọn loại vé và số lượng vé trên Customer Web App.
2. Frontend sinh một `Idempotency-Key` dạng UUID và gửi kèm trong header request.
3. Customer Web App gọi API tạo order/thanh toán:

```http
POST /orders
Idempotency-Key: <uuid>
Authorization: Bearer <access_token>
```

4. Backend API kiểm tra JWT để xác định người dùng.
5. Backend kiểm tra `Idempotency-Key`.
6. Nếu key chưa tồn tại, Backend lưu key vào Redis với trạng thái `PROCESSING`.

Ví dụ Redis key:

```txt
idem:{userId}:{idempotencyKey}
```

7. Backend kiểm tra tồn kho vé và giới hạn mua vé của user bằng Redis Lua Script.
8. Nếu hợp lệ, hệ thống giữ vé tạm thời bằng Redis TTL.
9. Backend tạo `Order` trong PostgreSQL với trạng thái `PENDING_PAYMENT`.
10. Backend tạo `PaymentTransaction` với trạng thái `INITIATED`.
11. Backend gọi Mock Payment Gateway để tạo payment URL.
12. Nếu tạo payment URL thành công, Backend cập nhật kết quả xử lý vào Redis idempotency key.
13. Backend trả payment URL về cho frontend.
14. Frontend điều hướng người dùng sang trang thanh toán.

### 2. Người dùng thanh toán

1. Người dùng thực hiện thanh toán trên Mock Payment Gateway.
2. Gateway xử lý giao dịch và sinh kết quả thành công hoặc thất bại.
3. Gateway gửi webhook về Backend API.

Ví dụ endpoint:

```http
POST /payment/webhook
```

4. Backend verify chữ ký hoặc secret của webhook.
5. Backend tìm `PaymentTransaction` tương ứng bằng `providerTransactionId` hoặc `orderId`.
6. Nếu webhook hợp lệ và payment thành công:

   * Cập nhật `PaymentTransaction.status = SUCCESS`.
   * Cập nhật `Order.status = PAID`.
   * Cập nhật `Order.paidAt`.
   * Phát hành ticket QR cho các vé trong order.
   * Cập nhật số vé đã bán.
   * Đẩy job gửi email/e-ticket vào BullMQ.
7. Backend trả response thành công cho Gateway.

### 3. Xử lý webhook trùng lặp

1. Payment Gateway có thể gửi lại webhook nhiều lần.
2. Backend kiểm tra trạng thái hiện tại của order.
3. Nếu order đã ở trạng thái `PAID`, Backend không xử lý lại.
4. Backend trả response thành công để Gateway không tiếp tục retry.
5. Unique constraint trên `PaymentTransaction.providerTransactionId` đảm bảo một mã giao dịch từ gateway chỉ được ghi nhận một lần.

### 4. Cronjob xác minh giao dịch

1. Một số trường hợp Gateway không gửi webhook hoặc webhook bị mất.
2. Cronjob định kỳ quét các order `PENDING_PAYMENT` đã tồn tại quá lâu.
3. Backend gọi Mock Payment Gateway để kiểm tra trạng thái giao dịch.
4. Nếu gateway xác nhận đã thanh toán:

   * Cập nhật order sang `PAID`.
   * Phát hành ticket.
   * Gửi email/e-ticket.
5. Nếu order hết thời gian giữ chỗ mà chưa thanh toán:

   * Chuyển order sang `EXPIRED`.
   * Hoàn lại vé đã giữ.
   * Cập nhật lại counter per-user.

## Kịch bản lỗi

### 1. Người dùng double-click nút thanh toán

Nếu người dùng bấm nút mua vé nhiều lần liên tiếp với cùng `Idempotency-Key`, Backend không tạo thêm order mới.

Cách xử lý:

* Request đầu tiên được xử lý bình thường.
* Các request sau dùng cùng key sẽ nhận lại kết quả đã lưu.
* Nếu request đầu tiên vẫn đang xử lý, Backend trả trạng thái `PROCESSING` hoặc thông báo người dùng chờ kết quả.

### 2. Frontend retry do mạng chập chờn

Nếu mạng bị ngắt sau khi Backend đã tạo order nhưng frontend chưa nhận được response, frontend có thể gửi lại request với cùng `Idempotency-Key`.

Cách xử lý:

* Backend kiểm tra Redis hoặc PostgreSQL.
* Nếu key đã hoàn thành, Backend trả lại orderId và paymentUrl cũ.
* Backend không tạo order mới.
* Backend không gọi Gateway thêm lần nữa nếu giao dịch đã được tạo.

### 3. Thiếu Idempotency Key

Nếu request tạo order/thanh toán không có `Idempotency-Key`, Backend từ chối xử lý.

Response gợi ý:

```http
400 Bad Request
```

Thông báo:

```txt
Missing Idempotency-Key header.
```

### 4. Idempotency Key trùng nhưng request body khác

Nếu cùng một user gửi lại cùng `Idempotency-Key` nhưng nội dung request khác với request ban đầu, Backend từ chối xử lý.

Cách xử lý:

* Backend so sánh `requestHash`.
* Nếu hash khác nhau, trả lỗi.
* Không tạo order mới.

Response gợi ý:

```http
409 Conflict
```

Thông báo:

```txt
Idempotency key was already used with a different request.
```

### 5. Payment Gateway timeout khi tạo payment URL

Nếu Backend gọi Mock Payment Gateway nhưng bị timeout:

* Circuit Breaker ghi nhận một lần lỗi.
* PaymentTransaction có thể được đánh dấu `TIMEOUT`.
* Order vẫn ở trạng thái `PENDING_PAYMENT` trong thời gian giữ chỗ.
* Frontend hiển thị thông báo yêu cầu người dùng thử lại hoặc chờ xác minh.

Nếu timeout xảy ra nhiều lần liên tiếp, Circuit Breaker chuyển sang trạng thái `OPEN`.

### 6. Payment Gateway lỗi kéo dài

Khi Gateway lỗi vượt ngưỡng cấu hình, Circuit Breaker chuyển sang `OPEN`.

Khi đó:

* Backend tạm thời không gọi Gateway.
* API tạo payment URL trả lỗi có kiểm soát.
* Người dùng vẫn xem được danh sách concert.
* Người dùng vẫn xem được chi tiết concert.
* Admin vẫn quản lý concert.
* Check-in vẫn hoạt động.
* Chỉ luồng thanh toán bị tạm dừng.

Thông báo gợi ý:

```txt
Cổng thanh toán đang tạm gián đoạn, vui lòng thử lại sau.
```

### 7. Webhook không hợp lệ

Nếu webhook thiếu chữ ký, sai chữ ký hoặc dữ liệu không hợp lệ:

* Backend không cập nhật order.
* Backend ghi log lỗi.
* Backend trả lỗi hoặc bỏ qua tùy cấu hình.
* PaymentTransaction không được chuyển sang `SUCCESS`.

### 8. Webhook gửi trùng

Nếu Gateway gửi lại webhook cho giao dịch đã xử lý:

* Backend kiểm tra order đã `PAID`.
* Backend không phát hành thêm ticket.
* Backend không gửi lại email nhiều lần nếu không cần thiết.
* Backend trả response thành công cho Gateway.

### 9. Thanh toán thất bại

Nếu Gateway trả kết quả thanh toán thất bại:

* `PaymentTransaction.status = FAILED`.
* `Order.status = PAYMENT_FAILED`.
* Vé đã giữ được hoàn lại.
* Counter per-user được giảm lại.
* Người dùng có thể tạo đơn mới nếu vẫn còn vé và chưa vượt giới hạn.

### 10. Order hết hạn nhưng webhook thành công đến muộn

Nếu order đã `EXPIRED` nhưng sau đó Gateway gửi webhook thành công:

* Backend không tự động phát hành vé ngay.
* Backend ghi nhận trạng thái bất thường.
* Backend đánh dấu cần xử lý thủ công hoặc chuyển sang trạng thái cần hoàn tiền.
* Không được để hệ thống phát hành vé vượt quá tồn kho.

---

## Mock Payment Callback (`POST /payment/mock-callback`)

### Mục đích

Endpoint `POST /payment/mock-callback` mô phỏng webhook/callback từ cổng thanh toán. Endpoint này tách biệt hoàn toàn khỏi `OrdersController` và xử lý tất cả logic liên quan đến thanh toán trong `PaymentModule`.

### Request

```http
POST /payment/mock-callback
Content-Type: application/json

{
  "orderId": "ord_xyz789",
  "providerTransactionId": "MOCK_ord_xyz789_1719123456",
  "result": "SUCCESS",
  "amount": 2500000,
  "signature": "..."
}
```

### Validation

| Trường | Quy tắc |
|--------|---------|
| `orderId` | Required, phải tồn tại trong PostgreSQL |
| `providerTransactionId` | Required, dùng để idempotency (cặp `provider + providerTransactionId` là unique) |
| `result` | Required, enum `SUCCESS`, `FAILED`, `TIMEOUT` |
| `amount` | Required, phải khớp với `Order.totalAmountInVnd` |
| `signature` | Required, HMAC-SHA256 signature để verify webhook |

### Luồng xử lý

```
1. Nhận request
   ↓
2. Kiểm tra cặp provider + providerTransactionId đã tồn tại trong PaymentTransaction chưa?
   ├─ Đã tồn tại → return idempotent success (đã xử lý trước đó)
   └─ Chưa tồn tại → tiếp tục
   ↓
3. Tìm order theo orderId
   └─ Không tìm thấy → 404 Not Found
   ↓
4. Kiểm tra amountInVnd khớp với Order.totalAmountInVnd?
   └─ Không khớp → 400 Bad Request
   ↓
5. Kiểm tra Order.status
   ├─ PAID → return idempotent success
   ├─ EXPIRED → ghi nhận late webhook, return requiresManualAction (KHÔNG phát hành vé)
   ├─ CANCELLED / REFUNDED / PAYMENT_FAILED → return skip (bỏ qua)
   └─ PENDING_PAYMENT → tiếp tục xử lý
   ↓
6. Xử lý theo callback status
   ├─ FAILED → applyPaymentFailed: hoàn tồn kho, giải phóng Redis
   ├─ TIMEOUT → ghi nhận PaymentTransaction TIMEOUT, order giữ PENDING_PAYMENT
   └─ SUCCESS → applyPaymentSuccess: 7 bước + queue notification
```

### Response mẫu

**Thành công (idempotent — đã xử lý trước đó):**

```json
{
  "success": true,
  "message": "Callback đã được xử lý trước đó (idempotent)",
  "orderId": "ord_xyz789",
  "orderStatus": "PAID",
  "alreadyProcessed": true
}
```

**Thành công lần đầu:**

```json
{
  "success": true,
  "message": "Thanh toán thành công, vé đã được phát hành",
  "orderId": "ord_xyz789",
  "orderStatus": "PAID",
  "alreadyProcessed": false
}
```

**Late webhook (order đã EXPIRED):**

```json
{
  "success": false,
  "message": "Callback đến sau khi đơn hàng đã hết hạn. Không phát hành vé, cần xử lý hoàn tiền thủ công.",
  "orderId": "ord_xyz789",
  "orderStatus": "EXPIRED",
  "alreadyProcessed": false,
  "requiresManualAction": true
}
```

---

## Cơ chế Idempotent cho Payment Callback

### Hai lớp bảo vệ

**Lớp 1 — Unique Constraint trong PostgreSQL**

Bảng `PaymentTransaction` có unique constraint trên cặp `(provider, providerTransactionId)`:

```prisma
@@unique([provider, providerTransactionId])
```

Nhờ constraint này, dù request nào gửi cùng `provider + transactionCode` lần 2, PostgreSQL sẽ reject việc insert trùng. Tuy nhiên, implementation dùng `findUnique` trước để trả response idempotent thay vì để transaction bị lỗi.

**Lớp 2 — Kiểm tra Order Status**

Ngay cả khi unique constraint bị bypass (ví dụ: hai request đến gần như đồng thời), kiểm tra `order.status === PAID` đảm bảo không tạo vé lần 2.

### Hành vi cụ thể

| Trường hợp | Hành vi |
|------------|---------|
| Cùng `provider + providerTransactionId` gửi 2 lần | Lần 2 nhận idempotent success, không tạo thêm vé |
| Order đã `PAID`, callback gửi lại | Nhận idempotent success |
| Order `EXPIRED`, late callback SUCCESS đến | Ghi nhận, không phát hành vé, `requiresManualAction: true` |
| Order `EXPIRED`, late callback FAILED đến | Ghi nhận, không thay đổi order |

### Khi nào cần xử lý thủ công

*Order đã `EXPIRED` nhưng nhận được callback SUCCESS:*

* Hệ thống ghi nhận sự kiện vào `PaymentTransaction` với `status = SUCCESS`.
* Order giữ nguyên `EXPIRED`.
* Admin cần xác minh và quyết định: hoàn tiền cho khách hoặc phát hành vé thủ công nếu khách vẫn muốn.

---

## Áp dụng thanh toán thành công (`applyPaymentSuccess`)

Method `applyPaymentSuccess` xử lý 7 bước trong một PostgreSQL transaction duy nhất, đảm bảo tính nguyên tử:

### Bước A — Tạo PaymentTransaction

```typescript
await tx.paymentTransaction.create({
  data: {
    orderId,
    provider,
    providerTransactionId: transactionCode,
    status: PaymentStatus.SUCCESS,
    amount,
    receivedAt: new Date(),
  },
});
```

### Bước B — Cập nhật Order → PAID

```typescript
await tx.order.update({
  where: { id: orderId },
  data: { status: OrderStatus.PAID, paidAt: new Date() },
});
```

### Bước C — Giảm TicketType.reservedQty

```typescript
await tx.ticketType.update({
  where: { id: ticketTypeId },
  data: { reservedQty: { decrement: quantity } },
});
```

### Bước D — Tăng TicketType.soldQty

```typescript
await tx.ticketType.update({
  where: { id: ticketTypeId },
  data: { soldQty: { increment: quantity } },
});
```

### Bước E — Giảm UserTicketCounter.reservedQty

```typescript
await tx.userTicketCounter.upsert({
  where: { userId_ticketTypeId: { userId, ticketTypeId } },
  update: { reservedQty: { decrement: quantity } },
});
```

### Bước F — Tăng UserTicketCounter.paidQty

```typescript
await tx.userTicketCounter.upsert({
  where: { userId_ticketTypeId: { userId, ticketTypeId } },
  update: { paidQty: { increment: quantity } },
});
```

### Bước G — Phát hành QR Tickets

Với mỗi `OrderItem.quantity = N`, tạo N bản ghi `Ticket`:

```typescript
for (let i = 0; i < quantity; i++) {
  await tx.ticket.create({
    data: {
      orderId,
      orderItemId,
      concertId,
      ticketTypeId,
      userId,
      qrTokenHash: crypto.randomUUID(), // SHA-256 của UUID ngẫu nhiên
      status: TicketStatus.ISSUED,
    },
  });
}
```

### Bước H — Dọn dẹp Redis (ngoài transaction)

Sau transaction PostgreSQL thành công, dọn dẹp Redis:

```typescript
await redis.del(`reservation:${orderId}`);
for (const item of order.items) {
  await redis.decrementUserLimit({ ticketTypeId, userId, quantity });
}
```

### Bước I — Queue Notification (ngoài transaction)

Đẩy job gửi email vào BullMQ:

```typescript
await notificationQueue.add(
  'send-order-paid-email',
  { orderId, userId },
  { attempts: 3, backoff: { type: 'exponential', delay: 3000 } },
);
```

---

## Thành phần module

### PaymentModule (`modules/payment/`)

Module thanh toán, xử lý tạo payment URL, callback webhook, và trạng thái thanh toán.

#### Files

| File | Mô tả |
|------|--------|
| `payment.module.ts` | NestJS module |
| `payment.controller.ts` | REST controller, expose `POST /payment/mock-callback` |
| `payment.service.ts` | Business logic: `handlePaymentCallback`, `applyPaymentSuccess`, `applyPaymentFailed` |
| `dto/payment-callback.dto.ts` | DTO cho callback request |
| `dto/index.ts` | Export barrel |

#### Dependencies

* `PrismaModule` — truy cập PostgreSQL
* `QueueModule` — đẩy notification job vào BullMQ
* `RedisModule` — dọn dẹp Redis reservation và user-limit

---

## Error Responses

| Status | Trường hợp | Body |
|--------|-------------|------|
| `400` | Số tiền không khớp | `{ "message": "Số tiền không khớp: expected=..., got=..." }` |
| `404` | Order không tồn tại | `{ "message": "Không tìm thấy đơn hàng: ..." }` |
| `400` | DTO validation fail | `{ "message": "...", "errors": [...] }` |

---

## Ràng buộc

### 1. Ràng buộc tính nhất quán

* Một order chỉ được chuyển sang `PAID` một lần.
* Một payment transaction từ gateway chỉ được ghi nhận một lần.
* Một webhook trùng không được phát hành thêm ticket.
* Nếu thanh toán thất bại hoặc hết hạn, vé đã giữ phải được hoàn lại.
* PostgreSQL là nguồn dữ liệu chính cho order, payment và ticket.
* Redis chỉ hỗ trợ tốc độ cao cho idempotency, reservation TTL và cache.

### 2. Ràng buộc chống trừ tiền hai lần

* Mọi request tạo order/payment bắt buộc phải có `Idempotency-Key`.
* Mỗi `Idempotency-Key` chỉ được dùng cho một request body duy nhất.
* Backend phải lưu `requestHash` để phát hiện việc tái sử dụng key sai mục đích.
* TTL của idempotency key tối thiểu bằng thời gian giữ chỗ order.
* Đề xuất TTL: 15 phút.

### 3. Ràng buộc bảo mật

* Webhook phải được verify bằng chữ ký hoặc secret.
* Người dùng chỉ được thanh toán order của chính mình.
* Customer không được cập nhật trực tiếp trạng thái payment/order.
* Chỉ Backend mới được xử lý webhook và cập nhật order sang `PAID`.
* Không lưu thông tin nhạy cảm của thẻ ngân hàng trong hệ thống.
* Payment URL phải có thời hạn sử dụng.

### 4. Ràng buộc hiệu năng

* Kiểm tra idempotency phải thực hiện nhanh bằng Redis.
* Circuit Breaker phải ngăn Backend gọi Gateway khi Gateway đang lỗi kéo dài.
* Luồng tạo order không được chờ xử lý email/e-ticket.
* Gửi email, phát hành thông báo và các tác vụ phụ phải chạy qua BullMQ Worker.
* Webhook phải xử lý nhanh và không bị block bởi tác vụ gửi email.

### 5. Ràng buộc khả dụng

* Khi payment gateway lỗi, hệ thống không được sập toàn bộ.
* Các chức năng không phụ thuộc thanh toán vẫn phải hoạt động.
* Order `PENDING_PAYMENT` phải được expire bằng BullMQ Delayed Job hoặc Cronjob dự phòng.
* Nếu Worker tạm dừng, order vẫn còn trong PostgreSQL và có thể được xử lý lại khi Worker chạy lại.

---

## Tiêu chí chấp nhận

### 1. Tạo payment thành công

* Khi user mua vé hợp lệ, hệ thống tạo order ở trạng thái `PENDING_PAYMENT`.
* Hệ thống tạo payment transaction ở trạng thái `INITIATED`.
* API trả về payment URL.
* Redis lưu idempotency key với kết quả tương ứng.
* Vé được giữ tạm thời trong thời gian cấu hình.

### 2. Thanh toán thành công

* Khi Mock Payment Gateway gửi webhook thành công, order chuyển sang `PAID`.
* Payment transaction chuyển sang `SUCCESS`.
* Hệ thống phát hành đúng số lượng ticket QR.
* Ticket gắn đúng user, concert, order và ticket type.
* Job gửi email/e-ticket được đẩy vào BullMQ.

### 3. Không tạo trùng order khi double-click

* Khi frontend gửi nhiều request cùng `Idempotency-Key`, hệ thống chỉ tạo một order.
* Các request lặp lại trả về cùng orderId/paymentUrl.
* Không có thêm payment transaction bị tạo dư.

### 4. Không xử lý trùng webhook

* Khi Gateway gửi cùng webhook nhiều lần, hệ thống chỉ cập nhật order một lần.
* Hệ thống không phát hành thêm ticket.
* Hệ thống không làm tăng `soldQty` nhiều lần.
* Hệ thống trả response thành công cho webhook trùng.

### 5. Request thiếu Idempotency Key bị từ chối

* API tạo order/payment trả lỗi nếu thiếu `Idempotency-Key`.
* Không có order nào được tạo.
* Không có payment transaction nào được tạo.

### 6. Request dùng lại Idempotency Key với body khác bị từ chối

* Backend phát hiện `requestHash` khác với request ban đầu.
* API trả lỗi `409 Conflict`.
* Không tạo thêm order.
* Không gọi Payment Gateway.

### 7. Gateway timeout không làm sập hệ thống

* Khi Mock Payment Gateway timeout, Backend trả lỗi có kiểm soát.
* Circuit Breaker ghi nhận lỗi.
* Các API xem concert, xem chi tiết concert, admin và check-in vẫn hoạt động.

### 8. Circuit Breaker hoạt động đúng

* Khi số lỗi gateway vượt ngưỡng, Circuit Breaker chuyển sang `OPEN`.
* Khi `OPEN`, Backend không gọi Gateway.
* Sau thời gian chờ, Circuit Breaker chuyển sang `HALF_OPEN`.
* Nếu request thử nghiệm thành công, Circuit Breaker chuyển về `CLOSED`.
* Nếu request thử nghiệm tiếp tục thất bại, Circuit Breaker quay lại `OPEN`.

### 9. Order hết hạn được hoàn vé

* Nếu order không được thanh toán trước `expiresAt`, hệ thống chuyển order sang `EXPIRED`.
* Vé đã giữ được hoàn lại vào tồn kho.
* Counter per-user được cập nhật lại.
* User có thể mua lại nếu vẫn còn vé và chưa vượt giới hạn.

### 10. Cronjob verify xử lý được webhook bị mất

* Nếu webhook không đến nhưng Gateway xác nhận giao dịch thành công, Cronjob cập nhật order sang `PAID`.
* Nếu Gateway xác nhận giao dịch thất bại hoặc hết hạn, order được chuyển sang trạng thái phù hợp.
* Không phát hành vé khi giao dịch chưa được xác nhận thành công.

### 11. Payment callback idempotent — cùng provider + transactionCode gửi nhiều lần

* Callback cùng `provider + providerTransactionId` được gửi 2 lần → lần 2 trả `alreadyProcessed: true`, không tạo thêm vé, không tăng `soldQty`.
* Counter `UserTicketCounter.paidQty` và `TicketType.soldQty` không bị tăng thêm.
* Redis không bị thay đổi lần 2.
* Response trả về `success: true` để gateway không retry vô tận.

### 12. Late callback — order EXPIRED nhưng webhook SUCCESS đến muộn

* Order đã `EXPIRED`, callback `SUCCESS` đến → không phát hành vé, không tạo ticket.
* Response trả về `requiresManualAction: true`, `orderStatus: EXPIRED`.
* `PaymentTransaction` được ghi nhận với `status = SUCCESS` để audit.
* Admin cần xử lý hoàn tiền thủ công.

### 13. Áp dụng thanh toán thành công tạo đúng số lượng vé

* Khi callback `SUCCESS` cho order có 2 OrderItem (VIP × 2, Standard × 1) → tạo đúng 3 bản ghi `Ticket`.
* `TicketType.soldQty` tăng đúng số lượng.
* `TicketType.reservedQty` giảm đúng số lượng.
* `UserTicketCounter.paidQty` tăng, `reservedQty` giảm.
* Notification job được đẩy vào queue.
