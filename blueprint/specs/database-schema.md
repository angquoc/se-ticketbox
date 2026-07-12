# Database Schema

## 1. Tổng quan

TicketBox sử dụng **PostgreSQL** làm database chính cho toàn bộ nghiệp vụ. Mỗi bảng được thiết kế để lưu trữ một nhóm dữ liệu nghiệp vụ riêng biệt, có quan hệ rõ ràng và có index phù hợp cho các truy vấn phổ biến.

---

## 2. Mô tả từng bảng

### `User`

Lưu thông tin tài khoản người dùng trong hệ thống. Mỗi user có một role xác định quyền truy cập. Các trường cần lưu ý:

| Trường | Ý nghĩa |
|---|---|
| `email` | Email đăng nhập, duy nhất trong hệ thống |
| `phone` | Số điện thoại tùy chọn, dùng để xác minh tài khoản và giới hạn mua vé |
| `passwordHash` | Băm mật khẩu bằng bcrypt, không lưu plaintext |
| `fullName` | Tên hiển thị, tùy chọn |
| `role` | Phân quyền: `CUSTOMER`, `ORGANIZER`, `STAFF`, `ADMIN` |

Một user có thể đồng thời là organizer (tạo concert), customer (mua vé), hoặc staff (soát vé) tùy role. `User` là bảng nền tảng, hầu như mọi bảng khác đều có quan hệ trực tiếp hoặc gián tiếp đến nó.

---

### `Concert`

Lưu thông tin sự kiện/concert do organizer tạo. Đây là bảng trung tâm của nghiệp vụ concert.

| Trường | Ý nghĩa |
|---|---|
| `slug` | Chuỗi URL-friendly, duy nhất toàn hệ thống |
| `organizerId` | FK → `User.id`, xác định chủ sở hữu concert |
| `artistBio` | Nội dung được sinh bởi AI từ PDF press kit |
| `status` | Trạng thái vòng đời concert: `DRAFT` → `PUBLISHED` → `SALE_OPEN` → `SALE_CLOSED` → `COMPLETED` / `CANCELLED` |
| `saleStartsAt` / `saleEndsAt` | Khoảng thời gian mở bán vé, dùng để kiểm tra quyền mua |
| `seatMapUrl` | Liên kết đến SVG seat map trong Object Storage |
| `coverImageUrl` | Ảnh bìa concert trong Object Storage |

`Concert` có quan hệ 1:N với `TicketType`, `Order`, `Ticket`, `CheckinLog`, `GuestListEntry` và `UploadedFile`.

---

### `TicketType`

Lưu cấu hình từng loại vé thuộc một concert. Mỗi concert có thể có nhiều loại vé (VIP, Normal, Early Bird...).

| Trường | Ý nghĩa |
|---|---|
| `name` | Tên loại vé (VD: "VIP", "Standard"), duy nhất trong một concert |
| `price` | Giá vé tính bằng VND (số nguyên) |
| `totalQty` | Tổng số vé ban đầu |
| `soldQty` | Số vé đã bán (thanh toán thành công) |
| `reservedQty` | Số vé đang được giữ bởi order PENDING (đồng bộ với Redis) |
| `maxPerUser` | Giới hạn số vé một user được mua với loại vé này |
| `status` | `ACTIVE` / `INACTIVE` / `SOLD_OUT` |

`@@unique([concertId, name])` đảm bảo không có hai loại vé trùng tên trong cùng một concert. `soldQty` và `reservedQty` được đồng bộ mỗi khi có giao dịch để hệ thống biết còn bao nhiêu vé.

---

### `Order`

Lưu đơn hàng của khán giả. `Order` là **bản ghi reservation chính thức** trong hệ thống.

| Trường | Ý nghĩa |
|---|---|
| `userId` | FK → `User.id` |
| `concertId` | FK → `Concert.id` |
| `status` | `PENDING_PAYMENT` → `PAID` → `EXPIRED` / `CANCELLED` / `PAYMENT_FAILED` / `REFUNDED` |
| `totalAmountInVnd` | Tổng số tiền |
| `expiresAt` | Thời điểm hết hạn giữ chỗ (TTL reservation) |
| `paidAt` | Thời điểm thanh toán thành công |
| `inventoryReleasedAt` | Thời điểm vé được hoàn lại tồn kho |
| `releaseReason` | Lý do hoàn vé: `PAYMENT_TIMEOUT`, `CANCELLED`, `PAYMENT_FAILED` |

`Order` có quan hệ 1:N với `OrderItem`, `PaymentTransaction` và `Ticket`. `Order PENDING` chính là reservation record — không cần bảng riêng.

---

### `OrderItem`

Lưu chi tiết từng loại vé trong một order. Nhiều loại vé có thể nằm trong cùng một order.

| Trường | Ý nghĩa |
|---|---|
| `orderId` | FK → `Order.id` |
| `ticketTypeId` | FK → `TicketType.id` |
| `quantity` | Số lượng vé loại này trong order |
| `unitPrice` | Giá một vé tại thời điểm tạo order |
| `subtotal` | `quantity × unitPrice` |

`OrderItem` có quan hệ 1:N với `Ticket`. Mỗi `OrderItem` sẽ sinh ra đúng `quantity` bản ghi `Ticket` khi order chuyển sang `PAID`.

---

### `PaymentTransaction`

Lưu giao dịch thanh toán qua cổng thanh toán (Mock/VNPAY/MoMo).

| Trường | Ý nghĩa |
|---|---|
| `provider` | `MOCK`, `MOMO`, `VNPAY` |
| `providerTransactionId` | ID giao dịch từ bên thứ ba, dùng để chống webhook trùng |
| `paymentUrl` | URL thanh toán được trả về từ cổng thanh toán |
| `rawWebhook` | Dữ liệu webhook gốc (JSON) để audit |
| `receivedAt` | Thời điểm nhận webhook thành công |

`@@unique([provider, providerTransactionId])` là cơ chế cuối cùng chống double-payment từ webhook lặp.

---

### `Ticket`

Lưu vé đã phát hành cho khán giả. Mỗi vé tương ứng một QR code duy nhất.

| Trường | Ý nghĩa |
|---|---|
| `orderId` / `orderItemId` | FK → để trace vé về order gốc |
| `gateId` | Chuỗi text lưu tên cổng soát vé (e.g. "GATE-A") được gán cho vé này. Không có ràng buộc khóa ngoại (FK) trong DB để tối ưu hóa payload. Ticket cũ không có gateId vẫn quét được ở bất kỳ cổng nào |
| `qrRawToken` | UUID ngẫu nhiên, lưu dạng plaintext trong DB, trả về frontend để render QR. Không bao giờ gửi qua email |
| `qrTokenHash` | SHA-256 hash của `qrRawToken`, duy nhất. Dùng để verify khi check-in |
| `qrSignature` | HMAC-SHA256 của `{ticketId}:{qrTokenHash}:{gateId}`, dùng để phát hiện vé bị giả mạo hoặc bị sửa gate. **Khi gateId thay đổi, qrSignature cũ không còn valid → vé cần được re-issue** |
| `status` | `ISSUED` → `CHECKED_IN` / `CANCELLED` / `REFUNDED` |
| `checkedInAt` | Thời điểm được soát vé thành công |

`qrTokenHash` được dùng làm điểm tra cứu khi staff quét QR, không dùng `id` để tránh lộ thông tin.

---

### `IdempotencyKey`

Lưu idempotency key để chống double request (double-click, retry mạng). Lưu ý: Bảng này được thiết kế sẵn để tham khảo cấu trúc hoặc mở rộng trong tương lai. Ở runtime, hệ thống chỉ đọc ghi idempotency qua Redis để đạt tốc độ phản hồi nhanh nhất.

| Trường | Ý nghĩa |
|---|---|
| `userId` | FK → `User.id` |
| `key` | Idempotency key từ client |
| `requestHash` | Hash của request body để phát hiện request khác nhau cùng key |
| `status` | `PROCESSING` → `COMPLETED` / `FAILED` |
| `orderId` | FK → `Order.id` (sau khi order được tạo) |
| `responseBody` | Lưu response đã trả cho request đầu tiên |

`@@unique([userId, key])` đảm bảo mỗi user không dùng trùng key. Key có TTL 15 phút để tránh bảng phình to.

---

### `UserTicketCounter`

Lưu số lượng vé đã mua / đang giữ của từng user cho từng loại vé. Đây là bảng phụ trợ cho Redis để enforce giới hạn `maxPerUser`.

| Trường | Ý nghĩa |
|---|---|
| `paidQty` | Số vé đã thanh toán |
| `reservedQty` | Số vé đang giữ (order PENDING) |

`@@id([userId, ticketTypeId])` — mỗi cặp user + ticket type chỉ có một bản ghi duy nhất, được upsert mỗi khi user reserve hoặc thanh toán.

---

### `Gate` (new)

Lưu thông tin cổng soát vé của một concert. Mỗi concert có thể có nhiều cổng (GATE-A, GATE-B, Cổng Chính...).

| Trường | Ý nghĩa |
|---|---|
| `concertId` | FK → `Concert.id`. Cascade delete khi xóa concert |
| `name` | Tên cổng, duy nhất trong mỗi concert (e.g. `GATE-A`, `Cổng 1`, `Entrance Main`) |

`@@unique([concertId, name])` đảm bảo không có hai cổng trùng tên trong cùng một concert.

Gate có quan hệ logic 1:N với Ticket thông qua trường Ticket.gateId lưu tên cổng.

---

### `CheckinLog`

Lưu log mỗi lần quét QR, bao gồm cả online và offline.

| Trường | Ý nghĩa |
|---|---|
| `ticketId` | FK → `Ticket.id` (nullable cho trường hợp vé không tìm thấy) |
| `staffId` | FK → `User.id` (nhân sự soát vé) |
| `deviceId` | ID thiết bị của staff PWA |
| `offlineEventId` | ID sự kiện tạo offline trên PWA |
| `status` | `SUCCESS`, `INVALID_TICKET`, `ALREADY_CHECKED_IN`, `OFFLINE_PENDING`, `REJECTED_CONFLICT`, `GATE_MISMATCH` |
| `isOffline` | True nếu log được tạo khi mất mạng |
| `conflict` | True nếu cùng một vé được quét offline ở hai thiết bị khác nhau |
| `scannedAt` | Thời điểm quét (thời gian thiết bị) |
| `syncedAt` | Thời điểm sync lên server (null nếu còn offline) |

`@@unique([deviceId, offlineEventId])` đảm bảo không ghi đè log offline từ cùng một thiết bị.

---

### `GuestListEntry`

Lưu danh sách khách mời VIP được import từ CSV. Khách mời có thể có QR riêng để check-in.

| Trường | Ý nghĩa |
|---|---|
| `concertId` | FK → `Concert.id` |
| `fullName` | Bắt buộc |
| `email` / `phone` | Thông tin liên hệ, có index để tra cứu nhanh |
| `sponsorName` | Tên nhãn hàng tài trợ |
| `qrTokenHash` | QR riêng cho khách mời (nullable) |
| `checkedInAt` | Thời điểm khách mời check-in |

---

### `UploadedFile`

Lưu metadata của file đã upload lên Object Storage (PDF press kit, CSV guest list, ảnh...).

| Trường | Ý nghĩa |
|---|---|
| `objectKey` | Key trong Object Storage (MinIO / Supabase Storage) |
| `purpose` | Mục đích: `ARTIST_PRESS_KIT`, `GUEST_LIST_CSV`, `COVER_IMAGE`, `SEAT_MAP`... |
| `status` | `PENDING`, `PROCESSING`, `COMPLETED`, `FAILED` |
| `errorMessage` | Chi tiết lỗi nếu xử lý thất bại |

---

## 3. PostgreSQL là Source of Truth

PostgreSQL là **nguồn sự thật duy nhất và chính thức** của TicketBox. Mọi quyết định nghiệp vụ đều được đo lường dựa trên dữ liệu trong PostgreSQL, không phải Redis hay cache.

### Lý do PostgreSQL được chọn làm Source of Truth

| Lý do | Chi tiết |
|---|---|
| **ACID** | PostgreSQL đảm bảo Atomicity, Consistency, Isolation, Durability. Khi một giao dịch thanh toán được commit, dữ liệu đó tồn tại vĩnh viễn và nhất quán, ngay cả khi server restart. |
| **Transaction** | Order, payment, ticket được tạo trong cùng một transaction. Nếu bất kỳ bước nào lỗi, toàn bộ rollback. Redis không có transaction tương đương cho nghiệp vụ phức tạp. |
| **Unique Constraint & FK** | Email user, `qrTokenHash` của vé, `providerTransactionId` của payment đều được ràng buộc ở cấp database. Không có giải pháp Redis nào đảm bảo được tính duy nhất này một cách nhất quán. |
| **Audit & Recovery** | Khi Redis mất dữ liệu (restart, failover, memory pressure), hệ thống có thể phục hồi trạng thái tồn kho từ `TicketType.soldQty`, `TicketType.reservedQty` và `UserTicketCounter`. Ngược lại, nếu PostgreSQL mất dữ liệu thì không có nơi nào có thể phục hồi. |
| **Foreign Key** | Ràng buộc khóa ngoại giữa các bảng đảm bảo tính toàn vẹn tham chiếu. Khi xóa concert, các bảng liên quan được xử lý hợp lý. Redis hoàn toàn không có khái niệm này. |
| **Reporting & Doanh thu** | Các báo cáo doanh thu, thống kê vé, audit tài chính đều dựa trên PostgreSQL. Không ai xây dựng báo cáo từ Redis. |

### Phân chia trách nhiệm: PostgreSQL vs Redis

Redis đóng vai trò **lớp tăng tốc** (performance layer), không phải nguồn dữ liệu:

- **Redis**: tồn kho tức thời (`stock:{ticketTypeId}`), giới hạn per-user (`user-limit:{userId}:{ticketTypeId}`), reservation TTL (`reservation:{orderId}`), cache, rate limit, queue.
- **PostgreSQL**: mọi dữ liệu nghiệp vụ chính thức, audit, báo cáo, phục hồi.

Nếu Redis gặp sự cố, dữ liệu PostgreSQL vẫn còn nguyên vẹn và hệ thống có thể rebuild trạng thái Redis từ PostgreSQL. Ngược lại, nếu PostgreSQL gặp sự cố, không có gì có thể thay thế nó.

---

## 4. Tại sao không tạo bảng `Reservation`

TicketBox **không tạo bảng `Reservation` riêng** vì những lý do sau:

### `Order PENDING` đã đóng vai trò reservation

Khi user reserve vé, hệ thống tạo `Order` với `status = PENDING_PAYMENT` và `expiresAt = now() + TTL`. Bản ghi này chứa đầy đủ thông tin:

- User nào đang giữ vé
- Concert nào
- Loại vé và số lượng (qua `OrderItem`)
- Thời điểm hết hạn giữ chỗ

Nếu tạo thêm bảng `Reservation` riêng, dữ liệu sẽ bị **trùng lặp** với `Order`, gây ra:

- **Thêm độ phức tạp logic**: phải insert/update/cancel cả hai bảng đồng thời, tăng risk lệch dữ liệu.
- **Không cần thiết**: `Order PENDING` đã có đầy đủ thông tin cần thiết.
- **Tăng kích thước database**: mỗi reservation tạo 2 bản ghi thay vì 1.

### Cơ chế giữ chỗ hai lớp

```
Lớp 1 — Redis TTL (hiệu năng cao, không bền vững)
└── stock:{ticketTypeId}       → tồn kho tức thời
└── reservation:{orderId}      → TTL reservation
└── user-limit:{userId}:{ticketTypeId}  → giới hạn per-user

Lớp 2 — PostgreSQL Order PENDING (bền vững, chính thức)
└── Order { status: PENDING_PAYMENT, expiresAt }
```

Redis xử lý giữ chỗ nhanh trong giờ cao điểm để giảm áp lực lên PostgreSQL. PostgreSQL lưu trạng thái chính thức để đảm bảo tính bền vững và phục hồi.

### Lớp 3 — BullMQ Delayed Job (bảo đảm cuối cùng)

BullMQ delayed job kiểm tra các order `PENDING` đã hết hạn (so sánh `now() > expiresAt`) và chuyển sang `EXPIRED`, đồng thời hoàn lại tồn kho. Đây là cơ chế bảo đảm nếu Redis TTL bị evict sớm hoặc thanh toán không bao giờ đến.

### So sánh: có bảng Reservation vs không có

| Tiêu chí | Có bảng Reservation riêng | Không có (dùng Order PENDING) |
|---|---|---|
| Số bản ghi mỗi reservation | 2 (Reservation + Order) | 1 (Order) |
| Logic đồng bộ | Cần insert/update/cancel cả 2 bảng | Chỉ cần 1 bảng |
| Phục hồi khi Redis lỗi | Cần reconcile Reservation vs Order | Chỉ cần đọc Order PENDING |
| Khả năng audit | Tốt hơn một chút | Đủ tốt |
| Độ phức tạp | Cao hơn | Thấp hơn |

Kết luận: `Order PENDING` đã đủ để đóng vai trò reservation record. Việc tách riêng bảng `Reservation` chỉ thêm độ phức tạp mà không mang lại giá trị thực tế trong phạm vi hệ thống này.

---

## 5. Index quan trọng

Dưới đây là danh sách tất cả index được định nghĩa trong schema, kèm mục đích sử dụng thực tế.

### `User`

```prisma
@@index([role])
```

Tra cứu tất cả user theo role (ví dụ: lấy danh sách `STAFF` của một concert).

### `Concert`

```prisma
@@index([status, startsAt])
@@index([saleStartsAt, saleEndsAt])
```

- `([status, startsAt])`: Lọc concert theo trạng thái và sắp xếp theo thời gian. Dùng khi hiển thị concert sắp diễn ra, concert đang mở bán, concert đã kết thúc.
- `([saleStartsAt, saleEndsAt])`: Tra cứu nhanh các concert đang trong thời gian mở bán để kiểm tra quyền mua vé.

### `TicketType`

```prisma
@@unique([concertId, name])
@@index([concertId, status])
```

- `@@unique`: Đảm bảo không có hai loại vé trùng tên trong cùng concert.
- `([concertId, status])`: Lấy tất cả loại vé đang `ACTIVE` của một concert để hiển thị trang mua vé.

### `Order`

```prisma
@@index([userId, status])
@@index([concertId, status])
@@index([status, expiresAt])
```

- `([userId, status])`: Lấy tất cả đơn hàng của một user theo trạng thái (ví dụ: đang chờ thanh toán, đã thanh toán).
- `([concertId, status])`: Lấy tất cả đơn hàng của một concert theo trạng thái (ví dụ: tổng doanh thu concert = tổng order `PAID`).
- `([status, expiresAt])`: **Index quan trọng nhất của bảng Order.** Dùng để BullMQ delayed job hoặc cronjob tìm các order `PENDING` đã hết hạn để expire. Nếu thiếu index này, truy vấn expire sẽ quét toàn bộ bảng.

### `OrderItem`

```prisma
@@index([orderId])
@@index([ticketTypeId])
```

- `([orderId])`: Tra cứu chi tiết các loại vé trong một order.
- `([ticketTypeId])`: Thống kê doanh thu theo loại vé (SUM subtotal), đếm số đơn hàng chứa loại vé này.

### `PaymentTransaction`

```prisma
@@unique([provider, providerTransactionId])
@@index([orderId, status])
```

- `@@unique`: Chống double webhook từ payment gateway. Nếu gateway gửi lại webhook với cùng `providerTransactionId`, database sẽ reject thay vì update.
- `([orderId, status])`: Kiểm tra trạng thái thanh toán của một order.

### `Ticket`

```prisma
@@index([orderId])
@@index([concertId, status])
@@index([ticketTypeId, status])
@@index([userId, status])
```

- `([orderId])`: Tra cứu tất cả vé thuộc một order (khi customer xem danh sách vé).
- `([concertId, status])`: Đếm vé đã phát hành / đã check-in theo concert.
- `([ticketTypeId, status])`: Thống kê số vé theo loại vé.
- `([userId, status])`: Lấy tất cả vé của một user (ví dụ: vé sắp tới, vé đã dùng).

### `IdempotencyKey`

```prisma
@@unique([userId, key])
@@index([expiresAt])
```

- `@@unique`: Đảm bảo mỗi user không có hai bản ghi trùng key.
- `([expiresAt])`: Dùng để cleanup các key đã hết hạn, tránh bảng phình to theo thời gian.

### `CheckinLog`

```prisma
@@unique([deviceId, offlineEventId])
@@index([ticketId])
@@index([staffId])
@@index([concertId])
@@index([scannedAt])
```

- `@@unique`: Đảm bảo log offline từ cùng một thiết bị không bị ghi đè khi sync.
- `([ticketId])`: Kiểm tra lịch sử check-in của một vé để phát hiện vé đã dùng.
- `([concertId])`: Thống kê số người đã check-in trong một concert.
- `([scannedAt])`: Tra cứu log theo thời gian, hỗ trợ báo cáo lưu lượng check-in theo giờ.

### `GuestListEntry`

```prisma
@@index([concertId])
@@index([email])
@@index([phone])
```

- `([concertId])`: Lấy toàn bộ guest list của một concert.
- `([email])` / `([phone])`: Tra cứu nhanh khách mời khi họ đến check-in (tra bằng email hoặc số điện thoại thay vì QR).

### `UploadedFile`

```prisma
@@index([concertId])
@@index([purpose])
```

- `([concertId])`: Lấy tất cả file của một concert.
- `([purpose])`: Lọc file theo mục đích (ví dụ: lấy tất cả PDF press kit đang xử lý).

### Tổng hợp index quan trọng nhất

| Bảng | Index | Mục đích |
|---|---|---|
| `Order` | `([status, expiresAt])` | **CRITICAL** — expire order quá hạn. Thiếu index này = truy vấn O(n) |
| `Order` | `([userId, status])` | Lấy đơn hàng của user theo trạng thái |
| `Concert` | `([status, startsAt])` | Lọc và sắp xếp concert theo trạng thái |
| `Ticket` | `([concertId, status])` | Thống kê vé theo concert |
| `Ticket` | `([userId, status])` | Lấy vé của customer |
| `TicketType` | `([concertId, status])` | Hiển thị vé đang bán của concert |
| `PaymentTransaction` | `@@unique([provider, providerTransactionId])` | Chống double webhook |
| `CheckinLog` | `([ticketId])` | Phát hiện vé đã dùng |
| `IdempotencyKey` | `([expiresAt])` | Cleanup key cũ |

Các index trên được tạo dựa trên các truy vấn phổ biến nhất trong hệ thống. Khi thêm endpoint hoặc job mới, cần xem xét có cần index bổ sung không.
