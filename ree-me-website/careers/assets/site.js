/* embedded inside the R.E.E M&E website: hide own header, report scroll + page to the host */
(function(){
  var emb = false;
  try{ emb = window.parent !== window && !!window.parent.document.querySelector(".ree-careers-frame"); }catch(e){}
  if(!emb) return;
  /* host links may use the website's job codes (e.g. 26055_02): map them to this page's job ids */
  try{ if(/job\.html$/.test(location.pathname) && location.hash && window.JOBS){
    var c = decodeURIComponent(location.hash.slice(1));
    if(!JOBS.some(function(j){ return j.id === c; })){ var hit = JOBS.filter(function(j){ return j.code === c; })[0]; if(hit) history.replaceState(null, "", "#" + hit.id); }
  } }catch(e){}
  window.REE_EMBED = true; document.documentElement.classList.add("embed");
  var post = function(m){ m.reeCareers = 1; try{ parent.postMessage(m, "*"); }catch(e){} };
  var raf = 0;
  addEventListener("scroll", function(){ if(raf) return; raf = requestAnimationFrame(function(){ raf = 0; post({t:"scroll", y:scrollY}); }); }, {passive:true});
  var loc = function(){ post({t:"loc", p:(location.pathname.split("/").pop() || "index.html") + location.hash}); };
  loc(); addEventListener("hashchange", loc);
  post({t:"scroll", y:scrollY}); addEventListener("load", function(){ post({t:"scroll", y:scrollY}); });
  /* match the host header height so heroes clear it */
  var setH = function(){ try{
    var h = parent.document.querySelector("header"); if(!h) return;
    var bar = h.querySelector("[data-main-bar]"), kids = [].slice.call(h.children);
    var top = kids.filter(function(c){ return c !== bar && parent.getComputedStyle(c).position !== "absolute"; })[0];
    var v = (top ? top.scrollHeight : 0) + (bar ? bar.offsetHeight : 0);
    if(v > 40) document.documentElement.style.setProperty("--hdr-h", v + "px");
  }catch(e){} };
  setH(); addEventListener("resize", setH); setTimeout(setH, 300); setTimeout(setH, 1200);
})();
/* REE M&E careers — shared chrome, components and interactions */
(function(){
const $ = (s, r=document) => r.querySelector(s);
const $$ = (s, r=document) => [...r.querySelectorAll(s)];
const PAGE = window.PAGE || "home";

/* ---------- icons ---------- */
const P = {
  arrow:'<path d="M7 17 17 7M9 7h8v8"/>', right:'<path d="M5 12h14M13 6l6 6-6 6"/>', left:'<path d="M19 12H5M11 6l-6 6 6 6"/>',
  pin:'<path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21Z"/><circle cx="12" cy="9.5" r="2.5"/>',
  money:'<rect x="3" y="6" width="18" height="12" rx="1"/><circle cx="12" cy="12" r="2.6"/>',
  clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>', cal:'<rect x="3.5" y="5" width="17" height="15" rx="1"/><path d="M3.5 10h17M8 3v4M16 3v4"/>',
  brief:'<rect x="3" y="7" width="18" height="13" rx="1"/><path d="M9 7V4h6v3M3 13h18"/>',
  users:'<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0M16 4.5a3.5 3.5 0 0 1 0 7M18 14a5 5 0 0 1 3.5 6"/>',
  heart:'<path d="M12 20s-7.5-4.6-7.5-10.2A4.3 4.3 0 0 1 12 7.3a4.3 4.3 0 0 1 7.5 2.5C19.5 15.4 12 20 12 20Z"/>',
  shield:'<path d="M12 3 4.5 6v6c0 4.4 3.2 7.8 7.5 9 4.3-1.2 7.5-4.6 7.5-9V6L12 3Z"/><path d="m9 12 2 2 4-4"/>',
 
  globe:'<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3.2 3 14.8 0 18M12 3c-3 3.2-3 14.8 0 18"/>',
  x:'<path d="M6 6l12 12M18 6 6 18"/>', menu:'<path d="M4 8h16M4 16h16"/>', up:'<path d="M12 19V5M6 11l6-6 6 6"/>',
  chat:'<path d="M4 5h16v11H9l-5 4V5Z"/><path d="M8 10h8M8 13h5"/>', copy:'<rect x="8" y="8" width="12" height="12" rx="1"/><path d="M16 8V4H4v12h4"/>',
  phone:'<path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2Z"/>', mail:'<rect x="3" y="5" width="18" height="14" rx="1"/><path d="m3.5 6 8.5 7 8.5-7"/>',
  bell:'<path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15L6 16Z"/><path d="M10 20a2 2 0 0 0 4 0"/>', check:'<path d="m5 12 4.5 4.5L19 7"/>',
  upload:'<path d="M12 16V4M7 9l5-5 5 5M4 16v4h16v-4"/>', share:'<circle cx="18" cy="5" r="2.5"/><circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="19" r="2.5"/><path d="m8.2 10.8 7.6-4.4M8.2 13.2l7.6 4.4"/>',
  sun:'<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.4 1.4M17.6 17.6 19 19M5 19l1.4-1.4M17.6 6.4 19 5"/>', moon:'<path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5Z"/>',
  fb:'<path d="M14 8h3V4h-3a4 4 0 0 0-4 4v3H7v4h3v6h4v-6h3l1-4h-4V8.5a.5.5 0 0 1 .5-.5Z"/>', in:'<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M8 10v7M8 7v.01M12 17v-4a2 2 0 0 1 4 0v4M12 10v7"/>', yt:'<rect x="2.5" y="6" width="19" height="12" rx="2"/><path d="m10 9.5 5 2.5-5 2.5v-5Z"/>',
  reset:'<path d="M4 12a8 8 0 1 0 2.4-5.7M4 4v4h4"/>',
  grid:'<rect x="4" y="4" width="7" height="7"/><rect x="13" y="4" width="7" height="7"/><rect x="4" y="13" width="7" height="7"/><rect x="13" y="13" width="7" height="7"/>', list:'<path d="M4 6h16M4 12h16M4 18h16"/>',
  file:'<path d="M14 3H5v18h14V8l-5-5Z"/><path d="M14 3v5h5"/>', star:'<path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9L12 3Z"/>',
  down:'<path d="m6 9 6 6 6-6"/>', gym:'<path d="M6 8v8M3 10v4M18 8v8M21 10v4M6 12h12"/>', leaf:'<path d="M5 19c0-8 6-13 14-14-1 8-6 14-14 14Z"/><path d="M5 19 13 11"/>', cap:'<path d="m2 9 10-5 10 5-10 5L2 9Z"/><path d="M6 11v5c3 2.5 9 2.5 12 0v-5"/>', party:'<path d="M4 20 9 8l7 7-12 5Z"/><path d="M13 4v2M18 5l-1.5 1.5M20 10h-2M15 9l3-3"/>', fan:'<circle cx="12" cy="12" r="2"/><path d="M12 10c0-4 1-7 4-7 2.5 0 3 3 0 5l-4 2M14 12c4 0 7 1 7 4 0 2.5-3 3-5 0l-2-4M12 14c0 4-1 7-4 7-2.5 0-3-3 0-5l4-2M10 12c-4 0-7-1-7-4 0-2.5 3-3 5 0l2 4"/>', gear:'<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1"/><circle cx="12" cy="12" r="7"/>', drop:'<path d="M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11Z"/>', calc:'<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M8 7h8M8 11h2M12 11h2M16 11h0M8 15h2M12 15h2M8 18h2M12 18h2M16 15v3"/>', cube:'<path d="m12 3 8 4.5v9L12 21l-8-4.5v-9L12 3Z"/><path d="m4 7.5 8 4.5 8-4.5M12 12v9"/>', shieldbolt:'<path d="M12 3 4.5 6v6c0 4.4 3.2 7.8 7.5 9 4.3-1.2 7.5-4.6 7.5-9V6L12 3Z"/><path d="m13 7-3 5h4l-3 5"/>', bolt:'<path d="M13 2 4 14h7l-1 8 9-12h-7l1-8Z"/>', bubble:'<path d="M12 4a8 8 0 0 0-6.9 12.1L4 20l4-1.1A8 8 0 1 0 12 4Z"/>', tiktok:'<path d="M14 4v10.5a3.5 3.5 0 1 1-3.5-3.5"/><path d="M14 4c.4 2.6 2.2 4.3 5 4.5"/>', flame:'<path d="M12 3c1 3 4 4.5 4 8.5a4 4 0 0 1-8 0c0-1.8.8-3 1.8-4 .2 1.5 1 2.3 2 2.5-.8-2.5-.3-5 .2-7Z"/>', bookmark:'<path d="M6 3h12v18l-6-4-6 4V3Z"/>', kebab:'<circle cx="12" cy="5" r="1.4" fill="currentColor"/><circle cx="12" cy="12" r="1.4" fill="currentColor"/><circle cx="12" cy="19" r="1.4" fill="currentColor"/>', layers:'<path d="m12 3 9 5-9 5-9-5 9-5Z"/><path d="m3 13 9 5 9-5"/>'
};
const ic = (n, attr="") => `<svg ${attr} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${P[n]||""}</svg>`;
window.ic = ic;

/* ---------- storage ---------- */
const store = {
  get(k, d){ try{ const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; }catch(e){ return d; } },
  set(k, v){ try{ localStorage.setItem(k, JSON.stringify(v)); }catch(e){} }
};
window.store = store;

/* ---------- MEP system palette ---------- */
window.SYS_COLOR = { HVAC:"var(--sys-hvac)", ELEC:"var(--sys-elec)", PLB:"var(--sys-plb)", FIRE:"var(--sys-fire)", ELV:"var(--sys-elv)", BMS:"var(--sys-bms)" };

/* ---------- poster patterns (abstract, drawn from MEP drawing vocabulary) ---------- */
function rng(seed){ let s = 7; for(const c of String(seed)) s = (s*31 + c.charCodeAt(0)) >>> 0; return () => (s = (s*1664525 + 1013904223) >>> 0) / 4294967296; }
window.posterSVG = function(seed, kind=0){
  const r = rng(seed), W = 300, H = 400; let g = "";
  const k = kind % 4;
  if(k === 0){ // duct elbows: concentric quarter arcs
    for(let i=0;i<9;i++){ const rad = 40 + i*26; g += `<path d="M${W} ${H-rad} A${rad} ${rad} 0 0 0 ${W-rad} ${H}" stroke="rgba(255,255,255,${.08+i*.03})" stroke-width="1.2" fill="none"/>`; }
    g += `<circle cx="${W-120}" cy="${H-120}" r="5" fill="#fff"/>`;
  } else if(k === 1){ // sprinkler grid
    for(let y=40;y<H;y+=36) for(let x=30;x<W;x+=36){ const big = r() > .9; g += `<circle cx="${x}" cy="${y}" r="${big?6:2}" fill="${big?'#fff':'rgba(255,255,255,.35)'}"/>`; if(big) g += `<circle cx="${x}" cy="${y}" r="16" stroke="rgba(255,255,255,.35)" fill="none"/>`; }
  } else if(k === 2){ // cable tray runs
    for(let i=0;i<14;i++){ const y = 30 + i*26; const x = 20 + r()*120; g += `<path d="M0 ${y}H${x}l20 20H${W}" stroke="rgba(255,255,255,${.12+r()*.25})" stroke-width="${r()>.8?3:1}" fill="none"/>`; }
  } else { // section through slabs with risers
    for(let y=60;y<H;y+=58) g += `<rect x="0" y="${y}" width="${W}" height="6" fill="rgba(255,255,255,.14)"/>`;
    [70,92,114,210].forEach((x,i) => g += `<path d="M${x} 0V${H}" stroke="rgba(255,255,255,${.25+i*.1})" stroke-width="2" stroke-dasharray="${i===3?'6 6':'0'}"/>`);
  }
  return `<svg class="pat" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid slice" aria-hidden="true">${g}</svg>`;
};

/* ---------- formatting ---------- */
window.fmtDate = d => { const [y,m,dd] = d.split("-"); return `${dd}.${m}.${y}`; };
window.daysLeft = d => Math.ceil((new Date(d+"T23:59:59+07:00") - new Date())/86400000);
window.jobURL = j => `job.html#${j.id}`;
const sysDots = j => j.systems.map(s => `<span class="sysdot" style="--c:${SYS_COLOR[s]}">${s}</span>`).join("");
window.sysDots = sysDots;
const badge = j => { const left = daysLeft(j.deadline);
  return left <= 10 && left >= 0 ? `<span class="chip hot">Còn ${left} ngày</span>` : (j.hot ? `<span class="chip hot">Tuyển gấp</span>` : `<span class="chip line">${DEPTS[j.dept].short}</span>`); };
const isSaved = id => store.get("ree_saved", []).includes(id);

/* ---------- job row (list) ---------- */
const JOB_TONE = {
  fan:["#2F6FE0","#E3EDFE"], shieldbolt:["#14935F","#DDF3E8"], users:["#6B4FD8","#ECE7FD"], gear:["#E58A12","#FDF0DC"],
  cube:["#3F51D8","#E5E8FC"], calc:["#0E8F8F","#DCF3F2"], drop:["#1593C4","#DDF0F8"], bolt:["#D9861C","#FDF1DD"]
};
const SYS_CHIP = { HVAC:"#2F6FE0", BMS:"#7A4FD8", ELEC:"#D98412", ELV:"#7A4FD8", PLB:"#1F9A5C", FIRE:"#E0443A" };
const jobIcon = j => /HVAC/.test(j.title) ? "fan" : j.level==="Quản lý" ? "shieldbolt" : /General/i.test(j.title) ? "users"
  : j.dept==="design" ? "cube" : j.dept==="qs" ? "calc" : (j.systems[0]==="PLB" ? "drop" : j.systems[0]==="ELEC" ? "bolt" : "gear");
const sentence = t => { let first = true, prev = ""; return t.replace(/\([^)]*\)|[^\s()]+/g, w => {
  if(w.startsWith("(")) { prev = w; return w; } const keep = ((w.match(/[A-ZĐÀ-Ỹ]/g)||[]).length >= 2 && w === w.toUpperCase()) || prev === "/";
  const out = first ? w : (keep ? w : w.toLowerCase()); first = false; prev = w; return out; }); };
window.jobRow = function(j, i){
  const feat = i === 0 && j.hot, k = jobIcon(j), [c, bg] = JOB_TONE[k];
  const sys = j.systems, max = feat ? 2 : 4;
  const chips = (j.hot && !feat ? `<span class="jchip hot">${ic("flame")}Tuyển gấp</span>` : "")
    + sys.slice(0,max).map(s => `<span class="jchip" style="--c:${SYS_CHIP[s]}">${s}</span>`).join("")
    + (sys.length > max ? `<span class="jchip more">+${sys.length-max}</span>` : "");
  return `<article class="jrow${feat?" feat":""}">
    ${feat ? `<span class="jflag">${ic("flame")}Tuyển gấp</span>` : ""}
    <span class="jico" style="--c:${c};--bg:${bg}">${ic(k)}</span>
    <div class="jmain"><span class="code">${j.code}</span><h3><a href="${jobURL(j)}">${sentence(j.title)}</a></h3><div class="tags">${chips}</div></div>
    <div class="jcell">${ic("pin")}<div><small>Địa điểm</small><span class="loc-pills">${window.locPills ? locPills(j) : j.loc}</span></div></div>
    <div class="jcell">${ic("money")}<div><small>Mức lương</small>${j.salary}</div></div>
    ${j.english !== undefined ? `<div class="jcell">${ic("brief")}<div><small>Kinh nghiệm</small>${j.exp}</div></div><div class="jcell">${ic("globe")}<div><small>Tiếng Anh</small>${j.english}</div></div>` : `<div class="jcell">${ic("cal")}<div><small>Hạn nộp</small><span class="num">${fmtDate(j.deadline)}</span></div></div>`}
    <span class="arr">${ic("right")}</span>
    <button class="jsave" data-save="${j.id}" aria-pressed="${isSaved(j.id)}" aria-label="Lưu việc làm">${ic("bookmark")}</button>
  </article>`;
};

/* ---------- job tile (3-up cards on home) ---------- */
window.jobTile = function(j, primary){
  const k = jobIcon(j), [c, bg] = JOB_TONE[k];
  const chips = (j.hot ? `<span class="tchip hot">${ic("flame")}Tuyển gấp</span>` : "") + j.systems.map(s => `<span class="tchip" style="--c:${SYS_CHIP[s]}">${s}</span>`).join("");
  return `<article class="jtile">
    <header class="jt-top">
      <span class="jt-ico" style="--c:${c};--bg:${bg}">${ic(k)}</span>
      <span class="jt-org"><small>${DEPTS[j.dept].name}</small><b>${j.level} · ${j.type}</b></span>
      <span class="jt-menu"><button class="jt-kebab" aria-label="Tùy chọn" aria-expanded="false">${ic("kebab")}</button>
        <span class="jt-pop" hidden><button data-save="${j.id}" aria-pressed="${isSaved(j.id)}">${ic("bookmark")}<span>Lưu việc làm</span></button><button data-copy="${j.title} – ${j.code}">${ic("copy")}<span>Sao chép mã</span></button><a href="${jobURL(j)}#apply">${ic("arrow")}<span>Ứng tuyển ngay</span></a></span></span>
    </header>
    <h3><a href="${jobURL(j)}">${sentence(j.title)}</a></h3>
    <p class="jt-sub">Mã: ${j.code} · Hạn nộp: <span class="num">${fmtDate(j.deadline)}</span></p>
    <div class="jt-info"><div><small>Địa điểm</small>${j.loc.split(" · ")[0].replace("TP. Hồ Chí Minh","TP. HCM")}</div><div><small>Thu nhập</small>${j.salary}</div><div><small>Kinh nghiệm</small>${j.exp}</div></div>
    <div class="jt-skills"><small>Hệ thống</small><div>${chips}</div></div>
    <footer class="jt-foot"><a class="jt-btn${primary?" primary":""}" href="${jobURL(j)}">Xem chi tiết</a></footer>
  </article>`;
};
window.jobMini = function(j){
  const loc = j.loc.split(" · ")[0].replace("TP. Hồ Chí Minh","TP. HCM");
  return `<article class="jmini">
    <div class="jm-top"><span class="jm-pill">Mã: ${j.code}</span><span class="jm-pill">${loc}</span></div>
    <h3><a href="${jobURL(j)}">${j.title}</a></h3>
    <p class="jm-sum">${j.summary}</p>
    <div class="jm-tags"><span class="jm-tag money">${ic("money")}${j.salary}</span><span class="jm-tag exp">${ic("brief")}${j.exp} KN</span></div>
    <footer class="jm-foot"><span>${j.type}</span><span class="jm-go">Ứng tuyển ngay ${ic("right")}</span></footer>
  </article>`;
};
document.addEventListener("click", e => {
  const kb = e.target.closest(".jt-kebab");
  document.querySelectorAll(".jt-pop").forEach(p => { if(!kb || p !== kb.nextElementSibling){ p.hidden = true; p.previousElementSibling.setAttribute("aria-expanded","false"); } });
  if(kb){ const p = kb.nextElementSibling; p.hidden = !p.hidden; kb.setAttribute("aria-expanded", !p.hidden); }
});

/* ---------- job card (grid) ---------- */
window.jobCard = function(j){
  return `<article class="job">
    <div class="job-top">${badge(j)}<span class="code">${j.code}</span></div>
    <h3><a href="${jobURL(j)}">${j.title}</a></h3>
    <p class="sum">${j.summary}</p>
    <div class="meta"><div><small>Địa điểm</small>${j.loc.split(" · ")[0]}</div><div><small>Thu nhập</small>${j.salary}</div><div><small>Kinh nghiệm</small>${j.exp}</div></div>
    <div class="job-foot"><span style="display:flex;gap:10px;flex-wrap:wrap">${sysDots(j)}</span>
      <button class="save-btn" data-save="${j.id}" aria-pressed="${isSaved(j.id)}" aria-label="Lưu việc làm">${ic("heart")}</button></div>
  </article>`;
};

/* ---------- header / footer ---------- */
const NAV = [
  ["about","#","Về chúng tôi"],["services","services.html","Dịch vụ"],["projects","#","Công trình"],
  ["sustain","#","Phát triển bền vững"],["news","#","Tin tức"],["careers","./","Tuyển dụng"]
];
const navCur = k => k === PAGE || (k === "careers" && ["home","jobs","job"].includes(PAGE));
function header(){
  const n = store.get("ree_saved", []).length;
  return `<header class="site-header"><div class="hdr-top"><div class="wrap">
      <div class="ht-l"><span class="ht-lbl">Hồ sơ năng lực</span><button type="button" class="ht-pill" data-open="profile">Xem nhanh</button><button type="button" class="ht-pill solid" data-pdf>Tải PDF</button></div>
      <div class="ht-r"><a class="ht-link" href="tel:19003339">Hotline 1900 3339</a><a class="ht-link" href="#lien-he">Liên hệ</a><span class="ht-lang"><b aria-current="true">VN</b><i>/</i><button type="button" data-lang="en">EN</button></span><button type="button" class="ht-theme" id="themeBtn" aria-label="Đổi giao diện sáng/tối" title="Giao diện sáng / tối">${ic("moon")}</button></div>
    </div></div>
    <div class="hdr-main"><div class="wrap">
      <a class="logo" href="./" aria-label="REE M&E – Trang chủ tuyển dụng"><img class="logo-img" src="assets/img/ree-logo.svg" alt="REE M&amp;E" width="98" height="69"><span class="logo-name">Công ty Cổ phần Dịch vụ &amp; Kỹ thuật<br>Cơ điện lạnh R.E.E</span></a>
      <button class="burger" id="menuBtn" aria-label="Mở menu" aria-expanded="false" aria-controls="nav"><span></span><span></span><span></span></button>
    </div></div>
    <div class="drawer" id="nav" aria-hidden="true">
      <div class="drawer-panel">
        <div class="dr-head"><span class="dr-eyebrow">Menu</span>
          <span class="dr-tools"><button class="dr-sq dr-close" data-close-menu aria-label="Đóng menu">${ic("x")}</button></span></div>
        <nav class="drawer-nav">${NAV.map(([k,h,t],i) => `<a href="${h}" ${h==="#"?'data-soon':""} ${navCur(k)?'aria-current="page"':""}><small>0${i+1}</small><span>${t}</span></a>`).join("")}</nav>
        <div class="dr-quick"><span class="dr-qh">Liên hệ nhanh</span>
          <a href="tel:19003339">${ic("phone")}1900 3339</a><a href="mailto:ree@reeme.com.vn">${ic("mail")}ree@reeme.com.vn</a>
          <button class="dr-cta" data-open="chat"><span>Liên hệ với chúng tôi</span>${ic("arrow")}</button></div>
      </div>
    </div></header>`;
}
const OFFICES = [
  { k:"hcm", tab:"TP. Hồ Chí Minh", name:"Trụ sở chính — TP. Hồ Chí Minh", a1:"Tầng 2, Tòa nhà Etown 5, 364 Cộng Hoà,", a2:"Phường Tân Bình, Thành phố Hồ Chí Minh", phone:"(028) 3810 0068", mail:"ree@reeme.com.vn", map:"https://www.google.com/maps/search/?api=1&query=Etown+5+364+C%E1%BB%99ng+H%C3%B2a+T%C3%A2n+B%C3%ACnh" },
  { k:"hn", tab:"Hà Nội", name:"Văn phòng làm việc — Hà Nội", a1:"Tầng 17, Toà nhà ICON 4, 243A Đê La Thành,", a2:"Phường Láng, Thành phố Hà Nội", phone:"(024) 6281 9791", mail:"ree@reeme.com.vn", map:"https://www.google.com/maps/search/?api=1&query=ICON4+243A+%C4%90%C3%AA+La+Th%C3%A0nh" }
];
OFFICES.forEach(o => o.addr = `${o.a1} ${o.a2}`);
const officeHTML = o => `<div class="fo-office"><h4>${o.name}</h4>
  <p class="fo-addr">${ic("pin")}<span>${o.a1}</span></p><p class="fo-addr">${ic("pin")}<span>${o.a2}</span></p>
  <div class="fo-row"><button type="button" class="fo-line" data-copy="${o.phone}">${ic("phone")}${o.phone}</button><button type="button" class="fo-line" data-copy="${o.mail}">${ic("mail")}${o.mail}</button><a class="fo-map" href="${o.map}" target="_blank" rel="noopener">Xem bản đồ ${ic("arrow")}</a></div></div>`;
function footer(){
  return `<footer class="site-footer fo" id="lien-he">
    <div class="fo-media" aria-hidden="true"><img src="assets/img/why-tower.jpg" alt="" loading="lazy"><span class="fo-frame f1"></span><span class="fo-frame f2"></span></div>
    <div class="wrap fo-inner">
      <span class="fo-eyebrow">Liên hệ</span>
      <h2 class="fo-title">Mạng lưới văn phòng</h2>
      <div class="fo-offices">${OFFICES.map(officeHTML).join("")}</div>
      <h4 class="fo-navh">Điều hướng</h4>
      <nav class="fo-nav" aria-label="Điều hướng"><a href="./">Trang chủ</a><a href="jobs.html">Vị trí tuyển dụng</a><a href="./#moi-truong">Phúc lợi &amp; đãi ngộ</a><a href="./#con-nguoi">Con người REE M&amp;E</a><a href="./#doi-song">Văn hóa doanh nghiệp</a><a href="#" data-open="profile">Hồ sơ năng lực</a></nav>
      <div class="fo-cta"><a class="btn btn-accent" href="tel:19003339">${ic("phone")} 1900 3339</a><button class="btn btn-line" data-open="chat">Gửi yêu cầu ${ic("arrow")}</button></div>
      <div class="fo-bottom">
        <div class="fo-brand"><img src="assets/img/ree-logo.svg" alt="REE M&amp;E" width="70" height="49"><p>Công ty Cổ phần Dịch vụ &amp; Kỹ thuật Cơ điện lạnh R.E.E — Nhà thầu Cơ điện lạnh (MEPF) cho các công trình trọng điểm trên toàn quốc.</p></div>
        <div class="fo-meta"><a href="mailto:ree@reeme.com.vn">ree@reeme.com.vn</a><span>MST: 0302660700</span>
          <span class="fo-soc"><a href="https://www.tiktok.com/@tuyendungreeme" target="_blank" rel="noopener" aria-label="TikTok">${ic("tiktok")}</a><a href="https://www.facebook.com" target="_blank" rel="noopener" aria-label="Facebook">${ic("fb")}</a><a href="https://www.linkedin.com" target="_blank" rel="noopener" aria-label="LinkedIn">${ic("in")}</a><a href="mailto:ree@reeme.com.vn" aria-label="Email">${ic("mail")}</a></span></div>
        <p class="fo-copy">© 2026 R.E.E M&amp;E — Công ty Cổ phần Dịch vụ &amp; Kỹ thuật Cơ điện lạnh R.E.E</p>
      </div>
    </div>
  </footer>
  <div class="fab"><button class="top" id="toTop" aria-label="Lên đầu trang">${ic("up")}</button><button class="qc-bubble" id="qcBtn" aria-label="Liên hệ nhanh" aria-expanded="false" aria-controls="qcPop">${ic("bubble")}</button></div>
  <div class="qc-pop" id="qcPop" role="dialog" aria-label="Liên hệ nhanh" hidden>
    <div class="qc-head"><h3>Liên hệ nhanh</h3><p>Chọn kênh phù hợp — chúng tôi phản hồi ngay trong giờ làm việc.</p><button class="qc-x" data-qc-close aria-label="Đóng">${ic("x")}</button></div>
    <div class="qc-list">
      <a class="qc-item" href="https://www.tiktok.com/@tuyendungreeme" target="_blank" rel="noopener"><span class="qc-ic">${ic("tiktok")}</span><span><small>TikTok</small><b>@tuyendungreeme</b><em>Theo dõi hoạt động &amp; tuyển dụng</em></span></a>
      <a class="qc-item" href="https://www.facebook.com" target="_blank" rel="noopener"><span class="qc-ic">${ic("fb")}</span><span><small>Facebook</small><b>R.E.E M&amp;E</b><em>Tin tức và dự án mới nhất</em></span></a>
      <a class="qc-item" href="https://www.linkedin.com" target="_blank" rel="noopener"><span class="qc-ic">${ic("in")}</span><span><small>LinkedIn</small><b>REE M&amp;E JSC</b><em>Kết nối chuyên môn &amp; cơ hội nghề nghiệp</em></span></a>
      <a class="qc-item" href="mailto:ree@reeme.com.vn"><span class="qc-ic">${ic("mail")}</span><span><small>Email</small><b>ree@reeme.com.vn</b><em>Phản hồi trong 24 giờ làm việc</em></span></a>
    </div>
    <button class="qc-cta" data-open="chat">Gửi yêu cầu tư vấn ${ic("right")}</button>
  </div>`;
}

/* ---------- modal & toast ---------- */
let lastFocus = null;
window.openModal = function(html, {wide=false, cls=""}={}){
  closeModal(); lastFocus = document.activeElement;
  const m = document.createElement("div");
  m.className = "modal"; m.setAttribute("role","dialog"); m.setAttribute("aria-modal","true");
  m.innerHTML = `<div class="modal-box${wide?" wide":""}${cls?" "+cls:""}"><button class="modal-close" data-close aria-label="Đóng">${ic("x")}</button>${html}</div>`;
  m.addEventListener("click", e => { if(e.target === m || e.target.closest("[data-close]")) closeModal(); });
  document.body.appendChild(m); document.body.style.overflow = "hidden";
  (m.querySelector(".modal-body input, .modal-body a, .modal-body button, .cm-form input") || m.querySelector(".modal-close")).focus({preventScroll:true});
  return m;
};
window.closeModal = function(){ const m = $(".modal"); if(!m) return; m.remove(); document.body.style.overflow = ""; lastFocus?.focus?.({preventScroll:true}); };
document.addEventListener("keydown", e => { if(e.key === "Escape") closeModal(); });
window.toast = function(msg){ $(".toast")?.remove(); const t = document.createElement("div"); t.className="toast"; t.setAttribute("role","status"); t.textContent = msg; document.body.appendChild(t); setTimeout(()=>t.remove(), 2600); };
window.posterHead = (seed, kind, bg, title) => `<div class="modal-hero" style="background:${bg}">${posterSVG(seed, kind)}<h3>${title}</h3></div>`;

/* ---------- shared modal content ---------- */
const MODALS = {
  saved(){
    const ids = store.get("ree_saved", []); const list = JOBS.filter(j => ids.includes(j.id));
    return `<div class="modal-body"><span class="eyebrow">Danh sách của bạn</span><h3>Đã lưu · ${list.length}</h3>
      ${list.length ? `<ul>${list.map(j=>`<li style="padding-left:0"><a href="${jobURL(j)}" style="display:flex;justify-content:space-between;gap:12px;align-items:center"><span><b style="display:block;color:var(--brand-ink)">${j.title}</b><span style="font-size:12px;color:var(--muted)">${j.loc} · ${j.salary}</span></span>${ic("arrow",'style="width:16px;height:16px;flex:none;color:var(--accent)"')}</a></li>`).join("")}</ul>`
      : `<p>Bạn chưa lưu vị trí nào. Bấm biểu tượng trái tim trên vị trí để lưu lại và xem sau.</p><div class="modal-actions"><a class="btn btn-accent" href="jobs.html">Khám phá vị trí ${ic("arrow")}</a></div>`}
      <p style="font-size:12px">Danh sách lưu trên trình duyệt này.</p></div>`;
  },
  alert(){
    return `${posterHead("alert",2,"var(--navy-2)","Nhận tin việc làm")}<div class="modal-body"><p>Chọn lĩnh vực bạn quan tâm, chúng tôi sẽ gửi email khi có vị trí phù hợp.</p>
      <form id="alertForm" novalidate style="display:grid;gap:18px">
        <div class="field"><label for="al-email">Email <i>*</i></label><input class="input" id="al-email" type="email" placeholder="ten@email.com" required><span class="err" id="al-err"></span></div>
        <div class="field"><label>Lĩnh vực</label><div style="display:flex;flex-wrap:wrap;gap:8px">${Object.entries(DEPTS).map(([k,d])=>`<label style="display:inline-flex;gap:8px;align-items:center;border:1px solid var(--line-strong);padding:8px 12px;font-size:13px;cursor:pointer;text-transform:none;letter-spacing:0;color:var(--fg);font-weight:500"><input type="checkbox" id="al-${k}" value="${k}" checked> ${d.short}</label>`).join("")}</div></div>
        <button class="btn btn-accent" type="submit">${ic("bell")} Đăng ký nhận tin</button></form></div>`;
  },
  profile(){
    return `<div class="modal-body"><span class="eyebrow">Hồ sơ năng lực</span><h3>REE M&amp;E — Nhà thầu cơ điện tổng thể</h3>
      <p>Công ty Cổ phần Dịch vụ &amp; Kỹ thuật Cơ điện lạnh R.E.E (REE M&amp;E) là nhà thầu cơ điện (MEP) hàng đầu Việt Nam, cung cấp giải pháp cơ điện tổng thể cho các công trình trọng điểm quốc gia.</p>
      <div class="pf-stats"><div><b>995+</b><span>công trình đã thực hiện</span></div><div><b>100+</b><span>chủ đầu tư &amp; đối tác</span></div><div><b>40+</b><span>năm trong ngành cơ điện</span></div></div>
      <ul><li>Hệ thống điều hòa thông gió (HVAC), điện động lực &amp; chiếu sáng, điện nhẹ (ELV)</li><li>Cấp thoát nước, phòng cháy chữa cháy, quản lý tòa nhà (BMS)</li><li>Thiết kế, dựng mô hình BIM, dự toán và thi công trọn gói</li></ul>
      <div class="modal-actions"><a class="btn btn-accent" href="jobs.html">Xem vị trí đang tuyển ${ic("arrow")}</a><button class="btn btn-ghost" data-open="chat">Liên hệ</button></div></div>`;
  },
  chat(){
    const pin = ic("pin"), opts = JOBS.map(j => `<option>${j.title}</option>`).join("");
    return `<div class="cm">
      <aside class="cm-side">
        <span class="cm-bar"></span>
        <h3>Liên hệ tuyển dụng REE M&amp;E</h3>
        <p class="cm-lead">Phòng Nhân sự phản hồi câu hỏi của bạn trong 1–2 ngày làm việc.</p>
        <button type="button" class="cm-line" data-copy="${OFFICES[0].phone}">${ic("phone")}<b>${OFFICES[0].phone}</b></button>
        <button type="button" class="cm-line" data-copy="${OFFICES[0].mail}">${ic("mail")}<span>${OFFICES[0].mail}</span></button>
        <hr>
        ${OFFICES.map(o => `<div class="cm-office"><h4>${o.name}</h4><p>${pin}<span>${o.addr}<small>${o.phone}</small></span></p></div>`).join("")}
      </aside>
      <form class="cm-form" id="chatForm" novalidate>
        <span class="cm-eyebrow">Hỗ trợ ứng viên</span>
        <h3>Gửi câu hỏi cho chúng tôi</h3>
        <div class="cm-grid">
          <label class="cm-f"><span>Họ và tên <i>*</i></span><input id="cf-name" autocomplete="name" required></label>
          <label class="cm-f"><span>Vị trí quan tâm</span><select id="cf-job"><option value="">Chưa chọn vị trí cụ thể</option>${opts}</select></label>
          <label class="cm-f"><span>Số điện thoại <i>*</i></span><input id="cf-phone" type="tel" autocomplete="tel" inputmode="tel" required></label>
          <label class="cm-f"><span>Email <i>*</i></span><input id="cf-email" type="email" autocomplete="email" required></label>
          <label class="cm-f cm-full"><span>Nội dung</span><textarea id="cf-msg" rows="4" placeholder="Bạn muốn hỏi về vị trí, quy trình tuyển dụng hay chế độ đãi ngộ?"></textarea></label>
        </div>
        <p class="cm-err" id="cf-err" role="alert"></p>
        <button class="btn btn-accent cm-send" type="submit">Gửi câu hỏi ${ic("right")}</button>
      </form>
    </div>`;
  }
};
window.MODALS = MODALS;

/* ---------- mount ---------- */
function mount(){
  const h = $("#site-header"), f = $("#site-footer");
  if(h) h.outerHTML = header();
  if(f) f.outerHTML = footer();
  const hdr = $(".site-header");

  // transparent header over the navy plate at the top of the page
  const firstPlate = $("main > .plate:first-child");
  if(firstPlate){ document.body.classList.add("has-over-header");
    const sync = () => hdr.classList.toggle("is-over", scrollY < firstPlate.offsetHeight - 140);
    addEventListener("scroll", sync, {passive:true}); sync(); hdr._sync = sync; }

  // theme toggle (per-viewer convenience)
  const root = document.documentElement;
  const saved = store.get("ree_theme", null); if(saved) root.dataset.theme = saved;
  const isDark = () => root.dataset.theme === "dark";
  const syncIcon = () => { const b = $("#themeBtn"); if(b) b.innerHTML = ic(isDark() ? "sun" : "moon"); };
  syncIcon();
  $("#themeBtn")?.addEventListener("click", () => { root.dataset.theme = isDark() ? "light" : "dark"; store.set("ree_theme", root.dataset.theme); syncIcon(); });

  // mobile menu
  const nav = $("#nav"), mb = $("#menuBtn");
  const setMenu = o => { nav.classList.toggle("open", o); nav.setAttribute("aria-hidden", !o); mb.setAttribute("aria-expanded", o); mb.classList.toggle("x", o); mb.setAttribute("aria-label", o ? "Đóng menu" : "Mở menu"); document.body.style.overflow = o ? "hidden" : ""; document.body.classList.toggle("menu-open", o); };
  mb.addEventListener("click", () => setMenu(!nav.classList.contains("open")));
  nav.addEventListener("click", e => { if(e.target === nav || e.target.closest("a") || e.target.closest("[data-open]") || e.target.closest("[data-close-menu]")) setMenu(false); });
  document.addEventListener("keydown", e => { if(e.key === "Escape" && nav.classList.contains("open")) setMenu(false); });
  // compact header after scrolling
  const compact = () => hdr.classList.toggle("is-compact", scrollY > 40);
  addEventListener("scroll", compact, {passive:true}); compact();

  // quick contact popover
  const qb = $("#qcBtn"), qp = $("#qcPop");
  const setQc = o => { qp.hidden = !o; qb.setAttribute("aria-expanded", o); qb.classList.toggle("on", o); qb.innerHTML = ic(o ? "x" : "bubble"); };
  qb.addEventListener("click", e => { e.stopPropagation(); setQc(qp.hidden); });
  qp.addEventListener("click", e => { if(e.target.closest("[data-qc-close]") || e.target.closest("[data-open]") || e.target.closest("a")) setQc(false); });
  document.addEventListener("click", e => { if(!qp.hidden && !e.target.closest("#qcPop") && !e.target.closest("#qcBtn")) setQc(false); });
  document.addEventListener("keydown", e => { if(e.key === "Escape" && !qp.hidden) setQc(false); });

  // back to top
  const tt = $("#toTop");
  addEventListener("scroll", () => tt.classList.toggle("show", scrollY > 700), {passive:true});
  tt.addEventListener("click", () => scrollTo({top:0, behavior:"smooth"}));
}

/* ---------- global delegation ---------- */
document.addEventListener("click", e => {
  const op = e.target.closest("[data-open]");
  if(op && MODALS[op.dataset.open]){ e.preventDefault(); openModal(MODALS[op.dataset.open](), {cls: op.dataset.open === "chat" ? "split" : ""}); return; }

  const sv = e.target.closest("[data-save]");
  if(sv){ e.preventDefault(); const id = sv.dataset.save; let ids = store.get("ree_saved", []);
    const on = !ids.includes(id); ids = on ? [...ids, id] : ids.filter(x => x !== id); store.set("ree_saved", ids);
    $$(`[data-save="${id}"]`).forEach(b => b.setAttribute("aria-pressed", on));
    $$(".saved-count").forEach(b => b.dataset.n = ids.length);
    toast(on ? "Đã lưu vị trí vào danh sách" : "Đã bỏ lưu vị trí"); return; }

  const cp = e.target.closest("[data-copy]");
  if(cp){ const v = cp.dataset.copy;
    try{ navigator.clipboard.writeText(v).then(() => toast(`Đã sao chép: ${v}`), () => toast(v)); }catch(err){ toast(v); } return; }

  if(e.target.closest("a[data-soon]")){ e.preventDefault(); toast("Trang này đang được cập nhật"); return; }
  if(e.target.closest("[data-pdf]")){ toast("Bản PDF hồ sơ năng lực đang được cập nhật"); return; }
  if(e.target.closest("[data-lang]")){ toast("Phiên bản tiếng Anh đang được cập nhật"); return; }
  const ot = e.target.closest("[data-office]");
  if(ot){ $$("[data-office]").forEach(b => b.setAttribute("aria-selected", b === ot)); $("#officeBox").innerHTML = officeHTML(OFFICES.find(o => o.k === ot.dataset.office)); return; }

  const a = e.target.closest('a[href*="#"]');
  if(a){ const url = new URL(a.getAttribute("href"), location.href); const np = x => x.replace(/index\.html$/,""); const samePage = np(url.pathname) === np(location.pathname);
    if(samePage && url.hash && url.hash.length > 1){ const t = document.getElementById(url.hash.slice(1)); if(t){ e.preventDefault(); scrollTo({top: t.getBoundingClientRect().top + scrollY - 72, behavior:"smooth"}); } } }
});
document.addEventListener("submit", e => {
  if(e.target.id === "alertForm"){ e.preventDefault(); const em = $("#al-email"); const ok = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em.value.trim());
    em.setAttribute("aria-invalid", !ok); $("#al-err").textContent = ok ? "" : "Vui lòng nhập email hợp lệ, ví dụ ten@email.com";
    if(ok){ closeModal(); toast("Đã đăng ký nhận tin việc làm"); } }
  if(e.target.id === "chatForm"){ e.preventDefault();
    const n = $("#cf-name"), ph = $("#cf-phone"), em = $("#cf-email");
    const bad = [[n, n.value.trim().length > 1], [ph, /^[0-9+().\s-]{8,}$/.test(ph.value.trim())], [em, /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em.value.trim())]];
    bad.forEach(([el, ok]) => el.setAttribute("aria-invalid", !ok));
    const first = bad.find(([, ok]) => !ok);
    $("#cf-err").textContent = first ? "Vui lòng điền đúng các ô có dấu * (họ tên, số điện thoại, email)." : "";
    if(first){ first[0].focus(); return; }
    closeModal(); toast("Đã gửi câu hỏi. Phòng Nhân sự sẽ phản hồi trong 1–2 ngày làm việc."); }
});

if(document.readyState === "loading") document.addEventListener("DOMContentLoaded", mount); else mount();
})();

/* mailto links: open the mail app in a new browsing context (works inside the site frame) and copy the address as a fallback */
document.addEventListener("click", function(e){
  var a = e.target.closest && e.target.closest('a[href^="mailto:"]'); if(!a) return;
  e.preventDefault();
  var href = a.getAttribute("href"), addr = href.replace(/^mailto:/,"").split("?")[0];
  try{ var w = window.open(href, "_blank"); if(w) setTimeout(function(){ try{ if(w.location.href === "about:blank") w.close(); }catch(_){} }, 1500); }catch(_){}
  try{ navigator.clipboard && navigator.clipboard.writeText(addr).catch(function(){}); }catch(_){}
  if(window.toast) toast("Đã sao chép email " + addr);
}, true);

/* bottom bars (index / jobs / job detail): switch to the full-width "rest" state with an
   expand-from-centre reveal, and collapse back to the centre before returning to the floating bar */
window.reeBarRest = function(host, anim, cls, on){
  if(!host || !anim) return; on = !!on;
  if(host._rest === on) return;
  const first = host._rest === undefined; host._rest = on; clearTimeout(host._bt);
  anim.classList.remove("bx-open","bx-close");
  if(on){ host.classList.add(cls); if(!first){ void anim.offsetWidth; anim.classList.add("bx-open"); } }
  else if(first){ host.classList.remove(cls); }
  else { anim.classList.add("bx-close"); host._bt = setTimeout(() => { host.classList.remove(cls); anim.classList.remove("bx-close"); }, 280); }
};
