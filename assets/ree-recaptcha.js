/* Google reCAPTCHA v3 (invisible, score-based) — badge shown INLINE inside each protected form
   Protects: main site "Gửi thông tin dự án" / "Yêu cầu tư vấn" forms, and careers "Gửi hồ sơ ứng tuyển".

   SETUP
   1. https://www.google.com/recaptcha/admin → Create → type "Score based (v3)",
      domains: ree-me-website.vercel.app (+ the official domain later).
   2. Paste the SITE KEY below.
   3. The SECRET KEY never goes in this file. The server that receives the form must verify the token:
        POST https://www.google.com/recaptcha/api/siteverify  (secret, response=<recaptchaToken>, remoteip)
      and accept only when  success === true  &&  action matches  &&  score >= 0.5.
      Each submission carries:  recaptchaToken, recaptchaAction ("contact_form" | "job_apply").
      Tokens expire after 2 minutes and can be verified only once.

   WHERE IT SHOWS  (element .ree-rc-badge, data-recaptcha="on" | "test" | "demo")
   - under the "Gửi yêu cầu" button of the project / consult forms
   - under "Gửi hồ sơ ứng tuyển ngay" and under "Xác nhận gửi hồ sơ" (careers)
   With a key: Google's own reCAPTCHA badge is rendered there (inline, not floating, so it never covers the chat button).
   Without a key (DEMO): a text placeholder marks the spot; nothing is loaded from Google and no token is sent. */
(function () {
  /* Site key reCAPTCHA v3 "R.E.E M&E Website" (Score based), domain: ree-me-website.vercel.app.
     Khi lên tên miền chính thức: thêm domain đó vào key trong trang quản trị reCAPTCHA (hoặc tạo key mới và thay ở đây).
     SECRET KEY của key này chỉ dùng phía server, không đặt trong file này.
     TEST_KEY = key thử công khai của Google (v2) — chỉ dùng khi cần xem badge mà chưa có key thật. */
  var TEST_KEY = "6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI";
  var SITE_KEY = window.REE_RECAPTCHA_SITE_KEY || "6LdqDzMuAAAAALbJZoQizihn_uGHH3Oh2nZOv8K1";
  var IS_TEST = SITE_KEY === TEST_KEY;
  var DEMO_NOTICE = true;                               // show the placeholder while SITE_KEY is empty

  var css = document.createElement("style");
  css.id = "ree-recaptcha-css";
  css.textContent =
    ".ree-rc-badge{margin-top:12px;display:flex}" +
    /* compact badge: only Google's logo (70×60) + a short caption; hovering the logo slides the full badge open */
    ".ree-rc-badge:not([data-recaptcha=demo]){align-items:center;gap:12px;flex:none}" +
    ".ree-rc-w{flex:none;width:56px;height:48px;position:relative}" +
    ".ree-rc-w>div{transform:scale(.8);transform-origin:0 0}" +
    "form .ree-rc-badge:not([data-recaptcha=demo]){justify-content:center;margin-top:14px}" +
    ".ree-rc-badge .grecaptcha-badge{width:70px!important;height:60px!important;overflow:hidden!important;border-radius:10px!important;box-shadow:0 0 0 1px #E3E7EF,0 4px 12px -6px rgba(11,31,77,.18)!important;transition:width .35s ease!important;position:relative;z-index:2}" +
    ".ree-rc-badge .grecaptcha-badge iframe{transform:translateX(-186px);transition:transform .35s ease}" +
    ".ree-rc-badge .grecaptcha-badge:hover{width:256px!important}" +
    ".ree-rc-badge .grecaptcha-badge:hover iframe{transform:none}" +
    ".ree-rc-cap{font-size:11px;line-height:1.5;color:#7A8399;white-space:nowrap;letter-spacing:0;text-transform:none;font-weight:400}" +
    ".ree-rc-cap a{color:inherit;text-decoration:underline;text-underline-offset:2px}.ree-rc-cap a:hover{color:#1B347D}" +
    "@media (min-width:641px) and (max-width:1279px){#af-review .afr-acts>.ree-rc-badge .ree-rc-cap{display:none}}" +
    "#af-review .afr-acts>.ree-rc-badge{margin:0 auto 0 0}" +
    "@media (max-width:640px){#af-review .afr-acts>.ree-rc-badge{margin:4px 0 0}}" +
    ".ree-rc-note{margin:0;font-size:11.5px;line-height:1.55;color:#7A8399;letter-spacing:0;text-transform:none;font-weight:400;display:flex;gap:7px;align-items:flex-start}" +
    ".ree-rc-note svg{flex:none;width:13px;height:13px;margin-top:2px;color:#9AA3B6}" +
    ".ree-rc-note a{color:inherit;text-decoration:underline;text-underline-offset:2px}" +
    ".ree-rc-note a:hover{color:#1B347D}" +
    "";
  (document.head || document.documentElement).appendChild(css);

  /* ---------- Google API (explicit render, so the badge can be inline) ---------- */
  var loading = null;
  function load() {
    if (!SITE_KEY) return Promise.resolve(null);
    if (loading) return loading;
    loading = new Promise(function (resolve) {
      window.__reeRcOnload = function () { resolve(window.grecaptcha); };
      var s = document.createElement("script");
      s.src = "https://www.google.com/recaptcha/api.js?render=explicit&onload=__reeRcOnload&hl=en";
      s.async = true; s.defer = true;
      s.onerror = function () { loading = null; resolve(null); };
      document.head.appendChild(s);
    });
    return loading;
  }
  function widget(box) {                       /* render Google's badge into box once; returns widget id */
    return load().then(function (g) {
      if (!g || !box) return null;
      if (box.__rcId != null) return box.__rcId;
      var host = box.querySelector(".ree-rc-w") || box;
      try { box.__rcId = g.render(host, { sitekey: SITE_KEY, badge: "inline", size: "invisible",
        callback: function (tk) { var r = box.__rcRes; box.__rcRes = null; if (r) r(tk); } }); } catch (e) { return null; }
      return box.__rcId;
    });
  }
  function boxFor(action) {
    var sel = action === "job_apply"
      ? ["#af-review .ree-rc-badge", "#apply-form .ree-rc-badge"]
      : ["form .ree-rc-badge"];
    for (var i = 0; i < sel.length; i++) { var b = document.querySelector(sel[i]); if (b && b.isConnected) return b; }
    var h = document.getElementById("ree-rc-hidden");   /* fallback: off-screen widget */
    if (!h) { h = document.createElement("div"); h.id = "ree-rc-hidden"; h.style.cssText = "position:absolute;left:-9999px;top:0"; document.body.appendChild(h); }
    return h;
  }

  /* returns a fresh token, or null (no key / blocked / timeout) — the server decides what to do with null */
  function token(action) {
    var box = boxFor(action);
    return widget(box).then(function (id) {
      if (id == null) return null;
      var g = window.grecaptcha;
      return new Promise(function (resolve) {
        var done = false;
        function fin(tk) { if (done) return; done = true; clearTimeout(t); box.__rcRes = null; resolve(tk || null); }
        var t = setTimeout(function () { fin(null); }, 8000);
        box.__rcRes = fin;                                   /* v2-style keys (incl. Google test key): token via callback */
        try {
          var p = g.execute(id, { action: action });        /* v3 keys: execute() returns a promise */
          if (p && typeof p.then === "function") p.then(fin, function () { fin(null); });
        } catch (e) { fin(null); }
      }).then(function (tk) { if (IS_TEST) { try { g.reset(id); } catch (e) {} } return tk; });
    });
  }
  function attach(data, action) {
    return token(action).then(function (tk) {
      var out = {}; for (var k in data) out[k] = data[k];
      if (tk) { out.recaptchaToken = tk; out.recaptchaAction = action; }
      return out;
    });
  }
  window.reeRecaptcha = { enabled: !!SITE_KEY, test: IS_TEST, siteKey: SITE_KEY, load: load, token: token, attach: attach };
  if (!SITE_KEY && !DEMO_NOTICE) return;

  /* ---------- placement ---------- */
  var SHIELD = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/></svg>';
  var NOTE = '<p class="ree-rc-note">' + SHIELD + '<span>Biểu mẫu được bảo vệ bởi reCAPTCHA. Áp dụng <a href="https://policies.google.com/privacy" target="_blank" rel="noopener">Chính sách quyền riêng tư</a> và <a href="https://policies.google.com/terms" target="_blank" rel="noopener">Điều khoản dịch vụ</a> của Google.</span></p>';
  var CAP = '<div class="ree-rc-w"></div><span class="ree-rc-cap">Được bảo vệ bởi reCAPTCHA<br><a href="https://policies.google.com/privacy" target="_blank" rel="noopener">Bảo mật</a> · <a href="https://policies.google.com/terms" target="_blank" rel="noopener">Điều khoản</a></span>';
  function place(anchor, inside) {
    if (!anchor || anchor.__reeRc) return; anchor.__reeRc = 1;
    var d = document.createElement("div"); d.className = "ree-rc-badge";
    d.setAttribute("data-recaptcha", !SITE_KEY ? "demo" : IS_TEST ? "test" : "on");
    d.innerHTML = SITE_KEY ? CAP : NOTE;                /* logo + caption, or DEMO placeholder */
    if (inside) anchor.insertBefore(d, anchor.firstChild);   /* same row, left of the buttons */
    else anchor.parentNode.insertBefore(d, anchor.nextSibling);
    if (SITE_KEY) widget(d).then(function (id) {       /* Google's inline badge; if Google can't load, keep the text notice */
      if (id == null) { d.innerHTML = NOTE; d.setAttribute("data-recaptcha", "demo"); }
    });
  }
  function scan() {
    document.querySelectorAll("form").forEach(function (f) {
      if (f.querySelector("textarea[name=message]")) place(f.querySelector("button[type=submit]"));
    });
    var foot = document.querySelector("#apply-form .af-foot");
    if (foot) place(foot.querySelector(".af-agree") || foot.lastElementChild);
    place(document.querySelector("#af-review .afr-acts"), true);   /* final "Xác nhận gửi hồ sơ" step: left of the buttons */
  }
  function start() { scan(); new MutationObserver(scan).observe(document.body, { childList: true, subtree: true }); }
  if (document.body) start(); else document.addEventListener("DOMContentLoaded", start);
})();
