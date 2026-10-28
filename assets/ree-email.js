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
    return '<tr><td class="lbl" style="padding:14px 0;' + (last ? '' : 'border-bottom:1px solid ' + LINE + ';') + 'width:150px;vertical-align:top;font:600 11px/1.5 ' + FONT + ';letter-spacing:.14em;text-transform:uppercase;color:' + MUTED + '">' + label + '</td>' +
      '<td style="padding:14px 0;' + (last ? '' : 'border-bottom:1px solid ' + LINE + ';') + 'vertical-align:top;font:500 15px/1.55 ' + FONT + ';color:' + INK + '">' + (value || '<span style="color:#A3ACBF">—</span>') + '</td></tr>';
  }
  function subject(d) {
    var who = [(d.company || '').trim(), (d.name || '').trim()].filter(Boolean).join(' / ');
    return '[R.E.E Web] Yêu cầu tư vấn dự án mới' + (who ? ' - ' + who : '');
  }

  function build(d, o) {
    d = d || {}; o = o || {};
    var site = o.site || 'https://ree-me-website.vercel.app/';
    var logo = o.logo || site + 'assets/ree-me-logo-bRK-tEB-.png';
    var img = o.img || site + 'assets/hero-long-thanh-wkOxBeou.jpg';
    var base = o.base || site;
    var at = o.at || when();
    var name = esc((d.name || '').trim()), company = esc((d.company || '').trim());
    var phone = esc((d.phone || '').trim()), email = esc((d.email || '').trim()), type = esc((d.type || '').trim());
    var msg = esc((d.message || '').replace(/\r/g, '').trim()).replace(/\n[ \t]*\n(?:[ \t]*\n)+/g, '\n\n').replace(/^[ \t]*[*\-•][ \t]+/gm, '•&nbsp;&nbsp;').replace(/\n/g, '<br>');
    var tel = /\{\{/.test(phone) ? phone : phone.replace(/[^0-9+]/g, '');
    var BG = '#E9EDF3', GOLD = '#C2A16B', HAIR = '#E8EAF0', MU = '#6B7385';
    var SERIF = "Georgia,'Times New Roman',Times,serif";
    var SANS = "'Inter','Helvetica Neue',Helvetica,Arial,sans-serif";
    var T = function (a) { return '<table role="presentation" cellpadding="0" cellspacing="0" border="0"' + (a || '') + '>'; };
    var dash = '<span style="color:#A9B0C0">—</span>';
    var sec = function (t) { return '<p class="sec" style="margin:0 0 2px;font:600 11px/1.4 ' + SANS + ';letter-spacing:.22em;text-transform:uppercase;color:' + RED + '">' + t + '</p>'; };
    var r = function (l, v, last) {
      var b = last ? '' : 'border-bottom:1px solid ' + HAIR + ';';
      return '<tr><td class="lbl" width="170" valign="top" style="padding:10px 12px 10px 0;' + b + 'font:400 14px/1.5 ' + SANS + ';color:' + MU + '">' + l + '</td>' +
        '<td valign="top" style="padding:10px 0;' + b + 'font:500 15px/1.5 ' + SANS + ';color:' + INK + ';word-break:break-word">' + (v || dash) + '</td></tr>';
    };
    var link = function (href, v) { return '<a href="' + href + '" style="color:' + NAVY + ';text-decoration:none">' + v + '</a>'; };
    return '<!doctype html><html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">' +
      '<meta name="color-scheme" content="light"><meta name="supported-color-schemes" content="light"><title>' + esc(subject(d)) + '</title>' +
      '<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">' +
      '<style>body{margin:0;padding:0;background:' + BG + '}a{color:' + NAVY + '}@media (max-width:620px){.wrap{width:100%!important}.px{padding-left:24px!important;padding-right:24px!important}.hx{padding:20px 22px!important}.cn{font-size:11px!important;letter-spacing:0!important}.lg{width:54px!important}.lgc{padding-right:12px!important}.g{font-size:23px!important}.q{font-size:20px!important}.lbl{width:118px!important}}</style></head>' +
      '<body style="margin:0;padding:0;background:' + BG + '">' +
      T(' width="100%" style="background:' + BG + '"') + '<tr><td align="center" style="padding:32px 12px 44px">' +
      T(' class="wrap" width="600" style="width:600px;max-width:600px;background:#FFFFFF;border-radius:16px;overflow:hidden;box-shadow:0 30px 70px -40px rgba(11,31,74,.45)"') +

      /* site header: blue band, logo + company name */
      '<tr><td bgcolor="#1F45A0" style="background-color:#1F45A0;background-image:url(' + img + ');background-size:cover;background-position:center 30%">' +
      T(' width="100%" style="background:linear-gradient(100deg,rgba(24,58,145,.97) 0%,rgba(33,73,165,.93) 55%,rgba(44,88,180,.82) 100%)"') + '<tr><td class="hx" style="padding:26px 40px">' +
      T() + '<tr><td class="lgc" valign="middle" style="padding-right:18px"><img class="lg" src="' + logo + '" width="72" height="50" alt="R.E.E M&amp;E" style="display:block;border:0;width:72px;height:auto"></td>' +
      '<td valign="middle" class="cn" style="font:700 15px/1.35 ' + SANS + ';letter-spacing:.01em;text-transform:uppercase;color:#FFFFFF">Công ty Cổ phần Dịch vụ &amp; Kỹ&nbsp;thuật<br>Cơ điện lạnh R.E.E</td></tr></table>' +
      '</td></tr></table></td></tr>' +
      '<tr><td style="font-size:0;line-height:0">' + T(' width="100%"') + '<tr><td width="70%" style="height:3px;background:' + RED + '">&nbsp;</td><td style="height:3px;background:' + GOLD + '">&nbsp;</td></tr></table></td></tr>' +

      /* greeting + intro */
      '<tr><td class="px" style="padding:32px 48px 0"><p class="g" style="margin:0;font:italic 400 26px/1.4 ' + SERIF + ';color:' + INK + '">Kính gửi Quản trị viên Website &amp; Ban Dự án R.E.E M&amp;E,</p>' +
      '<p style="margin:16px 0 0;font:400 15.5px/1.75 ' + SANS + ';color:' + MU + '">Hệ thống vừa ghi nhận <b style="color:' + INK + ';font-weight:600">01 Yêu cầu tư vấn dự án mới</b> được gửi từ biểu mẫu trên Website R.E.E M&amp;E. Chi tiết thông tin tiếp nhận như sau:</p></td></tr>' +

      /* customer & project (A) */
      '<tr><td class="px" style="padding:28px 48px 0">' + sec('Thông tin khách hàng &amp; dự án') + T(' width="100%"') +
      r('Họ và tên', name) + r('Công ty', company) + r('Số điện thoại', phone ? link('tel:' + tel, phone) : '') +
      r('Email', email ? link('mailto:' + email, email) : '') + r('Loại hình dự án', type, true) + '</table></td></tr>' +

      /* request (A) */
      '<tr><td class="px" style="padding:30px 48px 0">' + sec('Nội dung yêu cầu tư vấn') +
      '<p class="q" style="margin:10px 0 0;font:italic 400 21px/1.6 ' + SERIF + ';color:' + NAVY + '">' + (msg ? '&ldquo;' + msg + '&rdquo;' : dash) + '</p></td></tr>' +

      /* time + source (A) */
      '<tr><td class="px" style="padding:24px 48px 0">' + T(' width="100%" style="border-top:1px solid ' + HAIR + '"') +
      r('Thời gian gửi', at) + r('Nguồn đăng ký', 'Form &ldquo;Yêu cầu tư vấn / Gửi thông tin dự án&rdquo; - Website R.E.E M&amp;E', true) + '</table></td></tr>' +

      /* note */
      '<tr><td class="px" style="padding:22px 48px 0">' + T(' width="100%" style="background:#FBF6EC;border-radius:12px;border:1px solid #EFE3CB"') +
      '<tr><td width="4" style="background:' + GOLD + ';border-radius:12px 0 0 12px;font-size:0;line-height:0">&nbsp;</td>' +
      '<td style="padding:19px 24px 19px 20px;font:400 14.5px/1.7 ' + SANS + ';color:#4A3F2C"><b style="color:#9A7330;font-weight:700">Lưu ý:</b> Bộ phận Chăm sóc khách hàng / Tư vấn dự án vui lòng kiểm tra và liên hệ phản hồi cho khách hàng trong vòng <b style="color:' + INK + ';font-weight:700">24 giờ làm việc</b>.</td></tr></table></td></tr>' +

      /* sign-off (B) */
      '<tr><td class="px" style="padding:28px 48px 34px">' + T() + '<tr><td style="width:40px;height:1px;background:' + GOLD + ';font-size:0;line-height:0">&nbsp;</td></tr></table>' +
      '<p style="margin:18px 0 0;font:italic 400 17px/1.5 ' + SERIF + ';color:' + MU + '">Trân trọng,</p>' +
      '<p style="margin:6px 0 0;font:600 15px/1.5 ' + SANS + ';color:' + INK + '">Hệ thống Quản trị Website R.E.E M&amp;E</p></td></tr>' +

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
    '.rem-body{flex:1;min-height:0;overflow:auto;display:flex;justify-content:center;background:#E9EDF3}' +
    '.rem-body iframe{display:block;width:100%;max-width:100%;border:0;background:#E9EDF3;transition:max-width .45s cubic-bezier(.2,.8,.2,1)}' +
    '.rem.mob .rem-body{padding:18px 0}.rem.mob .rem-body iframe{max-width:390px;border-radius:24px;box-shadow:0 0 0 8px #0F1B33,0 24px 50px -24px rgba(0,0,0,.5)}' +
    '@media (max-width:640px){.rem{padding:0}.rem-box{height:100%;border-radius:0}.rem-seg{display:none}.rem-top{padding:12px 12px 12px 16px}}';

  function open(d) {
    d = d || {};
    if (!document.getElementById('rem-css')) { var st = document.createElement('style'); st.id = 'rem-css'; st.textContent = css; document.head.appendChild(st); }
    var old = document.querySelector('.rem'); if (old) old.remove();
    var site = new URL('./', location.href).href;
    var html = build(d, { site: 'https://ree-me-website.vercel.app/', logo: site + 'assets/ree-me-logo-bRK-tEB-.png', img: site + 'assets/hero-long-thanh-wkOxBeou.jpg', base: site });
    
    var w = document.createElement('div'); w.className = 'rem'; w.setAttribute('role', 'dialog'); w.setAttribute('aria-modal', 'true'); w.setAttribute('aria-label', 'Xem trước email thông báo');
    w.innerHTML = '<div class="rem-box"><div class="rem-top"><span class="rem-av">R</span><div class="rem-meta"><div class="rem-sub">' + esc(subject(d)) + '</div><div class="rem-from"><b>Hệ thống Website R.E.E M&amp;E</b> &lt;no-reply@reeme.com.vn&gt; &nbsp;→&nbsp; ree@reeme.com.vn</div></div>' +
      '<div class="rem-seg" role="group" aria-label="Khung xem"><button type="button" class="on" data-v="d">Desktop</button><button type="button" data-v="m">Mobile</button></div>' +
      '<button type="button" class="rem-x" aria-label="Đóng"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg></button></div>' +
      '<div class="rem-note"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 8v5M12 16.5v.5"/></svg>Bản xem trước: đây là email thông báo gửi về hộp thư quản trị khi biểu mẫu được kết nối hệ thống gửi mail.</div>' +
      '<div class="rem-body"><iframe title="Email thông báo yêu cầu tư vấn" sandbox="allow-same-origin allow-popups allow-popups-to-escape-sandbox"></iframe></div></div>';
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

  window.REE_EMAIL = { build: build, subject: subject };
  window.__reeEmailPreview = open;
})();
