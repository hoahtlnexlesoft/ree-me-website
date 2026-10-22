/* R.E.E M&E — customer review layer (port of the Joy comment layer, plain JS).
 * Bottom pill: Browse / Comment. In comment mode, click any element on the page
 * (also inside the embedded Careers / Services pages) to leave a note. No account: just a name.
 * Threads are shared through Supabase (table configured in review/config.js); without config they stay in this browser.
 */
(function () {
  'use strict';
  if (window.__reeReview) return; window.__reeReview = true;

  var BASE = (document.currentScript && document.currentScript.src || '').replace(/[^/]*$/, '');
  var CFG = window.REE_REVIEW || {};
  var SB_URL = CFG.url, SB_KEY = CFG.key, TABLE = CFG.table || 'ree_review_comments';
  var REMOTE = !!(SB_URL && SB_KEY);
  var KEY = 'ree-review-comments', NAME_KEY = 'ree-review-name', HIDE_KEY = 'ree-review-hidden', GOTO_KEY = 'ree-review-goto';
  var MAX_IMAGES = 3;
  var H = { apikey: SB_KEY || '', Authorization: 'Bearer ' + (SB_KEY || ''), 'Content-Type': 'application/json' };

  /* ---------- storage ---------- */
  function remoteLoad() {
    return fetch(SB_URL + '/rest/v1/' + TABLE + '?select=data&order=created_at.asc', { headers: H })
      .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then(function (rows) { return rows.map(function (x) { return x.data; }); });
  }
  function remoteUpsert(ts) {
    if (!ts.length) return Promise.resolve();
    return fetch(SB_URL + '/rest/v1/' + TABLE + '?on_conflict=id', {
      method: 'POST', headers: Object.assign({}, H, { Prefer: 'resolution=merge-duplicates,return=minimal' }),
      body: JSON.stringify(ts.map(function (t) { return { id: t.id, data: t }; }))
    });
  }
  function remoteDelete(ids) {
    return Promise.all(ids.map(function (id) {
      return fetch(SB_URL + '/rest/v1/' + TABLE + '?id=eq.' + encodeURIComponent(id), { method: 'DELETE', headers: H });
    }));
  }
  function lsGet(k, d) { try { var v = localStorage.getItem(k); return v == null ? d : v; } catch (e) { return d; } }
  function lsSet(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }

  /* ---------- helpers ---------- */
  var uid = function () { return Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-3); };
  var esc = function (s) { return String(s == null ? '' : s).normalize('NFC').replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var authorKey = function (n) { return String(n || '').normalize('NFC').trim().toLowerCase(); };
  var mine = function (a) { return !!S.name && authorKey(a) === authorKey(S.name); }; // only the author may edit their own comment/reply
  var COLORS = ['#7EE0C3', '#C6EF7C', '#A9AAF7', '#F2EC86', '#EFA6F2', '#8FD3F7', '#9BE6A6', '#F7C59A', '#7FDCE3', '#D6BCFB', '#B8F0D6', '#F5A9B8', '#B5E48C', '#99B8FF', '#FFD98A', '#88E5D0'];
  var AUTHORS = [];
  function colorFor(name) {
    var i = AUTHORS.indexOf(authorKey(name)); if (i >= 0) return COLORS[i % COLORS.length];
    var h = 0, s = authorKey(name); for (var k = 0; k < s.length; k++) h = (h * 31 + s.charCodeAt(k)) >>> 0; return COLORS[h % COLORS.length];
  }
  function ago(t) {
    var s = Math.max(1, Math.round((Date.now() - t) / 1000));
    if (s < 60) return 'Just now'; if (s < 3600) return Math.round(s / 60) + 'm ago';
    if (s < 86400) return Math.round(s / 3600) + 'h ago'; return Math.round(s / 86400) + 'd ago';
  }
  function selectorFor(el) {
    var parts = [], cur = el, doc = el.ownerDocument;
    while (cur && cur !== doc.body && cur.nodeType === 1 && parts.length < 14) {
      if (cur.id && !/^(radix|headlessui|:r)/.test(cur.id)) { parts.unshift('#' + CSS.escape(cur.id)); break; }
      var p = cur.parentElement; if (!p) break;
      var tag = cur.tagName.toLowerCase(), same = [];
      for (var i = 0; i < p.children.length; i++) if (p.children[i].tagName === cur.tagName) same.push(p.children[i]);
      parts.unshift(same.length > 1 ? tag + ':nth-of-type(' + (same.indexOf(cur) + 1) + ')' : tag);
      cur = p;
    }
    return parts.join(' > ');
  }
  function compressImage(file) {
    return new Promise(function (res, rej) {
      var url = URL.createObjectURL(file), img = new Image();
      img.onload = function () {
        var k = Math.min(1, 1280 / Math.max(img.width, img.height)), c = document.createElement('canvas');
        c.width = Math.max(1, Math.round(img.width * k)); c.height = Math.max(1, Math.round(img.height * k));
        var g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height); g.drawImage(img, 0, 0, c.width, c.height);
        URL.revokeObjectURL(url); res(c.toDataURL('image/jpeg', 0.78));
      };
      img.onerror = function () { URL.revokeObjectURL(url); rej(new Error('image')); };
      img.src = url;
    });
  }

  /* ---------- where are we? (top page or the embedded careers/services page) ---------- */
  var CAREER_ROUTE = { 'index.html': '/tuyen-dung', 'jobs.html': '/tuyen-dung/vi-tri', 'services.html': '/dich-vu' };
  function topRoute() { var h = (location.hash || '').replace(/^#/, '').split('?')[0].replace(/\/+$/, ''); return h || '/'; }
  function frameEl() { var f = document.querySelector('iframe.ree-careers-frame'); try { return f && f.contentDocument && f.contentDocument.body ? f : null; } catch (e) { return null; } }
  function ctx() {
    var f = frameEl();
    if (f) {
      var w = f.contentWindow, file = (w.location.pathname.split('/').pop() || 'index.html');
      return { doc: f.contentDocument, win: w, frame: f, key: 'careers/' + file + (file === 'job.html' ? w.location.hash : '') };
    }
    return { doc: document, win: window, frame: null, key: 'site:' + topRoute() };
  }
  var PAGE_NAMES = { '/': 'Trang chủ', '/ve-chung-toi': 'Về chúng tôi', '/linh-vuc-thi-cong': 'Lĩnh vực thi công', '/dich-vu': 'Dịch vụ', '/cong-trinh': 'Công trình', '/du-an': 'Dự án', '/phat-trien-ben-vung': 'Phát triển bền vững', '/tin-tuc': 'Tin tức', '/tuyen-dung': 'Tuyển dụng', '/tuyen-dung/vi-tri': 'Tuyển dụng › Vị trí', '/lien-he': 'Liên hệ', '/ho-so-nang-luc': 'Hồ sơ năng lực' };
  function humanSlug(x) { x = decodeURIComponent(String(x || '')).replace(/[-_]+/g, ' ').trim(); return x ? x.charAt(0).toUpperCase() + x.slice(1) : ''; }
  function labelFor(key) {
    key = String(key || '');
    if (key.indexOf('careers/') === 0) {
      var f = key.slice(8);
      if (f === 'index.html') return 'Tuyển dụng'; if (f === 'jobs.html') return 'Tuyển dụng › Vị trí';
      if (f === 'services.html') return 'Dịch vụ'; if (f.indexOf('job.html') === 0) return 'Tuyển dụng › ' + (humanSlug(f.slice(9)) || 'Chi tiết');
      return f;
    }
    var r = key.slice(5).split('?')[0].replace(/\/+$/, '') || '/';
    if (PAGE_NAMES[r]) return PAGE_NAMES[r];
    var seg = r.split('/').filter(Boolean), base = '/' + seg[0];
    return (PAGE_NAMES[base] || humanSlug(seg[0])) + (seg.length > 1 ? ' › ' + humanSlug(seg.slice(1).join(' ')) : '');
  }

  /* ---------- state ---------- */
  var S = { tedit: null, teditText: '', hidden: lsGet(HIDE_KEY, '') === '1', q: '', pmenu: null, expanded: {}, fold: (function () { try { return JSON.parse(lsGet('rv_fold', '{}')) || {}; } catch (e) { return {}; } })(), pop: null, popMenu: false, popEmoji: false, popReply: '', editWhere: 'panel', menu: null, editing: null, editText: '', threads: [], name: lsGet(NAME_KEY, ''), mode: false, open: false, draft: null, draftText: '', draftImages: [], nameInput: '',
            active: null, flash: null, filter: 'all', replyFor: null, replyText: '', copied: false, copiedId: null, lightbox: null };
  var pending = 0, writes = 0, lastSend = '', lastPull = 0;

  function nfcT(t) { var o = Object.assign({}, t); if (o.text) o.text = String(o.text).normalize('NFC'); if (o.author) o.author = String(o.author).normalize('NFC'); if (o.replies) o.replies = o.replies.map(function (r) { return Object.assign({}, r, { text: String(r.text || '').normalize('NFC'), author: String(r.author || '').normalize('NFC') }); }); return o; }
  function save(next) {
    next = next.map(nfcT);
    var prev = S.threads; writes++; S.threads = next; renderAll();
    if (!REMOTE) { lsSet(KEY, JSON.stringify(next)); return; }
    var pm = {}; prev.forEach(function (t) { pm[t.id] = JSON.stringify(t); });
    var changed = next.filter(function (t) { return pm[t.id] !== JSON.stringify(t); });
    var gone = prev.filter(function (t) { return !next.some(function (n) { return n.id === t.id; }); }).map(function (t) { return t.id; });
    pending++;
    Promise.all([remoteUpsert(changed), remoteDelete(gone)]).catch(function () { toast('Could not save. Please check your connection.'); })
      .then(function () { pending--; });
  }
  function saveAll(next) { save(next); }
  function pull() {
    if (!REMOTE || pending > 0 || (document.hidden && Date.now() - lastPull < 30000)) return;
    lastPull = Date.now(); var w = writes;
    remoteLoad().then(function (rows) {
      if (!LOADED) { LOADED = true; if (JSON.stringify(rows) === JSON.stringify(S.threads)) renderAll(); }
      if (pending === 0 && writes === w && JSON.stringify(rows) !== JSON.stringify(S.threads)) { S.threads = rows; renderAll(); }
    }).catch(function () {});
  }

  /* ---------- styles ---------- */
  var css = '' +
  '.rv-seg button{white-space:nowrap}@media (max-width:440px){.rv .rv-seg button{padding:0 9px;gap:5px;font-size:12px}.rv .rv-seg button.rv-bell{padding:0 8px}.rv .rv-pill{left:calc(50% - 36px)}}' +
  '.rv-seg button.rv-bell{position:relative;padding:0 12px}.rv-bell b{position:absolute;top:2px;right:2px;min-width:17px;height:17px;padding:0 4px;border-radius:999px;background:#e5484d;color:#fff;font-size:10.5px;font-weight:700;line-height:17px;text-align:center;box-shadow:0 0 0 2px #223246}' +
  '.rv-inbox{position:fixed;left:50%;bottom:74px;transform:translateX(-50%);z-index:2147482700;width:min(360px,calc(100vw - 24px));max-height:min(420px,60vh);overflow:auto;padding:6px;border-radius:14px;background:#fff;box-shadow:0 18px 40px -10px rgba(15,23,42,.35),0 0 0 1px rgba(15,23,42,.06)}' +
  '.rv-inbox h3{margin:0;padding:8px 10px 6px;font-size:13px;font-weight:700;color:#0f172a;display:flex;align-items:center;justify-content:space-between}.rv-inbox h3 button{font-size:12px;font-weight:600;color:#306eed}' +
  '.rv-inbox .rv-ni{width:100%;display:flex;gap:10px;align-items:flex-start;padding:9px 10px;border-radius:10px;text-align:left;color:#0f172a}.rv-inbox .rv-ni:hover{background:#f1f5f9}.rv-inbox .rv-ni.seen{opacity:.6}' +
  '.rv-ni .rv-av{flex:none}.rv-ni-b{min-width:0;flex:1;font-size:13px;line-height:1.4}.rv-ni-b small{display:block;color:#64748b;font-size:11.5px;margin-top:2px}.rv-ni-t{display:block;color:#334155;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.rv-ni i{flex:none;width:8px;height:8px;margin-top:6px;border-radius:50%;background:#306eed}' +
  '.rv-inbox p{margin:0;padding:18px 10px;text-align:center;font-size:13px;color:#64748b}' +
  '.rv-new{display:inline-block;margin:4px 0 0 40px;padding:2px 8px;border-radius:999px;background:#e5484d;color:#fff;font-size:11px;font-weight:700}' +
  '.rv-toast.rv-nt{cursor:pointer;display:flex;align-items:center;gap:8px;max-width:min(440px,calc(100vw - 24px));border-radius:14px;padding:10px 14px;line-height:1.35;box-shadow:0 14px 30px -10px rgba(0,0,0,.5)}.rv-nt svg{width:16px;height:16px;flex:none;color:#fbbf24}.rv-nt span{overflow:hidden;text-overflow:ellipsis;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical}' +
  '.rv,.rv *{box-sizing:border-box;font-family:"Plus Jakarta Sans",-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Arial,"Noto Sans",sans-serif;-webkit-font-smoothing:antialiased;font-feature-settings:normal;text-transform:none;letter-spacing:normal}' +
  ':where(.rv) button{font:inherit;cursor:pointer;border:0;background:none;color:inherit;margin:0;padding:0;line-height:1}' +
  '.rv-layer{position:fixed;inset:0;pointer-events:none;z-index:2147482000}' +
  '.rv-pin{pointer-events:auto;position:absolute;width:30px;height:30px;transform:translate(-50%,-100%);border-radius:50% 50% 50% 0;color:#fff;font-size:12px;font-weight:700;display:grid;place-items:center;box-shadow:0 6px 16px rgba(0,0,0,.28);outline:2px solid #fff;transition:transform .15s}' +
  '.rv-pin:hover{transform:translate(-50%,-100%) scale(1.12)}.rv-pin.on{transform:translate(-50%,-100%) scale(1.25)}' +
  '.rv-pin.flash::after{content:"";position:absolute;inset:-6px;border-radius:50%;border:3px solid currentColor;animation:rvping 1s ease-out infinite;opacity:.7}' +
  '@keyframes rvping{to{transform:scale(1.8);opacity:0}}' +
  '.rv-draft{pointer-events:auto;position:absolute;width:300px;max-width:calc(100vw - 24px);background:#fff;border-radius:16px;padding:12px;box-shadow:0 24px 60px -12px rgba(10,30,80,.45);outline:1px solid #c7d2fe;color:#0f172a}' +
  '.rv-lab{display:block;margin:0 0 4px 2px;font-size:11px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;color:#64748b}.rv-in{width:100%;border:1px solid #c7d2fe;border-radius:10px;padding:8px 10px;font-size:13.5px;outline:none;color:#0f172a;background:#fff}.rv-in:focus{border-color:#4f46e5}' +
  'textarea.rv-in{resize:none;min-height:76px;display:block}' +
  '.rv-row{display:flex;align-items:center;gap:6px;margin-top:8px}' +
  '.rv-btn{height:32px;padding:0 14px;border-radius:999px;font-size:12.5px;font-weight:700;white-space:nowrap;flex:none;display:inline-flex;align-items:center;justify-content:center}.rv-btn svg{flex:none;display:block}' +
  '.rv-btn.pri{background:#0b3f8f;color:#fff}.rv-btn.pri:disabled{opacity:.4;cursor:default}.rv-btn.ghost{color:#64748b}.rv-btn.ghost:hover{background:#f1f5f9}' +
  '.rv-btn.img{color:#0b3f8f;margin-right:auto;display:inline-flex;align-items:center;gap:6px}.rv-btn.img:hover{background:#eef2ff}' +
  '.rv-thumbs{display:flex;gap:6px;margin-top:8px}.rv-thumb{position:relative;width:60px;height:60px;border-radius:8px;overflow:hidden;outline:1px solid #c7d2fe}.rv-thumb img{width:100%;height:100%;object-fit:cover}' +
  '.rv-thumb button{position:absolute;top:2px;right:2px;width:18px;height:18px;border-radius:50%;background:rgba(15,23,42,.75);color:#fff;font-size:12px;line-height:18px}' +
  '.rv-pill{position:fixed;left:50%;bottom:16px;transform:translateX(-50%);z-index:2147482600;display:flex;flex-direction:column;align-items:center;gap:8px}' +
  '.rv-hint{white-space:nowrap;background:rgba(15,23,42,.9);color:#fff;font-size:12px;font-weight:600;padding:6px 12px;border-radius:999px}' +
  '.rv-seg{display:flex;gap:4px;padding:5px;border-radius:999px;background:#223246;box-shadow:0 14px 34px -10px rgba(0,0,0,.55);outline:1px solid rgba(255,255,255,.08)}' +
  '.rv-seg button{height:40px;padding:0 18px;border-radius:999px;color:#e2e8f0;font-size:15px;font-weight:600;display:inline-flex;align-items:center;gap:9px;transition:background .2s,color .2s}.rv-seg button:hover{color:#fff}' +
  '.rv-seg button.on{background:#306eed;color:#fff;box-shadow:0 6px 16px -6px rgba(48,110,237,.8)}.rv-seg svg{width:18px;height:18px}' +
  '.rv-rail{position:fixed;top:0;right:0;bottom:0;z-index:2147482650;width:54px;background:#f5f5f5;border-left:1px solid #e0e0e0;border-radius:0 0 0 16px;display:flex;flex-direction:column;align-items:center;padding-top:30px;box-shadow:-10px 0 30px -18px rgba(0,0,0,.3)}' +
  '.rv-rail .rv-side{width:30px;height:30px;border-radius:8px;display:grid;place-items:center;color:#334155}.rv-rail .rv-side:hover{background:rgba(0,0,0,.06)}' +
  '.rv-rail-list{flex:1;width:100%;overflow-y:auto;scrollbar-width:none;display:flex;flex-direction:column;align-items:center;gap:10px;padding:18px 0 90px}.rv-rail-list::-webkit-scrollbar{display:none}' +
  '.rv-dot{flex:none;width:22px;height:22px;border-radius:50%;color:#fff;font-size:11px;font-weight:800;display:grid;place-items:center;text-transform:uppercase;transition:transform .15s,box-shadow .15s}' +
  '.rv-dot:hover{transform:scale(1.15)}.rv-dot.on{box-shadow:0 0 0 3px #fff,0 0 0 5px currentColor}.rv-dot.done{opacity:.45}' +
  '.rv-panel{position:fixed;top:0;right:0;bottom:0;z-index:2147482650;width:370px;max-width:100vw;background:#f3f4f6;color:#0f172a;display:flex;flex-direction:column;box-shadow:-20px 0 50px -20px rgba(0,0,0,.35)}' +
  '.rv-head{display:flex;align-items:center;justify-content:space-between;padding:18px 18px 8px}.rv-head h2{margin:0;font-size:15px;font-weight:800}.rv-head>div{display:flex;align-items:center;gap:4px}' +
  '.rv-head .rv-btn{display:inline-flex;align-items:center;gap:6px;color:#475569}.rv-head .rv-btn:hover{background:rgba(0,0,0,.05)}' +
  '.rv-filters{display:inline-flex;gap:4px;margin:0 18px 8px;padding:4px;border-radius:999px;background:rgba(0,0,0,.06);font-size:12px;font-weight:700;align-self:flex-start}' +
  '.rv-filters button{padding:4px 12px;border-radius:999px;color:#64748b}.rv-filters button.on{background:#fff;color:#0b3f8f;box-shadow:0 1px 2px rgba(0,0,0,.08)}' +
  '.rv-list{flex:1;overflow-y:auto;padding-bottom:96px}.rv-empty{padding:40px 22px;text-align:center;color:#94a3b8;font-size:13.5px}' +
  '.rv-item{position:relative;padding:12px 18px;font-size:13.5px}.rv-item:hover{background:rgba(255,255,255,.6)}.rv-item.on{background:#fff}.rv-item.done:not(.on){opacity:.6}' +
  '.rv-main{display:flex;gap:10px;width:100%;text-align:left;padding-right:30px}' +
  '.rv-av{flex:none;width:30px;height:30px;border-radius:50%;color:#fff;font-size:12px;font-weight:800;display:grid;place-items:center;text-transform:uppercase}' +
  '.rv-meta{display:flex;align-items:baseline;gap:6px;flex-wrap:wrap}.rv-meta b{font-weight:800}.rv-meta span{font-size:11.5px;color:#94a3b8}' +
  '.rv-ok{display:inline-flex;align-items:center;gap:3px;font-size:10.5px;font-weight:800;color:#6B7280;background:#F3F4F6;border-radius:999px;padding:0 7px}' +
  '.rv-text{display:block;margin-top:2px;color:#334155;white-space:pre-wrap;word-break:break-word}.rv-item:not(.on) .rv-text{display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}' +
  '.rv-where{display:block;margin-top:3px;font-size:11px;color:#94a3b8}' +
  '.rv-imgs{display:flex;gap:6px;margin-top:6px}.rv-imgs img{width:48px;height:48px;border-radius:8px;object-fit:cover;outline:1px solid rgba(0,0,0,.1);cursor:zoom-in}.rv-item.on .rv-imgs img{width:96px;height:96px}' +
  '.rv-copy1{position:absolute;right:12px;top:12px;width:28px;height:28px;border-radius:50%;background:rgba(255,255,255,.85);color:#64748b;display:grid;place-items:center;box-shadow:0 1px 3px rgba(0,0,0,.12)}.rv-copy1:hover{color:#0b3f8f}' +
  '.rv-copy1 svg,.rv-act svg{width:14px;height:14px}' +
  '.rv-more{position:absolute;right:12px;top:10px;z-index:2;width:30px;height:30px;border-radius:8px;display:grid;place-items:center;color:#475569}.rv-more:hover,.rv-more.on{background:#e5e7eb;color:#0f172a}.rv-more svg{width:16px;height:16px}' +
  '.rv-menu{position:absolute;right:12px;top:44px;z-index:5;min-width:150px;padding:6px;border-radius:12px;background:#fff;box-shadow:0 12px 32px -8px rgba(15,23,42,.28),0 0 0 1px rgba(15,23,42,.06)}' +
  '.rv-menu button{width:100%;height:36px;padding:0 10px;border-radius:8px;display:flex;align-items:center;gap:10px;font-size:14px;font-weight:500;color:#0f172a;text-align:left}.rv-menu button:hover{background:#f1f5f9}' +
  '.rv-menu button svg{width:16px;height:16px;flex:none}.rv-menu button.danger{color:#be123c}.rv-menu button.danger:hover{background:#fff1f2}' +
  '.rv-edit{margin:8px 0 0 40px}.rv-edit textarea{min-height:64px}' +
  '.rv-row2-m span.rv-no{flex:none;font-size:11.5px;font-weight:700;color:#334155;background:#e2e8f0;border-radius:6px;padding:0 6px;line-height:19px;font-variant-numeric:tabular-nums}' +
  '.rv-gh .rv-gc{font-style:normal;margin-left:8px;font-size:11px;font-weight:700;color:#64748b;background:#e5e7eb;border-radius:999px;padding:1px 7px}' +
  '.rv-row2{position:relative;margin:2px 8px;border-radius:12px}.rv-row2:hover,.rv-row2.on,.rv-row2.menu{background:#e9eaec}.rv-row2.done .rv-row2-main{opacity:.55}' +
  '.rv-row2-main{display:flex;gap:12px;width:100%;padding:14px 44px 14px 12px;text-align:left;align-items:flex-start}.rv-row2-main .rv-av{width:24px;height:24px;font-size:11px;margin-top:1px}' +
  '.rv-row2-b{min-width:0;flex:1}.rv-row2-m{display:flex;align-items:baseline;gap:6px;white-space:nowrap;overflow:hidden;line-height:1.6;padding-top:2px}.rv-row2-m b{font-size:14px;font-weight:700;color:#0f172a;overflow:hidden;text-overflow:ellipsis}.rv-row2-m span{font-size:13px;color:#64748b;flex:none}' +
  '.rv-row2-m .rv-ok{padding:0 5px}.rv-nr{margin-left:auto;font-size:11.5px!important;color:#64748b}' +
  '.rv-row2-t{display:block;margin-top:3px;padding-top:3px;font-size:14px;line-height:1.6;color:#334155;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}' +
  '.rv-row2 .rv-more{top:10px;right:8px;opacity:0}.rv-row2:hover .rv-more,.rv-row2.on .rv-more,.rv-row2 .rv-more.on{opacity:1}' +
  '.rv-row2 .rv-menu{top:42px;right:8px}' +
  '.rv-pop-c+.rv-pop-c{border-top:1px solid #e5e7eb;padding-top:12px}' +
  '.rv-pop-shot{object-fit:contain!important;background:#e5e7eb}' +
  '.rv-emo{display:flex;gap:4px;margin:2px 0 6px}.rv-emo button{width:30px;height:30px;border-radius:8px;font-size:17px;line-height:30px}.rv-emo button:hover{background:#eef2f7}' +
  '.rv-panel .rv-head{padding:16px 16px 6px}.rv-panel .rv-head h2{font-size:15px}' +
  '.rv-tools{position:relative;display:flex;align-items:center;gap:6px;padding:4px 12px 10px 16px}' +
  '.rv-search{flex:1;min-width:0;height:34px;display:flex;align-items:center;gap:8px;padding:0 12px;border:1px solid #d6d9de;border-radius:999px;background:#fff;color:#64748b}.rv-search:focus-within{border-color:#94a3b8}' +
  '.rv-search svg{width:16px;height:16px;flex:none}.rv-search input{flex:1;min-width:0;border:0;outline:0;background:transparent;font-size:13.5px;color:#0f172a}' +
  '.rv-ib{width:30px;height:30px;border-radius:8px;display:grid;place-items:center;color:#334155;flex:none}.rv-ib:hover,.rv-ib.on{background:#e5e7eb;color:#0f172a}.rv-ib svg{width:17px;height:17px}.rv-ib.sm{width:26px;height:26px}.rv-ib.sm svg{width:15px;height:15px}' +
  '.rv-pm{top:42px;right:12px;min-width:190px}.rv-pm .rv-sp{display:inline-block;width:16px}' +
  '.rv-gh{display:flex;align-items:center;gap:8px;width:100%;border:0;background:none;font-family:inherit;text-align:left;cursor:pointer;padding:12px 16px 4px;font-size:12px;font-weight:700;color:#475569;transition:color .15s}.rv-gh:hover{color:#0f172a}.rv-gh:focus-visible{outline:2px solid #4f46e5;outline-offset:-2px;border-radius:6px}' +
  '.rv-gchev{display:grid;place-items:center;width:18px;height:18px;border-radius:5px;flex:none;color:#64748b;transition:transform .2s,background .15s}.rv-gchev svg{width:11px;height:11px;transform:rotate(-90deg)}.rv-gh:hover .rv-gchev{background:#eef0f4;color:#0f172a}.rv-gh.fd .rv-gchev{transform:rotate(-90deg)}.rv-gh.fd{padding-bottom:10px}.rv-gh .rv-gc{margin-left:0}' +
  '.rv-pm #rvFoldAll svg{transform:rotate(90deg)}.rv-pm #rvUnfoldAll svg{transform:rotate(-90deg)}' +
  '.rv-gh::after{content:"";flex:1;height:1px;background:#e2e5ea}' +
  '.rv-row2{margin:1px 8px;border-radius:10px}.rv-row2-main{gap:10px;padding:9px 12px 6px 10px}.rv-row2-m{padding-right:52px}.rv-row2-main .rv-av{width:22px;height:22px;font-size:10.5px}' +
  '.rv-row2-m{gap:5px;padding-top:1px;line-height:1.5}.rv-row2-m b{font-size:13px;max-width:130px}.rv-row2-m .rv-ago{font-size:12px;color:#64748b}' +
  '.rv-unread{width:6px;height:6px;border-radius:50%;background:#e5484d;flex:none;align-self:center;margin-left:2px}' +
  '.rv-row2-t{margin-top:1px;padding-top:2px;font-size:13px;line-height:1.55;color:#334155;white-space:normal;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden}.rv-row2-t.ex{display:block;-webkit-line-clamp:unset}' +
  '.rv-sm,.rv-nr{display:block;margin:0 0 4px 42px;font-size:12px;font-weight:500;color:#64748b}.rv-sm:hover,.rv-nr:hover{color:#0f172a}.rv-nr{color:#94a3b8}' +
  '.rv-row2:last-child{margin-bottom:4px}.rv-row2>*:last-child{}' +
  '.rv-row2-acts{position:absolute;top:6px;right:6px;display:flex;gap:2px;opacity:0}.rv-row2:hover .rv-row2-acts,.rv-row2.on .rv-row2-acts,.rv-row2.menu .rv-row2-acts{opacity:1}' +
  '.rv-row2 .rv-menu{top:36px;right:6px;min-width:170px}' +
  '.rv-popwrap .rv-pop{position:fixed;z-index:2147482660;width:320px;max-width:calc(100vw - 24px);max-height:min(560px,calc(100vh - 24px));display:flex;flex-direction:column;background:#fff;color:#0f172a;border-radius:18px;box-shadow:0 24px 60px -14px rgba(10,25,60,.45),0 0 0 1px rgba(15,23,42,.06)}' +
  '.rv-pop-h{position:relative;flex:none;display:flex;align-items:center;gap:6px;padding:14px 12px 8px 18px}.rv-pop-h>b{font-size:15px;font-weight:700}' +
  '.rv-pop-tools{margin-left:auto;display:flex;gap:2px}.rv-pop-tools button{width:30px;height:30px;border-radius:8px;display:grid;place-items:center;color:#334155}.rv-pop-tools button:hover,.rv-pop-tools button.on{background:#f1f5f9;color:#0f172a}.rv-pop-tools svg{width:17px;height:17px}' +
  '.rv-pop-h .rv-menu{top:44px;right:10px}.rv-pop-ttl{display:flex;flex-direction:column;align-items:flex-start;gap:4px;min-width:0;flex:1 1 auto}.rv-pop-ttl>b{font-size:15px;font-weight:700;white-space:nowrap}.rv-pop-pg{display:inline-flex;align-items:center;gap:4px;max-width:100%;font-size:11px;font-weight:600;line-height:1;color:#1e3a8a;background:#eef2ff;border-radius:999px;padding:4px 8px 4px 6px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.rv-pop-pg svg{flex:none}.rv-fseg{display:flex;gap:2px;margin:2px 16px 8px;padding:3px;border-radius:10px;background:#f1f5f9}.rv-fseg-b{flex:1 1 0;display:inline-flex;align-items:center;justify-content:center;gap:6px;height:30px;border-radius:8px;font-size:12px;font-weight:600;color:#64748b;white-space:nowrap;transition:background .2s,color .2s,box-shadow .2s}.rv-fseg-b:hover{color:#0f172a}.rv-fseg-b.on{background:#fff;color:#0f172a;box-shadow:0 1px 2px rgba(15,23,42,.08),0 1px 6px rgba(15,23,42,.06)}.rv-fseg-b b{min-width:20px;height:18px;padding:0 6px;border-radius:999px;display:inline-grid;place-items:center;font-size:11px;font-weight:700;background:#e2e8f0;color:#475569;font-variant-numeric:tabular-nums}.rv-fseg-b.on b{background:#1e3a8a;color:#fff}.rv-fseg-b.hot b{background:#e5484d;color:#fff}.rv-nextopen{display:flex;align-items:center;justify-content:space-between;width:calc(100% - 32px);margin:0 16px 8px;padding:7px 10px;border-radius:8px;background:#fef2f2;color:#b42318;font-size:12px;font-weight:600}.rv-nextopen:hover{background:#fee2e2}.rv-nextopen span{font-size:14px}' +
  '.rv-pop-body{flex:1;min-height:0;overflow-y:auto;padding:4px 18px 6px}' +
  '.rv-pop-shot{display:block;width:100%;aspect-ratio:2/1;object-fit:cover;border-radius:12px;margin:2px 0 14px;outline:1px solid rgba(15,23,42,.08);cursor:zoom-in}' +
  '.rv-pop-c{display:flex;gap:10px;margin-bottom:12px}.rv-pop-c .rv-av{font-size:12px}.rv-pop-cb{min-width:0;flex:1}' +
  '.rv-rep-ed{margin-left:auto;width:24px;height:24px;border-radius:7px;display:grid;place-items:center;color:#94a3b8;opacity:0;transition:opacity .15s,background .15s}.rv-pop-c:hover .rv-rep-ed,.rv-rep-ed:focus-visible{opacity:1}.rv-rep-ed:hover{background:#eef1f6;color:#0f172a}.rv-rep-ed svg{width:14px;height:14px}@media (hover:none){.rv-rep-ed{opacity:1}}' +
  '.rv-pop-meta{display:flex;align-items:baseline;gap:8px}.rv-pop-meta b{font-size:14px;font-weight:700}.rv-pop-meta span{font-size:12px;color:#94a3b8}' +
  '.rv-pop-cb p{margin:3px 0 0;font-size:14px;line-height:1.45;color:#1e293b;white-space:pre-wrap;word-break:break-word}' +
  '.rv-pop-f{flex:none;display:flex;gap:10px;align-items:flex-start;padding:8px 14px 14px 18px}' +
  '.rv-pop-box{flex:1;min-width:0;border:1px solid #e2e8f0;border-radius:14px;background:#f8fafc;padding:8px 8px 6px 12px}.rv-pop-box:focus-within{border-color:#94a3b8;background:#fff}' +
  '.rv-pop-in{display:block;width:100%;border:0;outline:none;background:transparent;resize:none;font-size:14px;line-height:1.4;color:#0f172a;padding:2px 0 6px}.rv-pop-in::placeholder{color:#94a3b8}#rvPopName{border-bottom:1px dashed #e2e8f0;margin-bottom:6px}' +
  '.rv-pop-tb{display:flex;align-items:center;justify-content:space-between}' +
  '.rv-pop-emo{width:30px;height:30px;border-radius:8px;display:grid;place-items:center;color:#334155}.rv-pop-emo:hover,.rv-pop-emo.on{background:#eef2f7}.rv-pop-emo svg{width:18px;height:18px}' +
  '.rv-pop-send{width:30px;height:30px;border-radius:50%;display:grid;place-items:center;background:#475569;color:#fff}.rv-pop-send:disabled{background:#94a3b8;cursor:default}.rv-pop-send:not(:disabled):hover{background:#0f172a}.rv-pop-send svg{width:16px;height:16px}' +
  '.rv-item{border-radius:12px;margin:2px 8px;padding:12px 12px}.rv-item.on{background:#e9eaec}.rv-meta b{color:#0f172a}' +
  '.rv-sub{margin-left:40px}' +
  '.rv-reacts{display:flex;gap:6px;margin-top:6px}.rv-react svg{width:14px;height:14px;flex:none;display:block}.rv-react{height:28px;min-width:34px;justify-content:center;padding:0 9px;border-radius:999px;background:#fff;color:#64748b;font-size:12px;font-weight:700;display:inline-flex;align-items:center;gap:4px;outline:1px solid #e2e8f0}' +
  '.rv-react:disabled{opacity:.55;cursor:not-allowed}.rv-react.on{background:#e0f2fe;color:#0369a1;outline-color:#7dd3fc}' +
  '.rv-reply{margin-top:8px;border-left:2px solid;padding-left:8px;font-size:12.5px;color:#475569;word-break:break-word}' +
  '.rv-acts{display:flex;align-items:center;gap:4px;margin-top:8px;font-size:12px;font-weight:700;color:#64748b}' +
  '.rv-acts .lk{padding:4px 10px;border-radius:999px}.rv-acts .lk:hover,.rv-acts .lk.on{background:#fff;color:#0b3f8f}' +
  '.rv-act{width:28px;height:28px;border-radius:50%;display:grid;place-items:center}.rv-act.ok{background:#ecfdf5;color:#059669}.rv-act.del{background:#fff1f2;color:#e11d48}' +
  '.rv-replyin{margin-top:8px;height:32px;border-radius:999px;font-size:12.5px}' +
  '.rv-lb{position:fixed;inset:0;z-index:2147483000;background:rgba(0,0,0,.82);display:grid;place-items:center;padding:16px;cursor:zoom-out}.rv-lb img{max-width:100%;max-height:100%;border-radius:12px}' +
  '.rv-toast{position:fixed;left:50%;bottom:84px;transform:translateX(-50%);z-index:2147483000;background:#0f172a;color:#fff;font-size:12.5px;font-weight:600;padding:8px 14px;border-radius:999px}' +
  '.rv-pop{position:fixed}.rv-pop-tools{gap:2px}.rv-pop-tools button.del{color:#e5484d}.rv-pop-tools button.del:hover{background:#fff1f2;color:#be123c}.rv-pop-tools button.ok{color:#10b981}.rv-pop-tools button.ok:hover{color:#059669;background:#ecfdf5}' +
  '.rv-pop-shot{border-radius:14px;outline:1px solid #e5e7eb}' +
  '.rv-pop-f{align-items:flex-start}.rv-pop-f>.rv-av{margin-top:6px}' +
  '.rv-pop-box{padding:0;border-radius:16px;background:#fafafa;border-color:#e5e7eb;overflow:hidden}.rv-pop-box:focus-within{background:#fff}' +
  '.rv-pop-box .rv-pop-in{padding:10px 14px}#rvPopName{margin:0;border-bottom:1px solid #e5e7eb}' +
  '.rv-pop-tb{border-top:1px solid #e5e7eb;padding:6px 6px 6px 8px}.rv-pop-send{width:34px;height:34px;background:#8b8b8b}.rv-pop-send:disabled{background:#a3a3a3}' +
  '.rv-emo{position:absolute;left:18px;right:18px;bottom:64px;z-index:6;display:grid;grid-template-columns:repeat(8,1fr);gap:2px;margin:0;padding:8px;background:#fff;border-radius:14px;box-shadow:0 14px 36px -10px rgba(15,23,42,.35),0 0 0 1px rgba(15,23,42,.08)}' +
  '.rv-emo button{width:auto;height:auto;aspect-ratio:1;font-size:20px;line-height:1;border-radius:8px;display:grid;place-items:center}.rv-emo button:hover,.rv-emo button:focus-visible{background:#f1f5f9;outline:2px solid #306eed;outline-offset:-2px}' +
  '.rv-ok{white-space:nowrap;flex:none;line-height:1}.rv-pop-h .rv-ok{height:22px;padding:0 7px;font-size:11px;gap:3px}.rv-pop-h>b{flex:none;white-space:nowrap}.rv-ok i{font-style:normal}.rv-pop-tools{flex:none}' +
  '@media (max-width:640px){.rv-pop-h .rv-ok{padding:0 6px}.rv-pop-h .rv-ok i{display:none}}' +
  '.rv-tbox{width:260px}.rv-tbox textarea.rv-in{min-height:64px;font-size:14px;line-height:1.45}.rv-was{margin-top:6px;font-size:11.5px;color:#64748b;line-height:1.4;max-height:54px;overflow:auto}' +
  '.rv-off .rv-layer,.rv-off .rv-popwrap,.rv-off .rv-dev{display:none!important}' +
  '.rv-show{position:fixed;right:0;top:50%;transform:translateY(-50%);z-index:2147482650;width:34px;height:40px;padding-left:2px;border-radius:10px 0 0 10px;background:rgba(255,255,255,.92);color:#334155;border:1px solid #e0e0e0;border-right:0;box-shadow:-4px 4px 16px rgba(0,0,0,.14);display:grid;place-items:center;opacity:.7;transition:opacity .2s,width .2s}.rv-show:hover{opacity:1;width:40px}.rv-show svg{width:17px;height:17px}' +
  '.rv-show span{position:absolute;top:-6px;left:-6px;min-width:16px;height:16px;padding:0 4px;border-radius:999px;background:#e5484d;color:#fff;font-size:10px;font-weight:700;line-height:16px;text-align:center}' +
  '.rv-rail #rvHide{margin-top:6px}.rv-panel .rv-head{padding-right:12px}.rv-head>div{gap:2px}' +
  '@media (max-width:1024px){' +
    '.rv-seg{padding:4px;gap:3px}.rv-seg button{height:34px;padding:0 14px;font-size:13px;gap:7px}.rv-seg svg{width:16px;height:16px}.rv-pill{bottom:12px;gap:6px}.rv-hint{font-size:11px;padding:5px 10px}' +
    '.rv-pin{width:26px;height:26px;font-size:11px}' +
    '.rv-draft{width:270px;padding:10px;border-radius:14px}.rv-in{font-size:13px;padding:7px 9px}textarea.rv-in{min-height:60px}.rv-btn{height:30px;padding:0 12px;font-size:12px}.rv-row{margin-top:6px}' +
    '.rv-panel{width:320px}.rv-panel .rv-head{padding:12px 12px 4px}.rv-panel .rv-head h2{font-size:14px}' +
    '.rv-tools{padding:2px 8px 8px 12px;gap:4px}.rv-search{height:30px;padding:0 10px;gap:6px}.rv-search svg{width:14px;height:14px}.rv-search input{font-size:12.5px}.rv-ib{width:28px;height:28px}.rv-ib svg{width:15px;height:15px}' +
    '.rv-gh{padding:8px 12px 2px;font-size:11px}' +
    '.rv-row2{margin:1px 6px}.rv-row2-main{gap:8px;padding:7px 10px 4px 8px}.rv-row2-main .rv-av{width:20px;height:20px;font-size:9.5px}.rv-row2-m b{font-size:12.5px}.rv-row2-m .rv-ago{font-size:11px}.rv-row2-t{font-size:12.5px;line-height:1.5}' +
    '.rv-sm,.rv-nr{margin:0 0 3px 36px;font-size:11px}.rv-row2-acts{top:4px;right:4px}.rv-row2 .rv-menu{top:32px}' +
    '.rv-menu{min-width:140px;padding:4px;border-radius:10px}.rv-menu button{height:32px;font-size:13px;gap:8px;padding:0 8px}.rv-menu button svg{width:14px;height:14px}' +
    '.rv-popwrap .rv-pop{width:290px;border-radius:14px}.rv-pop-h{padding:10px 8px 6px 14px}.rv-pop-h>b{font-size:14px}.rv-pop-tools button{width:28px;height:28px}.rv-pop-tools svg{width:15px;height:15px}.rv-pop-h .rv-menu{top:38px}' +
    '.rv-pop-body{padding:2px 14px 4px}.rv-pop-shot{margin:0 0 10px;border-radius:10px}.rv-pop-c{gap:8px;margin-bottom:10px}.rv-pop-c .rv-av{width:26px;height:26px;font-size:11px}.rv-pop-c+.rv-pop-c{padding-top:10px}' +
    '.rv-pop-meta b{font-size:13px}.rv-pop-meta span{font-size:11px}.rv-pop-cb p{font-size:13px;margin-top:2px}' +
    '.rv-reacts{gap:4px;margin-top:4px}.rv-react{height:24px;min-width:30px;padding:0 7px;font-size:11px}.rv-react svg{width:12px;height:12px}' +
    '.rv-pop-f{gap:8px;padding:6px 10px 10px 14px}.rv-pop-box{border-radius:12px}.rv-pop-box .rv-pop-in{font-size:13px;padding:8px 10px}.rv-pop-tb{padding:4px}.rv-pop-send{width:28px;height:28px}' +
    '.rv-pop-emo,.rv-pop-send{width:26px;height:26px}.rv-pop-emo svg{width:16px;height:16px}.rv-pop-send svg{width:14px;height:14px}.rv-emo{left:12px;right:12px;bottom:54px;padding:6px}.rv-emo button{font-size:17px}' +
    '.rv-rail{width:46px;padding-top:20px}.rv-rail .rv-side{width:28px;height:28px}.rv-dot{width:20px;height:20px;font-size:10px}.rv-rail-list{gap:8px;padding-top:12px}' +
    '.rv-toast{font-size:12px;padding:6px 12px;bottom:70px}' +
  '}' +
  '@media (max-width:640px){.rv-panel{width:100vw}.rv-rail{top:auto;bottom:80px;width:40px;padding:6px 0;border-radius:10px 0 0 10px;border:1px solid #e0e0e0;border-right:0}.rv-rail-list{display:none}' +
    '.rv-seg button{height:32px;padding:0 12px;font-size:12.5px}.rv-seg svg{width:15px;height:15px}.rv-pill{bottom:10px}' +
    '.rv-popwrap .rv-pop{width:272px}.rv-draft{width:256px}.rv-pin{width:24px;height:24px;font-size:10.5px}}';

  var ICON = {
    bell: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>',
    pointer: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4l7 16 2.3-6.7L20 11 4 4z"/></svg>',
    chat: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 5h16v11H9l-5 4V5z"/><path d="M8 9.5h8M8 12.5h5"/></svg>',
    copy: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="8" y="8" width="13" height="13" rx="2"/><path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3"/></svg>',
    check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="m5 12.5 4.5 4.5L19 7"/></svg>',
    plane: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21.5 2.5 10.5 13.5"/><path d="M21.5 2.5 14.5 21.5l-4-8-8-4z"/></svg>',
    x: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg>',
    up: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M12 19V5M6 11l6-6 6 6"/></svg>',
    smileplus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5V12a9 9 0 1 1-9-9h.5"/><path d="M8 14s1.5 2 4 2 4-2 4-2M9 9h.01M15 9h.01M16 5h6M19 2v6"/></svg>',
    search: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>',
    filter: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 6h16M7 12h10M10 18h4"/></svg>',
    checkf: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="currentColor"/><path d="m8 12.5 2.8 2.8L16.2 9.6" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    checkc: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="m8.5 12.5 2.5 2.5 4.5-5"/></svg>',
    undo: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 14 4 9l5-5"/><path d="M4 9h10a6 6 0 0 1 0 12h-3"/></svg>',
    dots: '<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="5" cy="12" r="1.9"/><circle cx="12" cy="12" r="1.9"/><circle cx="19" cy="12" r="1.9"/></svg>',
    pencil: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.8 2.8 0 0 1 4 4L7.5 20.5 2 22l1.5-5.5z"/><path d="m15 5 4 4"/></svg>',
    trash: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14"/></svg>',
    chev: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M15 6l-6 6 6 6"/></svg>',
    eyeoff: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.6 5.1A10.6 10.6 0 0 1 12 5c6.5 0 10 7 10 7a17.6 17.6 0 0 1-2.6 3.6"/><path d="M6.6 6.6C3.7 8.4 2 12 2 12s3.5 7 10 7a9.7 9.7 0 0 0 5.4-1.6"/><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2"/><path d="M2 2l20 20"/></svg>',
    side: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="16" rx="3"/><path d="M15 4v16"/></svg>',
    image: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="9" cy="9" r="1.8"/><path d="m21 15-4.5-4.5L6 21"/></svg>',
    like: '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 10v11M15 5.9 14 10h5.8a2 2 0 0 1 2 2.3l-1.4 7A2 2 0 0 1 18.4 21H7V10l4-8a3 3 0 0 1 4 3.9z"/></svg>',
    heart: '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 14c1.5-1.5 3-3.2 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.8 0-3 .5-4.5 2-1.5-1.5-2.7-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4 3 5.5l7 7z"/></svg>',
    smile: '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2M9 9h.01M15 9h.01"/></svg>'
  };
  var REACTIONS = [['like', 'Like'], ['heart', 'Love'], ['smile', 'Smile']];

  /* ---------- DOM ---------- */
  css += '/*rvlux*/.rv .rv-panel{width:370px;background:#fff;color:#1D2433;border-left:1px solid rgba(120,120,233,.08);box-shadow:-30px 0 60px -30px rgba(29,36,51,.35),-1px 0 0 rgba(120,120,233,.04)}.rv .rv-panel::before{content:"";position:absolute;inset:0 0 auto 0;height:3px;background:linear-gradient(90deg,#1D2433,#7878E9 60%,#D35BE0)}.rv .rv-panel .rv-head{padding:22px 16px 14px 22px}.rv .rv-panel .rv-head h2{font-size:17px;font-weight:700;letter-spacing:-.01em;color:#1D2433;display:flex;align-items:center;gap:10px}.rv .rv-panel .rv-head h2::before{content:"";width:8px;height:8px;border-radius:50%;background:#D35BE0;box-shadow:0 0 0 4px rgba(211,91,224,.12)}.rv .rv-ib{width:34px;height:34px;border-radius:50%;color:#4A5163;transition:background .2s,color .2s}.rv .rv-ib:hover,.rv .rv-ib.on{background:#F5F5FF;color:#1D2433}.rv .rv-ib svg{width:17px;height:17px}.rv .rv-ib.sm{width:28px;height:28px}.rv .rv-ib.sm svg{width:15px;height:15px}.rv .rv-fseg{margin:0 20px 14px;padding:3px;gap:3px;border-radius:11px;background:#E9EEF7;box-shadow:inset 0 0 0 1px rgba(120,120,233,.06)}.rv .rv-fseg-b{height:30px;border-radius:8px;font-size:12.5px;font-weight:600;color:#4A5163;gap:6px;letter-spacing:.005em}.rv .rv-fseg-b:hover{color:#1D2433}.rv .rv-fseg-b.on{background:#fff;color:#1D2433;font-weight:700;box-shadow:0 1px 2px rgba(120,120,233,.12),0 4px 10px -6px rgba(120,120,233,.35)}.rv .rv-fseg-b b{min-width:20px;height:18px;padding:0 6px;font-size:11px;font-weight:800;background:rgba(120,120,233,.12);color:#1D2433}.rv .rv-fseg-b.on b{background:#1D2433;color:#fff}.rv .rv-fseg-b.hot b{background:#D35BE0;color:#fff}.rv .rv-tools{padding:0 14px 14px 20px;gap:6px;border-bottom:1px solid #F5F5FF}.rv .rv-search{height:40px;padding:0 14px;gap:10px;border:1px solid transparent;border-radius:12px;background:#F5F5FF;color:#858B9C;transition:border-color .2s,box-shadow .2s,background .2s}.rv .rv-search:hover{background:#F5F5FF}.rv .rv-search:focus-within{background:#fff;border-color:rgba(120,120,233,.35);box-shadow:0 0 0 4px rgba(120,120,233,.08)}.rv .rv-search svg{width:16px;height:16px}.rv .rv-search input{font-size:13.5px;color:#1D2433}.rv .rv-search input::placeholder{color:#858B9C}.rv .rv-list{padding:6px 0 110px;scrollbar-width:thin;scrollbar-color:rgba(120,120,233,.18) transparent}.rv .rv-list::-webkit-scrollbar{width:6px}.rv .rv-list::-webkit-scrollbar-thumb{background:rgba(120,120,233,.16);border-radius:6px}.rv .rv-gh{position:sticky;top:0;z-index:3;padding:14px 20px 8px;gap:8px;font-size:11px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:#858B9C;background:linear-gradient(#fff 72%,rgba(255,255,255,0))}.rv .rv-gh:hover{color:#1D2433}.rv .rv-gh::after{background:#F5F5FF}.rv .rv-gh .rv-gc{margin-left:0;font-size:10.5px;letter-spacing:0;background:#F5F5FF;color:#5D5BD8;padding:1px 8px}.rv .rv-gchev{width:20px;height:20px;border-radius:6px}.rv .rv-gh:hover .rv-gchev{background:#F5F5FF;color:#1D2433}.rv .rv-row2{margin:0 12px 8px;border-radius:14px;background:#fff;border:1px solid #F5F5FF;transition:border-color .2s,box-shadow .25s,transform .25s}.rv .rv-row2:hover,.rv .rv-row2.menu{background:#fff;border-color:#EBECF5;box-shadow:0 10px 24px -16px rgba(120,120,233,.35)}.rv .rv-row2.on{background:#F5F5FF;border-color:rgba(120,120,233,.35);box-shadow:0 12px 28px -18px rgba(120,120,233,.45),inset 3px 0 0 #7878E9}.rv .rv-row2-main{gap:12px;padding:14px 14px 10px 14px}.rv .rv-row2-main .rv-av{width:30px;height:30px;font-size:12px;font-weight:700;margin-top:0;box-shadow:0 0 0 2px #fff,0 2px 8px -2px rgba(120,120,233,.35)}.rv .rv-row2-m{gap:6px;align-items:center;line-height:1.4;padding:4px 60px 0 0}.rv .rv-row2-m b{font-size:13.5px;font-weight:700;color:#1D2433;max-width:150px}.rv .rv-row2-m span.rv-no{order:3;font-size:10.5px;font-weight:700;letter-spacing:.02em;color:#5D5BD8;background:#F5F5FF;border-radius:999px;padding:0 7px;line-height:18px;margin-left:auto}.rv .rv-row2-m .rv-ago{font-size:12px;color:#858B9C}.rv .rv-unread{width:7px;height:7px;background:#D35BE0;box-shadow:0 0 0 3px rgba(211,91,224,.14)}.rv .rv-row2-t{margin-top:6px;padding-top:0;font-size:13.5px;line-height:1.6;color:#4A5163}.rv .rv-sm,.rv .rv-nr{margin:-2px 0 12px 56px;font-size:12px;font-weight:600;color:#5D5BD8;display:inline-flex;align-items:center;gap:4px}.rv .rv-sm::after{content:"";width:6px;height:6px;border-right:1.5px solid currentColor;border-bottom:1.5px solid currentColor;transform:rotate(45deg) translateY(-2px);margin-left:3px}.rv .rv-sm:hover,.rv .rv-nr:hover{color:#D35BE0}.rv .rv-nr{color:#858B9C;margin-left:56px}.rv .rv-sm+.rv-nr{margin-left:12px}.rv .rv-new{margin:0 0 12px 56px;background:#D35BE0}.rv .rv-row2-acts{top:10px;right:10px;gap:2px;padding:2px;border-radius:999px;background:rgba(255,255,255,.92);box-shadow:0 4px 14px -6px rgba(120,120,233,.3);transition:opacity .2s}.rv .rv-row2-acts .rv-ib.sm{border-radius:50%}.rv .rv-row2.done{background:#F5F5FF}.rv .rv-row2.done .rv-row2-main{opacity:.62}.rv .rv-row2.done .rv-row2-m b{text-decoration:none}.rv .rv-menu{border-radius:14px;padding:6px;box-shadow:0 20px 44px -14px rgba(29,36,51,.35),0 0 0 1px rgba(120,120,233,.06)}.rv .rv-menu button{height:36px;border-radius:9px;font-size:13px;color:#1D2433}.rv .rv-menu button:hover{background:#F5F5FF}.rv .rv-menu button.danger{color:#D35BE0}.rv .rv-menu button.danger:hover{background:#FDEFFD}.rv .rv-empty{color:#858B9C;padding:56px 28px;font-size:13.5px;line-height:1.6}.rv .rv-seg{padding:5px;gap:4px;background:rgba(29,36,51,.86);-webkit-backdrop-filter:blur(14px) saturate(140%);backdrop-filter:blur(14px) saturate(140%);box-shadow:0 18px 40px -14px rgba(29,36,51,.6),inset 0 0 0 1px rgba(255,255,255,.08);outline:0}.rv .rv-seg button{height:38px;padding:0 16px;font-size:13px;font-weight:600;color:rgba(255,255,255,.72);letter-spacing:.01em}.rv .rv-seg button:hover{color:#fff;background:rgba(255,255,255,.06)}.rv .rv-seg button.on{background:#fff;color:#1D2433;box-shadow:0 6px 16px -6px rgba(0,0,0,.45)}.rv .rv-hint{background:rgba(29,36,51,.86);-webkit-backdrop-filter:blur(10px);backdrop-filter:blur(10px)}.rv .rv-gh span{text-transform:uppercase;letter-spacing:.12em;font-size:11px}@media (max-width:640px){.rv .rv-panel{width:100vw}.rv .rv-seg button{height:34px;padding:0 12px;font-size:12.5px}}.rv .rv-row2{border-color:#EBECF5}.rv .rv-row2-t{color:#1D2433;font-weight:500}.rv .rv-row2-m b{color:#1D2433;font-weight:800}.rv .rv-row2-m .rv-ago{color:#858B9C;font-weight:500}.rv .rv-row2-m span.rv-no{background:#F5F5FF;color:#5D5BD8;font-weight:800}.rv .rv-gh{color:#4A5163}.rv .rv-gh .rv-gc{background:#F5F5FF;color:#5D5BD8;font-weight:800}.rv .rv-gchev{color:#4A5163}.rv .rv-ib{color:#4A5163}.rv .rv-search{background:#F5F5FF;color:#858B9C}.rv .rv-search input::placeholder{color:#858B9C}.rv .rv-sm{color:#5D5BD8;font-weight:700}.rv .rv-nr{color:#4A5163;font-weight:600}.rv .rv-row2.done{background:#F5F5FF;border-color:#EBEFF5}.rv .rv-row2.done .rv-row2-main,.rv .rv-row2.done .rv-sm,.rv .rv-row2.done .rv-nr{opacity:.48;transition:opacity .2s}.rv .rv-row2.done .rv-av{filter:grayscale(.6)}.rv .rv-row2.done:hover .rv-row2-main,.rv .rv-row2.done.on .rv-row2-main,.rv .rv-row2.done:hover .rv-sm,.rv .rv-row2.done:hover .rv-nr{opacity:.85}@media (max-width:640px){.rv .rv-pill{left:auto;right:0;bottom:162px;transform:none;align-items:flex-end;gap:0}.rv .rv-seg{flex-direction:column;align-items:center;width:40px;padding:6px 0;gap:4px;border-radius:10px 0 0 10px;background:rgba(245,245,245,.96);-webkit-backdrop-filter:blur(10px);backdrop-filter:blur(10px);border:1px solid #e0e0e0;border-right:0;box-shadow:none;outline:0}.rv .rv-seg button{width:28px;height:28px;padding:0;gap:0;font-size:0;border-radius:8px;justify-content:center;color:#334155}.rv .rv-seg button:hover{background:rgba(0,0,0,.06);color:#1D2433}.rv .rv-seg button.on{background:#1D2433;color:#fff;box-shadow:none}.rv .rv-seg svg{width:16px;height:16px}.rv .rv-seg button.rv-bell{padding:0}.rv .rv-bell b{top:-4px;right:-5px;min-width:15px;height:15px;line-height:15px;font-size:9.5px;box-shadow:0 0 0 2px #f5f5f5}.rv .rv-hint{position:fixed;left:50%;bottom:14px;transform:translateX(-50%);max-width:calc(100vw - 32px);overflow:hidden;text-overflow:ellipsis}}.rv .rv-panel{background:linear-gradient(180deg,#FFFFFF 0%,#F5F5FF 100%)}.rv .rv-panel::before{height:3px;background:linear-gradient(90deg,#7878E9,#7878E9 45%,#D35BE0)}.rv .rv-fseg{background:#F5F5FF}.rv .rv-fseg-b.on b{background:linear-gradient(135deg,#1D2433,#7878E9);color:#fff}.rv .rv-fseg-b.hot b{background:linear-gradient(135deg,#D35BE0,#D35BE0)}.rv .rv-fseg-b[data-filter=resolved] b{background:#E3F8EF;color:#1FAF85}.rv .rv-fseg-b[data-filter=resolved].on b{background:linear-gradient(135deg,#1FAF85,#1FAF85);color:#fff}.rv .rv-search{background:#fff;border-color:#EBECF5}.rv .rv-gh{color:#1D2433;background:linear-gradient(#FFFFFF 72%,rgba(255,255,255,0))}.rv .rv-gh .rv-gc{background:linear-gradient(135deg,#7878E9,#7878E9);color:#fff}.rv .rv-row2{background:#fff;border-color:#EBECF5;box-shadow:0 1px 2px rgba(120,120,233,.04)}.rv .rv-row2:hover,.rv .rv-row2.menu{border-color:#CFCFF8;box-shadow:0 12px 26px -16px rgba(120,120,233,.35)}.rv .rv-row2.on{background:#F5F5FF;border-color:#CFCFF8;box-shadow:0 14px 30px -18px rgba(120,120,233,.45),inset 3px 0 0 #7878E9}.rv .rv-row2:not(.done){box-shadow:inset 3px 0 0 #D35BE0,0 1px 2px rgba(120,120,233,.04)}.rv .rv-row2-m span.rv-no{background:#F5F5FF;color:#5D5BD8}.rv .rv-sm{color:#5D5BD8}.rv .rv-row2.done{background:#fff;border-color:#EBECF5}.rv .rv-row2.done .rv-row2-main,.rv .rv-row2.done .rv-sm,.rv .rv-row2.done .rv-nr{opacity:1}.rv .rv-row2.done .rv-av{filter:none;opacity:.9}.rv .rv-row2.done .rv-row2-m b{color:#4A5163}.rv .rv-row2.done .rv-row2-t{color:#858B9C;font-weight:500}.rv .rv-row2.done .rv-row2-m span.rv-no{background:#F5F5FF;color:#858B9C}.rv .rv-row2-main .rv-av{position:relative}.rv .rv-row2.done .rv-row2-main .rv-av::after{content:"";position:absolute;right:-3px;bottom:-3px;width:13px;height:13px;border-radius:50%;background:#1FAF85 url("data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 24 24%22 fill=%22none%22 stroke=%22white%22 stroke-width=%224%22 stroke-linecap=%22round%22 stroke-linejoin=%22round%22%3E%3Cpath d=%22m5 12.5 4.5 4.5L19 7.5%22/%3E%3C/svg%3E") center/8px no-repeat;box-shadow:0 0 0 2px #fff}.rv .rv-row2.done:hover,.rv .rv-row2.done.on{border-color:#BFEBDD}.rv .rv-row2.done .rv-row2-main{opacity:.72}.rv .rv-row2.done:hover .rv-row2-main,.rv .rv-row2.done.on .rv-row2-main{opacity:1}.rv .rv-panel{background:linear-gradient(180deg,#FFFFFF 0%,#FCFCFE 55%,#F7F8FC 100%)}.rv .rv-panel::before{height:4px;background:linear-gradient(90deg,#8C8CF0,#8C8CF0 25%,#EEEC8A 25%,#EEEC8A 50%,#E58AEA 50%,#E58AEA 75%,#C6EF7C 75%)}.rv .rv-panel .rv-head h2::before{background:linear-gradient(135deg,#E58AEA,#D35BE0);box-shadow:0 0 0 4px rgba(211,91,224,.14)}.rv .rv-fseg{background:#F1F1FC}.rv .rv-fseg-b.on b{background:linear-gradient(135deg,#7878E9,#9C9BF2)}.rv .rv-fseg-b.hot b{background:linear-gradient(135deg,#E58AEA,#D35BE0)}.rv .rv-fseg-b[data-filter=resolved] b{background:#E3F8EF;color:#178A68}.rv .rv-fseg-b[data-filter=resolved].on b{background:linear-gradient(135deg,#5FD6AE,#1FAF85);color:#fff}.rv .rv-gh .rv-gc{background:linear-gradient(135deg,#9C9BF2,#7878E9)}.rv .rv-row2:not(.done){box-shadow:inset 3px 0 0 #D35BE0,0 1px 2px rgba(120,120,233,.05)}.rv .rv-row2.on{box-shadow:0 14px 30px -18px rgba(120,120,233,.45),inset 3px 0 0 #7878E9}.rv .rv-unread{background:#D35BE0;box-shadow:0 0 0 3px rgba(211,91,224,.18)}.rv .rv-search:focus-within{border-color:rgba(120,120,233,.4);box-shadow:0 0 0 4px rgba(120,120,233,.1)}.rv .rv-seg{background:rgba(29,36,51,.92)}.rv .rv-seg button.on{background:#fff;color:#5D5BD8}.rv .rv-hint{background:rgba(29,36,51,.92)}@media (max-width:640px){.rv .rv-seg{background:rgba(250,248,255,.96);border-color:#E4E5F2}.rv .rv-seg button{color:#4A5163}.rv .rv-seg button.on{background:#7878E9;color:#fff}}.rv .rv-panel{box-shadow:-1px 0 0 #EBECF5,-24px 0 48px -36px rgba(29,36,51,.22);border-left:0}.rv .rv-row2,.rv .rv-row2.done{box-shadow:none}.rv .rv-row2:not(.done){box-shadow:inset 3px 0 0 #D35BE0}.rv .rv-row2:hover,.rv .rv-row2.menu{box-shadow:none;border-color:#CFCFF8}.rv .rv-row2.on{box-shadow:inset 3px 0 0 #7878E9;background:#F7F7FF;border-color:#BDBDF6}.rv .rv-row2:not(.done).on{box-shadow:inset 3px 0 0 #D35BE0}.rv .rv-row2-acts{box-shadow:0 0 0 1px #EBECF5}.rv .rv-fseg-b.on{box-shadow:0 1px 2px rgba(29,36,51,.08)}.rv .rv-menu{box-shadow:0 10px 24px -12px rgba(29,36,51,.25),0 0 0 1px #EBECF5}.rv .rv-search:focus-within{box-shadow:0 0 0 3px rgba(120,120,233,.12)}.rv .rv-row2-main .rv-av,.rv .rv-dot,.rv .rv-pin,.rv .rv-av{color:#1D2433!important;text-shadow:none}.rv .rv-row2-main .rv-av{box-shadow:none;font-weight:800}.rv .rv-row2.done .rv-av{opacity:1}.rv .rv-row2.done .rv-row2-main .rv-av::after{background-color:#1FAF85}.rv .rv-seg{box-shadow:0 8px 22px -12px rgba(29,36,51,.5);outline:0}.rv .rv-seg button{color:rgba(255,255,255,.75)}.rv .rv-seg button.on{background:#D4F28C;color:#1D2433;box-shadow:none}.rv .rv-panel .rv-head h2::before{background:#C6EF7C;box-shadow:0 0 0 4px rgba(198,239,124,.35)}@media (max-width:640px){.rv .rv-seg{background:rgba(252,252,254,.97);border-color:#E4E5F2;box-shadow:none}.rv .rv-seg button{color:#4A5163}.rv .rv-seg button.on{background:#D4F28C;color:#1D2433}}.rv .rv-dot span{color:#1D2433!important}.rv .rv-pin{box-shadow:0 2px 6px rgba(29,36,51,.22)}.rv.rv-dev{padding:4px;gap:4px;background:rgba(29,36,51,.92);-webkit-backdrop-filter:blur(12px);backdrop-filter:blur(12px);box-shadow:0 8px 22px -12px rgba(29,36,51,.5)}.rv.rv-dev button{background:transparent;color:rgba(255,255,255,.75);box-shadow:none;transition:background .2s,color .2s}.rv.rv-dev button:hover{background:rgba(255,255,255,.08);color:#fff}.rv.rv-dev button.on,.rv-devbar button.on{background:#D4F28C;color:#1D2433}.rv-devwrap{background:#F1F2F7!important}.rv-devbar{background:rgba(255,255,255,.92)!important;box-shadow:0 1px 0 #EBECF5!important}.rv-devbar button{background:#fff;color:#4A5163;box-shadow:0 0 0 1px #E4E5F2!important}.rv-devbar button:hover{background:#F5F5FF}.rv-devbar button.on{box-shadow:none!important}.rv-devstage iframe{border-color:#1D2433!important;box-shadow:0 16px 40px -20px rgba(29,36,51,.35)!important}/* compact tools */@media (min-width:641px){.rv .rv-seg{padding:3px;gap:2px}.rv .rv-seg button{height:30px;padding:0 11px;gap:6px;font-size:12px;font-weight:600}.rv .rv-seg button.rv-bell{padding:0 9px}.rv .rv-seg svg{width:14px;height:14px}.rv-bell b{min-width:15px;height:15px;line-height:15px;font-size:9.5px;top:0;right:0}}.rv.rv-dev{padding:3px;gap:2px}.rv.rv-dev button,.rv.rv-devwrap .rv-devbar button{height:26px;padding:0 10px;font-size:11.5px;font-weight:600;letter-spacing:.01em}.rv.rv-devwrap .rv-devbar{height:44px;gap:6px}@media (max-width:640px){.rv .rv-seg{width:36px;padding:4px 0;gap:3px}.rv .rv-seg button{width:26px;height:26px}.rv .rv-seg svg{width:14px;height:14px}}/* purple lead */.rv .rv-panel::before{height:4px;background:#7878E9}.rv .rv-panel .rv-head h2::before{background:#7878E9;box-shadow:0 0 0 4px rgba(120,120,233,.2)}.rv .rv-row2.on{box-shadow:inset 3px 0 0 #7878E9;background:#F6F6FE}.rv .rv-fseg-b.on b{background:#7878E9;color:#fff}.rv .rv-gh .rv-gc{background:#7878E9;color:#fff}.rv .rv-seg{background:#16172B;box-shadow:0 8px 22px -12px rgba(22,23,43,.55);outline:0}.rv .rv-seg button{color:rgba(255,255,255,.72)}.rv .rv-seg button:hover{background:rgba(255,255,255,.08);color:#fff}.rv .rv-seg button.on{background:#7878E9;color:#fff}.rv-bell b{box-shadow:0 0 0 2px #16172B}.rv.rv-dev{background:#16172B;box-shadow:0 8px 22px -12px rgba(22,23,43,.55)}.rv.rv-dev button{color:rgba(255,255,255,.72)}.rv.rv-dev button:hover{background:rgba(255,255,255,.08);color:#fff}.rv.rv-dev button.on,.rv.rv-devwrap .rv-devbar button.on{background:#7878E9;color:#fff}.rv.rv-devwrap .rv-devbar{background:#16172B!important;box-shadow:none!important}.rv.rv-devwrap .rv-devbar button{background:transparent;color:rgba(255,255,255,.72);box-shadow:none!important}.rv.rv-devwrap .rv-devbar button:hover{background:rgba(255,255,255,.08);color:#fff}.rv-devwrap{background:#EEEEFC!important}.rv-devstage iframe{border-color:#16172B!important}@media (max-width:640px){.rv .rv-seg{background:#16172B;border-color:#16172B}.rv .rv-seg button{color:rgba(255,255,255,.72)}.rv .rv-seg button.on{background:#7878E9;color:#fff}.rv .rv-bell b{box-shadow:0 0 0 2px #16172B}}.rv .rv-fseg-b b{min-width:16px;height:15px;padding:0 5px;font-size:9.5px;font-weight:700;line-height:15px;letter-spacing:0}';
  var root = document.createElement('div'); root.className = 'rv'; root.setAttribute('data-review-ui', '');
  root.innerHTML = '<style>' + css + '</style><div class="rv-layer" id="rvLayer"></div><div id="rvUi"></div>';
  function mount() { document.body.appendChild(root); renderAll(); }
  var layer = root.querySelector('#rvLayer'), ui = root.querySelector('#rvUi');
  var fileIn = document.createElement('input'); fileIn.type = 'file'; fileIn.accept = 'image/*'; fileIn.multiple = true; fileIn.hidden = true; root.appendChild(fileIn);

  function toast(msg) { var t = document.createElement('div'); t.className = 'rv-toast'; t.textContent = msg; root.appendChild(t); setTimeout(function () { t.remove(); }, 2200); }

  /* ---------- direct text editing ---------- */
  var BAD_TAG = /^(HTML|BODY|SCRIPT|STYLE|SVG|PATH|IMG|VIDEO|IFRAME|INPUT|TEXTAREA|SELECT|CANVAS|PICTURE)$/i;
  function decorEl(n) { // icons, arrows, dots that sit next to editable text
    if (/^(SVG|IMG|I|PICTURE)$/i.test(n.tagName)) return true;
    if (/^(B|STRONG|EM|I|U|SPAN|A|SMALL|SUP|SUB|MARK|CODE|ABBR|TIME)$/i.test(n.tagName) && !n.querySelector('p,div,h1,h2,h3,h4,h5,h6,li,ul,ol,img,video')) return true; // inline words (bold, links…) stay as they are; click them to edit separately
    return (n.textContent || '').trim().length <= 2 && !n.querySelector('p,div,h1,h2,h3,h4,h5,h6,li');
  }
  function textTarget(el) {
    for (var i = 0, cur = el; cur && cur.nodeType === 1 && i < 4; i++, cur = cur.parentElement) {
      if (BAD_TAG.test(cur.tagName) || inUi(cur)) return null;
      var ok = true, has = false;
      for (var n = cur.firstChild; n; n = n.nextSibling) {
        if (n.nodeType === 3) { if (n.nodeValue.trim()) has = true; }
        else if (n.nodeType === 8 || (n.nodeType === 1 && (n.tagName === 'BR' || decorEl(n)))) {}
        else { ok = false; break; }
      }
      if (ok && has) return cur;
    }
    return null;
  }
  function readText(el) { var o = ''; for (var n = el.firstChild; n; n = n.nextSibling) { if (n.nodeType === 3) o += n.nodeValue; else if (n.nodeType === 1 && n.tagName === 'BR') o += '\n'; } return o; }
  function normT(x) { return String(x || '').normalize('NFC').split('\n').map(function (l) { return l.replace(/\s+/g, ' ').trim(); }).join('\n').trim(); }
  // change existing text nodes only (never add/remove nodes), so the site's React stays happy
  function writeText(el, text) {
    if (!el.__rvOrig) { el.__rvOrig = []; for (var n0 = el.firstChild; n0; n0 = n0.nextSibling) if (n0.nodeType === 3) el.__rvOrig.push([n0, n0.nodeValue]); }
    var segs = [[]]; for (var n = el.firstChild; n; n = n.nextSibling) { if (n.nodeType === 3) segs[segs.length - 1].push(n); else if (n.nodeType === 1 && n.tagName === 'BR') segs.push([]); }
    segs = segs.filter(function (g) { return g.length; }); if (!segs.length) return;
    var lines = String(text).split('\n'), k = 0;
    segs.forEach(function (g, i) {
      var v = i === segs.length - 1 ? lines.slice(k).join(' ') : (lines[k] != null ? lines[k] : '');
      k++; var o0 = g[0].__o0 != null ? g[0].__o0 : (g[0].__o0 = g.map(function (x) { return x.nodeValue; }).join('')); if (v) v = (/^\s/.test(o0) ? ' ' : '') + v.replace(/^\s+|\s+$/g, '') + (/\s$/.test(o0) ? ' ' : ''); g[0].nodeValue = v; for (var j = 1; j < g.length; j++) g[j].nodeValue = '';
    });
  }
  function restoreText(el) { if (el.__rvOrig) { el.__rvOrig.forEach(function (p) { p[0].nodeValue = p[1]; }); el.__rvOrig = null; } }
  var APPLIED = [];
  function applyEdits() {
    var c = ctx(), live = {};
    S.threads.forEach(function (t) {
      if (t.kind !== 'edit' || t.page !== c.key) return; live[t.id] = 1;
      var el = null; try { el = c.doc.querySelector(t.selector); } catch (e) {} if (!el || el.__rvLive) return;
      var cur = normT(readText(el));
      if (cur === normT(t.to)) { if (el.__rvOrig && APPLIED.indexOf(el) < 0) { el.__rvEid = t.id; APPLIED.push(el); } return; }
      if (cur === normT(t.from) || (el.__rvOrig && el.__rvEid === t.id)) { writeText(el, t.to); el.__rvEid = t.id; if (APPLIED.indexOf(el) < 0) APPLIED.push(el); }
    });
    APPLIED = APPLIED.filter(function (el) {
      if (!el.isConnected) return false;
      if (el.__rvLive || live[el.__rvEid]) return true;
      if (el.ownerDocument === c.doc && !S.threads.some(function (t) { return t.id === el.__rvEid; })) { restoreText(el); return false; }
      return true;
    });
  }
  function startTextEdit(el) {
    if (S.tedit) { if (S.tedit.el === el) return; endTextEdit(true); if (S.tedit) return; }
    var c = ctx(), win = el.ownerDocument.defaultView, r = el.getBoundingClientRect(), sel = selectorFor(el);
    var ex = S.threads.filter(function (t) { return t.kind === 'edit' && t.page === c.key && t.selector === sel; })[0];
    var before = readText(el), nodes = Array.prototype.slice.call(el.childNodes);
    var islands = nodes.filter(function (n) { return n.nodeType === 1 && n.tagName !== 'BR'; });
    S.tedit = { el: el, id: ex ? ex.id : null, page: c.key, selector: sel, from: ex ? ex.from : normT(before), before: before, nodes: nodes, islands: islands, rx: 0, ry: 1, ax: r.left + win.scrollX, ay: r.bottom + win.scrollY,
      ol: el.style.outline, olo: el.style.outlineOffset };
    el.__rvLive = true; clearHover();
    islands.forEach(function (n) { n.setAttribute('contenteditable', 'false'); });
    el.style.outline = '2px solid #306eed'; el.style.outlineOffset = '3px';
    try { el.contentEditable = 'plaintext-only'; } catch (x) {} if (el.contentEditable !== 'plaintext-only') el.contentEditable = 'true';
    el.focus();
    var d = el.ownerDocument, rg = d.createRange(), tn = nodes.filter(function (n) { return n.nodeType === 3 && n.nodeValue.trim(); });
    if (islands.length && tn.length) { rg.setStart(tn[0], 0); rg.setEnd(tn[tn.length - 1], tn[tn.length - 1].nodeValue.length); } else rg.selectNodeContents(el);
    var sl = d.defaultView.getSelection(); sl.removeAllRanges(); sl.addRange(rg);
    el.addEventListener('keydown', onTEKey); el.addEventListener('keyup', stopTEKey, true); el.addEventListener('blur', onTEBlur);
    S.nameInput = S.name || ''; S.draft = null; renderPins();
  }
  function onTEKey(e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); endTextEdit(true); }
    else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); endTextEdit(false); }
    else if (e.key === ' ') { e.preventDefault(); e.stopPropagation(); e.target.ownerDocument.execCommand('insertText', false, ' '); }
  }
  function stopTEKey(e) { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); } }
  function onTEBlur() { setTimeout(function () { if (!S.tedit) return; var ae = document.activeElement; if (ae && root.contains(ae)) return; endTextEdit(true); }, 0); }
  function finishInline(d) {
    var el = d.el, typed = '';
    (function walk(node) {
      for (var n = node.firstChild; n; n = n.nextSibling) {
        if (n.nodeType === 3) typed += n.nodeValue;
        else if (n.nodeType === 1) {
          if (d.islands.indexOf(n) >= 0) continue;
          if (n.tagName === 'BR') { typed += '\n'; continue; }
          if (/^(DIV|P)$/.test(n.tagName) && typed && !/\n$/.test(typed)) typed += '\n'; walk(n);
        }
      }
    })(el);
    el.removeEventListener('keydown', onTEKey); el.removeEventListener('keyup', stopTEKey, true); el.removeEventListener('blur', onTEBlur);
    el.removeAttribute('contenteditable'); el.style.outline = d.ol; el.style.outlineOffset = d.olo;
    d.islands.forEach(function (n) { n.removeAttribute('contenteditable'); });
    el.replaceChildren.apply(el, d.nodes);              // give the site its own nodes back
    return typed;
  }
  function endTextEdit(ok) {
    var d = S.tedit; if (!d) return;
    if (ok && !S.name) {
      var n = S.nameInput.trim();
      if (!n) { if (normT(finishPeek(d)) === normT(d.before)) { ok = false; } else { renderPins(); var ni = root.querySelector('#rvName'); if (ni) ni.focus(); toast('Enter your name to save'); return; } }
      else { S.name = n; lsSet(NAME_KEY, n); }
    }
    var el = d.el, now = normT(finishInline(d));
    S.tedit = null; el.__rvLive = false;
    if (!ok || !now || now === normT(d.before)) { writeText(el, d.before); if (normT(d.before) === normT(d.from)) restoreText(el); return renderAll(); }
    if (now === normT(d.from)) { restoreText(el); return saveAll(S.threads.filter(function (t) { return t.id !== d.id; })); }
    var label = 'Edit text: "' + normT(d.from).replace(/\n/g, ' / ') + '" → "' + now.replace(/\n/g, ' / ') + '"', t;
    writeText(el, now);
    if (d.id) { t = Object.assign({}, findT(d.id), { to: now, text: label, at: Date.now(), author: S.name, resolved: false }); el.__rvEid = t.id; saveAll(S.threads.map(function (x) { return x.id === t.id ? t : x; })); }
    else {
      t = { id: uid(), kind: 'edit', page: d.page, selector: d.selector, rx: 0, ry: 0, ax: d.ax, ay: d.ay, author: S.name, from: normT(d.from), to: now, text: label, at: Date.now(), resolved: false, replies: [] };
      el.__rvEid = t.id; saveAll(S.threads.concat([t]));
    }
    if (APPLIED.indexOf(el) < 0) APPLIED.push(el);
    S.active = t.id; toast('Saved · everyone sees it now'); captureShot(t);
  }
  function finishPeek(d) { var o = ''; (function walk(node) { for (var n = node.firstChild; n; n = n.nextSibling) { if (n.nodeType === 3) o += n.nodeValue; else if (n.nodeType === 1 && d.islands.indexOf(n) < 0) { if (n.tagName === 'BR') o += '\n'; else walk(n); } } })(d.el); return o; }

  /* ---------- positions ---------- */
  function pos(t, c) {
    c = c || ctx();
    var off = { x: 0, y: 0 };
    if (c.frame) { var fr = c.frame.getBoundingClientRect(); off = { x: fr.left, y: fr.top }; }
    try {
      var el = t.selector ? c.doc.querySelector(t.selector) : null;
      if (el) { var r = el.getBoundingClientRect(); if (r.width || r.height) return { x: off.x + r.left + r.width * t.rx, y: off.y + r.top + r.height * t.ry }; }
    } catch (e) {}
    return { x: off.x + t.ax - c.win.scrollX, y: off.y + t.ay - c.win.scrollY };
  }

  /* ---------- render ---------- */
  function computeAuthors() {
    var seen = [];
    S.threads.forEach(function (t) { seen.push([t.at, authorKey(t.author)]); (t.replies || []).forEach(function (r) { seen.push([r.at || t.at, authorKey(r.author)]); }); });
    seen.sort(function (a, b) { return a[0] - b[0]; }); AUTHORS = [];
    seen.forEach(function (s) { if (AUTHORS.indexOf(s[1]) < 0) AUTHORS.push(s[1]); });
  }
  function renderPins() {
    var c = ctx(), vw = innerWidth, vh = innerHeight, html = '';
    S.threads.forEach(function (t, i) {
      if (t.page !== c.key) return;
      var p = pos(t, c); if (p.x < -40 || p.y < -10 || p.x > vw + 40 || p.y > vh + 40) return;
      var bg = t.resolved ? '#9CA3AF' : colorFor(t.author);
      html += '<button class="rv-pin' + (S.active === t.id ? ' on' : '') + (S.flash === t.id ? ' flash' : '') + '" data-pin="' + t.id + '" style="left:' + p.x + 'px;top:' + p.y + 'px;background:' + bg + ';color:' + bg + '" aria-label="Comment ' + NUM[t.id] + '"><span style="color:#fff">' + (t.resolved ? ICON.check.replace('<svg', '<svg width="14" height="14"') : NUM[t.id]) + '</span></button>';
    });
    if (S.draft) {
      var d = S.draft, dp = pos(d, c), left = Math.min(Math.max(12, dp.x - 20), Math.max(12, vw - 312)), top = Math.min(dp.y + 12, vh - 230);
      html += '<div class="rv-draft" style="left:' + left + 'px;top:' + Math.max(12, top) + 'px">' +
        (!S.name ? '<label class="rv-lab" for="rvName">Your name</label><input class="rv-in" id="rvName" placeholder="e.g. Hoa Ho" autocomplete="name" style="margin-bottom:8px" value="' + esc(S.nameInput) + '">' : '') +
        '<textarea class="rv-in" id="rvText" placeholder="Leave a comment… (paste images with Ctrl+V)">' + esc(S.draftText) + '</textarea>' +
        (S.draftImages.length ? '<div class="rv-thumbs">' + S.draftImages.map(function (src, i) { return '<div class="rv-thumb"><img src="' + src + '" alt=""><button data-rmimg="' + i + '" aria-label="Remove image">×</button></div>'; }).join('') + '</div>' : '') +
        '<div class="rv-row"><button class="rv-btn img" id="rvImg"' + (S.draftImages.length >= MAX_IMAGES ? ' disabled' : '') + '>' + ICON.image + 'Image' + (S.draftImages.length ? ' (' + S.draftImages.length + '/' + MAX_IMAGES + ')' : '') + '</button>' +
        '<button class="rv-btn ghost" id="rvCancel">Cancel</button><button class="rv-btn pri" id="rvSend">Send</button></div></div>';
    }
    if (S.tedit && !S.name) {
      var te = S.tedit, tp = pos(te, c), tl = Math.min(Math.max(12, tp.x), Math.max(12, vw - 272)), tt0 = Math.min(tp.y + 12, vh - 140);
      html += '<div class="rv-draft rv-tbox" style="left:' + tl + 'px;top:' + Math.max(12, tt0) + 'px"><span class="rv-lab">Your name (once)</span>' +
        '<input class="rv-in" id="rvName" placeholder="e.g. Hoa Ho" autocomplete="name" value="' + esc(S.nameInput) + '">' +
        '<div class="rv-row" style="justify-content:flex-end"><button class="rv-btn ghost" id="rvTCancel">Cancel</button><button class="rv-btn pri" id="rvTSave">Save text</button></div></div>';
    }
    // keep typing focus when re-rendering the draft
    var ae = document.activeElement, keep = ae && (ae.id === 'rvText' || ae.id === 'rvName' || ae.id === 'rvTEdit') ? [ae.id, ae.selectionStart, ae.selectionEnd] : null;
    if (layer.__html !== html) { layer.innerHTML = html; layer.__html = html; }
    if (keep) { var el = root.querySelector('#' + keep[0]); if (el) { el.focus(); try { el.setSelectionRange(keep[1], keep[2]); } catch (e) {} } }
    syncSend(); placePop();
  }
  function syncSend() {
    var b = root.querySelector('#rvSend'); if (!b) return;
    b.disabled = (!S.draftText.trim() && !S.draftImages.length) || (!S.name && !S.nameInput.trim());
  }
  function renderUi() {
    document.documentElement.classList.toggle('rv-off', !!S.hidden);
    if (S.hidden) {
      var n0 = unread().length || S.threads.filter(function (t) { return !t.resolved; }).length;
      ui.innerHTML = '<button class="rv-show" id="rvShow" title="Open comments" aria-label="Open comments">' + ICON.chat + (n0 ? '<span>' + n0 + '</span>' : '') + '</button>';
      return;
    }
    var open = S.threads.filter(function (t) { return !t.resolved; }).length;
    var shown = S.threads.filter(function (t) { return S.filter === 'all' ? true : S.filter === 'open' ? !t.resolved : t.resolved; });
    var h = '<div class="rv-pill">' + (S.mode === 'edit' ? '<span class="rv-hint">Click any text and type · Enter to save · Esc to cancel</span>' : S.mode ? '<span class="rv-hint">Click anything to comment · Esc to cancel</span>' : '') +
      '<div class="rv-seg"><button id="rvBrowse" class="' + (!S.mode ? 'on' : '') + '">' + ICON.pointer + 'Browse</button><button id="rvComment" class="' + (S.mode === true ? 'on' : '') + '">' + ICON.chat + 'Comment</button><button id="rvEditMode" class="' + (S.mode === 'edit' ? 'on' : '') + '">' + ICON.pencil + 'Edit text</button>' + bellBtn() + '</div></div>' + inboxHtml();
    if (!S.open) {
      h += '<aside class="rv-rail"><button class="rv-side" id="rvTab" title="Open comments" aria-label="Open comments">' + ICON.side + '</button><button class="rv-side" id="rvHide" title="Hide comments (full view)" aria-label="Hide comments">' + ICON.eyeoff + '</button><div class="rv-rail-list">' +
        S.threads.slice().sort(function (a, b) { return (b.at || 0) - (a.at || 0); }).map(function (t, i) { var col = t.resolved ? '#9CA3AF' : colorFor(t.author); return '<button class="rv-dot' + (S.active === t.id ? ' on' : '') + (t.resolved ? ' done' : '') + '" data-rail="' + t.id + '" style="background:' + col + ';color:' + col + '" title="#' + NUM[t.id] + ' · ' + esc(labelFor(t.page)) + ' · ' + esc(t.author) + ': ' + esc(t.text.slice(0, 80)) + '"><span style="color:#fff">' + esc((t.author.trim()[0] || '?')) + '</span></button>'; }).join('') +
        '</div></aside>';
    }
    if (S.open) {
      var fold = function (x) { return String(x || '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase(); };
      var q = fold(S.q || '');
      var list = shown.filter(function (t) { if (!q) return true; return fold([t.author, t.text, labelFor(t.page)].concat((t.replies || []).map(function (r) { return r.author + ' ' + r.text; })).join(' ')).indexOf(q) >= 0; })
        .slice().sort(function (a, b) { return b.at - a.at; });
      var groups = [], gi = {};
      list.forEach(function (t) { var g = labelFor(t.page); if (gi[g] == null) { gi[g] = groups.length; groups.push({ name: g, items: [] }); } groups[gi[g]].items.push(t); });
      h += '<aside class="rv-panel"><header class="rv-head"><h2>Comments</h2><div><button class="rv-ib" id="rvHide" title="Hide comments (full view)" aria-label="Hide comments">' + ICON.eyeoff + '</button><button class="rv-ib" id="rvClose" title="Close panel" aria-label="Close panel">' + ICON.x + '</button></div></header>' +
        '<div class="rv-fseg" role="tablist" aria-label="Lọc comment">' + [['all', 'Tất cả', S.threads.length], ['open', 'Đang mở', S.threads.filter(function (t) { return !t.resolved; }).length], ['resolved', 'Đã xử lý', S.threads.filter(function (t) { return t.resolved; }).length]].map(function (f) { return '<button type="button" role="tab" aria-selected="' + (S.filter === f[0]) + '" class="rv-fseg-b' + (S.filter === f[0] ? ' on' : '') + (f[0] === 'open' && f[2] ? ' hot' : '') + '" data-filter="' + f[0] + '"><span>' + f[1] + '</span><b>' + f[2] + '</b></button>'; }).join('') + '</div>' +
        
        '<div class="rv-tools"><label class="rv-search">' + ICON.search + '<input id="rvSearch" placeholder="Search" value="' + esc(S.q || '') + '"></label>' +
        '<button class="rv-ib' + (S.filter !== 'all' || S.pmenu === 'filter' ? ' on' : '') + '" data-pmenu="filter" aria-label="Filter" title="Filter">' + ICON.filter + '</button>' +
        '<button class="rv-ib' + (S.pmenu === 'more' ? ' on' : '') + '" data-pmenu="more" aria-label="More" title="More">' + ICON.dots + '</button>' +
        (S.pmenu === 'filter' ? '<div class="rv-menu rv-pm" style="right:52px">' + [['all', 'All comments'], ['open', 'Open'], ['resolved', 'Resolved']].map(function (f) { return '<button data-filter="' + f[0] + '">' + (S.filter === f[0] ? ICON.check : '<i class="rv-sp"></i>') + f[1] + '</button>'; }).join('') + '</div>' : '') +
        (S.pmenu === 'more' ? '<div class="rv-menu rv-pm"><button id="rvCopyAll">' + ICON.copy + (S.copied ? 'Copied' : 'Copy all comments') + '</button><button id="rvFoldAll">' + ICON.chev + 'Collapse all sections</button><button id="rvUnfoldAll">' + ICON.chev + 'Expand all sections</button><button id="rvClose">' + ICON.side + 'Hide panel</button><button id="rvHide">' + ICON.eyeoff + 'Hide comments (full view)</button></div>' : '') +
        '</div><div class="rv-list">';
      if (!list.length) h += '<p class="rv-empty">' + (q ? 'No comments match your search.' : S.filter === 'resolved' ? 'Nothing resolved yet.' : 'No comments yet. Switch to “Comment” and click anything on the page.') + '</p>';
      groups.forEach(function (g) {
        g.items.sort(function (a, b) { return (b.at || 0) - (a.at || 0); });
        var fd = !q && !!S.fold[g.name];
        h += '<button type="button" class="rv-gh' + (fd ? ' fd' : '') + '" data-fold="' + esc(g.name) + '" aria-expanded="' + !fd + '" title="' + (fd ? 'Mở rộng' : 'Thu gọn') + '"><i class="rv-gchev">' + ICON.chev + '</i><span>' + esc(g.name) + '</span><em class="rv-gc">' + g.items.length + '</em></button>';
        if (fd) return;
        g.items.forEach(function (t) {
          var on = S.active === t.id, col = colorFor(t.author), nr = (t.replies || []).length, long = (t.text || '').length > 40, ex = S.expanded && S.expanded[t.id];
          h += '<div class="rv-row2' + (on ? ' on' : '') + (t.resolved ? ' done' : '') + (S.menu === t.id ? ' menu' : '') + '">' +
            '<button class="rv-row2-main" data-goto="' + t.id + '"><span class="rv-av" style="background:' + col + '">' + esc((t.author.trim()[0] || '?')) + '</span>' +
            '<span class="rv-row2-b"><span class="rv-row2-m"><span class="rv-no">#' + NUM[t.id] + '</span><b>' + esc(t.author) + '</b><span class="rv-ago">· ' + ago(t.at) + '</span>' + (t.resolved ? '' : '<i class="rv-unread" title="Open"></i>') + '</span>' +
            '<span class="rv-row2-t' + (ex ? ' ex' : '') + '">' + esc(t.text || (t.images && t.images.length ? '[image]' : '')) + '</span></span></button>' +
            (long ? '<button class="rv-sm" data-expand="' + t.id + '">' + (ex ? 'Show less' : 'Show more') + '</button>' : '') +
            (nr ? '<button class="rv-nr" data-goto="' + t.id + '">' + nr + ' ' + (nr > 1 ? 'replies' : 'reply') + '</button>' : '') +
            (unreadIn(t.id) ? '<button class="rv-new" data-goto="' + t.id + '">' + unreadIn(t.id) + ' new</button>' : '') +
            '<span class="rv-row2-acts"><button class="rv-ib sm" data-resolve="' + t.id + '" title="' + (t.resolved ? 'Reopen' : 'Resolve') + '" aria-label="' + (t.resolved ? 'Reopen' : 'Resolve') + '">' + (t.resolved ? ICON.undo : ICON.checkc) + '</button>' +
            '<button class="rv-ib sm' + (S.menu === t.id ? ' on' : '') + '" data-more="' + t.id + '" aria-label="More actions">' + ICON.dots + '</button></span>' +
            (S.menu === t.id ? '<div class="rv-menu" role="menu">' + (t.kind !== 'edit' && mine(t.author) ? '<button role="menuitem" data-popedit="' + t.id + '">' + ICON.pencil + 'Edit</button>' : '') + '<button role="menuitem" data-copyc="' + t.id + '">' + ICON.copy + 'Copy comment</button><button role="menuitem" class="danger" data-del="' + t.id + '">' + ICON.trash + 'Delete thread</button></div>' : '') +
            '</div>';
        });
      });
      h += '</div></aside>';
    }
    if (S.lightbox) h += '<div class="rv-lb" id="rvLb"><img src="' + S.lightbox + '" alt=""></div>';
    var ae = document.activeElement, keepId = ae && (ae.id === 'rvReply' || ae.id === 'rvEdit') ? ae.id : null, keepReply = keepId ? [ae.selectionStart] : null, SCR = ['.rv-list', '.rv-rail-list', '.rv-inbox'];
    S.scrollMem = S.scrollMem || {}; SCR.forEach(function (q) { var el = ui.querySelector(q); if (el) S.scrollMem[q] = el.scrollTop; });
    ui.innerHTML = h;
    SCR.forEach(function (q) { var el = ui.querySelector(q); if (el && S.scrollMem[q]) el.scrollTop = S.scrollMem[q]; });
    if (S.reveal) { var rl = ui.querySelector('.rv-list'), rb = rl && rl.querySelector('.rv-row2-main[data-goto="' + S.reveal + '"]'); if (rb) { var row = rb.closest('.rv-row2'), lr = rl.getBoundingClientRect(), rr = row.getBoundingClientRect(); if (rr.top < lr.top + 8 || rr.bottom > lr.bottom - 8) rl.scrollTop += rr.top - lr.top - (lr.height - rr.height) / 2; S.scrollMem['.rv-list'] = rl.scrollTop; } if (rl) S.reveal = null; }
    ui.querySelectorAll('.rv-sm').forEach(function (bt) { var row = bt.parentNode, tx = row.querySelector('.rv-row2-t'); if (tx && !tx.classList.contains('ex') && tx.scrollHeight <= tx.clientHeight + 2) bt.remove(); });
    if (keepReply) { var ri = ui.querySelector('#' + keepId); if (ri) { ri.focus(); try { ri.setSelectionRange(keepReply[0], keepReply[0]); } catch (e) {} } }
  }
  /* per-page comment numbers: 1, 2, 3… within each page, in the order they were posted */
  var NUM = {};
  function computeNums() { NUM = {}; var c = {}; S.threads.slice().sort(function (a, b) { return (a.at || 0) - (b.at || 0); }).forEach(function (t) { c[t.page] = (c[t.page] || 0) + 1; NUM[t.id] = c[t.page]; }); }
  function renderAll() { computeNums(); applyEdits(); computeAuthors(); checkInbox(); renderUi(); renderPins(); renderPop(); shiftFloaters(); }

  /* ---------- comment mode across documents ---------- */
  var hoverEl = null, bound = [];
  function clearHover() { if (hoverEl) { hoverEl.style.outline = hoverEl.__rvO || ''; hoverEl.style.outlineOffset = hoverEl.__rvOO || ''; hoverEl = null; } }
  function inUi(t) { return t && t.closest && t.closest('[data-review-ui]'); }
  function onMove(e) {
    var t = e.target; if (!t || t.nodeType !== 1 || inUi(t)) return clearHover();
    if (S.mode === 'edit') { t = textTarget(t); if (!t || (S.tedit && S.tedit.el === t)) return clearHover(); }
    if (hoverEl !== t) { clearHover(); hoverEl = t; t.__rvO = t.style.outline; t.__rvOO = t.style.outlineOffset; t.style.outline = '2px dashed #4f46e5'; t.style.outlineOffset = '2px'; }
  }
  function onClick(e) {
    var t = e.target; if (!t || t.nodeType !== 1 || inUi(t)) return;
    e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation(); clearHover();
    if (S.tedit && (t === S.tedit.el || S.tedit.el.contains(t))) return;   // moving the caret inside the text being edited
    if (S.mode === 'edit') { var tt = textTarget(t); if (!tt) { if (S.tedit) endTextEdit(true); return toast('Click on a piece of text'); } return startTextEdit(tt); }
    var doc = t.ownerDocument, win = doc.defaultView, r = t.getBoundingClientRect();
    S.draft = { page: ctx().key, selector: selectorFor(t), rx: r.width ? (e.clientX - r.left) / r.width : .5, ry: r.height ? (e.clientY - r.top) / r.height : .5, ax: e.clientX + win.scrollX, ay: e.clientY + win.scrollY };
    S.draftText = ''; S.draftImages = []; S.nameInput = S.name || ''; setMode(false);
    setTimeout(function () { var el = root.querySelector(S.name ? '#rvText' : '#rvName'); if (el) el.focus(); }, 30);
  }
  function onKey(e) { if (S.hidden) return; if (e.key === 'Escape') { if (S.tedit) endTextEdit(false); else if (S.mode) setMode(false); else if (S.draft) { S.draft = null; renderPins(); } else if (S.lightbox) { S.lightbox = null; renderUi(); } } }
  function bindDocs() {
    unbindDocs(); if (!S.mode) return;
    var docs = [document], c = ctx(); if (c.frame) docs.push(c.doc);
    docs.forEach(function (d) {
      d.addEventListener('mousemove', onMove, true); d.addEventListener('click', onClick, true); d.addEventListener('keydown', onKey);
      d.documentElement.style.cursor = S.mode === 'edit' ? 'text' : 'crosshair'; bound.push(d);
    });
  }
  function unbindDocs() {
    clearHover();
    bound.forEach(function (d) { try { d.removeEventListener('mousemove', onMove, true); d.removeEventListener('click', onClick, true); d.removeEventListener('keydown', onKey); d.documentElement.style.cursor = ''; } catch (e) {} });
    bound = [];
  }
  function setMode(m) { S.mode = m; if (m) S.draft = null; bindDocs(); renderAll(); }

  /* ---------- actions ---------- */
  function submitDraft() {
    if (!S.draft || (!S.draftText.trim() && !S.draftImages.length)) return;
    var n = S.name; if (!n) { n = S.nameInput.trim(); if (!n) return; S.name = n; lsSet(NAME_KEY, n); }
    var sig = 'new|' + authorKey(n) + '|' + S.draftText.trim() + '|' + S.draftImages.length, last = lastSend.split('@@');
    if (last[0] === sig && Date.now() - Number(last[1]) < 1500) return; lastSend = sig + '@@' + Date.now();
    var d = S.draft, t = { id: uid(), page: d.page, selector: d.selector, rx: d.rx, ry: d.ry, ax: d.ax, ay: d.ay, author: n, text: S.draftText.trim(), at: Date.now(), resolved: false, replies: [] };
    if (S.draftImages.length) t.images = S.draftImages.slice();
    askNotify();
    S.draft = null; S.draftImages = []; S.draftText = ''; S.active = t.id; S.pop = t.id; S.popMenu = S.popEmoji = false;
    save(S.threads.concat([t]));
    captureShot(t);
  }
  function focusThread(id) {
    var t = S.threads.filter(function (x) { return x.id === id; })[0]; if (!t) return;
    S.active = id; S.flash = id; S.pop = id; S.popMenu = S.popEmoji = false; var c = ctx();
    var el = null; try { el = t.selector ? c.doc.querySelector(t.selector) : null; } catch (e) {}
    var token = (S.focusTok = (S.focusTok || 0) + 1), userMoved = false;
    var stop = function () { userMoved = true; };
    ['wheel', 'touchstart', 'keydown'].forEach(function (ev) { addEventListener(ev, stop, { once: true, passive: true }); try { c.win !== window && c.win.addEventListener(ev, stop, { once: true, passive: true }); } catch (e) {} });
    var place = function () {
      if (el && el.isConnected && el.scrollIntoView) { try { el.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'instant' }); } catch (e) { el.scrollIntoView({ block: 'center' }); } }
      else { try { c.win.scrollTo({ top: Math.max(0, t.ay - c.win.innerHeight / 2), behavior: 'instant' }); } catch (e) { c.win.scrollTo(0, Math.max(0, t.ay - c.win.innerHeight / 2)); } }
    };
    place();
    // late layout shifts (lazy images, reveal animations): re-center once if the target drifted
    [450, 1200].forEach(function (ms) { setTimeout(function () { if (userMoved || S.focusTok !== token) return; var p = pos(t, ctx()); if (Math.abs(p.y - innerHeight / 2) > 80) { place(); renderPins(); } }, ms); });
    if (el) { el.__rvF = el.style.outline; el.style.outline = '3px solid ' + colorFor(t.author); el.style.outlineOffset = '3px'; }
    renderAll();
    setTimeout(function () { if (el) { el.style.outline = el.__rvF || ''; el.style.outlineOffset = ''; } if (S.flash === id) { S.flash = null; renderPins(); } }, 2600);
  }
  function goTo(id) {
    var t = S.threads.filter(function (x) { return x.id === id; })[0]; if (!t) return;
    S.active = id; S.reveal = id; markSeen(id); S.expanded = {}; S.expanded[id] = true; S.menu = null;
    if (ctx().key === t.page) return focusThread(id);
    if (t.page.indexOf('site:') === 0) { location.hash = '#' + t.page.slice(5); }
    else {
      var f = t.page.slice(8), file = f.split('#')[0], hash = f.indexOf('#') >= 0 ? f.slice(f.indexOf('#')) : '';
      var route = file === 'job.html' ? '/tuyen-dung/' + hash.slice(1) : (CAREER_ROUTE[file] || '/tuyen-dung');
      var fr = frameEl(), grp = function (r) { return r.indexOf('/dich-vu') === 0 ? 'dv' : r.indexOf('/tuyen-dung') === 0 ? 'td' : ''; };
      if (fr && grp(topRoute()) === grp(route)) fr.contentWindow.location.href = './' + file + hash;
      else location.hash = '#' + route;
    }
    var tries = 0, iv = setInterval(function () {
      tries++; var c = ctx(), ready = c.key === t.page && c.doc.readyState === 'complete';
      if (ready || tries > 40) { clearInterval(iv); if (ready) setTimeout(function () { focusThread(id); }, 500); }
    }, 200);
    renderAll();
  }
  function copyText(text, done) {
    var ok = function () { done && done(); };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(ok, function () { fallbackCopy(text); ok(); });
    else { fallbackCopy(text); ok(); }
  }
  function fallbackCopy(text) { var ta = document.createElement('textarea'); ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0'; document.body.appendChild(ta); ta.select(); try { document.execCommand('copy'); } catch (e) {} ta.remove(); }
  function exportAll() {
    computeNums();
    return S.threads.slice().sort(function (a, b) { return a.page < b.page ? -1 : a.page > b.page ? 1 : (NUM[a.id] || 0) - (NUM[b.id] || 0); }).map(function (t) {
      return labelFor(t.page) + ' #' + NUM[t.id] + ' [' + (t.resolved ? 'resolved' : 'open') + '] page: ' + labelFor(t.page) + ' (' + t.page + ') | element: ' + t.selector + '\n  ' + t.author + ': ' + t.text +
        (t.images && t.images.length ? '\n  (' + t.images.length + ' image(s) attached — see the comments panel)' : '') +
        (t.replies || []).map(function (r) { return '\n    ↳ ' + r.author + ': ' + r.text; }).join('');
    }).join('\n\n');
  }
  function addImages(files) {
    var room = MAX_IMAGES - S.draftImages.length, list = Array.prototype.filter.call(files || [], function (f) { return /^image\//.test(f.type); }).slice(0, Math.max(0, room));
    Promise.all(list.map(function (f) { return compressImage(f).catch(function () { return null; }); })).then(function (out) {
      out = out.filter(Boolean); if (!out.length) return; S.draftImages = S.draftImages.concat(out).slice(0, MAX_IMAGES); renderPins();
    });
  }
  function saveEdit(id) {
    var text = S.editText.trim(), te0 = S.threads.filter(function (x) { return x.id === id; })[0]; if (!text || !te0 || te0.kind === 'edit' || !mine(te0.author)) { S.editing = null; return renderAll(); }
    S.editing = null;
    save(S.threads.map(function (t) { return t.id === id ? Object.assign({}, t, { text: text, edited: Date.now(), editedBy: S.name || '' }) : t; }));
  }
  function saveRepEdit(key) {
    var p = String(key || '').split('|'), text = S.editText.trim(); S.editRep = null;
    if (!text) return renderAll();
    save(S.threads.map(function (t) { return t.id !== p[0] ? t : Object.assign({}, t, { replies: (t.replies || []).map(function (r) { return r.id === p[1] && mine(r.author) ? Object.assign({}, r, { text: text, edited: Date.now(), editedBy: S.name || '' }) : r; }) }); }));
  }
  function addReply(id) {
    var text = S.replyText.trim(); if (!text || !S.name) return;
    var sig = id + '|' + authorKey(S.name) + '|' + text, now = Date.now(), last = lastSend.split('@@');
    if (last[0] === sig && now - Number(last[1]) < 1500) return; lastSend = sig + '@@' + now;
    S.replyText = ''; S.replyFor = null; askNotify();
    save(S.threads.map(function (t) { return t.id === id ? Object.assign({}, t, { replies: (t.replies || []).concat([{ id: uid(), author: S.name, text: text, at: now }]) }) : t; }));
  }

  /* ---------- events on our own UI ---------- */
  root.addEventListener('click', function (e) {
    if ((S.menu || S.pmenu) && !e.target.closest('.rv-menu,.rv-inbox,[data-more],[data-pmenu]')) { S.menu = null; S.pmenu = null; renderUi(); }
    var a0, b = e.target.closest('button,[data-lb],#rvLb'); if (!b) return;
    if (b.id === 'rvLb') { S.lightbox = null; return renderUi(); }
    if (b.hasAttribute('data-lb')) { e.stopPropagation(); S.lightbox = b.getAttribute('src'); return renderUi(); }
    if (b.id === 'rvBrowse') { S.draft = null; if (S.tedit) endTextEdit(true); return setMode(false); }
    if (b.id === 'rvComment') { S.draft = null; if (S.tedit) endTextEdit(true); return setMode(true); }
    if (b.id === 'rvEditMode') { S.draft = null; if (S.tedit) endTextEdit(true); return setMode(S.mode === 'edit' ? false : 'edit'); }
    if (b.id === 'rvTSave') return endTextEdit(true);
    if (b.id === 'rvTCancel') return endTextEdit(false);
    if (b.id === 'rvTab') { S.open = true; renderUi(); return shiftFloaters(); }
    if ((a0 = b.getAttribute('data-rail'))) { S.open = true; return goTo(a0); }
    if (b.id === 'rvHide') { S.hidden = true; lsSet(HIDE_KEY, '1'); S.open = false; S.pmenu = null; S.pop = null; S.draft = null; S.mode = false; bindDocs(); renderAll(); return shiftFloaters(); }
    if (b.id === 'rvShow') { S.hidden = false; lsSet(HIDE_KEY, ''); S.open = true; renderAll(); return shiftFloaters(); }
    if (b.id === 'rvClose') { S.open = false; S.pmenu = null; renderUi(); return shiftFloaters(); }
    if (b.id === 'rvCancel') { S.draft = null; return renderPins(); }
    if (b.id === 'rvSend') return submitDraft();
    if (b.id === 'rvImg') return fileIn.click();
    if (b.id === 'rvCopyAll') return copyText(exportAll(), function () { S.copied = true; renderUi(); setTimeout(function () { S.copied = false; renderUi(); }, 1800); });
    if (b.id === 'rvReadAll') { markSeen(); S.pmenu = null; return renderAll(); }
    if ((a0 = b.getAttribute('data-inbox'))) { S.pmenu = null; S.open = true; goTo(a0); return shiftFloaters(); }
    var a;
    if ((a = b.getAttribute('data-rmimg')) != null) { S.draftImages.splice(+a, 1); return renderPins(); }
    if ((a = b.getAttribute('data-pin'))) { markSeen(a); S.active = a; S.pop = S.pop === a ? null : a; S.popMenu = S.popEmoji = false; S.popReply = ''; return renderAll(); }
    if (b.hasAttribute('data-nextopen')) { var op = S.threads.filter(function (t) { return !t.resolved; }).sort(function (x, y) { return (y.at || 0) - (x.at || 0); }); if (!op.length) return; var ci = -1; op.forEach(function (t, i) { if (t.id === S.active) ci = i; }); if (S.filter === 'resolved') S.filter = 'open'; return goTo(op[(ci + 1) % op.length].id); }
    if ((a = b.getAttribute('data-filter'))) { S.filter = a; S.pmenu = null; return renderUi(); }
    if ((a = b.getAttribute('data-pmenu'))) { S.pmenu = S.pmenu === a ? null : a; S.menu = null; return renderUi(); }
    if ((a = b.getAttribute('data-fold')) != null) { if (S.fold[a]) delete S.fold[a]; else S.fold[a] = 1; lsSet('rv_fold', JSON.stringify(S.fold)); return renderUi(); }
    if (b.id === 'rvFoldAll' || b.id === 'rvUnfoldAll') { var fa = b.id === 'rvFoldAll'; S.fold = {}; if (fa) S.threads.forEach(function (t) { S.fold[labelFor(t.page)] = 1; }); lsSet('rv_fold', JSON.stringify(S.fold)); S.pmenu = null; return renderUi(); }
    if ((a = b.getAttribute('data-expand'))) { var wasEx = !!S.expanded[a]; S.expanded = {}; if (!wasEx) { S.expanded[a] = true; S.active = a; } S.menu = null; return renderUi(); }
    if ((a = b.getAttribute('data-goto'))) return goTo(a);
    if ((a = b.getAttribute('data-copy1'))) { var t1 = S.threads.filter(function (x) { return x.id === a; })[0]; return t1 && copyText(t1.text, function () { S.copiedId = a; renderUi(); setTimeout(function () { if (S.copiedId === a) { S.copiedId = null; renderUi(); } }, 1600); }); }
    if ((a = b.getAttribute('data-replyfor'))) { S.replyFor = S.replyFor === a ? null : a; S.replyText = ''; renderUi(); var ri = root.querySelector('#rvReply'); if (ri) ri.focus(); return; }
    if ((a = b.getAttribute('data-resolve'))) { S.reveal = a; S.active = a; } if (a) return save(S.threads.map(function (t) { return t.id === a ? Object.assign({}, t, { resolved: !t.resolved }) : t; }));
    if ((a = b.getAttribute('data-del'))) { S.menu = null; if (S.pop === a) S.pop = null; return save(S.threads.filter(function (t) { return t.id !== a; })); }
    if ((a = b.getAttribute('data-popedit')) && !pop.contains(b)) { var tp = findT(a); S.menu = null; if (!tp || tp.kind === 'edit' || !mine(tp.author)) return renderUi(); S.active = a; S.editing = a; S.editWhere = 'pop'; S.editText = tp.text; goTo(a); setTimeout(function () { S.editing = a; S.editWhere = 'pop'; renderPop(); var ed = pop.querySelector('#rvPopEdit'); if (ed) ed.focus(); }, 900); return; }
    if ((a = b.getAttribute('data-copyc'))) { var tc = findT(a); S.menu = null; renderUi(); return tc && copyText(tc.text, function () { toast('Copied'); }); }
    if ((a = b.getAttribute('data-more'))) { S.menu = S.menu === a ? null : a; return renderUi(); }
    if ((a = b.getAttribute('data-edit'))) { var te = S.threads.filter(function (x) { return x.id === a; })[0]; if (!te || te.kind === 'edit' || !mine(te.author)) { S.menu = null; return renderUi(); } S.menu = null; S.editing = a; S.editWhere = 'panel'; S.editText = te ? te.text : ''; S.active = a; renderUi(); var ed = root.querySelector('#rvEdit'); if (ed) { ed.focus(); ed.setSelectionRange(ed.value.length, ed.value.length); } return; }
    if (b.hasAttribute('data-editcancel')) { S.editing = null; return renderAll(); }
    if ((a = b.getAttribute('data-editsave'))) return saveEdit(a);
    if ((a = b.getAttribute('data-react'))) {
      if (!S.name) return; var p = a.split('|'), me = authorKey(S.name);
      return save(S.threads.map(function (t) {
        if (t.id !== p[0]) return t; var cur = (t.reactions && t.reactions[p[1]]) || [];
        var next = cur.some(function (n) { return authorKey(n) === me; }) ? cur.filter(function (n) { return authorKey(n) !== me; }) : cur.concat([S.name]);
        var rx = Object.assign({}, t.reactions); rx[p[1]] = next; return Object.assign({}, t, { reactions: rx });
      }));
    }
  });
  root.addEventListener('input', function (e) {
    var t = e.target;
    if (t.id === 'rvTEdit') { S.teditText = t.value; if (S.tedit) { writeText(S.tedit.el, t.value); var w = root.querySelector('.rv-was'); if (w) w.textContent = normT(S.tedit.from) !== normT(t.value) ? 'Original: ' + normT(S.tedit.from) : 'Enter to save · Shift+Enter for a new line'; } return; }
    if (t.id === 'rvText') { S.draftText = t.value; syncSend(); }
    else if (t.id === 'rvName') { S.nameInput = t.value; syncSend(); }
    else if (t.id === 'rvReply') S.replyText = t.value;
    else if (t.id === 'rvSearch') { S.q = t.value; var pos0 = t.selectionStart; renderUi(); var si = root.querySelector('#rvSearch'); if (si) { si.focus(); si.setSelectionRange(pos0, pos0); } }
    else if (t.id === 'rvEdit') S.editText = t.value;
  });
  root.addEventListener('keydown', function (e) {
    var t = e.target;
    if (t.id === 'rvReply' && e.key === 'Enter' && !e.isComposing && !e.repeat) { e.preventDefault(); addReply(t.getAttribute('data-for')); }
    if (t.id === 'rvText' && e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); submitDraft(); }
    if (t.id === 'rvName' && S.tedit && e.key === 'Enter') { e.preventDefault(); endTextEdit(true); }
    if (t.id === 'rvTEdit' && e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); endTextEdit(true); }
    if (t.id === 'rvTEdit' && e.key === 'Escape') { e.preventDefault(); endTextEdit(false); }
    if (t.id === 'rvEdit' && e.key === 'Enter' && !e.shiftKey && !e.isComposing) { e.preventDefault(); saveEdit(t.getAttribute('data-for')); }
    if (t.id === 'rvEdit' && e.key === 'Escape') { S.editing = null; renderUi(); }
    e.stopPropagation();
  });
  root.addEventListener('paste', function (e) {
    if (e.target.id !== 'rvText') return;
    var imgs = Array.prototype.filter.call(e.clipboardData.files || [], function (f) { return /^image\//.test(f.type); });
    if (imgs.length) { e.preventDefault(); addImages(imgs); }
  });
  fileIn.addEventListener('change', function () { addImages(fileIn.files); fileIn.value = ''; });
  document.addEventListener('keydown', onKey);
  setInterval(function () { try { applyEdits(); } catch (e) {} }, 900);

  /* ---------- keep pins in place ---------- */
  var raf = 0, lastFrameDoc = null;
  function tick() { if (raf) return; raf = requestAnimationFrame(function () { raf = 0; renderPins(); }); }
  addEventListener('scroll', tick, { passive: true }); addEventListener('resize', tick); addEventListener('hashchange', function () { S.draft = null; setTimeout(function () { bindDocs(); renderAll(); }, 400); });
  setInterval(function () {
    var c = ctx();
    if (c.frame && c.doc !== lastFrameDoc) { // a new page loaded inside the embedded frame
      lastFrameDoc = c.doc;
      try { c.win.addEventListener('scroll', tick, { passive: true }); c.win.addEventListener('resize', tick); c.doc.addEventListener('keydown', onKey); } catch (e) {}
      if (S.mode) bindDocs();
      try { c.win.addEventListener('load', function () { shiftFloaters(true); }); } catch (e) {}
      setTimeout(function () { shiftFloaters(true); }, 700);
    }
    if (!c.frame) lastFrameDoc = null;
    renderPins(); shiftFloaters();
  }, 600);


  /* ---------- push the site's own floating buttons (chat bubble, back-to-top…) clear of the rail / panel ---------- */
  var fixedCache = [], fixedAt = 0, fixedDocs = null;
  function findFloaters(doc, win) {
    var out = [], all = doc.body ? doc.body.getElementsByTagName('*') : [];
    for (var i = 0; i < all.length; i++) {
      var el = all[i]; if (el.closest && el.closest('[data-review-ui]')) continue;
      var cs = win.getComputedStyle(el); if (cs.position !== 'fixed' || cs.display === 'none') continue;
      var r = el.getBoundingClientRect(); if (!r.width || r.width > 260) continue;     // skip full-width bars like the header
      if (r.right < win.innerWidth - 140) continue;                                       // only things hugging the right edge
      out.push(el);
    }
    return out;
  }
  function shiftFloaters(force) {
    var c = ctx(), docs = [[document, window]]; if (c.frame) docs.push([c.doc, c.win]);
    var key = docs.map(function (d) { return d[0].URL; }).join('|');
    if (force || key !== fixedDocs || Date.now() - fixedAt > 1500) {
      fixedCache.forEach(function (el) { if (!el.isConnected) return; el.style.translate = ''; });
      fixedCache = []; docs.forEach(function (d) { try { fixedCache = fixedCache.concat(findFloaters(d[0], d[1])); } catch (e) {} });
      fixedAt = Date.now(); fixedDocs = key;
    }
    var hidden = root.style.display === 'none' || S.hidden, mobile = innerWidth <= 640;
    var off = hidden ? 0 : S.open ? (mobile ? 0 : Math.min(370, innerWidth)) : (mobile ? 0 : 54);
    fixedCache.forEach(function (el) {
      if (!el.__rvT) { el.__rvT = 1; el.style.transition = (el.style.transition ? el.style.transition + ',' : '') + 'translate .25s ease'; }
      el.style.translate = off ? (-off) + 'px 0' : '';
    });
  }

  /* ---------- comment popover (Figma-style card next to the pin) ---------- */
  var pop = document.createElement('div'); pop.className = 'rv-popwrap'; root.appendChild(pop);
  function mine(t) { return !!S.name && authorKey(t.author) === authorKey(S.name); }
  function findT(id) { return S.threads.filter(function (x) { return x.id === id; })[0]; }
  function avatar(name, size) { var c = colorFor(name || '?'); return '<span class="rv-av" style="background:' + c + ';width:' + size + 'px;height:' + size + 'px">' + esc(((name || '?').trim()[0] || '?')) + '</span>'; }
  var EMOJIS = ['😀','😂','😍','🤔','😅','😊','🥰','😎','🙏','👍','👎','❤️','🔥','✅','⭐','💡','🎉','🚀','💯','🤝','👏','💪','🙌','😭','🤣','😬','🫡','🤩','😤','😩','😮','🥳'];
  function renderPop() {
    var t = S.pop && findT(S.pop);
    if (!t || ctx().key !== t.page) { if (pop.innerHTML) pop.innerHTML = ''; return; }
    var shot = t.shot || (t.images && t.images[0]), more = (t.images || []).slice(t.shot ? 0 : 1);
    var reacts = REACTIONS.map(function (r) { var who = (t.reactions && t.reactions[r[0]]) || []; if (!who.length) return '';
      var mine = !!S.name && who.some(function (n) { return authorKey(n) === authorKey(S.name); });
      return '<button class="rv-react' + (mine ? ' on' : '') + '" data-react="' + t.id + '|' + r[0] + '" title="' + esc(r[1] + ': ' + who.join(', ')) + '">' + ICON[r[0]] + '<span>' + who.length + '</span></button>'; }).join('');
    var editing = S.editing === t.id && S.editWhere === 'pop';
    var row = function (name, at, text, extra, ed, tool) { return '<div class="rv-pop-c">' + avatar(name, 26) + '<div class="rv-pop-cb"><div class="rv-pop-meta"><b>' + esc(name) + '</b><span>' + ago(at) + (ed ? ' · đã sửa' : '') + '</span>' + (tool || '') + '</div>' + (text != null ? '<p>' + esc(text) + '</p>' : '') + (extra || '') + '</div></div>'; };
    var h = '<div class="rv-pop" role="dialog" aria-label="Comment">' +
      '<div class="rv-pop-h"><span class="rv-pop-ttl"><b>Comment #' + NUM[t.id] + '</b><span class="rv-pop-pg" title="' + esc(labelFor(t.page)) + '"><svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/></svg>' + esc(labelFor(t.page)) + '</span></span><span class="rv-pop-tools">' +
        (t.kind !== 'edit' && mine(t.author) ? '<button data-popedit="' + t.id + '" aria-label="Edit" title="Edit">' + ICON.pencil + '</button>' : '') +
        '<button data-copyc="' + t.id + '" aria-label="Copy comment" title="Copy comment">' + ICON.copy + '</button>' +
        '<button data-resolve="' + t.id + '" class="' + (t.resolved ? 'ok' : '') + '" aria-label="' + (t.resolved ? 'Reopen' : 'Resolve') + '" title="' + (t.resolved ? 'Reopen' : 'Resolve') + '">' + (t.resolved ? ICON.checkf : ICON.checkc) + '</button>' +
        '<button data-del="' + t.id + '" class="del" aria-label="Delete" title="Delete">' + ICON.trash + '</button>' +
        '<button data-popclose aria-label="Close" title="Close">' + ICON.x + '</button></span></div>' +
      '<div class="rv-pop-body">' +
      (shot ? '<img class="rv-pop-shot" src="' + shot + '" alt="Snapshot" data-lb>' : '') +
      row(t.author, t.at, editing ? null : t.text,
        (editing ? '<div class="rv-edit" style="margin:6px 0 0"><textarea class="rv-in" id="rvPopEdit" data-for="' + t.id + '">' + esc(S.editText) + '</textarea><div class="rv-row" style="justify-content:flex-end"><button class="rv-btn ghost" data-editcancel>Cancel</button><button class="rv-btn pri" data-editsave="' + t.id + '">Save</button></div></div>' : '') +
        (more.length ? '<div class="rv-imgs">' + more.map(function (src) { return '<img src="' + src + '" alt="Attachment" data-lb>'; }).join('') + '</div>' : '') +
        '<div class="rv-reacts">' + REACTIONS.map(function (r) { var who = (t.reactions && t.reactions[r[0]]) || [], me = !!S.name && who.some(function (n) { return authorKey(n) === authorKey(S.name); });
          return '<button class="rv-react' + (me ? ' on' : '') + '" data-react="' + t.id + '|' + r[0] + '"' + (S.name ? '' : ' disabled') + ' title="' + esc(S.name ? (who.length ? r[1] + ': ' + who.join(', ') : r[1]) : 'Add a comment first to set your name') + '">' + ICON[r[0]] + (who.length ? '<span>' + who.length + '</span>' : '') + '</button>'; }).join('') + '</div>', !!t.edited) +
      (t.replies || []).map(function (r) { var er = S.editRep === t.id + '|' + r.id;
        return row(r.author, r.at || t.at, er ? null : r.text,
          er ? '<div class="rv-edit" style="margin:6px 0 0"><textarea class="rv-in" id="rvRepEdit" data-for="' + t.id + '|' + r.id + '">' + esc(S.editText) + '</textarea><div class="rv-row" style="justify-content:flex-end"><button class="rv-btn ghost" data-repcancel>Cancel</button><button class="rv-btn pri" data-repsave="' + t.id + '|' + r.id + '">Save</button></div></div>' : '',
          !!r.edited, er || !mine(r.author) ? '' : '<button class="rv-rep-ed" data-repedit="' + t.id + '|' + r.id + '" aria-label="Edit reply" title="Edit">' + ICON.pencil + '</button>'); }).join('') +
      '</div>' +
      '<div class="rv-pop-f">' + avatar(S.name || S.nameInput || '?', 26) + '<div class="rv-pop-box">' +
        (!S.name ? '<input class="rv-pop-in" id="rvPopName" placeholder="Your name" value="' + esc(S.nameInput) + '">' : '') +
        '<textarea class="rv-pop-in" id="rvPopReply" rows="1" placeholder="Reply">' + esc(S.popReply) + '</textarea>' +
        '<div class="rv-pop-tb"><button data-popemoji class="rv-pop-emo' + (S.popEmoji ? ' on' : '') + '" aria-label="Emoji" title="Emoji">' + ICON.smileplus + '</button><button data-popsend="' + t.id + '" class="rv-pop-send" aria-label="Send reply"' + (S.popReply.trim() && (S.name || S.nameInput.trim()) ? '' : ' disabled') + '>' + ICON.up + '</button></div>' +
      '</div></div>' +
      (S.popEmoji ? '<div class="rv-emo" role="listbox" aria-label="Emoji">' + EMOJIS.map(function (em) { return '<button data-emoji="' + em + '">' + em + '</button>'; }).join('') + '</div>' : '') +
      '</div>';
    var ae = document.activeElement, keep = ae && pop.contains(ae) && ae.id ? [ae.id, ae.selectionStart, ae.selectionEnd] : null, sc = pop.querySelector('.rv-pop-body'), st = sc ? sc.scrollTop : 0;
    pop.innerHTML = h;
    var sc2 = pop.querySelector('.rv-pop-body'); if (sc2) sc2.scrollTop = st;
    if (keep) { var el = pop.querySelector('#' + keep[0]); if (el) { el.focus(); try { el.setSelectionRange(keep[1], keep[2]); } catch (e) {} } }
    autoGrow(pop.querySelector('#rvPopReply')); placePop();
  }
  function autoGrow(ta) { if (!ta) return; ta.style.height = 'auto'; ta.style.height = Math.min(120, ta.scrollHeight) + 'px'; }
  function placePop() {
    var card = pop.firstChild, t = S.pop && findT(S.pop); if (!card || !t) return;
    var c = ctx(); if (c.key !== t.page) { pop.innerHTML = ''; return; }
    var p = pos(t, c), w = card.offsetWidth, hh = card.offsetHeight, vw = innerWidth, vh = innerHeight;
    var left = p.x + 22; if (left + w > vw - 12) left = p.x - w - 22; left = Math.max(12, Math.min(left, vw - w - 12));
    var top = Math.max(12, Math.min(p.y - 40, vh - hh - 12));
    card.style.left = left + 'px'; card.style.top = top + 'px';
  }
  function sendPopReply(id) {
    var text = S.popReply.trim(); if (!text) return;
    if (!S.name) { var n = S.nameInput.trim(); if (!n) { var ni = pop.querySelector('#rvPopName'); if (ni) ni.focus(); return; } S.name = n; lsSet(NAME_KEY, n); }
    var now = Date.now(); S.popReply = ''; S.popEmoji = false;
    save(S.threads.map(function (t) { return t.id === id ? Object.assign({}, t, { replies: (t.replies || []).concat([{ id: uid(), author: S.name, text: text, at: now }]) }) : t; }));
    setTimeout(function () { var b = pop.querySelector('.rv-pop-body'); if (b) b.scrollTop = b.scrollHeight; }, 30);
  }
  pop.addEventListener('click', function (e) {
    var b = e.target.closest('button');
    if (S.popEmoji && !e.target.closest('.rv-emo') && !(b && b.hasAttribute('data-popemoji'))) { S.popEmoji = false; renderPop(); if (!b) return; }
    if (!b) return; var a;
    if (b.hasAttribute('data-popclose')) { S.pop = null; S.popMenu = S.popEmoji = false; return renderAll(); }
    if (b.hasAttribute('data-popmore')) { S.popMenu = !S.popMenu; return renderPop(); }
    if (b.hasAttribute('data-popemoji')) { S.popEmoji = !S.popEmoji; return renderPop(); }
    if ((a = b.getAttribute('data-popsend'))) return sendPopReply(a);
    if ((a = b.getAttribute('data-emoji'))) { S.popReply += a; S.popEmoji = false; renderPop(); var ri = pop.querySelector('#rvPopReply'); if (ri) { ri.focus(); ri.setSelectionRange(ri.value.length, ri.value.length); } return; }
    if (b.hasAttribute('data-popedit') || b.hasAttribute('data-repedit') || b.hasAttribute('data-repsave') || b.hasAttribute('data-repcancel')) e.stopPropagation();   // handled here; the card re-renders and must not re-trigger the panel handler
    if ((a = b.getAttribute('data-popedit'))) { var t = findT(a); if (!t || t.kind === 'edit' || !mine(t.author)) return; S.pop = a; S.popMenu = false; S.editRep = null; S.editing = a; S.editWhere = 'pop'; S.editText = t ? t.text : ''; renderPop(); var ed = pop.querySelector('#rvPopEdit'); if (ed) { ed.focus(); ed.setSelectionRange(ed.value.length, ed.value.length); } return; }
    if ((a = b.getAttribute('data-repedit'))) { var p0 = a.split('|'), tr = findT(p0[0]), rr = tr && (tr.replies || []).filter(function (x) { return x.id === p0[1]; })[0]; if (!rr || !mine(rr.author)) return; S.editing = null; S.editRep = a; S.editText = rr.text || ''; renderPop(); var re = pop.querySelector('#rvRepEdit'); if (re) { re.focus(); re.setSelectionRange(re.value.length, re.value.length); } return; }
    if (b.hasAttribute('data-repcancel')) { S.editRep = null; return renderPop(); }
    if ((a = b.getAttribute('data-repsave'))) return saveRepEdit(a);
    if ((a = b.getAttribute('data-copyc'))) { var tc = findT(a); S.popMenu = false; renderPop(); if (tc) copyText(tc.text, function () { toast('Copied'); }); e.stopPropagation(); return; }
    if (b.hasAttribute('data-del') || b.hasAttribute('data-resolve')) S.popMenu = false;
  });
  pop.addEventListener('input', function (e) {
    var t = e.target;
    if (t.id === 'rvPopReply') { S.popReply = t.value; autoGrow(t); var sb = pop.querySelector('.rv-pop-send'); if (sb) sb.disabled = !(S.popReply.trim() && (S.name || S.nameInput.trim())); }
    else if (t.id === 'rvPopName') { S.nameInput = t.value; var sb2 = pop.querySelector('.rv-pop-send'); if (sb2) sb2.disabled = !(S.popReply.trim() && S.nameInput.trim()); }
    else if (t.id === 'rvPopEdit' || t.id === 'rvRepEdit') S.editText = t.value;
  });
  pop.addEventListener('keydown', function (e) {
    var t = e.target;
    if (t.id === 'rvPopReply' && e.key === 'Enter' && !e.shiftKey && !e.isComposing) { e.preventDefault(); var tid = S.pop; if (tid) sendPopReply(tid); }
    if (t.id === 'rvPopEdit' && e.key === 'Enter' && !e.shiftKey && !e.isComposing) { e.preventDefault(); saveEdit(t.getAttribute('data-for')); }
    if (t.id === 'rvRepEdit' && e.key === 'Enter' && !e.shiftKey && !e.isComposing) { e.preventDefault(); return saveRepEdit(t.getAttribute('data-for')); }
    if (e.key === 'Escape' && S.editRep) { S.editRep = null; return renderPop(); }
    if (e.key === 'Escape') { if (S.editing) { S.editing = null; renderPop(); } else { S.pop = null; renderAll(); } }
  });
  // close the card when clicking elsewhere on the page (not while commenting)
  function outside(e) { if (!S.pop || S.mode) return; var t = e.target; if (t && t.closest && (t.closest('[data-review-ui]'))) return; if (t && t.ownerDocument === document && root.contains(t)) return; S.pop = null; S.popMenu = S.popEmoji = false; renderPop(); }
  document.addEventListener('mousedown', outside, true);

  /* ---------- snapshot of the commented area (shown at the top of the card) ---------- */
  var msLoad = null;
  function loadShooter() {
    if (window.modernScreenshot) return Promise.resolve(window.modernScreenshot);
    if (msLoad) return msLoad;
    msLoad = new Promise(function (res, rej) { var sc = document.createElement('script'); sc.src = BASE + 'modern-screenshot.min.js'; sc.onload = function () { res(window.modernScreenshot); }; sc.onerror = rej; document.head.appendChild(sc); });
    return msLoad;
  }
  function captureShot(t) {
    var c = ctx(); if (c.key !== t.page) return;
    var doc = c.doc, win = c.win, cx = t.ax - win.scrollX, cy = t.ay - win.scrollY, el = null;
    try { el = t.selector ? doc.querySelector(t.selector) : null; } catch (e) {}
    if (!el) el = doc.elementFromPoint(cx, cy); if (!el) return;
    var hasBg = function (e) { var cs = win.getComputedStyle(e); if (cs.backgroundImage !== 'none') return true; var bc = cs.backgroundColor; return !(bc === 'transparent' || /rgba\(.*,\s*0\)$/.test(bc)); };
    // climb to the nearest block that carries its own background, so the crop looks like the page
    while (el.parentElement && el !== doc.body) { var r0 = el.getBoundingClientRect(); if (hasBg(el) && r0.height >= 180 && r0.width >= win.innerWidth * 0.5) break; el = el.parentElement; }
    loadShooter().then(function (ms) {
      var rr = el.getBoundingClientRect(), W = Math.min(760, win.innerWidth, rr.width), H = Math.round(W / 2), k = 560 / W;
      return ms.domToCanvas(el, { scale: k, backgroundColor: '#ffffff', timeout: 5000,
        filter: function (n) { return !(n.tagName === 'VIDEO' || n.tagName === 'IFRAME' || (n.hasAttribute && n.hasAttribute('data-review-ui'))); } })
        .then(function (cv) {
          var px = cx - rr.left, py = cy - rr.top, x = Math.max(0, Math.min(px - W / 2, rr.width - W)), y = Math.max(0, Math.min(py - H / 2, rr.height - H));
          var out = document.createElement('canvas'); out.width = 560; out.height = 280; var g = out.getContext('2d');
          g.fillStyle = '#fff'; g.fillRect(0, 0, 560, 280); g.drawImage(cv, x * k, y * k, W * k, H * k, 0, 0, 560, 280);
          var mx = (px - x) * k, my = (py - y) * k, col = colorFor(t.author);   // mark where the comment was left
          g.fillStyle = col; g.strokeStyle = '#fff'; g.lineWidth = 3; g.beginPath(); g.arc(mx, my - 12, 10, 0, Math.PI * 2); g.fill(); g.stroke();
          var url = out.toDataURL('image/jpeg', 0.72);
          save(S.threads.map(function (x2) { return x2.id === t.id ? Object.assign({}, x2, { shot: url }) : x2; }));
          if (S.pop === t.id) renderPop();
        });
    }).catch(function () {});
  }

  /* ---------- Desktop / Tablet / Mobile preview (review only) ---------- */
  (function deviceSwitcher() {
    if (window.name === 'ree-device') return;           // already inside the device frame
    var W = { tablet: 820, mobile: 390 }, mode = 'desktop', box = null, frame = null;
    var dcss = '.rv-dev{position:fixed;left:12px;bottom:14px;z-index:2147482600;display:flex;gap:6px;padding:6px;border-radius:999px;background:rgba(255,255,255,.88);box-shadow:0 4px 16px rgba(0,0,0,.18);backdrop-filter:blur(8px)}' +
      '.rv-dev button,.rv-devbar button{height:32px;padding:0 14px;border-radius:999px;font-size:13px;font-weight:600;color:#1e293b;background:#fff;box-shadow:0 1px 4px rgba(0,0,0,.12);white-space:nowrap}' +
      '.rv-dev button:hover,.rv-devbar button:hover{background:#f8fafc}.rv-dev button.on,.rv-devbar button.on{background:#306eed;color:#fff}' +
      '.rv-devwrap{position:fixed;inset:0;z-index:2147483100;background:#e6ebf3;display:flex;flex-direction:column}' +
      '.rv-devbar{flex:none;height:56px;display:flex;align-items:center;justify-content:center;gap:8px;background:rgba(255,255,255,.8);backdrop-filter:blur(8px);box-shadow:0 1px 0 rgba(15,23,42,.06)}' +
      '.rv-devstage{flex:1;min-height:0;display:flex;justify-content:center;padding:12px 12px 14px;overflow:auto}' +
      '.rv-devstage iframe{height:100%;max-width:100%;border:8px solid #1e293b;border-radius:28px;background:#fff;box-shadow:0 20px 50px rgba(15,40,90,.25)}' +
      '@media (max-width:1024px){.rv-dev{padding:4px;gap:4px;left:8px;bottom:10px}.rv-dev button,.rv-devbar button{height:28px;padding:0 11px;font-size:12px}.rv-devbar{height:46px;gap:6px}}' +
      '@media (max-width:768px){.rv-dev{display:none}}';
    var st = document.createElement('style'); st.textContent = dcss; document.head.appendChild(st);
    var bar = document.createElement('div'); bar.className = 'rv rv-dev'; bar.setAttribute('data-review-ui', '');
    var tabs = function () { return [['desktop', 'Desktop'], ['tablet', 'Tablet'], ['mobile', 'Mobile']].map(function (t) { return '<button type="button" data-dev="' + t[0] + '" class="' + (mode === t[0] ? 'on' : '') + '" aria-pressed="' + (mode === t[0]) + '">' + t[1] + '</button>'; }).join(''); };
    function draw() { bar.innerHTML = tabs(); if (box) box.querySelector('.rv-devbar').innerHTML = tabs(); }
    function pick(m) {
      if (m === mode) return;
      if (m === 'desktop') {
        var h = ''; try { h = frame.contentWindow.location.hash; } catch (e) {}
        if (box) { box.remove(); box = frame = null; }
        document.documentElement.style.overflow = ''; root.style.display = ''; bar.style.display = '';
        mode = 'desktop'; draw();
        if (h && h !== location.hash) location.hash = h;
        return;
      }
      if (!box) {
        box = document.createElement('div'); box.className = 'rv rv-devwrap'; box.setAttribute('data-review-ui', '');
        box.innerHTML = '<div class="rv-devbar"></div><div class="rv-devstage"><iframe name="ree-device" title="Device preview"></iframe></div>';
        frame = box.querySelector('iframe');
        frame.src = location.pathname + location.search + location.hash;
        document.body.appendChild(box);
        document.documentElement.style.overflow = 'hidden'; root.style.display = 'none'; bar.style.display = 'none';
        S.mode = false; S.draft = null; unbindDocs();
      }
      frame.style.width = W[m] + 'px';
      mode = m; draw();
    }
    document.addEventListener('click', function (e) { var b = e.target.closest && e.target.closest('[data-dev]'); if (b) pick(b.getAttribute('data-dev')); });
    draw();
    var add = function () { document.body.appendChild(bar); };
    if (document.body) add(); else document.addEventListener('DOMContentLoaded', add);
  })();


  /* ---------- reply notifications ----------
   * You are notified when someone else replies in a thread you started or replied to,
   * or mentions you with @YourName. Read state is kept per browser (localStorage). */
  var LOADED = !REMOTE, SEEN_KEY = 'ree-review-seen', SEEN = {}, SEEN_INIT = false, NOTIFIED = {}, BASE_TITLE = document.title;
  try { var sv = JSON.parse(lsGet(SEEN_KEY, 'null')); if (sv && sv.ids) { sv.ids.forEach(function (i) { SEEN[i] = 1; }); SEEN_INIT = sv.n === authorKey(S.name) && !!S.name; } } catch (e) {}
  function storeSeen() { var ids = Object.keys(SEEN); if (ids.length > 3000) ids = ids.slice(-3000); lsSet(SEEN_KEY, JSON.stringify({ n: authorKey(S.name), ids: ids })); }
  function inbox() {
    if (!S.name) return [];
    var me = authorKey(S.name), out = [];
    S.threads.forEach(function (t) {
      var inThread = authorKey(t.author) === me;
      (t.replies || []).forEach(function (r) {
        var who = authorKey(r.author);
        if (who === me) { inThread = true; return; }
        var mention = String(r.text || '').normalize('NFC').toLowerCase().indexOf('@' + me) >= 0;
        if ((inThread || mention) && r.id) out.push({ t: t, r: r, mention: mention && !inThread });
      });
    });
    return out.sort(function (a, b) { return (b.r.at || 0) - (a.r.at || 0); });
  }
  function unread() { return inbox().filter(function (x) { return !SEEN[x.r.id]; }); }
  function unreadIn(id) { return unread().filter(function (x) { return x.t.id === id; }).length; }
  function markSeen(id) {
    var ch = false; inbox().forEach(function (x) { if ((!id || x.t.id === id) && !SEEN[x.r.id]) { SEEN[x.r.id] = 1; ch = true; } });
    if (ch) storeSeen();
  }
  function askNotify() { try { if (window.Notification && Notification.permission === 'default') Notification.requestPermission(); } catch (e) {} }
  function notifyToast(x) {
    var n = document.createElement('div'); n.className = 'rv-toast rv-nt'; n.setAttribute('role', 'status');
    n.innerHTML = ICON.bell + '<span><b>' + esc(x.r.author) + '</b> ' + (x.mention ? 'mentioned you' : 'replied') + ': ' + esc(String(x.r.text || '').slice(0, 140)) + '</span>';
    n.addEventListener('click', function () { n.remove(); S.open = true; goTo(x.t.id); shiftFloaters(); });
    root.querySelectorAll('.rv-nt').forEach(function (o) { o.remove(); });
    root.appendChild(n); setTimeout(function () { n.remove(); }, 8000);
  }
  function notifyBrowser(x) {
    try {
      if (!window.Notification || Notification.permission !== 'granted' || !document.hidden) return;
      var nn = new Notification(x.r.author + (x.mention ? ' mentioned you' : ' replied to your comment'), { body: String(x.r.text || '').slice(0, 180), tag: 'ree-' + x.r.id });
      nn.onclick = function () { window.focus(); S.open = true; goTo(x.t.id); shiftFloaters(); nn.close(); };
    } catch (e) {}
  }
  function checkInbox() {
    if (!S.name || !LOADED) return;
    if (!SEEN_INIT) { inbox().forEach(function (x) { SEEN[x.r.id] = 1; }); SEEN_INIT = true; storeSeen(); }
    var un = unread(), fresh = un.filter(function (x) { return !NOTIFIED[x.r.id]; });
    un.forEach(function (x) { NOTIFIED[x.r.id] = 1; });
    if (fresh.length && S.threads.length) { notifyToast(fresh[0]); fresh.slice(0, 3).forEach(notifyBrowser); }
    document.title = (un.length ? '(' + un.length + ') ' : '') + BASE_TITLE.replace(/^\(\d+\) /, '');
  }
  function bellBtn() {
    if (!S.name) return '';
    var n = unread().length;
    return '<button class="rv-bell' + (S.pmenu === 'inbox' ? ' on' : '') + '" data-pmenu="inbox" title="Notifications" aria-label="Notifications' + (n ? ' (' + n + ' unread)' : '') + '">' + ICON.bell + (n ? '<b>' + (n > 9 ? '9+' : n) + '</b>' : '') + '</button>';
  }
  function inboxHtml() {
    if (S.pmenu !== 'inbox' || !S.name) return '';
    root.querySelectorAll('.rv-nt').forEach(function (o) { o.remove(); });
    var list = inbox().slice(0, 30), n = unread().length;
    return '<div class="rv-inbox" role="dialog" aria-label="Notifications"><h3>Notifications' + (n ? '<button id="rvReadAll">Mark all as read</button>' : '') + '</h3>' +
      (list.length ? list.map(function (x) {
        var col = colorFor(x.r.author), seen = !!SEEN[x.r.id];
        return '<button class="rv-ni' + (seen ? ' seen' : '') + '" data-inbox="' + x.t.id + '"><span class="rv-av" style="background:' + col + '">' + esc((String(x.r.author).trim()[0] || '?')) + '</span>' +
          '<span class="rv-ni-b"><b>' + esc(x.r.author) + '</b> ' + (x.mention ? 'mentioned you' : 'replied') + '<span class="rv-ni-t">' + esc(x.r.text) + '</span><small>' + esc(labelFor(x.t.page)) + ' · ' + ago(x.r.at || x.t.at) + '</small></span>' + (seen ? '' : '<i></i>') + '</button>';
      }).join('') : '<p>No replies to your comments yet.</p>') + '</div>';
  }

  /* ---------- start ---------- */
  if (!REMOTE) { try { S.threads = JSON.parse(lsGet(KEY, '[]')) || []; } catch (e) { S.threads = []; } }
  if (document.body) mount(); else document.addEventListener('DOMContentLoaded', mount);
  if (REMOTE) { pull(); setInterval(pull, 5000); document.addEventListener('visibilitychange', pull); }
})();
