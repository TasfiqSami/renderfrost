/* ==========================================================================
   RenderFrost SMP — verification checks

   Static-site QA that runs without a browser:
     1. every internal href/src resolves to a real file
     2. every in-page anchor has a matching id
     3. no inline style attributes remain (keeps a strict CSP possible)
     4. no leftover template placeholders
     5. tag balance for structural elements
     6. accessibility scaffolding on every page
     7. required rule content is actually present

   Usage:  node tools/verify.js
   ========================================================================== */

"use strict";

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const PAGES = ["index", "members", "rules", "discord", "join", "privacy", "terms", "cookies", "404"];

let errors = 0;
let warnings = 0;
let checks = 0;

function fail(page, msg) {
  errors++;
  console.log(`  x ${page}: ${msg}`);
}

function warn(page, msg) {
  warnings++;
  console.log(`  ! ${page}: ${msg}`);
}

function ok(msg) {
  console.log(`  + ${msg}`);
}

function readPage(page) {
  // Accepts either a bare page name ("rules") or a full path.
  const file = page.endsWith(".html") ? page : path.join(ROOT, `${page}.html`);
  return fs.readFileSync(file, "utf8");
}

function fileExists(rel) {
  let local = rel.split(/[?#]/)[0];
  if (!local || local === "." || local.endsWith("/")) local += "index.html";
  const file = path.resolve(ROOT, local);
  const relative = path.relative(ROOT, file);
  if (relative === ".." || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) {
    return false;
  }

  try {
    const stat = fs.statSync(file);
    return stat.isFile() || (stat.isDirectory() && fs.statSync(path.join(file, "index.html")).isFile());
  } catch {
    return false;
  }
}

/* ---------------------------------------------------- 1. Link resolution */

function checkLinks(page, html) {
  const refs = new Set();
  const attr = /(?:href|src)\s*=\s*"([^"]+)"/g;
  let m;
  while ((m = attr.exec(html)) !== null) refs.add(m[1]);

  let checked = 0;
  refs.forEach((ref) => {
    if (/^(https?:|mailto:|tel:|data:|#)/.test(ref)) return;
    checked++;
    if (!fileExists(ref)) fail(page, `broken reference -> ${ref}`);
  });
  return checked;
}

/* ------------------------------------------------- 2. Anchor integrity */

function checkAnchors(page, html) {
  const ids = new Set();
  const idRe = /\sid\s*=\s*"([^"]+)"/g;
  let m;
  while ((m = idRe.exec(html)) !== null) ids.add(m[1]);

  let local = 0;
  const hrefRe = /href\s*=\s*"#([^"]+)"/g;
  while ((m = hrefRe.exec(html)) !== null) {
    local++;
    if (!ids.has(m[1])) fail(page, `anchor "#${m[1]}" has no matching id`);
  }
  return local;
}

/* --------------------------------------- 3. Hygiene: styles, placeholders */

function checkHygiene(page, html) {
  const inline = html.match(/\sstyle\s*=\s*"[^"]*"/g);
  if (inline) fail(page, `${inline.length} inline style attribute(s) — breaks a strict CSP`);

  const placeholders = html.match(/\{\{[A-Z_]+\}\}/g);
  if (placeholders) fail(page, `unreplaced placeholder(s): ${placeholders.join(", ")}`);

  const junk = html.match(/\b(TODO|FIXME|XXX|lorem ipsum)\b/gi);
  if (junk) fail(page, `placeholder text found: ${junk.join(", ")}`);
}

/* ---------------------------------------------------- 4. Accessibility */

function checkA11y(page, html) {
  const required = [
    [/<a class="skip-link" href="#main">/, "skip link"],
    [/<main id="main">/, "main landmark"],
    [/<html lang="en">/, "lang attribute"],
    [/<title>[^<]+<\/title>/, "page title"],
    [/name="description"/, "meta description"],
    [/aria-label="Play soundtrack"/, "music control label"],
    [/data-copy-ip/, "copy IP action"],
    [/aria-label="Primary"/, "primary nav label"],
  ];
  required.forEach(([re, label]) => {
    checks++;
    if (!re.test(html)) fail(page, `missing ${label}`);
  });

  const h1s = html.match(/<h1[\s>]/g) || [];
  if (h1s.length !== 1) fail(page, `expected exactly 1 <h1>, found ${h1s.length}`);

  (html.match(/<img\b[^>]*>/g) || []).forEach((img) => {
    if (!/\salt\s*=/.test(img)) fail(page, `<img> without alt text`);
  });

  (html.match(/<button\b[^>]*>/g) || []).forEach((btn) => {
    if (!/aria-label\s*=/.test(btn) && !/aria-labelledby\s*=/.test(btn)) {
      warn(page, `<button> without accessible name: ${btn.slice(0, 60)}`);
    }
  });

  (html.match(/<a\b[^>]*target="_blank"[^>]*>/g) || []).forEach((a) => {
    if (!/rel\s*=\s*"[^"]*noopener[^"]*"/.test(a)) {
      fail(page, `target="_blank" without rel="noopener"`);
    }
  });
}

/* --------------------------------------------------------- 5. Tag balance */

function checkBalance(page, html) {
  const strict = ["div", "section", "article", "header", "footer", "main", "aside", "nav", "ul", "ol", "details", "figure", "button"];
  const loose = ["p", "li", "span", "a", "h2", "h3"];

  strict.forEach((tag) => {
    const open = (html.match(new RegExp(`<${tag}\\b`, "g")) || []).length;
    const close = (html.match(new RegExp(`</${tag}>`, "g")) || []).length;
    if (open !== close) fail(page, `<${tag}> imbalance: ${open} open / ${close} close`);
  });

  loose.forEach((tag) => {
    const open = (html.match(new RegExp(`<${tag}\\b`, "g")) || []).length;
    const close = (html.match(new RegExp(`</${tag}>`, "g")) || []).length;
    if (Math.abs(open - close) > 3) {
      fail(page, `<${tag}> imbalance: ${open} open / ${close} close`);
    }
  });
}
/* ------------------------------------------------------- 6. Rules content */

function checkRules() {
  const html = readPage("rules");
  let anchors = 0;
  for (let i = 1; i <= 16; i++) {
    checks++;
    if (!html.includes(`id="rule-${i}"`)) fail("rules", `missing rule anchor #rule-${i}`);
    else anchors++;
  }
  ok(`rules: ${anchors}/16 rule anchors present`);

  const spot = [
    ["15 days", "15-day recommendation waiting period"],
    ["30 days", "30-day Elytra gift period"],
    ["3 Elytras", "three-Elytra ownership limit"],
    ["Litematica", "permitted modification"],
    ["Tweakaroo", "permitted modification"],
    ["Spawn Village", "protected spawn rule"],
    ["Channeling", "trident restriction"],
    ["jail time", "stated consequence for rule 15"],
    ["Build the RenderFrost community together", "community statement"],
    ["Ignorance of the rules", "ignorance notice"],
  ];
  spot.forEach(([needle, label]) => {
    checks++;
    if (!html.includes(needle)) fail("rules", `missing required content: ${label}`);
  });
  ok(`rules: ${spot.length} policy specifics verified`);
}

/* ------------------------------------------------------------- Run checks */

console.log("\nRenderFrost SMP — verification\n");

let totalRefs = 0;
let totalAnchors = 0;

PAGES.forEach((page) => {
  const file = path.join(ROOT, `${page}.html`);
  if (!fs.existsSync(file)) {
    fail(page, "page file does not exist");
    return;
  }
  const html = readPage(file);
  console.log(`\n${page}.html  (${(html.length / 1024).toFixed(1)} kB)`);

  totalRefs += checkLinks(page, html);
  totalAnchors += checkAnchors(page, html);
  checkHygiene(page, html);
  checkA11y(page, html);
  checkBalance(page, html);
});

console.log("\n--- content ---");
checkRules();

/* ------------------------------------------------------- Asset inventory */

console.log("\n--- assets ---");
const assets = [];
(function walk(dir) {
  fs.readdirSync(dir).forEach((name) => {
    const full = path.join(dir, name);
    if (fs.statSync(full).isDirectory()) walk(full);
    else {
      assets.push({
        rel: path.relative(ROOT, full).replace(/\\/g, "/"),
        kb: fs.statSync(full).size / 1024,
      });
    }
  });
})(path.join(ROOT, "assets"));

const sum = (ext) => assets.filter((a) => a.rel.endsWith(ext)).reduce((s, a) => s + a.kb, 0);
const imgKb = assets.filter((a) => /\.(jpg|png|svg)$/.test(a.rel)).reduce((s, a) => s + a.kb, 0);

ok(`css ${sum(".css").toFixed(1)} kB / js ${sum(".js").toFixed(1)} kB / images ${imgKb.toFixed(1)} kB / fonts ${sum(".woff2").toFixed(1)} kB / audio ${sum(".mp3").toFixed(0)} kB`);
ok(`${totalRefs} local references resolved`);
ok(`${totalAnchors} in-page anchors checked`);
ok(`${checks} content assertions run`);

console.log(`\n${errors === 0 ? "PASS" : "FAIL"} — ${errors} error(s), ${warnings} warning(s)\n`);
process.exit(errors === 0 ? 0 : 1);
