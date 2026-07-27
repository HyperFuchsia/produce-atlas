/* NOGGIN — procedural produce meshes.

   Everything is built by revolving a radius profile around the Y axis, then
   applying optional modifiers: ribs, a bend, a stem, leaves, a leaf crown, or
   scattering the whole thing into a cluster. That is enough vocabulary to make
   an apple, a banana, a carrot, a bunch of grapes and a pineapple recognisable
   from one small data table.

   Sizes are real. One world unit is WORLD_CM centimetres, so an 8 cm apple
   really is 8 cm next to a head that really is about 24 cm across. */
(function (NG) {
  'use strict';

  const M = NG.M;
  const G = NG.G;
  const P = {};

  /* One world unit = 10 cm. The head is ~2.4 units, i.e. ~24 cm across. */
  P.WORLD_CM = 10;
  P.cm = function (v) { return v / P.WORLD_CM; };

  /* Sample a profile array (radii from base to tip) with smooth interpolation. */
  function sampleProfile(profile, t) {
    const n = profile.length - 1;
    const x = M.clamp(t, 0, 1) * n;
    const i = Math.min(n - 1, Math.floor(x));
    const f = x - i;
    const p0 = profile[Math.max(0, i - 1)];
    const p1 = profile[i];
    const p2 = profile[i + 1];
    const p3 = profile[Math.min(n, i + 2)];
    /* Catmull-Rom keeps shoulders round instead of faceted. */
    const f2 = f * f, f3 = f2 * f;
    return 0.5 * ((2 * p1) + (-p0 + p2) * f +
      (2 * p0 - 5 * p1 + 4 * p2 - p3) * f2 +
      (-p0 + 3 * p1 - 3 * p2 + p3) * f3);
  }

  function Part() {
    this.pos = [];
    this.col = [];
    this.mat = [];
    this.idx = [];
  }

  Part.prototype.add = function (positions, indices, color, matId) {
    const base = this.pos.length / 3;
    for (let i = 0; i < positions.length; i++) this.pos.push(positions[i]);
    for (let i = 0; i < positions.length / 3; i++) {
      this.col.push(color[0], color[1], color[2]);
      this.mat.push(matId);
    }
    for (let i = 0; i < indices.length; i++) this.idx.push(indices[i] + base);
  };

  /* Revolve a profile into a closed solid. */
  function revolve(opts) {
    const rings = opts.rings || 26;
    const seg = opts.segments || 30;
    const height = opts.height;
    const radius = opts.radius;
    const profile = opts.profile;
    const ribs = opts.ribs || 0;
    const ribDepth = opts.ribDepth || 0;
    const bend = opts.bend || 0;
    const twist = opts.twist || 0;

    const positions = new Float32Array(rings * seg * 3);
    const indices = [];
    let p = 0;

    for (let i = 0; i < rings; i++) {
      const t = i / (rings - 1);
      let r = sampleProfile(profile, t) * radius;
      if (r < 0) r = 0;
      let y = (t - 0.5) * height;

      /* Fade ribs out towards the poles, where all the segments converge and
         a constant-depth groove turns into a starburst. */
      const ribFade = ribs > 0 ? Math.sin(Math.PI * t) : 0;

      for (let j = 0; j < seg; j++) {
        const a = (j / seg) * Math.PI * 2 + t * twist;
        let rr = r;
        if (ribs > 0) rr *= 1 - ribDepth * ribFade * (0.5 - 0.5 * Math.cos(ribs * a));
        let x = Math.cos(a) * rr;
        let z = Math.sin(a) * rr;

        if (bend !== 0) {
          /* Wrap the straight axis onto an arc of `bend` radians. */
          const k = bend / Math.max(height, 1e-5);
          const ang = y * k;
          const rad = 1 / k;
          const cx = x + rad;
          const nx = Math.cos(ang) * cx - rad;
          const ny = Math.sin(ang) * cx;
          x = nx;
          y = ny;
        }

        positions[p] = x;
        positions[p + 1] = y;
        positions[p + 2] = z;
        p += 3;
      }
    }

    for (let i = 0; i < rings - 1; i++) {
      for (let j = 0; j < seg; j++) {
        const a = i * seg + j;
        const b = i * seg + (j + 1) % seg;
        const c = (i + 1) * seg + (j + 1) % seg;
        const d = (i + 1) * seg + j;
        indices.push(a, d, c, a, c, b);
      }
    }
    return { positions: positions, indices: new Uint32Array(indices) };
  }

  /* A flat-ish leaf: a lens shape bent along its length. */
  function leaf(len, wid, curl) {
    const rings = 12, seg = 9;
    const positions = new Float32Array(rings * seg * 3);
    const indices = [];
    let p = 0;
    for (let i = 0; i < rings; i++) {
      const t = i / (rings - 1);
      const w = Math.sin(Math.PI * Math.pow(t, 0.8)) * wid;
      for (let j = 0; j < seg; j++) {
        const s = (j / (seg - 1)) * 2 - 1;
        positions[p] = s * w;
        positions[p + 1] = t * len;
        positions[p + 2] = (1 - s * s) * wid * 0.28 + Math.sin(t * Math.PI) * curl;
        p += 3;
      }
    }
    for (let i = 0; i < rings - 1; i++) {
      for (let j = 0; j < seg - 1; j++) {
        const a = i * seg + j, b = a + 1, c = (i + 1) * seg + j + 1, d = (i + 1) * seg + j;
        /* Single-sided only. Emitting both windings makes the two opposing
           face normals cancel at every shared vertex, which collapses the
           leaf's normals and leaves it lit as a flat white sheet. Back faces
           are covered anyway: culling is off and the shader flips the normal
           on !gl_FrontFacing. */
        indices.push(a, d, c, a, c, b);
      }
    }
    return { positions: positions, indices: new Uint32Array(indices) };
  }

  function transform(src, fn) {
    const out = new Float32Array(src.length);
    const v = [0, 0, 0];
    for (let i = 0; i < src.length; i += 3) {
      v[0] = src[i]; v[1] = src[i + 1]; v[2] = src[i + 2];
      fn(v);
      out[i] = v[0]; out[i + 1] = v[1]; out[i + 2] = v[2];
    }
    return out;
  }

  function translate(src, x, y, z) {
    return transform(src, function (v) { v[0] += x; v[1] += y; v[2] += z; });
  }

  function rotateZ(src, ang) {
    const c = Math.cos(ang), s = Math.sin(ang);
    return transform(src, function (v) {
      const x = v[0] * c - v[1] * s, y = v[0] * s + v[1] * c;
      v[0] = x; v[1] = y;
    });
  }

  function rotateX(src, ang) {
    const c = Math.cos(ang), s = Math.sin(ang);
    return transform(src, function (v) {
      const y = v[1] * c - v[2] * s, z = v[1] * s + v[2] * c;
      v[1] = y; v[2] = z;
    });
  }

  function rotateY(src, ang) {
    const c = Math.cos(ang), s = Math.sin(ang);
    return transform(src, function (v) {
      const x = v[0] * c + v[2] * s, z = -v[0] * s + v[2] * c;
      v[0] = x; v[2] = z;
    });
  }

  const MAT_SKIN = 0;      /* soft, wrapped diffuse — fruit flesh reads well */
  const MAT_GLOSS = 2;     /* tight specular — waxy skins */
  const MAT_MATTE = 3;     /* rough — leaves, husks, roots */

  /* Project a direction on the unit sphere onto an entry's form.

     This is the same construction as revolve(), driven by a sphere direction
     instead of a grid: polar angle picks the profile parameter, azimuth picks
     the way round. That means any specimen can be expressed on the being's own
     icosphere topology — same vertex count, same adjacency — so becoming one is
     a morph of rest positions rather than a mesh swap. */
  const FALLBACK_PROFILE = [0, 0.55, 0.84, 0.96, 1.0, 1.0, 0.96, 0.84, 0.55, 0];

  P.formOnSphere = function (out, spec, dx, dy, dz) {
    /* Primitives are defined directly rather than as a revolved profile: a
       cube is not a solid of revolution. The L-infinity mapping (divide the
       direction by its largest component) lands exactly on a box surface. */
    if (spec.kind === 'point') {
      out[0] = dx * spec.size; out[1] = dy * spec.size; out[2] = dz * spec.size;
      return out;
    }
    if (spec.kind === 'box') {
      const m = Math.max(Math.abs(dx), Math.abs(dy), Math.abs(dz)) || 1;
      out[0] = (dx / m) * spec.hx;
      out[1] = (dy / m) * spec.hy;
      out[2] = (dz / m) * spec.hz;
      return out;
    }
    /* A liquid at rest: wide, domed on top, nearly flat underneath, with a
       rim that is not quite a circle. Latitude drives height and the
       horizontal part of the direction is kept as-is, so the shell flattens
       into a disc without any part of it folding through another. */
    if (spec.kind === 'puddle') {
      const az = Math.atan2(dz, dx);
      const lobe = 1 + 0.10 * Math.sin(az * 3 + 0.7) + 0.06 * Math.sin(az * 5 - 1.3);
      out[0] = dx * spec.radius * lobe;
      out[1] = dy * (dy > 0 ? spec.dome : spec.base);
      out[2] = dz * spec.radius * lobe;
      return out;
    }
    /* A gas has no profile worth revolving. Three interfering sines give a
       lumpy blob the shader can then churn, and keeping it radial means the
       shape stays star-convex, so picking and the camera fit still work. */
    if (spec.kind === 'cloud') {
      const n = Math.sin(dx * 3.1 + 1.7) * Math.sin(dy * 2.6 - 0.9) * Math.sin(dz * 3.4 + 2.2);
      const r = spec.radius * (1 + spec.wobble * n);
      out[0] = dx * r; out[1] = dy * r; out[2] = dz * r;
      return out;
    }

    /* A hull is lofted along its own length rather than revolved about an
       axis, because most made things are not solids of revolution. Polar
       angle about X picks the station down the body; the angle round X picks
       the way round; and the cross-section there is a superellipse, which is
       a rounded rectangle when you want one and an ellipse when you do not.

       Separate top and bottom profiles are what make it a car rather than a
       loaf: the roofline and the floorpan are unrelated curves. */
    if (spec.kind === 'hull') {
      const sc = P.cm(1);
      const len = spec.lengthCm * sc;
      const halfW = spec.widthCm * 0.5 * sc;
      const tall = spec.heightCm * sc;

      const t = 1 - Math.acos(M.clamp(dx, -1, 1)) / Math.PI;
      const top = sampleProfile(spec.top, t);
      const bot = sampleProfile(spec.bottom, t);
      const wide = sampleProfile(spec.wide, t);

      const hy = Math.max((top - bot) * 0.5 * tall, 1e-3);
      const cy = (top + bot) * 0.5 * tall - tall * 0.5;   /* origin at mid-height */
      const hz = Math.max(wide * halfW, 1e-3);

      const ay = Math.cos(Math.atan2(dy, dz)), az = Math.sin(Math.atan2(dy, dz));
      const n = spec.corner || 4;
      const r = 1 / Math.pow(
        Math.pow(Math.abs(ay / hy), n) + Math.pow(Math.abs(az / hz), n), 1 / n);

      out[0] = (t - 0.5) * len;
      out[1] = ay * r + cy;
      out[2] = az * r;
      return out;
    }

    const scale = P.cm(1);
    const height = (spec.lengthCm || spec.sizeCm) * scale;
    const radius = (spec.widthCm || spec.sizeCm) * 0.5 * scale;
    const profile = spec.profile || FALLBACK_PROFILE;

    const t = 1 - Math.acos(M.clamp(dy, -1, 1)) / Math.PI;
    let r = sampleProfile(profile, t) * radius;
    if (r < 0) r = 0;
    let y = (t - 0.5) * height;

    const phi = Math.atan2(dz, dx);
    if (spec.ribs) {
      const fade = Math.sin(Math.PI * t);
      r *= 1 - (spec.ribDepth || 0) * fade * (0.5 - 0.5 * Math.cos(spec.ribs * phi));
    }

    let x = Math.cos(phi) * r;
    let z = Math.sin(phi) * r;

    if (spec.bend) {
      const k = spec.bend / Math.max(height, 1e-5);
      const ang = y * k;
      const rad = 1 / k;
      const cx = x + rad;
      x = Math.cos(ang) * cx - rad;
      y = Math.sin(ang) * cx;
    }

    if (spec.lie) { const nx = -y; y = x; x = nx; }

    out[0] = x; out[1] = y; out[2] = z;
    return out;
  };

  /* Build one produce mesh from a knowledge-base entry.

     With `trimOnly`, the body is left out and only the stem, leaves and crown
     are built. Those are the parts that cannot be expressed on the being's
     own topology — a closed sphere has nowhere to put a pineapple's crown —
     so when it *becomes* a specimen they are attached separately, in this
     same local frame, and ride its transform. Returns null when the specimen
     has no such parts. */
  P.build = function (spec, trimOnly) {
    const part = new Part();
    const scale = P.cm(1);
    const height = (spec.lengthCm || spec.sizeCm) * scale;
    const radius = (spec.widthCm || spec.sizeCm) * 0.5 * scale;
    const mat = spec.gloss === false ? MAT_SKIN : MAT_GLOSS;

    if (trimOnly) {
      /* body skipped */
    } else if (spec.kind === 'hull') {
      /* Built by pushing a sphere through the same mapping the being uses, so
         there is one definition of the shape and the standalone specimen and
         the worn form cannot drift apart. */
      const unit = G.icosphere(4);
      const n = unit.positions.length / 3;
      const pos = new Float32Array(n * 3);
      const o = [0, 0, 0];
      for (let i = 0; i < n; i++) {
        P.formOnSphere(o, spec, unit.positions[i * 3], unit.positions[i * 3 + 1], unit.positions[i * 3 + 2]);
        pos[i * 3] = o[0]; pos[i * 3 + 1] = o[1]; pos[i * 3 + 2] = o[2];
      }
      part.add(pos, unit.indices, spec.color, mat);
    } else if (spec.cluster) {
      /* Grapes and the like: scatter small spheres down a tapering bunch. */
      const rnd = M.rng(spec.seed || 7);
      const n = spec.cluster.count;
      const berry = (spec.cluster.berryCm || 2) * 0.5 * scale;
      for (let i = 0; i < n; i++) {
        const t = i / (n - 1);
        const ring = revolve({
          rings: 12, segments: 14, height: berry * 2, radius: berry,
          profile: [0, 0.6, 0.92, 1, 0.92, 0.6, 0]
        });
        const spread = (1 - t) * radius * 0.95;
        const ang = i * 2.399;    /* golden angle keeps the bunch from stacking */
        const px = Math.cos(ang) * spread * (0.35 + rnd() * 0.65);
        const pz = Math.sin(ang) * spread * (0.35 + rnd() * 0.65);
        const py = (0.5 - t) * height * 0.92;
        part.add(translate(ring.positions, px, py, pz), ring.indices, spec.color, mat);
      }
    } else {
      const body = revolve({
        rings: spec.rings || 28,
        segments: spec.segments || 32,
        height: height,
        radius: radius,
        profile: spec.profile,
        ribs: spec.ribs || 0,
        ribDepth: spec.ribDepth || 0,
        bend: spec.bend || 0,
        twist: spec.twist || 0
      });
      part.add(body.positions, body.indices, spec.color, mat);
    }

    /* Stem */
    if (spec.stem) {
      const sh = spec.stem.lengthCm * scale;
      const sr = (spec.stem.widthCm || 0.5) * 0.5 * scale;
      const stem = revolve({
        rings: 8, segments: 10, height: sh, radius: sr,
        profile: [0.9, 1, 1, 0.9, 0.7]
      });
      const y = height * (spec.stem.at !== undefined ? spec.stem.at : 0.5) + sh * 0.5;
      part.add(translate(stem.positions, 0, y, 0), stem.indices,
        spec.stem.color || [0.34, 0.26, 0.14], MAT_MATTE);
    }

    /* One or two leaves off the stem */
    if (spec.leaves) {
      const n = spec.leaves.count || 1;
      for (let i = 0; i < n; i++) {
        const l = leaf(spec.leaves.lengthCm * scale, spec.leaves.widthCm * 0.5 * scale, 0.02);
        let g = rotateZ(l.positions, spec.leaves.tilt !== undefined ? spec.leaves.tilt : 0.7);
        g = rotateY(g, (i / n) * Math.PI * 2 + 0.4);
        const y = height * (spec.leaves.at !== undefined ? spec.leaves.at : 0.5);
        part.add(translate(g, 0, y, 0), l.indices,
          spec.leaves.color || [0.22, 0.45, 0.16], MAT_MATTE);
      }
    }

    /* Crown of stiff leaves, for pineapples and the like */
    if (spec.crown) {
      const n = spec.crown.count || 9;
      for (let i = 0; i < n; i++) {
        const t = i / n;
        const len = spec.crown.lengthCm * scale * (0.6 + 0.4 * ((i * 7) % n) / n);
        const l = leaf(len, spec.crown.widthCm * 0.5 * scale, 0.01);
        let g = rotateZ(l.positions, 0.25 + (i % 3) * 0.22);
        g = rotateY(g, t * Math.PI * 2 * 2.3);
        part.add(translate(g, 0, height * 0.45, 0), l.indices,
          spec.crown.color || [0.26, 0.46, 0.20], MAT_MATTE);
      }
    }

    /* Wheels. Four of them, and they are the single strongest cue that a
       lumpy box is a car, so they are worth their own case. Revolved about Y
       like everything else here, then laid on their side. */
    if (spec.wheels) {
      const w = spec.wheels;
      const disc = revolve({
        rings: 10, segments: 22,
        height: w.widthCm * scale, radius: w.diameterCm * 0.5 * scale,
        profile: [0, 0.88, 1, 1, 1, 1, 1, 0.88, 0]
      });
      const laid = rotateX(disc.positions, Math.PI * 0.5);
      const corners = [[1, 1], [1, -1], [-1, 1], [-1, -1]];
      for (let i = 0; i < corners.length; i++) {
        part.add(
          translate(laid, corners[i][0] * w.atXCm * scale, w.atYCm * scale,
            corners[i][1] * w.atZCm * scale),
          disc.indices, w.color || [0.09, 0.09, 0.10], MAT_MATTE);
      }
    }

    if (!part.pos.length) return null;

    let positions = new Float32Array(part.pos);
    const indices = new Uint32Array(part.idx);
    /* Melons and cucumbers sit on their side in real life; standing them on
       end reads as a different object entirely. */
    if (spec.lie) positions = rotateZ(positions, Math.PI * 0.5);

    let topUnits = 0;
    for (let i = 1; i < positions.length; i += 3) {
      if (positions[i] > topUnits) topUnits = positions[i];
    }
    return {
      positions: positions,
      normals: G.computeNormals(positions, indices, positions.length / 3),
      colors: new Float32Array(part.col),
      mats: new Float32Array(part.mat),
      indices: indices,
      /* Actual extents, for the scale readout and for placement. */
      heightUnits: spec.lie ? radius * 2 : height + (spec.crown ? spec.crown.lengthCm * scale * 0.7 : 0),
      topUnits: topUnits,
      radiusUnits: spec.lie ? height * 0.5 : radius
    };
  };

  NG.P = P;
})(window.NG = window.NG || {});
