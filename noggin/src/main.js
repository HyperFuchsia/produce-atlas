/* Produce Atlas — application shell.

   One job: keep a floating head on stage, let you pull its face around, and
   put whatever specimen you ask for next to it at true scale. Everything is
   driven from the conversation column; there is no other UI. */
(function (NG) {
  'use strict';

  const M = NG.M;

  const PHYSICS_HZ = 240;
  const PHYSICS_DT = 1 / PHYSICS_HZ;
  const MAX_SUBSTEPS = 8;
  const MAX_STEP = 1 / 90;

  /* Silent frame-budget target. Internal resolution scales to hold it; there
     is deliberately no readout, because nobody came here for a frame counter. */
  const TARGET_MS = 1000 / 120;
  const MIN_SCALE = 0.6;

  /* A lit specimen table rather than a neon grid. */
  const LIGHT = {
    dir: M.normalized(0.48, 0.82, 0.55),
    color: [1.15, 1.06, 0.92],
    fillDir: M.normalized(-0.7, 0.15, -0.3),
    fillColor: [0.14, 0.17, 0.20],
    ambSky: [0.11, 0.12, 0.11],
    ambGround: [0.045, 0.042, 0.038],
    rim: [0.52, 0.46, 0.34],
    sss: [0.82, 0.30, 0.22],
    stretchTint: [1.0, 0.88, 0.80],
    stretchGlow: [0.34, 0.16, 0.10]
  };

  const SKY = {
    top: [0.055, 0.065, 0.058],
    bottom: [0.014, 0.017, 0.015],
    glowColor: [0.14, 0.15, 0.12],
    glow: 1.0
  };

  const FLOOR = {
    grid: [0.055, 0.060, 0.052],
    base: [0.026, 0.029, 0.025]
  };

  /* The conversation column takes the left edge on wide screens and the
     bottom on narrow ones, so the stage has to be framed differently for
     each: shift sideways for a side column, downwards for a bottom sheet. */
  const NARROW_AT = 760;

  function $(id) { return document.getElementById(id); }

  function App() {
    this.canvas = $('gl');
    this.renderer = new NG.Renderer(this.canvas);
    this.audio = new NG.Audio();

    this.renderScale = 1;
    this.time = 0;
    this.cpuMs = 0;
    this.simMs = 0;

    this.camera = { yaw: 0.0, pitch: 0.10, dist: 5.2, targetDist: 5.2 };
    this.grabRadius = 0.62;

    this.model = M.m4();
    this.invModel = M.m4();
    this.view = M.m4();
    this.proj = M.m4();
    this.viewProj = M.m4();
    this.invViewProj = M.m4();
    this.lightVP = M.m4();
    this.lightView = M.m4();
    this.lightProj = M.m4();

    this.eye = [0, 0, 0];
    this.narrow = false;
    this.panelShift = -0.62;
    this.stageY = 0.02;
    this.distBoost = 1;
    this.target = [this.panelShift, this.stageY, 0];
    this.rayF = [0, 0, 0];
    this.rayR = [0, 0, 0];
    this.rayU = [0, 0, 0];

    /* Attention: where he is looking, how far he has drifted from home, and
       how much he is currently leaning in at something. */
    this.gaze = [0, 0, 4];
    this.gazeTarget = [0, 0, 4];
    this.gazeTimer = 2;
    this.headPos = [0, 0, 0];
    this.lean = 0;
    this.leanDir = [0, 0, 0];
    this.rand = M.rng((Date.now() & 0x7fffffff) || 11);

    this.pointers = new Map();
    this.grabPointer = -1;
    this.orbitPointer = -1;
    this.pinchDist = 0;
    this.grabPlaneN = [0, 0, 0];
    this.grabPlaneP = [0, 0, 0];
    this.grabVel = [0, 0, 0];

    this.brain = new NG.Brain();
    this.chat = new NG.Chat(this.audio, this.brain, {
      log: $('transcript'), input: $('prompt'), form: $('composer')
    });
    this.props = [];
    const self = this;
    this.chat.onSpawn = function (entry) { self.spawnSpecimen(entry); };
    this.chat.onClear = function () { self.clearSpecimens(); };
    /* When you type, he stops whatever he was looking at and looks at you. */
    this.chat.onSend = function () { self.lookAtViewer(3.0); };

    this.buildMesh(5);
    this.renderer.setShadowSize(1024);
    this.resize();
    this.bindEvents();
    this.buildChips();
  }

  App.prototype.buildMesh = function (subdiv) {
    this.mesh = NG.G.buildCharacter(subdiv);
    this.body = new NG.Softbody(this.mesh);
    this.renderer.setMesh(this.mesh);
  };

  App.prototype.resize = function () {
    const canvas = this.canvas;
    const cssW = Math.max(1, canvas.clientWidth || window.innerWidth);
    const cssH = Math.max(1, canvas.clientHeight || window.innerHeight);
    const scale = Math.min(window.devicePixelRatio || 1, 2);

    const maxDim = this.renderer.maxTexture;
    let w = Math.round(cssW * scale);
    let h = Math.round(cssH * scale);
    if (w > maxDim || h > maxDim) {
      const k = Math.min(maxDim / w, maxDim / h);
      w = Math.floor(w * k); h = Math.floor(h * k);
    }
    this.cssW = cssW;
    this.cssH = cssH;
    const wasNarrow = this.narrow;
    const narrow = cssW < NARROW_AT;
    this.narrow = narrow;
    this._panelW = narrow ? 0 : $('panel').getBoundingClientRect().width;
    this.panelShift = narrow ? 0 : -0.62;
    /* Bottom sheet covers the lower half, so drop the look-at point to lift
       the subject into the strip that is actually visible. */
    this.stageY = narrow ? -1.05 : 0.02;
    this.distBoost = narrow ? 1.5 : 1;
    /* Only refit when the layout actually flips. Resize fires whenever a
       mobile keyboard opens, and refitting there yanked the camera back to
       its default distance mid-sentence. */
    if (narrow !== wasNarrow) this.refitCamera();
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }
    this.applyRenderScale(true);
  };

  App.prototype.applyRenderScale = function (force) {
    const s = M.clamp(this.renderScale, MIN_SCALE, 1);
    const w = Math.max(64, Math.round(this.canvas.width * s / 2) * 2);
    const h = Math.max(64, Math.round(this.canvas.height * s / 2) * 2);
    if (force || w !== this.renderer.renderW || h !== this.renderer.renderH) {
      this.renderer.setRenderSize(w, h, 0);
    }
  };

  /* ---- input --------------------------------------------------------------- */

  App.prototype.bindEvents = function () {
    const self = this;
    const canvas = this.canvas;

    if (window.ResizeObserver) {
      new ResizeObserver(function () { self.resize(); }).observe(canvas);
    }
    window.addEventListener('resize', function () { self.resize(); });

    canvas.addEventListener('contextmenu', function (e) { e.preventDefault(); });
    canvas.addEventListener('pointerdown', function (e) {
      canvas.setPointerCapture(e.pointerId);
      self.onPointerDown(e);
    });
    canvas.addEventListener('pointermove', function (e) { self.onPointerMove(e); });
    canvas.addEventListener('pointerup', function (e) { self.onPointerUp(e); });
    canvas.addEventListener('pointercancel', function (e) { self.onPointerUp(e); });
    canvas.addEventListener('wheel', function (e) {
      e.preventDefault();
      self.userZoomed = true;
      self.camera.targetDist = M.clamp(self.camera.targetDist + e.deltaY * 0.0035, 2.8, 12);
    }, { passive: false });

    $('sound').addEventListener('click', function () {
      self.audio.resume();
      self.audio.setEnabled(!self.audio.enabled);
      $('sound').textContent = self.audio.enabled ? 'Sound on' : 'Sound off';
    });

    canvas.addEventListener('webglcontextlost', function (e) {
      e.preventDefault();
      self.contextLost = true;
      self.fail('The graphics context was released by the browser. Reload to continue.');
    });
  };

  App.prototype.buildChips = function () {
    const self = this;
    const host = $('chips');
    ['an apple', 'a pineapple', 'cacao', 'wheat', 'help'].forEach(function (label) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'chip';
      b.textContent = label;
      b.addEventListener('click', function () {
        self.audio.resume();
        self.chat.send(label === 'help' ? 'help' : "let's talk about " + label);
      });
      host.appendChild(b);
    });
  };

  App.prototype.pointerNDC = function (e) {
    const r = this.canvas.getBoundingClientRect();
    return [
      ((e.clientX - r.left) / r.width) * 2 - 1,
      1 - ((e.clientY - r.top) / r.height) * 2
    ];
  };

  App.prototype.localRay = function (ndc, outOrigin, outDir) {
    const near = [0, 0, 0], far = [0, 0, 0];
    M.transformPoint(near, this.invViewProj, [ndc[0], ndc[1], -1]);
    M.transformPoint(far, this.invViewProj, [ndc[0], ndc[1], 1]);
    M.transformPoint(outOrigin, this.invModel, near);
    const farLocal = M.transformPoint([0, 0, 0], this.invModel, far);
    M.norm3(outDir, M.sub3(outDir, farLocal, outOrigin));
  };

  App.prototype.onPointerDown = function (e) {
    this.audio.resume();
    this.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY, ndc: this.pointerNDC(e) });

    if (this.pointers.size === 2) {
      if (this.grabPointer >= 0) this.releaseGrab();
      const it = this.pointers.values();
      const a = it.next().value, b = it.next().value;
      this.pinchDist = Math.hypot(a.x - b.x, a.y - b.y);
      this.orbitPointer = -1;
      return;
    }
    if (this.pointers.size > 2) return;

    const rotateOnly = e.button === 2 || e.button === 1 || e.altKey;
    if (!rotateOnly && this.tryGrab(this.pointerNDC(e))) {
      this.grabPointer = e.pointerId;
    } else {
      this.orbitPointer = e.pointerId;
    }
  };

  App.prototype.tryGrab = function (ndc) {
    const ro = [0, 0, 0], rd = [0, 0, 0], hit = [0, 0, 0];
    this.localRay(ndc, ro, rd);
    if (this.body.raycast(ro, rd, hit) < 0) return false;
    if (!this.body.beginGrab(this.body.lastHitVertex, this.grabRadius, hit)) return false;

    M.scale3(this.grabPlaneN, rd, -1);
    M.copy3(this.grabPlaneP, hit);
    M.set3(this.grabVel, 0, 0, 0);
    this.audio.setStretch(0, true);
    return true;
  };

  App.prototype.onPointerMove = function (e) {
    const p = this.pointers.get(e.pointerId);
    if (!p) return;
    const prevX = p.x, prevY = p.y;
    p.x = e.clientX; p.y = e.clientY;
    p.ndc = this.pointerNDC(e);

    if (this.pointers.size >= 2) {
      const it = this.pointers.values();
      const a = it.next().value, b = it.next().value;
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      if (this.pinchDist > 0) {
        this.userZoomed = true;
        this.camera.targetDist = M.clamp(this.camera.targetDist * (this.pinchDist / Math.max(d, 1)), 2.8, 12);
      }
      this.pinchDist = d;
      this.camera.yaw -= (e.clientX - prevX) * 0.0035;
      this.camera.pitch = M.clamp(this.camera.pitch + (e.clientY - prevY) * 0.0035, -1.2, 1.2);
      return;
    }

    if (e.pointerId === this.grabPointer) {
      const ro = [0, 0, 0], rd = [0, 0, 0];
      this.localRay(p.ndc, ro, rd);
      const denom = M.dot3(rd, this.grabPlaneN);
      if (Math.abs(denom) < 1e-5) return;
      const t = M.dot3(M.sub3([0, 0, 0], this.grabPlaneP, ro), this.grabPlaneN) / denom;
      if (t <= 0) return;
      this.body.setGrabTarget(M.addScaled3([0, 0, 0], ro, rd, t));
    } else if (e.pointerId === this.orbitPointer) {
      this.camera.yaw -= (e.clientX - prevX) * 0.006;
      this.camera.pitch = M.clamp(this.camera.pitch + (e.clientY - prevY) * 0.006, -1.25, 1.25);
    }
  };

  App.prototype.releaseGrab = function () {
    const amount = this.body.endGrab(this.grabVel, 0.45);
    this.grabPointer = -1;
    this.audio.setStretch(0, false);
    if (amount > 0.05) this.audio.boing(M.clamp(amount / 1.8, 0.08, 1));
  };

  App.prototype.onPointerUp = function (e) {
    this.pointers.delete(e.pointerId);
    if (e.pointerId === this.grabPointer) this.releaseGrab();
    if (e.pointerId === this.orbitPointer) this.orbitPointer = -1;
    if (this.pointers.size < 2) this.pinchDist = 0;
  };

  /* ---- specimens ----------------------------------------------------------- */

  App.prototype.spawnSpecimen = function (entry) {
    const mesh = NG.P.build(entry);
    const handle = this.renderer.createProp(mesh);
    for (let i = 0; i < this.props.length; i++) this.props[i].fading = true;

    const el = document.createElement('div');
    el.className = 'caption';
    const name = document.createElement('span');
    name.className = 'name';
    name.textContent = entry.name;
    const size = document.createElement('span');
    size.className = 'size';
    size.textContent = (entry.lengthCm || entry.sizeCm) + ' cm';
    el.appendChild(name);
    el.appendChild(size);
    $('tags').appendChild(el);

    this.props.push({
      handle: handle, entry: entry, el: el,
      matrix: M.m4(), t: 0, fade: 1, fading: false, spin: 0.6,
      x: 1.35 + handle.radiusUnits,
      y: -0.25,
      z: 0.1
    });
    while (this.props.length > 3) this._removeProp(0);

    /* He notices it: turns to look, leans in, and physically startles. */
    this.lookAtSpecimen(4.5);
    this.lean = 1;
    M.norm3(this.leanDir, [
      this.props[this.props.length - 1].x,
      this.props[this.props.length - 1].y,
      this.props[this.props.length - 1].z + 0.4
    ]);
    this.body.impulse([0, 0.1, 1.1], 1.5, 1.9);

    this.refitCamera();
  };

  /* Pull back far enough for the head and the largest specimen together.
     The moment the viewer zooms by hand, this stops touching the camera —
     having the framing jump on you mid-conversation is worse than a specimen
     that overflows the frame, and they can always pinch back out. */
  App.prototype.refitCamera = function () {
    if (this.userZoomed) return;
    let reach = 0;
    for (let i = 0; i < this.props.length; i++) {
      const h = this.props[i].handle;
      reach = Math.max(reach, h.radiusUnits, (h.topUnits || 0) * 0.8);
    }
    this.camera.targetDist = M.clamp((4.9 + reach * 2.2) * this.distBoost, 4.4, 14);
  };

  App.prototype._removeProp = function (i) {
    const p = this.props[i];
    this.renderer.destroyProp(p.handle);
    if (p.el && p.el.parentNode) p.el.parentNode.removeChild(p.el);
    this.props.splice(i, 1);
  };

  App.prototype.clearSpecimens = function () {
    while (this.props.length) this._removeProp(0);
  };

  App.prototype.updateProps = function (dt) {
    for (let i = this.props.length - 1; i >= 0; i--) {
      const p = this.props[i];
      p.t += dt;
      p.spin += dt * 0.4;
      if (p.fading) {
        p.fade -= dt * 1.6;
        if (p.fade <= 0) { this._removeProp(i); continue; }
        p.x += dt * 1.4;
      }
      const grow = p.t < 0.45 ? M.smoothstep(0, 0.45, p.t) * (1 + 0.12 * (1 - p.t / 0.45)) : 1;
      const scale = Math.min(grow, 1.12) * (p.fading ? p.fade : 1);
      const bob = Math.sin(this.time * 1.2 + i) * 0.045;
      M.compose(p.matrix, p.x, p.y + bob, p.z, p.spin, 0, scale);

      const top = [p.x, p.y + bob + p.handle.topUnits * scale + 0.30, p.z];
      const vp = this.viewProj;
      const w = vp[3] * top[0] + vp[7] * top[1] + vp[11] * top[2] + vp[15];
      if (w <= 0.001) { p.el.style.display = 'none'; continue; }
      const nx = (vp[0] * top[0] + vp[4] * top[1] + vp[8] * top[2] + vp[12]) / w;
      const ny = (vp[1] * top[0] + vp[5] * top[1] + vp[9] * top[2] + vp[13]) / w;
      p.el.style.display = '';
      p.el.style.opacity = String(p.fading ? p.fade : Math.min(1, p.t * 3));
      const leftEdge = (this._panelW || 0) + 70;
      const x = M.clamp((nx * 0.5 + 0.5) * this.cssW, leftEdge, this.cssW - 24);
      const y = M.clamp((0.5 - ny * 0.5) * this.cssH, 34, this.cssH - 24);
      p.el.style.left = x + 'px';
      p.el.style.top = y + 'px';
    }
  };

  /* ---- attention ----------------------------------------------------------- */

  App.prototype.lookAt = function (point, hold) {
    M.copy3(this.gazeTarget, point);
    this.gazeTimer = hold;
  };

  App.prototype.lookAtViewer = function (hold) {
    this.lookAt(this.eye, hold);
  };

  App.prototype.lookAtSpecimen = function (hold) {
    const p = this.props[this.props.length - 1];
    if (!p) return this.lookAtViewer(hold);
    this.lookAt([p.x, p.y + p.handle.topUnits * 0.4, p.z], hold);
  };

  /* Pick something to be interested in. With a specimen on stage he mostly
     studies it and occasionally checks whether you are still there; with an
     empty stage he glances around the room. */
  App.prototype.pickInterest = function () {
    const r = this.rand;
    if (this.props.length && r() < 0.65) {
      this.lookAtSpecimen(2.2 + r() * 2.5);
      return;
    }
    if (r() < 0.45) {
      this.lookAtViewer(1.8 + r() * 2.0);
      return;
    }
    /* Somewhere out in the room, biased to the front so he stays readable. */
    const ang = (r() - 0.5) * 2.4;
    const rise = (r() - 0.35) * 2.2;
    this.lookAt([Math.sin(ang) * 4.5, rise, Math.cos(ang) * 4.5 + 1.0], 1.4 + r() * 2.2);
  };

  App.prototype.updateAttention = function (dt) {
    this.gazeTimer -= dt;
    if (this.gazeTimer <= 0) this.pickInterest();

    /* Ease toward the point of interest rather than snapping to it. */
    const k = Math.min(1, dt * 2.6);
    this.gaze[0] += (this.gazeTarget[0] - this.gaze[0]) * k;
    this.gaze[1] += (this.gazeTarget[1] - this.gaze[1]) * k;
    this.gaze[2] += (this.gazeTarget[2] - this.gaze[2]) * k;

    this.lean = Math.max(0, this.lean - dt * 0.6);
  };

  /* ---- frame --------------------------------------------------------------- */

  App.prototype.updateCamera = function (dt) {
    const c = this.camera;
    c.dist += (c.targetDist - c.dist) * Math.min(1, dt * 9);
    /* Keep the head clear of the column, and slide between head and specimen. */
    const spread = this.props.length ? (this.narrow ? 0.5 : 0.85) : 0;
    const wantX = this.panelShift + spread;
    this.target[0] += (wantX - this.target[0]) * Math.min(1, dt * 3);
    this.target[1] += (this.stageY - this.target[1]) * Math.min(1, dt * 3);

    const cp = Math.cos(c.pitch), sp = Math.sin(c.pitch);
    this.eye[0] = this.target[0] + c.dist * cp * Math.sin(c.yaw);
    this.eye[1] = this.target[1] + c.dist * sp;
    this.eye[2] = this.target[2] + c.dist * cp * Math.cos(c.yaw);

    const aspect = this.canvas.width / Math.max(1, this.canvas.height);
    M.perspective(this.proj, 0.72, aspect, 0.08, 60);
    M.lookAt(this.view, this.eye, this.target, [0, 1, 0]);
    M.multiply(this.viewProj, this.proj, this.view);
    M.invert(this.invViewProj, this.viewProj);

    const fwd = M.norm3([0, 0, 0], M.sub3([0, 0, 0], this.target, this.eye));
    const right = M.norm3([0, 0, 0], M.cross3([0, 0, 0], fwd, [0, 1, 0]));
    const up = M.cross3([0, 0, 0], right, fwd);
    const tanH = Math.tan(0.36);
    M.copy3(this.rayF, fwd);
    M.scale3(this.rayR, right, tanH * aspect);
    M.scale3(this.rayU, up, tanH);
  };

  App.prototype.updateLight = function () {
    const d = LIGHT.dir;
    M.lookAt(this.lightView, [d[0] * 11, d[1] * 11, d[2] * 11], [0, -0.6, 0], [0, 1, 0]);
    M.ortho(this.lightProj, -5.6, 5.6, -5.6, 5.6, 1.0, 22.0);
    M.multiply(this.lightVP, this.lightProj, this.lightView);
  };

  App.prototype.updateModel = function () {
    const t = this.time;

    /* Free drift. Layered incommensurate frequencies never repeat visibly, so
       he reads as floating rather than looping. */
    let px = Math.sin(t * 0.31) * 0.10 + Math.sin(t * 0.17 + 1.3) * 0.06;
    let py = Math.sin(t * 0.47) * 0.06 + Math.sin(t * 0.23 + 2.1) * 0.05;
    let pz = Math.sin(t * 0.29 + 0.7) * 0.05;

    /* Talking adds a small nod on top so he is not a static speaker. */
    if (this.chat.busy()) py += Math.sin(t * 7.3) * 0.012;

    /* Leaning in at something he has just conjured. */
    if (this.lean > 0.001) {
      const e = this.lean * this.lean * 0.42;
      px += this.leanDir[0] * e;
      py += this.leanDir[1] * e;
      pz += this.leanDir[2] * e;
    }

    M.set3(this.headPos, px, py, pz);

    /* Face the thing he is looking at. His face points down local +Z, and
       M.compose builds Ry * Rx, so local +Z lands on (sy*cx, -sx, cy*cx). */
    const dx = this.gaze[0] - px, dy = this.gaze[1] - py, dz = this.gaze[2] - pz;
    const len = Math.hypot(dx, dy, dz) || 1;
    /* Turn only part of the way. A full turn puts him in profile and hides the
       face doing the looking, which loses the whole point; a partial turn
       reads as glancing over while his eyes stay visible. */
    const ry = M.clamp(Math.atan2(dx / len, dz / len), -1.2, 1.2) * 0.6;
    const rx = M.clamp(Math.asin(M.clamp(-dy / len, -1, 1)), -0.6, 0.6) * 0.7;

    M.compose(this.model, px, py, pz, ry, rx, 1);
    M.invert(this.invModel, this.model);
  };

  App.prototype.stepPhysics = function (dt) {
    const t0 = performance.now();
    this.accum = (this.accum || 0) + dt;
    const steps = Math.min(MAX_SUBSTEPS, Math.max(1, Math.ceil(this.accum / PHYSICS_DT)));
    const h = Math.min(this.accum / steps, MAX_STEP);
    for (let i = 0; i < steps; i++) this.body.step(h);
    this.accum = Math.max(0, this.accum - h * steps);

    this.body.updateParts();
    this.body.computeNormals();
    this.simMs = this.simMs * 0.9 + (performance.now() - t0) * 0.1;
  };

  App.prototype.trackGrabVelocity = function (dt) {
    if (this.grabPointer < 0 || dt <= 0) { M.set3(this.grabVel, 0, 0, 0); return; }
    const b = this.body;
    const target = [
      b.grabAnchor[0] + b.grabDelta[0],
      b.grabAnchor[1] + b.grabDelta[1],
      b.grabAnchor[2] + b.grabDelta[2]
    ];
    if (this._lastTarget) {
      const inst = M.scale3([0, 0, 0], M.sub3([0, 0, 0], target, this._lastTarget), 1 / dt);
      const len = M.len3(inst);
      if (len > 30) M.scale3(inst, inst, 30 / len);
      M.mix3(this.grabVel, this.grabVel, inst, 0.4);
    } else {
      this._lastTarget = [0, 0, 0];
    }
    M.copy3(this._lastTarget, target);
  };

  /* Hold the frame budget by trading internal resolution, quietly. */
  App.prototype.adaptResolution = function () {
    const measured = this.renderer.gpuTimeMs > 0.01
      ? this.renderer.gpuTimeMs
      : Math.max(0, this.cpuMs - this.simMs);
    if (measured <= 0.01) return;

    this._adaptCounter = (this._adaptCounter || 0) + 1;
    if (this._adaptCounter < 20) return;

    let next = this.renderScale;
    if (measured > TARGET_MS * 0.92) next -= 0.05;
    else if (measured < TARGET_MS * 0.62) next += 0.05;
    next = M.clamp(next, MIN_SCALE, 1);

    if (Math.abs(next - this.renderScale) > 0.001) {
      this.renderScale = next;
      this.applyRenderScale(false);
      this._adaptCounter = 0;
    } else {
      this._adaptCounter = 10;
    }
  };

  App.prototype.frame = function (now) {
    const self = this;
    requestAnimationFrame(function (t) { self.frame(t); });
    if (this.contextLost) return;

    const prev = this.lastTime || now;
    let dt = (now - prev) / 1000;
    this.lastTime = now;
    if (dt > 0.1) dt = 0.1;
    if (dt <= 0) dt = 1 / 240;
    const frameStart = performance.now();
    this.time += dt;

    this.updateCamera(dt);
    this.updateAttention(dt);
    this.updateModel();
    this.updateLight();
    this.trackGrabVelocity(dt);
    this.stepPhysics(dt);

    if (this.grabPointer >= 0) {
      this.audio.setStretch(this.body.maxDisplacement / this.body.maxStretch, true);
    }

    this.chat.update(dt);
    this.updateProps(dt);
    this.renderer.updateDynamic(this.body.pos, this.body.nrm, this.body.stretch);

    this.renderer.render({
      time: this.time,
      model: this.model,
      viewProj: this.viewProj,
      lightVP: this.lightVP,
      eye: this.eye,
      rayF: this.rayF, rayR: this.rayR, rayU: this.rayU,
      light: LIGHT,
      sky: SKY,
      floor: FLOOR,
      showFloor: true,
      props: this.props,
      highlight: Math.min(1, this.body.maxDisplacement * 0.4),
      bloom: 0.34,
      bloomThreshold: 1.25,
      bloomPasses: 2,
      exposure: 1.02,
      vignette: 0.62,
      aberration: 0
    });

    this.cpuMs = this.cpuMs * 0.9 + (performance.now() - frameStart) * 0.1;
    this.adaptResolution();
  };

  App.prototype.fail = function (message) {
    const boot = $('boot');
    boot.classList.remove('gone');
    boot.innerHTML = '<div id="fail">' + message + '</div>';
  };

  App.prototype.start = function () {
    const self = this;
    $('boot').classList.add('gone');
    setTimeout(function () { $('boot').style.display = 'none'; }, 600);
    this.chat.say(this.brain.greeting());
    requestAnimationFrame(function (t) { self.frame(t); });
  };

  function boot() {
    try {
      const app = new App();
      window.ATLAS = app;
      app.start();
    } catch (err) {
      console.error(err);
      const b = $('boot');
      b.innerHTML = '<div id="fail">' + String(err.message || err) + '</div>';
    }
  }

  function scheduleBoot() {
    requestAnimationFrame(function () { requestAnimationFrame(boot); });
  }
  if (document.readyState === 'complete') scheduleBoot();
  else window.addEventListener('load', scheduleBoot);
})(window.NG = window.NG || {});
