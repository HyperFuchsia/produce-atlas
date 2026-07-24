import type { Rng } from '../engine/rng';
import { makeObstacle, makePickup, type Obstacle, type Pickup } from './entities';

/**
 * The pattern library.
 *
 * Everything horizontal is authored in *seconds of travel* rather than metres
 * (`s2m` below). That is the single most important trick in the generator: as
 * Marcus accelerates from 10 to 25 m/s the course stretches with him, so a
 * "tight double barrier" stays exactly as tight — in the only unit the player
 * actually feels, which is time to react.
 *
 * Vertical distances stay in metres, because gravity does not scale.
 */

export interface ChunkCtx {
  rng: Rng;
  /** World x where the chunk starts. */
  x: number;
  /** 0..1 difficulty ramp. */
  d: number;
  /** Current run speed in m/s — the unit converter for all spacing. */
  speed: number;
}

export interface Chunk {
  obstacles: Obstacle[];
  pickups: Pickup[];
  gaps: { x0: number; x1: number }[];
  length: number;
}

export interface PatternDef {
  id: string;
  /** Minimum difficulty before this may appear. */
  minD: number;
  /** Relative selection weight at a given difficulty. */
  weight: (d: number) => number;
  /** Tags used to avoid repeating the same *kind* of demand back to back. */
  tags: string[];
  build: (ctx: ChunkCtx) => Chunk;
}

const s2m = (ctx: ChunkCtx, seconds: number): number => seconds * ctx.speed;

/** Shards along a jump arc, so the greedy line is also the correct line. */
const arcShards = (out: Pickup[], x0: number, x1: number, peak: number, count: number, floor = 0.9): void => {
  for (let i = 0; i < count; i++) {
    const t = count === 1 ? 0.5 : i / (count - 1);
    const x = x0 + (x1 - x0) * t;
    const y = floor + Math.sin(t * Math.PI) * (peak - floor);
    out.push(makePickup('shard', x, y));
  }
};

const lineShards = (out: Pickup[], x0: number, x1: number, y: number, count: number): void => {
  for (let i = 0; i < count; i++) {
    const t = count === 1 ? 0 : i / (count - 1);
    out.push(makePickup('shard', x0 + (x1 - x0) * t, y));
  }
};

// --------------------------------------------------------------------------
// Element builders — the vocabulary the patterns are written in.
// --------------------------------------------------------------------------

const barrier = (x: number, h = 1.15): Obstacle =>
  makeObstacle('barrier', x, 0, 1.0, h, { vaultable: true, standable: false });

const stack = (x: number, h = 1.95): Obstacle => makeObstacle('stack', x, 0, 1.5, h, { vaultable: h <= 1.5 });

const beam = (x: number, gap = 0.98): Obstacle => makeObstacle('beam', x, gap, 1.5, 3.4 - gap);

const panel = (x: number): Obstacle => makeObstacle('panel', x, 0, 0.45, 2.9, { breakable: true });

const drone = (x: number, y: number, amp = 0.5, period = 2.4, phase = 0): Obstacle =>
  makeObstacle('drone', x, y, 1.25, 0.95, { amp, period, phase });

const gate = (x: number, period = 1.7, phase = 0): Obstacle =>
  makeObstacle('gate', x, 0, 1.1, 1.15, { period, phase });

const pad = (x: number): Obstacle => makeObstacle('pad', x, 0, 1.8, 0.55, { standable: true });

const rail = (x: number, w: number, y = 2.9): Obstacle => makeObstacle('rail', x, y, w, 0.42, { standable: true });

const pylon = (x: number, h = 2.2): Obstacle => makeObstacle('pylon', x, 0, 0.55, h);

// --------------------------------------------------------------------------
// Patterns
// --------------------------------------------------------------------------

export const PATTERNS: PatternDef[] = [
  {
    id: 'breather',
    minD: 0,
    weight: (d) => 1.4 - d * 0.9,
    tags: ['rest'],
    build: (c) => {
      const len = s2m(c, c.rng.range(0.7, 1.1));
      const p: Pickup[] = [];
      lineShards(p, c.x + len * 0.2, c.x + len * 0.8, 1.05, 4);
      return { obstacles: [], pickups: p, gaps: [], length: len };
    },
  },
  {
    id: 'vault-single',
    minD: 0,
    weight: (d) => 2.2 - d * 0.8,
    tags: ['vault'],
    build: (c) => {
      const len = s2m(c, 0.95);
      const bx = c.x + len * 0.45;
      const o = [barrier(bx, c.rng.range(1.05, 1.3))];
      const p: Pickup[] = [];
      arcShards(p, bx - 1.6, bx + 3.4, 2.5, 5);
      return { obstacles: o, pickups: p, gaps: [], length: len };
    },
  },
  {
    id: 'vault-double',
    minD: 0.12,
    weight: (d) => 1.1 + d * 0.9,
    tags: ['vault'],
    build: (c) => {
      const step = s2m(c, c.rng.range(0.5, 0.62));
      const x0 = c.x + s2m(c, 0.4);
      const o = [barrier(x0), barrier(x0 + step, 1.25)];
      const p: Pickup[] = [];
      arcShards(p, x0 - 1.2, x0 + step + 2.4, 2.8, 6);
      return { obstacles: o, pickups: p, gaps: [], length: step + s2m(c, 0.9) };
    },
  },
  {
    id: 'vault-triple',
    minD: 0.4,
    weight: (d) => 0.4 + d * 1.3,
    tags: ['vault'],
    build: (c) => {
      const step = s2m(c, 0.46);
      const x0 = c.x + s2m(c, 0.36);
      const o = [barrier(x0, 1.1), barrier(x0 + step, 1.2), barrier(x0 + step * 2, 1.3)];
      const p: Pickup[] = [];
      arcShards(p, x0 - 1, x0 + step * 2 + 2.6, 3.1, 8);
      if (c.rng.bool(0.25)) p.push(makePickup('core', x0 + step, 3.4));
      return { obstacles: o, pickups: p, gaps: [], length: step * 2 + s2m(c, 0.85) };
    },
  },
  {
    id: 'slide-beam',
    minD: 0.05,
    weight: (d) => 1.9 + d * 0.4,
    tags: ['slide'],
    build: (c) => {
      const len = s2m(c, 1.0);
      const bx = c.x + len * 0.45;
      const o = [beam(bx, c.rng.range(0.92, 1.02))];
      const p: Pickup[] = [];
      lineShards(p, bx - 1.2, bx + 2.6, 0.42, 5);
      return { obstacles: o, pickups: p, gaps: [], length: len };
    },
  },
  {
    id: 'slide-tunnel',
    minD: 0.3,
    weight: (d) => 0.7 + d * 1.0,
    tags: ['slide'],
    build: (c) => {
      const step = s2m(c, 0.34);
      const x0 = c.x + s2m(c, 0.4);
      const n = c.rng.int(3, 4);
      const o: Obstacle[] = [];
      for (let i = 0; i < n; i++) o.push(beam(x0 + i * step, 0.95));
      const p: Pickup[] = [];
      lineShards(p, x0 - 1, x0 + step * (n - 1) + 1.4, 0.42, n + 3);
      return { obstacles: o, pickups: p, gaps: [], length: step * (n - 1) + s2m(c, 0.9) };
    },
  },
  {
    id: 'stack-jump',
    minD: 0.1,
    weight: (d) => 1.3 + d * 0.5,
    tags: ['jump'],
    build: (c) => {
      const len = s2m(c, 1.05);
      const sx = c.x + len * 0.45;
      const o = [stack(sx, c.rng.range(1.75, 2.05))];
      const p: Pickup[] = [];
      arcShards(p, sx - 2.6, sx + 4.2, 3.4, 6, 1.2);
      return { obstacles: o, pickups: p, gaps: [], length: len };
    },
  },
  {
    id: 'vault-then-slide',
    minD: 0.22,
    weight: (d) => 1.0 + d * 1.1,
    tags: ['mixed'],
    build: (c) => {
      const x0 = c.x + s2m(c, 0.38);
      const x1 = x0 + s2m(c, c.rng.range(0.58, 0.7));
      const o = [barrier(x0, 1.2), beam(x1, 0.95)];
      const p: Pickup[] = [];
      arcShards(p, x0 - 1.2, x0 + 3, 2.6, 4);
      lineShards(p, x1 - 0.8, x1 + 1.8, 0.42, 3);
      return { obstacles: o, pickups: p, gaps: [], length: x1 - c.x + s2m(c, 0.85) };
    },
  },
  {
    id: 'slide-then-vault',
    minD: 0.25,
    weight: (d) => 1.0 + d * 1.1,
    tags: ['mixed'],
    build: (c) => {
      const x0 = c.x + s2m(c, 0.38);
      const x1 = x0 + s2m(c, c.rng.range(0.6, 0.72));
      const o = [beam(x0, 0.95), barrier(x1, 1.25)];
      const p: Pickup[] = [];
      lineShards(p, x0 - 0.8, x0 + 1.6, 0.42, 3);
      arcShards(p, x1 - 1.4, x1 + 3, 2.7, 5);
      return { obstacles: o, pickups: p, gaps: [], length: x1 - c.x + s2m(c, 0.9) };
    },
  },
  {
    id: 'glass-dive',
    minD: 0.3,
    weight: (d) => 0.8 + d * 1.4,
    tags: ['dive'],
    build: (c) => {
      // A barrier gets you airborne; the panel rewards converting that into a dive.
      const x0 = c.x + s2m(c, 0.4);
      const x1 = x0 + s2m(c, c.rng.range(0.44, 0.54));
      const o = [barrier(x0, 1.15), panel(x1)];
      const p: Pickup[] = [];
      arcShards(p, x0 - 1, x0 + 2.4, 2.6, 4);
      lineShards(p, x1 + 1.2, x1 + 3.6, 0.6, 3);
      return { obstacles: o, pickups: p, gaps: [], length: x1 - c.x + s2m(c, 0.95) };
    },
  },
  {
    id: 'glass-wall',
    minD: 0.55,
    weight: (d) => 0.3 + d * 1.2,
    tags: ['dive'],
    build: (c) => {
      const x0 = c.x + s2m(c, 0.4);
      const x1 = x0 + s2m(c, 0.5);
      const x2 = x1 + s2m(c, 0.42);
      const o = [barrier(x0, 1.1), panel(x1), panel(x2)];
      const p: Pickup[] = [];
      arcShards(p, x0 - 1, x0 + 2.2, 2.5, 3);
      lineShards(p, x1 + 0.6, x2 + 2.4, 0.55, 4);
      p.push(makePickup('core', x2 + 3.4, 1.0));
      return { obstacles: o, pickups: p, gaps: [], length: x2 - c.x + s2m(c, 1.0) };
    },
  },
  {
    id: 'pit',
    minD: 0.18,
    weight: (d) => 1.1 + d * 0.6,
    tags: ['jump'],
    build: (c) => {
      const w = s2m(c, c.rng.range(0.3, 0.4));
      const x0 = c.x + s2m(c, 0.45);
      const p: Pickup[] = [];
      arcShards(p, x0 - 1, x0 + w + 1, 3.0, 6, 1.4);
      return { obstacles: [], pickups: p, gaps: [{ x0, x1: x0 + w }], length: w + s2m(c, 1.05) };
    },
  },
  {
    id: 'pit-barrier',
    minD: 0.45,
    weight: (d) => 0.4 + d * 1.2,
    tags: ['jump'],
    build: (c) => {
      const w = s2m(c, 0.34);
      const x0 = c.x + s2m(c, 0.45);
      const o = [barrier(x0 + w + s2m(c, 0.5), 1.2)];
      const p: Pickup[] = [];
      arcShards(p, x0 - 1, x0 + w + 1, 3.0, 5, 1.4);
      arcShards(p, o[0].x - 1.2, o[0].x + 2.6, 2.6, 4);
      return { obstacles: o, pickups: p, gaps: [{ x0, x1: x0 + w }], length: o[0].x - c.x + s2m(c, 0.95) };
    },
  },
  {
    id: 'pad-launch',
    minD: 0.25,
    weight: (d) => 0.8 + d * 0.5,
    tags: ['air'],
    build: (c) => {
      const px = c.x + s2m(c, 0.5);
      const w = s2m(c, c.rng.range(0.3, 0.4));
      const o = [pad(px)];
      const p: Pickup[] = [];
      arcShards(p, px + 1, px + w + 2, 5.4, 8, 1.6);
      p.push(makePickup('core', px + w * 0.5 + 1.5, 5.6));
      return {
        obstacles: o,
        pickups: p,
        gaps: [{ x0: px + 1.9, x1: px + 1.9 + w }],
        length: w + s2m(c, 1.4),
      };
    },
  },
  {
    id: 'skyrail',
    minD: 0.35,
    weight: (d) => 0.7 + d * 0.9,
    tags: ['air'],
    build: (c) => {
      const px = c.x + s2m(c, 0.45);
      const railX = px + s2m(c, 0.38);
      const railW = s2m(c, c.rng.range(0.75, 1.1));
      const o = [pad(px), rail(railX, railW, 3.0)];
      // Ground route stays open but is guarded, so the rail is the smart line.
      o.push(beam(railX + railW * 0.4, 0.95));
      const p: Pickup[] = [];
      lineShards(p, railX + 0.6, railX + railW - 0.6, 3.9, 7);
      return { obstacles: o, pickups: p, gaps: [], length: railX + railW - c.x + s2m(c, 1.1) };
    },
  },
  {
    id: 'drone-low',
    minD: 0.3,
    weight: (d) => 0.9 + d * 0.8,
    tags: ['slide'],
    build: (c) => {
      const x = c.x + s2m(c, 0.55);
      const o = [drone(x, 1.02, 0.45, c.rng.range(2.0, 2.8), c.rng.range(0, 6.28))];
      const p: Pickup[] = [];
      lineShards(p, x - 1.2, x + 2.4, 0.42, 4);
      return { obstacles: o, pickups: p, gaps: [], length: s2m(c, 1.25) };
    },
  },
  {
    id: 'drone-pair',
    minD: 0.5,
    weight: (d) => 0.35 + d * 1.1,
    tags: ['mixed'],
    build: (c) => {
      const x0 = c.x + s2m(c, 0.45);
      const x1 = x0 + s2m(c, 0.62);
      const o = [drone(x0, 1.02, 0.3, 2.2, 0), barrier(x1, 1.2)];
      const p: Pickup[] = [];
      lineShards(p, x0 - 1, x0 + 1.4, 0.42, 3);
      arcShards(p, x1 - 1.2, x1 + 2.8, 2.6, 4);
      return { obstacles: o, pickups: p, gaps: [], length: x1 - c.x + s2m(c, 0.95) };
    },
  },
  {
    id: 'plasma-gate',
    minD: 0.42,
    weight: (d) => 0.5 + d * 1.2,
    tags: ['rhythm'],
    build: (c) => {
      const x = c.x + s2m(c, 0.6);
      const o = [gate(x, c.rng.range(1.9, 2.5), c.rng.next())];
      const p: Pickup[] = [];
      arcShards(p, x - 1.4, x + 3, 2.4, 5, 0.6);
      return { obstacles: o, pickups: p, gaps: [], length: s2m(c, 1.35) };
    },
  },
  {
    id: 'plasma-run',
    minD: 0.65,
    weight: (d) => 0.25 + d * 1.3,
    tags: ['rhythm'],
    build: (c) => {
      const x0 = c.x + s2m(c, 0.5);
      const step = s2m(c, 0.6);
      const period = c.rng.range(2.0, 2.4);
      const o = [gate(x0, period, 0), gate(x0 + step, period, 0.5), gate(x0 + step * 2, period, 0)];
      const p: Pickup[] = [];
      arcShards(p, x0 - 1, x0 + step * 2 + 2, 2.2, 7, 0.6);
      return { obstacles: o, pickups: p, gaps: [], length: step * 2 + s2m(c, 1.1) };
    },
  },
  {
    id: 'pylon-row',
    minD: 0.55,
    weight: (d) => 0.3 + d * 1.0,
    tags: ['jump'],
    build: (c) => {
      // Each post is its own jump. A cluster tight enough to need one jump for
      // two posts leaves no legal place to land, so the spacing is always at
      // least a full airtime apart.
      const x0 = c.x + s2m(c, 0.42);
      const step = s2m(c, 0.95);
      const xs = [x0, x0 + step];
      if (c.d > 0.6) xs.push(x0 + step * 2);
      const o = xs.map((x) => pylon(x, c.rng.range(1.7, 2.0)));
      const p: Pickup[] = [];
      for (const x of xs) arcShards(p, x - 1.6, x + 1.6, 3.4, 3, 1.6);
      return { obstacles: o, pickups: p, gaps: [], length: xs[xs.length - 1] - c.x + s2m(c, 1.0) };
    },
  },
  {
    id: 'gauntlet',
    minD: 0.72,
    weight: (d) => (d < 0.72 ? 0 : d * 1.6),
    tags: ['finale'],
    build: (c) => {
      const x0 = c.x + s2m(c, 0.4);
      const a = x0;
      const b = a + s2m(c, 0.5);
      const cX = b + s2m(c, 0.5);
      const dX = cX + s2m(c, 0.52);
      const o = [barrier(a, 1.15), beam(b, 0.95), panel(cX), barrier(dX, 1.3)];
      const p: Pickup[] = [];
      arcShards(p, a - 1, a + 2, 2.5, 3);
      lineShards(p, b - 0.6, b + 1.4, 0.42, 3);
      lineShards(p, cX + 0.8, dX - 1.2, 0.9, 3);
      p.push(makePickup('core', dX + 3.2, 2.2));
      return { obstacles: o, pickups: p, gaps: [], length: dX - c.x + s2m(c, 1.05) };
    },
  },
  {
    id: 'supply-drop',
    minD: 0.15,
    weight: (d) => 0.55 + d * 0.1,
    tags: ['reward'],
    build: (c) => {
      const len = s2m(c, 1.25);
      const x = c.x + len * 0.5;
      const kind = c.rng.weighted(['magnet', 'shield', 'overdrive'] as const, (k) =>
        k === 'overdrive' ? 0.8 : k === 'shield' ? 1.0 : 1.2,
      );
      const p: Pickup[] = [makePickup(kind, x, 1.5)];
      lineShards(p, x - 3, x + 3, 1.5, 5);
      return { obstacles: [], pickups: p, gaps: [], length: len };
    },
  },
];

/** Convenience for tests and the spawner: patterns legal at a difficulty. */
export const patternsFor = (d: number): PatternDef[] => PATTERNS.filter((p) => d >= p.minD && p.weight(d) > 0);
