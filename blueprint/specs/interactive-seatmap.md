# Interactive Seatmap Specification

## Overview

Interactive Seatmap là thành phần giao diện cho phép khán giả xem sơ đồ ghế, kiểm tra tình trạng từng ghế và chọn ghế mong muốn trước khi thanh toán. Đây là bước quan trọng trong quy trình mua vé, giúp khán giả hiểu rõ vị trí ghế và tránh việc mua vé mà không biết vị trí chính xác.

---

## 1. Mục tiêu

### Mục tiêu chức năng

- Hiển thị sơ đồ ghế dạng SVG của sân vận động / nhà hát.
- Cập nhật trạng thái ghế theo thời gian thực khi có người mua hoặc giữ chỗ.
- Cho phép khán giả chọn ghế ưu tiên trước khi thanh toán.
- Hỗ trợ nhiều loại vé với các khu vực ghế khác nhau.
- Hiển thị giá vé dựa trên khu vực ghế được chọn.
- Cung cấp tìm kiếm và bộ lọc nhanh theo khu vực hoặc loại vé.

### Mục tiêu kỹ thuật

- Hiển thị bản đồ với latency thấp ngay cả dưới tải cao (80.000 lượt truy cập trong 5 phút đầu).
- Đảm bảo trạng thái ghế được cập nhật chính xác từ Redis cache.
- Hỗ trợ rendering khách phía (client-side) để giảm tải server.
- Tối ưu hóa kích thước file SVG để tải nhanh.
- Hỗ trợ responsive design trên điện thoại, tablet và desktop.

---

## 2. Phạm vi

### Trong phạm vi

- Hiển thị sơ đồ ghế từ file SVG được lưu trong Object Storage.
- Cập nhật trạng thái từng ghế dựa trên Redis reservation data.
- Cho phép chọn 1 hoặc nhiều ghế liên tiếp hoặc riêng lẻ.
- Hiển thị thông tin ghế (khu vực, hàng, số ghế, giá vé).
- Tính toán tổng giá dựa trên ghế được chọn.
- Hiển thị số ghế còn lại theo loại vé.

### Ngoài phạm vi

- Chức năng bán vé từng ghế riêng lẻ cho từng khán giả (ticketless mode).
- Hỗ trợ ghế VIP có chức năng đặc biệt như giữ vé cho nhân sự soát.
- Phân tích hành vi người dùng (heatmap click).
- Tương tác voice/gesture để chọn ghế.
- Tối ưu hóa thuật toán đề xuất ghế tốt nhất.

---

## 3. User Stories

### Story 1: Khán giả xem sơ đồ ghế

**Given** khán giả đã chọn concert và loại vé

**When** khán giả nhấn "Chọn ghế" hoặc "View Seats"

**Then** hệ thống hiển thị:
- Sơ đồ ghế dạng SVG với các khu vực rõ ràng
- Các ghế sẵn có được tô màu xanh
- Các ghế đã bán / được giữ được tô màu xám
- Giá vé cho từng khu vực
- Số ghế còn lại tổng cộng

**Performance:** Bản đồ phải load trong < 1 giây

### Story 2: Khán giả chọn ghế

**Given** khán giả đang xem sơ đồ ghế

**When** khán giả click vào 1 ghế sẵn có

**Then** hệ thống:
- Đánh dấu ghế được chọn bằng màu khác (ví dụ: vàng)
- Hiển thị thông tin ghế: khu vực, hàng, số ghế
- Cập nhật tổng giá vé
- Lưu lựa chọn vào session

**Constraint:** Số ghế chọn không được vượt quá maxPerUser của loại vé

### Story 3: Khán giả bỏ chọn ghế

**Given** khán giả đã chọn 1 ghế

**When** khán giả click lại ghế đó (deselect)

**Then** hệ thống:
- Bỏ chọn ghế
- Cập nhật lại tổng giá vé
- Xóa ghế khỏi session

### Story 4: Khán giả xem cập nhật trạng thái thực tế

**Given** khán giả đang xem sơ đồ ghế

**When** có người mua vé hoặc giữ chỗ từ browser khác

**Then** hệ thống:
- Cập nhật trạng thái ghế mà không cần khán giả reload
- Hiển thị thông báo nếu ghế được chọn trước đó bây giờ không còn sẵn
- Gợi ý chọn ghế khác gần vị trí cũ

**Implementation:** WebSocket hoặc polling từ Redis

### Story 5: Khán giả chọn multiple loại vé

**Given** khán giả muốn mua 2 loại vé khác nhau (VIP + Standard)

**When** khán giả chọn nhóm ghế từ khu vực VIP rồi chuyển sang Standard

**Then** hệ thống:
- Hiển thị riêng bản đồ cho mỗi loại vé
- Cho phép chọn ghế ở các khu vực khác nhau
- Tính toán giá vé cho từng nhóm
- Hiển thị tổng tiền cho tất cả
- Khi submit order, tất cả ghế được gom vào 1 order với multiple OrderItems

**Constraint:** Mỗi ticket type được chọn độc lập, nhưng tất cả được submit trong 1 POST /orders request

---

## 4. Dữ liệu

### Input Data (từ Backend)

```javascript
{
  concertId: string,
  seatMapUrl: string,          // URL đến file SVG
  ticketTypes: [
    {
      id: string,
      name: string,
      price: number,
      seatRegions: [            // Các khu vực ghế thuộc loại vé này
        {
          regionId: string,
          regionName: string,   // "VIP", "Front", "Back"
          seatCount: number,
          availableCount: number,
          reservedCount: number,
          soldCount: number
        }
      ],
      maxPerUser: number,
      totalQty: number,
      soldQty: number,
      reservedQty: number
    }
  ]
}
```

### Seat State (từ Redis)

```javascript
{
  concertId: string,
  ticketTypeId: string,
  regionId: string,
  seatNumber: string,     // Ví dụ: "A1", "VIP-01"
  status: "AVAILABLE" | "RESERVED" | "SOLD",
  reservedUntil: timestamp,  // Thời gian giữ chỗ hết hạn
  userId?: string         // Nếu RESERVED, ai giữ
}
```

### Client-Side Selection State

```javascript
{
  selectedSeats: [
    {
      ticketTypeId: string,
      regionId: string,
      seatNumber: string,
      price: number
    }
  ],
  totalPrice: number,
  ticketTypeCount: {
    [ticketTypeId]: number  // Số ghế chọn cho mỗi loại vé
  }
}
```

---

## 5. UI/UX Design

### Layout

```
┌─────────────────────────────────────┐
│  Concert Name - Seat Selection      │
├─────────────────────────────────────┤
│ [Filter by Zone] [Sort] [Search]    │
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
│ Legend: ▢ Available  ▢ Reserved    │
│         ▢ Sold                      │
├─────────────────────────────────────┤
│ Selected: 2 seats | Total: 1.000.000│
│              [Proceed to Payment]   │
└─────────────────────────────────────┘
```

### Color Scheme

- **Available**: Xanh lá (Green) - #4CAF50
- **Reserved/Holding**: Vàng (Yellow) - #FFC107
- **Sold**: Xám (Gray) - #BDBDBD
- **Selected**: Xanh dương (Blue) - #2196F3
- **Hovered**: Cam (Orange) - #FF9800

### Interactive Elements

1. **Seat Element**
   - Size: 20px x 20px (responsive)
   - Border-radius: 3px
   - Hover effect: Enlarge + show tooltip
   - Click: Toggle selection

2. **Tooltip** (on hover)
   ```
   Zone: VIP
   Row: A
   Seat: 15
   Price: 500.000 VND
   ```

3. **Filter & Search**
   - Dropdown: Lọc theo khu vực
   - Search input: Tìm ghế theo số hiệu (A1, VIP-05, etc.)
   - Sort: Theo giá, khu vực, khoảng trống

4. **Responsive Behavior**
   - Desktop: Hiển thị toàn bộ sơ đồ
   - Tablet: Cho phép zoom/pan
   - Mobile: Toàn màn hình, hỗ trợ pinch-to-zoom

---

## 6. API Endpoints

### GET /api/concerts/:concertId/seatmap

Lấy dữ liệu sơ đồ ghế, loại vé và trạng thái ghế hiện tại.

**Request:**
```
GET /api/concerts/concert123/seatmap
```

**Response:**
```json
{
  "success": true,
  "data": {
    "concertId": "concert123",
    "seatMapUrl": "https://storage.example.com/concert123-seatmap.svg",
    "ticketTypes": [
      {
        "id": "tt1",
        "name": "VIP",
        "price": 500000,
        "seatRegions": [
          {
            "regionId": "vip-floor",
            "regionName": "VIP Floor",
            "seatCount": 100,
            "availableCount": 45,
            "reservedCount": 20,
            "soldCount": 35
          }
        ],
        "maxPerUser": 4,
        "totalQty": 100,
        "soldQty": 35,
        "reservedQty": 20
      }
    ],
    "seats": [
      {
        "seatNumber": "VIP-A1",
        "regionId": "vip-floor",
        "status": "AVAILABLE",
        "coords": { "x": 100, "y": 50 }
      },
      {
        "seatNumber": "VIP-A2",
        "regionId": "vip-floor",
        "status": "SOLD",
        "coords": { "x": 120, "y": 50 }
      }
    ]
  }
}
```

**Cache:** Redis 5 phút cho dữ liệu seatmap layout, 30 giây cho trạng thái seat

### POST /api/concerts/:concertId/seat-availability

Query trạng thái real-time của một nhóm ghế.

**Request:**
```json
{
  "seatNumbers": ["VIP-A1", "VIP-A2", "VIP-A3"]
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "availability": {
      "VIP-A1": "AVAILABLE",
      "VIP-A2": "RESERVED",
      "VIP-A3": "SOLD"
    },
    "timestamp": "2026-06-04T10:30:00Z"
  }
}
```

### WebSocket: /ws/concerts/:concertId/seat-updates

Real-time subscription cho cập nhật trạng thái ghế.

**Subscribe:**
```json
{
  "action": "subscribe",
  "concertId": "concert123"
}
```

**Message (Server → Client):**
```json
{
  "type": "seat_status_update",
  "messageId": "msg-uuid",
  "updates": [
    {
      "seatNumber": "VIP-A1",
      "oldStatus": "AVAILABLE",
      "newStatus": "RESERVED",
      "timestamp": "2026-06-04T10:30:15Z"
    }
  ]
}
```

**Acknowledgement (Client → Server):**
Client phải acknowledge mỗi message để đảm bảo at-least-once delivery. Nếu client không ack sau 5 giây, server sẽ retry:
```json
{
  "type": "ack",
  "messageId": "msg-uuid"
}
```

**Timeout & Retry:** Nếu client bị ngắt kết nối, khi reconnect client sẽ pull lại những updates chưa được ack.

---

## 7. Business Logic

### Luồng Reservation Chi Tiết (Integration with Order)

Reservation flow từ lúc khán giả xem seatmap đến khi đặt vé:

```
┌─────────────────────────────────────────────────────────────┐
│ Step 1: GET /concerts/:id/seatmap                            │
│ - Frontend tải sơ đồ ghế, hiển thị trạng thái từ Redis      │
│ - Lưu vào client state: selectedSeats = []                  │
│ - Chưa giữ ghế trên backend                                  │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ Step 2: User chọn ghế trên UI                               │
│ - Frontend update selectedSeats state (local only)           │
│ - Debounce click events (250ms)                             │
│ - Check maxPerUser limit trên client (validation)           │
│ - Hiển thị tổng giá                                         │
│ - Rate limit check: 10 selections/minute (warn if exceed)   │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ Step 3: POST /orders (click "Checkout")                     │
│ - Frontend submit selectedSeats + Idempotency-Key           │
│ - Backend validates: maxPerUser, ghế còn sẵn                │
│ - Backend dùng Redis Lua Script (atomic):                   │
│   * Kiểm tra stock để tranh chấp                            │
│   * Đánh dấu ghế RESERVED trong Redis                       │
│   * Tạo Order PENDING_PAYMENT trong PostgreSQL             │
│   * Set TTL = 10 phút cho reservation                       │
│ - Nếu thành công: trả Order ID + Payment URL                │
│ - Rate limit check: trigger per request (nếu exceed báo)    │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ Step 4: User hoàn tất thanh toán (webhook từ Payment)       │
│ - Backend cập nhật Order.status = PAID                      │
│ - Backend cập nhật Redis: status = SOLD (xóa TTL)           │
│ - Backend tạo Ticket + phát hành QR                         │
│ - Gửi email e-ticket                                        │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ Step 5: Order hết hạn (Background Job - ADR 10)             │
│ - Nếu Order.expiresAt < now() và status = PENDING           │
│ - Background Job: Order.status = EXPIRED                    │
│ - Hoàn lại ghế: Redis status = AVAILABLE (xóa TTL)          │
│ - Update UserTicketCounter.reservedQty                      │
│ - Ghế được nhập lại vào pool bán                            │
└─────────────────────────────────────────────────────────────┘
```

### Cập nhật Trạng thái Ghế

1. **Khi người dùng chọn ghế trên UI (pending):**
   - Frontend lưu selection vào session/state
   - **Không có API call** — backend không biết user đang chọn

2. **Khi người dùng tạo Order (POST /orders):**
   - Backend kiểm tra Redis + PostgreSQL xem ghế có sẵn không
   - Nếu sẵn, dùng Redis Lua Script (atomic):
     * Cập nhật Redis: `status = RESERVED`, set TTL = 10 phút
     * Giới hạn per-user: tăng `user-limit:{userId}:{ticketTypeId}`
   - Tạo Order PENDING_PAYMENT trong PostgreSQL
   - Nếu không sẵn, trả lỗi `SEAT_NOT_AVAILABLE`

3. **Khi thanh toán thành công:**
   - Backend cập nhật Redis: `status = SOLD`, xóa TTL
   - Tạo Ticket record trong PostgreSQL
   - Update `TicketType.soldQty`

4. **Khi Order hết hạn:**
   - Background Job xử lý Delayed Task (ADR 10)
   - Cập nhật Redis: `status = AVAILABLE` (hoàn lại)
   - Update `TicketType.reservedQty`, `UserTicketCounter.reservedQty`
   - Nhập ghế vào pool bán lại

### Validation

1. **Ghế Level Validation:**
   - Ghế phải tồn tại trong sơ đồ
   - Ghế phải sẵn có (AVAILABLE) tại thời điểm tạo order
   - Ghế phải thuộc concert đó

2. **Per-User Limit Validation:**
   - **Scope:** Per concert, per ticket type
   - Công thức: `paidQty + reservedQty ≤ maxPerUser`
   - `paidQty`: số vé đã thanh toán (PAID tickets)
   - `reservedQty`: số vé đang giữ chỗ (PENDING orders chưa expire)
   - Check trên PostgreSQL (UserTicketCounter) + Redis (user-limit key) để accuracy
   - **Khi order hết hạn:** background job trừ đi `reservedQty`

3. **Order Level Validation:**
   - Có thể chọn ghế từ multiple ticket types (Story 5)
   - Nhưng mỗi ticket type phải có ít nhất 1 ghế
   - Tổng số ghế trong order không bị giới hạn (phân riêng per ticket type)

4. **Bot Protection:**
   - Rate limit: 10 POST /orders requests per minute per user (chống bot click)
   - Rate limit: 100 GET /seatmap requests per minute per IP (chống scanner)
   - Trigger: Trả lỗi 429 Too Many Requests nếu vượt quá
   - Virtual Waiting Room: khi tải cao, dùng Token Bucket (ADR 5)

### Performance Optimization

1. **Caching Strategy:**
   - Cache seatmap layout (SVG URL, regionId mapping): 1 ngày
   - Cache ticket type info: 30 phút
   - Cache tổng số ghế theo status: 1 phút (updated on every booking)
   - Don't cache individual seat status - query Redis directly

2. **Client-Side Rendering:**
   - Tải SVG 1 lần, reuse DOM
   - Cập nhật class CSS thay vì redraw SVG
   - Lazy load tooltips

3. **Network Optimization:**
   - Gzip SVG
   - Minify SVG (removeMetadata, removeComments)
   - Progressive loading: hiển thị bản đồ trước khi tất cả tooltip load xong

---

## 8. Edge Cases & Error Handling

### Edge Case 1: Ghế được chọn bỗng nhiên không còn sẵn

**Scenario:** Khán giả chọn ghế A1, nhưng ngay sau đó người khác mua nó.

**Solution:**
- Frontend nhận WebSocket update (từ /ws/concerts/:id/seat-updates)
- Kiểm tra xem ghế được chọn có trong danh sách updates không
- Nếu có, hiển thị modal: "Sorry, ghế A1 vừa được mua. Chọn ghế khác?"
- **Gợi ý ghế thay thế:** Dùng Seat Recommendation Algorithm

**Seat Recommendation Algorithm:**
```
1. Input: seatNumber (A1), ticketTypeId, selectedSeats, availableSeats
2. Calculate recommendations:
   a. Filter: Chỉ lấy ghế AVAILABLE cùng ticket type
   b. Distance: Tính khoảng cách từ A1 đến mỗi ghế AVAILABLE
      - Dùng Euclidean distance trên SVG coordinates
      - distance = sqrt((x2-x1)^2 + (y2-y1)^2)
   c. Price match: Ưu tiên ghế có giá tương tự A1
      - weight = distance + |price_diff| / original_price * 0.5
   d. Sort: Sắp xếp theo weight tăng dần
   e. Return: Top 3-5 ghế gợi ý

3. Display: Hiển thị danh sách gợi ý với:
   - Ghế #
   - Vị trí (hàng, cột)
   - Giá
   - Distance so với ghế gốc
```

**UX Flow:**
```
Modal:
  "Ghế A1 vừa được mua. Chúng tôi gợi ý các ghế gần đó:"
  []
  ☐ A2 (Row A, Seat 2) - 500.000 VND - 20px away
  ☐ A3 (Row A, Seat 3) - 500.000 VND - 40px away
  ☐ B1 (Row B, Seat 1) - 500.000 VND - 35px away
  ☐ C1 (Row C, Seat 1) - 450.000 VND - 80px away
  
  [Choose & Continue] [Cancel]
```

**Implementation:**
- Frontend pre-calculate recommendations khi nhận WebSocket update
- Hoặc Backend trả recommendations trong update message: `"recommendations": [{seatNumber, distance, price}]`

### Edge Case 2: Kết nối mạng chậm, khán giả click rapid-fire

**Scenario:** Khán giả click nhanh vào 5 ghế trong 2 giây.

**Solution:**
- Frontend debounce click events (250ms)
- Hiển thị loading state trên UI
- Backend validate maxPerUser

### Edge Case 3: Multiple loại vé, chọn ghế từ nhiều khu vực

**Scenario:** Khán giả chọn 2 ghế VIP + 3 ghế Standard.

**Solution:**
- Lưu selection grouped by ticketTypeId
- Hiển thị riêng tab cho mỗi loại vé
- Tính tổng giá = sum(ghế VIP) + sum(ghế Standard)

### Edge Case 4: SVG file bị lỗi hoặc load chậm

**Scenario:** Sơ đồ SVG không load được sau 5 giây.

**Solution: Progressive Fallback Strategy**

**Phase 1: Timeout (5 giây)**
```
T=0s:     User khởi chạy page
T=0.5s:   Seatmap component bắt đầu fetch SVG
T=5s:     Timeout reached, SVG vẫn chưa load
          → Show fallback UI
```

**Phase 2: Fallback UI Tiers**

**Tier 1 - Text-based Seat Selection (10 seconds):**
```
Thay vì SVG map, hiển thị:
┌─────────────────────────────────────┐
│ Bản đồ ghế đang tải...              │
│                                     │
│ Chọn ghế bằng danh sách:            │
│                                     │
│ 🎫 Loại vé: [VIP ▼]                 │
│                                     │
│ Khu vực: [VIP Floor ▼]              │
│                                     │
│ Hàng A: [ ] [ ] [ ] [ ]             │
│ Hàng B: [ ] [ ] [ ] [ ]             │
│ Hàng C: [ ] [ ] [ ] [ ]             │
│                                     │
│ Ghế sẵn có: 45/100                  │
│ Tổng giá: 0 VND                     │
│          [Proceed] [Reload Map]     │
└─────────────────────────────────────┘
```

**Tier 2 - Simple Input Mode:**
Nếu text selection vẫn chưa work, cho phép nhập trực tiếp:
```
┌─────────────────────────────────────┐
│ Nhập số ghế muốn chọn:              │
│ (e.g. A1, VIP-05, B10)              │
│                                     │
│ [Ghế 1: _________ ]                 │
│ [Ghế 2: _________ ]                 │
│                                     │
│          [Add Seat] [Proceed]       │
└─────────────────────────────────────┘
```

**Phase 3: Retry & Recovery**
```
Nếu SVG load thành công (anytime):
  → Fade in SVG map
  → Overlay lên fallback UI (seamless transition)
  → Keep selected seats

Nếu vẫn fail sau 3 retry attempts:
  → Show error: "Sơ đồ ghế hiện tại không khả dụng."
  → Offer contact support
  → Still allow text-based selection để user có thể mua
```

**Code Example:**
```javascript
const SeatmapComponent = () => {
  const [svgLoaded, setSvgLoaded] = useState(false);
  const [loadTimeout, setLoadTimeout] = useState(false);
  
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!svgLoaded) {
        setLoadTimeout(true); // Show fallback
      }
    }, 5000);
    
    return () => clearTimeout(timer);
  }, [svgLoaded]);
  
  return (
    <>
      {loadTimeout && !svgLoaded && <FallbackUI />}
      <SVGMap onLoad={() => setSvgLoaded(true)} />
    </>
  );
};
```

**UX Principle:**
- Fallback UI không phải thất bại, mà là **graceful degradation**
- User có thể hoàn tất mua vé ngay cả khi map không load
- Không bao giờ block checkout vì SVG failure

### Error Codes

| Code | Message | Action |
|------|---------|--------|
| `SEAT_NOT_FOUND` | Ghế không tồn tại | Refresh & reload seatmap |
| `SEAT_NOT_AVAILABLE` | Ghế đã được bán | Update UI, gợi ý thay thế |
| `SEAT_HOLD_EXPIRED` | Ghế giữ chỗ hết hạn | Clear selection, request new reservation |
| `EXCEED_MAX_PER_USER` | Vượt quá số lượng mua tối đa | Show warning, disable thêm |
| `INVALID_REGION` | Khu vực không hợp lệ | Refresh seatmap |
| `SEATMAP_NOT_FOUND` | Không tìm thấy sơ đồ ghế | Load fallback |

---

## 9. Security Considerations

### Input Validation
- Validate seatNumber format (alphanumeric + dash/underscore)
- Validate concertId & ticketTypeId từ JWT token
- Limit số ghế query/purchase mỗi request

### Rate Limiting & Bot Protection

**Rate Limits:**
```
GET /concerts/:id/seatmap
  - 100 queries/minute per IP (chống scanner/bot)
  - 10 queries/minute per user/session (normal viewing)
  
POST /orders (order creation)
  - 10 requests/minute per user (chống bot click)
  - Trigger: API returns 429 Too Many Requests
  - Response header: Retry-After: 60
  
POST /seat-availability
  - 50 requests/minute per IP (bulk seat check)
```

**Bot Detection Strategy (ADR 5):**
1. **Token Bucket Algorithm:**
   - Mỗi user có bucket với capacity = maxRequests
   - Mỗi request tiêu tốn 1 token
   - Tokens refill ở rate = maxRequests / 60s
   - Nếu bucket empty → reject request (429)
   
2. **Virtual Waiting Room:**
   - Khi load cao (80.000 requests/5 min), trigger waiting room
   - User nhận waiting room token (TTL = 5 phút)
   - Chỉ user có valid token mới được POST /orders
   - Prevent thundering herd / DDoS

3. **Additional Signals (Optional):**
   - Fingerprint: Device ID, User-Agent, IP
   - Behavior: Click pattern, mouse movement, typing speed
   - Rapid fire detection: > 3 orders/10s từ user → flag

**Implementation:**
- Redis key: `rate-limit:{userId}:{endpoint}` (token bucket)
- Redis key: `waiting-room:{token}` (TTL 5 min)
- NestJS Guard: `@UseGuards(RateLimitGuard, WaitingRoomGuard)`

### Authorization
- Chỉ customer role mới được xem & select seat
- Đảm bảo userId từ JWT token match với user making purchase
- Organize chỉ có thể xem analytics seat map (read-only)
- RBAC + Resource Ownership Check (hybrid model từ design.md)

### Data Privacy
- Không expose seatNumber trước khi thanh toán thành công
- Không log seatNumber vào access logs (privacy concern)
- Mask seatNumber trong error messages (e.g., "Ghế *** đã bán")
- Hash seatNumber khi lưu Redis (không store plaintext)

---

## 10. Testing Strategy

### Unit Tests
- Seat state transitions
- Price calculation
- Validation rules

### Integration Tests
- API endpoints return correct data
- Redis updates reflected in subsequent queries
- WebSocket pushes correct updates

### E2E Tests
- User flow: view seatmap → select seats → checkout
- Real-time update: seat becomes unavailable during viewing
- Error scenarios: network failure, seat sold out, etc.

### Performance Tests
- Seatmap load time < 1 second
- Seat click response < 100ms
- WebSocket message delivery < 500ms

---

## 11. Implementation Notes

### Frontend Stack
- React/Next.js for UI
- SVG.js or D3.js for interactive SVG
- WebSocket library: Socket.io hoặc native WebSocket
- State management: Zustand hoặc Redux

### Backend Stack
- NestJS with Redis module
- WebSocket support via @nestjs/websockets
- Prisma ORM for seat metadata queries
- BullMQ for expiration jobs

### Redis Key Design 

**Per-Seat Status Keys:**
```
seat:{concertId}:{seatNumber}
  → Stored as: {
      "status": "AVAILABLE" | "RESERVED" | "SOLD",
      "userId": "user-id" (optional, if RESERVED),
      "reservedUntil": "2026-06-04T10:35:00Z" (TTL 10 min),
      "ticketTypeId": "tt1"
    }
  → TTL: 10 phút (khi RESERVED), vô hạn (khi SOLD)
  → Access pattern: Single seat query: HGET seat:{concertId}:A1 status
```

**Tồn Kho Summary Keys:**
```
stock:{concertId}:{ticketTypeId}
  → Stored as: {
      "available": 45,
      "reserved": 20,
      "sold": 35,
      "total": 100
    }
  → TTL: 1 phút (invalidate on every booking)
  → Access pattern: HGETALL stock:{concertId}:tt1
```

**Per-User Limit Keys:**
```
user-limit:{userId}:{ticketTypeId}
  → Stored as: {
      "paidQty": 2,
      "reservedQty": 3,
      "lastUpdated": "2026-06-04T10:30:00Z"
    }
  → TTL: vô hạn (phải explicitly delete/update)
  → Access pattern: HGETALL user-limit:{userId}:tt1
```

**Reservation TTL Keys:**
```
reservation:{orderId}
  → Stored as: {
      "concertId": "concert123",
      "userId": "user-id",
      "seats": [{seatNumber, ticketTypeId}],
      "expiresAt": "2026-06-04T10:40:00Z"
    }
  → TTL: 10 phút (auto expire)
  → Access pattern: GET reservation:{orderId}
```

**Rate Limit Token Bucket Keys:**
```
rate-limit:{userId}:post-orders
  → Stored as: {
      "tokens": 10,
      "lastRefill": "2026-06-04T10:30:00Z"
    }
  → TTL: 1 phút
  → Access pattern: HGET, HINCRBY (atomic ops)
```

**Bulk Queries (Performance Optimization):**
```
// Lấy trạng thái nhiều ghế cùng lúc:
MGET seat:{concertId}:A1 seat:{concertId}:A2 seat:{concertId}:A3

// Hoặc dùng Redis Pipe:
Pipeline
  .HGET(seat:{concertId}:A1, 'status')
  .HGET(seat:{concertId}:A2, 'status')
  .HGET(seat:{concertId}:A3, 'status')
  .exec()
```

### Database Queries
- Seat status: Redis (query directly, not cached)
- Seat metadata: PostgreSQL (denormalized copy of SVG data)
- Reservation: Redis TTL + PostgreSQL Order.expiresAt (dual source)
- UserTicketCounter: PostgreSQL (source of truth untuk paidQty + reservedQty)

### Deployment
- SVG files: Object Storage (MinIO / Supabase)
- Seatmap service: Stateless, horizontal scaling
- WebSocket: Redis Pub/Sub for multi-instance (instead of sticky session)
  * Backend A publish update → Redis channel "seatmap:{concertId}"
  * Tất cả connected clients (across all instances) nhận update
  * Ensures consistency across nodes

---

## 12. Future Enhancements

- Dynamic pricing based on seat popularity (surge pricing)
- Seat recommendation algorithm based on user preferences
- Bundle deals (buy 2+ seats in same region, get discount)
- Virtual seat preview (3D view)
- Accessibility features (high contrast, screen reader support)
- Integration with analytics (heatmap of most popular seats)