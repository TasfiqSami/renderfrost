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
      var fail = function () { item.classList.add("is-broken"); };
      if (img.complete && img.naturalWidth === 0 && img.getAttribute("src")) { if (img.complete) fail(); }
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
    var current = 0;

    function visible() { return items.filter(function (i) { return !i.hidden; }); }
    function show(list, i) {
      current = (i + list.length) % list.length;
      var btn = list[current].querySelector("[data-gallery-src]");
      img.src = btn.getAttribute("data-gallery-src");
      img.alt = btn.querySelector("img").alt;
      var by = btn.getAttribute("data-gallery-credit");
      var cap = btn.getAttribute("data-gallery-caption");
      text.textContent = [cap, by ? "Posted by " + by : ""].filter(Boolean).join(" \u00b7 ");
      pos.textContent = (current + 1) + " / " + list.length;
    }

    items.forEach(function (item) {
      item.querySelector("[data-gallery-src]").addEventListener("click", function () {
        var list = visible();
        show(list, list.indexOf(item));
        dialog.showModal();
      });
    });
    dialog.querySelector(".lightbox__nav--prev").addEventListener("click", function () { var l = visible(); show(l, current - 1); });
    dialog.querySelector(".lightbox__nav--next").addEventListener("click", function () { var l = visible(); show(l, current + 1); });
    dialog.querySelector(".lightbox__close").addEventListener("click", function () { dialog.close(); });
    dialog.addEventListener("click", function (e) { if (e.target === dialog) dialog.close(); });
    dialog.addEventListener("keydown", function (e) {
      var l = visible();
      if (e.key === "ArrowLeft") show(l, current - 1);
      else if (e.key === "ArrowRight") show(l, current + 1);
    });
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
        if (linkUrl.pathname === url.pathname) link.setAttribute("aria-current", "page");
        else link.removeAttribute("aria-current");
      }
    );

    var file = url.pathname.split("/").pop() || "index.html";
    var labels = {
      "index.html": "Home",
      "members.html": "Members",
      "rules.html": "Rules",
      "discord.html": "Discord",
      "join.html": "Join",
      "privacy.html": "Privacy Policy",
      "terms.html": "Terms of Service"
    };
    return labels[file] || file.replace(/\.html?$/i, "").replace(/[-_]/g, " ");
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
          !/\.html?$/i.test(url.pathname) ||
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
