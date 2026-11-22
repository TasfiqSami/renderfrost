# ❄️ RenderFrost SMP

Official website and rulebook for **RenderFrost SMP**, a whitelisted Minecraft Java survival world built on trust, fairness, creativity and respect.

**Server address:** `play.renderfrost.com`

## What's in this repo

| Path | Description |
|---|---|
| `SmpRules.md` | The official rulebook: 20 rules plus the Discord Community Conduct & Etiquette announcement |
| `src/pages`, `src/partials` | Editable page sources |
| `src/pages/gallery.html`, `src/pages/media.html` | Gallery page and Media & News page |
| `*.html` (root) | Generated, deployable pages (do not edit by hand) |
| `assets/` | CSS, JavaScript, fonts, images and audio |
| `tools/` | Build, verify and browser test scripts |
| `Deployment guide.md`, `OPERATIONS.md` | Hosting and maintenance notes |

## Rules at a glance

1. **Community Conduct & Safety** (01–04): be respectful, protect personal info, no spam or advertising, respect staff decisions
2. **Property, Trading & Combat** (05–10): no griefing, stealing or scamming; PvP only by consent; limits on explosives and Channeling tridents
3. **Fair Play, Accounts & Item Limits** (11–14): no hacks, X-Ray or dupes (Litematica and Tweakeroo allowed); no alt abuse; 3 Elytra limit
4. **World Preservation & Performance** (15–18): protect Spawn Village, keep farms and redstone lag-free, no mining straight down, finish chopping trees
5. **Whitelist & Rollback Policy** (19–20): 15-day recommendation rule, rollbacks only for verified server-side issues

Read the full text in [`SmpRules.md`](SmpRules.md).

## Build

This is a static site. The only server-side piece is the status function in `api/status.js`; the panel API key lives only in the Vercel project environment, never in the site.

```bash
node tools/build.js     # render src/pages into root HTML files
node tools/verify.js    # check links, anchors and rule content
```

Set `SITE_ORIGIN` to the real HTTPS website origin before building if you want absolute SEO URLs and a sitemap. See [`OPERATIONS.md`](OPERATIONS.md) and [`Deployment guide.md`](Deployment%20guide.md) for deployment details.

## License

Copyright © 2026 Tasfiq Ahmed (RenderFrost SMP). **All Rights Reserved.**

This project is proprietary. You may not copy, reuse, modify, redistribute, host or sell any part of it, under your own name or anyone else's, without written permission. See [`LICENSE`](LICENSE).

## Adding gallery screenshots

1. Put the originals in `assets/img/gallery/_raw/<Photographer name>/` (this folder is git-ignored, so the big files never get deployed).
2. Run `python3 tools/gallery-import.py` (needs Pillow). It writes a 1600px and a 640px WebP for each picture, plus `assets/img/gallery/gallery.json`.
3. Optional: in `gallery.json` give a picture a `"caption"`, or give up to five pictures a `"featured"` rank (1 to 5) to choose the highlight tiles.
4. Run `node tools/build.js`, then commit the new WebP files and `gallery.json`.

## News & media

On the **Media** page, edit `src/media.json` (title, description, link, platform) and run `node tools/build.js`. Items render as link cards that open in a new tab; nothing is embedded, so the site keeps loading no third-party scripts.
