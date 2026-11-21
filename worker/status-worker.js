/**
 * RenderFrost SMP — status proxy (Cloudflare Worker)
 *
 * Serves GET /api/status to the Members page. The Pterodactyl API key lives
 * ONLY here, as a Worker secret. It is never sent to the browser and must never
 * be placed in any website file.
 *
 * Secrets / variables (see wrangler.toml and worker/README.md):
 *   PTERO_API_KEY      secret   Pterodactyl client API key
 *   PTERO_URL          var      e.g. https://portal.renderfrost.com
 *   PTERO_SERVER_ID    var      e.g. 0a560cd0
 *   MC_HOST            var      optional, e.g. play.renderfrost.com (player count/list)
 *   SHOW_WHITELIST     var      "true" to publish whitelisted names (off by default)
 */

const CACHE_SECONDS = 30;

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": `public, max-age=${CACHE_SECONDS}`,
      "X-Content-Type-Options": "nosniff",
    },
  });

async function pteroGet(env, path) {
  const res = await fetch(`${env.PTERO_URL}/api/client/servers/${env.PTERO_SERVER_ID}${path}`, {
    headers: { Authorization: `Bearer ${env.PTERO_API_KEY}`, Accept: "application/json" },
  });
  if (!res.ok) throw new Error(`panel ${res.status}`);
  return res;
}

async function getState(env) {
  const data = await (await pteroGet(env, "/resources")).json();
  const a = data.attributes || {};
  return {
    state: String(a.current_state || "unknown"),
    uptime: Math.max(0, Math.floor(((a.resources || {}).uptime || 0) / 1000)),
  };
}

async function getPlayers(env) {
  if (!env.MC_HOST) return null;
  try {
    const res = await fetch(`https://api.mcsrvstat.us/3/${encodeURIComponent(env.MC_HOST)}`, {
      headers: { "User-Agent": "RenderFrostStatus/1.0" },
    });
    const d = await res.json();
    if (!d.online || !d.players) return null;
    const list = Array.isArray(d.players.list)
      ? d.players.list.map((p) => String(p.name || "")).filter(Boolean).slice(0, 100)
      : [];
    return { online: d.players.online | 0, max: d.players.max | 0, list };
  } catch (e) {
    return null;
  }
}

async function getMembers(env) {
  if (String(env.SHOW_WHITELIST).toLowerCase() !== "true") return null;
  try {
    const text = await (await pteroGet(env, "/files/contents?file=%2Fwhitelist.json")).text();
    const names = JSON.parse(text)
      .map((e) => String((e && e.name) || ""))
      .filter((n) => /^[A-Za-z0-9_.]{1,32}$/.test(n)); // also drops Bedrock/odd entries
    return names.sort((x, y) => x.localeCompare(y, "en", { sensitivity: "base" }));
  } catch (e) {
    return null;
  }
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (url.pathname !== "/api/status" || request.method !== "GET") {
      return json({ error: "not found" }, 404);
    }
    if (!env.PTERO_API_KEY || !env.PTERO_URL || !env.PTERO_SERVER_ID) {
      return json({ error: "not configured" }, 503);
    }

    const cache = caches.default;
    const cacheKey = new Request(url.origin + "/api/status", { method: "GET" });
    const hit = await cache.match(cacheKey);
    if (hit) return hit;

    try {
      const [srv, players, members] = await Promise.all([
        getState(env),
        getPlayers(env),
        getMembers(env),
      ]);
      const res = json({
        state: srv.state,
        online: srv.state === "running",
        uptime: srv.uptime,
        players,
        members,
        updated: new Date().toISOString(),
      });
      ctx.waitUntil(cache.put(cacheKey, res.clone()));
      return res;
    } catch (e) {
      return json({ error: "unavailable" }, 503);
    }
  },
};
