/**
 * GET /api/head?name=<username>[&alt=<other username>][&type=head|body]
 *
 * The player's real skin (head or full body), fetched server-side so visitors
 * never contact a skin service. A player who has renamed passes the other name
 * as `alt`. Anyone with no Mojang account, or an account that never set a
 * custom skin, gets a random but stable pixel-art skin generated from their name.
 */
const { avatar } = require("./_avatar");
const NAME = /^[A-Za-z0-9_]{3,16}$/;

const SOURCES = {
  head: [(n) => `https://mc-heads.net/avatar/${n}/128`, (n) => `https://minotar.net/helm/${n}/128.png`],
  body: [(n) => `https://mc-heads.net/body/${n}/200`, (n) => `https://minotar.net/armor/body/${n}/200.png`],
};

async function getJson(url) {
  const r = await fetch(url, { headers: { "User-Agent": "RenderFrostSite/1.0" }, signal: AbortSignal.timeout(4000) });
  if (r.status === 204 || r.status === 404) return { missing: true };
  if (!r.ok) throw new Error("status " + r.status);
  return { data: await r.json() };
}

/* "skin" = has a custom skin, "none" = no account / default skin, "unknown" = could not tell */
async function skinState(name) {
  try {
    const p = await getJson(`https://api.mojang.com/users/profiles/minecraft/${name}`);
    if (p.missing) return "none";
    const prof = await getJson(`https://sessionserver.mojang.com/session/minecraft/profile/${p.data.id}`);
    if (prof.missing) return "none";
    const tex = (prof.data.properties || []).find((x) => x.name === "textures");
    if (!tex) return "none";
    const t = JSON.parse(Buffer.from(tex.value, "base64").toString("utf8"));
    return t.textures && t.textures.SKIN && t.textures.SKIN.url ? "skin" : "none";
  } catch (e) {
    return "unknown";
  }
}

async function image(name, type) {
  for (const make of SOURCES[type]) {
    try {
      const r = await fetch(make(name), { headers: { "User-Agent": "RenderFrostSite/1.0" }, signal: AbortSignal.timeout(6000) });
      if (!r.ok || !String(r.headers.get("content-type") || "").startsWith("image/")) continue;
      const buf = Buffer.from(await r.arrayBuffer());
      if (buf.length <= 300000) return buf;
    } catch (e) { /* next source */ }
  }
  return null;
}

function send(res, buf, cache) {
  res.setHeader("Content-Type", "image/png");
  res.setHeader("Cache-Control", cache);
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.status(200).send(buf);
}

module.exports = async (req, res) => {
  const q = req.query || {};
  const names = [q.name, q.alt].map((v) => String(v || "")).filter(Boolean);
  const type = q.type === "body" ? "body" : "head";
  if (req.method !== "GET" || !names.length || !names.every((n) => NAME.test(n))) {
    res.status(400).json({ error: "bad request" });
    return;
  }

  const states = await Promise.all(names.map(skinState));
  const order = names.filter((n, i) => states[i] === "skin").concat(names.filter((n, i) => states[i] === "unknown"));
  let unsure = states.includes("unknown");

  for (const n of order) {
    const buf = await image(n, type);
    if (buf) return send(res, buf, "public, s-maxage=86400, stale-while-revalidate=604800");
    unsure = true;
  }
  // No real skin: a random but stable one, seeded by the main name.
  send(res, avatar(names[0], type), unsure ? "public, s-maxage=300" : "public, s-maxage=86400, stale-while-revalidate=604800");
};
