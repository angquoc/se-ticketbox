# Đặc tả: AI Artist Bio

## Mô tả

Tính năng AI Artist Bio cho phép Ban tổ chức upload file PDF press kit hoặc hồ sơ nghệ sĩ của concert. Hệ thống sẽ xử lý file bất đồng bộ, trích xuất nội dung văn bản, làm sạch dữ liệu và gửi sang AI Provider để sinh một đoạn giới thiệu nghệ sĩ ngắn gọn, phù hợp hiển thị trên trang chi tiết concert.

Tính năng này giúp Ban tổ chức giảm công việc viết nội dung thủ công, đồng thời đảm bảo phần mô tả nghệ sĩ trên Customer Web được tạo nhanh, nhất quán và có thể cập nhật lại khi cần.

AI Artist Bio không chạy trực tiếp trong request upload chính. Backend chỉ nhận file, lưu vào Object Storage, tạo metadata trong PostgreSQL và đẩy job vào BullMQ. Background Worker sẽ xử lý phần đọc PDF, gọi AI và cập nhật kết quả sau.

## Luồng chính

1. Ban tổ chức đăng nhập vào Admin Web App bằng tài khoản có role `ORGANIZER` hoặc `ADMIN`.

2. Ban tổ chức chọn concert cần cập nhật Artist Bio và upload file PDF press kit.

3. Admin Web App gửi request upload file đến Backend API, kèm `concertId` và JWT của người dùng.

4. Backend API xác thực JWT bằng `JwtAuthGuard`.

5. Backend API kiểm tra quyền truy cập:

   * `ADMIN` được phép upload PDF cho mọi concert.
   * `ORGANIZER` chỉ được upload PDF cho concert thuộc quyền sở hữu của mình.

6. Backend API validate file đầu vào:

   * File phải tồn tại.
   * File phải là định dạng PDF.
   * File không được vượt quá giới hạn dung lượng cho phép.
   * Concert phải tồn tại và chưa bị xóa hoặc hủy không hợp lệ.

7. Backend API lưu file PDF vào Object Storage.

8. Backend API tạo bản ghi `UploadedFile` trong PostgreSQL với các thông tin:

   * `concertId`
   * `objectKey`
   * `fileName`
   * `mimeType`
   * `purpose = "ARTIST_PRESS_KIT"`
   * `status = "PENDING"`

9. Backend API đẩy job xử lý AI Bio vào BullMQ queue `queue:ai-bio`.

10. Backend API trả phản hồi sớm cho Admin Web App rằng file đã upload thành công và đang được xử lý nền.

11. Background Worker lấy job từ BullMQ.

12. Worker đọc metadata file từ PostgreSQL và tải file PDF từ Object Storage.

13. Worker trích xuất text từ PDF.

14. Worker làm sạch nội dung:

    * Loại bỏ khoảng trắng thừa.
    * Loại bỏ metadata hoặc nội dung nhiễu không cần thiết.
    * Cắt bớt nội dung nếu vượt quá giới hạn token đầu vào của AI Provider.

15. Worker gửi nội dung đã xử lý sang AI Provider để sinh Artist Bio.

16. AI Provider trả về đoạn Artist Bio ngắn gọn.

17. Worker lưu kết quả vào trường `Concert.artistBio` trong PostgreSQL.

18. Worker cập nhật bản ghi `UploadedFile.status = "COMPLETED"`.

19. Worker có thể đẩy event `ArtistBioGenerated` sang Notification Module để thông báo cho Organizer/Admin rằng Artist Bio đã được sinh xong.

20. Khi khán giả xem trang chi tiết concert, Customer Web App lấy Artist Bio từ Backend API. Backend có thể dùng Redis cache `cache:artist-bio:{concertId}` để giảm tải truy vấn lặp lại.

## Kịch bản lỗi

### Người dùng không có quyền upload

Nếu user không đăng nhập, Backend trả `401 Unauthorized`.

Nếu user có role không phù hợp, ví dụ `CUSTOMER` hoặc `STAFF`, Backend trả `403 Forbidden`.

Nếu `ORGANIZER` upload PDF cho concert không thuộc quyền sở hữu của mình, Backend trả `403 Forbidden`.

Hệ thống không lưu file, không tạo `UploadedFile` và không enqueue job.

### Concert không tồn tại

Nếu `concertId` không tồn tại, Backend trả lỗi `404 Not Found`.

Không lưu file và không tạo job xử lý AI Bio.

### File không hợp lệ

Nếu file không phải PDF, file rỗng hoặc vượt quá giới hạn dung lượng, Backend trả lỗi validate.

Không lưu file vào Object Storage và không enqueue job.

### Object Storage lỗi

Nếu lưu file vào Object Storage thất bại, Backend trả lỗi upload thất bại.

Không tạo job AI Bio vì Worker sẽ không có file để xử lý.

Nếu record `UploadedFile` đã được tạo trước khi phát hiện lỗi, hệ thống phải cập nhật trạng thái thành `FAILED` hoặc rollback record tùy cách triển khai.

### Enqueue job thất bại

Nếu file đã lưu thành công nhưng BullMQ enqueue job thất bại, Backend cập nhật `UploadedFile.status = "FAILED"` hoặc `PENDING_RETRY`.

File vẫn còn trong Object Storage để có thể reprocess thủ công hoặc retry sau.

### Worker không đọc được file

Nếu Worker không tải được file từ Object Storage, Worker đánh dấu `UploadedFile.status = "FAILED"` và lưu `errorMessage`.

Job có thể retry theo cấu hình BullMQ.

### PDF không trích xuất được text

Nếu PDF bị scan ảnh, bị lỗi cấu trúc hoặc không có text đọc được, Worker đánh dấu job thất bại.

`UploadedFile.status = "FAILED"` và `errorMessage` ghi rõ lý do, ví dụ: `PDF_TEXT_EXTRACTION_FAILED`.

Concert vẫn giữ nguyên `artistBio` cũ nếu đã có trước đó.

### AI Provider timeout hoặc lỗi

Nếu AI Provider timeout, trả lỗi hoặc không khả dụng, Worker retry job theo cơ chế backoff.

Nếu retry quá số lần cho phép, Worker cập nhật `UploadedFile.status = "FAILED"` và lưu `errorMessage`.

Lỗi AI không được làm ảnh hưởng đến luồng xem concert, mua vé, thanh toán hoặc check-in.

### AI trả về nội dung rỗng hoặc không đạt yêu cầu

Nếu AI Provider trả về nội dung rỗng, quá ngắn hoặc không hợp lệ, Worker không cập nhật `Concert.artistBio`.

Worker đánh dấu file là `FAILED` hoặc `COMPLETED_WITH_ERRORS` tùy rule triển khai, đồng thời lưu lý do lỗi.

### Database lỗi khi lưu kết quả

Nếu Worker sinh Bio thành công nhưng cập nhật PostgreSQL thất bại, job được retry.

Nếu retry vẫn thất bại, `UploadedFile.status` phải phản ánh lỗi để Admin biết cần xử lý lại.

### Notification gửi lỗi

Nếu thông báo `ArtistBioGenerated` gửi thất bại, Artist Bio vẫn được xem là đã tạo thành công nếu dữ liệu đã lưu vào PostgreSQL.

Notification job có thể retry riêng và không ảnh hưởng trạng thái chính của AI Bio.

## Ràng buộc

* Chỉ `ORGANIZER` sở hữu concert hoặc `ADMIN` mới được upload PDF để sinh Artist Bio.
* File đầu vào chỉ chấp nhận định dạng PDF.
* File PDF phải có giới hạn dung lượng để tránh làm nghẽn hệ thống.
* Request upload không được chờ AI xử lý xong; AI Bio phải được xử lý bất đồng bộ bằng BullMQ Worker.
* Backend API chính không được bị timeout do đọc PDF hoặc gọi AI Provider.
* PostgreSQL là nguồn dữ liệu chính lưu metadata file và kết quả Artist Bio.
* Object Storage là nơi lưu file PDF gốc; không lưu file lớn trực tiếp vào PostgreSQL.
* Nếu AI Provider lỗi, các chức năng chính như xem concert, mua vé, thanh toán và check-in vẫn phải hoạt động bình thường.
* Worker phải có retry và backoff cho lỗi tạm thời như timeout AI, lỗi mạng hoặc lỗi Object Storage.
* Không ghi đè `Concert.artistBio` cũ nếu job mới thất bại.
* Nội dung gửi sang AI Provider cần được làm sạch và giới hạn độ dài để tránh vượt quá giới hạn token.
* Artist Bio sinh ra phải ngắn gọn, phù hợp hiển thị trên trang chi tiết concert.
* Cache `cache:artist-bio:{concertId}` phải được invalidate khi Artist Bio được tạo lại hoặc cập nhật thủ công.
* Hệ thống phải lưu trạng thái xử lý của file để Admin biết job đang `PENDING`, `COMPLETED` hay `FAILED`.

## Tiêu chí chấp nhận

* Organizer có thể upload file PDF press kit từ Admin Web App.
* Admin có thể upload PDF cho bất kỳ concert nào.
* Customer và Staff không thể upload PDF sinh Artist Bio.
* Organizer không thể upload PDF cho concert không thuộc quyền sở hữu của mình.
* Khi upload PDF hợp lệ, hệ thống tạo bản ghi `UploadedFile` với `purpose = "ARTIST_PRESS_KIT"` và `status = "PENDING"`.
* Sau khi upload thành công, Backend trả phản hồi nhanh mà không chờ AI xử lý xong.
* Job AI Bio được tạo trong BullMQ queue `queue:ai-bio`.
* Worker đọc được file PDF từ Object Storage.
* Worker trích xuất và làm sạch nội dung PDF trước khi gọi AI Provider.
* Khi AI Provider trả kết quả thành công, hệ thống cập nhật `Concert.artistBio`.
* Sau khi xử lý thành công, `UploadedFile.status` được cập nhật thành `COMPLETED`.
* Artist Bio hiển thị đúng trên trang chi tiết concert của Customer Web App.
* Nếu file không phải PDF, hệ thống trả lỗi và không tạo job.
* Nếu AI Provider timeout hoặc lỗi, job được retry theo cấu hình.
* Nếu job thất bại sau khi retry, `UploadedFile.status` được cập nhật thành `FAILED` và có `errorMessage`.
* Khi job AI thất bại, hệ thống không làm ảnh hưởng đến các chức năng mua vé, thanh toán, xem concert và check-in.
* Nếu Artist Bio được sinh lại, cache `cache:artist-bio:{concertId}` được xóa hoặc cập nhật để người dùng thấy nội dung mới.
