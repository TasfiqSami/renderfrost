/**
 * RenderFrost SMP: status endpoint (Vercel serverless function)
 *
 * GET /api/status  ->  { state, online, uptime, players, members, updated }
 *
 * The Pterodactyl API key is read from the PTERO_API_KEY environment variable
 * (set in the Vercel project, marked sensitive). It is never sent to the browser
 * and must never be written into any website file.
 *
 * Env vars: PTERO_API_KEY, PTERO_URL, PTERO_SERVER_ID,
 *           MC_HOST (optional: player count/list), SHOW_WHITELIST ("true" to list members)
 */

async function pteroGet(path) {
  const { PTERO_URL, PTERO_SERVER_ID, PTERO_API_KEY } = process.env;
  const res = await fetch(`${PTERO_URL}/api/client/servers/${PTERO_SERVER_ID}${path}`, {
    headers: { Authorization: `Bearer ${PTERO_API_KEY}`, Accept: "application/json" },
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) throw new Error(`panel ${res.status}`);
  return res;
}

async function getState() {
  const a = (await (await pteroGet("/resources")).json()).attributes || {};
  return {
    state: String(a.current_state || "unknown"),
    uptime: Math.max(0, Math.floor(((a.resources || {}).uptime || 0) / 1000)),
  };
}

async function getPlayers() {
  const host = process.env.MC_HOST;
  if (!host) return null;
  try {
    const res = await fetch(`https://api.mcsrvstat.us/3/${encodeURIComponent(host)}`, {
      headers: { "User-Agent": "RenderFrostStatus/1.0" },
      signal: AbortSignal.timeout(6000),
    });
    const d = await res.json();
    if (!d.online || !d.players) return null;
    const list = Array.isArray(d.players.list)
      ? d.players.list.map((p) => String((p && p.name) || "")).filter(Boolean).slice(0, 100)
      : [];
    return {
      online: d.players.online | 0,
      max: d.players.max | 0,
      list,
      version: d.version ? String(d.version).slice(0, 40) : null,
      motd: d.motd && Array.isArray(d.motd.clean) ? d.motd.clean.map(String).join(" ").replace(/\s+/g, " ").trim().slice(0, 120) : null,
    };
  } catch (e) {
    return null;
  }
}

async function getLastBackup() {
  try {
    const rows = (await (await pteroGet("/backups")).json()).data || [];
    const times = rows
      .map((r) => r.attributes || {})
      .filter((a) => a.is_successful && a.completed_at)
      .map((a) => Date.parse(a.completed_at))
      .filter((t) => !isNaN(t));
    return times.length ? new Date(Math.max.apply(null, times)).toISOString() : null;
  } catch (e) {
    return null;
  }
}

async function getMembers() {
  if (String(process.env.SHOW_WHITELIST).toLowerCase() !== "true") return null;
  try {
    const text = await (await pteroGet("/files/contents?file=%2Fwhitelist.json")).text();
    return JSON.parse(text)
      .map((e) => String((e && e.name) || ""))
      .filter((n) => /^[A-Za-z0-9_.]{1,32}$/.test(n))
      .sort((x, y) => x.localeCompare(y, "en", { sensitivity: "base" }));
  } catch (e) {
    return null;
  }
}

module.exports = async (req, res) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  if (req.method !== "GET") {
    res.status(405).json({ error: "method not allowed" });
    return;
  }
  const { PTERO_API_KEY, PTERO_URL, PTERO_SERVER_ID } = process.env;
  if (!PTERO_API_KEY || !PTERO_URL || !PTERO_SERVER_ID) {
    res.status(503).json({ error: "not configured" });
    return;
  }
  try {
    const [srv, players, members, lastBackup] = await Promise.all([getState(), getPlayers(), getMembers(), getLastBackup()]);
    res.setHeader("Cache-Control", "public, s-maxage=30, stale-while-revalidate=60");
    res.status(200).json({
      state: srv.state,
      online: srv.state === "running",
      uptime: srv.uptime,
      players,
      members,
      lastBackup,
      updated: new Date().toISOString(),
    });
  } catch (e) {
    console.error("status failed:", e && e.message);
    res.setHeader("Cache-Control", "no-store");
    res.status(503).json({ error: "unavailable" });
  }
};
