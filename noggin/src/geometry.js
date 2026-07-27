/* NOGGIN — procedural geometry: icosphere, adjacency, torus, and the
   sculpted character mesh (head + eyes + brows + hair). */
(function (NG) {
  'use strict';

  const M = NG.M;
  const G = {};

  /* Material ids consumed by the surface shader. */
  const MAT = {
    SKIN: 0,
    SCLERA: 1,
    IRIS: 2,
    HAIR: 3,
    GLINT: 4,
    SHELL: 5,
    HALO: 6
  };
  G.MAT = MAT;

  /* ---- icosphere ------------------------------------------------------ */

  /* Returns { positions: Float32Array (unit vectors), indices: Uint32Array }. */
  G.icosphere = function (subdiv) {
    const t = (1 + Math.sqrt(5)) / 2;
    let verts = [
      [-1, t, 0], [1, t, 0], [-1, -t, 0], [1, -t, 0],
      [0, -1, t], [0, 1, t], [0, -1, -t], [0, 1, -t],
      [t, 0, -1], [t, 0, 1], [-t, 0, -1], [-t, 0, 1]
    ].map(function (v) { return M.normalized(v[0], v[1], v[2]); });

    let faces = [
      [0, 11, 5], [0, 5, 1], [0, 1, 7], [0, 7, 10], [0, 10, 11],
      [1, 5, 9], [5, 11, 4], [11, 10, 2], [10, 7, 6], [7, 1, 8],
      [3, 9, 4], [3, 4, 2], [3, 2, 6], [3, 6, 8], [3, 8, 9],
      [4, 9, 5], [2, 4, 11], [6, 2, 10], [8, 6, 7], [9, 8, 1]
    ];

    for (let s = 0; s < subdiv; s++) {
      const cache = new Map();
      const next = [];
      const mid = function (a, b) {
        const key = a < b ? a * 1000003 + b : b * 1000003 + a;
        let idx = cache.get(key);
        if (idx !== undefined) return idx;
        const va = verts[a], vb = verts[b];
        idx = verts.length;
        verts.push(M.normalized(va[0] + vb[0], va[1] + vb[1], va[2] + vb[2]));
        cache.set(key, idx);
        return idx;
      };
      for (let f = 0; f < faces.length; f++) {
        const a = faces[f][0], b = faces[f][1], c = faces[f][2];
        const ab = mid(a, b), bc = mid(b, c), ca = mid(c, a);
        next.push([a, ab, ca], [b, bc, ab], [c, ca, bc], [ab, bc, ca]);
      }
      faces = next;
    }

    const positions = new Float32Array(verts.length * 3);
    for (let i = 0; i < verts.length; i++) {
      positions[i * 3] = verts[i][0];
      positions[i * 3 + 1] = verts[i][1];
      positions[i * 3 + 2] = verts[i][2];
    }
    const indices = new Uint32Array(faces.length * 3);
    for (let f = 0; f < faces.length; f++) {
      indices[f * 3] = faces[f][0];
      indices[f * 3 + 1] = faces[f][1];
      indices[f * 3 + 2] = faces[f][2];
    }
    return { positions: positions, indices: indices };
  };

  /* One-ring adjacency in CSR form. A closed, consistently oriented manifold
     yields every directed half-edge exactly once, so no dedup pass is needed. */
  G.buildAdjacency = function (indices, vertexCount) {
    const counts = new Int32Array(vertexCount);
    for (let i = 0; i < indices.length; i += 3) {
      counts[indices[i]]++;
      counts[indices[i + 1]]++;
      counts[indices[i + 2]]++;
    }
    const offset = new Int32Array(vertexCount + 1);
    for (let i = 0; i < vertexCount; i++) offset[i + 1] = offset[i] + counts[i];
    const idx = new Int32Array(offset[vertexCount]);
    const cursor = offset.slice(0, vertexCount);
    for (let i = 0; i < indices.length; i += 3) {
      const a = indices[i], b = indices[i + 1], c = indices[i + 2];
      idx[cursor[a]++] = b;
      idx[cursor[b]++] = c;
      idx[cursor[c]++] = a;
    }
    return { offset: offset, idx: idx };
  };

  /* ---- torus (ring targets) ------------------------------------------ */

  G.torus = function (R, r, nu, nv) {
    const positions = new Float32Array(nu * nv * 3);
    const normals = new Float32Array(nu * nv * 3);
    const indices = new Uint32Array(nu * nv * 6);
    let p = 0, ii = 0;
    for (let i = 0; i < nu; i++) {
      const u = (i / nu) * Math.PI * 2;
      const cu = Math.cos(u), su = Math.sin(u);
      for (let j = 0; j < nv; j++) {
        const v = (j / nv) * Math.PI * 2;
        const cv = Math.cos(v), sv = Math.sin(v);
        const nx = cu * cv, ny = su * cv, nz = sv;
        positions[p] = cu * R + nx * r;
        positions[p + 1] = su * R + ny * r;
        positions[p + 2] = nz * r;
        normals[p] = nx; normals[p + 1] = ny; normals[p + 2] = nz;
        p += 3;
        const a = i * nv + j;
        const b = ((i + 1) % nu) * nv + j;
        const c = ((i + 1) % nu) * nv + (j + 1) % nv;
        const d = i * nv + (j + 1) % nv;
        indices[ii++] = a; indices[ii++] = b; indices[ii++] = c;
        indices[ii++] = a; indices[ii++] = c; indices[ii++] = d;
      }
    }
    return { positions: positions, normals: normals, indices: indices };
  };

  /* ---- head sculpt ---------------------------------------------------- */

  /* An anisotropic gaussian bump anchored to a direction on the unit sphere.
     ku / kv are 1/(2*sigma^2) along the feature's tangent / bitangent. */
  function feature(cx, cy, cz, tx, ty, tz, amp, ku, kv) {
    const c = M.normalized(cx, cy, cz);
    let t;
    if (tx === null) {
      const f = M.frame(c);
      t = f[0];
    } else {
      /* Orthogonalise the requested tangent against the centre direction. */
      const d = cx * tx + cy * ty + cz * tz;
      t = M.normalized(tx - c[0] * d, ty - c[1] * d, tz - c[2] * d);
    }
    const b = M.cross3([0, 0, 0], c, t);
    return { c: c, t: t, b: b, amp: amp, ku: ku, kv: kv };
  }

  /* Normalised strength of one feature at a direction, in 0..1. */
  function evalFeature(dx, dy, dz, f) {
    const c = f.c;
    const d = dx * c[0] + dy * c[1] + dz * c[2];
    if (d <= 0.05) return 0;
    const ex = dx - c[0] * d, ey = dy - c[1] * d, ez = dz - c[2] * d;
    const u = ex * f.t[0] + ey * f.t[1] + ez * f.t[2];
    const v = ex * f.b[0] + ey * f.b[1] + ez * f.b[2];
    const e = f.ku * u * u + f.kv * v * v;
    if (e > 12) return 0;
    return Math.exp(-e) * d;
  }
  G.feature = feature;
  G.evalFeature = evalFeature;

  /* Named features are reused by both the sculpt and the vertex colouring. */
  const F = {
    /* Narrow vertical bridge (high ku = tight horizontally, low kv = tall)
       capped by a tight ball, so the nose reads as a nose and not a snout. */
    noseBridge: feature(0, 0.04, 1, 1, 0, 0, 0.17, 15.0, 4.2),
    noseTip: feature(0, -0.09, 1, 1, 0, 0, 0.36, 24.0, 24.0),
    nostrilL: feature(-0.17, -0.14, 0.97, 1, 0, 0, -0.045, 70.0, 70.0),
    nostrilR: feature(0.17, -0.14, 0.97, 1, 0, 0, -0.045, 70.0, 70.0),
    browL: feature(-0.40, 0.40, 0.86, 1, 0, 0, 0.075, 9.5, 32.0),
    browR: feature(0.40, 0.40, 0.86, 1, 0, 0, 0.075, 9.5, 32.0),
    cheekL: feature(-0.60, -0.26, 0.72, null, 0, 0, 0.105, 7.0, 7.0),
    cheekR: feature(0.60, -0.26, 0.72, null, 0, 0, 0.105, 7.0, 7.0),
    chin: feature(0, -0.72, 0.62, 1, 0, 0, 0.13, 9.0, 10.0),
    socketL: feature(-0.42, 0.13, 0.88, 1, 0, 0, -0.10, 13.0, 13.0),
    socketR: feature(0.42, 0.13, 0.88, 1, 0, 0, -0.10, 13.0, 13.0),
    mouth: feature(0, -0.45, 0.90, 1, 0, 0, -0.095, 8.5, 110.0),
    lowerLip: feature(0, -0.565, 0.86, 1, 0, 0, 0.055, 13.0, 60.0),
    upperLip: feature(0, -0.355, 0.92, 1, 0, 0, 0.035, 15.0, 95.0),
    /* Just the mound the (separately meshed) ear attaches to. */
    earL: feature(-1.0, 0.08, -0.02, 0, 1, 0, 0.13, 6.0, 26.0),
    earR: feature(1.0, 0.08, -0.02, 0, 1, 0, 0.13, 6.0, 26.0)
  };
  G.F = F;

  const FEATURES = Object.keys(F).map(function (k) { return F[k]; });

  /* Radial displacement field evaluated for a unit direction. */
  function sculptRadius(dx, dy, dz) {
    let r = 1.0;
    /* cranium volume and jaw taper */
    r += 0.11 * Math.pow(Math.max(0, dy), 1.4);
    const below = Math.max(0, -dy);
    r -= 0.20 * below * below;

    for (let i = 0; i < FEATURES.length; i++) {
      const f = FEATURES[i];
      r += f.amp * evalFeature(dx, dy, dz, f);
    }
    return r;
  }

  /* Sculpted surface point for a unit direction. */
  G.sculpt = function (out, dx, dy, dz) {
    const r = sculptRadius(dx, dy, dz);
    out[0] = dx * r * 0.90;
    out[1] = dy * r * 1.08;
    out[2] = dz * r * 1.02;
    return out;
  };

  /* ---- mesh builder --------------------------------------------------- */

  function Builder() {
    this.pos = [];
    this.col = [];
    this.mat = [];
    this.idx = [];
  }

  Builder.prototype.vertexCount = function () { return this.pos.length / 3; };

  Builder.prototype.append = function (positions, indices, color, matId) {
    const base = this.pos.length / 3;
    for (let i = 0; i < positions.length; i++) this.pos.push(positions[i]);
    for (let i = 0; i < positions.length / 3; i++) {
      this.col.push(color[0], color[1], color[2]);
      this.mat.push(matId);
    }
    for (let i = 0; i < indices.length; i++) this.idx.push(indices[i] + base);
    return base;
  };

  /* Ellipsoid built from a unit icosphere: centre + u*ru + v*rv + w*rw. */
  function ellipsoid(unit, center, axes, radii) {
    const n = unit.positions.length / 3;
    const out = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const x = unit.positions[i * 3] * radii[0];
      const y = unit.positions[i * 3 + 1] * radii[1];
      const z = unit.positions[i * 3 + 2] * radii[2];
      out[i * 3] = center[0] + axes[0][0] * x + axes[1][0] * y + axes[2][0] * z;
      out[i * 3 + 1] = center[1] + axes[0][1] * x + axes[1][1] * y + axes[2][1] * z;
      out[i * 3 + 2] = center[2] + axes[0][2] * x + axes[1][2] * y + axes[2][2] * z;
    }
    return out;
  }

  /* ---- binding grid (skin sub-objects to the head deformation field) --- */

  function SpatialGrid(positions, count, cell) {
    this.cell = cell;
    this.map = new Map();
    this.positions = positions;
    for (let i = 0; i < count; i++) {
      const k = this.key(positions[i * 3], positions[i * 3 + 1], positions[i * 3 + 2]);
      let bucket = this.map.get(k);
      if (!bucket) { bucket = []; this.map.set(k, bucket); }
      bucket.push(i);
    }
  }
  SpatialGrid.prototype.key = function (x, y, z) {
    const cx = Math.floor(x / this.cell) + 512;
    const cy = Math.floor(y / this.cell) + 512;
    const cz = Math.floor(z / this.cell) + 512;
    return (cx * 1024 + cy) * 1024 + cz;
  };
  /* Collect candidate indices within `rings` cells of (x,y,z). */
  SpatialGrid.prototype.gather = function (x, y, z, rings, out) {
    out.length = 0;
    const cx = Math.floor(x / this.cell) + 512;
    const cy = Math.floor(y / this.cell) + 512;
    const cz = Math.floor(z / this.cell) + 512;
    for (let i = -rings; i <= rings; i++) {
      for (let j = -rings; j <= rings; j++) {
        for (let k = -rings; k <= rings; k++) {
          const bucket = this.map.get(((cx + i) * 1024 + (cy + j)) * 1024 + (cz + k));
          if (bucket) for (let b = 0; b < bucket.length; b++) out.push(bucket[b]);
        }
      }
    }
    return out;
  };

  const BIND_K = 4;

  function bindToHead(rest, headCount, total) {
    const grid = new SpatialGrid(rest, headCount, 0.16);
    const partCount = total - headCount;
    const bindIdx = new Int32Array(partCount * BIND_K);
    const bindW = new Float32Array(partCount * BIND_K);
    const cand = [];
    const bestI = new Int32Array(BIND_K);
    const bestD = new Float64Array(BIND_K);

    for (let p = 0; p < partCount; p++) {
      const vi = headCount + p;
      const x = rest[vi * 3], y = rest[vi * 3 + 1], z = rest[vi * 3 + 2];
      let rings = 1;
      grid.gather(x, y, z, rings, cand);
      while (cand.length < BIND_K && rings < 12) {
        rings++;
        grid.gather(x, y, z, rings, cand);
      }
      for (let k = 0; k < BIND_K; k++) { bestI[k] = 0; bestD[k] = Infinity; }
      for (let c = 0; c < cand.length; c++) {
        const hi = cand[c];
        const dx = rest[hi * 3] - x, dy = rest[hi * 3 + 1] - y, dz = rest[hi * 3 + 2] - z;
        const d = dx * dx + dy * dy + dz * dz;
        if (d >= bestD[BIND_K - 1]) continue;
        let k = BIND_K - 1;
        while (k > 0 && bestD[k - 1] > d) { bestD[k] = bestD[k - 1]; bestI[k] = bestI[k - 1]; k--; }
        bestD[k] = d; bestI[k] = hi;
      }
      let sum = 0;
      for (let k = 0; k < BIND_K; k++) {
        const w = 1 / (bestD[k] + 1e-4);
        bindW[p * BIND_K + k] = w;
        bindIdx[p * BIND_K + k] = bestI[k];
        sum += w;
      }
      for (let k = 0; k < BIND_K; k++) bindW[p * BIND_K + k] /= sum;
    }
    return { k: BIND_K, idx: bindIdx, w: bindW };
  }

  /* ---- character ------------------------------------------------------ */

  const SKIN = [0.90, 0.64, 0.49];
  const SKIN_WARM = [0.84, 0.47, 0.38];
  const LIP = [0.74, 0.34, 0.33];
  const ROSY = [0.90, 0.52, 0.45];
  const SCLERA = [0.96, 0.96, 0.99];
  const IRIS = [0.09, 0.46, 0.56];
  const PUPIL = [0.03, 0.03, 0.05];
  const HAIR = [0.26, 0.14, 0.10];
  const GLINT = [1.0, 1.0, 1.0];

  /* Area-weighted vertex normals; used once at build time so that parts,
     which only ever translate, can keep static normals at runtime. */
  G.computeNormals = function (positions, indices, count) {
    const nrm = new Float32Array(count * 3);
    for (let t = 0; t < indices.length; t += 3) {
      const a = indices[t] * 3, b = indices[t + 1] * 3, c = indices[t + 2] * 3;
      const ax = positions[a], ay = positions[a + 1], az = positions[a + 2];
      const e1x = positions[b] - ax, e1y = positions[b + 1] - ay, e1z = positions[b + 2] - az;
      const e2x = positions[c] - ax, e2y = positions[c + 1] - ay, e2z = positions[c + 2] - az;
      const nx = e1y * e2z - e1z * e2y;
      const ny = e1z * e2x - e1x * e2z;
      const nz = e1x * e2y - e1y * e2x;
      nrm[a] += nx; nrm[a + 1] += ny; nrm[a + 2] += nz;
      nrm[b] += nx; nrm[b + 1] += ny; nrm[b + 2] += nz;
      nrm[c] += nx; nrm[c + 1] += ny; nrm[c + 2] += nz;
    }
    for (let i = 0; i < nrm.length; i += 3) {
      const l = Math.hypot(nrm[i], nrm[i + 1], nrm[i + 2]);
      if (l > 1e-9) { nrm[i] /= l; nrm[i + 1] /= l; nrm[i + 2] /= l; }
      else { nrm[i + 1] = 1; }
    }
    return nrm;
  };

  /* Builds the full stretchable specimen. Returns typed arrays ready for
     upload plus the topology the soft-body solver needs. */
  /* The being: a near-spherical iridescent shell. It has no face, so all of
     its expression comes from the soft-body deformation, its drift, and the
     focal point the shader paints wherever it is looking. The slight lobing
     keeps it off a perfect primitive — a flawless sphere reads as untouched
     default geometry. */
  G.buildOrb = function (subdiv) {
    const sphere = G.icosphere(subdiv);
    const n = sphere.positions.length / 3;
    const R = 1.15;
    const rest = new Float32Array(n * 3);

    for (let i = 0; i < n; i++) {
      const x = sphere.positions[i * 3];
      const y = sphere.positions[i * 3 + 1];
      const z = sphere.positions[i * 3 + 2];
      const lobe = 1
        + 0.030 * Math.sin(y * 3.1 + 0.6)
        + 0.022 * Math.sin(x * 2.4 - 1.2)
        + 0.018 * Math.sin(z * 2.9 + 2.1);
      const r = R * lobe;
      rest[i * 3] = x * r;
      rest[i * 3 + 1] = y * r * 1.03;
      rest[i * 3 + 2] = z * r;
    }

    const colors = new Float32Array(n * 3);
    const mats = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      colors[i * 3] = 0.42; colors[i * 3 + 1] = 0.62; colors[i * 3 + 2] = 0.95;
      mats[i] = MAT.SHELL;
    }

    return {
      rest: rest,
      restNormals: G.computeNormals(rest, sphere.indices, n),
      colors: colors,
      mats: mats,
      indices: sphere.indices,
      headCount: n,
      total: n,
      adjacency: G.buildAdjacency(sphere.indices, n),
      headIndices: sphere.indices,
      /* Nothing is skinned to it — the shell is the whole being. */
      binding: { k: 4, idx: new Int32Array(0), w: new Float32Array(0) }
    };
  };

  /* A halo ring. Rendered as a prop with its own transform so it can turn
     independently of the shell. */
  G.buildHalo = function (radius, tube) {
    const t = G.torus(radius, tube, 96, 8);
    const n = t.positions.length / 3;
    const colors = new Float32Array(n * 3);
    const mats = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      colors[i * 3] = 0.72; colors[i * 3 + 1] = 0.86; colors[i * 3 + 2] = 1.0;
      mats[i] = MAT.HALO;
    }
    return {
      positions: t.positions, normals: t.normals, colors: colors, mats: mats,
      indices: t.indices, heightUnits: tube * 2, radiusUnits: radius, topUnits: tube
    };
  };

  G.buildCharacter = function (subdiv) {
    const b = new Builder();
    const sphere = G.icosphere(subdiv);
    const n = sphere.positions.length / 3;

    /* --- head --- */
    const headPos = new Float32Array(n * 3);
    const tmp = [0, 0, 0];
    for (let i = 0; i < n; i++) {
      G.sculpt(tmp, sphere.positions[i * 3], sphere.positions[i * 3 + 1], sphere.positions[i * 3 + 2]);
      headPos[i * 3] = tmp[0];
      headPos[i * 3 + 1] = tmp[1];
      headPos[i * 3 + 2] = tmp[2];
    }
    b.append(headPos, sphere.indices, SKIN, MAT.SKIN);
    const headCount = n;

    /* Vertex colour carries the facial detail that geometry alone reads too
       softly: lips, nose tip, ear cartilage and a cheek flush. */
    const tmpCol = [0, 0, 0];
    for (let i = 0; i < n; i++) {
      const dx = sphere.positions[i * 3];
      const dy = sphere.positions[i * 3 + 1];
      const dz = sphere.positions[i * 3 + 2];

      const lip = M.clamp(
        evalFeature(dx, dy, dz, F.mouth) * 1.25 +
        evalFeature(dx, dy, dz, F.lowerLip) * 1.05 +
        evalFeature(dx, dy, dz, F.upperLip) * 1.0, 0, 1);
      const nose = M.clamp(evalFeature(dx, dy, dz, F.noseTip) * 0.95, 0, 1);
      const ear = M.clamp(
        (evalFeature(dx, dy, dz, F.earL) + evalFeature(dx, dy, dz, F.earR)) * 0.75, 0, 1);
      const cheek = M.clamp(
        (evalFeature(dx, dy, dz, F.cheekL) + evalFeature(dx, dy, dz, F.cheekR)) * 0.55, 0, 1);

      M.copy3(tmpCol, SKIN);
      M.mix3(tmpCol, tmpCol, ROSY, cheek * 0.45);
      M.mix3(tmpCol, tmpCol, SKIN_WARM, Math.max(nose, ear) * 0.75);
      M.mix3(tmpCol, tmpCol, LIP, lip * 0.9);

      b.col[i * 3] = tmpCol[0];
      b.col[i * 3 + 1] = tmpCol[1];
      b.col[i * 3 + 2] = tmpCol[2];
    }

    /* Anchor a sub-object to the sculpted surface along a direction. The head
       is scaled per axis after the radial sculpt, so the surface point is NOT
       on the ray through `dir`; taking the real point and offsetting along its
       own outward direction is what keeps eyes and ears seated correctly. */
    const anchor = function (dirX, dirY, dirZ, inset) {
      const d = M.normalized(dirX, dirY, dirZ);
      const s = [0, 0, 0];
      G.sculpt(s, d[0], d[1], d[2]);
      const outward = M.norm3([0, 0, 0], s);
      return {
        center: M.addScaled3([0, 0, 0], s, outward, inset),
        out: outward,
        frame: M.frame(outward)
      };
    };

    /* --- eyes ---
       The eyeballs sit proud of their sockets so the sclera reads from the
       front; that is also what makes them deform so legibly when pulled. */
    const midSphere = G.icosphere(Math.min(3, subdiv));
    const tinySphere = G.icosphere(2);

    for (let e = 0; e < 2; e++) {
      const sx = e === 0 ? -1 : 1;
      const a = anchor(sx * 0.42, 0.13, 0.88, -0.13);
      const frame = a.frame, out = a.out;

      b.append(ellipsoid(midSphere, a.center, frame, [0.30, 0.32, 0.30]),
        midSphere.indices, SCLERA, MAT.SCLERA);

      const irisC = M.addScaled3([0, 0, 0], a.center, out, 0.245);
      b.append(ellipsoid(tinySphere, irisC, frame, [0.125, 0.125, 0.085]),
        tinySphere.indices, IRIS, MAT.IRIS);

      const pupilC = M.addScaled3([0, 0, 0], a.center, out, 0.285);
      b.append(ellipsoid(tinySphere, pupilC, frame, [0.060, 0.060, 0.040]),
        tinySphere.indices, PUPIL, MAT.IRIS);

      const glintC = M.addScaled3([0, 0, 0], a.center, out, 0.295);
      M.addScaled3(glintC, glintC, frame[0], -0.085);
      M.addScaled3(glintC, glintC, frame[1], 0.085);
      b.append(ellipsoid(tinySphere, glintC, frame, [0.036, 0.036, 0.030]),
        tinySphere.indices, GLINT, MAT.GLINT);
    }

    /* --- ears ---
       A radial height field over a sphere cannot produce an ear: it has no way
       to make a thin fin that stands off the skull. So the ears are separate
       flattened ellipsoids, skinned to the head like the eyes — which also
       makes them the most satisfying thing on the model to pull. */
    for (let e = 0; e < 2; e++) {
      const sx = e === 0 ? -1 : 1;
      const a = anchor(sx * 1.0, 0.10, -0.06, 0.03);
      const u = a.frame[0], v = a.frame[1], w = a.frame[2];  /* back, up, out */

      b.append(ellipsoid(midSphere, a.center, [u, v, w], [0.22, 0.35, 0.09]),
        midSphere.indices, SKIN, MAT.SKIN);

      /* Pointed upper lobe, pushed up and back off the main disc. */
      const tip = M.addScaled3([0, 0, 0], a.center, v, 0.25);
      M.addScaled3(tip, tip, u, 0.08);
      b.append(ellipsoid(tinySphere, tip, [u, v, w], [0.115, 0.17, 0.070]),
        tinySphere.indices, SKIN, MAT.SKIN);

      /* Concha: a smaller, warmer inset disc facing outward. */
      const inner = M.addScaled3([0, 0, 0], a.center, w, 0.05);
      M.addScaled3(inner, inner, u, -0.035);
      b.append(ellipsoid(tinySphere, inner, [u, v, w], [0.115, 0.20, 0.055]),
        tinySphere.indices, SKIN_WARM, MAT.SKIN);
    }

    /* --- eyebrows --- */
    for (let e = 0; e < 2; e++) {
      const sx = e === 0 ? -1 : 1;
      const a = anchor(sx * 0.41, 0.46, 0.82, 0.005);
      /* tilt the outer end up for an inquisitive read */
      const tilt = sx * -0.26;
      const ct = Math.cos(tilt), st = Math.sin(tilt);
      const u = M.addScaled3([0, 0, 0], M.scale3([0, 0, 0], a.frame[0], ct), a.frame[1], st);
      const v = M.addScaled3([0, 0, 0], M.scale3([0, 0, 0], a.frame[0], -st), a.frame[1], ct);
      b.append(ellipsoid(tinySphere, a.center, [u, v, a.frame[2]], [0.25, 0.070, 0.050]),
        tinySphere.indices, HAIR, MAT.HAIR);
    }

    /* --- hair tuft: a curl of overlapping blobs sweeping up and back --- */
    const curl = [
      { d: [0.06, 1.0, 0.22], r: 0.185, off: -0.05 },
      { d: [0.10, 1.0, 0.10], r: 0.165, off: 0.04 },
      { d: [0.09, 1.0, -0.03], r: 0.140, off: 0.12 },
      { d: [0.02, 1.0, -0.16], r: 0.110, off: 0.18 },
      { d: [-0.07, 1.0, -0.27], r: 0.080, off: 0.21 },
      { d: [-0.14, 1.0, -0.36], r: 0.055, off: 0.21 }
    ];
    for (let i = 0; i < curl.length; i++) {
      const c = curl[i];
      const a = anchor(c.d[0], c.d[1], c.d[2], c.off);
      b.append(ellipsoid(tinySphere, a.center, a.frame, [c.r, c.r * 0.9, c.r]),
        tinySphere.indices, HAIR, MAT.HAIR);
    }

    const total = b.vertexCount();
    const rest = new Float32Array(b.pos);
    const colors = new Float32Array(b.col);
    const mats = new Float32Array(b.mat);
    const indices = new Uint32Array(b.idx);

    return {
      rest: rest,
      restNormals: G.computeNormals(rest, indices, total),
      colors: colors,
      mats: mats,
      indices: indices,
      headCount: headCount,
      total: total,
      adjacency: G.buildAdjacency(sphere.indices, headCount),
      /* Head-only triangle list, used for ray picking. */
      headIndices: sphere.indices,
      binding: bindToHead(rest, headCount, total)
    };
  };

  NG.G = G;
})(window.NG = window.NG || {});
