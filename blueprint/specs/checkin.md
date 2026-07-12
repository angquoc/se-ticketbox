# Đặc tả: Check-in và Soát vé

## Mô tả

Tính năng check-in cho phép nhân sự soát vé tại cổng quét mã QR trên e-ticket của khán giả. Hệ thống hỗ trợ check-in trực tuyến (khi có mạng) và đồng bộ ngoại tuyến (khi mất mạng).

Tính năng này chịu trách nhiệm:

- Xác thực vé dựa trên mã QR (token hash) thay vì expose raw token.
- **Gán vé vào cổng cụ thể; chặn check-in sai cổng.**
- Chặn check-in trùng: cùng một mã QR không thể qua cổng hai lần.
- Ghi nhận log check-in cho mọi lượt quét (thành công và thất bại).
- Hỗ trợ check-in offline: mobile app xác thực signed QR payload cục bộ và đồng bộ khi có mạng.
- Đảm bảo idempotency khi sync offline: cùng một offline scan event không tạo bản ghi trùng lặp.

---

## Kiến trúc dữ liệu

### CheckinStatus enum (updated)

```prisma
enum CheckinStatus {
  SUCCESS
  INVALID_TICKET
  ALREADY_CHECKED_IN
  OFFLINE_PENDING
  REJECTED_CONFLICT
  GATE_MISMATCH   // ← mới: vé không thuộc cổng này
}
```

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
  gate           String?       // tên cổng thiết bị quét (e.g. "GATE-A")
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
```

### Gate model (new)

```prisma
model Gate {
  id        String   @id @default(cuid())
  name      String   // e.g. "GATE-A", "Cổng 1", "Entrance Main"
  concertId String
  concert   Concert  @relation(fields: [concertId], references: [id], onDelete: Cascade)

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@unique([concertId, name])
}
```

### Ticket schema (relevant fields — updated)

```prisma
model Ticket {
  id           String @id @default(uuid())
  concertId    String
  // ...
  gateId       String?  // stores Gate.name (e.g. "GATE-A"), NOT Gate.id

  // QR token storage strategy v2 (security by design):
  // - qrRawToken:   raw UUID token — sent to frontend for QR rendering, stored in DB as plaintext.
  // - qrTokenHash:  SHA-256 of qrRawToken — stored in DB, used for verification.
  // - qrSignature:  HMAC-SHA256 of {ticketId}:{qrTokenHash}:{gateId} — stored in DB,
  //                 used for tamper detection at check-in time.
  //
  // NOTE: When gateId changes, qrSignature becomes invalid and a new QR must be reissued.
  // NOTE: Ticket.gateId stores Gate.name (not Gate.id) for human-readable QR payload comparison.
  // The raw token is NEVER transmitted via email (only via authenticated HTTPS on the web app).
  qrRawToken   String   @default("")
  qrTokenHash  String   @unique
  qrSignature  String?

  status      TicketStatus @default(ISSUED)
  checkedInAt DateTime?

  checkinLogs CheckinLog[]
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

## QR Payload Format (v2)

Mỗi e-ticket chứa QR payload v2 theo định dạng phẳng:

```
{ticketId}:{rawToken}:{gateId}
```

Ví dụ: `abc123:xxxx-xxxx-xxxx:GATE-A`

Trong đó:

- `ticketId`: ID của vé trong hệ thống.
- `rawToken`: UUID ngẫu nhiên được sinh khi tạo vé (raw token — không phải hash).
- `gateId`: Gate name assigned to this ticket (e.g. `GATE-A`). Stored as `Ticket.gateId` = `Gate.name`, not `Gate.id`, for human-readable QR payload comparison.

**Nguyên tắc bảo mật:**

- `rawToken` được lưu trong DB (`qrRawToken`) và trả về frontend qua HTTPS khi user đăng nhập.
- `rawToken` **không bao giờ** được gửi qua email.
- `qrTokenHash` = SHA-256(`rawToken`) — lưu trong DB, dùng để verify khi check-in.
- `qrSignature` = HMAC-SHA256(`{ticketId}:{qrTokenHash}:{gateId}`, `QR_SIGNATURE_SECRET`) — lưu trong DB, dùng để phát hiện vé bị giả mạo hoặc bị sửa gate.
- QR payload không chứa timestamp.
- Khi quét QR, backend thực hiện 3 bước verify:
  1. **Gate check**: `device.gateId === ticket.gateId` (nếu ticket có gateId). Nếu không khớp → `GATE_MISMATCH`.
  2. **Hash verify**: hash `rawToken` từ QR → so với `qrTokenHash` trong DB.
  3. **HMAC verify**: recompute HMAC-SHA256(`{ticketId}:{qrTokenHash}:{gateId}`) → so với `qrSignature` trong DB.
- Với ticket cũ (không có `qrSignature`), bước HMAC verify được bỏ qua (backward compatibility).
- Với ticket cũ (không có `gateId`), bước gate check được bỏ qua — vé cũ có thể quét ở bất kỳ cổng nào.

**Tính năng Gate Restriction:**

- Mỗi thiết bị PWA check-in được gán vào một cổng (gate config).
- Khi quét, device gửi `gateId` của nó lên server.
- Server so sánh `device.gateId` với `ticket.gateId` từ DB.
- Nếu không khớp → `GATE_MISMATCH` → từ chối check-in.

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
2. PWA parse payload: {ticketId}:{rawToken}:{gateId}.
3. PWA gửi POST /checkin/verify với JWT staff và body:
   { ticketId, token (rawToken), deviceId, gateId (device's assigned gate) }
4. Backend xác thực JWT của staff.
5. Backend tìm ticket trong DB, bao gồm gate info.
6. Gate mismatch check:
   Nếu dto.gateId tồn tại VÀ ticket.gateId tồn tại VÀ dto.gateId !== ticket.gateId:
     → CheckinLog.status = GATE_MISMATCH
     → Response HTTP 400: "Vé này thuộc {ticket.gate.name}, bạn đang ở cổng khác"
7. Hash verify: hash rawToken → so với qrTokenHash trong DB.
8. HMAC verify (nếu qrSignature có giá trị):
   a. Backend recompute HMAC-SHA256({ticketId}:{qrTokenHash}:{gateId}) với QR_SIGNATURE_SECRET.
   b. So với qrSignature trong DB.
   c. Nếu không khớp → reject 'Mã QR không hợp lệ' (ticket có thể bị giả mạo).
9. Backend thực hiện atomic update:
   UPDATE ticket SET status = 'CHECKED_IN', checkedInAt = NOW()
   WHERE id = :ticketId AND status = 'ISSUED'
   Nếu affected rows = 0 → ticket đã checked-in hoặc không tồn tại.
10. Backend ghi CheckinLog trạng thái SUCCESS.
11. PWA hiển thị kết quả cho staff.
```

### 2. Check-in ngoại tuyến (Offline)

Khi mất kết nối mạng, PWA chuyển sang chế độ offline và tiếp tục quét QR.

```
1. PWA phát hiện mất mạng (network probe thất bại).
2. PWA parse QR payload v2: {ticketId}:{rawToken}:{gateId}.
3. PWA kiểm tra gate match cục bộ:
   Nếu gateId trong QR khác với device.gateId → hiển thị cảnh báo "Sai cổng" và không lưu offline.
   (Hoặc vẫn lưu offline nhưng đánh dấu gateId để server kiểm tra khi sync)
4. PWA ghi log vào IndexedDB:
   { ticketId, token (rawToken), gateId (từ QR), deviceId, deviceGateId,
     scannedAt, offlineEventId: uuid(), isOffline: true }
5. PWA tiếp tục quét các vé khác.
6. Khi có mạng trở lại, PWA gửi batch lên POST /checkin/sync.
7. Backend xử lý từng record:
   - Kiểm tra (deviceId, offlineEventId) đã tồn tại trong CheckinLog → skip (idempotent).
   - Gate mismatch check (như bước 6 ở trên).
   - Hash rawToken, tìm ticket, verify HMAC + token hash.
   - Atomic update SET status = 'CHECKED_IN' WHERE status = 'ISSUED'.
   - Ghi CheckinLog: SUCCESS nếu chưa check-in;
     REJECTED_CONFLICT nếu đã check-in ở cổng khác;
     GATE_MISMATCH nếu gate không khớp.
8. PWA nhận kết quả sync và cập nhật trạng thái local.
```

---

## Kịch bản xử lý

### 1. QR hợp lệ — check-in thành công

**Điều kiện:** Token hash khớp với DB, ticket đang ở trạng thái `ISSUED`, và gate khớp (nếu ticket có gateId).

**Kết quả:**

- `Ticket.status` → `CHECKED_IN`
- `Ticket.checkedInAt` → thời điểm hiện tại
- `CheckinLog.status` → `SUCCESS`
- Response: `{ success: true, ticketId, concertId, ticketTypeName, status: 'CHECKED_IN', message: 'Check-in thành công' }`

### 2. QR trùng lặp — đã check-in trước đó

**Điều kiện:** Ticket tồn tại, hash khớp, gate khớp, nhưng `Ticket.status` không phải `ISSUED`.

**Kết quả:**

- Không thay đổi `Ticket`.
- `CheckinLog.status` → `ALREADY_CHECKED_IN`
- `CheckinLog.reason` → 'Ticket already checked in'
- Response HTTP 400: `{ message: 'Vé đã được check-in trước đó' }`

### 3. Ticket không tồn tại hoặc hash không khớp

**Điều kiện:** `ticketId` không tồn tại trong DB, hoặc hash không khớp.

**Kết quả:**

- Không thay đổi `Ticket`.
- `CheckinLog.status` → `INVALID_TICKET`
- `CheckinLog.reason` → 'Token hash mismatch' hoặc 'Ticket not found'
- Response HTTP 404 hoặc 400

### 4. Conflict khi sync offline

**Điều kiện:** Vé đã được check-in online tại cổng A, sau đó cổng B sync lại bản ghi offline của cùng vé đó.

**Kết quả:**

- `Ticket.status` giữ nguyên `CHECKED_IN` (atomic update trả về 0 affected rows).
- `CheckinLog.status` → `REJECTED_CONFLICT`
- `CheckinLog.conflict` → `true`
- `CheckinLog.reason` → 'Ticket already checked in via another device or gate'
- Response per record: `{ success: false, status: 'REJECTED_CONFLICT', conflict: true, message: 'Vé đã được check-in từ thiết bị/cổng khác' }`

### 5. QR đúng nhưng sai cổng — Gate Mismatch (new)

**Điều kiện:** Ticket tồn tại, hash khớp, nhưng `dto.gateId !== ticket.gateId` (ticket có gateId và device có gateId).

**Kết quả:**

- Không thay đổi `Ticket`.
- `CheckinLog.status` → `GATE_MISMATCH`
- `CheckinLog.reason` → 'Gate mismatch: ticket assigned to {ticket.gate.name}, device at {dto.gateId}'
- Response HTTP 400: `{ message: 'Vé này thuộc {ticket.gate.name}, bạn đang ở cổng khác' }`

**Backward compatibility:**

- Ticket cũ (không có `gateId`) → gate check được bỏ qua → có thể quét ở bất kỳ cổng nào.
- Device chưa được config gateId → gate check được bỏ qua → chấp nhận mọi vé.

---

## Cơ chế idempotency cho offline sync

### Ràng buộc duy nhất

```prisma
@@unique([deviceId, offlineEventId])
```

- `deviceId`: ID của thiết bị mobile (định danh cổng soát vé).
- `offlineEventId`: UUID do mobile app sinh ra cho mỗi lượt quét khi offline.

**Tính chất idempotent:**

- Cùng một thiết bị quét cùng một vé 10 lần khi offline → 10 bản ghi trong IndexedDB với 10 `offlineEventId` khác nhau.
- Khi sync, mỗi record được xử lý riêng. Nếu 1 trong 10 record đã được sync thành công trước đó (tìm thấy record trong CheckinLog qua unique constraint), backend trả `{ success: true, message: 'Bản ghi đã được đồng bộ trước đó (idempotent)' }` và bỏ qua.
- Nếu staff sync cùng batch 2 lần (retry do lỗi mạng), các record đã sync sẽ được bỏ qua nhờ unique constraint.

### Thiết bị khác nhau quét cùng một vé khi offline

- Cổng A offline quét vé X → tạo bản ghi offline A-001.
- Cổng B offline quét vé X → tạo bản ghi offline B-001 (khác deviceId).
- Khi A sync trước → check-in thành công, `Ticket.status = CHECKED_IN`.
- Khi B sync sau → atomic update trả về 0 affected rows → `CheckinLog.status = REJECTED_CONFLICT`, `conflict = true`.
- Cả hai bản ghi đều được ghi nhận trong hệ thống để ban tổ chức xử lý xung đột sau.

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

- Prisma: `prisma.ticket.updateMany({ where: { id, status: 'ISSUED' }, data: { status: 'CHECKED_IN', checkedInAt } })`
- Nếu `affectedRows = 0` → ticket không còn ở trạng thái ISSUED → trả lỗi `ALREADY_CHECKED_IN`.
- Nếu `affectedRows = 1` → check-in thành công.

**Ưu điểm:**

- Không cần row-level lock hoặc transaction.
- Atomic ở cấp database engine.
- Tránh race condition hoàn toàn.

---

## Phân quyền

| Vai trò | Check-in online | Sync offline | Xem log | Quản lý gate |
|---------|-----------------|-------------|---------|-------------|
| STAFF | ✅ | ✅ | ❌ | ❌ |
| ADMIN | ✅ | ✅ | ✅ | ✅ |
| ORGANIZER | ❌ | ❌ | ❌ | ✅ (own concerts) |
| CUSTOMER | ❌ | ❌ | ❌ | ❌ |

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
| `gate` | device gate ID từ request | device gate ID từ request |
| `status` | `SUCCESS` | `INVALID_TICKET` / `ALREADY_CHECKED_IN` / `REJECTED_CONFLICT` / `GATE_MISMATCH` |
| `reason` | null | Mô tả lỗi |
| `isOffline` | `false` | `false` hoặc `true` (khi sync) |
| `conflict` | `false` | `true` (khi conflict) |
| `syncedAt` | thời điểm sync | thời điểm sync |
| `offlineEventId` | null | offline event ID (khi sync) |

---

## Chính sách TTL cho QR

- QR payload không có expiry time vô hạn.
- Timestamp không nằm trong QR payload (payload format v2: `{ticketId}:{rawToken}:{gateId}`).
- Backend không từ chối check-in dựa trên timestamp — chỉ kiểm tra gate match, HMAC signature, token hash và trạng thái vé.
- Staff scanner PWA có thể enforce quy tắc business riêng (ví dụ: chỉ cho check-in sau giờ mở cổng) bằng cách gọi API concert metadata trước khi quét.
- **Khi gateId của vé thay đổi (do rebalance)**: `qrSignature` cũ không còn valid → vé cần được re-issue (gửi lại QR mới cho khách).

---

## Giới hạn tốc độ

| Endpoint | Giới hạn |
|----------|----------|
| `POST /checkin/verify` | 30 request/phút/staff |
| `POST /checkin/sync` | 10 request/phút/staff |

Rate limit được áp dụng tại tầng middleware hoặc Redis.

---

## PWA Gate Configuration

Mỗi thiết bị PWA check-in được gán vào một cổng trước khi bắt đầu soát vé.

### Gate Setup Flow

```
1. Staff mở PWA lần đầu → hiển thị màn hình "Cài đặt Cổng"
2. Staff chọn cổng từ danh sách (GATE-A, GATE-B, ...) HOẶC nhập tên cổng tùy chỉnh
3. Gate config được lưu vào localStorage của thiết bị:
   { gateId: "GATE-A", concertId?: "..." }
4. Mỗi lần quét, device gửi gateId của nó trong request
```

### Gate Validation Rules

| Ticket gateId | Device gateId | Kết quả |
|---------------|-------------|---------|
| có giá trị | có giá trị, khác nhau | ❌ `GATE_MISMATCH` |
| có giá trị | có giá trị, giống nhau | ✅ Tiếp tục verify |
| có giá trị | chưa config | ✅ Bỏ qua gate check (backward compat) |
| null (ticket cũ) | bất kỳ | ✅ Bỏ qua gate check (backward compat) |

---

## Phản ứng hệ thống khi có lỗi

### PWA mất mạng ngay khi quét

- PWA chuyển sang chế độ offline.
- Không dừng quy trình soát vé.
- QR được ghi trực tiếp vào IndexedDB (gate check + HMAC verify được thực hiện bởi backend khi sync).
- Bản ghi được lưu vào IndexedDB.

### QR sai chữ ký hoặc payload hỏng

- Khi online: backend trả 'Mã QR không hợp lệ' sau khi verify thất bại.
- Khi offline: PWA vẫn ghi log vào IndexedDB, backend sẽ reject khi sync.
- Staff được thông báo vé không hợp lệ.

### QR đúng nhưng sai cổng

- Khi online: backend trả 'Vé này thuộc GATE-B, bạn đang ở cổng khác'.
- Khi offline: PWA hiển thị cảnh báo "Sai cổng" trên màn hình.
- Staff không cho khách qua.

### Sync thất bại giữa chừng

- PWA giữ lại các record chưa sync trong IndexedDB.
- Khi có mạng lại, PWA retry toàn bộ batch.
- Unique constraint `(deviceId, offlineEventId)` đảm bảo không tạo bản ghi trùng lặp.

### Backend lỗi khi sync một phần batch

- Batch được xử lý record-by-record (không transaction toàn batch).
- Record thành công được ghi nhận.
- Record lỗi được trả kết quả riêng trong `SyncCheckinResponseDto.results` để client retry chọn lọc.

### Ticket.gateId — Architectural Decision (Non-Standard)

**Decision:** `Ticket.gateId` stores `Gate.name` (e.g. `"GATE-A"`), NOT `Gate.id` (cuid).

**Rationale:**
- `Gate.name` is unique within a concert scope, making it a valid natural key.
- Storing `Gate.name` directly in `Ticket.gateId` produces human-readable QR payloads (`{ticketId}:{rawToken}:{GATE-A}`) and error messages (`"Vé này thuộc cổng GATE-A"`), improving operator experience at check-in gates.
- `Gate.id` (cuid) is opaque (e.g. `"clxxxabc"`) and would require an additional join to display meaningful gate names.
- The `checkin.md` spec originally suggested `Gate.id`, but this implementation choice is intentional and documented here.

**Trade-offs:**
- If a gate's `name` is changed after tickets are issued, the old QR codes (with the old name) will fail the HMAC check — triggering a re-issuance flow (same as any gate rebalancing). This is acceptable behavior.
- All gate assignment logic (round-robin, rebalancing, deletion) consistently uses gate name as the key, avoiding any ambiguity.

**Spec update:** The `checkin.md` schema example reflects this decision: `gateId` stores `Gate.name`, the relation references `Gate.name`, and all verification logic uses the name for comparison.

