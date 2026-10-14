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
  var COLORS = ['#1d4ed8', '#0d9488', '#d97706', '#0284c7', '#c026d3', '#16a34a', '#dc2626', '#7c3aed', '#0891b2', '#65a30d', '#db2777', '#ca8a04', '#2563eb', '#059669', '#ea580c', '#9333ea'];
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
  var S = { tedit: null, teditText: '', hidden: lsGet(HIDE_KEY, '') === '1', q: '', pmenu: null, expanded: {}, pop: null, popMenu: false, popEmoji: false, popReply: '', editWhere: 'panel', menu: null, editing: null, editText: '', threads: [], name: lsGet(NAME_KEY, ''), mode: false, open: false, draft: null, draftText: '', draftImages: [], nameInput: '',
            active: null, flash: null, filter: 'all', replyFor: null, replyText: '', copied: false, copiedId: null, lightbox: null };
  var pending = 0, writes = 0, lastSend = '';

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
    if (!REMOTE || pending > 0 || document.hidden) return;
    var w = writes;
    remoteLoad().then(function (rows) {
      if (pending === 0 && writes === w && JSON.stringify(rows) !== JSON.stringify(S.threads)) { S.threads = rows; renderAll(); }
    }).catch(function () {});
  }

  /* ---------- styles ---------- */
  var css = '' +
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
  '.rv-ok{display:inline-flex;align-items:center;gap:3px;font-size:10.5px;font-weight:800;color:#059669;background:#ecfdf5;border-radius:999px;padding:0 7px}' +
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
  '.rv-gh{display:flex;align-items:center;gap:10px;padding:12px 16px 4px;font-size:12px;font-weight:700;color:#475569}.rv-gh::after{content:"";flex:1;height:1px;background:#e2e5ea}' +
  '.rv-row2{margin:1px 8px;border-radius:10px}.rv-row2-main{gap:10px;padding:9px 12px 6px 10px}.rv-row2-m{padding-right:52px}.rv-row2-main .rv-av{width:22px;height:22px;font-size:10.5px}' +
  '.rv-row2-m{gap:5px;padding-top:1px;line-height:1.5}.rv-row2-m b{font-size:13px;max-width:130px}.rv-row2-m .rv-ago{font-size:12px;color:#64748b}' +
  '.rv-unread{width:6px;height:6px;border-radius:50%;background:#e5484d;flex:none;align-self:center;margin-left:2px}' +
  '.rv-row2-t{margin-top:1px;padding-top:2px;font-size:13px;line-height:1.55;color:#334155;white-space:normal;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden}.rv-row2-t.ex{display:block;-webkit-line-clamp:unset}' +
  '.rv-sm,.rv-nr{display:block;margin:0 0 4px 42px;font-size:12px;font-weight:500;color:#64748b}.rv-sm:hover,.rv-nr:hover{color:#0f172a}.rv-nr{color:#94a3b8}' +
  '.rv-row2:last-child{margin-bottom:4px}.rv-row2>*:last-child{}' +
  '.rv-row2-acts{position:absolute;top:6px;right:6px;display:flex;gap:2px;opacity:0}.rv-row2:hover .rv-row2-acts,.rv-row2.on .rv-row2-acts,.rv-row2.menu .rv-row2-acts{opacity:1}' +
  '.rv-row2 .rv-menu{top:36px;right:6px;min-width:170px}' +
  '.rv-popwrap .rv-pop{position:fixed;z-index:2147482660;width:320px;max-width:calc(100vw - 24px);max-height:min(560px,calc(100vh - 24px));display:flex;flex-direction:column;background:#fff;color:#0f172a;border-radius:18px;box-shadow:0 24px 60px -14px rgba(10,25,60,.45),0 0 0 1px rgba(15,23,42,.06)}' +
  '.rv-pop-h{position:relative;flex:none;display:flex;align-items:center;gap:8px;padding:14px 12px 8px 18px}.rv-pop-h>b{font-size:15px;font-weight:700}' +
  '.rv-pop-tools{margin-left:auto;display:flex;gap:2px}.rv-pop-tools button{width:30px;height:30px;border-radius:8px;display:grid;place-items:center;color:#334155}.rv-pop-tools button:hover,.rv-pop-tools button.on{background:#f1f5f9;color:#0f172a}.rv-pop-tools svg{width:17px;height:17px}' +
  '.rv-pop-h .rv-menu{top:44px;right:10px}' +
  '.rv-pop-body{flex:1;min-height:0;overflow-y:auto;padding:4px 18px 6px}' +
  '.rv-pop-shot{display:block;width:100%;aspect-ratio:2/1;object-fit:cover;border-radius:12px;margin:2px 0 14px;outline:1px solid rgba(15,23,42,.08);cursor:zoom-in}' +
  '.rv-pop-c{display:flex;gap:10px;margin-bottom:12px}.rv-pop-c .rv-av{font-size:12px}.rv-pop-cb{min-width:0;flex:1}' +
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
  '.rv-pop{position:fixed}.rv-pop-tools{gap:4px}.rv-pop-tools button.del{color:#e5484d}.rv-pop-tools button.del:hover{background:#fff1f2;color:#be123c}.rv-pop-tools button.ok{color:#059669}' +
  '.rv-pop-shot{border-radius:14px;outline:1px solid #e5e7eb}' +
  '.rv-pop-f{align-items:flex-start}.rv-pop-f>.rv-av{margin-top:6px}' +
  '.rv-pop-box{padding:0;border-radius:16px;background:#fafafa;border-color:#e5e7eb;overflow:hidden}.rv-pop-box:focus-within{background:#fff}' +
  '.rv-pop-box .rv-pop-in{padding:10px 14px}#rvPopName{margin:0;border-bottom:1px solid #e5e7eb}' +
  '.rv-pop-tb{border-top:1px solid #e5e7eb;padding:6px 6px 6px 8px}.rv-pop-send{width:34px;height:34px;background:#8b8b8b}.rv-pop-send:disabled{background:#a3a3a3}' +
  '.rv-emo{position:absolute;left:18px;right:18px;bottom:64px;z-index:6;display:grid;grid-template-columns:repeat(8,1fr);gap:2px;margin:0;padding:8px;background:#fff;border-radius:14px;box-shadow:0 14px 36px -10px rgba(15,23,42,.35),0 0 0 1px rgba(15,23,42,.08)}' +
  '.rv-emo button{width:auto;height:auto;aspect-ratio:1;font-size:20px;line-height:1;border-radius:8px;display:grid;place-items:center}.rv-emo button:hover,.rv-emo button:focus-visible{background:#f1f5f9;outline:2px solid #306eed;outline-offset:-2px}' +
  '.rv-tbox{width:320px}.rv-tbox textarea.rv-in{min-height:64px;font-size:14px;line-height:1.45}.rv-was{margin-top:6px;font-size:11.5px;color:#64748b;line-height:1.4;max-height:54px;overflow:auto}' +
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
  var root = document.createElement('div'); root.className = 'rv'; root.setAttribute('data-review-ui', '');
  root.innerHTML = '<style>' + css + '</style><div class="rv-layer" id="rvLayer"></div><div id="rvUi"></div>';
  function mount() { document.body.appendChild(root); renderAll(); }
  var layer = root.querySelector('#rvLayer'), ui = root.querySelector('#rvUi');
  var fileIn = document.createElement('input'); fileIn.type = 'file'; fileIn.accept = 'image/*'; fileIn.multiple = true; fileIn.hidden = true; root.appendChild(fileIn);

  function toast(msg) { var t = document.createElement('div'); t.className = 'rv-toast'; t.textContent = msg; root.appendChild(t); setTimeout(function () { t.remove(); }, 2200); }

  /* ---------- direct text editing ---------- */
  var BAD_TAG = /^(HTML|BODY|SCRIPT|STYLE|SVG|PATH|IMG|VIDEO|IFRAME|INPUT|TEXTAREA|SELECT|CANVAS|PICTURE)$/i;
  function textTarget(el) {
    for (var i = 0, cur = el; cur && cur.nodeType === 1 && i < 4; i++, cur = cur.parentElement) {
      if (BAD_TAG.test(cur.tagName) || inUi(cur)) return null;
      var ok = true, has = false;
      for (var n = cur.firstChild; n; n = n.nextSibling) {
        if (n.nodeType === 3) { if (n.nodeValue.trim()) has = true; }
        else if (n.nodeType === 8 || (n.nodeType === 1 && n.tagName === 'BR')) {}
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
      k++; g[0].nodeValue = v; for (var j = 1; j < g.length; j++) g[j].nodeValue = '';
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
    var c = ctx(), win = el.ownerDocument.defaultView, r = el.getBoundingClientRect(), sel = selectorFor(el);
    var ex = S.threads.filter(function (t) { return t.kind === 'edit' && t.page === c.key && t.selector === sel; })[0];
    var before = readText(el);
    S.tedit = { el: el, id: ex ? ex.id : null, page: c.key, selector: sel, from: ex ? ex.from : normT(before), before: before, rx: 0, ry: 1, ax: r.left + win.scrollX, ay: r.bottom + win.scrollY };
    el.__rvLive = true;
    S.teditText = normT(before);
    S.nameInput = S.name || ''; S.draft = null; setMode(false);
    setTimeout(function () { var ta = root.querySelector('#rvTEdit'); if (ta) { ta.focus(); ta.setSelectionRange(ta.value.length, ta.value.length); } }, 30);
  }
  function endTextEdit(ok) {
    var d = S.tedit; if (!d) return; var el = d.el, now = normT(S.teditText);
    if (ok && !S.name) { var n = S.nameInput.trim(); if (!n) { var ni = root.querySelector('#rvName'); if (ni) ni.focus(); return; } S.name = n; lsSet(NAME_KEY, n); }
    S.tedit = null; el.__rvLive = false;
    if (!ok || now === normT(d.before)) { if (normT(d.before) === normT(d.from)) restoreText(el); else writeText(el, d.before); return renderAll(); }
    if (now === normT(d.from)) { restoreText(el); return saveAll(S.threads.filter(function (t) { return t.id !== d.id; })); }
    var label = 'Edit text: "' + normT(d.from).replace(/\n/g, ' / ') + '" → "' + now.replace(/\n/g, ' / ') + '"', t;
    writeText(el, now);
    if (d.id) { t = Object.assign({}, findT(d.id), { to: now, text: label, at: Date.now(), author: S.name, resolved: false }); el.__rvEid = t.id; saveAll(S.threads.map(function (x) { return x.id === t.id ? t : x; })); }
    else {
      t = { id: uid(), kind: 'edit', page: d.page, selector: d.selector, rx: 0, ry: 0, ax: d.ax, ay: d.ay, author: S.name, from: normT(d.from), to: now, text: label, at: Date.now(), resolved: false, replies: [] };
      el.__rvEid = t.id; saveAll(S.threads.concat([t]));
    }
    if (APPLIED.indexOf(el) < 0) APPLIED.push(el);
    S.active = t.id; toast('Text updated'); captureShot(t);
  }

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
        (!S.name ? '<label class="rv-lab" for="rvName">Your name</label><input class="rv-in" id="rvName" placeholder="e.g. Hoa Ho" autocomplete="name" style="margin-bottom:8px" value="' + esc(S.nameInput) + '">' : '') +
        '<textarea class="rv-in" id="rvText" placeholder="Leave a comment… (paste images with Ctrl+V)">' + esc(S.draftText) + '</textarea>' +
        (S.draftImages.length ? '<div class="rv-thumbs">' + S.draftImages.map(function (src, i) { return '<div class="rv-thumb"><img src="' + src + '" alt=""><button data-rmimg="' + i + '" aria-label="Remove image">×</button></div>'; }).join('') + '</div>' : '') +
        '<div class="rv-row"><button class="rv-btn img" id="rvImg"' + (S.draftImages.length >= MAX_IMAGES ? ' disabled' : '') + '>' + ICON.image + 'Image' + (S.draftImages.length ? ' (' + S.draftImages.length + '/' + MAX_IMAGES + ')' : '') + '</button>' +
        '<button class="rv-btn ghost" id="rvCancel">Cancel</button><button class="rv-btn pri" id="rvSend">Send</button></div></div>';
    }
    if (S.tedit) {
      var te = S.tedit, tp = pos(te, c), tl = Math.min(Math.max(12, tp.x), Math.max(12, vw - 332)), tt0 = Math.min(tp.y + 10, vh - 250);
      html += '<div class="rv-draft rv-tbox" style="left:' + tl + 'px;top:' + Math.max(12, tt0) + 'px"><span class="rv-lab">Edit text</span>' +
        (!S.name ? '<input class="rv-in" id="rvName" placeholder="Your name" autocomplete="name" style="margin-bottom:8px" value="' + esc(S.nameInput) + '">' : '') +
        '<textarea class="rv-in" id="rvTEdit" rows="3">' + esc(S.teditText) + '</textarea>' +
        '<div class="rv-was">' + (normT(te.from) !== normT(S.teditText) ? 'Original: ' + esc(normT(te.from)) : 'Enter to save · Shift+Enter for a new line') + '</div>' +
        '<div class="rv-row" style="justify-content:flex-end"><button class="rv-btn ghost" id="rvTCancel">Cancel</button><button class="rv-btn pri" id="rvTSave">Save</button></div></div>';
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
      var n0 = S.threads.filter(function (t) { return !t.resolved; }).length;
      ui.innerHTML = '<button class="rv-show" id="rvShow" title="Open comments" aria-label="Open comments">' + ICON.chat + (n0 ? '<span>' + n0 + '</span>' : '') + '</button>';
      return;
    }
    var open = S.threads.filter(function (t) { return !t.resolved; }).length;
    var shown = S.threads.filter(function (t) { return S.filter === 'all' ? true : S.filter === 'open' ? !t.resolved : t.resolved; });
    var h = '<div class="rv-pill">' + (S.mode === 'edit' ? '<span class="rv-hint">Click any text to edit it · Esc to cancel</span>' : S.mode ? '<span class="rv-hint">Click anything to comment · Esc to cancel</span>' : '') +
      '<div class="rv-seg"><button id="rvBrowse" class="' + (!S.mode ? 'on' : '') + '">' + ICON.pointer + 'Browse</button><button id="rvComment" class="' + (S.mode === true ? 'on' : '') + '">' + ICON.chat + 'Comment</button><button id="rvEditMode" class="' + (S.mode === 'edit' ? 'on' : '') + '">' + ICON.pencil + 'Edit text</button></div></div>';
    if (!S.open) {
      h += '<aside class="rv-rail"><button class="rv-side" id="rvTab" title="Open comments" aria-label="Open comments">' + ICON.side + '</button><button class="rv-side" id="rvHide" title="Hide comments (full view)" aria-label="Hide comments">' + ICON.eyeoff + '</button><div class="rv-rail-list">' +
        S.threads.map(function (t, i) { var col = t.resolved ? '#10b981' : colorFor(t.author); return '<button class="rv-dot' + (S.active === t.id ? ' on' : '') + (t.resolved ? ' done' : '') + '" data-rail="' + t.id + '" style="background:' + col + ';color:' + col + '" title="#' + (i + 1) + ' ' + esc(t.author) + ': ' + esc(t.text.slice(0, 80)) + '"><span style="color:#fff">' + esc((t.author.trim()[0] || '?')) + '</span></button>'; }).join('') +
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
        '<div class="rv-tools"><label class="rv-search">' + ICON.search + '<input id="rvSearch" placeholder="Search" value="' + esc(S.q || '') + '"></label>' +
        '<button class="rv-ib' + (S.filter !== 'all' || S.pmenu === 'filter' ? ' on' : '') + '" data-pmenu="filter" aria-label="Filter" title="Filter">' + ICON.filter + '</button>' +
        '<button class="rv-ib' + (S.pmenu === 'more' ? ' on' : '') + '" data-pmenu="more" aria-label="More" title="More">' + ICON.dots + '</button>' +
        (S.pmenu === 'filter' ? '<div class="rv-menu rv-pm" style="right:52px">' + [['all', 'All comments'], ['open', 'Open'], ['resolved', 'Resolved']].map(function (f) { return '<button data-filter="' + f[0] + '">' + (S.filter === f[0] ? ICON.check : '<i class="rv-sp"></i>') + f[1] + '</button>'; }).join('') + '</div>' : '') +
        (S.pmenu === 'more' ? '<div class="rv-menu rv-pm"><button id="rvCopyAll">' + ICON.copy + (S.copied ? 'Copied' : 'Copy all comments') + '</button><button id="rvClose">' + ICON.side + 'Hide panel</button><button id="rvHide">' + ICON.eyeoff + 'Hide comments (full view)</button></div>' : '') +
        '</div><div class="rv-list">';
      if (!list.length) h += '<p class="rv-empty">' + (q ? 'No comments match your search.' : S.filter === 'resolved' ? 'Nothing resolved yet.' : 'No comments yet. Switch to “Comment” and click anything on the page.') + '</p>';
      groups.forEach(function (g) {
        h += '<div class="rv-gh"><span>' + esc(g.name) + '</span></div>';
        g.items.forEach(function (t) {
          var on = S.active === t.id, col = colorFor(t.author), nr = (t.replies || []).length, long = (t.text || '').length > 40, ex = S.expanded && S.expanded[t.id];
          h += '<div class="rv-row2' + (on ? ' on' : '') + (t.resolved ? ' done' : '') + (S.menu === t.id ? ' menu' : '') + '">' +
            '<button class="rv-row2-main" data-goto="' + t.id + '"><span class="rv-av" style="background:' + col + '">' + esc((t.author.trim()[0] || '?')) + '</span>' +
            '<span class="rv-row2-b"><span class="rv-row2-m"><b>' + esc(t.author) + '</b><span class="rv-ago">· ' + ago(t.at) + '</span>' + (t.resolved ? '' : '<i class="rv-unread" title="Open"></i>') + '</span>' +
            '<span class="rv-row2-t' + (ex ? ' ex' : '') + '">' + esc(t.text || (t.images && t.images.length ? '[image]' : '')) + '</span></span></button>' +
            (long ? '<button class="rv-sm" data-expand="' + t.id + '">' + (ex ? 'Show less' : 'Show more') + '</button>' : '') +
            (nr ? '<button class="rv-nr" data-goto="' + t.id + '">' + nr + ' ' + (nr > 1 ? 'replies' : 'reply') + '</button>' : '') +
            '<span class="rv-row2-acts"><button class="rv-ib sm" data-resolve="' + t.id + '" title="' + (t.resolved ? 'Reopen' : 'Resolve') + '" aria-label="' + (t.resolved ? 'Reopen' : 'Resolve') + '">' + (t.resolved ? ICON.undo : ICON.checkc) + '</button>' +
            '<button class="rv-ib sm' + (S.menu === t.id ? ' on' : '') + '" data-more="' + t.id + '" aria-label="More actions">' + ICON.dots + '</button></span>' +
            (S.menu === t.id ? '<div class="rv-menu" role="menu">' + (mine(t) && t.kind !== 'edit' ? '<button role="menuitem" data-popedit="' + t.id + '">' + ICON.pencil + 'Edit</button>' : '') + '<button role="menuitem" data-copyc="' + t.id + '">' + ICON.copy + 'Copy comment</button><button role="menuitem" class="danger" data-del="' + t.id + '">' + ICON.trash + 'Delete thread</button></div>' : '') +
            '</div>';
        });
      });
      h += '</div></aside>';
    }
    if (S.lightbox) h += '<div class="rv-lb" id="rvLb"><img src="' + S.lightbox + '" alt=""></div>';
    var ae = document.activeElement, keepId = ae && (ae.id === 'rvReply' || ae.id === 'rvEdit') ? ae.id : null, keepReply = keepId ? [ae.selectionStart] : null, scroller = ui.querySelector('.rv-list'), st = scroller ? scroller.scrollTop : 0;
    ui.innerHTML = h;
    var sc2 = ui.querySelector('.rv-list'); if (sc2) sc2.scrollTop = st;
    ui.querySelectorAll('.rv-sm').forEach(function (bt) { var row = bt.parentNode, tx = row.querySelector('.rv-row2-t'); if (tx && !tx.classList.contains('ex') && tx.scrollHeight <= tx.clientHeight + 2) bt.remove(); });
    if (keepReply) { var ri = ui.querySelector('#' + keepId); if (ri) { ri.focus(); try { ri.setSelectionRange(keepReply[0], keepReply[0]); } catch (e) {} } }
  }
  function renderAll() { applyEdits(); computeAuthors(); renderUi(); renderPins(); renderPop(); shiftFloaters(); }

  /* ---------- comment mode across documents ---------- */
  var hoverEl = null, bound = [];
  function clearHover() { if (hoverEl) { hoverEl.style.outline = hoverEl.__rvO || ''; hoverEl.style.outlineOffset = hoverEl.__rvOO || ''; hoverEl = null; } }
  function inUi(t) { return t && t.closest && t.closest('[data-review-ui]'); }
  function onMove(e) {
    var t = e.target; if (!t || t.nodeType !== 1 || inUi(t)) return clearHover();
    if (S.mode === 'edit') { t = textTarget(t); if (!t) return clearHover(); }
    if (hoverEl !== t) { clearHover(); hoverEl = t; t.__rvO = t.style.outline; t.__rvOO = t.style.outlineOffset; t.style.outline = '2px dashed #4f46e5'; t.style.outlineOffset = '2px'; }
  }
  function onClick(e) {
    var t = e.target; if (!t || t.nodeType !== 1 || inUi(t)) return;
    e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation(); clearHover();
    if (S.mode === 'edit') { var tt = textTarget(t); if (!tt) return toast('Click on a piece of text'); return startTextEdit(tt); }
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
    S.draft = null; S.draftImages = []; S.draftText = ''; S.active = t.id; S.pop = t.id; S.popMenu = S.popEmoji = false;
    save(S.threads.concat([t]));
    captureShot(t);
  }
  function focusThread(id) {
    var t = S.threads.filter(function (x) { return x.id === id; })[0]; if (!t) return;
    S.active = id; S.flash = id; S.pop = id; S.popMenu = S.popEmoji = false; var c = ctx();
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
  function saveEdit(id) {
    var text = S.editText.trim(), te0 = S.threads.filter(function (x) { return x.id === id; })[0]; if (!text || !te0 || !mine(te0)) { S.editing = null; return renderAll(); }
    S.editing = null;
    save(S.threads.map(function (t) { return t.id === id ? Object.assign({}, t, { text: text, edited: Date.now() }) : t; }));
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
    if ((S.menu || S.pmenu) && !e.target.closest('.rv-menu,[data-more],[data-pmenu]')) { S.menu = null; S.pmenu = null; renderUi(); }
    var a0, b = e.target.closest('button,[data-lb],#rvLb'); if (!b) return;
    if (b.id === 'rvLb') { S.lightbox = null; return renderUi(); }
    if (b.hasAttribute('data-lb')) { e.stopPropagation(); S.lightbox = b.getAttribute('src'); return renderUi(); }
    if (b.id === 'rvBrowse') { S.draft = null; return setMode(false); }
    if (b.id === 'rvComment') { S.draft = null; if (S.tedit) endTextEdit(false); return setMode(true); }
    if (b.id === 'rvEditMode') { S.draft = null; if (S.tedit) endTextEdit(false); return setMode(S.mode === 'edit' ? false : 'edit'); }
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
    var a;
    if ((a = b.getAttribute('data-rmimg')) != null) { S.draftImages.splice(+a, 1); return renderPins(); }
    if ((a = b.getAttribute('data-pin'))) { S.active = a; S.pop = S.pop === a ? null : a; S.popMenu = S.popEmoji = false; S.popReply = ''; return renderAll(); }
    if ((a = b.getAttribute('data-filter'))) { S.filter = a; S.pmenu = null; return renderUi(); }
    if ((a = b.getAttribute('data-pmenu'))) { S.pmenu = S.pmenu === a ? null : a; S.menu = null; return renderUi(); }
    if ((a = b.getAttribute('data-expand'))) { S.expanded[a] = !S.expanded[a]; return renderUi(); }
    if ((a = b.getAttribute('data-goto'))) return goTo(a);
    if ((a = b.getAttribute('data-copy1'))) { var t1 = S.threads.filter(function (x) { return x.id === a; })[0]; return t1 && copyText(t1.text, function () { S.copiedId = a; renderUi(); setTimeout(function () { if (S.copiedId === a) { S.copiedId = null; renderUi(); } }, 1600); }); }
    if ((a = b.getAttribute('data-replyfor'))) { S.replyFor = S.replyFor === a ? null : a; S.replyText = ''; renderUi(); var ri = root.querySelector('#rvReply'); if (ri) ri.focus(); return; }
    if ((a = b.getAttribute('data-resolve'))) return save(S.threads.map(function (t) { return t.id === a ? Object.assign({}, t, { resolved: !t.resolved }) : t; }));
    if ((a = b.getAttribute('data-del'))) { S.menu = null; if (S.pop === a) S.pop = null; return save(S.threads.filter(function (t) { return t.id !== a; })); }
    if ((a = b.getAttribute('data-popedit')) && !pop.contains(b)) { var tp = findT(a); S.menu = null; if (!tp || !mine(tp)) return renderUi(); S.active = a; S.editing = a; S.editWhere = 'pop'; S.editText = tp.text; goTo(a); setTimeout(function () { S.editing = a; S.editWhere = 'pop'; renderPop(); var ed = pop.querySelector('#rvPopEdit'); if (ed) ed.focus(); }, 900); return; }
    if ((a = b.getAttribute('data-copyc'))) { var tc = findT(a); S.menu = null; renderUi(); return tc && copyText(tc.text, function () { toast('Copied'); }); }
    if ((a = b.getAttribute('data-more'))) { S.menu = S.menu === a ? null : a; return renderUi(); }
    if ((a = b.getAttribute('data-edit'))) { var te = S.threads.filter(function (x) { return x.id === a; })[0]; if (!te || !mine(te)) { S.menu = null; return renderUi(); } S.menu = null; S.editing = a; S.editWhere = 'panel'; S.editText = te ? te.text : ''; S.active = a; renderUi(); var ed = root.querySelector('#rvEdit'); if (ed) { ed.focus(); ed.setSelectionRange(ed.value.length, ed.value.length); } return; }
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
    var row = function (name, at, text, extra) { return '<div class="rv-pop-c">' + avatar(name, 26) + '<div class="rv-pop-cb"><div class="rv-pop-meta"><b>' + esc(name) + '</b><span>' + ago(at) + '</span></div>' + (text != null ? '<p>' + esc(text) + '</p>' : '') + (extra || '') + '</div></div>'; };
    var h = '<div class="rv-pop" role="dialog" aria-label="Comment">' +
      '<div class="rv-pop-h"><b>Comment</b>' + (t.resolved ? '<span class="rv-ok">✓ Resolved</span>' : '') + '<span class="rv-pop-tools">' +
        (mine(t) && t.kind !== 'edit' ? '<button data-popedit="' + t.id + '" aria-label="Edit" title="Edit">' + ICON.pencil + '</button>' : '') +
        '<button data-copyc="' + t.id + '" aria-label="Copy comment" title="Copy comment">' + ICON.copy + '</button>' +
        '<button data-resolve="' + t.id + '" class="' + (t.resolved ? 'ok' : '') + '" aria-label="' + (t.resolved ? 'Reopen' : 'Resolve') + '" title="' + (t.resolved ? 'Reopen' : 'Resolve') + '">' + ICON.checkc + '</button>' +
        '<button data-del="' + t.id + '" class="del" aria-label="Delete" title="Delete">' + ICON.trash + '</button>' +
        '<button data-popclose aria-label="Close" title="Close">' + ICON.x + '</button></span></div>' +
      '<div class="rv-pop-body">' +
      (shot ? '<img class="rv-pop-shot" src="' + shot + '" alt="Snapshot" data-lb>' : '') +
      row(t.author, t.at, editing ? null : t.text,
        (editing ? '<div class="rv-edit" style="margin:6px 0 0"><textarea class="rv-in" id="rvPopEdit" data-for="' + t.id + '">' + esc(S.editText) + '</textarea><div class="rv-row" style="justify-content:flex-end"><button class="rv-btn ghost" data-editcancel>Cancel</button><button class="rv-btn pri" data-editsave="' + t.id + '">Save</button></div></div>' : '') +
        (more.length ? '<div class="rv-imgs">' + more.map(function (src) { return '<img src="' + src + '" alt="Attachment" data-lb>'; }).join('') + '</div>' : '') +
        '<div class="rv-reacts">' + REACTIONS.map(function (r) { var who = (t.reactions && t.reactions[r[0]]) || [], me = !!S.name && who.some(function (n) { return authorKey(n) === authorKey(S.name); });
          return '<button class="rv-react' + (me ? ' on' : '') + '" data-react="' + t.id + '|' + r[0] + '"' + (S.name ? '' : ' disabled') + ' title="' + esc(S.name ? (who.length ? r[1] + ': ' + who.join(', ') : r[1]) : 'Add a comment first to set your name') + '">' + ICON[r[0]] + (who.length ? '<span>' + who.length + '</span>' : '') + '</button>'; }).join('') + '</div>') +
      (t.replies || []).map(function (r) { return row(r.author, r.at || t.at, r.text); }).join('') +
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
    if ((a = b.getAttribute('data-popedit'))) { var t = findT(a); if (!t || !mine(t)) return; S.pop = a; S.popMenu = false; S.editing = a; S.editWhere = 'pop'; S.editText = t ? t.text : ''; renderPop(); var ed = pop.querySelector('#rvPopEdit'); if (ed) { ed.focus(); ed.setSelectionRange(ed.value.length, ed.value.length); } return; }
    if ((a = b.getAttribute('data-copyc'))) { var tc = findT(a); S.popMenu = false; renderPop(); if (tc) copyText(tc.text, function () { toast('Copied'); }); e.stopPropagation(); return; }
    if (b.hasAttribute('data-del') || b.hasAttribute('data-resolve')) S.popMenu = false;
  });
  pop.addEventListener('input', function (e) {
    var t = e.target;
    if (t.id === 'rvPopReply') { S.popReply = t.value; autoGrow(t); var sb = pop.querySelector('.rv-pop-send'); if (sb) sb.disabled = !(S.popReply.trim() && (S.name || S.nameInput.trim())); }
    else if (t.id === 'rvPopName') { S.nameInput = t.value; var sb2 = pop.querySelector('.rv-pop-send'); if (sb2) sb2.disabled = !(S.popReply.trim() && S.nameInput.trim()); }
    else if (t.id === 'rvPopEdit') S.editText = t.value;
  });
  pop.addEventListener('keydown', function (e) {
    var t = e.target;
    if (t.id === 'rvPopReply' && e.key === 'Enter' && !e.shiftKey && !e.isComposing) { e.preventDefault(); var tid = S.pop; if (tid) sendPopReply(tid); }
    if (t.id === 'rvPopEdit' && e.key === 'Enter' && !e.shiftKey && !e.isComposing) { e.preventDefault(); saveEdit(t.getAttribute('data-for')); }
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

  /* ---------- start ---------- */
  if (!REMOTE) { try { S.threads = JSON.parse(lsGet(KEY, '[]')) || []; } catch (e) { S.threads = []; } }
  if (document.body) mount(); else document.addEventListener('DOMContentLoaded', mount);
  if (REMOTE) { pull(); setInterval(pull, 5000); document.addEventListener('visibilitychange', pull); }
})();
