/* NOGGIN — game rules: ring targets, scoring, particles, screen shake.

   Challenge mode spawns rings floating out of reach of the resting head. The
   only way to reach one is to grab the face and pull a piece of it through the
   aperture, so scoring is driven entirely by the soft-body state rather than
   by a separate hit-box the player controls. */
(function (NG) {
  'use strict';

  const M = NG.M;

  const ROUND_SECONDS = 60;
  const COMBO_WINDOW = 2.6;
  const PARTICLE_CAP = 1024;

  const RING_COLORS = [
    [0.20, 0.95, 1.00],
    [0.55, 0.65, 1.00],
    [1.00, 0.45, 0.85],
    [1.00, 0.82, 0.30]
  ];

  function Game() {
    this.mode = 'sandbox';
    this.state = 'idle';          /* idle | playing | over */
    this.score = 0;
    this.best = 0;
    this.combo = 0;
    this.comboTimer = 0;
    this.timeLeft = ROUND_SECONDS;
    this.elapsed = 0;
    this.popped = 0;
    this.longestStretch = 0;
    this.rings = [];
    this.spawnTimer = 0;
    this.trauma = 0;
    this.events = [];
    this.rand = M.rng(0x9e3779b9);
    this._nextTick = 0;

    this.pCount = 0;
    this.px = new Float32Array(PARTICLE_CAP);
    this.py = new Float32Array(PARTICLE_CAP);
    this.pz = new Float32Array(PARTICLE_CAP);
    this.pvx = new Float32Array(PARTICLE_CAP);
    this.pvy = new Float32Array(PARTICLE_CAP);
    this.pvz = new Float32Array(PARTICLE_CAP);
    this.plife = new Float32Array(PARTICLE_CAP);
    this.pmax = new Float32Array(PARTICLE_CAP);
    this.pr = new Float32Array(PARTICLE_CAP);
    this.pg = new Float32Array(PARTICLE_CAP);
    this.pb = new Float32Array(PARTICLE_CAP);
    this.psize = new Float32Array(PARTICLE_CAP);

    this.best = this._loadBest();
  }

  Game.prototype._loadBest = function () {
    try {
      const v = window.localStorage.getItem('noggin.best');
      return v ? parseInt(v, 10) || 0 : 0;
    } catch (e) { return 0; }
  };

  Game.prototype._saveBest = function () {
    try { window.localStorage.setItem('noggin.best', String(this.best)); } catch (e) { /* private mode */ }
  };

  Game.prototype.startChallenge = function (seed) {
    this.mode = 'challenge';
    this.state = 'playing';
    this.score = 0;
    this.combo = 0;
    this.comboTimer = 0;
    this.timeLeft = ROUND_SECONDS;
    this.elapsed = 0;
    this.popped = 0;
    this.longestStretch = 0;
    this.rings.length = 0;
    this.spawnTimer = 0.35;
    this.rand = M.rng(seed || 0x9e3779b9);
    this._nextTick = 10;
    this.events.push({ type: 'start' });
  };

  Game.prototype.enterSandbox = function () {
    this.mode = 'sandbox';
    this.state = 'idle';
    this.rings.length = 0;
    this.combo = 0;
  };

  Game.prototype.difficulty = function () {
    return M.clamp(this.elapsed / ROUND_SECONDS, 0, 1);
  };

  /* ---- rings ------------------------------------------------------------ */

  Game.prototype._spawnRing = function (camDir) {
    const r = this.rand;
    const d = this.difficulty();
    let dir = null;
    for (let attempt = 0; attempt < 24; attempt++) {
      /* uniform point on the sphere */
      const z = r() * 2 - 1;
      const a = r() * Math.PI * 2;
      const s = Math.sqrt(Math.max(0, 1 - z * z));
      const cand = [s * Math.cos(a), z * 0.75 + 0.12, s * Math.sin(a)];
      M.norm3(cand, cand);
      /* Keep targets roughly in front of the player's current viewpoint. */
      if (M.dot3(cand, camDir) > 0.12 || attempt > 18) { dir = cand; break; }
    }
    if (!dir) dir = [0, 0, 1];

    const dist = 1.85 + r() * (0.55 + d * 0.85);
    const radius = 0.50 - r() * (0.10 + d * 0.13);
    const center = M.scale3([0, 0, 0], dir, dist);
    const value = Math.round(30 + (dist - 1.85) * 80 + (0.50 - radius) * 260);
    const life = 8.5 - d * 3.6;

    this.rings.push({
      center: center,
      normal: dir,
      radius: radius,
      life: life,
      maxLife: life,
      value: value,
      color: RING_COLORS[Math.floor(r() * RING_COLORS.length)],
      matrix: M.m4(),
      pulse: 0,
      intensity: 1,
      popped: false,
      warned: false
    });
  };

  Game.prototype._ringMatrix = function (ring, model) {
    /* Columns: two in-plane axes and the ring normal, all scaled by radius,
       then translated to the ring centre and pushed through the head's own
       model matrix so rings bob with the subject. */
    const f = M.frame(ring.normal);
    const R = ring.radius;
    const local = M.m4();
    local[0] = f[0][0] * R; local[1] = f[0][1] * R; local[2] = f[0][2] * R; local[3] = 0;
    local[4] = f[1][0] * R; local[5] = f[1][1] * R; local[6] = f[1][2] * R; local[7] = 0;
    local[8] = f[2][0] * R; local[9] = f[2][1] * R; local[10] = f[2][2] * R; local[11] = 0;
    local[12] = ring.center[0]; local[13] = ring.center[1]; local[14] = ring.center[2]; local[15] = 1;
    M.multiply(ring.matrix, model, local);
  };

  /* Ring space is the head's local space, so no per-vertex transform is
     needed: only the handful of rings get converted each frame. */
  Game.prototype._testRing = function (ring, body) {
    const probes = body.probes, pos = body.pos;
    const c = ring.center, n = ring.normal;
    const aperture = ring.radius * 0.94;
    const ap2 = aperture * aperture;
    const thickness = 0.20;

    for (let p = 0; p < probes.length; p++) {
      const i3 = probes[p] * 3;
      const rx = pos[i3] - c[0];
      const ry = pos[i3 + 1] - c[1];
      const rz = pos[i3 + 2] - c[2];
      const axial = rx * n[0] + ry * n[1] + rz * n[2];
      if (axial > thickness || axial < -thickness) continue;
      const ox = rx - n[0] * axial;
      const oy = ry - n[1] * axial;
      const oz = rz - n[2] * axial;
      if (ox * ox + oy * oy + oz * oz < ap2) return probes[p];
    }
    return -1;
  };

  /* ---- particles --------------------------------------------------------- */

  Game.prototype.burst = function (x, y, z, color, count, speed) {
    const r = this.rand;
    for (let i = 0; i < count; i++) {
      if (this.pCount >= PARTICLE_CAP) return;
      const k = this.pCount++;
      const zz = r() * 2 - 1;
      const a = r() * Math.PI * 2;
      const s = Math.sqrt(Math.max(0, 1 - zz * zz));
      const v = speed * (0.35 + r() * 0.65);
      this.px[k] = x; this.py[k] = y; this.pz[k] = z;
      this.pvx[k] = s * Math.cos(a) * v;
      this.pvy[k] = zz * v + 0.4;
      this.pvz[k] = s * Math.sin(a) * v;
      const life = 0.5 + r() * 0.8;
      this.plife[k] = life; this.pmax[k] = life;
      const tint = 0.65 + r() * 0.35;
      this.pr[k] = color[0] * tint;
      this.pg[k] = color[1] * tint;
      this.pb[k] = color[2] * tint;
      this.psize[k] = 4 + r() * 9;
    }
  };

  Game.prototype._updateParticles = function (dt) {
    let n = this.pCount;
    for (let i = 0; i < n; i++) {
      this.plife[i] -= dt;
      if (this.plife[i] <= 0) {
        const last = --n;
        this.px[i] = this.px[last]; this.py[i] = this.py[last]; this.pz[i] = this.pz[last];
        this.pvx[i] = this.pvx[last]; this.pvy[i] = this.pvy[last]; this.pvz[i] = this.pvz[last];
        this.plife[i] = this.plife[last]; this.pmax[i] = this.pmax[last];
        this.pr[i] = this.pr[last]; this.pg[i] = this.pg[last]; this.pb[i] = this.pb[last];
        this.psize[i] = this.psize[last];
        i--;
        continue;
      }
      const drag = Math.exp(-1.6 * dt);
      this.pvy[i] -= 1.1 * dt;
      this.pvx[i] *= drag; this.pvy[i] *= drag; this.pvz[i] *= drag;
      this.px[i] += this.pvx[i] * dt;
      this.py[i] += this.pvy[i] * dt;
      this.pz[i] += this.pvz[i] * dt;
    }
    this.pCount = n;
  };

  Game.prototype.packParticles = function (target) {
    const n = Math.min(this.pCount, target.length / 8 | 0);
    for (let i = 0; i < n; i++) {
      const o = i * 8;
      target[o] = this.px[i];
      target[o + 1] = this.py[i];
      target[o + 2] = this.pz[i];
      target[o + 3] = this.pr[i];
      target[o + 4] = this.pg[i];
      target[o + 5] = this.pb[i];
      target[o + 6] = Math.min(1, this.plife[i] / this.pmax[i]);
      target[o + 7] = this.psize[i];
    }
    return n;
  };

  /* ---- frame ------------------------------------------------------------- */

  Game.prototype.update = function (dt, body, model, camDir) {
    this.trauma = Math.max(0, this.trauma - dt * 1.5);
    this._updateParticles(dt);

    if (this.comboTimer > 0) {
      this.comboTimer -= dt;
      if (this.comboTimer <= 0) this.combo = 0;
    }

    if (body.maxDisplacement > this.longestStretch) {
      this.longestStretch = body.maxDisplacement;
    }

    if (this.state !== 'playing') {
      /* Keep any leftover rings drifting away rather than popping out. */
      for (let i = this.rings.length - 1; i >= 0; i--) {
        const ring = this.rings[i];
        ring.life -= dt * 2.5;
        ring.intensity = Math.max(0, ring.life / ring.maxLife);
        this._ringMatrix(ring, model);
        if (ring.life <= 0) this.rings.splice(i, 1);
      }
      return;
    }

    this.elapsed += dt;
    this.timeLeft -= dt;

    if (this.timeLeft <= this._nextTick && this._nextTick > 0) {
      this.events.push({ type: 'tick', value: this._nextTick });
      this._nextTick -= 1;
    }

    if (this.timeLeft <= 0) {
      this.timeLeft = 0;
      this.state = 'over';
      if (this.score > this.best) {
        this.best = this.score;
        this._saveBest();
        this.events.push({ type: 'record', value: this.score });
      }
      this.events.push({ type: 'over', value: this.score });
      return;
    }

    const d = this.difficulty();
    const maxRings = 2 + Math.floor(d * 2.2);
    this.spawnTimer -= dt;
    if (this.spawnTimer <= 0 && this.rings.length < maxRings) {
      this._spawnRing(camDir);
      this.spawnTimer = 1.7 - d * 0.95;
    }

    for (let i = this.rings.length - 1; i >= 0; i--) {
      const ring = this.rings[i];
      ring.life -= dt;
      const t = ring.life / ring.maxLife;
      ring.intensity = 0.9 + 0.5 * Math.sin(this.elapsed * 4 + i);
      ring.pulse = 0.2 + 0.2 * Math.sin(this.elapsed * 6 + i * 2);

      if (t < 0.3) {
        /* Flash faster as a ring is about to time out. */
        ring.intensity *= 0.45 + 0.55 * Math.abs(Math.sin(this.elapsed * 14));
        if (!ring.warned) { ring.warned = true; }
      }
      this._ringMatrix(ring, model);

      if (ring.life <= 0) {
        this.rings.splice(i, 1);
        this.combo = 0;
        this.comboTimer = 0;
        this.events.push({ type: 'miss', center: ring.center.slice() });
        continue;
      }

      const hit = this._testRing(ring, body);
      if (hit >= 0) {
        this.combo++;
        this.comboTimer = COMBO_WINDOW;
        const mult = 1 + (this.combo - 1) * 0.5;
        const gained = Math.round(ring.value * mult);
        this.score += gained;
        this.popped++;
        this.trauma = Math.min(1, this.trauma + 0.35);
        this.burst(ring.center[0], ring.center[1], ring.center[2], ring.color, 46, 3.4);
        this.events.push({
          type: 'pop',
          center: ring.center.slice(),
          value: gained,
          combo: this.combo,
          color: ring.color
        });
        this.rings.splice(i, 1);
      }
    }
  };

  Game.prototype.drain = function () {
    const e = this.events;
    this.events = [];
    return e;
  };

  Game.ROUND_SECONDS = ROUND_SECONDS;
  NG.Game = Game;
})(window.NG = window.NG || {});
