# R.E.E M&E Website — Gói bàn giao cho Dev (Umbraco)

Bản giao diện đã được khách hàng duyệt (15/10/2026). Đã loại bỏ toàn bộ lớp comment/chỉnh sửa của khách hàng (review layer, Supabase, trình sửa chữ trên preview) — gói này chỉ chứa website.

## Cấu trúc

```
ree-me-website/          Bản website chạy được (static build)
  index.html             Entry point (SPA, hash routing  #/duong-dan)
  assets/
    index-ReeCa02.js     Bundle React (TanStack Router) — đã build/minify
    index-D71z0cGY.css   Toàn bộ CSS (Tailwind v4 đã compile + CSS bổ sung cuối file)
    *.jpg|png|webp|svg   Hình ảnh, logo, giải thưởng
    hero-ree-*.mp4       Video hero trang chủ
    REE-ME-Company-Profile-2026-*.pdf, brochure-page-*.jpg   Hồ sơ năng lực
    national/            Ảnh "Công trình trọng điểm Quốc gia" + hoa văn trống đồng (drum.svg)
    about/               Nền section "Danh mục công trình" (catalog-sky.jpg, treeline.svg)
    fonts/               Font tự host: Great Vibes (chữ viết tay), Montserrat
  careers/               Các trang HTML tĩnh độc lập (không phụ thuộc bundle)
    index.html           Tuyển dụng – trang chính
    jobs.html            Danh sách vị trí
    job.html#<id>        Chi tiết vị trí
    services.html        Dịch vụ
    assets/              site.css, site.js, jobs-data.js (dữ liệu việc làm), ảnh, font
reference/
  screens/               Ảnh chụp toàn trang từng page, desktop 1440px + mobile 390px
  html/                  HTML đã render của từng page React (markup + class) để dựng Razor view
content/
  site-content.json      Dữ liệu nội dung: công trình, chi tiết công trình, công trình trọng điểm,
                         loại hình, 8 dịch vụ, vị trí tuyển dụng
```

## Chạy thử

Phục vụ thư mục `ree-me-website/` bằng bất kỳ static server nào, ví dụ:

```
cd ree-me-website && npx serve .        # hoặc: python3 -m http.server 8080
```

Mở `http://localhost:8080/#/`. Lưu ý không mở trực tiếp bằng file:// (module script cần HTTP).

## Danh sách trang (route)

| Trang | Route | Ghi chú |
|---|---|---|
| Trang chủ | `#/` | Hero video, Về chúng tôi, Quy trình, Dịch vụ (slider 8 mục), Loại hình, Tin tức… |
| Về chúng tôi | `#/ve-chung-toi` | Hero, Tổng quan, Giá trị cốt lõi, Sơ đồ tổ chức, Chiến lược 2030… |
| Dịch vụ | `#/dich-vu` | Nhúng `careers/services.html` qua iframe |
| Công trình | `#/cong-trinh` | Công trình trọng điểm QG (bento) + Danh mục (bộ lọc Loại hình/Tiến độ/Địa điểm, dải card cuộn ngang) |
| Chi tiết công trình | `#/cong-trinh/<slug>` | 9 công trình + 8 công trình trọng điểm (slug `qg-*`); có "Dự án liên quan" dạng carousel 3D |
| Lĩnh vực thi công | `#/linh-vuc-thi-cong`, `#/du-an/<slug>` | |
| Phát triển bền vững | `#/phat-trien-ben-vung` | |
| Tin tức | `#/tin-tuc` | |
| Tuyển dụng | `#/tuyen-dung`, `#/tuyen-dung/vi-tri`, `#/tuyen-dung/<code>` | Nhúng `careers/*.html` qua iframe |
| Hồ sơ năng lực | `#/ho-so-nang-luc` | Xem nhanh / tải PDF |
| Liên hệ | `#/lien-he` | Form liên hệ (chưa nối backend) |

## Gợi ý triển khai trên Umbraco

- Bundle JS là bản đã build từ React — **không chỉnh sửa trực tiếp**; dùng làm bản tham chiếu giao diện/hành vi.
- Dựng Razor views theo `reference/html/*.html` (giữ nguyên class để dùng lại `index-D71z0cGY.css`) và đối chiếu `reference/screens/`.
- Các trang trong `careers/` là HTML/CSS/JS thuần — có thể đưa gần như nguyên trạng vào Umbraco làm template.
- Document Types gợi ý (dữ liệu mẫu trong `content/site-content.json`):
  - **Project** (Công trình): name, slug, scope/loại hình, place, image, categories, client, status, scale[], location
  - **National Key Project**: fullName, shortTitle, subtitle, client, scale, status, image(s)
  - **Service** (Dịch vụ): no, name, desc, image, icon
  - **Job** (Vị trí tuyển dụng): xem `careers/assets/jobs-data.js`
  - **News**, **Project Type** (Loại hình)
- Routing hiện dùng hash (`#/…`); trên Umbraco nên chuyển sang URL thật (`/cong-trinh/...`) cho SEO.
- Form Liên hệ / Gửi CV / Đăng ký hiện chưa có backend — cần nối với Umbraco Forms hoặc API.

## Font & màu

- Font chính: **Plus Jakarta Sans** (Google Fonts). Chữ viết tay: **Great Vibes** (tự host, `assets/fonts/gv-*`). Montserrat có sẵn trong `assets/fonts/` (hiện không dùng).
- Màu thương hiệu (CSS variables trong file CSS): `--navy` oklch(37.6% .13 259), `--navy-deep` oklch(29% .11 261), `--brand-red` oklch(58.6% .196 28), `--gold` oklch(81.2% .098 84).
