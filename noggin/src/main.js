/* Produce Atlas — application shell.

   One job: keep the being on stage, let you pull at it, and put whatever
   specimen you ask for next to it at true scale. The scene owns the screen;
   the only persistent chrome is a single input. */
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

  /* The being. Core is what glows through the middle, focus is the bright
     point that shows where its attention is. */
  const BEING = {
    core: [0.52, 0.68, 1.00],
    focus: [0.95, 0.98, 1.0],
    pool: [0.035, 0.058, 0.10]
  };

  const FLOOR = {
    grid: [0.055, 0.060, 0.052],
    base: [0.026, 0.029, 0.025]
  };

  /* What it is currently made of. Asked whether it is a solid, a liquid or a
     gas, it does not answer in words — it becomes each one, and each one has
     to behave differently or the demonstration is a lie.

     `freeze` suppresses the idle drift, because the funniest part of turning
     to stone is that it stops floating first. `fall` hands it over to gravity.
     `rise` is where it settles when nothing is pulling it down. */
  const GRAVITY = 9.4;
  const MATTER = {
    free:   { stiffness: 165, coupling: 900,  damping: 5.5,  freeze: 0,    gas: 0, inert: 0,    fall: false, rise: 0 },
    /* Stopped dead, still deciding — so it holds still but stays awake. */
    poised: { stiffness: 210, coupling: 900,  damping: 7.0,  freeze: 1,    gas: 0, inert: 0, fall: false, rise: 0 },
    solid:  { stiffness: 470, coupling: 700,  damping: 9.0,  freeze: 1,    gas: 0, inert: 1,    fall: true,  rise: 0 },
    /* Floppiness is bought with damping and coupling, not by dropping the
       restoring force: the spring is what carries the body to its new shape
       at all, and a first attempt at k=38 left it lagging so far behind the
       melt that the shell tore itself into shards. Slow and heavily coupled
       reads as liquid; weightless does not. */
    liquid: { stiffness: 110, coupling: 1400, damping: 2.8,  freeze: 1,    gas: 0, inert: 0.25,    fall: true,  rise: 0 },
    gas:    { stiffness: 95,  coupling: 1500, damping: 3.4,  freeze: 0.55, gas: 1, inert: 0,    fall: false, rise: 0.4 }
  };

  /* How each state is lit. `amount` is how far it stops being iridescent —
     stone is fully opaque and dead, vapour keeps most of its own glow. The
     stone is dark on purpose: the joke only lands if the change is obvious
     across the room. */
  const SKIN = {
    free:   { color: [0.90, 0.90, 0.90], amount: 0 },
    poised: null,                                        /* undecided: unchanged */
    solid:  { color: [0.11, 0.115, 0.13], amount: 1 },
    liquid: { color: [0.42, 0.62, 0.92], amount: 1 },
    gas:    { color: [0.72, 0.82, 1.00], amount: 0.35 }
  };

  /* A beat between hardening and dropping, so the fall reads as a consequence
     of turning to stone rather than as the same event. */
  const HARDEN_BEAT = 0.45;

  /* How much bigger it gets while speaking, as a fraction of its own size.
     Modest on purpose: this is a being drawing breath, not a balloon. */
  const SWELL = {
    breath: 0.018,   /* steady, while a line is running */
    stress: 0.060,   /* on the marks that carry weight */
    tick: 0.020      /* the per-character throb underneath */
  };

  /* Nothing occupies the sides any more. The only reserved area is the
     dialogue band along the bottom, so the stage is centred horizontally and
     lifted clear of it. */
  const NARROW_AT = 640;

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
    this.stageY = -0.34;
    this.distBoost = 1;
    this.target = [0, this.stageY, 0];
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
    this.voice = 0;
    this.swell = 0;
    this.focusDir = [0, 0, 1];

    /* State of matter. `fallY` is a vertical offset on top of the drift, so
       gravity can act on it without the idle motion having to know. */
    this.phase = 'free';
    this.fallY = 0;
    this.fallV = 0;
    this.fallDelay = 0;
    this.landed = false;
    this.restLow = 1.15;
    this.freeze = 0;
    this.gas = 0;
    this.inert = 0;
    this.poolColor = BEING.pool.slice();
    this.spin = 0;
    this.driftX = 0; this.driftY = 0; this.driftZ = 0;
    this.boil = 0;
    this.boilT = 0;
    this.stageBias = 0;
    this.shake = 0;

    /* Playing with it, unprompted, is itself a thing it responds to. */
    this.play = 0;
    this.playGrabs = 0;
    this.sinceSend = 0;
    this.helpCooldown = 20;    /* not in the first few seconds */
    this.helper = null;

    this.overlay = [];
    this.attached = [];   /* stems and crowns riding the being's transform */
    this.trim = null;
    this.wire = null;          /* wireframe overlay, e.g. the tesseract */
    this.wireSpin = 0;
    this.rand = M.rng((Date.now() & 0x7fffffff) || 11);

    this.pointers = new Map();
    this.grabPointer = -1;
    this.grabSlot = -1;
    this.orbitPointer = -1;
    this.pinchDist = 0;
    this.grabPlaneN = [0, 0, 0];
    this.grabPlaneP = [0, 0, 0];
    this.grabVel = [0, 0, 0];

    this.brain = new NG.Brain();
    this.chat = new NG.Chat(this.audio, this.brain, {
      log: $('dialogue'), input: $('prompt'), form: $('composer')
    });
    this.props = [];
    /* Morph state: the being's rest shape animating from one form to another. */
    this.baseRest = new Float32Array(this.mesh ? 0 : 0);
    this.morph = { t: 1, dur: 1, from: null, to: null, amount: 0, target: 0, form: null };
    this.formColor = [0.9, 0.9, 0.9];
    const self = this;
    this.chat.onSpawn = function (entry) { self.spawnSpecimen(entry); };
    this.chat.onClear = function () { self.clearSpecimens(); };
    this.chat.onMorph = function (entry) { self.becomeForm(entry); };
    this.chat.onRevert = function () { self.becomeForm(null); };
    this.chat.onLesson = function (id) { self.runLesson(id); };
    /* Abandoning a routine has to put the scene back, or you are left as a
       puddle on the floor because you changed the subject. */
    this.chat.onAbort = function () {
      self.hideTesseract();
      self.enterPhase('free');
      self.becomeForm(null, true);
    };
    /* When you type, he stops whatever he was looking at and looks at you —
       and stops messing about, if he was. */
    this.chat.onSend = function () {
      self.sinceSend = 0;
      self.lookAtViewer(3.0);
      self.dismissHand();
    };

    this.buildBeing(5);
    this.renderer.setShadowSize(1024);
    this.resize();
    this.bindEvents();
    this.buildChips();
  }

  App.prototype.buildBeing = function (subdiv) {
    this.mesh = NG.G.buildOrb(subdiv);
    this.body = new NG.Softbody(this.mesh);
    this.renderer.setMesh(this.mesh);
    /* Its own shape, kept so it can always find its way back. */
    this.orbRest = new Float32Array(this.mesh.rest);
    /* Unit directions per vertex — what any form is projected onto. */
    this.dirs = new Float32Array(this.mesh.total * 3);
    for (let i = 0; i < this.mesh.total; i++) {
      const x = this.orbRest[i * 3], y = this.orbRest[i * 3 + 1], z = this.orbRest[i * 3 + 2];
      const l = Math.hypot(x, y, z) || 1;
      this.dirs[i * 3] = x / l;
      this.dirs[i * 3 + 1] = y / l;
      this.dirs[i * 3 + 2] = z / l;
    }
    this._measureRest();
  };

  /* ---- becoming ------------------------------------------------------------ */

  /* Any specimen can be expressed on the being's own topology, so becoming one
     is a morph of rest positions. The solver keeps running throughout, which is
     what makes the change wobble instead of snapping. */
  App.prototype.becomeForm = function (entry, quiet) {
    if (!entry || entry.kind !== 'point') this.hideTesseract();
    const n = this.mesh.total;
    const target = new Float32Array(n * 3);
    const out = [0, 0, 0];

    if (entry) {
      for (let i = 0; i < n; i++) {
        NG.P.formOnSphere(out, entry, this.dirs[i * 3], this.dirs[i * 3 + 1], this.dirs[i * 3 + 2]);
        target[i * 3] = out[0];
        target[i * 3 + 1] = out[1];
        target[i * 3 + 2] = out[2];
      }
      this.formColor = entry.color.slice();
    } else {
      target.set(this.orbRest);
    }

    this.morph.from = new Float32Array(this.body.rest);
    this.morph.to = target;
    this.morph.t = 0;
    this.morph.dur = (entry && entry.morphDur) || 1.35;
    this.morph.target = entry ? 1 : 0;
    this.morph.form = entry;

    this._setTrimmings(entry);

    /* A shove so the change is felt, not just seen. Melting is the exception:
       a boing on the way to becoming a puddle undoes the whole gag. */
    if (!quiet) {
      this.body.impulse([0, 0, 0], 4.0, -2.2);
      this.lean = 1;
      M.set3(this.leanDir, 0, 0.2, 0.9);
      this.audio.boing(0.5);
    }
  };

  /* The parts of a specimen that cannot live on a sphere — a stem, leaves, a
     pineapple's crown. They are built in the same local frame as the form, so
     they ride the being's own transform with no fitting required, and they
     grow out of it rather than appearing. */
  App.prototype._setTrimmings = function (entry) {
    const mesh = entry && entry.id ? NG.P.build(entry, true) : null;
    if (this.trim) this.trim.target = 0;
    if (!mesh) return;
    const t = { handle: this.renderer.createProp(mesh), matrix: M.m4(), grow: 0, target: 1 };
    this.attached.push(t);
    this.trim = t;
  };

  App.prototype.updateTrimmings = function (dt) {
    for (let i = this.attached.length - 1; i >= 0; i--) {
      const t = this.attached[i];
      t.grow += (t.target - t.grow) * Math.min(1, dt * 3.2);
      if (t.target === 0 && t.grow < 0.01) {
        this.renderer.destroyProp(t.handle);
        this.attached.splice(i, 1);
        if (this.trim === t) this.trim = null;
        continue;
      }
      /* Scaled about the being's centre, so it sprouts outward. */
      const g = M.smoothstep(0, 1, t.grow);
      const s = [
        g, 0, 0, 0,
        0, g, 0, 0,
        0, 0, g, 0,
        0, 0, 0, 1
      ];
      M.multiply(t.matrix, this.model, s);
    }
  };

  /* How far it reaches, and how far below its centre it ends — the second is
     what decides where it comes to rest on the floor, and it changes as the
     shape does, so a puddle settles lower than a ball. */
  App.prototype._measureRest = function () {
    const rest = this.body.rest;
    let reach = 0, low = 0;
    for (let i = 0; i < rest.length; i += 3) {
      const r = Math.hypot(rest[i], rest[i + 1], rest[i + 2]);
      if (r > reach) reach = r;
      if (-rest[i + 1] > low) low = -rest[i + 1];
    }
    this.beingReach = reach;
    this.restLow = low;
  };

  App.prototype.updateMorph = function (dt) {
    const m = this.morph;

    /* How it is lit eases independently of what shape it is, so it can turn to
       stone without changing form at all. */
    m.amount += (m.target - m.amount) * Math.min(1, dt * 3.5);

    if (!m.to || m.t >= 1) return;

    m.t = Math.min(1, m.t + dt / m.dur);
    const e = M.smoothstep(0, 1, m.t);
    const rest = this.body.rest;
    const from = m.from, to = m.to;
    for (let i = 0; i < rest.length; i++) {
      rest[i] = from[i] + (to[i] - from[i]) * e;
    }
    /* The keep-out reads rest radii every step, so they track the morph, and
       so does the floor contact — which is how a melt slumps rather than
       dropping through in one go. */
    this.body.refreshRestLengths();
    this._measureRest();

    if (m.t >= 1) {
      /* Geodesic grab distances are only worth recomputing once, at the end. */
      this.body.refreshEdgeLengths();
      m.amount = m.target;
      this.refitCamera();
    }
  };

  /* ---- states of matter ------------------------------------------------- */

  App.prototype.enterPhase = function (name) {
    const p = MATTER[name];
    if (!p) return;
    this.phase = name;
    if (name !== 'free') { this.hideTesseract(); this.dismissHand(); }

    this.body.stiffness = p.stiffness;
    this.body.coupling = p.coupling;
    this.body.damping = p.damping;

    const skin = SKIN[name];
    if (skin) {
      this.formColor = skin.color.slice();
      this.morph.target = skin.amount;
    }

    if (p.fall) {
      this.landed = false;
      this.fallV = 0;
    }
    if (name === 'solid') {
      this.fallDelay = HARDEN_BEAT;
      this.audio.boing(0.15);
    } else if (name === 'liquid') {
      this.audio.slosh();
    } else if (name === 'gas') {
      this.boilT = 0;
      this.audio.hiss();
    }
  };

  App.prototype.updateMatter = function (dt) {
    const p = MATTER[this.phase] || MATTER.free;

    this.freeze += (p.freeze - this.freeze) * Math.min(1, dt * 4);
    this.gas += (p.gas - this.gas) * Math.min(1, dt * (p.gas > this.gas ? 1.1 : 3.0));
    this.inert += (p.inert - this.inert) * Math.min(1, dt * 3.5);
    /* It lights the table under it because it is luminous. Once it is not,
       the light under it has to go out too. */
    const lit = 1 - this.inert;
    this.poolColor[0] = BEING.pool[0] * lit;
    this.poolColor[1] = BEING.pool[1] * lit;
    this.poolColor[2] = BEING.pool[2] * lit;

    /* Boiling off is its own envelope: a spike as the state changes, decaying
       once it is vapour. It drives the plume in the vertex stage and holds the
       rise back until the mass has actually started to seethe. */
    if (this.phase === 'gas') {
      this.boilT += dt;
      this.boil = Math.min(1, this.boilT / 0.40) * Math.exp(-Math.max(0, this.boilT - 0.40) * 0.85);
    } else {
      this.boil = Math.max(0, this.boil - dt * 2.5);
    }

    if (p.fall) {
      if (this.fallDelay > 0) {
        this.fallDelay -= dt;
      } else {
        this.fallV -= GRAVITY * dt;
        this.fallY += this.fallV * dt;
      }
      /* Where it comes to rest is settled against the ground itself, in
         resolveFloorContact, once the model matrix for this frame exists. */
    } else if (this.phase === 'gas') {
      /* Evaporation accelerates. It sits and seethes before it lifts, so the
         rate ramps in rather than the whole thing easing off the floor the
         instant it is called a gas. */
      const rate = 0.25 + 2.4 * M.smoothstep(0.25, 1.5, this.boilT);
      this.fallY += (p.rise - this.fallY) * Math.min(1, dt * rate);
      this.fallV = 0;
      this.landed = false;
    } else {
      /* Nothing holding it down: it drifts back to where it lives. */
      this.fallY += (p.rise - this.fallY) * Math.min(1, dt * 1.6);
      this.fallV = 0;
      this.landed = false;
    }

    /* Follow it down, but not all the way — losing it out of the bottom of
       the frame would be worse than the floor creeping up the shot. */
    const wantBias = Math.min(0, this.fallY) * 0.62;
    this.stageBias += (wantBias - this.stageBias) * Math.min(1, dt * 2.2);
    if (this.shake > 0.0001) this.shake *= Math.pow(0.015, dt);
  };

  /* Settle the body against the ground, and hand the solver a floor.

     Two separate jobs. Where the body comes to rest is decided by its nominal
     shape, so a wobble does not jog the whole thing up and down. What must
     never pass through the plane is the *deformed* shape, and that is the
     solver's constraint — which is the bit that was missing: constraining only
     the centre let a landing squash push its own underside through the floor,
     and let a melt sink straight into it. */
  App.prototype.resolveFloorContact = function () {
    const p = MATTER[this.phase] || MATTER.free;
    const m = this.model;
    /* The row of the model that produces world Y. Its length is the scale. */
    const g = [m[1], m[5], m[9]];
    const floorY = this.renderer.floorY;

    if (p.fall) {
      const need = floorY - this.body.lowestAlong(g, true) - m[13];
      if (need > 0) {
        this.fallY += need;
        const speed = -this.fallV;
        this.fallV = 0;
        if (!this.landed) {
          this.landed = true;
          if (speed > 1.2) this.onLand(speed);
        }
        this.composeModel();
      } else if (need < -0.01) {
        this.landed = false;
      }
    }

    /* The constraint itself stays on whatever the phase, so pulling it down
       into the ground by hand squashes it against the floor rather than
       posting it through. A liquid grips; a rock slides a little. */
    const mu = this.phase === 'liquid' ? 5.5 : (this.phase === 'solid' ? 3.0 : 1.6);
    this.body.setFloor(g, floorY - this.model[13], mu);
  };

  /* The squash is what carries the weight. A body this stiff barely deforms
     from the impulse alone, so the impulse is sized for the read: about a
     fifth of its own radius at terminal speed, gone again inside a second. */
  App.prototype.onLand = function (speed) {
    const s = M.clamp(speed / 6, 0.2, 1);
    this.body.impact([0, -1, 0], 6.5 * s);
    this.audio.thud(s);
    this.shake = 0.16 * s;
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
    /* Lift the subject above the dialogue band by looking slightly below it. */
    this.stageY = narrow ? -0.85 : -0.34;
    this.distBoost = narrow ? 1.45 : 1;
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
    const input = $('prompt');

    /* Two of these are the only thing telling anyone that it does more than
       fetch fruit, so they carry their own phrasing rather than being fed
       through one template. */
    const CHIPS = [
      { label: 'a pineapple', send: 'pineapple' },
      { label: 'what is an avocado?', send: 'what is an avocado?' },
      { label: 'solid, liquid or gas?', send: 'are you a solid, liquid or gas?' },
      { label: 'the fourth dimension', send: 'what does the fourth dimension look like?' },
      { label: 'help', send: 'help' }
    ];

    CHIPS.forEach(function (chip) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'chip';
      b.textContent = chip.label;
      /* mousedown, not click: the field blurs before click would land. */
      b.addEventListener('mousedown', function (e) { e.preventDefault(); });
      b.addEventListener('click', function () {
        self.audio.resume();
        self.chat.send(chip.send);
        input.value = '';
        input.blur();
      });
      host.appendChild(b);
    });

    const sync = function () {
      const show = document.activeElement === input && input.value.trim() === '';
      document.body.classList.toggle('hint', show);
    };
    input.addEventListener('focus', sync);
    input.addEventListener('input', sync);
    input.addEventListener('blur', function () {
      /* Let a chip press land before the row disappears. */
      setTimeout(sync, 120);
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
      this.playGrabs++;
    } else {
      this.orbitPointer = e.pointerId;
    }
  };

  App.prototype.tryGrab = function (ndc) {
    const ro = [0, 0, 0], rd = [0, 0, 0], hit = [0, 0, 0];
    this.localRay(ndc, ro, rd);
    if (this.body.raycast(ro, rd, hit) < 0) return false;
    const slot = this.body.beginGrab(this.body.lastHitVertex, this.grabRadius, hit);
    if (slot < 0) return false;
    this.grabSlot = slot;

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
      this.body.setGrabTarget(this.grabSlot, M.addScaled3([0, 0, 0], ro, rd, t));
    } else if (e.pointerId === this.orbitPointer) {
      this.camera.yaw -= (e.clientX - prevX) * 0.006;
      this.camera.pitch = M.clamp(this.camera.pitch + (e.clientY - prevY) * 0.006, -1.25, 1.25);
    }
  };

  App.prototype.releaseGrab = function () {
    const amount = this.body.endGrab(this.grabSlot, this.grabVel, 0.45);
    this.grabPointer = -1;
    this.grabSlot = -1;
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
    let reach = Math.max(this.beingReach || 0, this.wire ? 1.9 : 0);
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
      const x = M.clamp((nx * 0.5 + 0.5) * this.cssW, 80, this.cssW - 80);
      const y = M.clamp((0.5 - ny * 0.5) * this.cssH, 34, this.cssH - 24);
      p.el.style.left = x + 'px';
      p.el.style.top = y + 'px';
    }
  };

  /* ---- it joins in --------------------------------------------------------- */

  /* Play with it long enough without saying anything and it decides you are
     having more fun than it is. A cursor hand arrives from off-screen and
     takes hold of the being alongside you — a genuine second grab on the
     solver, not a canned animation, which is why the two pulls fight over the
     same shell the way they should. */
  const PLAY_BEFORE_OFFER = 5.0;    /* seconds of actual dragging */
  const QUIET_BEFORE_OFFER = 12;    /* seconds since you last typed */
  const OFFER_COOLDOWN = 150;
  const HAND_SCALE = 1.15;
  const HAND_STANDOFF = 0.34;       /* fingertip just clear of the surface */

  App.prototype.updatePlay = function (dt) {
    this.sinceSend += dt;
    if (this.grabPointer >= 0) this.play += dt;
    if (this.helpCooldown > 0) this.helpCooldown -= dt;

    if (!this.helper && this.helpCooldown <= 0 && this.phase === 'free'
      && this.play > PLAY_BEFORE_OFFER && this.playGrabs >= 2
      && this.sinceSend > QUIET_BEFORE_OFFER && !this.chat.busy()) {
      this.offerHelp();
    }
  };

  App.prototype.offerHelp = function () {
    const self = this;
    this.helpCooldown = OFFER_COOLDOWN;
    this.play = 0;
    this.playGrabs = 0;
    this.chat.script([
      { text: 'Would you like me to help you with that?',
        after: function () { self.summonHand(); },
        /* The punchline lands the moment it actually takes hold. */
        hold: function () { return !!self.helper && self.helper.stage === 'arriving'; },
        gap: 0.35 },
      { text: 'You looked like you were having too much fun doing this on your own, so I wanted to join.',
        gap: 2.8 },
      { text: 'Oh, this is good. No wonder you would not stop.', gap: 3.4 },
      { text: 'Right. That is enough of that. Ask me something.',
        after: function () { self.dismissHand(); } }
    ]);
  };

  /* The vertex whose outward direction is closest to `dir`, in body space. */
  App.prototype._vertexTowards = function (dir) {
    const pos = this.body.pos;
    let best = 0, bestDot = -2;
    for (let i = 0; i < this.mesh.headCount; i++) {
      const x = pos[i * 3], y = pos[i * 3 + 1], z = pos[i * 3 + 2];
      const l = Math.hypot(x, y, z) || 1;
      const d = (x * dir[0] + y * dir[1] + z * dir[2]) / l;
      if (d > bestDot) { bestDot = d; best = i; }
    }
    return best;
  };

  App.prototype.summonHand = function () {
    if (this.helper) return;
    if (!this.handHandle) this.handHandle = this.renderer.createProp(NG.G.buildHand());

    /* Take hold somewhere facing the viewer and off to one side, so the pull
       is side-on and both hands are visible at once. */
    const toEye = M.norm3([0, 0, 0], M.sub3([0, 0, 0], this.eye, this.headPos));
    const r = this.camRight, u = this.camUp;
    const world = M.norm3([0, 0, 0], [
      r[0] * 0.90 + u[0] * 0.30 + toEye[0] * 0.35,
      r[1] * 0.90 + u[1] * 0.30 + toEye[1] * 0.35,
      r[2] * 0.90 + u[2] * 0.30 + toEye[2] * 0.35
    ]);
    const local = M.norm3([0, 0, 0], M.transformDir([0, 0, 0], this.invModel, world));
    const vertex = this._vertexTowards(local);
    const p = this.body.pos;
    const anchor = [p[vertex * 3], p[vertex * 3 + 1], p[vertex * 3 + 2]];
    const outLocal = M.norm3([0, 0, 0], anchor);
    const frame = M.frame(outLocal);

    const part = { handle: this.handHandle, matrix: M.m4() };
    this.overlay.push(part);
    this.helper = {
      stage: 'arriving', t: 0, part: part, vertex: vertex, slot: -1,
      anchor: anchor, outLocal: outLocal, sideLocal: frame[0], upLocal: frame[1],
      /* Enters from beyond the edge of the frame. */
      pos: [
        this.headPos[0] + r[0] * 4.6 - u[0] * 1.3,
        this.headPos[1] + r[1] * 4.6 - u[1] * 1.3,
        this.headPos[2] + r[2] * 4.6 - u[2] * 1.3
      ],
      aim: [0, -1, 0], scale: 0
    };
  };

  App.prototype.dismissHand = function () {
    const h = this.helper;
    if (!h || h.stage === 'leaving') return;
    if (h.slot >= 0) {
      this.body.endGrab(h.slot, [0, 0, 0], 0);
      h.slot = -1;
      this.audio.boing(0.55);
    }
    h.stage = 'leaving';
    h.t = 0;
  };

  App.prototype._removeHand = function () {
    const h = this.helper;
    if (!h) return;
    if (h.slot >= 0) this.body.endGrab(h.slot, [0, 0, 0], 0);
    const i = this.overlay.indexOf(h.part);
    if (i >= 0) this.overlay.splice(i, 1);
    this.helper = null;
  };

  App.prototype.updateHelper = function (dt) {
    const h = this.helper;
    if (!h) return;
    h.t += dt;

    /* Where the fingertip belongs: just off the surface, at whatever point it
       is holding — which moves, because it is dragging it. */
    const held = [0, 0, 0];
    if (h.slot >= 0) {
      const d = this.body.grabDeltaOf(h.slot);
      held[0] = h.anchor[0] + d[0]; held[1] = h.anchor[1] + d[1]; held[2] = h.anchor[2] + d[2];
    } else {
      M.copy3(held, h.anchor);
    }
    const pointWorld = M.transformPoint([0, 0, 0], this.model, held);
    const outWorld = M.norm3([0, 0, 0], M.transformDir([0, 0, 0], this.model, h.outLocal));
    const want = M.addScaled3([0, 0, 0], pointWorld, outWorld, HAND_STANDOFF);

    if (h.stage === 'arriving') {
      h.scale = Math.min(1, h.scale + dt * 3.0);
      M.mix3(h.pos, h.pos, want, Math.min(1, dt * 3.6));
      if (M.dist3(h.pos, want) < 0.4 || h.t > 2.4) {
        h.slot = this.body.beginGrab(h.vertex, this.grabRadius * 1.2, h.anchor);
        h.stage = h.slot >= 0 ? 'pulling' : 'leaving';
        h.t = 0;
        this.audio.click();
      }
    } else if (h.stage === 'pulling') {
      /* Wander while pulling. A straight steady drag reads as a machine; the
         wander is what makes it look like it is enjoying itself. */
      const ramp = M.smoothstep(0, 0.8, h.t);
      const out = (0.80 + 0.50 * Math.sin(h.t * 1.9)) * ramp;
      const side = Math.sin(h.t * 1.31) * 0.34 * ramp;
      const rise = Math.sin(h.t * 0.87 + 1.1) * 0.26 * ramp;
      const target = [
        h.anchor[0] + h.outLocal[0] * out + h.sideLocal[0] * side + h.upLocal[0] * rise,
        h.anchor[1] + h.outLocal[1] * out + h.sideLocal[1] * side + h.upLocal[1] * rise,
        h.anchor[2] + h.outLocal[2] * out + h.sideLocal[2] * side + h.upLocal[2] * rise
      ];
      this.body.setGrabTarget(h.slot, target);
      M.mix3(h.pos, h.pos, want, Math.min(1, dt * 18));
    } else {
      h.scale = Math.max(0, h.scale - dt * 1.4);
      const r = this.camRight, u = this.camUp;
      const exit = [
        this.headPos[0] + r[0] * 4.6 - u[0] * 1.3,
        this.headPos[1] + r[1] * 4.6 - u[1] * 1.3,
        this.headPos[2] + r[2] * 4.6 - u[2] * 1.3
      ];
      M.mix3(h.pos, h.pos, exit, Math.min(1, dt * 2.2));
      if (h.scale <= 0.001) { this._removeHand(); return; }
    }

    /* The finger points at what it is touching, and the palm is rolled to
       face the viewer — a flat hand seen edge-on is a white stick. */
    const aim = M.sub3([0, 0, 0], pointWorld, h.pos);
    if (M.len3(aim) > 1e-4) M.norm3(h.aim, aim); else M.copy3(h.aim, [0, -1, 0]);
    const toEye = M.norm3([0, 0, 0], M.sub3([0, 0, 0], this.eye, h.pos));
    M.aim(h.part.matrix, h.pos, h.aim, HAND_SCALE * h.scale, toEye);
  };

  /* ---- lessons -------------------------------------------------------------- */

  /* A lesson is data: an ordered list of lines, each with what the scene
     should do while it is spoken. The action fires when its line finishes
     typing, so the change always follows the sentence that promised it. */
  App.prototype.runLesson = function (id) {
    const lesson = NG.C.LESSONS[id];
    if (!lesson) return;
    const self = this;
    this.chat.script(lesson.steps.map(function (step) {
      const acts = step.form || step.phase || step.wire !== undefined;
      return {
        text: step.text,
        gap: step.gap,
        /* Wait for the body rather than for a clock. */
        hold: step.hold === 'land' ? function () { return !self.landed; } : null,
        after: acts ? function () {
          /* Shape first, then state: entering a phase sets how it is lit, and
             that has to be the last word. */
          if (step.form === 'self') self.becomeForm(null, true);
          else if (step.form) self.becomeForm(NG.C.FORMS[step.form], !!step.phase);
          if (step.phase) self.enterPhase(step.phase);
          if (step.wire) self.showTesseract();
        } : null
      };
    }));
  };

  /* ---- tesseract overlay ------------------------------------------------------ */

  /* One unit tube drawn 32 times, each with a matrix laying it along an edge.
     The corners are recomputed every frame from a real 4-D rotation, so the
     shape genuinely turns through w rather than faking it in 3-D. */
  App.prototype.showTesseract = function () {
    if (this.wire) return;
    if (!this.tubeHandle) {
      this.tubeHandle = this.renderer.createProp(
        NG.G.buildTube(6, [0.80, 0.90, 1.0], NG.G.MAT.WIRE));
    }
    const edges = NG.C.TESSERACT.edges;
    const parts = [];
    for (let i = 0; i < edges.length; i++) {
      const part = { handle: this.tubeHandle, matrix: M.m4(), wire: true };
      parts.push(part);
      this.overlay.push(part);
    }
    this.wire = { parts: parts, points: [], grow: 0 };
    this.wireSpin = 0;
  };

  App.prototype.hideTesseract = function () {
    if (!this.wire) return;
    for (let i = this.overlay.length - 1; i >= 0; i--) {
      if (this.overlay[i].wire) this.overlay.splice(i, 1);
    }
    this.wire = null;
  };

  App.prototype.updateTesseract = function (dt) {
    const w = this.wire;
    if (!w) return;
    w.grow = Math.min(1, w.grow + dt * 0.8);
    this.wireSpin += dt;

    const pts = NG.C.projectTesseract(
      w.points, this.wireSpin * 0.45, this.wireSpin * 0.28, 0.85 * w.grow, 2.6);
    const edges = NG.C.TESSERACT.edges;
    const a = [0, 0, 0], b = [0, 0, 0];
    for (let i = 0; i < edges.length; i++) {
      const p = pts[edges[i][0]], q = pts[edges[i][1]];
      a[0] = p[0] + this.headPos[0]; a[1] = p[1] + this.headPos[1]; a[2] = p[2] + this.headPos[2];
      b[0] = q[0] + this.headPos[0]; b[1] = q[1] + this.headPos[1]; b[2] = q[2] + this.headPos[2];
      M.segment(w.parts[i].matrix, a, b, 0.012);
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

    /* Where the focal point sits on the shell. */
    M.norm3(this.focusDir, M.sub3(this.focusDir, this.gaze, this.headPos));

    /* Voice envelope: rises while it is speaking, falls when it stops. */
    const want = this.chat.busy() ? 1 : 0;
    this.voice += (want - this.voice) * Math.min(1, dt * (want ? 6 : 2.2));

    /* Speaking swells it. A steady breath while a line runs, a bigger one
       where the line has weight behind it — which is what a sphere with no
       face has instead of a mouth.

       It stops completely once it is wearing something. An apple does not
       breathe, and neither does a rock; the swell is the being's own tell,
       so anything it has become should be still. */
    const held = 1 - this.morph.amount;
    const wantSwell = (this.voice * SWELL.breath
      + this.chat.emphasis * SWELL.stress
      + this.chat.pulse * SWELL.tick) * held;
    this.swell += (wantSwell - this.swell) * Math.min(1, dt * 12);
  };

  /* ---- frame --------------------------------------------------------------- */

  App.prototype.updateCamera = function (dt) {
    const c = this.camera;
    c.dist += (c.targetDist - c.dist) * Math.min(1, dt * 9);
    /* Keep the head clear of the column, and slide between head and specimen. */
    /* Slide half way toward the specimen so the pair sits centred. */
    const wantX = this.props.length ? (this.narrow ? 0.35 : 0.55) : 0;
    this.target[0] += (wantX - this.target[0]) * Math.min(1, dt * 3);
    this.target[1] += (this.stageY + this.stageBias - this.target[1]) * Math.min(1, dt * 3);

    const cp = Math.cos(c.pitch), sp = Math.sin(c.pitch);
    this.eye[0] = this.target[0] + c.dist * cp * Math.sin(c.yaw);
    this.eye[1] = this.target[1] + c.dist * sp;
    this.eye[2] = this.target[2] + c.dist * cp * Math.cos(c.yaw);

    /* An impact jolts what the camera is pointed at, not where it is standing:
       the frame kicks, the framing survives. */
    const centre = this.shake > 0.0001
      ? [this.target[0] + Math.sin(this.time * 47) * this.shake * 0.6,
         this.target[1] + Math.sin(this.time * 61) * this.shake,
         this.target[2]]
      : this.target;

    const aspect = this.canvas.width / Math.max(1, this.canvas.height);
    M.perspective(this.proj, 0.72, aspect, 0.08, 60);
    M.lookAt(this.view, this.eye, centre, [0, 1, 0]);
    M.multiply(this.viewProj, this.proj, this.view);
    M.invert(this.invViewProj, this.viewProj);

    const fwd = M.norm3([0, 0, 0], M.sub3([0, 0, 0], this.target, this.eye));
    const right = M.norm3([0, 0, 0], M.cross3([0, 0, 0], fwd, [0, 1, 0]));
    const up = M.cross3([0, 0, 0], right, fwd);
    /* Kept, because anything that has to enter from off-screen needs to know
       which way off-screen is. */
    this.camRight = right;
    this.camUp = up;
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

  App.prototype.updateModel = function (dt) {
    const t = this.time;
    /* Everything voluntary is scaled by this. At zero it is not floating,
       not nodding and not leaning — it is an object. */
    const alive = 1 - this.freeze;

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

    px *= alive; py *= alive; pz *= alive;

    /* Kept apart from the fall, so settling against the ground can move the
       body without the drift having to be recomputed. */
    this.driftX = px; this.driftY = py; this.driftZ = pz;

    /* A sphere has no visible front, so attention is not shown by turning —
       the shader paints a focal point wherever it is looking. This rotation
       only drifts the iridescent film so the surface never looks frozen, and
       it stops when the film does. */
    this.spin += dt * 0.06 * alive;
    this.composeModel();
  };

  App.prototype.composeModel = function () {
    M.set3(this.headPos, this.driftX, this.driftY + this.fallY, this.driftZ);
    M.compose(this.model, this.headPos[0], this.headPos[1], this.headPos[2],
      this.spin, Math.sin(this.spin * 1.5) * 0.2, 1 + this.swell);
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
    if (this.grabPointer < 0 || this.grabSlot < 0 || dt <= 0) {
      M.set3(this.grabVel, 0, 0, 0); return;
    }
    const b = this.body;
    const a = b.grabAnchorOf(this.grabSlot), d = b.grabDeltaOf(this.grabSlot);
    if (!a) { M.set3(this.grabVel, 0, 0, 0); return; }
    const target = [a[0] + d[0], a[1] + d[1], a[2] + d[2]];
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

  /* Everything that happens in a frame except drawing it. Kept as one method
     so there is exactly one copy of the order these run in — a second copy
     living in a test harness drifts, and then the harness quietly stops
     exercising whatever was added last. */
  App.prototype.stepFrame = function (dt) {
    this.time += dt;

    this.updateCamera(dt);
    this.updateAttention(dt);
    this.updateMatter(dt);
    this.updateModel(dt);
    this.resolveFloorContact();
    this.updatePlay(dt);
    this.updateHelper(dt);
    this.updateTrimmings(dt);
    this.updateLight();
    this.trackGrabVelocity(dt);
    this.updateMorph(dt);
    this.stepPhysics(dt);
    this.updateTesseract(dt);

    if (this.grabPointer >= 0) {
      this.audio.setStretch(this.body.maxDisplacement / this.body.maxStretch, true);
    }

    this.chat.update(dt);
    this.updateProps(dt);
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

    this.stepFrame(dt);
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
      attached: this.attached,
      overlay: this.overlay,
      being: BEING,
      focusDir: this.focusDir,
      voice: this.voice,
      morph: this.morph.amount,
      formColor: this.formColor,
      gas: this.gas,
      boil: this.boil,
      inert: this.inert,
      poolPos: this.headPos,
      poolColor: this.poolColor,
      highlight: Math.min(1, this.body.maxDisplacement * 0.4),
      bloom: 0.50,
      bloomThreshold: 1.10,
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
