# Đặc tả: Authentication & Authorization

## Mô tả

Tính năng Authentication & Authorization chịu trách nhiệm xác thực danh tính người dùng và kiểm soát quyền truy cập vào các chức năng của hệ thống TicketBox.

Hệ thống sử dụng cơ chế đăng ký, đăng nhập bằng email và mật khẩu. Sau khi đăng nhập thành công, Backend API cấp JWT cho client. JWT được dùng trong các request tiếp theo để xác thực người dùng.

Hệ thống áp dụng mô hình **Hybrid RBAC + Resource Ownership Check**:

* **RBAC (Role-Based Access Control)** dùng để kiểm tra quyền truy cập theo vai trò.
* **Resource Ownership Check** dùng để đảm bảo người dùng chỉ được thao tác trên tài nguyên thuộc quyền của mình.

Các vai trò chính:

| Role      | Mô tả                                                                                          |
| --------- | ---------------------------------------------------------------------------------------------- |
| CUSTOMER  | Khán giả, có quyền xem concert, mua vé và xem e-ticket của chính mình                          |
| ORGANIZER | Ban tổ chức, có quyền tạo/sửa/hủy concert của mình, cấu hình vé, xem doanh thu, upload PDF/CSV |
| STAFF     | Nhân sự soát vé, có quyền truy cập Check-in PWA, quét QR và đồng bộ check-in                   |
| ADMIN     | Quản trị viên hệ thống, có quyền quản lý toàn bộ hệ thống                                      |

Mục tiêu của tính năng này là đảm bảo:

* Người dùng chỉ truy cập được các chức năng phù hợp với vai trò.
* Mật khẩu không được lưu trực tiếp trong database.
* JWT phải được kiểm tra tại các API cần bảo vệ.
* Organizer không thể sửa concert của organizer khác.
* Customer không thể xem đơn hàng hoặc e-ticket của người khác.
* Staff chỉ được truy cập các chức năng phục vụ soát vé.

---

## Luồng chính

### 1. Luồng đăng ký tài khoản

Thành phần tham gia:

* Customer Web App hoặc Admin Web App
* Backend API
* PostgreSQL

Các bước xử lý:

1. Người dùng gửi yêu cầu đăng ký đến Backend API.

   ```http
   POST /auth/register
   ```

2. Request body gồm các thông tin cơ bản:

   ```json
   {
     "email": "user@example.com",
     "password": "password123",
     "fullName": "Nguyen Van A"
   }
   ```

3. Backend kiểm tra định dạng dữ liệu đầu vào.

4. Backend kiểm tra email đã tồn tại trong PostgreSQL hay chưa.

5. Nếu email chưa tồn tại, Backend hash mật khẩu bằng thuật toán an toàn như bcrypt.

6. Backend tạo bản ghi `User` trong PostgreSQL.

7. Mặc định, tài khoản mới có role là `CUSTOMER`.

8. Backend sinh JWT chứa `userId`, `email` và `role`.

9. Backend trả JWT về client.

Kết quả thành công:

```json
{
  "accessToken": "jwt_token",
  "user": {
    "id": "userId",
    "email": "user@example.com",
    "fullName": "Nguyen Van A",
    "role": "CUSTOMER"
  }
}
```

### 2. Luồng đăng nhập

Thành phần tham gia:

* Customer Web App, Admin Web App hoặc Check-in PWA
* Backend API
* PostgreSQL

Các bước xử lý:

1. Người dùng gửi email và mật khẩu đến Backend API.

   ```http
   POST /auth/login
   ```

2. Request body:

   ```json
   {
     "email": "user@example.com",
     "password": "password123"
   }
   ```

3. Backend tìm user theo email trong PostgreSQL.

4. Nếu user tồn tại, Backend so sánh mật khẩu người dùng nhập với `passwordHash`.

5. Nếu mật khẩu hợp lệ, Backend sinh JWT.

6. JWT chứa các thông tin tối thiểu:

   ```json
   {
     "sub": "userId",
     "email": "user@example.com",
     "role": "CUSTOMER"
   }
   ```

7. Backend trả JWT về client.

8. Client lưu JWT và gửi kèm trong các request tiếp theo bằng header:

   ```http
   Authorization: Bearer <accessToken>
   ```

### 3. Luồng truy cập API được bảo vệ

Thành phần tham gia:

* Client
* Backend API
* JwtAuthGuard
* RolesGuard
* Service Layer
* PostgreSQL

Các bước xử lý:

1. Client gửi request đến một API yêu cầu đăng nhập.

   Ví dụ:

   ```http
   GET /orders/me
   Authorization: Bearer <accessToken>
   ```

2. `JwtAuthGuard` kiểm tra JWT có tồn tại, hợp lệ và chưa hết hạn hay không.

3. Nếu token hợp lệ, Backend giải mã JWT và gắn thông tin user vào request.

4. Nếu endpoint yêu cầu role cụ thể, `RolesGuard` kiểm tra role của user.

5. Nếu user có role phù hợp, request được chuyển vào controller/service.

6. Với tài nguyên thuộc sở hữu riêng, service tiếp tục kiểm tra ownership.

Ví dụ:

* Customer chỉ được xem order có `order.userId` trùng với `userId` trong JWT.
* Organizer chỉ được sửa concert có `concert.organizerId` trùng với `userId` trong JWT.
* Staff chỉ được gọi API check-in và sync log.
* Admin có quyền quản trị toàn hệ thống.

### 4. Luồng phân quyền theo role

Một số endpoint tiêu biểu:

| Endpoint                                     | Role được phép   | Kiểm tra bổ sung                          |
| -------------------------------------------- | ---------------- | ----------------------------------------- |
| `GET /concerts`                              | Public           | Không yêu cầu đăng nhập                   |
| `GET /concerts/:id`                          | Public           | Không yêu cầu đăng nhập                   |
| `POST /orders`                               | CUSTOMER         | Kiểm tra userId từ JWT                    |
| `GET /orders/me`                             | CUSTOMER         | Chỉ trả đơn hàng của chính user           |
| `GET /tickets/me`                            | CUSTOMER         | Chỉ trả e-ticket của chính user           |
| `POST /organizer/concerts`                   | ORGANIZER, ADMIN | OrganizerId lấy từ JWT                    |
| `PATCH /organizer/concerts/:id`              | ORGANIZER, ADMIN | Organizer chỉ sửa concert của mình        |
| `DELETE /organizer/concerts/:id`             | ORGANIZER, ADMIN | Organizer chỉ hủy concert của mình        |
| `POST /organizer/concerts/:id/upload-pdf`    | ORGANIZER, ADMIN | Organizer chỉ upload cho concert của mình |
| `POST /organizer/concerts/:id/import-guests` | ORGANIZER, ADMIN | Organizer chỉ import cho concert của mình |
| `POST /checkin/scan`                         | STAFF, ADMIN     | Ghi nhận staffId từ JWT                   |
| `POST /checkin/sync`                         | STAFF, ADMIN     | Ghi nhận staffId và deviceId              |
| `GET /admin/users`                           | ADMIN            | Không                                     |
| `GET /admin/system-health`                   | ADMIN            | Không                                     |

### 5. Luồng kiểm tra quyền sở hữu tài nguyên

Ví dụ với API sửa concert:

```http
PATCH /organizer/concerts/:concertId
Authorization: Bearer <accessToken>
```

Các bước xử lý:

1. `JwtAuthGuard` xác thực token.

2. `RolesGuard` kiểm tra user có role `ORGANIZER` hoặc `ADMIN`.

3. Nếu user là `ADMIN`, cho phép tiếp tục.

4. Nếu user là `ORGANIZER`, service truy vấn concert theo `concertId`.

5. Service kiểm tra:

   ```txt
   concert.organizerId == currentUser.userId
   ```

6. Nếu đúng, cho phép cập nhật.

7. Nếu sai, trả lỗi `403 Forbidden`.

Cơ chế này tránh trường hợp một organizer có thể sửa hoặc xóa concert của organizer khác chỉ vì cùng có role `ORGANIZER`.

---

## Kịch bản lỗi

### 1. Email đã tồn tại khi đăng ký

Điều kiện:

* Người dùng đăng ký bằng email đã có trong hệ thống.

Cách xử lý:

* Backend không tạo user mới.
* Trả lỗi:

```http
409 Conflict
```

Thông báo:

```json
{
  "message": "Email này đã được sử dụng"
}
```

### 2. Dữ liệu đăng ký không hợp lệ

Ví dụ:

* Email sai định dạng.
* Mật khẩu quá ngắn.
* Thiếu email hoặc password.

Cách xử lý:

* Backend validate request body.
* Trả lỗi:

```http
400 Bad Request
```

### 3. Đăng nhập sai email hoặc mật khẩu

Điều kiện:

* Email không tồn tại.
* Hoặc mật khẩu không khớp.

Cách xử lý:

* Backend không nói rõ email hay mật khẩu sai để tránh lộ thông tin tài khoản.
* Trả lỗi:

```http
401 Unauthorized
```

Thông báo:

```json
{
  "message": "Sai email hoặc mật khẩu"
}
```

### 4. Thiếu JWT khi gọi API bảo vệ

Điều kiện:

* Client gọi API cần đăng nhập nhưng không gửi header `Authorization`.

Cách xử lý:

```http
401 Unauthorized
```

### 5. JWT không hợp lệ hoặc hết hạn

Điều kiện:

* Token bị sửa.
* Token hết hạn.
* Token ký bằng secret không đúng.

Cách xử lý:

```http
401 Unauthorized
```

Client cần yêu cầu người dùng đăng nhập lại.

### 6. Không đủ quyền truy cập endpoint

Ví dụ:

* Customer gọi API tạo concert.
* Customer gọi API check-in.
* Staff gọi API quản lý concert.
* Organizer gọi API admin toàn hệ thống.

Cách xử lý:

```http
403 Forbidden
```

### 7. Không sở hữu tài nguyên

Ví dụ:

* Organizer A cố sửa concert của Organizer B.
* Customer A cố xem order của Customer B.

Cách xử lý:

```http
403 Forbidden
```

### 8. Database tạm thời không khả dụng

Điều kiện:

* PostgreSQL lỗi kết nối hoặc timeout.

Cách xử lý:

* Backend trả lỗi hệ thống.
* Không cấp token mới.
* Không tạo user mới.
* Không xác nhận đăng nhập.

Mã lỗi đề xuất:

```http
503 Service Unavailable
```

### 9. Người dùng gửi nhiều request đăng nhập/đăng ký liên tục

Điều kiện:

* Client hoặc bot spam endpoint auth.

Cách xử lý:

* Áp dụng rate limit theo IP hoặc user identifier.
* Nếu vượt ngưỡng, trả:

```http
429 Too Many Requests
```

---

## Ràng buộc

### Bảo mật mật khẩu

* Không lưu mật khẩu dạng plain text.
* Mật khẩu phải được hash bằng bcrypt hoặc thuật toán tương đương.
* Không trả `passwordHash` về client trong bất kỳ response nào.
* Không log mật khẩu hoặc token trong log hệ thống.

### Bảo mật JWT

* JWT phải được ký bằng `JWT_SECRET`.
* `JWT_SECRET` phải lưu trong biến môi trường, không hard-code trong source code.
* JWT phải có thời hạn sử dụng.
* Payload JWT chỉ chứa thông tin cần thiết như `sub`, `email`, `role`.
* Không lưu thông tin nhạy cảm trong JWT.

### Phân quyền

* Các API quản trị phải được bảo vệ bằng JWT.
* Các API yêu cầu role phải dùng `RolesGuard`.
* Các API thao tác trên tài nguyên riêng phải kiểm tra ownership ở service layer.
* Không chỉ dựa vào frontend để ẩn/hiện chức năng; Backend API luôn phải kiểm tra quyền.

### Tính nhất quán dữ liệu

* Email user phải unique trong PostgreSQL.
* Role của user phải lấy từ database khi đăng nhập và đưa vào JWT.
* Nếu role của user bị thay đổi, token cũ có thể còn hiệu lực đến khi hết hạn; với phạm vi đồ án, có thể yêu cầu user đăng nhập lại sau khi đổi role.

### Hiệu năng và chống abuse

* Endpoint đăng nhập và đăng ký cần được rate limit.
* Không cho phép brute-force password không giới hạn.
* Response lỗi đăng nhập không được tiết lộ email có tồn tại hay không.

### Phạm vi triển khai trong đồ án

* Hệ thống sử dụng email/password login.
* Chưa triển khai OAuth Google/Facebook.
* Chưa triển khai refresh token phức tạp.
* Chưa triển khai xác thực hai lớp.
* Admin có thể được tạo bằng seed data hoặc script nội bộ.

---

## Tiêu chí chấp nhận

### Đăng ký

* Người dùng có thể đăng ký bằng email, password và fullName.
* Hệ thống tạo user mới trong PostgreSQL.
* Mật khẩu được lưu dưới dạng `passwordHash`.
* Role mặc định của user mới là `CUSTOMER`.
* Response đăng ký trả về JWT.
* Không trả password hoặc passwordHash về client.
* Đăng ký bằng email trùng trả lỗi `409 Conflict`.

### Đăng nhập

* Người dùng đăng nhập thành công bằng email và password đúng.
* Response đăng nhập trả về JWT.
* JWT chứa `sub`, `email`, `role`.
* Đăng nhập sai email hoặc password trả `401 Unauthorized`.
* Không tiết lộ email có tồn tại hay không.

### Xác thực JWT

* API bảo vệ từ chối request không có token.
* API bảo vệ từ chối token sai hoặc hết hạn.
* API bảo vệ chấp nhận token hợp lệ.
* Backend lấy được `userId`, `email`, `role` từ JWT.

### Phân quyền RBAC

* Customer không thể truy cập API của Organizer.
* Customer không thể truy cập API Check-in.
* Staff chỉ có thể truy cập API Check-in.
* Organizer có thể truy cập API quản lý concert.
* Admin có thể truy cập API quản trị hệ thống.

### Kiểm tra ownership

* Organizer chỉ sửa được concert của mình.
* Organizer không sửa được concert của organizer khác.
* Customer chỉ xem được order và ticket của chính mình.
* Staff khi check-in phải được ghi nhận bằng `staffId` từ JWT.

### Chống abuse

* Endpoint login/register có rate limit.
* Khi vượt giới hạn request, hệ thống trả `429 Too Many Requests`.

### Kiểm thử tối thiểu

Các test case tối thiểu cần có:

1. Register user mới thành công.
2. Register email trùng trả `409`.
3. Login đúng trả JWT.
4. Login sai trả `401`.
5. Gọi API protected không token trả `401`.
6. Gọi API protected có token hợp lệ trả `200`.
7. Customer gọi API organizer trả `403`.
8. Organizer sửa concert của mình thành công.
9. Organizer sửa concert của người khác trả `403`.
10. Customer xem order của người khác trả `403`.
