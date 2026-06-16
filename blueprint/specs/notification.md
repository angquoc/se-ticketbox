# Đặc tả: Hệ thống Thông báo Bất đồng bộ (Notification Module)

## Mô tả

Notification Module chịu trách nhiệm gửi thông báo cho khán giả và ban tổ chức dựa trên các sự kiện phát sinh trong hệ thống TicketBox.

Module hoạt động hoàn toàn bất đồng bộ thông qua BullMQ và Background Worker nhằm tránh làm thắt nút cổ chai (bottleneck) các luồng nghiệp vụ chính như mua vé, thanh toán, import CSV hoặc sinh AI Artist Bio. 

Notification hiện hỗ trợ Email là kênh mặc định. Hệ thống được thiết kế theo hướng **Provider/Strategy Pattern** để có thể dễ dàng mở rộng thêm SMS, Zalo OA hoặc Push Notification trong tương lai mà không vi phạm nguyên tắc Open/Closed của SOLID, không cần thay đổi logic nghiệp vụ hiện có.

Các loại thông báo chính:
* `OrderPaid` — Xác nhận mua vé thành công kèm e-ticket QR.
* `ConcertReminder24h` — Nhắc nhở tự động trước concert 24 giờ.
* `OrderExpired` — Thông báo đơn hàng đã bị hủy do quá hạn thanh toán.
* `CSVImportCompleted` — Báo cáo kết quả nhập danh sách khách mời.
* `ArtistBioGenerated` — Báo cáo AI Artist Bio đã được sinh thành công hoặc thất bại.

---

## Luồng chính

### 1. Gửi e-ticket sau khi thanh toán thành công
1. Payment Webhook được Backend API xác thực thành công.
2. Order được chuyển sang trạng thái `PAID`, Backend phát hành các bản ghi `Ticket`.
3. Backend tạo payload sự kiện `OrderPaid` (kèm theo một Event ID duy nhất) và đẩy ngay vào queue `notification` trên BullMQ.
4. Backend lập tức trả phản hồi HTTP 200 cho cổng thanh toán (không chờ gửi email).
5. Background Worker lấy job từ queue, kiểm tra Idempotency qua Event ID, render nội dung email xác nhận và nhúng e-ticket QR.
6. Worker gọi API của Notification Provider để gửi email tới khán giả.
7. Job được đánh dấu hoàn tất (`COMPLETED`).

### 2. Gửi nhắc nhở trước concert 24h (Delayed Job)
1. Khi Admin cập nhật giờ diễn (`startsAt`) hoặc chuyển trạng thái Concert sang `PUBLISHED`, Backend tính toán thời điểm `t = startsAt - 24h`.
2. Backend tạo một Delayed Job đẩy vào BullMQ với độ trễ (delay) tương ứng để chờ đến đúng thời điểm `t`.
3. Đến giờ, BullMQ tự động đẩy job vào Active queue.
4. Worker lấy job, quét danh sách khách hàng đã mua vé thành công (xử lý theo từng batch/chunk để tránh tràn RAM).
5. Worker đẩy các job gửi email con (kèm Event ID) cho từng người và thực thi gửi thông báo.

### 3. Thông báo kết quả AI Artist Bio
1. Worker AI hoàn tất xử lý file PDF Press Kit và sinh Artist Bio.
2. Tạo event `ArtistBioGenerated` đẩy vào queue `notification`.
3. Worker Notification lấy job, gửi email thông báo trực tiếp cho Organizer.

### 4. Thông báo kết quả Import CSV
1. Worker CSV hoàn tất xử lý file (hoặc gặp lỗi ngắt toàn bộ).
2. Hệ thống tổng hợp báo cáo: Tổng số dòng, Thành công, Lỗi, Duplicate.
3. Tạo event `CSVImportCompleted` đẩy vào queue.
4. Worker Notification gửi email đính kèm chi tiết báo cáo cho Organizer/Admin.

### 5. Thông báo đơn hàng hết hạn
1. Delayed Job của hệ thống Order phát hiện đơn hàng quá hạn giữ chỗ (`expiresAt`).
2. Order được chuyển sang `EXPIRED`, nhả lại tồn kho vé.
3. Hệ thống tạo event `OrderExpired` đẩy vào queue `notification`.
4. Worker Notification gửi email báo cáo đơn hàng đã hủy cho khách hàng.

---

## Kịch bản lỗi

### 1. Notification Provider bị lỗi / Timeout
* **Hành động:** Worker sẽ throw error và không đánh dấu job thành công. BullMQ tự động áp dụng cơ chế Exponential Backoff Retry. Nếu vượt quá số lần retry tối đa, job chuyển vào Dead Letter Queue (trạng thái `FAILED`). Các chức năng nghiệp vụ chính và trạng thái Order không bị ảnh hưởng.

### 2. Email không tồn tại hoặc sai định dạng
* **Hành động:** Provider trả lỗi 4xx (Bad Request/Not Found). Nhận thấy việc retry là vô nghĩa, Worker đánh dấu job là lỗi (`FAILED`) ngay lập tức. Ghi log cảnh báo và không rollback bất kỳ nghiệp vụ nào liên quan.

### 3. Thay đổi giờ diễn khi Reminder Job đã được lên lịch
* **Hành động:** Khi Admin dời lịch concert, Backend API phát event xóa Delayed Job cũ theo `jobId` định danh. Sau đó, một Delayed Job nhắc nhở mới được tạo ra dựa trên mốc thời gian đã cập nhật.

### 4. Redis hoặc BullMQ gặp sự cố (Down)
* **Hành động:** Backend API không thể đẩy job thông báo mới vào queue. Request gốc (như thanh toán) ghi fallback log sự cố này vào PostgreSQL và vẫn báo thành công cho luồng chính. Sau khi Redis phục hồi, hệ thống có thể chạy script để enqueue lại các thông báo chưa gửi.

### 5. Worker bị dừng giữa chừng (Crash/Restart)
* **Hành động:** Job có thể đang ở trạng thái `ACTIVE` nhưng chưa được ACK hoàn tất. BullMQ sẽ phát hiện stalled jobs và tự động đưa chúng quay lại hàng đợi để Worker khác hoặc Worker sau khi khởi động lại tiếp tục xử lý.

### 6. Rủi ro gửi trùng thông báo (Duplication)
* **Hành động:** Mỗi Notification Event phải có một Event ID duy nhất được Backend sinh ra ngay tại thời điểm enqueue. Worker sử dụng Event ID này để kiểm tra Idempotency (qua Redis hoặc PostgreSQL) trước khi thực thi gửi email, đảm bảo tránh spam người dùng nếu một job bị pull hai lần do lỗi mạng.

---

## Ràng buộc

### Tính bất đồng bộ và Hiệu năng
* **Non-blocking:** Thời gian đẩy job vào BullMQ từ Backend API phải cực ngắn (dưới 50ms). Tuyệt đối không được gọi API của Notification Provider trực tiếp trong request HTTP.
* **Batch Processing:** Các tác vụ gửi hàng loạt (như Concert Reminder cho hàng chục nghìn khán giả) phải được chia nhỏ (pagination/chunking) để bảo vệ bộ nhớ của Worker.

### Độ tin cậy (Reliability)
* **Dead Letter Queue (DLQ):** Job vượt quá số lần retry tối đa phải được chuyển sang DLQ. Hệ thống phải lưu trữ đầy đủ `payload`, `timestamp` và `error_message` để Admin có thể tra cứu và xử lý/re-queue thủ công.

### Fault Isolation (Cách ly sự cố)
* Lỗi gửi thông báo tuyệt đối không được kích hoạt rollback ở các module khác (Không hủy Order, không thu hồi Ticket, không xóa kết quả CSV/AI).

### Khả năng mở rộng (Extensibility)
* Việc cắm thêm một Provider mới (ví dụ: Zalo ZNS) chỉ yêu cầu implement một interface chuẩn (ví dụ: `INotificationProvider`), tuân thủ tuyệt đối Dependency Inversion. Các module sinh ra event (Order, Check-in, Concert) không cần biết Provider bên dưới là gì.

### Bảo mật dữ liệu
* Không đính kèm dữ liệu nhạy cảm (mật khẩu, token xác thực tài khoản) qua plain email. E-ticket chỉ hiển thị QR Code đã được ký (Signed QR Payload) và các metadata cơ bản.

---

## Tiêu chí chấp nhận

* **AC-01 — OrderPaid (Không block API):** Khi thanh toán thành công, hệ thống lập tức cập nhật trạng thái `PAID`, trả response 200 cho Gateway. Job gửi email nằm trong queue và người dùng nhận được QR E-ticket sau vài giây/phút mà không làm chậm luồng mua vé.
* **AC-02 — ConcertReminder24h:** Hệ thống tự động kích hoạt gửi thư nhắc nhở cho tất cả khán giả có vé hợp lệ đúng 24 giờ trước thời điểm `startsAt` của concert. Việc đổi lịch concert sẽ tự động cập nhật lại thời gian gửi thư này.
* **AC-03 — Báo cáo Async (CSV/AI):** Sau khi các Worker xử lý tác vụ nặng (Import CSV, AI Bio) chạy xong, Nếu Notification Provider hoạt động bình thường, Organizer nhận được email báo cáo kết quả (bao gồm cả log lỗi dòng nếu có).
* **AC-04 — Retry tin cậy:** Giả lập Notification Provider bị sập (lỗi 500). Hệ thống ghi nhận job bị lỗi, tự động retry với thời gian trễ tăng dần. Thông báo không bị mất đi trừ khi vượt quá số lần cấu hình retry tối đa.
* **AC-05 — Ngăn chặn Spam:** Bất chấp việc hệ thống cố gắng retry một job đã gửi thành công trước đó (do lỗi đồng bộ mạng), người dùng chỉ nhận được duy nhất 01 email cho cùng một sự kiện nhờ cơ chế Idempotency của Worker thông qua Event ID.
* **AC-06 — Không Retry lỗi định dạng (Invalid Email):** Khi Notification Provider trả lỗi 4xx do địa chỉ email không hợp lệ, job chuyển sang trạng thái `FAILED` ngay lập tức và không thực hiện retry.
* **AC-07 — Gửi thông báo quy mô lớn (Large-scale Reminder):** Khi concert có 80.000 người mua vé, Worker xử lý event Reminder phải tự động chia batch (chunking) để gửi thông báo mà không làm vượt ngưỡng RAM/CPU an toàn của server.