# ❄️ RenderFrost SMP

Official website and rulebook for **RenderFrost SMP**, a whitelisted Minecraft Java survival world built on trust, fairness, creativity and respect.

**Server address:** `play.renderfrost.com`

## What's in this repo

| Path | Description |
|---|---|
| `SmpRules.md` | The official rulebook: 20 rules plus the Discord Community Conduct & Etiquette announcement |
| `src/pages`, `src/partials` | Editable page sources |
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

This is a static site with no backend, database or secrets.

```bash
node tools/build.js     # render src/pages into root HTML files
node tools/verify.js    # check links, anchors and rule content
```

Set `SITE_ORIGIN` to the real HTTPS website origin before building if you want absolute SEO URLs and a sitemap. See [`OPERATIONS.md`](OPERATIONS.md) and [`Deployment guide.md`](Deployment%20guide.md) for deployment details.

## License

Copyright © 2026 Tasfiq Ahmed (RenderFrost SMP). **All Rights Reserved.**

This project is proprietary. You may not copy, reuse, modify, redistribute, host or sell any part of it, under your own name or anyone else's, without written permission. See [`LICENSE`](LICENSE).

## Adding gallery screenshots

Put real screenshots in `assets/img/gallery/`, add an entry for each in `assets/img/gallery/gallery.json`, then run `node tools/build.js`:

```json
{ "images": [ { "file": "spawn.jpg", "caption": "Spawn Village at dusk", "alt": "Spawn Village at dusk" } ] }
```

## News & media

Edit `src/media.json` (title, description, link, platform) and run `node tools/build.js`. Items render as link cards that open in a new tab; nothing is embedded, so the site keeps loading no third-party scripts.
