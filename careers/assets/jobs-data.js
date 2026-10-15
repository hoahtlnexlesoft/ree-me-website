/* REE M&E careers — job data. Edit this file to add/update positions. */
window.DEPTS = {
  site:   { name: "Thi công công trường", short: "Thi công" },
  design: { name: "Thiết kế & BIM",        short: "Thiết kế · BIM" },
  qs:     { name: "Dự toán & Giá thành",   short: "QS · Giá thành" }
};
window.SYSTEMS = { HVAC:"Điều hòa thông gió", ELEC:"Điện động lực & chiếu sáng", ELV:"Điện nhẹ", PLB:"Cấp thoát nước", FIRE:"PCCC", BMS:"Quản lý tòa nhà" };

/* Shared across every position (from the approved detail-page content) */
window.COMMON_PERKS = [
  "<b>100% lương</b> trong thời gian thử việc.",
  "Đóng <b>BHXH, BHYT, BHTN full lương</b>.",
  "Gói <b>Bảo hiểm sức khỏe PVI</b>, khám sức khỏe định kỳ hằng năm.",
  "Phụ cấp cơm trưa, nước uống, gửi xe; phụ cấp đi lại khi đi làm công trình xa; có nhà ở khi làm việc tại công trình ở các tỉnh.",
  "<b>Thưởng dự án</b>; thưởng tháng 13; thưởng kết quả kinh doanh hằng năm."
];
window.WORK_TIME = "Từ <b>Thứ 2 – Thứ 7</b> (Nghỉ Chủ Nhật hàng tuần).";
window.WORK_ENV = "Làm việc tại trụ sở e.town 5 chuẩn xanh quốc tế <b>LEED Platinum</b>; đặc quyền tập luyện miễn phí tại <b>REENERGIZE Station</b> (phòng gym hiện đại, yoga), cùng chuỗi hoạt động gắn kết văn hóa thể thao Jardines Familympic định kỳ.";

/* Location tags, same order and colours as the recruiting site */
window.LOC_TAGS = [
  { k:"TP.HCM", c:"#2ED3C6", t:"#0B3B38" },
  { k:"Hà Nội", c:"#C9F2D2", t:"#16502A" },
  { k:"Đà Nẵng", c:"#F7A21B", t:"#3D2500" },
  { k:"Đồng Nai", c:"#F27AE0", t:"#4A0F40" },
  { k:"Các tỉnh miền Bắc", c:"#7FD87F", t:"#123B12" },
  { k:"Phú Quốc", c:"#A10F7A", t:"#fff" },
  { k:"Các dự án công ty thi công", c:"#C8380E", t:"#fff" },
  { k:"Quảng Trị", c:"#9A1A0C", t:"#fff" }
];
window.locPills = j => j.loc.split(" · ").map(k => { const o = LOC_TAGS.find(x => x.k === k) || { c:"#e5e7eb", t:"#111" }; return `<span class="loc-pill" style="background:${o.c};color:${o.t}">${k}</span>`; }).join("");

/* Field tag colours (same as the recruiting site) */
window.FIELD_TAGS = {
  salary: [ { k:"Thương lượng", c:"#FCE8A6", t:"#5A4300" } ],
  exp: [ { k:"Không yêu cầu", c:"#3F4652", t:"#fff" }, { k:"Ưu tiên có kinh nghiệm", c:"#D3E2FF", t:"#1B3C86" }, { k:"Trên 1 năm", c:"#8FB4F6", t:"#0B2A66" }, { k:"Trên 2 năm", c:"#BFE6FF", t:"#0B3A55" }, { k:"Trên 3 năm", c:"#1D4ED8", t:"#fff" } ],
  english: [ { k:"Không yêu cầu", c:"#A9ADB4", t:"#15181D" }, { k:"Đọc hiểu", c:"#D3E2FF", t:"#1B3C86" }, { k:"Đọc viết", c:"#BFEBFF", t:"#0B3A55" } ],
  workTime: [ { k:"Từ T2 - T7", c:"#F9A17C", t:"#4A1A06" }, { k:"Từ T2 - Sáng T7", c:"#FDD3BD", t:"#4A1A06" } ],
  interview: [ { k:"Phỏng vấn từ 1 - 2 vòng", c:"#BFE6FF", t:"#0B3A55" } ]
};
window.fieldPill = (f, v) => { const o = (FIELD_TAGS[f] || []).find(x => x.k === v) || { c:"#E5E7EB", t:"#111" }; return `<span class="loc-pill" style="background:${o.c};color:${o.t}">${v}</span>`; };

/* Positions copied from the REE M&E recruiting site (sites.google.com/reeme.com.vn/tuyendung): code, title, loc, salary, exp, english, workTime.
   desc/req = null until the full text is provided. dept/systems/level/type/deadline/qty/summary are empty and not displayed. */
window.JOBS = [
  {"id": "ky-su-he-co-26056-2-1", "code": "26056_2_1", "title": "Kỹ sư hệ cơ", "loc": "TP.HCM · Đồng Nai", "salary": "Thương lượng", "exp": "Ưu tiên có kinh nghiệm", "english": "Không yêu cầu", "workTime": "Từ T2 - T7", "desc": ["Triển khai bản vẽ shopdrawing và lập biện pháp thi công hệ thống cơ điện", "Bóc tách khối lượng, ra phiếu đặt hàng vật tư thi công.", "Triển khai thi công và giám sát công tác lắp đặt.", "Tham gia nghiệm thu lắp đặt và lập bản vẽ hoàn công.", "Công việc chi tiết sẽ trao đổi khi phỏng vấn."], "req": ["Tốt nghiệp CĐ/ĐH chuyên ngành Kỹ thuật cơ khí, Kỹ thuật nhiệt, cấp thoát nước hoặc hệ thống kỹ thuật trong công trình.", "Thành thạo AutoCAD.", "Cẩn thận, chịu được áp lực tiến độ của dự án."], "dept": "site", "systems": [], "level": "", "type": "", "deadline": "", "hot": false, "qty": "", "summary": "", "perks": ["100% lương trong thời gian thử việc.", "Đóng BHXH, BHYT, BHTN full lương.", "Bảo hiểm sức khỏe PVI, khám sức khỏe định kỳ hằng năm.", "Phụ cấp cơm trưa, nước uống, gửi xe; phụ cấp địa lý khi đi làm công trình xa; có nhà ở khi làm việc tại công trình ở các tỉnh.", "Thưởng dự án; thưởng tháng 13; thưởng kết quả kinh doanh hằng năm."], "interview": "Phỏng vấn từ 1 - 2 vòng"},
  {"id": "ky-su-phoi-hop-ban-ve-26062-1-1", "code": "26062_1_1", "title": "Kỹ sư phối hợp bản vẽ", "loc": "TP.HCM · Đồng Nai", "salary": "Thương lượng", "exp": "Trên 3 năm", "english": "Đọc hiểu", "workTime": "Từ T2 - T7", "desc": null, "req": null, "dept": "site", "systems": [], "level": "", "type": "", "deadline": "", "hot": false, "qty": "", "summary": ""},
  {"id": "ky-su-thiet-ke-he-cap-thoat-nuoc-26055-01", "code": "26055_01", "title": "Kỹ sư thiết kế hệ cấp thoát nước", "loc": "TP.HCM", "salary": "Thương lượng", "exp": "Ưu tiên có kinh nghiệm", "english": "Đọc hiểu", "workTime": "Từ T2 - Sáng T7", "desc": null, "req": null, "dept": "site", "systems": [], "level": "", "type": "", "deadline": "", "hot": false, "qty": "", "summary": ""},
  {"id": "nhan-vien-kiem-soat-gia-thanh-26060-2", "code": "26060_2", "title": "Nhân viên kiểm soát giá thành", "loc": "TP.HCM", "salary": "Thương lượng", "exp": "Không yêu cầu", "english": "Đọc hiểu", "workTime": "Từ T2 - Sáng T7", "desc": null, "req": null, "dept": "site", "systems": [], "level": "", "type": "", "deadline": "", "hot": false, "qty": "", "summary": ""},
  {"id": "ky-su-co-dien-26100", "code": "26100", "title": "Kỹ sư cơ điện", "loc": "Hà Nội · Phú Quốc · Các dự án công ty thi công", "salary": "Thương lượng", "exp": "Trên 1 năm", "english": "Đọc hiểu", "workTime": "Từ T2 - T7", "desc": null, "req": null, "dept": "site", "systems": [], "level": "", "type": "", "deadline": "", "hot": false, "qty": "", "summary": ""},
  {"id": "ky-su-phoi-hop-ban-ve-26021-8-3", "code": "26021_8_3", "title": "Kỹ sư phối hợp bản vẽ", "loc": "Hà Nội", "salary": "Thương lượng", "exp": "Trên 3 năm", "english": "Đọc hiểu", "workTime": "Từ T2 - T7", "desc": null, "req": null, "dept": "site", "systems": [], "level": "", "type": "", "deadline": "", "hot": false, "qty": "", "summary": ""},
  {"id": "nhan-vien-qs-26050", "code": "26050", "title": "Nhân viên QS", "loc": "Hà Nội", "salary": "Thương lượng", "exp": "Trên 1 năm", "english": "Đọc viết", "workTime": "Từ T2 - T7", "desc": null, "req": null, "dept": "site", "systems": [], "level": "", "type": "", "deadline": "", "hot": false, "qty": "", "summary": ""},
  {"id": "ky-su-he-cap-thoat-nuoc-26053-03-2", "code": "26053_03 (2)", "title": "Kỹ sư hệ cấp thoát nước", "loc": "Đà Nẵng", "salary": "Thương lượng", "exp": "Trên 2 năm", "english": "Không yêu cầu", "workTime": "Từ T2 - T7", "desc": null, "req": null, "dept": "site", "systems": [], "level": "", "type": "", "deadline": "", "hot": false, "qty": "", "summary": ""},
  {"id": "ky-su-he-dien-26053-2", "code": "26053 (2)", "title": "Kỹ sư hệ điện", "loc": "Đà Nẵng", "salary": "Thương lượng", "exp": "Trên 1 năm", "english": "Không yêu cầu", "workTime": "Từ T2 - T7", "desc": null, "req": null, "dept": "site", "systems": [], "level": "", "type": "", "deadline": "", "hot": false, "qty": "", "summary": ""},
  {"id": "nhan-vien-qa-qc-26069", "code": "26069", "title": "Nhân viên QA/QC", "loc": "Đà Nẵng", "salary": "Thương lượng", "exp": "Trên 1 năm", "english": "Đọc hiểu", "workTime": "Từ T2 - T7", "desc": null, "req": null, "dept": "site", "systems": [], "level": "", "type": "", "deadline": "", "hot": false, "qty": "", "summary": ""},
  {"id": "nhan-vien-ky-thuat-26067-1", "code": "26067_1", "title": "Nhân viên kỹ thuật", "loc": "Đồng Nai", "salary": "Thương lượng", "exp": "Ưu tiên có kinh nghiệm", "english": "Không yêu cầu", "workTime": "Từ T2 - T7", "desc": null, "req": null, "dept": "site", "systems": [], "level": "", "type": "", "deadline": "", "hot": false, "qty": "", "summary": ""},
  {"id": "ky-su-co-dien-phu-trach-t-c-25076-1-3-2", "code": "25076_1_3 (2)", "title": "Kỹ sư cơ điện (phụ trách T&C)", "loc": "Các tỉnh miền Bắc", "salary": "Thương lượng", "exp": "Trên 2 năm", "english": "Đọc viết", "workTime": "Từ T2 - T7", "desc": null, "req": null, "dept": "site", "systems": [], "level": "", "type": "", "deadline": "", "hot": false, "qty": "", "summary": ""},
  {"id": "giam-sat-an-toan-lao-dong-26010-8-1", "code": "26010_8_1", "title": "Giám sát an toàn lao động", "loc": "Phú Quốc", "salary": "Thương lượng", "exp": "Trên 1 năm", "english": "Không yêu cầu", "workTime": "Từ T2 - T7", "desc": null, "req": null, "dept": "site", "systems": [], "level": "", "type": "", "deadline": "", "hot": false, "qty": "", "summary": ""},
  {"id": "ky-su-he-dien-26058-3-1", "code": "26058_3_1", "title": "Kỹ sư hệ điện", "loc": "Phú Quốc", "salary": "Thương lượng", "exp": "Trên 2 năm", "english": "Đọc hiểu", "workTime": "Từ T2 - T7", "desc": null, "req": null, "dept": "site", "systems": [], "level": "", "type": "", "deadline": "", "hot": false, "qty": "", "summary": ""},
  {"id": "ky-su-he-dien-26059-1-2", "code": "26059_1_2", "title": "Kỹ sư hệ điện", "loc": "Phú Quốc", "salary": "Thương lượng", "exp": "Trên 1 năm", "english": "Đọc hiểu", "workTime": "Từ T2 - T7", "desc": null, "req": null, "dept": "site", "systems": [], "level": "", "type": "", "deadline": "", "hot": false, "qty": "", "summary": ""},
  {"id": "ky-su-he-hvac-26004-8-3", "code": "26004_8_3", "title": "Kỹ sư hệ HVAC", "loc": "Phú Quốc", "salary": "Thương lượng", "exp": "Trên 2 năm", "english": "Đọc viết", "workTime": "Từ T2 - T7", "desc": null, "req": null, "dept": "site", "systems": [], "level": "", "type": "", "deadline": "", "hot": false, "qty": "", "summary": ""},
  {"id": "ky-su-he-hvac-26059-2-1", "code": "26059_2_1", "title": "Kỹ sư hệ HVAC", "loc": "Phú Quốc", "salary": "Thương lượng", "exp": "Trên 1 năm", "english": "Đọc hiểu", "workTime": "Từ T2 - T7", "desc": null, "req": null, "dept": "site", "systems": [], "level": "", "type": "", "deadline": "", "hot": false, "qty": "", "summary": ""},
  {"id": "ky-su-he-hvac-26010-7-13", "code": "26010_7_13", "title": "Kỹ sư hệ HVAC", "loc": "Phú Quốc", "salary": "Thương lượng", "exp": "Trên 2 năm", "english": "Đọc hiểu", "workTime": "Từ T2 - T7", "desc": null, "req": null, "dept": "site", "systems": [], "level": "", "type": "", "deadline": "", "hot": false, "qty": "", "summary": ""},
  {"id": "ky-su-pccc-26004-8-8", "code": "26004_8_8", "title": "Kỹ sư PCCC", "loc": "Phú Quốc", "salary": "Thương lượng", "exp": "Trên 2 năm", "english": "Đọc viết", "workTime": "Từ T2 - T7", "desc": null, "req": null, "dept": "site", "systems": [], "level": "", "type": "", "deadline": "", "hot": false, "qty": "", "summary": ""},
  {"id": "nhan-vien-ky-thuat-26059-3-1", "code": "26059_3_1", "title": "Nhân viên kỹ thuật", "loc": "Phú Quốc", "salary": "Thương lượng", "exp": "Ưu tiên có kinh nghiệm", "english": "Không yêu cầu", "workTime": "Từ T2 - T7", "desc": null, "req": null, "dept": "site", "systems": [], "level": "", "type": "", "deadline": "", "hot": false, "qty": "", "summary": ""},
  {"id": "nhan-vien-ky-thuat-26059-3-3", "code": "26059_3_3", "title": "Nhân viên kỹ thuật", "loc": "Phú Quốc", "salary": "Thương lượng", "exp": "Ưu tiên có kinh nghiệm", "english": "Không yêu cầu", "workTime": "Từ T2 - T7", "desc": null, "req": null, "dept": "site", "systems": [], "level": "", "type": "", "deadline": "", "hot": false, "qty": "", "summary": ""},
  {"id": "nhan-vien-qs-26064-2", "code": "26064_2", "title": "Nhân viên QS", "loc": "Phú Quốc · Các dự án công ty thi công", "salary": "Thương lượng", "exp": "Ưu tiên có kinh nghiệm", "english": "Đọc hiểu", "workTime": "Từ T2 - T7", "desc": null, "req": null, "dept": "site", "systems": [], "level": "", "type": "", "deadline": "", "hot": false, "qty": "", "summary": ""},
  {"id": "ky-su-he-dien-26051-02", "code": "26051_02", "title": "Kỹ sư hệ điện", "loc": "Quảng Trị", "salary": "Thương lượng", "exp": "Trên 2 năm", "english": "Đọc hiểu", "workTime": "Từ T2 - T7", "desc": null, "req": null, "dept": "site", "systems": [], "level": "", "type": "", "deadline": "", "hot": false, "qty": "", "summary": ""},
  {"id": "nhan-vien-qs-26050-07", "code": "26050_07", "title": "Nhân viên QS", "loc": "Quảng Trị", "salary": "Thương lượng", "exp": "Trên 1 năm", "english": "Đọc viết", "workTime": "Từ T2 - T7", "desc": null, "req": null, "dept": "site", "systems": [], "level": "", "type": "", "deadline": "", "hot": false, "qty": "", "summary": ""}
];


window.ACTIVITIES = [
  { id:"reenergize", img:"assets/img/life-gym.jpg", tag:"Sức khỏe thể chất", title:"REENERGIZE Station", hue:210, text:"Phòng tập Gym đa năng, lớp Yoga tĩnh tâm và Zumba sôi động ngay tại văn phòng, miễn phí sau giờ làm việc.", detail:["Phòng gym hiện đại ngay tại văn phòng.","Lớp yoga và thiền định hằng tuần.","Miễn phí cho toàn bộ nhân viên REE M&E."] },
  { id:"sinh-nhat", img:"assets/img/life-marathon.jpg", tag:"Thể thao", title:"Marathon Techcombank 2025", hue:14, text:"Đội ngũ REE M&E cùng xỏ giày tham gia giải chạy Marathon Techcombank 2025.", detail:["Nhân viên REE M&E cùng đăng ký và tập luyện trước giải.","Tinh thần đồng đội trên từng cây số.","Gắn kết giữa văn phòng và công trường."] },
  { id:"sinh-nhat-thang", img:"assets/img/life-birthday.jpg", tag:"Gắn kết nội bộ", title:"Sinh nhật hàng tháng", hue:160, text:"Tiệc sinh nhật chung mỗi tháng, gắn kết các thành viên trong đại gia đình REE.", detail:["Tổ chức định kỳ mỗi tháng.","Quà tặng cho thành viên có sinh nhật trong tháng.","Công trường xa được gửi bánh và quà tận nơi."] },
  { id:"bong-da", img:"assets/img/life-football.jpg", tag:"Thể thao", title:"Giải bóng đá thường niên", hue:230, text:"Giải đấu giao hữu giữa các đội công trường và văn phòng, kết nối người REE trên mọi dự án.", detail:["Tổ chức thường niên.","Các đội đến từ văn phòng và công trường.","Gắn kết liên công trường."] }
];
