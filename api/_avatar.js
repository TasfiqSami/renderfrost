/**
 * Deterministic pixel-art Minecraft-style avatars, for players who have no
 * Mojang account or no custom skin. The same name always gives the same look.
 * Pure Node (zlib only): no network, no dependencies.
 */
const zlib = require("zlib");

function hash(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
function rng(seed) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const pick = (r, a) => a[Math.floor(r() * a.length)];

const SKIN = [[255, 219, 190], [240, 194, 158], [224, 172, 126], [198, 134, 94], [160, 104, 72], [116, 74, 52]];
const HAIR = [[40, 28, 22], [86, 56, 32], [150, 100, 50], [220, 180, 90], [30, 30, 36], [180, 60, 40], [140, 140, 150], [110, 70, 180], [40, 120, 190]];
const EYES = [[60, 100, 190], [50, 140, 80], [100, 70, 40], [40, 40, 50], [120, 80, 170]];
const SHIRT = [[104, 66, 205], [55, 150, 210], [60, 170, 120], [210, 80, 80], [230, 160, 50], [90, 90, 105], [200, 90, 160], [40, 50, 90]];
const PANTS = [[45, 55, 110], [50, 50, 60], [80, 60, 45], [60, 90, 70], [90, 60, 120]];

function jitter(c, r, amt) { const d = Math.round((r() - 0.5) * amt); return [c[0] + d, c[1] + d, c[2] + d]; }
function shade(c, f) { return [c[0] * f, c[1] * f, c[2] * f]; }

/* Build a 16x32 RGBA figure. */
function figure(name) {
  const r = rng(hash(String(name).toLowerCase()));
  const skin = pick(r, SKIN), hair = pick(r, HAIR), eyes = pick(r, EYES);
  const shirt = pick(r, SHIRT), pants = pick(r, PANTS);
  const style = Math.floor(r() * 4); // 0 short, 1 long, 2 fringe, 3 buzz
  const stripe = r() < 0.4;
  const W = 16, H = 32, px = new Uint8ClampedArray(W * H * 4);
  const set = (x, y, c) => { const i = (y * W + x) * 4; px[i] = c[0]; px[i + 1] = c[1]; px[i + 2] = c[2]; px[i + 3] = 255; };
  const rect = (x0, y0, w, h, c, j) => { for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) set(x, y, jitter(c, r, j)); };

  rect(4, 8, 8, 12, shirt, 10);            // torso
  if (stripe) rect(4, 13, 8, 2, shade(shirt, 0.78), 6);
  rect(0, 8, 4, 12, shirt, 10); rect(12, 8, 4, 12, shirt, 10); // sleeves
  rect(0, 17, 4, 3, skin, 8); rect(12, 17, 4, 3, skin, 8);      // hands
  rect(4, 20, 4, 12, pants, 10); rect(8, 20, 4, 12, pants, 10); // legs
  rect(4, 29, 4, 3, shade(pants, 0.6), 6); rect(8, 29, 4, 3, shade(pants, 0.6), 6); // shoes
  rect(4, 0, 8, 8, skin, 10);              // head
  rect(4, 0, 8, 2, hair, 12);              // hair top
  if (style === 1) { rect(4, 2, 1, 7, hair, 10); rect(11, 2, 1, 7, hair, 10); }
  if (style === 2) { rect(4, 2, 4, 1, hair, 10); rect(4, 2, 1, 2, hair, 10); }
  if (style === 0) { rect(4, 2, 1, 2, hair, 10); rect(11, 2, 1, 2, hair, 10); }
  if (style === 3) { rect(4, 0, 8, 1, hair, 6); }
  set(5, 4, [255, 255, 255]); set(6, 4, eyes); set(9, 4, eyes); set(10, 4, [255, 255, 255]);
  const mouth = shade(skin, 0.7); set(7, 6, mouth); set(8, 6, mouth);
  return { W, H, px };
}

/* ---- tiny PNG encoder with nearest-neighbour upscaling ------------------ */
const CRC = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
function crc(buf) { let c = 0xffffffff; for (let i = 0; i < buf.length; i++) c = CRC[(c ^ buf[i]) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; }
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type), data]);
  const c = Buffer.alloc(4); c.writeUInt32BE(crc(td));
  return Buffer.concat([len, td, c]);
}
function png(W, H, px, scale) {
  const w = W * scale, h = H * scale, raw = Buffer.alloc((w * 4 + 1) * h);
  for (let y = 0; y < h; y++) {
    const row = y * (w * 4 + 1); raw[row] = 0;
    for (let x = 0; x < w; x++) {
      const s = ((Math.floor(y / scale) * W) + Math.floor(x / scale)) * 4, d = row + 1 + x * 4;
      raw[d] = px[s]; raw[d + 1] = px[s + 1]; raw[d + 2] = px[s + 2]; raw[d + 3] = px[s + 3];
    }
  }
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 6;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk("IHDR", ihdr), chunk("IDAT", zlib.deflateSync(raw)), chunk("IEND", Buffer.alloc(0))]);
}

/* type: "head" (8x8 face) or "body" (full figure) */
function avatar(name, type) {
  const f = figure(name);
  if (type === "body") return png(f.W, f.H, f.px, 8);
  const head = new Uint8ClampedArray(8 * 8 * 4);
  for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) {
    const s = (y * f.W + x + 4) * 4, d = (y * 8 + x) * 4;
    head[d] = f.px[s]; head[d + 1] = f.px[s + 1]; head[d + 2] = f.px[s + 2]; head[d + 3] = 255;
  }
  return png(8, 8, head, 16);
}

module.exports = { avatar };
