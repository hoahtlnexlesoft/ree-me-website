/* R.E.E M&E — careers pages are shown inside the main site in a full-screen iframe.
   When one of their modals/lightboxes is open, hide the main site's fixed header so it doesn't sit on top of the modal. */
(function () {
  if (window.top === window.self) return;
  var SEL = '.lb, .cvm, [aria-modal="true"], [role="dialog"], .modal, [class*="modal"]', on = null;
  function covers(el) {
    if (el.closest('[data-review-ui], .afp')) return false;
    if (el.hidden || el.closest('[hidden]')) return false;
    var cs = getComputedStyle(el); if (cs.display === 'none' || cs.visibility === 'hidden') return false;
    if (cs.position !== 'fixed') return false;
    var r = el.getBoundingClientRect(); return r.width >= innerWidth * 0.9 && r.height >= innerHeight * 0.9;
  }
  function check() {
    var list = document.querySelectorAll(SEL), open = false;
    for (var i = 0; i < list.length && !open; i++) if (covers(list[i])) open = true;
    if (open === on) return; on = open;
    try { window.parent.document.documentElement.classList.toggle('ree-hide-header', open); } catch (e) {}
    try { window.parent.postMessage({ reeHideHeader: open }, '*'); } catch (e) {}
  }
  var t, t2; function q() { clearTimeout(t); clearTimeout(t2); t = setTimeout(check, 40); t2 = setTimeout(check, 450); } // second pass once open/close animations have settled
  addEventListener('transitionend', q, true); addEventListener('animationend', q, true); addEventListener('resize', q);
  function start() { new MutationObserver(q).observe(document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ['class', 'hidden', 'style', 'open', 'aria-hidden'] }); check(); }
  addEventListener('pagehide', function () { try { window.parent.document.documentElement.classList.remove('ree-hide-header'); } catch (e) {} try { window.parent.postMessage({ reeHideHeader: false }, '*'); } catch (e) {} });
  if (document.body) start(); else document.addEventListener('DOMContentLoaded', start);
})();
