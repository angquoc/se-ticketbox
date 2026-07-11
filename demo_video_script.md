# KỊCH BẢN QUAY VIDEO DEMO ĐỒ ÁN TICKETBOX
## ĐỒ ÁN MÔN HỌC - HỆ THỐNG PHÂN PHỐI VÀ SOÁT VÉ TICKETBOX

---

## 1. TIMELINE TOÀN BỘ VIDEO (TỔNG THỜI LƯỢNG DỰ KIẾN: 42 PHÚT)

*   **00:00 - 02:00 | GIỚI THIỆU CHUNG (Tất cả / Ngọc đại diện giới thiệu)**
    *   Giới thiệu đề tài, bối cảnh concert quá tải, mục tiêu demo.
    *   Trình bày sơ bộ kiến trúc hệ thống (PostgreSQL, Redis, MinIO S3, BullMQ Worker) và 4 phân hệ tương ứng với 4 thành viên.
*   **02:00 - 12:00 | PHẦN 1: CUSTOMER FLOW & CORE BOOKING (Người trình bày: Ngọc)**
    *   Xem danh sách concert, sơ đồ SVG tương tác.
    *   Đặt giữ chỗ tạm thời (Reservation), **giả lập TTL 10 giây để demo tự động hủy đơn hết hạn & hoàn kho**.
    *   Thanh toán qua cổng Mock MoMo/VNPAY, nhận E-ticket QR.
    *   Giới hạn mua vé per-user, chống trừ tiền 2 lần (Idempotency) trên API.
    *   Giải thích code: SVG Seatmap, Order Service, Redis Lua Script (`reserve-ticket.lua`), Idempotency Interceptor.
*   **12:00 - 21:30 | PHẦN 2: CHECK-IN PWA & GATE MANAGEMENT (Người trình bày: Hương)**
    *   Staff chọn Gate, soát vé Online, chặn Double Check-in (Online), check Gate Mismatch.
    *   Soát vé Offline (Airplane mode), kiểm tra Local Signature & Local Double Check-in guard trên IndexedDB.
    *   Auto-sync dữ liệu khi kết nối mạng phục hồi, xử lý Idempotency Sync.
    *   Giải thích code: `useOfflineCheckin.ts` (IndexedDB logic), `checkin.service.ts` (atomic update).
*   **21:30 - 31:30 | PHẦN 3: ADMIN WEB, RBAC, AI BIO & VIP GUEST LIST (Người trình bày: Ân)**
    *   RBAC kiểm soát truy cập (Customer vs Organizer vs Staff).
    *   Mở nhanh Dashboard doanh thu của Organizer, xem biểu đồ doanh thu và các StatCards.
    *   CRUD Concert, thực hiện thao tác **Cancel Concert** (Hủy sự kiện), Resource Ownership Check.
    *   AI Artist Bio: Upload PDF press kit -> Hàng chờ BullMQ -> AI sinh Bio hiển thị cho khách hàng. **Làm rõ kịch bản xử lý khi AI sập/lỗi**.
    *   Đồng bộ Guest List CSV: Upload file -> background worker import -> báo cáo chi tiết file lỗi/trùng.
    *   Giải thích code: `roles.guard.ts`, ownership validation, AI processor (`ai-bio.processor.ts`), CSV import worker.
*   **31:30 - 41:00 | PHẦN 4: NON-FUNCTIONAL TESTS & RESILIENCE (Người trình bày: Dương)**
    *   Redis Caching (Hit/Miss) và invalidation khi mua thành công.
    *   Spam API Rate Limiting (Token Bucket) qua terminal tool.
    *   Circuit Breaker cổng thanh toán (sập cổng -> CB Open -> suy thoái mềm dẻo).
    *   Tranh chấp vé SVIP cuối dưới tải cao (overselling prevention) và per-user limits under load.
    *   Email Notifications: Gửi mail xác nhận thanh toán & email nhắc nhở tự động trước 24 giờ diễn ra (delayed job). Nhấn mạnh **kiến trúc Notification dễ mở rộng sang Zalo OA/SMS**.
    *   Giải thích code: `token-bucket.lua`, Opossum Circuit Breaker service, cache invalidation decorator, `reminder.service.ts`, `notification.processor.ts`.
*   **41:00 - 42:00 | TỔNG KẾT & KẾT LUẬN (Tất cả)**
    *   Đánh giá mức độ hoàn thiện đồ án và đúc kết kỹ thuật.

---

## 2. KỊCH BẢN CHI TIẾT CHO TỪNG THÀNH VIÊN (CÓ LỜI THOẠI CHI TIẾT TỪNG TỪ)

---

### PHẦN 1: CUSTOMER FLOW & CORE BOOKING
*   **Người trình bày**: **Ngọc**
*   **Thời lượng dự kiến**: 10 phút 00 giây (02:00 - 12:00)
*   **Mục tiêu**:
    *   Chứng minh giao diện khách khán giả trực quan, mượt mà.
    *   Chứng minh luồng đặt giữ vé thành công bằng Redis Lua Script, thanh toán giả lập & phát hành vé QR.
    *   Chứng minh tính năng **hủy đơn hàng hết hạn (Order Timeout)** tự động thu hồi vé trả về kho hàng.
    *   Chứng minh cơ chế chặn giới hạn vé trên mỗi user (per-user limit) và cơ chế chống trừ tiền 2 lần (Idempotency) chạy đúng thực tế.

#### Kịch bản chi tiết & Các bước demo:
1.  **Bước 1: Duyệt danh sách Concert & Sơ đồ ghế SVG (Thời gian: 02:00 - 03:30)**
    *   *Màn hình mở*: Browser (Customer Web: `http://localhost:3000`).
    *   *Thao tác*: Đăng nhập tài khoản `customer-t1-01@example.com`. Chọn xem chi tiết concert `concert-purchase-momo`. Click vào khu vực mua vé để hiện sơ đồ SVG tương tác. Di chuột qua các phân khu (GA, SVIP, VIP, CAT1, CAT2) để thấy số vé còn lại thay đổi real-time.
    *   *Lời thoại chi tiết*: 
        > *"Xin chào thầy và các bạn, mình là Ngọc. Trong video demo hôm nay, mình sẽ đại diện nhóm bắt đầu với phân hệ dành cho khán giả và luồng mua vé cốt lõi của TicketBox. Như thầy có thể thấy trên màn hình, mình đang truy cập vào trang chủ của TicketBox dưới tài khoản khách hàng `customer-t1-01@example.com`. Trực quan giao diện hiển thị các concert lớn như Anh Trai Say Hi hay Chị Đẹp Đạp Gió Rẽ Sóng. Mình click vào chi tiết concert 'concert-purchase-momo'. Khi giao diện hiện ra, mình chọn mua vé. Ngay lập tức, sơ đồ ghế SVG tương tác xuất hiện. Sơ đồ này chia rõ các khu vực SVIP, VIP, GA... theo đúng cấu hình của ban tổ chức. Khi mình di chuột qua các phân khu, số lượng vé còn lại hiển thị và thay đổi theo thời gian thực. Cơ chế này được đồng bộ trực tiếp từ cache Redis, đảm bảo khách hàng nắm bắt được tình trạng vé thực tế cực kỳ trực quan và nhanh chóng mà không gây nghẽn database."*
2.  **Bước 2a: Đặt giữ chỗ tạm thời (Reservation) & Thanh toán Mock (Thời gian: 03:30 - 05:00)**
    *   *Màn hình mở*: Customer Web, Terminal (Redis Monitor hoặc Terminal log của Backend).
    *   *Thao tác*: Chọn mua 1 vé loại SVIP của concert `concert-purchase-momo`. Bấm "Tiếp tục thanh toán". Show cửa sổ chuyển tiếp sang cổng thanh toán giả lập MoMo.
    *   *Terminal*: Show log Backend nhận request tạo order, gọi Redis Lua Script và trả về URL payment.
    *   *Thao tác tiếp*: Bấm "Thanh toán THÀNH CÔNG" trên trang Mock. Giao diện tự động chuyển về trang "My Tickets" trên Web, hiển thị E-ticket kèm mã QR Code chứa token mã hóa.
    *   *Lời thoại chi tiết*:
        > *"Bây giờ, mình sẽ chọn mua 1 vé loại SVIP và bấm nút 'Tiếp tục thanh toán'. Hệ thống sẽ tự động chuyển hướng mình sang trang cổng thanh toán giả lập MoMo. Tại thời điểm này, backend đã tiếp nhận request của mình, ghi nhận đơn hàng ở trạng thái PENDING_PAYMENT trong PostgreSQL, đồng thời kích hoạt việc trừ tồn kho tạm thời trong Redis. Nhìn vào log terminal của backend, thầy có thể thấy log giao dịch khởi tạo giữ chỗ thành công với ID của đơn hàng. Mình sẽ bấm chọn nút 'Thanh toán THÀNH CÔNG' trên trang Mock MoMo. Cổng thanh toán sẽ gửi một webhook báo trạng thái thành công về cho backend. Backend xử lý webhook, cập nhật trạng thái đơn hàng thành PAID, và tự động tạo bản ghi Ticket mới. Giao diện web của mình đã tự động chuyển hướng về trang 'My Tickets', hiển thị thông tin vé kèm theo mã QR Code chứa thông tin vé và chữ ký số an toàn. Khán giả cũng nhận được một email xác nhận đơn hàng gửi tới inbox."*
3.  **Bước 2b: Hết hạn giữ chỗ (Reservation Timeout) & Tự động hoàn kho (Thời gian: 05:00 - 06:00)**
    *   *Màn hình mở*: Customer Web, Terminal logs, Database hoặc Redis CLI.
    *   *Thao tác*: Giải thích việc tạm thời sửa cấu hình TTL giữ chỗ trong file config thành 10 giây để demo trực quan mà không cần đợi 15 phút. Tiến hành đặt mua 1 vé SVIP của concert nhưng cố tình dừng lại ở trang Mock Payment và không click thanh toán. Chờ 10 giây.
    *   *Terminal*: Show log Worker BullMQ bắt đầu thực thi job `expire` cho đơn hàng đó.
    *   *Kiểm tra kết quả*: Tải lại database hoặc Redis CLI show tồn kho vé tăng ngược lại 1, trạng thái Order chuyển sang `EXPIRED`.
    *   *Lời thoại chi tiết*:
        > *"Để chứng minh tính năng tự động giải phóng vé khi hết hạn giữ chỗ mà không bắt mọi người phải đợi 15 phút, mình đã tạm cấu hình lại thời gian giữ chỗ (Reservation TTL) trong code là 10 giây. Bây giờ, mình sẽ tạo một đơn hàng đặt giữ vé SVIP khác, nhưng mình sẽ cố tình để im trang thanh toán và không bấm nút xác nhận. Chúng ta cùng theo dõi log của terminal bên tay phải. Đúng 10 giây trôi qua, thầy có thể thấy worker BullMQ lập tức nhận tác vụ 'expire' và log dòng chữ 'Processing expire job...'. Khi tải lại database, trạng thái đơn hàng đã tự động chuyển sang 'EXPIRED'. Kiểm tra số lượng vé khả dụng trong Redis CLI bằng lệnh `get stock:<ticketTypeId>`, tồn kho đã tự động được cộng trả lại đúng 1 vé để những khán giả khác có thể vào mua, đảm bảo tính công bằng của hệ thống."*
4.  **Bước 3: Chặn giới hạn mua per-user & Chống trừ tiền 2 lần (Thời gian: 06:00 - 08:00)**
    *   *Màn hình mở*: Customer Web, Postman.
    *   *Thao tác*: Sử dụng tài khoản `customer-t1-03@example.com` (Concert `concert-purchase-limits` có cấu hình mua tối đa 1 vé SVIP/tài khoản). Tiến hành mua thành công 1 vé SVIP. Sau đó, cố tình đặt thêm 1 vé SVIP nữa -> Hệ thống báo lỗi đỏ: `EXCEED_USER_LIMIT` (Vượt quá giới hạn mua vé).
    *   *Thao tác Postman*: Gửi request tạo Order với Header `Idempotency-Key: test-idemp-key-123` lên `/orders`. Gửi tiếp request y hệt lần 2 lập tức.
    *   *Kết quả*: Request 2 nhận được đúng kết quả của Request 1 từ cache/DB, không tạo thêm order dư thừa nào trong DB.
    *   *Lời thoại chi tiết*:
        > *"Tiếp theo, mình sẽ chứng minh cơ chế giới hạn vé per-user để ngăn chặn đầu cơ vé. Mình đăng nhập tài khoản `customer-t1-03@example.com` đối với concert 'concert-purchase-limits', nơi ban tổ chức giới hạn tối đa 1 vé SVIP trên mỗi tài khoản. Mình đã mua thành công 1 vé trước đó. Bây giờ mình cố tình đặt thêm vé SVIP thứ hai. Hệ thống lập tức từ chối ở bước tạo order và trả về thông báo lỗi màu đỏ nổi bật: 'Vượt quá giới hạn mua vé per-user'. Cơ chế này được kiểm tra trên toàn bộ các đơn hàng đã thanh toán thành công của tài khoản chứ không chỉ trên đơn hàng hiện tại.
        Đồng thời, để bảo vệ hệ thống khỏi tình trạng trừ tiền hai lần khi người dùng bấm mua liên tục hoặc kết nối mạng chập chữa, chúng mình áp dụng cơ chế chống trùng lặp Idempotency-Key. Mình sẽ gửi thử 1 request tạo Order trên Postman với header `Idempotency-Key: test-idemp-key-123`. Khi request đầu tiên đang được xử lý, mình gửi tiếp request thứ hai với cùng key. Như thầy thấy trên màn hình Postman, request thứ hai trả về ngay lập tức kết quả của request thứ nhất từ Redis cache mà không hề tạo thêm bản ghi order hay trừ tồn kho dư thừa nào trong Database."*
5.  **Bước 4: Giải thích Source Code (Thời gian: 08:00 - 12:00)**
    *   *File code cần mở*:
        *   [InteractiveSeatMap.tsx](file:///d:/Dang/TKPM/DA/ticketbox/src/frontend/customer-web/components/seatmap/InteractiveSeatMap.tsx) (Xem cách hiển thị phân khu GA, VIP, SVIP).
        *   [SeatMapPage.tsx](file:///d:/Dang/TKPM/DA/ticketbox/src/frontend/customer-web/components/seatmap/SeatMapPage.tsx) (Quản lý luồng tương tác và lưu state).
        *   [order.service.ts](file:///d:/Dang/TKPM/DA/ticketbox/src/backend/src/modules/order/order.service.ts) (Xem hàm `createOrder` và logic tích hợp Redis/BullMQ).
        *   [reserve-ticket.lua](file:///d:/Dang/TKPM/DA/ticketbox/src/backend/src/modules/redis/scripts/reserve-ticket.lua) (Giải thích cơ chế atomic kiểm tra tồn kho & per-user limit).
        *   [idempotency.interceptor.ts](file:///d:/Dang/TKPM/DA/ticketbox/src/backend/src/common/interceptors/idempotency.interceptor.ts) (Giải thích cách intercept header `Idempotency-Key` lưu trong Redis).
    *   *Lời thoại chi tiết*:
        > *"Để hiện thực hóa các cơ chế nghiệp vụ và kỹ thuật trên, mình xin giải thích sơ bộ các đoạn code then chốt. Đầu tiên là file [InteractiveSeatMap.tsx](file:///d:/Dang/TKPM/DA/ticketbox/src/frontend/customer-web/components/seatmap/InteractiveSeatMap.tsx) và [SeatMapPage.tsx](file:///d:/Dang/TKPM/DA/ticketbox/src/frontend/customer-web/components/seatmap/SeatMapPage.tsx). Đây là nơi chúng mình xử lý việc hiển thị sơ đồ SVG động, ánh xạ tọa độ ghế với dữ liệu vé từ backend để tô màu trạng thái trống hoặc đã bán theo thời gian thực.
        Về luồng giữ chỗ, trong file [order.service.ts](file:///d:/Dang/TKPM/DA/ticketbox/src/backend/src/modules/order/order.service.ts) tại hàm `createOrder`, hệ thống không ghi nhận ngay vào database Postgres để tránh deadlock dưới tải cao, mà thực hiện gọi qua Redis Service để thực thi file Lua Script [reserve-ticket.lua](file:///d:/Dang/TKPM/DA/ticketbox/src/backend/src/modules/redis/scripts/reserve-ticket.lua).
        Mở file Lua Script [reserve-ticket.lua](file:///d:/Dang/TKPM/DA/ticketbox/src/backend/src/modules/redis/scripts/reserve-ticket.lua), thầy có thể thấy toàn bộ các bước kiểm tra tồn kho còn lại, kiểm soát số lượng vé user đã mua đối chiếu với giới hạn của concert được thực hiện hoàn toàn trong Redis. Vì Redis xử lý đơn luồng, việc chạy script này đảm bảo tính nguyên tử (atomic) tuyệt đối — không bao giờ xảy ra race condition giữa hàng vạn request đồng thời. Sau khi đặt giữ chỗ thành công trong Redis, chúng mình thêm một job delayed có tên `expire` vào `expireQueue` của BullMQ với thời gian delay cấu hình. Khi job kích hoạt, `order-expire.processor.ts` sẽ gọi hàm `expireOrder` để thu hồi và cộng trả lại tồn kho nguyên tử.
        Cuối cùng, cơ chế chống trừ tiền hai lần được cài đặt trong file [idempotency.interceptor.ts](file:///d:/Dang/TKPM/DA/ticketbox/src/backend/src/common/interceptors/idempotency.interceptor.ts). Đây là một NestJS Interceptor chặn các request POST. Nó kiểm tra header `Idempotency-Key`, băm key này cùng với ID của user và lưu trạng thái vào Redis dưới dạng lock tạm thời. Nếu phát hiện request trùng lặp đang được xử lý, nó bắt client phải chờ; nếu request trước đó đã hoàn tất, nó trả về ngay response đã lưu trong Redis cache để đảm bảo an toàn tuyệt đối cho giao dịch tài chính. Sau đây, mình xin nhường phần trình bày soát vé sự kiện cho bạn Hương."*

#### Lỗi có thể gặp và cách xử lý khi demo:
*   *Lỗi*: Giao dịch VNPAY/MoMo mock bị treo hoặc không nhận được callback webhook do mạng local.
*   *Xử lý*: Chuẩn bị sẵn một endpoint webhook phụ trên Postman để trigger callback bằng tay, hoặc show log backend đã bắt được event nhưng bị nghẽn port để chứng minh flow hoạt động bình thường.

#### Kết quả mong đợi:
*   Mua vé mượt mà, QR code sinh ra đúng chuẩn định dạng bảo mật (`ticketId:token:gateId`).
*   Tự động hủy giữ chỗ khi quá giờ, hoàn kho vé Redis chuẩn xác.
*   Chặn per-user limit chính xác. Request trùng idempotency key trả về cùng kết quả mà không làm nhân đôi bản ghi order.

---

### PHẦN 2: CHECK-IN PWA & GATE MANAGEMENT
*   **Người trình bày**: **Hương**
*   **Thời lượng dự kiến**: 9 phút 30 giây (12:00 - 21:30)
*   **Mục tiêu**:
    *   Chứng minh tính năng soát vé di động (Mobile PWA) hoạt động thực tế.
    *   Chứng minh cơ chế an toàn: Ràng buộc Gate, ngăn chặn Double Check-in (Online).
    *   Chứng minh cơ chế offline đột phá: Soát vé ngoại tuyến không cần mạng, lưu hàng đợi IndexedDB, tự động sync khi online lại, và chặn trùng lặp chẽ ngay cả khi offline (Local Double Check-in guard).

#### Kịch bản chi tiết & Các bước demo:
1.  **Bước 1: Đăng nhập Staff & Chọn Cổng Soát Vé (Thời gian: 12:00 - 13:30)**
    *   *Màn hình mở*: Browser giả lập thiết bị di động (Check-in PWA: `http://localhost:3003`).
    *   *Thao tác*: Đăng nhập tài khoản `staff-t2-01@ticketbox.vn`. Chọn sự kiện `concert-checkin-online`, chọn hoạt động tại cổng `GATE-A`.
    *   *Lời thoại chi tiết*:
        > *"Xin chào thầy và các bạn, mình là Hương. Tiếp theo phần trình bày của bạn Ngọc, sau khi khách hàng mua vé thành công và nhận mã QR, mình sẽ phụ trách demo luồng soát vé tại cổng sự kiện thông qua ứng dụng di động Check-in PWA. Hiện tại mình đang mở giao diện PWA được thiết kế tối ưu cho di động trên cổng 3003. Mình đăng nhập bằng tài khoản nhân sự soát vé `staff-t2-01@ticketbox.vn`. Sau khi đăng nhập thành công, hệ thống yêu cầu mình chọn sự kiện đang diễn ra, mình chọn 'concert-checkin-online' và chọn cổng soát vé được phân công là 'GATE-A'. Thiết bị soát vé lúc này đã được định danh và sẵn sàng quét mã QR."*
2.  **Bước 2: Soát vé trực tuyến & Chặn lỗi (Thời gian: 13:30 - 16:00)**
    *   *Màn hình mở*: PWA Web, Database (table `CheckinLog` và `Ticket`).
    *   *Thao tác 1 (Soát hợp lệ)*: Quét mã QR của khách hàng `customer-t2-01` (hợp lệ cho `GATE-A`). Hệ thống báo xanh: "Soát vé thành công". Show DB cập nhật status vé sang `CHECKED_IN` và log thành công.
    *   *Thao tác 2 (Chặn Double Check-in)*: Quét lại chính mã QR vừa rồi. PWA báo đỏ: "VÉ ĐÃ ĐƯỢC CHECK-IN TRƯỚC ĐÓ". Show log DB ghi nhận status `ALREADY_CHECKED_IN`.
    *   *Thao tác 3 (Sai cổng - Gate Mismatch)*: Đăng nhập Gate `GATE-B` nhưng quét vé được cấp cho `GATE-A` (`customer-t2-04`). PWA báo đỏ: "SAI CỔNG VÀO - YÊU CẦU ĐẾN CỔNG GATE-A". Giao diện show rõ lỗi.
    *   *Lời thoại chi tiết*:
        > *"Đầu tiên, mình kiểm tra luồng trực tuyến khi thiết bị soát vé có kết nối mạng ổn định. Mình thực hiện quét mã QR của khách hàng `customer-t2-01` có vé được chỉ định vào cổng GATE-A. Ngay lập tức, màn hình PWA hiện màu xanh lá kèm thông báo 'Soát vé thành công'. Kiểm tra cơ sở dữ liệu Postgres, bản ghi của vé đã chuyển trạng thái từ `ISSUED` sang `CHECKED_IN`, đồng thời bảng `CheckinLog` được ghi nhận một dòng thành công.
        Bây giờ, nếu khách hàng này cố tình gian lận bằng cách chuyển tiếp mã QR này cho một người khác để quét vào cổng lần hai, mình sẽ quét lại chính mã QR này. Như thầy thấy, giao diện PWA lập tức báo lỗi màu đỏ nổi bật: 'VÉ ĐÃ ĐƯỢC CHECK-IN TRƯỚC ĐÓ' và chặn lại. 
        Đồng thời, để tránh khán giả đi nhầm cổng gây hỗn loạn tại sân vận động, hệ thống ràng buộc chặt chẽ cổng vào. Mình sẽ đổi cấu hình thiết bị sang cổng soát vé 'GATE-B', sau đó thực hiện quét một chiếc vé được gán cho cổng 'GATE-A' của tài khoản `customer-t2-04`. PWA lập tức từ chối và hiển thị thông báo lỗi màu đỏ rõ ràng: 'SAI CỔNG VÀO - YÊU CẦU ĐẾN CỔNG GATE-A' để hướng dẫn khán giả di chuyển về đúng khu vực."*
3.  **Bước 3: Soát vé ngoại tuyến (Offline) & Đồng bộ (Sync) (Thời gian: 16:00 - 18:00)**
    *   *Màn hình mở*: PWA Web (DevTools -> Network -> Offline / Bật Airplane Mode).
    *   *Thao tác 1 (Offline Scan)*: Ngắt mạng trên trình duyệt. Badge góc màn hình chuyển sang màu đỏ "OFFLINE". Quét QR vé `customer-t2-02` (trạng thái `ISSUED`). Giao diện báo xanh: "Soát vé thành công ngoại tuyến". Số lượng bản ghi chờ sync ở badge tăng lên `1`.
    *   *Thao tác 2 (Offline Double Check-in Guard)*: Quét lại vé `customer-t2-02` một lần nữa khi vẫn đang offline. Hệ thống báo đỏ ngay lập tức: "VÉ ĐÃ ĐƯỢC CHECK-IN TRƯỚC ĐÓ".
    *   *Thao tác 3 (Đồng bộ)*: Bật lại mạng (DevTools -> Network -> Online). PWA tự động phát hiện mạng và gửi API sync. Badge chờ sync quay về `0`.
    *   *Kiểm tra database*: Bảng `CheckinLog` xuất hiện bản ghi với trạng thái `SUCCESS`, trường `isOffline` là `true`. Vé của `customer-t2-02` đã chuyển sang `CHECKED_IN`.
    *   *Lời thoại chi tiết*:
        > *"Tại các địa điểm tổ chức concert lớn như sân vận động Mỹ Đình, sóng 4G thường bị sập hoàn toàn do lượng người tập trung quá đông. Để giải quyết, TicketBox hỗ trợ soát vé ngoại tuyến. Mình sẽ giả lập mất mạng bằng cách chuyển mục Network trong Chrome DevTools sang chế độ 'Offline'. Badge trạng thái trên header PWA lập tức chuyển sang màu đỏ báo hiệu 'OFFLINE'.
        Bây giờ, mình quét mã QR của vé `customer-t2-02`. Như thầy thấy, ứng dụng PWA vẫn báo màu xanh lá: 'Soát vé thành công ngoại tuyến'. Bản ghi soát vé được đưa vào hàng đợi IndexedDB và badge chờ đồng bộ tăng lên số 1.
        Đặc biệt, để chặn triệt để hành vi dùng một vé quét nhiều lần ở chế độ offline, chúng mình đã xây dựng cơ chế Local Duplicate Guard. Mình thực hiện quét lại chính chiếc vé `customer-t2-02` khi thiết bị vẫn đang mất mạng. PWA lập tức phát hiện vé này đã được quét trước đó trong IndexedDB cục bộ và báo đỏ: 'VÉ ĐÃ ĐƯỢC CHECK-IN TRƯỚC ĐÓ'. Điều này giúp nhân viên ngăn chặn kịp thời ngay tại cổng mà không cần chờ kết nối server.
        Sau khi sự kiện kết thúc hoặc sóng mạng phục hồi, mình chuyển trình duyệt lại chế độ 'Online'. Hệ thống tự động phát hiện mạng và kích hoạt tiến trình đồng bộ dữ liệu (Sync). Nó gọi API `POST /checkin/sync` để tải dữ liệu soát offline lên backend. Badge chờ sync đã biến mất. Truy vấn database PostgreSQL, bản ghi `CheckinLog` của vé `customer-t2-02` đã xuất hiện với trạng thái `SUCCESS` và trường `isOffline = true`."*
4.  **Bước 4: Giải thích Source Code (Thời gian: 18:00 - 21:30)**
    *   *File code cần mở*:
        *   [useOfflineCheckin.ts](file:///d:/Dang/TKPM/DA/ticketbox/src/frontend/checkin-pwa/src/hooks/useOfflineCheckin.ts) (Giải thích hàm `handleScan`, check duplicate offline `hasTicketBeenScanned` và logic ghi IndexedDB `saveCheckinLog`).
        *   [checkin.service.ts](file:///d:/Dang/TKPM/DA/ticketbox/src/backend/src/modules/checkin/checkin.service.ts) (Giải thích hàm `syncOfflineLogs` và cơ chế chống conflict idempotency bằng cách đối chiếu `deviceId` + `offlineEventId`).
    *   *Lời thoại chi tiết*:
        > *"Bây giờ mình xin giải thích cách hoạt động của cơ chế offline trong code. Trong file hook frontend [useOfflineCheckin.ts](file:///d:/Dang/TKPM/DA/ticketbox/src/frontend/checkin-pwa/src/hooks/useOfflineCheckin.ts) tại hàm `handleScan`, khi phát hiện thiết bị mất mạng, PWA không gọi API verify lên server. Thay vào đó, nó kiểm tra chữ ký mã hóa của QR (Local Signature Verification) bằng QR secret để đảm bảo QR không bị làm giả. Tiếp theo, hệ thống thực thi lệnh `await hasTicketBeenScanned(parsed.ticketId)`. Hàm này sẽ kiểm tra xem ID vé này đã tồn tại trong IndexedDB của thiết bị hay chưa để từ chối quét trùng lập tức. If hợp lệ, nó sẽ gọi hàm `saveCheckinLog` để đẩy bản ghi offline vào IndexedDB trình duyệt.
        Về phía Backend, trong file [checkin.service.ts](file:///d:/Dang/TKPM/DA/ticketbox/src/backend/src/modules/checkin/checkin.service.ts) tại hàm `syncOfflineLogs`, chúng mình cung cấp API đồng bộ. Khi nhận mảng dữ liệu offline từ các thiết bị staff gửi lên, backend thực thi các câu lệnh cập nhật trạng thái vé nguyên tử. Nhờ cấu hình khóa duy nhất `@@unique([deviceId, offlineEventId])` trong cơ sở dữ liệu, nếu một thiết bị gửi gói tin đồng bộ nhiều lần do mạng chập chờn, backend sẽ loại bỏ trùng lặp một cách an toàn mà không làm sinh log rác. Tiếp theo, bạn Ân sẽ trình bày về giao diện quản trị Admin."*

#### Lỗi có thể gặp và cách xử lý khi demo:
*   *Lỗi*: Trình duyệt không kích hoạt trigger sự kiện `online` tự động sau khi tắt giả lập offline.
*   *Xử lý*: Bấm nút "Sync" thủ công được thiết kế sẵn trên giao diện để cưỡng bức gửi request.

#### Kết quả mong đợi:
*   Soát vé online nhanh chóng, chặn lộn cổng và vé quét trùng.
*   Soát offline báo trạng thái rõ ràng, chặn vé quét trùng offline bằng local DB check, sync lên server ghi nhận đúng dữ liệu, đúng trạng thái check-in.

---

### PHẦN 3: ADMIN WEB, RBAC, AI BIO & VIP GUEST LIST
*   **Người trình bày**: **Ân**
*   **Thời lượng dự kiến**: 10 phút 00 giây (21:30 - 31:30)
*   **Mục tiêu**:
    *   Chứng minh cơ chế an toàn thông tin: Phân quyền vai trò người dùng (RBAC), kiểm soát tài nguyên giữa các Organizer (Ownership check).
    *   Chứng minh giao diện Admin Dashboard trực quan: **Mở nhanh dashboard doanh thu của Organizer** hiển thị các StatCard và RevenueChart.
    *   Chứng minh nghiệp vụ quản lý vòng đời sự kiện: Thực hiện CRUD Concert và **thao tác Cancel Concert (Hủy sự kiện)** trực quan trên giao diện.
    *   Chứng minh tích hợp AI thực tế: Tải file PDF press kit -> AI sinh mô tả Artist Bio hiển thị lên trang bán vé. **Chứng minh cơ chế chịu lỗi và ghi nhận log lỗi khi dịch vụ AI gặp sự cố sập**.
    *   Chứng minh xử lý đồng bộ CSV: Đọc và import hàng loạt danh sách khách mời VIP trong nền thông qua hàng đợi BullMQ, ghi nhận lỗi chi tiết.

#### Kịch bản chi tiết & Các bước demo:
1.  **Bước 1: RBAC, Dashboard Doanh Thu & CRUD/Cancel Concert (Thời gian: 21:30 - 24:30)**
    *   *Màn hình mở*: Browser (Admin Web: `http://localhost:3002`).
    *   *Thao tác 1 (RBAC chặn)*: Thử lấy token của tài khoản Customer truy cập trang Admin -> Bị điều hướng hoặc chặn hiển thị dữ liệu. Gửi request tạo concert bằng tài khoản customer qua API -> Trả về lỗi `403 Forbidden`.
    *   *Thao tác 2 (Mở Dashboard Doanh Thu)*: Đăng nhập tài khoản `organizer-t3-01@ticketbox.vn`. Tại màn hình trang chủ Admin Web, hiển thị nhanh giao diện thống kê doanh thu gồm các StatCards chỉ số và biểu đồ doanh thu RevenueChart.
    *   *Thao tác 3 (CRUD Concert)*: Tiến hành tạo concert mới ở dạng `DRAFT`, cấu hình các loại vé (SVIP, VIP, GA). Cập nhật trạng thái sang `PUBLISHED`.
    *   *Thao tác 4 (Cancel Concert)*: Tại phần cấu hình sự kiện mới tạo, click vào nút "Cancel Event" trên thanh StatusStepper, bấm xác nhận "Yes, Cancel Event". Trạng thái concert đổi thành CANCELLED màu đỏ.
    *   *Thao tác 5 (Ownership chặn)*: Đăng nhập tài khoản `organizer-t3-02@ticketbox.vn` (Organizer khác). Cố tình gửi API sửa đổi một concert khác của Organizer 1 -> Nhận lỗi `403 Forbidden`.
    *   *Lời thoại chi tiết*:
        > *"Chào thầy và các bạn, mình là Ân. Ở phần này, mình sẽ trình bày các chức năng dành cho ban tổ chức sự kiện và quản trị viên hệ thống trên trang Admin Web ở port 3002.
        Đầu tiên, hệ thống áp dụng cơ chế phân quyền RBAC cực kỳ chặt chẽ. Mình đang thử đăng nhập bằng tài khoản Customer thông thường và truy cập trang Admin. Giao diện ngay lập tức từ chối và chuyển hướng mình ra ngoài. Khi mình thử gửi request trực tiếp bằng Postman để gọi API tạo concert `POST /admin/concerts` kèm JWT của customer, backend lập tức phản hồi mã lỗi `403 Forbidden` và không ghi nhận bất cứ thay đổi nào vào DB.
        Bây giờ, mình đăng nhập bằng tài khoản của Ban tổ chức sự kiện `organizer-t3-01@ticketbox.vn`. Màn hình đầu tiên xuất hiện chính là Dashboard quản trị doanh thu. Như thầy có thể thấy trực quan, chúng mình đã xây dựng các StatCard hiển thị doanh thu tổng, số lượng vé bán ra, tỷ lệ chuyển đổi, kết hợp cùng biểu đồ RevenueChart biểu thị biến động doanh thu theo ngày rất sinh động và hiện đại.
        Tiếp theo, mình sẽ thực hiện tạo một concert mới ở dạng 'DRAFT', cấu hình 3 loại vé gồm SVIP giới hạn mua 1 vé, VIP giới hạn 2 vé, và GA giới hạn 4 vé trên mỗi tài khoản. Sau đó mình bấm cập nhật trạng thái concert sang 'PUBLISHED' để công bố ra hệ thống bán vé tự động.
        Đặc biệt, để quản lý vòng đời sự kiện khi gặp sự cố bất khả kháng, ban tổ chức có thể hủy concert trực tiếp. Tại thanh StatusStepper bên phải màn hình chi tiết concert này, mình click chọn 'Cancel Event', sau đó xác nhận 'Yes, Cancel Event'. Giao diện lập tức chuyển trạng thái sang CANCELLED màu đỏ nổi bật. Concert này sẽ tự động ẩn khỏi giao diện mua vé của khách hàng và vô hiệu hóa mọi lượt soát vé liên quan.
        Cuối cùng, mình sẽ kiểm tra tính bảo mật sở hữu tài nguyên. Mình đăng nhập tài khoản của một Organizer khác là `organizer-t3-02@ticketbox.vn` và cố tình gửi một request PATCH để thay đổi thông tin một concert do Organizer 1 làm chủ. API của backend lập tức từ chối và trả về lỗi `403 Forbidden`. Điều này chứng minh một Organizer tuyệt đối không thể can thiệp hay sửa đổi sự kiện của nhà tổ chức khác."*
2.  **Bước 2: AI Artist Bio từ PDF Press Kit & Khả năng xử lý khi AI lỗi (Thời gian: 24:30 - 27:30)**
    *   *Màn hình mở*: Admin Web, MinIO Console (`http://localhost:9001`), Terminal log của Worker.
    *   *Thao tác 1 (Mô tả bình thường)*: Vào trang concert, click upload file PDF press kit nghệ sĩ hợp lệ. Giải thích luồng hoạt động thông thường (tải lên MinIO -> BullMQ job `ai-bio` -> gọi AI API thành công -> lưu bio).
    *   *Thao tác 2 (Giả lập AI lỗi)*: Tắt kết nối mạng của worker hoặc thay đổi API key AI thành giá trị sai để mô phỏng sự cố bên thứ ba (AI sập/timeout). Tiến hành tải lại file PDF và theo dõi BullMQ worker.
    *   *Kết quả trên giao diện*: Show BullMQ tự động retry 3 lần, cuối cùng job chuyển sang trạng thái FAILED. Trên Admin Web, mục quản lý file hiển thị trạng thái màu đỏ `FAILED` kèm lý do lỗi chi tiết (ví dụ: `API_KEY_INVALID` hoặc `TIMEOUT`). Toàn bộ giao diện Admin và luồng bán vé vẫn chạy ổn định.
    *   *Lời thoại chi tiết*:
        > *"Một tính năng giúp nâng cao trải nghiệm của Ban tổ chức là tự động tóm tắt tiểu sử nghệ sĩ bằng AI qua file PDF. Mình chọn tệp PDF và thực hiện upload. File được truyền tải lên MinIO S3 Console tại bucket `ticketbox`. Tác vụ xử lý bất đồng bộ lập tức được đẩy vào hàng chờ BullMQ. Worker sẽ bóc tách text thô từ PDF và gọi dịch vụ AI để sinh Bio tóm tắt.
        Vậy nếu dịch vụ AI bên thứ ba bị sập, quá tải hoặc mất kết nối thì sao? Để demo kịch bản chịu lỗi này, mình đã đổi API Key của AI sang một khóa sai. Bây giờ mình thực hiện upload lại file PDF nghệ sĩ. Nhìn vào log terminal của Worker, khi gặp lỗi API, BullMQ sẽ tự động áp dụng cơ chế Retry (thử lại) tối đa 3 lần. Nếu sau 3 lần vẫn lỗi, job sẽ chuyển sang trạng thái FAILED và cập nhật cột `status = FAILED`, ghi nhận lỗi chi tiết `errorMessage` vào database.
        Quay lại giao diện Admin Web, mục File tải lên lập tức hiển thị nhãn màu đỏ kèm thông báo lỗi cụ thể để ban tổ chức biết được nguyên nhân sự cố. Quan trọng hơn hết, lỗi từ AI bên thứ ba hoàn toàn không làm treo hay ảnh hưởng đến các luồng tính năng khác của website, hệ thống vẫn duy trì hoạt động bình thường, chứng minh khả năng chịu lỗi (Fault Tolerance) cực kỳ dẻo dai."*
3.  **Bước 3: Nhập danh sách VIP từ CSV (Thời gian: 27:30 - 29:30)**
    *   *Màn hình mở*: Admin Web (mục Guest List), Terminal log.
    *   *Thao tác*: Chuẩn bị 1 file CSV có 5 hàng hợp lệ và 2 hàng bị lỗi (ví dụ: email sai định dạng, số điện thoại trống). Click import file CSV này.
    *   *Kết quả*: Hệ thống báo hoàn thành. Giao diện xuất hiện "Báo cáo nhập liệu" (Import Report): hiển thị 5 khách mời hợp lệ được nạp thành công vào database (phân vào cổng VIP), liệt kê chi tiết vị trí và nội dung của 2 hàng bị lỗi.
    *   *Lời thoại chi tiết*:
        > *"Đối với các concert lớn, ban tổ chức thường nhận được một danh sách khách mời VIP từ các nhà tài trợ vào đêm muộn trước ngày diễn và danh sách này thường không có API để đồng bộ. TicketBox giải quyết bằng tính năng import CSV bất đồng bộ. Mình đã chuẩn bị sẵn file CSV chứa 7 dòng dữ liệu khách mời, trong đó có 2 dòng bị viết sai định dạng email và số điện thoại bị trùng lặp. Mình bấm nút chọn file CSV này và thực hiện import.
        Tác vụ import CSV được xếp vào queue của BullMQ để chạy dưới dạng tác vụ nền ban đêm, tránh gây nghẽn luồng xử lý API bán vé chính. Sau khi worker báo hoàn thành, giao diện admin hiển thị một 'Báo cáo nhập liệu' (Import Report) vô cùng chi tiết. Hệ thống báo cáo: 5 dòng dữ liệu khách mời hợp lệ đã được import thành công vào bảng `GuestListEntry` trong database và được cấp quyền soát vé tại cổng VIP. Đồng thời, báo cáo liệt kê rõ ràng dòng số 3 bị lỗi email không đúng định dạng và dòng số 4 bị bỏ qua do trùng lặp dữ liệu, giúp nhà tổ chức dễ dàng theo dõi và xử lý dữ liệu lỗi."*
4.  **Bước 4: Giải thích Source Code (Thời gian: 29:30 - 31:30)**
    *   *File code cần mở*:
        *   [roles.guard.ts](file:///d:/Dang/TKPM/DA/ticketbox/src/backend/src/modules/auth/guards/roles.guard.ts) (Giải thích metadata check).
        *   [concert.service.ts](file:///d:/Dang/TKPM/DA/ticketbox/src/backend/src/modules/concert/concert.service.ts) (Hàm check ownership: dòng 356 `existing.organizerId !== userId`).
        *   [ai-bio.processor.ts](file:///d:/Dang/TKPM/DA/ticketbox/src/backend/src/worker/processors/ai-bio.processor.ts) và [ai.service.ts](file:///d:/Dang/TKPM/DA/ticketbox/src/backend/src/worker/services/ai.service.ts).
        *   [csv-import.processor.ts](file:///d:/Dang/TKPM/DA/ticketbox/src/backend/src/worker/processors/csv-import.processor.ts) và [csv-parse.service.ts](file:///d:/Dang/TKPM/DA/ticketbox/src/backend/src/worker/services/csv-parse.service.ts).
    *   *Lời thoại chi tiết*:
        > *"Sau đây mình sẽ đi qua các file code cốt lõi của tính năng này. Đầu tiên là file phân quyền [roles.guard.ts](file:///d:/Dang/TKPM/DA/ticketbox/src/backend/src/modules/auth/guards/roles.guard.ts). Guard này kế thừa `CanActivate` của NestJS, sử dụng `Reflector` để đọc các vai trò được quy định trong decorator `@Roles`. Nó giải mã thông tin role từ JWT token của request gửi lên và tiến hành so khớp quyền truy cập.
        Đối với việc bảo vệ tài nguyên concert và thực thi chức năng hủy concert, trong file [concert.service.ts](file:///d:/Dang/TKPM/DA/ticketbox/src/backend/src/modules/concert/concert.service.ts) tại hàm cập nhật, chúng mình thực hiện kiểm tra quyền sở hữu bằng dòng lệnh: `if (userRole === Role.ORGANIZER && existing.organizerId !== userId)` để ném ra ngoại lệ `ForbiddenException` nếu phát hiện tài khoản Organizer đang cố can thiệp vào sự kiện của người khác. Khi concert bị hủy, trạng thái được cập nhật thành `CANCELLED` trong database, đồng thời invalidation cache tương ứng để đồng bộ hệ thống lập tức.
        Về cơ chế xử lý AI bất đồng bộ và kiểm soát lỗi, trong file worker [ai-bio.processor.ts](file:///d:/Dang/TKPM/DA/ticketbox/src/backend/src/worker/processors/ai-bio.processor.ts), chúng mình lấy file từ MinIO S3 bằng stream, gọi thư viện `pdf-parse` để đọc nội dung text thô. Sau đó, đoạn text được chuyển qua file service [ai.service.ts](file:///d:/Dang/TKPM/DA/ticketbox/src/backend/src/worker/services/ai.service.ts) trong hàm `generateArtistBio` để gửi prompt đến mô hình AI. Đặc biệt tại khối `catch(error)` của processor, chúng mình kiểm tra `isFinalAttempt` để đảm bảo nếu là lượt thử lại cuối cùng bị thất bại, hệ thống sẽ thực hiện cập nhật trạng thái `FAILED` kèm nội dung `errorMessage` vào DB để hiển thị lên UI cho người dùng, thay vì để tác vụ chạy ẩn vô tận.
        Cuối cùng, việc import file CSV nằm ở file [csv-import.processor.ts](file:///d:/Dang/TKPM/DA/ticketbox/src/backend/src/worker/processors/csv-import.processor.ts) và [csv-parse.service.ts](file:///d:/Dang/TKPM/DA/ticketbox/src/backend/src/worker/services/csv-parse.service.ts). Chúng mình sử dụng thư viện `csv-parse/sync` để bóc tách tệp. Để đảm bảo tính bền vững (Fault Tolerance), hệ thống bọc khối try/catch riêng cho từng dòng dữ liệu: nếu một dòng bị lỗi, hệ thống chỉ ghi nhận dòng đó thất bại vào báo cáo lỗi và tiếp tục xử lý các dòng đúng tiếp theo chứ không làm crash toàn bộ tiến trình. Tiếp theo, bạn Dương sẽ trình bày các bài kiểm thử phi chức năng."*

#### Lỗi có thể gặp và cách xử lý khi demo:
*   *Lỗi*: Không kết nối được với AI API do chặn IP hoặc hết hạn credit.
*   *Xử lý*: Thiết lập sẵn cơ chế AI Mock Service trong code (có thể kích hoạt bằng cách đổi biến môi trường) để trả về một đoạn text Bio định sẵn khi API sập, tránh làm hỏng tiến trình quay video.

#### Kết quả mong đợi:
*   Phân quyền chặn đúng vai trò. CRUD concert và sở hữu tài nguyên chuẩn xác.
*   Dashboard doanh thu hiển thị trực quan dữ liệu. Thao tác hủy concert hoạt động đúng nghiệp vụ và ghi nhận status CANCELLED.
*   Khi AI lỗi, hệ thống ghi nhận lỗi vào database và cập nhật trạng thái FAILED màu đỏ trên màn hình Admin Web.
*   Bio sinh tự động từ PDF, danh sách VIP CSV import chính xác, liệt kê dòng lỗi chi tiết.

---

### PHẦN 4: NON-FUNCTIONAL TESTS & SYSTEM RESILIENCE
*   **Người trình bày**: **Dương**
*   **Thời lượng dự kiến**: 9 phút 00 giây (31:30 - 40:30)
*   **Mục tiêu**:
    *   Chứng minh các cơ chế kỹ thuật tối ưu hóa và chống chịu tải nặng hoạt động hoàn hảo.
    *   Chứng minh hiệu năng của Caching (Redis) và Invalidation.
    *   Chứng minh cơ chế bảo vệ: Token Bucket Rate Limiting, Circuit Breaker thanh toán, xử lý tranh chấp vé và per-user giới hạn dưới tải đồng thời cực cao.
    *   Chứng minh hệ thống gửi email xác nhận đặt vé và reminder tự động đúng giờ.
    *   **Nhấn mạnh kiến trúc thiết kế mở rộng của phân hệ Notification (Email -> SMS/Zalo OA)**.

#### Kịch bản chi tiết & Các bước demo:
1.  **Bước 1: Caching & Invalidation (Thời gian: 31:30 - 32:30)**
    *   *Màn hình mở*: Postman, Terminal (Redis CLI: `docker exec -it ticketbox-redis redis-cli`).
    *   *Thao tác*:
        *   Gửi request `GET /concerts/concert-nft-cache` lần 1. Terminal backend hiển thị query SQL đổ vào Postgres (Cache Miss). Trong Redis CLI, gõ `keys *` sẽ thấy xuất hiện key cache concert.
        *   Gửi tiếp request trên 3 lần nữa. Trả về kết quả siêu tốc (~3ms). Terminal backend hoàn toàn im lặng, không sinh câu SQL nào (Cache Hit).
        *   Thực hiện mua 1 vé của concert này. Gửi lại request GET -> Số vé khả dụng giảm đi 1, cache đã bị invalidation chủ động để nạp dữ liệu mới nhất.
    *   *Lời thoại chi tiết*:
        > *"Chào thầy và các bạn, mình là Dương. Sau khi đi qua toàn bộ luồng chức năng, mình sẽ phụ trách kiểm thử các yêu cầu phi chức năng và khả năng chống chịu của TicketBox dưới tải cực cao. 
        Đầu tiên, để trang danh sách và trang chi tiết concert không làm quá tải database, chúng mình áp dụng chiến lược Caching (Cache-aside) dùng Redis. Mình sẽ gửi một request `GET /concerts/concert-nft-cache` qua Postman. Thầy thấy trên log terminal của backend xuất hiện câu lệnh truy vấn SQL đổ vào Postgres để lấy thông tin do đây là lần truy cập đầu tiên, tức là Cache Miss. Mình gõ lệnh `keys *` trên Redis CLI, key cache của concert này đã được tạo thành công.
        Bây giờ, mình gửi lại request này liên tục 3 lần nữa. Như thầy thấy, tốc độ phản hồi cực kỳ nhanh, chỉ khoảng 2 đến 3 mili-giây, và terminal backend hoàn toàn im lặng, không phát sinh thêm bất cứ câu truy vấn database nào do dữ liệu được trả về trực tiếp từ Redis Cache (Cache Hit).
        Khi bạn Ngọc thực hiện thanh toán mua vé thành công cho concert này, mình gửi lại request GET. Thầy thấy số vé còn lại đã giảm đi 1, và backend phát sinh câu truy vấn Postgres mới. Điều này chứng minh cơ chế Invalidation cache hoạt động rất chính xác để số vé còn lại luôn phản ánh đúng thực tế."*
2.  **Bước 2: Rate Limiting (Token Bucket) (Thời gian: 32:30 - 33:30)**
    *   *Màn hình mở*: Terminal (chạy công cụ spam request như `autocannon` hoặc `k6`).
    *   *Thao tác*: Spam liên tục 100 request trong 5 giây lên API `/orders` sử dụng JWT của 1 user.
    *   *Kết quả*: 30 request đầu tiên thành công, toàn bộ request tiếp theo bị chặn đứng và trả về HTTP Status `429 Too Many Requests`.
    *   *Lời thoại chi tiết*:
        > *"Để bảo vệ API backend khỏi sự tấn công của spam bot hoặc các lượt click liên tục từ client, hệ thống sử dụng Rate Limiter. Mình sử dụng công cụ load test `autocannon` để spam liên tục 100 request tạo đơn hàng lên API `/orders` trong 5 giây bằng token của một tài khoản user.
        Theo kết quả xuất hiện trên terminal, 30 request đầu tiên nằm trong ngưỡng cấu hình được chấp nhận xử lý, còn từ request thứ 31 trở đi đều bị hệ thống chặn đứng nguyên tử và trả về mã lỗi HTTP `429 Too Many Requests`. Thuật toán Token Bucket được viết bằng Lua script chạy trực tiếp trên Redis để kiểm soát tải đồng thời ở cả cấp độ IP và ID tài khoản vô cùng chính xác."*
3.  **Bước 3: Circuit Breaker cổng thanh toán (Thời gian: 33:30 - 35:00)**
    *   *Màn hình mở*: Postman, Browser (Customer Web).
    *   *Thao tác*:
        *   Giập tắt MoMo API (giả lập MoMo gặp sự cố bằng cách gửi liên tiếp 5 giao dịch lỗi từ Postman). API kiểm tra trạng thái Circuit Breaker sẽ báo trạng thái chuyển từ `CLOSED` sang `OPEN`.
        *   Dùng tài khoản Customer truy cập Customer Web xem danh sách concert, click sơ đồ SVG đặt vé khác -> Mọi thứ vẫn hoạt động bình thường (Graceful Degradation).
    *   *Lời thoại chi tiết*:
        > *"Một cơ chế bảo vệ hệ thống khác là Circuit Breaker để tránh sập toàn diện dịch vụ khi cổng thanh toán thứ ba gặp sự cố. Mình giả lập việc kết nối MoMo bị sập bằng cách gửi liên tục 5 request lỗi lên API thanh toán MoMo qua Postman. Gọi API kiểm tra trạng thái Circuit Breaker, thầy thấy nó đã tự động ngắt mạch và chuyển trạng thái từ `CLOSED` sang `OPEN`.
        Lúc này, mọi request thanh toán qua cổng MoMo đều bị từ chối ngay lập tức để giải phóng tài nguyên. Tuy nhiên, khi mình quay lại giao diện Customer Web, khách hàng vẫn có thể xem danh sách concert bình thường, kiểm tra tồn kho vé thời gian thực, và thậm chí đặt mua vé của concert khác bằng cổng thanh toán VNPAY được bình thường (Graceful Degradation) chứ không bị sập dây chuyền toàn bộ hệ thống."*
4.  **Bước 4: Tranh chấp vé & Giới hạn per-user dưới tải cao (Thời gian: 35:00 - 37:30)**
    *   *Màn hình mở*: Terminal (chạy script chạy concurrency mẫu trong thư mục `src/backend/src/test` hoặc chạy script test-concurrency).
    *   *Thao tác 1 (Overselling)*: Đặt cấu hình concert `concert-nft-concurrency` chỉ còn **đúng 2 vé SVIP**. Chạy script gửi đồng thời 10 request mua từ 10 tài khoản khác nhau tại cùng 1 thời điểm.
    *   *Kết quả*: Chỉ có đúng 2 tài khoản tạo được order thành công. 8 tài khoản còn lại nhận lỗi `OUT_OF_STOCK` trả về từ Redis Lua. Số vé đã bán trong DB tuyệt đối không vượt quá 2.
    *   *Thao tác 2 (Per-user concurrent)*: Dùng 1 tài khoản gửi đồng thời 5 request mua vé SVIP (giới hạn 2 vé/tài khoản).
    *   *Kết quả*: Chỉ tối đa 2 vé được xác nhận giữ chỗ thành công, các request còn lại bị chặn nguyên tử.
    *   *Lời thoại chi tiết*:
        > *"Bây giờ, mình sẽ thực hiện bài test quan trọng nhất: Tranh chấp vé và giới hạn per-user dưới tải đồng thời cực cao. Concert 'concert-nft-concurrency' hiện tại chỉ còn duy nhất đúng 2 vé SVIP cuối cùng. Mình sẽ chạy script test để giả lập 10 tài khoản khách hàng khác nhau gửi request đặt mua vé đồng thời tại cùng một thời điểm.
        Như kết quả log in ra trên màn hình terminal, chỉ có đúng 2 tài khoản đặt vé thành công và được đi tiếp đến bước thanh toán. 8 tài khoản còn lại lập tức bị hệ thống từ chối với thông báo lỗi 'Hết vé' do Lua Script của Redis phản hồi. Điều này chứng minh hệ thống tuyệt đối không bao giờ xảy ra lỗi bán khống vé (Overselling).
        Hoàn toàn tương tự, khi mình dùng 1 tài khoản gửi đồng thời 5 request đặt vé SVIP lên `/orders`, trong khi concert chỉ giới hạn tối đa 2 vé trên mỗi tài khoản. Redis Lua script đã đếm nguyên tử và chỉ chấp nhận tối đa 2 order, chặn đứng 3 request còn lại để thực thi giới hạn per-user chính xác tuyệt đối."*
5.  **Bước 5: Email Notification & Reminder Job & Thiết kế mở rộng (Thời gian: 37:30 - 39:00)**
    *   *Màn hình mở*: Mailhog/Mailtrap Console hoặc Mail Inbox của tài khoản ethereal.
    *   *Thao tác 1*: Mở mail inbox show email xác nhận đơn hàng kèm thông tin vé QR gửi ngay sau khi mua vé thành công.
    *   *Thao tác 2*: Cấu hình concert diễn ra sau 23h59p nữa, trigger BullMQ scheduler. Show email nhắc nhở tự động trước 24 giờ gửi đến hòm thư khán giả.
    *   *Lời thoại chi tiết*:
        > *"Về phần luồng thông báo, ngay sau khi đơn hàng được cập nhật thành công, hệ thống đẩy một job gửi mail xác nhận đơn hàng kèm thông tin vé vào queue BullMQ để chạy nền bất đồng bộ. Đây là hòm thư test Ethereal hiển thị email xác nhận mua vé thành công gửi tới khách hàng chứa đầy đủ chi tiết và link vé QR.
        Ngoài ra, để gửi email nhắc nhở tự động trước 24 giờ diễn ra concert cho hàng vạn khán giả mà không gây nghẽn API bán vé, chúng mình sử dụng cơ chế Delayed Job của BullMQ. Mình cấu hình concert bắt đầu sau 23 giờ 59 phút nữa và trigger scheduler. Job lập tức được đưa vào queue và bắt đầu gửi mail hàng loạt. Thầy thấy email nhắc nhở đã được gửi thành công đến hòm thư khách hàng với tiêu đề nhắc nhở sự kiện diễn ra ngày mai.
        Đặc biệt, hệ thống được thiết kế với kiến trúc Notification cực kỳ dễ mở rộng. Hiện tại, chúng mình đang cài đặt kênh Email. Tuy nhiên, nhờ thiết kế hướng module độc lập, trong tương lai nếu ban tổ chức muốn bổ sung thêm các kênh thông báo mới như SMS Brandname hay Zalo OA để gửi nhắc nhở và QR code, chúng mình chỉ việc lập trình thêm các Class Service tương ứng trong module Notification mà hoàn toàn không cần phải sửa đổi bất kỳ logic nào trong các luồng nghiệp vụ cốt lõi hay các API controllers hiện tại. Thiết kế này tuân thủ nguyên lý Open/Closed (đóng đối với việc sửa đổi nhưng mở đối với việc mở rộng)."*
6.  **Bước 6: Giải thích Source Code (Thời gian: 39:00 - 40:30)**
    *   *File code cần mở*:
        *   [token-bucket.lua](file:///d:/Dang/TKPM/DA/ticketbox/src/backend/src/modules/rate-limit/scripts/token-bucket.lua) (Cấu chế refill token và trừ bucket nguyên tử).
        *   [rate-limit.service.ts](file:///d:/Dang/TKPM/DA/ticketbox/src/backend/src/modules/rate-limit/rate-limit.service.ts) (Logic gom check IP và check user).
        *   [payment-circuit-breaker.service.ts](file:///d:/Dang/TKPM/DA/ticketbox/src/backend/src/modules/payment/services/payment-circuit-breaker.service.ts) (Config Opossum Circuit Breaker).
        *   [concert.service.ts](file:///d:/Dang/TKPM/DA/ticketbox/src/backend/src/modules/concert/concert.service.ts) (Logic invalidate cache: `this.redis.del(key)` khi có mutation).
        *   [reminder.service.ts](file:///d:/Dang/TKPM/DA/ticketbox/src/backend/src/modules/notification/reminder.service.ts) (Logic tính toán thời gian `startsAt - 24h` để đẩy delayed job).
        *   [notification.processor.ts](file:///d:/Dang/TKPM/DA/ticketbox/src/backend/src/worker/processors/notification.processor.ts) (BullMQ processor bóc tách job email).
        *   [email.service.ts](file:///d:/Dang/TKPM/DA/ticketbox/src/backend/src/modules/notification/services/email.service.ts) (Triển khai email provider).
    *   *Lời thoại chi tiết*:
        > *"Mình xin giải thích chi tiết các cài đặt kỹ thuật này trong code. Đầu tiên, file [token-bucket.lua](file:///d:/Dang/TKPM/DA/ticketbox/src/backend/src/modules/rate-limit/scripts/token-bucket.lua) cài đặt thuật toán Token Bucket trực tiếp trên Redis. Mỗi request gửi lên đi qua [rate-limit.service.ts](file:///d:/Dang/TKPM/DA/ticketbox/src/backend/src/modules/rate-limit/rate-limit.service.ts), nơi hệ thống gọi Lua script để kiểm tra cả 2 bucket của IP và ID user đồng thời, tự động refill token dựa trên thời gian thực mà không gây trễ IO database.
        Mở file [payment-circuit-breaker.service.ts](file:///d:/Dang/TKPM/DA/ticketbox/src/backend/src/modules/payment/services/payment-circuit-breaker.service.ts), chúng mình khởi tạo đối tượng `CircuitBreaker` từ thư viện `Opossum` bọc ngoài các API gọi MoMo. Khi tỷ lệ lỗi vượt quá 50% trong cửa sổ giám sát, Circuit Breaker sẽ tự động kích hoạt OPEN trạng thái để bảo vệ backend API.
        Trong file [concert.service.ts](file:///d:/Dang/TKPM/DA/ticketbox/src/backend/src/modules/concert/concert.service.ts), chúng mình kiểm tra cache Redis bằng key băm. Khi có sự kiện thanh toán hoặc hủy đơn, hàm `del(key)` được gọi để xóa cache ngay lập tức.
        Về phần thông báo nhắc nhở, file [reminder.service.ts](file:///d:/Dang/TKPM/DA/ticketbox/src/backend/src/modules/notification/reminder.service.ts) tính toán khoảng thời gian trễ trước khi concert bắt đầu 24 giờ và đẩy một delayed job vào hàng đợi BullMQ. Worker trong file [notification.processor.ts](file:///d:/Dang/TKPM/DA/ticketbox/src/backend/src/worker/processors/notification.processor.ts) chịu trách nhiệm bóc tách dữ liệu job để gửi email.
        Để chứng minh tính dễ mở rộng của module Notification, nếu mở code thư mục `src/modules/notification`, thầy sẽ thấy cấu trúc module được tách biệt hoàn toàn thông qua folder `services`. Để bổ sung kênh SMS hay Zalo OA, ta chỉ cần tạo service mới triển khai interface gửi tin chung như [email.service.ts](file:///d:/Dang/TKPM/DA/ticketbox/src/backend/src/modules/notification/services/email.service.ts), sau đó đăng ký vào module và inject vào processor để xử lý song song các kênh thông báo. Điều này tuân thủ nguyên lý Open/Closed của thiết kế hệ thống. Đến đây, nhóm mình đã chứng minh toàn bộ các yêu cầu chức năng và phi chức năng hoạt động đúng đắn và trơn tru. Xin cảm ơn thầy đã theo dõi!"*

#### Lỗi có thể gặp và cách xử lý khi demo:
*   *Lỗi*: Script test concurrency chạy bị delay do mạng nghẽn nên các request không đồng thời tuyệt đối.
*   *Xử lý*: Sử dụng thư viện gọi request song song thực sự như `Promise.all` hoặc dùng tool load test chuyên dụng `k6` cấu hình `vu=10` (Virtual Users) chạy đồng loạt trên máy local.

#### Kết quả mong đợi:
*   Query Redis hit/miss hiển thị rõ ràng. Spam API bị chặn 429.
*   Circuit Breaker nhảy OPEN và hoạt động suy thoái mềm dẻo.
*   Không bán lố vé (oversell) khi tranh chấp. Email xác nhận và nhắc nhở gửi đúng nội dung.

---

## 3. BẢNG ĐỐI CHIẾU PHỦ YÊU CẦU ĐỀ BÀI (REQUIREMENT COVERAGE)

| Yêu cầu nghiệp vụ trong đề bài | Demo ở phút nào | Người trình bày | Đã chứng minh bằng gì (Tính năng + Kỹ thuật) |
|---|:---:|:---:|---|
| Xem danh sách concert, địa điểm, nghệ sĩ, số vé còn lại real-time | 02:00 | **Ngọc** | Trang chủ, trang chi tiết concert cập nhật tồn kho từ cache Redis. |
| Sơ đồ ghế SVG tương tác (GA, SVIP, VIP, CAT1, CAT2) | 02:40 | **Ngọc** | Click chọn trực quan trên bản đồ SVG của `concert-purchase-momo`. |
| Thanh toán qua cổng giả lập (MoMo, VNPAY) & Nhận e-ticket QR | 03:40 | **Ngọc** | Chuyển hướng trang thanh toán, click Success, sinh vé QR có token mã hóa. |
| Cấu hình giới hạn vé per-user (áp dụng trên toàn bộ đơn hàng thành công) | 06:00 | **Ngọc** | Chặn mua vé SVIP thứ 2 của `concert-purchase-limits` tại cấp Order Service. |
| Chống trừ tiền hai lần (Idempotency Key) | 07:00 | **Ngọc** | Gửi request trùng key trên Postman, nhận kết quả trùng khớp mà không nhân đôi DB. |
| Xử lý tự động hủy đơn giữ chỗ hết hạn (Order Timeout) | 05:00, 37:45 | **Ngọc & Dương**| Ngọc demo luồng hết hạn 10s tự trả vé. Dương giải thích thêm BullMQ ở backend. |
| Gửi email xác nhận kèm e-ticket QR code | 37:30 | **Dương** | Kiểm tra hòm thư Ethereal, email gửi bất đồng bộ qua hàng đợi BullMQ. |
| Tự động gửi email nhắc nhở trước 24 giờ diễn ra concert | 38:00 | **Dương** | Chạy Job Scheduler BullMQ gửi email nhắc nhở tự động, kiểm tra trên Ethereal. |
| Khả năng mở rộng kênh thông báo mới trong tương lai (SMS, Zalo OA) | 38:30 | **Dương** | Nhấn mạnh thiết kế tách biệt và hướng module của Notification trong code. |
| Quản trị viên (BTC) tạo concert, cấu hình loại vé, giá, hủy concert | 22:00 | **Ân** | CRUD Concert trên Admin Web, thay đổi trạng thái từ DRAFT sang PUBLISHED. |
| Quản lý vòng đời concert và hủy concert (Cancel Concert) | 23:15 | **Ân** | Thực hiện click "Cancel Event" trên UI, trạng thái đổi thành CANCELLED. |
| Theo dõi doanh thu và lượng bán (Organizer Revenue Dashboard) | 21:40 | **Ân** | Xem nhanh các StatCard và RevenueChart phân tích doanh số của Organizer. |
| Phân quyền truy cập hệ thống chặt chẽ (RBAC) cho 3 nhóm người dùng | 21:10 | **Ân** | `RolesGuard` chặn Customer truy cập Admin. Nhân sự soát vé chỉ dùng được PWA. |
| Bảo vệ sở hữu tài nguyên (Organizer không sửa được concert của nhau) | 23:45 | **Ân** | Organizer 2 cố edit concert của Organizer 1 bị API chặn báo `403 Forbidden`. |
| Quét mã QR soát vé bằng mobile app, kiểm tra chữ ký mã hóa an toàn | 12:15 | **Hương** | Trình duyệt giả lập PWA quét QR vé, check token, cập nhật trạng thái `CHECKED_IN`. |
| Soát vé ngoại tuyến (offline check-in) khi sóng yếu | 16:00 | **Hương** | Ngắt kết nối mạng, PWA giải mã chữ ký QR, báo soát thành công, lưu IndexedDB. |
| Ngăn chặn Double Check-in (Online & Offline) | 13:30, 16:30 | **Hương** | Quét lại cùng 1 vé báo đỏ ngay lập tức (Online check DB, Offline check IndexedDB). |
| Ràng buộc cổng soát vé (Gate Mismatch) | 14:45 | **Hương** | Cổng soát vé `GATE-B` quét vé cổng `GATE-A` bị PWA từ chối. |
| Đồng bộ dữ liệu soát vé offline và xử lý trùng lặp khi có mạng lại | 17:00 | **Hương** | Trình duyệt phục hồi mạng, PWA sync log offline lên server, DB ghi nhận `isOffline`. |
| AI Artist Bio (Tải PDF, bóc text nền, AI sinh bio hiển thị trên concert) | 24:30 | **Ân** | Upload PDF lên Admin -> Worker BullMQ bóc text -> AI cập nhật Artist Bio. |
| Khả năng chịu lỗi và xử lý lỗi khi dịch vụ AI sập | 25:15 | **Ân** | Giả lập AI lỗi, BullMQ retry 3 lần, cập nhật trạng thái file FAILED, hiển thị đỏ trên UI. |
| Nhập danh sách VIP từ CSV định kỳ trong nền (Delayed Job) | 27:30 | **Ân** | Upload file CSV danh sách khách mời, BullMQ xử lý, show database VIP gate. |
| Xử lý CSV lỗi, trùng lặp và bỏ qua dòng trống, xuất báo cáo | 28:10 | **Ân** | CSV chứa dòng sai định dạng được import thành công dòng đúng, báo cáo dòng sai. |
| Chống bán vượt số lượng vé (Overselling) dưới tải cao | 35:00 | **Dương** | Chạy load test 10 request mua 2 vé SVIP cuối cùng, chỉ đúng 2 request thành công. |
| Giới hạn vé per-user hoạt động chính xác dưới tải cao | 36:00 | **Dương** | Script gửi đồng thời 5 request mua vé SVIP từ 1 tài khoản, chỉ chấp nhận 2 vé. |
| Chống chịu lỗi cổng thanh toán (Circuit Breaker) & Suy thoái mềm dẻo | 33:30 | **Dương** | Giả lập MoMo lỗi, Circuit Breaker OPEN, hệ thống vẫn duyệt concert bình thường. |
| Cache-aside trang chủ/chi tiết concert, invalidation chủ động | 31:00 | **Dương** | Gửi GET concert, Redis hit/miss rõ ràng. Invalidate cache khi mua vé thành công. |
| Rate Limiter bảo vệ API khỏi bị spam / ddos | 32:30 | **Dương** | Spam request gọi API /orders bị chặn 429 quá ngưỡng Token Bucket rate limit. |

---

## 4. CHECKLIST CHUẨN BỊ TRƯỚC KHI QUAY (PRE-RECORDING CHECKLIST)

### 4.1. Seed Data & Cấu hình môi trường (.env)
*   [ ] Đảm bảo các Container Docker: Postgres, Redis, MinIO S3 đều đang chạy ở trạng thái `healthy`.
*   [ ] Đứng tại thư mục `src/backend`, thực thi lệnh reset database và nạp seed dữ liệu mẫu:
    ```bash
    npm run prisma:migrate:reset -- --force
    npm run prisma:seed
    ```
*   [ ] Kiểm tra các thông số SMTP Mail trong `.env` của backend và worker để chắc chắn hệ thống gửi mail hoạt động.

### 4.2. Danh sách tài khoản mẫu (Sẵn sàng để Copy-Paste)
*   **Khán giả (Customers)**:
    *   Tài khoản mua vé MoMo: `customer-t1-01@example.com` / Mật khẩu: `customer123`
    *   Tài khoản mua vé VNPAY: `customer-t1-02@example.com` / Mật khẩu: `customer123`
    *   Tài khoản test giới hạn mua: `customer-t1-03@example.com` / Mật khẩu: `customer123`
    *   Tài khoản test idempotency: `customer-t1-04@example.com` / Mật khẩu: `customer123`
    *   Tài khoản load test / concurrency: `customer-t4-03@example.com` đến `customer-t4-12@example.com` / Mật khẩu: `customer123`
*   **Ban tổ chức (Organizers)**:
    *   Organizer 1: `organizer-t3-01@ticketbox.vn` / Mật khẩu: `organizer123`
    *   Organizer 2: `organizer-t3-02@ticketbox.vn` / Mật khẩu: `organizer123`
*   **Nhân viên soát vé (Staff)**:
    *   Staff soát Gate A: `staff-t2-01@ticketbox.vn` / Mật khẩu: `customer123`
    *   Staff soát Gate B: `staff-t2-02@ticketbox.vn` / Mật khẩu: `customer123`

### 4.3. File dữ liệu thử nghiệm & Script test
*   [ ] File PDF tiểu sử nghệ sĩ (để ngoài Desktop, dung lượng khoảng 1-2MB, định dạng `.pdf`).
*   [ ] File CSV danh sách khách mời VIP chứa dòng hợp lệ và dòng lỗi để test báo cáo:
    ```csv
    name,email,phone,gateId
    Nguyen Van VIP,guest1@example.com,0901234567,GATE-VIP
    Tran Thi VIP,guest2@example.com,0901234568,GATE-VIP
    Loi Format,guest3_invalid_email,0901234569,GATE-VIP
    Nguyen Van VIP,guest1@example.com,0901234567,GATE-VIP
    ```
*   [ ] Script test tranh chấp vé tải cao đặt tại `src/backend/src/test/test-concurrency.ts` (hoặc script gọi concurrent API) sẵn sàng chạy qua shell.

### 4.4. Cửa sổ màn hình & Terminal cần bật trước
*   **Trình duyệt (Browser)**:
    *   Tab 1: Trang web khách hàng (`http://localhost:3000`)
    *   Tab 2: Trang web quản trị (`http://localhost:3002`)
    *   Tab 3: Giao diện soát vé PWA (`http://localhost:3003` - F12 chỉnh View di động)
    *   Tab 4: MinIO S3 Console (`http://localhost:9001` - user: `ticketbox_admin` / pass: `ticketbox_password123`)
    *   Tab 5: Ethereal Mail Inbox (hoặc Mailhog Console) để kiểm tra các email giao dịch gửi đi.
*   **Terminal**:
    *   Terminal 1: Output logs của docker-compose (`docker-compose logs -f backend worker`).
    *   Terminal 2: Redis CLI Monitor để theo dõi hit/miss cache (`docker exec -it ticketbox-redis redis-cli monitor`).
    *   Terminal 3: Chuẩn bị sẵn lệnh chạy load test bằng `k6` hoặc `autocannon`.

### 4.5. Lệnh Reset nhanh dữ liệu (Sau mỗi lần quay hỏng)
Chạy tổ hợp lệnh sau trong Terminal để đưa hệ thống về điểm xuất phát sạch sẽ:
```bash
# Tại thư mục src/backend
npm run prisma:migrate:reset -- --force
npm run prisma:seed
docker exec -it ticketbox-redis redis-cli FLUSHALL
```
