/* NOGGIN — the voice.

   He has been talking by typing since the beginning, which was honest: a
   thing made of maths writing at you. With a face on it stops being honest.
   A face that moves its mouth in silence is a puppet, and the silence is the
   loudest thing in the room.

   So when he is wearing a face, he says it out loud. The browser's own
   speech engine does the sound — there is nothing else available that is not
   thirty megabytes of neural weights, and this whole thing has no
   dependencies and no build step. What is here instead is everything that
   decides whether that engine sounds like a person or like a station
   announcement, which turns out to be nearly all of it:

     - which voice, out of however many the machine has, and there is an
       enormous gap between the best and the worst of them;
     - one utterance per sentence rather than one per paragraph, with real
       pauses in the gaps, because every engine reads a full stop as a comma
       when there is more text behind it;
     - a different rate and pitch for every sentence, varied by a hash of the
       sentence itself so it is consistent but never twice the same. This is
       the single biggest tell. A voice that says every sentence at exactly
       the same speed and exactly the same pitch is a robot no matter how good
       the samples are, and one that does not is most of the way to a person;
     - the units read as words, because "450 cm" said out loud as "four fifty
       see em" is nobody.

   And the mouth follows the audio rather than the typing. The engine reports
   where it has got to; the letters appear as he says them and the jaw moves
   on the letter he is actually saying. Everything is on one clock, and the
   clock is his voice. */
(function (NG) {
  'use strict';

  /* Names that mean the machine has a good one. Every platform marks its
     neural voices somewhere in the name, and they are worth an enormous
     amount — the gap between "Microsoft Guy Online (Natural)" and the
     concatenative voice next to it in the list is the entire brief. */
  const GOOD = /natural|neural|premium|enhanced|siri|wavenet|studio|journey|polyglot/i;
  /* And the ones that are a synthesiser from 1995 wearing a name badge. */
  const POOR = /espeak|pico|festival|flite|compact|klatt|robo/i;
  /* He is a man, so a man's voice. Only used to break ties — the quality
     marks matter more than this does. */
  const MEN = /\b(guy|christopher|eric|roger|steffan|ryan|thomas|daniel|alex|fred|aaron|david|mark|brian|davis|tony|jason|andrew|nathan|rishi|liam|william|george|james|arthur|male)\b/i;
  const WOMEN = /\b(aria|jenny|zira|samantha|susan|karen|moira|tessa|fiona|victoria|allison|ava|female|woman)\b/i;

  /* Sentences he is about to say, roughly. Chunks shorter than this get
     folded into the next one — a two-word utterance of its own reads as a
     stutter, not as a pause. */
  const MIN_CHUNK = 14;
  /* Silence after each kind of ending. Punctuation is the only prosody mark
     in the text, and the engine throws most of it away at the end of an
     utterance, so the pauses have to be put back by hand. */
  const PAUSE = { '.': 0.24, '!': 0.26, '?': 0.30, ':': 0.20, ';': 0.18, ',': 0.11, '—': 0.17 };
  const PAUSE_DEFAULT = 0.14;

  /* Where the voice sits. Slightly under the default on both, which is what
     an unhurried man sounds like; the variation on top is what stops it
     being a machine reading a card. */
  const RATE = 0.98;
  const PITCH = 0.92;
  const VARY_RATE = 0.055;
  const VARY_PITCH = 0.055;

  /* Characters a second, for filling in between the engine's progress
     reports. Measured against real speech: English runs about fourteen at a
     normal pace, and the engine's own rate scales it. */
  const CHARS_PER_SEC = 14.2;

  /* Chrome stops speaking after about fifteen seconds of one utterance and
     has done for years. Sentence-sized utterances mostly dodge it; this is
     the belt to that pair of braces. */
  const KICK_EVERY = 4.0;

  function hash(s) {
    let h = 2166136261;
    for (let i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = (h * 16777619) >>> 0;
    }
    return h;
  }
  /* Deterministic jitter in -1..1 from the text itself, so a line said twice
     is said the same way twice, and two different lines are not. */
  function jitter(s, salt) {
    return ((hash(s + salt) % 2000) / 1000) - 1;
  }

  function Voice() {
    this.ok = !!(window.speechSynthesis && window.SpeechSynthesisUtterance);
    this.enabled = true;
    this.voice = null;
    this.picked = false;
    this.chunks = [];
    this.i = 0;
    this.line = '';
    this.at = 0;          /* characters into the line, as spoken */
    this.aim = 0;         /* the end of the chunk in progress */
    this.speaking = false;
    this.done = true;     /* finished the line it was given */
    this.gap = 0;
    this.rate = CHARS_PER_SEC;
    this.kick = 0;
    this._u = null;

    if (this.ok) {
      const self = this;
      /* The list arrives late on every platform, and empty on the first ask
         on most of them. */
      this._pick();
      window.speechSynthesis.addEventListener('voiceschanged', function () {
        self.picked = false;
        self._pick();
      });
    }
  }

  /* ---- which voice ------------------------------------------------------- */

  Voice.prototype.score = function (v) {
    const name = (v.name || '') + ' ' + (v.voiceURI || '');
    const lang = (v.lang || '').toLowerCase();
    let s = 0;
    if (POOR.test(name)) s -= 100;
    if (GOOD.test(name)) s += 60;
    /* English, because everything he says is written in it. Any English is
       far better than a perfect voice reading it in another. */
    if (lang.indexOf('en') === 0) s += 40; else s -= 60;
    if (lang === 'en-us' || lang === 'en-gb') s += 8;
    if (MEN.test(name)) s += 14;
    if (WOMEN.test(name)) s -= 14;
    /* A local voice cannot stall on a bad connection, which is worth a little
       — but not much, because the remote ones are usually the good ones. */
    if (v.localService) s += 4;
    if (v.default) s += 2;
    return s;
  };

  Voice.prototype._pick = function () {
    if (!this.ok || this.picked) return;
    const list = window.speechSynthesis.getVoices();
    if (!list || !list.length) return;
    let best = null, bestScore = -1e9;
    for (let i = 0; i < list.length; i++) {
      const s = this.score(list[i]);
      if (s > bestScore) { bestScore = s; best = list[i]; }
    }
    this.voice = best;
    this.picked = true;
  };

  Voice.prototype.available = function () {
    this._pick();
    return this.ok && !!this.voice;
  };

  /* ---- what to say ------------------------------------------------------- */

  /* Written for the eye, said with a mouth. Two different things. */
  Voice.prototype.spoken = function (text) {
    return String(text)
      /* Emphasis marks are for reading. */
      .replace(/\*/g, '')
      /* Units. "450 cm long" said as "four hundred and fifty see em long" is
         the single most robotic thing in the whole atlas. */
      .replace(/(\d)\s*cm\b/g, '$1 centimetres')
      .replace(/(\d)\s*mm\b/g, '$1 millimetres')
      .replace(/(\d)\s*kg\b/g, '$1 kilograms')
      .replace(/(\d)\s*°C\b/g, '$1 degrees')
      .replace(/(\d)\s*%/g, '$1 per cent')
      .replace(/\b(\d)-D\b/g, '$1 D')
      /* An em dash is a pause, and most engines say nothing at all for it. */
      .replace(/\s*—\s*/g, ', ')
      /* Quotes around something he is reading out get in the way of the
         reading rather than helping it. */
      .replace(/"/g, '');
  };

  /* One utterance per sentence, with what to do at the end of each. */
  Voice.prototype.plan = function (text) {
    const out = [];
    const re = /[^.!?:;]+[.!?:;]+|\S[^.!?:;]*$/g;
    let m;
    while ((m = re.exec(text)) !== null) {
      const raw = m[0];
      const start = m.index;
      const piece = { text: raw, from: start, to: start + raw.length };
      /* Too short to be its own breath: glue it to the one before. */
      const prev = out[out.length - 1];
      if (prev && raw.trim().length < MIN_CHUNK) {
        prev.text += raw;
        prev.to = piece.to;
      } else {
        out.push(piece);
      }
    }
    if (!out.length && text.trim()) {
      out.push({ text: text, from: 0, to: text.length });
    }

    for (let i = 0; i < out.length; i++) {
      const c = out[i];
      const t = c.text.trim();
      const end = t.charAt(t.length - 1);
      const last = i === out.length - 1;
      c.pause = last ? 0 : (PAUSE[end] === undefined ? PAUSE_DEFAULT : PAUSE[end]);

      /* Every sentence gets its own speed and its own pitch. Same sentence,
         same delivery; different sentence, different delivery. */
      let rate = RATE + jitter(t, 'r') * VARY_RATE;
      let pitch = PITCH + jitter(t, 'p') * VARY_PITCH;
      /* A question goes up at the end and a shout goes up all over, and both
         of them get there a little quicker than a statement. */
      if (end === '?') { pitch += 0.07; rate += 0.02; }
      if (end === '!') { pitch += 0.09; rate += 0.05; }
      /* Something in capitals is being leaned on, and leaning on a word
         means slowing down for it, not speeding up. */
      if (/\b[A-Z]{3,}\b/.test(t)) { rate -= 0.07; pitch += 0.04; }
      /* The opening of a long line is set up rather than delivered. */
      if (i === 0 && out.length > 2) rate -= 0.02;

      c.rate = Math.max(0.5, Math.min(1.6, rate));
      c.pitch = Math.max(0.4, Math.min(1.6, pitch));
    }
    return out;
  };

  /* ---- saying it --------------------------------------------------------- */

  /* Returns true if it actually started, which is the caller's signal to hand
     the clock over. Everywhere it returns false — no engine, no voices, the
     switch turned off — the caller carries on typing at its own speed and
     nothing about the scene changes. */
  Voice.prototype.say = function (text) {
    if (!this.enabled || !this.available()) return false;
    const line = String(text || '');
    if (!line.trim()) return false;

    this.cancel();
    /* The plan is made against the spoken form, and the caller's clock runs
       against the written one, so the two are held in step by fraction of
       the way through rather than by character index. */
    this.line = line;
    this.said = this.spoken(line);
    this.chunks = this.plan(this.said);
    if (!this.chunks.length) return false;
    this.scale = line.length / Math.max(1, this.said.length);
    this.i = 0;
    this.at = 0;
    this.aim = 0;
    this.gap = 0;
    this.kick = 0;
    this.done = false;
    this.speaking = true;
    this._speak();
    return true;
  };

  Voice.prototype._speak = function () {
    const c = this.chunks[this.i];
    if (!c) { this.speaking = false; this.done = true; return; }
    const self = this;
    const u = new window.SpeechSynthesisUtterance(c.text);
    u.voice = this.voice;
    if (this.voice && this.voice.lang) u.lang = this.voice.lang;
    u.rate = c.rate;
    u.pitch = c.pitch;
    u.volume = 1;
    this.aim = c.to;
    this.rate = CHARS_PER_SEC * c.rate;

    /* Where the engine has got to. Not every platform sends these — Safari is
       unreliable and some Linux voices send none at all — so they refine an
       estimate rather than being the estimate. */
    u.onboundary = function (e) {
      if (typeof e.charIndex !== 'number') return;
      const to = c.from + e.charIndex;
      if (to > self.at) self.at = Math.min(to, self.aim);
    };
    u.onend = function () {
      if (self._u !== u) return;
      self.at = self.aim;
      self.i++;
      self.gap = c.pause;
      if (self.i >= self.chunks.length) {
        self.speaking = false;
        self.done = true;
        self._u = null;
      } else if (self.gap <= 0) {
        self._speak();
      }
    };
    u.onerror = function () {
      if (self._u !== u) return;
      /* Anything the engine refuses to say ends the whole line rather than
         stalling it: the caller is waiting on this to finish its sentence. */
      self.speaking = false;
      self.done = true;
      self._u = null;
    };

    this._u = u;
    window.speechSynthesis.speak(u);
  };

  Voice.prototype.cancel = function () {
    if (!this.ok) return;
    this._u = null;
    this.chunks = [];
    this.speaking = false;
    this.done = true;
    this.gap = 0;
    try { window.speechSynthesis.cancel(); } catch (e) { /* nothing to stop */ }
  };

  Voice.prototype.setEnabled = function (on) {
    this.enabled = !!on;
    if (!this.enabled) this.cancel();
  };

  /* How far through the written line he has got, in characters. Between the
     engine's reports this runs on the estimate; the reports pull it straight
     whenever they arrive. */
  Voice.prototype.spokenTo = function () {
    return this.at * this.scale;
  };

  Voice.prototype.update = function (dt) {
    if (!this.ok || !this.speaking) return;

    if (this.gap > 0) {
      this.gap -= dt;
      if (this.gap <= 0 && this.i < this.chunks.length) this._speak();
      return;
    }

    /* Fill in between reports, but never run past the end of the sentence in
       progress — overshooting means the mouth is saying a word he has not got
       to yet, which looks worse than lagging. */
    this.at = Math.min(this.aim, this.at + this.rate * dt);

    this.kick += dt;
    if (this.kick >= KICK_EVERY) {
      this.kick = 0;
      /* The fifteen-second bug. Harmless when it is not happening. */
      try {
        window.speechSynthesis.pause();
        window.speechSynthesis.resume();
      } catch (e) { /* not every engine has these */ }
    }
  };

  NG.Voice = Voice;
})(window.NG = window.NG || {});
