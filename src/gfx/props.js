import { makeCanvas } from '../core/screen.js';
import { PAL } from './palette.js';
import { makeSprite } from './pixel.js';
import { Sheet, ell, limb, poly, resolveSheet } from './monart.js';

// Overworld props use the same cel-shading engine as the creatures, so the whole
// game reads as one hand: hard tone bands, tinted outlines, no dithering.

const BARK = ['#2a1a0c', '#4a2e18', '#6b4524', '#8c5c30', '#ad7a44'];
const LEAF = ['#0e3016', '#1a5220', '#28742c', '#3f9a38', '#63bd4c'];
const LEAF_B = ['#0b2a13', '#17471c', '#236627', '#378a32', '#57ac43'];
const ROCK = ['#25232f', '#3d3a4c', '#5b5670', '#807a96', '#a9a3bc'];
const POT = ['#4a2414', '#7a3c20', '#a85c34', '#c47a4c', '#dc9a6c'];
const BLOOM_Y = ['#8a6a10', '#c0a020', '#e8cc38', '#f8e470', '#fff8b8'];
const BLOOM_R = ['#6d1f3c', '#a3355e', '#cc5a86', '#e88bad', '#ffc3d8'];
const BLOOM_W = ['#8a8aa0', '#c0c0d4', '#e0e0ee', '#f4f4fb', '#ffffff'];

function mk(w, h) {
  const c = makeCanvas(w, h);
  const g = c.getContext('2d');
  const rect = (x, y, w2, h2, col) => {
    g.fillStyle = col;
    g.fillRect(x, y, w2, h2);
  };
  return { c, g, rect };
}

function shadow(g, cx, cy, rx, ry) {
  g.fillStyle = 'rgba(18,14,26,0.26)';
  for (let y = -ry; y <= ry; y++) {
    const w = Math.floor(rx * Math.sqrt(Math.max(0, 1 - (y / ry) ** 2)));
    if (w <= 0) continue;
    g.fillRect(Math.round(cx - w), Math.round(cy + y), w * 2, 1);
  }
}

/** Build a cel-shaded sprite from a list of shapes, with a ground shadow. */
function celSprite(w, h, shapes, shadowSpec) {
  const s = new Sheet(w, h);
  shapes.forEach((sh, i) => {
    if (sh.t === 'ell') ell(s, i, sh.pal, sh);
    else if (sh.t === 'limb') limb(s, i, sh.pal, sh);
    else if (sh.t === 'poly') poly(s, i, sh.pal, sh);
  });
  const art = resolveSheet(s);
  const out = makeCanvas(w, h);
  const g = out.getContext('2d');
  if (shadowSpec) shadow(g, shadowSpec[0], shadowSpec[1], shadowSpec[2], shadowSpec[3]);
  g.drawImage(art, 0, 0);
  return out;
}

// ---------------------------------------------------------------------------
export function makeTree(variant = 0) {
  const leaf = variant % 2 ? LEAF_B : LEAF;
  const shapes = [
    { t: 'limb', x1: 17, y1: 41, r1: 5, x2: 17, y2: 24, r2: 3.6, pal: BARK },
    { t: 'ell', x: 12, y: 41, rx: 5, ry: 3, n: 2.4, pal: BARK },
    { t: 'ell', x: 22, y: 41, rx: 5, ry: 3, n: 2.4, pal: BARK },
    { t: 'ell', x: 17, y: 18, rx: 16, ry: 12, n: 2.4, pal: leaf },
    { t: 'ell', x: 7, y: 20, rx: 7, ry: 6, n: 2.2, pal: leaf },
    { t: 'ell', x: 27, y: 21, rx: 7, ry: 6, n: 2.2, pal: leaf },
    { t: 'ell', x: 12, y: 10, rx: 8, ry: 6.5, n: 2.2, pal: leaf },
    { t: 'ell', x: 23, y: 11, rx: 7.5, ry: 6, n: 2.2, pal: leaf },
    { t: 'ell', x: 17, y: 25, rx: 12, ry: 6, n: 2.4, pal: leaf },
  ];
  const c = celSprite(34, 46, shapes, [17, 42, 12, 4]);
  return { c, ox: -1, oy: -28, fw: 2, fh: 1, solid: true };
}

export function makeSmallTree(variant = 0) {
  const leaf = variant % 2 ? LEAF_B : LEAF;
  const shapes = [
    { t: 'limb', x1: 12, y1: 30, r1: 3.6, x2: 12, y2: 19, r2: 2.8, pal: BARK },
    { t: 'ell', x: 8, y: 30, rx: 3.6, ry: 2.4, n: 2.4, pal: BARK },
    { t: 'ell', x: 16, y: 30, rx: 3.6, ry: 2.4, n: 2.4, pal: BARK },
    { t: 'ell', x: 12, y: 14, rx: 11, ry: 9, n: 2.4, pal: leaf },
    { t: 'ell', x: 6, y: 15, rx: 5, ry: 4.5, n: 2.2, pal: leaf },
    { t: 'ell', x: 18, y: 16, rx: 5, ry: 4.5, n: 2.2, pal: leaf },
    { t: 'ell', x: 12, y: 8, rx: 6, ry: 5, n: 2.2, pal: leaf },
    { t: 'ell', x: 12, y: 19, rx: 8.5, ry: 4.5, n: 2.4, pal: leaf },
  ];
  const c = celSprite(24, 34, shapes, [12, 31, 8, 3]);
  return { c, ox: 0, oy: -18, fw: 1, fh: 1, solid: true };
}

export function makeBush(variant = 0) {
  const leaf = variant % 2 ? LEAF_B : LEAF;
  const shapes = [
    { t: 'ell', x: 8, y: 13, rx: 8, ry: 6, n: 2.4, pal: leaf },
    { t: 'ell', x: 4, y: 10, rx: 4.5, ry: 4, n: 2.2, pal: leaf },
    { t: 'ell', x: 11, y: 9, rx: 5, ry: 4.5, n: 2.2, pal: leaf },
  ];
  const c = celSprite(16, 20, shapes, [8, 17, 6, 2]);
  return { c, ox: 0, oy: -4, fw: 1, fh: 1, solid: true };
}

export function makeRock() {
  const shapes = [
    { t: 'ell', x: 8, y: 11, rx: 7.5, ry: 5.5, n: 3, pal: ROCK },
    { t: 'ell', x: 5, y: 8, rx: 4, ry: 3.5, n: 2.6, pal: ROCK },
    { t: 'ell', x: 11, y: 9, rx: 3.5, ry: 3, n: 2.6, pal: ROCK },
  ];
  const c = celSprite(16, 18, shapes, [8, 15, 7, 2]);
  return { c, ox: 0, oy: -2, fw: 1, fh: 1, solid: true };
}

export function makeStump() {
  const top = ['#3a2410', '#6b4524', '#8c5c30', '#ad7a44', '#c9975e'];
  const shapes = [
    { t: 'ell', x: 8, y: 11, rx: 6, ry: 4.5, n: 3, pal: BARK },
    { t: 'ell', x: 8, y: 7, rx: 5.5, ry: 3, n: 2.6, pal: top },
  ];
  const c = celSprite(16, 16, shapes, [8, 14, 6, 2]);
  return { c, ox: 0, oy: 0, fw: 1, fh: 1, solid: true };
}

export function makePlant() {
  const shapes = [
    { t: 'ell', x: 8, y: 20, rx: 5.5, ry: 4.5, n: 3.4, pal: POT },
    { t: 'ell', x: 8, y: 11, rx: 7, ry: 6.5, n: 2.2, pal: LEAF },
    { t: 'ell', x: 4, y: 8, rx: 4, ry: 3.5, n: 2.2, pal: LEAF },
    { t: 'ell', x: 12, y: 9, rx: 4, ry: 3.5, n: 2.2, pal: LEAF },
  ];
  const c = celSprite(16, 26, shapes, [8, 23, 6, 2]);
  return { c, ox: 0, oy: -10, fw: 1, fh: 1, solid: true };
}

export function makeCaveMouth() {
  const shapes = [
    { t: 'ell', x: 24, y: 30, rx: 24, ry: 17, n: 2.6, pal: ROCK },
    { t: 'ell', x: 10, y: 20, rx: 11, ry: 9, n: 2.4, pal: ROCK },
    { t: 'ell', x: 38, y: 21, rx: 11, ry: 9, n: 2.4, pal: ROCK },
    { t: 'ell', x: 24, y: 16, rx: 12, ry: 8, n: 2.4, pal: ROCK },
  ];
  const c = celSprite(48, 46, shapes, null);
  const g = c.getContext('2d');
  g.fillStyle = '#0d0a16';
  for (let y = 0; y < 20; y++) {
    const w = Math.round(11 * Math.sqrt(Math.max(0, 1 - ((y - 20) / 20) ** 2)));
    g.fillRect(24 - w, 26 + y, w * 2, 1);
  }
  g.fillStyle = '#1d1830';
  g.fillRect(13, 26, 22, 1);
  return { c, ox: -8, oy: -30, fw: 2, fh: 1, solid: true };
}

export function makeFlowerPatch() {
  const shapes = [{ t: 'ell', x: 8, y: 8, rx: 7.5, ry: 4, n: 2.4, pal: LEAF }];
  const c = celSprite(16, 12, shapes, null);
  const g = c.getContext('2d');
  const put = (x, y, pal) => {
    g.fillStyle = pal[1];
    g.fillRect(x - 1, y, 3, 1);
    g.fillRect(x, y - 1, 1, 3);
    g.fillStyle = pal[3];
    g.fillRect(x, y, 1, 1);
  };
  put(3, 5, BLOOM_Y);
  put(9, 3, BLOOM_R);
  put(12, 7, BLOOM_W);
  put(6, 8, BLOOM_R);
  return { c, ox: 0, oy: 0, fw: 1, fh: 1, solid: false };
}

// ---------------------------------------------------------------------------
// Geometric props stay hand-drawn — straight edges want exact pixels.

const SIGN_ART = [
  '................',
  '...oooooooooo...',
  '..oHHHHHHHHHHo..',
  '..oHwwwwwwwwHo..',
  '..oHwddwwddwHo..',
  '..oHwwwwwwwwHo..',
  '..oHwddwwddwHo..',
  '..oHwwwwwwwwHo..',
  '..oHHHHHHHHHHo..',
  '...oooooooooo...',
  '......oBbo......',
  '......oBbo......',
  '......oBbo......',
  '.....oooooo.....',
  '................',
  '................',
];
const SIGN_PAL = {
  o: '#2a1a0c', H: '#8c5c30', w: '#c9975e', d: '#6b4524', B: '#8c5c30', b: '#4a2e18',
};

export function makeSign() {
  const art = makeSprite(SIGN_ART, SIGN_PAL);
  const out = mk(16, 20);
  shadow(out.g, 8, 17, 5, 2);
  out.g.drawImage(art, 0, 2);
  return { c: out.c, ox: 0, oy: -4, fw: 1, fh: 1, solid: true };
}

export function makeFence(vertical = false) {
  const { c, rect } = mk(16, 16);
  const post = (x) => {
    rect(x, 2, 4, 13, '#4a2e18');
    rect(x, 2, 3, 13, '#6b4524');
    rect(x, 2, 1, 13, '#8c5c30');
    rect(x, 2, 4, 1, '#ad7a44');
  };
  if (!vertical) {
    rect(0, 5, 16, 3, '#4a2e18');
    rect(0, 5, 16, 1, '#8c5c30');
    rect(0, 10, 16, 3, '#4a2e18');
    rect(0, 10, 16, 1, '#8c5c30');
    post(2);
    post(10);
  } else {
    rect(5, 0, 3, 16, '#4a2e18');
    rect(5, 0, 1, 16, '#8c5c30');
    rect(10, 0, 3, 16, '#4a2e18');
    rect(10, 0, 1, 16, '#8c5c30');
    rect(3, 3, 10, 3, '#6b4524');
    rect(3, 3, 10, 1, '#ad7a44');
    rect(3, 10, 10, 3, '#6b4524');
    rect(3, 10, 10, 1, '#ad7a44');
  }
  return { c, ox: 0, oy: 0, fw: 1, fh: 1, solid: true };
}

const ORB_PAL = ['#4a2600', '#8a5410', '#c88a1c', '#e8b53c', '#ffe28a'];
const BAND_PAL = ['#3a2a08', '#7a6018', '#b09030', '#d8bc60', '#f8e8a8'];

/** The capture orb: an amber sphere held in a banded ring. */
export function orbSprite() {
  const s = new Sheet(16, 16);
  ell(s, 0, ORB_PAL, { x: 8, y: 8, rx: 6.6, ry: 6.6, n: 2 });
  const art = resolveSheet(s);
  const g = art.getContext('2d');
  // ring wrapping the sphere, drawn as a shallow arc so it reads as 3D
  for (let x = 1; x <= 14; x++) {
    const t = (x - 7.5) / 7;
    if (Math.abs(t) > 1) continue;
    const bulge = Math.sqrt(Math.max(0, 1 - t * t));
    const y = Math.round(8 + bulge * 2.2);
    g.fillStyle = BAND_PAL[1];
    g.fillRect(x, y, 1, 2);
    g.fillStyle = BAND_PAL[3];
    g.fillRect(x, y, 1, 1);
  }
  g.fillStyle = BAND_PAL[0];
  g.fillRect(6, 4, 4, 1);
  g.fillStyle = BAND_PAL[2];
  g.fillRect(6, 3, 4, 1);
  g.fillStyle = '#ffffff';
  g.fillRect(5, 4, 2, 1);
  g.fillRect(5, 5, 1, 1);
  return art;
}

export function makeOrbItem() {
  const out = mk(16, 18);
  shadow(out.g, 8, 15, 5, 2);
  out.g.drawImage(orbSprite(), 0, -1);
  return { c: out.c, ox: 0, oy: -2, fw: 1, fh: 1, solid: false };
}

// ---- interior furniture ----------------------------------------------------
const W0 = '#3a2414';
const W1 = '#6b4524';
const W2 = '#8c5c30';
const W3 = '#b5824c';

export function makeTable(w = 2) {
  const W = w * 16;
  const { c, g, rect } = mk(W, 24);
  shadow(g, W / 2, 21, W / 2 - 2, 3);
  rect(2, 14, 3, 6, W0);
  rect(W - 5, 14, 3, 6, W0);
  rect(0, 4, W, 11, W1);
  rect(0, 4, W, 2, W3);
  rect(0, 6, W, 1, W2);
  rect(0, 13, W, 2, W0);
  return { c, ox: 0, oy: -8, fw: w, fh: 1, solid: true };
}

export function makeChair(dir = 0) {
  const { c, g, rect } = mk(16, 20);
  shadow(g, 8, 18, 5, 2);
  if (dir === 1) { rect(3, 1, 10, 8, W1); rect(3, 1, 10, 1, W3); rect(3, 8, 10, 1, W0); }
  rect(3, 8, 10, 6, W2);
  rect(3, 8, 10, 1, W3);
  rect(3, 13, 10, 2, W0);
  if (dir !== 1) { rect(3, 14, 10, 4, W1); rect(3, 14, 10, 1, W2); }
  rect(4, 15, 2, 4, W0);
  rect(10, 15, 2, 4, W0);
  return { c, ox: 0, oy: -4, fw: 1, fh: 1, solid: true };
}

export function makeBed() {
  const { c, rect } = mk(16, 32);
  rect(1, 0, 14, 32, W1);
  rect(1, 0, 14, 2, W3);
  rect(1, 30, 14, 2, W0);
  rect(2, 2, 12, 10, '#d8d0e8');
  rect(3, 3, 10, 8, '#f4f0ff');
  rect(3, 3, 10, 2, '#ffffff');
  rect(2, 12, 12, 18, '#3f5fa8');
  rect(2, 12, 12, 2, '#6a8ad8');
  rect(2, 28, 12, 2, '#2c4278');
  rect(4, 17, 8, 1, '#6a8ad8');
  rect(4, 23, 8, 1, '#6a8ad8');
  return { c, ox: 0, oy: -16, fw: 1, fh: 2, solid: true };
}

export function makeBookshelf() {
  const { c, rect } = mk(16, 28);
  rect(0, 0, 16, 28, W0);
  rect(1, 1, 14, 26, W1);
  rect(1, 1, 14, 1, W2);
  const cols = ['#b83c3c', '#3c7ab8', '#c09028', '#4a9a52', '#8a5cb0'];
  for (let sh = 0; sh < 3; sh++) {
    const y = 3 + sh * 8;
    rect(1, y + 6, 14, 2, W0);
    rect(1, y + 6, 14, 1, W2);
    for (let i = 0; i < 6; i++) {
      const h = 4 + ((i * 3 + sh * 5) % 3);
      rect(2 + i * 2, y + 6 - h, 2, h, cols[(i + sh * 2) % cols.length]);
    }
  }
  return { c, ox: 0, oy: -12, fw: 1, fh: 1, solid: true };
}

export function makeTV() {
  const { c, g, rect } = mk(16, 20);
  shadow(g, 8, 18, 6, 2);
  rect(1, 3, 14, 13, '#22222c');
  rect(1, 3, 14, 1, '#4a4a58');
  rect(2, 5, 12, 9, '#2c4a6a');
  rect(3, 6, 10, 7, '#6ab0e0');
  rect(3, 6, 6, 3, '#b8e4f8');
  rect(5, 16, 6, 3, '#16161e');
  return { c, ox: 0, oy: -4, fw: 1, fh: 1, solid: true };
}

export function makeHealMachine() {
  const { c, g, rect } = mk(32, 30);
  shadow(g, 16, 27, 14, 3);
  rect(0, 8, 32, 18, '#a8b0c4');
  rect(0, 8, 32, 2, '#e0e6f0');
  rect(0, 10, 32, 1, '#c4ccdc');
  rect(0, 24, 32, 3, '#6a7288');
  rect(2, 12, 28, 9, '#2f3648');
  for (let i = 0; i < 3; i++) {
    rect(5 + i * 9, 14, 6, 5, '#e0608c');
    rect(6 + i * 9, 15, 4, 3, '#ffb0cc');
    rect(6 + i * 9, 15, 2, 1, '#ffe0ec');
  }
  rect(4, 0, 24, 8, '#8d95aa');
  rect(4, 0, 24, 1, '#d0d8e8');
  rect(5, 1, 22, 6, '#242c40');
  rect(7, 2, 6, 3, '#5ce0a0');
  rect(15, 2, 10, 3, '#5ca8e0');
  return { c, ox: 0, oy: -14, fw: 2, fh: 1, solid: true };
}

export function makeLabDesk() {
  const { c, g, rect } = mk(32, 26);
  shadow(g, 16, 23, 14, 3);
  rect(3, 20, 3, 4, '#6a7288');
  rect(26, 20, 3, 4, '#6a7288');
  rect(0, 6, 32, 14, '#a8b0c4');
  rect(0, 6, 32, 2, '#e0e6f0');
  rect(0, 18, 32, 2, '#6a7288');
  rect(6, 1, 4, 5, '#8fd8e8');
  rect(5, 3, 6, 3, '#4fbcd4');
  rect(5, 3, 2, 1, '#d8f8ff');
  rect(20, 2, 3, 4, '#c8e8a0');
  rect(19, 4, 5, 2, '#8ec860');
  return { c, ox: 0, oy: -10, fw: 2, fh: 1, solid: true };
}

export function makeCounterProp(w = 3) {
  const W = w * 16;
  const { c, g, rect } = mk(W, 22);
  shadow(g, W / 2, 20, W / 2 - 2, 2);
  rect(0, 4, W, 12, W1);
  rect(0, 4, W, 2, W3);
  rect(0, 14, W, 3, W0);
  return { c, ox: 0, oy: -6, fw: w, fh: 1, solid: true };
}

export function makeCrate() {
  const { c, g, rect } = mk(16, 20);
  shadow(g, 8, 18, 6, 2);
  rect(1, 4, 14, 14, W1);
  rect(1, 4, 14, 2, W3);
  rect(1, 16, 14, 2, W0);
  rect(1, 10, 14, 2, W0);
  rect(7, 4, 2, 14, W0);
  rect(1, 4, 1, 14, W2);
  return { c, ox: 0, oy: -4, fw: 1, fh: 1, solid: true };
}

/** Interior doorway drawn on the wall the player exits through. */
export function makeDoorway() {
  const { c, rect } = mk(16, 18);
  rect(0, 0, 16, 18, '#2a1c10');
  rect(1, 2, 14, 16, W0);
  rect(2, 3, 12, 15, '#1d1522');
  rect(2, 3, 12, 2, W1);
  rect(1, 2, 1, 16, W2);
  rect(14, 2, 1, 16, W0);
  rect(3, 14, 10, 4, '#302638');
  return { c, ox: 0, oy: -2, fw: 1, fh: 1, solid: false };
}

export function makeWarpMat() {
  const { c, rect } = mk(16, 16);
  rect(0, 2, 16, 12, '#3c3c4a');
  rect(1, 3, 14, 10, '#7e7e94');
  rect(2, 4, 12, 8, '#b0b0c4');
  rect(2, 4, 12, 1, '#d0d0e0');
  rect(4, 6, 8, 4, '#5e5e74');
  return { c, ox: 0, oy: 0, fw: 1, fh: 1, solid: false };
}

export function makeLedgeMarker() {
  const { c, rect } = mk(16, 8);
  rect(0, 0, 16, 2, '#6a4c2c');
  rect(0, 2, 16, 4, PAL.dirt1);
  rect(0, 6, 16, 2, PAL.dirt0);
  return { c, ox: 0, oy: 0, fw: 1, fh: 1, solid: false };
}
