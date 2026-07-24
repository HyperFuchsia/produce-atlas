/**
 * Every number that decides how the game *feels* lives here.
 *
 * World units are metres, with y pointing UP and y = 0 at the floor of the
 * Conduit. The renderer is the only place that flips to screen space.
 */

export const PPM = 46; // pixels per metre at zoom 1
export const GROUND_SCREEN_Y = 400; // where the floor sits in the 540-high virtual view

/**
 * Lanes. The platform is 7.2 m wide and, until now, Marcus only ever ran down
 * the middle of it — every hazard had to span the whole deck because there was
 * nowhere to go. Three lanes turn that width into a decision.
 */
export const LANES = {
  count: 3,
  /** Distance between lane centres, metres. */
  spacing: 2.3,
  /** How fast he crosses between lanes. */
  changeSpeed: 15.5,
  /** Half-width of the runner for lateral collision. */
  halfWidth: 0.36,
  /** Half-width that counts as "spans the whole deck". */
  fullHalfWidth: 3.6,
} as const;

/** Centre of a lane index: -1 left, 0 middle, +1 right. */
export const laneX = (index: number): number => index * LANES.spacing;

export const PLAYER = {
  /** Screen x (virtual px) the runner is pinned to; the world scrolls past. */
  anchorX: 0.27,
  width: 0.66,
  height: 1.86,
  slideHeight: 0.86,
  diveHeight: 0.74,

  gravity: 46,
  /** Rising while the jump button is held — floaty up, snappy down. */
  riseGravityMul: 0.78,
  fallGravityMul: 1.26,
  jumpVelocity: 14.6,
  /** Releasing early clips the arc for precise short hops. */
  jumpCutMul: 0.42,
  maxHoldTime: 0.26,
  coyoteTime: 0.11,
  terminalVelocity: -34,

  diveVelocity: -27,
  diveForwardBoost: 2.6,
  slideMin: 0.42,
  slideMax: 1.15,
  slideFriction: 0.82,

  vaultDuration: 0.26,
  vaultExitVelocity: 8.2,
  vaultSpeedBonus: 1.9,
  /** Feet may be this far below an obstacle's lip and still catch the vault. */
  vaultGrab: 0.74,

  hurtStun: 0.5,
  padLaunchVelocity: 21,
} as const;

/**
 * Wall running. A long energy field across the deck cannot be jumped or slid —
 * the only way through is up the wall beside it, which is what finally makes
 * the lane you are standing in a life-or-death decision rather than a
 * preference.
 */
export const WALL = {
  /** Height his feet ride at while on the wall. */
  height: 2.5,
  /** Time to swing up onto the wall, and to settle back down after. */
  mountTime: 0.22,
  /** How far outboard of the lane centre he sits while attached. */
  outboard: 0.85,
  /** Upward kick when the wall ends, so the dismount arcs rather than drops. */
  dismountVelocity: 5.4,
  /** Speed bonus while attached — a wall run should feel fast. */
  speedBonus: 1.6,
  /** Score per metre of wall covered. */
  scorePerMetre: 14,
} as const;

export const RUN = {
  startSpeed: 10.6,
  maxSpeed: 25.5,
  /** Distance (m) over which speed asymptotically approaches maxSpeed. */
  speedRamp: 2100,
  flowSpeedBonus: 2.4,
  overdriveSpeedBonus: 6.5,

  /** Score per metre, before multipliers. */
  scorePerMetre: 1.15,
  comboStep: 1,
  comboMax: 20,
  /** Clean obstacles needed to raise the multiplier. */
  clearsPerCombo: 4,

  flowGainPerClear: 0.075,
  flowGainPerPerfect: 0.16,
  flowGainPerShard: 0.012,
  flowDecay: 0.028, // per second while not scoring
  flowDuration: 9.5,
  flowScoreMul: 2,

  magnetDuration: 9,
  magnetRadius: 5.2,
  shieldDuration: 0, // shields persist until used
  overdriveDuration: 7.5,

  reviveCost: 150,
  reviveGraceTime: 2.2,
  reviveWindow: 5,
} as const;

export const WORLD = {
  /** How far ahead of the camera we keep generating. */
  spawnAhead: 90,
  despawnBehind: 30,
  /** Metres of clean runway before the first hazard. */
  introRunway: 26,
  zoneLength: 900,
} as const;

export const SCORE = {
  vault: 60,
  perfectVault: 150,
  diveThrough: 90,
  closeCall: 45,
  shatter: 120,
  shard: 12,
  core: 200,
  airTimeBonus: 22,
} as const;

/** Permanent upgrades bought with shards. Level 0 = not owned. */
export interface UpgradeDef {
  id: string;
  name: string;
  desc: (level: number) => string;
  maxLevel: number;
  cost: (level: number) => number;
  /** Effect value at a given level. */
  value: (level: number) => number;
}

export const UPGRADES: UpgradeDef[] = [
  {
    id: 'headstart',
    name: 'Launch Rig',
    desc: (l) => `Begin each run ${l * 150} m down the Conduit with speed already up.`,
    maxLevel: 5,
    cost: (l) => 200 + l * 260,
    value: (l) => l * 150,
  },
  {
    id: 'shield',
    name: 'Kinetic Barrier',
    desc: (l) => (l > 0 ? `Start every run with ${l} shield${l > 1 ? 's' : ''}.` : 'Start every run with a shield.'),
    maxLevel: 3,
    cost: (l) => 350 + l * 500,
    value: (l) => l,
  },
  {
    id: 'magnet',
    name: 'Shard Magnet',
    desc: (l) => `Magnet pickups last ${9 + l * 3} s and pull from ${(5.2 + l * 1.4).toFixed(1)} m.`,
    maxLevel: 4,
    cost: (l) => 180 + l * 220,
    value: (l) => l,
  },
  {
    id: 'flow',
    name: 'Flow Regulator',
    desc: (l) => `Flow builds ${l * 15}% faster and lasts ${(9.5 + l * 1.5).toFixed(1)} s.`,
    maxLevel: 4,
    cost: (l) => 240 + l * 280,
    value: (l) => l,
  },
  {
    id: 'gloves',
    name: 'Grip Gloves',
    desc: (l) => `Vault window widened by ${(l * 0.18).toFixed(2)} m — late vaults still catch.`,
    maxLevel: 3,
    cost: (l) => 300 + l * 320,
    value: (l) => l,
  },
  {
    id: 'payout',
    name: 'Courier Contract',
    desc: (l) => `Every shard collected is worth ${10 + l * 10}% more.`,
    maxLevel: 5,
    cost: (l) => 260 + l * 300,
    value: (l) => l,
  },
];

export interface SkinDef {
  id: string;
  name: string;
  desc: string;
  cost: number;
  /** Unlock requirement, checked against the profile. */
  requires?: { bestDistance?: number; level?: number };
  palette: {
    skin: string;
    skinShadow: string;
    hair: string;
    jacket: string;
    jacketDark: string;
    accent: string;
    trouser: string;
    shoe: string;
    visor?: string;
  };
}

/**
 * Marcus Vale — a Black courier from the Ninth Ward stack of New Lagos. The
 * palettes below keep his skin tone consistent and richly lit across every
 * outfit; only the gear changes.
 */
export const SKINS: SkinDef[] = [
  {
    id: 'courier',
    name: 'Street Courier',
    desc: 'Day one kit. Worn jacket, good shoes, nothing to prove.',
    cost: 0,
    palette: {
      skin: '#7a4a22',
      skinShadow: '#4e2d14',
      hair: '#1b1310',
      jacket: '#1f6f9c',
      jacketDark: '#134259',
      accent: '#45f5ff',
      trouser: '#232a3d',
      shoe: '#f2f4f8',
    },
  },
  {
    id: 'nightshift',
    name: 'Night Shift',
    desc: 'Matte blacks and a magenta underglow for the 3 a.m. runs.',
    cost: 600,
    palette: {
      skin: '#7a4a22',
      skinShadow: '#4e2d14',
      hair: '#241a14',
      jacket: '#191c2b',
      jacketDark: '#0d0f18',
      accent: '#ff3fa4',
      trouser: '#12141f',
      shoe: '#ff3fa4',
    },
  },
  {
    id: 'solarflare',
    name: 'Solar Flare',
    desc: 'Heat-shielded gold for the Spine. Reflective at 200 km/h.',
    cost: 1200,
    requires: { bestDistance: 1500 },
    palette: {
      skin: '#7a4a22',
      skinShadow: '#4e2d14',
      hair: '#2a1c12',
      jacket: '#e08a1e',
      jacketDark: '#8a4f0c',
      accent: '#ffe259',
      trouser: '#3a2a16',
      shoe: '#fff2c4',
    },
  },
  {
    id: 'ghostline',
    name: 'Ghostline',
    desc: 'Prototype phase-weave. Half here, half somewhere quieter.',
    cost: 2000,
    requires: { level: 8 },
    palette: {
      skin: '#7a4a22',
      skinShadow: '#4e2d14',
      hair: '#1b1310',
      jacket: '#cfe6f5',
      jacketDark: '#8fa9bd',
      accent: '#9dff4d',
      trouser: '#5c6b7a',
      shoe: '#e8f6ff',
      visor: '#9dff4d',
    },
  },
  {
    id: 'apex',
    name: 'Apex Vale',
    desc: 'Champion plating. Only worn by couriers who cleared 3 km.',
    cost: 3200,
    requires: { bestDistance: 3000 },
    palette: {
      skin: '#7a4a22',
      skinShadow: '#4e2d14',
      hair: '#120c0a',
      jacket: '#7b2ff7',
      jacketDark: '#3f1580',
      accent: '#45f5ff',
      trouser: '#1a1030',
      shoe: '#c9a6ff',
      visor: '#45f5ff',
    },
  },
];

export interface TrailDef {
  id: string;
  name: string;
  desc: string;
  cost: number;
  color: string;
  kind: 'none' | 'spark' | 'ribbon' | 'echo';
}

export const TRAILS: TrailDef[] = [
  { id: 'none', name: 'No Trail', desc: 'Clean run. No signature.', cost: 0, color: '#45f5ff', kind: 'none' },
  { id: 'spark', name: 'Ion Sparks', desc: 'Hot embers off every footfall.', cost: 350, color: '#ffc857', kind: 'spark' },
  { id: 'ribbon', name: 'Light Ribbon', desc: 'A drawn line of pure cyan.', cost: 700, color: '#45f5ff', kind: 'ribbon' },
  { id: 'echo', name: 'After-Image', desc: 'Ghosts of the last half-second.', cost: 1400, color: '#ff3fa4', kind: 'echo' },
];

export const xpForLevel = (level: number): number => Math.round(100 + (level - 1) * 85 + Math.pow(level, 1.7) * 12);
