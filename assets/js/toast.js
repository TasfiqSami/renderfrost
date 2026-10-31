/* ==========================================================================
   RenderFrost SMP — 02 Toast / feedback notifications
   One polite live region; messages announce without stealing focus.
   ========================================================================== */

(function (global) {
  "use strict";

  var region = null;
  var last = { msg: "", at: 0 };

  function ensure() {
    if (region && document.body.contains(region)) return region;
    region = document.createElement("div");
    region.className = "toast-region";
    region.setAttribute("role", "status");
    region.setAttribute("aria-live", "polite");
    document.body.appendChild(region);
    return region;
  }

  var ICONS = {
    success: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" ' +
      'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
      '<path d="M20 6 9 17l-5-5"/></svg>',
    error: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" ' +
      'stroke-linecap="round" aria-hidden="true"><path d="M12 8v5"/><path d="M12 16.5v.5"/>' +
      '<circle cx="12" cy="12" r="9"/></svg>',
    info: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" ' +
      'stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/>' +
      '<path d="M12 11v5"/><path d="M12 7.5v.5"/></svg>'
  };

  function show(message, kind) {
    var type = kind && ICONS[kind] ? kind : "info";
    var now = Date.now();

    // Suppress an identical repeat inside 1.6s.
    if (message === last.msg && now - last.at < 1600) return;
    last = { msg: message, at: now };

    var host = ensure();
    var el = document.createElement("div");
    el.className = "toast toast--" + type;
    el.innerHTML = '<span class="toast__icon">' + ICONS[type] + "</span><span></span>";
    el.lastElementChild.textContent = message; // never HTML
    host.appendChild(el);

    requestAnimationFrame(function () {
      el.classList.add("is-shown");
    });

    setTimeout(function () {
      el.classList.remove("is-shown");
      setTimeout(function () {
        if (el.parentNode) el.parentNode.removeChild(el);
      }, 320);
    }, 3200);
  }

  global.RFToast = { show: show };
})(window);
