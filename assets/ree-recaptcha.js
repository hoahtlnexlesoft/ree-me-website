/* Google reCAPTCHA v3 (invisible, score-based)
   Protects: main site "Gửi thông tin dự án" / "Yêu cầu tư vấn" forms, and careers "Gửi hồ sơ ứng tuyển".

   SETUP
   1. https://www.google.com/recaptcha/admin → Create → type "Score based (v3)",
      domains: ree-me-website.vercel.app (+ the official domain later).
   2. Paste the SITE KEY below. While it is empty, nothing is loaded and forms work as before.
   3. The SECRET KEY never goes in this file. The server that receives the form must verify the token:
        POST https://www.google.com/recaptcha/api/siteverify  (secret, response=<recaptchaToken>, remoteip)
      and accept only when  success === true  &&  action matches  &&  score >= 0.5.
      Each submission carries:  recaptchaToken, recaptchaAction ("contact_form" | "job_apply").
      Tokens expire after 2 minutes and can be verified only once. */
(function () {
  var SITE_KEY = window.REE_RECAPTCHA_SITE_KEY || "";   // ← dán site key reCAPTCHA v3 vào đây
  /* DEMO: while there is no key, still show the Google notice so devs/clients see where reCAPTCHA sits.
     Nothing is loaded and no token is sent until SITE_KEY is filled in. */
  var DEMO_NOTICE = true;

  var css = document.createElement("style");
  css.id = "ree-recaptcha-css";
  css.textContent =
    ".grecaptcha-badge{visibility:hidden!important}" +
    ".ree-rc-note{margin:10px 0 0;font-size:11.5px;line-height:1.55;color:#7A8399;letter-spacing:0;text-transform:none;font-weight:400;display:flex;gap:7px;align-items:flex-start}" +
    ".ree-rc-note svg{flex:none;width:13px;height:13px;margin-top:2px;color:#9AA3B6}" +
    ".ree-rc-note a{color:inherit;text-decoration:underline;text-underline-offset:2px}" +
    ".ree-rc-note a:hover{color:#1B347D}" +
    "#af-review .afr-acts+.ree-rc-note{justify-content:flex-end;text-align:right;margin-top:12px}" +
    "@media (max-width:640px){#af-review .afr-acts+.ree-rc-note{justify-content:flex-start;text-align:left}}";
  (document.head || document.documentElement).appendChild(css);

  var loading = null;
  function load() {
    if (!SITE_KEY) return Promise.resolve(null);
    if (loading) return loading;
    loading = new Promise(function (resolve) {
      var s = document.createElement("script");
      s.src = "https://www.google.com/recaptcha/api.js?render=" + encodeURIComponent(SITE_KEY) + "&hl=vi";
      s.async = true; s.defer = true;
      s.onload = function () { try { window.grecaptcha.ready(function () { resolve(window.grecaptcha); }); } catch (e) { resolve(null); } };
      s.onerror = function () { loading = null; resolve(null); };
      document.head.appendChild(s);
    });
    return loading;
  }

  /* returns a fresh token, or null (no key / blocked / timeout) — the server decides what to do with null */
  function token(action) {
    return load().then(function (g) {
      if (!g) return null;
      return new Promise(function (resolve) {
        var done = false, t = setTimeout(function () { if (!done) { done = true; resolve(null); } }, 8000);
        try {
          g.execute(SITE_KEY, { action: action }).then(
            function (tk) { if (!done) { done = true; clearTimeout(t); resolve(tk || null); } },
            function () { if (!done) { done = true; clearTimeout(t); resolve(null); } });
        } catch (e) { done = true; clearTimeout(t); resolve(null); }
      });
    });
  }

  function attach(data, action) {
    return token(action).then(function (tk) {
      var out = {}; for (var k in data) out[k] = data[k];
      if (tk) { out.recaptchaToken = tk; out.recaptchaAction = action; }
      return out;
    });
  }

  window.reeRecaptcha = { enabled: !!SITE_KEY, siteKey: SITE_KEY, load: load, token: token, attach: attach };
  if (!SITE_KEY && !DEMO_NOTICE) return;

  /* Google's required notice (the floating badge is hidden), shown under each protected submit button */
  var SHIELD = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/></svg>';
  var NOTE = SHIELD + '<span>Biểu mẫu được bảo vệ bởi reCAPTCHA. Áp dụng <a href="https://policies.google.com/privacy" target="_blank" rel="noopener">Chính sách quyền riêng tư</a> và <a href="https://policies.google.com/terms" target="_blank" rel="noopener">Điều khoản dịch vụ</a> của Google.</span>';
  function addNote(anchor) {
    if (!anchor || anchor.__reeRc) return; anchor.__reeRc = 1;
    var p = document.createElement("p"); p.className = "ree-rc-note"; p.innerHTML = NOTE;
    p.setAttribute("data-recaptcha", SITE_KEY ? "on" : "demo");
    anchor.parentNode.insertBefore(p, anchor.nextSibling);
  }
  function scan() {
    document.querySelectorAll("form").forEach(function (f) {
      if (f.querySelector("textarea[name=message]")) addNote(f.querySelector("button[type=submit]"));
    });
    var foot = document.querySelector("#apply-form .af-foot");
    if (foot) addNote(foot.querySelector(".af-agree") || foot.lastElementChild);
    addNote(document.querySelector("#af-review .afr-acts"));   /* final "Xác nhận gửi hồ sơ" step */
  }
  /* load early once someone starts filling a protected form (better scores, no cost on other pages) */
  document.addEventListener("focusin", function (e) {
    var f = e.target && e.target.closest && e.target.closest("form");
    if (f && (f.id === "apply-form" || f.querySelector("textarea[name=message]"))) load();
  }, true);
  function start() { scan(); new MutationObserver(function () { scan(); }).observe(document.body, { childList: true, subtree: true }); }
  if (document.body) start(); else document.addEventListener("DOMContentLoaded", start);
})();
