import { clamp } from '../engine/math';
import type { Player } from '../game/player';

/**
 * The pose solver for Marcus — a small skeleton of joint angles driven by the
 * player's physical state.
 *
 * It is deliberately renderer-agnostic. The 2-D build inked these angles as
 * canvas paths; the 3-D build feeds the identical numbers into a hierarchy of
 * meshes. Because the solver reads live physics (vertical speed, air time, how
 * long a state has been held) rather than playing back fixed clips, every
 * animation stays welded to what the simulation is actually doing.
 *
 * Angles are measured from straight-down: 0 points at the floor, +π/2 points
 * forward. Lengths are metres. Joint angles are ABSOLUTE, not relative to the
 * parent joint — a 3-D hierarchy must subtract its parent's angle.
 */

export const HIP_Y = 0.97;
export const SHOULDER_Y = 1.47;
export const HEAD_Y = 1.7;
export const HEAD_R = 0.145;
export const THIGH = 0.45;
export const SHIN = 0.44;
export const FOOT = 0.2;
export const UPPER_ARM = 0.31;
export const FOREARM = 0.29;

export interface LegPose {
  thigh: number;
  knee: number;
  ankle: number;
}
export interface ArmPose {
  shoulder: number;
  elbow: number;
}

export interface Pose {
  /** Whole-body rotation about the hip (+ tilts the head backwards). */
  rot: number;
  hipDrop: number;
  hipShift: number;
  torsoLean: number;
  headTilt: number;
  legs: [LegPose, LegPose];
  arms: [ArmPose, ArmPose];
  /** 0..1 — how hard the jacket hem streams behind him. */
  flare: number;
}

// ---------------------------------------------------------------------------
// Poses
// ---------------------------------------------------------------------------

const legFromPhase = (phase: number): LegPose => {
  const thigh = Math.sin(phase) * 0.95 - 0.05;
  const lift = Math.max(0, Math.sin(phase - 0.7));
  const knee = thigh - (0.12 + lift * 1.75);
  const ankle = knee + 0.35 + Math.max(0, Math.cos(phase)) * 0.35;
  return { thigh, knee, ankle };
};

/**
 * Sprinter arms: the upper arm swings fore/aft while the elbow stays locked at
 * roughly a right angle, so the forearm sweeps up across the chest at the front
 * of the swing and trails low behind at the back of it.
 */
const armFromPhase = (phase: number): ArmPose => {
  const s = Math.sin(phase);
  const shoulder = s * 0.85;
  const elbow = shoulder + 1.5 + Math.max(0, s) * 0.55;
  return { shoulder, elbow };
};

const runPose = (p: Player, speedT: number): Pose => {
  const t = p.cycle;
  const bounce = Math.abs(Math.sin(t)) * 0.05;
  return {
    rot: 0,
    hipDrop: -bounce,
    hipShift: 0,
    torsoLean: 0.26 + speedT * 0.2,
    headTilt: -0.16 - speedT * 0.08,
    legs: [legFromPhase(t), legFromPhase(t + Math.PI)],
    arms: [armFromPhase(t + Math.PI), armFromPhase(t)],
    flare: 0.4 + speedT * 0.5,
  };
};

const airPose = (p: Player): Pose => {
  const rising = p.vy > 0;
  const settle = clamp(p.airTime * 3.5, 0, 1);
  const tuck = rising ? 1 - settle * 0.3 : 0.45;
  return {
    rot: rising ? -0.14 : 0.04,
    hipDrop: 0.02,
    hipShift: 0,
    torsoLean: rising ? 0.34 : 0.14,
    headTilt: rising ? -0.22 : 0.06,
    legs: [
      { thigh: 0.35 + tuck * 0.85, knee: -0.5 - tuck * 0.6, ankle: 0.35 },
      { thigh: -0.55 - (1 - tuck) * 0.35, knee: -1.45 - tuck * 0.35, ankle: -0.45 },
    ],
    arms: [
      { shoulder: 0.95, elbow: 2.5 },
      { shoulder: -0.95, elbow: 0.15 },
    ],
    flare: 1,
  };
};

const divePose = (): Pose => ({
  // Body flat and head-first: the spine sits ~12° off horizontal, and the hips
  // drop to meet the low dive hitbox instead of floating at running height.
  rot: -1.36,
  hipDrop: -0.34,
  hipShift: 0.02,
  torsoLean: 0.08,
  headTilt: 0.42,
  legs: [
    { thigh: -0.16, knee: -0.34, ankle: -0.6 },
    { thigh: -0.02, knee: -0.14, ankle: -0.45 },
  ],
  // Both arms spear forward along the body axis.
  arms: [
    { shoulder: 3.02, elbow: 3.08 },
    { shoulder: 2.86, elbow: 2.98 },
  ],
  flare: 1,
});

const slidePose = (p: Player): Pose => {
  const settle = clamp(p.stateT * 9, 0, 1);
  return {
    // Reclined, weight back, lead leg thrown forward along the deck.
    rot: 1.0 * settle,
    hipDrop: -0.42 * settle,
    hipShift: -0.06 * settle,
    torsoLean: -0.18,
    headTilt: -0.42 * settle,
    // Angles are body-frame, so each one is written as (world angle − rot):
    // the lead leg spears forward along the deck, the trail leg folds under.
    legs: [
      { thigh: 0.35, knee: 0.52, ankle: 0.72 },
      { thigh: -0.78, knee: -2.6, ankle: -1.1 },
    ],
    // Trailing hand skims the floor behind; leading arm tucks across the chest.
    arms: [
      { shoulder: 0.5, elbow: 1.45 },
      { shoulder: -2.4, elbow: -2.15 },
    ],
    flare: 1,
  };
};

const vaultPose = (p: Player): Pose => {
  const t = clamp(p.stateT / 0.26, 0, 1);
  const swing = Math.sin(t * Math.PI);
  return {
    rot: 0.22 + swing * 0.16,
    hipDrop: -0.06 - swing * 0.04,
    hipShift: -0.04,
    torsoLean: 0.42,
    headTilt: -0.2,
    // Legs tuck and sweep through, over the lip.
    legs: [
      { thigh: 1.15 + swing * 0.4, knee: 0.25 + swing * 0.35, ankle: 1.1 },
      { thigh: 0.8 + swing * 0.6, knee: -0.15 + swing * 0.3, ankle: 0.8 },
    ],
    // Planting hand reaches down and back onto the obstacle; free arm drives up.
    arms: [
      { shoulder: 0.38 - swing * 0.5, elbow: 0.22 - swing * 0.35 },
      { shoulder: 1.7 + swing * 0.5, elbow: 2.5 },
    ],
    flare: 1,
  };
};

const hurtPose = (p: Player): Pose => ({
  rot: -0.3 + Math.sin(p.stateT * 20) * 0.14,
  hipDrop: 0.02,
  hipShift: -0.08,
  torsoLean: -0.24,
  headTilt: 0.42,
  legs: [
    { thigh: 0.55, knee: -0.25, ankle: 0.45 },
    { thigh: -0.55, knee: -1.15, ankle: -0.3 },
  ],
  arms: [
    { shoulder: 2.3, elbow: 2.9 },
    { shoulder: 1.9, elbow: 2.7 },
  ],
  flare: 1,
});

/** Sideways sprint along a wall: an upright run, rolled onto its side. */
const wallPose = (p: Player, speedT: number): Pose => {
  const base = runPose(p, speedT);
  base.torsoLean = 0.34 + speedT * 0.16;
  base.headTilt = -0.3;
  base.flare = 1;
  return base;
};

export const poseFor = (p: Player, speedT: number): Pose => {
  switch (p.state) {
    case 'wallrun':
      return wallPose(p, speedT);
    case 'vault':
      return vaultPose(p);
    case 'dive':
      return divePose();
    case 'slide':
      return slidePose(p);
    case 'air':
      return airPose(p);
    case 'hurt':
    case 'dead':
      return hurtPose(p);
    default:
      return runPose(p, speedT);
  }
};
