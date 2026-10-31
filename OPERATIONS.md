# RenderFrost SMP site operations

## What this project is

This is a static website. `src/pages` and `src/partials` are the editable page
sources; `node tools/build.js` renders the deployable HTML files into the project
root. CSS, JavaScript, fonts, images, and audio are served as static assets.

There is no application server, database, authentication, admin panel, contact
form, or server-status API. There are no production secrets or required runtime
environment variables. The optional `SITE_ORIGIN` build variable is only used to
produce absolute SEO URLs; it is not a secret.

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
metadata, and horizontal overflow across the tested page and viewport combinations.
Stop the local server with Ctrl+C when finished.

## Deployment

1. Confirm the production website domain and HTTPS setup with the site owner.
2. Build from the project root, setting `SITE_ORIGIN` to that exact HTTPS origin if
   sitemap and absolute metadata are wanted.
3. Upload the generated root-level HTML files, `robots.txt`, optional
   `sitemap.xml`, and the complete `assets` directory to the static host. Preserve
   the paths and letter casing.
4. Configure the host to serve `404.html` as its not-found page.
5. On Netlify, `_headers` is read automatically. On any other host, configure the
   response headers in that provider's settings; merely uploading `_headers` does
   not activate them.
6. After publishing, open every page, test navigation/music on desktop and mobile,
   verify that a missing URL displays the 404 page, and inspect browser-console and
   network errors. Confirm `robots.txt`, sitemap, canonical URLs, and headers from
   the deployed domain.

The current cache policy revalidates CSS and JavaScript on each visit to avoid
stale responsive fixes. Fonts, images, and audio have a one-week cache lifetime;
move to immutable long-lived caching only after asset filenames are content-hashed.
The configured HSTS header includes subdomains. Before deploying it, verify that
every subdomain under the production domain supports HTTPS.

## Backups and rollback

Keep the editable `src`, `assets`, `tools`, `_headers`, and SEO/deployment
configuration under version control or in a dated backup before each release. For
a rollback, rebuild the last known-good source revision and redeploy its generated
root-level files and assets together. Do not roll back only CSS or JavaScript if the
matching HTML references have changed.

## Current owner checklist and future work

| Priority | Work | Owner decision or dependency |
|---|---|---|
| P0 | Confirm the public website domain, host, and HTTPS coverage before production deployment. | Required; none of these are established by this source tree. |
| P1 | Run the deployed browser/device check, especially the 677px compact-navigation layout and mobile music controls. | Requires access to the actual host and physical target devices. |
| P1 | Revisit SEO metadata and publish the generated sitemap using the confirmed domain. | Set `SITE_ORIGIN` at release time. |
| P2 | Add live server status or player counts only from a trusted, documented source with a clear refresh/cache policy. | No status endpoint is currently configured. |
| P2 | If whitelist applications or contact submissions are wanted, select a maintained service or design a real backend with validation, access controls, retention, and abuse protection. | Do not put credentials or privileged actions in client-side JavaScript. |
| P3 | Consider localization, richer motion/audio controls, or additional community pages based on player feedback. | Keep reduced-motion support and keyboard access. |

This is an operational handoff, not a legal or penetration-test certification. The
privacy and cookie statements should be reviewed again if analytics, forms, cookies,
third-party scripts, or a backend are introduced.
