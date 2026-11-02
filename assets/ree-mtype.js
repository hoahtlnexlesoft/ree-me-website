/* R.E.E M&E — phone typography: scale large text down on small screens (≤ 639px).
   ≥ 32px → 80%, 20–31px → 86%, 17–19px → 94%. Inputs (iOS zoom) and the review UI are untouched. */
(function () {
  var MQ = window.matchMedia('(max-width: 639px)'), SKIP = /^(INPUT|TEXTAREA|SELECT|OPTION|SCRIPT|STYLE|SVG|PATH|IMG|VIDEO|CANVAS|IFRAME|BR|HR)$/;
  function factor(px) { return px >= 32 ? 0.8 : px >= 20 ? 0.86 : px >= 17 ? 0.94 : 1; }
  function hasText(e) { for (var n = e.firstChild; n; n = n.nextSibling) if (n.nodeType === 3 && n.textContent.trim()) return true; return false; }
  function scan(root) {
    if (!MQ.matches) return;
    var all = (root || document.body).querySelectorAll('*'), todo = [];
    for (var i = 0; i < all.length; i++) {
      var e = all[i];
      if (e.hasAttribute('data-mt') || SKIP.test(e.tagName.toUpperCase())) continue;
      if (e.closest('[data-review-ui],.rv-devwrap,svg')) continue;
      if (!hasText(e)) continue;
      var px = parseFloat(getComputedStyle(e).fontSize), f = factor(px);
      var anc = e.parentElement && e.parentElement.closest('[data-mt]');
      if (anc && Math.abs(parseFloat(getComputedStyle(anc).fontSize) - px) < 0.2) continue; // inherits an already-scaled size
      if (f < 1) todo.push([e, px, f]);
    }
    for (var j = 0; j < todo.length; j++) { var t = todo[j]; t[0].setAttribute('data-mt', t[0].style.fontSize || ''); t[0].style.setProperty('font-size', (Math.round(t[1] * t[2] * 10) / 10) + 'px', 'important'); }
  }
  function reset() { var a = document.querySelectorAll('[data-mt]'); for (var i = 0; i < a.length; i++) { var o = a[i].getAttribute('data-mt'); a[i].style.removeProperty('font-size'); if (o) a[i].style.fontSize = o; a[i].removeAttribute('data-mt'); } }
  var t; function q() { clearTimeout(t); t = setTimeout(function () { scan(); }, 80); }
  function start() {
    new MutationObserver(q).observe(document.body, { childList: true, subtree: true, characterData: true });
    (MQ.addEventListener ? MQ.addEventListener('change', onMq) : MQ.addListener(onMq));
    q();
  }
  function onMq() { reset(); q(); }
  if (document.body) start(); else document.addEventListener('DOMContentLoaded', start);
})();
