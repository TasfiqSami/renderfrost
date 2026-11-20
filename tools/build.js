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
  const value = process.env.SITE_ORIGIN;
  if (!value) return "";

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
function buildGallery() {
  const dir = path.join(ROOT, "assets", "img", "gallery");
  let entries = [];
  try {
    entries = JSON.parse(fs.readFileSync(path.join(dir, "gallery.json"), "utf8")).images || [];
  } catch (e) { entries = []; }
  entries = entries.filter((e) => e && (
    (/^[\w .-]+\.(jpe?g|png|webp|avif)$/i.test(e.file || "") && fs.existsSync(path.join(dir, e.file))) ||
    /^https:\/\/(cdn|media)\.discordapp\.(com|net)\//.test(e.url || "")
  ));

  if (!entries.length) {
    return `<div class="gallery__empty" data-reveal>
      <p><strong>Screenshots are on the way.</strong> Staff will add real in-game
      shots of the world and builds here. Until then, nothing is shown rather than
      placeholder images.</p>
    </div>`;
  }
  const credits = [];
  entries.forEach((e) => { if (e.credit && credits.indexOf(e.credit) < 0) credits.push(e.credit); });
  const items = entries.map((e, idx) => {
    const src = e.url ? esc(e.url) : `assets/img/gallery/${encodeURI(e.file)}`;
    const credit = e.credit ? esc(e.credit) : "";
    const cap = e.caption ? esc(e.caption) : "";
    const alt = esc(e.alt || e.caption || "RenderFrost SMP screenshot");
    return `      <figure class="gallery__item is-loading${idx === 0 ? " gallery__item--feature" : (idx % 6 === 5 ? " gallery__item--wide" : "")}" data-credit="${credit}" data-reveal>
        <button type="button" class="gallery__btn" data-gallery-src="${src}" data-gallery-caption="${cap}" data-gallery-credit="${credit}" aria-label="View larger: ${alt}">
          <img src="${src}" alt="${alt}" loading="${idx < 3 ? "eager" : "lazy"}" decoding="async" referrerpolicy="no-referrer">
          <span class="gallery__over">${cap ? `<span class="gallery__cap">${cap}</span>` : ""}${credit ? `<span class="gallery__by">Posted by <strong>${credit}</strong></span>` : ""}</span>
        </button>
        <span class="gallery__missing" aria-hidden="true">Image unavailable</span>
      </figure>`;
  }).join("\n");
  const filters = credits.length > 1
    ? `<div class="gallery__filters" role="group" aria-label="Filter by contributor">
      <button type="button" class="chip is-active" data-gallery-filter="" aria-pressed="true">All</button>
${credits.map((c) => `      <button type="button" class="chip" data-gallery-filter="${esc(c)}" aria-pressed="false">${esc(c)} <span class="chip__n">${entries.filter((e) => e.credit === c).length}</span></button>`).join("\n")}
    </div>` : "";
  return `<div class="gallery__bar">
      <p class="gallery__count"><strong data-gallery-count>${entries.length}</strong> screenshots <span aria-hidden="true">·</span> ${credits.length} contributor${credits.length === 1 ? "" : "s"}</p>
      ${filters}
    </div>
    <div class="gallery__grid">\n${items}\n    </div>
    <dialog class="lightbox" aria-label="Image viewer">
      <button type="button" class="lightbox__close" aria-label="Close image viewer">&times;</button>
      <button type="button" class="lightbox__nav lightbox__nav--prev" aria-label="Previous image">&#8249;</button>
      <button type="button" class="lightbox__nav lightbox__nav--next" aria-label="Next image">&#8250;</button>
      <img class="lightbox__img" alt="">
      <p class="lightbox__cap"><span class="lightbox__text"></span><span class="lightbox__count"></span></p>
      <div class="lightbox__strip" aria-label="Thumbnails"></div>
    </dialog>`;
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
    .replace(/\{\{OG_IMAGE\}\}/g, esc(SITE_ORIGIN ? siteUrl("assets/img/background.jpg") : "assets/img/background.jpg"))
    .replace(/\{\{OG_TITLE\}\}/g, esc(meta.ogTitle || meta.title || "RenderFrost SMP"))
    .replace(/\{\{OG_DESCRIPTION\}\}/g, esc(meta.ogDescription || meta.description || ""));

  html += "\n\n" + SHELL_CACHE["nav.html"].replace(/\{\{NAV_LINKS\}\}/g, nav.links);
  html += "\n\n" + SHELL_CACHE["drawer.html"].replace(/\{\{DRAWER_LINKS\}\}/g, nav.drawer);
  html += "\n\n<main id=\"main\">\n" + body.trim().replace("<!--GALLERY-->", () => buildGallery()).replace("<!--MEDIA-->", () => buildMedia()) + "\n</main>\n";
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
