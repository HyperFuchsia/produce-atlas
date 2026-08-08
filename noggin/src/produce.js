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
  P.sampleProfile = sampleProfile;

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

  /* An apple is not a teardrop. Both ends are pushed in — the stem sits at the
     bottom of a well, the calyx in a basin at the other end — and a radius
     profile alone cannot say so. The height is a straight function of the
     polar angle, so a radius of zero at a pole gives a point, never a dent.
     An indent needs the axis itself to turn back on itself.

     A dimple is authored the way you would measure one on the real thing:
     how deep the well is, and how wide its mouth. Centimetres, like every
     other dimension here. Depth and width are what a person can picture and
     check against a fruit on the table; the two coefficients that produce
     them are not, and guessing at them is how the first attempt at this
     turned an apple into a bucket.

     Near a pole, writing u for the distance from it along the profile and
     k = 1 - u/span for that distance normalised over the dimple's reach,

       y(u) = (0.5 - u) - amp * k^2

     which is highest at k = span / (2 * amp), giving a well of

       depth = amp * (1 - k)^2   with its mouth at   u = span * (1 - k).

     So: pick u from the mouth width by walking in from the pole until the
     body is that wide, then invert the pair for span and amp. The dimple
     lands on the requested measurements by construction rather than by
     tuning. */
  function mouthU(profile, want, fromTop) {
    let lo = 0, hi = 0.5;
    for (let i = 0; i < 40; i++) {
      const u = (lo + hi) * 0.5;
      if (sampleProfile(profile, fromTop ? 1 - u : u) < want) lo = u; else hi = u;
    }
    return M.clamp((lo + hi) * 0.5, 0.02, 0.45);
  }

  /* Solved once per specimen and cached on the spec — the profile and the
     dimensions it is solved against never change under it. */
  function dimpleSolve(d, profile, height, radius) {
    if (!d) return null;
    if (d._s) return d._s;

    const ends = [];
    for (let i = 0; i < 2; i++) {
      const e = i === 0 ? d.top : d.bottom;
      if (!e || !(e.deepCm > 0) || !(e.mouthCm > 0)) { ends.push(null); continue; }
      ends.push({
        u: mouthU(profile, P.cm(e.mouthCm) * 0.5 / radius, i === 0),
        want: P.cm(e.deepCm) / height
      });
    }

    /* Denting the ends shortens the body, and stretching it back to the
       height it claims deepens the dents again. The two are solved together;
       it converges in two or three passes, six is free. */
    let s = 1, top = null, bottom = null, hi = 0.5, lo = -0.5;
    for (let pass = 0; pass < 6; pass++) {
      const solved = [null, null];
      hi = 0.5; lo = -0.5;
      for (let i = 0; i < 2; i++) {
        const e = ends[i];
        if (!e) continue;
        const k = 1 / (1 + 2 * (e.want / s) / e.u);
        const span = e.u / (1 - k);
        const amp = span / (2 * k);
        solved[i] = { span: span, amp: amp };
        const rim = e.u + amp * k * k;
        if (i === 0) hi = 0.5 - rim; else lo = -0.5 + rim;
      }
      top = solved[0]; bottom = solved[1];
      s = 1 / Math.max(hi - lo, 1e-6);
    }

    /* Hidden, because an atlas entry is walked elsewhere as data and a cache
       is not one of the things it knows about a fruit. */
    Object.defineProperty(d, '_s', {
      value: { top: top, bottom: bottom, s: s, c: (hi + lo) * 0.5 * s }
    });
    return d._s;
  }

  /* Where a ring of the profile sits along the axis, dimples included. */
  function axisY(sol, t) {
    if (!sol) return t - 0.5;
    let o = 0;
    if (sol.top) {
      const k = Math.max(0, (t - (1 - sol.top.span)) / sol.top.span);
      o -= sol.top.amp * k * k;
    }
    if (sol.bottom) {
      const k = Math.max(0, (sol.bottom.span - t) / sol.bottom.span);
      o += sol.bottom.amp * k * k;
    }
    return ((t - 0.5) + o) * sol.s - sol.c;
  }
  P.dimpleSolve = dimpleSolve;
  P.axisY = axisY;

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
    const dimple = dimpleSolve(opts.dimple, profile, height, radius);

    const positions = new Float32Array(rings * seg * 3);
    const indices = [];
    let p = 0;

    for (let i = 0; i < rings; i++) {
      const t = i / (rings - 1);
      let r = sampleProfile(profile, t) * radius;
      if (r < 0) r = 0;
      let y = axisY(dimple, t) * height;

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
  /* A blade. `lobes` cuts sinuses into the sides and `teeth` serrates the
     rim, which between them are the whole difference between a generic leaf
     and a vine leaf — and a bunch of grapes with the wrong leaf on it reads
     as a bunch of something else. Both default off, so every other leaf here
     is untouched. */
  function leaf(len, wid, curl, opts) {
    const lobes = (opts && opts.lobes) || 0;
    const teeth = (opts && opts.teeth) || 0;
    const rings = lobes ? 22 : 12, seg = lobes ? 15 : 9;
    const positions = new Float32Array(rings * seg * 3);
    const indices = [];
    let p = 0;
    for (let i = 0; i < rings; i++) {
      const t = i / (rings - 1);
      /* Broad and blunt for a lobed leaf — a vine leaf is as wide as it is
         long and notched at the base, not a spearhead. */
      let w = lobes
        ? Math.sin(Math.PI * Math.pow(t, 0.42)) * wid * (1 - 0.45 * Math.pow(1 - t, 6))
        : Math.sin(Math.PI * Math.pow(t, 0.8)) * wid;
      if (lobes) w *= 1 - 0.26 * Math.pow(Math.sin(t * Math.PI * lobes * 0.5), 8);
      for (let j = 0; j < seg; j++) {
        let s = (j / (seg - 1)) * 2 - 1;
        if (teeth) {
          /* Only the rim is cut, so the teeth ride the edge instead of
             rippling the whole blade. */
          const rim = Math.pow(Math.abs(s), 8);
          s *= 1 - rim * teeth * (0.5 + 0.5 * Math.sin(t * 37.0));
        }
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

      const phi = Math.atan2(dy, dz);
      const ay = Math.cos(phi), az = Math.sin(phi);
      const n = spec.corner || 4;
      const r = 1 / Math.pow(
        Math.pow(Math.abs(ay / hy), n) + Math.pow(Math.abs(az / hz), n), 1 / n);

      let y = ay * r, z = az * r;

      /* Tumblehome: the section narrows as it rises. Without it every station
         is a slab of constant width and the result is a loaf — a car is
         widest at the shoulder and tucks in above and below it. The taper is
         applied after solving the section, which keeps the curve closed. */
      if (spec.taper) {
        const yn = M.clamp((y + hy) / (2 * hy), 0, 1);
        z *= sampleProfile(spec.taper, yn);
      }

      out[0] = (t - 0.5) * len;
      out[1] = y + cy;
      out[2] = z;
      return out;
    }

    /* A face is its own module: too much of it is anatomy rather than
       geometry, and it is the one form that keeps moving after it arrives. */
    if (spec.kind === 'face') return NG.FACE.onSphere(out, spec, dx, dy, dz, spec._mouth);

    if (spec.cluster) {
      const h = clusterHit(spec, dx, dy, dz);
      out[0] = dx * h.t; out[1] = dy * h.t; out[2] = dz * h.t;
      return out;
    }

    const scale = P.cm(1);
    const height = (spec.lengthCm || spec.sizeCm) * scale;
    const radius = (spec.widthCm || spec.sizeCm) * 0.5 * scale;
    const profile = spec.profile || FALLBACK_PROFILE;

    const t = 1 - Math.acos(M.clamp(dy, -1, 1)) / Math.PI;
    let r = sampleProfile(profile, t) * radius;
    if (r < 0) r = 0;
    let y = axisY(dimpleSolve(spec.dimple, profile, height, radius), t) * height;

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

  /* ---- clusters: a bunch of grapes ------------------------------------- */

  /* A bunch is not a shape, it is an arrangement, and it is the one specimen
     here whose topology is genuinely not a sphere. Two things follow.

     First, the arrangement is generated once and used by both the standalone
     bunch (real separate berries, real gaps) and by the being wearing it —
     otherwise the thing standing next to you and the thing you turned into
     are two different bunches.

     Second, the being cannot have gaps: it is one closed surface. So what it
     wears is the *union* of the berries, which sounds like a compromise and
     is very nearly not one — a real bunch is packed tight enough that you
     rarely see through it, and a union of packed spheres has exactly the
     lumpy silhouette and the creases between berries that make a bunch read
     as a bunch. */
  function clusterBerries(spec) {
    if (spec._berries) return spec._berries;
    const c = spec.cluster;
    const scale = P.cm(1);
    const r0 = (c.berryCm || 1.6) * 0.5 * scale;
    /* Berry *centres* are packed into an envelope one berry-radius inside the
       bunch's stated size, because each berry then sticks a radius out past
       it. Packed to the stated size instead, an 11 cm bunch measured 12.6. */
    const H = (spec.lengthCm || spec.sizeCm) * scale - r0 * 2;
    const R = (spec.widthCm || spec.sizeCm) * 0.5 * scale - r0;
    const rnd = M.rng(spec.seed || 7);
    const want = c.count || 140;
    /* Shoulders at the top, tapering to a point: the profile of the envelope
       the berries are packed into, top to bottom. */
    const shape = c.shape || [0.60, 0.88, 1.00, 0.98, 0.91, 0.80, 0.66, 0.50, 0.31, 0.10];
    /* How close two berries may sit, as a fraction of their radius. Under two
       they are touching, which is what a bunch does — the berries press on
       each other hard enough to flatten where they meet. */
    const near = (c.pack || 1.42) * r0;
    const near2 = near * near;

    const list = [];
    let tries = 0;
    while (list.length < want && tries < want * 300) {
      tries++;
      /* Biased up the bunch, because the top half holds most of the fruit. */
      const t = Math.pow(rnd(), 0.82);
      const rad = sampleProfile(shape, t) * R;
      const a = rnd() * Math.PI * 2;
      /* Pushed out towards the skin of the bunch rather than spread through
         its volume. Two reasons, and the second is the real one: the middle
         of a bunch is stems, not fruit; and a berry sitting further in than
         its neighbours is seen obliquely by the radial field that carries it,
         which stretches it into a finger. Packed onto a shell, the berries
         are all seen roughly face-on and stay round. */
      const q = Math.pow(rnd(), 0.30);
      const px = Math.cos(a) * rad * q;
      const pz = Math.sin(a) * rad * q;
      const py = (0.5 - t) * H;
      let ok = true;
      for (let i = 0; i < list.length; i++) {
        const b = list[i];
        const ddx = b.x - px, ddy = b.y - py, ddz = b.z - pz;
        if (ddx * ddx + ddy * ddy + ddz * ddz < near2) { ok = false; break; }
      }
      if (!ok) continue;
      list.push({ x: px, y: py, z: pz, r: r0 * (0.88 + rnd() * 0.26), i: list.length });
    }
    /* The envelope goes with the arrangement, so the surface that fills the
       gaps between berries is the surface they were packed into. */
    list.envelope = { R: R, H: H, shape: shape };
    Object.defineProperty(spec, '_berries', { value: list });
    return list;
  }
  P.clusterBerries = clusterBerries;

  /* Where a ray from the middle of the bunch leaves the union of the berries,
     and which berry it left through.

     For a berry the ray misses, the far intersection does not exist, so the
     tangent point is used instead and falls away smoothly past the rim. That
     keeps the field continuous everywhere, which matters: a hole in it would
     be a vertex of the being flung to the origin. */
  /* How far the tapering envelope of the bunch reaches in a direction. Found
     by bisection rather than solved, because the envelope is a profile
     revolved about the axis and the ray is not perpendicular to it.

     This is what fills the gaps between berries. Without it, a direction that
     threads between two berries has nothing to land on, and the only
     available answer — the tangent point of the nearest berry — falls away
     so steeply that every berry ends up a spike. With it, a gap simply shows
     the mass of the bunch a few millimetres further in, which is what a gap
     in a real bunch shows: more grapes. */
  function envelopeReach(shape, R, H, dx, dy, dz) {
    const lat = Math.hypot(dx, dz);
    let lo = 0, hi = Math.max(R, H) * 1.2;
    for (let i = 0; i < 20; i++) {
      const t = (lo + hi) * 0.5;
      const py = dy * t;
      if (Math.abs(py) > H * 0.5) { hi = t; continue; }
      const tt = M.clamp(0.5 - py / H, 0, 1);
      if (lat * t <= sampleProfile(shape, tt) * R) lo = t; else hi = t;
    }
    return lo;
  }

  const HIT = { t: 0, i: -1, nx: 0, ny: 0, nz: 0 };
  function clusterHit(spec, dx, dy, dz) {
    const list = clusterBerries(spec);
    const e = list.envelope;
    /* Exactly the envelope the centres were packed into, so a berry's cap
       meets it tangentially at the edge of the berry and there is no step.
       Set lower, every berry on the silhouette ended in a cliff and the
       bunch grew a fringe of pegs. */
    const fill = envelopeReach(e.shape, e.R, e.H, dx, dy, dz)
      * (spec.cluster.fill === undefined ? 1.0 : spec.cluster.fill);

    let best = fill, bi = -1;
    for (let k = 0; k < list.length; k++) {
      const b = list[k];
      const proj = b.x * dx + b.y * dy + b.z * dz;
      if (proj <= 0) continue;
      const perp2 = b.x * b.x + b.y * b.y + b.z * b.z - proj * proj;
      const rr = b.r * b.r;
      if (perp2 > rr) continue;
      const t = proj + Math.sqrt(rr - perp2);
      if (t > best) { best = t; bi = k; }
    }
    HIT.t = Math.max(best, 0.02);
    /* In a gap, the colour belongs to whichever berry is nearest — the wax
       down in a crevice is the wax on the berries around it. */
    if (bi < 0) {
      let nd = 1e9;
      for (let k = 0; k < list.length; k++) {
        const b = list[k];
        const ddx = b.x - dx * HIT.t, ddy = b.y - dy * HIT.t, ddz = b.z - dz * HIT.t;
        const d2 = ddx * ddx + ddy * ddy + ddz * ddz;
        if (d2 < nd) { nd = d2; bi = k; }
      }
    }
    const b = list[bi];
    HIT.i = bi;
    /* Outward normal of the berry it left through — which way that berry is
       facing is what decides how much bloom sits on it. */
    const hx = dx * HIT.t - b.x, hy = dy * HIT.t - b.y, hz = dz * HIT.t - b.z;
    const l = Math.hypot(hx, hy, hz) || 1;
    HIT.nx = hx / l; HIT.ny = hy / l; HIT.nz = hz / l;
    return HIT;
  }
  P.clusterHit = clusterHit;

  /* The colour of a berry, and of the bloom on it.

     Bloom is the whole read. A grape is a very dark, almost black purple with
     a coat of pale waxy dust over it, and it is the dust you actually see —
     it is why grapes photograph slate blue rather than black, and why they
     look matte in a bowl of otherwise shiny fruit. Left off, this comes out
     as a bag of glass beads.

     It is not uniform. It sits heaviest where the berry faces up and out, and
     it is missing where berries have rubbed against each other, so the darker
     skin shows through in patches down in the crevices. */
  function berryColour(out, spec, i, nx, ny, nz) {
    const c = spec.cluster;
    const skin = spec.color;
    const bloom = c.bloomColor || [0.130, 0.144, 0.238];
    const varies = c.ripeColor || null;

    /* A cheap hash of the berry index: some berries are riper than others,
       and a bunch where every berry is the same colour reads as manufactured. */
    const h = ((i * 2654435761) >>> 0) / 4294967296;
    out[0] = skin[0]; out[1] = skin[1]; out[2] = skin[2];
    if (varies) M.mix3(out, out, varies, Math.pow(h, 1.5));

    /* Facing up and outward: how much wax has settled and stayed. */
    const up = M.clamp(ny * 0.55 + 0.55, 0, 1);
    const k = (c.bloomAmount === undefined ? 0.80 : c.bloomAmount)
      * (0.42 + 0.58 * Math.pow(up, 1.4))
      * (0.80 + 0.20 * h);
    M.mix3(out, out, bloom, M.clamp(k, 0, 1));
    return out;
  }
  P.berryColour = berryColour;

  P.clusterPaint = function (out, spec, dx, dy, dz) {
    const h = clusterHit(spec, dx, dy, dz);
    return berryColour(out, spec, h.i, h.nx, h.ny, h.nz);
  };

  /* What colour the surface is at a given direction.

     One flat colour per specimen is most of why they read as plastic: a real
     apple is red on the side that saw the sun and yellow-green underneath, a
     banana browns at both ends, a mango is red over gold. None of that is
     texture — it is large, soft variation across the body, and it is the
     cheapest realism available.

     `paint.top` / `paint.bottom` blend toward the poles; `paint.blush` blends
     toward a direction, which is what a fruit ripening on one side looks
     like. */
  P.paintOnSphere = function (out, spec, dx, dy, dz) {
    if (spec.kind === 'face') return NG.FACE.paint(out, spec, dx, dy, dz);
    if (spec.cluster) return P.clusterPaint(out, spec, dx, dy, dz);
    const base = spec.color;
    out[0] = base[0]; out[1] = base[1]; out[2] = base[2];
    const paint = spec.paint;
    if (!paint) return out;

    if (paint.bottom) {
      const k = Math.pow(M.clamp(-dy, 0, 1), paint.bottomPower || 2.2);
      M.mix3(out, out, paint.bottom, k * (paint.bottomAmount || 1));
    }
    if (paint.top) {
      const k = Math.pow(M.clamp(dy, 0, 1), paint.topPower || 2.2);
      M.mix3(out, out, paint.top, k * (paint.topAmount || 1));
    }
    if (paint.blush) {
      const b = paint.blush, d = b.dir;
      const k = Math.pow(M.clamp(dx * d[0] + dy * d[1] + dz * d[2], 0, 1), b.power || 1.8);
      M.mix3(out, out, b.color, k * (b.amount === undefined ? 1 : b.amount));
    }
    return out;
  };

  /* Which procedural surface the shader should draw on this thing. */
  P.SKINS = {
    none: 0,
    pitted: 1,      /* citrus: oil glands, dimpled */
    celled: 2,      /* pineapple: fused fruitlets in a diamond lattice */
    seeded: 3,      /* strawberry: achenes sitting in their own pits */
    freckled: 4,    /* banana: sparse dark spots over faint ridges */
    waxy: 5,        /* apple, plum: fine lenticel speckle under a sheen */
    pores: 6,       /* skin: fine grain, and a highlight that scatters */
    bloom: 7        /* grapes, plums: pale wax dust, matte, rubbed off in patches */
  };

  /* A lofted shell, built by pushing a sphere through the same mapping the
     being uses — so there is one definition of the shape and the standalone
     specimen and the worn form cannot drift apart. */
  function hullMesh(spec) {
    const unit = G.icosphere(4);
    const n = unit.positions.length / 3;
    const pos = new Float32Array(n * 3);
    const o = [0, 0, 0];
    for (let i = 0; i < n; i++) {
      P.formOnSphere(o, spec,
        unit.positions[i * 3], unit.positions[i * 3 + 1], unit.positions[i * 3 + 2]);
      pos[i * 3] = o[0]; pos[i * 3 + 1] = o[1]; pos[i * 3 + 2] = o[2];
    }
    return { positions: pos, indices: unit.indices };
  }

  /* Build one produce mesh from a knowledge-base entry.

     With `trimOnly`, the body is left out and only the stem, leaves and crown
     are built. Those are the parts that cannot be expressed on the being's
     own topology — a closed sphere has nowhere to put a pineapple's crown —
     so when it *becomes* a specimen they are attached separately, in this
     same local frame, and ride its transform. Returns null when the specimen
     has no such parts. */
  P.build = function (spec, trimOnly) {
    /* Eyes, ears and hair. There is no standalone face — it is only ever
       something the being is wearing, so there is no body to build here. */
    if (spec.kind === 'face') return trimOnly ? NG.FACE.mesh(spec) : null;

    const part = new Part();
    const scale = P.cm(1);
    const height = (spec.lengthCm || spec.sizeCm) * scale;
    const radius = (spec.widthCm || spec.sizeCm) * 0.5 * scale;
    const mat = spec.gloss === false ? MAT_SKIN : MAT_GLOSS;

    if (trimOnly) {
      /* body skipped */
    } else if (spec.kind === 'hull') {
      const hull = hullMesh(spec);
      part.add(hull.positions, hull.indices, spec.color, mat);
    } else if (spec.cluster) {
      /* The bunch you can stand next to: real separate berries, so it has
         real gaps and a real silhouette. Same arrangement the being wears. */
      const berries = clusterBerries(spec);
      const unit = G.icosphere(2);
      const col = [0, 0, 0];
      const n = unit.positions.length / 3;
      for (let k = 0; k < berries.length; k++) {
        const b = berries[k];
        const pos = new Float32Array(n * 3);
        /* Very slightly taller than wide. A berry hanging in a bunch is not a
           marble; it is squashed by its neighbours and pulled by its own
           weight, and perfect spheres are most of why a cluster of them
           reads as beads. */
        for (let v = 0; v < n; v++) {
          pos[v * 3] = b.x + unit.positions[v * 3] * b.r;
          pos[v * 3 + 1] = b.y + unit.positions[v * 3 + 1] * b.r * 1.06;
          pos[v * 3 + 2] = b.z + unit.positions[v * 3 + 2] * b.r;
        }
        /* Coloured per berry from its own upward face, the same rule the worn
           form uses, so the two bunches are the same bunch. */
        berryColour(col, spec, k, 0, 0.55, 0.5);
        part.add(pos, unit.indices, col, mat);
      }
    } else {
      const body = revolve({
        rings: spec.rings || 28,
        segments: spec.segments || 32,
        height: height,
        radius: radius,
        profile: spec.profile,
        dimple: spec.dimple,
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
        const l = leaf(spec.leaves.lengthCm * scale, spec.leaves.widthCm * 0.5 * scale, 0.02,
          spec.leaves);
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

    /* The glasshouse. A car is two volumes — the body, and the narrower
       cabin sitting on it — and one cross-section per station cannot be two
       widths at once however it is tapered. So the cabin is its own lofted
       shell, riding on top, in glass rather than paint. It is also the second
       strongest cue after the wheels: dark glass above a coloured body is
       most of what "car" looks like from any distance. */
    if (spec.cabin) {
      const c = spec.cabin;
      const shell = hullMesh(c);
      part.add(
        translate(shell.positions, (c.atXCm || 0) * scale, (c.atYCm || 0) * scale, 0),
        shell.indices, c.color || [0.05, 0.06, 0.08], MAT_GLOSS);
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

      /* A hub, standing slightly proud of the tyre so it reads on the wheel
         face. Without it a wheel is a dark blob, and a dark blob at each
         corner is not the same cue as a wheel. */
      let hub = null;
      if (w.hubCm) {
        const h = revolve({
          rings: 6, segments: 18,
          height: w.widthCm * 1.12 * scale, radius: w.hubCm * 0.5 * scale,
          profile: [0, 1, 1, 1, 1, 0]
        });
        hub = { pos: rotateX(h.positions, Math.PI * 0.5), idx: h.indices };
      }

      const corners = [[1, 1], [1, -1], [-1, 1], [-1, -1]];
      for (let i = 0; i < corners.length; i++) {
        const x = corners[i][0] * w.atXCm * scale;
        const y = w.atYCm * scale;
        const z = corners[i][1] * w.atZCm * scale;
        part.add(translate(laid, x, y, z), disc.indices,
          w.color || [0.09, 0.09, 0.10], MAT_MATTE);
        if (hub) {
          part.add(translate(hub.pos, x, y, z), hub.idx,
            w.hubColor || [0.42, 0.44, 0.47], MAT_GLOSS);
        }
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
