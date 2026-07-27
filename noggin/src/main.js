/* NOGGIN — application shell: camera, input, frame pacing, adaptive
   resolution, HUD. */
(function (NG) {
  'use strict';

  const M = NG.M;

  const PHYSICS_HZ = 240;
  const PHYSICS_DT = 1 / PHYSICS_HZ;
  const MAX_SUBSTEPS = 8;
  /* Well inside the explicit integrator's stability limit (~1/22 s for the
     stiffness and coupling below). */
  const MAX_STEP = 1 / 90;

  const QUALITY = [
    { name: 'PERFORMANCE', subdiv: 4, shadow: 1024, samples: 0, bloomPasses: 1, minScale: 0.45 },
    { name: 'BALANCED', subdiv: 5, shadow: 1024, samples: 0, bloomPasses: 2, minScale: 0.60 },
    { name: 'ULTRA', subdiv: 5, shadow: 2048, samples: 4, bloomPasses: 2, minScale: 0.75 }
  ];

  const FPS_TARGETS = [60, 120, 144, 165, 240];

  const LIGHT = {
    dir: M.normalized(0.55, 0.80, 0.48),
    color: [1.10, 1.00, 0.88],
    fillDir: M.normalized(-0.65, 0.10, -0.35),
    fillColor: [0.16, 0.24, 0.42],
    ambSky: [0.10, 0.13, 0.20],
    ambGround: [0.045, 0.04, 0.055],
    rim: [0.30, 0.62, 0.95],
    sss: [0.85, 0.28, 0.20],
    stretchTint: [1.0, 0.86, 0.80],
    stretchGlow: [0.55, 0.16, 0.22]
  };

  const SKY = {
    top: [0.030, 0.040, 0.075],
    bottom: [0.006, 0.008, 0.016],
    glowColor: [0.10, 0.20, 0.38],
    glow: 1.0
  };

  const FLOOR = {
    grid: [0.10, 0.42, 0.62],
    base: [0.010, 0.016, 0.028]
  };

  function $(id) { return document.getElementById(id); }

  function App() {
    this.canvas = $('gl');
    this.renderer = new NG.Renderer(this.canvas);
    this.audio = new NG.Audio();
    this.game = new NG.Game();
    this.chatter = new NG.Chatter(this.audio, $('bubble'), $('bubble-text'));

    this.quality = 1;
    this.fpsTargetIndex = 1;
    this.displayMode = 'auto';       /* auto | native | 4k */
    this.adaptive = true;
    this.renderScale = 1;
    this.showFloor = true;
    this.hudVisible = true;
    this.paused = false;

    this.camera = { yaw: 0.0, pitch: 0.12, dist: 5.4, targetDist: 5.4 };
    this.grabRadius = 0.62;

    this.time = 0;
    this.frameTimes = new Float32Array(120);
    this.frameIndex = 0;
    this.fps = 0;
    this.cpuMs = 0;
    this.simMs = 0;
    this.lastInteraction = 0;

    /* Matrices reused every frame. */
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
    this.target = [0, 0.02, 0];
    this.rayF = [0, 0, 0];
    this.rayR = [0, 0, 0];
    this.rayU = [0, 0, 0];

    /* Grab state. */
    this.pointers = new Map();
    this.grabPointer = -1;
    this.orbitPointer = -1;
    this.pinchDist = 0;
    this.grabPlaneN = [0, 0, 0];
    this.grabPlaneP = [0, 0, 0];
    this.grabPrev = [0, 0, 0];
    this.grabVel = [0, 0, 0];

    this.popupPool = [];
    this.popups = [];

    this.buildMesh(QUALITY[this.quality].subdiv);
    this.renderer.setShadowSize(QUALITY[this.quality].shadow);
    this.resize();
    this.bindEvents();
    this.bindUI();
    this.updateHudStatic();
  }

  /* ---- setup -------------------------------------------------------------- */

  App.prototype.buildMesh = function (subdiv) {
    const t0 = performance.now();
    this.mesh = NG.G.buildCharacter(subdiv);
    this.body = new NG.Softbody(this.mesh);
    this.renderer.setMesh(this.mesh);
    this.buildMs = performance.now() - t0;
  };

  App.prototype.resize = function () {
    const canvas = this.canvas;
    const cssW = Math.max(1, canvas.clientWidth || window.innerWidth);
    const cssH = Math.max(1, canvas.clientHeight || window.innerHeight);
    const dpr = window.devicePixelRatio || 1;

    let scale;
    if (this.displayMode === '4k') {
      scale = Math.min(3840 / cssW, 2160 / cssH);
    } else if (this.displayMode === 'native') {
      scale = dpr;
    } else {
      scale = Math.min(dpr, 2);
    }

    const maxDim = this.renderer.maxTexture;
    let w = Math.round(cssW * scale);
    let h = Math.round(cssH * scale);
    if (w > maxDim || h > maxDim) {
      const k = Math.min(maxDim / w, maxDim / h);
      w = Math.floor(w * k); h = Math.floor(h * k);
    }

    this.cssW = cssW;
    this.cssH = cssH;
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }
    this.applyRenderScale(true);
  };

  App.prototype.applyRenderScale = function (force) {
    const q = QUALITY[this.quality];
    const s = M.clamp(this.renderScale, q.minScale, 1);
    const w = Math.max(64, Math.round(this.canvas.width * s / 2) * 2);
    const h = Math.max(64, Math.round(this.canvas.height * s / 2) * 2);
    if (force || w !== this.renderer.renderW || h !== this.renderer.renderH) {
      this.renderer.setRenderSize(w, h, q.samples);
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
      self.lastInteraction = self.time;
      if (e.shiftKey) {
        self.grabRadius = M.clamp(self.grabRadius - e.deltaY * 0.0006, 0.18, 1.5);
        self.flashHint('GRAB RADIUS ' + self.grabRadius.toFixed(2));
      } else {
        self.camera.targetDist = M.clamp(self.camera.targetDist + e.deltaY * 0.0035, 2.6, 12);
      }
    }, { passive: false });

    window.addEventListener('keydown', function (e) { self.onKey(e); });

    canvas.addEventListener('webglcontextlost', function (e) {
      e.preventDefault();
      self.contextLost = true;
      $('overlay').classList.remove('hidden');
      $('overlay-title').textContent = 'GPU CONTEXT LOST';
      $('overlay-body').textContent = 'The graphics context was released by the browser. Reload to continue.';
      $('overlay-btn').textContent = 'RELOAD';
      $('overlay-btn').onclick = function () { window.location.reload(); };
    });
  };

  App.prototype.pointerNDC = function (e) {
    const r = this.canvas.getBoundingClientRect();
    return [
      ((e.clientX - r.left) / r.width) * 2 - 1,
      1 - ((e.clientY - r.top) / r.height) * 2
    ];
  };

  /* Build a ray in the head's local space from a normalised device point. */
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
    this.lastInteraction = this.time;
    this.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY, ndc: this.pointerNDC(e) });

    if (this.pointers.size === 2) {
      /* Second finger: drop any grab and switch to pinch/orbit. */
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
    const t = this.body.raycast(ro, rd, hit);
    if (t < 0) return false;

    if (!this.body.beginGrab(this.body.lastHitVertex, this.grabRadius, hit)) return false;

    /* Drag happens on the plane through the hit point facing the camera, so
       the surface tracks the cursor exactly at grab depth. */
    M.scale3(this.grabPlaneN, rd, -1);
    M.copy3(this.grabPlaneP, hit);
    M.copy3(this.grabPrev, hit);
    M.set3(this.grabVel, 0, 0, 0);
    this.audio.setStretch(0, true);
    this.chatter.interrupt();
    return true;
  };

  App.prototype.onPointerMove = function (e) {
    const p = this.pointers.get(e.pointerId);
    if (!p) return;
    const prevX = p.x, prevY = p.y;
    p.x = e.clientX; p.y = e.clientY;
    p.ndc = this.pointerNDC(e);
    this.lastInteraction = this.time;

    if (this.pointers.size >= 2) {
      const it = this.pointers.values();
      const a = it.next().value, b = it.next().value;
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      if (this.pinchDist > 0) {
        this.camera.targetDist = M.clamp(this.camera.targetDist * (this.pinchDist / Math.max(d, 1)), 2.6, 12);
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
      const point = M.addScaled3([0, 0, 0], ro, rd, t);
      this.body.setGrabTarget(point);
      M.copy3(this.grabPrev, point);
    } else if (e.pointerId === this.orbitPointer) {
      this.camera.yaw -= (e.clientX - prevX) * 0.006;
      this.camera.pitch = M.clamp(this.camera.pitch + (e.clientY - prevY) * 0.006, -1.25, 1.25);
    }
  };

  App.prototype.releaseGrab = function () {
    const amount = this.body.endGrab(this.grabVel, 0.45);
    this.grabPointer = -1;
    this.audio.setStretch(0, false);
    this.chatter.resume();
    if (amount > 0.05) {
      this.audio.boing(M.clamp(amount / 1.8, 0.08, 1));
    }
  };

  App.prototype.onPointerUp = function (e) {
    this.pointers.delete(e.pointerId);
    if (e.pointerId === this.grabPointer) this.releaseGrab();
    if (e.pointerId === this.orbitPointer) this.orbitPointer = -1;
    if (this.pointers.size < 2) this.pinchDist = 0;
  };

  App.prototype.onKey = function (e) {
    if (e.target && /INPUT|TEXTAREA/.test(e.target.tagName)) return;
    const k = e.key.toLowerCase();
    this.lastInteraction = this.time;
    switch (k) {
      case ' ':
      case 'r':
        e.preventDefault();
        this.body.reset(false);
        this.audio.boing(0.7);
        break;
      case 'f': this.toggleFullscreen(); break;
      case 'h': this.setHud(!this.hudVisible); break;
      case 'k': this.cycleDisplayMode(); break;
      case 'g': this.showFloor = !this.showFloor; break;
      case 'p': this.paused = !this.paused; break;
      case 'm': this.toggleSound(); break;
      case 't': this.toggleTalk(); break;
      case '1': this.setQuality(0); break;
      case '2': this.setQuality(1); break;
      case '3': this.setQuality(2); break;
      case '[': this.grabRadius = M.clamp(this.grabRadius - 0.06, 0.18, 1.5); this.flashHint('GRAB RADIUS ' + this.grabRadius.toFixed(2)); break;
      case ']': this.grabRadius = M.clamp(this.grabRadius + 0.06, 0.18, 1.5); this.flashHint('GRAB RADIUS ' + this.grabRadius.toFixed(2)); break;
      case 'enter': this.startChallenge(); break;
      case 'escape': this.enterSandbox(); break;
      default: break;
    }
  };

  /* ---- UI ------------------------------------------------------------------ */

  App.prototype.bindUI = function () {
    const self = this;
    const on = function (id, fn) {
      const el = $(id);
      if (el) el.addEventListener('click', function (e) { e.preventDefault(); self.audio.resume(); self.audio.click(); fn(); });
    };
    on('btn-reset', function () { self.body.reset(false); self.audio.boing(0.7); });
    on('btn-fullscreen', function () { self.toggleFullscreen(); });
    on('btn-4k', function () { self.cycleDisplayMode(); });
    on('btn-quality', function () { self.setQuality((self.quality + 1) % QUALITY.length); });
    on('btn-fps', function () {
      self.fpsTargetIndex = (self.fpsTargetIndex + 1) % FPS_TARGETS.length;
      self.updateHudStatic();
    });
    on('btn-adaptive', function () { self.adaptive = !self.adaptive; self.updateHudStatic(); });
    on('btn-sound', function () { self.toggleSound(); });
    on('btn-talk', function () { self.toggleTalk(); });
    on('btn-hud', function () { self.setHud(false); });
    on('mode-sandbox', function () { self.enterSandbox(); });
    on('mode-challenge', function () { self.startChallenge(); });
    on('overlay-btn', function () { self.startChallenge(); });
    on('hud-show', function () { self.setHud(true); });
  };

  App.prototype.setHud = function (on) {
    this.hudVisible = on;
    $('hud').classList.toggle('hidden', !on);
    $('hud-show').classList.toggle('hidden', on);
  };

  App.prototype.toggleSound = function () {
    this.audio.resume();
    this.audio.setEnabled(!this.audio.enabled);
    $('btn-sound').textContent = this.audio.enabled ? 'SOUND ON' : 'SOUND OFF';
  };

  App.prototype.toggleTalk = function () {
    this.chatter.setEnabled(!this.chatter.enabled);
    $('btn-talk').textContent = this.chatter.enabled ? 'TALK: ON' : 'TALK: OFF';
    this.flashHint(this.chatter.enabled ? 'HE IS BACK' : 'PEACE AND QUIET');
  };

  App.prototype.toggleFullscreen = function () {
    /* Embedded in an iframe without an allow-fullscreen grant, the request
       rejects; swallow it and tell the player rather than throwing. */
    const self = this;
    try {
      if (!document.fullscreenElement) {
        const el = document.documentElement;
        const req = el.requestFullscreen || el.webkitRequestFullscreen;
        if (!req) { this.flashHint('FULLSCREEN UNAVAILABLE'); return; }
        const r = req.call(el);
        if (r && r.catch) r.catch(function () { self.flashHint('FULLSCREEN BLOCKED HERE'); });
      } else {
        const r = document.exitFullscreen();
        if (r && r.catch) r.catch(function () { /* already exited */ });
      }
    } catch (e) {
      this.flashHint('FULLSCREEN BLOCKED HERE');
    }
  };

  App.prototype.cycleDisplayMode = function () {
    this.displayMode = this.displayMode === 'auto' ? '4k' : (this.displayMode === '4k' ? 'native' : 'auto');
    this.resize();
    this.updateHudStatic();
    this.flashHint('OUTPUT: ' + this.displayMode.toUpperCase());
  };

  App.prototype.setQuality = function (q) {
    if (q === this.quality) return;
    const prevSubdiv = QUALITY[this.quality].subdiv;
    this.quality = q;
    const preset = QUALITY[q];
    if (preset.subdiv !== prevSubdiv) this.buildMesh(preset.subdiv);
    this.renderer.setShadowSize(preset.shadow);
    this.renderScale = 1;
    this.applyRenderScale(true);
    this.updateHudStatic();
    this.flashHint('QUALITY: ' + preset.name);
  };

  App.prototype.startChallenge = function () {
    this.audio.resume();
    this.game.startChallenge((Date.now() & 0x7fffffff) || 1);
    this.body.reset(true);
    $('overlay').classList.add('hidden');
    $('scorebar').classList.remove('hidden');
    $('mode-challenge').classList.add('active');
    $('mode-sandbox').classList.remove('active');
    this.flashHint('PULL THE FACE THROUGH THE RINGS');
  };

  App.prototype.enterSandbox = function () {
    this.game.enterSandbox();
    $('overlay').classList.add('hidden');
    $('scorebar').classList.add('hidden');
    $('mode-sandbox').classList.add('active');
    $('mode-challenge').classList.remove('active');
  };

  App.prototype.flashHint = function (text) {
    const el = $('hint');
    el.textContent = text;
    el.classList.remove('show');
    /* Force a reflow so the animation restarts on repeated hints. */
    void el.offsetWidth;
    el.classList.add('show');
  };

  App.prototype.updateHudStatic = function () {
    const r = this.renderer;
    $('gpu-name').textContent = (r.gpuName || 'unknown GPU').slice(0, 42);
    $('stat-quality').textContent = QUALITY[this.quality].name;
    $('stat-output').textContent = this.displayMode.toUpperCase();
    $('stat-target').textContent = FPS_TARGETS[this.fpsTargetIndex] + ' FPS';
    $('stat-adaptive').textContent = this.adaptive ? 'ADAPTIVE' : 'LOCKED';
    $('btn-fps').textContent = 'TARGET ' + FPS_TARGETS[this.fpsTargetIndex];
    $('btn-adaptive').textContent = this.adaptive ? 'RES: AUTO' : 'RES: LOCK';
    $('btn-quality').textContent = 'Q: ' + QUALITY[this.quality].name;
    $('btn-4k').textContent = 'OUT: ' + this.displayMode.toUpperCase();
    $('stat-verts').textContent = this.mesh.total.toLocaleString();
    $('stat-tris').textContent = (this.mesh.indices.length / 3).toLocaleString();
    $('stat-msaa').textContent = r.samples > 0 ? r.samples + 'x MSAA' : 'no MSAA';
    $('stat-hdr').textContent = r.hdr ? 'RGBA16F' : 'RGBA8';
  };

  /* ---- score popups --------------------------------------------------------- */

  App.prototype.spawnPopup = function (worldPos, text, color) {
    const x = worldPos[0], y = worldPos[1], z = worldPos[2];
    const vp = this.viewProj;
    const cw = vp[3] * x + vp[7] * y + vp[11] * z + vp[15];
    if (cw <= 0.001) return;
    const cx = (vp[0] * x + vp[4] * y + vp[8] * z + vp[12]) / cw;
    const cy = (vp[1] * x + vp[5] * y + vp[9] * z + vp[13]) / cw;

    let el = this.popupPool.pop();
    if (!el) {
      el = document.createElement('div');
      el.className = 'popup';
      $('popups').appendChild(el);
    }
    el.textContent = text;
    el.style.color = color;
    el.style.left = ((cx * 0.5 + 0.5) * this.cssW) + 'px';
    el.style.top = ((0.5 - cy * 0.5) * this.cssH) + 'px';
    el.classList.remove('run');
    void el.offsetWidth;
    el.classList.add('run');
    this.popups.push({ el: el, t: 0 });
  };

  /* He talks when left alone. Being grabbed shuts him up, and so does the
     timed mode — the screen is busy enough there without a monologue. */
  App.prototype.updateChatter = function (dt) {
    const playing = this.game.state === 'playing';
    if (playing) {
      this.chatter.silence();
      return;
    }
    this.chatter.update(dt, this.grabPointer >= 0);

    if (!this.chatter._visible) return;

    /* Anchor the bubble up and to his right, in his own local space, so it
       rides along with the bob and stays put when the camera orbits. */
    const world = M.transformPoint([0, 0, 0], this.model, [1.05, 1.05, 0.25]);
    const vp = this.viewProj;
    const w = vp[3] * world[0] + vp[7] * world[1] + vp[11] * world[2] + vp[15];
    if (w <= 0.001) { this.chatter._show(false); return; }
    const nx = (vp[0] * world[0] + vp[4] * world[1] + vp[8] * world[2] + vp[12]) / w;
    const ny = (vp[1] * world[0] + vp[5] * world[1] + vp[9] * world[2] + vp[13]) / w;

    const bubble = this.chatter.bubble;
    const halfW = bubble.offsetWidth * 0.5 + 12;
    const h = bubble.offsetHeight + 12;
    const x = M.clamp((nx * 0.5 + 0.5) * this.cssW, halfW, Math.max(halfW, this.cssW - halfW));
    const y = M.clamp((0.5 - ny * 0.5) * this.cssH, h, Math.max(h, this.cssH - 12));
    bubble.style.left = x + 'px';
    bubble.style.top = y + 'px';
  };

  App.prototype.updatePopups = function (dt) {
    for (let i = this.popups.length - 1; i >= 0; i--) {
      const p = this.popups[i];
      p.t += dt;
      if (p.t > 1.0) {
        p.el.classList.remove('run');
        this.popupPool.push(p.el);
        this.popups.splice(i, 1);
      }
    }
  };

  /* ---- frame ---------------------------------------------------------------- */

  App.prototype.updateCamera = function (dt) {
    const c = this.camera;
    c.dist += (c.targetDist - c.dist) * Math.min(1, dt * 9);

    const g = this.game;
    const trauma = g.trauma * g.trauma;
    const t = this.time;
    const shakeX = trauma * 0.14 * Math.sin(t * 47.3);
    const shakeY = trauma * 0.14 * Math.cos(t * 39.7);

    const cp = Math.cos(c.pitch), sp = Math.sin(c.pitch);
    this.eye[0] = this.target[0] + c.dist * cp * Math.sin(c.yaw) + shakeX;
    this.eye[1] = this.target[1] + c.dist * sp + shakeY;
    this.eye[2] = this.target[2] + c.dist * cp * Math.cos(c.yaw);

    const aspect = this.canvas.width / Math.max(1, this.canvas.height);
    M.perspective(this.proj, 0.72, aspect, 0.08, 60);
    M.lookAt(this.view, this.eye, this.target, [0, 1, 0]);
    M.multiply(this.viewProj, this.proj, this.view);
    M.invert(this.invViewProj, this.viewProj);

    /* Ray basis for the background shader. */
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
    const eye = [d[0] * 11, d[1] * 11, d[2] * 11];
    M.lookAt(this.lightView, eye, [0, -0.6, 0], [0, 1, 0]);
    M.ortho(this.lightProj, -5.6, 5.6, -5.6, 5.6, 1.0, 22.0);
    M.multiply(this.lightVP, this.lightProj, this.lightView);
  };

  App.prototype.updateModel = function () {
    const t = this.time;
    const bob = Math.sin(t * 1.15) * 0.055;
    const yaw = Math.sin(t * 0.37) * 0.10;
    const pitch = Math.cos(t * 0.29) * 0.045;
    M.compose(this.model, 0, bob, 0, yaw, pitch, 1);
    M.invert(this.invModel, this.model);
  };

  /* Fixed-rate solver with an adaptive step. At 120 Hz this lands exactly on
     two 240 Hz substeps; on a machine that cannot hold the target it widens
     the step rather than dropping simulated time, so the rubber keeps
     behaving in real time instead of going slow-motion. */
  App.prototype.stepPhysics = function (dt) {
    const t0 = performance.now();
    this.accum = (this.accum || 0) + dt;
    const steps = Math.min(MAX_SUBSTEPS, Math.max(1, Math.ceil(this.accum / PHYSICS_DT)));
    const h = Math.min(this.accum / steps, MAX_STEP);
    for (let i = 0; i < steps; i++) this.body.step(h);
    this.accum = Math.max(0, this.accum - h * steps);
    this.substeps = steps;
    this.substepHz = 1 / h;

    this.body.updateParts();
    this.body.computeNormals();
    this.simMs = this.simMs * 0.9 + (performance.now() - t0) * 0.1;
  };

  App.prototype.trackGrabVelocity = function (dt) {
    if (this.grabPointer < 0 || dt <= 0) {
      M.set3(this.grabVel, 0, 0, 0);
      return;
    }
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

  App.prototype.adaptResolution = function () {
    if (!this.adaptive) return;
    const targetMs = 1000 / FPS_TARGETS[this.fpsTargetIndex];
    const measured = this.renderer.gpuTimeMs > 0.01
      ? this.renderer.gpuTimeMs
      : Math.max(0, this.cpuMs - this.simMs);
    if (measured <= 0.01) return;

    this._adaptCounter = (this._adaptCounter || 0) + 1;
    if (this._adaptCounter < 20) return;

    let next = this.renderScale;
    if (measured > targetMs * 0.92) next -= 0.05;
    else if (measured < targetMs * 0.62) next += 0.05;

    next = M.clamp(next, QUALITY[this.quality].minScale, 1);
    if (Math.abs(next - this.renderScale) > 0.001) {
      this.renderScale = next;
      this.applyRenderScale(false);
      this._adaptCounter = 0;
    } else {
      this._adaptCounter = 10;
    }
  };

  App.prototype.handleEvents = function () {
    const events = this.game.drain();
    for (let i = 0; i < events.length; i++) {
      const ev = events[i];
      if (ev.type === 'pop') {
        this.audio.pop(ev.combo - 1);
        const world = M.transformPoint([0, 0, 0], this.model, ev.center);
        const c = ev.color;
        const css = 'rgb(' + Math.round(c[0] * 255) + ',' + Math.round(c[1] * 255) + ',' + Math.round(c[2] * 255) + ')';
        this.spawnPopup(world, '+' + ev.value + (ev.combo > 1 ? '  x' + ev.combo : ''), css);
        if (ev.combo > 1) this.flashHint('COMBO x' + ev.combo);
      } else if (ev.type === 'miss') {
        this.audio.tick(false);
      } else if (ev.type === 'tick') {
        this.audio.tick(ev.value <= 3);
      } else if (ev.type === 'over') {
        this.showGameOver(ev.value);
      } else if (ev.type === 'record') {
        this.audio.fanfare(true);
      }
    }
  };

  App.prototype.showGameOver = function (score) {
    const g = this.game;
    $('overlay').classList.remove('hidden');
    $('overlay-title').textContent = 'TIME';
    $('overlay-body').innerHTML =
      '<div class="big">' + score.toLocaleString() + '</div>' +
      '<div class="sub">' + g.popped + ' rings &middot; longest pull ' +
      g.longestStretch.toFixed(2) + ' units &middot; best ' + g.best.toLocaleString() + '</div>';
    $('overlay-btn').textContent = 'RUN IT AGAIN';
    if (score < g.best) this.audio.fanfare(false);
  };

  App.prototype.updateHud = function () {
    const g = this.game;
    const r = this.renderer;
    $('stat-fps').textContent = this.fps.toFixed(0);
    $('stat-frame').textContent = this.cpuMs.toFixed(2) + ' ms';
    $('stat-gpu').textContent = r.gpuTimeMs > 0.01 ? r.gpuTimeMs.toFixed(2) + ' ms' : 'n/a';
    $('stat-sim').textContent = this.simMs.toFixed(2) + ' ms';
    $('stat-backing').textContent = this.canvas.width + ' x ' + this.canvas.height;
    $('stat-render').textContent = r.renderW + ' x ' + r.renderH;
    $('stat-scale').textContent = (this.renderScale * 100).toFixed(0) + '%';
    $('stat-mpx').textContent = (r.renderW * r.renderH / 1e6).toFixed(2) + ' Mpx';
    const headroom = r.gpuTimeMs > 0.01 ? (1000 / r.gpuTimeMs) : 0;
    $('stat-headroom').textContent = headroom > 0 ? headroom.toFixed(0) + ' fps' : 'n/a';
    $('stat-stretch').textContent = this.body.maxDisplacement.toFixed(2);
    $('stat-substeps').textContent = (this.substeps || 0) + ' x ' + Math.round(this.substepHz || PHYSICS_HZ) + 'Hz';

    const is4k = this.canvas.width * this.canvas.height >= 3840 * 2160 * 0.98;
    $('badge-4k').classList.toggle('on', is4k);
    $('badge-120').classList.toggle('on', this.fps >= FPS_TARGETS[this.fpsTargetIndex] * 0.95);

    if (g.mode === 'challenge') {
      $('score-value').textContent = g.score.toLocaleString();
      $('best-value').textContent = g.best.toLocaleString();
      $('combo-value').textContent = g.combo > 1 ? 'x' + g.combo : '';
      $('timer-value').textContent = g.timeLeft.toFixed(1);
      $('timer-fill').style.width = (g.timeLeft / NG.Game.ROUND_SECONDS * 100) + '%';
      $('timer-fill').classList.toggle('low', g.timeLeft < 10);
    }
  };

  App.prototype.drawGraph = function () {
    const c = this.graphCtx || (this.graphCtx = $('graph').getContext('2d'));
    const w = $('graph').width, h = $('graph').height;
    const budget = 1000 / FPS_TARGETS[this.fpsTargetIndex];
    c.clearRect(0, 0, w, h);
    c.fillStyle = 'rgba(10,18,28,0.55)';
    c.fillRect(0, 0, w, h);

    c.strokeStyle = 'rgba(120,220,255,0.28)';
    c.beginPath();
    const budgetY = h - (budget / (budget * 2.2)) * h;
    c.moveTo(0, budgetY); c.lineTo(w, budgetY);
    c.stroke();

    c.beginPath();
    const n = this.frameTimes.length;
    for (let i = 0; i < n; i++) {
      const v = this.frameTimes[(this.frameIndex + i) % n];
      const y = h - Math.min(1, v / (budget * 2.2)) * h;
      const x = (i / (n - 1)) * w;
      if (i === 0) c.moveTo(x, y); else c.lineTo(x, y);
    }
    c.strokeStyle = this.cpuMs <= budget ? '#5ef2c0' : '#ff8a5e';
    c.lineWidth = 1.5;
    c.stroke();
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
    this.frameTimes[this.frameIndex] = this.lastFrameMs || 0;
    this.frameIndex = (this.frameIndex + 1) % this.frameTimes.length;

    /* Smoothed fps over the sample window. */
    this._fpsAccum = (this._fpsAccum || 0) + dt;
    this._fpsFrames = (this._fpsFrames || 0) + 1;
    if (this._fpsAccum >= 0.25) {
      this.fps = this._fpsFrames / this._fpsAccum;
      this._fpsAccum = 0;
      this._fpsFrames = 0;
    }

    this.updateModel();
    this.updateCamera(dt);
    this.updateLight();

    if (!this.paused) {
      this.trackGrabVelocity(dt);
      this.stepPhysics(dt);
    }

    if (this.grabPointer >= 0) {
      this.audio.setStretch(this.body.maxDisplacement / this.body.maxStretch, true);
    }

    /* Idle attract: give the specimen a little life when left alone. */
    if (this.time - this.lastInteraction > 12 && this.game.state !== 'playing') {
      this._idleTimer = (this._idleTimer || 0) + dt;
      if (this._idleTimer > 3.4) {
        this._idleTimer = 0;
        const a = this.time * 1.7;
        this.body.impulse([Math.sin(a) * 0.9, Math.sin(a * 1.7) * 0.7, Math.cos(a) * 0.9], 1.1, 2.4);
      }
    }

    const camDirLocal = M.norm3([0, 0, 0],
      M.transformDir([0, 0, 0], this.invModel, M.sub3([0, 0, 0], this.eye, this.target)));
    this.game.update(dt, this.body, this.model, camDirLocal);
    this.handleEvents();
    this.updateChatter(dt);
    this.updatePopups(dt);

    this.renderer.updateDynamic(this.body.pos, this.body.nrm, this.body.stretch);
    const particleCount = this.game.packParticles(this.renderer.particleData);

    const q = QUALITY[this.quality];
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
      showFloor: this.showFloor,
      rings: this.game.rings,
      particleCount: particleCount,
      highlight: Math.min(1, this.body.maxDisplacement * 0.5),
      bloom: 0.60,
      bloomThreshold: 1.10,
      bloomPasses: q.bloomPasses,
      exposure: 1.05,
      vignette: 0.55,
      aberration: this.game.trauma * this.game.trauma * 0.004
    });

    this.lastFrameMs = performance.now() - frameStart;
    this.cpuMs = this.cpuMs * 0.9 + this.lastFrameMs * 0.1;
    this.adaptResolution();

    this._hudTimer = (this._hudTimer || 0) + dt;
    if (this.hudVisible && this._hudTimer > 0.1) {
      this._hudTimer = 0;
      this.updateHud();
      this.drawGraph();
    }
  };

  App.prototype.start = function () {
    const self = this;
    this.enterSandbox();
    $('loading').classList.add('hidden');
    $('overlay').classList.remove('hidden');
    $('overlay-title').textContent = 'NOGGIN';
    $('overlay-body').innerHTML =
      '<div class="sub">Grab the face and pull. Everything is rubber.</div>' +
      '<div class="sub dim">Drag on the head to stretch &middot; drag the void to orbit &middot; wheel to zoom</div>';
    $('overlay-btn').textContent = 'START CHALLENGE';
    $('overlay-skip').classList.remove('hidden');
    $('overlay-skip').onclick = function (e) {
      e.preventDefault();
      self.audio.resume();
      self.enterSandbox();
    };
    requestAnimationFrame(function (t) { self.frame(t); });
  };

  function boot() {
    try {
      const app = new App();
      window.NOGGIN = app;
      app.start();
    } catch (err) {
      console.error(err);
      $('loading').classList.add('hidden');
      $('overlay').classList.remove('hidden');
      $('overlay-title').textContent = 'CANNOT START';
      $('overlay-body').innerHTML = '<div class="sub">' + String(err.message || err) + '</div>';
      $('overlay-btn').style.display = 'none';
    }
  }

  /* Building the mesh and its binding takes a beat; yield twice so the
     loading state actually paints before the main thread is tied up.
     When bundled into a single file the script can execute after `load` has
     already fired, so check readyState instead of waiting unconditionally. */
  function scheduleBoot() {
    requestAnimationFrame(function () { requestAnimationFrame(boot); });
  }
  if (document.readyState === 'complete') {
    scheduleBoot();
  } else {
    window.addEventListener('load', scheduleBoot);
  }
})(window.NG = window.NG || {});
