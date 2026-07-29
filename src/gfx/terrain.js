import { makeCanvas } from '../core/screen.js';
import { PAL } from './palette.js';
import { hash2, mix } from './pixel.js';

const T = 16;

function mk(w = T, h = T) {
  const c = makeCanvas(w, h);
  const g = c.getContext('2d');
  const px = (x, y, col) => {
    g.fillStyle = col;
    g.fillRect(x, y, 1, 1);
  };
  const rect = (x, y, w2, h2, col) => {
    g.fillStyle = col;
    g.fillRect(x, y, w2, h2);
  };
  return { c, g, px, rect };
}

/** Speckle a tile with two accent colours using deterministic noise. */
function speckle(px, seed, dark, light, dp = 0.14, lp = 0.88) {
  for (let y = 0; y < T; y++) {
    for (let x = 0; x < T; x++) {
      const h = hash2(x, y, seed);
      if (h < dp) px(x, y, dark);
      else if (h > lp) px(x, y, light);
    }
  }
}

/**
 * Fine organic speckle. The reference art gets its texture from dense 1px
 * variation across three or four greens, not from big blocks.
 */
function speck(px, seed, dark, light, hi, dp = 0.20, lp = 0.80, hp = 0.95) {
  for (let y = 0; y < T; y++) {
    for (let x = 0; x < T; x++) {
      const h = hash2(x, y, seed);
      if (h < dp) px(x, y, dark);
      else if (h > hp && hi) px(x, y, hi);
      else if (h > lp) px(x, y, light);
    }
  }
}

/** Short blades of grass, scattered but never on a grid. */
function blades(px, seed, mid, light, n = 5) {
  for (let i = 0; i < n; i++) {
    const x = 1 + Math.floor(hash2(i, 0, seed) * (T - 2));
    const y = 1 + Math.floor(hash2(i, 1, seed) * (T - 3));
    px(x, y + 1, mid);
    px(x, y, light);
    px(x - 1, y + 1, mid);
    px(x + 1, y + 1, mid);
  }
}

// ---------------------------------------------------------------------------
export function tileGrass(v) {
  const { c, px, rect } = mk();
  rect(0, 0, T, T, PAL.grass1);
  speck(px, 11 + v, PAL.grass0, PAL.grass2, PAL.grass3, 0.17, 0.76, 0.95);
  blades(px, 40 + v, PAL.grass0, PAL.grass3, 2);
  return c;
}

export function tileFlowers(v) {
  const c = tileGrass(v + 5);
  const g = c.getContext('2d');
  const col = v % 2 ? ['#f0d048', '#fff0a0'] : ['#e04868', '#ff98b0'];
  const put = (x, y) => {
    g.fillStyle = col[0];
    g.fillRect(x, y - 1, 1, 1);
    g.fillRect(x - 1, y, 3, 1);
    g.fillRect(x, y + 1, 1, 1);
    g.fillStyle = col[1];
    g.fillRect(x, y, 1, 1);
  };
  put(4 + v, 5);
  put(11, 10 - v);
  put(7, 13);
  return c;
}

/** One clump of three blades springing from (bx, by). */
function clump(px, bx, by, dark, mid, light, lean = 0) {
  const blades = [[-3, 7, -0.55], [0, 10, 0.1], [3, 8, 0.6]];
  for (const [dx, h, bend] of blades) {
    for (let i = 0; i < h; i++) {
      const t = i / h;
      const x = Math.round(bx + dx + (bend + lean) * i * 0.75);
      const y = by - i;
      px(x - 1, y, dark);
      px(x, y, t > 0.55 ? light : mid);
    }
    px(Math.round(bx + dx + (bend + lean) * h * 0.75), by - h, light);
  }
}

/** Blades that get drawn *over* the walker, so you wade through the grass. */
export function tallGrassFront(ctx, ox = 0, oy = 0) {
  const px = (x, y, col) => { ctx.fillStyle = col; ctx.fillRect(ox + x, oy + y, 1, 1); };
  clump(px, 5, 17, PAL.grass0, PAL.grass2, PAL.grass3, -0.05);
  clump(px, 13, 18, PAL.grass0, PAL.grass2, PAL.grass3, 0.05);
}

export function tileTallGrass(v) {
  const { c, g, px, rect } = mk();
  rect(0, 0, T, T, PAL.grass1);
  speck(px, 31 + v, PAL.grass0, PAL.grass2, null, 0.20, 0.82);
  // shaded ground under the clumps
  rect(0, 8, T, 8, PAL.grass0);
  for (let x = 0; x < T; x++) if (hash2(x, 8, 33 + v) > 0.5) px(x, 8, PAL.grass1);
  // back row (darker, taller)
  clump(px, 3, 12, '#245a2a', PAL.grass1, PAL.grass2, v % 2 ? -0.1 : 0.1);
  clump(px, 11, 11, '#245a2a', PAL.grass1, PAL.grass2, v % 2 ? 0.12 : -0.12);
  // front row — identical to the overlay so the tile still reads when empty
  tallGrassFront(g, 0, 0);
  return c;
}

export function tilePath(v) {
  const { c, px, rect } = mk();
  rect(0, 0, T, T, PAL.dirt1);
  speck(px, 51 + v, PAL.dirt0, PAL.dirt2, PAL.dirt3, 0.20, 0.78, 0.95);
  const pebbles = [[4, 6], [12, 11], [8, 3], [2, 13]];
  for (let i = 0; i < 2; i++) {
    const [x, y] = pebbles[(i + v) % pebbles.length];
    px(x, y, PAL.dirt3);
    px(x + 1, y, PAL.dirt2);
    px(x, y + 1, PAL.dirt0);
    px(x + 1, y + 1, PAL.dirt0);
  }
  return c;
}

export function tileSand(v) {
  const { c, px, rect } = mk();
  rect(0, 0, T, T, PAL.sand1);
  speck(px, 71 + v, PAL.sand0, PAL.sand2, null, 0.20, 0.80);
  return c;
}

export function tileWater(frame, deep = false) {
  const { c, px, rect } = mk();
  const base = deep ? PAL.water0 : PAL.water1;
  const mid = deep ? PAL.water1 : PAL.water2;
  const hi = deep ? PAL.water2 : PAL.water3;
  rect(0, 0, T, T, base);
  for (let y = 0; y < T; y++) {
    for (let x = 0; x < T; x++) {
      const w = Math.sin((x + frame * 2.2) * 0.55 + y * 0.9) + Math.sin((x - y) * 0.4 + frame * 1.1);
      if (w > 1.15) px(x, y, mid);
    }
  }
  // Sparkle glints drift with the frame.
  const glints = [[3, 4], [11, 7], [6, 12], [14, 2], [8, 9]];
  for (let i = 0; i < 3; i++) {
    const [gx, gy] = glints[(i + frame) % glints.length];
    px(gx, gy, hi);
    px(gx + 1, gy, hi);
    px(gx + 2, gy, mid);
  }
  return c;
}

/** The dirt bank that rings every stretch of water. */
export function tileBank(v) {
  const { c, px, rect } = mk();
  rect(0, 0, T, T, PAL.bank1);
  speck(px, 211 + v, PAL.bank0, PAL.bank2, PAL.bank3, 0.24, 0.74, 0.93);
  return c;
}

export function tileCaveFloor(v) {
  const { c, px, rect } = mk();
  rect(0, 0, T, T, PAL.stone1);
  speck(px, 91 + v, PAL.stone0, PAL.stone2, PAL.stone3, 0.22, 0.80, 0.96);
  if (v % 2) {
    px(4, 7, PAL.stone0); px(5, 8, PAL.stone0); px(6, 8, PAL.stone0); px(7, 9, PAL.stone0);
    px(5, 7, PAL.stone2); px(6, 9, PAL.stone2);
  }
  return c;
}

export function tileCaveWall(v) {
  const { c, px, rect } = mk();
  rect(0, 0, T, T, PAL.stone0);
  speckle(px, 111 + v, '#3a3846', PAL.stone1, 0.2, 0.88);
  // rough block seams
  rect(0, 0, T, 1, '#2c2a36');
  rect(0, 15, T, 1, '#2c2a36');
  for (let y = 2; y < 15; y += 5) rect(((y * 3 + v * 5) % 12) + 1, y, 5, 1, '#3a3846');
  return c;
}

export function tileWood(v) {
  const { c, px, rect } = mk();
  const base = '#9a6a3c';
  const dark = '#6f4a26';
  const light = '#b98a52';
  rect(0, 0, T, T, base);
  // long horizontal boards, grain only — no vertical joints, or it reads as brick
  for (let y = 0; y < T; y++) {
    for (let x = 0; x < T; x++) {
      const h = hash2(Math.floor(x / 3), y, 131 + v);
      if (h < 0.22) px(x, y, mix(base, dark, 0.4));
      else if (h > 0.90) px(x, y, mix(base, light, 0.6));
    }
  }
  rect(0, 7, T, 1, dark);
  rect(0, 8, T, 1, light);
  rect(0, 15, T, 1, dark);
  rect(0, 0, T, 1, light);
  if (v % 2) rect(v * 3, 2, 6, 1, mix(base, dark, 0.25));
  return c;
}

export function tileCarpet(v) {
  const { c, rect, px } = mk();
  rect(0, 0, T, T, PAL.rug0);
  for (let y = 0; y < T; y++) {
    for (let x = 0; x < T; x++) {
      if ((x + y) % 4 === 0) px(x, y, PAL.rug1);
      else if (hash2(x, y, 220 + v) > 0.92) px(x, y, mix(PAL.rug1, PAL.rug2, 0.5));
    }
  }
  return c;
}

export function tileLabFloor(v) {
  const { c, rect, px } = mk();
  rect(0, 0, T, T, PAL.lab2);
  rect(0, 0, T, 1, PAL.lab3);
  rect(0, 0, 1, T, PAL.lab3);
  rect(0, 15, T, 1, PAL.lab1);
  rect(15, 0, 1, T, PAL.lab1);
  rect(7, 0, 1, T, mix(PAL.lab2, PAL.lab1, 0.5));
  rect(0, 7, T, 1, mix(PAL.lab2, PAL.lab1, 0.5));
  rect(8, 0, 1, T, PAL.lab3);
  rect(0, 8, T, 1, PAL.lab3);
  if (v === 1) { px(3, 3, PAL.lab1); px(11, 11, PAL.lab1); }
  return c;
}

export function tileIndoorWall(v) {
  const { c, rect, px } = mk();
  const base = '#e2d6b4';
  const shade = '#cfc09a';
  const hi = '#f2ead0';
  rect(0, 0, T, T, base);
  speckle(px, 151 + v, shade, hi, 0.05, 0.95);
  // small repeating wallpaper motif
  for (let y = 1; y < T; y += 6) {
    for (let x = (y % 12 === 1 ? 2 : 8); x < T; x += 12) {
      px(x, y, shade); px(x - 1, y + 1, shade); px(x + 1, y + 1, shade);
      px(x, y + 2, shade); px(x, y + 1, '#b8a882');
    }
  }
  rect(0, 0, T, 1, hi);
  return c;
}

/** Skirting board painted onto the bottom of a wall that meets a floor. */
export function wallSkirting(ctx, ox, oy) {
  ctx.fillStyle = PAL.wood1;
  ctx.fillRect(ox, oy + 11, T, 5);
  ctx.fillStyle = PAL.wood2;
  ctx.fillRect(ox, oy + 11, T, 1);
  ctx.fillStyle = PAL.wood0;
  ctx.fillRect(ox, oy + 15, T, 1);
}

export function tileBridge(v) {
  const { c, rect, px } = mk();
  const dark = '#7a5024';
  const mid = '#a8763c';
  const light = '#c99a58';
  const hi = '#e0bb7c';
  rect(0, 0, T, T, mid);
  for (let y = 0; y < T; y++) {
    for (let x = 0; x < T; x++) {
      const h = hash2(x, Math.floor(y / 4), 260 + v);
      if (h < 0.18) px(x, y, light);
      else if (h > 0.90) px(x, y, hi);
    }
  }
  // cross planks
  for (let y = 0; y < T; y += 4) {
    rect(0, y, T, 1, dark);
    rect(0, y + 1, T, 1, hi);
  }
  rect(0, 15, T, 1, dark);
  return c;
}

export function tileStairs() {
  const { c, rect } = mk();
  rect(0, 0, T, T, PAL.stone2);
  for (let y = 0; y < T; y += 4) {
    rect(0, y, T, 1, PAL.stone3);
    rect(0, y + 3, T, 1, PAL.stone0);
  }
  return c;
}

/**
 * The vertical face of a cliff — this is what sells the 2.5D elevation.
 * Tiles seamlessly downward, because the dark lip along the top of a cliff is
 * painted by the ground compositor and follows the warped edge, not the grid.
 */
export function tileCliffFace(v) {
  const { c, rect, px } = mk();
  rect(0, 0, T, T, PAL.bank1);
  speck(px, 171 + v, PAL.bank0, PAL.bank2, PAL.bank3, 0.22, 0.78, 0.94);
  // Erosion runs down a dirt face in vertical grooves. Full height, so a cliff
  // several tiles deep still reads as one continuous wall.
  for (let i = 0; i < 3; i++) {
    let x = (i * 5 + v * 3) % T;
    for (let y = 0; y < T; y++) {
      // let the groove wander a pixel now and then, or it reads as a fence
      if (hash2(i, y, 77 + v) > 0.76) x = (x + (hash2(i, y, 91) > 0.5 ? 1 : T - 1)) % T;
      px(x, y, PAL.bank0);
      px((x + 1) % T, y, PAL.bank2);
    }
  }
  // clumps of earth crossing the grooves
  for (let i = 0; i < 3; i++) {
    const x = Math.floor(hash2(i, 4, 63 + v) * T);
    const y = Math.floor(hash2(i, 5, 63 + v) * T);
    for (let k = 0; k < 3; k++) px((x + k) % T, y, PAL.bank3);
    for (let k = 0; k < 4; k++) px((x + k) % T, (y + 1) % T, PAL.bank0);
  }
  // stones poking out of the earth — warmed toward the dirt so they read as
  // part of the bank rather than as blue litter
  const st0 = mix(PAL.stone0, PAL.bank0, 0.45);
  const st1 = mix(PAL.stone2, PAL.bank2, 0.45);
  const st2 = mix(PAL.stone3, PAL.bank3, 0.35);
  for (let i = 0; i < 2; i++) {
    const x = 1 + Math.floor(hash2(i, 2, 55 + v) * (T - 3));
    const y = 2 + Math.floor(hash2(i, 3, 55 + v) * (T - 5));
    px(x, y, st1); px(x + 1, y, st2);
    px(x, y + 1, st0); px(x + 1, y + 1, st1);
  }
  return c;
}

/** A wooden ladder set into a cliff face. Tiles seamlessly downward. */
export function tileLadder(v) {
  const c = tileCliffFace(v);
  const g = c.getContext('2d');
  const rect = (x, y, w, h, col) => { g.fillStyle = col; g.fillRect(x, y, w, h); };
  rect(3, 0, 10, T, 'rgba(30,18,8,0.42)');   // the recess it sits in
  for (const rx of [4, 10]) {
    rect(rx, 0, 2, T, PAL.wood1);
    rect(rx, 0, 1, T, PAL.wood2);
  }
  for (let y = 1; y < T; y += 4) {           // rungs, periodic across tiles
    rect(4, y, 8, 1, PAL.wood3);
    rect(4, y + 1, 8, 1, PAL.wood0);
  }
  return c;
}

/** The two rail ends that poke above a ladder onto the cliff top. */
export function ladderHead(g, x, y) {
  for (const rx of [4, 10]) {
    g.fillStyle = PAL.wood0;
    g.fillRect(x + rx, y + T - 4, 2, 4);
    g.fillStyle = PAL.wood2;
    g.fillRect(x + rx, y + T - 4, 1, 4);
    g.fillStyle = PAL.wood3;
    g.fillRect(x + rx, y + T - 4, 2, 1);
  }
}

export function tileCliffTop(v) {
  const c = tileGrass(v + 2);
  const g = c.getContext('2d');
  g.fillStyle = 'rgba(20,16,30,0.22)';
  g.fillRect(0, 0, T, 3);
  return c;
}

/** Ledge: grass on top, a short lip you can hop down. */
export function tileLedge(v) {
  const { c, rect, px } = mk();
  rect(0, 0, T, 6, PAL.grass1);
  for (let x = 0; x < T; x++) {
    if (hash2(x, 3, 191 + v) < 0.3) px(x, 4, PAL.grass0);
    if (hash2(x, 1, 191 + v) > 0.8) px(x, 1, PAL.grass2);
  }
  rect(0, 6, T, 2, '#6a4c2c');
  rect(0, 8, T, 6, PAL.dirt1);
  for (let x = 0; x < T; x++) {
    if (hash2(x, 9, 201 + v) < 0.25) px(x, 9 + (x % 3), PAL.dirt0);
  }
  rect(0, 14, T, 2, PAL.dirt0);
  return c;
}

export function tileVoid() {
  const { c, rect } = mk();
  rect(0, 0, T, T, '#0d0d14');
  return c;
}

export function tileCounter(v) {
  const { c, rect } = mk();
  rect(0, 0, T, T, PAL.wood2);
  rect(0, 0, T, 3, PAL.wood3);
  rect(0, 13, T, 3, PAL.wood0);
  rect(0, 3, T, 1, mix(PAL.wood3, PAL.wood1, 0.5));
  return c;
}
