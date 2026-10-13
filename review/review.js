/* R.E.E M&E — customer review layer (port of the Joy comment layer, plain JS).
 * Bottom pill: Browse / Comment. In comment mode, click any element on the page
 * (also inside the embedded Careers / Services pages) to leave a note. No account: just a name.
 * Threads are shared through Supabase (table configured in review/config.js); without config they stay in this browser.
 */
(function () {
  'use strict';
  if (window.__reeReview) return; window.__reeReview = true;

  var CFG = window.REE_REVIEW || {};
  var SB_URL = CFG.url, SB_KEY = CFG.key, TABLE = CFG.table || 'ree_review_comments';
  var REMOTE = !!(SB_URL && SB_KEY);
  var KEY = 'ree-review-comments', NAME_KEY = 'ree-review-name', GOTO_KEY = 'ree-review-goto';
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
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var authorKey = function (n) { return String(n || '').trim().toLowerCase(); };
  var COLORS = ['#1d4ed8', '#0d9488', '#d97706', '#0284c7', '#c026d3', '#16a34a', '#dc2626', '#7c3aed', '#0891b2', '#65a30d', '#db2777', '#ca8a04', '#2563eb', '#059669', '#ea580c', '#9333ea'];
  var AUTHORS = [];
  function colorFor(name) {
    var i = AUTHORS.indexOf(authorKey(name)); if (i >= 0) return COLORS[i % COLORS.length];
    var h = 0, s = authorKey(name); for (var k = 0; k < s.length; k++) h = (h * 31 + s.charCodeAt(k)) >>> 0; return COLORS[h % COLORS.length];
  }
  function ago(t) {
    var s = Math.max(1, Math.round((Date.now() - t) / 1000));
    if (s < 60) return 'just now'; if (s < 3600) return Math.round(s / 60) + 'm ago';
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
  function labelFor(key) {
    if (key.indexOf('careers/') === 0) {
      var f = key.slice(8);
      if (f === 'index.html') return 'Careers'; if (f === 'jobs.html') return 'Open positions';
      if (f === 'services.html') return 'Services'; if (f.indexOf('job.html') === 0) return 'Job · ' + f.slice(9);
      return f;
    }
    var r = key.slice(5); return r === '/' ? 'Home' : r;
  }

  /* ---------- state ---------- */
  var S = { threads: [], name: lsGet(NAME_KEY, ''), mode: false, open: false, draft: null, draftText: '', draftImages: [], nameInput: '',
            active: null, flash: null, filter: 'all', replyFor: null, replyText: '', copied: false, copiedId: null, lightbox: null };
  var pending = 0, writes = 0, lastSend = '';

  function save(next) {
    var prev = S.threads; writes++; S.threads = next; renderAll();
    if (!REMOTE) { lsSet(KEY, JSON.stringify(next)); return; }
    var pm = {}; prev.forEach(function (t) { pm[t.id] = JSON.stringify(t); });
    var changed = next.filter(function (t) { return pm[t.id] !== JSON.stringify(t); });
    var gone = prev.filter(function (t) { return !next.some(function (n) { return n.id === t.id; }); }).map(function (t) { return t.id; });
    pending++;
    Promise.all([remoteUpsert(changed), remoteDelete(gone)]).catch(function () { toast('Could not save. Please check your connection.'); })
      .then(function () { pending--; });
  }
  function pull() {
    if (!REMOTE || pending > 0 || document.hidden) return;
    var w = writes;
    remoteLoad().then(function (rows) {
      if (pending === 0 && writes === w && JSON.stringify(rows) !== JSON.stringify(S.threads)) { S.threads = rows; renderAll(); }
    }).catch(function () {});
  }

  /* ---------- styles ---------- */
  var css = '' +
  '.rv,.rv *{box-sizing:border-box;font-family:"Plus Jakarta Sans",system-ui,-apple-system,sans-serif}' +
  ':where(.rv) button{font:inherit;cursor:pointer;border:0;background:none;color:inherit;margin:0;padding:0;line-height:1}' +
  '.rv-layer{position:fixed;inset:0;pointer-events:none;z-index:2147482000}' +
  '.rv-pin{pointer-events:auto;position:absolute;width:30px;height:30px;transform:translate(-50%,-100%);border-radius:50% 50% 50% 0;color:#fff;font-size:12px;font-weight:700;display:grid;place-items:center;box-shadow:0 6px 16px rgba(0,0,0,.28);outline:2px solid #fff;transition:transform .15s}' +
  '.rv-pin:hover{transform:translate(-50%,-100%) scale(1.12)}.rv-pin.on{transform:translate(-50%,-100%) scale(1.25)}' +
  '.rv-pin.flash::after{content:"";position:absolute;inset:-6px;border-radius:50%;border:3px solid currentColor;animation:rvping 1s ease-out infinite;opacity:.7}' +
  '@keyframes rvping{to{transform:scale(1.8);opacity:0}}' +
  '.rv-draft{pointer-events:auto;position:absolute;width:300px;max-width:calc(100vw - 24px);background:#fff;border-radius:16px;padding:12px;box-shadow:0 24px 60px -12px rgba(10,30,80,.45);outline:1px solid #c7d2fe;color:#0f172a}' +
  '.rv-in{width:100%;border:1px solid #c7d2fe;border-radius:10px;padding:8px 10px;font-size:13.5px;outline:none;color:#0f172a;background:#fff}.rv-in:focus{border-color:#4f46e5}' +
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
  '.rv-ok{display:inline-flex;align-items:center;gap:3px;font-size:10.5px;font-weight:800;color:#059669;background:#ecfdf5;border-radius:999px;padding:0 7px}' +
  '.rv-text{display:block;margin-top:2px;color:#334155;white-space:pre-wrap;word-break:break-word}.rv-item:not(.on) .rv-text{display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}' +
  '.rv-where{display:block;margin-top:3px;font-size:11px;color:#94a3b8}' +
  '.rv-imgs{display:flex;gap:6px;margin-top:6px}.rv-imgs img{width:48px;height:48px;border-radius:8px;object-fit:cover;outline:1px solid rgba(0,0,0,.1);cursor:zoom-in}.rv-item.on .rv-imgs img{width:96px;height:96px}' +
  '.rv-copy1{position:absolute;right:12px;top:12px;width:28px;height:28px;border-radius:50%;background:rgba(255,255,255,.85);color:#64748b;display:grid;place-items:center;box-shadow:0 1px 3px rgba(0,0,0,.12)}.rv-copy1:hover{color:#0b3f8f}' +
  '.rv-copy1 svg,.rv-act svg{width:14px;height:14px}' +
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
  '@media (max-width:640px){.rv-panel{width:100vw}.rv-rail{top:auto;bottom:96px;width:44px;padding:7px 0;border-radius:12px 0 0 12px;border:1px solid #e0e0e0;border-right:0}.rv-rail-list{display:none}.rv-seg button{padding:0 14px}}';

  var ICON = {
    pointer: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4l7 16 2.3-6.7L20 11 4 4z"/></svg>',
    chat: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 5h16v11H9l-5 4V5z"/><path d="M8 9.5h8M8 12.5h5"/></svg>',
    copy: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="8" y="8" width="13" height="13" rx="2"/><path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3"/></svg>',
    check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="m5 12.5 4.5 4.5L19 7"/></svg>',
    trash: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14"/></svg>',
    chev: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M15 6l-6 6 6 6"/></svg>',
    side: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="16" rx="3"/><path d="M15 4v16"/></svg>',
    image: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="9" cy="9" r="1.8"/><path d="m21 15-4.5-4.5L6 21"/></svg>',
    like: '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 10v11M15 5.9 14 10h5.8a2 2 0 0 1 2 2.3l-1.4 7A2 2 0 0 1 18.4 21H7V10l4-8a3 3 0 0 1 4 3.9z"/></svg>',
    heart: '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 14c1.5-1.5 3-3.2 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.8 0-3 .5-4.5 2-1.5-1.5-2.7-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4 3 5.5l7 7z"/></svg>',
    smile: '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2M9 9h.01M15 9h.01"/></svg>'
  };
  var REACTIONS = [['like', 'Like'], ['heart', 'Love'], ['smile', 'Smile']];

  /* ---------- DOM ---------- */
  var root = document.createElement('div'); root.className = 'rv'; root.setAttribute('data-review-ui', '');
  root.innerHTML = '<style>' + css + '</style><div class="rv-layer" id="rvLayer"></div><div id="rvUi"></div>';
  function mount() { document.body.appendChild(root); renderAll(); }
  var layer = root.querySelector('#rvLayer'), ui = root.querySelector('#rvUi');
  var fileIn = document.createElement('input'); fileIn.type = 'file'; fileIn.accept = 'image/*'; fileIn.multiple = true; fileIn.hidden = true; root.appendChild(fileIn);

  function toast(msg) { var t = document.createElement('div'); t.className = 'rv-toast'; t.textContent = msg; root.appendChild(t); setTimeout(function () { t.remove(); }, 2200); }

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
      var bg = t.resolved ? '#10b981' : colorFor(t.author);
      html += '<button class="rv-pin' + (S.active === t.id ? ' on' : '') + (S.flash === t.id ? ' flash' : '') + '" data-pin="' + t.id + '" style="left:' + p.x + 'px;top:' + p.y + 'px;background:' + bg + ';color:' + bg + '" aria-label="Comment ' + (i + 1) + '"><span style="color:#fff">' + (t.resolved ? ICON.check.replace('<svg', '<svg width="14" height="14"') : (i + 1)) + '</span></button>';
    });
    if (S.draft) {
      var d = S.draft, dp = pos(d, c), left = Math.min(Math.max(12, dp.x - 20), Math.max(12, vw - 312)), top = Math.min(dp.y + 12, vh - 230);
      html += '<div class="rv-draft" style="left:' + left + 'px;top:' + Math.max(12, top) + 'px">' +
        (!S.name ? '<input class="rv-in" id="rvName" placeholder="Your name" style="margin-bottom:8px" value="' + esc(S.nameInput) + '">' : '') +
        '<textarea class="rv-in" id="rvText" placeholder="Leave a comment… (paste images with Ctrl+V)">' + esc(S.draftText) + '</textarea>' +
        (S.draftImages.length ? '<div class="rv-thumbs">' + S.draftImages.map(function (src, i) { return '<div class="rv-thumb"><img src="' + src + '" alt=""><button data-rmimg="' + i + '" aria-label="Remove image">×</button></div>'; }).join('') + '</div>' : '') +
        '<div class="rv-row"><button class="rv-btn img" id="rvImg"' + (S.draftImages.length >= MAX_IMAGES ? ' disabled' : '') + '>' + ICON.image + 'Image' + (S.draftImages.length ? ' (' + S.draftImages.length + '/' + MAX_IMAGES + ')' : '') + '</button>' +
        '<button class="rv-btn ghost" id="rvCancel">Cancel</button><button class="rv-btn pri" id="rvSend">Send</button></div></div>';
    }
    // keep typing focus when re-rendering the draft
    var ae = document.activeElement, keep = ae && (ae.id === 'rvText' || ae.id === 'rvName') ? [ae.id, ae.selectionStart, ae.selectionEnd] : null;
    if (layer.__html !== html) { layer.innerHTML = html; layer.__html = html; }
    if (keep) { var el = root.querySelector('#' + keep[0]); if (el) { el.focus(); try { el.setSelectionRange(keep[1], keep[2]); } catch (e) {} } }
    syncSend();
  }
  function syncSend() {
    var b = root.querySelector('#rvSend'); if (!b) return;
    b.disabled = (!S.draftText.trim() && !S.draftImages.length) || (!S.name && !S.nameInput.trim());
  }
  function renderUi() {
    var open = S.threads.filter(function (t) { return !t.resolved; }).length;
    var shown = S.threads.filter(function (t) { return S.filter === 'all' ? true : S.filter === 'open' ? !t.resolved : t.resolved; });
    var h = '<div class="rv-pill">' + (S.mode ? '<span class="rv-hint">Click anything to comment · Esc to cancel</span>' : '') +
      '<div class="rv-seg"><button id="rvBrowse" class="' + (!S.mode ? 'on' : '') + '">' + ICON.pointer + 'Browse</button><button id="rvComment" class="' + (S.mode ? 'on' : '') + '">' + ICON.chat + 'Comment</button></div></div>';
    if (!S.open) {
      h += '<aside class="rv-rail"><button class="rv-side" id="rvTab" title="Open comments" aria-label="Open comments">' + ICON.side + '</button><div class="rv-rail-list">' +
        S.threads.map(function (t, i) { var col = t.resolved ? '#10b981' : colorFor(t.author); return '<button class="rv-dot' + (S.active === t.id ? ' on' : '') + (t.resolved ? ' done' : '') + '" data-rail="' + t.id + '" style="background:' + col + ';color:' + col + '" title="#' + (i + 1) + ' ' + esc(t.author) + ': ' + esc(t.text.slice(0, 80)) + '"><span style="color:#fff">' + esc((t.author.trim()[0] || '?')) + '</span></button>'; }).join('') +
        '</div></aside>';
    }
    if (S.open) {
      h += '<aside class="rv-panel"><header class="rv-head"><h2>Comments</h2><div><button class="rv-btn" id="rvCopyAll">' + (S.copied ? ICON.check : ICON.copy).replace('<svg', '<svg width="14" height="14"') + (S.copied ? 'Copied' : 'Copy all') + '</button><button class="rv-btn" id="rvClose" aria-label="Đóng">' + ICON.side + '</button></div></header>' +
        '<div class="rv-filters">' + [['all', 'All'], ['open', 'Open'], ['resolved', 'Resolved']].map(function (f) { return '<button data-filter="' + f[0] + '" class="' + (S.filter === f[0] ? 'on' : '') + '">' + f[1] + '</button>'; }).join('') + '</div><div class="rv-list">';
      if (!shown.length) h += '<p class="rv-empty">' + (S.filter === 'resolved' ? 'Nothing resolved yet.' : 'No comments yet. Switch to “Comment” and click anything on the page.') + '</p>';
      shown.forEach(function (t) {
        var idx = S.threads.indexOf(t) + 1, on = S.active === t.id, col = colorFor(t.author);
        h += '<div class="rv-item' + (on ? ' on' : '') + (t.resolved ? ' done' : '') + '">' +
          '<button class="rv-copy1" data-copy1="' + t.id + '" title="Copy comment">' + (S.copiedId === t.id ? ICON.check : ICON.copy) + '</button>' +
          '<button class="rv-main" data-goto="' + t.id + '"><span class="rv-av" style="background:' + col + '">' + esc((t.author.trim()[0] || '?')) + '</span><span style="min-width:0;flex:1">' +
          '<span class="rv-meta"><b style="color:' + col + '">' + esc(t.author) + '</b><span>· ' + ago(t.at) + '</span>' + (t.resolved ? '<span class="rv-ok">✓ Resolved</span>' : '') + '</span>' +
          '<span class="rv-text">' + esc(t.text) + '</span>' +
          (t.images && t.images.length ? '<span class="rv-imgs">' + t.images.map(function (src) { return '<img src="' + src + '" alt="Attachment" data-lb>'; }).join('') + '</span>' : '') +
          '<span class="rv-where">#' + idx + ' · ' + esc(labelFor(t.page)) + '</span></span></button>' +
          '<div class="rv-sub"><div class="rv-reacts">' + REACTIONS.map(function (r) {
            var who = (t.reactions && t.reactions[r[0]]) || [], mine = !!S.name && who.some(function (n) { return authorKey(n) === authorKey(S.name); });
            return '<button class="rv-react' + (mine ? ' on' : '') + '" data-react="' + t.id + '|' + r[0] + '"' + (S.name ? '' : ' disabled') + ' title="' + esc(S.name ? (who.length ? r[1] + ': ' + who.join(', ') : r[1]) : 'Add a comment first to set your name') + '">' + ICON[r[0]] + (who.length ? '<span>' + who.length + '</span>' : '') + '</button>';
          }).join('') + '</div>' +
          (t.replies || []).map(function (r) { var rc = colorFor(r.author); return '<p class="rv-reply" style="border-color:' + rc + '"><b style="color:' + rc + '">' + esc(r.author) + '</b> · ' + esc(r.text) + '</p>'; }).join('') +
          '<div class="rv-acts"><button class="lk' + (S.replyFor === t.id ? ' on' : '') + '" data-replyfor="' + t.id + '">Reply' + ((t.replies || []).length ? ' (' + t.replies.length + ')' : '') + '</button>' +
          '<button class="lk" data-goto="' + t.id + '">Show on page</button><span style="flex:1"></span>' +
          '<button class="rv-act ok" data-resolve="' + t.id + '" title="' + (t.resolved ? 'Reopen' : 'Resolve') + '">' + ICON.check + '</button>' +
          '<button class="rv-act del" data-del="' + t.id + '" title="Delete">' + ICON.trash + '</button></div>' +
          (S.replyFor === t.id ? '<input class="rv-in rv-replyin" id="rvReply" data-for="' + t.id + '" placeholder="' + (S.name ? 'Write a reply, press Enter…' : 'Add a comment first to set your name') + '"' + (S.name ? '' : ' disabled') + ' value="' + esc(S.replyText) + '">' : '') +
          '</div></div>';
      });
      h += '</div></aside>';
    }
    if (S.lightbox) h += '<div class="rv-lb" id="rvLb"><img src="' + S.lightbox + '" alt=""></div>';
    var ae = document.activeElement, keepReply = ae && ae.id === 'rvReply' ? [ae.selectionStart] : null, scroller = ui.querySelector('.rv-list'), st = scroller ? scroller.scrollTop : 0;
    ui.innerHTML = h;
    var sc2 = ui.querySelector('.rv-list'); if (sc2) sc2.scrollTop = st;
    if (keepReply) { var ri = ui.querySelector('#rvReply'); if (ri) { ri.focus(); try { ri.setSelectionRange(keepReply[0], keepReply[0]); } catch (e) {} } }
  }
  function renderAll() { computeAuthors(); renderUi(); renderPins(); }

  /* ---------- comment mode across documents ---------- */
  var hoverEl = null, bound = [];
  function clearHover() { if (hoverEl) { hoverEl.style.outline = hoverEl.__rvO || ''; hoverEl.style.outlineOffset = hoverEl.__rvOO || ''; hoverEl = null; } }
  function inUi(t) { return t && t.closest && t.closest('[data-review-ui]'); }
  function onMove(e) {
    var t = e.target; if (!t || t.nodeType !== 1 || inUi(t)) return clearHover();
    if (hoverEl !== t) { clearHover(); hoverEl = t; t.__rvO = t.style.outline; t.__rvOO = t.style.outlineOffset; t.style.outline = '2px dashed #4f46e5'; t.style.outlineOffset = '2px'; }
  }
  function onClick(e) {
    var t = e.target; if (!t || t.nodeType !== 1 || inUi(t)) return;
    e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation(); clearHover();
    var doc = t.ownerDocument, win = doc.defaultView, r = t.getBoundingClientRect();
    S.draft = { page: ctx().key, selector: selectorFor(t), rx: r.width ? (e.clientX - r.left) / r.width : .5, ry: r.height ? (e.clientY - r.top) / r.height : .5, ax: e.clientX + win.scrollX, ay: e.clientY + win.scrollY };
    S.draftText = ''; S.draftImages = []; setMode(false);
    setTimeout(function () { var el = root.querySelector(S.name ? '#rvText' : '#rvName'); if (el) el.focus(); }, 30);
  }
  function onKey(e) { if (e.key === 'Escape') { if (S.mode) setMode(false); else if (S.draft) { S.draft = null; renderPins(); } else if (S.lightbox) { S.lightbox = null; renderUi(); } } }
  function bindDocs() {
    unbindDocs(); if (!S.mode) return;
    var docs = [document], c = ctx(); if (c.frame) docs.push(c.doc);
    docs.forEach(function (d) {
      d.addEventListener('mousemove', onMove, true); d.addEventListener('click', onClick, true); d.addEventListener('keydown', onKey);
      d.documentElement.style.cursor = 'crosshair'; bound.push(d);
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
    S.draft = null; S.draftImages = []; S.draftText = ''; S.active = t.id; S.open = true;
    save(S.threads.concat([t]));
  }
  function focusThread(id) {
    var t = S.threads.filter(function (x) { return x.id === id; })[0]; if (!t) return;
    S.active = id; S.flash = id; var c = ctx();
    var el = null; try { el = t.selector ? c.doc.querySelector(t.selector) : null; } catch (e) {}
    if (el && el.scrollIntoView) el.scrollIntoView({ block: 'center', behavior: 'smooth' });
    else c.win.scrollTo({ top: Math.max(0, t.ay - c.win.innerHeight / 2), behavior: 'smooth' });
    if (el) { el.__rvF = el.style.outline; el.style.outline = '3px solid ' + colorFor(t.author); el.style.outlineOffset = '3px'; }
    renderAll();
    setTimeout(function () { if (el) { el.style.outline = el.__rvF || ''; el.style.outlineOffset = ''; } if (S.flash === id) { S.flash = null; renderPins(); } }, 2600);
  }
  function goTo(id) {
    var t = S.threads.filter(function (x) { return x.id === id; })[0]; if (!t) return;
    S.active = id;
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
      if (ready || tries > 40) { clearInterval(iv); if (ready) setTimeout(function () { focusThread(id); }, 700); }
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
    return S.threads.map(function (t, i) {
      return '#' + (i + 1) + ' [' + (t.resolved ? 'resolved' : 'open') + '] page: ' + labelFor(t.page) + ' (' + t.page + ') | element: ' + t.selector + '\n  ' + t.author + ': ' + t.text +
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
  function addReply(id) {
    var text = S.replyText.trim(); if (!text || !S.name) return;
    var sig = id + '|' + authorKey(S.name) + '|' + text, now = Date.now(), last = lastSend.split('@@');
    if (last[0] === sig && now - Number(last[1]) < 1500) return; lastSend = sig + '@@' + now;
    S.replyText = ''; S.replyFor = null;
    save(S.threads.map(function (t) { return t.id === id ? Object.assign({}, t, { replies: (t.replies || []).concat([{ id: uid(), author: S.name, text: text, at: now }]) }) : t; }));
  }

  /* ---------- events on our own UI ---------- */
  root.addEventListener('click', function (e) {
    var a0, b = e.target.closest('button,[data-lb],#rvLb'); if (!b) return;
    if (b.id === 'rvLb') { S.lightbox = null; return renderUi(); }
    if (b.hasAttribute('data-lb')) { e.stopPropagation(); S.lightbox = b.getAttribute('src'); return renderUi(); }
    if (b.id === 'rvBrowse') { S.draft = null; return setMode(false); }
    if (b.id === 'rvComment') { S.draft = null; return setMode(true); }
    if (b.id === 'rvTab') { S.open = true; return renderUi(); }
    if ((a0 = b.getAttribute('data-rail'))) { S.open = true; return goTo(a0); }
    if (b.id === 'rvClose') { S.open = false; return renderUi(); }
    if (b.id === 'rvCancel') { S.draft = null; return renderPins(); }
    if (b.id === 'rvSend') return submitDraft();
    if (b.id === 'rvImg') return fileIn.click();
    if (b.id === 'rvCopyAll') return copyText(exportAll(), function () { S.copied = true; renderUi(); setTimeout(function () { S.copied = false; renderUi(); }, 1800); });
    var a;
    if ((a = b.getAttribute('data-rmimg')) != null) { S.draftImages.splice(+a, 1); return renderPins(); }
    if ((a = b.getAttribute('data-pin'))) { S.active = a; S.open = true; return renderAll(); }
    if ((a = b.getAttribute('data-filter'))) { S.filter = a; return renderUi(); }
    if ((a = b.getAttribute('data-goto'))) return goTo(a);
    if ((a = b.getAttribute('data-copy1'))) { var t1 = S.threads.filter(function (x) { return x.id === a; })[0]; return t1 && copyText(t1.text, function () { S.copiedId = a; renderUi(); setTimeout(function () { if (S.copiedId === a) { S.copiedId = null; renderUi(); } }, 1600); }); }
    if ((a = b.getAttribute('data-replyfor'))) { S.replyFor = S.replyFor === a ? null : a; S.replyText = ''; renderUi(); var ri = root.querySelector('#rvReply'); if (ri) ri.focus(); return; }
    if ((a = b.getAttribute('data-resolve'))) return save(S.threads.map(function (t) { return t.id === a ? Object.assign({}, t, { resolved: !t.resolved }) : t; }));
    if ((a = b.getAttribute('data-del'))) { if (!confirm('Delete this comment?')) return; return save(S.threads.filter(function (t) { return t.id !== a; })); }
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
    if (t.id === 'rvText') { S.draftText = t.value; syncSend(); }
    else if (t.id === 'rvName') { S.nameInput = t.value; syncSend(); }
    else if (t.id === 'rvReply') S.replyText = t.value;
  });
  root.addEventListener('keydown', function (e) {
    var t = e.target;
    if (t.id === 'rvReply' && e.key === 'Enter' && !e.isComposing && !e.repeat) { e.preventDefault(); addReply(t.getAttribute('data-for')); }
    if (t.id === 'rvText' && e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); submitDraft(); }
    e.stopPropagation();
  });
  root.addEventListener('paste', function (e) {
    if (e.target.id !== 'rvText') return;
    var imgs = Array.prototype.filter.call(e.clipboardData.files || [], function (f) { return /^image\//.test(f.type); });
    if (imgs.length) { e.preventDefault(); addImages(imgs); }
  });
  fileIn.addEventListener('change', function () { addImages(fileIn.files); fileIn.value = ''; });
  document.addEventListener('keydown', onKey);

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
    }
    if (!c.frame) lastFrameDoc = null;
    renderPins();
  }, 600);

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

  /* ---------- start ---------- */
  if (!REMOTE) { try { S.threads = JSON.parse(lsGet(KEY, '[]')) || []; } catch (e) { S.threads = []; } }
  if (document.body) mount(); else document.addEventListener('DOMContentLoaded', mount);
  if (REMOTE) { pull(); setInterval(pull, 5000); document.addEventListener('visibilitychange', pull); }
})();
