// audio.js — everything is synthesised at runtime. No samples, nothing to fetch.
//
// The palette is deliberately woody and dry: struck-bar tones over a low drone, which sits
// closer to a field recording than to an arcade. The one exception is the phase flip, which
// gets the biggest gesture in the game because it is the mechanic the player must never
// lose track of.

const PENT = [0, 2, 4, 7, 9]; // minor-free pentatonic: no interval in it can sound like a mistake

function noteHz(step) {
  const oct = Math.floor(step / PENT.length);
  return 220 * Math.pow(2, (PENT[((step % PENT.length) + PENT.length) % PENT.length] + oct * 12) / 12);
}

export class Audio {
  constructor() {
    this.ctx = null;
    this.enabled = true;
    this.ready = false;
  }

  /** Lazily built, because browsers refuse to start a context outside a user gesture. */
  init() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return;
    }
    const AC = globalThis.AudioContext || globalThis.webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();

    this.master = this.ctx.createGain();
    this.master.gain.value = 0.5;
    this.master.connect(this.ctx.destination);

    // A short synthetic room. Noise with an exponential tail is a crude impulse response,
    // but at this length it reads as air around the tones rather than as an effect.
    this.verb = this.ctx.createConvolver();
    const len = Math.floor(this.ctx.sampleRate * 1.6);
    const ir = this.ctx.createBuffer(2, len, this.ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const d = ir.getChannelData(ch);
      let seed = ch === 0 ? 0x2545f491 : 0x814fd3b7;
      for (let i = 0; i < len; i++) {
        // xorshift keeps the reverb identical between sessions, which matters when the
        // same level is replayed for verification and nothing should differ but the pixels.
        seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5; seed |= 0;
        const r = (seed / 0x7fffffff) % 1;
        d[i] = r * Math.pow(1 - i / len, 2.6);
      }
    }
    this.verb.buffer = ir;

    this.wet = this.ctx.createGain();
    this.wet.gain.value = 0.24;
    this.verb.connect(this.wet);
    this.wet.connect(this.master);

    this.ready = true;
  }

  get t() { return this.ctx.currentTime; }

  /** One struck bar: a sine body with a brief inharmonic knock on the attack. */
  tone(freq, { at = 0, dur = 0.5, gain = 0.3, type = 'sine', send = 0.5, detune = 0 } = {}) {
    if (!this.ready || !this.enabled) return;
    const t0 = this.t + at;
    const o = this.ctx.createOscillator();
    o.type = type;
    o.frequency.value = freq;
    o.detune.value = detune;

    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(gain, t0 + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);

    o.connect(g);
    g.connect(this.master);
    if (send > 0) {
      const s = this.ctx.createGain();
      s.gain.value = send;
      g.connect(s);
      s.connect(this.verb);
    }
    o.start(t0);
    o.stop(t0 + dur + 0.05);
  }

  /** Filtered noise burst — soil, chaff, footfall. */
  noise({ at = 0, dur = 0.18, gain = 0.2, freq = 900, q = 1.2, sweep = 0 } = {}) {
    if (!this.ready || !this.enabled) return;
    const t0 = this.t + at;
    const len = Math.max(1, Math.floor(this.ctx.sampleRate * dur));
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    let seed = 0x9e3779b9;
    for (let i = 0; i < len; i++) {
      seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5; seed |= 0;
      d[i] = ((seed / 0x7fffffff) % 1) * Math.pow(1 - i / len, 1.8);
    }
    const src = this.ctx.createBufferSource();
    src.buffer = buf;

    const f = this.ctx.createBiquadFilter();
    f.type = 'bandpass';
    f.frequency.setValueAtTime(freq, t0);
    if (sweep) f.frequency.exponentialRampToValueAtTime(Math.max(40, freq * sweep), t0 + dur);
    f.Q.value = q;

    const g = this.ctx.createGain();
    g.gain.value = gain;

    src.connect(f); f.connect(g); g.connect(this.master);
    const s = this.ctx.createGain(); s.gain.value = 0.3;
    g.connect(s); s.connect(this.verb);
    src.start(t0);
  }

  step(height = 0) {
    this.noise({ dur: 0.09, gain: 0.11, freq: 380 + height * 40, q: 0.9, sweep: 0.5 });
  }

  blocked() {
    this.noise({ dur: 0.07, gain: 0.14, freq: 190, q: 2.4 });
    this.tone(96, { dur: 0.1, gain: 0.1, type: 'triangle', send: 0.1 });
  }

  land(drop = 1) {
    this.noise({ dur: 0.16, gain: 0.13 + Math.min(0.1, drop * 0.03), freq: 240, q: 0.7, sweep: 0.4 });
  }

  /**
   * The signature sound. Two tones cross in opposite directions — one falls as the other
   * rises — so the ear hears an inversion, matching what the screen does.
   */
  flip(toCultivated) {
    if (!this.ready || !this.enabled) return;
    const t0 = this.t;
    const [a, b] = toCultivated ? [220, 660] : [660, 220];
    for (const [from, to, type] of [[a, b, 'sine'], [a * 1.5, b * 1.5, 'triangle']]) {
      const o = this.ctx.createOscillator();
      o.type = type;
      o.frequency.setValueAtTime(from, t0);
      o.frequency.exponentialRampToValueAtTime(to, t0 + 0.34);
      const g = this.ctx.createGain();
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(0.16, t0 + 0.03);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.4);
      o.connect(g); g.connect(this.master);
      const s = this.ctx.createGain(); s.gain.value = 0.6;
      g.connect(s); s.connect(this.verb);
      o.start(t0); o.stop(t0 + 0.45);
    }
    this.noise({ dur: 0.3, gain: 0.08, freq: toCultivated ? 400 : 1600, q: 0.6, sweep: toCultivated ? 3 : 0.25 });
  }

  seed() {
    this.tone(noteHz(7), { dur: 0.5, gain: 0.2 });
    this.tone(noteHz(9), { at: 0.05, dur: 0.6, gain: 0.14 });
  }

  /** Stepping up onto a past self — a small hollow knock, then the tone a fifth above. */
  mount() {
    this.noise({ dur: 0.1, gain: 0.1, freq: 520, q: 1.6, sweep: 0.7 });
    this.tone(noteHz(6), { at: 0.03, dur: 0.34, gain: 0.13, type: 'triangle', send: 0.4 });
  }

  /** Rising figure — a seed reaching its origin plot. */
  planted(index = 0) {
    for (let i = 0; i < 3; i++) {
      this.tone(noteHz(5 + index + i * 2), { at: i * 0.07, dur: 0.7, gain: 0.17 - i * 0.02 });
    }
  }

  rewind() {
    if (!this.ready || !this.enabled) return;
    const t0 = this.t;
    const o = this.ctx.createOscillator();
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(520, t0);
    o.frequency.exponentialRampToValueAtTime(110, t0 + 0.5);
    const f = this.ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.setValueAtTime(2600, t0);
    f.frequency.exponentialRampToValueAtTime(320, t0 + 0.5);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.12, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.55);
    o.connect(f); f.connect(g); g.connect(this.master);
    const s = this.ctx.createGain(); s.gain.value = 0.5;
    g.connect(s); s.connect(this.verb);
    o.start(t0); o.stop(t0 + 0.6);
  }

  undo() {
    this.tone(noteHz(4), { dur: 0.16, gain: 0.1, type: 'triangle', send: 0.2 });
  }

  win() {
    [0, 2, 4, 7].forEach((s, i) => {
      this.tone(noteHz(s + 5), { at: i * 0.09, dur: 1.5, gain: 0.18, send: 0.8 });
      this.tone(noteHz(s + 10), { at: i * 0.09 + 0.02, dur: 1.2, gain: 0.07, send: 0.8, detune: 4 });
    });
  }

  toggle() {
    this.enabled = !this.enabled;
    return this.enabled;
  }
}
