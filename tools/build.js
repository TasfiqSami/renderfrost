/* ==========================================================================
   RenderFrost SMP — static site builder

   The navbar, footer, music control and script tags exist once, in
   src/partials. Every page composes from those partials plus its own
   content fragment, so a nav change is a one-file change.

   Usage:  node tools/build.js
   Output: static .html files at the project root (no runtime dependency).
   ========================================================================== */

"use strict";

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const SRC = path.join(ROOT, "src");
const PAGES = path.join(SRC, "pages");
const PARTIALS = path.join(SRC, "partials");

const PAGES_ORDER = ["index", "members", "rules", "gallery", "media", "discord", "join", "privacy", "terms", "cookies", "404"];
const SITE_ORIGIN = getSiteOrigin();

function getSiteOrigin() {
  const value = process.env.SITE_ORIGIN || "https://www.renderfrost.com";

  const url = new URL(value);
  if (
    url.protocol !== "https:" ||
    url.pathname !== "/" ||
    url.search ||
    url.hash ||
    url.username ||
    url.password
  ) {
    throw new Error("SITE_ORIGIN must be an HTTPS origin without a path, query, or credentials.");
  }
  return url.origin;
}

/* Clean URLs: "rules.html" -> "rules", "index.html" -> "./". */
function cleanPath(p) {
  const m = String(p).match(/^([\w-]+)\.html(#.*)?$/);
  if (!m) return p;
  return (m[1] === "index" ? "./" : m[1]) + (m[2] || "");
}

function cleanLinks(html) {
  return html.replace(/href="([\w-]+\.html(?:#[^"]*)?)"/g, (_, h) => `href="${cleanPath(h)}"`);
}

function siteUrl(pathname) {
  const url = new URL(pathname, `${SITE_ORIGIN}/`);
  if (url.origin !== SITE_ORIGIN) {
    throw new Error(`Page URL must stay on SITE_ORIGIN: ${pathname}`);
  }
  return url.href;
}

const NAV_ITEMS = [
  { file: "index", label: "Home" },
  { file: "members", label: "Members" },
  { file: "rules", label: "Rules" },
  { file: "gallery", label: "Gallery" },
  { file: "media", label: "Media" },
  { file: "discord", label: "Discord" },
  { file: "join", label: "Join" },
];

const LEGAL = [
  { file: "privacy", label: "Privacy Policy" },
  { file: "terms", label: "Terms of Service" },
  { file: "cookies", label: "Cookie Policy" },
];

function read(file) {
  return fs.readFileSync(path.join(PARTIALS, file), "utf8").trim();
}

function esc(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/* Pull {{key: value}} front-matter out of a page fragment. */
function parseFrontMatter(raw) {
  const meta = {};
  let body = raw.replace(/^\uFEFF/, "");
  const match = body.match(/^\{\{([\s\S]*?)\}\}/);
  if (match) {
    match[1]
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .forEach((line) => {
        const i = line.indexOf(":");
        if (i > 0) meta[line.slice(0, i).trim()] = line.slice(i + 1).trim();
      });
    body = body.slice(match[0].length).replace(/^\s+/, "");
  }
  return { meta, body };
}

function buildNav(active) {
  const links = NAV_ITEMS.map((item) => {
    const current = item.file === active ? ' aria-current="page"' : "";
    return `        <li><a class="nav__link" href="${item.file}.html"${current}>${esc(item.label)}</a></li>`;
  }).join("\n");

  const drawer = NAV_ITEMS.concat(LEGAL).map((item, i) => {
    const current = item.file === active ? ' aria-current="page"' : "";
    const label = LEGAL.indexOf(item) > -1 ? item.label : item.label;
    return `  <a class="drawer__link" href="${item.file}.html"${current}>${esc(label)} <span>${String(i + 1).padStart(2, "0")}</span></a>`;
  }).join("\n");

  return { links, drawer };
}

function buildFooterLinks() {
  const explore = NAV_ITEMS.map((item) => {
    const current = item.file === "index" ? "" : "";
    return `          <li><a href="${item.file}.html"${current}>${esc(item.label)}</a></li>`;
  }).join("\n");

  const legal = LEGAL.map((item) =>
    `          <li><a href="${item.file}.html">${esc(item.label)}</a></li>`
  ).join("\n") +
    `
          <li><a href="https://discord.gg/SMRS6skKYY" target="_blank" rel="noopener noreferrer">Discord <span class="footer__ext">EXT</span></a></li>`;

  return { explore, legal };
}

/* Gallery: built from assets/img/gallery/gallery.json. Only real files that
   exist on disk are rendered; with none, an honest empty state is shown. */
function galleryEntries() {
  const dir = path.join(ROOT, "assets", "img", "gallery");
  let entries = [];
  try {
    entries = JSON.parse(fs.readFileSync(path.join(dir, "gallery.json"), "utf8")).images || [];
  } catch (e) { entries = []; }
  const ok = /^[\w .\/-]+\.(jpe?g|png|webp|avif)$/i;
  return entries.filter((e) => e && ok.test(e.file || "") && fs.existsSync(path.join(dir, e.file)) &&
    (!e.thumb || (ok.test(e.thumb) && fs.existsSync(path.join(dir, e.thumb)))));
}

function buildGalleryStats() {
  const list = galleryEntries();
  if (!list.length) return "";
  const who = new Set(list.map((e) => e.credit).filter(Boolean));
  const dates = list.map((e) => e.date).filter(Boolean).sort();
  const since = dates.length ? fmtDate(dates[0], { month: "short", year: "numeric" }) : "";
  return `<div class="gx-stats">
      <div><b>${list.length}</b><span>Screenshots</span></div>
      <div><b>${who.size}</b><span>Photographers</span></div>${since ? `\n      <div><b>${esc(since)}</b><span>Since</span></div>` : ""}
    </div>`;
}

function buildGallery() {
  const list = galleryEntries();
  if (!list.length) {
    return `<div class="gx-empty"><strong>Screenshots are on the way.</strong> Add pictures with tools/gallery-import.py and they appear here.</div>`;
  }
  const url = (f) => "assets/img/gallery/" + f.split("/").map(encodeURIComponent).join("/");
  const entries = list.map((e, i) => Object.assign({}, e, {
    id: i,
    nice: fmtDate(e.date, { day: "numeric", month: "long", year: "numeric" }),
    month: fmtDate(e.date, { month: "long", year: "numeric" }) || "Undated",
  }));

  // Highlights: the most striking shots, at most two per photographer.
  const per = {};
  const picked = entries.filter((e) => e.featured).sort((a, b) => a.featured - b.featured).slice(0, 5);
  const hl = picked.length >= 5 ? picked : entries.filter((e) => e.w >= 1600 && e.h >= 800)
    .sort((a, b) => (b.score || 0) - (a.score || 0)).filter((e) => {
      per[e.credit] = (per[e.credit] || 0) + 1;
      return per[e.credit] <= 2;
    }).slice(0, 5);

  const people = [];
  entries.forEach((e) => { if (e.credit && !people.find((p) => p.name === e.credit)) people.push({ name: e.credit, n: 0 }); });
  people.forEach((p) => { p.n = entries.filter((e) => e.credit === p.name).length; });
  people.sort((a, b) => b.n - a.n);

  const alt = (e) => esc(`Screenshot by ${e.credit || "a player"}${e.nice ? ", " + e.nice : ""}`);

  const hlHtml = hl.length >= 5 ? `<div class="gx-hl" data-gx-hl>
${hl.map((e) => `      <button type="button" class="gx-hl__item" data-gx-open="${e.id}">
        <img src="${esc(url(e.thumb || e.file))}" alt="${alt(e)}" width="640" height="360" loading="lazy" decoding="async">
        <span class="gx-hl__cap"><small>${esc(e.credit || "")}</small>${esc(e.caption || e.nice || "")}</span>
      </button>`).join("\n")}
    </div>` : "";

  const peopleHtml = `<div class="gx-people" role="group" aria-label="Filter by photographer">
      <button type="button" class="gx-person" data-gx-who="" aria-pressed="true"><span class="gx-person__all" aria-hidden="true">All</span><b>Everyone</b><small>${entries.length}</small></button>
${people.map((p) => `      <button type="button" class="gx-person" data-gx-who="${esc(p.name)}" aria-pressed="false"><img src="/api/head?name=${encodeURIComponent(/^[A-Za-z0-9_]{3,16}$/.test(p.name) ? p.name : "Steve")}" alt="" width="30" height="30" loading="lazy" data-head><b>${esc(p.name)}</b><small>${p.n}</small></button>`).join("\n")}
    </div>`;

  const months = [];
  entries.forEach((e) => {
    let m = months[months.length - 1];
    if (!m || m.name !== e.month) { m = { name: e.month, items: [] }; months.push(m); }
    m.items.push(e);
  });
  const monthsHtml = months.map((m) => `    <section class="gx-month" data-gx-month>
      <h3 class="gx-month__h">${esc(m.name)} <span>${m.items.length}</span></h3>
      <div class="gx-grid">
${m.items.map((e, k) => `        <figure class="gx-tile" data-id="${e.id}" data-credit="${esc(e.credit || "")}">
          <button type="button" class="gx-tile__btn" data-gx-full="${esc(url(e.file))}" data-gx-credit="${esc(e.credit || "")}" data-gx-date="${esc(e.nice)}" data-gx-cap="${esc(e.caption || "")}" aria-label="View larger: ${alt(e)}">
            <img src="${esc(url(e.thumb || e.file))}" alt="${alt(e)}" width="640" height="${Math.round(640 * (e.h || 9) / (e.w || 16))}" loading="lazy" decoding="async">
            <span class="gx-tile__by">${esc(e.credit || "")}${e.nice ? " · " + esc(e.nice) : ""}</span>
          </button>
        </figure>`).join("\n")}
      </div>
    </section>`).join("\n");

  return `<div data-gx>
    ${hlHtml}
    ${peopleHtml}
    <p class="sr-only" aria-live="polite"><span data-gx-count>${entries.length}</span> screenshots shown</p>
${monthsHtml}
    <dialog class="gx-viewer" aria-label="Image viewer">
      <button type="button" class="gx-viewer__close" aria-label="Close viewer">&times;</button>
      <div class="gx-viewer__stage">
        <button type="button" class="gx-viewer__nav gx-viewer__nav--prev" aria-label="Previous">&#8249;</button>
        <img class="gx-viewer__img" alt="">
        <button type="button" class="gx-viewer__nav gx-viewer__nav--next" aria-label="Next">&#8250;</button>
      </div>
      <div class="gx-viewer__bar">
        <div class="gx-viewer__who"><img alt="" width="36" height="36" data-head><div><strong data-gx-name></strong><span data-gx-meta></span></div></div>
        <span class="gx-viewer__count" data-gx-pos></span>
        <a class="gx-viewer__open" data-gx-link href="#" target="_blank" rel="noopener">Open full size</a>
      </div>
    </dialog>
  </div>`;
}

/* News & media: link cards from src/media.json. Nothing is embedded, so the
   site still loads no third-party scripts. */
function buildMedia() {
  let items = [];
  try {
    items = JSON.parse(fs.readFileSync(path.join(SRC, "media.json"), "utf8")).items || [];
  } catch (e) { items = []; }
  items = items.filter((i) => i && i.title && /^https:\/\//.test(i.url || ""));
  if (!items.length) {
    return `<div class="gallery__empty" data-reveal><p><strong>No announcements yet.</strong> News and videos will appear here.</p></div>`;
  }
  const cards = items.map((i) => `      <a class="card card--interactive media__card" href="${esc(i.url)}" target="_blank" rel="noopener noreferrer" data-reveal>
        <span class="media__meta">${esc(i.type || "News")}${i.platform ? " · " + esc(i.platform) : ""}${i.date ? " · " + esc(i.date) : ""}</span>
        <h3>${esc(i.title)}</h3>${i.description ? `\n        <p>${esc(i.description)}</p>` : ""}
        <span class="media__go">Open${i.platform ? " on " + esc(i.platform) : ""} <span aria-hidden="true">↗</span></span>
      </a>`).join("\n");
  return `<div class="media__grid">\n${cards}\n    </div>`;
}

/* Member directory from src/members.json, oldest member first. */
function loadMembers() {
  let list = [];
  try {
    list = JSON.parse(fs.readFileSync(path.join(SRC, "members.json"), "utf8")).members || [];
  } catch (e) { list = []; }
  list = list.filter((m) => m && /^[A-Za-z0-9_]{3,16}$/.test(m.name || ""));
  list.forEach((m) => { if (m.alias && !/^[A-Za-z0-9_]{3,16}$/.test(m.alias)) delete m.alias; });
  list.sort((a, b) => (Date.parse(a.joined) || Infinity) - (Date.parse(b.joined) || Infinity));
  return list;
}

function fmtDate(iso, opts) {
  const t = Date.parse(iso);
  if (isNaN(t)) return "";
  return new Date(t).toLocaleDateString("en-GB", Object.assign({ timeZone: "Asia/Dhaka" }, opts));
}

function skinUrl(m, type) {
  return `/api/head?name=${encodeURIComponent(m.name)}${m.alias ? `&alt=${encodeURIComponent(m.alias)}` : ""}&type=${type}`;
}

function buildFounder() {
  const order = ["Owner", "Chief Staff", "Manager", "Dev/Admin"];
  const staff = loadMembers().filter((x) => x.role).sort((x, y) => {
    const i = order.indexOf(x.role), j = order.indexOf(y.role);
    return (i < 0 ? 99 : i) - (j < 0 ? 99 : j);
  });
  if (!staff.length) return "";
  // Owner in the middle of the line-up, the rest beside him.
  const [lead, ...rest] = staff;
  const mid = Math.ceil(rest.length / 2);
  const line = rest.slice(0, mid).concat([lead], rest.slice(mid));
  const tiles = line.map((m) => {
    const when = fmtDate(m.joined, { day: "numeric", month: "long", year: "numeric" });
    return `<li class="lineup__item${m === lead ? " lineup__item--lead" : ""}" data-reveal>
        <img class="lineup__skin" src="${skinUrl(m, "body")}" alt="${esc(m.name)}'s skin" width="200" height="400" loading="lazy" decoding="async">
        <span class="lineup__role">${esc(m.role)}</span>
        <strong class="lineup__name">${esc(m.name)}</strong>
        ${when ? `<span class="lineup__meta">Joined ${esc(when)}</span>` : ""}
      </li>`;
  }).join("\n      ");
  return `<ul class="lineup">\n      ${tiles}\n    </ul>`;
}

function buildRoster() {
  const list = loadMembers();
  if (!list.length) {
    return `<p class="mempty">The member list is being prepared. Check back soon.</p>`;
  }
  const cards = list.map((m, i) => {
    const names = [m.name].concat(m.alias ? [m.alias] : []);
    const when = fmtDate(m.joined, { day: "numeric", month: "short", year: "numeric" });
    const ts = Date.parse(m.joined) || 0;
    return `      <li class="pcard${m.role ? " pcard--staff" : ""}" data-name="${esc(names.join(" ").toLowerCase())}" data-kind="${m.role ? "staff" : "member"}" data-i="${i}" data-ts="${ts}" data-sort="${esc(m.name.toLowerCase())}">
        <span class="pcard__stage"><img src="${skinUrl(m, "body")}" alt="${esc(m.name)}'s skin" width="120" height="240" loading="lazy" decoding="async"><span class="pcard__live" aria-hidden="true">Online</span></span>
        <strong class="pcard__name">${esc(m.name)}</strong>${m.alias ? `\n        <span class="pcard__aka">aka ${esc(m.alias)}</span>` : ""}${m.role ? `\n        <span class="pcard__role">${esc(m.role)}</span>` : ""}
        ${when ? `<time class="pcard__date" datetime="${esc(m.joined)}">${esc(when)}</time>` : ""}
      </li>`;
  }).join("\n");
  return `<ul class="wall" data-member-grid>\n${cards}\n    </ul>`;
}

function memberCount() { return String(loadMembers().length); }

function memberSince() {
  const first = loadMembers().find((m) => !isNaN(Date.parse(m.joined)));
  return first ? fmtDate(first.joined, { month: "short", year: "numeric" }) : "2025";
}

const SHELL_CACHE = {};
const partials = ["head.html", "nav.html", "drawer.html", "cta.html", "footer.html", "scripts.html"];
partials.forEach((p) => { SHELL_CACHE[p] = read(p); });

function render(pageFile, meta, body) {
  const nav = buildNav(pageFile);
  const footer = buildFooterLinks();
  const canonicalPath = cleanPath(meta.canonical || `${pageFile}.html`);

  let html = SHELL_CACHE["head.html"]
    .replace(/\{\{TITLE\}\}/g, esc(meta.title || "RenderFrost SMP"))
    .replace(/\{\{DESCRIPTION\}\}/g, esc(meta.description || ""))
    .replace(/\{\{CANONICAL\}\}/g, esc(SITE_ORIGIN ? siteUrl(canonicalPath === "./" ? "" : canonicalPath) : canonicalPath))
    .replace(/\{\{OG_IMAGE\}\}/g, esc(SITE_ORIGIN ? siteUrl("assets/img/og-image.jpg") : "assets/img/og-image.jpg"))
    .replace(/\{\{OG_TITLE\}\}/g, esc(meta.ogTitle || meta.title || "RenderFrost SMP"))
    .replace(/\{\{OG_DESCRIPTION\}\}/g, esc(meta.ogDescription || meta.description || ""));

  html += "\n\n" + SHELL_CACHE["nav.html"].replace(/\{\{NAV_LINKS\}\}/g, nav.links);
  html += "\n\n" + SHELL_CACHE["drawer.html"].replace(/\{\{DRAWER_LINKS\}\}/g, nav.drawer);
  html += "\n\n<main id=\"main\">\n" + body.trim().replace("<!--GALLERY_STATS-->", () => buildGalleryStats()).replace("<!--GALLERY-->", () => buildGallery()).replace("<!--MEDIA-->", () => buildMedia()).replace("<!--FOUNDER-->", buildFounder()).replace("<!--ROSTER-->", () => buildRoster()).replace("<!--MEMBER_COUNT-->", () => memberCount()).replace("<!--MEMBER_SINCE-->", () => memberSince()) + "\n</main>\n";
  html += SHELL_CACHE["cta.html"];
  html += "\n" + SHELL_CACHE["footer.html"]
    .replace(/\{\{EXPLORE_LINKS\}\}/g, footer.explore)
    .replace(/\{\{LEGAL_LINKS\}\}/g, footer.legal);
  html += "\n" + SHELL_CACHE["scripts.html"] + "\n";

  return cleanLinks(html);
}

function writeSeoFiles() {
  const robots = ["User-agent: *", "Allow: /"];
  const sitemapPath = path.join(ROOT, "sitemap.xml");

  if (SITE_ORIGIN) {
    robots.push(`Sitemap: ${SITE_ORIGIN}/sitemap.xml`);
    const urls = PAGES_ORDER
      .filter((page) => page !== "404" && fs.existsSync(path.join(PAGES, `${page}.html`)))
      .map((page) => {
        const { meta } = parseFrontMatter(fs.readFileSync(path.join(PAGES, `${page}.html`), "utf8"));
        const c = cleanPath(meta.canonical || `${page}.html`);
        return siteUrl(c === "./" ? "" : c);
      });
    const xml = [
      '<?xml version="1.0" encoding="UTF-8"?>',
      '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
      ...urls.map((url) => `  <url><loc>${url.replace(/&/g, "&amp;")}</loc></url>`),
      "</urlset>",
      "",
    ].join("\n");
    fs.writeFileSync(sitemapPath, xml, "utf8");
  } else if (fs.existsSync(sitemapPath)) {
    fs.unlinkSync(sitemapPath);
  }

  fs.writeFileSync(path.join(ROOT, "robots.txt"), `${robots.join("\n")}\n`, "utf8");
}

function main() {
  let built = 0;
  PAGES_ORDER.forEach((page) => {
    const file = path.join(PAGES, `${page}.html`);
    if (!fs.existsSync(file)) {
      console.warn(`! skipped ${page}.html (no src/pages/${page}.html)`);
      return;
    }
    const { meta, body } = parseFrontMatter(fs.readFileSync(file, "utf8"));
    const out = render(page, meta, body);
    fs.writeFileSync(path.join(ROOT, `${page}.html`), out, "utf8");
    built++;
    console.log(`✓ built ${page}.html  (${(out.length / 1024).toFixed(1)} kB)`);
  });
  writeSeoFiles();
  console.log(`✓ wrote robots.txt${SITE_ORIGIN ? " and sitemap.xml" : " (set SITE_ORIGIN to generate a sitemap)"}`);
  console.log(`\n${built} page(s) written.`);
}

main();
