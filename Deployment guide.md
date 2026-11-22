# RenderFrost SMP — deployment guide

## What this is

A static website (eleven HTML pages built from `src/`) plus three small Vercel
serverless functions in `api/` (live status, player skins, fallback skins). The
production site deploys automatically from the `main` branch of the GitHub
repository to Vercel, and is served at `www.renderfrost.com`.

The only secret is the Pterodactyl API key, which lives in the Vercel project
environment (`PTERO_API_KEY`, marked sensitive) and never in any file in this
repository. The footer credits SYXLOR Studios at `studios.syxlor.xyz` and the
developer at `syxlor.xyz`.

## Deploy

1. Run `node tools/build.js` and `node tools/verify.js`.
2. Commit the sources and the generated root HTML together, then push to `main`.
3. Vercel builds and publishes within about a minute. Check the Deployments tab.
4. Open the site and check the home page, navigation, music control, Members page
   (online count and skins) and a missing URL on desktop and mobile.

## Hosting notes

- **Vercel (current host):** `vercel.json` turns on clean URLs and sends the security
  headers (including the Content-Security-Policy) and cache rules. `404.html` is used
  automatically for missing pages. The `_headers` file is only for Netlify/Cloudflare
  and is ignored by Vercel.
- **Other static hosts:** the `api/` functions will not run, so the Members page falls
  back to static text. Copy the headers from `vercel.json` into that host's settings.

The configured HSTS header includes subdomains. Only keep it if every subdomain
of the production domain supports HTTPS.

## Domain and search-engine metadata

The actual public website domain was not available when this package was prepared.
Therefore canonical and Open Graph URLs remain relative, and no sitemap is included.
The Minecraft server address is not the website domain.

For production SEO, use the editable project source and rebuild after confirming
the exact HTTPS website origin. In PowerShell, from the project root:

```powershell
$env:SITE_ORIGIN = "https://your-real-website-domain.example"
node tools/build.js
Remove-Item Env:SITE_ORIGIN
```

Replace the example with the real domain; never publish the example value. The
build generates absolute canonical/Open Graph URLs, a `sitemap.xml`, and a sitemap
entry in `robots.txt`. The sitemap intentionally excludes the 404 page. Repackage
and redeploy the newly generated files.

## Cache behavior

CSS and JavaScript revalidate on each visit so visitors never keep stale styles or
navigation code. Images are cached for 30 days, audio for a week and fonts for a
year. Player skin responses are cached at the edge for a day.

## If something looks broken

- Check the latest deployment on Vercel finished (state: Ready) and read its build log.
- Confirm the generated root HTML was committed alongside the sources.
- Clear the browser cache or test in a private window.
- Check the browser console and network panel for missing files.
- Members page shows no players: open `/api/status` directly. `players: null` means
  the Minecraft server could not be pinged from Vercel; check `MC_HOST`.
- Skins show a letter or random skin: open `/api/head?name=NAME&type=body`; a generated
  skin means that account has no custom skin (or the name is not a Java account).

## Project limits and future changes

There are no accounts, applications, database or admin interface. Add these only
after designing validation, access control, retention and abuse protection, and
update the privacy and cookie policies if the site later adds analytics, cookies,
forms or third-party scripts. Today the site loads no third-party scripts and
visitors' browsers contact no other origin: skins and status are fetched by the
server.

## Clean URLs (no `.html`)

Internal links and canonical URLs are written without the `.html` extension
(`/rules`, `/gallery`, `/media`). The host must serve `/rules` from `rules.html`:

- **Netlify, Cloudflare Pages, GitHub Pages:** works automatically.
- **Vercel:** works through the included `vercel.json` (`cleanUrls`).
- **Apache/Nginx or other hosts:** add a rewrite from `/name` to `/name.html`.
  Without it, links will 404.

Old `.html` addresses keep working in the site's own navigation.

## Live status (`/api/status`) and skins (`/api/head`)

`api/status.js` reads these environment variables (Vercel project settings):
`PTERO_API_KEY` (sensitive), `PTERO_URL`, `PTERO_SERVER_ID`, `MC_HOST`,
`SHOW_WHITELIST`. Players online come from a direct Minecraft server ping to
`MC_HOST` (SRV records respected). Set `SHOW_WHITELIST` to `true` only if you want
the panel's whitelist published. If the panel or server is unreachable, the page
falls back to its static text.

`api/head.js` proxies player skins so visitors never contact a skin service, and
generates a stable random skin (`api/_avatar.js`) for anyone without one.
