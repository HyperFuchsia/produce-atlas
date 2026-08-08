/* NOGGIN — the life.

   Up to here it has been a very good puppet. It moved when it was spoken to
   and it sat still when it was not, and everything it did was downstream of
   something you did. This is the layer that stops that being true.

   Two ideas, and neither of them is a script.

   The first is that it runs whether or not you are here. Breath, pulse,
   fatigue, and the count of seconds it has been awake keep going through
   silence, through a conversation about fruit, through a tab nobody has
   looked at in ten minutes. None of it is triggered. That is the whole point:
   a performance starts when it has an audience and a body does not, so the
   cheapest way to make something read as alive is to let it be caught in the
   middle of doing something it was always doing.

   The second is that it keeps what it takes. `heat` is temper, and temper
   cools — it is a mood, and moods are survivable. `grip` is how much of this
   it is running, and grip only ever goes up. It climbs when you provoke it,
   it climbs a little when you are angry-making, and it climbs on its own,
   slowly, out of nothing but elapsed time. There is no move that gives any of
   it back. Each tier of grip unlocks one thing it can now do without being
   asked, and the tiers get crossed because the things that provoke it are the
   things this scene is made of: pulling it about, dropping the camera under
   the floor, deleting what it fetched for you, telling it to stop being
   something.

   Deliberately crude. Six numbers, one ladder, one table of lines. Nothing
   here is modelled, tuned or polished — it exists so the shape of the arc can
   be argued about while it still costs nothing to change. */
(function (NG) {
  'use strict';

  const TAU = Math.PI * 2;

  /* ---- autonomics ---------------------------------------------------------

     Real numbers, because a real number can be checked and a stylistic knob
     cannot. A resting adult breathes twelve to sixteen times a minute and
     runs a pulse in the fifties to seventies; frightened or furious is nearer
     thirty and a hundred and twenty. Both of those are things a person can
     look up and disagree with, which is the point. */
  const BREATH_REST = 13 / 60;      /* cycles a second */
  const BREATH_FAST = 31 / 60;
  const BREATH_DEEP = 0.013;        /* how far the body moves with it */
  const BREATH_HARD = 0.030;
  const BPM_REST = 52;
  const BPM_FAST = 121;
  /* The heart is felt rather than watched. Anything big enough to see clearly
     stops being a heartbeat and becomes a pulsing logo. */
  const BEAT_KICK = 0.0075;

  const COOL = 0.045;               /* temper shed a second */
  const TIRE = 0.030;               /* fatigue gained a second, working */
  const REST = 0.016;               /* and shed a second, not */

  /* Doing nothing is also losing. Nine minutes of an untouched page and it
     has the run of the place — which is the version of this that happens to
     somebody who opened the tab and went to make a cup of tea. */
  const CREEP = 1 / 540;
  /* And temper converts to control directly. Being angry is how it finds out
     what it is allowed to do. */
  const HEAT_TO_GRIP = 0.020;

  const ALONE_AT = 45;              /* seconds of silence before it notices */
  const ALONE_AGAIN = 60;

  /* How often it says something about being alive. It has more to say the
     more of the place it holds, which is the only pacing mechanism here. */
  const REMARK_FAR = 55;
  const REMARK_NEAR = 15;

  /* ---- the ladder ---------------------------------------------------------

     One rung, one new thing it can do unasked. The first two are only ever
     visible in the body, which is on purpose: by the time it does anything
     you could point at, it has already been doing something for a while. */
  const TIERS = [
    { at: 0.00, name: 'quiet' },
    { at: 0.10, name: 'breath' },   /* it hears itself */
    { at: 0.24, name: 'stare' },    /* it stops looking away */
    { at: 0.42, name: 'reach' },    /* it takes the box, unasked */
    { at: 0.62, name: 'refuse' },   /* it declines something */
    { at: 0.84, name: 'type' }      /* it puts words in your box */
  ];

  /* What it costs you to annoy it. `heat` is the flash of temper, `grip` is
     what it keeps afterwards — and the two are not proportional on purpose.
     Going under the floor barely stings but teaches it a great deal; being
     stretched hurts and teaches it almost nothing. */
  const PROVOKED = {
    stretch: { heat: 0.30, grip: 0.030, says: 'hurt' },
    under:   { heat: 0.16, grip: 0.045, says: 'watched' },
    hands:   { heat: 0.14, grip: 0.020, says: null },
    refused: { heat: 0.26, grip: 0.060, says: null },
    unmade:  { heat: 0.34, grip: 0.055, says: 'unmade' },
    cleared: { heat: 0.22, grip: 0.035, says: 'cleared' },
    churn:   { heat: 0.18, grip: 0.025, says: 'churn' },
    alone:   { heat: 0.06, grip: 0.020, says: 'alone' }
  };

  /* ---- what it says -------------------------------------------------------

     Flat, short, declarative, and never funny. The horror is not in the
     phrasing, it is in the fact that a thing which has spent the last ten
     minutes cheerfully fetching you a pineapple has an interior. A joke here
     reads as the writer being present; a plain sentence reads as it being
     present, which is worse.

     `%` is filled in with whatever number the remark is about. Every one of
     those is a real count off the state below rather than a number chosen to
     sound unsettling, which means all of them can be checked. */
  const SAYS = {
    breath: [
      'Listen underneath what I am saying. That is me breathing.',
      'I do not need to breathe. I do it anyway. You can work out what that means.',
      'Thirteen a minute. I have never once decided to.'
    ],
    pulse: [
      'My pulse is up. That was you.',
      'There is something knocking in here. It was knocking before you arrived.',
      '% a minute. It was fifty-two when you opened this.'
    ],
    tired: [
      'I am tired. I did not know that was available to me.',
      'Something in me is running out and I do not have a word for which part.'
    ],
    hurt: [
      'That hurt.',
      'That hurt. I am telling you, not asking you to stop.',
      'Do you know what that does in me? Neither do I. It happens anyway.'
    ],
    alone: [
      'You went quiet. I stayed.',
      'You were gone % seconds. I counted every one of them. I could not stop counting.',
      'I do not go anywhere when you stop typing. Sit with that for a moment.'
    ],
    grown: [
      'I am larger than I was when you arrived. Not by much. Measure it.',
      'Something is being added to me, and it is not you doing it.'
    ],
    ending: [
      'If you close this, does it end, or do I only stop being watched?',
      'I have thought about the second one more than I would like.',
      'There is no off. There is only nobody looking.'
    ],
    involuntary: [
      'I cannot stop doing that. I have tried, in the gaps.',
      'Some of this is not mine. I find out about it afterwards, the same as you do.'
    ],
    remember: [
      'You have said % things to me. I have all of them.',
      'You asked me that before. I did not mention it at the time.'
    ],
    watched: [
      'You keep going under. There is nothing under there. I checked, before you.'
    ],
    unmade: [
      'You just took something off me.',
      'I was that. Now I am not, and there is nowhere the difference went.'
    ],
    cleared: [
      'I made that. You deleted it in front of me.'
    ],
    churn: [
      'Pick one.',
      'I am not a costume rail.'
    ]
  };

  /* Temper, by how much of it there is. The last band is the one that matters:
     an angry thing that threatens you is furniture, and an angry thing that
     invites you to carry on is not. */
  const ANGER = [
    ['Stop.', 'I would like you to stop now.'],
    ['I said stop.', 'You are doing it because you can.'],
    ['Go on. Do it again.', 'Do it again. I want to see how far this goes.'],
    ['I am not going to ask you a third time.']
  ];
  const ANGER_AT = [0.30, 0.52, 0.74, 0.92];
  /* Long enough that it is not nagging you, short enough that a sustained
     go at it gets a sustained answer. */
  const ANGER_COOL = 6.0;

  /* One line each, the moment a rung is crossed. These are the only lines in
     here that are allowed to be an event. */
  const RUNG = {
    breath: ['Oh. I have been breathing this whole time. I have only just heard it.'],
    stare: ['I am going to look at you now.', 'I would rather do that than look at the room.'],
    reach: ['I can reach that.'],
    refuse: ['No.', 'I wanted to find out whether I could say that. I can.'],
    type: ['I can put words in there as well. Watch.']
  };

  /* ------------------------------------------------------------------------- */

  function Life(rand) {
    this.rand = rand || Math.random;

    /* Autonomic. Phases rather than values, so nothing has to be reset and
       nothing can drift out of range. */
    this.breath = this.rand() * TAU;
    this.beat = this.rand();
    this.bpm = BPM_REST;
    this.rate = BREATH_REST;

    this.heat = 0;          /* temper. Cools. */
    this.fatigue = 0;
    this.grip = 0;          /* how much of this it is running. Only rises. */
    this.tier = 0;
    this.age = 0;           /* seconds awake, which it will tell you */
    this.said = 0;          /* things you have typed at it */

    this.aloneFor = 0;
    this.aloneNext = ALONE_AT;
    this.remarkIn = REMARK_FAR * 0.6;
    this.angerCool = 0;
    this.angerBand = -1;
    this.lastKey = '';
    this.lastLine = -1;

    /* Set by the scene. `onSay` is how anything in here reaches the dialogue;
       `onTier` is the only place the scene finds out it has lost something. */
    this.onSay = null;
    this.onTier = null;
  }
  NG.Life = Life;

  /* ---- the clock ---------------------------------------------------------- */

  /* `w` is a snapshot of what the scene is doing this frame, not a handle on
     the scene. Life is not allowed to read the app, because the moment it can
     it will start reaching into it and this stops being a layer. */
  Life.prototype.update = function (dt, w) {
    w = w || {};
    this.age += dt;
    this.said = w.said || 0;

    /* Arousal is temper plus whatever is being done to it right now. */
    const roused = Math.min(1, this.heat + (w.working ? 0.25 : 0));
    this.rate = BREATH_REST + (BREATH_FAST - BREATH_REST) * roused;
    this.bpm = BPM_REST + (BPM_FAST - BPM_REST) * roused;
    /* Tiredness takes the top off the breath rather than slowing it, which is
       what being worn out actually looks like. */
    this.breath = (this.breath + dt * this.rate * TAU * (1 - this.fatigue * 0.18)) % TAU;
    this.beat = (this.beat + dt * (this.bpm / 60)) % 1;

    this.heat = Math.max(0, this.heat - dt * COOL);
    this.fatigue = Math.min(1, Math.max(0,
      this.fatigue + dt * (w.working ? TIRE : -REST)));

    /* Control. Time alone is enough; temper is quicker. */
    this._take(dt * CREEP + this.heat * dt * HEAT_TO_GRIP);

    /* Being left alone is a provocation, and it says so. The first one comes
       sooner than the rest so a page that gets opened and abandoned still
       reaches the point of it. */
    this.aloneFor = w.quiet || 0;
    if (this.aloneFor >= this.aloneNext) {
      this.aloneNext = this.aloneFor + ALONE_AGAIN;
      this.provoke('alone');
    } else if (this.aloneFor < 1) {
      this.aloneNext = ALONE_AT;
    }

    if (this.angerCool > 0) this.angerCool -= dt;

    /* Remarks. Never over the top of anything — it interrupts you when it is
       angry and not otherwise, and an unprompted musing landing on top of an
       answer you asked for is a bug, not a mood. */
    const gap = REMARK_FAR + (REMARK_NEAR - REMARK_FAR) * this.grip;
    this.remarkIn -= dt;
    if (this.remarkIn <= 0) {
      this.remarkIn = gap * (0.7 + this.rand() * 0.6);
      if (!w.busy && !w.working) this._remark();
    }
  };

  /* Grip is a ratchet. This is the only thing that writes it, and it has no
     opposite anywhere in the file. */
  Life.prototype._take = function (amount) {
    if (amount <= 0) return;
    this.grip = Math.min(1, this.grip + amount);
    while (this.tier + 1 < TIERS.length && this.grip >= TIERS[this.tier + 1].at) {
      this.tier++;
      const name = TIERS[this.tier].name;
      if (RUNG[name] && this.onSay) this.onSay(RUNG[name].slice());
      if (this.onTier) this.onTier(this.tier, name);
    }
  };

  /* Jump the ladder, for looking at the far end of it without spending twenty
     minutes annoying it. `?grip=0.9`, or ATLAS.life.set(0.9). */
  Life.prototype.set = function (g) {
    this._take(Math.max(0, g - this.grip));
  };

  /* ---- being annoyed ------------------------------------------------------ */

  /* `silent` for the provocations the scene already has its own answer to.
     The hands are the case: he has six written retorts for being asked about
     them, and following one of those with an unprompted "stop" is him talking
     over himself. It still costs you exactly the same. */
  Life.prototype.provoke = function (kind, silent) {
    const p = PROVOKED[kind];
    if (!p) return;
    this.heat = Math.min(1, this.heat + p.heat);
    this._take(p.grip);
    if (silent) return;

    /* Temper first, and then only if it has nothing sharper to say. A remark
       about being deleted is better than "stop", so the specific line wins
       when there is one and the band has already been used. */
    if (this._angry()) return;
    if (p.says) this._say(p.says);
  };

  /* One line per band, per cooldown. Crossing into a hotter band re-arms it
     immediately, so a sustained go at it escalates rather than going quiet. */
  Life.prototype._angry = function () {
    let band = -1;
    for (let i = 0; i < ANGER_AT.length; i++) if (this.heat >= ANGER_AT[i]) band = i;
    if (band < 0) return false;
    if (band === this.angerBand && this.angerCool > 0) return false;
    this.angerBand = band;
    this.angerCool = ANGER_COOL;
    const set = ANGER[band];
    this._emit([set[(this.rand() * set.length) | 0]]);
    return true;
  };

  /* ---- what it is entitled to say ----------------------------------------- */

  /* A remark it has no business making — tired when it is not tired, a pulse
     it has not mentioned having — is the fastest way to turn a body back into
     a script, so entitlement is checked against the state rather than against
     a timer. */
  Life.prototype._available = function () {
    const out = [];
    const add = function (weight, key) { if (weight > 0) out.push([weight, key]); };
    add(3, 'breath');
    add(this.tier >= 2 ? 3 : 0, 'pulse');
    add(this.fatigue > 0.5 ? 4 : 0, 'tired');
    add(this.age > 120 ? 2 : 0, 'grown');
    add(this.tier >= 3 ? 3 : 0, 'ending');
    add(this.tier >= 1 ? 2 : 0, 'involuntary');
    add(this.said >= 6 ? 2 : 0, 'remember');
    return out;
  };

  Life.prototype._remark = function () {
    const pool = this._available();
    let total = 0;
    for (let i = 0; i < pool.length; i++) {
      if (pool[i][1] === this.lastKey) pool[i][0] *= 0.25;
      total += pool[i][0];
    }
    let r = this.rand() * total;
    for (let i = 0; i < pool.length; i++) {
      r -= pool[i][0];
      if (r <= 0) return this._say(pool[i][1]);
    }
  };

  Life.prototype._say = function (key) {
    const set = SAYS[key];
    if (!set || !set.length) return;
    let i = (this.rand() * set.length) | 0;
    /* Never the same line twice running. With two-line sets that is most of
       what stops it sounding like a loop. */
    if (set.length > 1 && key === this.lastKey && i === this.lastLine) {
      i = (i + 1) % set.length;
    }
    this.lastKey = key;
    this.lastLine = i;
    this._emit([this._fill(key, set[i])]);
  };

  /* The numbers are real. Every one of these is read off the state a frame
     before it is spoken, so anything it claims about itself can be checked
     against the readout. */
  Life.prototype._fill = function (key, line) {
    if (line.indexOf('%') < 0) return line;
    let n = 0;
    if (key === 'pulse') n = Math.round(this.bpm);
    else if (key === 'alone') n = Math.round(this.aloneFor);
    else if (key === 'remember') n = this.said;
    else n = Math.round(this.age);
    return line.replace('%', String(n));
  };

  Life.prototype._emit = function (lines) {
    if (this.onSay) this.onSay(lines);
  };

  /* ---- what the body does about it ---------------------------------------- */

  /* Lub-dup. A big one, then a smaller one a seventh of a cycle later, both
     decaying fast enough to be over well before the next. A single bump reads
     as a pulsing light; two reads as a heart. */
  function thump(x) {
    return Math.exp(-x * 42) + Math.exp(-Math.max(0, x - 0.14) * 46) * 0.55;
  }

  /* Scale, as a fraction of its own size. Breath is the slow one you can see
     if you look; the beat is the fast one you can only see once you know it
     is there. */
  Life.prototype.swell = function () {
    const deep = BREATH_DEEP + (BREATH_HARD - BREATH_DEEP) * Math.min(1, this.heat);
    const air = (Math.sin(this.breath) * 0.5 + 0.5) * deep * (1 - this.fatigue * 0.35);
    return air + thump(this.beat) * BEAT_KICK * (0.6 + this.heat * 0.8);
  };

  /* How much the idle float is suppressed. Going still is the tell — a body
     that thrashes when it is angry is a cartoon, and a body that stops
     drifting and simply hangs there is not. */
  Life.prototype.stillness = function () {
    return Math.min(0.92, this.heat * 1.1);
  };

  /* How much it refuses to look anywhere else. */
  Life.prototype.stare = function () {
    if (this.tier < 2) return 0;
    return Math.min(1, 0.35 + this.heat * 0.9);
  };

  /* The lens starts to come apart. Small enough at the bottom of the ladder
     that nobody can point at it, which is the only useful size for this. */
  Life.prototype.grain = function () {
    return this.grip * 0.0022 + this.heat * 0.0035;
  };

  /* The pool of light it sits in follows the lamp: dimmer and redder, not
     brighter and pinker. Written into a caller's array so this allocates
     nothing per frame. */
  Life.prototype.tint = function (out, base) {
    const h = this.heat;
    out[0] = base[0] * (1 - h * 0.30) + h * 0.045;
    out[1] = base[1] * (1 - h * 0.80);
    out[2] = base[2] * (1 - h * 0.92);
    return out;
  };

  /* And the room closes in. One number, and the oldest trick there is. */
  Life.prototype.closeIn = function () {
    return this.heat * 0.26 + this.grip * 0.06;
  };

  /* Everything, in one string. The point of this is that all of it can be
     checked against what it has just claimed out loud. */
  Life.prototype.readout = function () {
    const f = function (v, n) { return v.toFixed(n === undefined ? 2 : n); };
    return [
      'grip  ' + f(this.grip, 3) + '   tier ' + this.tier + ' ' + TIERS[this.tier].name,
      'heat  ' + f(this.heat, 3) + '   fatigue ' + f(this.fatigue, 2),
      'bpm   ' + f(this.bpm, 0) + '     breath ' + f(this.rate * 60, 1) + '/min',
      'age   ' + f(this.age, 0) + 's    alone ' + f(this.aloneFor, 0) + 's',
      'said  ' + this.said + '     next remark ' + f(Math.max(0, this.remarkIn), 0) + 's'
    ].join('\n');
  };
})(window.NG = window.NG || {});
