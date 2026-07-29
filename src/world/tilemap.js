import { makeCanvas } from '../core/screen.js';
import { TILE } from '../core/const.js';
import { PAL } from '../gfx/palette.js';
import { hash2 } from '../gfx/pixel.js';
import * as T from '../gfx/terrain.js';
import { wallSkirting } from '../gfx/terrain.js';
import * as PR from '../gfx/props.js';
import { makeBuilding, BUILDING_PRESETS } from '../gfx/buildings.js';

// ---------------------------------------------------------------------------
// Tile definitions. `mat` drives the dithered edge blending in the pre-render.
const V = 4; // variants per tile

function variants(fn) {
  const out = [];
  for (let i = 0; i < V; i++) out.push(fn(i));
  return out;
}

export const TILES = {
  '.': { mat: 'grass', art: variants(T.tileGrass) },
  ',': { mat: 'grass', art: variants(T.tileFlowers) },
  '"': { mat: 'grass', art: variants(T.tileTallGrass), encounter: true, tall: true },
  ':': { mat: 'path', art: variants(T.tilePath) },
  '_': { mat: 'sand', art: variants(T.tileSand) },
  '~': { mat: 'water', art: [0, 1, 2, 3].map((f) => T.tileWater(f)), water: true, solid: true },
  '=': { mat: 'water', art: [0, 1, 2, 3].map((f) => T.tileWater(f, true)), water: true, deep: true, solid: true },
  'b': { mat: 'bank', art: variants(T.tileBank) },
  '#': { mat: 'cave', art: variants(T.tileCaveFloor), encounter: true },
  'X': { mat: 'cave', art: variants(T.tileCaveWall), solid: true },
  'w': { mat: 'wood', art: variants(T.tileWood) },
  'c': { mat: 'wood', art: variants(T.tileCarpet) },
  'L': { mat: 'lab', art: variants(T.tileLabFloor) },
  'W': { mat: 'wall', art: variants(T.tileIndoorWall), solid: true },
  'B': { mat: 'wood', art: variants(T.tileBridge) },
  'S': { mat: 'stone', art: variants(() => T.tileStairs()), stairs: true },
  'l': { mat: 'grass', art: variants(T.tileLedge), ledge: 0 /* hop DOWN */ },
  'F': { mat: 'dirt', art: variants(T.tileCliffFace), solid: true, cliff: true },
  'A': { mat: 'ladder', art: variants(T.tileLadder), cliff: true, ladder: true },
  'T': { mat: 'grass', art: variants(T.tileCliffTop) },
  'K': { mat: 'wood', art: variants(T.tileCounter), solid: true },
  ' ': { mat: 'void', art: variants(() => T.tileVoid()), solid: true },
};

// Materials whose borders should wander. Architecture (walls, floors, bridges,
// counters) keeps its straight tile edges; ground does not.
const ORGANIC = new Set(['grass', 'path', 'sand', 'water', 'cave', 'dirt', 'bank']);

/** Smooth value noise, bilinear over a coarse grid. */
function vnoise(x, y, seed, cell) {
  const gx = Math.floor(x / cell);
  const gy = Math.floor(y / cell);
  const fx = x / cell - gx;
  const fy = y / cell - gy;
  const u = fx * fx * (3 - 2 * fx);
  const v = fy * fy * (3 - 2 * fy);
  const a = hash2(gx, gy, seed);
  const b = hash2(gx + 1, gy, seed);
  const c = hash2(gx, gy + 1, seed);
  const d = hash2(gx + 1, gy + 1, seed);
  return (a * (1 - u) + b * u) * (1 - v) + (c * (1 - u) + d * u) * v;
}

/** Two octaves of warp: broad curves plus a fine ragged fringe. */
function warpAt(x, y, seed) {
  return (vnoise(x, y, seed, 11) - 0.5) * 7 + (vnoise(x, y, seed + 91, 4) - 0.5) * 3;
}

const pixCache = new Map();
function tilePixels(ch, v) {
  const key = `${ch}:${v}`;
  if (!pixCache.has(key)) {
    const t = TILES[ch] || TILES['.'];
    const art = t.art[v % t.art.length];
    pixCache.set(key, art.getContext('2d').getImageData(0, 0, TILE, TILE).data);
  }
  return pixCache.get(key);
}

const BANK_CHAR = 'b';

const hasCliff = (def) => def.ground.some((row) => /[FA]/.test(row));

/**
 * Composite the ground for one water frame.
 *
 * Instead of stamping tiles on a grid, every output pixel looks up which
 * material it belongs to at a *warped* position. Straight tile boundaries
 * become the wandering, hand-drawn edges the style wants — one pass, and it
 * applies to grass/path, grass/sand and every shoreline at once.
 */
function composeGround(def, w, h, waterFrame) {
  const W = w * TILE;
  const H = h * TILE;
  const at = (x, y) => (x < 0 || y < 0 || x >= w || y >= h ? ' ' : def.ground[y][x]);
  const src = new Int32Array(W * H);       // which tile each pixel samples
  const isWater = new Uint8Array(W * H);

  for (let py = 0; py < H; py++) {
    for (let px = 0; px < W; px++) {
      const tx = px >> 4;
      const ty = py >> 4;
      const ch0 = at(tx, ty);
      const t0 = TILES[ch0] || TILES['.'];
      let sx = tx;
      let sy = ty;
      if (ORGANIC.has(t0.mat)) {
        const wx = px + warpAt(px, py, 7);
        const wy = py + warpAt(px, py, 23);
        const nx = Math.floor(wx / TILE);
        const ny = Math.floor(wy / TILE);
        const t1 = TILES[at(nx, ny)];
        if (t1 && ORGANIC.has(t1.mat)) { sx = nx; sy = ny; }
      }
      const i = py * W + px;
      src[i] = sy * w + sx;
      if ((TILES[at(sx, sy)] || {}).water) isWater[i] = 1;
    }
  }

  // Ring every stretch of water with a dirt bank, following the warped edge.
  const bank = new Uint8Array(W * H);
  const R = 3;
  for (let py = 0; py < H; py++) {
    for (let px = 0; px < W; px++) {
      const i = py * W + px;
      if (isWater[i]) continue;
      let near = false;
      for (let dy = -R; dy <= R && !near; dy++) {
        const yy = py + dy;
        if (yy < 0 || yy >= H) continue;
        for (let dx = -R; dx <= R; dx++) {
          const xx = px + dx;
          if (xx < 0 || xx >= W) continue;
          if (isWater[yy * W + xx]) { near = true; break; }
        }
      }
      if (near) bank[i] = 1;
    }
  }

  const canvas = makeCanvas(W, H);
  const g = canvas.getContext('2d');
  const img = g.createImageData(W, H);
  const out = img.data;
  const isCliff = new Uint8Array(W * H);
  for (let py = 0; py < H; py++) {
    for (let px = 0; px < W; px++) {
      const i = py * W + px;
      const st = src[i];
      const sx = st % w;
      const sy = (st / w) | 0;
      const ch = bank[i] ? BANK_CHAR : at(sx, sy);
      const t = TILES[ch] || TILES['.'];
      if (t.cliff) isCliff[i] = 1;
      const v = t.water ? waterFrame : Math.floor(hash2(sx, sy, 7) * 4) % t.art.length;
      const tex = tilePixels(ch, v);
      const o = ((py & 15) * TILE + (px & 15)) * 4;
      const d = i * 4;
      // Broad, slow tonal drift across open ground so a meadow is never one
      // flat green. Architecture is left alone.
      let k = 1;
      if (ORGANIC.has(t.mat) && !t.water) {
        k = 0.90 + vnoise(px, py, 51, 30) * 0.20 + (vnoise(px, py, 77, 13) - 0.5) * 0.06;
      }
      out[d] = Math.min(255, tex[o] * k);
      out[d + 1] = Math.min(255, tex[o + 1] * k);
      out[d + 2] = Math.min(255, tex[o + 2] * k);
      out[d + 3] = tex[o + 3];
    }
  }
  // Shade cliffs by how far each pixel sits from the top and bottom of its own
  // run. That gives the dark overhang lip, a face that lifts toward the light,
  // and a shadow pooling at the foot — all following the warped edge rather
  // than the tile grid, which is what makes the elevation read.
  if (hasCliff(def)) {
    const dTop = new Uint8Array(W * H);
    const dBot = new Uint8Array(W * H);
    for (let py = 0; py < H; py++) {
      for (let px = 0; px < W; px++) {
        const i = py * W + px;
        if (isCliff[i]) dTop[i] = py > 0 && isCliff[i - W] ? Math.min(255, dTop[i - W] + 1) : 0;
      }
    }
    for (let py = H - 1; py >= 0; py--) {
      for (let px = 0; px < W; px++) {
        const i = py * W + px;
        if (isCliff[i]) dBot[i] = py < H - 1 && isCliff[i + W] ? Math.min(255, dBot[i + W] + 1) : 0;
      }
    }
    const TOP = [0.44, 0.60, 0.78, 0.90];
    const BOT = [0.72, 0.84, 0.94];
    for (let py = 0; py < H; py++) {
      for (let px = 0; px < W; px++) {
        const i = py * W + px;
        const d = i * 4;
        if (isCliff[i]) {
          const t = dTop[i];
          const f = (t < TOP.length ? TOP[t] : Math.min(1.08, 0.90 + (t - 3) * 0.012)) *
                    (dBot[i] < BOT.length ? BOT[dBot[i]] : 1);
          out[d] *= f; out[d + 1] *= f; out[d + 2] *= f;
        } else if (py > 0 && isCliff[i - W]) {
          // the ground at the foot of a cliff sits in its shadow
          for (let k = 0; k < 3 && py + k < H; k++) {
            const j = i + k * W;
            if (isCliff[j]) break;
            const s = 0.70 + k * 0.10;
            const e = j * 4;
            out[e] *= s; out[e + 1] *= s; out[e + 2] *= s;
          }
        } else if (py < H - 1 && isCliff[i + W]) {
          // ...and the grass on the rim above catches the sun
          out[d] = Math.min(255, out[d] * 1.16);
          out[d + 1] = Math.min(255, out[d + 1] * 1.16);
          out[d + 2] = Math.min(255, out[d + 2] * 1.16);
        }
      }
    }
  }
  g.putImageData(img, 0, 0);

  // rail ends poking above a ladder, so it reads as leaning on the cliff top
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const t = TILES[at(x, y)];
      if (t && t.ladder && !(TILES[at(x, y - 1)] || {}).ladder) {
        T.ladderHead(g, x * TILE, (y - 1) * TILE);
      }
    }
  }

  // skirting where an interior wall meets the floor
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const here = TILES[at(x, y)];
      const below = TILES[at(x, y + 1)];
      if (here && here.mat === 'wall' && below && below.mat !== 'wall' && below.mat !== 'void') {
        wallSkirting(g, x * TILE, y * TILE);
      }
    }
  }
  // soft drop shadow under solid walls / cliffs so elevation reads
  g.fillStyle = 'rgba(16,12,24,0.20)';
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const above = TILES[at(x, y - 1)];
      const here = TILES[at(x, y)];
      if (above && above.cliff) continue;   // cliffs cast their own warped shadow
      if (above && above.solid && above.mat !== 'void' && here && !here.solid) {
        g.fillRect(x * TILE, y * TILE, TILE, 3);
      }
    }
  }
  return canvas;
}

// ---------------------------------------------------------------------------
// Props. `fw`/`fh` are the collision footprint in tiles; `ox`/`oy` shift the
// sprite so tall art rises above its footprint.
const PROP_BUILDERS = {
  'T': () => PR.makeTree(0),
  'Y': () => PR.makeTree(1),
  'y': () => PR.makeSmallTree(0),
  'u': () => PR.makeSmallTree(1),
  't': () => PR.makeBush(0),
  'r': () => PR.makeRock(0),
  's': () => PR.makeSign(),
  'f': () => PR.makeFence(false),
  'F': () => PR.makeFence(true),
  'o': () => PR.makeOrbItem(),
  'p': () => PR.makeFlowerPatch(),
  'm': () => PR.makeCaveMouth(),
  '-': () => PR.makeStump(),
  'b': () => PR.makeBed(),
  'k': () => PR.makeBookshelf(),
  'l': () => PR.makePlant(),
  'v': () => PR.makeTV(),
  'h': () => PR.makeHealMachine(),
  'd': () => PR.makeLabDesk(),
  'a': () => PR.makeTable(2),
  'c': () => PR.makeChair(1),
  'C': () => PR.makeChair(0),
  'x': () => PR.makeCrate(),
  'M': () => PR.makeWarpMat(),
  'D': () => PR.makeDoorway(),
  'N': () => PR.makeCounterProp(3),
};

const propCache = new Map();
export function getProp(ch) {
  if (!propCache.has(ch)) {
    const b = PROP_BUILDERS[ch];
    propCache.set(ch, b ? b() : null);
  }
  return propCache.get(ch);
}

const buildingCache = new Map();
export function getBuilding(type) {
  if (!buildingCache.has(type)) {
    const preset = BUILDING_PRESETS[type] || BUILDING_PRESETS.house_red;
    buildingCache.set(type, makeBuilding(preset));
  }
  return buildingCache.get(type);
}

// ---------------------------------------------------------------------------
/**
 * Build the runtime representation of a map: pre-rendered ground, collision
 * grid, and a y-sortable list of props/buildings.
 */
export function buildMap(def) {
  const h = def.ground.length;
  const w = def.ground[0].length;
  const map = {
    def,
    id: def.id,
    name: def.name,
    w,
    h,
    music: def.music,
    indoor: !!def.indoor,
    dark: def.dark || 0,
    tint: def.tint || null,
    ground: def.ground,
    solid: new Uint8Array(w * h),
    tallgrass: new Uint8Array(w * h),
    ledge: new Int8Array(w * h).fill(-1),
    encounter: new Uint8Array(w * h),
    objects: [],
    waterTiles: [],
    warps: def.warps || [],
    signs: def.signs || [],
    npcs: [],
    items: def.items || [],
    encounters: def.encounters || null,
    onEnter: def.onEnter || null,
  };
  map.at = (x, y) => (x < 0 || y < 0 || x >= w || y >= h ? ' ' : def.ground[y][x]);
  map.solidAt = (x, y) => (x < 0 || y < 0 || x >= w || y >= h ? 1 : map.solid[y * w + x]);

  // Pre-render the ground. Maps with water get one frame per water phase so the
  // shoreline can stay organic instead of being overdrawn by square tiles.
  const hasWater = def.ground.some((row) => /[~=]/.test(row));
  map.groundFrames = [];
  for (let f = 0; f < (hasWater ? 4 : 1); f++) {
    map.groundFrames.push(composeGround(def, w, h, f));
  }

  // collision / encounter / ledge flags still come straight from the grid
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const t = TILES[map.at(x, y)] || TILES['.'];
      const i = y * w + x;
      if (t.solid) map.solid[i] = 1;
      if (t.encounter) map.encounter[i] = 1;
      if (t.tall) map.tallgrass[i] = 1;
      if (t.ledge !== undefined) map.ledge[i] = t.ledge;
    }
  }

  map.groundCanvas = map.groundFrames[0];

  // ---- objects ----
  if (def.objs) {
    for (let y = 0; y < def.objs.length; y++) {
      const row = def.objs[y];
      for (let x = 0; x < row.length; x++) {
        const ch = row[x];
        if (ch === '.' || ch === ' ') continue;
        const p = getProp(ch);
        if (!p) continue;
        map.objects.push({
          kind: 'prop', ch, x, y,
          sprite: p.c,
          ox: p.ox, oy: p.oy,
          fw: p.fw, fh: p.fh,
          sortY: (y + p.fh - 1) * TILE + TILE,
        });
        if (p.solid) {
          for (let fy = 0; fy < p.fh; fy++) {
            for (let fx = 0; fx < p.fw; fx++) {
              const i = (y + fy) * w + (x + fx);
              if (i >= 0 && i < map.solid.length) map.solid[i] = 1;
            }
          }
        }
      }
    }
  }

  for (const s of def.structures || []) {
    const b = getBuilding(s.type);
    map.objects.push({
      kind: 'building', x: s.x, y: s.y,
      sprite: b.c, ox: b.ox, oy: b.oy,
      fw: b.fw, fh: b.fh,
      sortY: (s.y + b.fh - 1) * TILE + TILE,
    });
    for (let fy = 0; fy < b.fh; fy++) {
      for (let fx = 0; fx < b.fw; fx++) {
        const i = (s.y + fy) * w + (s.x + fx);
        if (i >= 0 && i < map.solid.length) map.solid[i] = 1;
      }
    }
  }

  map.objects.sort((a, b2) => a.sortY - b2.sortY);
  return map;
}
