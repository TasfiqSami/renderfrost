# RenderFrost SMP — deployment guide

## What is in this package

This is a ready-to-upload static website. It contains the eleven HTML pages, the
complete `assets` folder, `robots.txt`, and `_headers`. No build step, database,
backend, environment variables, or secrets are required to host this package.
The footer credits SYXLOR Studios at `studios.syxlor.xyz` and the developer at
`syxlor.xyz`. “Download CV” is intentionally not clickable because no CV file URL
was provided; add its real URL to the footer before expecting a working download.

## Upload it

1. Extract the ZIP file.
2. Upload the **contents** of the extracted folder to the root of your static
   website, preserving the `assets` folder and all file names and paths.
3. Configure your hosting provider to use `404.html` as the custom not-found page.
4. Enable HTTPS for the website domain.
5. Open the site and check the home page, navigation, music control, and a missing
   URL on desktop and mobile.

Do not upload the ZIP itself as the website; extract it first. Do not rename or
move the pages or `assets` folder, since page links refer to those paths.

## Hosting provider notes

- **Netlify:** `_headers` is read automatically. Set the site's custom 404 page to
  `404.html` if your deploy settings do not detect it automatically.
- **Other static hosts:** `_headers` is not a universal standard and may be ignored.
  Configure the response security and cache headers in your provider's dashboard
  or configuration file. Set the custom error page to `404.html`.

The configured HSTS header includes subdomains. Only enable that header on a
production domain after confirming every subdomain supports HTTPS. Do not enable
HSTS on a temporary preview domain.

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

CSS and JavaScript are configured to revalidate so visitors do not keep stale
responsive styles or navigation code. Fonts, images, and audio are cached for one
week. Keep this policy unless asset filenames become content-hashed.

## If something looks broken

- Confirm all eleven HTML files are at the site root.
- Confirm the entire `assets` directory uploaded with its subfolders.
- Check that file and folder name casing was preserved.
- Clear the browser cache or test in a private window.
- Check the browser console and network panel for missing files.
- Confirm the host serves `404.html` for a nonexistent path.
- Confirm security headers in the deployed response; an uploaded `_headers` file
  alone does not configure every provider.

## Project limits and future changes

The site is static: it has no live server status/player count, applications,
accounts, database, or admin interface. Add these only after selecting a trusted
status source or a real service/backend and documenting its privacy, validation,
access-control, retention, and abuse-protection behavior. Update the privacy and
cookie policies if the site later adds analytics, cookies, forms, or third-party
scripts.

## Clean URLs (no `.html`)

Internal links and canonical URLs are written without the `.html` extension
(`/rules`, `/gallery`, `/media`). The host must serve `/rules` from `rules.html`:

- **Netlify, Cloudflare Pages, GitHub Pages:** works automatically.
- **Vercel:** works through the included `vercel.json` (`cleanUrls`).
- **Apache/Nginx or other hosts:** add a rewrite from `/name` to `/name.html`.
  Without it, links will 404.

Old `.html` addresses keep working in the site's own navigation.

## Live status (`/api/status`)

`api/status.js` is a Vercel serverless function used by the Members page. It reads
these environment variables (Vercel project settings): `PTERO_API_KEY` (sensitive),
`PTERO_URL`, `PTERO_SERVER_ID`, `MC_HOST`, `SHOW_WHITELIST`.
Set `SHOW_WHITELIST` to `true` to publish whitelisted names on the Members page.
If the function or panel is unreachable, the page falls back to its static text.
