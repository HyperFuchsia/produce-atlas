/** Small maths helpers shared by sim + render. All pure, all tested. */

export const clamp = (v: number, lo: number, hi: number): number => (v < lo ? lo : v > hi ? hi : v);

export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

export const invLerp = (a: number, b: number, v: number): number => (b === a ? 0 : (v - a) / (b - a));

/** Framerate-independent exponential smoothing. `speed` is "per second". */
export const damp = (a: number, b: number, speed: number, dt: number): number =>
  lerp(a, b, 1 - Math.exp(-speed * dt));

export const easeOutCubic = (t: number): number => 1 - Math.pow(1 - t, 3);
export const easeInCubic = (t: number): number => t * t * t;
export const easeOutBack = (t: number): number => {
  const c = 1.70158;
  return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2);
};
export const easeInOutSine = (t: number): number => -(Math.cos(Math.PI * t) - 1) / 2;

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Axis-aligned overlap test; touching edges do not count as a hit. */
export const overlaps = (a: Rect, b: Rect): boolean =>
  a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

/** Signed overlap depth on each axis (positive when overlapping). */
export const overlapDepth = (a: Rect, b: Rect): { x: number; y: number } => ({
  x: Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x),
  y: Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y),
});

export const approach = (current: number, target: number, maxDelta: number): number => {
  if (current < target) return Math.min(current + maxDelta, target);
  if (current > target) return Math.max(current - maxDelta, target);
  return target;
};

export const wrap = (v: number, span: number): number => ((v % span) + span) % span;

export const TAU = Math.PI * 2;
