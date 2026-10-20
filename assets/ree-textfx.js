/* R.E.E — "rơi chữ" heading reveal, shared by every page (SPA + careers pages).
   Each section heading (h1/h2 + its small eyebrow label) slides up from behind a mask
   when it scrolls into view — the same motion as the home page section titles. */
(function () {
  'use strict';
  if (window.__reeTfx) return; window.__reeTfx = 1;
  var doc = document, reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduce) return;

  var css = '.ree-tfx{clip-path:inset(0 0 100% 0);transform:translate3d(0,.9em,0);opacity:0;will-change:transform,clip-path,opacity;' +
    'transition:transform .85s cubic-bezier(.16,.84,.3,1) var(--tfx-d,0s),clip-path .85s cubic-bezier(.16,.84,.3,1) var(--tfx-d,0s),opacity .5s ease var(--tfx-d,0s)}' +
    '.ree-tfx.in{clip-path:inset(-0.3em -0.3em -0.4em -0.3em);transform:none;opacity:1}' +
    '.ree-tfx.done{clip-path:none;will-change:auto}';
  var st = doc.createElement('style'); st.textContent = css; (doc.head || doc.documentElement).appendChild(st);

  var SKIP = '[data-review-ui],[role=dialog],dialog,nav,footer,.rv,[data-no-tfx],button,a,label,select,.af-head,.dock,[contenteditable]';
  var SEL = 'h1,h2,.ruler,.eyebrow';

  function eligible(el) {
    if (el.__tfx || !el.isConnected) return false;
    if (el.closest(SKIP)) return false;
    if (!el.getClientRects().length) return false;
    var p = el.parentElement;
    if (p && p.style && p.style.paddingBottom === '0.6em') return false; // already a home "mask" heading
    var t = (el.textContent || '').trim(); if (!t || t.length > 260) return false;
    var cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden' || cs.position === 'fixed') return false;
    if (cs.transitionDuration && cs.transitionDuration !== '0s' && /transform|all/.test(cs.transitionProperty)) return false;
    return true;
  }

  // pending headings are checked against the viewport on scroll (IntersectionObserver ignores
  // elements whose own clip-path hides them, so it can't be used here)
  var pend = [], raf = 0;
  function check() {
    raf = 0; var vh = innerHeight, k = 0, keep = [];
    for (var i = 0; i < pend.length; i++) {
      var w = pend[i]; if (!w.isConnected) continue;
      var r = w.getBoundingClientRect();
      if (r.top < vh * 0.94 && r.bottom > 0) {
        if (!w.classList.contains('ree-tfx')) continue;
        if (!/^H[12]$/.test(w.tagName)) w.style.setProperty('--tfx-d', (Math.min(k++, 4) * 0.06) + 's');
        reveal(w);
      } else keep.push(w);
    }
    pend = keep;
  }
  function reveal(w) {
    requestAnimationFrame(function () { w.classList.add('in'); });
    setTimeout(function () { w.classList.add('done'); }, 1600);
  }
  function tick() { if (!raf) raf = requestAnimationFrame(check); }
  addEventListener('scroll', tick, { passive: true }); addEventListener('resize', tick);

  function wrap(el) {
    el.__tfx = 1;
    if (/^H[12]$/.test(el.tagName)) el.style.setProperty('--tfx-d', '.09s');
    var r = el.getBoundingClientRect();
    if (r.bottom < 0) return;                       // already scrolled past: leave as is
    el.classList.add('ree-tfx');
    pend.push(el); tick();
  }

  function scan() {
    var list = doc.querySelectorAll(SEL);
    for (var i = 0; i < list.length; i++) { try { if (eligible(list[i])) wrap(list[i]); } catch (e) {} }
  }
  var t = 0; function soon() { clearTimeout(t); t = setTimeout(function () { scan(); tick(); }, 160); }
  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', soon); else soon();
  addEventListener('load', soon);
  if ('MutationObserver' in window) new MutationObserver(soon).observe(doc.documentElement, { childList: true, subtree: true });
  addEventListener('hashchange', soon);
})();
