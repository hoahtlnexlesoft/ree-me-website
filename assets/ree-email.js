/* R.E.E M&E — "Gửi yêu cầu" email template + preview
   window.REE_EMAIL.build(data, opts) -> full HTML email (table layout, inline styles, 600px)
   window.__reeEmailPreview(data)     -> opens the email preview overlay (used while the form has no mail endpoint) */
(function () {
  var NAVY = '#13306B', NAVY_D = '#0B1F4A', RED = '#D93A35', INK = '#0F1B33', MUTED = '#5E6A82', LINE = '#E4E8F0', SOFT = '#F5F7FB';
  var FONT = "'Helvetica Neue',Helvetica,Arial,sans-serif";
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function code() { var d = new Date(); return 'REQ-' + String(d.getFullYear()).slice(2) + pad(d.getMonth() + 1) + pad(d.getDate()) + '-' + Math.random().toString(36).slice(2, 6).toUpperCase(); }
  function when() { var d = new Date(); return pad(d.getHours()) + ':' + pad(d.getMinutes()) + ', ' + pad(d.getDate()) + '/' + pad(d.getMonth() + 1) + '/' + d.getFullYear(); }

  function row(label, value, last) {
    return '<tr><td style="padding:14px 0;' + (last ? '' : 'border-bottom:1px solid ' + LINE + ';') + 'width:150px;vertical-align:top;font:600 11px/1.5 ' + FONT + ';letter-spacing:.14em;text-transform:uppercase;color:' + MUTED + '">' + label + '</td>' +
      '<td style="padding:14px 0;' + (last ? '' : 'border-bottom:1px solid ' + LINE + ';') + 'vertical-align:top;font:500 15px/1.55 ' + FONT + ';color:' + INK + '">' + (value || '<span style="color:#A3ACBF">—</span>') + '</td></tr>';
  }
  function step(n, title, sub, on) {
    return '<td class="col" width="33%" valign="top" style="padding:0 8px">' +
      '<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%"><tr><td style="height:3px;background:' + (on ? RED : LINE) + ';font-size:0;line-height:0">&nbsp;</td></tr></table>' +
      '<p style="margin:14px 0 0;font:700 12px/1 ' + FONT + ';letter-spacing:.16em;color:' + (on ? RED : '#A3ACBF') + '">' + n + '</p>' +
      '<p style="margin:8px 0 0;font:700 14px/1.35 ' + FONT + ';color:' + INK + '">' + title + '</p>' +
      '<p style="margin:4px 0 0;font:400 12.5px/1.5 ' + FONT + ';color:' + MUTED + '">' + sub + '</p></td>';
  }

  function build(d, o) {
    d = d || {}; o = o || {};
    var site = o.site || 'https://ree-me-website.vercel.app/';
    var logo = o.logo || site + 'assets/ree-me-logo-bRK-tEB-.png';
    var ref = o.ref || code();
    var name = esc((d.name || '').trim()) || 'Quý khách';
    var msg = esc((d.message || '').trim()).replace(/\n/g, '<br>');
    return '<!doctype html><html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">' +
      '<meta name="color-scheme" content="light"><title>Xác nhận yêu cầu tư vấn — R.E.E M&amp;E</title>' +
      '<style>body{margin:0;padding:0;background:#EEF1F6}a{color:' + NAVY + '}@media (max-width:620px){.wrap{width:100%!important}.px{padding-left:24px!important;padding-right:24px!important}.h1{font-size:26px!important}.col{display:block!important;width:100%!important;padding:0 0 22px!important;border-left:0!important}.sep{display:none!important}.tm{display:block!important;margin-top:10px}.btn{width:100%!important}.btn td{display:block!important;padding:0 0 10px!important}.btn a{display:block!important;text-align:center!important}.lbl{width:110px!important}}</style></head>' +
      '<body style="margin:0;padding:0;background:#EEF1F6">' +
      '<div style="display:none;max-height:0;overflow:hidden;opacity:0">Chúng tôi đã nhận được thông tin dự án của bạn — chuyên viên R.E.E M&amp;E sẽ liên hệ trong 24 giờ làm việc.</div>' +
      '<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#EEF1F6"><tr><td align="center" style="padding:32px 12px 40px">' +
      '<table role="presentation" class="wrap" cellpadding="0" cellspacing="0" border="0" width="600" style="width:600px;max-width:600px;background:#FFFFFF;border-radius:18px;overflow:hidden;box-shadow:0 24px 60px -30px rgba(11,31,74,.35)">' +

      /* top bar + header */
      '<tr><td style="font-size:0;line-height:0"><table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%"><tr><td width="72%" style="height:4px;background:' + NAVY + '">&nbsp;</td><td style="height:4px;background:' + RED + '">&nbsp;</td></tr></table></td></tr>' +
      '<tr><td class="px" style="padding:26px 44px 22px"><table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%"><tr>' +
      '<td valign="middle"><a href="' + site + '" style="text-decoration:none"><img src="' + logo + '" width="74" height="51" alt="R.E.E M&amp;E" style="display:block;border:0;width:74px;height:auto"></a></td>' +
      '<td valign="middle" align="right" style="font:600 10.5px/1.6 ' + FONT + ';letter-spacing:.16em;text-transform:uppercase;color:' + MUTED + '">Yêu cầu tư vấn<br><span style="color:' + INK + ';letter-spacing:.08em">' + ref + '</span></td>' +
      '</tr></table></td></tr>' +

      /* hero */
      '<tr><td style="padding:0 16px"><table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:' + NAVY + ';background-image:linear-gradient(135deg,' + NAVY_D + ' 0%,' + NAVY + ' 55%,#1D4690 100%);border-radius:14px"><tr>' +
      '<td class="px" style="padding:44px 40px 42px">' +
      '<p style="margin:0;font:700 11px/1 ' + FONT + ';letter-spacing:.32em;text-transform:uppercase;color:#FF8C84">Đã tiếp nhận<span class="sep">&nbsp;&nbsp;·&nbsp;&nbsp;</span><span class="tm">' + when() + '</span></p>' +
      '<h1 class="h1" style="margin:18px 0 0;font:700 30px/1.22 ' + FONT + ';letter-spacing:-.01em;color:#FFFFFF">Cảm ơn ' + name + ',<br>chúng tôi đã nhận được thông tin dự án của bạn.</h1>' +
      '<p style="margin:16px 0 0;font:400 15px/1.65 ' + FONT + ';color:rgba(255,255,255,.78)">Chuyên viên tư vấn của R.E.E M&amp;E sẽ liên hệ với bạn trong vòng <b style="color:#FFFFFF">24 giờ làm việc</b> để trao đổi chi tiết về quy mô, tiến độ và giải pháp cơ điện phù hợp.</p>' +
      '</td></tr></table></td></tr>' +

      /* steps */
      '<tr><td class="px" style="padding:36px 36px 8px"><p style="margin:0 8px 18px;font:700 11px/1 ' + FONT + ';letter-spacing:.24em;text-transform:uppercase;color:' + NAVY + '">Các bước tiếp theo</p>' +
      '<table role="presentation" class="stack" cellpadding="0" cellspacing="0" border="0" width="100%"><tr>' +
      step('01', 'Tiếp nhận yêu cầu', 'Hồ sơ đã được ghi nhận vào hệ thống.', true) +
      step('02', 'Chuyên viên liên hệ', 'Trao đổi nhu cầu trong 24 giờ làm việc.', false) +
      step('03', 'Khảo sát &amp; đề xuất', 'Giải pháp MEPF và báo giá sơ bộ.', false) +
      '</tr></table></td></tr>' +

      /* summary */
      '<tr><td class="px" style="padding:28px 44px 8px"><table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:' + SOFT + ';border-radius:14px"><tr><td style="padding:24px 26px 12px">' +
      '<p style="margin:0 0 6px;font:700 11px/1 ' + FONT + ';letter-spacing:.24em;text-transform:uppercase;color:' + NAVY + '">Thông tin bạn đã gửi</p>' +
      '<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">' +
      row('Họ và tên', name === 'Quý khách' ? '' : name) + row('Công ty', esc(d.company)) + row('Điện thoại', esc(d.phone)) +
      row('Email', d.email ? '<a href="mailto:' + esc(d.email) + '" style="color:' + NAVY + ';text-decoration:none">' + esc(d.email) + '</a>' : '') +
      row('Loại hình', esc(d.type)) + row('Nội dung', msg ? '<span style="display:block;padding-left:14px;border-left:3px solid ' + RED + ';color:' + MUTED + '">' + msg + '</span>' : '', true) +
      '</table></td></tr></table></td></tr>' +

      /* CTA */
      '<tr><td class="px" align="center" style="padding:30px 44px 6px"><p style="margin:0 0 18px;font:400 14px/1.6 ' + FONT + ';color:' + MUTED + '">Cần trao đổi ngay? Đội ngũ của chúng tôi luôn sẵn sàng hỗ trợ.</p>' +
      '<table role="presentation" class="btn" cellpadding="0" cellspacing="0" border="0"><tr>' +
      '<td style="padding:0 6px 10px"><a href="tel:19003339" style="display:inline-block;padding:15px 28px;border-radius:10px;background:' + RED + ';background-image:linear-gradient(90deg,#C8302C,#E4574B);font:700 12px/1 ' + FONT + ';letter-spacing:.18em;text-transform:uppercase;white-space:nowrap;color:#FFFFFF;text-decoration:none">Hotline 1900 3339</a></td>' +
      '<td style="padding:0 6px 10px"><a href="' + site + '#/ho-so-nang-luc" style="display:inline-block;padding:14px 26px;border-radius:10px;border:1px solid ' + NAVY + ';font:700 12px/1 ' + FONT + ';letter-spacing:.18em;text-transform:uppercase;white-space:nowrap;color:' + NAVY + ';text-decoration:none">Hồ sơ năng lực</a></td>' +
      '</tr></table></td></tr>' +

      /* proof */
      '<tr><td class="px" style="padding:26px 44px 34px"><table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border-top:1px solid ' + LINE + '"><tr>' +
      '<td width="50%" align="center" style="padding:22px 8px 0"><p style="margin:0;font:700 26px/1 ' + FONT + ';color:' + NAVY + '">1.500+</p><p style="margin:8px 0 0;font:600 10.5px/1.4 ' + FONT + ';letter-spacing:.16em;text-transform:uppercase;color:' + MUTED + '">Công trình</p></td>' +
      '<td width="50%" align="center" style="padding:22px 8px 0;border-left:1px solid ' + LINE + '"><p style="margin:0;font:700 26px/1 ' + FONT + ';color:' + NAVY + '">1.000+</p><p style="margin:8px 0 0;font:600 10.5px/1.4 ' + FONT + ';letter-spacing:.16em;text-transform:uppercase;color:' + MUTED + '">Kỹ sư &amp; chuyên gia</p></td>' +
      '</tr></table></td></tr>' +

      /* footer */
      '<tr><td style="background:' + NAVY_D + ';padding:0"><table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%"><tr><td class="px" style="padding:32px 44px 12px">' +
      '<table role="presentation" class="stack" cellpadding="0" cellspacing="0" border="0" width="100%"><tr>' +
      '<td class="col" width="50%" valign="top" style="padding-right:16px"><p style="margin:0;font:700 10.5px/1 ' + FONT + ';letter-spacing:.2em;text-transform:uppercase;color:#FF8C84">Trụ sở chính — TP. HCM</p><p style="margin:10px 0 0;font:400 13px/1.6 ' + FONT + ';color:rgba(255,255,255,.72)">Tầng 2, Toà nhà Etown 5, 364 Cộng Hoà, Phường Tân Bình<br>(028) 3810 0068</p></td>' +
      '<td class="col" width="50%" valign="top"><p style="margin:0;font:700 10.5px/1 ' + FONT + ';letter-spacing:.2em;text-transform:uppercase;color:#FF8C84">Văn phòng Hà Nội</p><p style="margin:10px 0 0;font:400 13px/1.6 ' + FONT + ';color:rgba(255,255,255,.72)">Tầng 17, Toà nhà ICON 4, 243A Đê La Thành, Phường Láng<br>(024) 6281 9791</p></td>' +
      '</tr></table></td></tr>' +
      '<tr><td class="px" style="padding:12px 44px 30px"><table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border-top:1px solid rgba(255,255,255,.12)"><tr><td style="padding-top:18px;font:400 12px/1.7 ' + FONT + ';color:rgba(255,255,255,.5)">' +
      '<a href="tel:19003339" style="color:#FFFFFF;text-decoration:none;font-weight:700">1900 3339</a>&nbsp;&nbsp;·&nbsp;&nbsp;<a href="mailto:ree@reeme.com.vn" style="color:#FFFFFF;text-decoration:none">ree@reeme.com.vn</a>&nbsp;&nbsp;·&nbsp;&nbsp;<a href="' + site + '" style="color:#FFFFFF;text-decoration:none">reeme.com.vn</a><br>' +
      'Email này được gửi tự động để xác nhận yêu cầu của bạn. Vui lòng không trả lời trực tiếp email này.<br>© ' + new Date().getFullYear() + ' Công ty Cổ phần Dịch vụ &amp; Kỹ thuật Cơ điện lạnh R.E.E</td></tr></table></td></tr>' +
      '</table></td></tr>' +

      '</table></td></tr></table></body></html>';
  }

  /* ---------- preview overlay ---------- */
  var css = '.rem{position:fixed;inset:0;z-index:2147483000;display:grid;place-items:center;padding:24px;background:rgba(7,16,38,.62);-webkit-backdrop-filter:blur(8px);backdrop-filter:blur(8px);opacity:0;transition:opacity .3s}' +
    '.rem.on{opacity:1}.rem *{box-sizing:border-box}' +
    '.rem-box{width:min(820px,100%);height:min(92vh,980px);display:flex;flex-direction:column;background:#F4F6FA;border-radius:20px;overflow:hidden;box-shadow:0 40px 90px -30px rgba(0,0,0,.6);transform:translateY(14px) scale(.985);transition:transform .45s cubic-bezier(.2,.8,.2,1);font-family:"Plus Jakarta Sans","Helvetica Neue",Arial,sans-serif}' +
    '.rem.on .rem-box{transform:none}' +
    '.rem-top{display:flex;align-items:center;gap:14px;padding:16px 18px 14px 22px;background:#fff;border-bottom:1px solid #E6EAF2}' +
    '.rem-av{flex:none;width:40px;height:40px;border-radius:50%;display:grid;place-items:center;background:linear-gradient(135deg,#0B1F4A,#1D4690);color:#fff;font-weight:800;font-size:15px}' +
    '.rem-meta{flex:1;min-width:0;line-height:1.35}.rem-sub{font-size:15px;font-weight:700;color:#0F1B33;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}' +
    '.rem-from{font-size:12.5px;color:#5E6A82;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.rem-from b{color:#0F1B33;font-weight:600}' +
    '.rem-seg{flex:none;display:flex;gap:2px;padding:3px;border:1px solid #DCE3F0;border-radius:11px;background:#fff}' +
    '.rem-seg button{height:30px;padding:0 12px;border:0;border-radius:8px;background:transparent;color:#5E6A82;font:600 12px/1 inherit;font-family:inherit;cursor:pointer;transition:background .2s,color .2s}' +
    '.rem-seg button:hover{background:#EEF3FB;color:#0B3F8F}.rem-seg button.on{background:#13306B;color:#fff}' +
    '.rem-x{flex:none;width:36px;height:36px;border:0;border-radius:50%;background:#F1F3F8;color:#5E6A82;display:grid;place-items:center;cursor:pointer;transition:background .2s,color .2s,transform .3s}' +
    '.rem-x:hover{background:#E4E8F0;color:#0F1B33;transform:rotate(90deg)}.rem-x svg{width:16px;height:16px}' +
    '.rem-note{display:flex;align-items:center;gap:8px;padding:9px 22px;background:#FFF7E8;color:#8A5A00;font-size:12.5px;border-bottom:1px solid #F5E3BF}' +
    '.rem-note svg{flex:none;width:15px;height:15px}' +
    '.rem-body{flex:1;min-height:0;overflow:auto;display:flex;justify-content:center;background:#EEF1F6}' +
    '.rem-body iframe{display:block;width:100%;max-width:100%;border:0;background:#EEF1F6;transition:max-width .45s cubic-bezier(.2,.8,.2,1)}' +
    '.rem.mob .rem-body{padding:18px 0}.rem.mob .rem-body iframe{max-width:390px;border-radius:24px;box-shadow:0 0 0 8px #0F1B33,0 24px 50px -24px rgba(0,0,0,.5)}' +
    '@media (max-width:640px){.rem{padding:0}.rem-box{height:100%;border-radius:0}.rem-seg{display:none}.rem-top{padding:12px 12px 12px 16px}}';

  function open(d) {
    d = d || {};
    if (!document.getElementById('rem-css')) { var st = document.createElement('style'); st.id = 'rem-css'; st.textContent = css; document.head.appendChild(st); }
    var old = document.querySelector('.rem'); if (old) old.remove();
    var site = new URL('./', location.href).href;
    var html = build(d, { site: 'https://ree-me-website.vercel.app/', logo: site + 'assets/ree-me-logo-bRK-tEB-.png' });
    var to = esc((d.email || '').trim()) || 'khach-hang@email.com';
    var w = document.createElement('div'); w.className = 'rem'; w.setAttribute('role', 'dialog'); w.setAttribute('aria-modal', 'true'); w.setAttribute('aria-label', 'Xem trước email xác nhận');
    w.innerHTML = '<div class="rem-box"><div class="rem-top"><span class="rem-av">R</span><div class="rem-meta"><div class="rem-sub">Xác nhận yêu cầu tư vấn — R.E.E M&amp;E</div><div class="rem-from"><b>R.E.E M&amp;E</b> &lt;ree@reeme.com.vn&gt; &nbsp;→&nbsp; ' + to + '</div></div>' +
      '<div class="rem-seg" role="group" aria-label="Khung xem"><button type="button" class="on" data-v="d">Desktop</button><button type="button" data-v="m">Mobile</button></div>' +
      '<button type="button" class="rem-x" aria-label="Đóng"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg></button></div>' +
      '<div class="rem-note"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 8v5M12 16.5v.5"/></svg>Bản xem trước: đây là email khách hàng sẽ nhận khi biểu mẫu được kết nối hệ thống gửi mail.</div>' +
      '<div class="rem-body"><iframe title="Email xác nhận" sandbox="allow-same-origin allow-popups allow-popups-to-escape-sandbox"></iframe></div></div>';
    document.body.appendChild(w);
    var fr = w.querySelector('iframe');
    var fit = function () { try { var h = fr.contentDocument.documentElement.scrollHeight; fr.style.height = h + 'px'; } catch (_) {} };
    fr.addEventListener('load', function () { fit(); setTimeout(fit, 300); try { fr.contentDocument.querySelectorAll('a').forEach(function (a) { a.target = '_blank'; a.rel = 'noopener'; }); } catch (_) {} });
    fr.srcdoc = html;
    var prevOverflow = document.documentElement.style.overflow; document.documentElement.style.overflow = 'hidden';
    var close = function () { w.classList.remove('on'); document.documentElement.style.overflow = prevOverflow; document.removeEventListener('keydown', onKey); setTimeout(function () { w.remove(); }, 300); };
    var onKey = function (e) { if (e.key === 'Escape') close(); };
    document.addEventListener('keydown', onKey);
    w.addEventListener('click', function (e) {
      if (e.target === w || e.target.closest('.rem-x')) return close();
      var b = e.target.closest('.rem-seg button'); if (!b) return;
      w.querySelectorAll('.rem-seg button').forEach(function (x) { x.classList.toggle('on', x === b); });
      w.classList.toggle('mob', b.getAttribute('data-v') === 'm'); setTimeout(fit, 60); setTimeout(fit, 500);
    });
    requestAnimationFrame(function () { w.classList.add('on'); w.querySelector('.rem-x').focus({ preventScroll: true }); });
  }

  window.REE_EMAIL = { build: build };
  window.__reeEmailPreview = open;
})();
