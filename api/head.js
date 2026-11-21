/**
 * GET /api/head?name=<username>[&alt=<other username>]
 *
 * Returns the player's head as a PNG, fetched server-side so visitors' browsers
 * never contact a skin service. When a player has changed their name, pass the
 * other name as `alt`: the one that currently exists is used. Cached for a day.
 */
const NAME = /^[A-Za-z0-9_]{3,16}$/;

const SOURCES = [
  (n) => `https://mc-heads.net/avatar/${n}/128`,
  (n) => `https://minotar.net/helm/${n}/128.png`,
];

/* true = account exists, false = no such account, null = could not tell */
async function exists(name) {
  try {
    const r = await fetch(`https://api.mojang.com/users/profiles/minecraft/${name}`, {
      signal: AbortSignal.timeout(4000),
    });
    if (r.status === 200) return true;
    if (r.status === 404 || r.status === 204) return false;
    return null;
  } catch (e) {
    return null;
  }
}

async function image(name) {
  for (const make of SOURCES) {
    try {
      const r = await fetch(make(name), {
        headers: { "User-Agent": "RenderFrostSite/1.0" },
        signal: AbortSignal.timeout(6000),
      });
      if (!r.ok || !String(r.headers.get("content-type") || "").startsWith("image/")) continue;
      const buf = Buffer.from(await r.arrayBuffer());
      if (buf.length <= 200000) return buf;
    } catch (e) {
      /* try the next source */
    }
  }
  return null;
}

module.exports = async (req, res) => {
  const q = req.query || {};
  const names = [q.name, q.alt].map((v) => String(v || "")).filter(Boolean);
  if (req.method !== "GET" || !names.length || !names.every((n) => NAME.test(n))) {
    res.status(400).json({ error: "bad request" });
    return;
  }

  // Pick the name that currently exists; if Mojang can't tell us, try them in order.
  const checks = await Promise.all(names.map(exists));
  let candidates = names.filter((n, i) => checks[i] === true);
  if (!candidates.length) {
    if (checks.every((c) => c === false)) {
      res.setHeader("Cache-Control", "public, s-maxage=3600");
      res.status(404).json({ error: "no such account" });
      return;
    }
    candidates = names.filter((n, i) => checks[i] !== false);
  }

  for (const n of candidates) {
    const buf = await image(n);
    if (buf) {
      res.setHeader("Content-Type", "image/png");
      res.setHeader("Cache-Control", "public, s-maxage=86400, stale-while-revalidate=604800");
      res.setHeader("X-Content-Type-Options", "nosniff");
      res.status(200).send(buf);
      return;
    }
  }
  res.setHeader("Cache-Control", "no-store");
  res.status(404).json({ error: "not found" });
};
