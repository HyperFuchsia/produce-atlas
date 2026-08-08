/* NOGGIN — soft-body solver.

   The head is simulated in local space as a displacement field over the mesh
   vertices. Each vertex is pulled back toward its rest position by a spring,
   while a Laplacian coupling term diffuses displacement across the one-ring
   neighbourhood. That coupling is what makes a pulled point drag a smooth
   rubbery tube of surface with it, and what makes the release wobble travel
   across the face instead of snapping back vertex-by-vertex.

   Sub-objects (eyes, brows, hair) are not part of the simulated topology.
   They are skinned to the head's displacement field through precomputed
   nearest-vertex weights, so they ride along with whatever the face does. */
(function (NG) {
  'use strict';

  const M = NG.M;

  /* Minimal binary heap over (distance, vertex) pairs for the geodesic
     falloff computed at grab time. */
  function Heap() {
    this.d = [];
    this.v = [];
  }
  Heap.prototype.clear = function () { this.d.length = 0; this.v.length = 0; };
  Heap.prototype.size = function () { return this.d.length; };
  Heap.prototype.push = function (dist, vert) {
    const d = this.d, v = this.v;
    let i = d.length;
    d.push(dist); v.push(vert);
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (d[p] <= d[i]) break;
      const td = d[p]; d[p] = d[i]; d[i] = td;
      const tv = v[p]; v[p] = v[i]; v[i] = tv;
      i = p;
    }
  };
  Heap.prototype.pop = function () {
    const d = this.d, v = this.v;
    const topD = d[0], topV = v[0];
    const lastD = d.pop(), lastV = v.pop();
    if (d.length) {
      d[0] = lastD; v[0] = lastV;
      let i = 0;
      for (;;) {
        const l = i * 2 + 1, r = l + 1;
        let s = i;
        if (l < d.length && d[l] < d[s]) s = l;
        if (r < d.length && d[r] < d[s]) s = r;
        if (s === i) break;
        const td = d[s]; d[s] = d[i]; d[i] = td;
        const tv = v[s]; v[s] = v[i]; v[i] = tv;
        i = s;
      }
    }
    this._d = topD;
    return topV;
  };

  /* One pull: which vertices it holds, how strongly, and where they were when
     it took hold. Sized for the whole body once, so taking hold allocates
     nothing. */
  function GrabSlot(n) {
    this.idx = new Int32Array(n);
    this.w = new Float32Array(n);
    this.base = new Float32Array(n * 3);
    this.count = 0;
    this.active = false;
    this.delta = [0, 0, 0];
    this.anchor = [0, 0, 0];
  }

  function Softbody(mesh, opts) {
    opts = opts || {};
    this.mesh = mesh;
    this.headCount = mesh.headCount;
    this.total = mesh.total;

    this.rest = mesh.rest;
    this.pos = new Float32Array(mesh.rest);
    this.vel = new Float32Array(this.headCount * 3);
    /* Displacement from rest, kept alongside pos as the solver's working set. */
    this.disp = new Float32Array(this.headCount * 3);
    /* Part normals are seeded from the rest pose and never recomputed: the
       skinning only translates them, so their orientation is preserved. */
    this.nrm = new Float32Array(mesh.restNormals);
    this.stretch = new Float32Array(this.total);

    this.adj = mesh.adjacency;
    this.binding = mesh.binding;

    /* Tuning. stiffness restores the rest shape; coupling diffuses
       displacement between neighbours; damping bleeds energy. The ratio is
       chosen for a damping factor around 0.2: enough overshoot to read as
       rubber, few enough cycles that the face is home in about a second. */
    this.stiffness = opts.stiffness !== undefined ? opts.stiffness : 165;
    this.coupling = opts.coupling !== undefined ? opts.coupling : 900;
    this.damping = opts.damping !== undefined ? opts.damping : 5.5;
    this.maxStretch = opts.maxStretch !== undefined ? opts.maxStretch : 2.6;
    this.maxSpeed = opts.maxSpeed !== undefined ? opts.maxSpeed : 34;
    /* Fraction of a vertex's rest radius it may never fall inside. */
    this.coreRadius = 0.32;

    /* Rest edge lengths per directed half-edge, for geodesic grab falloff,
       and rest radii for the keep-out. Both are derived from `rest`, so both
       have to be refreshed whenever the rest shape changes. */
    this.edgeLen = new Float32Array(this.adj.idx.length);
    this.restLen = new Float32Array(this.headCount);
    this.refreshEdgeLengths();
    this.refreshRestLengths();

    /* Grab state, as a small fixed pool rather than one set of fields. Two
       independent pulls have to be able to coexist: the being reaches in and
       stretches itself alongside you, and one shared grab would mean whoever
       moved last won. */
    this.grabs = [new GrabSlot(this.headCount), new GrabSlot(this.headCount)];
    this.grabbing = false;

    /* The ground, when there is one. */
    this.floor = null;
    this.floorDeepest = 0;

    /* Scratch for the geodesic flood. */
    this._heap = new Heap();
    this._dist = new Float32Array(this.headCount);
    this._visited = new Int32Array(this.headCount);
    this._visitStamp = 0;

    /* Collision probes: a strided subset of head vertices is enough to
       register a ring pass and keeps the per-frame test cheap. */
    const stride = 3;
    const probeCount = Math.floor(this.headCount / stride);
    this.probes = new Int32Array(probeCount);
    for (let i = 0; i < probeCount; i++) this.probes[i] = i * stride;

    this.maxDisplacement = 0;
    this.energy = 0;
  }

  Softbody.prototype.refreshEdgeLengths = function () {
    for (let i = 0; i < this.headCount; i++) {
      for (let e = this.adj.offset[i]; e < this.adj.offset[i + 1]; e++) {
        const j = this.adj.idx[e];
        this.edgeLen[e] = Math.hypot(
          this.rest[j * 3] - this.rest[i * 3],
          this.rest[j * 3 + 1] - this.rest[i * 3 + 1],
          this.rest[j * 3 + 2] - this.rest[i * 3 + 2]
        );
      }
    }
  };

  Softbody.prototype.refreshRestLengths = function () {
    for (let i = 0; i < this.headCount; i++) {
      this.restLen[i] = Math.hypot(
        this.rest[i * 3], this.rest[i * 3 + 1], this.rest[i * 3 + 2]);
    }
  };

  /* ---- simulation ------------------------------------------------------ */

  Softbody.prototype.step = function (dt) {
    const n = this.headCount;
    const pos = this.pos, vel = this.vel, disp = this.disp;
    const off = this.adj.offset, nbr = this.adj.idx;
    const k = this.stiffness, c = this.coupling;
    const damp = Math.exp(-this.damping * dt);
    const maxSpeed = this.maxSpeed, maxSpeed2 = maxSpeed * maxSpeed;

    for (let i = 0; i < n; i++) {
      const i3 = i * 3;
      const dx = disp[i3], dy = disp[i3 + 1], dz = disp[i3 + 2];

      /* The neighbour gather is the hot loop of the whole app. Keeping the
         displacement field in its own array halves the memory it touches
         versus deriving it from pos and rest on the fly. */
      let sx = 0, sy = 0, sz = 0;
      const s = off[i], e = off[i + 1];
      for (let q = s; q < e; q++) {
        const j3 = nbr[q] * 3;
        sx += disp[j3];
        sy += disp[j3 + 1];
        sz += disp[j3 + 2];
      }
      const inv = 1 / (e - s);
      const lx = sx * inv - dx;
      const ly = sy * inv - dy;
      const lz = sz * inv - dz;

      let vx = (vel[i3] + (-k * dx + c * lx) * dt) * damp;
      let vy = (vel[i3 + 1] + (-k * dy + c * ly) * dt) * damp;
      let vz = (vel[i3 + 2] + (-k * dz + c * lz) * dt) * damp;

      /* Speed ceiling: a violent flick must not be able to launch a vertex
         far enough to tunnel through the limits below. */
      const sp2 = vx * vx + vy * vy + vz * vz;
      if (sp2 > maxSpeed2) {
        const s = maxSpeed / Math.sqrt(sp2);
        vx *= s; vy *= s; vz *= s;
      }

      vel[i3] = vx; vel[i3 + 1] = vy; vel[i3 + 2] = vz;
      const ax = vx * dt, ay = vy * dt, az = vz * dt;
      pos[i3] += ax; pos[i3 + 1] += ay; pos[i3 + 2] += az;
      disp[i3] = dx + ax; disp[i3 + 1] = dy + ay; disp[i3 + 2] = dz + az;
    }

    for (let s = 0; s < this.grabs.length; s++) {
      if (this.grabs[s].active) this._applyGrab(this.grabs[s], dt);
    }
    /* _applyLimits also re-derives `disp` from `pos`, which is what keeps the
       two in step after the grab has moved vertices kinematically. */
    this._applyLimits();
    /* The floor goes last, so nothing after it can push a vertex back under.
       The keep-out in particular pushes outward from the centre, which for
       anything resting on the ground is partly downward. */
    if (this.floor) this._applyFloor(dt);
  };

  /* Where the ground is, in terms the solver can use.

     The solver works in the body's own space and the floor is a world plane,
     so the caller hands over the row of the model matrix that produces world
     Y — `g`, whose length is the model's scale — together with the height of
     the floor relative to the body's origin. Pass null to switch it off. */
  Softbody.prototype.setFloor = function (g, offset, mu) {
    if (!g) { this.floor = null; return; }
    const gg = g[0] * g[0] + g[1] * g[1] + g[2] * g[2];
    if (gg < 1e-9) { this.floor = null; return; }
    this.floor = { g0: g[0], g1: g[1], g2: g[2], inv: 1 / gg, offset: offset, mu: mu };
    this.floorDeepest = 0;
  };

  /* A hard floor, per vertex. Constraining only the body's centre is what
     let a landing squash push its own underside through the ground, and let
     a melt sink into it: the shape that has to stay above the plane is the
     deformed one, not the nominal one. */
  Softbody.prototype._applyFloor = function (dt) {
    const f = this.floor;
    const pos = this.pos, vel = this.vel, disp = this.disp, rest = this.rest;
    const g0 = f.g0, g1 = f.g1, g2 = f.g2, inv = f.inv, offset = f.offset;
    /* Friction as a rate, so the result does not depend on the substep size. */
    const keep = Math.exp(-f.mu * dt);
    let deepest = 0;

    for (let i = 0; i < this.headCount; i++) {
      const i3 = i * 3;
      const h = g0 * pos[i3] + g1 * pos[i3 + 1] + g2 * pos[i3 + 2];
      const d = offset - h;                 /* positive means below the floor */
      if (d <= 0) continue;
      if (d > deepest) deepest = d;

      /* Straight back up, the shortest way to the plane. */
      const k = d * inv;
      pos[i3] += g0 * k; pos[i3 + 1] += g1 * k; pos[i3 + 2] += g2 * k;

      /* Take the downward velocity out — it has been spent on the ground —
         then bleed the sideways part, without which a puddle skates about on
         a surface it should be gripping. */
      const vn = (g0 * vel[i3] + g1 * vel[i3 + 1] + g2 * vel[i3 + 2]) * inv;
      if (vn < 0) {
        vel[i3] -= g0 * vn; vel[i3 + 1] -= g1 * vn; vel[i3 + 2] -= g2 * vn;
      }
      vel[i3] *= keep; vel[i3 + 1] *= keep; vel[i3 + 2] *= keep;

      disp[i3] = pos[i3] - rest[i3];
      disp[i3 + 1] = pos[i3 + 1] - rest[i3 + 1];
      disp[i3 + 2] = pos[i3 + 2] - rest[i3 + 2];
    }
    if (deepest > this.floorDeepest) this.floorDeepest = deepest;
  };

  /* How far the deformed body currently reaches below the plane. */
  Softbody.prototype.lowestAlong = function (g, useRest) {
    const a = useRest ? this.rest : this.pos;
    const g0 = g[0], g1 = g[1], g2 = g[2];
    let low = Infinity;
    for (let i = 0; i < this.headCount; i++) {
      const i3 = i * 3;
      const h = g0 * a[i3] + g1 * a[i3 + 1] + g2 * a[i3 + 2];
      if (h < low) low = h;
    }
    return low;
  };

  Softbody.prototype._applyGrab = function (slot, dt) {
    const pos = this.pos, vel = this.vel;
    const idx = slot.idx, w = slot.w, base = slot.base;
    const dx = slot.delta[0], dy = slot.delta[1], dz = slot.delta[2];
    const invDt = dt > 1e-6 ? 1 / dt : 0;

    for (let g = 0; g < slot.count; g++) {
      const i = idx[g], i3 = i * 3, g3 = g * 3;
      const wi = w[g];
      const tx = base[g3] + dx * wi;
      const ty = base[g3 + 1] + dy * wi;
      const tz = base[g3 + 2] + dz * wi;

      /* Blend toward the kinematic target; blend the induced motion into the
         velocity so releasing a fast drag flicks the surface. */
      const a = wi > 1 ? 1 : wi;
      const ox = pos[i3], oy = pos[i3 + 1], oz = pos[i3 + 2];
      const nx = ox + (tx - ox) * a;
      const ny = oy + (ty - oy) * a;
      const nz = oz + (tz - oz) * a;
      pos[i3] = nx; pos[i3 + 1] = ny; pos[i3 + 2] = nz;
      vel[i3] += ((nx - ox) * invDt - vel[i3]) * a;
      vel[i3 + 1] += ((ny - oy) * invDt - vel[i3 + 1]) * a;
      vel[i3 + 2] += ((nz - oz) * invDt - vel[i3 + 2]) * a;
    }
  };

  /* Soft displacement ceiling plus a core keep-out so the face cannot be
     pushed through the back of the skull. */
  Softbody.prototype._applyLimits = function () {
    const n = this.headCount;
    const pos = this.pos, rest = this.rest, vel = this.vel, disp = this.disp;
    const maxR = this.maxStretch, core = this.coreRadius;
    const restLen = this.restLen;
    const stretch = this.stretch;
    let maxD = 0, energy = 0;

    for (let i = 0; i < n; i++) {
      const i3 = i * 3;
      let dx = pos[i3] - rest[i3];
      let dy = pos[i3 + 1] - rest[i3 + 1];
      let dz = pos[i3 + 2] - rest[i3 + 2];
      let len = Math.sqrt(dx * dx + dy * dy + dz * dz);

      if (len > maxR) {
        /* Soft knee rather than a hard stop, so hitting the limit still
           feels elastic instead of like a wall. */
        const s = (maxR + (len - maxR) * 0.18) / len;
        dx *= s; dy *= s; dz *= s;
        pos[i3] = rest[i3] + dx;
        pos[i3 + 1] = rest[i3 + 1] + dy;
        pos[i3 + 2] = rest[i3 + 2] + dz;
        vel[i3] *= 0.5; vel[i3 + 1] *= 0.5; vel[i3 + 2] *= 0.5;
        len = Math.sqrt(dx * dx + dy * dy + dz * dz);
      }

      /* Keep-out: stop a hard inward push folding the body through itself.
         The threshold is a fraction of this vertex's own rest radius, not one
         absolute distance, because the rest shape changes — an absolute core
         would inflate anything thin, like a carrot, into a tube. */
      const px = pos[i3], py = pos[i3 + 1], pz = pos[i3 + 2];
      const r = Math.sqrt(px * px + py * py + pz * pz);
      const keep = core * restLen[i];
      if (r < keep) {
        if (r > 1e-5) {
          const s = keep / r;
          pos[i3] = px * s; pos[i3 + 1] = py * s; pos[i3 + 2] = pz * s;
        } else {
          pos[i3] = rest[i3] * 0.4;
          pos[i3 + 1] = rest[i3 + 1] * 0.4;
          pos[i3 + 2] = rest[i3 + 2] * 0.4;
        }
        dx = pos[i3] - rest[i3];
        dy = pos[i3 + 1] - rest[i3 + 1];
        dz = pos[i3 + 2] - rest[i3 + 2];
        len = Math.sqrt(dx * dx + dy * dy + dz * dz);
      }

      disp[i3] = dx; disp[i3 + 1] = dy; disp[i3 + 2] = dz;
      if (len > maxD) maxD = len;
      energy += len;
      stretch[i] = len;
    }
    this.maxDisplacement = maxD;
    this.energy = energy / n;
  };

  /* ---- skinning + normals --------------------------------------------- */

  Softbody.prototype.updateParts = function () {
    const head = this.headCount, total = this.total;
    const pos = this.pos, rest = this.rest;
    const bind = this.binding;
    const K = bind.k, bi = bind.idx, bw = bind.w;

    for (let p = 0; p < total - head; p++) {
      const vi = head + p, v3 = vi * 3;
      let dx = 0, dy = 0, dz = 0;
      for (let k = 0; k < K; k++) {
        const h = bi[p * K + k], h3 = h * 3, w = bw[p * K + k];
        dx += (pos[h3] - rest[h3]) * w;
        dy += (pos[h3 + 1] - rest[h3 + 1]) * w;
        dz += (pos[h3 + 2] - rest[h3 + 2]) * w;
      }
      pos[v3] = rest[v3] + dx;
      pos[v3 + 1] = rest[v3 + 1] + dy;
      pos[v3 + 2] = rest[v3 + 2] + dz;
      this.stretch[vi] = Math.sqrt(dx * dx + dy * dy + dz * dz);
    }
  };

  /* Only the head is re-normalled per frame; that is where the deformation
     actually changes surface orientation, and it is 3/4 of the triangles. */
  Softbody.prototype.computeNormals = function () {
    const nrm = this.nrm, pos = this.pos;
    const idx = this.mesh.headIndices;
    const headEnd = this.headCount * 3;
    nrm.fill(0, 0, headEnd);
    for (let t = 0; t < idx.length; t += 3) {
      const a = idx[t] * 3, b = idx[t + 1] * 3, c = idx[t + 2] * 3;
      const ax = pos[a], ay = pos[a + 1], az = pos[a + 2];
      const e1x = pos[b] - ax, e1y = pos[b + 1] - ay, e1z = pos[b + 2] - az;
      const e2x = pos[c] - ax, e2y = pos[c + 1] - ay, e2z = pos[c + 2] - az;
      const nx = e1y * e2z - e1z * e2y;
      const ny = e1z * e2x - e1x * e2z;
      const nz = e1x * e2y - e1y * e2x;
      nrm[a] += nx; nrm[a + 1] += ny; nrm[a + 2] += nz;
      nrm[b] += nx; nrm[b + 1] += ny; nrm[b + 2] += nz;
      nrm[c] += nx; nrm[c + 1] += ny; nrm[c + 2] += nz;
    }
    for (let i = 0; i < headEnd; i += 3) {
      const x = nrm[i], y = nrm[i + 1], z = nrm[i + 2];
      const l = Math.sqrt(x * x + y * y + z * z);
      if (l > 1e-8) {
        const s = 1 / l;
        nrm[i] = x * s; nrm[i + 1] = y * s; nrm[i + 2] = z * s;
      } else {
        nrm[i] = 0; nrm[i + 1] = 1; nrm[i + 2] = 0;
      }
    }
  };

  /* ---- picking --------------------------------------------------------- */

  /* Möller–Trumbore against the deformed head triangles. Returns the hit
     distance along the ray, or -1. Fills `outPoint` when hit. */
  Softbody.prototype.raycast = function (ro, rd, outPoint) {
    const idx = this.mesh.headIndices, pos = this.pos;
    let best = Infinity, bestTri = -1;

    for (let t = 0; t < idx.length; t += 3) {
      const a = idx[t] * 3, b = idx[t + 1] * 3, c = idx[t + 2] * 3;
      const ax = pos[a], ay = pos[a + 1], az = pos[a + 2];
      const e1x = pos[b] - ax, e1y = pos[b + 1] - ay, e1z = pos[b + 2] - az;
      const e2x = pos[c] - ax, e2y = pos[c + 1] - ay, e2z = pos[c + 2] - az;

      const px = rd[1] * e2z - rd[2] * e2y;
      const py = rd[2] * e2x - rd[0] * e2z;
      const pz = rd[0] * e2y - rd[1] * e2x;
      const det = e1x * px + e1y * py + e1z * pz;
      if (det > -1e-8 && det < 1e-8) continue;
      const invDet = 1 / det;

      const tx = ro[0] - ax, ty = ro[1] - ay, tz = ro[2] - az;
      const u = (tx * px + ty * py + tz * pz) * invDet;
      if (u < 0 || u > 1) continue;

      const qx = ty * e1z - tz * e1y;
      const qy = tz * e1x - tx * e1z;
      const qz = tx * e1y - ty * e1x;
      const v = (rd[0] * qx + rd[1] * qy + rd[2] * qz) * invDet;
      if (v < 0 || u + v > 1) continue;

      const dist = (e2x * qx + e2y * qy + e2z * qz) * invDet;
      if (dist > 1e-4 && dist < best) { best = dist; bestTri = t; }
    }

    if (bestTri < 0) return -1;
    outPoint[0] = ro[0] + rd[0] * best;
    outPoint[1] = ro[1] + rd[1] * best;
    outPoint[2] = ro[2] + rd[2] * best;
    this.lastHitVertex = idx[bestTri];
    return best;
  };

  /* ---- grab ------------------------------------------------------------ */

  /* Flood geodesic distance from the seed vertex and build a falloff-weighted
     grab set. Geodesic (not euclidean) distance matters: grabbing the nose
     tip must not drag the lip that happens to sit close in space.

     Returns a slot id to pass back to setGrabTarget and endGrab, or -1 when
     every slot is already in use. */
  Softbody.prototype.beginGrab = function (seedVertex, radius, anchor) {
    let slot = null, slotId = -1;
    for (let s = 0; s < this.grabs.length; s++) {
      if (!this.grabs[s].active) { slot = this.grabs[s]; slotId = s; break; }
    }
    if (!slot) return -1;

    const off = this.adj.offset, nbr = this.adj.idx, elen = this.edgeLen;
    const dist = this._dist, visited = this._visited;
    const stamp = ++this._visitStamp;
    const heap = this._heap;
    heap.clear();

    dist[seedVertex] = 0;
    visited[seedVertex] = stamp;
    heap.push(0, seedVertex);

    let count = 0;
    const idxOut = slot.idx, wOut = slot.w, base = slot.base;
    const pos = this.pos;

    while (heap.size()) {
      const i = heap.pop();
      const d = heap._d;
      if (d > dist[i] + 1e-6) continue;
      if (d > radius) break;

      const t = d / radius;
      const s = 1 - t * t * (3 - 2 * t);   /* smoothstep falloff */
      const w = Math.pow(s, 1.35);
      if (w > 0.002) {
        idxOut[count] = i;
        wOut[count] = w;
        base[count * 3] = pos[i * 3];
        base[count * 3 + 1] = pos[i * 3 + 1];
        base[count * 3 + 2] = pos[i * 3 + 2];
        count++;
      }

      for (let e = off[i]; e < off[i + 1]; e++) {
        const j = nbr[e];
        const nd = d + elen[e];
        if (nd > radius) continue;
        if (visited[j] !== stamp || nd < dist[j]) {
          visited[j] = stamp;
          dist[j] = nd;
          heap.push(nd, j);
        }
      }
    }

    slot.count = count;
    slot.active = count > 0;
    slot.delta[0] = slot.delta[1] = slot.delta[2] = 0;
    M.copy3(slot.anchor, anchor);
    this._syncGrabbing();
    return slot.active ? slotId : -1;
  };

  Softbody.prototype._syncGrabbing = function () {
    this.grabbing = false;
    for (let s = 0; s < this.grabs.length; s++) {
      if (this.grabs[s].active) { this.grabbing = true; return; }
    }
  };

  Softbody.prototype.grabAnchorOf = function (slotId) {
    const s = this.grabs[slotId];
    return s ? s.anchor : null;
  };

  Softbody.prototype.grabDeltaOf = function (slotId) {
    const s = this.grabs[slotId];
    return s ? s.delta : null;
  };

  Softbody.prototype.setGrabTarget = function (slotId, worldLocalPoint) {
    const slot = this.grabs[slotId];
    if (!slot || !slot.active) return;
    slot.delta[0] = worldLocalPoint[0] - slot.anchor[0];
    slot.delta[1] = worldLocalPoint[1] - slot.anchor[1];
    slot.delta[2] = worldLocalPoint[2] - slot.anchor[2];
  };

  /* Releasing hands the accumulated drag velocity back to the mesh, scaled by
     `flick`, which is what makes a fast release snap and wobble. */
  Softbody.prototype.endGrab = function (slotId, flickVel, flick) {
    const slot = this.grabs[slotId];
    if (!slot || !slot.active) return 0;
    const vel = this.vel, idx = slot.idx, w = slot.w;
    for (let g = 0; g < slot.count; g++) {
      const i3 = idx[g] * 3, wi = w[g] * flick;
      vel[i3] += flickVel[0] * wi;
      vel[i3 + 1] += flickVel[1] * wi;
      vel[i3 + 2] += flickVel[2] * wi;
    }
    const amount = M.len3(slot.delta);
    slot.active = false;
    slot.count = 0;
    this._syncGrabbing();
    return amount;
  };

  /* Snap everything home with an inward kick, for the reset button. */
  Softbody.prototype.reset = function (hard) {
    const n = this.headCount * 3;
    if (hard) {
      for (let i = 0; i < n; i++) this.pos[i] = this.rest[i];
      this.vel.fill(0);
      this.disp.fill(0);
      this.stretch.fill(0);
      this.maxDisplacement = 0;
      this.energy = 0;
    } else {
      /* Soft reset kicks everything homeward and lets the springs do the
         rest, so the snap-back still boings instead of teleporting. */
      for (let i = 0; i < n; i++) {
        this.vel[i] += (this.rest[i] - this.pos[i]) * 6.0;
      }
    }
    for (let s = 0; s < this.grabs.length; s++) {
      this.grabs[s].active = false;
      this.grabs[s].count = 0;
    }
    this.grabbing = false;
  };

  /* Nudge the whole surface, used for impacts and celebratory jiggles. */
  Softbody.prototype.impulse = function (center, radius, strength) {
    const pos = this.pos, vel = this.vel;
    const r2 = radius * radius;
    for (let i = 0; i < this.headCount; i++) {
      const i3 = i * 3;
      const dx = pos[i3] - center[0];
      const dy = pos[i3 + 1] - center[1];
      const dz = pos[i3 + 2] - center[2];
      const d2 = dx * dx + dy * dy + dz * dz;
      if (d2 > r2) continue;
      const f = (1 - d2 / r2) * strength / (Math.sqrt(d2) + 0.2);
      vel[i3] += dx * f;
      vel[i3 + 1] += dy * f;
      vel[i3 + 2] += dz * f;
    }
  };

  /* Landing on something. An impact does two things at once: the face that
     struck decelerates into the body, and the ring around it is thrown
     outward. Only the first reads as a dent; both together read as weight. */
  Softbody.prototype.impact = function (dir, strength) {
    const pos = this.pos, vel = this.vel;
    const dx = dir[0], dy = dir[1], dz = dir[2];
    for (let i = 0; i < this.headCount; i++) {
      const i3 = i * 3;
      const px = pos[i3], py = pos[i3 + 1], pz = pos[i3 + 2];
      const l = Math.sqrt(px * px + py * py + pz * pz) || 1;
      const nx = px / l, ny = py / l, nz = pz / l;
      const d = nx * dx + ny * dy + nz * dz;
      if (d <= 0) continue;                    /* the far side is untouched */
      const w = d * d * strength;
      vel[i3] -= dx * w; vel[i3 + 1] -= dy * w; vel[i3 + 2] -= dz * w;
      /* Whatever of the surface direction is perpendicular to the impact is
         where the displaced volume has to go. */
      vel[i3] += (nx - dx * d) * w * 0.75;
      vel[i3 + 1] += (ny - dy * d) * w * 0.75;
      vel[i3 + 2] += (nz - dz * d) * w * 0.75;
    }
  };

  NG.Softbody = Softbody;
})(window.NG = window.NG || {});
