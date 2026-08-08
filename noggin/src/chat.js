/* NOGGIN — the chat surface.

   His replies type out one character at a time with the same blip voice as his
   idle rambling, so the panel reads as him speaking rather than as a log
   printing. Queued lines drain in order, and pressing send while he is still
   going makes him finish the current line instantly — he will not be told to
   hurry up twice. */
(function (NG) {
  'use strict';

  const CHARS_PER_SEC = 90;
  const LINE_GAP = 0.18;
  /* How long a finished line stays before it dissolves. Long enough to read a
     three-sentence answer without hurrying, short enough that the scene is
     never standing behind a wall of old text. */
  const LINGER = 20;
  const FADE = 1.2;
  const MAX_VISIBLE = 3;
  /* Ceiling on a scene hold. A condition that never arrives must not be able
     to strand the conversation with lines still queued behind it. */
  const HOLD_MAX = 8;

  /* What the body moves to. Speech is not a constant hum — it has stresses,
     and those are almost entirely carried by punctuation and by the capital
     that starts a sentence. Weighting those is enough to make the swell land
     on the words that matter without any analysis of the words. */
  const EMPHASIS = {
    '!': 0.90, '?': 0.65, '.': 0.35, '—': 0.32, ':': 0.22, ';': 0.20, ',': 0.16
  };
  const PULSE_PER_CHAR = 0.20;
  const CAPITAL_STRESS = 0.22;

  /* The one word the box will not hold.

     Type it anywhere in a sentence and the box stops being a box. It takes no
     more letters — and then nothing happens. Your sentence sits there, whole,
     for three seconds, while the field ignores you.

     The pause is the part that does the work. Deleting it the instant the word
     lands reads as a text effect; three seconds of a dead box with your own
     words still in it reads as somebody deciding. Then it all goes at once,
     far faster than any backspace, and there was never anything you could do
     about it.

     Read-only for all of it, because a box that is refusing your sentence
     while still accepting letters is a glitch rather than a refusal. */
  const FORBIDDEN = /hand/i;
  const WIPE_HOLD = 3.0;      /* seconds of nothing, with your words still up */
  const WIPE_RATE = 140;      /* then characters a second, at the start */
  const WIPE_ACCEL = 900;     /* and how much quicker each second after */
  /* And it stays shut a moment longer while you are still hitting keys.
     Unlocking the instant the field is empty hands the box back mid-sentence
     and the tail of what you were saying lands in it. Key presses still arrive
     at a read-only field, so he can hear you carrying on and keep it shut
     until you stop. */
  const LOCK_TAIL = 0.45;
  /* One every so often rather than one per character: at this speed a sound
     per letter is a buzz, not a sound. */
  const UNBLIP_EVERY = 0.045;

  function Chat(audio, brain, els, voice) {
    this.audio = audio;
    this.brain = brain;
    /* Out loud, when he has a face on. See voice.js. */
    this.voice = voice || null;
    this.canSpeak = null;    /* set by the scene: is he someone with a mouth */
    this.aloud = false;      /* the voice is carrying the line being typed */
    this.log = els.log;
    this.input = els.input;
    this.form = els.form;
    /* The greyed-out suggestion in the empty box. It is the one piece of UI
       that talks to you before you have done anything, which makes it the
       only place he can get a word in without saying it out loud. */
    this.defaultHint = this.input.placeholder;

    this.queue = [];
    this.live = [];      /* on-screen lines with their remaining lifetime */
    this.typingEl = null;
    this.full = '';
    this.shown = 0;
    this.gap = 0;
    this.hold = null;       /* predicate: true while the scene is still busy */
    this.holdFor = 0;
    this.lastActivity = -1e9;
    /* Speech shape, read by the body: `pulse` ticks along with the characters,
       `emphasis` spikes on the ones that carry weight. */
    this.pulse = 0;
    this.emphasis = 0;

    /* Mouth shape, for when it is wearing a face. It speaks by typing, so the
       letters are right here as they are said — which is a better signal than
       anything that could be inferred from an audio envelope. Two numbers
       carry almost all of visible speech: how far the jaw is down, and
       whether the lips are pursed or spread. */
    this.viseme = { open: 0, round: 0 };
    this._blip = 0;
    this.scripted = false;   /* a multi-step routine is running */
    /* Taking your sentence off you. See FORBIDDEN. `wiping` covers the whole
       of it — the pause, the erase and the moment after — because for all of
       that the box is not yours. */
    this.wiping = false;
    this.wipePhase = 'off';   /* 'hold' | 'erase' | 'tail' | 'taken' */
    /* Set while the scene has the element and the field is live anyway — he
       is holding it and you are still typing into it. */
    this.held = false;
    this.wipeT = 0;
    this.wipeLeft = 0;
    this.lockFor = 0;
    this._unblip = 0;
    this.onSpawn = null;
    this.onType = null;
    this.onClear = null;
    this.onAbort = null;
    this.onWipe = null;
    this.onSlots = null;
    this.onBlockout = null;

    const self = this;
    this.form.addEventListener('submit', function (e) {
      e.preventDefault();
      /* Send is part of what stops. Letting it through mid-wipe would post
         whatever was left of the sentence at that instant. */
      if (self.wiping || self.lockFor > 0) return;
      /* Straight out of the gesture, which is the only moment some browsers
         will let a voice be started at all. */
      if (self.voice) self.voice.prime();
      self.send(self.input.value);
      self.input.value = '';
    });
    /* Typing in the box must not trigger the game's single-key shortcuts.
       A read-only field still gets these, which is the only way to tell that
       somebody is carrying on typing at a box that has stopped taking it. */
    this.input.addEventListener('keydown', function (e) {
      e.stopPropagation();
      if (self.voice) self.voice.prime();
      if (self.wiping || self.lockFor > 0) self.lockFor = LOCK_TAIL;
    });

    /* What is being typed, before it is sent. Almost nothing should read this
       — a thing that reacts to half-finished sentences is exhausting — but it
       is the only way to catch somebody in the act of noticing something, and
       there is exactly one of those. */
    this.input.addEventListener('input', function () {
      if (self.wiping) return;
      const text = self.input.value;
      if (self.onType) self.onType(text);
      if (FORBIDDEN.test(text)) self._wipe();
    });
  }

  /* Stop taking letters. The sentence stays up for now. */
  Chat.prototype._wipe = function () {
    /* Somebody is already holding it. The word has cost you everything it is
       going to cost you. */
    if (this.wiping || this.held) return;
    this.wiping = true;
    this.wipePhase = 'hold';
    this.wipeT = WIPE_HOLD;
    this.lockFor = LOCK_TAIL;
    /* Read-only rather than disabled: the caret stays where it was and the
       field does not grey out. It is refusing you, not broken. */
    this.input.readOnly = true;

    /* Unless something else wants to deal with it, in which case the box is
       not the box's any more and it stops having opinions about when the
       words go. See App.startSnatch, which takes the whole element off the
       screen and does not give it back until it has finished. */
    if (this.onWipe && this.onWipe()) this.wipePhase = 'taken';
  };

  /* Given back — or, while he is still holding it, simply unlocked, because
     a box you cannot type into is no use to either of you. `clear` for when
     whatever was in it did not survive. */
  Chat.prototype.releaseBox = function (clear) {
    if (this.wipePhase !== 'taken') return;
    if (clear) this.input.value = '';
    this.wipePhase = 'tail';
    this.lockFor = LOCK_TAIL;
    if (this.onType) this.onType(this.input.value);
  };

  Chat.prototype._updateWipe = function (dt) {
    /* Somebody else has it. Nothing here runs until they give it back. */
    if (this.wipePhase === 'taken') return;

    if (this.wipePhase === 'hold') {
      /* Three seconds of your own sentence, and no way to add to it. */
      this.wipeT -= dt;
      if (this.wipeT > 0) return;
      this.wipePhase = 'erase';
      this.wipeT = 0;
      this.wipeLeft = this.input.value.length;
      this._unblip = 0;
      return;
    }

    if (this.wipePhase === 'erase') {
      this.wipeT += dt;
      this.wipeLeft -= (WIPE_RATE + WIPE_ACCEL * this.wipeT) * dt;
      const want = Math.max(0, Math.ceil(this.wipeLeft));
      const have = this.input.value.length;
      this._unblip += dt;
      if (want < have) {
        if (this._unblip >= UNBLIP_EVERY) {
          this._unblip = 0;
          this.audio.unblip(this.input.value.charCodeAt(have - 1));
        }
        this.input.value = this.input.value.slice(0, want);
      }
      if (want > 0) return;
      this.wipePhase = 'tail';
      /* The box is empty now, and whoever was watching it has to be told —
         nothing dispatches an input event for a field a script emptied.
         Without this he would stay armed against a word that is no longer
         there and would only ever react to it once. */
      if (this.onType) this.onType('');
      return;
    }

    this.lockFor -= dt;
    if (this.lockFor > 0) return;
    this.lockFor = 0;
    this.wipePhase = 'off';
    this.wiping = false;
    this.input.readOnly = false;
  };

  /* Letter to mouth shape. Not phonemes — the spelling is what it has, and
     for the handful of shapes an eye can actually resolve at conversational
     speed the spelling is close enough. What matters far more than which
     vowel is which is that the closures land: `m`, `b` and `p` are the only
     sounds English makes with the lips fully shut, and a mouth that never
     shuts during "somebody" reads as a puppet immediately.

     open: how far the jaw drops.  round: pursed at 1, spread at 0. */
  const VISEME = {
    a: [1.00, 0.10], e: [0.55, 0.00], i: [0.40, 0.00],
    o: [0.70, 0.95], u: [0.45, 1.00], y: [0.40, 0.15],
    w: [0.30, 1.00], r: [0.35, 0.55], q: [0.35, 0.90],
    m: [0.00, 0.30], b: [0.00, 0.25], p: [0.00, 0.25],
    f: [0.15, 0.20], v: [0.15, 0.20],
    s: [0.18, 0.00], z: [0.18, 0.00], c: [0.22, 0.10], x: [0.22, 0.10],
    t: [0.25, 0.05], d: [0.28, 0.05], n: [0.22, 0.10], l: [0.35, 0.05],
    g: [0.35, 0.20], k: [0.30, 0.15], h: [0.40, 0.20], j: [0.30, 0.45],
    th: [0.20, 0.00]
  };

  /* Punctuation closes the mouth, which is what a pause looks like. */
  Chat.prototype._say = function (ch) {
    const v = ch ? VISEME[ch.toLowerCase()] : null;
    if (!v) { this.viseme.open = 0; this.viseme.round *= 0.5; return; }
    this.viseme.open = v[0];
    this.viseme.round = v[1];
  };

  /* Change what the empty box suggests. Passing nothing puts it back. */
  Chat.prototype.hint = function (text) {
    this.input.placeholder = text || this.defaultHint;
  };

  Chat.prototype.busy = function () {
    return !!this.typingEl || this.queue.length > 0;
  };

  Chat.prototype._append = function (cls, text) {
    const row = document.createElement('div');
    row.className = 'msg ' + cls;
    row.textContent = text || '';
    this.log.appendChild(row);

    const entry = { el: row, life: LINGER, held: true };
    this.live.push(entry);
    /* Older lines leave early rather than stacking into a block. */
    while (this.live.length > MAX_VISIBLE) {
      const old = this.live[0];
      if (old.life > FADE) old.life = FADE;
      if (this.live.length > MAX_VISIBLE + 2) this._drop(0);
      else break;
    }
    return row;
  };

  Chat.prototype._drop = function (i) {
    const e = this.live[i];
    if (e.el.parentNode) e.el.parentNode.removeChild(e.el);
    this.live.splice(i, 1);
  };

  /* Age the visible lines. A line still being typed does not age. */
  Chat.prototype._ageLines = function (dt) {
    for (let i = this.live.length - 1; i >= 0; i--) {
      const e = this.live[i];
      if (e.el === this.typingEl) continue;
      e.life -= dt;
      if (e.life <= FADE && !e.el.classList.contains('gone')) e.el.classList.add('gone');
      if (e.life <= 0) this._drop(i);
    }
  };

  /* Queue entries carry an optional callback that fires the moment that line
     finishes typing, which is how the specimen arrives *after* he has said he
     will fetch it rather than materialising while he is still offering. */
  Chat.prototype.say = function (lines, afterFirstLine) {
    for (let i = 0; i < lines.length; i++) {
      this.queue.push({ text: lines[i], after: i === 0 ? (afterFirstLine || null) : null });
    }
  };

  /* Run an ordered script: each item may carry its own action, its own pause,
     and its own condition to wait on, which is what lets an explanation pace
     itself against what the scene is doing. A `hold` beats a `gap` for
     anything physical — the line after a fall should land when the body does,
     not after however long the fall was guessed to take. */
  Chat.prototype.script = function (items) {
    this.scripted = true;
    for (let i = 0; i < items.length; i++) {
      this.queue.push({
        text: items[i].text,
        after: items[i].after || null,
        gap: items[i].gap,
        hold: items[i].hold || null
      });
    }
  };

  Chat.prototype.send = function (raw) {
    const text = String(raw || '').trim();
    if (!text) return;
    this.lastActivity = 0;

    /* Typing is always allowed to break a wait: whatever the scene was doing,
       the person in front of it takes priority. */
    this.hold = null;

    if (this.scripted) {
      /* A routine can run for half a minute. Typing during one means you want
         something else now, so the rest of it is dropped rather than queued
         in front of your answer — and the pending action is dropped with it,
         or the scene would keep changing after the routine was abandoned. */
      this.queue.length = 0;
      this._after = null;
      this._hold = null;
      this.gap = 0;
      this.scripted = false;
      if (this.typingEl) {
        this.typingEl.textContent = this.full;
        this.typingEl.classList.remove('typing');
        this.typingEl = null;
      }
      if (this.onAbort) this.onAbort();
    } else if (this.typingEl) {
      /* A second send finishes the current line rather than stacking up. Run
         its pending callback too, or an interrupted line would swallow its
         spawn. */
      this.typingEl.textContent = this.full;
      this.typingEl.classList.remove('typing');
      this.typingEl = null;
      this._runAfter();
    }

    /* Talking over you is rude. Whatever he was saying, he stops. */
    if (this.voice) this.voice.cancel();
    this.aloud = false;

    this._append('you', text);
    if (this.onSend) this.onSend();
    const reply = this.brain.respond(text);
    if (reply.lesson && this.onLesson) { this.onLesson(reply.lesson); return; }
    if (reply.clear && this.onClear) this.onClear();
    const self = this;
    /* Whatever it promised in the first line happens when that line lands. */
    let after = null;
    if (reply.spawn) after = function () { if (self.onSpawn) self.onSpawn(reply.spawn); };
    else if (reply.morph) after = function () { if (self.onMorph) self.onMorph(reply.morph); };
    else if (reply.revert) after = function () { if (self.onRevert) self.onRevert(); };
    else if (reply.slots) after = function () { if (self.onSlots) self.onSlots(); };
    else if (reply.blockout) after = function () { if (self.onBlockout) self.onBlockout(); };
    this.say(reply.lines, after);
  };

  Chat.prototype.update = function (dt) {
    this.lastActivity += dt;
    if (this.voice) this.voice.update(dt);
    if (this.wiping || this.lockFor > 0) this._updateWipe(dt);
    this._ageLines(dt);
    /* Both fall away on their own; only typing puts anything back. */
    this.pulse -= this.pulse * Math.min(1, dt * 9);
    this.emphasis -= this.emphasis * Math.min(1, dt * 3.2);

    if (!this.typingEl) {
      if (this.hold) {
        this.holdFor += dt;
        if (this.holdFor < HOLD_MAX && this.hold()) return;
        this.hold = null;
      }
      if (this.gap > 0) { this.gap -= dt; return; }
      if (!this.queue.length) { this.scripted = false; return; }
      const item = this.queue.shift();
      this.full = item.text;
      this._after = item.after;
      this._gap = item.gap !== undefined ? item.gap : LINE_GAP;
      this._hold = item.hold || null;
      this.shown = 0;
      this.typingEl = this._append('him typing', '');
      /* If he is going to say this one out loud, his voice is the clock from
         here: the letters appear as he says them rather than at a fixed
         speed, which is the only way the two can agree. */
      this.aloud = !!(this.voice && (!this.canSpeak || this.canSpeak())
        && this.voice.say(this.full));
      return;
    }

    const before = Math.floor(this.shown);
    if (this.aloud) {
      this.shown = Math.min(this.full.length, this.voice.spokenTo());
      /* And if the voice stops for any reason at all — finished, refused,
         switched off mid-sentence, an engine that lost its nerve — the rest
         of the line lands rather than hanging half-written. */
      if (this.voice.done) {
        this.aloud = false;
        this.shown = this.full.length;
      }
    } else {
      this.shown = Math.min(this.full.length, this.shown + CHARS_PER_SEC * dt);
    }
    const now = Math.floor(this.shown);
    if (now !== before) {
      this.typingEl.textContent = this.full.slice(0, now);
      for (let i = before; i < now; i++) {
        const ch = this.full.charAt(i);
        if (ch === ' ' || ch === '\n') { this._say(null); continue; }
        /* The blip is his voice when he has not got one. When he has, it is
           two voices at once. */
        if (!this.aloud && ++this._blip % 5 === 0) this.audio.blip(ch.charCodeAt(0));
        this.pulse = Math.min(1, this.pulse + PULSE_PER_CHAR);
        this._say(ch);
        const w = EMPHASIS[ch];
        if (w) this.emphasis = Math.min(1, this.emphasis + w);
        else if (ch >= 'A' && ch <= 'Z') {
          this.emphasis = Math.min(1, this.emphasis + CAPITAL_STRESS);
        }
      }
    }
    if (this.shown >= this.full.length) {
      this.typingEl.classList.remove('typing');
      this.typingEl = null;
      this.gap = this._gap;
      this.hold = this._hold;
      this.holdFor = 0;
      this._hold = null;
      /* The action runs after the hold is armed, so a hold can wait on
         whatever the action just set in motion. */
      this._runAfter();
    }
  };

  Chat.prototype._runAfter = function () {
    const fn = this._after;
    this._after = null;
    if (fn) fn();
  };

  NG.Chat = Chat;
})(window.NG = window.NG || {});
