/* ==========================================================================
   RenderFrost SMP — browser test suite (headless Chrome via puppeteer-core)

   Exercises real interactions instead of assuming they work:
     1. every page loads with no console errors or failed requests
     2. the design system is actually applied (computed styles)
     3. Copy IP writes the exact address and announces it
     4. soundtrack is silent first, plays on click, mute/volume persist
     5. mobile drawer opens and closes correctly
     6. FAQ accordions expand
     7. rules contents highlights the rule in view
     8. responsive layout and music controls across mobile, tablet, and desktop sizes
     9. reduced motion disables particles and reveals

   Usage:  node tools/test.js      (requires a local server on :8137)
   ========================================================================== */

"use strict";

const P = require(require("path").join(__dirname, "..", ".bt", "node_modules", "puppeteer-core"));

const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const BASE = "http://127.0.0.1:8137";
const PAGES = ["index", "members", "rules", "media", "discord", "join", "privacy", "terms", "cookies", "404"];

let pass = 0;
let fail = 0;

function check(label, condition, detail) {
  if (condition) {
    pass++;
    console.log(`  + ${label}`);
  } else {
    fail++;
    console.log(`  x ${label}${detail ? ` — ${detail}` : ""}`);
  }
}

async function newPage(browser, width, height) {
  const page = await browser.newPage();
  await page.setViewport({ width: width, height: height, deviceScaleFactor: 1 });
  const log = { console: [], pageerror: [], requests: [] };
  page.on("console", (m) => { if (m.type() === "error") log.console.push(m.text()); });
  page.on("pageerror", (e) => log.pageerror.push(e.message));
  page.on("requestfailed", (r) => log.requests.push(`${r.url()} (${r.failure()})`));
  page.on("response", (r) => { if (r.status() >= 400) log.requests.push(`${r.url()} -> ${r.status()}`); });
  return { page, log };
}

async function goto(page, name) {
  await page.goto(`${BASE}/${name}.html`, { waitUntil: "networkidle2", timeout: 30000 });
  await new Promise((r) => setTimeout(r, 400));
}

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  const browser = await P.launch({
    executablePath: CHROME,
    headless: "new",
    args: ["--no-sandbox", "--disable-dev-shm-usage", "--autoplay-policy=no-user-gesture-required"],
  });

  try {
    /* ---------------------------------------------- 1. Clean load, all pages */
    console.log("\n[1] Page loads\n");
    for (const name of PAGES) {
      const c = await newPage(browser, 1440, 900);
      await goto(c.page, name);
      const problems = [...c.log.console, ...c.log.pageerror, ...c.log.requests];
      check(`${name}.html loads clean`, problems.length === 0, problems.slice(0, 2).join(" | "));
      const frontMatter = await c.page.evaluate(() => ({
        visible: /\{\{\s*title\s*:/.test(document.body.innerText),
        title: document.title,
        particles: (() => {
          const canvas = document.querySelector("[data-particles]");
          return !!canvas && canvas.parentElement === document.body &&
            getComputedStyle(canvas).position === "fixed";
        })(),
        upperCaseIp: document.documentElement.outerHTML.indexOf("Play.RenderFrost.com") !== -1,
      }));
      check(`${name}.html hides build metadata`, !frontMatter.visible, String(frontMatter.visible));
      check(`${name}.html has its page title`, frontMatter.title !== "RenderFrost SMP", frontMatter.title);
      check(`${name}.html has the shared particle atmosphere`, frontMatter.particles, String(frontMatter.particles));
      check(`${name}.html displays no uppercase server address`, !frontMatter.upperCaseIp, String(frontMatter.upperCaseIp));
      const cookieLink = await c.page.$('.footer__list a[href="cookies.html"]');
      check(`${name}.html links to the Cookie Policy`, !!cookieLink, String(!!cookieLink));
      await c.page.$eval(".footer__studio-logo", (img) => { img.loading = "eager"; });
      await c.page.waitForFunction(
        () => {
          const img = document.querySelector(".footer__studio-logo");
          return !!img && img.complete;
        },
        { timeout: 10000 }
      );
      const studioCredit = await c.page.evaluate(() => {
        const card = document.querySelector(".footer__studio-card");
        const logo = document.querySelector(".footer__studio-logo");
        const developer = document.querySelector(".footer__developer");
        const cv = document.querySelector(".footer__cv-unavailable");
        return {
          studioHref: card && card.href,
          safeExternalLink: card && card.rel.includes("noopener") && card.rel.includes("noreferrer"),
          logoLoaded: !!logo && logo.complete && logo.naturalWidth > 0,
          brand: card && card.querySelector(".footer__studio-name")?.textContent.trim(),
          description: card && card.querySelector(".footer__studio-description")?.textContent.trim().replace(/\s+/g, " "),
          developerText: developer && developer.textContent.replace(/\s+/g, " ").trim(),
          cvIsNotInventedLink: !!cv && !cv.closest("a"),
        };
      });
      check(`${name}.html credits SYXLOR Studios with its supplied logo`, studioCredit.studioHref === "https://studios.syxlor.xyz/" && studioCredit.safeExternalLink && studioCredit.logoLoaded && studioCredit.brand === "SYXLOR", JSON.stringify(studioCredit));
      check(`${name}.html shows the requested studio description and developer credit`, studioCredit.description === "Syxlor Studios builds polished Minecraft, Discord, and web systems." && /Developer: TasfiqAhmed \| Download CV/.test(studioCredit.developerText), JSON.stringify(studioCredit));
      check(`${name}.html does not invent a CV download URL`, studioCredit.cvIsNotInventedLink, String(studioCredit.cvIsNotInventedLink));
      await c.page.close();
    }

    /* ---------------------------------------------------- 2. Design system */
    console.log("\n[2] Design system applied\n");
    {
      const c = await newPage(browser, 1440, 900);
      await goto(c.page, "index");

      const body = await c.page.evaluate(() => {
        const s = getComputedStyle(document.body);
        return { bg: s.backgroundColor, color: s.color, font: s.fontFamily };
      });
      check("deep charcoal background token applied", body.bg === "rgb(6, 5, 12)", body.bg);
      check("body text colour applied", body.color === "rgb(236, 234, 250)", body.color);
      check("Inter resolved as the body font", /Inter/.test(body.font), body.font);

      const h1 = await c.page.evaluate(() => {
        const el = document.querySelector(".hero__title strong");
        if (!el) return null;
        const s = getComputedStyle(el);
        return { size: parseFloat(s.fontSize), font: s.fontFamily, clip: s.webkitBackgroundClip };
      });
      check("hero headline uses the Cinzel display face", h1 && /Cinzel/.test(h1.font), h1 && h1.font);
      check("hero headline is display-scale", h1 && h1.size >= 40, h1 && `${h1.size}px`);
      check("hero gradient-text technique applied", h1 && h1.clip === "text", h1 && h1.clip);

      await c.page.evaluate(() => window.scrollTo(0, 0));
      await wait(100);
      const topScale = await c.page.$eval(".hero__art img", (el) =>
        parseFloat(getComputedStyle(el).getPropertyValue("--hero-scale"))
      );
      await c.page.evaluate(() => window.scrollTo(0, document.querySelector(".hero").offsetHeight));
      await wait(120);
      const scrolledScale = await c.page.$eval(".hero__art img", (el) =>
        parseFloat(getComputedStyle(el).getPropertyValue("--hero-scale"))
      );
      await c.page.evaluate(() => window.scrollTo(0, 0));
      await wait(120);
      const returnedScale = await c.page.$eval(".hero__art img", (el) =>
        parseFloat(getComputedStyle(el).getPropertyValue("--hero-scale"))
      );
      check("hero image zooms subtly with scroll", topScale === 1 && scrolledScale > 1 && scrolledScale <= 1.08, `${topScale} → ${scrolledScale}`);
      check("hero image returns to its original scale", returnedScale === 1, String(returnedScale));

      const nav = await c.page.evaluate(() => {
        const s = getComputedStyle(document.querySelector(".nav"));
        return { pos: s.position, h: s.height };
      });
      check("navbar is fixed", nav.pos === "fixed", nav.pos);
      check("navbar height is 72px", nav.h === "72px", nav.h);

      const particles = await c.page.evaluate(() => {
        const canvas = document.querySelector("[data-particles]");
        const rect = canvas.getBoundingClientRect();
        return {
          fixed: getComputedStyle(canvas).position === "fixed",
          coversViewport: Math.round(rect.width) === innerWidth && Math.round(rect.height) === innerHeight,
          outsideMain: canvas.parentElement === document.body,
        };
      });
      check("homepage particles cover the viewport", particles.fixed && particles.coversViewport, JSON.stringify(particles));
      check("particle atmosphere remains behind page content", particles.outsideMain, String(particles.outsideMain));

      const card = await c.page.evaluate(() => {
        const s = getComputedStyle(document.querySelector(".card"));
        return { radius: parseFloat(s.borderRadius), border: parseFloat(s.borderTopWidth) };
      });
      check("cards carry radius + hairline border", card.radius > 0 && card.border >= 1, JSON.stringify(card));

      const mono = await c.page.evaluate(
        () => getComputedStyle(document.querySelector(".copyip__addr")).fontFamily
      );
      check("server address renders in mono", /JetBrains Mono|monospace/i.test(mono), mono);

      await c.page.close();
    }
    /* --------------------------------------------------------- 3. Copy IP */
    console.log("\n[3] Copy IP action\n");
    {
      const c = await newPage(browser, 1440, 900);
      await c.page.evaluateOnNewDocument(() => {
        window.__copied = null;
        Object.defineProperty(navigator, "clipboard", {
          configurable: true,
          value: { writeText: (t) => { window.__copied = t; return Promise.resolve(); } },
        });
      });
      await goto(c.page, "index");

      const before = await c.page.evaluate(() => window.__copied);
      check("clipboard untouched before any click", before === null, String(before));

      await c.page.click(".hero .copyip__btn");
      await wait(300);

      const copied = await c.page.evaluate(() => window.__copied);
      check("copies the lowercase server address", copied === "play.renderfrost.com", String(copied));

      const label = await c.page.$eval(".hero .copyip__label", (el) => el.textContent);
      check("button confirms success", label === "Copied", label);

      const toast = await c.page.$eval(".toast", (el) => el.textContent.trim()).catch(() => null);
      check("toast announces the copy", !!toast && /copied/i.test(toast), String(toast));

      const live = await c.page.$eval(".toast-region", (el) => el.getAttribute("aria-live")).catch(() => null);
      check("toast region is a polite live region", live === "polite", String(live));

      await c.page.close();
    }

    /* ---------------------------------------------------- 4. Soundtrack */
    console.log("\n[4] Soundtrack control\n");
    {
      const c = await newPage(browser, 1440, 900);
      await goto(c.page, "index");

      const silent = await c.page.evaluate(() => ({
        playing: document.querySelector(".music").classList.contains("is-playing"),
        pressed: document.querySelector(".music__toggle").getAttribute("aria-pressed"),
      }));
      check("silent on first load", silent.playing === false && silent.pressed === "false", JSON.stringify(silent));

      await c.page.click(".music__toggle");
      await wait(1200);

      const playing = await c.page.evaluate(() => {
        const a = window.__rfAudio;
        return {
          playing: document.querySelector(".music").classList.contains("is-playing"),
          pressed: document.querySelector(".music__toggle").getAttribute("aria-pressed"),
          volume: a ? a.volume : null,
          src: a ? a.src.split("/").pop() : null,
          loop: a ? a.loop : null,
          paused: a ? a.paused : null,
        };
      });
      check("play press starts playback", playing.playing === true && playing.pressed === "true", JSON.stringify(playing));
      check("actually playing, not just flagged", playing.paused === false, `paused=${playing.paused}`);
      check("plays the supplied track on loop", playing.src === "renderfrost-bgm.mp3" && playing.loop === true, `${playing.src} loop=${playing.loop}`);
      check("fade-in keeps the level gentle", playing.volume !== null && playing.volume > 0 && playing.volume <= 0.7, `volume=${playing.volume}`);

      const eqVisible = await c.page.evaluate(
        () => getComputedStyle(document.querySelector(".music__eq")).opacity
      );
      check("equaliser shown only while playing", parseFloat(eqVisible) === 1, `opacity=${eqVisible}`);

      await c.page.click("[data-music=\"pop\"]");
      await wait(250);
      const popOpen = await c.page.$eval(".music__pop", (el) => el.classList.contains("is-open"));
      check("volume popover opens", popOpen === true, String(popOpen));

      await c.page.click("[data-music=\"mute\"]");
      await wait(300);

      const muted = await c.page.evaluate(() => {
        const a = window.__rfAudio;
        return { volume: a ? a.volume : null, stored: localStorage.getItem("rf.music") };
      });
      check("mute makes playback inaudible", muted.volume === 0, `volume=${muted.volume}`);
      check("mute state persisted", /"muted":true/.test(String(muted.stored)), String(muted.stored));

      await c.page.click("[data-music=\"unmute\"]");
      await wait(300);
      const restored = await c.page.evaluate(() => (window.__rfAudio ? window.__rfAudio.volume : null));
      check("unmute restores the configured volume", restored > 0, `volume=${restored}`);

      await c.page.evaluate(() => {
        const s = document.querySelector("[data-music=\"volume\"]");
        s.value = "15";
        s.dispatchEvent(new Event("input", { bubbles: true }));
      });
      await wait(250);
      const slider = await c.page.evaluate(() => ({
        vol: window.__rfAudio ? window.__rfAudio.volume : null,
        stored: localStorage.getItem("rf.music"),
      }));
      check("volume slider spans 0-100 and applies", Math.abs(slider.vol - 0.15) < 0.02, `volume=${slider.vol}`);
      check("volume choice stored", /"volume":0.15/.test(String(slider.stored)), String(slider.stored));

      const shown = await c.page.$eval(".music__value", (el) => el.textContent);
      check("percentage readout matches", shown === "15%", shown);

      await c.page.evaluate(() => { window.__audioBeforeNavigation = window.__rfAudio; });
      await c.page.evaluate(() => { window.__particlesBeforeNavigation = document.querySelector("[data-particles]"); });
      await c.page.click(".nav__link[href=\"rules.html\"]");
      await wait(700);
      const afterNavigation = await c.page.evaluate(() => ({
        page: location.pathname.split("/").pop(),
        sameAudio: window.__audioBeforeNavigation === window.__rfAudio,
        playing: !!window.__rfAudio && !window.__rfAudio.paused,
        sameParticles: window.__particlesBeforeNavigation === document.querySelector("[data-particles]"),
        title: document.title,
        current: document.querySelector(".nav__link[aria-current=\"page\"]")?.textContent.trim(),
        toast: Array.from(document.querySelectorAll(".toast")).pop()?.textContent.trim(),
      }));
      check("page transition swaps content without reloading", afterNavigation.page === "rules.html", afterNavigation.page);
      check("soundtrack keeps the same playing audio element", afterNavigation.sameAudio && afterNavigation.playing, JSON.stringify(afterNavigation));
      check("particle atmosphere persists across page transitions", afterNavigation.sameParticles, String(afterNavigation.sameParticles));
      check("navigation updates the active link and announces the page", afterNavigation.current === "Rules" && /Rules page/.test(afterNavigation.toast || ""), JSON.stringify(afterNavigation));

      await c.page.click(".footer__list a[href=\"privacy.html\"]");
      await wait(700);
      const privacy = await c.page.evaluate(() => ({
        page: location.pathname.split("/").pop(),
        current: document.querySelector(".drawer__link[aria-current=\"page\"]")?.firstChild?.textContent.trim(),
        toast: Array.from(document.querySelectorAll(".toast")).pop()?.textContent.trim(),
      }));
      check("legal page navigation announces Privacy Policy", privacy.page === "privacy.html" && /Privacy Policy page/.test(privacy.toast || ""), JSON.stringify(privacy));
      await c.page.evaluate(() => history.back());
      await c.page.waitForFunction(() => location.pathname.endsWith("/rules.html"), { timeout: 5000 });
      await wait(500);
      const returned = await c.page.evaluate(() => ({
        page: location.pathname.split("/").pop(),
        title: document.title,
        heading: document.querySelector("#main h1")?.textContent.trim(),
        playing: !!window.__rfAudio && !window.__rfAudio.paused,
      }));
      check("browser back restores page content without interrupting music", returned.page === "rules.html" && !!returned.heading && returned.playing, JSON.stringify(returned));

      await c.page.close();
    }
    /* ------------------------------------------------ 5. Mobile navigation */
    console.log("\n[5] Mobile menu\n");
    {
      const c = await newPage(browser, 390, 844);
      await goto(c.page, "index");

      const linksHidden = await c.page.evaluate(
        () => getComputedStyle(document.querySelector(".nav__links")).display
      );
      check("desktop links hidden on mobile", linksHidden === "none", linksHidden);

      const toggleVisible = await c.page.evaluate(
        () => getComputedStyle(document.querySelector(".nav__toggle")).display
      );
      check("hamburger visible on mobile", toggleVisible !== "none", toggleVisible);

      const closedBefore = await c.page.evaluate(
        () => document.querySelector(".drawer").classList.contains("is-open")
      );
      check("drawer closed initially", closedBefore === false, String(closedBefore));

      await c.page.click(".nav__toggle");
      await wait(350);

      const open = await c.page.evaluate(() => ({
        cls: document.querySelector(".drawer").classList.contains("is-open"),
        expanded: document.querySelector(".nav__toggle").getAttribute("aria-expanded"),
        visible: getComputedStyle(document.querySelector(".drawer")).visibility,
      }));
      check("drawer opens on tap", open.cls === true && open.visible === "visible", JSON.stringify(open));
      check("toggle reports expanded state", open.expanded === "true", open.expanded);

      await c.page.keyboard.press("Escape");
      await wait(350);
      const escaped = await c.page.evaluate(() => ({
        cls: document.querySelector(".drawer").classList.contains("is-open"),
        expanded: document.querySelector(".nav__toggle").getAttribute("aria-expanded"),
      }));
      check("Escape closes the drawer", escaped.cls === false && escaped.expanded === "false", JSON.stringify(escaped));

      await c.page.click(".nav__toggle");
      await wait(300);
      await c.page.click(".drawer__link[href=\"rules.html\"]");
      await c.page.waitForFunction(
        () => location.pathname.split("/").pop() === "rules.html",
        { timeout: 10000 }
      );
      const afterNav = await c.page.evaluate(() => ({
        url: location.pathname.split("/").pop(),
        open: document.querySelector(".drawer").classList.contains("is-open"),
      }));
      check("drawer link navigates", afterNav.url === "rules.html", afterNav.url);
      check("drawer closes after navigating", afterNav.open === false, String(afterNav.open));

      await c.page.close();
    }

    /* ---------------------------------------------------------- 6. FAQ */
    console.log("\n[6] FAQ accordions\n");
    {
      const c = await newPage(browser, 1440, 900);
      await goto(c.page, "index");

      const before = await c.page.$eval(".faq__item", (el) => el.open);
      check("first question starts closed", before === false, String(before));

      await c.page.click(".faq__item summary");
      await wait(300);

      const after = await c.page.$eval(".faq__item", (el) => el.open);
      check("question expands on click", after === true, String(after));

      const answerVisible = await c.page.evaluate(() => {
        const a = document.querySelector(".faq__a");
        return a && a.textContent.trim().length > 20;
      });
      check("answer content is real, not empty", answerVisible === true, String(answerVisible));

      await c.page.click(".faq__item summary");
      const closing = await c.page.$eval(".faq__item", (el) => el.classList.contains("is-closing"));
      check("FAQ close animates before collapsing", closing === true, String(closing));
      await wait(300);
      const collapsed = await c.page.$eval(".faq__item", (el) => el.open);
      check("question collapses again", collapsed === false, String(collapsed));

      await c.page.close();
    }

    /* --------------------------------------------- 7. Rules page contents */
    console.log("\n[7] Rules contents navigation\n");
    {
      const c = await newPage(browser, 1440, 900);
      await goto(c.page, "rules");

      const count = await c.page.evaluate(() => document.querySelectorAll(".rules-toc .rules-toc__link[href^=\"#rule-\"]").length);
      check("contents lists all 20 rules", count === 20, `${count} links`);

      const ruleCount = await c.page.evaluate(() => document.querySelectorAll(".rule[id^=\"rule-\"]").length);
      check("20 rule sections rendered", ruleCount === 20, `${ruleCount} sections`);

      const sticky = await c.page.evaluate(
        () => getComputedStyle(document.querySelector(".rules-toc")).position
      );
      check("desktop contents rail is sticky", sticky === "sticky", sticky);

      await c.page.evaluate(() => {
        document.getElementById("rule-12").scrollIntoView({ behavior: "instant" });
      });
      await wait(900);

      const current = await c.page.evaluate(() => {
        const el = document.querySelector(".rules-toc__link.is-current");
        return el ? el.getAttribute("href") : null;
      });
      check("contents highlights the rule in view", current === "#rule-12", String(current));

      await c.page.click(".rules-toc__link[href=\"#rule-4\"]");
      await wait(900);
      const jumped = await c.page.evaluate(() => ({
        hash: location.hash,
        top: document.getElementById("rule-4").getBoundingClientRect().top,
      }));
      check("anchor link jumps to the rule", jumped.hash === "#rule-4" && jumped.top < 200, JSON.stringify(jumped));

      await c.page.close();
    }
    /* ------------------------------------------- 8. Responsive: no overflow */
    console.log("\n[8] Responsive layout\n");
    {
      const widths = [320, 360, 390, 430, 768, 1024, 1280, 1440, 1920];
      for (const w of widths) {
        const c = await newPage(browser, w, 900);
        await goto(c.page, "index");
        const overflow = await c.page.evaluate(() => ({
          doc: document.documentElement.scrollWidth,
          win: window.innerWidth,
          wide: Array.from(document.querySelectorAll("body *")).filter((el) => {
            const r = el.getBoundingClientRect();
            return r.width > 0 && r.right > window.innerWidth + 1.5;
          }).slice(0, 3).map((el) => el.className || el.tagName),
        }));
        check(`no horizontal overflow at ${w}px`, overflow.doc <= overflow.win + 1, `${overflow.doc} vs ${overflow.win} · offenders: ${overflow.wide.join(", ")}`);
        await c.page.close();
      }

      for (const w of [320, 360, 375, 390, 430, 551, 677, 768, 900, 1024, 1100, 1200, 1280, 1440, 1920]) {
        const c = await newPage(browser, w, 844);
        await goto(c.page, "index");
        const nav = await c.page.evaluate(() => ({
          width: innerWidth,
          links: getComputedStyle(document.querySelector(".nav__links")).display,
          toggle: getComputedStyle(document.querySelector(".nav__toggle")).display,
          cta: getComputedStyle(document.querySelector(".nav__actions .btn--primary")).display,
        }));
        const compact = w <= 1100;
        check(
          `navbar adapts at ${w}px`,
          compact
            ? nav.links === "none" && nav.toggle !== "none" && nav.cta === "none"
            : nav.links !== "none" && nav.toggle === "none" && nav.cta !== "none",
          JSON.stringify(nav)
        );

        if (compact) {
          await c.page.click('[data-music="pop"]');
          await wait(300);
          const popover = await c.page.$eval(".music__pop", (el) => {
            const box = el.getBoundingClientRect();
            return { open: el.classList.contains("is-open"), left: box.left, right: box.right };
          });
          check(
            `music controls stay inside ${w}px viewport`,
            popover.open && popover.left >= -1 && popover.right <= w + 1,
            JSON.stringify(popover)
          );
        }
        await c.page.close();
      }

      // Rules page is the densest; check it too.
      for (const w of [320, 390, 768]) {
        const c = await newPage(browser, w, 900);
        await goto(c.page, "rules");
        const doc = await c.page.evaluate(() => document.documentElement.scrollWidth);
        check(`rules page fits at ${w}px`, doc <= w + 1, `${doc} vs ${w}`);
        await c.page.close();
      }

      for (const name of PAGES) {
        for (const w of [320, 360, 375, 390, 430, 768, 1024, 1280, 1440, 1920]) {
          const c = await newPage(browser, w, 844);
          await goto(c.page, name);
          const doc = await c.page.evaluate(() => ({
            width: document.documentElement.scrollWidth,
            viewport: innerWidth,
          }));
          check(`${name} page fits at ${w}px`, doc.width <= doc.viewport + 1, `${doc.width} vs ${doc.viewport}`);
          await c.page.close();
        }

        for (const w of [320, 390, 768, 1024, 1440]) {
          const c = await newPage(browser, w, 900);
          await goto(c.page, "index");
          const studio = await c.page.evaluate(() => {
            const box = document.querySelector(".footer__studio-card").getBoundingClientRect();
            const footer = document.querySelector(".footer").getBoundingClientRect();
            return {
              left: box.left,
              right: box.right,
              width: box.width,
              footerRight: footer.right,
              documentWidth: document.documentElement.scrollWidth,
              viewportWidth: innerWidth,
            };
          });
          check(`SYXLOR footer credit fits ${w}px layout`, studio.left >= -1 && studio.right <= studio.footerRight + 1 && studio.right <= w + 1 && studio.documentWidth <= w + 1, JSON.stringify(studio));
          await c.page.close();
        }
      }

      // Mobile rules jump menu replaces the sticky rail.
      const c = await newPage(browser, 390, 844);
      await goto(c.page, "rules");
      const railHidden = await c.page.evaluate(
        () => getComputedStyle(document.querySelector(".rules-toc")).display
      );
      const jumpShown = await c.page.evaluate(
        () => getComputedStyle(document.querySelector(".rules-toc__mobile")).display
      );
      check("sticky rail hidden on mobile", railHidden === "none", railHidden);
      check("expandable jump menu shown instead", jumpShown !== "none", jumpShown);

      await c.page.click(".rules-jump > summary");
      await wait(300);
      const jumpOpen = await c.page.$eval(".rules-jump", (el) => el.open);
      check("jump menu expands accessibly", jumpOpen === true, String(jumpOpen));
      const jumpLinks = await c.page.evaluate(
        () => document.querySelectorAll(".rules-jump .rules-toc__link[href^=\"#rule-\"]").length
      );
      check("jump menu lists all 20 rules", jumpLinks === 20, `${jumpLinks} links`);
      await c.page.close();
    }

    /* ------------------------------------------- 9. Touch target minimums */
    console.log("\n[9] Touch targets\n");
    {
      const c = await newPage(browser, 390, 844);
      await goto(c.page, "index");
      const small = await c.page.evaluate(() =>
        Array.from(document.querySelectorAll("button, .btn, .copyip__btn, .nav__toggle"))
          .filter((el) => {
            /* Skip visually hidden controls (e.g. the alternate mute/unmute
               state swapped via the --hidden class) — they aren't targets. */
            const cs = getComputedStyle(el);
            return cs.display !== "none" && cs.visibility !== "hidden" &&
              parseFloat(cs.opacity) > 0 && el.getBoundingClientRect().height > 0;
          })
          .map((el) => {
            const r = el.getBoundingClientRect();
            return { cls: (el.className || "").toString().slice(0, 34), h: Math.round(r.height), w: Math.round(r.width) };
          })
          .filter((x) => x.h > 0 && (x.h < 32 || x.w < 32))
      );
      check("all controls meet a 32px minimum", small.length === 0, JSON.stringify(small.slice(0, 3)));
      await c.page.close();
    }

    /* ------------------------------------------------- 10. Reduced motion */
    console.log("\n[10] Reduced motion\n");
    {
      const c = await newPage(browser, 1440, 900);
      await c.page.emulateMediaFeatures([{ name: "prefers-reduced-motion", value: "reduce" }]);
      await goto(c.page, "index");

      const state = await c.page.evaluate(() => ({
        scroll: getComputedStyle(document.documentElement).scrollBehavior,
        reveals: Array.from(document.querySelectorAll("[data-reveal]")).every((el) =>
          getComputedStyle(el).opacity === "1"
        ),
        cursorDots: document.querySelectorAll(".cursor, .cursor-ring").length,
        particlePixels: (() => {
          const cv = document.querySelector("[data-particles]");
          return cv ? cv.width + "x" + cv.height : "none";
        })(),
      }));
      check("smooth scrolling disabled", state.scroll === "auto", state.scroll);
      check("revealed content is visible without animation", state.reveals === true, String(state.reveals));
      check("custom cursor not injected", state.cursorDots === 0, `${state.cursorDots} elements`);
      // Reduced motion removes the decorative canvas from the DOM entirely
      // (mounted canvases report real pixel dimensions, never 0x0).
      check(
        "particle canvas not mounted under reduced motion",
        state.particlePixels === "none",
        state.particlePixels
      );

      await c.page.close();
    }

    /* ---------------------------------------------------- 11. Cursor system */
    console.log("\n[11] Custom cursor\n");
    {
      const c = await newPage(browser, 1440, 900);
      await goto(c.page, "index");

      await c.page.mouse.move(500, 500);
      // The dot fades in over var(--t-base); poll until the transition lands.
      for (let i = 0; i < 20; i++) {
        await wait(100);
        const op = await c.page.evaluate(
          () => getComputedStyle(document.querySelector(".cursor")).opacity
        );
        if (parseFloat(op) === 1) break;
      }

      const injected = await c.page.evaluate(() => ({
        count: document.querySelectorAll(".cursor, .cursor-ring").length,
        active: document.body.classList.contains("cursor-active"),
        opacity: getComputedStyle(document.querySelector(".cursor")).opacity,
        pointerEvents: getComputedStyle(document.querySelector(".cursor")).pointerEvents,
      }));
      check("cursor layer injected on fine pointers", injected.count === 2, `${injected.count} elements`);
      check("native cursor hidden once custom is live", injected.active === true, String(injected.active));
      check("cursor visible after movement", parseFloat(injected.opacity) === 1, injected.opacity);
      check("cursor layer never blocks clicks", injected.pointerEvents === "none", injected.pointerEvents);

      const btn = await c.page.$(".btn--primary");
      const box = await btn.boundingBox();
      await c.page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
      await wait(300);
      const linkState = await c.page.evaluate(() => document.body.classList.contains("cursor--link"));
      check("clickable state applied over buttons", linkState === true, String(linkState));

      const addr = await c.page.$(".copyip__addr");
      const abox = await addr.boundingBox();
      await c.page.mouse.move(abox.x + 10, abox.y + abox.height / 2);
      await wait(300);
      const textState = await c.page.evaluate(() => ({
        link: document.body.classList.contains("cursor--link"),
        cursor: getComputedStyle(document.querySelector(".copyip__addr")).cursor,
      }));
      check("text keeps its native cursor, not the custom one", textState.link === false, JSON.stringify(textState));

      await c.page.close();
    }

    /* ------------------------------------------------------ 12. Conclusion */
    console.log(`\n${fail === 0 ? "ALL PASS" : "FAILURES"} — ${pass} passed, ${fail} failed\n`);
  } finally {
    await browser.close();
  }

  process.exit(fail === 0 ? 0 : 1);
})().catch((err) => {
  console.error("\nTest runner crashed:", err);
  process.exit(1);
});
