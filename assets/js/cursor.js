/* ==========================================================================
   RenderFrost SMP — 01 Cursor system
   Dot tracks the real pointer exactly; ring eases gently behind it.
   Disabled entirely on coarse pointers and reduced-motion users.
   ========================================================================== */

(function () {
  "use strict";

  var fine =
    window.matchMedia("(hover: hover) and (pointer: fine)").matches &&
    !window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  if (!fine) return;

  var dot = document.createElement("div");
  var ring = document.createElement("div");
  dot.className = "cursor";
  ring.className = "cursor-ring";
  dot.setAttribute("aria-hidden", "true");
  ring.setAttribute("aria-hidden", "true");

  var ready = false;
  var mx = 0;
  var my = 0;
  var rx = 0;
  var ry = 0;
  var raf = 0;

  var LINK = "a[href], button, summary, .btn, .card--interactive," +
    " [role='button'], .copyip__btn, .music__toggle, .music__mini," +
    " .nav__toggle, .backtotop, .rules-toc__link, .faq__q";

  function frame() {
    // 0.22 keeps the ring responsive without trailing far behind the click point.
    rx += (mx - rx) * 0.22;
    ry += (my - ry) * 0.22;
    ring.style.transform = "translate3d(" + rx + "px," + ry + "px,0)";
    if (Math.abs(mx - rx) > 0.1 || Math.abs(my - ry) > 0.1) {
      raf = requestAnimationFrame(frame);
    } else {
      raf = 0;
    }
  }

  function move(e) {
    mx = e.clientX;
    my = e.clientY;
    dot.style.transform = "translate3d(" + mx + "px," + my + "px,0)";
    if (!ready) {
      ready = true;
      rx = mx;
      ry = my;
      document.body.classList.add("cursor-active");
      dot.style.opacity = "1";
      ring.style.opacity = "1";
    }
    if (!raf) raf = requestAnimationFrame(frame);
  }

  function hit(e) {
    var el = e.target;
    if (!el || el.nodeType !== 1) return;
    var interactive = el.closest(LINK);
    document.body.classList.toggle("cursor--link", !!interactive);
  }

  function leave() {
    ready = false;
    document.body.classList.remove("cursor-active", "cursor--link", "cursor--down");
    dot.style.opacity = "0";
    ring.style.opacity = "0";
  }

  document.addEventListener("pointermove", function (e) {
    if (e.pointerType !== "mouse") return;
    move(e);
    hit(e);
  }, { passive: true });

  document.addEventListener("pointerdown", function (e) {
    if (e.pointerType === "mouse") document.body.classList.add("cursor--down");
  }, { passive: true });

  document.addEventListener("pointerup", function () {
    document.body.classList.remove("cursor--down");
  }, { passive: true });

  document.addEventListener("pointerleave", leave);
  window.addEventListener("blur", leave);

  // Elements revealed later (menus, popovers) re-evaluate on enter.
  document.addEventListener("pointerover", function (e) {
    if (e.pointerType === "mouse") hit(e);
  }, { passive: true });

  // Only attach once the DOM exists so nothing blocks first paint input.
  if (document.body) {
    document.body.appendChild(dot);
    document.body.appendChild(ring);
  } else {
    document.addEventListener("DOMContentLoaded", function () {
      document.body.appendChild(dot);
      document.body.appendChild(ring);
    });
  }
})();
