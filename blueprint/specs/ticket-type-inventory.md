# Đặc tả: Ticket Type Inventory

## Mô tả

- Ticket Type Inventory chịu trách nhiệm quản lý các loại vé thuộc một concert (tạo, cập nhật, xóa loại vé, và kiểm tra tồn kho của loại vé). 
- Đây là ***module trung gian*** giữa Concert và Order: Organizer tạo cấu hình vé cho concert, customer xem và chọn mua vé, staff xem thông tin vé để hỗ trợ check-in, admin quản lý toàn bộ, và hệ thống đồng bộ tồn kho (`soldQty`, `reservedQty`) qua mỗi giai đoạn của giao dịch (khi order được tạo, thanh toán, hủy, hoàn tiền).
- Mỗi concert có thể có nhiều loại vé (VIP, Standard, Early Bird...). Mỗi loại vé có tồn kho riêng, giới hạn mua per-user, và sell-window riêng biệt.

## 1. Mô hình dữ liệu

### `TicketType`

Được mô tả cụ thể trong bảng `TicketType` (xem chi tiết mô tả ở: [database-schema.md](./database-schema.md#tickettype))

| Trường | Kiểu | Ý nghĩa |
|--------|------|---------|
| `id` | `string` | ID unique |
| `concertId` | `string` | FK → `Concert.id` |
| `name` | `string` | Tên loại vé, duy nhất trong concert (`@@unique([concertId, name])`) |
| `price` | `number` | Giá vé (VND, số nguyên) |
| `totalQty` | `number` | Tổng số vé ban đầu |
| `soldQty` | `number` | Số vé đã thanh toán thành công |
| `reservedQty` | `number` | Số vé đang giữ bởi order PENDING |
| `availableQty` | `number` | Tính toán: `totalQty - soldQty - reservedQty` |
| `maxPerUser` | `number` | Giới hạn số vé một user được mua loại này |
| `saleStartsAt` | `Date` | Thời điểm bắt đầu bán |
| `saleEndsAt` | `Date?` | Thời điểm kết thúc bán (nullable) |
| `status` | `enum` | `ACTIVE`, `INACTIVE`, `SOLD_OUT` |
| `createdAt` | `Date` | |
| `updatedAt` | `Date` | |

**Index quan trọng:**

- `@@unique([concertId, name])` đảm bảo không trùng tên vé trong cùng concert.
- `@@index([concertId, status])` hỗ trợ truy vấn vé đang `ACTIVE` nhanh khi customer xem trang mua vé.

---

## 2. Redis Keys

Redis đóng vai trò là lớp lưu trữ thông tin tồn kho tạm thời (hot path), được đồng bộ với PostgreSQL tại các thời điểm giao dịch (khi order được tạo, thanh toán, hủy, hoàn tiền). Redis có 4 keys quan trọng:

| Key | Kiểu | TTL | Ý nghĩa |
|-----|------|-----|---------|
| `stock:{ticketTypeId}` | String (integer) | Không có TTL | Số vé còn lại trong hot path. Khởi tạo = `availableQty`. Tăng/giảm nguyên tử khi reserve/pay/cancel/refund. |
| `user-limit:{userId}:{ticketTypeId}` | String (integer) | Không có TTL | Tổng số vé user đã mua (đã thanh toán) + đang giữ (PENDING) của loại vé này. Dùng để kiểm tra `maxPerUser`. |
| `reservation:{orderId}` | Hash | `expiresAt - now()` | Lưu thông tin reservation tạm thời: `{ ticketTypeId: quantity, ... }`. Tự động bị xóa khi TTL hết hạn. |
| `idempotency:{userId}:{key}` | String | 15 phút | Idempotency key cho request tạo/sửa/xóa ticket type. |

---

## 3. Luồng nghiệp vụ

### 3.1. Organizer tạo loại vé

Thành phần tham gia: Organizer Web App, Backend API, PostgreSQL, Redis.

Các bước:

1. Organizer gửi request tạo loại vé: `POST /admin/concerts/:concertId/ticket-types`
2. Backend xác thực JWT và kiểm tra vai trò (`ADMIN` hoặc `ORGANIZER`).
3. Backend kiểm tra ownership: nếu role là `ORGANIZER`, phải là chủ sở hữu concert. Nếu không, trả 403.
4. Backend kiểm tra `saleEndsAt > saleStartsAt`. Nếu không, trả 400.
5. Backend kiểm tra không có loại vé trùng tên trong concert (qua unique constraint).
6. Backend tạo bản ghi `TicketType` với `soldQty = 0`, `reservedQty = 0`.
7. Backend khởi tạo Redis key `stock:{ticketTypeId}` = `totalQty`.
8. Backend trả response chứa `TicketTypeResponseDto`.

### 3.2. Customer xem vé đang bán

Thành phần tham gia: Customer Web App, Backend API, PostgreSQL.

1. Customer mở trang concert, gửi request: `GET /concerts/:concertId/ticket-types`
2. Backend lọc các `TicketType` của concert có `status = ACTIVE` và `availableQty > 0`.
3. Backend trả danh sách `TicketTypeResponseDto`.

### 3.3. Staff xem thông tin vé để hỗ trợ check-in

Thành phần tham gia: Staff PWA (Check-in App), Backend API, PostgreSQL.

Staff cần xem danh sách loại vé của concert để biết có bao nhiêu loại vé, giá trị từng loại, và số lượng đã bán / còn lại. Thông tin này giúp staff xác nhận nhanh khi khán giả hỏi vé.

Staff không có quyền tạo, sửa, xóa ticket type. Staff chỉ được xem danh sách loại vé của concert mà mình được phê duyệt (được assign bởi ADMIN).

Các bước:

1. Staff gửi request: `GET /admin/concerts/:concertId/ticket-types` kèm JWT.
2. Backend xác thực JWT, kiểm tra role là `STAFF`.
3. Backend kiểm tra staff được assign vào concert (nếu có cơ chế assignment).
4. Backend trả danh sách tất cả ticket types của concert (tất cả trạng thái, vì staff cần thấy cả loại vé đã bán hết).

### 3.4. Admin quản lý toàn bộ vé của concert

Thành phần tham gia: Admin Web App, Backend API, PostgreSQL, Redis.

ADMIN có quyền thao tác trên mọi concert, bất chấp sở hữu. ADMIN có thể xem tất cả ticket types của bất kỳ concert nào, điều chỉnh `soldQty` và `reservedQty` thủ công khi cần, và xóa ticket type bất kỳ khi nào.

---

## 4. API Endpoints

### 4.1. Public Endpoints

#### `GET /concerts/:concertId/ticket-types`

Xem các loại vé đang được bán của một concert. Không yêu cầu authentication.

**Query parameters:**

| Tham số | Kiểu | Mô tả |
|---------|------|--------|
| `concertId` | `path` | ID của concert |

**Response:** `200 OK`

```json
{
  "data": [
    {
      "id": "tt_001",
      "concertId": "c_001",
      "name": "VIP",
      "price": 1500000,
      "totalQty": 100,
      "soldQty": 20,
      "reservedQty": 5,
      "availableQty": 75,
      "maxPerUser": 4,
      "saleStartsAt": "2026-06-01T09:00:00Z",
      "saleEndsAt": "2026-06-30T23:59:59Z",
      "status": "ACTIVE",
      "createdAt": "2026-05-01T00:00:00Z",
      "updatedAt": "2026-05-15T00:00:00Z"
    }
  ],
  "total": 1
}
```

**Business rules:**

- Chỉ trả về vé có `status = ACTIVE`.
- Chỉ trả về vé có `availableQty > 0` (còn vé).
- Nếu concert không tồn tại, trả `404 Not Found`.

---

### 4.2. Admin Endpoints

Tất cả endpoints bên dưới yêu cầu:

- `Authorization: Bearer <jwt>`
- Role: `ADMIN`, `ORGANIZER`, hoặc `STAFF` (chỉ đọc)
- Ownership check: `ORGANIZER` chỉ được thao tác trên concert của mình

#### `GET /admin/concerts/:concertId/ticket-types`

Danh sách tất cả loại vé của một concert (kể cả inactive, sold out).

**Query parameters:**

| Tham số | Kiểu | Mô tả |
|---------|------|--------|
| `status` | `query` | Lọc theo trạng thái (`ACTIVE`, `INACTIVE`, `SOLD_OUT`) |

**Response:** `200 OK`

```json
{
  "data": [/* TicketTypeResponseDto[] */],
  "total": 3
}
```

**Quyền truy cập:** `ADMIN` xem tất cả concert, `ORGANIZER` chỉ concert của mình, `STAFF` chỉ xem không tạo/sửa/xóa.

#### `GET /admin/concerts/:concertId/ticket-types/:id`

Chi tiết một loại vé.

**Response:** `200 OK` — `TicketTypeResponseDto`

#### `POST /admin/concerts/:concertId/ticket-types`

Tạo loại vé mới.

**Quyền truy cập:** `ADMIN`, `ORGANIZER`

**Request body:**

```json
{
  "name": "VIP",
  "price": 1500000,
  "totalQty": 100,
  "maxPerUser": 4,
  "saleStartsAt": "2026-06-01T09:00:00Z",
  "saleEndsAt": "2026-06-30T23:59:59Z",
  "status": "ACTIVE"
}
```

**Validation rules:**

| Trường | Quy tắc |
|--------|---------|
| `name` | Required, non-empty string |
| `price` | Required, integer >= 0 |
| `totalQty` | Required, integer >= 1 |
| `maxPerUser` | Required, integer >= 1 |
| `saleStartsAt` | Required, ISO 8601 date string |
| `saleEndsAt` | Optional, phải sau `saleStartsAt` nếu provided |
| `status` | Optional, enum `TicketTypeStatus` |

**Error responses:**

| Status | Trường hợp |
|--------|------------|
| `400 Bad Request` | Validation failed |
| `403 Forbidden` | ORGANIZER không sở hữu concert, hoặc STAFF cố gắng tạo |
| `404 Not Found` | Concert không tồn tại |
| `409 Conflict` | Tên loại vé đã tồn tại trong concert này |

#### `PATCH /admin/concerts/:concertId/ticket-types/:id`

Cập nhật loại vé.

**Quyền truy cập:** `ADMIN`, `ORGANIZER`

**Request body:** tất cả fields đều optional (partial update):

```json
{
  "name": "VIP Plus",
  "price": 2000000,
  "totalQty": 150,
  "soldQty": 10,
  "reservedQty": 5,
  "maxPerUser": 2,
  "saleStartsAt": "2026-06-01T09:00:00Z",
  "saleEndsAt": "2026-06-30T23:59:59Z",
  "status": "ACTIVE"
}
```

**Business rules:**

- `soldQty` và `reservedQty` chỉ được thay đổi thủ công bởi `ADMIN`. ORGANIZER không được phép.
- `totalQty` không được giảm xuống dưới `soldQty + reservedQty`.
- Nếu `availableQty` giảm về 0, tự động đặt `status = SOLD_OUT`.
- Nếu `saleEndsAt` được cập nhật, phải sau `saleStartsAt`.
- Nếu `totalQty` thay đổi, cần tính lại và cập nhật `stock:{ticketTypeId}` trong Redis: `newAvailable = newTotalQty - soldQty - reservedQty`.

**Error responses:**

| Status | Trường hợp |
|--------|------------|
| `400 Bad Request` | `totalQty < soldQty + reservedQty` hoặc validation failed |
| `403 Forbidden` | ORGANIZER sửa `soldQty`/`reservedQty`, không sở hữu concert, hoặc STAFF cố gắng sửa |
| `404 Not Found` | Concert hoặc TicketType không tồn tại |
| `409 Conflict` | Tên mới trùng với loại vé khác trong concert |

#### `DELETE /admin/concerts/:concertId/ticket-types/:id`

Xóa loại vé.

**Quyền truy cập:** `ADMIN`, `ORGANIZER`

**Response:** `200 OK`

**Business rules:**

- Không được xóa nếu `soldQty > 0` hoặc `reservedQty > 0`.
- Không được xóa nếu có order đang reference đến loại vé này.
- Xóa `stock:{ticketTypeId}` khỏi Redis.

**Error responses:**

| Status | Trường hợp |
|--------|------------|
| `400 Bad Request` | Còn vé đã bán hoặc đang giữ |
| `403 Forbidden` | ORGANIZER không sở hữu concert, hoặc STAFF cố gắng xóa |
| `404 Not Found` | Concert hoặc TicketType không tồn tại |

---

## 5. Đồng bộ tồn kho

`soldQty` và `reservedQty` trong PostgreSQL được đồng bộ tại các thời điểm giao dịch:

| Thời điểm | `reservedQty` | `soldQty` | Redis `stock` | Redis `user-limit` |
|-----------|---------------|-----------|---------------|-------------------|
| Order được tạo (PENDING) | `+= quantity` | — | DECR | INCR |
| Order được thanh toán (PAID) | `-= quantity` | `+= quantity` | DECR thêm 1 lần | INCR (chuyển reserved -> paid) |
| Order bị hủy hoặc hết hạn | `-= quantity` | — | INCR | DECR |
| Order bị refund | — | `-= quantity` | INCR | DECR |

Tất cả các thao tác trên phải nằm trong transaction nguyên tử (cùng với Order/OrderItem). Khi order chuyển sang `PAID` và `availableQty === 0`, tự động đặt `status = SOLD_OUT`.

---

## 6. Kiểm tra quyền sở hữu (Ownership Check)

Organizer chỉ được thao tác trên concert thuộc về mình. `ADMIN` bypass hoàn toàn ownership check.

---

## 7. Phân quyền tổng hợp

| Hành động | Quyền truy cập |
|-----------|---------------|
| Xem vé đang bán | Tất cả mọi người (Không yêu cầu authentication) |
| Xem tất cả vé của concert | ADMIN (toàn bộ), ORGANIZER (chỉ concert của mình), STAFF (chỉ xem, không tạo/sửa/xóa) |
| Tạo loại vé | ADMIN, ORGANIZER (chỉ concert của mình) |
| Cập nhật loại vé | ADMIN, ORGANIZER (chỉ concert của mình, không sửa soldQty/reservedQty) |
| Cập nhật soldQty/reservedQty | Chỉ ADMIN |
| Xóa loại vé | ADMIN, ORGANIZER (chỉ concert của mình) |

---

## 8. Đối chiếu với thiết kế trong `design.md`

- **TicketType là bảng cấu hình** — không chứa thông tin tồn kho thực tế. Tồn kho thực tế được sync từ Redis + PostgreSQL.
- **`availableQty` là computed field** — luôn tính toán từ `totalQty - soldQty - reservedQty`, không lưu trực tiếp.
- **Organizer không can thiệp soldQty** — nếu cần điều chỉnh (ví dụ: hủy vé thủ công), chỉ ADMIN được phép.
- **`saleEndsAt` nullable** — nếu không set, vé bán không giới hạn thời gian.
- **Redis Lua Script đảm bảo atomicity** — khi nhiều request mua vé đồng thời, chỉ một request được xử lý tại một thời điểm trên cùng một ticket type, tránh oversell.
