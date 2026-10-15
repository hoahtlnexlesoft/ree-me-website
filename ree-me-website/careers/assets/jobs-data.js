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

window.JOBS = [
  {
    id:"chi-huy-truong-mep", code:"REE-SM-01", title:"Chỉ Huy Trưởng MEP Dự Án", en:"MEP Site Manager",
    dept:"site", level:"Quản lý", loc:"TP. Hồ Chí Minh", type:"Toàn thời gian", salary:"Thỏa thuận", exp:"8+ năm", deadline:"2026-11-15", qty:2, hot:true,
    systems:["HVAC","ELEC","PLB","FIRE"],
    project:"Công trình văn phòng hạng A, TP. Hồ Chí Minh",
    summary:"Quản lý tổng thể công tác thi công hệ thống cơ điện tại công trường, chịu trách nhiệm tiến độ, chất lượng và an toàn.",
    desc:["Lập và kiểm soát tiến độ tổng thể hạng mục MEP, phối hợp tổng thầu và chủ đầu tư.","Điều phối các tổ đội thầu phụ, phân bổ nhân lực và vật tư theo từng giai đoạn thi công.","Chủ trì họp phối hợp kỹ thuật, giải quyết xung đột giữa các hệ thống.","Kiểm soát chi phí phát sinh, phê duyệt khối lượng nghiệm thu nội bộ.","Đảm bảo tuân thủ quy trình An toàn HSE tại công trường."],
    req:["Tốt nghiệp Đại học chuyên ngành Nhiệt lạnh, Điện, Cơ khí hoặc Cấp thoát nước.","Tối thiểu 8 năm kinh nghiệm MEP, trong đó 3 năm ở vị trí Chỉ huy trưởng hoặc tương đương.","Từng quản lý dự án cao tầng, khách sạn hoặc nhà máy.","Thành thạo MS Project/Primavera, đọc hiểu shop drawing và mô hình BIM."]
  },
  {
    id:"ky-su-truong-hvac", code:"26055_02", title:"Kỹ Sư Trưởng Hệ Thống HVAC", en:"Lead HVAC Engineer",
    dept:"site", level:"Kỹ sư chính", loc:"Đồng Nai / Miền Nam", type:"Toàn thời gian cố định", salary:"18 - 28 Triệu VND", exp:"3 - 5 năm", deadline:"2026-11-10", qty:1, hot:true,
    systems:["HVAC","BMS"],
    summary:"Chịu trách nhiệm giám sát lắp đặt hệ thống Chiller giải nhiệt nước công suất lớn, hệ thống…",
    contract:"Chính Thức", contractNote:"100% Lương thử việc",
    desc:null, req:null
  },
  {
    id:"chuyen-vien-bim", code:"REE-BIM-03", title:"Chuyên Viên Kỹ Thuật BIM / Revit", en:"BIM / Revit Specialist",
    dept:"design", level:"Chuyên viên", loc:"TP. Hồ Chí Minh", type:"Toàn thời gian", salary:"20 – 30 triệu", exp:"2 – 4 năm", deadline:"2026-11-20", qty:2, hot:false,
    systems:["HVAC","ELEC","PLB","FIRE"],
    project:"Phòng Thiết kế & BIM",
    summary:"Dựng mô hình 3D Revit MEP, phối hợp va chạm và xuất bản vẽ thi công cho các dự án đang triển khai.",
    desc:["Dựng mô hình Revit MEP cho các hệ HVAC, điện, cấp thoát nước, PCCC.","Kiểm tra va chạm trên Navisworks, tham gia họp coordination.","Xuất shop drawing, mặt cắt kỹ thuật và bảng khối lượng từ mô hình.","Xây dựng thư viện family và template theo chuẩn công ty."],
    req:["Tốt nghiệp Đại học chuyên ngành kỹ thuật cơ điện.","Tối thiểu 2 năm dựng mô hình Revit MEP thực tế.","Thành thạo Navisworks; biết Dynamo là lợi thế.","Cẩn thận, chủ động và làm việc nhóm tốt."]
  },
  {
    id:"ky-su-he-co", code:"REE-ME-04", title:"Kỹ Sư Hệ Cơ (MEP Project Engineer)", en:"MEP Project Engineer",
    dept:"site", level:"Kỹ sư", loc:"TP. Hồ Chí Minh", type:"Chính thức", salary:"18 – 30 triệu", exp:"3 – 5 năm", deadline:"2026-11-30", qty:3, hot:true,
    systems:["HVAC","FIRE","PLB"],
    project:"Các công trình đạt chuẩn LEED Platinum hàng đầu Việt Nam",
    summary:"Đảm bảo triển khai thi công hệ thống HVAC, PCCC, Cấp thoát nước tại các công trình trọng điểm đạt chuẩn LEED Platinum hàng đầu Việt Nam.",
    desc:["Triển khai bản vẽ shop drawing và đề xuất giải pháp kỹ thuật hệ thống cơ điện.","Bóc tách khối lượng, vật tư, đặt hàng vật tư công trường.","Triển khai thi công và giám sát công tác lắp đặt.","Tham gia nghiệm thu, lập hồ sơ quản lý chất lượng.","Công việc chi tiết trao đổi khi phỏng vấn."],
    req:["Tốt nghiệp Đại học/Cao đẳng chuyên ngành Kỹ thuật nhiệt, Nhiệt lạnh hoặc Hệ thống kỹ thuật công trình.","Thành thạo AutoCAD và các phần mềm chuyên ngành MEP.","Cẩn thận, chịu được áp lực cao, có tinh thần làm việc nhóm và phối hợp tốt."]
  },
  {
    id:"ky-su-giam-sat-mep", code:"REE-SS-05", title:"Kỹ Sư Giám Sát Hiện Trường MEP", en:"MEP Site Supervisor",
    dept:"site", level:"Kỹ sư", loc:"TP. Hồ Chí Minh", type:"Toàn thời gian", salary:"16 – 25 triệu", exp:"2+ năm", deadline:"2026-11-25", qty:3, hot:false,
    systems:["HVAC","ELEC","PLB","FIRE"],
    project:"Công trường dự án cao tầng",
    summary:"Giám sát lắp đặt hệ thống cơ điện tại hiện trường, kiểm tra chất lượng và tiến độ hằng ngày.",
    desc:["Giám sát lắp đặt hệ thống cơ điện theo shop drawing được duyệt.","Kiểm tra vật tư đầu vào, lập biên bản nghiệm thu từng giai đoạn.","Cập nhật nhật ký thi công, báo cáo tiến độ hằng tuần.","Phối hợp các tổ đội đảm bảo an toàn lao động."],
    req:["Tốt nghiệp Cao đẳng/Đại học kỹ thuật cơ điện.","Tối thiểu 2 năm giám sát MEP tại công trường.","Đọc hiểu bản vẽ, sử dụng AutoCAD.","Sẵn sàng làm việc tại công trường."]
  },
  {
    id:"ky-su-thiet-ke-ctn", code:"REE-PD-06", title:"Kỹ Sư Thiết Kế Cấp Thoát Nước", en:"Plumbing Design Engineer",
    dept:"design", level:"Kỹ sư", loc:"TP. Hồ Chí Minh", type:"Toàn thời gian", salary:"18 – 26 triệu", exp:"3+ năm", deadline:"2026-12-05", qty:1, hot:false,
    systems:["PLB","FIRE"],
    project:"Phòng Thiết kế & BIM",
    summary:"Thiết kế hệ thống cấp thoát nước, nước nóng và chữa cháy từ giai đoạn cơ sở đến bản vẽ thi công.",
    desc:["Tính toán, thiết kế hệ thống cấp nước, thoát nước, nước nóng.","Phối hợp kiến trúc, kết cấu bố trí phòng kỹ thuật và trục ống.","Lập thuyết minh, bảng khối lượng và chỉ dẫn kỹ thuật.","Hỗ trợ đội thi công giải đáp kỹ thuật (RFI)."],
    req:["Tốt nghiệp Đại học Cấp thoát nước hoặc Kỹ thuật môi trường.","Tối thiểu 3 năm thiết kế cấp thoát nước công trình.","Thành thạo AutoCAD, Revit MEP là lợi thế.","Nắm vững QCVN, TCVN liên quan."]
  },
  {
    id:"nhan-vien-kiem-soat-gia-thanh", code:"REE-CC-07", title:"Nhân Viên Kiểm Soát Giá Thành", en:"Cost Control Officer",
    dept:"qs", level:"Nhân viên", loc:"TP. Hồ Chí Minh", type:"Toàn thời gian", salary:"Thỏa thuận", exp:"2+ năm", deadline:"2026-11-28", qty:1, hot:false,
    systems:["HVAC","ELEC"],
    project:"Phòng Dự toán & Giá thành",
    summary:"Theo dõi, phân tích và kiểm soát chi phí dự án so với ngân sách được duyệt.",
    desc:["Lập và cập nhật ngân sách thi công từng dự án.","Theo dõi chi phí thực tế, cảnh báo vượt ngân sách.","Đối chiếu khối lượng, hợp đồng thầu phụ và thanh toán.","Báo cáo giá thành định kỳ cho Ban Giám đốc."],
    req:["Tốt nghiệp Đại học Kinh tế xây dựng hoặc kỹ thuật cơ điện.","Tối thiểu 2 năm kinh nghiệm kiểm soát chi phí xây dựng.","Thành thạo Excel nâng cao.","Cẩn thận, trung thực, tư duy số liệu tốt."]
  },
  {
    id:"nhan-vien-qs", code:"REE-QS-08", title:"Nhân Viên QS (Quantity Surveyor)", en:"Quantity Surveyor",
    dept:"qs", level:"Nhân viên", loc:"TP. Hồ Chí Minh", type:"Toàn thời gian", salary:"15 – 22 triệu", exp:"1 – 3 năm", deadline:"2026-11-22", qty:2, hot:false,
    systems:["HVAC","ELEC","PLB"],
    project:"Phòng Dự toán & Giá thành",
    summary:"Bóc tách khối lượng, lập dự toán và hồ sơ thanh toán cho các gói thầu cơ điện.",
    desc:["Bóc tách khối lượng từ bản vẽ và mô hình BIM.","Lập dự toán, hồ sơ chào thầu và so sánh báo giá.","Lập hồ sơ thanh toán, phát sinh với chủ đầu tư.","Phối hợp công trường đối chiếu khối lượng thực tế."],
    req:["Tốt nghiệp Đại học Kinh tế xây dựng hoặc kỹ thuật cơ điện.","Tối thiểu 1 năm kinh nghiệm QS mảng MEP.","Thành thạo Excel, AutoCAD.","Đọc hiểu hợp đồng xây dựng."]
  },
  {
    id:"ky-su-co-dien", code:"REE-MG-09", title:"Kỹ Sư Cơ Điện (MEP General)", en:"MEP General Engineer",
    dept:"site", level:"Kỹ sư", loc:"Hà Nội", type:"Toàn thời gian", salary:"16 – 24 triệu", exp:"2 – 5 năm", deadline:"2026-11-28", qty:2, hot:true,
    systems:["HVAC","ELEC","PLB","FIRE"],
    project:"Dự án khu vực miền Bắc",
    summary:"Phụ trách tổng hợp các hệ thống cơ điện tại công trình khu vực Hà Nội.",
    desc:["Triển khai thi công các hệ thống cơ điện theo tiến độ.","Kiểm tra, nghiệm thu công tác lắp đặt.","Phối hợp tư vấn giám sát và chủ đầu tư.","Lập hồ sơ hoàn công."],
    req:["Tốt nghiệp Đại học chuyên ngành cơ điện.","Tối thiểu 2 năm kinh nghiệm MEP công trình dân dụng.","Thành thạo AutoCAD.","Làm việc tại Hà Nội."]
  },
  {
    id:"ky-su-he-ctn", code:"REE-PL-10", title:"Kỹ Sư Hệ Cấp Thoát Nước (Plumbing)", en:"Plumbing Engineer",
    dept:"site", level:"Kỹ sư", loc:"Hà Nội", type:"Toàn thời gian", salary:"15 – 22 triệu", exp:"2 – 4 năm", deadline:"2026-12-05", qty:1, hot:false,
    systems:["PLB","FIRE"],
    project:"Dự án khu vực miền Bắc",
    summary:"Thi công và giám sát hệ thống cấp thoát nước, nước nóng và chữa cháy tại công trình.",
    desc:["Giám sát lắp đặt đường ống cấp, thoát, nước nóng và hệ thống bơm.","Kiểm tra thử áp, vệ sinh đường ống trước bàn giao.","Phối hợp nhà cung cấp thiết bị.","Báo cáo khối lượng hằng tuần."],
    req:["Tốt nghiệp Đại học Cấp thoát nước.","Tối thiểu 2 năm thi công cấp thoát nước công trình.","Sử dụng AutoCAD, Revit là lợi thế.","Làm việc tại Hà Nội."]
  },
  {
    id:"ky-su-he-dien", code:"REE-EL-11", title:"Kỹ Sư Hệ Điện (Power & ELV)", en:"Power & ELV Engineer",
    dept:"site", level:"Kỹ sư", loc:"Hà Nội", type:"Toàn thời gian", salary:"16 – 24 triệu", exp:"2 – 5 năm", deadline:"2026-11-26", qty:2, hot:false,
    systems:["ELEC","ELV"],
    project:"Dự án khu vực miền Bắc",
    summary:"Thi công hệ thống điện động lực, chiếu sáng và điện nhẹ tại công trình.",
    desc:["Giám sát lắp đặt tủ điện, máng cáp, busway và chiếu sáng.","Kiểm tra đấu nối, đo cách điện và nối đất.","Phối hợp lắp đặt hệ thống điện nhẹ (camera, kiểm soát ra vào, mạng).","Cập nhật bản vẽ hoàn công."],
    req:["Tốt nghiệp Đại học Điện.","Tối thiểu 2 năm thi công điện công trình.","Hiểu biết hệ thống trung thế là lợi thế.","Làm việc tại Hà Nội."]
  },
  {
    id:"chuyen-vien-qs-ho-so", code:"REE-QS-12", title:"Chuyên Viên QS (Hồ Sơ & Khối Lượng)", en:"QS Specialist – Documentation",
    dept:"qs", level:"Chuyên viên", loc:"Hà Nội", type:"Toàn thời gian", salary:"Thỏa thuận", exp:"3+ năm", deadline:"2026-11-30", qty:1, hot:false,
    systems:["HVAC","ELEC","PLB"],
    project:"Văn phòng làm việc Hà Nội",
    summary:"Quản lý hồ sơ khối lượng, thanh quyết toán cho các dự án khu vực miền Bắc.",
    desc:["Quản lý hồ sơ khối lượng và thanh toán dự án.","Lập hồ sơ quyết toán với chủ đầu tư.","Kiểm soát hồ sơ thầu phụ.","Lưu trữ, cập nhật hồ sơ theo quy trình ISO."],
    req:["Tốt nghiệp Đại học Kinh tế xây dựng hoặc kỹ thuật.","Tối thiểu 3 năm kinh nghiệm QS.","Thành thạo Excel, AutoCAD.","Làm việc tại Hà Nội."]
  }
];

window.ACTIVITIES = [
  { id:"reenergize", img:"assets/img/life-gym.jpg", tag:"Sức khỏe thể chất", title:"REENERGIZE Station", hue:210, text:"Phòng tập Gym đa năng, lớp Yoga tĩnh tâm và Zumba sôi động ngay tại văn phòng, miễn phí sau giờ làm việc.", detail:["Phòng gym hiện đại ngay tại văn phòng.","Lớp yoga và thiền định hằng tuần.","Miễn phí cho toàn bộ nhân viên REE M&E."] },
  { id:"sinh-nhat", img:"assets/img/life-marathon.jpg", tag:"Thể thao", title:"Marathon Techcombank 2025", hue:14, text:"Đội ngũ REE M&E cùng xỏ giày tham gia giải chạy Marathon Techcombank 2025.", detail:["Nhân viên REE M&E cùng đăng ký và tập luyện trước giải.","Tinh thần đồng đội trên từng cây số.","Gắn kết giữa văn phòng và công trường."] },
  { id:"sinh-nhat-thang", img:"assets/img/life-birthday.jpg", tag:"Gắn kết nội bộ", title:"Sinh nhật hàng tháng", hue:160, text:"Tiệc sinh nhật chung mỗi tháng, gắn kết các thành viên trong đại gia đình REE.", detail:["Tổ chức định kỳ mỗi tháng.","Quà tặng cho thành viên có sinh nhật trong tháng.","Công trường xa được gửi bánh và quà tận nơi."] },
  { id:"bong-da", img:"assets/img/life-football.jpg", tag:"Thể thao", title:"Giải bóng đá thường niên", hue:230, text:"Giải đấu giao hữu giữa các đội công trường và văn phòng, kết nối người REE trên mọi dự án.", detail:["Tổ chức thường niên.","Các đội đến từ văn phòng và công trường.","Gắn kết liên công trường."] }
];
