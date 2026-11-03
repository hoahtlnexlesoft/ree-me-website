/* R.E.E — "Xem bản đồ": open office location in an in-page map popup (all pages). */
(function () {
  'use strict';
  if (window.__reeMap) return; window.__reeMap = 1;
  var d = document, box, frame, title, ext, lastFocus;
  function css() {
    var s = d.createElement('style');
    s.textContent =
      '.ree-map{position:fixed;inset:0;z-index:2147483000;display:flex;align-items:center;justify-content:center;padding:20px;background:rgba(6,14,38,.62);backdrop-filter:blur(4px);-webkit-backdrop-filter:blur(4px);opacity:0;pointer-events:none;transition:opacity .25s ease}' +
      '.ree-map.open{opacity:1;pointer-events:auto}' +
      '.ree-map-card{position:relative;width:min(960px,100%);height:min(640px,calc(100vh - 40px));background:#fff;border-radius:18px;overflow:hidden;display:flex;flex-direction:column;box-shadow:0 30px 80px -20px rgba(0,0,0,.5);transform:translateY(12px) scale(.98);transition:transform .3s cubic-bezier(.16,.84,.3,1)}' +
      '.ree-map.open .ree-map-card{transform:none}' +
      '.ree-map-hd{display:flex;align-items:center;gap:12px;padding:14px 16px 14px 20px;border-bottom:1px solid #E4E8F0;font-family:inherit}' +
      '.ree-map-t{flex:1;min-width:0;font-size:15px;font-weight:600;color:#0A1A55;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}' +
      '.ree-map-ext{display:inline-flex;align-items:center;gap:6px;height:36px;padding:0 14px;border-radius:999px;background:#E1251B;color:#fff!important;font-size:13px;font-weight:600;text-decoration:none;white-space:nowrap}' +
      '.ree-map-ext:hover{background:#C41E15}' +
      '.ree-map-x{all:unset;box-sizing:border-box;width:36px;height:36px;border-radius:50%;display:grid;place-items:center;color:#0A1A55;cursor:pointer;border:1px solid #DDE3EE}' +
      '.ree-map-x:hover{background:#F2F4F8}' +
      '.ree-map iframe{flex:1;width:100%;border:0;background:#EEF1F6}' +
      '@media (max-width:640px){.ree-map{padding:0;align-items:flex-end}.ree-map-card{height:82vh;border-radius:18px 18px 0 0}.ree-map-ext span{display:none}.ree-map-ext{padding:0 11px}}';
    (d.head || d.documentElement).appendChild(s);
  }
  function build() {
    css();
    box = d.createElement('div'); box.className = 'ree-map'; box.setAttribute('role', 'dialog'); box.setAttribute('aria-modal', 'true'); box.setAttribute('aria-hidden', 'true'); box.setAttribute('data-no-tfx', '');
    box.innerHTML = '<div class="ree-map-card"><div class="ree-map-hd"><div class="ree-map-t"></div>' +
      '<a class="ree-map-ext" target="_blank" rel="noopener noreferrer"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 17 17 7M8 7h9v9"/></svg><span>Mở Google Maps</span></a>' +
      '<button type="button" class="ree-map-x" aria-label="Đóng"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg></button></div>' +
      '<iframe loading="lazy" referrerpolicy="no-referrer-when-downgrade" allowfullscreen title="Bản đồ"></iframe></div>';
    d.body.appendChild(box);
    frame = box.querySelector('iframe'); title = box.querySelector('.ree-map-t'); ext = box.querySelector('.ree-map-ext');
    box.addEventListener('click', function (e) { if (e.target === box || e.target.closest('.ree-map-x')) close(); });
    d.addEventListener('keydown', function (e) { if (e.key === 'Escape' && box.classList.contains('open')) close(); });
  }
  function query(href) {
    try { var u = new URL(href, location.href); return u.searchParams.get('query') || u.searchParams.get('q') || decodeURIComponent((u.pathname.split('/place/')[1] || '').split('/')[0].replace(/\+/g, ' ')); } catch (e) { return ''; }
  }
  function open(a) {
    if (!box) build();
    var q = query(a.href);
    var row = a.closest('li,div,section'), label = '';
    var head = row && row.parentElement && row.parentElement.querySelector('h3,h4,h5,strong,p.font-bold,[class*="uppercase"]');
    label = head ? head.textContent.trim() : '';
    title.textContent = label && label.length < 60 ? label : (q || 'Bản đồ');
    ext.href = a.href;
    frame.src = 'https://maps.google.com/maps?q=' + encodeURIComponent(q) + '&hl=vi&z=16&output=embed';
    lastFocus = d.activeElement;
    box.setAttribute('aria-hidden', 'false'); box.classList.add('open');
    d.documentElement.style.overflow = 'hidden';
    setTimeout(function () { box.querySelector('.ree-map-x').focus({ preventScroll: true }); }, 30);
  }
  function close() {
    box.classList.remove('open'); box.setAttribute('aria-hidden', 'true');
    d.documentElement.style.overflow = '';
    setTimeout(function () { if (!box.classList.contains('open')) frame.src = 'about:blank'; }, 300);
    if (lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll: true });
  }
  d.addEventListener('click', function (e) {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey) return;
    var a = e.target.closest && e.target.closest('a[href*="google.com/maps"],a[href*="maps.google"],a[href*="goo.gl/maps"],a.fo-map');
    if (!a || (box && box.contains(a))) return;
    e.preventDefault(); e.stopPropagation(); open(a);
  }, true);
})();
