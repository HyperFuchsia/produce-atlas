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
  '~': { mat: 'water', art: null, water: true, solid: true },
  '=': { mat: 'water', art: null, water: true, deep: true, solid: true },
  '#': { mat: 'cave', art: variants(T.tileCaveFloor), encounter: true },
  'X': { mat: 'cave', art: variants(T.tileCaveWall), solid: true },
  'w': { mat: 'wood', art: variants(T.tileWood) },
  'c': { mat: 'wood', art: variants(T.tileCarpet) },
  'L': { mat: 'lab', art: variants(T.tileLabFloor) },
  'W': { mat: 'wall', art: variants(T.tileIndoorWall), solid: true },
  'B': { mat: 'wood', art: variants(T.tileBridge) },
  'S': { mat: 'stone', art: variants(() => T.tileStairs()), stairs: true },
  'l': { mat: 'grass', art: variants(T.tileLedge), ledge: 0 /* hop DOWN */ },
  'F': { mat: 'dirt', art: variants(T.tileCliffFace), solid: true },
  'T': { mat: 'grass', art: variants(T.tileCliffTop) },
  'K': { mat: 'wood', art: variants(T.tileCounter), solid: true },
  ' ': { mat: 'void', art: variants(() => T.tileVoid()), solid: true },
};

const BLEND = {
  grass: PAL.grass1,
  path: PAL.dirt1,
  sand: PAL.sand1,
  water: PAL.foam,
  cave: PAL.stone1,
  wood: PAL.floor1,
  lab: PAL.lab2,
  stone: PAL.stone2,
};

// Which materials bleed onto which. [from][to] = true means a `from` neighbour
// paints a dithered band on the `to` tile.
const BLEND_RULES = {
  grass: { path: true, sand: true, cave: true, stone: true },
  path: { sand: true },
  sand: { path: true },
  water: { sand: true, path: true, grass: true },
};

const water4 = [T.tileWater(0), T.tileWater(1), T.tileWater(2), T.tileWater(3)];
const deep4 = [T.tileWater(0, true), T.tileWater(1, true), T.tileWater(2, true), T.tileWater(3, true)];

export function waterTile(deep, frame) {
  return (deep ? deep4 : water4)[frame & 3];
}

// ---------------------------------------------------------------------------
// Props. `fw`/`fh` are the collision footprint in tiles; `ox`/`oy` shift the
// sprite so tall art rises above its footprint.
const PROP_BUILDERS = {
  'T': () => PR.makeTree(0),
  'Y': () => PR.makeTree(1),
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
function ditherBand(g, tx, ty, side, color, depth = 3) {
  g.fillStyle = color;
  for (let i = 0; i < depth; i++) {
    // Thinning checkerboard: solid nearest the edge, sparse further in.
    const density = 1 - i / depth;
    for (let j = 0; j < TILE; j++) {
      const keep = ((j + i) % 2 === 0) ? density > 0.25 : density > 0.66;
      if (!keep) continue;
      let x;
      let y;
      if (side === 0) { x = tx * TILE + j; y = ty * TILE + TILE - 1 - i; }      // from below
      else if (side === 1) { x = tx * TILE + j; y = ty * TILE + i; }            // from above
      else if (side === 2) { x = tx * TILE + i; y = ty * TILE + j; }            // from left
      else { x = tx * TILE + TILE - 1 - i; y = ty * TILE + j; }                 // from right
      g.fillRect(x, y, 1, 1);
    }
  }
}

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

  const canvas = makeCanvas(w * TILE, h * TILE);
  const g = canvas.getContext('2d');
  g.imageSmoothingEnabled = false;

  // base pass
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const ch = map.at(x, y);
      const t = TILES[ch] || TILES['.'];
      if (t.water) {
        map.waterTiles.push({ x, y, deep: !!t.deep });
      } else if (t.art) {
        const v = Math.floor(hash2(x, y, 7) * V) % V;
        g.drawImage(t.art[v], x * TILE, y * TILE);
      }
      const i = y * w + x;
      if (t.solid) map.solid[i] = 1;
      if (t.encounter) map.encounter[i] = 1;
      if (t.tall) map.tallgrass[i] = 1;
      if (t.ledge !== undefined) map.ledge[i] = t.ledge;
    }
  }

  // dithered material transitions
  const NB = [[0, 1, 0], [0, -1, 1], [-1, 0, 2], [1, 0, 3]];
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const t = TILES[map.at(x, y)] || TILES['.'];
      if (t.water || !t.art) continue;
      for (const [dx, dy, side] of NB) {
        const nt = TILES[map.at(x + dx, y + dy)];
        if (!nt || nt.mat === t.mat) continue;
        if (!(BLEND_RULES[nt.mat] && BLEND_RULES[nt.mat][t.mat])) continue;
        ditherBand(g, x, y, side, BLEND[nt.mat], nt.mat === 'water' ? 2 : 3);
      }
    }
  }

  // skirting where an interior wall meets the floor
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const here = TILES[map.at(x, y)];
      const below = TILES[map.at(x, y + 1)];
      if (here && here.mat === 'wall' && below && below.mat !== 'wall' && below.mat !== 'void') {
        wallSkirting(g, x * TILE, y * TILE);
      }
    }
  }

  // soft drop shadow under solid walls / cliffs so elevation reads
  g.fillStyle = 'rgba(16,12,24,0.20)';
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const above = TILES[map.at(x, y - 1)];
      const here = TILES[map.at(x, y)];
      if (above && above.solid && above.mat !== 'void' && here && !here.solid) {
        g.fillRect(x * TILE, y * TILE, TILE, 3);
      }
    }
  }

  map.groundCanvas = canvas;

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
