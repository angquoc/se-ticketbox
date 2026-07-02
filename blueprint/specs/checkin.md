# Đặc tả: Check-in và Soát vé

## Mô tả

Tính năng check-in cho phép nhân sự soát vé tại cổng quét mã QR trên e-ticket của khán giả. Hệ thống hỗ trợ check-in trực tuyến (khi có mạng) và đồng bộ ngoại tuyến (khi mất mạng).

Tính năng này chịu trách nhiệm:

* Xác thực vé dựa trên mã QR (token hash) thay vì expose raw token.
* Chặn check-in trùng: cùng một mã QR không thể qua cổng hai lần.
* Ghi nhận log check-in cho mọi lượt quét (thành công và thất bại).
* Hỗ trợ check-in offline: mobile app xác thực signed QR payload cục bộ và đồng bộ khi có mạng.
* Đảm bảo idempotency khi sync offline: cùng một offline scan event không tạo bản ghi trùng lặp.

---

## Kiến trúc dữ liệu

### CheckinLog schema

```prisma
model CheckinLog {
  id             String        @id @default(uuid())
  ticketId       String?
  staffId        String
  concertId      String?
  ticket         Ticket?       @relation(fields: [ticketId], references: [id])
  staff          User          @relation("StaffCheckins", fields: [staffId], references: [id])
  concert        Concert?      @relation(fields: [concertId], references: [id])
  deviceId       String
  gate           String?
  offlineEventId String?
  status         CheckinStatus
  reason         String?
  isOffline      Boolean       @default(false)
  conflict       Boolean       @default(false)
  scannedAt      DateTime
  syncedAt       DateTime?
  createdAt      DateTime      @default(now())

  @@unique([deviceId, offlineEventId])
  @@index([ticketId])
  @@index([staffId])
  @@index([concertId])
  @@index([scannedAt])
}

enum CheckinStatus {
  SUCCESS
  INVALID_TICKET
  ALREADY_CHECKED_IN
  OFFLINE_PENDING
  REJECTED_CONFLICT
}
```

### Ticket schema (relevant fields)

```prisma
model Ticket {
  id           String       @id @default(uuid())
  // QR token storage strategy (security by design):
  // - qrRawToken:   the raw UUID token — sent to frontend for QR rendering, stored in DB.
  // - qrTokenHash:  SHA-256 of qrRawToken — stored in DB, used for verification.
  // - qrSignature:  HMAC-SHA256 of {ticketId}:{qrTokenHash} — stored in DB,
  //                 used for tamper detection at check-in time.
  // The raw token is NEVER transmitted via email (only via authenticated HTTPS on the web app).
  qrRawToken   String       @default("")
  qrTokenHash  String       @unique
  qrSignature  String?
  status       TicketStatus @default(ISSUED)
  checkedInAt  DateTime?
  checkinLogs  CheckinLog[]
  // ...
}

enum TicketStatus {
  ISSUED
  CHECKED_IN
  CANCELLED
  REFUNDED
}
```

---

## QR Payload Format

Mỗi e-ticket chứa QR payload theo định dạng phẳng, tối giản:

```
{ticketId}:{rawToken}
```

Trong đó:

* `ticketId`: ID của vé trong hệ thống.
* `rawToken`: UUID ngẫu nhiên được sinh khi tạo vé (raw token — không phải hash).

**Nguyên tắc bảo mật:**

* `rawToken` được lưu trong DB (`qrRawToken`) và trả về frontend qua HTTPS khi user đăng nhập.
* `rawToken` **không bao giờ** được gửi qua email.
* `qrTokenHash` = SHA-256(`rawToken`) — lưu trong DB, dùng để verify khi check-in.
* `qrSignature` = HMAC-SHA256(`{ticketId}:{qrTokenHash}`, `QR_SIGNATURE_SECRET`) — lưu trong DB, dùng để phát hiện vé bị giả mạo.
* QR payload không chứa timestamp (timestamp không đáng tin cậy vì có thể bị sửa trên client).
* Khi quét QR, backend thực hiện 2 bước verify:
  1. **Hash verify**: hash `rawToken` từ QR → so với `qrTokenHash` trong DB.
  2. **HMAC verify**: recompute HMAC-SHA256(`{ticketId}:{qrTokenHash}`) → so với `qrSignature` trong DB.
* Với ticket cũ (trước khi có `qrSignature`), bước HMAC verify được bỏ qua để đảm bảo backward compatibility.

---

## Các endpoint

| Method | Path | Quyền | Mô tả |
|--------|------|--------|--------|
| POST | `/checkin/verify` | STAFF, ADMIN | Check-in online từng vé |
| POST | `/checkin/sync` | STAFF, ADMIN | Sync batch log offline từ mobile app |

---

## Luồng chính

### 1. Check-in trực tuyến (Online)

Staff quét QR trên e-ticket của khán giả tại cổng soát vé khi có kết nối mạng.

```
1. Staff quét QR trên e-ticket.
2. PWA parse payload: {ticketId}:{rawToken}.
3. PWA gửi POST /checkin/verify với JWT staff và body:
   { ticketId, token (chứa rawToken), deviceId, gate? }
4. Backend xác thực JWT của staff.
5. Backend hash rawToken bằng SHA-256 → so với qrTokenHash trong DB.
   Nếu qrSignature có giá trị:
   a. Backend recompute HMAC-SHA256({ticketId}:{qrTokenHash}) với QR_SIGNATURE_SECRET.
   b. So với qrSignature trong DB.
   c. Nếu không khớp → reject với 'Mã QR không hợp lệ' (ticket có thể bị giả mạo).
6. Backend thực hiện atomic update:
   UPDATE ticket SET status = 'CHECKED_IN', checkedInAt = NOW()
   WHERE id = :ticketId AND status = 'ISSUED'
   Nếu affected rows = 0 → ticket đã checked-in hoặc không tồn tại.
7. Backend ghi CheckinLog trạng thái SUCCESS.
8. PWA hiển thị kết quả cho staff.
```

### 2. Check-in ngoại tuyến (Offline)

Khi mất kết nối mạng, PWA chuyển sang chế độ offline và tiếp tục quét QR.

```
1. PWA phát hiện mất mạng (network probe thất bại).
2. PWA parse QR payload: {ticketId}:{rawToken}.
3. PWA ghi log vào IndexedDB:
   { ticketId, token (rawToken), deviceId, gate,
     scannedAt, offlineEventId: uuid(), isOffline: true }
   (PWA không verify HMAC offline vì signature không nằm trong payload mới)
4. PWA tiếp tục quét các vé khác.
5. Khi có mạng trở lại, PWA gửi batch lên POST /checkin/sync.
6. Backend xử lý từng record:
   - Kiểm tra (deviceId, offlineEventId) đã tồn tại trong CheckinLog → skip (idempotent).
   - Hash rawToken, tìm ticket, verify HMAC + token hash.
   - Atomic update SET status = 'CHECKED_IN' WHERE status = 'ISSUED'.
   - Ghi CheckinLog: SUCCESS nếu chưa check-in; REJECTED_CONFLICT nếu đã check-in ở cổng khác.
7. PWA nhận kết quả sync và cập nhật trạng thái local.
```

---

## Kịch bản xử lý

### 1. QR hợp lệ — check-in thành công

**Điều kiện:** Token hash khớp với DB, ticket đang ở trạng thái `ISSUED`.

**Kết quả:**

* `Ticket.status` → `CHECKED_IN`
* `Ticket.checkedInAt` → thời điểm hiện tại
* `CheckinLog.status` → `SUCCESS`
* Response: `{ success: true, ticketId, concertId, ticketTypeName, status: 'CHECKED_IN', message: 'Check-in thành công' }`

### 2. QR trùng lặp — đã check-in trước đó

**Điều kiện:** Ticket tồn tại, hash khớp, nhưng `Ticket.status` không phải `ISSUED` (đã là `CHECKED_IN` hoặc trạng thái khác).

**Kết quả:**

* Không thay đổi `Ticket` (đã được update trước đó).
* `CheckinLog.status` → `ALREADY_CHECKED_IN`
* `CheckinLog.reason` → 'Ticket already checked in'
* Response HTTP 400: `{ message: 'Vé đã được check-in trước đó' }`

### 3. Ticket không tồn tại hoặc hash không khớp

**Điều kiện:** `ticketId` không tồn tại trong DB, hoặc hash không khớp.

**Kết quả:**

* Không thay đổi `Ticket`.
* `CheckinLog.status` → `INVALID_TICKET`
* `CheckinLog.reason` → 'Token hash mismatch' hoặc 'Ticket not found'
* Response HTTP 404 (not found) hoặc 400 (bad request)

### 4. Conflict khi sync offline

**Điều kiện:** Vé đã được check-in online tại cổng A, sau đó cổng B sync lại bản ghi offline của cùng vé đó.

**Kết quả:**

* `Ticket.status` giữ nguyên `CHECKED_IN` (atomic update trả về 0 affected rows).
* `CheckinLog.status` → `REJECTED_CONFLICT`
* `CheckinLog.conflict` → `true`
* `CheckinLog.reason` → 'Ticket already checked in via another device or gate'
* Response per record: `{ success: false, status: 'REJECTED_CONFLICT', conflict: true, message: 'Vé đã được check-in từ thiết bị/cổng khác' }`

---

## Cơ chế idempotency cho offline sync

### Ràng buộc duy nhất

```prisma
@@unique([deviceId, offlineEventId])
```

* `deviceId`: ID của thiết bị mobile (định danh cổng soát vé).
* `offlineEventId`: UUID do mobile app sinh ra cho mỗi lượt quét khi offline.

**Tính chất idempotent:**

* Cùng một thiết bị quét cùng một vé 10 lần khi offline → 10 bản ghi trong IndexedDB với 10 `offlineEventId` khác nhau.
* Khi sync, mỗi record được xử lý riêng. Nếu 1 trong 10 record đã được sync thành công trước đó (tìm thấy record trong CheckinLog qua unique constraint), backend trả `{ success: true, message: 'Bản ghi đã được đồng bộ trước đó (idempotent)' }` và bỏ qua.
* Nếu staff sync cùng batch 2 lần (retry do lỗi mạng), các record đã sync sẽ được bỏ qua nhờ unique constraint.

### Thiết bị khác nhau quét cùng một vé khi offline

* Cổng A offline quét vé X → tạo bản ghi offline A-001.
* Cổng B offline quét vé X → tạo bản ghi offline B-001 (khác deviceId).
* Khi A sync trước → check-in thành công, `Ticket.status = CHECKED_IN`.
* Khi B sync sau → atomic update trả về 0 affected rows → `CheckinLog.status = REJECTED_CONFLICT`, `conflict = true`.
* Cả hai bản ghi đều được ghi nhận trong hệ thống để ban tổ chức xử lý xung đột sau.

---

## Cơ chế chặn check-in trùng (Atomic Update)

### Tại sao không dùng SELECT rồi UPDATE?

Với tải cao tại cổng soát vé, race condition có thể xảy ra:

```
Thread A: SELECT ticket (status = ISSUED) → ok
Thread B: SELECT ticket (status = ISSUED) → ok  (cùng lúc quét ở 2 cổng)
Thread A: UPDATE ticket SET status = CHECKED_IN → affected rows = 1
Thread B: UPDATE ticket SET status = CHECKED_IN → affected rows = 1  ← SAI! Cả 2 đều thành công
```

### Giải pháp: UPDATE với WHERE clause

```sql
UPDATE ticket
SET status = 'CHECKED_IN', checkedInAt = NOW()
WHERE id = $ticketId AND status = 'ISSUED'
```

* Prisma: `prisma.ticket.updateMany({ where: { id, status: 'ISSUED' }, data: { status: 'CHECKED_IN', checkedInAt } })`
* Nếu `affectedRows = 0` → ticket không còn ở trạng thái ISSUED → trả lỗi `ALREADY_CHECKED_IN`.
* Nếu `affectedRows = 1` → check-in thành công.

**Ưu điểm:**

* Không cần row-level lock hoặc transaction.
* Atomic ở cấp database engine.
* Tránh race condition hoàn toàn.

---

## Phân quyền

| Vai trò | Check-in online | Sync offline | Xem log |
|---------|-----------------|-------------|---------|
| STAFF | ✅ | ✅ | ❌ |
| ADMIN | ✅ | ✅ | ✅ |
| CUSTOMER | ❌ | ❌ | ❌ |
| ORGANIZER | ❌ | ❌ | ❌ |

JWT của staff chứa `role: 'STAFF'` hoặc `role: 'ADMIN'`. `RolesGuard` kiểm tra quyền tại tầng controller.

---

## Ghi log check-in

Mọi lượt quét — dù thành công hay thất bại — đều được ghi vào `CheckinLog`.

| Trường | Giá trị khi thành công | Giá trị khi thất bại |
|--------|------------------------|---------------------|
| `ticketId` | ticket ID | ticket ID hoặc null |
| `staffId` | staff ID từ JWT | staff ID từ JWT |
| `concertId` | concert ID | null |
| `deviceId` | device ID từ request | device ID từ request |
| `gate` | gate từ request | gate từ request |
| `status` | `SUCCESS` | `INVALID_TICKET` / `ALREADY_CHECKED_IN` / `REJECTED_CONFLICT` |
| `reason` | null | Mô tả lỗi |
| `isOffline` | `false` | `false` hoặc `true` (khi sync) |
| `conflict` | `false` | `true` (khi conflict) |
| `syncedAt` | thời điểm sync | thời điểm sync |
| `offlineEventId` | null | offline event ID (khi sync) |

---

## Chính sách TTL cho QR

* QR payload không có expiry time vô hạn.
* Timestamp không nằm trong QR payload (payload format mới: `{ticketId}:{rawToken}`).
  Backend không từ chối check-in dựa trên timestamp — chỉ kiểm tra HMAC signature,
  token hash và trạng thái vé.
* Staff scanner PWA có thể enforce quy tắc business riêng (ví dụ: chỉ cho check-in sau giờ mở cổng)
  bằng cách gọi API concert metadata trước khi quét.

---

## Giới hạn tốc độ

| Endpoint | Giới hạn |
|----------|----------|
| `POST /checkin/verify` | 30 request/phút/staff |
| `POST /checkin/sync` | 10 request/phút/staff |

Rate limit được áp dụng tại tầng middleware hoặc Redis.

---

## Phản ứng hệ thống khi có lỗi

### PWA mất mạng ngay khi quét

* PWA chuyển sang chế độ offline.
* Không dừng quy trình soát vé.
* QR được ghi trực tiếp vào IndexedDB (HMAC verify được thực hiện bởi backend khi sync).
* Bản ghi được lưu vào IndexedDB.

### QR sai chữ ký hoặc payload hỏng

* Khi online: backend trả 'Mã QR không hợp lệ' sau khi verify thất bại.
* Khi offline: PWA vẫn ghi log vào IndexedDB, backend sẽ reject khi sync.
* Staff được thông báo vé không hợp lệ.

### Sync thất bại giữa chừng

* PWA giữ lại các record chưa sync trong IndexedDB.
* Khi có mạng lại, PWA retry toàn bộ batch.
* Unique constraint `(deviceId, offlineEventId)` đảm bảo không tạo bản ghi trùng lặp.

### Backend lỗi khi sync một phần batch

* Batch được xử lý record-by-record (không transaction toàn batch).
* Record thành công được ghi nhận.
* Record lỗi được trả kết quả riêng trong `SyncCheckinResponseDto.results` để client retry chọn lọc.
