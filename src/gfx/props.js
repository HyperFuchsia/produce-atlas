import { makeCanvas } from '../core/screen.js';
import { PAL } from './palette.js';
import { hash2 } from './pixel.js';
import { makeSprite } from './pixel.js';

const BAYER = [
  [0, 8, 2, 10],
  [12, 4, 14, 6],
  [3, 11, 1, 9],
  [15, 7, 13, 5],
];

function mk(w, h) {
  const c = makeCanvas(w, h);
  const g = c.getContext('2d');
  const px = (x, y, col) => {
    if (x < 0 || y < 0 || x >= w || y >= h) return;
    g.fillStyle = col;
    g.fillRect(x, y, 1, 1);
  };
  const rect = (x, y, w2, h2, col) => {
    g.fillStyle = col;
    g.fillRect(x, y, w2, h2);
  };
  return { c, g, px, rect };
}

/**
 * Dithered lit blob — the workhorse for organic props (canopies, rocks, bushes).
 * `cols` runs dark→light; cols[0] is used for the rim.
 */
function blob(px, cx, cy, rx, ry, cols, seed, opts = {}) {
  const lightX = opts.lightX ?? -0.55;
  const lightY = opts.lightY ?? -0.85;
  const wob = opts.wobble ?? 0.10;
  const x0 = Math.floor(cx - rx - 1);
  const x1 = Math.ceil(cx + rx + 1);
  const y0 = Math.floor(cy - ry - 1);
  const y1 = Math.ceil(cy + ry + 1);
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      const nx = (x + 0.5 - cx) / rx;
      const ny = (y + 0.5 - cy) / ry;
      const n = hash2(x, y, seed);
      const d = nx * nx + ny * ny + (n - 0.5) * wob;
      if (d > 1) continue;
      if (d > 0.80) { px(x, y, cols[0]); continue; }
      let lum = nx * lightX + ny * lightY;         // -1..1, higher = lit
      lum = lum * 0.5 + 0.5;
      lum += ((BAYER[y & 3][x & 3] + 0.5) / 16 - 0.5) * 0.22;
      lum += (n - 0.5) * 0.16;
      const band = Math.min(cols.length - 1, Math.max(1, Math.floor(lum * (cols.length - 1)) + 1));
      px(x, y, cols[band]);
    }
  }
}

function dropShadow(g, cx, cy, rx, ry) {
  g.fillStyle = 'rgba(18,14,26,0.26)';
  for (let y = -ry; y <= ry; y++) {
    const w = Math.floor(rx * Math.sqrt(Math.max(0, 1 - (y / ry) ** 2)));
    if (w <= 0) continue;
    g.fillRect(Math.round(cx - w), Math.round(cy + y), w * 2, 1);
  }
}

const LEAF = ['#14361f', PAL.leaf0, PAL.leaf1, PAL.leaf2, PAL.leaf3];
const ROCK = ['#3a3846', PAL.stone0, PAL.stone1, PAL.stone2, PAL.stone3];

// ---------------------------------------------------------------------------
export function makeTree(variant = 0) {
  const W = 32;
  const H = 40;
  const { c, g, px, rect } = mk(W, H);
  dropShadow(g, 16, 36, 12, 4);
  // trunk
  rect(13, 22, 6, 13, PAL.bark0);
  rect(14, 22, 4, 13, PAL.bark1);
  rect(14, 22, 2, 13, PAL.bark2);
  for (let y = 24; y < 34; y += 3) { px(17, y, PAL.bark0); px(15, y + 1, PAL.bark0); }
  rect(11, 34, 10, 2, PAL.bark0);
  // canopy: one big mass plus offset clumps for an irregular silhouette
  const s = 200 + variant * 37;
  blob(px, 16, 15, 15, 12, LEAF, s);
  blob(px, 8 + (variant % 2), 12, 8, 7, LEAF, s + 5);
  blob(px, 24 - (variant % 2), 14, 8, 7, LEAF, s + 9);
  blob(px, 16, 7, 9, 6, LEAF, s + 13);
  blob(px, 16, 22, 12, 6, LEAF, s + 17);
  // a few bright leaf specks catching the light
  for (let i = 0; i < 7; i++) {
    const a = hash2(i, variant, 77) * Math.PI * 2;
    const r = 0.35 + hash2(i, variant, 88) * 0.4;
    px(Math.round(16 + Math.cos(a) * 13 * r), Math.round(14 + Math.sin(a) * 10 * r), '#7fd06a');
  }
  return { c, ox: 0, oy: -24, fw: 2, fh: 1, solid: true };
}

export function makeBush(variant = 0) {
  const { c, g, px } = mk(16, 20);
  dropShadow(g, 8, 17, 6, 2);
  blob(px, 8, 10, 7, 6, LEAF, 300 + variant * 11);
  blob(px, 5, 8, 4, 4, LEAF, 305 + variant);
  blob(px, 11, 9, 4, 4, LEAF, 309 + variant);
  return { c, ox: 0, oy: -4, fw: 1, fh: 1, solid: true };
}

export function makeRock(variant = 0) {
  const { c, g, px } = mk(16, 18);
  dropShadow(g, 8, 15, 7, 2);
  blob(px, 8, 10, 7, 5, ROCK, 400 + variant * 13, { wobble: 0.16 });
  blob(px, 5, 8, 3, 3, ROCK, 404 + variant);
  return { c, ox: 0, oy: -2, fw: 1, fh: 1, solid: true };
}

export function makeStump() {
  const { c, g, rect } = mk(16, 16);
  dropShadow(g, 8, 14, 6, 2);
  rect(4, 6, 8, 8, PAL.bark0);
  rect(5, 5, 6, 8, PAL.bark1);
  rect(5, 5, 6, 2, PAL.bark2);
  rect(7, 6, 2, 1, PAL.dirt2);
  return { c, ox: 0, oy: 0, fw: 1, fh: 1, solid: true };
}

const SIGN_ART = [
  '................',
  '....oooooooo....',
  '...ohhhhhhhho...',
  '...ohwwwwwwho...',
  '...ohwddwddwho..',
  '...ohwwwwwwho...',
  '...ohwddwddwho..',
  '...ohwwwwwwho...',
  '...ohhhhhhhho...',
  '....oooooooo....',
  '...... obo......',
  '......obbo......',
  '......obbo......',
  '......obbo......',
  '.....oooooo.....',
  '................',
];
const SIGN_PAL = { o: '#3a2414', h: PAL.wood2, w: PAL.wood3, d: '#6b4a28', b: PAL.wood1 };

export function makeSign() {
  const c = makeSprite(SIGN_ART, SIGN_PAL);
  const g = c.getContext('2d');
  const out = mk(16, 20);
  dropShadow(out.g, 8, 17, 5, 2);
  out.g.drawImage(c, 0, 2);
  return { c: out.c, ox: 0, oy: -4, fw: 1, fh: 1, solid: true };
}

export function makeFence(vertical = false) {
  const { c, rect } = mk(16, 16);
  if (!vertical) {
    rect(0, 6, 16, 2, PAL.wood1);
    rect(0, 6, 16, 1, PAL.wood3);
    rect(0, 11, 16, 2, PAL.wood1);
    rect(0, 11, 16, 1, PAL.wood3);
    rect(3, 3, 3, 12, PAL.wood0);
    rect(3, 3, 1, 12, PAL.wood2);
    rect(11, 3, 3, 12, PAL.wood0);
    rect(11, 3, 1, 12, PAL.wood2);
  } else {
    rect(6, 0, 2, 16, PAL.wood1);
    rect(6, 0, 1, 16, PAL.wood3);
    rect(11, 0, 2, 16, PAL.wood1);
    rect(4, 3, 8, 3, PAL.wood0);
    rect(4, 3, 8, 1, PAL.wood2);
    rect(4, 11, 8, 3, PAL.wood0);
    rect(4, 11, 8, 1, PAL.wood2);
  }
  return { c, ox: 0, oy: 0, fw: 1, fh: 1, solid: true };
}

const ORB_ART = [
  '................',
  '................',
  '.....oooooo.....',
  '...oohhaaaaoo...',
  '..ohhaaaaaaAAo..',
  '.ohaaaaaaaaAAAo.',
  '.oaaaaaaaaaAAAo.',
  '.oOOOOOOOOOOOOo.',
  '.obbbbbbbbbbbbo.',
  '.oOOOOOOOOOOOOo.',
  '.owwwwwwwwwSSSo.',
  '..owwwwwwwwSSo..',
  '...oowwwwwSSoo..',
  '.....oooooo.....',
  '................',
  '................',
];
const ORB_PAL = {
  o: '#241a12', h: '#ffe6a0', a: '#e8a838', A: '#a85c14',
  O: '#1a120c', b: '#584434', w: '#f4e8cc', S: '#c0aa84',
};

/** The capture orb, used both as a ground pickup and in the throw animation. */
export function orbSprite() {
  return makeSprite(ORB_ART, ORB_PAL);
}

export function makeOrbItem() {
  const out = mk(16, 18);
  dropShadow(out.g, 8, 15, 5, 2);
  out.g.drawImage(orbSprite(), 0, -1);
  return { c: out.c, ox: 0, oy: -2, fw: 1, fh: 1, solid: false };
}

export function makeLedgeMarker() {
  const { c, rect } = mk(16, 8);
  rect(0, 0, 16, 2, '#6a4c2c');
  rect(0, 2, 16, 4, PAL.dirt1);
  rect(0, 6, 16, 2, PAL.dirt0);
  return { c, ox: 0, oy: 0, fw: 1, fh: 1, solid: false };
}

// ---- interior furniture ----------------------------------------------------
export function makeTable(w = 2) {
  const W = w * 16;
  const { c, g, rect } = mk(W, 24);
  dropShadow(g, W / 2, 21, W / 2 - 2, 3);
  rect(0, 4, W, 10, PAL.wood1);
  rect(0, 4, W, 2, PAL.wood3);
  rect(0, 12, W, 2, PAL.wood0);
  rect(2, 14, 3, 6, PAL.wood0);
  rect(W - 5, 14, 3, 6, PAL.wood0);
  return { c, ox: 0, oy: -8, fw: w, fh: 1, solid: true };
}

export function makeChair(dir = 0) {
  const { c, g, rect } = mk(16, 20);
  dropShadow(g, 8, 18, 5, 2);
  rect(3, 8, 10, 6, PAL.wood2);
  rect(3, 8, 10, 1, PAL.wood3);
  rect(3, 13, 10, 2, PAL.wood0);
  if (dir === 1) rect(3, 2, 10, 6, PAL.wood1);
  else rect(3, 14, 10, 4, PAL.wood1);
  rect(4, 15, 2, 4, PAL.wood0);
  rect(10, 15, 2, 4, PAL.wood0);
  return { c, ox: 0, oy: -4, fw: 1, fh: 1, solid: true };
}

export function makeBed() {
  const { c, rect } = mk(16, 32);
  rect(1, 0, 14, 32, PAL.wood1);
  rect(1, 0, 14, 2, PAL.wood3);
  rect(2, 2, 12, 10, '#e8e0f0');
  rect(3, 3, 10, 8, '#f8f4ff');
  rect(2, 12, 12, 18, '#5878c8');
  rect(2, 12, 12, 2, '#7a9ce8');
  rect(2, 28, 12, 2, '#3a58a0');
  rect(4, 16, 8, 1, '#7a9ce8');
  rect(4, 22, 8, 1, '#7a9ce8');
  return { c, ox: 0, oy: -16, fw: 1, fh: 2, solid: true };
}

export function makeBookshelf() {
  const { c, rect } = mk(16, 28);
  rect(0, 0, 16, 28, PAL.wood0);
  rect(1, 1, 14, 26, PAL.wood1);
  const cols = ['#c04848', '#48a0c0', '#c0a048', '#70b060', '#a070c0'];
  for (let s = 0; s < 3; s++) {
    const y = 3 + s * 8;
    rect(1, y + 6, 14, 2, PAL.wood0);
    for (let i = 0; i < 6; i++) {
      const h = 4 + ((i + s) % 3);
      rect(2 + i * 2, y + 6 - h, 2, h, cols[(i + s * 2) % cols.length]);
    }
  }
  return { c, ox: 0, oy: -12, fw: 1, fh: 1, solid: true };
}

export function makePlant() {
  const { c, g, px, rect } = mk(16, 26);
  dropShadow(g, 8, 23, 6, 2);
  rect(4, 16, 8, 7, '#a05838');
  rect(4, 16, 8, 2, '#c07850');
  rect(4, 22, 8, 1, '#703820');
  blob(px, 8, 10, 7, 7, LEAF, 512);
  blob(px, 5, 7, 4, 4, LEAF, 517);
  blob(px, 11, 8, 4, 4, LEAF, 521);
  return { c, ox: 0, oy: -10, fw: 1, fh: 1, solid: true };
}

export function makeTV() {
  const { c, rect } = mk(16, 20);
  rect(1, 4, 14, 12, '#2a2a34');
  rect(2, 5, 12, 9, '#4a6a8a');
  rect(3, 6, 10, 7, '#8ac0e0');
  rect(3, 6, 5, 3, '#c8e8f8');
  rect(5, 16, 6, 3, '#1a1a24');
  return { c, ox: 0, oy: -4, fw: 1, fh: 1, solid: true };
}

export function makeHealMachine() {
  const { c, g, rect } = mk(32, 30);
  dropShadow(g, 16, 27, 14, 3);
  rect(0, 8, 32, 18, PAL.lab1);
  rect(0, 8, 32, 2, PAL.lab3);
  rect(0, 24, 32, 3, PAL.lab0);
  rect(2, 12, 28, 9, '#3a4258');
  for (let i = 0; i < 3; i++) {
    rect(5 + i * 9, 14, 6, 5, '#e8709c');
    rect(6 + i * 9, 15, 4, 3, '#ffc0d8');
  }
  rect(4, 0, 24, 8, PAL.lab0);
  rect(5, 1, 22, 6, '#2a3248');
  rect(7, 2, 6, 3, '#70e0a0');
  rect(15, 2, 10, 3, '#70b0e0');
  return { c, ox: 0, oy: -14, fw: 2, fh: 1, solid: true };
}

export function makeLabDesk() {
  const { c, g, rect } = mk(32, 26);
  dropShadow(g, 16, 23, 14, 3);
  rect(0, 6, 32, 14, PAL.lab1);
  rect(0, 6, 32, 2, PAL.lab3);
  rect(0, 18, 32, 2, PAL.lab0);
  rect(3, 20, 3, 4, PAL.lab0);
  rect(26, 20, 3, 4, PAL.lab0);
  // glassware
  rect(6, 1, 4, 5, '#8fd8e8');
  rect(5, 3, 6, 3, '#6ac0d8');
  rect(20, 2, 3, 4, '#c8e8a0');
  rect(19, 4, 5, 2, '#a0d070');
  return { c, ox: 0, oy: -10, fw: 2, fh: 1, solid: true };
}

export function makeCounterProp(w = 3) {
  const W = w * 16;
  const { c, g, rect } = mk(W, 22);
  dropShadow(g, W / 2, 20, W / 2 - 2, 2);
  rect(0, 4, W, 12, PAL.wood1);
  rect(0, 4, W, 2, PAL.wood3);
  rect(0, 14, W, 3, PAL.wood0);
  rect(0, 17, W, 2, PAL.wood0);
  return { c, ox: 0, oy: -6, fw: w, fh: 1, solid: true };
}

export function makeCrate() {
  const { c, g, rect } = mk(16, 20);
  dropShadow(g, 8, 18, 6, 2);
  rect(1, 4, 14, 14, PAL.wood1);
  rect(1, 4, 14, 2, PAL.wood3);
  rect(1, 16, 14, 2, PAL.wood0);
  rect(1, 10, 14, 2, PAL.wood0);
  rect(7, 4, 2, 14, PAL.wood0);
  return { c, ox: 0, oy: -4, fw: 1, fh: 1, solid: true };
}

export function makeCaveMouth() {
  const { c, g, px, rect } = mk(48, 44);
  blob(px, 24, 26, 24, 18, ROCK, 900, { wobble: 0.14 });
  blob(px, 12, 18, 11, 9, ROCK, 906);
  blob(px, 36, 20, 11, 9, ROCK, 911);
  // dark mouth
  g.fillStyle = '#100c18';
  g.beginPath();
  g.ellipse(24, 34, 10, 12, 0, Math.PI, 0);
  g.fill();
  g.fillRect(14, 34, 20, 10);
  rect(14, 22, 20, 1, '#241c30');
  return { c, ox: -8, oy: -28, fw: 2, fh: 1, solid: true };
}

/** Interior doorway drawn on the wall the player exits through. */
export function makeDoorway() {
  const { c, rect } = mk(16, 18);
  rect(0, 0, 16, 18, '#2a1c10');
  rect(1, 2, 14, 16, PAL.wood0);
  rect(2, 3, 12, 15, '#241a14');
  rect(2, 3, 12, 2, PAL.wood1);
  rect(1, 2, 1, 16, PAL.wood2);
  rect(14, 2, 1, 16, PAL.wood0);
  rect(3, 14, 10, 4, '#3a2c22');
  return { c, ox: 0, oy: -2, fw: 1, fh: 1, solid: false };
}

export function makeWarpMat() {
  const { c, rect } = mk(16, 16);
  rect(0, 2, 16, 12, '#4a4a5a');
  rect(1, 3, 14, 10, '#8a8aa0');
  rect(2, 4, 12, 8, '#b8b8cc');
  rect(4, 6, 8, 4, '#6a6a80');
  return { c, ox: 0, oy: 0, fw: 1, fh: 1, solid: false };
}

export function makeFlowerPatch() {
  const { c, px } = mk(16, 12);
  blob(px, 8, 7, 7, 4, LEAF, 611);
  const cols = ['#f0d048', '#e04868', '#f8f8f8'];
  for (let i = 0; i < 5; i++) {
    const x = 2 + ((i * 5 + 3) % 12);
    const y = 3 + ((i * 3) % 6);
    px(x, y, cols[i % 3]);
    px(x + 1, y, cols[i % 3]);
    px(x, y + 1, cols[i % 3]);
  }
  return { c, ox: 0, oy: 0, fw: 1, fh: 1, solid: false };
}
