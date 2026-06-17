# Interactive Seatmap Specification

## Overview

Interactive Seatmap là thành phần giao diện cho phép khán giả xem sơ đồ sân khấu / khu vực ngồi, hiểu cấu trúc không gian sự kiện và theo dõi tình trạng vé theo từng khu vực hoặc loại vé. Feature này tập trung vào việc truyền đạt thông tin về layout và mức độ còn trống một cách trực quan, thay vì cho phép chọn ghế cụ thể. Khán giả có thể xem các khu vực, hiểu mức độ sẵn có và tiếp tục quy trình mua vé dựa trên loại vé và số lượng.

---

## 1. Mục tiêu

### Mục tiêu chức năng

- Hiển thị sơ đồ ghế dạng SVG của sân vận động / nhà hát.
- Trình bày các khu vực ghế và mối quan hệ giữa khu vực với loại vé.
- Cập nhật trạng thái khu vực / vùng ghế theo thời gian thực khi có người mua hoặc giữ chỗ.
- Hiển thị số vé còn lại theo loại vé và theo khu vực.
- Hỗ trợ người dùng hiểu rõ vị trí và mức độ sẵn có trước khi bước vào quy trình thanh toán.
- Cung cấp bộ lọc nhanh theo khu vực, loại vé và trạng thái còn trống.

### Mục tiêu kỹ thuật

- Hiển thị bản đồ với latency thấp ngay cả khi lượng truy cập tăng cao.
- Đảm bảo trạng thái khu vực ghế được cập nhật chính xác từ dữ liệu backend/Redis.
- Hỗ trợ rendering phía client để giảm tải cho server.
- Tối ưu hóa SVG để tải nhanh trên mobile và desktop.
- Hỗ trợ responsive design cho điện thoại, tablet và desktop.

---

## 2. Phạm vi

### Trong phạm vi

- Hiển thị sơ đồ ghế từ file SVG được lưu trong Object Storage.
- Hiển thị dữ liệu theo khu vực ghế, không cần biểu diễn từng ghế riêng lẻ.
- Cập nhật trạng thái khả dụng theo zone / section / ticket type.
- Hiển thị thông tin về loại vé, giá vé và số lượng còn lại liên quan đến từng khu vực.
- Hỗ trợ lọc và xem nhanh trạng thái ghế theo nhóm khu vực.

### Ngoài phạm vi

- Chọn ghế cụ thể theo hàng / số ghế riêng lẻ.
- Logic giữ chỗ và reservation ở mức ghế riêng lẻ.
- Gợi ý ghế thay thế hoặc đề xuất ghế gần nhất.
- Phân tích hành vi người dùng ở mức seat-level.
- Tính năng bán vé theo ghế riêng lẻ trong thời gian đầu triển khai.

---

## 3. User Stories

### Story 1: Khán giả xem sơ đồ khu vực ghế

**Given** khán giả đã chọn concert

**When** khán giả mở màn hình seatmap

**Then** hệ thống hiển thị:
- Sơ đồ ghế dạng SVG với các khu vực rõ ràng
- Màu sắc thể hiện trạng thái khu vực: còn trống, đang được giữ, đã bán hết
- Thông tin giá và loại vé liên quan cho từng vùng
- Tổng số vé còn lại theo loại vé

### Story 2: Khán giả hiểu mức độ sẵn có

**Given** khán giả đang xem sơ đồ ghế

**When** khán giả chọn một khu vực hoặc một loại vé

**Then** hệ thống hiển thị:
- Số lượng vé còn lại trong khu vực đó
- Giá bán tương ứng
- Trạng thái chung của khu vực (còn chỗ / gần hết / đã bán hết)

### Story 3: Khán giả lọc theo khu vực / loại vé

**Given** khán giả đang xem seatmap

**When** khán giả dùng bộ lọc theo khu vực hoặc loại vé

**Then** hệ thống chỉ hiển thị các khu vực phù hợp và làm nổi bật phần còn trống.

### Story 4: Khán giả xem cập nhật trạng thái thực tế

**Given** khán giả đang xem seatmap

**When** có người khác mua vé hoặc giữ chỗ trong cùng khu vực

**Then** hệ thống cập nhật số lượng còn lại mà không cần reload toàn bộ trang.

---

## 4. Dữ liệu

### Input Data (từ Backend)

```json
{
  "concertId": "concert123",
  "seatMapUrl": "https://storage.example.com/concert123-seatmap.svg",
  "venueName": "Nhà thi đấu ABC",
  "ticketTypes": [
    {
      "id": "tt1",
      "name": "VIP",
      "price": 500000,
      "zones": [
        {
          "zoneId": "vip-floor",
          "zoneName": "VIP Floor",
          "availableCount": 45,
          "reservedCount": 20,
          "soldCount": 35,
          "status": "AVAILABLE"
        }
      ],
      "maxPerUser": 4,
      "totalQty": 100,
      "soldQty": 35,
      "reservedQty": 20
    }
  ]
}
```

### Zone Availability State (từ Redis / Backend)

```json
{
  "concertId": "concert123",
  "ticketTypeId": "tt1",
  "zoneId": "vip-floor",
  "status": "AVAILABLE | RESERVED | SOLD_OUT",
  "availableCount": 45,
  "reservedCount": 20,
  "soldCount": 35,
  "updatedAt": "2026-06-11T10:30:00Z"
}
```

### Client-Side UI State

```json
{
  "selectedTicketTypeId": "tt1",
  "selectedZoneId": "vip-floor",
  "quantity": 2,
  "totalPrice": 1000000,
  "filters": {
    "ticketType": "VIP",
    "zone": "all"
  }
}
```

---

## 5. UI/UX Design

### Layout

```text
┌─────────────────────────────────────┐
│ Concert Name - Seat Overview        │
├─────────────────────────────────────┤
│ [Filter by Zone] [Filter by Ticket] │
├─────────────────────────────────────┤
│                                     │
│        ┌─ STAGE ─┐                  │
│        │         │                  │
│    VIP Section                      │
│    ████████████                     │
│                                     │
│    Standard Section                 │
│    ████████████████                 │
│                                     │
│    Economy Section                  │
│    ████████████████████             │
│                                     │
├─────────────────────────────────────┤
│ Legend: ▢ Available  ▢ Reserved     │
│         ▢ Sold Out                  │
├─────────────────────────────────────┤
│ Selected: VIP • 2 tickets • 1.000.000 VND │
│             [Proceed to Checkout]   │
└─────────────────────────────────────┘
```

### Color Scheme

- **Available**: Xanh lá (Green) - #4CAF50
- **Reserved/Holding**: Vàng (Yellow) - #FFC107
- **Sold Out**: Xám (Gray) - #BDBDBD
- **Selected**: Xanh dương (Blue) - #2196F3
- **Hovered**: Cam (Orange) - #FF9800

### Interactive Elements

1. **Zone Element**
   - Hover: hiện tooltip với tên khu vực, số lượng còn lại và giá
   - Click: chọn khu vực để xem chi tiết và chuẩn bị mua vé

2. **Tooltip** (on hover)
   ```text
   Zone: VIP Floor
   Ticket Type: VIP
   Available: 45
   Price: 500.000 VND
   ```

3. **Filter & Search**
   - Dropdown: lọc theo khu vực
   - Dropdown: lọc theo loại vé
   - Chip/Badge: thể hiện trạng thái còn trống / gần hết / hết vé

4. **Responsive Behavior**
   - Desktop: hiển thị toàn bộ sơ đồ
   - Tablet: hỗ trợ zoom / pan nhẹ
   - Mobile: hiển thị theo chế độ toàn màn hình và tối ưu thao tác chạm

---

## 6. API Endpoints

### GET /api/concerts/:concertId/seatmap

Lấy dữ liệu sơ đồ ghế, loại vé và trạng thái khu vực hiện tại.

**Response:**
```json
{
  "success": true,
  "data": {
    "concertId": "concert123",
    "seatMapUrl": "https://storage.example.com/concert123-seatmap.svg",
    "venueName": "Nhà thi đấu ABC",
    "ticketTypes": [
      {
        "id": "tt1",
        "name": "VIP",
        "price": 500000,
        "zones": [
          {
            "zoneId": "vip-floor",
            "zoneName": "VIP Floor",
            "availableCount": 45,
            "reservedCount": 20,
            "soldCount": 35,
            "status": "AVAILABLE"
          }
        ]
      }
    ]
  }
}
```

**Cache:** Redis 5 phút cho layout seatmap, 30 giây cho trạng thái availability.

### GET /api/concerts/:concertId/seatmap/availability

Lấy trạng thái real-time của các khu vực / loại vé.

**Response:**
```json
{
  "success": true,
  "data": {
    "updates": [
      {
        "ticketTypeId": "tt1",
        "zoneId": "vip-floor",
        "status": "RESERVED",
        "availableCount": 40,
        "updatedAt": "2026-06-11T10:30:00Z"
      }
    ]
  }
}
```

### WebSocket: /ws/concerts/:concertId/seatmap-updates

Real-time subscription cho cập nhật trạng thái khu vực ghế.

**Message (Server → Client):**
```json
{
  "type": "zone_status_update",
  "updates": [
    {
      "ticketTypeId": "tt1",
      "zoneId": "vip-floor",
      "oldStatus": "AVAILABLE",
      "newStatus": "RESERVED",
      "availableCount": 40,
      "timestamp": "2026-06-11T10:30:15Z"
    }
  ]
}
```

---

## 7. Business Logic

### Luồng hiển thị và lựa chọn khu vực

```text
Step 1: GET /concerts/:id/seatmap
- Frontend tải sơ đồ ghế, layout và dữ liệu availability theo zone
- Hiển thị bản đồ và legend

Step 2: User chọn loại vé / khu vực trên UI
- Frontend lưu lựa chọn vào state local
- Hiển thị giá và mức độ còn lại tương ứng
- Không thực hiện chọn ghế cụ thể ở mức seat-level

Step 3: User tiếp tục checkout
- Frontend gửi thông tin loại vé, số lượng và khu vực đã chọn
- Backend kiểm tra tồn kho theo ticket type / zone
- Nếu hợp lệ, tạo order và tiến hành thanh toán
```

### Cập nhật trạng thái khu vực ghế

1. **Khi user mở seatmap:**
   - Frontend tải dữ liệu availability tổng hợp từ backend.

2. **Khi có order được tạo:**
   - Backend cập nhật trạng thái của zone/ticketType trong Redis và PostgreSQL.
   - Giá trị `reservedCount` tăng lên theo số lượng đã giữ chỗ.

3. **Khi thanh toán thành công:**
   - Backend cập nhật `soldCount` và `availableCount` tương ứng.

4. **Khi order hết hạn:**
   - Background job hoàn lại availability và cập nhật lại các thống kê chung.

### Validation

1. **Zone / Ticket Type Validation:**
   - Khu vực phải tồn tại trong sơ đồ
   - Loại vé phải hợp lệ với khu vực đang hiển thị
   - Số lượng đặt phải nhỏ hơn hoặc bằng số vé còn lại

2. **Per-User Limit Validation:**
   - Scope: per concert, per ticket type
   - Công thức: `paidQty + reservedQty ≤ maxPerUser`

3. **Bot Protection:**
   - Rate limit cho requests lấy seatmap và tạo order
   - Giảm nguy cơ spam và thundering herd khi mở bán.

### Performance Optimization

1. **Caching Strategy:**
   - Cache layout seatmap: 1 ngày
   - Cache availability summary: 30 giây
   - Không cache dữ liệu quá chi tiết ở mức seat-level

2. **Client-Side Rendering:**
   - Tải SVG 1 lần, reuse DOM
   - Chỉ cập nhật các vùng thay đổi bằng CSS/class

3. **Network Optimization:**
   - Gzip SVG và tối ưu metadata
   - Progressive loading để hiển thị sơ đồ nhanh hơn

---

## 8. Edge Cases & Error Handling

### Edge Case 1: Khu vực trở nên hết vé trong lúc người dùng đang xem

**Scenario:** Một khu vực đang có nhiều chỗ nhưng ngay sau đó được một người khác đặt.

**Solution:**
- Frontend nhận update từ WebSocket
- Cập nhật badge trạng thái của khu vực
- Hiển thị thông báo nhẹ: “Khu vực này vừa hết chỗ” hoặc “Số vé còn lại đã thay đổi”

### Edge Case 2: SVG không tải được

**Scenario:** File SVG không load được hoặc chậm.

**Solution:**
- Hiển thị fallback UI với thông tin cơ bản: tên khu vực, trạng thái, giá vé
- Cho phép người dùng tiếp tục mua vé với dữ liệu text-based nếu map không khả dụng

### Edge Case 3: Tải cao gây chậm phản hồi

**Scenario:** Trong thời điểm mở bán đông người, các request seatmap bị chậm.

**Solution:**
- Dùng cache và rate limiting
- Hiển thị trạng thái “Đang tải lại dữ liệu…” thay vì block toàn bộ trải nghiệm

### Error Codes

| Code | Message | Action |
|------|---------|--------|
| `ZONE_NOT_FOUND` | Khu vực không tồn tại | Refresh & reload seatmap |
| `ZONE_NOT_AVAILABLE` | Khu vực đã hết vé | Update UI, gợi ý chọn khu vực khác |
| `TICKET_TYPE_NOT_FOUND` | Loại vé không hợp lệ | Refresh seatmap |
| `EXCEED_MAX_PER_USER` | Vượt quá số lượng mua tối đa | Show warning |
| `SEATMAP_NOT_FOUND` | Không tìm thấy sơ đồ ghế | Load fallback |

---

## 9. Security Considerations

### Input Validation
- Validate `concertId`, `ticketTypeId`, `zoneId`
- Limit số request lấy seatmap và tạo order

### Rate Limiting & Bot Protection
- GET seatmap: giới hạn request theo IP và user
- POST order creation: giới hạn theo user để chống spam trong thời điểm mở bán

### Authorization
- Chỉ customer role mới được xem và chọn loại vé/khu vực để tiếp tục thanh toán
- Organizers chỉ có thể xem seatmap ở chế độ read-only

### Data Privacy
- Không log dữ liệu nhạy cảm của khu vực quá mức
- Không expose thông tin availability chi tiết cho người không được phép

---

## 10. Testing Strategy

### Unit Tests
- Availability summary logic
- Price calculation by ticket type and zone
- Validation rules for maxPerUser

### Integration Tests
- API endpoints return correct data
- Redis/Backend updates reflected in seatmap UI
- WebSocket pushes correct availability updates

### E2E Tests
- User flow: view seatmap → choose ticket type/zone → checkout
- Real-time update: availability drops during viewing
- Error scenarios: zone sold out, network issues, stale cache

### Performance Tests
- Seatmap load time < 1 second
- Availability update propagation < 500ms
- System remains stable under concurrent traffic

---

## 11. Implementation Notes

### Frontend Stack
- React/Next.js for UI
- SVG rendering with SVG.js or D3.js
- WebSocket library: Socket.io hoặc native WebSocket
- State management: Zustand hoặc Redux

### Backend Stack
- NestJS with Redis module
- WebSocket support via @nestjs/websockets
- Prisma ORM for seat metadata and inventory summary
- BullMQ for expiration jobs

### Redis Key Design

**Zone Availability Keys:**
```text
zone:{concertId}:{ticketTypeId}:{zoneId}
  → Stored as availability summary with TTL
```

**Inventory Summary Keys:**
```text
stock:{concertId}:{ticketTypeId}
  → Stored as available/reserved/sold counts
```

**Per-User Limit Keys:**
```text
user-limit:{userId}:{ticketTypeId}
  → Stored as paidQty + reservedQty
```

### Database Queries
- Availability summary: Redis and PostgreSQL
- Layout metadata: PostgreSQL / Object Storage
- Order lifecycle: PostgreSQL with expiration handling

### Deployment
- SVG files: Object Storage
- Seatmap service: stateless, can be horizontally scaled
- WebSocket: Redis Pub/Sub for multi-instance propagation

---

## 12. Future Enhancements

- Support seat assignment later when the business requirement expands
- Dynamic pricing based on zone popularity
- Accessibility enhancements for screen readers and high contrast
- Analytics for zone-level popularity and traffic patterns
