// sim.js — the rules. Pure, deterministic, and free of any DOM reference, so the same code
// that runs the game also runs under `node --test` to prove every level is solvable.
//
// ── The dimensions ───────────────────────────────────────────────────────────────────────
//   x, y, z   three fully traversable spatial axes                              = 3
//   t         time, navigable: you rewind and your past run keeps playing        = 1
//   phase     wild ⇄ cultivated — a real axis, but with exactly two positions.
//             You can move along it, but there is nowhere to move to except the
//             other end. A dimension with no interior: half a dimension.         = 0.5
//                                                                          total = 4.5
//
// ── Resolution order within a tick ───────────────────────────────────────────────────────
// Everything below is ordered deliberately; changing any of it changes which levels are
// solvable, so the order is part of the game, not an implementation detail.
//
//   1. Actors act, oldest ghost first, the live courier LAST. The courier moving last is
//      what lets you follow a ghost into the cell it just vacated — the alternative reads
//      as the past self body-blocking you, which is miserable.
//   2. Each action fully resolves before the next actor acts (a phase flip mid-tick is seen
//      by every actor after it).
//   3. Gravity runs once, globally, after all actions, iterated to a fixed point from the
//      lowest mover upward so stacks settle in one pass.
//   4. Loss is checked, then victory.
//
// ── Collision ────────────────────────────────────────────────────────────────────────────
// Actors pass through each other but stand on each other. This is asymmetric on purpose:
// mutual blocking would make the shared spawn cell an instant deadlock on every rewind, and
// "my own past self is in the doorway" is the single least forgiving failure a time-loop
// game can hand a player. Seeds, by contrast, block everything and get pushed.

export const T_AIR = 0;   // empty
export const T_ROCK = 1;  // solid in both phases — bedrock
export const T_WILD = 2;  // solid only while wild — thicket, scrub, unimproved ground
export const T_CULT = 3;  // solid only while cultivated — terrace, bund, raised bed

export const PH_WILD = 0;
export const PH_CULT = 1;

export const DIRS = {
  N: { x: 0, z: -1 },
  S: { x: 0, z: 1 },
  E: { x: 1, z: 0 },
  W: { x: -1, z: 0 },
};

export const WAIT = '.';
export const FLIP = 'F';
export const REWIND = 'R';

export const isMove = (a) => Object.prototype.hasOwnProperty.call(DIRS, a);

/** Terrain solidity is the only thing the phase actually changes. */
export function solidAt(kind, phase) {
  return kind === T_ROCK
    || (kind === T_WILD && phase === PH_WILD)
    || (kind === T_CULT && phase === PH_CULT);
}

const LEGEND = {
  '.': T_AIR, ' ': T_AIR,
  '#': T_ROCK,
  'w': T_WILD,
  'c': T_CULT,
  '@': T_AIR,  // courier spawn
  's': T_AIR,  // seed
  'o': T_AIR,  // origin plot
};

/**
 * Parse a level. `layers[y]` is a list of `z` rows of `x` characters, y ascending, so the
 * text reads bottom-slice first — the way a section drawing through soil reads.
 */
export function parse(def) {
  const layers = def.layers;
  const h = layers.length;
  const d = layers[0].length;
  const w = layers[0][0].length;

  for (let y = 0; y < h; y++) {
    if (layers[y].length !== d) throw new Error(`${def.id}: layer ${y} has ${layers[y].length} rows, expected ${d}`);
    for (let z = 0; z < d; z++) {
      if (layers[y][z].length !== w) throw new Error(`${def.id}: layer ${y} row ${z} is ${layers[y][z].length} wide, expected ${w}`);
    }
  }

  const terrain = new Uint8Array(w * h * d);
  const plots = [];
  const seeds = [];
  let spawn = null;

  for (let y = 0; y < h; y++) {
    for (let z = 0; z < d; z++) {
      for (let x = 0; x < w; x++) {
        const ch = layers[y][z][x];
        const kind = LEGEND[ch];
        if (kind === undefined) throw new Error(`${def.id}: unknown glyph "${ch}" at ${x},${y},${z}`);
        terrain[(y * d + z) * w + x] = kind;
        if (ch === '@') {
          if (spawn) throw new Error(`${def.id}: more than one spawn`);
          spawn = { x, y, z };
        }
        if (ch === 's') seeds.push({ x, y, z });
        if (ch === 'o') plots.push({ x, y, z });
      }
    }
  }

  if (!spawn) throw new Error(`${def.id}: no spawn`);
  if (!plots.length) throw new Error(`${def.id}: no origin plot`);
  if (seeds.length < plots.length) {
    throw new Error(`${def.id}: ${seeds.length} seeds cannot fill ${plots.length} plots`);
  }

  return {
    def, w, h, d, terrain, plots,
    spawn,
    seedStart: seeds,
    startPhase: def.startPhase ?? PH_WILD,
    maxLoops: def.maxLoops ?? 0,
  };
}

/** Fresh runtime state: tick zero, no ghosts. */
export function start(level) {
  const state = {
    level,
    t: 0,
    phase: level.startPhase,
    player: { ...level.spawn },
    seeds: level.seedStart.map((s) => ({ ...s })),
    ghosts: [],
    lost: null,
    won: false,
  };
  // Settle before the first tick so a level can be drawn with a seed hanging in the air
  // and have it land where it belongs, rather than lurching downward on move one.
  settle(state);
  return state;
}

/** Reset the world but keep the ghosts — this is what a rewind does. */
export function reset(state) {
  const lv = state.level;
  const next = {
    level: lv,
    t: 0,
    phase: lv.startPhase,
    player: { ...lv.spawn },
    seeds: lv.seedStart.map((s) => ({ ...s })),
    ghosts: state.ghosts.map((g) => ({ actions: g.actions, x: lv.spawn.x, y: lv.spawn.y, z: lv.spawn.z })),
    lost: null,
    won: false,
  };
  settle(next);
  return next;
}

export function clone(state) {
  return {
    level: state.level,
    t: state.t,
    phase: state.phase,
    player: { ...state.player },
    seeds: state.seeds.map((s) => ({ ...s })),
    // `actions` is append-only and never mutated in place, so sharing the array is safe
    // and keeps an undo snapshot cheap even with a dozen ghosts on screen.
    ghosts: state.ghosts.map((g) => ({ actions: g.actions, x: g.x, y: g.y, z: g.z })),
    lost: state.lost,
    won: state.won,
  };
}

export function terrainAt(lv, x, y, z) {
  return lv.terrain[(y * lv.d + z) * lv.w + x];
}

/**
 * Walls and ceiling are solid, the floor is not: falling out of the bottom is the only way
 * to leave the world, which keeps "the void" a designed hazard rather than an escape hatch.
 */
export function solid(state, x, y, z) {
  const lv = state.level;
  if (y < 0) return false;
  if (x < 0 || x >= lv.w || z < 0 || z >= lv.d || y >= lv.h) return true;
  return solidAt(terrainAt(lv, x, y, z), state.phase);
}

export function seedAt(state, x, y, z, skip = -1) {
  for (let i = 0; i < state.seeds.length; i++) {
    if (i === skip) continue;
    const s = state.seeds[i];
    if (s.x === x && s.y === y && s.z === z) return i;
  }
  return -1;
}

export function actorAt(state, x, y, z, skip = null) {
  const all = [state.player, ...state.ghosts];
  for (const a of all) {
    if (a === skip) continue;
    if (a.x === x && a.y === y && a.z === z) return a;
  }
  return null;
}

/** Can something occupy this cell? Actors are transparent here; seeds are not. */
function open(state, x, y, z, skipSeed = -1) {
  return !solid(state, x, y, z) && seedAt(state, x, y, z, skipSeed) === -1;
}

/** Anything underfoot holds you up: rock, a seed, or another courier's shoulders. */
function supported(state, a, skipSeed = -1) {
  if (a.y <= 0 && solid(state, a.x, -1, a.z)) return true;
  return solid(state, a.x, a.y - 1, a.z)
    || seedAt(state, a.x, a.y - 1, a.z, skipSeed) !== -1
    || actorAt(state, a.x, a.y - 1, a.z, a) !== null;
}

/**
 * One actor's move. Tries, in order: walk in, push a seed, then step up onto whatever
 * blocked it. Returns a small record so the renderer can animate what actually happened.
 */
function step(state, actor, dir) {
  const nx = actor.x + dir.x;
  const nz = actor.z + dir.z;

  // Walk into a past self and you step onto their shoulders. This is checked before the
  // plain walk because actors are otherwise transparent, and "climb your own history" is
  // the most legible thing the time axis does — it should be the thing that happens when
  // you walk at it, not a trick you have to discover.
  if (actorAt(state, nx, actor.y, nz, actor)
      && open(state, nx, actor.y + 1, nz) && !actorAt(state, nx, actor.y + 1, nz, actor)
      && open(state, actor.x, actor.y + 1, actor.z)) {
    actor.x = nx; actor.z = nz; actor.y += 1;
    return { kind: 'mount' };
  }

  // Straight in.
  if (open(state, nx, actor.y, nz)) {
    actor.x = nx; actor.z = nz;
    return { kind: 'walk' };
  }

  // Push a seed one cell along, if there is somewhere for it to go.
  const si = seedAt(state, nx, actor.y, nz);
  if (si !== -1) {
    const px = nx + dir.x;
    const pz = nz + dir.z;
    if (open(state, px, actor.y, pz, si) && !actorAt(state, px, actor.y, pz)) {
      state.seeds[si].x = px;
      state.seeds[si].z = pz;
      actor.x = nx; actor.z = nz;
      return { kind: 'push', seed: si };
    }
  }

  // Step up — onto terrain or onto the seed that would not budge.
  if (open(state, nx, actor.y + 1, nz) && open(state, actor.x, actor.y + 1, actor.z)) {
    actor.x = nx; actor.z = nz; actor.y += 1;
    return { kind: 'climb' };
  }

  return { kind: 'blocked' };
}

/**
 * Flip the phase and eject anything caught inside newly solid ground.
 *
 * Ejection upward is not a safety valve bolted on to avoid a crash — it is the main way you
 * gain height. Stand where a terrace will be, flip, and the ground lifts you. Resolving from
 * the lowest occupant upward means a stacked column rises intact instead of colliding.
 */
function flip(state) {
  state.phase = state.phase === PH_WILD ? PH_CULT : PH_WILD;

  const movers = [
    ...state.seeds.map((s, i) => ({ obj: s, seedIndex: i })),
    ...[...state.ghosts, state.player].map((a) => ({ obj: a, seedIndex: -1 })),
  ].sort((a, b) => a.obj.y - b.obj.y);

  for (const m of movers) {
    const o = m.obj;
    if (!solid(state, o.x, o.y, o.z)) continue;
    let y = o.y + 1;
    while (y < state.level.h && !open(state, o.x, y, o.z, m.seedIndex)) y++;
    if (y >= state.level.h) { state.lost = 'crush'; return; }
    o.y = y;
  }
}

/** Global gravity, iterated until nothing else can fall. */
function settle(state) {
  for (let pass = 0; pass < state.level.h + 2; pass++) {
    let moved = false;

    const movers = [
      ...state.seeds.map((s, i) => ({ obj: s, seedIndex: i })),
      ...[...state.ghosts, state.player].map((a) => ({ obj: a, seedIndex: -1 })),
    ].sort((a, b) => a.obj.y - b.obj.y);

    for (const m of movers) {
      const o = m.obj;
      while (!supported(state, o, m.seedIndex)) {
        o.y -= 1;
        moved = true;
        if (o.y < 0) { state.lost = 'void'; return; }
      }
    }

    if (!moved) break;
  }
}

function act(state, actor, action) {
  if (action === FLIP) { flip(state); return { kind: 'flip' }; }
  if (isMove(action)) return step(state, actor, DIRS[action]);
  return { kind: 'wait' };
}

export function checkWin(state) {
  return state.level.plots.every((p) => seedAt(state, p.x, p.y, p.z) !== -1);
}

/**
 * Advance one tick. Mutates `state`; callers that want undo snapshot with `clone` first.
 * Returns per-actor outcomes for the renderer.
 */
export function tick(state, action) {
  if (state.won || state.lost) return { events: [] };

  const events = [];
  const from = {
    player: { ...state.player },
    ghosts: state.ghosts.map((g) => ({ x: g.x, y: g.y, z: g.z })),
    seeds: state.seeds.map((s) => ({ ...s })),
  };

  // Oldest ghost first, live courier last.
  for (let i = 0; i < state.ghosts.length; i++) {
    const g = state.ghosts[i];
    const a = g.actions[state.t] ?? WAIT;
    events.push({ who: `ghost${i}`, action: a, ...act(state, g, a) });
    if (state.lost) break;
  }
  if (!state.lost) {
    events.push({ who: 'player', action, ...act(state, state.player, action) });
  }

  if (!state.lost) settle(state);

  state.t += 1;
  if (!state.lost && checkWin(state)) state.won = true;

  return { events, from };
}

/**
 * End the current run: the courier's recording joins the chorus and the world resets.
 * Returns null when the loop budget is spent.
 */
export function rewind(state, recording) {
  // A budget of zero means zero, not unlimited — the early levels rely on the time axis
  // being unavailable so that the phase axis is the only thing left to try.
  if (state.ghosts.length >= state.level.maxLoops) return null;
  const next = reset(state);
  next.ghosts = [
    ...state.ghosts.map((g) => ({ actions: g.actions, x: state.level.spawn.x, y: state.level.spawn.y, z: state.level.spawn.z })),
    { actions: recording.slice(), x: state.level.spawn.x, y: state.level.spawn.y, z: state.level.spawn.z },
  ];
  return next;
}

/**
 * Replay a solution string. `R` rewinds, every other glyph is one tick.
 * This is the function the test suite leans on: a level is only shipped if its recorded
 * solution actually reaches `won` here.
 */
export function replay(level, solution) {
  let state = start(level);
  let recording = [];

  for (const ch of solution) {
    if (ch === REWIND) {
      const next = rewind(state, recording);
      if (!next) return { state, ok: false, reason: 'loop budget exceeded' };
      state = next;
      recording = [];
      continue;
    }
    if (ch !== WAIT && ch !== FLIP && !isMove(ch)) {
      return { state, ok: false, reason: `unknown action "${ch}"` };
    }
    recording.push(ch);
    tick(state, ch);
    if (state.lost) return { state, ok: false, reason: `lost: ${state.lost}` };
    if (state.won) return { state, ok: true, reason: 'won' };
  }

  return { state, ok: state.won, reason: state.won ? 'won' : 'solution ended without a win' };
}
