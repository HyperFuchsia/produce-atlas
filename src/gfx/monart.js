import { makeCanvas } from '../core/screen.js';

// ---------------------------------------------------------------------------
// Creature sprite compositor.
//
// Sprites are assembled from shaded primitives, then finished with three passes
// that are what actually make them read as hand-drawn pixel art:
//   1. cel shading   — lighting is quantised to four hard tone bands, no dither
//   2. contact lines — a 1px darker rim wherever a later shape overlaps an
//                      earlier one, which separates limbs from bodies
//   3. tinted outline— the silhouette is outlined in the darkest tone of the
//                      shape it touches, never flat black
// ---------------------------------------------------------------------------

export const MON_W = 64;
export const MON_H = 64;

// Light comes from the upper left and slightly toward the viewer.
const LX = -0.52;
const LY = -0.66;
const LZ = 0.54;

const TONES = [0.30, 0.55, 0.80]; // thresholds between tone 1|2, 2|3, 3|4

export class Sheet {
  constructor(w, h) {
    this.w = w;
    this.h = h;
    this.pid = new Int16Array(w * h).fill(-1);
    this.sh = new Float32Array(w * h);
    this.pal = new Array(w * h).fill(null);
    this.hard = new Array(w * h).fill(null); // pixels painted as a literal colour
  }
  inside(x, y) {
    return x >= 0 && y >= 0 && x < this.w && y < this.h;
  }
  put(x, y, pid, sh, pal) {
    x |= 0; y |= 0;
    if (!this.inside(x, y)) return;
    const i = y * this.w + x;
    this.pid[i] = pid;
    this.sh[i] = sh;
    this.pal[i] = pal;
    this.hard[i] = null;
  }
  putHard(x, y, col, pid) {
    x = Math.round(x); y = Math.round(y);
    if (!this.inside(x, y)) return;
    const i = y * this.w + x;
    this.hard[i] = col;
    this.pid[i] = pid;
  }
}

function norm3(x, y, z) {
  const l = Math.hypot(x, y, z) || 1;
  return [x / l, y / l, z / l];
}

const rimCache = new Map();
/** A brighter version of a palette's top tone, used for the lit rim. */
function rimTone(pal) {
  const key = pal[4];
  if (rimCache.has(key)) return rimCache.get(key);
  const v = parseInt(key.slice(1), 16);
  const f = (c) => Math.round(c + (255 - c) * 0.52);
  const out = `#${((f((v >> 16) & 255) << 16) | (f((v >> 8) & 255) << 8) | f(v & 255)).toString(16).padStart(6, '0')}`;
  rimCache.set(key, out);
  return out;
}

const shadeCache = new Map();
/** A deeper version of a palette's outline, for the underside of a shape. */
function deepTone(hex) {
  if (shadeCache.has(hex)) return shadeCache.get(hex);
  const v = parseInt(hex.slice(1), 16);
  const f = (c) => Math.round(c * 0.62);
  const out = `#${((f((v >> 16) & 255) << 16) | (f((v >> 8) & 255) << 8) | f(v & 255)).toString(16).padStart(6, '0')}`;
  shadeCache.set(hex, out);
  return out;
}

/** Lambert term for an outward normal, remapped into 0..1 with ambient lift. */
function lambert(nx, ny, nz, bias = 0) {
  const [x, y, z] = norm3(nx, ny, nz);
  const d = x * LX + y * LY + z * LZ;
  return Math.max(0, Math.min(1, 0.5 + d * 0.62 + bias));
}

// ---------------------------------------------------------------------------
// Primitives. Every one writes shade + palette + part id, never a final colour.

/**
 * Superellipse: |x/rx|^n + |y/ry|^n <= 1. n=2 is an ellipse, n=3..5 gives the
 * rounded-rectangle bodies that read much better than pure circles, n=1.4 gives
 * a diamond or teardrop.
 */
export function ell(s, pid, pal, o) {
  const { x, y, rx, ry } = o;
  const n = o.n ?? 2;
  const rot = o.rot ?? 0;
  const flat = o.flat ?? 1;
  const bias = o.bias ?? 0;
  const fur = o.fur ?? 0;
  const spikes = o.spikes ?? 9;
  const phase = o.phase ?? 0;
  const cr = Math.cos(-rot);
  const sr = Math.sin(-rot);
  const rad = Math.max(rx, ry) * (1 + fur) + 2;
  for (let py = Math.floor(y - rad); py <= Math.ceil(y + rad); py++) {
    for (let px = Math.floor(x - rad); px <= Math.ceil(x + rad); px++) {
      const ox = px + 0.5 - x;
      const oy = py + 0.5 - y;
      const lx = ox * cr - oy * sr;
      const ly = ox * sr + oy * cr;
      const u = Math.pow(Math.abs(lx / rx), n) + Math.pow(Math.abs(ly / ry), n);
      // `fur` scallops the outline into clumps so the shape stops reading as a
      // smooth ellipse — the single biggest anti-blob lever.
      const lim = fur ? 1 + fur * Math.sin(Math.atan2(ly, lx) * spikes + phase) : 1;
      if (u > lim) continue;
      const z = Math.sqrt(Math.max(0, 1 - Math.min(1, u))) * flat;
      const nxl = lx / rx;
      const nyl = ly / ry;
      const nx = nxl * cr + nyl * sr;
      const ny = -nxl * sr + nyl * cr;
      s.put(px, py, pid, lambert(nx, ny, z, bias), pal);
    }
  }
}

/** Tapered capsule between two points — limbs, necks, tails. */
export function limb(s, pid, pal, o) {
  const { x1, y1, x2, y2 } = o;
  const r1 = o.r1;
  const r2 = o.r2 ?? o.r1;
  const bias = o.bias ?? 0;
  const fur = o.fur ?? 0;
  const spikes = o.spikes ?? 9;
  const phase = o.phase ?? 0;
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len2 = dx * dx + dy * dy || 1;
  const rad = Math.max(r1, r2) * (1 + fur) + 2;
  const minX = Math.floor(Math.min(x1, x2) - rad);
  const maxX = Math.ceil(Math.max(x1, x2) + rad);
  const minY = Math.floor(Math.min(y1, y2) - rad);
  const maxY = Math.ceil(Math.max(y1, y2) + rad);
  for (let py = minY; py <= maxY; py++) {
    for (let px = minX; px <= maxX; px++) {
      const ox = px + 0.5 - x1;
      const oy = py + 0.5 - y1;
      let t = (ox * dx + oy * dy) / len2;
      t = Math.max(0, Math.min(1, t));
      const cx = x1 + dx * t;
      const cy = y1 + dy * t;
      const r = r1 + (r2 - r1) * t;
      const d = Math.hypot(px + 0.5 - cx, py + 0.5 - cy);
      const rEff = fur
        ? r * (1 + fur * Math.sin(Math.atan2(py + 0.5 - cy, px + 0.5 - cx) * spikes + phase))
        : r;
      if (d > rEff) continue;
      const u = Math.min(1, d / (r || 1));
      const z = Math.sqrt(Math.max(0, 1 - u * u));
      const ax = (px + 0.5 - cx) / (r || 1);
      const ay = (py + 0.5 - cy) / (r || 1);
      s.put(px, py, pid, lambert(ax, ay, z, bias), pal);
    }
  }
}

/** Polygon by scanline — wings, fins, crests, horns, shells. */
export function poly(s, pid, pal, o) {
  const pts = o.pts;
  if (!pts || pts.length < 3) return;
  let minY = Infinity;
  let maxY = -Infinity;
  let minX = Infinity;
  let maxX = -Infinity;
  for (const [x, y] of pts) {
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
  }
  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;
  const gx = o.gx ?? -0.6;
  const gy = o.gy ?? -0.5;
  const spanX = Math.max(1, (maxX - minX) / 2);
  const spanY = Math.max(1, (maxY - minY) / 2);
  const bias = o.bias ?? 0;
  for (let py = Math.floor(minY); py <= Math.ceil(maxY); py++) {
    const yc = py + 0.5;
    const xs = [];
    for (let i = 0; i < pts.length; i++) {
      const [ax, ay] = pts[i];
      const [bx, by] = pts[(i + 1) % pts.length];
      if ((ay <= yc && by > yc) || (by <= yc && ay > yc)) {
        xs.push(ax + ((yc - ay) / (by - ay)) * (bx - ax));
      }
    }
    xs.sort((a, b) => a - b);
    for (let k = 0; k + 1 < xs.length; k += 2) {
      for (let px = Math.ceil(xs[k] - 0.5); px <= Math.floor(xs[k + 1] - 0.5); px++) {
        const u = (px + 0.5 - cx) / spanX;
        const v = (py + 0.5 - cy) / spanY;
        const sh = Math.max(0, Math.min(1, 0.58 + (u * gx + v * gy) * 0.34 + bias));
        s.put(px, py, pid, sh, pal);
      }
    }
  }
}

/** Smooth tapering ribbon through control points — tails, tendrils, vines. */
function ribbon(s, pid, pal, o) {
  const pts = o.pts;
  for (let i = 0; i < pts.length - 1; i++) {
    const [ax, ay, ar] = pts[i];
    const [bx, by, br] = pts[i + 1];
    limb(s, pid, pal, { x1: ax, y1: ay, r1: ar, x2: bx, y2: by, r2: br, bias: o.bias ?? 0 });
  }
}

/** Fire: layered tongues with a hot core, drawn in flat bands. */
function flame(s, pid, pal, o) {
  const { x, y, w, h } = o;
  const seed = o.seed ?? 0;
  const tongues = o.tongues ?? 3;
  for (let ti = 0; ti < tongues; ti++) {
    const f = tongues === 1 ? 0 : (ti - (tongues - 1) / 2) / (tongues - 1);
    const tw = w * (1 - Math.abs(f) * 0.42);
    const th = h * (1 - Math.abs(f) * 0.34);
    const ox = x + f * w * 0.66;
    const pts = [];
    const steps = 12;
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const spread = Math.sin(Math.pow(t, 0.75) * Math.PI) * tw * 0.5;
      const wob = Math.sin(t * 4.2 + seed + ti) * tw * 0.14;
      pts.push([ox - spread + wob, y - th * (1 - t)]);
    }
    for (let i = steps; i >= 0; i--) {
      const t = i / steps;
      const spread = Math.sin(Math.pow(t, 0.75) * Math.PI) * tw * 0.5;
      const wob = Math.sin(t * 4.2 + seed + ti) * tw * 0.14;
      pts.push([ox + spread + wob, y - th * (1 - t)]);
    }
    poly(s, pid, pal, { pts, gx: -0.5, gy: -0.8, bias: 0.06 - Math.abs(f) * 0.14 });
  }
  const corePts = [];
  const steps = 10;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const spread = Math.sin(Math.pow(t, 0.8) * Math.PI) * w * 0.20;
    corePts.push([x - spread, y - h * 0.70 * (1 - t)]);
  }
  for (let i = steps; i >= 0; i--) {
    const t = i / steps;
    const spread = Math.sin(Math.pow(t, 0.8) * Math.PI) * w * 0.20;
    corePts.push([x + spread, y - h * 0.70 * (1 - t)]);
  }
  poly(s, pid, pal, { pts: corePts, bias: 0.5, gx: 0, gy: 0 });
}

/** Leaf blade with a centre vein. */
function leaf(s, pid, pal, o) {
  const { x, y, len, ang } = o;
  const wid = o.wid ?? len * 0.32;
  const dx = Math.cos(ang);
  const dy = Math.sin(ang);
  const pts = [];
  const steps = 10;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const w = Math.sin(Math.pow(t, 0.7) * Math.PI) * wid;
    pts.push([x + dx * len * t - dy * w, y + dy * len * t + dx * w]);
  }
  for (let i = steps; i >= 0; i--) {
    const t = i / steps;
    const w = Math.sin(Math.pow(t, 0.7) * Math.PI) * wid;
    pts.push([x + dx * len * t + dy * w, y + dy * len * t - dx * w]);
  }
  poly(s, pid, pal, { pts, gx: -0.5, gy: -0.6 });
  for (let i = 1; i < len * 0.9; i++) {
    s.put(Math.round(x + dx * i), Math.round(y + dy * i), pid, 0.95, pal);
  }
}

// ---------------------------------------------------------------------------
// Detail passes. These write literal colours on top of the shaded layers.

function eye(s, pid, o) {
  const { x, y, r } = o;
  const rx = Math.max(1.6, r);
  const ry = Math.max(1.8, r * (o.squash ?? 1.15));
  const lid = o.lid || '#241828';
  const iris = o.iris || '#4a90d0';
  const pupil = o.pupil || '#140c1c';
  const white = o.white || '#ffffff';

  const disc = (cx, cy, arx, ary, col) => {
    for (let py = Math.floor(cy - ary); py <= Math.ceil(cy + ary); py++) {
      for (let px = Math.floor(cx - arx); px <= Math.ceil(cx + arx); px++) {
        const u = ((px + 0.5 - cx) / arx) ** 2 + ((py + 0.5 - cy) / ary) ** 2;
        if (u > 1) continue;
        s.putHard(px, py, col, pid);
      }
    }
  };

  // dark rim, coloured iris, vertical pupil, then the two shines
  disc(x, y, rx, ry, lid);
  disc(x, y, rx - 1, ry - 1, iris);
  disc(x, y + ry * 0.12, Math.max(0.9, rx * 0.44), Math.max(1.1, ry * 0.70), pupil);
  disc(x + rx * 0.10, y + ry * 0.52, Math.max(0.9, rx * 0.42), Math.max(0.7, ry * 0.22), white);
  s.putHard(x - rx * 0.40, y - ry * 0.44, white, pid);
  if (rx >= 3) s.putHard(x - rx * 0.40 + 1, y - ry * 0.44, white, pid);
}

function mouth(s, pid, o) {
  const { x, y, w } = o;
  const col = o.col || '#2a1820';
  if (o.type === 'smile' || o.type === 'frown') {
    const dir = o.type === 'frown' ? -1 : 1;
    const c = o.curve ?? 1.6;
    for (let i = 0; i <= w; i++) {
      const t = i / w;
      s.putHard(x - w / 2 + i, y + dir * Math.round(Math.sin(t * Math.PI) * c), col, pid);
    }
    if (o.thick) {
      for (let i = 1; i < w; i++) {
        const t = i / w;
        s.putHard(x - w / 2 + i, y + dir * Math.round(Math.sin(t * Math.PI) * c) + 1, col, pid);
      }
    }
    return;
  }
  if (o.type === 'open') {
    const h = o.h ?? w * 0.45;
    const tongue = o.tongue || '#c0506a';
    for (let py = Math.floor(y - h); py <= Math.ceil(y + h); py++) {
      for (let px = Math.floor(x - w / 2); px <= Math.ceil(x + w / 2); px++) {
        const u = ((px + 0.5 - x) / (w / 2)) ** 2 + ((py + 0.5 - y) / h) ** 2;
        if (u > 1) continue;
        s.putHard(px, py, py > y + h * 0.45 ? tongue : col, pid);
      }
    }
    if (o.fang) {
      for (const fx of [-w / 3, w / 3]) {
        s.putHard(x + fx, y - h + 1, '#ffffff', pid);
        s.putHard(x + fx, y - h + 2, '#ffffff', pid);
        s.putHard(x + fx, y - h + 3, '#dcdce6', pid);
      }
    }
    return;
  }
  if (o.type === 'beak') {
    const h = o.h ?? 5;
    const pal = o.pal || ['#7a4a08', '#c08820', '#e8b83c', '#f6d878'];
    for (let py = 0; py < h; py++) {
      const hw = Math.round((w / 2) * (1 - py / h));
      for (let px = -hw; px <= hw; px++) {
        const edge = px <= -hw || px >= hw || py === h - 1;
        s.putHard(x + px, y + py, edge ? pal[0] : (px < 0 ? pal[3] : pal[1]), pid);
      }
    }
    for (let px = -Math.round(w / 2); px <= Math.round(w / 2); px++) {
      s.putHard(x + px, y - 1, pal[0], pid);
    }
    return;
  }
  for (let i = 0; i <= w; i++) s.putHard(x - w / 2 + i, y, col, pid);
}

/** Freehand 1px stroke — whiskers, cracks, feather lines, scale seams. */
function stroke(s, pid, o) {
  const pts = o.pts;
  const col = o.col || '#000';
  for (let i = 0; i < pts.length - 1; i++) {
    const [ax, ay] = pts[i];
    const [bx, by] = pts[i + 1];
    const n = Math.max(1, Math.ceil(Math.hypot(bx - ax, by - ay)));
    for (let k = 0; k <= n; k++) {
      s.putHard(ax + ((bx - ax) * k) / n, ay + ((by - ay) * k) / n, col, pid);
    }
  }
}

// ---------------------------------------------------------------------------
const OPS = { ell, limb, poly, ribbon, flame, leaf };
const DETAILS = { eye, mouth, stroke };

const MIRROR_KEYS = ['x', 'x1', 'x2'];

function mirrorPart(part, W) {
  const p = { ...part };
  const m = (v) => W - 1 - v;
  for (const k of MIRROR_KEYS) if (typeof p[k] === 'number') p[k] = m(p[k]);
  if (p.pts) p.pts = p.pts.map((q) => (q.length >= 3 ? [m(q[0]), q[1], q[2]] : [m(q[0]), q[1]]));
  if (typeof p.rot === 'number') p.rot = -p.rot;
  if (typeof p.ang === 'number') p.ang = Math.PI - p.ang;
  if (typeof p.gx === 'number') p.gx = -p.gx;
  return p;
}

const SCALE_KEYS = ['x', 'y', 'rx', 'ry', 'r', 'r1', 'r2', 'x1', 'y1', 'x2', 'y2', 'w', 'h', 'len', 'wid', 'curve'];
function scalePart(part, k) {
  const p = { ...part };
  for (const key of SCALE_KEYS) if (typeof p[key] === 'number') p[key] = p[key] * k;
  if (p.pts) p.pts = p.pts.map((q) => q.map((v, i) => (i < 2 ? v * k : Math.max(0.7, v * k))));
  if (typeof p.r === 'number') p.r = Math.max(1.2, p.r);
  if (typeof p.rx === 'number') p.rx = Math.max(0.8, p.rx);
  if (typeof p.ry === 'number') p.ry = Math.max(0.8, p.ry);
  if (typeof p.r1 === 'number') p.r1 = Math.max(0.8, p.r1);
  if (typeof p.r2 === 'number') p.r2 = Math.max(0.8, p.r2);
  return p;
}

/**
 * Render a species recipe. `back` mirrors the sprite and drops face-side detail
 * for the over-the-shoulder view used by the player's own creature.
 */
export function renderMon(recipe, back = false, scale = 1) {
  const W = Math.round(MON_W * scale);
  const H = Math.round(MON_H * scale);
  const s = new Sheet(W, H);
  const parts = recipe.parts.filter((p) => (back ? !p.face : !p.backOnly));

  parts.forEach((raw, idx) => {
    let part = raw;
    if (scale !== 1) part = scalePart(part, scale);
    if (back) part = mirrorPart(part, W);
    const pal = typeof part.pal === 'string' ? recipe.pal[part.pal] : part.pal;
    const op = OPS[part.t];
    if (op) {
      if (part.clip) {
        // Markings: paint only over what is already there so they wrap the body.
        const tmp = new Sheet(W, H);
        op(tmp, 0, pal, part);
        for (let i = 0; i < W * H; i++) {
          if (tmp.pid[i] < 0 || s.pid[i] < 0 || s.hard[i]) continue;
          s.pal[i] = pal;
          if (part.reshade) s.sh[i] = tmp.sh[i];
        }
      } else {
        op(s, idx, pal, part);
      }
      return;
    }
    const det = DETAILS[part.t];
    if (det) det(s, idx, part);
  });

  return resolveSheet(s, recipe.outline || '#1a1220', recipe.rim !== false);
}

/**
 * Finish a sheet: contact shading, cel quantisation and a tinted outline.
 * Shared by creature sprites and the overworld props.
 */
export function resolveSheet(s, fallbackOutline = '#1a1220', rim = true) {
  const W = s.w;
  const H = s.h;
  const shaded = new Float32Array(s.sh);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = y * W + x;
      const p = s.pid[i];
      if (p < 0 || s.hard[i]) continue;
      let over = false;
      if (x > 0 && s.pid[i - 1] > p) over = true;
      if (!over && x < W - 1 && s.pid[i + 1] > p) over = true;
      if (!over && y > 0 && s.pid[i - W] > p) over = true;
      if (!over && y < H - 1 && s.pid[i + W] > p) over = true;
      if (over) shaded[i] = Math.max(0, s.sh[i] - 0.34);
    }
  }
  s.sh = shaded;

  const out = new Array(W * H).fill(null);
  for (let i = 0; i < W * H; i++) {
    if (s.hard[i]) { out[i] = s.hard[i]; continue; }
    if (s.pid[i] < 0) continue;
    const pal = s.pal[i];
    if (!pal) continue;
    const v = s.sh[i];
    const tone = v < TONES[0] ? 1 : v < TONES[1] ? 2 : v < TONES[2] ? 3 : 4;
    out[i] = pal[Math.min(tone, pal.length - 1)];
  }

  // Rim light: the edge facing the lamp catches a brighter tone. This is what
  // separates a shaded blob from something that looks drawn.
  if (rim) {
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const i = y * W + x;
        if (!out[i] || s.hard[i] || s.pid[i] < 0) continue;
        if (s.sh[i] < 0.40) continue;
        const emptyUp = y === 0 || s.pid[i - W] < 0;
        const emptyLeft = x === 0 || s.pid[i - 1] < 0;
        if (emptyUp || emptyLeft) out[i] = rimTone(s.pal[i]);
      }
    }
  }

  const outline = new Array(W * H).fill(null);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = y * W + x;
      if (out[i]) continue;
      let best = -2;
      let pal = null;
      const check = (j) => {
        if (j < 0 || j >= W * H || !out[j]) return;
        if (s.pid[j] > best) { best = s.pid[j]; pal = s.pal[j]; }
      };
      if (x > 0) check(i - 1);
      if (x < W - 1) check(i + 1);
      if (y > 0) check(i - W);
      if (y < H - 1) check(i + W);
      if (best < -1) continue;
      const base = (pal && pal[0]) || fallbackOutline;
      // heavier outline underneath, lighter on top — pixel artists vary the
      // weight rather than tracing a uniform key line
      const under = y > 0 && out[i - W];
      outline[i] = under ? deepTone(base) : base;
    }
  }
  for (let i = 0; i < W * H; i++) if (outline[i]) out[i] = outline[i];

  const c = makeCanvas(W, H);
  const g = c.getContext('2d');
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const col = out[y * W + x];
      if (!col) continue;
      g.fillStyle = col;
      g.fillRect(x, y, 1, 1);
    }
  }
  return c;
}

/** Ink bounds so the battle scene can seat sprites on their platforms. */
export function spriteBounds(canvas) {
  const g = canvas.getContext('2d');
  const d = g.getImageData(0, 0, canvas.width, canvas.height).data;
  let minX = canvas.width;
  let minY = canvas.height;
  let maxX = -1;
  let maxY = -1;
  for (let y = 0; y < canvas.height; y++) {
    for (let x = 0; x < canvas.width; x++) {
      if (d[(y * canvas.width + x) * 4 + 3] > 8) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (maxX < 0) return { x: 0, y: 0, w: 1, h: 1 };
  return { x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1 };
}
