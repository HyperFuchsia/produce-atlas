/**
 * car3d.js — a procedurally generated, photoreal-leaning 3-D car for three.js
 * ---------------------------------------------------------------------------
 * Zero assets. No .gltf, no textures on disk, no CDN. Everything — the body
 * surface, the wheels, the tyre tread, the metallic-flake paint, the studio
 * HDRI used for reflections — is generated from maths at runtime.
 *
 *   npm i three            (r160+; developed against r185)
 *
 *   import * as THREE from 'three';
 *   import { createCar, createStudioEnvironment } from './car3d.js';
 *
 *   const env = createStudioEnvironment(renderer);
 *   scene.environment = env.envMap;
 *
 *   const car = createCar({ bodyColor: '#12294d' });
 *   scene.add(car.group);
 *
 *   // in your animation loop
 *   car.update(dt, speedMetresPerSecond);
 *
 * The car is built around the origin: +X right, +Y up, +Z forward (the nose
 * points at +Z), wheels resting on the y = 0 plane. Units are metres.
 *
 * @license MIT
 */

import * as THREE from 'three';

/* ==========================================================================
   1. Maths helpers
   ========================================================================== */

const TAU = Math.PI * 2;
const clamp = (x, a, b) => (x < a ? a : x > b ? b : x);
const lerp = (a, b, t) => a + (b - a) * t;
const smoothstep = (e0, e1, x) => {
  const t = clamp((x - e0) / (e1 - e0 || 1e-9), 0, 1);
  return t * t * (3 - 2 * t);
};

/**
 * Monotone cubic (Fritsch–Carlson) interpolation.
 *
 * Plain Catmull-Rom overshoots between control points, and on a car body an
 * overshoot of two millimetres reads instantly as a dent. Monotone cubics
 * cannot overshoot, so the silhouette stays exactly where it is authored.
 *
 * @param {Array<[number,number]>} pts control points sorted ascending by x
 * @returns {(x:number)=>number}
 */
function monotoneCurve(pts) {
  const n = pts.length;
  const xs = pts.map((p) => p[0]);
  const ys = pts.map((p) => p[1]);
  const dx = [];
  const slope = [];
  for (let i = 0; i < n - 1; i++) {
    dx[i] = xs[i + 1] - xs[i];
    slope[i] = (ys[i + 1] - ys[i]) / dx[i];
  }
  const m = new Array(n);
  m[0] = slope[0];
  m[n - 1] = slope[n - 2];
  for (let i = 1; i < n - 1; i++) {
    if (slope[i - 1] * slope[i] <= 0) {
      m[i] = 0;
    } else {
      const w1 = 2 * dx[i] + dx[i - 1];
      const w2 = dx[i] + 2 * dx[i - 1];
      m[i] = (w1 + w2) / (w1 / slope[i - 1] + w2 / slope[i]);
    }
  }
  return function sample(x) {
    if (x <= xs[0]) return ys[0];
    if (x >= xs[n - 1]) return ys[n - 1];
    let lo = 0;
    let hi = n - 1;
    while (hi - lo > 1) {
      const mid = (lo + hi) >> 1;
      if (xs[mid] <= x) lo = mid;
      else hi = mid;
    }
    const h = dx[lo];
    const t = (x - xs[lo]) / h;
    const t2 = t * t;
    const t3 = t2 * t;
    return (
      (2 * t3 - 3 * t2 + 1) * ys[lo] +
      (t3 - 2 * t2 + t) * h * m[lo] +
      (-2 * t3 + 3 * t2) * ys[lo + 1] +
      (t3 - t2) * h * m[lo + 1]
    );
  };
}

/** Deterministic hash-based RNG so a given seed always yields the same car. */
function makeRng(seed = 1) {
  let s = seed >>> 0 || 1;
  return function rng() {
    s ^= s << 13;
    s >>>= 0;
    s ^= s >> 17;
    s ^= s << 5;
    s >>>= 0;
    return s / 4294967296;
  };
}

/** Signed distance to the inside of a convex polygon in a 2-D plane. */
function convexInset(poly, x, y) {
  // Determine winding once so callers can author points in either direction.
  let area = 0;
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i];
    const b = poly[(i + 1) % poly.length];
    area += a[0] * b[1] - b[0] * a[1];
  }
  const sign = area >= 0 ? 1 : -1;
  let d = Infinity;
  for (let i = 0; i < poly.length; i++) {
    const [x0, y0] = poly[i];
    const [x1, y1] = poly[(i + 1) % poly.length];
    const ex = x1 - x0;
    const ey = y1 - y0;
    const len = Math.hypot(ex, ey) || 1e-9;
    const nx = (-ey / len) * sign;
    const ny = (ex / len) * sign;
    d = Math.min(d, (x - x0) * nx + (y - y0) * ny);
  }
  return d;
}

/* ==========================================================================
   2. Procedural textures (pure JS — no canvas, no DOM, SSR safe)
   ========================================================================== */

/** Build an 8-bit RGBA DataTexture from a per-pixel callback. */
function dataTexture(w, h, fill, { colorSpace = THREE.NoColorSpace, repeat = null } = {}) {
  const data = new Uint8Array(w * h * 4);
  const px = [0, 0, 0, 255];
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      px[0] = px[1] = px[2] = 0;
      px[3] = 255;
      fill(x / w, y / h, px, x, y);
      const i = (y * w + x) * 4;
      data[i] = px[0];
      data[i + 1] = px[1];
      data[i + 2] = px[2];
      data[i + 3] = px[3];
    }
  }
  const tex = new THREE.DataTexture(data, w, h, THREE.RGBAFormat);
  tex.colorSpace = colorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.generateMipmaps = true;
  tex.anisotropy = 8;
  if (repeat) tex.repeat.set(repeat[0], repeat[1]);
  tex.needsUpdate = true;
  return tex;
}

/** Convert a height field into a tangent-space normal map. */
function normalMapFromHeight(w, h, heightFn, strength = 1, opts = {}) {
  const H = new Float32Array(w * h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) H[y * w + x] = heightFn(x / w, y / h, x, y);
  }
  const at = (x, y) => H[((y + h) % h) * w + ((x + w) % w)];
  return dataTexture(
    w,
    h,
    (u, v, px, x, y) => {
      const dzdx = (at(x + 1, y) - at(x - 1, y)) * strength * w * 0.5;
      const dzdy = (at(x, y + 1) - at(x, y - 1)) * strength * h * 0.5;
      const len = Math.hypot(-dzdx, -dzdy, 1);
      px[0] = Math.round((((-dzdx / len) * 0.5) + 0.5) * 255);
      px[1] = Math.round((((-dzdy / len) * 0.5) + 0.5) * 255);
      px[2] = Math.round((1 / len) * 0.5 * 255 + 127.5);
    },
    opts
  );
}

/**
 * Metallic-flake normal map for the paint's clearcoat.
 * Real metallic paint is aluminium platelets suspended under a clear layer;
 * they are what makes a car sparkle and shift colour as it turns. Two noise
 * octaves give a believable flake-size distribution.
 */
function flakeNormalTexture(size = 256, seed = 7) {
  const rng = makeRng(seed);
  const cellA = 96;
  const cellB = 40;
  const nA = new Float32Array(cellA * cellA * 2);
  const nB = new Float32Array(cellB * cellB * 2);
  for (let i = 0; i < nA.length; i += 2) {
    const a = rng() * TAU;
    const r = Math.sqrt(rng());
    nA[i] = Math.cos(a) * r;
    nA[i + 1] = Math.sin(a) * r;
  }
  for (let i = 0; i < nB.length; i += 2) {
    const a = rng() * TAU;
    const r = Math.sqrt(rng());
    nB[i] = Math.cos(a) * r;
    nB[i + 1] = Math.sin(a) * r;
  }
  return dataTexture(size, size, (u, v, px) => {
    const ai = (Math.floor(v * cellA) * cellA + Math.floor(u * cellA)) * 2;
    const bi = (Math.floor(v * cellB) * cellB + Math.floor(u * cellB)) * 2;
    const x = nA[ai] * 0.85 + nB[bi] * 0.35;
    const y = nA[ai + 1] * 0.85 + nB[bi + 1] * 0.35;
    const z = Math.sqrt(Math.max(0.02, 1 - x * x - y * y));
    const len = Math.hypot(x, y, z);
    px[0] = Math.round((x / len) * 127.5 + 127.5);
    px[1] = Math.round((y / len) * 127.5 + 127.5);
    px[2] = Math.round((z / len) * 127.5 + 127.5);
  });
}

/** Tyre tread: lateral sipes, shoulder blocks and a fine rubber grain. */
function treadNormalTexture(w = 256, h = 256) {
  return normalMapFromHeight(
    w,
    h,
    (u, v) => {
      // v runs across the tread (0 = inner shoulder, 1 = outer shoulder)
      const across = v;
      // Lateral sipes, angled, denser toward the shoulders.
      const skew = u + (across - 0.5) * 0.22;
      const sipe = Math.abs(((skew * 18) % 1) - 0.5) * 2;
      let hgt = smoothstep(0.06, 0.3, sipe);
      // Shoulder blocks broken up by deeper slots.
      const shoulder = smoothstep(0.34, 0.2, Math.abs(across - 0.5));
      const slot = Math.abs(((u * 9 + across * 0.4) % 1) - 0.5) * 2;
      hgt = lerp(hgt, hgt * smoothstep(0.1, 0.35, slot), shoulder);
      // Fine moulding grain.
      hgt += (Math.sin(u * 811.0) * Math.cos(v * 673.0)) * 0.05;
      return hgt;
    },
    0.0045,
    { repeat: [1, 1] }
  );
}

/** Tyre sidewall: bead ring, moulding rings, faint lettering band. */
function sidewallNormalTexture(w = 128, h = 256) {
  return normalMapFromHeight(
    w,
    h,
    (u, v) => {
      let hgt = 0;
      // Concentric moulding rings run along v (radially outward).
      hgt += Math.sin(v * 46) * 0.06 * smoothstep(0.05, 0.25, v) * smoothstep(0.95, 0.7, v);
      // Raised lettering band.
      const band = smoothstep(0.42, 0.5, v) * smoothstep(0.66, 0.58, v);
      const glyph = Math.abs(((u * 44) % 1) - 0.5) * 2;
      hgt += band * smoothstep(0.45, 0.75, glyph) * 0.55;
      hgt += (Math.sin(u * 640) * Math.cos(v * 590)) * 0.03;
      return hgt;
    },
    0.006
  );
}

/** Drilled + slotted brake rotor face, as a combined roughness/AO map. */
function rotorFaceTexture(size = 256) {
  return dataTexture(
    size,
    size,
    (u, v, px) => {
      const x = u - 0.5;
      const y = v - 0.5;
      const r = Math.hypot(x, y) * 2; // 0..1 across the rotor
      const a = Math.atan2(y, x);
      let val = 0.62;
      // Swept cooling slots.
      const slot = Math.abs(((a / TAU + 0.5 + r * 0.11) * 9) % 1 - 0.5) * 2;
      if (r > 0.42 && r < 0.96) val -= smoothstep(0.9, 0.99, slot) * 0.34;
      // Cross-drilled holes on two rings.
      for (const ring of [0.58, 0.78]) {
        const holes = ring === 0.58 ? 22 : 26;
        const ha = ((a / TAU + 0.5) * holes) % 1;
        const d = Math.hypot((ha - 0.5) * (TAU * ring) / holes, r - ring);
        if (d < 0.022) val = 0.05;
      }
      // Hub face and outer edge.
      if (r < 0.4) val = 0.35;
      const shade = Math.round(clamp(val, 0, 1) * 255);
      px[0] = px[1] = px[2] = shade;
    },
    { colorSpace: THREE.NoColorSpace }
  );
}

/** Honeycomb grille mesh used as an alpha + roughness pattern. */
function honeycombTexture(size = 256, cells = 13) {
  return dataTexture(
    size,
    size,
    (u, v, px) => {
      const sx = u * cells;
      const sy = v * cells * 1.155;
      const row = Math.floor(sy);
      const fx = (sx + (row % 2) * 0.5) % 1;
      const fy = sy % 1;
      // Hex-ish cell: distance to cell border.
      const dx = Math.abs(fx - 0.5) * 2;
      const dy = Math.abs(fy - 0.5) * 2;
      const d = Math.max(dx * 0.87 + dy * 0.5, dy);
      const web = smoothstep(0.62, 0.86, d); // 1 on the web, 0 in the hole
      const shade = Math.round(web * 255);
      px[0] = px[1] = px[2] = shade;
      px[3] = 255;
    },
    { colorSpace: THREE.NoColorSpace }
  );
}

/** Soft elliptical contact shadow with darker pools under each wheel. */
function contactShadowTexture(spec, size = 256) {
  const halfL = spec.length * 0.62;
  const halfW = spec.width * 0.62;
  const wheels = [
    [spec.frontAxle, spec.trackFront / 2],
    [spec.frontAxle, -spec.trackFront / 2],
    [spec.rearAxle, spec.trackRear / 2],
    [spec.rearAxle, -spec.trackRear / 2],
  ];
  return dataTexture(
    size,
    size,
    (u, v, px) => {
      const z = (v - 0.5) * 2 * halfL;
      const x = (u - 0.5) * 2 * halfW;
      // Body blob: a super-ellipse footprint, soft at the edges.
      const q =
        Math.pow(Math.abs(x / (spec.width * 0.44)), 2.6) +
        Math.pow(Math.abs(z / (spec.length * 0.42)), 3.4);
      let a = smoothstep(1.35, 0.15, q) * 0.62;
      // Tyre contact patches are much darker and much tighter.
      for (const [wz, wx] of wheels) {
        const d = Math.hypot((x - wx) / 0.19, (z - wz) / 0.3);
        a = Math.min(1, a + smoothstep(1.5, 0.0, d) * 0.62);
      }
      // three.js reads alphaMap from the green channel, not the alpha channel.
      px[0] = px[1] = px[2] = Math.round(clamp(a, 0, 1) * 255);
      px[3] = 255;
    },
    { colorSpace: THREE.NoColorSpace }
  );
}

/* ==========================================================================
   3. Studio environment (a real HDRI, computed rather than downloaded)
   ========================================================================== */

/**
 * A car is 90% reflection. Without a decent environment, any car model looks
 * like painted clay — so this builds a floating-point equirectangular light
 * probe with overhead strip lights (the long specular streaks you see in
 * every car advert), a key softbox, fill, and a horizon.
 *
 * @param {THREE.WebGLRenderer} renderer
 * @returns {{envMap:THREE.Texture, source:THREE.DataTexture, dispose:()=>void}}
 */
export function createStudioEnvironment(renderer, options = {}) {
  const {
    size = 512,
    preset = 'studio',
    intensity = 1,
    strips = 3,
  } = options;

  const P =
    preset === 'sunset'
      ? {
          zenith: [0.10, 0.14, 0.26],
          horizon: [1.0, 0.52, 0.26],
          floor: [0.05, 0.045, 0.05],
          key: { az: -0.55, el: 0.12, r: 0.16, i: [26, 12, 5] },
          fill: { az: 2.4, el: 0.5, r: 0.9, i: [0.5, 0.6, 0.9] },
          rim: { az: 2.9, el: 0.22, r: 0.5, i: [1.4, 1.0, 0.8] },
          stripI: [1.2, 1.0, 0.95],
          glow: 0.9,
        }
      : {
          zenith: [0.42, 0.45, 0.5],
          horizon: [0.30, 0.31, 0.34],
          floor: [0.05, 0.05, 0.055],
          key: { az: 0.7, el: 0.85, r: 0.42, i: [7.5, 7.5, 7.6] },
          fill: { az: -2.1, el: 0.55, r: 0.7, i: [1.7, 1.8, 2.1] },
          rim: { az: 3.0, el: 0.32, r: 0.42, i: [3.2, 3.1, 3.0] },
          stripI: [9.0, 9.0, 9.2],
          glow: 0.18,
        };

  const dir = (az, el) => [
    Math.cos(el) * Math.cos(az),
    Math.sin(el),
    Math.cos(el) * Math.sin(az),
  ];
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

  const w = size;
  const h = size >> 1;
  const data = new Float32Array(w * h * 4);
  const lights = [P.key, P.fill, P.rim].map((L) => ({ d: dir(L.az, L.el), r: L.r, i: L.i }));

  // Overhead strip lights: parallel bands of constant dir.x, running fore/aft.
  const stripOffsets = [];
  for (let i = 0; i < strips; i++) {
    stripOffsets.push(strips === 1 ? 0 : lerp(-0.46, 0.46, i / (strips - 1)));
  }

  for (let j = 0; j < h; j++) {
    const el = ((j + 0.5) / h - 0.5) * Math.PI;
    const sy = Math.sin(el);
    const cy = Math.cos(el);
    for (let i = 0; i < w; i++) {
      const az = ((i + 0.5) / w - 0.5) * TAU;
      const d = [cy * Math.cos(az), sy, cy * Math.sin(az)];

      // Sky / floor gradient.
      let r;
      let g;
      let b;
      if (sy >= 0) {
        const k = Math.pow(sy, 0.55);
        r = lerp(P.horizon[0], P.zenith[0], k);
        g = lerp(P.horizon[1], P.zenith[1], k);
        b = lerp(P.horizon[2], P.zenith[2], k);
      } else {
        const k = Math.pow(-sy, 0.4);
        r = lerp(P.horizon[0] * 0.45, P.floor[0], k);
        g = lerp(P.horizon[1] * 0.45, P.floor[1], k);
        b = lerp(P.horizon[2] * 0.45, P.floor[2], k);
      }

      // Horizon glow — gives the body sides a bright grazing band.
      const glow = Math.exp(-Math.pow(sy / 0.05, 2)) * P.glow;
      r += glow;
      g += glow;
      b += glow;

      // Softboxes.
      for (const L of lights) {
        const ang = Math.acos(clamp(dot(d, L.d), -1, 1));
        const f = smoothstep(L.r, L.r * 0.25, ang);
        if (f > 0) {
          r += L.i[0] * f;
          g += L.i[1] * f;
          b += L.i[2] * f;
        }
      }

      // Overhead strips (only above the horizon).
      if (sy > 0.12) {
        const gate = smoothstep(0.12, 0.4, sy);
        for (const c of stripOffsets) {
          const f = smoothstep(0.075, 0.03, Math.abs(d[0] - c)) * gate;
          if (f > 0) {
            r += P.stripI[0] * f;
            g += P.stripI[1] * f;
            b += P.stripI[2] * f;
          }
        }
      }

      const o = (j * w + i) * 4;
      data[o] = r * intensity;
      data[o + 1] = g * intensity;
      data[o + 2] = b * intensity;
      data[o + 3] = 1;
    }
  }

  const source = new THREE.DataTexture(data, w, h, THREE.RGBAFormat, THREE.FloatType);
  source.mapping = THREE.EquirectangularReflectionMapping;
  source.colorSpace = THREE.LinearSRGBColorSpace;
  source.minFilter = THREE.LinearFilter;
  source.magFilter = THREE.LinearFilter;
  source.needsUpdate = true;

  const pmrem = new THREE.PMREMGenerator(renderer);
  const target = pmrem.fromEquirectangular(source);
  pmrem.dispose();

  return {
    envMap: target.texture,
    source,
    dispose() {
      target.dispose();
      source.dispose();
    },
  };
}

/* ==========================================================================
   4. Vehicle specifications
   ========================================================================== */

/**
 * Every silhouette is authored as a set of profiles sampled along Z (metres,
 * +Z = nose). Read the `top` array as the side-view roofline and the `width`
 * array as the plan-view. Editing these numbers is how you design a new car;
 * nothing else in the file needs to change.
 */
const PRESETS = {
  /** Low, wide, fastback grand tourer. The default. */
  gt: {
    name: 'gt',
    length: 4.75,
    width: 1.92,
    frontAxle: 1.435,
    rearAxle: -1.435,
    trackFront: 1.662,
    trackRear: 1.680,
    wheelRadius: 0.353,
    wheelWidth: 0.255,
    rimRadius: 0.268,
    archRadius: 0.408,
    // Side view: roofline. The last few centimetres at each end collapse fast,
    // which is what turns the loft into a near-vertical fascia you can hang a
    // grille and lamps on instead of a soap-bar snout.
    top: [
      [-2.375, 0.545], [-2.362, 0.700], [-2.340, 0.800], [-2.300, 0.878],
      [-2.200, 0.948], [-2.050, 0.986], [-1.850, 1.008], [-1.620, 1.048],
      [-1.400, 1.128], [-1.150, 1.222], [-0.900, 1.302], [-0.700, 1.348],
      [-0.500, 1.378], [-0.250, 1.392], [0.000, 1.395], [0.230, 1.386],
      [0.420, 1.352], [0.600, 1.288], [0.800, 1.182], [0.950, 1.092],
      [1.060, 1.038], [1.200, 1.014], [1.500, 1.010], [1.800, 1.000],
      [2.000, 0.958], [2.120, 0.930], [2.220, 0.898], [2.300, 0.862],
      [2.340, 0.798], [2.362, 0.702], [2.375, 0.548],
    ],
    // Side view: rocker / underbody line
    bottom: [
      [-2.375, 0.500], [-2.362, 0.398], [-2.340, 0.323], [-2.300, 0.253],
      [-2.180, 0.212], [-1.950, 0.192], [-1.500, 0.180], [-0.800, 0.174],
      [0.000, 0.172], [0.800, 0.174], [1.500, 0.176], [1.900, 0.166],
      [2.100, 0.152], [2.230, 0.154], [2.300, 0.176], [2.340, 0.250],
      [2.362, 0.348], [2.375, 0.500],
    ],
    // Plan view: half width
    width_: [
      [-2.375, 0.020], [-2.362, 0.352], [-2.340, 0.548], [-2.300, 0.706],
      [-2.200, 0.824], [-2.050, 0.898], [-1.850, 0.938], [-1.600, 0.957],
      [-1.400, 0.960], [-1.150, 0.951], [-0.800, 0.932], [-0.200, 0.923],
      [0.400, 0.926], [0.900, 0.938], [1.250, 0.952], [1.500, 0.955],
      [1.750, 0.946], [1.950, 0.924], [2.100, 0.896], [2.220, 0.856],
      [2.300, 0.782], [2.340, 0.606], [2.362, 0.390], [2.375, 0.020],
    ],
    // Tumblehome: how much narrower the roof is than the shoulder
    taperTop: [
      [-2.375, 0.14], [-2.100, 0.13], [-1.850, 0.15], [-1.600, 0.21],
      [-1.300, 0.255], [-0.900, 0.272], [-0.200, 0.276], [0.400, 0.272],
      [0.750, 0.250], [1.000, 0.215], [1.200, 0.160], [1.600, 0.140],
      [2.000, 0.145], [2.375, 0.170],
    ],
    // How much the sill tucks under the shoulder
    taperBottom: [
      [-2.375, 0.20], [-2.050, 0.160], [-1.200, 0.140], [0.400, 0.138],
      [1.500, 0.144], [2.050, 0.165], [2.375, 0.210],
    ],
    // Radius of the roof / bonnet edge where the top rolls into the flank
    filletTop: [
      [-2.375, 0.090], [-2.280, 0.115], [-2.050, 0.100], [-1.500, 0.108],
      [-0.600, 0.115], [0.100, 0.118], [0.500, 0.108], [0.850, 0.082],
      [1.060, 0.062], [1.300, 0.095], [1.750, 0.118], [2.100, 0.120],
      [2.280, 0.118], [2.375, 0.090],
    ],
    // Radius of the bottom edge where the rocker rolls under
    filletBottom: [
      [-2.375, 0.085], [-2.250, 0.105], [-1.800, 0.100], [0.000, 0.104],
      [1.700, 0.100], [2.150, 0.105], [2.300, 0.110], [2.375, 0.085],
    ],
    // 0 = the authored car section, 1 = a plain ellipse. Only the extreme
    // nose and tail need it, and only to keep the fascia crease-free.
    round: [
      [-2.375, 1.00], [-2.330, 0.62], [-2.270, 0.22], [-2.170, 0.00],
      [2.170, 0.00], [2.270, 0.22], [2.330, 0.62], [2.375, 1.00],
    ],
    // Character line: a few millimetres of proud crease down the flank
    crease: [
      [-2.375, 0.000], [-2.000, 0.003], [-1.700, 0.009], [-1.150, 0.012],
      [0.000, 0.011], [1.100, 0.012], [1.650, 0.009], [2.050, 0.003],
      [2.375, 0.000],
    ],
    // Beltline height — the lower edge of all the glass
    belt: [
      [-2.375, 1.30], [-1.980, 1.28], [-1.800, 1.060], [-1.550, 1.010],
      [-1.100, 0.994], [-0.400, 0.988], [0.300, 0.992], [0.750, 1.004],
      [0.980, 1.020], [1.120, 1.120], [1.350, 1.35], [2.375, 1.38],
    ],
    // Daylight opening (side glass outline) in the (z, y) side view
    dlo: [
      [1.010, 1.040], [0.470, 1.258], [-0.600, 1.262], [-1.460, 1.048],
    ],
    windshield: [0.42, 1.06],   // z range where the top surface is glass
    backlight: [-1.62, -0.56],  // z range where the top surface is glass
    pillars: [{ z: -0.28, w: 0.050 }], // extra painted bands (B-pillar)
    doorCuts: [0.82, -0.26, -1.28],
    hoodCut: [1.09, 2.06],
    trunkCut: [-2.16, -1.02],
    exhaust: { z: -2.30, x: 0.50, y: 0.315, r: 0.050, count: 2 },
    spoiler: 'lip',
  },

  /** Taller, boxier crossover on bigger wheels. */
  suv: {
    name: 'suv',
    length: 4.72,
    width: 1.96,
    frontAxle: 1.40,
    rearAxle: -1.42,
    trackFront: 1.66,
    trackRear: 1.67,
    wheelRadius: 0.375,
    wheelWidth: 0.255,
    rimRadius: 0.255,
    archRadius: 0.455,
    top: [
      [-2.36, 0.70], [-2.30, 1.070], [-2.22, 1.240], [-2.05, 1.408],
      [-1.85, 1.516], [-1.60, 1.596], [-1.32, 1.652], [-0.90, 1.686],
      [-0.40, 1.695],
      [0.15, 1.690], [0.48, 1.668], [0.72, 1.575], [0.95, 1.400],
      [1.12, 1.290], [1.45, 1.278], [1.85, 1.262], [2.08, 1.215],
      [2.22, 1.130], [2.31, 0.985], [2.36, 0.720],
    ],
    bottom: [
      [-2.36, 0.66], [-2.30, 0.395], [-2.18, 0.295], [-1.90, 0.262],
      [-1.30, 0.245], [0.00, 0.240], [1.20, 0.246], [1.90, 0.235],
      [2.14, 0.222], [2.26, 0.255], [2.36, 0.640],
    ],
    width_: [
      [-2.36, 0.16], [-2.30, 0.66], [-2.20, 0.835], [-2.02, 0.915],
      [-1.80, 0.958], [-1.45, 0.978], [-1.10, 0.968], [-0.50, 0.945],
      [0.30, 0.942], [0.95, 0.958], [1.32, 0.975], [1.66, 0.968],
      [1.95, 0.935], [2.15, 0.870], [2.29, 0.700], [2.36, 0.150],
    ],
    taperTop: [
      [-2.36, 0.10], [-2.05, 0.11], [-1.70, 0.15], [-1.30, 0.215],
      [-0.50, 0.235], [0.30, 0.235], [0.75, 0.20], [1.05, 0.13],
      [1.60, 0.09], [2.36, 0.10],
    ],
    taperBottom: [
      [-2.36, 0.22], [-2.00, 0.17], [-1.00, 0.15], [0.60, 0.15],
      [1.60, 0.16], [2.10, 0.19], [2.36, 0.24],
    ],
    belt: [
      [-2.36, 1.85], [-2.02, 1.85], [-1.78, 1.185], [-1.30, 1.175],
      [-0.40, 1.170], [0.40, 1.180], [0.90, 1.205], [1.12, 1.240],
      [1.36, 1.90], [2.36, 1.90],
    ],
    dlo: [
      [1.075, 1.262], [0.54, 1.545], [-0.78, 1.556], [-1.44, 1.318],
    ],
    windshield: [0.50, 1.12],
    backlight: [-2.22, -1.52],
    round: [
      [-2.36, 1.00], [-2.315, 0.55], [-2.250, 0.18], [-2.150, 0.00],
      [2.150, 0.00], [2.250, 0.18], [2.315, 0.55], [2.36, 1.00],
    ],
    filletTop: [
      [-2.36, 0.085], [-2.250, 0.105], [-1.900, 0.115], [-0.600, 0.120],
      [0.300, 0.120], [0.700, 0.100], [1.000, 0.072], [1.250, 0.100],
      [1.800, 0.120], [2.150, 0.115], [2.280, 0.105], [2.36, 0.085],
    ],
    filletBottom: [
      [-2.36, 0.080], [-2.220, 0.100], [-1.700, 0.104], [0.000, 0.108],
      [1.700, 0.104], [2.150, 0.104], [2.290, 0.100], [2.36, 0.080],
    ],
    crease: [
      [-2.36, 0.000], [-2.000, 0.004], [-1.650, 0.010], [-1.100, 0.013],
      [0.000, 0.012], [1.050, 0.013], [1.600, 0.010], [2.000, 0.004],
      [2.36, 0.000],
    ],
    pillars: [{ z: -0.24, w: 0.055 }, { z: -1.02, w: 0.048 }],
    doorCuts: [0.86, -0.22, -1.24],
    hoodCut: [1.16, 2.02],
    trunkCut: null,
    exhaust: { z: -2.26, x: 0.56, y: 0.36, r: 0.05, count: 2 },
    spoiler: 'roof',
  },

  /** Compact hot-hatch: short overhangs, upright tail. */
  hatch: {
    name: 'hatch',
    length: 4.14,
    width: 1.82,
    frontAxle: 1.28,
    rearAxle: -1.30,
    trackFront: 1.545,
    trackRear: 1.535,
    wheelRadius: 0.335,
    wheelWidth: 0.235,
    rimRadius: 0.232,
    archRadius: 0.405,
    top: [
      [-2.07, 0.62], [-2.01, 0.96], [-1.95, 1.090], [-1.86, 1.198],
      [-1.74, 1.302], [-1.58, 1.378], [-1.36, 1.422], [-1.02, 1.440],
      [-0.55, 1.442],
      [0.00, 1.432], [0.30, 1.402], [0.56, 1.300], [0.80, 1.135],
      [0.98, 1.020], [1.30, 1.010], [1.62, 0.995], [1.84, 0.958],
      [1.97, 0.895], [2.04, 0.785], [2.07, 0.585],
    ],
    bottom: [
      [-2.07, 0.50], [-2.01, 0.285], [-1.90, 0.222], [-1.60, 0.196],
      [-0.90, 0.182], [0.30, 0.180], [1.10, 0.184], [1.68, 0.172],
      [1.92, 0.158], [2.01, 0.280], [2.07, 0.490],
    ],
    width_: [
      [-2.07, 0.14], [-2.02, 0.60], [-1.94, 0.760], [-1.80, 0.845],
      [-1.60, 0.888], [-1.32, 0.906], [-1.00, 0.898], [-0.45, 0.872],
      [0.25, 0.868], [0.80, 0.882], [1.18, 0.902], [1.48, 0.896],
      [1.74, 0.866], [1.94, 0.805], [2.03, 0.640], [2.07, 0.130],
    ],
    taperTop: [
      [-2.07, 0.13], [-1.85, 0.16], [-1.55, 0.24], [-1.10, 0.31],
      [-0.40, 0.325], [0.15, 0.325], [0.60, 0.28], [0.98, 0.15],
      [1.45, 0.09], [2.07, 0.11],
    ],
    taperBottom: [
      [-2.07, 0.21], [-1.75, 0.16], [-0.80, 0.14], [0.60, 0.14],
      [1.45, 0.15], [1.90, 0.18], [2.07, 0.23],
    ],
    belt: [
      [-2.07, 1.45], [-1.86, 1.45], [-1.70, 1.045], [-1.20, 1.020],
      [-0.50, 1.005], [0.20, 1.010], [0.76, 1.030], [0.99, 1.045],
      [1.22, 1.42], [2.07, 1.42],
    ],
    dlo: [
      [0.955, 1.058], [0.38, 1.318], [-0.72, 1.326], [-1.28, 1.150],
    ],
    windshield: [0.32, 0.99],
    backlight: [-1.98, -1.34],
    round: [
      [-2.07, 1.00], [-2.030, 0.55], [-1.975, 0.18], [-1.880, 0.00],
      [1.880, 0.00], [1.975, 0.18], [2.030, 0.55], [2.07, 1.00],
    ],
    filletTop: [
      [-2.07, 0.075], [-1.960, 0.098], [-1.700, 0.105], [-0.600, 0.110],
      [0.150, 0.110], [0.500, 0.092], [0.900, 0.062], [1.150, 0.090],
      [1.600, 0.110], [1.900, 0.105], [2.010, 0.095], [2.07, 0.075],
    ],
    filletBottom: [
      [-2.07, 0.070], [-1.940, 0.092], [-1.500, 0.098], [0.000, 0.100],
      [1.500, 0.098], [1.880, 0.096], [2.010, 0.092], [2.07, 0.070],
    ],
    crease: [
      [-2.07, 0.000], [-1.800, 0.004], [-1.500, 0.009], [-1.000, 0.011],
      [0.000, 0.010], [0.950, 0.011], [1.450, 0.009], [1.800, 0.004],
      [2.07, 0.000],
    ],
    pillars: [{ z: -0.24, w: 0.05 }],
    doorCuts: [0.70, -0.22, -1.22],
    hoodCut: [1.04, 1.80],
    trunkCut: null,
    exhaust: { z: -2.00, x: 0.44, y: 0.28, r: 0.044, count: 2 },
    spoiler: 'roof',
  },
};

/* ==========================================================================
   5. The body surface
   ========================================================================== */

/**
 * Section parameter budget. `q` runs 0 → 1 up one half of a cross-section,
 * from the centre of the floor to the centre of the roof, and each stretch of
 * the car's section gets a fixed slice of it. Because the slices are fixed,
 * the same `q` means "the beltline" at every station, so lines of constant `q`
 * run along the car exactly where a designer would draw them.
 */
const Q_FLOOR = 0.11;   // flat underbody
const Q_LOWER = 0.25;   // bottom edge fillet ends
const Q_BELT = 0.47;    // lower flank ends at the shoulder / beltline
const Q_ROOFF = 0.72;   // greenhouse (upper flank) ends
const Q_ROOF = 0.88;    // roof edge fillet ends, flat roof begins

/**
 * The body is a single lofted surface. At every station along Z we evaluate a
 * cross-section built from six stretches — flat floor, bottom fillet, lower
 * flank (with the character line), greenhouse taper, roof fillet, flat roof —
 * whose dimensions come from the profile curves above. The wheel arches are
 * then carved into it by dishing the flanks inside a circle centred on each hub.
 *
 * A single super-ellipse cannot do this: making the roof flat makes the sides
 * razor-edged, and rounding the sides domes the roof into a bubble canopy.
 * Splitting the section into named stretches decouples the two, and hands every
 * downstream detail a meaningful coordinate to attach itself to.
 *
 * Because it is one continuous parametric surface, every added detail —
 * headlight lenses, shut lines, badges, glass — can be generated *from* the
 * surface, so nothing ever floats above the paint or sinks into it.
 */
class BodySurface {
  constructor(spec) {
    this.spec = spec;
    this.zRear = spec.bottom[0][0];
    this.zFront = spec.bottom[spec.bottom.length - 1][0];
    this.length = this.zFront - this.zRear;

    this.fTop = monotoneCurve(spec.top);
    this.fBottom = monotoneCurve(spec.bottom);
    this.fWidth = monotoneCurve(spec.width_);
    this.fTaperTop = monotoneCurve(spec.taperTop);
    this.fTaperBottom = monotoneCurve(spec.taperBottom);
    this.fBelt = monotoneCurve(spec.belt);
    // Fillet and crease profiles are optional: a spec that omits them still
    // builds, it just gets a uniform edge radius instead of an authored one.
    const span = (v, endV) => [
      [this.zRear, endV], [this.zRear + this.length * 0.06, v],
      [this.zFront - this.length * 0.06, v], [this.zFront, endV],
    ];
    this.fFilletTop = monotoneCurve(spec.filletTop || span(0.105, 0.075));
    this.fFilletBottom = monotoneCurve(spec.filletBottom || span(0.100, 0.075));
    this.fCrease = monotoneCurve(spec.crease || span(0.010, 0));
    this.fRound = monotoneCurve(spec.round || span(0, 1));

    this.arches = [
      { z: spec.frontAxle, y: spec.wheelRadius, r: spec.archRadius },
      { z: spec.rearAxle, y: spec.wheelRadius, r: spec.archRadius },
    ];
  }

  zAt(t) {
    return this.zRear + t * this.length;
  }

  tAt(z) {
    return (z - this.zRear) / this.length;
  }

  /** Resolve every dimension of the cross-section at a station. */
  station(z) {
    const yTop = this.fTop(z);
    const yBot = this.fBottom(z);
    const h = Math.max(1e-4, yTop - yBot);
    const wMax = Math.max(1e-4, this.fWidth(z));
    // Fillets can never eat more than 80% of the section height between them.
    let rB = this.fFilletBottom(z);
    let rT = this.fFilletTop(z);
    const room = h * 0.8;
    if (rB + rT > room) {
      const k = room / (rB + rT);
      rB *= k;
      rT *= k;
    }
    const wSill = wMax * (1 - this.fTaperBottom(z));
    const wRoof = wMax * (1 - this.fTaperTop(z));
    const yLower = yBot + rB;
    const yUpper = yTop - rT;
    const yBelt = clamp(this.fBelt(z), yLower + 0.008, yUpper - 0.008);
    return {
      yTop, yBot, h, wMax, wSill, wRoof, rB, rT, yLower, yUpper, yBelt,
      fxB: clamp(rB / Math.max(wSill, 1e-3), 0, 0.85),
      fxT: clamp(rT / Math.max(wRoof, 1e-3), 0, 0.85),
      crease: this.fCrease(z),
      round: this.fRound(z),
    };
  }

  /** Half-section outline: q in [0,1] from floor centre to roof centre. */
  sectionPoint(st, q, out = { x: 0, y: 0 }) {
    if (q <= Q_FLOOR) {
      out.x = st.wSill * (1 - st.fxB) * (q / Q_FLOOR);
      out.y = st.yBot;
    } else if (q <= Q_LOWER) {
      const th = ((q - Q_FLOOR) / (Q_LOWER - Q_FLOOR)) * (Math.PI / 2);
      out.x = st.wSill * (1 - st.fxB * (1 - Math.sin(th)));
      out.y = st.yBot + st.rB * (1 - Math.cos(th));
    } else if (q <= Q_BELT) {
      const k = (q - Q_LOWER) / (Q_BELT - Q_LOWER);
      // Convex flank, plus a tent-shaped character line that catches highlights.
      const crease = st.crease * Math.max(0, 1 - Math.abs(k - 0.62) / 0.22);
      out.x = st.wSill + (st.wMax - st.wSill) * Math.pow(k, 0.55) + crease;
      out.y = st.yLower + (st.yBelt - st.yLower) * k;
    } else if (q <= Q_ROOFF) {
      const k = (q - Q_BELT) / (Q_ROOFF - Q_BELT);
      out.x = st.wMax + (st.wRoof - st.wMax) * Math.pow(k, 0.85);
      out.y = st.yBelt + (st.yUpper - st.yBelt) * k;
    } else if (q <= Q_ROOF) {
      const th = ((q - Q_ROOFF) / (Q_ROOF - Q_ROOFF)) * (Math.PI / 2);
      out.x = st.wRoof * (1 - st.fxT * (1 - Math.cos(th)));
      out.y = st.yUpper + st.rT * Math.sin(th);
    } else {
      out.x = st.wRoof * (1 - st.fxT) * (1 - (q - Q_ROOF) / (1 - Q_ROOF));
      out.y = st.yTop;
    }
    // Near the nose and tail, blend toward a plain ellipse. A chamfered
    // rounded-rectangle shrinking to a point drags its corners along four
    // diagonal ridges — the star-shaped crease you get across an otherwise
    // smooth bumper. An ellipse has no corners to drag.
    if (st.round > 0) {
      const th = q * Math.PI;
      out.x = lerp(out.x, st.wMax * Math.sin(th), st.round);
      out.y = lerp(out.y, (st.yTop + st.yBot) * 0.5 - (st.h * 0.5) * Math.cos(th), st.round);
    }
    return out;
  }

  /** s in [0,1) around the whole section; 0 = floor centre, 0.5 = roof centre. */
  static qOf(s) {
    const w = s - Math.floor(s);
    return w <= 0.5 ? w * 2 : (1 - w) * 2;
  }

  static sideOf(s) {
    const w = s - Math.floor(s);
    return w <= 0.5 ? 1 : -1;
  }

  /** Un-deformed section point, before wheel arches are carved. */
  rawPoint(z, s, out = new THREE.Vector3()) {
    const st = this.station(z);
    const p = this.sectionPoint(st, BodySurface.qOf(s), _sec);
    return out.set(p.x * BodySurface.sideOf(s), p.y, z);
  }

  /** Half-width of the section at a given height; negative when out of range. */
  halfWidthAtY(st, y) {
    if (y <= st.yBot || y >= st.yTop) {
      return -(Math.min(Math.abs(y - st.yBot), Math.abs(y - st.yTop)) + 1e-3);
    }
    // y increases monotonically with q, so bisection always converges.
    let lo = 0;
    let hi = 1;
    for (let i = 0; i < 28; i++) {
      const mid = (lo + hi) * 0.5;
      if (this.sectionPoint(st, mid, _sec).y < y) lo = mid;
      else hi = mid;
    }
    return this.sectionPoint(st, (lo + hi) * 0.5, _sec).x;
  }

  /** The q that sits at height y on this station (null when out of range). */
  qAtY(z, y) {
    const st = this.station(z);
    if (y <= st.yBot || y >= st.yTop) return null;
    let lo = 0;
    let hi = 1;
    for (let i = 0; i < 28; i++) {
      const mid = (lo + hi) * 0.5;
      if (this.sectionPoint(st, mid, _sec).y < y) lo = mid;
      else hi = mid;
    }
    return (lo + hi) * 0.5;
  }

  /**
   * Drop a point straight onto the nose or tail, the way a decal would land.
   * Marching Z inward until (x, y) crosses the section outline is what lets the
   * grille, the lamps and the splitter sit on the real fascia instead of being
   * eyeballed into position — and it keeps working when the profiles change.
   *
   * @param {number} x,y   where the detail should appear, seen head-on
   * @param {1|-1} end     +1 = front of the car, -1 = rear
   * @param {number} span  how far back from the tip to search, in metres
   */
  projectEnd(x, y, end = 1, span = 0.55) {
    const zTip = end > 0 ? this.zFront : this.zRear;
    const zIn = zTip - end * span;
    const inside = (z) => this.halfWidthAtY(this.station(z), y) - Math.abs(x);
    let a = zIn;
    let b = zTip;
    if (inside(a) <= 0) {
      // Behind the search window the point is still outside the body: give up
      // gracefully at the widest station rather than returning nonsense.
      let best = a;
      let bestV = inside(a);
      for (let i = 1; i <= 12; i++) {
        const z = zIn - end * (i / 12) * span;
        const v = inside(z);
        if (v > bestV) { bestV = v; best = z; }
      }
      if (bestV <= 0) return null;
      a = best;
    }
    for (let i = 0; i < 34; i++) {
      const m = (a + b) * 0.5;
      if (inside(m) > 0) a = m;
      else b = m;
    }
    const z = a;
    const q = this.qAtY(z, y);
    if (q === null) return null;
    const s = x >= 0 ? q * 0.5 : 1 - q * 0.5;
    return { t: clamp(this.tAt(z), 0, 1), s, z };
  }

  /** Same idea, but landing on a flank: exact, since y is monotone in q. */
  projectSide(z, y, side = 1) {
    const q = this.qAtY(z, y);
    if (q === null) return null;
    return { t: clamp(this.tAt(z), 0, 1), s: side >= 0 ? q * 0.5 : 1 - q * 0.5, z };
  }

  /** Carve the wheel arches: the flanks dish inward inside each arch circle. */
  applyArches(p) {
    const halfW = Math.max(0.05, this.fWidth(p.z));
    const sideness = smoothstep(0.40, 0.72, Math.abs(p.x) / halfW);
    if (sideness <= 0) return p;
    for (const a of this.arches) {
      const d = Math.hypot(p.z - a.z, p.y - a.y);
      if (d < a.r) {
        const f = smoothstep(a.r, a.r * 0.55, d) * sideness;
        p.x *= 1 - 0.46 * f;
      } else if (d < a.r * 1.22) {
        // A small muscular flare just outside the arch lip.
        const f = smoothstep(a.r * 1.22, a.r * 1.04, d) * sideness;
        p.x *= 1 + 0.021 * f;
      }
    }
    return p;
  }

  /** Final surface point. */
  point(t, phi, out = new THREE.Vector3()) {
    this.rawPoint(this.zAt(t), phi, out);
    return this.applyArches(out);
  }

  /** Outward normal, by central differences on the deformed surface. */
  normal(t, phi, out = new THREE.Vector3()) {
    const h = 1 / 4096;
    const a = this.point(clamp(t - h, 0, 1), phi, _v1);
    const b = this.point(clamp(t + h, 0, 1), phi, _v2);
    const c = this.point(t, phi - 0.002, _v3);
    const d = this.point(t, phi + 0.002, _v4);
    const tt = _v5.subVectors(b, a);
    const tp = _v6.subVectors(d, c);
    return out.crossVectors(tp, tt).normalize();
  }

  /**
   * Is this bit of the shell a window?
   *
   * Returns a signed distance in metres: > 0 inside the glass, slightly
   * negative in the blacked-out surround, strongly negative on paint. Working
   * in section coordinates rather than from surface normals is what makes the
   * A-pillars, roof rails and B-pillar fall out for free: the greenhouse
   * stretch of the section *is* the side glass, clipped by the daylight
   * opening, and the flat-roof stretch *is* the windscreen inside its Z band.
   *
   * @param {number} q  section parameter
   * @param {THREE.Vector3} p world position
   */
  glassScore(q, p) {
    const s = this.spec;
    let score = -1;

    if (q > 0.80) {
      // Flat top: glass only across the windscreen and backlight bands.
      for (const band of [s.windshield, s.backlight]) {
        if (!band) continue;
        const zEdge = Math.min(p.z - band[0], band[1] - p.z);
        score = Math.max(score, Math.min(zEdge, (q - 0.80) * 1.3));
      }
    } else if (q > 0.50) {
      // Greenhouse flank: glass wherever the daylight opening says so.
      score = Math.max(score, Math.min(convexInset(s.dlo, p.z, p.y), (0.80 - q) * 1.3));
    }
    // Painted pillar bands cut straight through.
    for (const b of s.pillars || []) {
      score = Math.min(score, Math.abs(p.z - b.z) - b.w);
    }
    return score;
  }

  /** How deep inside a wheel arch a point is (0 = outside, 1 = deep). */
  archDepth(p) {
    let best = 0;
    for (const a of this.arches) {
      const d = Math.hypot(p.z - a.z, p.y - a.y);
      if (d < a.r) best = Math.max(best, smoothstep(a.r, a.r * 0.62, d));
    }
    return best;
  }

  /**
   * Build the hull geometry, split into material groups:
   *   0 paint · 1 glass · 2 gloss-black trim · 3 matte underbody/arch liner
   */
  build(stations, segments) {
    const N = stations;
    const M = segments;
    const cols = M + 1; // duplicate seam column for clean UVs
    const vertCount = N * cols + 2; // + 2 cap centres
    const pos = new Float32Array(vertCount * 3);
    const nrm = new Float32Array(vertCount * 3);
    const uv = new Float32Array(vertCount * 2);

    const P = [];
    const tmp = new THREE.Vector3();
    for (let i = 0; i < N; i++) {
      const t = i / (N - 1);
      const row = [];
      for (let j = 0; j < cols; j++) {
        const phi = (j % M) / M;
        const p = this.point(t, phi, new THREE.Vector3());
        row.push(p);
        const o = (i * cols + j) * 3;
        pos[o] = p.x;
        pos[o + 1] = p.y;
        pos[o + 2] = p.z;
        uv[(i * cols + j) * 2] = j / M;
        uv[(i * cols + j) * 2 + 1] = t;
      }
      P.push(row);
    }

    // Normals from grid neighbours (keeps the seam perfectly smooth).
    const ta = new THREE.Vector3();
    const tb = new THREE.Vector3();
    for (let i = 0; i < N; i++) {
      for (let j = 0; j < cols; j++) {
        const jp = (j - 1 + M) % M;
        const jn = (j + 1) % M;
        ta.subVectors(P[i][jn], P[i][jp]);
        const i0 = Math.max(0, i - 1);
        const i1 = Math.min(N - 1, i + 1);
        tb.subVectors(P[i1][j], P[i0][j]);
        tmp.crossVectors(ta, tb).normalize();
        if (!Number.isFinite(tmp.x) || tmp.lengthSq() < 0.5) {
          tmp.copy(P[i][j]).setZ(0).normalize();
        }
        const o = (i * cols + j) * 3;
        nrm[o] = tmp.x;
        nrm[o + 1] = tmp.y;
        nrm[o + 2] = tmp.z;
      }
    }

    // Cap centres (the nose and tail sections are tiny, so these are hidden).
    const capIdx = [N * cols, N * cols + 1];
    [0, N - 1].forEach((row, k) => {
      let cx = 0;
      let cy = 0;
      let cz = 0;
      for (let j = 0; j < M; j++) {
        cx += P[row][j].x;
        cy += P[row][j].y;
        cz += P[row][j].z;
      }
      const o = capIdx[k] * 3;
      pos[o] = cx / M;
      pos[o + 1] = cy / M;
      pos[o + 2] = cz / M;
      nrm[o] = 0;
      nrm[o + 1] = 0;
      nrm[o + 2] = k === 0 ? -1 : 1;
      uv[capIdx[k] * 2] = 0.5;
      uv[capIdx[k] * 2 + 1] = k;
    });

    // Classify every triangle and bucket it by material.
    const buckets = [[], [], [], []];
    const cA = new THREE.Vector3();
    const pushTri = (a, b, c, q) => {
      cA.set(
        (pos[a * 3] + pos[b * 3] + pos[c * 3]) / 3,
        (pos[a * 3 + 1] + pos[b * 3 + 1] + pos[c * 3 + 1]) / 3,
        (pos[a * 3 + 2] + pos[b * 3 + 2] + pos[c * 3 + 2]) / 3
      );

      let mat = 0;
      if (this.archDepth(cA) > 0.42) {
        mat = 3; // inner wheel arch
      } else if (q < Q_FLOOR * 0.92 && cA.y < this.spec.wheelRadius * 0.66) {
        // Underbody — but only where it really is underneath. At the nose and
        // tail this same stretch of the section wraps up onto the bumper, and
        // painting that matte black puts a black bow-tie across the fascia.
        mat = 3;
      } else {
        const g = this.glassScore(q, cA);
        if (g > 0.006) mat = 1;
        else if (g > -0.026) mat = 2;
      }
      buckets[mat].push(a, b, c);
    };

    for (let i = 0; i < N - 1; i++) {
      for (let j = 0; j < M; j++) {
        const a = i * cols + j;
        const b = i * cols + j + 1;
        const c = (i + 1) * cols + j + 1;
        const d = (i + 1) * cols + j;
        const q = BodySurface.qOf((j + 0.5) / M);
        pushTri(a, b, c, q);
        pushTri(a, c, d, q);
      }
    }
    for (let j = 0; j < M; j++) {
      buckets[0].push(capIdx[0], j + 1, j); // rear cap
      const base = (N - 1) * cols;
      buckets[0].push(capIdx[1], base + j, base + j + 1); // front cap
    }

    const indices = [];
    const groups = [];
    for (let m = 0; m < buckets.length; m++) {
      if (!buckets[m].length) continue;
      groups.push({ start: indices.length, count: buckets[m].length, material: m });
      for (const v of buckets[m]) indices.push(v);
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('normal', new THREE.BufferAttribute(nrm, 3));
    geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    geo.setIndex(indices);
    for (const g of groups) geo.addGroup(g.start, g.count, g.material);
    geo.computeBoundingSphere();
    return { geometry: geo, groups };
  }

  /**
   * A rectangular patch of the body surface, floated `offset` metres along the
   * normal. Used for lamps, badges, grilles — anything that must lie exactly on
   * the paint no matter how curved it is.
   */
  patch(tRange, phiRange, offset = 0.004, res = [14, 14]) {
    const [t0, t1] = tRange;
    const [p0, p1] = phiRange;
    const [nu, nv] = res;
    const pos = [];
    const nor = [];
    const uvs = [];
    const idx = [];
    const p = new THREE.Vector3();
    const n = new THREE.Vector3();
    for (let i = 0; i <= nu; i++) {
      const t = lerp(t0, t1, i / nu);
      for (let j = 0; j <= nv; j++) {
        const phi = lerp(p0, p1, j / nv);
        this.point(t, phi, p);
        this.normal(t, phi, n);
        pos.push(p.x + n.x * offset, p.y + n.y * offset, p.z + n.z * offset);
        nor.push(n.x, n.y, n.z);
        uvs.push(j / nv, i / nu);
      }
    }
    for (let i = 0; i < nu; i++) {
      for (let j = 0; j < nv; j++) {
        const a = i * (nv + 1) + j;
        const b = a + 1;
        const c = a + nv + 1;
        const d = c + 1;
        idx.push(a, b, c, b, d, c);
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    g.setIndex(idx);
    return g;
  }

  /**
   * A thin ribbon that follows a path across the surface — panel gaps, shut
   * lines, the seam around a bonnet. This is a large part of why the result
   * reads as a manufactured object instead of a single blob.
   */
  ribbon(path, width = 0.006, offset = 0.0016) {
    const pts = [];
    const nrms = [];
    const p = new THREE.Vector3();
    const n = new THREE.Vector3();
    for (const [t, phi] of path) {
      pts.push(this.point(t, phi, new THREE.Vector3()));
      nrms.push(this.normal(t, phi, new THREE.Vector3()));
    }
    const pos = [];
    const nor = [];
    const uvs = [];
    const idx = [];
    const tan = new THREE.Vector3();
    const side = new THREE.Vector3();
    for (let i = 0; i < pts.length; i++) {
      const a = pts[Math.max(0, i - 1)];
      const b = pts[Math.min(pts.length - 1, i + 1)];
      tan.subVectors(b, a).normalize();
      n.copy(nrms[i]);
      side.crossVectors(tan, n).normalize().multiplyScalar(width * 0.5);
      p.copy(pts[i]).addScaledVector(n, offset);
      pos.push(p.x - side.x, p.y - side.y, p.z - side.z);
      pos.push(p.x + side.x, p.y + side.y, p.z + side.z);
      nor.push(n.x, n.y, n.z, n.x, n.y, n.z);
      uvs.push(0, i / (pts.length - 1), 1, i / (pts.length - 1));
    }
    for (let i = 0; i < pts.length - 1; i++) {
      const a = i * 2;
      idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    g.setIndex(idx);
    return g;
  }
}

const _v1 = new THREE.Vector3();
const _v2 = new THREE.Vector3();
const _v3 = new THREE.Vector3();
const _v4 = new THREE.Vector3();
const _v5 = new THREE.Vector3();
const _v6 = new THREE.Vector3();
const _sec = { x: 0, y: 0 };

/* ==========================================================================
   6. Materials
   ========================================================================== */

function buildMaterials(opts, textures) {
  const paint = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(opts.bodyColor),
    metalness: opts.paintMetalness,
    roughness: opts.paintRoughness,
    clearcoat: 1.0,
    clearcoatRoughness: 0.035,
    envMapIntensity: opts.envMapIntensity,
    normalMap: opts.flakes > 0 ? textures.flake : null,
    normalScale: new THREE.Vector2(opts.flakes * 0.28, opts.flakes * 0.28),
    sheen: 0.0,
  });
  if (paint.normalMap) paint.normalMap.repeat.set(220, 90);

  const glass =
    opts.glass === 'transmission'
      ? new THREE.MeshPhysicalMaterial({
          color: new THREE.Color(opts.glassTint),
          metalness: 0,
          roughness: 0.035,
          transmission: 0.74,
          thickness: 0.05,
          ior: 1.52,
          transparent: true,
          opacity: 1,
          envMapIntensity: opts.envMapIntensity * 1.35,
          clearcoat: 1,
          clearcoatRoughness: 0.02,
          side: THREE.DoubleSide,
        })
      : new THREE.MeshPhysicalMaterial({
          color: new THREE.Color(opts.glassTint),
          metalness: 0.1,
          roughness: 0.045,
          transparent: true,
          opacity: 0.72,
          envMapIntensity: opts.envMapIntensity * 1.6,
          clearcoat: 1,
          clearcoatRoughness: 0.02,
          side: THREE.DoubleSide,
          depthWrite: false,
        });

  const glossBlack = new THREE.MeshPhysicalMaterial({
    color: 0x0b0c0e,
    metalness: 0.15,
    roughness: 0.12,
    clearcoat: 1,
    clearcoatRoughness: 0.06,
    envMapIntensity: opts.envMapIntensity,
  });

  const matteBlack = new THREE.MeshStandardMaterial({
    color: 0x121316,
    metalness: 0.05,
    roughness: 0.92,
    envMapIntensity: opts.envMapIntensity * 0.5,
  });

  const chrome = new THREE.MeshPhysicalMaterial({
    color: 0xdfe3e8,
    metalness: 1,
    roughness: 0.06,
    envMapIntensity: opts.envMapIntensity * 1.2,
  });

  const darkChrome = new THREE.MeshPhysicalMaterial({
    color: 0x5b6068,
    metalness: 1,
    roughness: 0.22,
    envMapIntensity: opts.envMapIntensity,
  });

  const rim = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(opts.rimColor),
    metalness: 1,
    roughness: 0.19,
    clearcoat: 0.6,
    clearcoatRoughness: 0.12,
    envMapIntensity: opts.envMapIntensity * 1.1,
  });

  const rubber = new THREE.MeshPhysicalMaterial({
    color: 0x131315,
    metalness: 0,
    roughness: 0.88,
    normalMap: textures.tread,
    normalScale: new THREE.Vector2(1.4, 1.4),
    envMapIntensity: opts.envMapIntensity * 0.35,
    sheen: 0.25,
    sheenRoughness: 0.9,
    sheenColor: new THREE.Color(0x2a2a2e),
  });

  const sidewall = new THREE.MeshPhysicalMaterial({
    color: 0x0f0f11,
    metalness: 0,
    roughness: 0.94,
    normalMap: textures.sidewall,
    normalScale: new THREE.Vector2(1.0, 1.0),
    envMapIntensity: opts.envMapIntensity * 0.3,
  });

  const rotor = new THREE.MeshStandardMaterial({
    color: 0x4e5157,
    metalness: 1,
    roughness: 0.62,
    map: textures.rotor,
    roughnessMap: textures.rotor,
    envMapIntensity: opts.envMapIntensity * 0.8,
  });
  if (rotor.map) rotor.map.colorSpace = THREE.SRGBColorSpace;

  const caliper = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(opts.caliperColor),
    metalness: 0.35,
    roughness: 0.35,
    clearcoat: 0.5,
    envMapIntensity: opts.envMapIntensity,
  });

  const grille = new THREE.MeshStandardMaterial({
    color: 0x9298a1,
    metalness: 0.9,
    roughness: 0.42,
    map: textures.honeycomb,
    roughnessMap: textures.honeycomb,
    envMapIntensity: opts.envMapIntensity * 0.8,
  });
  if (grille.map) grille.map.colorSpace = THREE.SRGBColorSpace;

  const lensClear = new THREE.MeshPhysicalMaterial({
    color: 0xeef2f8,
    metalness: 0,
    roughness: 0.04,
    transmission: 0.94,
    thickness: 0.015,
    ior: 1.48,
    transparent: true,
    envMapIntensity: opts.envMapIntensity * 0.75,
    clearcoat: 1,
    clearcoatRoughness: 0.02,
  });

  const lensRed = new THREE.MeshPhysicalMaterial({
    color: 0x8e0d12,
    metalness: 0,
    roughness: 0.07,
    transmission: 0.65,
    thickness: 0.05,
    ior: 1.5,
    transparent: true,
    envMapIntensity: opts.envMapIntensity * 1.2,
    clearcoat: 1,
    clearcoatRoughness: 0.03,
  });

  const emitWhite = new THREE.MeshStandardMaterial({
    color: 0x4c5560,
    emissive: new THREE.Color(0xfff4e2),
    emissiveIntensity: 0,
    roughness: 0.3,
    metalness: 0,
  });

  const emitRed = new THREE.MeshStandardMaterial({
    color: 0x230508,
    emissive: new THREE.Color(0xe01018),
    emissiveIntensity: 0.30,
    roughness: 0.35,
    metalness: 0,
  });

  const emitReverse = new THREE.MeshStandardMaterial({
    color: 0x9aa2ad,
    emissive: new THREE.Color(0xf4f8ff),
    emissiveIntensity: 0,
    roughness: 0.18,
    metalness: 0,
  });

  const emitAmber = new THREE.MeshStandardMaterial({
    color: 0x2a1a05,
    emissive: new THREE.Color(0xff9500),
    emissiveIntensity: 0,
    roughness: 0.35,
    metalness: 0,
  });

  const interior = new THREE.MeshPhysicalMaterial({
    color: 0x0d0e10,
    metalness: 0.0,
    roughness: 0.88,
    sheen: 0.3,
    sheenRoughness: 0.75,
    sheenColor: new THREE.Color(0x24262b),
    envMapIntensity: opts.envMapIntensity * 0.12,
  });

  const mirrorGlass = new THREE.MeshPhysicalMaterial({
    color: 0xaab4c2,
    metalness: 1,
    roughness: 0.04,
    envMapIntensity: opts.envMapIntensity * 1.3,
  });

  return {
    paint, glass, glossBlack, matteBlack, chrome, darkChrome, rim, rubber,
    sidewall, rotor, caliper, grille, lensClear, lensRed, emitWhite, emitRed,
    emitAmber, emitReverse, interior, mirrorGlass,
  };
}

/* ==========================================================================
   7. Wheels
   ========================================================================== */

/**
 * Surface of revolution about the X axis, with per-vertex radial displacement
 * so the tread grooves are real geometry rather than a texture illusion.
 */
function revolve(profile, segments, opts = {}) {
  const { displace = null, uRepeat = 1 } = opts;
  const n = profile.length;
  const cols = segments + 1;
  const pos = [];
  const uvs = [];
  const idx = [];
  // Arc-length parametrisation for stable V coordinates.
  const arc = [0];
  for (let i = 1; i < n; i++) {
    arc.push(arc[i - 1] + Math.hypot(profile[i][0] - profile[i - 1][0], profile[i][1] - profile[i - 1][1]));
  }
  const total = arc[n - 1] || 1;

  for (let i = 0; i < n; i++) {
    const [r0, x0] = profile[i];
    for (let j = 0; j < cols; j++) {
      const a = (j / segments) * TAU;
      const v = arc[i] / total;
      const r = displace ? r0 + displace(v, j / segments, i) : r0;
      pos.push(x0, Math.cos(a) * r, Math.sin(a) * r);
      uvs.push((j / segments) * uRepeat, v);
    }
  }
  for (let i = 0; i < n - 1; i++) {
    for (let j = 0; j < segments; j++) {
      const a = i * cols + j;
      const b = a + 1;
      const c = (i + 1) * cols + j;
      const d = c + 1;
      idx.push(a, c, b, b, c, d);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

function buildTyre(spec, mats, quality) {
  const R = spec.wheelRadius;
  const hw = spec.wheelWidth * 0.5;
  const rimR = spec.rimRadius;
  const seg = quality.tyreSegments;
  const group = new THREE.Group();

  // Casing profile, inner bead to outer bead. A real tyre is mostly flat
  // tread with an abrupt shoulder; making it a torus is what turns a wheel
  // into a doughnut.
  const shoulder = R * 0.985;
  const outer = [
    [rimR + 0.020, -hw * 0.84],
    [rimR + 0.040, -hw * 0.99],
    [R * 0.74, -hw * 1.00],
    [R * 0.90, -hw * 0.97],
    [shoulder, -hw * 0.88],
    [R * 0.999, -hw * 0.79],   // tread starts
    [R * 1.002, -hw * 0.55],
    [R * 1.004, -hw * 0.20],
    [R * 1.004, hw * 0.20],
    [R * 1.002, hw * 0.55],
    [R * 0.999, hw * 0.79],    // tread ends
    [shoulder, hw * 0.88],
    [R * 0.90, hw * 0.97],
    [R * 0.74, hw * 1.00],
    [rimR + 0.040, hw * 0.99],
    [rimR + 0.020, hw * 0.84],
  ];
  const TREAD_FROM = 5;
  const TREAD_TO = 10;
  const grooveRows = new Set([6, 8]);

  const tyre = revolve(outer, seg, {
    displace: (v, u, i) => {
      let d = 0;
      if (grooveRows.has(i)) d -= 0.0105;              // circumferential grooves
      if (i >= TREAD_FROM && i <= TREAD_TO) {
        const sipe = Math.abs(((u * 52 + i * 0.11) % 1) - 0.5) * 2;
        d -= (1 - smoothstep(0.10, 0.40, sipe)) * 0.004; // lateral sipes
      }
      return d;
    },
  });

  // Split into tread and sidewall so each gets its own surface finish.
  const perRow = seg * 6;
  tyre.clearGroups();
  tyre.addGroup(0, TREAD_FROM * perRow, 1);
  tyre.addGroup(TREAD_FROM * perRow, (TREAD_TO - TREAD_FROM) * perRow, 0);
  tyre.addGroup(TREAD_TO * perRow, (outer.length - 1 - TREAD_TO) * perRow, 1);
  const tyreMesh = new THREE.Mesh(tyre, [mats.rubber, mats.sidewall]);
  tyreMesh.castShadow = true;
  group.add(tyreMesh);

  return group;
}

function buildRim(spec, mats, opts, quality) {
  const rimR = spec.rimRadius;
  const hw = spec.wheelWidth * 0.5;
  const seg = quality.rimSegments;
  const g = new THREE.Group();
  const faceX = hw * 0.74;   // the spoke face sits just inboard of the outer lip

  // One continuous revolve for the whole rim well: outer flange, bead seat,
  // drop centre, inner flange. Modelling it as separate cylinders is what
  // produced the floating chrome ring.
  const barrel = [
    [rimR + 0.011, hw * 0.97],   // outer flange tip
    [rimR + 0.011, hw * 0.92],
    [rimR - 0.002, hw * 0.90],   // bead seat
    [rimR - 0.004, hw * 0.55],
    [rimR - 0.030, hw * 0.34],   // drop centre
    [rimR - 0.032, -hw * 0.30],
    [rimR - 0.004, -hw * 0.55],
    [rimR - 0.002, -hw * 0.90],
    [rimR + 0.012, -hw * 0.94],
    [rimR + 0.012, -hw * 0.99],
  ];
  const barrelMesh = new THREE.Mesh(revolve(barrel, seg), mats.rim);
  barrelMesh.material = mats.rim.clone();
  barrelMesh.material.side = THREE.DoubleSide;
  g.add(barrelMesh);

  // A dark plate closing the back of the rim so the road never shows through.
  const backing = new THREE.Mesh(
    new THREE.CircleGeometry(rimR - 0.006, seg),
    mats.matteBlack
  );
  backing.geometry.rotateY(-Math.PI / 2);
  backing.geometry.translate(-hw * 0.34, 0, 0);
  g.add(backing);

  // Spokes: tapered, slightly swept blades with a chamfer to catch highlights.
  const spokeShape = (a0, sweep, wIn, wOut, rIn, rOut) => {
    const shape = new THREE.Shape();
    const K = 12;
    const left = [];
    const right = [];
    for (let k = 0; k <= K; k++) {
      const s = k / K;
      const r = lerp(rIn, rOut, s);
      const a = a0 + sweep * Math.pow(s, 1.4);
      // Flare into the rim at the very end so the spoke lands on the barrel.
      const w = lerp(wIn, wOut, Math.pow(s, 0.8)) * (1 + 0.9 * Math.pow(s, 8));
      left.push([Math.cos(a) * r - Math.sin(a) * w, Math.sin(a) * r + Math.cos(a) * w]);
      right.push([Math.cos(a) * r + Math.sin(a) * w, Math.sin(a) * r - Math.cos(a) * w]);
    }
    shape.moveTo(left[0][0], left[0][1]);
    for (let k = 1; k < left.length; k++) shape.lineTo(left[k][0], left[k][1]);
    for (let k = right.length - 1; k >= 0; k--) shape.lineTo(right[k][0], right[k][1]);
    shape.closePath();
    return shape;
  };

  const pairs = opts.rimStyle === 'mesh' ? 10 : 5;
  const splay = opts.rimStyle === 'mesh' ? 0 : 0.20;
  const depth = 0.040;
  for (let i = 0; i < pairs; i++) {
    const base = (i / pairs) * TAU;
    for (const off of splay ? [-splay, splay] : [0]) {
      const geo = new THREE.ExtrudeGeometry(
        spokeShape(base + off, -off * 0.75, 0.026, 0.019, 0.068, rimR - 0.004),
        {
          depth,
          bevelEnabled: true,
          bevelThickness: 0.0055,
          bevelSize: 0.005,
          bevelSegments: 2,
          curveSegments: 2,
          steps: 1,
        }
      );
      geo.rotateY(Math.PI / 2);
      geo.translate(faceX - depth, 0, 0);
      g.add(new THREE.Mesh(geo, mats.rim));
    }
  }

  // Hub, centre cap and lug bolts.
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.082, 0.092, 0.075, 32), mats.rim);
  hub.geometry.rotateZ(Math.PI / 2);
  hub.geometry.translate(faceX - 0.037, 0, 0);
  g.add(hub);

  const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.050, 0.052, 0.014, 32), mats.darkChrome);
  cap.geometry.rotateZ(Math.PI / 2);
  cap.geometry.translate(faceX + 0.005, 0, 0);
  g.add(cap);

  const capFace = new THREE.Mesh(new THREE.CircleGeometry(0.043, 32), mats.chrome);
  capFace.geometry.rotateY(Math.PI / 2);
  capFace.geometry.translate(faceX + 0.013, 0, 0);
  g.add(capFace);

  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * TAU + 0.32;
    const bolt = new THREE.Mesh(new THREE.CylinderGeometry(0.0115, 0.0125, 0.016, 6), mats.darkChrome);
    bolt.geometry.rotateZ(Math.PI / 2);
    bolt.geometry.translate(faceX - 0.004, 0, 0);
    bolt.position.set(0, Math.cos(a) * 0.061, Math.sin(a) * 0.061);
    g.add(bolt);
  }

  g.traverse((o) => {
    if (o.isMesh) {
      o.castShadow = true;
      o.receiveShadow = true;
    }
  });
  return g;
}

function buildBrake(spec, mats) {
  const g = new THREE.Group();
  const R = spec.rimRadius * 0.80;
  const x = -spec.wheelWidth * 0.10;   // sits inboard, seen through the spokes

  const disc = new THREE.Mesh(new THREE.CylinderGeometry(R, R, 0.028, 56, 1, false), [
    mats.rotor.clone(),
    mats.rotor,
    mats.rotor,
  ]);
  disc.material[0].map = null;
  disc.material[0].roughnessMap = null;
  disc.material[0].roughness = 0.5;
  disc.geometry.rotateZ(Math.PI / 2);
  disc.geometry.translate(x, 0, 0);
  g.add(disc);

  // Bell: the top-hat section joining rotor to hub.
  const bell = new THREE.Mesh(new THREE.CylinderGeometry(0.076, 0.076, 0.05, 24), mats.matteBlack);
  bell.geometry.rotateZ(Math.PI / 2);
  bell.geometry.translate(x + 0.032, 0, 0);
  g.add(bell);

  // Monobloc caliper straddling the disc, mounted trailing-top.
  const caliper = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.070, 0.070, 0.155), mats.caliper);
  caliper.add(body);
  const bridge = new THREE.Mesh(new THREE.BoxGeometry(0.086, 0.024, 0.125), mats.caliper);
  bridge.position.y = 0.040;
  caliper.add(bridge);
  caliper.position.set(x, R * 0.72, -0.055);
  caliper.rotation.x = -0.22;
  g.add(caliper);

  g.traverse((o) => {
    if (o.isMesh) o.castShadow = true;
  });
  return g;
}

/* ==========================================================================
   8. Details — lights, grille, mirrors, interior, trim
   ========================================================================== */

/**
 * Project a rectangle of the head-on view onto the nose or tail and build a
 * patch from it. Anything that would be a decal on a real car — lamp lenses,
 * grille, splitter, badges — is made this way, so it wraps the fascia exactly
 * however the profiles are later retuned.
 */
function endPatch(surface, o) {
  const { x0, x1, y0, y1, end = 1, offset = 0.004, res = [10, 16], span = 0.75 } = o;
  const [nu, nv] = res;
  const pos = [];
  const nor = [];
  const uvs = [];
  const idx = [];
  const p = new THREE.Vector3();
  const n = new THREE.Vector3();
  for (let i = 0; i <= nu; i++) {
    const y = lerp(y0, y1, i / nu);
    for (let j = 0; j <= nv; j++) {
      const x = lerp(x0, x1, j / nv);
      // Walk inward until the point actually lands on the body, so a lamp that
      // overhangs the fascia hugs its edge instead of vanishing.
      let hit = null;
      for (let k = 0; k <= 8 && !hit; k++) {
        const f = 1 - k * 0.05;
        hit = surface.projectEnd(x * f, y, end, span);
      }
      if (!hit) hit = { t: end > 0 ? 0.985 : 0.015, s: 0.25 };
      surface.point(hit.t, hit.s, p);
      surface.normal(hit.t, hit.s, n);
      pos.push(p.x + n.x * offset, p.y + n.y * offset, p.z + n.z * offset);
      nor.push(n.x, n.y, n.z);
      uvs.push(j / nv, i / nu);
    }
  }
  const flip = (x1 - x0) * end > 0;
  for (let i = 0; i < nu; i++) {
    for (let j = 0; j < nv; j++) {
      const a = i * (nv + 1) + j;
      if (flip) idx.push(a, a + 1, a + nv + 1, a + 1, a + nv + 2, a + nv + 1);
      else idx.push(a, a + nv + 1, a + 1, a + 1, a + nv + 1, a + nv + 2);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  g.setIndex(idx);
  return g;
}

/** The same trick on a flank, where the section solves exactly. */
function sidePatch(surface, o) {
  const { z0, z1, y0, y1, side = 1, offset = 0.004, res = [8, 12] } = o;
  const [nu, nv] = res;
  const pos = [];
  const nor = [];
  const uvs = [];
  const idx = [];
  const p = new THREE.Vector3();
  const n = new THREE.Vector3();
  for (let i = 0; i <= nu; i++) {
    const y = lerp(y0, y1, i / nu);
    for (let j = 0; j <= nv; j++) {
      const z = lerp(z0, z1, j / nv);
      const hit = surface.projectSide(z, y, side) || { t: surface.tAt(z), s: side > 0 ? 0.25 : 0.75 };
      surface.point(hit.t, hit.s, p);
      surface.normal(hit.t, hit.s, n);
      pos.push(p.x + n.x * offset * side, p.y + n.y * offset, p.z + n.z * offset);
      nor.push(n.x, n.y, n.z);
      uvs.push(j / nv, i / nu);
    }
  }
  for (let i = 0; i < nu; i++) {
    for (let j = 0; j < nv; j++) {
      const a = i * (nv + 1) + j;
      if (side > 0) idx.push(a, a + nv + 1, a + 1, a + 1, a + nv + 1, a + nv + 2);
      else idx.push(a, a + 1, a + nv + 1, a + 1, a + nv + 2, a + nv + 1);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  g.setIndex(idx);
  return g;
}

/** A thin surface-hugging frame around a rectangle of the fascia. */
function endFrame(surface, mats, parent, o, mat, w = 0.014) {
  const { x0, x1, y0, y1, end = 1, span = 0.75 } = o;
  const seg = 22;
  const runs = [
    Array.from({ length: seg + 1 }, (_, k) => [lerp(x0, x1, k / seg), y0]),
    Array.from({ length: seg + 1 }, (_, k) => [lerp(x0, x1, k / seg), y1]),
    Array.from({ length: 9 }, (_, k) => [x0, lerp(y0, y1, k / 8)]),
    Array.from({ length: 9 }, (_, k) => [x1, lerp(y0, y1, k / 8)]),
  ];
  for (const run of runs) {
    const path = [];
    for (const [x, y] of run) {
      const hit = surface.projectEnd(x, y, end, span);
      if (hit) path.push([hit.t, hit.s]);
    }
    if (path.length > 2) parent.add(new THREE.Mesh(surface.ribbon(path, w, 0.012), mat));
  }
}

function addPanelLines(surface, mats, parent, spec) {
  const lineMat = new THREE.MeshStandardMaterial({
    color: 0x07080a,
    roughness: 0.9,
    metalness: 0,
  });
  const sOf = (q, side) => (side > 0 ? q * 0.5 : 1 - q * 0.5);
  const add = (path, w = 0.006) => parent.add(new THREE.Mesh(surface.ribbon(path, w), lineMat));

  // Door shuts: up the flank from the sill to just over the shoulder.
  for (const z of spec.doorCuts || []) {
    const t = surface.tAt(z);
    for (const side of [1, -1]) {
      const path = [];
      for (let k = 0; k <= 26; k++) path.push([t, sOf(lerp(0.15, 0.545, k / 26), side)]);
      add(path);
    }
  }

  // Bonnet: two shut lines along the wing tops plus the seam at the cowl.
  if (spec.hoodCut) {
    const [z0, z1] = spec.hoodCut;
    for (const side of [1, -1]) {
      const path = [];
      for (let k = 0; k <= 34; k++) path.push([surface.tAt(lerp(z0, z1, k / 34)), sOf(0.845, side)]);
      add(path, 0.005);
    }
    // Straight across the cowl: s sweeps through the roof centre at 0.5.
    const across = [];
    for (let k = 0; k <= 26; k++) across.push([surface.tAt(z0), lerp(0.845 * 0.5, 1 - 0.845 * 0.5, k / 26)]);
    add(across, 0.005);
  }

  // Boot lid.
  if (spec.trunkCut) {
    const [z0, z1] = spec.trunkCut;
    for (const side of [1, -1]) {
      const path = [];
      for (let k = 0; k <= 28; k++) path.push([surface.tAt(lerp(z0, z1, k / 28)), sOf(0.83, side)]);
      add(path, 0.005);
    }
    const across = [];
    for (let k = 0; k <= 26; k++) across.push([surface.tAt(z1), lerp(0.83 * 0.5, 1 - 0.83 * 0.5, k / 26)]);
    add(across, 0.005);
  }

  // Fuel filler flap.
  const ff = surface.projectSide(spec.rearAxle + 0.34, 1.02 - 0.28, -1);
  if (ff) {
    const ring = [];
    for (let k = 0; k <= 24; k++) {
      const a = (k / 24) * TAU;
      const h = surface.projectSide(
        spec.rearAxle + 0.34 + Math.cos(a) * 0.085,
        0.80 + Math.sin(a) * 0.075,
        -1
      );
      if (h) ring.push([h.t, h.s]);
    }
    if (ring.length > 3) add(ring, 0.005);
  }
}

function addFrontEnd(surface, mats, parent, spec, opts) {
  const span = 0.9;
  const yT = surface.fTop(spec.frontAxle + 0.75);

  // --- Headlamps: recessed dark housing, LED signature, clear lens over it.
  for (const side of [1, -1]) {
    const box = { x0: side * 0.26, x1: side * 0.86, y0: 0.690, y1: 0.822, end: 1, span };
    parent.add(new THREE.Mesh(endPatch(surface, { ...box, offset: 0.003, res: [8, 18] }), mats.matteBlack));

    for (const [a, b, m] of [[0.70, 0.84, mats.emitWhite], [0.30, 0.44, mats.emitWhite]]) {
      parent.add(new THREE.Mesh(
        endPatch(surface, {
          ...box,
          y0: lerp(box.y0, box.y1, a),
          y1: lerp(box.y0, box.y1, b),
          offset: 0.006,
          res: [3, 16],
        }),
        m
      ));
    }
    // Amber indicator at the outboard end.
    parent.add(new THREE.Mesh(
      endPatch(surface, {
        ...box,
        x0: lerp(box.x0, box.x1, 0.72),
        y0: lerp(box.y0, box.y1, 0.42),
        y1: lerp(box.y0, box.y1, 0.60),
        offset: 0.006,
        res: [2, 6],
      }),
      mats.emitAmber
    ));
    parent.add(new THREE.Mesh(endPatch(surface, { ...box, offset: 0.010, res: [8, 18] }), mats.lensClear));
    endFrame(surface, mats, parent, box, mats.glossBlack, 0.012);
  }

  // --- Main grille.
  const grille = { x0: -0.50, x1: 0.50, y0: 0.315, y1: 0.585, end: 1, span };
  const gm = mats.grille.clone();
  gm.map = mats.grille.map.clone();
  gm.map.repeat.set(9, 2.6);
  gm.map.needsUpdate = true;
  gm.roughnessMap = gm.map;
  parent.add(new THREE.Mesh(endPatch(surface, { ...grille, offset: 0.003, res: [8, 26] }), gm));
  endFrame(surface, mats, parent, grille, mats.darkChrome, 0.020);

  // --- Corner intakes and splitter.
  for (const side of [1, -1]) {
    parent.add(new THREE.Mesh(
      endPatch(surface, {
        x0: side * 0.54, x1: side * 0.745, y0: 0.315, y1: 0.500, end: 1, span,
        offset: 0.004, res: [5, 7],
      }),
      mats.matteBlack
    ));
  }
  parent.add(new THREE.Mesh(
    endPatch(surface, { x0: -0.755, x1: 0.755, y0: 0.190, y1: 0.272, end: 1, span, offset: 0.008, res: [3, 26] }),
    mats.matteBlack
  ));

  // --- Badge on the bonnet edge.
  parent.add(new THREE.Mesh(
    endPatch(surface, { x0: -0.040, x1: 0.040, y0: 0.745, y1: 0.787, end: 1, span, offset: 0.006, res: [3, 4] }),
    mats.darkChrome
  ));

  return { yT };
}

function addRearEnd(surface, mats, parent, spec, opts) {
  const span = 0.9;

  // --- Full-width tail bar: housing, lit element, lens over the top.
  const bar = { x0: -0.86, x1: 0.86, y0: 0.790, y1: 0.884, end: -1, span };
  parent.add(new THREE.Mesh(endPatch(surface, { ...bar, offset: 0.003, res: [6, 34] }), mats.matteBlack));
  parent.add(new THREE.Mesh(
    endPatch(surface, {
      ...bar, y0: lerp(bar.y0, bar.y1, 0.34), y1: lerp(bar.y0, bar.y1, 0.66),
      offset: 0.011, res: [3, 34],
    }),
    mats.emitRed
  ));
  parent.add(new THREE.Mesh(endPatch(surface, { ...bar, offset: 0.010, res: [6, 34] }), mats.lensRed));
  endFrame(surface, mats, parent, bar, mats.glossBlack, 0.012);

  // --- Reversing lights low in the valance.
  for (const side of [1, -1]) {
    parent.add(new THREE.Mesh(
      endPatch(surface, {
        x0: side * 0.44, x1: side * 0.58, y0: 0.410, y1: 0.446, end: -1, span,
        offset: 0.011, res: [2, 6],
      }),
      mats.emitWhite
    ));
  }

  // --- Diffuser with vertical strakes.
  const diff = { x0: -0.70, x1: 0.70, y0: 0.196, y1: 0.352, end: -1, span };
  parent.add(new THREE.Mesh(endPatch(surface, { ...diff, offset: 0.003, res: [4, 26] }), mats.matteBlack));
  for (let i = 0; i < 7; i++) {
    const x = lerp(-0.58, 0.58, i / 6);
    parent.add(new THREE.Mesh(
      endPatch(surface, { x0: x - 0.012, x1: x + 0.012, y0: 0.195, y1: 0.350, end: -1, span, offset: 0.010, res: [3, 2] }),
      mats.matteBlack
    ));
  }

  // --- Exhaust tips.
  const ex = spec.exhaust;
  if (ex) {
    for (const side of [1, -1]) {
      for (let k = 0; k < ex.count; k++) {
        const tip = new THREE.Group();
        const shell = new THREE.Mesh(new THREE.CylinderGeometry(ex.r, ex.r * 0.95, 0.115, 22, 1, true), mats.chrome);
        shell.geometry.rotateX(Math.PI / 2);
        shell.material = mats.chrome.clone();
        shell.material.side = THREE.DoubleSide;
        tip.add(shell);
        const bore = new THREE.Mesh(new THREE.CylinderGeometry(ex.r * 0.84, ex.r * 0.84, 0.12, 22), mats.matteBlack);
        bore.geometry.rotateX(Math.PI / 2);
        bore.position.z = -0.014;
        tip.add(bore);
        const px = side * (ex.x + k * ex.r * 2.5);
        const hit = surface.projectEnd(px, ex.y, -1, 0.9);
        const at = hit ? surface.point(hit.t, hit.s, new THREE.Vector3()) : new THREE.Vector3(px, ex.y, ex.z);
        tip.position.set(at.x, at.y, at.z + 0.038);
        parent.add(tip);
      }
    }
  }

  // --- Boot-lip spoiler / roof wing.
  if (spec.spoiler === 'lip') {
    const t0 = surface.tAt(surface.zRear + 0.10);
    const t1 = surface.tAt(surface.zRear + 0.26);
    parent.add(new THREE.Mesh(surface.patch([t0, t1], [0.365, 0.635], 0.028, [4, 26]), mats.paint));
  } else if (spec.spoiler === 'roof') {
    const t0 = surface.tAt(spec.backlight[0] + 0.03);
    const t1 = surface.tAt(spec.backlight[0] + 0.22);
    parent.add(new THREE.Mesh(surface.patch([t0, t1], [0.395, 0.605], 0.026, [4, 22]), mats.glossBlack));
  }
}

function addSideDetails(surface, mats, parent, spec, opts) {
  const belt = monotoneCurve(spec.belt);

  // --- Door mirrors on a short stalk at the base of the A-pillar.
  const zM = spec.windshield[1] - 0.20;
  for (const side of [1, -1]) {
    const hit = surface.projectSide(zM, belt(zM) + 0.012, side);
    if (!hit) continue;
    const anchor = surface.point(hit.t, hit.s, new THREE.Vector3());
    const g = new THREE.Group();

    const stalk = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.036, 0.060, 12), mats.glossBlack);
    stalk.geometry.rotateZ(Math.PI / 2);
    stalk.position.x = side * 0.030;
    g.add(stalk);

    const shell = new THREE.Mesh(new THREE.SphereGeometry(0.088, 20, 14), mats.paint);
    shell.scale.set(0.62, 0.46, 0.86);
    shell.position.set(side * 0.090, 0.016, -0.016);
    g.add(shell);

    const face = new THREE.Mesh(new THREE.CircleGeometry(0.052, 20), mats.mirrorGlass);
    face.scale.set(1.0, 0.68, 1);
    face.rotation.y = Math.PI;
    face.rotation.x = 0.05;
    face.position.set(side * 0.090, 0.016, -0.055);
    g.add(face);

    g.position.copy(anchor);
    g.position.y += 0.055;
    parent.add(g);
  }

  // --- Flush door handles, set just under the shoulder line.
  const cuts = spec.doorCuts || [];
  for (const side of [1, -1]) {
    for (let i = 0; i < Math.min(2, cuts.length); i++) {
      const z = cuts[i] - 0.30;
      const y = belt(z) - 0.115;
      const hit = surface.projectSide(z, y, side);
      if (!hit) continue;
      const p = surface.point(hit.t, hit.s, new THREE.Vector3());
      const n = surface.normal(hit.t, hit.s, new THREE.Vector3());
      const recess = new THREE.Mesh(new THREE.BoxGeometry(0.010, 0.044, 0.175), mats.matteBlack);
      recess.position.copy(p).addScaledVector(n, 0.002);
      recess.lookAt(p.clone().addScaledVector(n, 1));
      recess.rotateY(Math.PI / 2);
      parent.add(recess);

      const pull = new THREE.Mesh(new THREE.BoxGeometry(0.016, 0.026, 0.150), mats.darkChrome);
      pull.position.copy(p).addScaledVector(n, 0.009);
      pull.lookAt(p.clone().addScaledVector(n, 1));
      pull.rotateY(Math.PI / 2);
      parent.add(pull);
    }
  }

  // --- Wing vent behind the front arch.
  for (const side of [1, -1]) {
    const z = spec.frontAxle + spec.archRadius + 0.09;
    const hit = surface.projectSide(z, belt(z) - 0.24, side);
    if (!hit) continue;
    const p = surface.point(hit.t, hit.s, new THREE.Vector3());
    const n = surface.normal(hit.t, hit.s, new THREE.Vector3());
    const vent = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.052, 0.125), mats.darkChrome);
    vent.position.copy(p).addScaledVector(n, 0.004);
    vent.lookAt(p.clone().addScaledVector(n, 1));
    vent.rotateY(Math.PI / 2);
    vent.rotateX(0.14);
    parent.add(vent);
  }

  // --- Wipers parked at the base of the windscreen.
  const zW = spec.windshield[1] - 0.03;
  for (const side of [1, -1]) {
    const hit = surface.projectSide(zW, surface.fTop(zW) - 0.075, side > 0 ? 1 : -1);
    if (!hit) continue;
    const p = surface.point(hit.t, hit.s, new THREE.Vector3());
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.30, 0.010, 0.014), mats.matteBlack);
    arm.position.set(p.x * 0.52 - side * 0.02, p.y + 0.010, p.z + 0.010);
    arm.rotation.z = side * 0.10;
    arm.rotation.y = side * 0.05;
    parent.add(arm);
  }

  // --- Shark-fin antenna on the rear roof.
  const tAnt = surface.tAt(spec.backlight[1] - 0.05);
  const antP = surface.point(tAnt, 0.5, new THREE.Vector3());
  const fin = new THREE.Mesh(new THREE.ConeGeometry(0.052, 0.145, 4, 1), mats.paint);
  fin.scale.set(0.30, 0.40, 1.0);
  fin.rotation.y = Math.PI / 4;
  fin.rotation.x = -0.30;
  fin.position.copy(antP);
  fin.position.y += 0.020;
  parent.add(fin);
}

function addInterior(surface, mats, parent, spec) {
  const g = new THREE.Group();
  const beltAt = monotoneCurve(spec.belt);
  const floorY = spec.wheelRadius * 0.62;
  const cabinFront = spec.windshield[1] - 0.10;
  const cabinRear = spec.backlight[0] + 0.35;

  // Floor / bulkhead so you never see straight through the car.
  const floor = new THREE.Mesh(
    new THREE.BoxGeometry(spec.width * 0.82, 0.04, cabinFront - cabinRear + 0.5),
    mats.interior
  );
  floor.position.set(0, floorY, (cabinFront + cabinRear) / 2);
  g.add(floor);

  // A dark inner mass filling the cabin. Without it you look straight through
  // the near window, out of the far one, and into a blown-out sky — the single
  // loudest tell that a car model is hollow.
  const liner = new THREE.Mesh(
    new THREE.BoxGeometry(spec.width * 0.70, 0.66, cabinFront - cabinRear + 0.30),
    mats.interior
  );
  liner.position.set(0, floorY + 0.30, (cabinFront + cabinRear) / 2);
  g.add(liner);

  // Headliner under the flat part of the roof only. A single slab at constant
  // height would spear straight out through the raked windscreen.
  const roofLine = monotoneCurve(spec.top);
  const zRoofA = spec.backlight[1];
  const zRoofB = spec.windshield[0];
  const headliner = new THREE.Mesh(
    new THREE.BoxGeometry(spec.width * 0.60, 0.028, zRoofB - zRoofA),
    mats.interior
  );
  headliner.position.set(0, roofLine((zRoofA + zRoofB) / 2) - 0.075, (zRoofA + zRoofB) / 2);
  g.add(headliner);

  // Dashboard + windscreen base.
  const dashY = beltAt(cabinFront) - 0.135;
  const dash = new THREE.Mesh(new THREE.BoxGeometry(spec.width * 0.72, 0.17, 0.46), mats.interior);
  dash.position.set(0, dashY, cabinFront - 0.10);
  dash.rotation.x = -0.16;
  g.add(dash);

  const screen = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.19, 0.012), mats.glossBlack);
  screen.position.set(0, dashY + 0.10, cabinFront - 0.24);
  screen.rotation.x = 0.12;
  g.add(screen);

  // Steering wheel.
  const wheel = new THREE.Group();
  const rimT = new THREE.Mesh(new THREE.TorusGeometry(0.175, 0.021, 10, 30), mats.interior);
  wheel.add(rimT);
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * TAU + Math.PI / 2;
    const spoke = new THREE.Mesh(new THREE.BoxGeometry(0.028, 0.16, 0.016), mats.glossBlack);
    spoke.position.set(Math.cos(a) * 0.085, Math.sin(a) * 0.085, 0);
    spoke.rotation.z = a - Math.PI / 2;
    wheel.add(spoke);
  }
  wheel.add(new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.03, 16), mats.glossBlack));
  wheel.children[wheel.children.length - 1].rotation.x = Math.PI / 2;
  wheel.rotation.x = -Math.PI / 2 + 0.42;
  wheel.position.set(spec.width * 0.20, dashY + 0.05, cabinFront - 0.30);
  g.add(wheel);

  // Seats.
  const makeSeat = (x, z, scale = 1) => {
    const s = new THREE.Group();
    const base = new THREE.Mesh(new THREE.BoxGeometry(0.50, 0.14, 0.52), mats.interior);
    base.position.y = floorY + 0.16;
    s.add(base);
    const back = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.62, 0.16), mats.interior);
    back.position.set(0, floorY + 0.50, -0.20);
    back.rotation.x = 0.20;
    s.add(back);
    const bolsterL = new THREE.Mesh(new THREE.BoxGeometry(0.075, 0.58, 0.14), mats.interior);
    bolsterL.position.set(0.22, floorY + 0.50, -0.175);
    bolsterL.rotation.x = 0.20;
    s.add(bolsterL);
    const bolsterR = bolsterL.clone();
    bolsterR.position.x = -0.22;
    s.add(bolsterR);
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.20, 0.13), mats.interior);
    head.position.set(0, floorY + 0.90, -0.30);
    head.rotation.x = 0.20;
    s.add(head);
    s.position.set(x, 0, z);
    s.scale.setScalar(scale);
    return s;
  };
  g.add(makeSeat(spec.width * 0.20, cabinFront - 0.72));
  g.add(makeSeat(-spec.width * 0.20, cabinFront - 0.72));
  g.add(makeSeat(spec.width * 0.20, cabinRear + 0.42, 0.94));
  g.add(makeSeat(-spec.width * 0.20, cabinRear + 0.42, 0.94));

  // Centre console.
  const console_ = new THREE.Mesh(
    new THREE.BoxGeometry(0.24, 0.22, cabinFront - cabinRear - 0.35),
    mats.interior
  );
  console_.position.set(0, floorY + 0.14, (cabinFront + cabinRear) / 2 - 0.15);
  g.add(console_);

  g.traverse((o) => {
    if (o.isMesh) o.castShadow = false;
  });
  parent.add(g);
  return g;
}


/* ==========================================================================
   9. Public API
   ========================================================================== */

const QUALITY = {
  low: { stations: 96, segments: 72, tyreSegments: 48, rimSegments: 24 },
  medium: { stations: 140, segments: 104, tyreSegments: 72, rimSegments: 32 },
  high: { stations: 200, segments: 144, tyreSegments: 120, rimSegments: 48 },
};

const DEFAULTS = {
  preset: 'gt',
  bodyColor: '#16305c',
  rimColor: '#4a4e55',
  caliperColor: '#b41f24',
  glassTint: '#1a2026',
  paintMetalness: 0.72,
  paintRoughness: 0.30,
  flakes: 1.0,
  envMapIntensity: 1.25,
  glass: 'transmission', // 'transmission' | 'simple'
  quality: 'high',
  rimStyle: 'split5', // 'split5' | 'mesh'
  interior: true,
  details: true,
  panelLines: true,
  contactShadow: true,
  castShadow: true,
  seed: 7,
};

/**
 * Build a car.
 *
 * @param {object} [options]
 * @param {'gt'|'suv'|'hatch'} [options.preset='gt']
 * @param {string|number} [options.bodyColor]
 * @param {'low'|'medium'|'high'} [options.quality='high']
 * @param {'transmission'|'simple'} [options.glass]  transmission is prettier,
 *        simple is cheaper and works on weak GPUs.
 * @returns {{
 *   group: THREE.Group,
 *   spec: object,
 *   materials: object,
 *   wheels: Array<object>,
 *   update(dt:number, speed?:number):void,
 *   setSteering(a:number):void,
 *   setPaintColor(c:any):void,
 *   setLights(on:boolean):void,
 *   setBrake(v:number):void,
 *   setIndicator(dir:-1|0|1):void,
 *   dispose():void
 * }}
 */
export function createCar(options = {}) {
  const opts = { ...DEFAULTS, ...options };
  const base = PRESETS[opts.preset] || PRESETS.gt;
  const spec = { ...base, ...(options.spec || {}) };
  const quality = QUALITY[opts.quality] || QUALITY.high;

  const textures = {
    flake: opts.flakes > 0 ? flakeNormalTexture(256, opts.seed) : null,
    tread: treadNormalTexture(256, 256),
    sidewall: sidewallNormalTexture(128, 256),
    rotor: rotorFaceTexture(256),
    honeycomb: honeycombTexture(256, 13),
  };
  const mats = buildMaterials(opts, textures);

  const group = new THREE.Group();
  group.name = `car:${spec.name}`;

  const surface = new BodySurface(spec);
  const { geometry } = surface.build(quality.stations, quality.segments);
  const body = new THREE.Mesh(geometry, [mats.paint, mats.glass, mats.glossBlack, mats.matteBlack]);
  body.name = 'body';
  body.castShadow = opts.castShadow;
  body.receiveShadow = true;
  group.add(body);

  const detail = new THREE.Group();
  detail.name = 'details';
  group.add(detail);

  if (opts.details) {
    addFrontEnd(surface, mats, detail, spec, opts);
    addRearEnd(surface, mats, detail, spec, opts);
    addSideDetails(surface, mats, detail, spec, opts);
    if (opts.panelLines) addPanelLines(surface, mats, detail, spec);
  }
  if (opts.interior) addInterior(surface, mats, group, spec);

  detail.traverse((o) => {
    if (o.isMesh) {
      o.castShadow = opts.castShadow;
      o.receiveShadow = true;
    }
  });

  // ---- wheels -------------------------------------------------------------
  const tyreProto = buildTyre(spec, mats, quality);
  const rimProto = buildRim(spec, mats, opts, quality);
  const brakeProto = buildBrake(spec, mats);

  const wheels = [];
  const axles = [
    { z: spec.frontAxle, track: spec.trackFront, steer: true },
    { z: spec.rearAxle, track: spec.trackRear, steer: false },
  ];
  for (const axle of axles) {
    for (const side of [1, -1]) {
      const hub = new THREE.Group();
      hub.position.set((side * axle.track) / 2, spec.wheelRadius, axle.z);
      const spin = new THREE.Group();
      const orient = new THREE.Group();
      if (side < 0) orient.rotation.y = Math.PI;
      orient.add(tyreProto.clone(), rimProto.clone());
      spin.add(orient);
      hub.add(spin);
      // Brakes do not spin with the wheel, but they do steer with it.
      const brake = brakeProto.clone();
      if (side < 0) brake.rotation.y = Math.PI;
      hub.add(brake);
      group.add(hub);
      wheels.push({ hub, spin, side, steer: axle.steer, z: axle.z });
    }
  }

  // ---- contact shadow -----------------------------------------------------
  let shadowMesh = null;
  let shadowTex = null;
  if (opts.contactShadow) {
    shadowTex = contactShadowTexture(spec, 256);
    shadowTex.wrapS = shadowTex.wrapT = THREE.ClampToEdgeWrapping;
    const mat = new THREE.MeshBasicMaterial({
      color: 0x000000,
      alphaMap: shadowTex,
      transparent: true,
      opacity: 0.72,
      depthWrite: false,
    });
    shadowMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(spec.width * 1.24, spec.length * 1.24),
      mat
    );
    shadowMesh.rotation.x = -Math.PI / 2;
    shadowMesh.position.y = 0.004;
    shadowMesh.renderOrder = -1;
    group.add(shadowMesh);
  }

  // ---- animation & controls ----------------------------------------------
  let steer = 0;
  let spinAngle = 0;
  const wheelbase = spec.frontAxle - spec.rearAxle;

  const api = {
    group,
    spec,
    materials: mats,
    textures,
    surface,
    wheels,
    body,

    /** @param {number} dt seconds  @param {number} speed metres/second */
    update(dt = 0, speed = 0) {
      if (speed) {
        spinAngle += (speed * dt) / spec.wheelRadius;
        for (const w of wheels) w.spin.rotation.x = spinAngle;
      }
      return api;
    },

    /** Steering angle in radians; Ackermann-corrected per side. */
    setSteering(angle) {
      steer = clamp(angle, -0.62, 0.62);
      for (const w of wheels) {
        if (!w.steer) continue;
        if (Math.abs(steer) < 1e-4) {
          w.hub.rotation.y = 0;
          continue;
        }
        const R = wheelbase / Math.tan(Math.abs(steer));
        const halfTrack = spec.trackFront / 2;
        const inner = Math.sign(steer) === w.side;
        const radius = inner ? R - halfTrack : R + halfTrack;
        w.hub.rotation.y = Math.sign(steer) * Math.atan(wheelbase / radius);
      }
      return api;
    },

    setPaintColor(c) {
      mats.paint.color.set(c);
      return api;
    },

    setLights(on) {
      mats.emitWhite.emissiveIntensity = on ? 0.9 : 0;
      mats.emitRed.emissiveIntensity = on ? 0.9 : 0.30;
      return api;
    },

    /** 0 = off, 1 = full brake light. */
    setBrake(v) {
      mats.emitRed.emissiveIntensity = 0.30 + clamp(v, 0, 1) * 3.2;
      return api;
    },

    /** Reversing lamps. */
    setReverse(on) {
      mats.emitReverse.emissiveIntensity = on ? 2.2 : 0;
      return api;
    },

    /** -1 left, 0 off, 1 right — drive it from a timer for a blink. */
    setIndicator(dir) {
      mats.emitAmber.emissiveIntensity = dir ? 3.2 : 0;
      return api;
    },

    dispose() {
      const seen = new Set();
      group.traverse((o) => {
        if (o.isMesh) {
          if (!seen.has(o.geometry)) {
            seen.add(o.geometry);
            o.geometry.dispose();
          }
          const list = Array.isArray(o.material) ? o.material : [o.material];
          for (const m of list) {
            if (!m || seen.has(m)) continue;
            seen.add(m);
            m.dispose();
          }
        }
      });
      for (const t of Object.values(textures)) if (t) t.dispose();
      if (shadowTex) shadowTex.dispose();
      group.removeFromParent();
    },
  };

  api.setLights(false);
  return api;
}

/**
 * Convenience helper: a lit studio scene with a reflective floor, ready to
 * drop a car into. Entirely optional.
 */
export function createStudioScene(renderer, options = {}) {
  const { floor = true, background = 0x14161a, floorRoughness = 0.35 } = options;
  const scene = new THREE.Scene();
  const env = createStudioEnvironment(renderer, options);
  scene.environment = env.envMap;
  if (background !== null) scene.background = new THREE.Color(background);

  const key = new THREE.DirectionalLight(0xffffff, 2.4);
  key.position.set(5, 8, 6);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.camera.near = 1;
  key.shadow.camera.far = 30;
  const s = 5;
  key.shadow.camera.left = -s;
  key.shadow.camera.right = s;
  key.shadow.camera.top = s;
  key.shadow.camera.bottom = -s;
  key.shadow.bias = -0.0006;
  key.shadow.normalBias = 0.02;
  scene.add(key);

  const rim = new THREE.DirectionalLight(0xbfd4ff, 0.9);
  rim.position.set(-6, 4, -7);
  scene.add(rim);

  if (floor) {
    const ground = new THREE.Mesh(
      new THREE.CircleGeometry(26, 64),
      new THREE.MeshStandardMaterial({
        color: 0x0e1013,
        roughness: floorRoughness,
        metalness: 0.0,
        envMapIntensity: 0.9,
      })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);
  }

  return { scene, env, key, rim };
}

export { PRESETS };
export default createCar;
