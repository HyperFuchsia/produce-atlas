import { makeCanvas } from '../core/screen.js';
import { SCREEN_W, SCREEN_H } from '../core/const.js';
import { hash2 } from './pixel.js';
import { PAL } from './palette.js';

const BAYER = [
  [0, 8, 2, 10],
  [12, 4, 14, 6],
  [3, 11, 1, 9],
  [15, 7, 13, 5],
];

/** Dithered vertical gradient — no smooth blends, keeps the era right. */
function gradient(g, x, y, w, h, top, bottom) {
  for (let j = 0; j < h; j++) {
    const t = j / (h - 1);
    for (let i = 0; i < w; i++) {
      const d = (BAYER[j & 3][i & 3] + 0.5) / 16;
      g.fillStyle = t + (d - 0.5) * 0.14 > 0.5 ? bottom : top;
      g.fillRect(x + i, y + j, 1, 1);
    }
  }
}

const cache = new Map();

export function battleBg(kind = 'field') {
  if (cache.has(kind)) return cache.get(kind);
  const c = makeCanvas(SCREEN_W, SCREEN_H);
  const g = c.getContext('2d');

  if (kind === 'cave') {
    g.fillStyle = '#14121e';
    g.fillRect(0, 0, SCREEN_W, SCREEN_H);
    gradient(g, 0, 0, SCREEN_W, 70, '#241f34', '#191627');
    // stalactites
    for (let i = 0; i < 14; i++) {
      const x = Math.floor(hash2(i, 3, 91) * SCREEN_W);
      const h = 8 + Math.floor(hash2(i, 7, 92) * 22);
      for (let y = 0; y < h; y++) {
        const w = Math.max(1, Math.round((1 - y / h) * 6));
        g.fillStyle = y > h * 0.6 ? '#3a3450' : '#2c2740';
        g.fillRect(x - w, y, w * 2, 1);
      }
    }
    gradient(g, 0, 70, SCREEN_W, 46, '#2e2942', '#3d374f');
    g.fillStyle = '#4a4460';
    g.fillRect(0, 114, SCREEN_W, 2);
    for (let i = 0; i < 300; i++) {
      const x = Math.floor(hash2(i, 1, 77) * SCREEN_W);
      const y = 72 + Math.floor(hash2(i, 2, 78) * 44);
      g.fillStyle = hash2(i, 4, 79) > 0.5 ? '#453f5c' : '#282338';
      g.fillRect(x, y, 1, 1);
    }
  } else if (kind === 'indoor') {
    gradient(g, 0, 0, SCREEN_W, 74, '#cfc4a8', '#b8ab8c');
    g.fillStyle = '#8a7a58';
    g.fillRect(0, 74, SCREEN_W, 2);
    gradient(g, 0, 76, SCREEN_W, 40, '#a88a5c', '#8a6a44');
    for (let x = 0; x < SCREEN_W; x += 16) {
      g.fillStyle = '#7a5c38';
      g.fillRect(x, 76, 1, 40);
    }
  } else {
    // open field
    gradient(g, 0, 0, SCREEN_W, 52, '#8fd0f0', '#c6ecfa');
    // distant hills
    for (let layer = 0; layer < 2; layer++) {
      const base = 56 + layer * 6;
      const col = layer === 0 ? '#5f9a6a' : '#4c8058';
      for (let x = 0; x < SCREEN_W; x++) {
        const h = Math.round(
          Math.sin((x + layer * 60) * 0.035) * 7 +
          Math.sin((x + layer * 33) * 0.011) * 9 + 12,
        );
        g.fillStyle = col;
        g.fillRect(x, base - h, 1, h + 4);
      }
    }
    // a few clouds
    for (let i = 0; i < 4; i++) {
      const cx = Math.floor(hash2(i, 5, 21) * SCREEN_W);
      const cy = 6 + Math.floor(hash2(i, 6, 22) * 22);
      for (let j = 0; j < 5; j++) {
        const ox = Math.round((hash2(i, j, 23) - 0.5) * 22);
        const oy = Math.round((hash2(i, j, 24) - 0.5) * 5);
        const r = 3 + Math.floor(hash2(i, j, 25) * 4);
        g.fillStyle = '#ffffff';
        g.fillRect(cx + ox - r, cy + oy, r * 2, r);
        g.fillStyle = '#e0f0fa';
        g.fillRect(cx + ox - r, cy + oy + r, r * 2, 1);
      }
    }
    // meadow floor
    gradient(g, 0, 62, SCREEN_W, 54, PAL.grass1, PAL.grass0);
    for (let i = 0; i < 520; i++) {
      const x = Math.floor(hash2(i, 1, 31) * SCREEN_W);
      const y = 64 + Math.floor(hash2(i, 2, 32) * 52);
      g.fillStyle = hash2(i, 3, 33) > 0.55 ? PAL.grass2 : PAL.grass0;
      g.fillRect(x, y, 1, 1);
    }
  }
  cache.set(kind, c);
  return c;
}

const platCache = new Map();
/** Elliptical platform — the perspective cue that sells the 2.5D battlefield. */
export function platform(rx, ry, kind = 'field') {
  const key = `${rx}:${ry}:${kind}`;
  if (platCache.has(key)) return platCache.get(key);
  const c = makeCanvas(rx * 2 + 4, ry * 2 + 8);
  const g = c.getContext('2d');
  const cx = c.width / 2;
  const cy = ry + 2;
  const cols = kind === 'cave'
    ? ['#241f34', '#3a3450', '#4e4768', '#635a80']
    : kind === 'indoor'
      ? ['#6a5236', '#8a6a44', '#a88a5c', '#c4a878']
      : ['#2f6b3a', '#3f8b46', '#5cae52', '#7fd06a'];
  // side wall gives it thickness
  for (let y = -ry; y <= ry + 4; y++) {
    const t = Math.max(0, 1 - ((y > ry ? ry : y) / ry) ** 2);
    const w = Math.floor(rx * Math.sqrt(t));
    if (w <= 0) continue;
    for (let x = -w; x <= w; x++) {
      let col;
      if (y > ry - 1) col = cols[0];
      else {
        const lum = 0.5 - (x / rx) * 0.35 - (y / ry) * 0.3;
        const d = (BAYER[(y + 8) & 3][(x + 8) & 3] + 0.5) / 16 - 0.5;
        const v = lum + d * 0.22;
        col = v > 0.72 ? cols[3] : v > 0.48 ? cols[2] : v > 0.25 ? cols[1] : cols[0];
      }
      g.fillStyle = col;
      g.fillRect(cx + x, cy + y, 1, 1);
    }
  }
  platCache.set(key, c);
  return c;
}
