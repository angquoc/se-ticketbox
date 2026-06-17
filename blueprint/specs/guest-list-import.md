# Đặc tả: Guest List Import từ CSV

## Mô tả

Tính năng Guest List Import cho phép Organizer hoặc Admin nhập danh sách khách mời VIP từ file CSV do nhãn hàng tài trợ cung cấp.

Hệ thống xử lý file theo cơ chế bất đồng bộ thông qua BullMQ Worker để tránh làm chậm request upload. Dữ liệu hợp lệ được lưu vào danh sách khách mời của concert, trong khi các dòng lỗi hoặc trùng lặp được ghi nhận vào báo cáo import.

Tính năng này giải quyết bài toán tích hợp một chiều với hệ thống khách mời bên ngoài khi không có API và chỉ nhận dữ liệu dưới dạng file CSV.

---

## Luồng chính

### Thành phần tham gia

* Admin Web App
* Backend API
* PostgreSQL
* Object Storage
* BullMQ
* Background Worker
* Notification Module

### Luồng xử lý

1. Organizer hoặc Admin chọn file CSV và upload từ Admin Web App.

2. Backend API xác thực JWT và kiểm tra quyền:

   * Chỉ ORGANIZER sở hữu concert hoặc ADMIN được phép import.
   * Nếu không có quyền, request bị từ chối.

3. Backend kiểm tra:

   * Định dạng file CSV.
   * Kích thước file.
   * MIME type hợp lệ.

4. Backend lưu file vào Object Storage.

5. Backend tạo bản ghi `UploadedFile`:

```text
purpose = GUEST_LIST_CSV
status = PENDING
```

6. Backend đẩy job `csv-import` vào BullMQ.

7. Backend trả phản hồi thành công ngay cho frontend:

```json
{
  "message": "CSV uploaded successfully",
  "jobStatus": "PENDING"
}
```

8. Worker nhận job từ hàng đợi.

9. Worker tải file CSV từ Object Storage.

10. Worker đọc dữ liệu theo từng batch hoặc stream.

11. Với mỗi dòng dữ liệu:

    * Chuẩn hóa dữ liệu.
    * Kiểm tra họ tên.
    * Kiểm tra email.
    * Kiểm tra số điện thoại.
    * Kiểm tra dữ liệu trùng.

12. Nếu dữ liệu hợp lệ:

    * Insert hoặc update vào `GuestListEntry`.

13. Nếu dữ liệu không hợp lệ:

    * Ghi lỗi vào Import Report.
    * Tiếp tục xử lý các dòng còn lại.

14. Sau khi xử lý toàn bộ file:

    * Tính tổng số dòng.
    * Đếm số dòng thành công.
    * Đếm số dòng lỗi.
    * Đếm số dòng duplicate.

15. Worker cập nhật trạng thái cuối cùng của file:

```text
COMPLETED
COMPLETED_WITH_ERRORS
FAILED
```

16. Worker phát sự kiện:

```text
CSVImportCompleted
```

17. Notification Module gửi email hoặc thông báo cho Organizer/Admin về kết quả import.

---

## Kịch bản lỗi

### Không có quyền import

Nguyên nhân:

* User không phải ORGANIZER của concert.
* User không phải ADMIN.

Hành động:

* Backend trả `403 Forbidden`.
* Không lưu file.
* Không tạo job.

### File sai định dạng

Nguyên nhân:

* Không phải CSV.
* MIME type không hợp lệ.

Hành động:

* Backend trả lỗi validation.
* Không lưu file.
* Không enqueue job.

### File quá lớn

Nguyên nhân:

* Vượt kích thước tối đa cho phép.

Hành động:

* Backend từ chối upload.
* Trả lỗi rõ ràng cho người dùng.

### File rỗng

Nguyên nhân:

* Không có dữ liệu.

Hành động:

* Worker đánh dấu job thất bại.
* `UploadedFile.status = FAILED`.

### File không đọc được

Nguyên nhân:

* CSV lỗi encoding.
* Object Storage mất file.

Hành động:

* Worker dừng xử lý.
* Ghi log lỗi.
* `UploadedFile.status = FAILED`.

### Dòng dữ liệu không hợp lệ

Ví dụ:

* Thiếu họ tên.
* Email sai định dạng.
* Số điện thoại sai định dạng.

Hành động:

* Dòng đó bị bỏ qua.
* Ghi vào Import Report.
* Các dòng khác vẫn tiếp tục xử lý.

### Dữ liệu trùng lặp

Ví dụ:

* Trùng email.
* Trùng số điện thoại.

Hành động:

* Thực hiện update hoặc bỏ qua theo rule nghiệp vụ.
* Ghi nhận trong báo cáo import.

### Worker bị dừng giữa chừng

Nguyên nhân:

* Crash process.
* Server restart.

Hành động:

* BullMQ retry theo cấu hình.
* Nếu vượt quá số lần retry:

  * Job chuyển trạng thái FAILED.
  * File giữ nguyên để có thể import lại.

### Lỗi database

Nguyên nhân:

* PostgreSQL không khả dụng.
* Lỗi ghi dữ liệu.

Hành động:

* Batch hiện tại thất bại.
* Worker retry theo cấu hình.
* Ghi log chi tiết để điều tra.

### Gửi thông báo thất bại

Nguyên nhân:

* Notification Service lỗi.

Hành động:

* Import vẫn được xem là hoàn thành.
* Notification job retry riêng.
* Không rollback dữ liệu đã import.

---

## Ràng buộc

### Phân quyền

* Chỉ ORGANIZER sở hữu concert hoặc ADMIN được import guest list.
* CUSTOMER và STAFF không được truy cập chức năng này.

### Định dạng dữ liệu

CSV phải hỗ trợ tối thiểu các cột:

```csv
fullName,email,phone,sponsorName
```

Trong đó:

* `fullName` là bắt buộc.
* `email` là tùy chọn.
* `phone` là tùy chọn.
* `sponsorName` là tùy chọn.

### Tính nhất quán dữ liệu

* Một dòng lỗi không được làm hỏng toàn bộ quá trình import.
* Dữ liệu hợp lệ phải được ghi nhận ngay cả khi file có lỗi ở các dòng khác.
* Trạng thái file phải phản ánh chính xác kết quả xử lý.

### Hiệu năng

* Upload file không được chờ toàn bộ quá trình import hoàn tất.
* Request upload nên phản hồi trong thời gian ngắn.
* Worker phải hỗ trợ xử lý theo batch hoặc stream để tránh tải toàn bộ file lớn vào RAM.

### Khả năng phục hồi

* Job phải hỗ trợ retry khi xảy ra lỗi tạm thời.
* File gốc phải được lưu trong Object Storage để có thể reprocess.
* Import phải tiếp tục hoạt động sau khi Worker khởi động lại.

### Bảo mật

* Chỉ file CSV hợp lệ được chấp nhận.
* Không thực thi nội dung từ file upload.
* Tất cả request upload phải yêu cầu JWT hợp lệ.

---

## Tiêu chí chấp nhận

### AC-01 — Upload thành công

Cho một file CSV hợp lệ

Khi Organizer upload file

Thì:

* File được lưu vào Object Storage.
* Tạo bản ghi `UploadedFile`.
* Job được đưa vào BullMQ.
* API trả phản hồi thành công.

### AC-02 — Import dữ liệu hợp lệ

Cho file chứa 100 dòng hợp lệ

Khi Worker xử lý

Thì:

* 100 bản ghi được tạo hoặc cập nhật trong `GuestListEntry`.
* `UploadedFile.status = COMPLETED`.

### AC-03 — Chịu lỗi từng dòng

Cho file có:

* 90 dòng hợp lệ.
* 10 dòng lỗi.

Khi Worker xử lý

Thì:

* 90 dòng vẫn được import.
* 10 dòng được ghi vào Import Report.
* `UploadedFile.status = COMPLETED_WITH_ERRORS`.

### AC-04 — Kiểm tra phân quyền

Cho user không phải ORGANIZER hoặc ADMIN

Khi gọi API import

Thì:

* Hệ thống trả `403 Forbidden`.
* Không tạo file.
* Không tạo job.

### AC-05 — Retry khi Worker lỗi

Cho Worker gặp lỗi tạm thời

Khi BullMQ retry thành công

Thì:

* Job tiếp tục xử lý.
* Không tạo dữ liệu trùng lặp.

### AC-06 — Thông báo hoàn tất

Sau khi import hoàn thành

Thì:

* Event `CSVImportCompleted` được phát ra.
* Organizer/Admin nhận được thông báo hoặc email kết quả import.

### AC-07 — Không làm chậm request upload

Cho file CSV lớn

Khi upload

Thì:

* API không xử lý toàn bộ file trong request HTTP.
* Frontend nhận phản hồi ngay sau khi job được enqueue.
* Toàn bộ quá trình import diễn ra ở Background Worker.
