/* ==========================================================================
   RenderFrost SMP — 03 Frost particle atmosphere
   One shared canvas layer. Low density, slow drift, never over controls.
   Pauses when the tab is hidden and cleans itself up on unmount.
   ========================================================================== */

(function (global) {
  "use strict";

  var reduced =
    global.matchMedia && global.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function mount(canvas, opts) {
    if (!canvas || !canvas.getContext) return null;
    var config = opts || {};
    var ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return null;

    var w = 0;
    var h = 0;
    var dpr = 1;
    var flakes = [];
    var raf = 0;
    var running = false;
    var alive = true;

    var density = 0;

    function particleCount() {
      return Math.max(16, Math.min(config.max || 76, Math.round(
        (global.innerWidth * global.innerHeight) / 19000
      )));
    }

    function resize() {
      var rect = canvas.getBoundingClientRect();
      dpr = Math.min(global.devicePixelRatio || 1, 2);
      w = Math.max(1, Math.round(rect.width));
      h = Math.max(1, Math.round(rect.height));
      density = particleCount();
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function seed() {
      flakes = [];
      for (var i = 0; i < density; i++) {
        flakes.push({
          x: Math.random() * w,
          y: Math.random() * h,
          r: 0.55 + Math.random() * 1.8,
          vy: 0.10 + Math.random() * 0.32,
          vx: (Math.random() - 0.5) * 0.16,
          a: 0.14 + Math.random() * 0.42,
          phase: Math.random() * Math.PI * 2,
          sway: 0.12 + Math.random() * 0.3,
          glow: Math.random() > 0.62,
          hue: 248 + Math.random() * 34
        });
      }
    }

    var last = 0;
    function draw(now) {
      if (!alive) return;
      raf = requestAnimationFrame(draw);
      if (now - last < 33) return; // ~30fps is plenty for slow drifting flakes
      last = now;
      ctx.clearRect(0, 0, w, h);
      for (var i = 0; i < flakes.length; i++) {
        var f = flakes[i];
        f.y += f.vy;
        f.phase += 0.008;
        f.x += f.vx + Math.sin(f.phase) * f.sway * 0.35;

        if (f.y - f.r > h) {
          f.y = -f.r;
          f.x = Math.random() * w;
        }
        if (f.x < -6) f.x = w + 6;
        if (f.x > w + 6) f.x = -6;

        var shimmer = 0.58 + (Math.sin(f.phase) + 1) * 0.21;
        if (f.glow) {
          ctx.beginPath();
          ctx.arc(f.x, f.y, f.r * 3.2, 0, Math.PI * 2);
          ctx.fillStyle = "hsla(" + f.hue.toFixed(1) + ", 82%, 78%, " +
            (f.a * shimmer * 0.16).toFixed(3) + ")";
          ctx.fill();
        }
        ctx.beginPath();
        ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2);
        ctx.fillStyle = "hsla(" + f.hue.toFixed(1) + ", 76%, 92%, " +
          (f.a * shimmer).toFixed(3) + ")";
        ctx.fill();
      }
    }

    function start() {
      if (running || !alive) return;
      running = true;
      raf = requestAnimationFrame(draw);
    }

    function stop() {
      running = false;
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
    }

    resize();
    seed();

    var resizeTimer = 0;
    function onResize() {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(function () {
        resize();
        seed();
      }, 180);
    }

    function onVisibility() {
      if (document.hidden) stop();
      else start();
    }

    global.addEventListener("resize", onResize);
    document.addEventListener("visibilitychange", onVisibility);

    if (!reduced && !document.hidden) start();

    return {
      destroy: function () {
        alive = false;
        stop();
        global.removeEventListener("resize", onResize);
        document.removeEventListener("visibilitychange", onVisibility);
        ctx.clearRect(0, 0, w, h);
      }
    };
  }

  // Static, evenly spread sparkle field for sections that want a hint of dust.
  function sprinkle(canvas, count, alpha) {
    if (!canvas || !canvas.getContext) return;
    var ctx = canvas.getContext("2d");
    if (!ctx) return;
    var dpr = Math.min(global.devicePixelRatio || 1, 2);
    var rect = canvas.getBoundingClientRect();
    var w = Math.max(1, rect.width);
    var h = Math.max(1, rect.height);
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    var n = count || 40;
    for (var i = 0; i < n; i++) {
      var x = Math.random() * w;
      var y = Math.random() * h;
      var r = 0.5 + Math.random() * 1.1;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(206, 222, 255," + ((alpha || 0.3) * (0.4 + Math.random() * 0.6)).toFixed(3) + ")";
      ctx.fill();
    }
  }

  global.RFParticles = { mount: mount, sprinkle: sprinkle, reduced: reduced };
})(window);
