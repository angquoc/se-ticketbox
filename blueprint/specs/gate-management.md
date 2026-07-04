# Đặc tả: Gate Management

## Mô tả

Tính năng **Gate Management** cho phép ban tổ chức sự kiện (BTC) quản lý các cổng soát vé, phân bổ vé vào cổng, và cân bằng lại phân bổ trước sự kiện.

Mỗi concert có thể có nhiều cổng. Khi khán giả mua vé và thanh toán thành công, hệ thống tự động gán vé vào cổng có ít vé nhất (round-robin). Điều này giúp chia đều lượng khán giả qua các cổng, giảm ùn tắc.

---

## 1. Gate Assignment — Tự động khi phát hành vé

Khi thanh toán thành công (webhook SUCCESS), vé được phát hành kèm gate assignment:

### Thuật toán: Least-Loaded Round-Robin

```
findLeastLoadedGate(concertId):
  gates = SELECT * FROM Gate WHERE concertId = ...
  IF gates.length == 0: RETURN null  // backward compatibility

  ticketCounts = SELECT gateId, COUNT(*) as cnt
                 FROM Ticket
                 WHERE concertId = ...
                   AND status IN ('ISSUED', 'CHECKED_IN')
                   AND gateId IS NOT NULL
                 GROUP BY gateId

  countMap = Map(gateId → cnt)  // gate không có ticket → cnt = 0

  RETURN gate với countMap[gate.id] nhỏ nhất
```

### QR Signature kèm Gate

Mỗi ticket được tạo với:

```
qrSignature = HMAC-SHA256({ticketId}:{qrTokenHash}:{gateId}, QR_SIGNATURE_SECRET)
```

Khi gateId thay đổi, qrSignature cũ không còn valid → vé cần được re-issue.

---

## 2. CRUD Gates

### 2.1. Tạo Gate

**Trigger:** BTC thêm cổng mới cho concert.

```
POST /admin/concerts/:concertId/gates
Body: { "name": "GATE-A" }
```

- Kiểm tra concert tồn tại.
- Kiểm tra `concertId + name` chưa tồn tại (`@@unique`).
- Tạo gate record.

**Response `201`:**

```json
{
  "id": "gate_abc123",
  "name": "GATE-A",
  "concertId": "concert_xyz",
  "ticketCount": 0,
  "createdAt": "2026-07-01T00:00:00Z"
}
```

**Error `409`:** Gate đã tồn tại cho concert này.

### 2.2. Liệt kê Gates

**Trigger:** BTC xem danh sách cổng và số vé đã gán.

```
GET /admin/concerts/:concertId/gates
```

**Response `200`:**

```json
[
  {
    "id": "gate_abc123",
    "name": "GATE-A",
    "concertId": "concert_xyz",
    "ticketCount": 142,
    "createdAt": "2026-07-01T00:00:00Z"
  },
  {
    "id": "gate_def456",
    "name": "GATE-B",
    "concertId": "concert_xyz",
    "ticketCount": 138,
    "createdAt": "2026-07-01T00:00:00Z"
  }
]
```

### 2.3. Sửa Gate

**Trigger:** BTC đổi tên cổng.

```
PATCH /admin/gates/:gateId
Body: { "name": "GATE-C" }
```

- Kiểm tra gate tồn tại.
- Kiểm tra tên mới không trùng với gate khác trong cùng concert.
- Cập nhật tên gate (ticketCount không đổi).

**Note:** Không cần re-sign QR vì tên gate (name) chỉ dùng để hiển thị. `Gate.id` (cuid) là giá trị được gán vào `Ticket.gateId`.

### 2.4. Xóa Gate

**Trigger:** BTC muốn gỡ bớt cổng.

```
DELETE /admin/gates/:gateId
```

**Logic:**

1. Tìm gate và đếm số ticket đã gán.
2. Nếu có ticket đã gán:
   - Tìm gate khác trong cùng concert (theo thứ tự alphabet).
   - Nếu không còn gate nào khác → throw `400 Bad Request`: "Cannot delete last gate".
   - Re-assign tất cả ticket sang gate kia.
3. Xóa gate record.

**Error `400`:** Không thể xóa cổng cuối cùng khi còn vé đã gán.

---

## 3. Rebalance Gates — Cân bằng cổng

### 3.1. Khi nào cần rebalance?

- Trước sự kiện 1-2 ngày, khi đã biết tổng số vé bán ra.
- Khi một cổng có vé quá nhiều / quá ít (chênh lệch đáng kể).
- Sau khi thêm hoặc bớt cổng.

### 3.2. Luồng Rebalance

```
POST /admin/concerts/:concertId/gates/rebalance
```

```
1. Lấy danh sách gates của concert, sắp xếp theo name ASC.
2. Lấy tất cả ticket ISSUED, sắp xếp theo createdAt ASC.
3. Round-robin: ticket i gán vào gate i % gates.length.
4. Với mỗi ticket đổi gate:
   a. Update ticket.gateId = newGateId
   b. Recompute qrSignature = HMAC({ticketId}:{qrTokenHash}:{newGateId}, secret)
5. Gửi email thông báo cho khách kèm QR mới.
6. Trả kết quả.
```

### 3.3. QR Re-issuance

Khi gateId thay đổi, `qrSignature` cũ không còn valid. Khách hàng cần nhận được QR mới.

**Email gửi cho khách:**

- Subject: "[TicketBox] Cổng check-in của bạn đã được cập nhật"
- Nội dung: Thông báo cổng đã thay đổi, link đến `/my-tickets` để xem QR mới.
- QR mới được tạo với `qrSignature` mới — tự động có trên trang `/my-tickets` (vì payload luôn build từ DB).

### 3.4. Response

```json
{
  "totalTicketsUpdated": 280,
  "gates": [
    { "id": "gate_abc", "name": "GATE-A", "ticketCount": 140 },
    { "id": "gate_def", "name": "GATE-B", "ticketCount": 140 }
  ]
}
```

---

## 4. API Endpoints

| Method | Path | Quyền | Mô tả |
|--------|------|--------|--------|
| GET | `/admin/concerts/:concertId/gates` | ADMIN, ORGANIZER | Danh sách cổng |
| POST | `/admin/concerts/:concertId/gates` | ADMIN, ORGANIZER | Tạo cổng |
| PATCH | `/admin/gates/:gateId` | ADMIN, ORGANIZER | Sửa cổng |
| DELETE | `/admin/gates/:gateId` | ADMIN, ORGANIZER | Xóa cổng |
| POST | `/admin/concerts/:concertId/gates/rebalance` | ADMIN, ORGANIZER | Cân bằng cổng |

---

## 5. Ràng buộc

### 5.1. Gate Name Uniqueness

`@@unique([concertId, name])` — không có hai cổng trùng tên trong cùng concert.

### 5.2. Ticket Assignment

- Ticket chỉ thuộc một gate tại một thời điểm.
- Ticket đã `CHECKED_IN` vẫn giữ gateId để phục vụ báo cáo.

### 5.3. Backward Compatibility

- Concert chưa có gate → `findLeastLoadedGate()` trả `null` → ticket không được gán cổng.
- Ticket không có `gateId` → có thể quét ở bất kỳ cổng nào (gate check bị bỏ qua).
- Không có breaking change cho vé đã phát hành.

### 5.4. Concurrency

- Rebalance chạy trong transaction để đảm bảo tính nhất quán.
- Nếu rebalance đang chạy, ticket mới được tạo song song vẫn gán gate riêng (không conflict).

---

## 6. PWA Gate Configuration

Mỗi thiết bị PWA check-in được gán vào một cổng trước khi bắt đầu ca trực.

### Storage

```
localStorage['tb_gate_config'] = JSON.stringify({
  gateId: "gate_abc123",   // Gate.id (cuid)
  concertId?: "concert_xyz" // optional
})
```

### Startup Flow

```
1. Staff mở PWA → kiểm tra localStorage['tb_gate_config']
2. Nếu chưa có → hiển thị màn hình "Cài đặt Cổng"
3. Staff chọn cổng từ preset (GATE-A, GATE-B, ...) HOẶC nhập tên tùy chỉnh
4. Gate config được lưu vào localStorage
5. Mỗi request check-in gửi kèm deviceGateId trong body
```

### Device Assignment

- Một thiết bị có thể thuộc một cổng tại một thời điểm.
- Khi đổi cổng → xóa localStorage → chọn lại từ đầu.
- Không có binding cố định giữa device và gate trên server (stateless device config).

---

## 7. Tiêu chí chấp nhận

### Gate CRUD

- [ ] Tạo gate mới → gate xuất hiện trong danh sách.
- [ ] Tạo gate trùng tên → trả `409 Conflict`.
- [ ] Sửa tên gate → tên cập nhật, ticketCount không đổi.
- [ ] Xóa gate có vé → vé tự động reassign sang gate khác.
- [ ] Xóa cổng cuối cùng khi còn vé → trả `400 Bad Request`.

### Rebalance

- [ ] Rebalance chia đều vé vào các cổng (chênh lệch ≤ 1).
- [ ] QR signature được recompute sau khi đổi gate.
- [ ] Email thông báo được gửi cho khách có vé đổi gate.

### Gate Assignment

- [ ] Ticket mới được gán vào cổng ít vé nhất.
- [ ] Concert không có gate → ticket không được gán (gateId = null).
- [ ] Ticket không có gateId → quét ở bất kỳ cổng nào.

### PWA

- [ ] Staff chọn cổng → config được lưu trong localStorage.
- [ ] Quét QR có gateId khác device → hiển thị cảnh báo "Sai cổng".
- [ ] Offline: gate check vẫn được thực hiện cục bộ hoặc khi sync.
