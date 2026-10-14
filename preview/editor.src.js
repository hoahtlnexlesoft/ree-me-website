/* R.E.E — inline text editing for the preview page.
   Saved edits live in the page itself (<script id="ree-text-edits">); Save republishes the page. */
(function () {
  'use strict';
  var SAVED = [];
  try { SAVED = JSON.parse(document.getElementById('ree-text-edits').textContent || '[]') || []; } catch (e) { SAVED = []; }
  var PEND_KEY = 'ree-text-pending';
  var PENDING = [];
  try { PENDING = JSON.parse(sessionStorage.getItem(PEND_KEY) || '[]') || []; } catch (e) { PENDING = []; }

  /* ---------- where are we ---------- */
  function route() { var h = (location.hash || '').replace(/^#/, '').split('?')[0].replace(/\/+$/, ''); return h || '/'; }
  function frameDoc() { var f = document.querySelector('iframe.ree-careers-frame'); try { return f && f.contentDocument && f.contentDocument.body ? f : null; } catch (e) { return null; } }
  function contexts() {
    var out = [{ doc: document, key: 'site:' + route() }], f = frameDoc();
    if (f) { var w = f.contentWindow, file = (w.location.pathname.split('/').pop() || 'index.html'); out.push({ doc: f.contentDocument, key: 'careers/' + file + (file === 'job.html' ? w.location.hash : '') }); }
    return out;
  }
  function keyFor(doc) { var cs = contexts(); for (var i = 0; i < cs.length; i++) if (cs[i].doc === doc) return cs[i].key; return null; }

  /* ---------- text helpers (only nodeValue changes: React keeps its nodes) ---------- */
  var BAD = /^(HTML|BODY|SCRIPT|STYLE|SVG|PATH|IMG|VIDEO|IFRAME|INPUT|TEXTAREA|SELECT|CANVAS|PICTURE)$/i;
  function decor(n) { // small inline bits that may sit next to editable text: icons, arrows, dots
    if (/^(SVG|IMG|I|PICTURE)$/i.test(n.tagName)) return true;
    return (n.textContent || '').trim().length <= 2 && !n.querySelector('p,div,h1,h2,h3,h4,h5,h6,li');
  }
  function inUi(el) { return el && el.closest && el.closest('[data-ree-edit-ui],[data-review-ui]'); }
  function target(el) {
    for (var i = 0, cur = el; cur && cur.nodeType === 1 && i < 4; i++, cur = cur.parentElement) {
      if (BAD.test(cur.tagName) || inUi(cur)) return null;
      var ok = true, has = false;
      for (var n = cur.firstChild; n; n = n.nextSibling) {
        if (n.nodeType === 3) { if (n.nodeValue.trim()) has = true; }
        else if (n.nodeType === 8 || (n.nodeType === 1 && (n.tagName === 'BR' || decor(n)))) {}
        else { ok = false; break; }
      }
      if (ok && has) return cur;
    }
    return null;
  }
  function readText(el) { var o = ''; for (var n = el.firstChild; n; n = n.nextSibling) { if (n.nodeType === 3) o += n.nodeValue; else if (n.nodeType === 1 && n.tagName === 'BR') o += '\n'; } return o; }
  function norm(x) { return String(x || '').normalize('NFC').replace(/ /g, ' ').split('\n').map(function (l) { return l.replace(/\s+/g, ' ').trim(); }).filter(function (l, i, a) { return l || (i > 0 && i < a.length - 1); }).join('\n').trim(); }
  function writeText(el, text) {
    if (!el.__reeOrig) { el.__reeOrig = []; for (var n0 = el.firstChild; n0; n0 = n0.nextSibling) if (n0.nodeType === 3) el.__reeOrig.push([n0, n0.nodeValue]); }
    var segs = [[]]; for (var n = el.firstChild; n; n = n.nextSibling) { if (n.nodeType === 3) segs[segs.length - 1].push(n); else if (n.nodeType === 1 && n.tagName === 'BR') segs.push([]); }
    segs = segs.filter(function (g) { return g.length; }); if (!segs.length) return;
    var lines = String(text).split('\n'), k = 0;
    segs.forEach(function (g, i) { var v = i === segs.length - 1 ? lines.slice(k).join(' ') : (lines[k] != null ? lines[k] : ''); k++; g[0].nodeValue = v; for (var j = 1; j < g.length; j++) g[j].nodeValue = ''; });
  }
  function restore(el) { if (el.__reeOrig) { el.__reeOrig.forEach(function (p) { p[0].nodeValue = p[1]; }); el.__reeOrig = null; } }
  function selectorFor(el) {
    var parts = [], cur = el, doc = el.ownerDocument;
    while (cur && cur !== doc.body && cur.nodeType === 1 && parts.length < 14) {
      if (cur.id && !/^(radix|headlessui|:r)/.test(cur.id)) { parts.unshift('#' + CSS.escape(cur.id)); break; }
      var p = cur.parentElement; if (!p) break;
      var same = []; for (var i = 0; i < p.children.length; i++) if (p.children[i].tagName === cur.tagName) same.push(p.children[i]);
      parts.unshift(same.length > 1 ? cur.tagName.toLowerCase() + ':nth-of-type(' + (same.indexOf(cur) + 1) + ')' : cur.tagName.toLowerCase());
      cur = p;
    }
    return parts.join(' > ');
  }

  /* ---------- apply saved + pending edits ---------- */
  function merged() { // pending overrides saved for the same page+selector
    var m = {}, out = [];
    SAVED.concat(PENDING).forEach(function (e) { m[e.p + '|' + e.s] = e; });
    for (var k in m) out.push(m[k]);
    return out;
  }
  var touched = [];
  function applyAll() {
    var all = merged();
    contexts().forEach(function (c) {
      all.forEach(function (e) {
        if (e.p !== c.key) return;
        var el = null; try { el = c.doc.querySelector(e.s); } catch (x) {} if (!el || el === editing) return;
        var cur = norm(readText(el));
        if (cur === norm(e.t)) return;
        if (cur === norm(e.f) || el.__reeSel === e.s) { writeText(el, e.t); el.__reeSel = e.s; if (touched.indexOf(el) < 0) touched.push(el); }
      });
    });
  }
  setInterval(function () { try { applyAll(); } catch (e) {} }, 700);
  addEventListener('hashchange', function () { setTimeout(applyAll, 300); });

  /* ---------- editor UI ---------- */
  var css = '' +
    '.ree-ed{position:fixed;left:14px;bottom:14px;z-index:2147483000;display:flex;align-items:center;gap:6px;padding:6px;border-radius:14px;background:#1e2a3b;color:#e2e8f0;box-shadow:0 14px 34px -10px rgba(0,0,0,.55);font:600 13px/1 "Plus Jakarta Sans",-apple-system,"Segoe UI",Roboto,Arial,sans-serif}' +
    '.ree-ed *{box-sizing:border-box;font:inherit}.ree-ed button{height:34px;padding:0 12px;border:0;border-radius:10px;background:transparent;color:inherit;cursor:pointer;display:inline-flex;align-items:center;gap:7px;white-space:nowrap}' +
    '.ree-ed button:hover{background:rgba(255,255,255,.08)}.ree-ed button.on{background:#306eed;color:#fff}.ree-ed button.save{background:#fff;color:#0f172a}.ree-ed button.save:hover{background:#e2e8f0}.ree-ed button:disabled{opacity:.5;cursor:default}' +
    '.ree-ed svg{width:16px;height:16px;flex:none}.ree-ed .cnt{padding:0 4px 0 8px;color:#94a3b8;font-weight:500}.ree-ed .sep{width:1px;height:22px;background:rgba(255,255,255,.14)}' +
    '.ree-hl{position:fixed;z-index:2147482999;pointer-events:none;border:1.5px dashed #4f8bff;border-radius:4px;background:rgba(79,139,255,.08);display:none}' +
    '.ree-hl span{position:absolute;left:-1.5px;top:-20px;padding:2px 6px;border-radius:5px 5px 5px 0;background:#306eed;color:#fff;font:600 10.5px/1.3 -apple-system,"Segoe UI",Roboto,Arial,sans-serif;white-space:nowrap}' +
    '[data-ree-editing]{outline:2px solid #306eed!important;outline-offset:3px;border-radius:2px;cursor:text!important;caret-color:#306eed}' +
    '.ree-tip{position:fixed;z-index:2147483000;padding:5px 9px;border-radius:8px;background:#0f172a;color:#fff;font:500 11.5px/1.3 -apple-system,"Segoe UI",Roboto,Arial,sans-serif;pointer-events:none;white-space:nowrap}' +
    '@media (max-width:640px){.ree-ed{left:8px;bottom:8px;padding:4px;font-size:12px}.ree-ed button{height:30px;padding:0 9px}}';
  var PEN = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.85 2.85 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>';
  var ui, hl, tip, mode = false, editing = null, editStart = null, readOnly = false, saving = false, art = null, hover = null;

  function injectStyle(doc) { if (doc.getElementById('ree-ed-css')) return; var st = doc.createElement('style'); st.id = 'ree-ed-css'; st.textContent = css; (doc.head || doc.documentElement).appendChild(st); }
  function renderBar() {
    if (!ui) return;
    var n = PENDING.length;
    ui.innerHTML = '<button class="' + (mode ? 'on' : '') + '" data-a="mode" title="Click any text on the page to edit it">' + PEN + (mode ? 'Editing text' : 'Edit text') + '</button>' +
      (n ? '<span class="sep"></span><span class="cnt">' + n + ' change' + (n > 1 ? 's' : '') + '</span><button data-a="discard">Discard</button><button class="save" data-a="save"' + (saving ? ' disabled' : '') + '>' + (saving ? 'Saving…' : 'Save') + '</button>' : '');
  }
  function showTip(msg, ms) { if (!tip) return; tip.textContent = msg; tip.style.display = 'block'; var r = ui.getBoundingClientRect(); tip.style.left = r.left + 'px'; tip.style.top = (r.top - 34) + 'px'; clearTimeout(tip.__t); tip.__t = setTimeout(function () { tip.style.display = 'none'; }, ms || 2600); }
  function frameOffset(doc) { if (doc === document) return { x: 0, y: 0 }; var f = frameDoc(); if (!f) return { x: 0, y: 0 }; var r = f.getBoundingClientRect(); return { x: r.left, y: r.top }; }
  function showHl(el) {
    if (!el) { hl.style.display = 'none'; hover = null; return; }
    hover = el; var r = el.getBoundingClientRect(), o = frameOffset(el.ownerDocument);
    hl.style.display = 'block'; hl.style.left = (o.x + r.left - 3) + 'px'; hl.style.top = (o.y + r.top - 3) + 'px'; hl.style.width = (r.width + 6) + 'px'; hl.style.height = (r.height + 6) + 'px';
    hl.firstChild.textContent = el.tagName.toLowerCase();
  }

  function onMove(e) { if (!mode || editing) return; var t = e.target; if (!t || t.nodeType !== 1 || inUi(t)) return showHl(null); showHl(target(t)); }
  function onClick(e) {
    if (!mode) return; var t = e.target; if (!t || t.nodeType !== 1 || inUi(t)) return;
    if (editing && (t === editing || editing.contains(t))) { e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation(); return; } // caret moves, link/button does nothing
    e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation();
    if (editing) commit();
    var el = target(t); if (!el) return showTip('Click on a piece of text');
    begin(el);
  }
  function begin(el) {
    showHl(null);
    editStart = { el: el, nodes: Array.prototype.slice.call(el.childNodes), text: readText(el), key: keyFor(el.ownerDocument), sel: selectorFor(el) };
    editing = el; el.setAttribute('data-ree-editing', '');
    editStart.islands = editStart.nodes.filter(function (n) { return n.nodeType === 1 && n.tagName !== 'BR'; });
    editStart.islands.forEach(function (n) { n.setAttribute('contenteditable', 'false'); });
    try { el.contentEditable = 'plaintext-only'; } catch (x) { el.contentEditable = 'true'; }
    if (el.contentEditable !== 'plaintext-only') el.contentEditable = 'true';
    el.focus();
    var d = el.ownerDocument, r = d.createRange(), tn = editStart.nodes.filter(function (n) { return n.nodeType === 3 && n.nodeValue.trim(); });
    if (editStart.islands.length && tn.length) { r.setStart(tn[0], 0); r.setEnd(tn[tn.length - 1], tn[tn.length - 1].nodeValue.length); } else r.selectNodeContents(el); var s = d.defaultView.getSelection(); s.removeAllRanges(); s.addRange(r);
    el.addEventListener('keydown', onEditKey); el.addEventListener('keyup', stopSpace, true); el.addEventListener('blur', onBlur);
  }
  function onEditKey(e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); commit(); }
    else if (e.key === 'Escape') { e.preventDefault(); cancel(); }
    else if (e.key === ' ') { e.preventDefault(); e.stopPropagation(); e.target.ownerDocument.execCommand('insertText', false, ' '); }
  }
  function stopSpace(e) { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); } }
  function onBlur() { setTimeout(function () { if (editing) commit(); }, 0); }
  function finish() {
    var el = editing, st = editStart, typed = '';
    (function walk(node) {
      for (var n = node.firstChild; n; n = n.nextSibling) {
        if (n.nodeType === 3) typed += n.nodeValue;
        else if (n.nodeType === 1) {
          if (st.islands.indexOf(n) >= 0) continue;
          if (n.tagName === 'BR') { typed += '\n'; continue; }
          var blk = /^(DIV|P)$/.test(n.tagName); if (blk && typed && !/\n$/.test(typed)) typed += '\n'; walk(n);
        }
      }
    })(el);
    st.islands.forEach(function (n) { n.removeAttribute('contenteditable'); });
    el.removeEventListener('keydown', onEditKey); el.removeEventListener('keyup', stopSpace, true); el.removeEventListener('blur', onBlur);
    el.removeAttribute('contenteditable'); el.removeAttribute('data-ree-editing');
    el.replaceChildren.apply(el, st.nodes);           // put React's own nodes back
    editing = null; editStart = null;
    return typed;
  }
  function cancel() { if (!editing) return; var st = editStart; finish(); st.el.__reeOrig = st.el.__reeOrig; writeText(st.el, st.text); }
  function commit() {
    if (!editing) return; var st = editStart, el = st.el, typed = norm(finish());
    if (!typed || typed === norm(st.text)) { writeText(el, st.text); return; }
    var prev = merged().filter(function (e) { return e.p === st.key && e.s === st.sel; })[0];
    var from = prev ? prev.f : norm(el.__reeOrig ? el.__reeOrig.map(function (p) { return p[1]; }).join('\n') : st.text);
    if (!prev) from = norm(st.text);
    writeText(el, typed); el.__reeSel = st.sel; if (touched.indexOf(el) < 0) touched.push(el);
    PENDING = PENDING.filter(function (e) { return !(e.p === st.key && e.s === st.sel); });
    PENDING.push({ p: st.key, s: st.sel, f: from, t: typed, at: Date.now() });
    stash(); renderBar();
  }
  function stash() { try { if (PENDING.length) sessionStorage.setItem(PEND_KEY, JSON.stringify(PENDING)); else sessionStorage.removeItem(PEND_KEY); } catch (e) {} }
  function discard() {
    if (editing) cancel();
    PENDING = []; stash();
    touched.forEach(function (el) { if (el.isConnected) { restore(el); el.__reeSel = null; } }); touched = [];
    applyAll(); renderBar();
  }
  function save() {
    if (editing) commit();
    if (!PENDING.length || saving) return;
    if (!art || readOnly) return showTip('Saving is not available in this view');
    var m = {}; SAVED.concat(PENDING).forEach(function (e) { m[e.p + '|' + e.s] = { p: e.p, s: e.s, f: e.f, t: e.t }; });
    var next = []; for (var k in m) if (norm(m[k].f) !== norm(m[k].t)) next.push(m[k]);
    saving = true; renderBar(); stash();
    art.publish(window.__REE_PAGE(next)).then(function () {
      try { sessionStorage.removeItem(PEND_KEY); } catch (e) {}
      PENDING = []; SAVED = next; saving = false; renderBar(); showTip('Saved');
    }, function (err) {
      saving = false; var c = err && err.code;
      if (c === 'conflict') { showTip('Someone saved first — reloading, your changes are kept'); return; }
      if (c === 'not_writer' || c === 'not_granted' || c === 'consent_required' || c === 'not_declared' || c === 'capability_disabled' || c === 'capability_removed') { readOnly = true; showTip('This view is read-only — your changes stay only in this tab'); }
      else if (c === 'rate_limited') showTip('Saving too often — try again in a moment');
      else showTip('Could not save — please try again');
      renderBar();
    });
  }
  function setMode(on) {
    mode = on; if (!on && editing) commit(); showHl(null); renderBar();
    contexts().forEach(function (c) { c.doc.documentElement.style.cursor = on ? 'text' : ''; });
  }
  var bound = [];
  function bindDoc(doc) {
    if (bound.indexOf(doc) >= 0) return; bound.push(doc); injectStyle(doc);
    doc.addEventListener('mousemove', onMove, true); doc.addEventListener('click', onClick, true);
    doc.addEventListener('keydown', function (e) { if (e.key === 'Escape' && mode && !editing) setMode(false); });
    try { doc.defaultView.addEventListener('scroll', function () { if (hover) showHl(hover); }, { passive: true }); } catch (e) {}
  }

  function mount() {
    injectStyle(document);
    ui = document.createElement('div'); ui.className = 'ree-ed'; ui.setAttribute('data-ree-edit-ui', '');
    hl = document.createElement('div'); hl.className = 'ree-hl'; hl.setAttribute('data-ree-edit-ui', ''); hl.appendChild(document.createElement('span'));
    tip = document.createElement('div'); tip.className = 'ree-tip'; tip.setAttribute('data-ree-edit-ui', ''); tip.style.display = 'none';
    document.body.appendChild(hl); document.body.appendChild(ui); document.body.appendChild(tip);
    ui.addEventListener('click', function (e) {
      var b = e.target.closest('button'); if (!b) return; var a = b.getAttribute('data-a');
      if (a === 'mode') setMode(!mode); else if (a === 'save') save(); else if (a === 'discard') discard();
    });
    ui.addEventListener('mousedown', function (e) { if (editing) e.preventDefault(); }); // keep the edit open while pressing Save
    bindDoc(document);
    setInterval(function () { var f = frameDoc(); if (f) bindDoc(f.contentDocument); if (mode) contexts().forEach(function (c) { c.doc.documentElement.style.cursor = 'text'; }); }, 800);
    renderBar();
  }

  applyAll();
  var claude = window.claude;
  if (claude && claude.use) {
    Promise.all([claude.use('artifact'), claude.use('user').catch(function () { return null; })]).then(function (r) {
      art = r[0]; var user = r[1];
      if (!art) return;
      if (user && user.canEdit && user.canEdit() === false) return;
      if (document.body) mount(); else addEventListener('DOMContentLoaded', mount);
    }, function () {});
  }
})();
