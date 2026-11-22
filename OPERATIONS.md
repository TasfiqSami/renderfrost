# RenderFrost SMP site operations

## What this project is

A static website with a few serverless functions. `src/pages` and `src/partials`
are the editable page sources; `node tools/build.js` renders the deployable HTML
files into the project root. Data lives in `src/members.json`, `src/media.json` and
`assets/img/gallery/gallery.json`. CSS, JavaScript, fonts, images and audio are
static assets.

Three Vercel functions live in `api/`: `status.js` (server state, uptime, players),
`head.js` (player skins) and `_avatar.js` (generated fallback skins). The only secret
is `PTERO_API_KEY`, set as a sensitive variable in the Vercel project. There is no
database, authentication, admin panel or contact form. The optional `SITE_ORIGIN`
build variable is only used to produce absolute SEO URLs; it is not a secret.

## Build and test

From the project root:

```powershell
node tools/build.js
```

For production SEO output, use the actual HTTPS website origin (not the Minecraft
server address):

```powershell
$env:SITE_ORIGIN = "https://your-confirmed-website-domain.example"
node tools/build.js
Remove-Item Env:SITE_ORIGIN
```

With `SITE_ORIGIN` set, the build writes absolute canonical and Open Graph URLs,
`robots.txt`, and a `sitemap.xml` for the public pages. The 404 page is intentionally
excluded from the sitemap. Without a confirmed site domain, the build emits a
crawlable `robots.txt` but no sitemap and keeps page metadata relative. Do not
publish the example domain.

The browser regression suite expects Chrome at
`C:\Program Files\Google\Chrome\Application\chrome.exe`, the existing
`puppeteer-core` dependency under `.bt`, and a local HTTP server on port 8137. In
one PowerShell window, serve the project root:

```powershell
python -m http.server 8137
```

Then, in a second window:

```powershell
node tools/test.js
```

The suite checks navigation, music continuity, notifications, particles, page
metadata, the Rules page controls and horizontal overflow across the tested page and
viewport combinations. It needs Windows Chrome and the local `.bt` dependency, and some
expectations (Members, Gallery) may lag behind the latest redesigns.
Stop the local server with Ctrl+C when finished.

## Content updates

| Change | Do this |
|---|---|
| Add or edit a member, role or old name | Edit `src/members.json`, build, commit, push |
| Add gallery screenshots | Put originals in `assets/img/gallery/_raw/<Name>/`, run `python3 tools/gallery-import.py`, build, commit |
| Add a video or news card | Edit `src/media.json`, build, commit, push |
| Change a page | Edit it in `src/pages`, build, commit the source and generated HTML |

## Deployment

1. Run `node tools/build.js` and `node tools/verify.js`.
2. Commit the sources and the generated root HTML, then push to `main`. Vercel
   deploys automatically.
3. `vercel.json` provides clean URLs, the security headers (CSP, HSTS, framing and
   referrer policies) and cache rules. `_headers` is only for Netlify/Cloudflare.
4. After publishing, open every page, test navigation and music on desktop and mobile,
   check `/api/status` shows players, and verify that a missing URL shows the 404 page.
5. If you use `SITE_ORIGIN`, confirm `robots.txt`, the sitemap and canonical URLs on
   the deployed domain.

The cache policy revalidates CSS and JavaScript on each visit. Images are cached for
30 days, audio for a week, fonts for a year. The HSTS header includes subdomains;
verify that every subdomain supports HTTPS before relying on it.

## Backups and rollback

Keep the editable `src`, `assets`, `tools`, `_headers`, and SEO/deployment
configuration under version control or in a dated backup before each release. For
a rollback, rebuild the last known-good source revision and redeploy its generated
root-level files and assets together. Do not roll back only CSS or JavaScript if the
matching HTML references have changed.

## Current owner checklist and future work

| Priority | Work | Notes |
|---|---|---|
| P0 | Rotate the Pterodactyl API key that was shared in chat; update `PTERO_API_KEY` in Vercel and redeploy. | The old key should be revoked. |
| P1 | Run the deployed browser/device check on a real phone, especially the compact navigation and mobile music controls. | Needs physical devices. |
| P1 | Review whether `lastBackup` and whitelist data should be published (`SHOW_WHITELIST`). | Currently off. |
| P2 | Update the legal pages' effective dates when their text changes (Terms still says 11 October 2026). | Owner decision. |
| P2 | Add real captions to the media card and any gallery pictures you want described. | Edit the JSON files. |
| P3 | Whitelist applications or contact submissions would need a maintained service or a real backend with validation, access controls and abuse protection. | Never put credentials in client-side JavaScript. |

This is an operational handoff, not a legal or penetration-test certification. The
privacy and cookie statements should be reviewed again if analytics, forms, cookies,
third-party scripts, or a new backend are introduced.
