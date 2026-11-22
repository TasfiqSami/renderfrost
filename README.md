# ❄️ RenderFrost SMP

Official website and rulebook for **RenderFrost SMP**, a whitelisted Minecraft Java survival world built on trust, fairness, creativity and respect.

**Server address:** `play.renderfrost.com`

## What's in this repo

| Path | Description |
|---|---|
| `SmpRules.md` | The official rulebook: 20 rules plus the Discord Community Conduct & Etiquette announcement |
| `src/pages`, `src/partials` | Editable page sources (Home, Members, Rules, Gallery, Media, Discord, Join, legal pages) |
| `src/members.json` | The member list shown on the Members page (names, old names, roles, join dates) |
| `src/media.json` | Cards shown on the Media & News page |
| `assets/img/gallery/` | Optimised gallery images and `gallery.json` |
| `api/status.js`, `api/head.js`, `api/_avatar.js` | Vercel serverless functions: live server status, player skins, generated fallback skins |
| `*.html` (root) | Generated, deployable pages (do not edit by hand) |
| `assets/` | CSS, JavaScript, fonts, images and audio |
| `tools/` | Build, verify, browser test and gallery import scripts |
| `vercel.json` | Clean URLs, security headers (CSP and others) and caching |
| `Deployment guide.md`, `OPERATIONS.md` | Hosting and maintenance notes |

## Rules at a glance

1. **Community Conduct & Safety** (01–04): be respectful, protect personal info, no spam or advertising, respect staff decisions
2. **Property, Trading & Combat** (05–10): no griefing, stealing or scamming; PvP only by consent; limits on explosives and Channeling tridents
3. **Fair Play, Accounts & Item Limits** (11–14): no hacks, X-Ray or dupes (Litematica and Tweakeroo allowed); no alt abuse; 3 Elytra limit
4. **World Preservation & Performance** (15–18): protect Spawn Village, keep farms and redstone lag-free, no mining straight down, finish chopping trees
5. **Whitelist & Rollback Policy** (19–20): 15-day recommendation rule, rollbacks only for verified server-side issues

Read the full text in [`SmpRules.md`](SmpRules.md).

## Build

```bash
node tools/build.js     # render src/pages into root HTML files
node tools/verify.js    # check links, anchors, accessibility basics and rule content
```

The build writes absolute canonical and Open Graph URLs and a sitemap for `https://www.renderfrost.com` by default; set `SITE_ORIGIN` to another HTTPS origin to override it. See [`OPERATIONS.md`](OPERATIONS.md) and [`Deployment guide.md`](Deployment%20guide.md) for deployment details.

The site deploys from `main` on Vercel. Commit the generated root HTML together with the sources.

## SEO and AI-search (GEO)

The build adds, for every page: a keyword-led title and description, canonical and Open Graph/Twitter tags, a 1200x630 social image, and JSON-LD structured data (Organization and WebSite everywhere, breadcrumbs, an ImageGallery on the Gallery page, a FAQPage on the home page matching its visible FAQ). It also writes `sitemap.xml` (with gallery images), `robots.txt`, `llms.txt` and `llms-full.txt` (a plain-text summary, FAQ and the full rulebook for AI assistants). The 404 page is `noindex`. Edit titles and descriptions in each page's front matter in `src/pages`.

## Live server data

Two Vercel functions power the Members page. Neither exposes a secret to the browser.

- **`/api/status`** returns whether the server is up, uptime, and players online (names, count, version, MOTD). Player data comes from pinging the Minecraft server directly. Server state and uptime come from the Pterodactyl panel.
- **`/api/head`** returns a player's skin (`?name=NAME&type=head|body`). Add `&alt=OLDNAME` for someone who changed their name. Players with no Mojang account, or no custom skin, get a stable random pixel-art skin generated from their name.

Environment variables (Vercel project settings): `PTERO_API_KEY` (sensitive), `PTERO_URL`, `PTERO_SERVER_ID`, `MC_HOST`, `SHOW_WHITELIST`.

## Editing the Members page

Edit `src/members.json`, then run `node tools/build.js`.

```json
{ "name": "SAGEKRAVE", "role": "Owner", "joined": "2025-04-16T03:34:45+06:00" }
{ "name": "Aayan_efx", "alias": "Kryptonite", "joined": "2025-04-16T14:03:46+06:00" }
```

- `name` is the main in-game name; `alias` is the same person's other name (searchable, and counted as online if either name is online).
- `role` (optional) puts the person in the Team lineup. Roles used: Owner, Chief Staff, Manager, Dev/Admin.
- `joined` is an ISO timestamp with the `+06:00` offset.

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


## Extra SEO files

`site.webmanifest`, PNG and Apple touch icons (`assets/img/`), and `.well-known/security.txt` (update the `Expires` date yearly).
