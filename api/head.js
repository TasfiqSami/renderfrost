/**
 * GET /api/head?name=<minecraft username>
 *
 * Returns the player's head as a PNG, fetched server-side so visitors' browsers
 * never contact a skin service. Cached at the edge for a day.
 */
const SOURCES = [
  (n) => `https://mc-heads.net/avatar/${n}/128`,
  (n) => `https://minotar.net/helm/${n}/128.png`,
];

module.exports = async (req, res) => {
  const name = String((req.query && req.query.name) || "");
  if (req.method !== "GET" || !/^[A-Za-z0-9_]{3,16}$/.test(name)) {
    res.status(400).json({ error: "bad request" });
    return;
  }
  for (const make of SOURCES) {
    try {
      const r = await fetch(make(name), {
        headers: { "User-Agent": "RenderFrostSite/1.0" },
        signal: AbortSignal.timeout(6000),
      });
      if (!r.ok || !String(r.headers.get("content-type") || "").startsWith("image/")) continue;
      const buf = Buffer.from(await r.arrayBuffer());
      if (buf.length > 200000) continue;
      res.setHeader("Content-Type", "image/png");
      res.setHeader("Cache-Control", "public, s-maxage=86400, stale-while-revalidate=604800");
      res.setHeader("X-Content-Type-Options", "nosniff");
      res.status(200).send(buf);
      return;
    } catch (e) {
      /* try the next source */
    }
  }
  res.setHeader("Cache-Control", "no-store");
  res.status(404).json({ error: "not found" });
};
