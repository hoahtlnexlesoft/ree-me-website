/* R.E.E M&E — attachments + links for the "Gửi thông tin dự án" form.
   Adds a compact "Tài liệu đính kèm" row under "Nội dung": pick/drop several files and/or paste links.
   State lives in window.__reeAttach = { files: File[], links: string[] } and is read by ree-email.js. */
(function () {
  var MAX_FILES = 2, MAX_MB = 10;
  var ACCEPT = '.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.dwg,.dxf,.rvt,.ifc,.zip,.rar,.7z,.jpg,.jpeg,.png,.webp';
  window.__reeAttach = { files: [], links: [] };

  if (window.REE_EN) Object.assign(window.REE_EN, {
    'Tài liệu đính kèm': 'Attachments',
    'Đính kèm file': 'Attach files',
    'Dán link Google Drive, Dropbox… rồi nhấn Enter': 'Paste a Google Drive, Dropbox… link and press Enter',
    'Thêm': 'Add',
    'Tối đa 2 file, mỗi file ≤ 10MB · PDF, Word, Excel, CAD, ảnh, ZIP': 'Up to 2 files, ≤ 10MB each · PDF, Word, Excel, CAD, images, ZIP',
    'Link chưa hợp lệ, vui lòng bắt đầu bằng http:// hoặc https://': 'Invalid link, please start with http:// or https://'
  });

  var css = '.ra{display:block;font-size:14px}' +
    '.ra-lbl{display:block;margin-bottom:6px;font-weight:500;color:var(--color-navy,#1B3A7A)}' +
    '.ra-row{display:flex;gap:10px;align-items:stretch}' +
    '.ra-btn{flex:none;display:inline-flex;align-items:center;gap:8px;height:44px;padding:0 16px;border:1px dashed #B9C4DA;border-radius:12px;background:#F6F8FC;color:#1B3A7A;font:600 13px/1 inherit;font-family:inherit;cursor:pointer;transition:border-color .2s,background .2s}' +
    '.ra-btn:hover,.ra.drag .ra-btn{border-color:#1B3A7A;background:#EEF3FB}' +
    '.ra-btn svg{width:16px;height:16px}' +
    '.ra-link{flex:1;min-width:0;display:flex;align-items:center;height:44px;border:1px solid var(--color-hairline,#E5E7EB);border-radius:12px;background:#fff;padding:0 6px 0 12px;transition:border-color .2s}' +
    '.ra-link:focus-within{border-color:#1B3A7A}' +
    '.ra-link svg{flex:none;width:15px;height:15px;color:#8A93A8}' +
    '.ra-link input{flex:1;min-width:0;height:100%;border:0;outline:0;background:transparent;padding:0 8px;font:inherit;font-size:13.5px;color:#0F1B33}' +
    '.ra-link button{flex:none;height:32px;padding:0 12px;border:0;border-radius:8px;background:#EEF3FB;color:#1B3A7A;font:600 12.5px/1 inherit;font-family:inherit;cursor:pointer}' +
    '.ra-link button:hover{background:#E1E9F7}' +
    '.ra-hint{margin-top:6px;font-size:11.5px;color:#8A93A8}.ra-err{margin-top:6px;font-size:12px;color:#D93A35}' +
    '.ra-list{display:flex;flex-wrap:wrap;gap:6px;margin-top:8px;max-height:62px;overflow:auto}.ra-list:empty{display:none}' +
    '.ra-chip{display:inline-flex;align-items:center;gap:6px;max-width:100%;height:28px;padding:0 6px 0 10px;border-radius:999px;background:#EEF3FB;color:#1B3A7A;font-size:12.5px}' +
    '.ra-chip span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:220px}.ra-chip small{color:#8A93A8;font-size:11px}' +
    '.ra-chip button{display:grid;place-items:center;width:18px;height:18px;border:0;border-radius:50%;background:transparent;color:#5E6A82;cursor:pointer}.ra-chip button:hover{background:#D9E3F5;color:#0F1B33}' +
    '.ra-chip svg{width:12px;height:12px}' +
    '@media (max-width:560px){.ra-row{flex-direction:column}.ra-btn{justify-content:center}}' +
    '@media (min-width:1024px){[role=dialog] form:has(.ra-list:not(:empty)) textarea[name=message]{height:min(204px,max(70px,calc(92vh - 660px)))!important}}' +
    '@media (min-width:1024px) and (max-height:800px){[role=dialog] .ra-hint{display:none}[role=dialog] form textarea[name=message]{height:min(204px,max(90px,calc(92vh - 562px)))}[role=dialog] form:has(.ra-list:not(:empty)) textarea[name=message]{height:max(64px,calc(92vh - 640px))!important}}';

  var ICO = {
    clip: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21.4 11.1-9.2 9.2a6 6 0 0 1-8.5-8.5l9.2-9.2a4 4 0 0 1 5.7 5.7l-9.2 9.2a2 2 0 0 1-2.8-2.8l8.5-8.5"/></svg>',
    link: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7"/><path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7"/></svg>',
    x: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M7 7l10 10M17 7 7 17"/></svg>'
  };
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function size(b) { return b >= 1048576 ? (b / 1048576).toFixed(1).replace('.', ',') + ' MB' : Math.max(1, Math.round(b / 1024)) + ' KB'; }

  function mount(form) {
    if (form.querySelector('.ra')) return;
    var ta = form.querySelector('textarea[name=message]'); if (!ta) return;
    var host = ta.closest('label'); if (!host) return;
    if (!document.getElementById('ra-css')) { var st = document.createElement('style'); st.id = 'ra-css'; st.textContent = css; document.head.appendChild(st); }
    var S = window.__reeAttach = { files: [], links: [] };
    var box = document.createElement('div'); box.className = 'ra';
    box.innerHTML = '<span class="ra-lbl">Tài liệu đính kèm</span>' +
      '<div class="ra-row"><button type="button" class="ra-btn">' + ICO.clip + '<span>Đính kèm file</span></button>' +
      '<label class="ra-link">' + ICO.link + '<input type="url" inputmode="url" placeholder="Dán link Google Drive, Dropbox… rồi nhấn Enter" aria-label="Link tài liệu"><button type="button">Thêm</button></label></div>' +
      '<input type="file" multiple accept="' + ACCEPT + '" hidden>' +
      '<div class="ra-list" aria-live="polite"></div><div class="ra-hint">Tối đa 2 file, mỗi file ≤ 10MB · PDF, Word, Excel, CAD, ảnh, ZIP</div>';
    host.parentNode.insertBefore(box, host.nextSibling);
    var fileIn = box.querySelector('input[type=file]'), linkIn = box.querySelector('input[type=url]'), list = box.querySelector('.ra-list'), hint = box.querySelector('.ra-hint');
    var err = function (m) { hint.className = m ? 'ra-err' : 'ra-hint'; hint.textContent = m || 'Tối đa 2 file, mỗi file ≤ 10MB · PDF, Word, Excel, CAD, ảnh, ZIP'; };
    var draw = function () {
      list.innerHTML = S.files.map(function (f, i) { return '<span class="ra-chip">' + ICO.clip.replace('<svg', '<svg aria-hidden="true"') + '<span title="' + esc(f.name) + '">' + esc(f.name) + '</span><small>' + size(f.size) + '</small><button type="button" data-rf="' + i + '" aria-label="Xoá">' + ICO.x + '</button></span>'; }).join('') +
        S.links.map(function (l, i) { return '<span class="ra-chip">' + ICO.link + '<span title="' + esc(l) + '">' + esc(l.replace(/^https?:\/\//, '')) + '</span><button type="button" data-rl="' + i + '" aria-label="Xoá">' + ICO.x + '</button></span>'; }).join('');
    };
    var addFiles = function (fl) {
      var msg = '';
      Array.prototype.forEach.call(fl, function (f) {
        if (S.files.length >= MAX_FILES) { msg = 'Chỉ đính kèm tối đa ' + MAX_FILES + ' file.'; return; }
        if (f.size > MAX_MB * 1048576) { msg = '“' + f.name + '” vượt quá ' + MAX_MB + 'MB, vui lòng chọn file ≤ ' + MAX_MB + 'MB.'; return; }
        if (S.files.some(function (x) { return x.name === f.name && x.size === f.size; })) return;
        S.files.push(f);
      });
      err(msg); draw();
    };
    var addLink = function () {
      var v = linkIn.value.trim(); if (!v) return;
      var parts = v.split(/[\s,]+/).filter(Boolean), bad = false;
      parts.forEach(function (p) { if (!/^https?:\/\/\S+\.\S+/i.test(p)) { bad = true; return; } if (S.links.indexOf(p) < 0 && S.links.length < 10) S.links.push(p); });
      if (bad) { err('Link chưa hợp lệ, vui lòng bắt đầu bằng http:// hoặc https://'); return; }
      linkIn.value = ''; err(''); draw();
    };
    box.querySelector('.ra-btn').addEventListener('click', function () { fileIn.click(); });
    fileIn.addEventListener('change', function () { addFiles(fileIn.files); fileIn.value = ''; });
    linkIn.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); addLink(); } });
    linkIn.addEventListener('blur', function () { if (linkIn.value.trim()) addLink(); });
    box.querySelector('.ra-link button').addEventListener('click', addLink);
    list.addEventListener('click', function (e) {
      var b = e.target.closest('button'); if (!b) return;
      if (b.hasAttribute('data-rf')) S.files.splice(+b.getAttribute('data-rf'), 1); else S.links.splice(+b.getAttribute('data-rl'), 1);
      draw();
    });
    ['dragenter', 'dragover'].forEach(function (t) { box.addEventListener(t, function (e) { e.preventDefault(); box.classList.add('drag'); }); });
    ['dragleave', 'drop'].forEach(function (t) { box.addEventListener(t, function (e) { e.preventDefault(); box.classList.remove('drag'); }); });
    box.addEventListener('drop', function (e) { if (e.dataTransfer && e.dataTransfer.files) addFiles(e.dataTransfer.files); });
    form.addEventListener('submit', function () { if (linkIn.value.trim()) addLink(); }, true);
    form.addEventListener('reset', function () { setTimeout(function () { S.files = []; S.links = []; linkIn.value = ''; err(''); draw(); }, 0); });
  }

  function scan() { var f = document.querySelectorAll('[role=dialog] form'); for (var i = 0; i < f.length; i++) if (f[i].querySelector('textarea[name=message]')) mount(f[i]); }
  new MutationObserver(scan).observe(document.documentElement, { childList: true, subtree: true });
  scan();
})();
