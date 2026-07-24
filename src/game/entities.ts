import type { Rect } from '../engine/math';

/**
 * Everything that exists on the track. Obstacles are plain data with an
 * optional per-frame motion function, which keeps generation, collision and
 * rendering completely decoupled.
 */

export type ObstacleKind =
  | 'barrier' // waist-high — vault or jump
  | 'stack' // tall crate wall — full jump
  | 'beam' // scanner beam with a low gap — slide or dive
  | 'drone' // hovering sentry, bobs vertically
  | 'panel' // glass panel — only a dive smashes through
  | 'gate' // plasma gate alternating high/low on a beat
  | 'pad' // spring pad — standable, launches you high
  | 'rail' // elevated platform you can run along
  | 'pylon'; // narrow tall post — precise jump

export interface Obstacle {
  id: number;
  kind: ObstacleKind;
  /** Collision box in world metres; y is the BOTTOM edge, +y is up. */
  x: number;
  y: number;
  w: number;
  h: number;
  /** Lateral centre (metres from the platform's middle). */
  lane: number;
  /** Lateral half-extent. `LANES.fullHalfWidth` means it spans the deck. */
  halfW: number;
  vaultable: boolean;
  breakable: boolean;
  standable: boolean;
  /** Set once the player has been credited for clearing it. */
  cleared: boolean;
  broken: boolean;
  /** Smallest vertical gap seen while the player overlapped horizontally. */
  minClear: number;
  /** Animation / motion state. */
  t: number;
  baseY: number;
  amp: number;
  period: number;
  phase: number;
  /** Gate: 0 = blocking low, 1 = blocking high. */
  variant: number;
  /** Gates freeze their cycle once the player is committed to them. */
  locked: boolean;
  seed: number;
}

export type PickupKind = 'shard' | 'core' | 'magnet' | 'shield' | 'overdrive';

export interface Pickup {
  id: number;
  kind: PickupKind;
  x: number;
  y: number;
  /** Lateral position. */
  lane: number;
  r: number;
  taken: boolean;
  t: number;
  /** Magnet pull velocity. */
  vx: number;
  vy: number;
}

/** A hole in the deck, optionally confined to part of its width. */
export interface Gap {
  x0: number;
  x1: number;
  lane: number;
  halfW: number;
}

let nextId = 1;
export const resetIds = (): void => {
  nextId = 1;
};

export interface ObstacleOpts {
  lane?: number;
  halfW?: number;
  vaultable?: boolean;
  breakable?: boolean;
  standable?: boolean;
  amp?: number;
  period?: number;
  phase?: number;
  variant?: number;
  seed?: number;
}

export const makeObstacle = (
  kind: ObstacleKind,
  x: number,
  y: number,
  w: number,
  h: number,
  opts: ObstacleOpts = {},
): Obstacle => ({
  id: nextId++,
  kind,
  x,
  y,
  w,
  h,
  lane: opts.lane ?? 0,
  halfW: opts.halfW ?? 3.6,
  vaultable: opts.vaultable ?? false,
  breakable: opts.breakable ?? false,
  standable: opts.standable ?? false,
  cleared: false,
  broken: false,
  minClear: 99,
  locked: false,
  t: 0,
  baseY: y,
  amp: opts.amp ?? 0,
  period: opts.period ?? 2,
  phase: opts.phase ?? 0,
  variant: opts.variant ?? 0,
  seed: opts.seed ?? Math.floor(x * 7.13) % 997,
});

export const makePickup = (kind: PickupKind, x: number, y: number, lane = 0): Pickup => ({
  id: nextId++,
  kind,
  x,
  y,
  lane,
  r: kind === 'shard' ? 0.32 : kind === 'core' ? 0.55 : 0.62,
  taken: false,
  t: 0,
  vx: 0,
  vy: 0,
});

export const obstacleRect = (o: Obstacle): Rect => ({ x: o.x, y: o.y, w: o.w, h: o.h });

/**
 * Advance motion for animated obstacle kinds.
 *
 * `locked` freezes a gate's cycle: once the player is close enough that they
 * must already have committed to a jump or a slide, the gate stops changing.
 * What you saw when you decided is what you get — the alternative is a hazard
 * that can invalidate a correct read mid-air, which is never fun, only unfair.
 */
export const updateObstacle = (o: Obstacle, dt: number, locked = false): void => {
  if (locked) {
    o.locked = true;
    return;
  }
  o.t += dt;
  switch (o.kind) {
    case 'drone': {
      // Bobs upward only. A sentry that dipped below its spawn height could
      // close the slide gap after the player had already committed.
      if (o.amp > 0) {
        o.y = o.baseY + (Math.sin((o.t / o.period) * Math.PI * 2 + o.phase) * 0.5 + 0.5) * o.amp;
      }
      break;
    }
    case 'gate': {
      // Alternates between blocking the low lane and the high lane.
      const cycle = ((o.t / o.period + o.phase) % 1 + 1) % 1;
      const low = cycle < 0.5;
      if (low) {
        o.y = 0;
        o.h = 1.15;
      } else {
        o.y = 1.1;
        o.h = 2.6;
      }
      o.variant = low ? 0 : 1;
      break;
    }
    default:
      break;
  }
};

/** True when the gate is currently a duck-under (high block). */
export const gateIsHigh = (o: Obstacle): boolean => o.kind === 'gate' && o.variant === 1;
