import { clamp } from '../engine/math';
import type { Player } from '../game/player';
import type { SkinDef } from '../game/tuning';
import { mix as mixHex, withAlpha } from './palette';

/**
 * Marcus Vale, drawn from scratch every frame.
 *
 * No sprite sheets: the body is a small skeleton solved with forward kinematics
 * and inked with capsules and paths, which means every animation blends
 * continuously with the physics (a late jump really does read as a late jump)
 * and the whole character costs a few hundred bytes instead of a megabyte of
 * atlas — and recolours instantly for every unlockable outfit.
 *
 * All coordinates below are in metres, +y up, feet at the origin. Joint angles
 * are measured from straight-down: 0 points at the floor, +π/2 points forward.
 */

const HIP_Y = 0.97;
const SHOULDER_Y = 1.47;
const HEAD_Y = 1.7;
const HEAD_R = 0.145;
const THIGH = 0.45;
const SHIN = 0.44;
const FOOT = 0.2;
const UPPER_ARM = 0.31;
const FOREARM = 0.29;

interface Vec {
  x: number;
  y: number;
}

const polar = (from: Vec, angle: number, len: number): Vec => ({
  x: from.x + Math.sin(angle) * len,
  y: from.y - Math.cos(angle) * len,
});

interface LegPose {
  thigh: number;
  knee: number;
  ankle: number;
}
interface ArmPose {
  shoulder: number;
  elbow: number;
}

interface Pose {
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

export const poseFor = (p: Player, speedT: number): Pose => {
  switch (p.state) {
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

// ---------------------------------------------------------------------------
// Ink
// ---------------------------------------------------------------------------

export interface CharacterOpts {
  ctx: CanvasRenderingContext2D;
  /** Screen position of the feet. */
  x: number;
  y: number;
  /** Pixels per metre. */
  scale: number;
  player: Player;
  skin: SkinDef['palette'];
  accent: string;
  speedT: number;
  /** Opacity, blinked while invulnerable. */
  ghost: number;
  flow: number;
  overdrive: boolean;
}

const limb = (
  ctx: CanvasRenderingContext2D,
  a: Vec,
  b: Vec,
  width: number,
  color: string,
  taper = 0.82,
): void => {
  ctx.strokeStyle = color;
  ctx.lineCap = 'round';
  ctx.lineWidth = width;
  ctx.beginPath();
  ctx.moveTo(a.x, a.y);
  ctx.lineTo(b.x, b.y);
  ctx.stroke();
  if (taper < 1) {
    // A second, thinner pass toward the far joint tapers the limb naturally.
    ctx.lineWidth = width * taper;
    ctx.beginPath();
    ctx.moveTo(a.x + (b.x - a.x) * 0.45, a.y + (b.y - a.y) * 0.45);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
  }
};

export const drawCharacter = (o: CharacterOpts): void => {
  const { ctx, player: p, skin } = o;
  const pose = poseFor(p, o.speedT);

  ctx.save();
  ctx.translate(o.x, o.y);
  ctx.scale(o.scale, -o.scale);
  ctx.globalAlpha = o.ghost;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';

  // Rotate the whole body about the hip.
  ctx.translate(pose.hipShift, HIP_Y + pose.hipDrop);
  ctx.rotate(pose.rot);
  ctx.translate(0, -(HIP_Y + pose.hipDrop));

  const hip: Vec = { x: 0, y: HIP_Y + pose.hipDrop };
  const spine = SHOULDER_Y - HIP_Y;
  const shoulder: Vec = {
    x: hip.x + Math.sin(pose.torsoLean) * spine,
    y: hip.y + Math.cos(pose.torsoLean) * spine,
  };
  const headAngle = pose.torsoLean + pose.headTilt * 0.4;
  const head: Vec = {
    x: hip.x + Math.sin(headAngle) * (HEAD_Y - HIP_Y),
    y: hip.y + Math.cos(headAngle) * (HEAD_Y - HIP_Y),
  };
  /** Unit vector pointing "up the spine" — used to orient the head and jacket. */
  const up: Vec = { x: Math.sin(pose.torsoLean), y: Math.cos(pose.torsoLean) };
  const side: Vec = { x: up.y, y: -up.x };

  const legPts = (leg: LegPose) => {
    const knee = polar(hip, leg.thigh, THIGH);
    const ankle = polar(knee, leg.knee, SHIN);
    const toe = polar(ankle, leg.ankle + Math.PI / 2, FOOT);
    return { knee, ankle, toe };
  };
  const armPts = (arm: ArmPose) => {
    const elbow = polar(shoulder, arm.shoulder, UPPER_ARM);
    const hand = polar(elbow, arm.elbow, FOREARM);
    return { elbow, hand };
  };

  const back = legPts(pose.legs[1]);
  const front = legPts(pose.legs[0]);
  const backArm = armPts(pose.arms[1]);
  const frontArm = armPts(pose.arms[0]);

  // Torso corner points, needed by both the limb passes and the torso path.
  const sw = 0.2; // half shoulder width
  const hw = 0.16; // half hip width
  const sL = { x: shoulder.x - side.x * sw, y: shoulder.y - side.y * sw };
  const sR = { x: shoulder.x + side.x * sw, y: shoulder.y + side.y * sw };
  const hL = { x: hip.x - side.x * hw, y: hip.y - side.y * hw };
  const hR = { x: hip.x + side.x * hw, y: hip.y + side.y * hw };

  // ------------------------------------------------------------- back limbs
  ctx.globalAlpha = o.ghost * 0.72;
  limb(ctx, hip, back.knee, 0.185, skin.trouser);
  limb(ctx, back.knee, back.ankle, 0.15, skin.trouser);
  limb(ctx, back.ankle, back.toe, 0.125, skin.shoe);
  ctx.fillStyle = skin.jacketDark;
  ctx.beginPath();
  ctx.arc(sL.x + side.x * 0.02, sL.y + side.y * 0.02, 0.095, 0, Math.PI * 2);
  ctx.fill();
  limb(ctx, shoulder, backArm.elbow, 0.14, skin.jacketDark);
  limb(ctx, backArm.elbow, backArm.hand, 0.12, skin.skinShadow);
  ctx.globalAlpha = o.ghost;

  // ------------------------------------------------------------- jacket hem
  // A short hem that kicks off the back of the hip. Big enough to flutter,
  // small enough that the silhouette stays a runner rather than a cape.
  const hemLen = 0.1 + pose.flare * 0.12;
  ctx.fillStyle = skin.jacketDark;
  ctx.beginPath();
  ctx.moveTo(hip.x - side.x * 0.15 + up.x * 0.26, hip.y - side.y * 0.15 + up.y * 0.26);
  ctx.quadraticCurveTo(
    hip.x - side.x * (0.2 + hemLen) + up.x * 0.06,
    hip.y - side.y * (0.2 + hemLen) + up.y * 0.06,
    hip.x - side.x * (0.16 + hemLen) - up.x * 0.16,
    hip.y - side.y * (0.16 + hemLen) - up.y * 0.16,
  );
  ctx.quadraticCurveTo(
    hip.x - side.x * 0.12 - up.x * 0.08,
    hip.y - side.y * 0.12 - up.y * 0.08,
    hip.x + side.x * 0.06 - up.x * 0.02,
    hip.y + side.y * 0.06 - up.y * 0.02,
  );
  ctx.closePath();
  ctx.fill();

  // ------------------------------------------------------------- satchel
  // Drawn before the torso so it rides *behind* him.
  const bagC = {
    x: hip.x - side.x * 0.19 + up.x * 0.26,
    y: hip.y - side.y * 0.19 + up.y * 0.26,
  };
  ctx.fillStyle = skin.jacketDark;
  ctx.beginPath();
  ctx.ellipse(bagC.x, bagC.y, 0.13, 0.095, Math.atan2(up.y, up.x) - Math.PI / 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = withAlpha(skin.accent, 0.5);
  ctx.beginPath();
  ctx.ellipse(bagC.x, bagC.y, 0.042, 0.03, Math.atan2(up.y, up.x) - Math.PI / 2, 0, Math.PI * 2);
  ctx.fill();

  // ------------------------------------------------------------- torso
  const torsoGrad = ctx.createLinearGradient(
    hip.x - side.x * 0.25,
    hip.y - side.y * 0.25,
    shoulder.x + side.x * 0.3,
    shoulder.y + side.y * 0.3,
  );
  torsoGrad.addColorStop(0, skin.jacketDark);
  torsoGrad.addColorStop(0.5, skin.jacket);
  torsoGrad.addColorStop(1, skin.jacket);
  ctx.fillStyle = torsoGrad;
  ctx.beginPath();
  ctx.moveTo(sL.x + up.x * 0.04, sL.y + up.y * 0.04);
  ctx.lineTo(sR.x + up.x * 0.04, sR.y + up.y * 0.04);
  // Waist pinches in slightly on the way down for a human taper.
  ctx.quadraticCurveTo(
    hR.x + side.x * 0.035 + up.x * 0.2,
    hR.y + side.y * 0.035 + up.y * 0.2,
    hR.x - up.x * 0.05,
    hR.y - up.y * 0.05,
  );
  ctx.lineTo(hL.x - up.x * 0.05, hL.y - up.y * 0.05);
  ctx.quadraticCurveTo(
    hL.x - side.x * 0.035 + up.x * 0.2,
    hL.y - side.y * 0.035 + up.y * 0.2,
    sL.x + up.x * 0.04,
    sL.y + up.y * 0.04,
  );
  ctx.closePath();
  ctx.fill();

  // Courier satchel strap across the chest + emissive collar.
  ctx.strokeStyle = withAlpha(skin.accent, 0.95);
  ctx.lineWidth = 0.045;
  ctx.beginPath();
  ctx.moveTo(sR.x - up.x * 0.02, sR.y - up.y * 0.02);
  ctx.lineTo(hL.x + side.x * 0.06 + up.x * 0.12, hL.y + side.y * 0.06 + up.y * 0.12);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(sL.x + up.x * 0.05, sL.y + up.y * 0.05);
  ctx.lineTo(sR.x + up.x * 0.05, sR.y + up.y * 0.05);
  ctx.stroke();

  // ------------------------------------------------------------- front limbs
  limb(ctx, hip, front.knee, 0.195, skin.trouser);
  limb(ctx, front.knee, front.ankle, 0.155, skin.trouser);
  limb(ctx, front.ankle, front.toe, 0.135, skin.shoe);
  // Shoe sole glow
  ctx.strokeStyle = withAlpha(skin.accent, 0.55);
  ctx.lineWidth = 0.04;
  ctx.beginPath();
  ctx.moveTo(front.ankle.x, front.ankle.y - 0.05);
  ctx.lineTo(front.toe.x, front.toe.y - 0.05);
  ctx.stroke();

  ctx.fillStyle = skin.jacket;
  ctx.beginPath();
  ctx.arc(sR.x - side.x * 0.02, sR.y - side.y * 0.02, 0.1, 0, Math.PI * 2);
  ctx.fill();
  limb(ctx, shoulder, frontArm.elbow, 0.15, mixHex(skin.jacket, '#ffffff', 0.14));
  limb(ctx, frontArm.elbow, frontArm.hand, 0.125, skin.skin);
  // Glove
  ctx.fillStyle = skin.jacketDark;
  ctx.beginPath();
  ctx.arc(frontArm.hand.x, frontArm.hand.y, 0.062, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = withAlpha(skin.accent, 0.85);
  ctx.beginPath();
  ctx.arc(frontArm.hand.x, frontArm.hand.y, 0.024, 0, Math.PI * 2);
  ctx.fill();

  // ------------------------------------------------------------- neck + head
  const neck = { x: shoulder.x + up.x * 0.02, y: shoulder.y + up.y * 0.02 };
  limb(ctx, neck, { x: head.x - up.x * 0.09, y: head.y - up.y * 0.09 }, 0.135, skin.skinShadow, 1);

  ctx.save();
  ctx.translate(head.x, head.y);
  ctx.rotate(headAngle * 0.7 + pose.headTilt * 0.3);

  // Skull + jaw as one silhouette, chin toward +x.
  ctx.fillStyle = skin.skin;
  ctx.beginPath();
  ctx.moveTo(-HEAD_R * 0.85, HEAD_R * 0.3);
  ctx.quadraticCurveTo(-HEAD_R * 0.7, HEAD_R * 1.15, HEAD_R * 0.15, HEAD_R * 1.05);
  ctx.quadraticCurveTo(HEAD_R * 0.95, HEAD_R * 0.85, HEAD_R * 0.92, HEAD_R * 0.05);
  ctx.quadraticCurveTo(HEAD_R * 0.88, -HEAD_R * 0.72, HEAD_R * 0.1, -HEAD_R * 0.95);
  ctx.quadraticCurveTo(-HEAD_R * 0.6, -HEAD_R * 0.95, -HEAD_R * 0.85, HEAD_R * 0.3);
  ctx.closePath();
  ctx.fill();

  // Jaw shadow keeps the chin from flattening out.
  ctx.fillStyle = skin.skinShadow;
  ctx.beginPath();
  ctx.ellipse(HEAD_R * 0.2, -HEAD_R * 0.55, HEAD_R * 0.6, HEAD_R * 0.32, -0.12, 0, Math.PI * 2);
  ctx.fill();

  // Hair: a high-top fade — tight at the temple, full and squared on top.
  ctx.fillStyle = skin.hair;
  ctx.beginPath();
  ctx.moveTo(-HEAD_R * 0.92, HEAD_R * 0.15);
  ctx.quadraticCurveTo(-HEAD_R * 1.05, HEAD_R * 1.5, -HEAD_R * 0.1, HEAD_R * 1.55);
  ctx.quadraticCurveTo(HEAD_R * 0.85, HEAD_R * 1.45, HEAD_R * 0.86, HEAD_R * 0.5);
  ctx.quadraticCurveTo(HEAD_R * 0.4, HEAD_R * 0.86, -HEAD_R * 0.2, HEAD_R * 0.72);
  ctx.quadraticCurveTo(-HEAD_R * 0.72, HEAD_R * 0.62, -HEAD_R * 0.92, HEAD_R * 0.15);
  ctx.closePath();
  ctx.fill();
  // Sideburn / fade down the temple.
  ctx.beginPath();
  ctx.ellipse(-HEAD_R * 0.62, HEAD_R * 0.08, HEAD_R * 0.26, HEAD_R * 0.42, 0.1, 0, Math.PI * 2);
  ctx.fill();
  // Short beard along the jaw.
  ctx.fillStyle = withAlpha(skin.hair, 0.55);
  ctx.beginPath();
  ctx.ellipse(HEAD_R * 0.18, -HEAD_R * 0.62, HEAD_R * 0.55, HEAD_R * 0.26, -0.14, 0, Math.PI * 2);
  ctx.fill();

  // Ear
  ctx.fillStyle = skin.skinShadow;
  ctx.beginPath();
  ctx.ellipse(-HEAD_R * 0.3, -HEAD_R * 0.02, HEAD_R * 0.16, HEAD_R * 0.22, 0, 0, Math.PI * 2);
  ctx.fill();

  // Brow + eye, or a visor for skins that have one.
  if (skin.visor) {
    ctx.fillStyle = withAlpha(skin.visor, 0.92);
    ctx.beginPath();
    ctx.moveTo(-HEAD_R * 0.15, HEAD_R * 0.32);
    ctx.lineTo(HEAD_R * 0.92, HEAD_R * 0.16);
    ctx.lineTo(HEAD_R * 0.88, -HEAD_R * 0.18);
    ctx.lineTo(-HEAD_R * 0.15, -HEAD_R * 0.02);
    ctx.closePath();
    ctx.fill();
  } else {
    ctx.fillStyle = skin.skinShadow;
    ctx.fillRect(HEAD_R * 0.24, HEAD_R * 0.16, HEAD_R * 0.5, HEAD_R * 0.11);
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.ellipse(HEAD_R * 0.52, HEAD_R * 0.0, HEAD_R * 0.14, HEAD_R * 0.1, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#1a1008';
    ctx.beginPath();
    ctx.arc(HEAD_R * 0.57, 0, HEAD_R * 0.06, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  // ------------------------------------------------------------- rim light
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = o.ghost * (0.32 + o.flow * 0.4 + (o.overdrive ? 0.35 : 0));
  ctx.strokeStyle = o.overdrive ? '#ffffff' : o.accent;
  ctx.lineWidth = 0.045;
  ctx.beginPath();
  ctx.moveTo(sR.x, sR.y);
  ctx.quadraticCurveTo(hR.x + side.x * 0.1, hR.y + side.y * 0.1, hR.x, hR.y);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(head.x, head.y, HEAD_R * 1.0, headAngle - 1.5, headAngle + 0.5);
  ctx.stroke();
  ctx.restore();

  ctx.restore();
};

/** Soft contact shadow; fades and widens as he climbs. */
export const drawShadow = (
  ctx: CanvasRenderingContext2D,
  x: number,
  groundScreenY: number,
  heightM: number,
  scale: number,
): void => {
  const t = clamp(1 - heightM / 5, 0.12, 1);
  ctx.save();
  ctx.globalAlpha = 0.4 * t;
  ctx.fillStyle = 'rgba(0,0,0,0.85)';
  ctx.beginPath();
  ctx.ellipse(x, groundScreenY, 0.8 * scale * (1.35 - t * 0.35), 0.16 * scale * t, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
};
