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

/* ---- Minecraft server list ping (direct TCP, no third party) ---------- */
const net = require("net");
const dns = require("dns").promises;

function varint(n) {
  const out = [];
  do { let b = n & 0x7f; n >>>= 7; if (n) b |= 0x80; out.push(b); } while (n);
  return Buffer.from(out);
}

function ping(host, port, timeout) {
  return new Promise((resolve, reject) => {
    const sock = net.connect({ host, port });
    let buf = Buffer.alloc(0);
    const done = (err, val) => { sock.destroy(); err ? reject(err) : resolve(val); };
    sock.setTimeout(timeout, () => done(new Error("timeout")));
    sock.on("error", done);
    sock.on("connect", () => {
      const h = Buffer.from(host, "utf8");
      const port2 = Buffer.alloc(2); port2.writeUInt16BE(port);
      const body = Buffer.concat([varint(0), varint(767), varint(h.length), h, port2, varint(1)]);
      sock.write(Buffer.concat([varint(body.length), body, Buffer.from([1, 0])]));
    });
    sock.on("data", (chunk) => {
      buf = Buffer.concat([buf, chunk]);
      try {
        let i = 0;
        const readVar = () => { let r = 0, sh = 0, b; do { if (i >= buf.length) throw 0; b = buf[i++]; r |= (b & 0x7f) << sh; sh += 7; } while (b & 0x80); return r; };
        const len = readVar();
        if (buf.length - i < len) return;
        readVar(); // packet id
        const jl = readVar();
        if (buf.length - i < jl) return;
        done(null, JSON.parse(buf.slice(i, i + jl).toString("utf8")));
      } catch (e) {
        if (e !== 0) done(e instanceof Error ? e : new Error("bad response"));
      }
    });
  });
}

function plain(m) {
  if (!m) return "";
  if (typeof m === "string") return m;
  return String(m.text || "") + (Array.isArray(m.extra) ? m.extra.map(plain).join("") : "");
}

async function viaPing(host) {
  let target = host, port = 25565;
  try {
    const srv = await dns.resolveSrv("_minecraft._tcp." + host);
    if (srv && srv.length) { target = srv[0].name; port = srv[0].port; }
  } catch (e) { /* no SRV record: default port */ }
  const d = await ping(target, port, 5000);
  const p = d.players || {};
  return {
    online: p.online | 0,
    max: p.max | 0,
    list: Array.isArray(p.sample) ? p.sample.map((x) => String((x && x.name) || "")).filter((n) => /^[A-Za-z0-9_]{3,16}$/.test(n)) : [],
    version: d.version && d.version.name ? String(d.version.name).slice(0, 40) : null,
    motd: plain(d.description).replace(/\u00a7./g, "").replace(/\s+/g, " ").trim().slice(0, 120) || null,
  };
}

async function viaApi(host) {
  const res = await fetch(`https://api.mcstatus.io/v2/status/java/${encodeURIComponent(host)}`, {
    headers: { "User-Agent": "RenderFrostStatus/1.0" },
    signal: AbortSignal.timeout(6000),
  });
  const d = await res.json();
  if (!d.online || !d.players) throw new Error("offline");
  return {
    online: d.players.online | 0,
    max: d.players.max | 0,
    list: (d.players.list || []).map((p) => String((p && p.name_clean) || "")).filter(Boolean).slice(0, 100),
    version: d.version && d.version.name_clean ? String(d.version.name_clean).slice(0, 40) : null,
    motd: d.motd && d.motd.clean ? String(d.motd.clean).replace(/\s+/g, " ").trim().slice(0, 120) : null,
  };
}

async function getPlayers() {
  const host = process.env.MC_HOST;
  if (!host) return null;
  for (const fn of [viaPing, viaApi]) {
    try { return await fn(host); } catch (e) { console.error("players via " + fn.name + " failed:", e && e.message); }
  }
  return null;
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
