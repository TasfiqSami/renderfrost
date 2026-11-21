/* ==========================================================================
   RenderFrost SMP — 05 Application shell
   Navbar, mobile drawer, copy-IP, scroll reveals, rules navigation.
   Everything is progressive: pages are fully usable if this never runs.
   ========================================================================== */

(function (global) {
  "use strict";

  var reduced =
    global.matchMedia && global.matchMedia("(prefers-reduced-motion: reduce)").matches;

  var SERVER_IP = "play.renderfrost.com";
  var DISCORD_URL = "https://discord.gg/SMRS6skKYY";
  var revealObserver = null;
  var rulesObserver = null;
  var rulesScrollHandler = null;
  var rulesScrollRaf = 0;
  var activeParticleInstance = null;
  var activeParticleCanvas = null;
  var heroScrollRaf = 0;
  var heroScrollBound = false;
  var navigationRequest = 0;

  global.RFSite = { ip: SERVER_IP, discord: DISCORD_URL };

  /* ------------------------------------------------------------- Copy IP */

  function fallbackCopy(text) {
    // Legacy path for browsers without the async Clipboard API.
    var ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.setAttribute("aria-hidden", "true");
    ta.style.position = "fixed";
    ta.style.top = "-1000px";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    var selection = document.getSelection();
    var prev = selection && selection.rangeCount > 0 ? selection.getRangeAt(0) : null;
    ta.select();
    var ok = false;
    try {
      ok = document.execCommand("copy");
    } catch (err) {
      ok = false;
    }
    document.body.removeChild(ta);
    if (prev && selection) {
      selection.removeAllRanges();
      selection.addRange(prev);
    }
    return ok;
  }

  function copyIp(button) {
    var done = function (ok) {
      if (button) {
        var label = button.querySelector(".copyip__label");
        if (label) {
          if (ok) {
            label.textContent = "Copied";
            setTimeout(function () { label.textContent = "Copy IP"; }, 2000);
          } else {
            label.textContent = "Select & copy";
            setTimeout(function () { label.textContent = "Copy IP"; }, 2400);
          }
        }
        button.classList.add("is-done");
        setTimeout(function () { button.classList.remove("is-done"); }, 2000);
      }
      if (global.RFToast) {
        global.RFToast.show(
          ok
            ? "Server address copied to your clipboard."
            : "Couldn't access the clipboard — select the address and copy manually.",
          ok ? "success" : "error"
        );
      }
    };

    if (global.navigator && global.navigator.clipboard && global.navigator.clipboard.writeText) {
      global.navigator.clipboard.writeText(SERVER_IP).then(function () {
        done(true);
      }).catch(function () {
        done(fallbackCopy(SERVER_IP));
      });
    } else {
      done(fallbackCopy(SERVER_IP));
    }
  }

  function bindCopy() {
    var buttons = document.querySelectorAll("[data-copy-ip]");
    Array.prototype.forEach.call(buttons, function (btn) {
      if (btn.hasAttribute("data-rf-bound")) return;
      btn.setAttribute("data-rf-bound", "");
      btn.addEventListener("click", function (e) {
        e.preventDefault();
        copyIp(btn);
      });
    });

    // Discord invite uses the same clipboard path and feedback.
    var invites = document.querySelectorAll("[data-copy-invite]");
    Array.prototype.forEach.call(invites, function (btn) {
      if (btn.hasAttribute("data-rf-bound")) return;
      btn.setAttribute("data-rf-bound", "");
      btn.addEventListener("click", function (e) {
        e.preventDefault();
        var label = btn.querySelector(".copyip__label");
        var done = function (ok) {
          if (label) {
            label.textContent = ok ? "Link copied" : "Copy manually";
            setTimeout(function () { label.textContent = "Copy invite link"; }, 2200);
          }
          if (global.RFToast) {
            global.RFToast.show(
              ok ? "Discord invite link copied." : "Couldn't access the clipboard.",
              ok ? "success" : "error"
            );
          }
        };

        if (global.navigator && global.navigator.clipboard && global.navigator.clipboard.writeText) {
          global.navigator.clipboard.writeText(DISCORD_URL).then(function () {
            done(true);
          }).catch(function () {
            done(fallbackCopy(DISCORD_URL));
          });
        } else {
          done(fallbackCopy(DISCORD_URL));
        }
      });
    });
  }

  /* ------------------------------------------------------ Navbar + drawer */

  function bindNav() {
    var nav = document.querySelector(".nav");
    var toggle = document.querySelector(".nav__toggle");
    var drawer = document.querySelector(".drawer");

    if (nav) {
      var onScroll = function () {
        nav.classList.toggle("is-scrolled", global.scrollY > 24);
      };
      onScroll();
      global.addEventListener("scroll", onScroll, { passive: true });
    }

    if (!toggle || !drawer) return;

    function setOpen(open) {
      drawer.classList.toggle("is-open", open);
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
      document.body.style.overflow = open ? "hidden" : "";
      if (open) {
        var first = drawer.querySelector("a, button");
        if (first) first.focus();
      }
    }

    toggle.addEventListener("click", function () {
      setOpen(!drawer.classList.contains("is-open"));
    });

    drawer.addEventListener("click", function (e) {
      if (e.target.closest("a")) setOpen(false);
    });

    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && drawer.classList.contains("is-open")) {
        setOpen(false);
        toggle.focus();
      }
    });

    // Reset if the viewport grows back to desktop while the drawer is open.
    global.addEventListener("resize", function () {
      if (global.innerWidth > 900 && drawer.classList.contains("is-open")) setOpen(false);
    });
  }


  /* ------------------------------------------------------ Scroll reveals */

  function bindReveals() {
    if (revealObserver) revealObserver.disconnect();
    revealObserver = null;
    var items = document.querySelectorAll("[data-reveal]");
    if (!items.length) return;

    // Content must never depend on the observer succeeding.
    if (reduced || !("IntersectionObserver" in global)) {
      Array.prototype.forEach.call(items, function (el) {
        el.classList.add("is-visible");
      });
      return;
    }

    revealObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-visible");
        revealObserver.unobserve(entry.target);
      });
    }, { rootMargin: "0px 0px -12% 0px", threshold: 0.08 });

    Array.prototype.forEach.call(items, function (el) { revealObserver.observe(el); });
  }

  /* --------------------------------------------------- Hero depth + dust */

  function bindAtmosphere() {
    if (!activeParticleCanvas) {
      var canvas = document.querySelector("[data-particles]");
      if (global.RFParticles && !global.RFParticles.reduced) {
        if (!canvas) {
          canvas = document.createElement("canvas");
          canvas.setAttribute("data-particles", "");
          canvas.setAttribute("aria-hidden", "true");
        }
        canvas.classList.add("ambient-particles");
        document.body.appendChild(canvas);
        activeParticleCanvas = canvas;
        activeParticleInstance = global.RFParticles.mount(canvas, { max: 76 });
      } else if (canvas) {
        /* Reduced motion: the canvas is pure decoration, so it is removed
           outright rather than left as an empty element. */
        if (canvas.parentNode) canvas.parentNode.removeChild(canvas);
      }
    }

    var sparks = document.querySelectorAll("[data-sparks]");
    Array.prototype.forEach.call(sparks, function (el) {
      if (global.RFParticles) global.RFParticles.sprinkle(el, 46, 0.32);
    });

    // Keep the decorative zoom scroll-synchronized and coalesce updates to one per frame.
    if (!heroScrollBound) {
      heroScrollBound = true;
      global.addEventListener("scroll", function updateHeroZoom() {
        if (reduced || heroScrollRaf) return;
        heroScrollRaf = requestAnimationFrame(function () {
          heroScrollRaf = 0;
          var hero = document.querySelector(".hero");
          var art = document.querySelector(".hero__art img");
          if (!hero || !art) return;
          var progress = Math.max(0, Math.min(1, global.scrollY / Math.max(1, hero.offsetHeight)));
          art.style.setProperty("--hero-scale", (1 + progress * 0.08).toFixed(3));
        });
      }, { passive: true });
    }

    // Depth-responsive parallax on the hero artwork — pointer only.
    var art = document.querySelector(".hero__art img");
    var hero = document.querySelector(".hero");
    if (!art || !hero) return;
    art.style.setProperty("--hero-scale", "1");
    if (hero.hasAttribute("data-rf-hero-bound")) return;
    hero.setAttribute("data-rf-hero-bound", "");
    if (reduced) return;
    if (!global.matchMedia("(hover: hover) and (pointer: fine)").matches) return;

    var tx = 0;
    var ty = 0;

    hero.addEventListener("pointermove", function (e) {
      if (e.pointerType !== "mouse") return;
      var rect = hero.getBoundingClientRect();
      tx = ((e.clientX - rect.left) / rect.width - 0.5) * -14;
      ty = ((e.clientY - rect.top) / rect.height - 0.5) * -10;
      art.style.setProperty("--hero-x", tx.toFixed(1) + "px");
      art.style.setProperty("--hero-y", ty.toFixed(1) + "px");
    }, { passive: true });

    hero.addEventListener("pointerleave", function () {
      art.style.setProperty("--hero-x", "0px");
      art.style.setProperty("--hero-y", "0px");
    });
  }

  /* ---------------------------------------------------------- FAQ motion */

  function bindFaq() {
    Array.prototype.forEach.call(document.querySelectorAll(".faq"), function (faq) {
      if (faq.hasAttribute("data-rf-bound")) return;
      faq.setAttribute("data-rf-bound", "");
      faq.addEventListener("click", function (e) {
        var summary = e.target.closest ? e.target.closest(".faq__q") : null;
        if (!summary || !faq.contains(summary)) return;
        var item = summary.parentElement;
        var panel = item.querySelector(".faq__a");
        if (!panel) return;
        e.preventDefault();

        if (item._rfFaqTimer) global.clearTimeout(item._rfFaqTimer);
        var currentHeight = panel.getBoundingClientRect().height;

        if (item.classList.contains("is-closing")) {
          item.classList.remove("is-closing");
          panel.style.height = currentHeight + "px";
          global.requestAnimationFrame(function () {
            panel.style.height = panel.scrollHeight + "px";
            item._rfFaqTimer = global.setTimeout(function () {
              panel.style.height = "auto";
            }, 280);
          });
          return;
        }

        if (item.open) {
          panel.style.height = currentHeight + "px";
          void panel.offsetHeight;
          item.classList.add("is-closing");
          panel.style.height = "0px";
          item._rfFaqTimer = global.setTimeout(function () {
            item.open = false;
            item.classList.remove("is-closing");
            panel.style.height = "";
          }, 280);
          return;
        }

        item.open = true;
        panel.style.height = "0px";
        global.requestAnimationFrame(function () {
          panel.style.height = panel.scrollHeight + "px";
          item._rfFaqTimer = global.setTimeout(function () {
            panel.style.height = "auto";
          }, 280);
        });
      });
    });
  }

  /* -------------------------------------------- Rules page navigation */

  function bindRulesNav() {
    if (rulesObserver) rulesObserver.disconnect();
    rulesObserver = null;
    if (rulesScrollHandler) {
      global.removeEventListener("scroll", rulesScrollHandler);
      global.removeEventListener("resize", rulesScrollHandler);
      rulesScrollHandler = null;
    }
    if (rulesScrollRaf) {
      global.cancelAnimationFrame(rulesScrollRaf);
      rulesScrollRaf = 0;
    }

    var rail = document.querySelector(".rules-toc");
    if (!rail) return;

    var links = Array.prototype.slice.call(rail.querySelectorAll(".rules-toc__link"));
    var sections = links
      .map(function (l) { return document.getElementById(l.getAttribute("href").slice(1)); })
      .filter(Boolean);

    if (!sections.length) return;

    var current = null;
    function repaint() {
      var line = global.innerHeight * 0.65;
      var atPageEnd =
        global.scrollY + global.innerHeight >= document.documentElement.scrollHeight - 2;
      var active = atPageEnd ? sections[sections.length - 1] : sections[0];
      if (!atPageEnd) {
        sections.forEach(function (section) {
          if (section.getBoundingClientRect().top <= line) active = section;
        });
      }
      var id = active && active.id;
      if (!id || id === current) return;
      current = id;
      links.forEach(function (l) {
        l.classList.toggle("is-current", l.getAttribute("href") === "#" + id);
      });
    }

    rulesScrollHandler = function () {
      if (rulesScrollRaf) return;
      rulesScrollRaf = global.requestAnimationFrame(function () {
        rulesScrollRaf = 0;
        repaint();
      });
    };
    global.addEventListener("scroll", rulesScrollHandler, { passive: true });
    global.addEventListener("resize", rulesScrollHandler, { passive: true });

    if ("IntersectionObserver" in global) {
      rulesObserver = new IntersectionObserver(function (entries) {
        if (entries.length) repaint();
      }, { rootMargin: "-5% 0px -35% 0px", threshold: 0 });
      sections.forEach(function (s) { rulesObserver.observe(s); });
    }
    repaint();
  }

  /* --------------------------------------------------------- Back to top */

  function bindBackToTop() {
    var link = document.querySelector(".backtotop");
    if (!link || link.hasAttribute("data-rf-bound")) return;
    link.setAttribute("data-rf-bound", "");
    link.addEventListener("click", function (e) {
      e.preventDefault();
      global.scrollTo({ top: 0, behavior: reduced ? "auto" : "smooth" });
      var brand = document.querySelector(".nav__brand");
      if (brand) brand.focus({ preventScroll: true });
    });
  }

  /* --------------------------------------------- Smooth in-page anchors */

  function bindAnchors() {
    document.addEventListener("click", function (e) {
      var a = e.target.closest ? e.target.closest('a[href^="#"]') : null;
      if (!a) return;
      var id = a.getAttribute("href").slice(1);
      if (!id) return;
      var target = document.getElementById(id);
      if (!target) return;
      e.preventDefault();
      target.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "start" });
      // Keep the URL shareable without a second jump.
      if (global.history && global.history.replaceState) {
        global.history.replaceState(null, "", "#" + id);
      }
      target.setAttribute("tabindex", "-1");
      target.focus({ preventScroll: true });
    });
  }

  /* --------------------------------------------------------- Footer year */

  function bindYear() {
    var el = document.querySelector("[data-year]");
    if (el) el.textContent = String(new Date().getFullYear());
  }

  /* ------------------------------------------------------------- Gallery */

  function bindGallery() {
    var grid = document.querySelector(".gallery__grid");
    if (!grid) return;
    var items = Array.prototype.slice.call(grid.querySelectorAll(".gallery__item"));
    var count = document.querySelector("[data-gallery-count]");

    items.forEach(function (item) {
      var img = item.querySelector("img");
      var done = function () { item.classList.remove("is-loading"); };
      var fail = function () { done(); item.classList.add("is-broken"); };
      if (img.complete) { if (img.naturalWidth === 0) fail(); else done(); }
      img.addEventListener("load", done);
      img.addEventListener("error", fail);
    });

    var chips = document.querySelectorAll("[data-gallery-filter]");
    Array.prototype.forEach.call(chips, function (chip) {
      chip.addEventListener("click", function () {
        var who = chip.getAttribute("data-gallery-filter");
        Array.prototype.forEach.call(chips, function (c) {
          var on = c === chip;
          c.classList.toggle("is-active", on);
          c.setAttribute("aria-pressed", on ? "true" : "false");
        });
        var shown = 0;
        items.forEach(function (item) {
          var match = !who || item.getAttribute("data-credit") === who;
          item.hidden = !match;
          if (match) shown++;
        });
        if (count) count.textContent = String(shown);
      });
    });

    var dialog = document.querySelector(".lightbox");
    if (!dialog || typeof dialog.showModal !== "function") return;
    var img = dialog.querySelector(".lightbox__img");
    var text = dialog.querySelector(".lightbox__text");
    var pos = dialog.querySelector(".lightbox__count");
    var strip = dialog.querySelector(".lightbox__strip");
    var current = 0;
    var list = [];

    function buildStrip() {
      strip.textContent = "";
      list.forEach(function (item, i) {
        var b = document.createElement("button");
        b.type = "button";
        b.className = "lightbox__thumb";
        b.setAttribute("aria-label", "Show image " + (i + 1));
        var t = document.createElement("img");
        t.src = item.querySelector("img").src;
        t.alt = "";
        t.referrerPolicy = "no-referrer";
        b.appendChild(t);
        b.addEventListener("click", function () { show(list, i); });
        strip.appendChild(b);
      });
    }

    function visible() { return items.filter(function (i) { return !i.hidden; }); }
    function show(list, i) {
      current = (i + list.length) % list.length;
      var btn = list[current].querySelector("[data-gallery-src]");
      img.classList.add("is-swap");
      img.onload = function () { img.classList.remove("is-swap"); };
      img.src = btn.getAttribute("data-gallery-src");
      [1, -1].forEach(function (d) {
        var n = list[(current + d + list.length) % list.length].querySelector("[data-gallery-src]");
        new Image().src = n.getAttribute("data-gallery-src");
      });
      Array.prototype.forEach.call(strip.children, function (t, k) {
        t.classList.toggle("is-current", k === current);
        if (k === current && t.scrollIntoView) t.scrollIntoView({ block: "nearest", inline: "center" });
      });
      img.alt = btn.querySelector("img").alt;
      var by = btn.getAttribute("data-gallery-credit");
      var cap = btn.getAttribute("data-gallery-caption");
      text.textContent = [cap, by ? "Posted by " + by : ""].filter(Boolean).join(" \u00b7 ");
      pos.textContent = (current + 1) + " / " + list.length;
    }

    items.forEach(function (item) {
      item.querySelector("[data-gallery-src]").addEventListener("click", function () {
        list = visible();
        buildStrip();
        show(list, list.indexOf(item));
        dialog.showModal();
      });
    });
    dialog.querySelector(".lightbox__nav--prev").addEventListener("click", function () { show(list, current - 1); });
    dialog.querySelector(".lightbox__nav--next").addEventListener("click", function () { show(list, current + 1); });
    dialog.querySelector(".lightbox__close").addEventListener("click", function () { dialog.close(); });
    dialog.addEventListener("click", function (e) { if (e.target === dialog) dialog.close(); });
    dialog.addEventListener("keydown", function (e) {
      if (e.key === "ArrowLeft") show(list, current - 1);
      else if (e.key === "ArrowRight") show(list, current + 1);
    });
    var sx = null;
    dialog.addEventListener("touchstart", function (e) { sx = e.touches[0].clientX; }, { passive: true });
    dialog.addEventListener("touchend", function (e) {
      if (sx === null) return;
      var dx = e.changedTouches[0].clientX - sx;
      sx = null;
      if (Math.abs(dx) > 50) show(list, current + (dx < 0 ? 1 : -1));
    }, { passive: true });
  }

  /* ----------------------------------------------------- Server status */

  function fmtUptime(sec) {
    var d = Math.floor(sec / 86400), h = Math.floor((sec % 86400) / 3600), m = Math.floor((sec % 3600) / 60);
    return d > 0 ? d + "d " + h + "h" : h > 0 ? h + "h " + m + "m" : Math.max(m, 1) + "m";
  }

  function bindStatus() {
    var box = document.querySelector("[data-status]");
    if (!box || !global.fetch) return;
    var fallback = document.querySelector("[data-status-fallback]");
    var q = function (n) { return box.querySelector("[data-status-" + n + "]"); };

    function render(d) {
      var online = d && d.online === true;
      var state = d && d.state;
      box.setAttribute("data-state", online ? "online" : state === "starting" ? "starting" : "offline");
      q("title").textContent = online ? "Server is online" : state === "starting" ? "Server is starting" : "Server is offline";

      var p = d.players;
      q("players-wrap").hidden = !(online && p);
      if (online && p) q("players").textContent = p.online + (p.max ? " / " + p.max : "");

      q("uptime-wrap").hidden = !(online && d.uptime > 0);
      if (online && d.uptime > 0) q("uptime").textContent = fmtUptime(d.uptime);

      var names = online && p && p.list && p.list.length ? p.list : null;
      q("online").hidden = !names;
      if (names) q("online").textContent = "Online now: " + names.join(", ");

      var wrap = q("members-wrap");
      var list = q("members");
      list.textContent = "";
      var members = d.members && d.members.length ? d.members : null;
      wrap.hidden = !members;
      if (members) {
        q("members-count").textContent = "(" + members.length + ")";
        members.forEach(function (n) {
          var li = document.createElement("li");
          var av = document.createElement("span");
          av.className = "srv-members__av";
          av.setAttribute("aria-hidden", "true");
          av.textContent = n.charAt(0).toUpperCase();
          var nm = document.createElement("span");
          nm.textContent = n;
          li.appendChild(av);
          li.appendChild(nm);
          list.appendChild(li);
        });
      }
      box.hidden = false;
      if (fallback) fallback.hidden = true;
    }

    function load() {
      fetch("/api/status", { headers: { Accept: "application/json" }, cache: "no-store" })
        .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
        .then(function (d) { if (d && typeof d === "object" && !d.error) render(d); })
        .catch(function () { /* keep the static explanation */ });
    }
    load();
    var t = global.setInterval(function () {
      if (!document.body.contains(box)) { global.clearInterval(t); return; }
      if (!document.hidden) load();
    }, 60000);
  }

  function initPage() {
    bindCopy();
    bindReveals();
    bindAtmosphere();
    bindRulesNav();
    bindBackToTop();
    bindYear();
    bindFaq();
    bindGallery();
    bindStatus();
  }

  function updatePageChrome(nextDocument, url) {
    var title = nextDocument.querySelector("title");
    if (title) document.title = title.textContent;

    ["description", "theme-color", "color-scheme"].forEach(function (name) {
      var current = document.querySelector('meta[name="' + name + '"]');
      var next = nextDocument.querySelector('meta[name="' + name + '"]');
      if (current && next) current.setAttribute("content", next.getAttribute("content") || "");
    });

    ["og:title", "og:description", "og:image", "twitter:card"].forEach(function (name) {
      var current = document.querySelector('meta[property="' + name + '"], meta[name="' + name + '"]');
      var next = nextDocument.querySelector('meta[property="' + name + '"], meta[name="' + name + '"]');
      if (current && next) current.setAttribute("content", next.getAttribute("content") || "");
    });

    var canonical = document.querySelector('link[rel="canonical"]');
    var nextCanonical = nextDocument.querySelector('link[rel="canonical"]');
    if (canonical && nextCanonical) {
      canonical.href = new URL(nextCanonical.getAttribute("href"), url.href).href;
    }

    Array.prototype.forEach.call(
      document.querySelectorAll(".nav__link, .drawer__link"),
      function (link) {
        var linkUrl = new URL(link.href, global.location.href);
        if (pageKey(linkUrl.pathname) === pageKey(url.pathname)) link.setAttribute("aria-current", "page");
        else link.removeAttribute("aria-current");
      }
    );

    var file = pageKey(url.pathname);
    var labels = {
      "index": "Home",
      "members": "Members",
      "rules": "Rules",
      "gallery": "Gallery",
      "media": "Media",
      "discord": "Discord",
      "join": "Join",
      "privacy": "Privacy Policy",
      "terms": "Terms of Service",
      "cookies": "Cookie Policy"
    };
    return labels[file] || file.replace(/[-_]/g, " ");
  }

  /* "/rules", "/rules.html" and "/rules/" all identify the same page. */
  function pageKey(pathname) {
    var seg = pathname.replace(/\/+$/, "").split("/").pop() || "index";
    return seg.replace(/\.html?$/i, "") || "index";
  }

  function isPagePath(pathname) {
    var seg = pathname.replace(/\/+$/, "").split("/").pop();
    return !seg || /\.html?$/i.test(seg) || /^[\w-]+$/.test(seg);
  }

  function scrollToTop() {
    var root = document.documentElement;
    var previous = root.style.scrollBehavior;
    root.style.scrollBehavior = "auto";
    global.scrollTo(0, 0);
    global.requestAnimationFrame(function () {
      root.style.scrollBehavior = previous;
    });
  }

  function loadPage(url, pushHistory, announce) {
    var request = ++navigationRequest;
    fetch(url.href, { headers: { "X-Requested-With": "RF-Navigation" } })
      .then(function (response) {
        if (!response.ok) throw new Error("Page request failed: " + response.status);
        return response.text();
      })
      .then(function (html) {
        if (request !== navigationRequest) return;
        var nextDocument = new DOMParser().parseFromString(html, "text/html");
        var nextMain = nextDocument.querySelector("#main");
        var main = document.querySelector("#main");
        if (!nextMain || !main) throw new Error("Page response is missing its main content.");

        function commit() {
          var label = updatePageChrome(nextDocument, url);
          main.innerHTML = nextMain.innerHTML;
          if (pushHistory) global.history.pushState({ rfPage: true }, "", url.href);
          scrollToTop();
          initPage();
          var heading = main.querySelector("h1");
          if (heading) {
            heading.setAttribute("tabindex", "-1");
            heading.focus({ preventScroll: true });
          }
          if (announce && global.RFToast) {
            global.RFToast.show("You entered the " + label + " page.", "info");
          }
        }

        if (!reduced && typeof document.startViewTransition === "function") {
          document.startViewTransition(commit);
        } else {
          commit();
          main.classList.remove("page-enter");
          void main.offsetWidth;
          main.classList.add("page-enter");
          function clearPageEnter(event) {
            if (event.target !== main) return;
            main.classList.remove("page-enter");
            main.removeEventListener("animationend", clearPageEnter);
          }
          main.addEventListener("animationend", clearPageEnter);
        }
      })
      .catch(function () {
        if (request !== navigationRequest) return;
        // Keep ordinary browser navigation as a reliable fallback if fetching fails.
        global.location.assign(url.href);
      });
  }

  function bindPageNavigation() {
    document.addEventListener("click", function (e) {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      var link = e.target.closest ? e.target.closest("a[href]") : null;
      if (!link || link.hasAttribute("download") || link.target && link.target !== "_self") return;

      var url = new URL(link.href, global.location.href);
      if (url.origin !== global.location.origin ||
          !isPagePath(url.pathname) ||
          (url.pathname === global.location.pathname && url.search === global.location.search)) return;

      e.preventDefault();
      loadPage(url, true, true);
    });

    global.addEventListener("popstate", function () {
      loadPage(new URL(global.location.href), false, true);
    });
  }

  function init() {
    bindNav();
    bindAnchors();
    bindPageNavigation();
    initPage();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})(window);
