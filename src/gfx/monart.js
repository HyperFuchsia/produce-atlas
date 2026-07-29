import { makeCanvas } from '../core/screen.js';
import { hash2 } from './pixel.js';

// Creature sprites are composed from shaded primitives rather than hand-typed
// pixel grids: it keeps 18 species consistent in lighting while letting each one
// have a genuinely different silhouette. Everything is dithered with an ordered
// Bayer matrix so it reads as period-correct pixel art rather than gradients.

export const MON_W = 56;
export const MON_H = 56;

const BAYER = [
  [0, 8, 2, 10],
  [12, 4, 14, 6],
  [3, 11, 1, 9],
  [15, 7, 13, 5],
];

class Painter {
  constructor(w, h, seed) {
    this.w = w;
    this.h = h;
    this.seed = seed;
    this.c = makeCanvas(w, h);
    this.g = this.c.getContext('2d');
    this.buf = new Array(w * h).fill(null);
  }
  set(x, y, col) {
    x = Math.round(x); y = Math.round(y);
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return;
    this.buf[y * this.w + x] = col;
  }
  get(x, y) {
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return null;
    return this.buf[y * this.w + x];
  }
  flush() {
    const g = this.g;
    for (let y = 0; y < this.h; y++) {
      for (let x = 0; x < this.w; x++) {
        const col = this.buf[y * this.w + x];
        if (!col) continue;
        g.fillStyle = col;
        g.fillRect(x, y, 1, 1);
      }
    }
    return this.c;
  }
  /** Dark outline around the whole silhouette. */
  outline(col) {
    const add = [];
    for (let y = 0; y < this.h; y++) {
      for (let x = 0; x < this.w; x++) {
        if (this.get(x, y)) continue;
        if (this.get(x - 1, y) || this.get(x + 1, y) || this.get(x, y - 1) || this.get(x, y + 1)) {
          add.push([x, y]);
        }
      }
    }
    for (const [x, y] of add) this.set(x, y, col);
  }
}

/** Shaded, dithered ellipse. `pal` runs [rim, dark, mid, light, hi]. */
function blob(p, cx, cy, rx, ry, pal, opts = {}) {
  const lightX = opts.lx ?? -0.5;
  const lightY = opts.ly ?? -0.85;
  const wobble = opts.wobble ?? 0.07;
  const rimOnly = opts.rim ?? 0.80;
  const seed = (opts.seed ?? 0) + p.seed;
  for (let y = Math.floor(cy - ry - 1); y <= Math.ceil(cy + ry + 1); y++) {
    for (let x = Math.floor(cx - rx - 1); x <= Math.ceil(cx + rx + 1); x++) {
      const nx = (x + 0.5 - cx) / rx;
      const ny = (y + 0.5 - cy) / ry;
      const n = hash2(x, y, seed);
      const d = nx * nx + ny * ny + (n - 0.5) * wobble;
      if (d > 1) continue;
      if (d > rimOnly) { p.set(x, y, pal[0]); continue; }
      let lum = (nx * lightX + ny * lightY) * 0.5 + 0.5;
      lum += ((BAYER[y & 3][x & 3] + 0.5) / 16 - 0.5) * 0.20;
      lum += (n - 0.5) * 0.12;
      lum += opts.bias ?? 0;
      const band = Math.min(pal.length - 1, Math.max(1, Math.floor(lum * (pal.length - 1)) + 1));
      p.set(x, y, pal[band]);
    }
  }
}

/** Filled triangle (horns, fins, spikes, beaks). */
function tri(p, x0, y0, x1, y1, x2, y2, pal, opts = {}) {
  const minX = Math.floor(Math.min(x0, x1, x2));
  const maxX = Math.ceil(Math.max(x0, x1, x2));
  const minY = Math.floor(Math.min(y0, y1, y2));
  const maxY = Math.ceil(Math.max(y0, y1, y2));
  const area = (ax, ay, bx, by, cx, cy) => (bx - ax) * (cy - ay) - (cx - ax) * (by - ay);
  const A = area(x0, y0, x1, y1, x2, y2);
  if (Math.abs(A) < 0.0001) return;
  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      const px = x + 0.5;
      const py = y + 0.5;
      const w0 = area(x1, y1, x2, y2, px, py) / A;
      const w1 = area(x2, y2, x0, y0, px, py) / A;
      const w2 = area(x0, y0, x1, y1, px, py) / A;
      if (w0 < 0 || w1 < 0 || w2 < 0) continue;
      const edge = Math.min(w0, w1, w2) < 0.14;
      const n = hash2(x, y, p.seed + (opts.seed ?? 3));
      let lum = 0.5 + (opts.bias ?? 0) - w1 * 0.4 + w0 * 0.25;
      lum += ((BAYER[y & 3][x & 3] + 0.5) / 16 - 0.5) * 0.18 + (n - 0.5) * 0.1;
      const band = edge ? 0 : Math.min(pal.length - 1, Math.max(1, Math.floor(lum * (pal.length - 1)) + 1));
      p.set(x, y, pal[band]);
    }
  }
}

/** Tapering chain of blobs — tails, necks, tentacles. */
function chain(p, pts, pal, opts = {}) {
  for (let i = 0; i < pts.length - 1; i++) {
    const [ax, ay, ar] = pts[i];
    const [bx, by, br] = pts[i + 1];
    const steps = Math.max(2, Math.ceil(Math.hypot(bx - ax, by - ay)));
    for (let s = 0; s <= steps; s++) {
      const t = s / steps;
      const r = ar + (br - ar) * t;
      blob(p, ax + (bx - ax) * t, ay + (by - ay) * t, r, r, pal, { ...opts, rim: 0.72 });
    }
  }
}

function eye(p, x, y, r, pal, opts = {}) {
  const white = opts.white || '#ffffff';
  const pupil = opts.pupil || '#241830';
  const iris = opts.iris;
  blob(p, x, y, r, r * (opts.squash ?? 1.15), ['#2a1c2e', white, white, white, white], { rim: 0.86 });
  if (iris) blob(p, x, y + 0.2, r * 0.72, r * 0.82, [iris, iris, iris, iris, iris], { rim: 1 });
  blob(p, x + (opts.dx ?? 0.3), y + 0.4, r * 0.48, r * 0.62, [pupil, pupil, pupil, pupil, pupil], { rim: 1 });
  p.set(x - r * 0.35, y - r * 0.4, '#ffffff');
  if (r > 3) p.set(x - r * 0.35 + 1, y - r * 0.4, '#ffffff');
}

function mouth(p, x, y, w, col, opts = {}) {
  if (opts.type === 'smile') {
    for (let i = 0; i <= w; i++) {
      const t = i / w;
      p.set(x - w / 2 + i, y + Math.round(Math.sin(t * Math.PI) * (opts.curve ?? 1.4)), col);
    }
  } else if (opts.type === 'open') {
    blob(p, x, y, w / 2, (opts.h ?? w / 2.4), [col, col, col, '#a03050', '#a03050'], { rim: 0.7 });
    if (opts.fang) {
      p.set(x - w / 3, y - (opts.h ?? 2), '#ffffff');
      p.set(x + w / 3, y - (opts.h ?? 2), '#ffffff');
    }
  } else if (opts.type === 'beak') {
    tri(p, x - w / 2, y - 1, x + w / 2, y - 1, x, y + (opts.h ?? 4), opts.pal || ['#8a5a10', '#c08820', '#e0b040', '#f0d070', '#f8e8a0']);
  } else {
    for (let i = 0; i <= w; i++) p.set(x - w / 2 + i, y, col);
  }
}

/** Wispy flame — the Ember line's signature. */
function flame(p, cx, cy, w, h, pal, seed = 0) {
  for (let y = 0; y < h; y++) {
    const t = y / h;                       // 0 = tip
    const spread = Math.sin(t * Math.PI * 0.62) * w * (0.35 + t * 0.75);
    const wig = Math.sin(t * 5.5 + seed) * w * 0.16;
    for (let x = -spread; x <= spread; x++) {
      const yy = cy - h + y;
      const xx = cx + x + wig;
      const inner = Math.abs(x) < spread * 0.5;
      const core = Math.abs(x) < spread * 0.22 && t > 0.25;
      const n = hash2(Math.round(xx), Math.round(yy), seed + p.seed);
      let col = pal[1];
      if (core) col = pal[4];
      else if (inner) col = pal[3];
      else if (Math.abs(x) > spread - 1.2) col = pal[0];
      else col = n > 0.55 ? pal[2] : pal[1];
      p.set(xx, yy, col);
    }
  }
}

function leaf(p, x, y, len, ang, pal, seed = 0) {
  const dx = Math.cos(ang);
  const dy = Math.sin(ang);
  for (let i = 0; i < len; i++) {
    const t = i / len;
    const wid = Math.sin(t * Math.PI) * len * 0.34 + 0.6;
    for (let s = -wid; s <= wid; s++) {
      const px = x + dx * i - dy * s;
      const py = y + dy * i + dx * s;
      const edge = Math.abs(s) > wid - 1;
      const vein = Math.abs(s) < 0.6;
      p.set(px, py, edge ? pal[0] : vein ? pal[4] : (hash2(Math.round(px), Math.round(py), seed) > 0.5 ? pal[2] : pal[3]));
    }
  }
}

function wing(p, x, y, w, h, dir, pal, opts = {}) {
  const fingers = opts.fingers ?? 3;
  for (let i = 0; i < fingers; i++) {
    const t = (i + 1) / fingers;
    const ex = x + dir * w * t;
    const ey = y - h * (1 - t * 0.55) + (opts.droop ?? 0) * t;
    tri(p, x, y, ex, ey, x + dir * w * t * 0.85, y + h * 0.42 * t, pal, { seed: i * 3 });
  }
  blob(p, x, y, w * 0.22, h * 0.22, pal, { rim: 0.7 });
}

function shard(p, x, y, w, h, pal, ang = 0) {
  const c = Math.cos(ang);
  const s = Math.sin(ang);
  const rot = (dx, dy) => [x + dx * c - dy * s, y + dx * s + dy * c];
  const a = rot(0, -h);
  const b = rot(-w, h * 0.35);
  const d = rot(w, h * 0.35);
  tri(p, a[0], a[1], b[0], b[1], d[0], d[1], pal);
}

function spots(p, list, pal) {
  for (const [x, y, r] of list) blob(p, x, y, r, r * 0.8, pal, { rim: 0.9 });
}

const OPS = { blob, tri, chain, eye, mouth, flame, leaf, wing, shard, spots };

const SCALE_KEYS = ['x', 'y', 'rx', 'ry', 'r', 'w', 'h', 'len', 'x0', 'y0', 'x1', 'y1', 'x2', 'y2'];
function scalePart(part, s) {
  const out = { ...part };
  for (const k of SCALE_KEYS) if (typeof out[k] === 'number') out[k] = out[k] * s;
  if (out.pts) out.pts = out.pts.map(([x, y, r]) => [x * s, y * s, Math.max(0.8, r * s)]);
  if (out.list) out.list = out.list.map(([x, y, r]) => [x * s, y * s, Math.max(0.8, r * s)]);
  if (typeof out.rx === 'number') out.rx = Math.max(0.8, out.rx);
  if (typeof out.ry === 'number') out.ry = Math.max(0.8, out.ry);
  if (typeof out.r === 'number') out.r = Math.max(1, out.r);
  return out;
}

/**
 * Render a species recipe. `back` produces the behind-the-shoulder view used for
 * the player's own creature: the sprite is mirrored and face parts are dropped.
 */
export function renderMon(recipe, back = false, scale = 1) {
  const W = Math.round(MON_W * scale);
  const H = Math.round(MON_H * scale);
  const p = new Painter(W, H, recipe.seed ?? 1);
  const parts = recipe.parts.filter((part) => (back ? !part.face : !part.backOnly));
  for (const rawPart of parts) {
    const part = scale === 1 ? rawPart : scalePart(rawPart, scale);
    const op = OPS[part.t];
    if (!op) continue;
    const pal = typeof part.pal === 'string' ? recipe.pal[part.pal] : part.pal;
    const mx = (x) => (back ? W - 1 - x : x);
    switch (part.t) {
      case 'blob':
        blob(p, mx(part.x), part.y, part.rx, part.ry, pal, { ...part, lx: back ? 0.5 : -0.5 });
        break;
      case 'tri':
        tri(p, mx(part.x0), part.y0, mx(part.x1), part.y1, mx(part.x2), part.y2, pal, part);
        break;
      case 'chain':
        chain(p, part.pts.map(([x, y, r]) => [mx(x), y, r]), pal, part);
        break;
      case 'eye':
        eye(p, mx(part.x), part.y, part.r, pal, part);
        break;
      case 'mouth':
        mouth(p, mx(part.x), part.y, part.w, part.col || '#3a2030', part);
        break;
      case 'flame':
        flame(p, mx(part.x), part.y, part.w, part.h, pal, part.seed ?? 0);
        break;
      case 'leaf':
        leaf(p, mx(part.x), part.y, part.len, back ? Math.PI - part.ang : part.ang, pal, part.seed ?? 0);
        break;
      case 'wing':
        wing(p, mx(part.x), part.y, part.w, part.h, back ? -part.dir : part.dir, pal, part);
        break;
      case 'shard':
        shard(p, mx(part.x), part.y, part.w, part.h, pal, back ? -(part.ang ?? 0) : (part.ang ?? 0));
        break;
      case 'spots':
        spots(p, part.list.map(([x, y, r]) => [mx(x), y, r]), pal);
        break;
      default:
        break;
    }
  }
  p.outline(recipe.outline || '#1a1220');
  return p.flush();
}

/** Ink bounds so the battle scene can seat sprites on their platforms. */
export function spriteBounds(canvas) {
  const g = canvas.getContext('2d');
  const d = g.getImageData(0, 0, canvas.width, canvas.height).data;
  let minX = canvas.width, minY = canvas.height, maxX = -1, maxY = -1;
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
