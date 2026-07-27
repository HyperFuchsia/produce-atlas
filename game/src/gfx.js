// gfx.js — orthographic voxel renderer.
//
// The world is a right-handed grid: +x east, +y up, +z south. Cells sit at integer
// coordinates and every solid is a unit cube, which is what makes the painter's
// algorithm below safe: axis-aligned unit cubes under an orthographic camera never
// interpenetrate, so sorting by the depth of the centre is an exact ordering.

export const TAU = Math.PI * 2;

/**
 * Camera basis for an orthographic projection.
 * `yaw` rotates around the vertical axis, `pitch` lifts the camera above the horizon.
 */
export function basis(yaw, pitch) {
  const cy = Math.cos(yaw), sy = Math.sin(yaw);
  const cp = Math.cos(pitch), sp = Math.sin(pitch);
  return {
    // direction from the world toward the camera
    dir: { x: cp * sy, y: sp, z: cp * cy },
    right: { x: cy, y: 0, z: -sy },
    up: { x: -sp * sy, y: cp, z: -sp * cy },
  };
}

export function project(p, b, scale, ox, oy) {
  return {
    x: ox + (p.x * b.right.x + p.y * b.right.y + p.z * b.right.z) * scale,
    y: oy - (p.x * b.up.x + p.y * b.up.y + p.z * b.up.z) * scale,
  };
}

export function depth(p, b) {
  return p.x * b.dir.x + p.y * b.dir.y + p.z * b.dir.z;
}

// Unit-cube face definitions, corners wound so the polygon is convex on screen.
// h is the half-extent; corners are given in cube-local space.
const FACES = [
  { n: { x: 0, y: 1, z: 0 }, c: [[-1, 1, -1], [1, 1, -1], [1, 1, 1], [-1, 1, 1]], key: 'top' },
  { n: { x: 0, y: -1, z: 0 }, c: [[-1, -1, -1], [-1, -1, 1], [1, -1, 1], [1, -1, -1]], key: 'bottom' },
  { n: { x: 1, y: 0, z: 0 }, c: [[1, -1, -1], [1, -1, 1], [1, 1, 1], [1, 1, -1]], key: 'east' },
  { n: { x: -1, y: 0, z: 0 }, c: [[-1, -1, -1], [-1, 1, -1], [-1, 1, 1], [-1, -1, 1]], key: 'west' },
  { n: { x: 0, y: 0, z: 1 }, c: [[-1, -1, 1], [-1, 1, 1], [1, 1, 1], [1, -1, 1]], key: 'south' },
  { n: { x: 0, y: 0, z: -1 }, c: [[-1, -1, -1], [1, -1, -1], [1, 1, -1], [-1, 1, -1]], key: 'north' },
];

/** Faces pointing away from the camera are never drawn, so a cube costs at most three fills. */
export function visibleFaces(b) {
  return FACES.filter((f) => f.n.x * b.dir.x + f.n.y * b.dir.y + f.n.z * b.dir.z > 1e-6);
}

/**
 * Lambert term in [0,1] for a face, against a fixed light. Kept deliberately shallow —
 * the palette does the work and deep shading muddies the cyanotype inversion.
 */
const LIGHT = (() => {
  const l = { x: -0.35, y: 0.86, z: -0.37 };
  const m = Math.hypot(l.x, l.y, l.z);
  return { x: l.x / m, y: l.y / m, z: l.z / m };
})();

export function shade(n) {
  const d = n.x * LIGHT.x + n.y * LIGHT.y + n.z * LIGHT.z;
  return 0.45 + 0.55 * Math.max(0, d);
}

/**
 * Draw one cube. `size` is the half-extent in world units (0.5 fills its cell exactly);
 * shrinking it is how blocks bloom in and out across a phase flip.
 */
export function cube(ctx, p, size, b, scale, ox, oy, faces, paint, seam) {
  for (const f of faces) {
    ctx.beginPath();
    for (let i = 0; i < 4; i++) {
      const c = f.c[i];
      const s = project(
        { x: p.x + c[0] * size, y: p.y + c[1] * size, z: p.z + c[2] * size },
        b, scale, ox, oy,
      );
      if (i === 0) ctx.moveTo(s.x, s.y); else ctx.lineTo(s.x, s.y);
    }
    ctx.closePath();
    ctx.fillStyle = paint(f, shade(f.n));
    ctx.fill();
    if (seam) {
      ctx.strokeStyle = seam;
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  }
}

/** Screen-space polygon for a cube's silhouette, used for hit-testing and glows. */
export function cubeCentre(p, b, scale, ox, oy) {
  return project(p, b, scale, ox, oy);
}

export const ease = {
  out: (t) => 1 - Math.pow(1 - t, 3),
  inOut: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  back: (t) => 1 + 2.2 * Math.pow(t - 1, 3) + 1.2 * Math.pow(t - 1, 2),
};

export function lerp(a, b, t) { return a + (b - a) * t; }

/** Shortest signed angular distance from a to b, so yaw tweens never take the long way. */
export function angleDelta(a, b) {
  let d = (b - a) % TAU;
  if (d > Math.PI) d -= TAU;
  if (d < -Math.PI) d += TAU;
  return d;
}

/** Parse `#rrggbb` once so per-frame blending is plain arithmetic. */
export function rgb(hex) {
  const v = parseInt(hex.slice(1), 16);
  return { r: (v >> 16) & 255, g: (v >> 8) & 255, b: v & 255 };
}

export function mix(a, b, t) {
  return `rgb(${Math.round(lerp(a.r, b.r, t))},${Math.round(lerp(a.g, b.g, t))},${Math.round(lerp(a.b, b.b, t))})`;
}

export function mixa(a, b, t, alpha) {
  return `rgba(${Math.round(lerp(a.r, b.r, t))},${Math.round(lerp(a.g, b.g, t))},${Math.round(lerp(a.b, b.b, t))},${alpha})`;
}

export function tint(c, k) {
  return `rgb(${Math.round(Math.min(255, c.r * k))},${Math.round(Math.min(255, c.g * k))},${Math.round(Math.min(255, c.b * k))})`;
}

export function tinta(c, k, alpha) {
  return `rgba(${Math.round(Math.min(255, c.r * k))},${Math.round(Math.min(255, c.g * k))},${Math.round(Math.min(255, c.b * k))},${alpha})`;
}
