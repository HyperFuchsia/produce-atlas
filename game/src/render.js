// render.js — draws the world.
//
// Two palettes, one geometry. Flipping the phase does not move a single cube; it inverts the
// tonal order of the whole scene — pale specimens on Prussian blue become ink on glaucous —
// and swaps which phase-dependent blocks are present. Keeping the geometry fixed across the
// inversion is what lets a player read the flip as "the same place, differently improved"
// rather than as a new level.

import {
  basis, project, depth, visibleFaces, cube, ease, lerp, angleDelta, rgb, mix, mixa, tinta, TAU,
} from './gfx.js';
import { T_AIR, T_ROCK, T_WILD, T_CULT, terrainAt } from './sim.js';

export const PITCH = 0.6155; // atan(1/√2) — true isometric elevation
export const YAW0 = Math.PI / 4;

const PALETTE = {
  wild: {
    void: rgb('#08203a'), void2: rgb('#0c2b4b'),
    rock: rgb('#dcecf4'), mat: rgb('#3e7c87'),
    seam: rgb('#08203a'), ink: rgb('#dcecf4'),
  },
  cult: {
    void: rgb('#8c9e8a'), void2: rgb('#7c8e7b'),
    rock: rgb('#1f2620'), mat: rgb('#b4762f'),
    seam: rgb('#8c9e8a'), ink: rgb('#1b221b'),
  },
};

const SEED = rgb('#e9b44c');
const COURIER = rgb('#c4483c');
const PLOT = rgb('#2fa08c');

export function makeView() {
  return {
    yaw: YAW0, yawTarget: YAW0, yawStep: 0,
    phaseMix: 0, phaseTarget: 0,
    scale: 40, ox: 0, oy: 0,
    shake: 0,
  };
}

export function stepView(view, dt) {
  const dy = angleDelta(view.yaw, view.yawTarget);
  view.yaw += dy * Math.min(1, dt * 9);
  if (Math.abs(angleDelta(view.yaw, view.yawTarget)) < 0.001) view.yaw = view.yawTarget;

  const dp = view.phaseTarget - view.phaseMix;
  view.phaseMix += dp * Math.min(1, dt * 11);
  if (Math.abs(view.phaseTarget - view.phaseMix) < 0.002) view.phaseMix = view.phaseTarget;

  view.shake = Math.max(0, view.shake - dt * 3.4);
}

/** Fit the level's bounding box into the canvas at the current yaw. */
function fit(view, level, W, H) {
  const b = basis(view.yaw, PITCH);
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;

  for (const x of [-0.5, level.w - 0.5]) {
    for (const y of [-0.5, level.h - 0.5]) {
      for (const z of [-0.5, level.d - 0.5]) {
        const p = project({ x, y, z }, b, 1, 0, 0);
        minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x);
        minY = Math.min(minY, p.y); maxY = Math.max(maxY, p.y);
      }
    }
  }

  const pad = Math.min(W, H) * 0.11;
  const scale = Math.min((W - pad * 2) / (maxX - minX), (H - pad * 2) / (maxY - minY));

  // On a tall screen the touch pad and the specimen label own the lower third, so the board
  // is lifted out from under them rather than being centred into them.
  const lift = H > W * 1.2 ? -0.09 : 0;

  view.scale = scale;
  view.ox = W / 2 - ((minX + maxX) / 2) * scale;
  view.oy = H / 2 - ((minY + maxY) / 2) * scale + H * lift;
  return b;
}

export function render(ctx, canvas, state, view, ent) {
  const W = canvas.width / (window.devicePixelRatio || 1);
  const H = canvas.height / (window.devicePixelRatio || 1);
  const lv = state.level;
  const m = ease.inOut(Math.min(1, Math.max(0, view.phaseMix)));

  const b = fit(view, lv, W, H);
  const faces = visibleFaces(b);

  const pal = {
    void: mix(PALETTE.wild.void, PALETTE.cult.void, m),
    seam: mixa(PALETTE.wild.seam, PALETTE.cult.seam, m, 0.35),
  };

  // Ground and a soft vertical wash, so the horizon is felt rather than drawn.
  ctx.save();
  ctx.setTransform(window.devicePixelRatio || 1, 0, 0, window.devicePixelRatio || 1, 0, 0);
  ctx.clearRect(0, 0, W, H);
  const wash = ctx.createLinearGradient(0, 0, 0, H);
  wash.addColorStop(0, mix(PALETTE.wild.void2, PALETTE.cult.void2, m));
  wash.addColorStop(1, pal.void);
  ctx.fillStyle = wash;
  ctx.fillRect(0, 0, W, H);

  if (view.shake > 0) {
    const s = view.shake * 6;
    ctx.translate(Math.sin(view.shake * 41) * s, Math.cos(view.shake * 37) * s);
  }

  const ox = view.ox, oy = view.oy, sc = view.scale;
  const draws = [];

  // Unlit faces fall toward the colour of the void rather than toward black. Multiplying
  // brightness would drive the cultivated palette's dark bedrock into a single black mush
  // and lose every edge; blending toward the ground keeps the faces separable in both
  // phases and reads as atmosphere instead of shadow.
  const voidCol = blend(PALETTE.wild.void, PALETTE.cult.void, m);
  const face = (base, sh, k) => mix(base, voidCol, (1 - sh) * k);

  // ── Terrain ────────────────────────────────────────────────────────────────────────
  const rockA = PALETTE.wild.rock, rockB = PALETTE.cult.rock;
  const matA = PALETTE.wild.mat, matB = PALETTE.cult.mat;

  for (let y = 0; y < lv.h; y++) {
    for (let z = 0; z < lv.d; z++) {
      for (let x = 0; x < lv.w; x++) {
        const kind = terrainAt(lv, x, y, z);
        if (kind === T_AIR) continue;

        // Presence: bedrock is always here; the other two bloom in and out with the phase.
        let grow = 1;
        if (kind === T_WILD) grow = 1 - m;
        else if (kind === T_CULT) grow = m;
        if (grow <= 0.002) continue;

        if (buried(lv, state, x, y, z)) continue;

        const isRock = kind === T_ROCK;
        const size = 0.5 * (isRock ? 1 : ease.out(grow));
        const p = { x, y, z };

        draws.push({
          d: depth(p, b),
          f: () => cube(ctx, p, size, b, sc, ox, oy, faces, (_f, sh) => (
            face(blend(isRock ? rockA : matA, isRock ? rockB : matB, m), sh, 0.85)
          ), pal.seam),
        });
      }
    }
  }

  // ── Origin plots ───────────────────────────────────────────────────────────────────
  for (const p of lv.plots) {
    const filled = state.seeds.some((s) => s.x === p.x && s.y === p.y && s.z === p.z);
    draws.push({
      d: depth(p, b) - 0.01,
      f: () => plotMark(ctx, p, b, sc, ox, oy, filled, state.t),
    });
  }

  // ── Seeds ──────────────────────────────────────────────────────────────────────────
  for (const s of ent.seeds) {
    draws.push({
      d: depth(s, b),
      f: () => cube(ctx, s, 0.235, b, sc, ox, oy, faces,
        (_f, sh) => face(SEED, sh, 0.5), tinta(SEED, 0.45, 0.9)),
    });
  }

  // ── Past selves, then the courier ──────────────────────────────────────────────────
  ent.ghosts.forEach((g, i) => {
    const a = 0.44 + 0.05 * i;
    draws.push({
      d: depth(g, b),
      f: () => {
        cube(ctx, g, 0.33, b, sc, ox, oy, faces,
          (_f, sh) => tinta(COURIER, 0.4 + sh * 0.6, a), tinta(COURIER, 0.9, a + 0.3));
        crown(ctx, g, b, sc, ox, oy, tinta(COURIER, 1.1, a + 0.35), i + 1);
      },
    });
  });

  draws.push({
    d: depth(ent.player, b),
    f: () => {
      cube(ctx, ent.player, 0.35, b, sc, ox, oy, faces,
        (_f, sh) => face(COURIER, sh, 0.5), tinta(COURIER, 0.5, 0.9));
      crown(ctx, ent.player, b, sc, ox, oy, tinta(COURIER, 1.5, 0.95), 0);
    },
  });

  draws.sort((p, q) => p.d - q.d);
  for (const dr of draws) dr.f();

  ctx.restore();
}

/** True when every neighbour is solid in both phases, so the cell can never be seen. */
function buried(lv, state, x, y, z) {
  const n = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]];
  for (const [dx, dy, dz] of n) {
    const nx = x + dx, ny = y + dy, nz = z + dz;
    if (nx < 0 || nx >= lv.w || ny < 0 || ny >= lv.h || nz < 0 || nz >= lv.d) return false;
    const k = terrainAt(lv, nx, ny, nz);
    if (k === T_AIR) return false;
    if (k !== T_ROCK) return false; // a neighbour that comes and goes can expose this cell
  }
  return true;
}

function blend(a, b, t) {
  return { r: lerp(a.r, b.r, t), g: lerp(a.g, b.g, t), b: lerp(a.b, b.b, t) };
}

/** The plot ring, drawn flat on the floor of its cell. */
function plotMark(ctx, p, b, sc, ox, oy, filled, t) {
  const y = p.y - 0.46;
  const r = filled ? 0.34 : 0.3 + Math.sin(t * 0.4) * 0.012;
  const pts = [[-r, -r], [r, -r], [r, r], [-r, r]].map(([dx, dz]) =>
    project({ x: p.x + dx, y, z: p.z + dz }, b, sc, ox, oy));

  ctx.beginPath();
  pts.forEach((s, i) => (i ? ctx.lineTo(s.x, s.y) : ctx.moveTo(s.x, s.y)));
  ctx.closePath();

  if (filled) {
    ctx.fillStyle = tinta(PLOT, 1, 0.4);
    ctx.fill();
  }
  ctx.strokeStyle = tinta(PLOT, 1, filled ? 1 : 0.85);
  ctx.lineWidth = filled ? 2.4 : 1.6;
  ctx.stroke();

  // Inner cross — a survey mark, not a target reticle.
  const c = project({ x: p.x, y, z: p.z }, b, sc, ox, oy);
  const a = project({ x: p.x - r * 0.4, y, z: p.z }, b, sc, ox, oy);
  const d = project({ x: p.x, y, z: p.z - r * 0.4 }, b, sc, ox, oy);
  ctx.beginPath();
  ctx.moveTo(c.x - (a.x - c.x), c.y - (a.y - c.y)); ctx.lineTo(a.x, a.y);
  ctx.moveTo(c.x - (d.x - c.x), c.y - (d.y - c.y)); ctx.lineTo(d.x, d.y);
  ctx.strokeStyle = tinta(PLOT, 1, 0.6);
  ctx.lineWidth = 1;
  ctx.stroke();
}

/** A tick mark above a courier's head; ghosts carry their loop number. */
function crown(ctx, p, b, sc, ox, oy, colour, n) {
  const top = project({ x: p.x, y: p.y + 0.42, z: p.z }, b, sc, ox, oy);
  const tip = project({ x: p.x, y: p.y + 0.78, z: p.z }, b, sc, ox, oy);
  ctx.beginPath();
  ctx.moveTo(top.x, top.y);
  ctx.lineTo(tip.x, tip.y);
  ctx.strokeStyle = colour;
  ctx.lineWidth = n === 0 ? 2 : 1.2;
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(tip.x, tip.y, n === 0 ? 3.2 : 2.2, 0, TAU);
  ctx.fillStyle = colour;
  ctx.fill();
}
