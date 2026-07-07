# Đặc tả Kỹ thuật: Check-in PWA

Tài liệu này mô tả chi tiết thiết kế, luồng xử lý và các tính năng chính của ứng dụng **Check-in PWA** dành cho nhân viên soát vé sự kiện, thuộc dự án TicketBox.

---

## 1. Tổng quan kỹ thuật (Architecture & Tech Stack)

Check-in PWA được thiết kế ưu tiên thiết bị di động (Mobile-first) và có khả năng hoạt động ngay cả khi thiết bị mất kết nối mạng (Offline Support).
*   **Framework**: Next.js (App Router) với React (TypeScript).
*   **Styling**: Tailwind CSS, ưu tiên thiết kế toàn màn hình (fullscreen) để tận dụng không gian hiển thị quét mã QR.
*   **PWA Configuration**: Cấu hình Service Worker, Web App Manifest (`next.config.ts`), hỗ trợ cài đặt lên màn hình chính (Add to Home Screen).
*   **Scanner**: Sử dụng thư viện `jsQR` và `requestAnimationFrame` để xử lý video stream từ camera, nhận diện mã QR hiệu năng cao.
*   **Offline Storage**: Tích hợp `IndexedDB` (thông qua helper tùy chỉnh) để lưu trữ các bản ghi (log) quét vé tạm thời khi mất mạng mạng lưới.

---

## 2. Các luồng xử lý chính

### 2.1. Đăng nhập và Khởi tạo phiên
*   **Đăng nhập Staff (`/login`)**:
    *   Nhân viên đăng nhập bằng thông tin cấp sẵn (Email, Mật khẩu) và chọn Cổng soát vé (Gate).
    *   Ứng dụng gọi `POST /auth/login`, lấy JWT Token và lưu vào `localStorage` cùng thông tin Gate, User.
*   **Bảo vệ phiên (Session Protection)**: 
    *   Chỉ các phiên đã xác thực mới được truy cập `/checkin`. Nếu chưa xác thực, tự động redirect về `/login`.

### 2.2. Luồng quét mã QR và Xác thực (CameraScanner)
*   Màn hình chính `/checkin` cung cấp giao diện hiển thị camera liên tục, có overlay mờ viền (dimmed border) và khung ngắm trung tâm để người dùng dễ căn chỉnh.
*   **Kiểm tra Trạng thái kết nối**: Sử dụng hook `useOfflineCheckin` kết nối sự kiện `window.online` và `window.offline` để phát hiện tình trạng mạng.
*   **Phân tích Payload (Parse QR Payload)**: Mã QR trên vé chứa thông tin mã vé, chữ ký mã hóa (Signature) để chống vé giả.

#### Trường hợp Online:
1.  Khi nhận diện được mã QR, gửi payload đến API `POST /checkin/verify`.
2.  Backend xử lý kiểm tra vé trên database và trả về kết quả hợp lệ hoặc lỗi.
3.  Hiển thị giao diện kết quả quét.

#### Trường hợp Offline (Mất mạng):
1.  Không gọi API Backend. Ứng dụng sẽ tự động phân tích chữ ký trong mã QR để chứng minh vé là thật (chống giả mạo vé offline).
2.  Lưu log quét vé vào `IndexedDB` qua hàm `saveCheckinLog()`, đánh dấu cờ `isOffline: true`.
3.  Hiển thị kết quả quét Offline Thành công kèm Badge cảnh báo "Sẽ đồng bộ sau".

### 2.3. Luồng Đồng bộ dữ liệu (Offline Syncing)
*   Khi thiết bị khôi phục kết nối (`isOnline` chuyển từ `false` sang `true`), hoặc khi nhân viên ấn nút "Đồng bộ thủ công".
*   Hệ thống đọc danh sách log chưa đồng bộ (pending logs) từ `IndexedDB` bằng `getUnsynced()`.
*   Gửi batch dữ liệu này qua API `POST /checkin/sync` tới backend.
*   Backend cập nhật dữ liệu, xử lý các trường hợp xung đột (Conflict - ví dụ: vé offline đã quét ở hai cổng khác nhau cùng lúc).
*   Đánh dấu log đã đồng bộ (`markSynced()`) trong `IndexedDB` dựa trên kết quả trả về.

---

## 3. Cấu trúc Giao diện Người Dùng (Views)

*   **CameraScanner**: Màn hình quét mã QR trực tiếp.
*   **SuccessView**: Màn hình xanh lá báo hiệu vé thành công. Hiển thị thông tin khách, cổng, loại vé và nút "Quét tiếp".
*   **FailureView**: Màn hình đỏ báo hiệu lỗi (vé sai, vé đã dùng, hết hạn). Cung cấp chi tiết lỗi để nhân viên báo cáo khách hàng.
*   **HistoryView**: Chế độ xem lịch sử các lượt quét trong phiên làm việc hiện tại, hiển thị trạng thái Online/Offline/Pending Sync.
*   **Trạng thái hệ thống**: Hiển thị nổi bật Badge "ONLINE/OFFLINE", bộ đếm "Pending sync count" và nút đăng xuất tài khoản.

---

## 4. Bảo mật và Cảnh báo

*   **Bảo mật QR**: Payload của QR cần chứa JWT hoặc Hash mã hóa từ Backend để ngăn chặn tạo QR giả mạo trong luồng Offline.
*   **Giới hạn lưu trữ**: `IndexedDB` lưu dữ liệu ổn định nhưng nhân viên cần đồng bộ ngay khi kết thúc ca làm việc, sau đó `clearSession()` trước khi bàn giao thiết bị.
