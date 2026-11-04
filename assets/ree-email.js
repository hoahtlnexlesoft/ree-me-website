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
    var at0 = d.attach || {};
    var kb = function (n) { return n >= 1048576 ? (n / 1048576).toFixed(1).replace('.', ',') + ' MB' : Math.max(1, Math.round(n / 1024)) + ' KB'; };
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
    var fl = at0.files || [], ll = at0.links || [];
    var EXT = { pdf: ['PDF', '#D93A35'], doc: ['DOC', '#2B5BD7'], docx: ['DOC', '#2B5BD7'], xls: ['XLS', '#1E8A4C'], xlsx: ['XLS', '#1E8A4C'], ppt: ['PPT', '#D9622B'], pptx: ['PPT', '#D9622B'], dwg: ['DWG', '#B07A12'], dxf: ['DXF', '#B07A12'], rvt: ['RVT', '#B07A12'], ifc: ['IFC', '#B07A12'], zip: ['ZIP', '#5E6A82'], rar: ['RAR', '#5E6A82'], '7z': ['7Z', '#5E6A82'], jpg: ['IMG', '#7A4FD1'], jpeg: ['IMG', '#7A4FD1'], png: ['IMG', '#7A4FD1'], webp: ['IMG', '#7A4FD1'] };
    var host = function (u) { var m = /^https?:\/\/([^\/?#]+)/i.exec(u); var h = m ? m[1].replace(/^www\./, '') : ''; return /drive\.google|docs\.google/.test(h) ? 'Google Drive' : /dropbox/.test(h) ? 'Dropbox' : /onedrive|1drv\.ms/.test(h) ? 'OneDrive' : /sharepoint/.test(h) ? 'SharePoint' : /wetransfer|we\.tl/.test(h) ? 'WeTransfer' : h; };
    var badge = function (t, c) { return '<td width="52" valign="middle" style="padding:12px 0 12px 14px"><div style="width:38px;height:38px;border-radius:9px;background:' + c + ';text-align:center;font:700 10.5px/38px ' + SANS + ';letter-spacing:.04em;color:#FFFFFF">' + t + '</div></td>'; };
    var item = function (inner, last) { return '<tr><td style="padding:0' + (last ? '' : ' 0 8px') + '">' + T(' width="100%" style="border:1px solid ' + HAIR + ';border-radius:12px;background:#FFFFFF"') + '<tr>' + inner + '</tr></table></td></tr>'; };
    var attach = fl.map(function (f, i) {
      var ph = /\{\{/.test(f.name), ext = ph ? '' : (f.name.split('.').pop() || '').toLowerCase(), e = EXT[ext] || [ph ? 'FILE' : (ext || 'FILE').slice(0, 4).toUpperCase(), NAVY];
      return item(badge(e[0], e[1]) + '<td valign="middle" style="padding:12px 16px;font:600 14.5px/1.4 ' + SANS + ';color:' + INK + ';word-break:break-all">' + esc(f.name) + (f.size ? '<br><span style="font-weight:400;font-size:12.5px;color:#8A93A8">' + kb(f.size) + '</span>' : '') + '</td>', i === fl.length - 1 && !ll.length);
    }).concat(ll.map(function (u, i) {
      var e = esc(u), ph = /\{\{/.test(u);
      return item(badge('URL', NAVY) + '<td valign="middle" style="padding:12px 8px 12px 16px;font:600 14.5px/1.4 ' + SANS + ';color:' + INK + '">' + (ph ? 'Link tài liệu' : host(u)) + '<br><a href="' + e + '" style="font-weight:400;font-size:12.5px;color:#8A93A8;text-decoration:none;word-break:break-all">' + e + '</a></td>' +
        (ph ? '' : '<td width="70" align="right" valign="middle" style="padding:12px 16px 12px 0"><a href="' + e + '" style="font:600 12.5px/1 ' + SANS + ';color:' + NAVY + ';text-decoration:none;white-space:nowrap">Mở &rarr;</a></td>'), i === ll.length - 1);
    }));
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

      /* attachments */
      (attach.length ? '<tr><td class="px" style="padding:28px 48px 0">' + sec('Tài liệu đính kèm') + T(' width="100%" style="margin-top:10px"') + attach.join('') + '</table></td></tr>' : '') +

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
    d = Object.assign({}, d || {}, { attach: window.__reeAttach ? { files: (window.__reeAttach.files || []).slice(), links: (window.__reeAttach.links || []).slice() } : null });
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

  /* Thank-you screen shown after a successful submit (replaces the email preview) */
  var tyCss =
    '.rty{position:fixed;inset:0;z-index:2147483000;display:grid;place-items:center;padding:20px;background:rgba(10,18,36,.58);-webkit-backdrop-filter:blur(6px);backdrop-filter:blur(6px);opacity:0;transition:opacity .3s ease;font-family:inherit}' +
    '.rty.on{opacity:1}' +
    '.rty-box{position:relative;width:100%;max-width:480px;background:#fff;border-radius:24px;padding:44px 36px 32px;text-align:center;box-shadow:0 40px 90px -30px rgba(10,18,36,.55);transform:translateY(16px) scale(.97);transition:transform .45s cubic-bezier(.2,.8,.2,1);overflow:hidden}' +
    '.rty.on .rty-box{transform:none}' +
    '.rty-box:before{content:"";position:absolute;left:0;right:0;top:0;height:4px;background:linear-gradient(90deg,#1B2D5B,#2F4C8F 60%,#D7262E)}' +
    '.rty-x{position:absolute;top:14px;right:14px;width:34px;height:34px;border:0;border-radius:50%;background:#F1F3F8;color:#5E6A82;display:grid;place-items:center;cursor:pointer;transition:background .2s,transform .3s}' +
    '.rty-x:hover{background:#E4E8F0;color:#0F1B33;transform:rotate(90deg)}.rty-x svg{width:15px;height:15px}' +
    '.rty-art{display:block;width:min(260px,82%);margin:-6px auto 14px}.rty-art svg{display:block;width:100%;height:auto;overflow:visible}.rty-art svg *{transform-box:fill-box}.rty .rta-env{transform-origin:center;animation:rtaInL .8s .1s cubic-bezier(.2,.8,.2,1) both,rtaFloat 4.2s 1.2s ease-in-out infinite}.rty .rta-doc{transform-origin:center;animation:rtaInU .8s .2s cubic-bezier(.2,.8,.2,1) both,rtaFloat 4.8s 1.4s ease-in-out infinite reverse}.rty .rta-plane{transform-origin:center;animation:rtaFly 1s .7s cubic-bezier(.2,.8,.2,1) both,rtaDrift 3.6s 1.8s ease-in-out infinite}.rty .rta-dash path{animation:rtaDash 1.4s linear infinite}.rty .rta-ln path,.rty .rta-ln2 path{stroke-dasharray:80;stroke-dashoffset:80;animation:rtdDraw .6s .7s cubic-bezier(.65,0,.35,1) forwards}.rty .rta-star{transform-origin:center;animation:rtaSpin 5s 1s ease-in-out infinite}.rty .rta-twk>*{transform-origin:center;animation:rtaTwk 2.8s ease-in-out infinite}.rty .rtd-seal{transform-origin:center;animation:rtdPop .55s .55s cubic-bezier(.3,1.6,.5,1) both}.rty .rtd-seal .rtd-k{stroke-dasharray:36;stroke-dashoffset:36;animation:rtdDraw .45s .9s cubic-bezier(.65,0,.35,1) forwards}.rty .rtd-ring{transform-origin:center;animation:rtyP 2.6s 1.1s ease-out infinite}@media (prefers-reduced-motion:reduce){.rty-art svg *{animation:none!important;stroke-dashoffset:0!important}}@keyframes rtaDash{to{stroke-dashoffset:-20}}@keyframes rtaDrift{0%,100%{transform:translate(0,0) rotate(0)}50%{transform:translate(4px,-6px) rotate(-4deg)}}@keyframes rtaFloat{0%,100%{transform:translateY(0)}50%{transform:translateY(-5px)}}@keyframes rtaFly{from{opacity:0;transform:translate(-40px,30px) rotate(-12deg) scale(.7)}to{opacity:1;transform:none}}@keyframes rtaInL{from{opacity:0;transform:translateX(-22px)}to{opacity:1;transform:none}}@keyframes rtaInU{from{opacity:0;transform:translateY(18px)}to{opacity:1;transform:none}}@keyframes rtaSpin{0%,100%{transform:scale(1) rotate(0)}50%{transform:scale(1.18) rotate(45deg)}}@keyframes rtaTwk{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.35;transform:scale(.7)}}@keyframes rtdDraw{to{stroke-dashoffset:0}}@keyframes rtdPop{from{transform:scale(0)}to{transform:scale(1)}}' +
    '@keyframes rtyP{0%{transform:scale(.8);opacity:1}100%{transform:scale(1.35);opacity:0}}' +
    '.rty-k{font-size:12px;font-weight:600;letter-spacing:.14em;text-transform:uppercase;color:#D7262E;margin:0 0 8px}' +
    '.rty h3{margin:0;font-size:24px;line-height:1.3;font-weight:600;color:#0F1B33}' +
    '.rty p.rty-t{margin:12px auto 0;max-width:360px;font-size:15px;line-height:1.65;color:#5E6A82}' +
    '.rty-c{display:flex;justify-content:center;flex-wrap:wrap;gap:8px;margin:24px 0 0}' +
    '.rty-c a{display:inline-flex;align-items:center;gap:7px;padding:9px 14px;border-radius:999px;background:#F5F7FB;border:1px solid #E4E8F0;color:#1B2D5B;font-size:13.5px;font-weight:500;text-decoration:none;transition:border-color .2s,background .2s}' +
    '.rty-c a:hover{background:#EEF2FB;border-color:#C9D3EA}.rty-c svg{width:15px;height:15px;flex:none}' +
    '.rty-b{margin-top:26px;width:100%;height:48px;border:0;border-radius:999px;background:#1B2D5B;color:#fff;font:inherit;font-size:15px;font-weight:600;cursor:pointer;transition:background .2s,transform .2s}' +
    '.rty-b:hover{background:#13224A;transform:translateY(-1px)}' +
    '.rty-b:focus{outline:none}.rty-b:focus-visible{outline:2px solid #2F4C8F;outline-offset:3px}' +
    '@media (max-width:640px){.rty{align-items:end;padding:0}.rty-box{max-width:none;border-radius:24px 24px 0 0;padding:40px 22px calc(24px + env(safe-area-inset-bottom));transform:translateY(40px)}.rty h3{font-size:21px}}' +
    '';

  function thanks(d) {
    d = d || {};
    if (!document.getElementById('rty-css')) { var st = document.createElement('style'); st.id = 'rty-css'; st.textContent = tyCss; document.head.appendChild(st); }
    var old = document.querySelector('.rty'); if (old) old.remove();
    var en = (document.documentElement.lang || '').indexOf('en') === 0;
    var name = String(d.name || '').trim();
    var T = en ? {
      k: 'Request received', h: name ? 'Thank you, ' + name + '!' : 'Thank you for contacting R.E.E M&E',
      t: 'Your consultation request has been sent successfully. Our team will get back to you as soon as possible.', b: 'Close', x: 'Close'
    } : {
      k: 'Đã gửi yêu cầu', h: name ? 'Cảm ơn ' + name + '!' : 'Cảm ơn bạn đã liên hệ R.E.E M&E',
      t: 'Yêu cầu tư vấn của bạn đã được gửi thành công. Đội ngũ R.E.E M&E sẽ liên hệ lại với bạn trong thời gian sớm nhất.', b: 'Đóng', x: 'Đóng'
    };
    var w = document.createElement('div'); w.className = 'rty'; w.setAttribute('role', 'dialog'); w.setAttribute('aria-modal', 'true'); w.setAttribute('aria-labelledby', 'rty-h');
    w.setAttribute('data-no-i18n', '');
    w.innerHTML = '<div class="rty-box">' +
      '<button type="button" class="rty-x" aria-label="' + T.x + '"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg></button>' +
      '<span class="rty-art" aria-hidden="true"><svg viewBox="0 0 320 200" fill="none" stroke-linecap="round" stroke-linejoin="round"><defs><radialGradient id="rtyG" cx="50%" cy="55%" r="50%"><stop offset="0" stop-color="#DFE8FA"/><stop offset=".65" stop-color="#EEF3FC" stop-opacity=".5"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient><linearGradient id="rtyGold" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#EBD39E"/><stop offset="1" stop-color="#B08D57"/></linearGradient><linearGradient id="rtyHd" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#E4ECFB"/><stop offset="1" stop-color="#CFDCF5"/></linearGradient><linearGradient id="rtyOk" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#34C487"/><stop offset="1" stop-color="#128A5B"/></linearGradient><filter id="rtyS" x="-40%" y="-40%" width="180%" height="180%"><feDropShadow dx="0" dy="10" stdDeviation="10" flood-color="#1E3A6E" flood-opacity=".14"/></filter><filter id="rtyS2" x="-60%" y="-60%" width="220%" height="220%"><feDropShadow dx="0" dy="6" stdDeviation="6" flood-color="#128A5B" flood-opacity=".35"/></filter></defs><ellipse cx="166" cy="104" rx="150" ry="96" fill="url(#rtyG)"/><ellipse cx="68" cy="178" rx="40" ry="6" fill="#EEF3FB"/><ellipse cx="168" cy="180" rx="66" ry="7" fill="#EEF3FB"/><g class="rta-twk" stroke="#8FA6CF" stroke-width="2"><path d="M96 14v10M91 19h10M300 112v10M295 117h10M44 186v8M40 190h8"/><circle cx="24" cy="96" r="3"/><circle cx="246" cy="182" r="2.5"/></g><path class="rta-star" d="M34 40q1.4 9.6 11 11-9.6 1.4-11 11-1.4-9.6-11-11 9.6-1.4 11-11z" stroke="#B08D57" stroke-width="1.6" fill="url(#rtyGold)"/><g class="rtd-tw"><path d="M292 150q.9 6 7 7-6.1.9-7 7-.9-6.1-7-7 6.1-.9 7-7z" fill="url(#rtyGold)"/><path d="M236 12q.7 4.5 5 5.2-4.3.7-5 5.2-.7-4.5-5-5.2 4.3-.7 5-5.2z" fill="url(#rtyGold)"/></g><g class="rta-dash" stroke="#8FA6CF" stroke-width="2.2" stroke-dasharray="4 6"><path d="M60 96c-6-30 18-52 50-50"/><path d="M220 46c10-16 26-22 34-20"/></g><path d="M101 41l9 5-9 5" stroke="#8FA6CF" stroke-width="2.2"/><g class="rta-env" stroke="#1E3A6E" stroke-width="2.4" filter="url(#rtyS)"><rect x="36" y="112" width="66" height="50" rx="5" fill="#D9E4F5"/><path d="M36 117l33 23 33-23"/></g><g class="rta-doc"><g stroke="#1E3A6E" stroke-width="2.4" filter="url(#rtyS)"><rect x="122" y="26" width="94" height="148" rx="10" fill="#fff"/></g><path d="M124.5 36a8 8 0 0 1 8-8h73a8 8 0 0 1 8 8v28h-89z" fill="url(#rtyHd)"/><g stroke="#1E3A6E" stroke-width="2.2"><circle cx="148" cy="50" r="11" fill="#D9E4F5"/><path d="M141 57a8 8 0 0 1 14 0" /></g><g class="rta-ln" stroke="#B4C7E6" stroke-width="3.2"><path d="M168 45h32M138 84h62M138 104h62M138 124h48"/></g><g class="rta-ln2" stroke="#DCE5F3" stroke-width="2.4"><path d="M168 54h20M138 92h44M138 112h50M138 132h30"/></g></g><g class="rta-plane" stroke="#1E3A6E" stroke-width="2.4"><path d="M250 30l46-16-20 44-8-14z" fill="#fff"/><path d="M268 44l28-30" /><path d="M268 44l-2 14 10-8"/></g><g class="rtd-seal" filter="url(#rtyS2)"><circle cx="214" cy="158" r="22" fill="url(#rtyOk)" stroke="#fff" stroke-width="4"/><path class="rtd-k" d="M204 158.5l7 7 13-14" stroke="#fff" stroke-width="3.6"/></g><circle cx="214" cy="158" r="30" stroke="#34C487" stroke-opacity=".35" stroke-width="1.5" class="rtd-ring"/></svg></span>' +
      '<p class="rty-k">' + T.k + '</p><h3 id="rty-h">' + esc(T.h) + '</h3><p class="rty-t">' + T.t + '</p>' +
      '<div class="rty-c"><a href="tel:19003339"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2"/></svg>Hotline 1900 3339</a>' +
      '<a href="mailto:ree@reeme.com.vn"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/></svg>ree@reeme.com.vn</a></div>' +
      '<button type="button" class="rty-b">' + T.b + '</button></div>';
    document.body.appendChild(w);
    var prev = document.body.style.overflow; document.body.style.overflow = 'hidden';
    function close() { w.classList.remove('on'); document.removeEventListener('keydown', onKey); document.body.style.overflow = prev; setTimeout(function () { w.remove(); }, 300); }
    function onKey(e) { if (e.key === 'Escape') close(); }
    document.addEventListener('keydown', onKey);
    w.addEventListener('click', function (e) { if (e.target === w || e.target.closest('.rty-x,.rty-b')) close(); });
    requestAnimationFrame(function () { w.classList.add('on'); var bx = w.querySelector('.rty-box'); bx.setAttribute('tabindex', '-1'); bx.style.outline = 'none'; bx.focus({ preventScroll: true }); });
  }

  window.REE_EMAIL = { build: build, subject: subject, preview: open };
  window.__reeEmailPreview = thanks;
})();
