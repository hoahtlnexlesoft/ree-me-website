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
    var who = [(d.company || '').trim(), (d.name || '').trim()].filter(Boolean).join(' / ') || 'Khách hàng mới';
    return '[R.E.E Web] Yêu cầu tư vấn dự án mới - ' + who;
  }
  function initials(n) { n = (n || '').replace(/\{\{.*?\}\}/g, '').trim().split(/\s+/).filter(Boolean); if (!n.length) return 'R'; return ((n[0][0] || '') + (n.length > 1 ? n[n.length - 1][0] : '')).toUpperCase(); }

  function build(d, o) {
    d = d || {}; o = o || {};
    var site = o.site || 'https://ree-me-website.vercel.app/';
    var logo = o.logo || site + 'assets/ree-me-logo-bRK-tEB-.png';
    var ref = o.ref || code();
    var at = o.at || when();
    var name = esc((d.name || '').trim()), company = esc((d.company || '').trim());
    var phone = esc((d.phone || '').trim()), email = esc((d.email || '').trim()), type = esc((d.type || '').trim());
    var msg = esc((d.message || '').trim()).replace(/\n/g, '<br>');
    var tel = /\{\{/.test(phone) ? phone : phone.replace(/[^0-9+]/g, '');
    var IV = '#F5F3EE', GOLD = '#B08D57', HAIR = '#E7E3DA';
    var SERIF = "'Playfair Display',Georgia,'Times New Roman',serif";
    var SANS = "'Inter','Helvetica Neue',Helvetica,Arial,sans-serif";
    var cap = function (t, c) { return '<p style="margin:0;font:600 10px/1.4 ' + SANS + ';letter-spacing:.28em;text-transform:uppercase;color:' + (c || '#8A8578') + '">' + t + '</p>'; };
    var dash = '<span style="color:#B9B3A6">—</span>';
    var T = function (attrs) { return '<table role="presentation" cellpadding="0" cellspacing="0" border="0"' + (attrs || '') + '>'; };
    var mailto = email ? 'mailto:' + email + '?subject=' + encodeURIComponent('Re: ' + subject(d)) : '';
    return '<!doctype html><html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">' +
      '<meta name="color-scheme" content="light"><meta name="supported-color-schemes" content="light"><title>' + esc(subject(d)) + '</title>' +
      '<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Playfair+Display:ital,wght@0,500;0,600;1,400&display=swap" rel="stylesheet">' +
      '<style>body{margin:0;padding:0;background:' + IV + '}a{color:' + NAVY + '}' +
      '@media (max-width:620px){.wrap{width:100%!important}.px{padding-left:24px!important;padding-right:24px!important}.h1{font-size:34px!important}.q{font-size:19px!important}.col{display:block!important;width:100%!important;border-left:0!important;border-top:1px solid rgba(255,255,255,.14)!important;padding:16px 24px!important}.col1{border-top:0!important}.c2{display:block!important;width:100%!important;padding:22px 0 0!important;border-left:0!important}.c2b{padding:20px 0 22px!important}.hide-m{display:none!important}.cta .pb{display:block!important;min-width:0!important}}</style></head>' +
      '<body style="margin:0;padding:0;background:' + IV + '">' +
      '<div style="display:none;max-height:0;overflow:hidden;opacity:0">' + ([company, name].filter(Boolean).join(' / ') || 'Khách hàng mới') + ' vừa gửi yêu cầu tư vấn dự án ' + (type ? '(' + type + ') ' : '') + '— vui lòng phản hồi trong 24 giờ làm việc.</div>' +
      T(' width="100%" style="background:' + IV + '"') + '<tr><td align="center" style="padding:28px 12px 44px">' +

      /* pre-header */
      T(' class="wrap" width="600" style="width:600px;max-width:600px"') + '<tr>' +
      '<td style="padding:0 6px 14px;font:600 10px/1 ' + SANS + ';letter-spacing:.26em;text-transform:uppercase;color:#8A8578">R.E.E M&amp;E&nbsp;&nbsp;·&nbsp;&nbsp;Thông báo nội bộ</td>' +
      '<td class="hide-m" align="right" style="padding:0 6px 14px;font:600 10px/1 ' + SANS + ';letter-spacing:.2em;color:#8A8578">' + ref + '</td></tr></table>' +

      T(' class="wrap" width="600" style="width:600px;max-width:600px;background:#FFFFFF;border-radius:4px;overflow:hidden;box-shadow:0 1px 0 ' + HAIR + ',0 30px 60px -40px rgba(30,25,15,.35)"') +

      /* masthead */
      '<tr><td align="center" style="padding:40px 40px 0"><a href="' + site + '" style="text-decoration:none"><img src="' + logo + '" width="64" height="44" alt="R.E.E M&amp;E" style="display:block;border:0;width:64px;height:auto"></a></td></tr>' +
      '<tr><td align="center" class="px" style="padding:30px 48px 0">' + cap('Yêu cầu tư vấn dự án', RED) +
      '<h1 class="h1" style="margin:16px 0 0;font:500 42px/1.12 ' + SERIF + ';letter-spacing:-.01em;color:' + INK + '">Một dự án mới<br><i style="font-weight:400;color:' + NAVY + '">đang chờ phản hồi</i></h1>' +
      '<p style="margin:22px 0 0;font:500 13px/1.6 ' + SANS + ';letter-spacing:.14em;text-transform:uppercase;color:' + MUTED + '">' + ([company, name].filter(Boolean).join('&nbsp;&nbsp;/&nbsp;&nbsp;') || 'Khách hàng mới') + '</p>' +
      T(' align="center" style="margin:26px auto 0"') + '<tr><td style="width:44px;height:1px;background:' + GOLD + ';font-size:0;line-height:0">&nbsp;</td></tr></table></td></tr>' +

      /* key facts band */
      '<tr><td style="padding:36px 0 0">' + T(' width="100%" style="background:' + NAVY_D + ';background-image:linear-gradient(120deg,' + NAVY_D + ' 0%,' + NAVY + ' 100%)"') + '<tr>' +
      '<td class="col col1" width="40%" valign="top" style="padding:24px 18px 24px 40px">' + cap('Loại hình dự án', '#C9B48A') + '<p style="margin:9px 0 0;font:600 15px/1.4 ' + SANS + ';color:#FFFFFF">' + (type || '—') + '</p></td>' +
      '<td class="col" width="28%" valign="top" style="padding:24px 18px;border-left:1px solid rgba(255,255,255,.14)">' + cap('Thời gian gửi', '#C9B48A') + '<p style="margin:9px 0 0;font:600 15px/1.4 ' + SANS + ';white-space:nowrap;color:#FFFFFF">' + at + '</p></td>' +
      '<td class="col" width="32%" valign="top" style="padding:24px 40px 24px 18px;border-left:1px solid rgba(255,255,255,.14)">' + cap('Mã yêu cầu', '#C9B48A') + '<p style="margin:9px 0 0;font:600 15px/1.4 ' + SANS + ';white-space:nowrap;color:#FFFFFF">' + ref + '</p></td>' +
      '</tr></table></td></tr>' +

      /* greeting */
      '<tr><td class="px" style="padding:40px 48px 0"><p style="margin:0;font:italic 400 19px/1.5 ' + SERIF + ';color:' + INK + '">Kính gửi Quản trị viên Website &amp; Ban Dự án R.E.E M&amp;E,</p>' +
      '<p style="margin:14px 0 0;font:400 15px/1.75 ' + SANS + ';color:' + MUTED + '">Hệ thống vừa ghi nhận <b style="color:' + INK + ';font-weight:600">01 Yêu cầu tư vấn dự án mới</b> được gửi từ biểu mẫu trên Website R.E.E M&amp;E. Chi tiết thông tin tiếp nhận như sau:</p></td></tr>' +

      /* client */
      '<tr><td class="px" style="padding:34px 48px 0">' + cap('Thông tin khách hàng &amp; dự án') +
      T(' width="100%" style="margin-top:16px;border-top:1px solid ' + HAIR + ';border-bottom:1px solid ' + HAIR + '"') + '<tr>' +
      '<td class="c2" width="50%" valign="top" style="padding:24px 20px 24px 0">' + T() + '<tr>' +
      '<td valign="top" style="padding-right:16px"><div style="width:52px;height:52px;border-radius:50%;background:' + NAVY + ';box-shadow:0 0 0 3px #FFFFFF,0 0 0 4px ' + GOLD + ';text-align:center;font:500 19px/52px ' + SERIF + ';color:#FFFFFF">' + initials(d.name) + '</div></td>' +
      '<td valign="middle"><p style="margin:0;font:500 22px/1.25 ' + SERIF + ';color:' + INK + '">' + (name || dash) + '</p><p style="margin:5px 0 0;font:500 13.5px/1.4 ' + SANS + ';color:' + MUTED + '">' + (company || 'Cá nhân') + '</p></td></tr></table></td>' +
      '<td class="c2 c2b" width="50%" valign="top" style="padding:24px 0 24px 24px;border-left:1px solid ' + HAIR + '">' +
      cap('Số điện thoại') + '<p style="margin:6px 0 0;font:600 15px/1.4 ' + SANS + '">' + (phone ? '<a href="tel:' + tel + '" style="color:' + NAVY + ';text-decoration:none">' + phone + '</a>' : dash) + '</p>' +
      '<div style="height:16px;line-height:16px;font-size:0">&nbsp;</div>' + cap('Email') + '<p style="margin:6px 0 0;font:600 15px/1.4 ' + SANS + ';word-break:break-all">' + (email ? '<a href="mailto:' + email + '" style="color:' + NAVY + ';text-decoration:none">' + email + '</a>' : dash) + '</p></td>' +
      '</tr></table></td></tr>' +

      /* request */
      '<tr><td class="px" style="padding:36px 48px 0">' + cap('Nội dung yêu cầu tư vấn') +
      (msg ? T(' width="100%" style="margin-top:14px"') + '<tr><td valign="top" width="40" style="font:400 64px/0.9 ' + SERIF + ';color:' + RED + '">&ldquo;</td>' +
        '<td valign="top" style="padding-top:6px"><p class="q" style="margin:0;font:italic 400 20px/1.6 ' + SERIF + ';color:' + INK + '">' + msg + '</p></td></tr></table>'
        : '<p style="margin:14px 0 0;font:400 14px/1.6 ' + SANS + ';color:#A39E92">Khách hàng không để lại nội dung.</p>') +
      '</td></tr>' +

      /* source */
      '<tr><td class="px" style="padding:30px 48px 0">' + T(' width="100%" style="background:' + IV + ';border-radius:4px"') + '<tr>' +
      '<td style="padding:18px 22px;font:400 13px/1.65 ' + SANS + ';color:' + MUTED + '"><b style="color:' + INK + ';font-weight:600">Nguồn đăng ký:</b> Form &ldquo;Yêu cầu tư vấn / Gửi thông tin dự án&rdquo; - Website R.E.E M&amp;E<br><b style="color:' + INK + ';font-weight:600">Thời gian gửi:</b> ' + at + '</td></tr></table></td></tr>' +

      /* note */
      '<tr><td class="px" style="padding:22px 48px 0">' + T(' width="100%"') + '<tr><td style="width:3px;background:' + RED + ';font-size:0;line-height:0">&nbsp;</td>' +
      '<td style="padding:4px 0 4px 18px;font:400 14px/1.65 ' + SANS + ';color:' + INK + '"><b style="color:' + RED + ';font-weight:700">Lưu ý</b>&nbsp; Bộ phận Chăm sóc khách hàng / Tư vấn dự án vui lòng kiểm tra và liên hệ phản hồi cho khách hàng trong vòng <b style="font-weight:700">24 giờ làm việc</b>.</td></tr></table></td></tr>' +

      /* CTA */
      ((tel || email) ? '<tr><td class="px cta" align="center" style="padding:36px 48px 0">' +
        (tel ? '<a class="pb" href="tel:' + tel + '" style="display:inline-block;min-width:240px;padding:18px 34px;background:' + NAVY + ';background-image:linear-gradient(120deg,' + NAVY_D + ',' + NAVY + ');border-radius:2px;font:600 11.5px/1 ' + SANS + ';letter-spacing:.24em;text-transform:uppercase;color:#FFFFFF;text-decoration:none;text-align:center">Liên hệ khách hàng&nbsp;&nbsp;→</a>' : '') +
        (email ? '<p style="margin:18px 0 0;font:600 11px/1 ' + SANS + ';letter-spacing:.2em;text-transform:uppercase"><a href="' + mailto + '" style="color:' + NAVY + ';text-decoration:none;border-bottom:1px solid ' + GOLD + ';padding-bottom:4px">Trả lời qua email</a></p>' : '') +
        '</td></tr>' : '') +

      /* sign-off */
      '<tr><td class="px" align="center" style="padding:40px 48px 46px">' + T(' align="center" style="margin:0 auto 22px"') + '<tr><td style="width:44px;height:1px;background:' + GOLD + ';font-size:0;line-height:0">&nbsp;</td></tr></table>' +
      '<p style="margin:0;font:italic 400 16px/1.5 ' + SERIF + ';color:' + MUTED + '">Trân trọng,</p>' +
      '<p style="margin:6px 0 0;font:600 12px/1.5 ' + SANS + ';letter-spacing:.2em;text-transform:uppercase;color:' + INK + '">Hệ thống Quản trị Website R.E.E M&amp;E</p></td></tr>' +
      '</table>' +

      /* footer */
      T(' class="wrap" width="600" style="width:600px;max-width:600px"') + '<tr><td align="center" style="padding:26px 24px 0;font:400 11.5px/1.8 ' + SANS + ';color:#8A8578">' +
      '<a href="' + site + '" style="color:' + INK + ';text-decoration:none;font-weight:600">reeme.com.vn</a>&nbsp;&nbsp;·&nbsp;&nbsp;<a href="tel:19003339" style="color:' + INK + ';text-decoration:none;font-weight:600">1900 3339</a>&nbsp;&nbsp;·&nbsp;&nbsp;<a href="mailto:ree@reeme.com.vn" style="color:' + INK + ';text-decoration:none;font-weight:600">ree@reeme.com.vn</a><br>' +
      'Email được tạo tự động khi khách hàng gửi biểu mẫu trên website R.E.E M&amp;E.<br>© ' + new Date().getFullYear() + ' Công ty Cổ phần Dịch vụ &amp; Kỹ thuật Cơ điện lạnh R.E.E</td></tr></table>' +

      '</td></tr></table></body></html>';
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
    '.rem-body{flex:1;min-height:0;overflow:auto;display:flex;justify-content:center;background:#F5F3EE}' +
    '.rem-body iframe{display:block;width:100%;max-width:100%;border:0;background:#F5F3EE;transition:max-width .45s cubic-bezier(.2,.8,.2,1)}' +
    '.rem.mob .rem-body{padding:18px 0}.rem.mob .rem-body iframe{max-width:390px;border-radius:24px;box-shadow:0 0 0 8px #0F1B33,0 24px 50px -24px rgba(0,0,0,.5)}' +
    '@media (max-width:640px){.rem{padding:0}.rem-box{height:100%;border-radius:0}.rem-seg{display:none}.rem-top{padding:12px 12px 12px 16px}}';

  function open(d) {
    d = d || {};
    if (!document.getElementById('rem-css')) { var st = document.createElement('style'); st.id = 'rem-css'; st.textContent = css; document.head.appendChild(st); }
    var old = document.querySelector('.rem'); if (old) old.remove();
    var site = new URL('./', location.href).href;
    var html = build(d, { site: 'https://ree-me-website.vercel.app/', logo: site + 'assets/ree-me-logo-bRK-tEB-.png' });
    
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
