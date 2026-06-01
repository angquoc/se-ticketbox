# TicketBox — Project Proposal

## Vấn đề

Trong những năm gần đây, các concert âm nhạc quy mô lớn tại Việt Nam như Anh Trai Say Hi, Anh Trai Vượt Ngàn Chông Gai, Em Xinh Say Hi hay Chị Đẹp Đạp Gió Rẽ Sóng thu hút hàng chục nghìn khán giả tham gia. Khi mở bán vé, lượng truy cập thường tăng đột biến trong thời gian rất ngắn, dẫn đến nhiều vấn đề về hiệu năng, tính công bằng và trải nghiệm người dùng.

Nhiều đơn vị tổ chức hiện vẫn sử dụng các phương thức bán vé rời rạc như Zalo OA, Google Form hoặc xác nhận chuyển khoản thủ công. Các phương thức này phù hợp với sự kiện nhỏ nhưng bộc lộ nhiều hạn chế khi áp dụng cho các concert có quy mô lớn:

* Không có cơ chế quản lý tồn kho vé theo thời gian thực.
* Dễ xảy ra tranh chấp khi nhiều người cùng mua số lượng vé giới hạn.
* Khó kiểm soát số lượng vé tối đa mỗi người được mua.
* Quy trình thanh toán và xác nhận thủ công gây chậm trễ.
* Không hỗ trợ e-ticket và kiểm soát vé điện tử tại cổng.
* Dễ phát sinh gian lận hoặc nhầm lẫn dữ liệu.

Ngoài ra, các hệ thống bán vé trực tuyến hiện nay còn phải đối mặt với nhiều thách thức kỹ thuật:

* Website bị quá tải khi lượng truy cập tăng đột biến trong thời gian mở bán.
* Bot và scalper có thể mua số lượng lớn vé trong thời gian ngắn để bán lại với giá cao.
* Người dùng có thể bị trừ tiền nhưng không nhận được vé nếu quá trình thanh toán gặp sự cố.
* Khu vực tổ chức sự kiện thường có kết nối mạng không ổn định, gây khó khăn cho quá trình soát vé tại cổng.
* Dữ liệu khách mời từ các đơn vị tài trợ thường chỉ được cung cấp dưới dạng file CSV, không có API tích hợp trực tiếp.

Các vấn đề trên cho thấy nhu cầu xây dựng một nền tảng bán vé tập trung có khả năng xử lý tải cao, đảm bảo tính công bằng trong quá trình mở bán và hỗ trợ toàn bộ vòng đời của vé điện tử từ khi phát hành đến khi khán giả vào cổng.

---

## Mục tiêu

TicketBox được xây dựng nhằm số hóa toàn bộ quy trình bán vé concert và giải quyết các vấn đề về hiệu năng, tính nhất quán dữ liệu và trải nghiệm người dùng.

### Mục tiêu nghiệp vụ

* Cho phép khán giả xem thông tin concert, sơ đồ ghế và mua vé trực tuyến.
* Tự động phát hành e-ticket dưới dạng mã QR sau khi thanh toán thành công.
* Hỗ trợ ban tổ chức quản lý concert, loại vé và doanh thu trên một nền tảng tập trung.
* Hỗ trợ nhân sự soát vé bằng ứng dụng quét QR.
* Tự động sinh Artist Bio từ hồ sơ nghệ sĩ hoặc press kit PDF.
* Hỗ trợ nhập danh sách khách mời VIP từ file CSV.

### Mục tiêu kỹ thuật

* Hỗ trợ tình huống khoảng **80.000 lượt truy cập trong 5 phút đầu mở bán**, trong đó phần lớn tập trung vào phút đầu tiên.
* Đảm bảo **không xảy ra oversell** khi nhiều người cùng mua loại vé có số lượng giới hạn.
* Đảm bảo một giao dịch thanh toán chỉ được xử lý đúng một lần.
* Giới hạn số vé mua theo từng tài khoản được áp dụng chính xác ngay cả dưới tải cao.
* Các chức năng không liên quan đến thanh toán vẫn hoạt động khi cổng thanh toán gặp sự cố.
* Hỗ trợ soát vé trong điều kiện mất kết nối mạng tạm thời.
* Giảm tải cho cơ sở dữ liệu khi các trang thông tin concert bị truy cập với tần suất rất cao.
* Thiết kế kiến trúc có khả năng mở rộng trong tương lai khi số lượng sự kiện và người dùng tăng lên.

---

## Người dùng và nhu cầu

### 1. Khán giả (Customer)

Khán giả là người mua vé và tham gia sự kiện.

**Nhu cầu chính:**

* Xem danh sách concert và thông tin chi tiết.
* Xem sơ đồ ghế và số vé còn lại.
* Chọn loại vé và thanh toán trực tuyến.
* Nhận e-ticket QR sau khi thanh toán thành công.
* Nhận thông báo xác nhận và nhắc nhở trước ngày diễn.
* Đảm bảo quá trình mua vé công bằng và minh bạch.

**Điều quan trọng nhất:**

* Không bị mất vé do tranh chấp.
* Không bị trừ tiền hai lần.
* Nhận vé nhanh chóng sau thanh toán.

### 2. Ban tổ chức (Organizer)

Ban tổ chức chịu trách nhiệm tạo và quản lý sự kiện.

**Nhu cầu chính:**

* Tạo và cập nhật thông tin concert.
* Cấu hình loại vé, giá vé và thời gian mở bán.
* Theo dõi doanh thu và tình trạng bán vé.
* Upload press kit PDF để sinh Artist Bio.
* Upload danh sách khách mời VIP bằng file CSV.

**Điều quan trọng nhất:**

* Quản lý vé tập trung.
* Theo dõi doanh thu chính xác.
* Giảm công việc thủ công trong quá trình vận hành.

### 3. Nhân sự soát vé (Staff)

Nhân sự làm việc tại cổng kiểm soát sự kiện.

**Nhu cầu chính:**

* Quét mã QR của khán giả.
* Xác minh vé hợp lệ.
* Ghi nhận lượt check-in.
* Tiếp tục làm việc khi mất mạng và đồng bộ dữ liệu sau đó.

**Điều quan trọng nhất:**

* Tốc độ quét nhanh.
* Không cho phép một vé được sử dụng nhiều lần.
* Không mất dữ liệu khi kết nối mạng không ổn định.

### 4. Quản trị viên hệ thống (Admin)

Quản trị viên chịu trách nhiệm vận hành hệ thống.

**Nhu cầu chính:**

* Quản lý người dùng và phân quyền.
* Theo dõi hoạt động hệ thống.
* Hỗ trợ xử lý các trường hợp bất thường.

**Điều quan trọng nhất:**

* Hệ thống ổn định.
* Dễ giám sát và bảo trì.

---

## Phạm vi

### Trong phạm vi đồ án

#### Quản lý concert

* Tạo, chỉnh sửa, hủy concert.
* Quản lý loại vé và số lượng vé.
* Quản lý sơ đồ chỗ ngồi SVG.

#### Bán vé

* Xem danh sách concert.
* Xem chi tiết concert.
* Chọn vé và đặt vé.
* Thanh toán thông qua cổng thanh toán mô phỏng.
* Nhận e-ticket QR.

#### Thông báo

* Email xác nhận mua vé.
* Email nhắc nhở trước sự kiện.
* Thông báo kết quả xử lý AI và CSV.

#### Soát vé

* Quét QR.
* Kiểm tra trạng thái vé.
* Hỗ trợ chế độ offline.
* Đồng bộ dữ liệu khi có mạng.

#### AI Artist Bio

* Upload press kit PDF.
* Trích xuất nội dung văn bản.
* Sinh Artist Bio bằng AI.

#### Guest List Import

* Upload file CSV khách mời.
* Kiểm tra dữ liệu hợp lệ.
* Đồng bộ danh sách khách mời.

#### Các cơ chế kỹ thuật

* RBAC và kiểm soát quyền truy cập.
* Token Bucket Rate Limiting.
* Virtual Waiting Room.
* Idempotency Key.
* Redis Cache.
* Circuit Breaker.
* Reservation và Expire Order.
* Background Job Processing.

### Ngoài phạm vi đồ án

* Tích hợp trực tiếp với VNPAY hoặc MoMo thật.
* Triển khai hạ tầng production quy mô lớn.
* Hệ thống chống bot nâng cao bằng Machine Learning.
* Hoàn vé hoặc chuyển nhượng vé.
* Tích hợp CRM, ERP hoặc hệ thống nội bộ của đơn vị tổ chức.
* Báo cáo tài chính hoặc kế toán chuyên sâu.
* Kiến trúc microservices hoàn chỉnh và autoscaling production.

---

## Rủi ro và ràng buộc

### Tranh chấp vé (Overselling)

Một số hạng vé có số lượng rất hạn chế nhưng có thể có hàng chục nghìn người cùng mua tại một thời điểm. Hệ thống phải đảm bảo một vé không được bán cho nhiều người.

### Tải trọng đột biến

Trong thời gian mở bán, lượng truy cập có thể tăng lên hàng chục nghìn người trong vài phút. Hệ thống phải bảo vệ backend khỏi quá tải và duy trì trải nghiệm công bằng cho người dùng thật.

### Thanh toán không ổn định

Cổng thanh toán có thể timeout, phản hồi chậm hoặc tạm thời không khả dụng. Hệ thống phải tránh tình trạng tạo nhiều giao dịch cho cùng một lần mua và không được làm gián đoạn các chức năng khác.

### Soát vé trong môi trường mạng yếu

Các sân vận động hoặc nhà thi đấu thường có chất lượng kết nối mạng không ổn định khi tập trung đông người. Hệ thống phải cho phép ghi nhận check-in tạm thời và đồng bộ lại khi có kết nối.

### Tích hợp dữ liệu một chiều

Danh sách khách mời từ nhà tài trợ chỉ được cung cấp thông qua file CSV. Hệ thống phải xử lý dữ liệu lỗi, dữ liệu trùng lặp và các thay đổi định kỳ mà không làm gián đoạn hoạt động đang diễn ra.

### Giới hạn vé theo người dùng

Giới hạn số vé mua trên mỗi tài khoản phải được áp dụng chính xác ngay cả khi người dùng gửi nhiều request đồng thời hoặc cố tình tìm cách vượt qua giới hạn.

### Cân bằng giữa hiệu năng và tính cập nhật dữ liệu

Trang danh sách concert và trang chi tiết có lượng truy cập rất lớn nhưng dữ liệu thay đổi không thường xuyên. Hệ thống cần giảm tải cho cơ sở dữ liệu trong khi vẫn đảm bảo số vé hiển thị đủ gần với trạng thái thực tế để không gây hiểu nhầm cho người dùng.
