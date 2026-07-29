import { makeCanvas } from '../core/screen.js';

/**
 * Build a sprite canvas from an array of equal-length strings.
 * Each character indexes `pal`; '.' and ' ' are transparent.
 */
export function makeSprite(rows, pal, scale = 1) {
  const h = rows.length;
  const w = rows[0].length;
  const c = makeCanvas(w * scale, h * scale);
  const g = c.getContext('2d');
  for (let y = 0; y < h; y++) {
    const row = rows[y];
    for (let x = 0; x < w; x++) {
      const ch = row[x];
      if (ch === '.' || ch === ' ' || ch === undefined) continue;
      const col = pal[ch];
      if (!col) continue;
      g.fillStyle = col;
      g.fillRect(x * scale, y * scale, scale, scale);
    }
  }
  return c;
}

/** Horizontal mirror. */
export function flipH(src) {
  const c = makeCanvas(src.width, src.height);
  const g = c.getContext('2d');
  g.translate(src.width, 0);
  g.scale(-1, 1);
  g.drawImage(src, 0, 0);
  return c;
}

/** Multiply a sprite by a solid colour, keeping alpha (used for silhouettes). */
export function silhouette(src, color) {
  const c = makeCanvas(src.width, src.height);
  const g = c.getContext('2d');
  g.drawImage(src, 0, 0);
  g.globalCompositeOperation = 'source-in';
  g.fillStyle = color;
  g.fillRect(0, 0, c.width, c.height);
  return c;
}

/** Blend a colour over a sprite at the given alpha (battle flash, night tint). */
export function tinted(src, color, alpha) {
  const c = makeCanvas(src.width, src.height);
  const g = c.getContext('2d');
  g.drawImage(src, 0, 0);
  g.globalCompositeOperation = 'source-atop';
  g.globalAlpha = alpha;
  g.fillStyle = color;
  g.fillRect(0, 0, c.width, c.height);
  return c;
}

/** Nearest-neighbour upscale. */
export function upscale(src, n) {
  const c = makeCanvas(src.width * n, src.height * n);
  const g = c.getContext('2d');
  g.imageSmoothingEnabled = false;
  g.drawImage(src, 0, 0, c.width, c.height);
  return c;
}

/** Deterministic value noise in [0,1) — used for terrain texturing. */
export function hash2(x, y, seed = 0) {
  let h = (x * 374761393 + y * 668265263 + seed * 2246822519) | 0;
  h = (h ^ (h >>> 13)) * 1274126177;
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

/** Shade helper: mix two hex colours. */
export function mix(a, b, t) {
  const pa = parseInt(a.slice(1), 16);
  const pb = parseInt(b.slice(1), 16);
  const r = Math.round((pa >> 16) + ((pb >> 16) - (pa >> 16)) * t);
  const g = Math.round(((pa >> 8) & 255) + (((pb >> 8) & 255) - ((pa >> 8) & 255)) * t);
  const bl = Math.round((pa & 255) + ((pb & 255) - (pa & 255)) * t);
  return `#${((r << 16) | (g << 8) | bl).toString(16).padStart(6, '0')}`;
}
