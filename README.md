# R.E.E M&E Website — bản duyệt có bình luận

Website tĩnh (không cần build). Mở `index.html` qua một web server bất kỳ.

## Khách hàng góp ý
Ở cuối trang có thanh **Browse / Comment** (giao diện bình luận bằng tiếng Anh):
1. Bấm **Comment**, rồi bấm vào chỗ bất kỳ trên trang (kể cả các trang Tuyển dụng, Dịch vụ).
2. Nhập tên (chỉ lần đầu) và nội dung, có thể đính kèm tối đa 3 ảnh (hoặc dán ảnh bằng Ctrl+V), rồi **Send**.
3. Khung bên phải liệt kê mọi góp ý: trả lời, thả cảm xúc, đánh dấu đã xong, xoá, "Xem trên trang" để nhảy tới đúng chỗ, "Chép tất cả" để copy toàn bộ góp ý.
4. **Thông báo trả lời:** khi có người trả lời trong góp ý mình đã viết/đã trả lời (hoặc gọi tên `@Tên`), nút chuông trên thanh công cụ hiện số chưa đọc, có thông báo nổi trên trang và số trên tab trình duyệt; nếu cho phép, trình duyệt cũng báo khi đang mở tab khác. Bấm thông báo để nhảy tới đúng bình luận. Trạng thái đã đọc lưu riêng trên từng trình duyệt; chỉ báo khi trang đang mở hoặc lúc mở lại.

Bình luận lưu chung trên Supabase (project `joy-review`, bảng `ree_review_comments`, cấu hình trong `review/config.js`), nên mọi người mở link đều thấy như nhau và tự cập nhật mỗi 5 giây.

## Triển khai
Nên deploy ở **gốc tên miền** (ví dụ Vercel), vì menu của website dùng đường dẫn `/index.html#/…`.
- **Vercel:** Add New → Project → import repo này → Framework Preset: *Other*, Build Command để trống, Output Directory `.` → Deploy.

## Cấu trúc
- `index.html`, `assets/` — website chính (bản build).
- `careers/` — các trang Tuyển dụng, Vị trí, Chi tiết vị trí, Dịch vụ (nhúng vào menu Tuyển dụng / Dịch vụ).
- `review/` — lớp bình luận cho khách (`review.js`) và cấu hình (`config.js`).
- `supabase/review.sql` — câu lệnh tạo bảng bình luận (đã chạy sẵn).
