# Đặc tả Kỹ thuật: Admin Web Dashboard

Tài liệu này mô tả chi tiết thiết kế, kiến trúc và luồng xử lý của ứng dụng **Admin Web** dành cho ban tổ chức sự kiện và quản trị viên, được phát triển theo định hướng của đồ án TicketBox.

---

## 1. Tổng quan kiến trúc (Architecture Overview)

Admin Web được xây dựng dựa trên các công nghệ hiện đại, đảm bảo tính bảo mật, hiệu năng và trải nghiệm người dùng (UX) cao cấp:
*   **Framework**: Next.js (App Router) với React (TypeScript).
*   **Styling**: Tailwind CSS kết hợp thiết kế UI hiện đại, sử dụng các biến CSS (CSS Variables) để dễ dàng tùy biến theme và dark mode.
*   **Data Fetching & API**: Khởi tạo Axios instance với interceptor xử lý JWT tự động. Các custom hooks (ví dụ: `useDashboardData`, `useEventsData`) bao bọc logic gọi API, quản lý state và error handling.
*   **Routing**: Áp dụng tính năng Route Groups của Next.js để tách biệt logic layout giữa các luồng:
    *   `(auth)`: Luồng đăng nhập, đăng ký không cần sidebar.
    *   `(dashboard)`: Luồng quản trị chính yêu cầu xác thực và có Admin Sidebar, Header.

---

## 2. Thiết kế Module và Tính năng chính

### 2.1. Xác thực và Phân quyền (Authentication & Authorization)
*   **Flow đăng nhập**: Staff/Admin nhập thông tin tại `/login`. Ứng dụng gọi `POST /auth/login`, nhận JWT token và lưu vào `localStorage`. Thông tin user profile cơ bản cũng được cache tại đây.
*   **Bảo vệ Route**: Các trang thuộc nhóm `(dashboard)` yêu cầu xác thực, kiểm tra sự tồn tại của JWT.
*   **Quản lý phiên (Session Management)**: JWT Token interceptor sẽ đính kèm token vào mọi request tới backend. Nếu token hết hạn, interceptor sẽ xử lý redirect về `/login`.

### 2.2. Quản lý sự kiện (Event Management)
*   **Danh sách sự kiện (`/events`)**: Hiển thị lưới/danh sách concert. Tích hợp thanh tìm kiếm và bộ lọc theo trạng thái (`DRAFT`, `PUBLISHED`, `SALE_OPEN`, `COMPLETED`).
*   **Tạo mới sự kiện (`/events/new`)**:
    *   Form chia thành nhiều bước (FormSections): Thông tin cơ bản, Thời gian, Quy mô, Loại vé (Ticket Types).
    *   Hỗ trợ cấu hình dynamic ticket tiers (VVIP, VIP, GA) với số lượng và giá vé.
*   **Chi tiết sự kiện (`/events/[id]`)**:
    *   Hiển thị chi tiết trạng thái (Status Workflow Sidebar).
    *   **Thống kê nhanh (Quick Stats)**: Tình trạng bán vé, Capacity Bars trực quan.
    *   **Tích hợp AI Bio**: Tải lên PDF (Press Kit), theo dõi trạng thái background job và nhận kết quả tự động.
    *   **Interactive Seatmap**: Render bản đồ ghế SVG động, tối ưu hiệu năng hiển thị trên trình duyệt.

### 2.3. Tích hợp Nhập/Xuất Dữ Liệu (Import/Export)
*   **Tải lên danh sách khách mời (Guest List CSV)**: Tại trang `/guests` hoặc `/events/[id]`, cho phép tải file CSV qua giao diện Dropzone. File upload được chuyển thẳng tới Object Storage (như MinIO) qua backend API, đồng thời tạo trigger queue BullMQ để xử lý dữ liệu. Trạng thái (`PENDING`, `PROCESSING`, `COMPLETED`, `FAILED`) được cập nhật realtime hoặc qua polling.

### 2.4. Thống kê và Doanh thu (Dashboard & Revenue)
*   **Tổng quan (`/dashboard`)**: Tổng hợp dữ liệu hiển thị trên các `StatCard` (Số sự kiện, Vé đã bán, Doanh thu). Sử dụng `RevenueChart` để trực quan hóa dữ liệu.
*   **Báo cáo Doanh thu (`/revenue`)**: 
    *   Hiển thị danh sách đơn hàng (TransactionTable) và chi tiết payment status.
    *   Kết nối với API `GET /admin/orders` có khả năng lọc động theo sự kiện, thời gian.

### 2.5. Cài đặt hệ thống (Settings)
*   **Thông tin cá nhân & Đổi mật khẩu (`/settings`)**: Form cập nhật profile, modal `ChangePasswordModal` kết nối với API `/auth/change-password`.

---

## 3. Cấu trúc Component & Hooks (UI/UX Guidelines)

*   **Custom Hooks**: Đóng gói hoàn toàn logic API, ví dụ `useDashboardData`, `useEventDetailData`, `useNewEventForm`.
*   **Components tái sử dụng**:
    *   `StatCard`, `QuickStatCard`: Hiển thị số liệu.
    *   `Badge`, `PaymentStatusBadge`: Hiển thị các tag trạng thái chuẩn hóa màu sắc.
    *   `UploadDropzone`, `UploadedFileItem`: Trải nghiệm người dùng tốt nhất khi thao tác với file.
    *   `CapacityBar`: Hiển thị dạng progress bar cho sức chứa.
*   **Quy chuẩn UI**:
    *   Màu sắc thương hiệu: Primary `#003298`, Secondary `#DCE1FF`.
    *   Border radius tiêu chuẩn: `8px` hoặc `4px`.
    *   Định dạng tiền tệ thống nhất VND (₫) và phông chữ monospaced cho các trường id.

---

## 4. Kiểm thử và Triển khai
*   Cần bao phủ Unit Test cho các utils hàm tính toán, format, và các custom hooks.
*   Đảm bảo responsive thiết kế đặc biệt cho các bảng dữ liệu phức tạp.
