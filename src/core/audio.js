// A tiny chiptune engine: three synth voices (pulse, triangle-ish, noise) plus a
// look-ahead scheduler. Everything is generated at runtime — no audio assets.

const NOTE_OFFSET = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

function noteFreq(name) {
  if (!name || name === '-') return 0;
  const m = /^([A-G])([#b]?)(-?\d)$/.exec(name);
  if (!m) return 0;
  let semi = NOTE_OFFSET[m[1]];
  if (m[2] === '#') semi += 1;
  if (m[2] === 'b') semi -= 1;
  const midi = (parseInt(m[3], 10) + 1) * 12 + semi;
  return 440 * Math.pow(2, (midi - 69) / 12);
}

/** "C4:4 - E4:2" -> [{f, steps}, ...] */
function parsePattern(str) {
  const out = [];
  for (const tok of str.trim().split(/\s+/)) {
    if (!tok) continue;
    const [pitch, len] = tok.split(':');
    out.push({ f: noteFreq(pitch), steps: len ? parseInt(len, 10) : 4 });
  }
  return out;
}

class Audio {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.musicGain = null;
    this.sfxGain = null;
    this.muted = false;
    this.track = null;
    this.trackName = null;
    this.voices = [];
    this.timer = null;
    this.noiseBuf = null;
    this.startTime = 0;
    this.stepDur = 0.125;
    this.stepIndex = 0;
    this.pendingTrack = null;
    this.fadeTo = null;
  }

  init() {
    if (this.ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.5;

    // Gentle master shaping so square waves aren't harsh.
    const lp = this.ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 7200;
    lp.Q.value = 0.4;
    this.master.connect(lp);
    lp.connect(this.ctx.destination);

    // Short slap-back delay adds a bit of GBA speaker character.
    const delay = this.ctx.createDelay(0.5);
    delay.delayTime.value = 0.19;
    const fb = this.ctx.createGain();
    fb.gain.value = 0.22;
    const send = this.ctx.createGain();
    send.gain.value = 0.16;
    delay.connect(fb);
    fb.connect(delay);
    delay.connect(lp);
    this.delaySend = send;
    send.connect(delay);

    this.musicGain = this.ctx.createGain();
    this.musicGain.gain.value = 0.62;
    this.musicGain.connect(this.master);
    this.musicGain.connect(send);

    this.sfxGain = this.ctx.createGain();
    this.sfxGain.gain.value = 0.9;
    this.sfxGain.connect(this.master);

    // Noise source buffer for percussion / hit effects.
    const len = this.ctx.sampleRate * 1.2;
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    let s = 1;
    for (let i = 0; i < len; i++) {
      s = (s * 1103515245 + 12345) & 0x7fffffff;
      data[i] = (s / 0x3fffffff) - 1;
    }
    this.noiseBuf = buf;

    this.timer = setInterval(() => this._schedule(), 25);
  }

  resume() {
    this.init();
    if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
  }

  setMuted(m) {
    this.muted = m;
    if (this.master) this.master.gain.value = m ? 0 : 0.5;
  }
  toggleMute() {
    this.setMuted(!this.muted);
    return this.muted;
  }

  // ---- oscillator helpers --------------------------------------------------
  _osc(type, freq, t, dur, gainVal, dest, opts = {}) {
    const ctx = this.ctx;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    if (type === 'pulse') {
      // Approximate a 25% pulse with a custom periodic wave.
      o.setPeriodicWave(this._pulseWave(opts.duty ?? 0.25));
    } else {
      o.type = type;
    }
    o.frequency.setValueAtTime(Math.max(20, freq), t);
    if (opts.slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, freq * opts.slide), t + dur);
    if (opts.vibrato) {
      const lfo = ctx.createOscillator();
      const lg = ctx.createGain();
      lfo.frequency.value = 6.2;
      lg.gain.value = freq * 0.011;
      lfo.connect(lg);
      lg.connect(o.frequency);
      lfo.start(t + 0.09);
      lfo.stop(t + dur);
    }
    const a = opts.attack ?? 0.006;
    const rel = opts.release ?? 0.05;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(gainVal, t + a);
    g.gain.setValueAtTime(gainVal, t + Math.max(a, dur - rel));
    g.gain.exponentialRampToValueAtTime(0.0008, t + dur);
    o.connect(g);
    g.connect(dest);
    o.start(t);
    o.stop(t + dur + 0.02);
    return o;
  }

  _pulseWave(duty) {
    this._waves = this._waves || {};
    const key = duty.toFixed(2);
    if (this._waves[key]) return this._waves[key];
    const n = 32;
    const real = new Float32Array(n);
    const imag = new Float32Array(n);
    for (let i = 1; i < n; i++) {
      imag[i] = (2 / (i * Math.PI)) * Math.sin(Math.PI * i * duty);
    }
    const w = this.ctx.createPeriodicWave(real, imag, { disableNormalization: false });
    this._waves[key] = w;
    return w;
  }

  _noise(t, dur, gainVal, dest, freq = 1400, q = 1, type = 'bandpass') {
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuf;
    src.loop = true;
    const f = this.ctx.createBiquadFilter();
    f.type = type;
    f.frequency.setValueAtTime(freq, t);
    f.frequency.exponentialRampToValueAtTime(Math.max(120, freq * 0.35), t + dur);
    f.Q.value = q;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(gainVal, t);
    g.gain.exponentialRampToValueAtTime(0.0008, t + dur);
    src.connect(f);
    f.connect(g);
    g.connect(dest);
    src.start(t);
    src.stop(t + dur + 0.02);
  }

  // ---- music ---------------------------------------------------------------
  playMusic(name, { restart = false } = {}) {
    this.init();
    if (!this.ctx) return;
    if (this.trackName === name && !restart) return;
    const track = TRACKS[name];
    if (!track) return;
    this.trackName = name;
    this.track = {
      bpm: track.bpm,
      voices: track.voices.map((v) => ({ ...v, notes: parsePattern(v.pattern) })),
    };
    this.stepDur = 60 / track.bpm / 4;
    this.startTime = this.ctx.currentTime + 0.06;
    // Pre-compute each voice's total length in steps for looping.
    for (const v of this.track.voices) {
      v.len = v.notes.reduce((a, n) => a + n.steps, 0);
      v.cursor = 0;      // step position of the next note
      v.index = 0;       // note index
      v.loops = 0;
    }
    this.trackLen = Math.max(...this.track.voices.map((v) => v.len));
  }

  stopMusic() {
    this.track = null;
    this.trackName = null;
  }

  _schedule() {
    if (!this.ctx || !this.track) return;
    const ahead = this.ctx.currentTime + 0.3;
    for (const v of this.track.voices) {
      let guard = 0;
      while (guard++ < 64) {
        const when = this.startTime + (v.cursor + v.loops * this.trackLen) * this.stepDur;
        if (when > ahead) break;
        const note = v.notes[v.index];
        if (!note) break;
        const dur = note.steps * this.stepDur;
        if (note.f > 0 && when >= this.ctx.currentTime - 0.05) {
          this._playVoiceNote(v, note.f, when, dur);
        }
        v.cursor += note.steps;
        v.index++;
        if (v.index >= v.notes.length) {
          v.index = 0;
          v.cursor = 0;
          v.loops++;
        }
      }
    }
  }

  _playVoiceNote(v, f, when, dur) {
    const g = this.musicGain;
    const vol = (v.vol ?? 0.2) * 0.9;
    const gate = Math.min(dur * (v.gate ?? 0.86), dur);
    if (v.type === 'noise') {
      this._noise(when, gate, vol, g, v.nf ?? 2400, 1.4);
    } else if (v.type === 'pulse') {
      this._osc('pulse', f, when, gate, vol, g, { duty: v.duty ?? 0.25, vibrato: v.vibrato, attack: 0.004 });
    } else {
      this._osc(v.type || 'triangle', f, when, gate, vol, g, { attack: 0.008 });
    }
  }

  // ---- sfx -----------------------------------------------------------------
  sfx(name) {
    this.init();
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime + 0.001;
    const g = this.sfxGain;
    switch (name) {
      case 'cursor':
        this._osc('pulse', 1180, t, 0.045, 0.16, g, { duty: 0.5 });
        break;
      case 'select':
        this._osc('pulse', 820, t, 0.05, 0.18, g, { duty: 0.5 });
        this._osc('pulse', 1240, t + 0.045, 0.07, 0.16, g, { duty: 0.5 });
        break;
      case 'cancel':
        this._osc('pulse', 620, t, 0.06, 0.16, g, { duty: 0.5, slide: 0.7 });
        break;
      case 'bump':
        this._osc('square', 180, t, 0.09, 0.14, g, { slide: 0.6 });
        break;
      case 'menu':
        this._osc('pulse', 540, t, 0.04, 0.13, g, { duty: 0.5 });
        this._osc('pulse', 900, t + 0.04, 0.06, 0.13, g, { duty: 0.5 });
        break;
      case 'door':
        this._noise(t, 0.22, 0.12, g, 900, 0.8);
        this._osc('triangle', 300, t, 0.2, 0.1, g, { slide: 0.5 });
        break;
      case 'ledge':
        this._osc('pulse', 420, t, 0.12, 0.16, g, { duty: 0.5, slide: 2.1 });
        break;
      case 'grass':
        this._noise(t, 0.13, 0.1, g, 3600, 0.9);
        break;
      case 'item':
        [660, 880, 1320].forEach((f, i) => this._osc('pulse', f, t + i * 0.075, 0.1, 0.16, g, { duty: 0.25 }));
        break;
      case 'heal':
        [523, 659, 784, 1046].forEach((f, i) => this._osc('triangle', f, t + i * 0.1, 0.18, 0.2, g));
        break;
      case 'save':
        [784, 988, 1175].forEach((f, i) => this._osc('pulse', f, t + i * 0.09, 0.14, 0.15, g, { duty: 0.5 }));
        break;
      case 'levelup':
        [523, 659, 784, 1046, 1318].forEach((f, i) =>
          this._osc('pulse', f, t + i * 0.07, 0.16, 0.18, g, { duty: 0.25 }));
        break;
      case 'hit':
        this._noise(t, 0.14, 0.22, g, 1500, 0.7);
        this._osc('square', 220, t, 0.1, 0.12, g, { slide: 0.5 });
        break;
      case 'hit_weak':
        this._noise(t, 0.1, 0.14, g, 900, 0.8);
        break;
      case 'hit_super':
        this._noise(t, 0.26, 0.3, g, 2600, 0.6);
        this._osc('square', 320, t, 0.22, 0.16, g, { slide: 0.35 });
        break;
      case 'stat_up':
        this._osc('pulse', 400, t, 0.26, 0.15, g, { duty: 0.25, slide: 2.4 });
        break;
      case 'stat_down':
        this._osc('pulse', 900, t, 0.26, 0.15, g, { duty: 0.25, slide: 0.42 });
        break;
      case 'faint':
        this._osc('pulse', 700, t, 0.55, 0.18, g, { duty: 0.5, slide: 0.22 });
        break;
      case 'throw':
        this._osc('pulse', 300, t, 0.2, 0.14, g, { duty: 0.5, slide: 2.6 });
        this._noise(t + 0.16, 0.08, 0.12, g, 2000, 1);
        break;
      case 'click':
        this._osc('square', 1500, t, 0.035, 0.2, g);
        this._noise(t, 0.05, 0.1, g, 3000, 1.6);
        break;
      case 'caught':
        [659, 784, 988, 1318].forEach((f, i) =>
          this._osc('pulse', f, t + i * 0.13, 0.24, 0.2, g, { duty: 0.25 }));
        break;
      case 'break':
        this._noise(t, 0.28, 0.2, g, 1800, 0.7);
        this._osc('square', 500, t, 0.2, 0.14, g, { slide: 0.4 });
        break;
      case 'encounter':
        for (let i = 0; i < 6; i++) {
          this._osc('square', 200 + i * 90, t + i * 0.055, 0.06, 0.16, g);
        }
        break;
      case 'flee':
        this._osc('pulse', 900, t, 0.22, 0.14, g, { duty: 0.5, slide: 0.35 });
        break;
      default:
        break;
    }
  }
}

// ---- soundtrack -------------------------------------------------------------
// Voices: lead (pulse), harmony (pulse, wider duty), bass (triangle), drums (noise).
const TRACKS = {
  title: {
    bpm: 96,
    voices: [
      { type: 'pulse', duty: 0.25, vol: 0.17, vibrato: true, pattern:
        'F4:6 A4:2 C5:8  D5:6 C5:2 A4:8  G4:6 A4:2 C5:8  A4:8 F4:8 ' +
        'F4:6 A4:2 C5:8  E5:6 D5:2 C5:8  D5:4 C5:4 A4:4 G4:4  F4:16' },
      { type: 'pulse', duty: 0.5, vol: 0.08, pattern:
        'C4:8 F4:8  F4:8 F4:8  E4:8 E4:8  C4:8 C4:8 ' +
        'C4:8 F4:8  A4:8 A4:8  A4:8 G4:8  F4:16' },
      { type: 'triangle', vol: 0.22, pattern:
        'F2:4 F3:4 F2:4 C3:4  D2:4 D3:4 D2:4 A2:4  C2:4 C3:4 C2:4 G2:4  F2:4 F3:4 C3:4 C3:4 ' +
        'F2:4 F3:4 F2:4 C3:4  A2:4 A3:4 A2:4 E3:4  Bb2:4 Bb3:4 C3:4 C3:4  F2:8 F2:8' },
    ],
  },
  town: {
    bpm: 118,
    voices: [
      { type: 'pulse', duty: 0.25, vol: 0.15, pattern:
        'C5:4 E5:4 G5:4 E5:4  F5:4 E5:4 D5:8  C5:4 D5:4 E5:4 G5:4  A5:6 G5:2 E5:8 ' +
        'F5:4 A5:4 G5:4 E5:4  D5:4 E5:4 C5:8  G4:4 A4:4 B4:4 D5:4  C5:16' },
      { type: 'pulse', duty: 0.5, vol: 0.07, pattern:
        'E4:4 G4:4 C5:4 G4:4  A4:4 G4:4 F4:8  E4:4 F4:4 G4:4 B4:4  C5:8 G4:8 ' +
        'A4:4 C5:4 B4:4 G4:4  F4:4 G4:4 E4:8  B3:4 C4:4 D4:4 F4:4  E4:16' },
      { type: 'triangle', vol: 0.2, pattern:
        'C3:4 C2:4 G2:4 C2:4  F2:4 F3:4 C3:4 C2:4  C3:4 C2:4 G2:4 G3:4  A2:4 A3:4 E3:4 E2:4 ' +
        'F2:4 F3:4 C3:4 C2:4  G2:4 G3:4 D3:4 G2:4  G2:4 G3:4 D3:4 F3:4  C3:8 C2:8' },
      { type: 'noise', nf: 5200, vol: 0.045, gate: 0.4, pattern:
        '-:4 C5:2 -:2 C5:4 C5:2 -:2  -:4 C5:2 -:2 C5:4 C5:4  -:4 C5:2 -:2 C5:4 C5:2 -:2  -:4 C5:4 C5:4 C5:4 ' +
        '-:4 C5:2 -:2 C5:4 C5:2 -:2  -:4 C5:2 -:2 C5:4 C5:4  -:4 C5:2 -:2 C5:4 C5:2 -:2  -:4 C5:4 C5:4 C5:4' },
    ],
  },
  route: {
    bpm: 132,
    voices: [
      { type: 'pulse', duty: 0.25, vol: 0.15, pattern:
        'G4:2 A4:2 B4:4 D5:4 B4:4  A4:4 G4:4 E4:8  G4:2 A4:2 B4:4 D5:4 G5:4  F#5:6 D5:2 D5:8 ' +
        'E5:4 D5:4 B4:4 A4:4  G4:4 A4:4 B4:8  D5:4 B4:4 A4:4 F#4:4  G4:16' },
      { type: 'pulse', duty: 0.125, vol: 0.06, pattern:
        'D4:8 G4:8  D4:8 C4:8  B3:8 D4:8  A3:8 D4:8 ' +
        'C4:8 B3:8  D4:8 D4:8  B3:8 D4:8  G3:16' },
      { type: 'triangle', vol: 0.21, pattern:
        'G2:4 G3:4 D3:4 G2:4  C3:4 C2:4 G2:4 C3:4  G2:4 D3:4 G3:4 D3:4  D2:4 D3:4 A2:4 A3:4 ' +
        'C3:4 C2:4 G2:4 E3:4  G2:4 G3:4 D3:4 B2:4  D3:4 D2:4 A2:4 D3:4  G2:8 G3:8' },
      { type: 'noise', nf: 4600, vol: 0.05, gate: 0.35, pattern:
        'C5:4 -:2 C5:2 C5:4 C5:4  C5:4 -:2 C5:2 C5:4 C5:2 C5:2  C5:4 -:2 C5:2 C5:4 C5:4  C5:4 C5:4 C5:2 C5:2 C5:4 ' +
        'C5:4 -:2 C5:2 C5:4 C5:4  C5:4 -:2 C5:2 C5:4 C5:2 C5:2  C5:4 -:2 C5:2 C5:4 C5:4  C5:4 C5:4 C5:4 C5:4' },
    ],
  },
  battle: {
    bpm: 152,
    voices: [
      { type: 'pulse', duty: 0.25, vol: 0.16, pattern:
        'A4:2 A4:2 E5:2 A4:2 C5:4 B4:4  A4:2 A4:2 E5:2 A4:2 D5:4 C5:4  ' +
        'B4:2 B4:2 F5:2 B4:2 D5:4 C5:4  E5:4 D5:4 C5:4 B4:4  ' +
        'A4:2 A4:2 E5:2 A4:2 C5:4 B4:4  C5:2 C5:2 G5:2 C5:2 E5:4 D5:4  ' +
        'F5:4 E5:4 D5:4 C5:4  B4:4 E5:4 A5:8' },
      { type: 'pulse', duty: 0.5, vol: 0.07, pattern:
        'C4:4 C4:4 E4:4 E4:4  C4:4 C4:4 F4:4 E4:4  ' +
        'D4:4 D4:4 F4:4 E4:4  G4:4 F4:4 E4:4 D4:4  ' +
        'C4:4 C4:4 E4:4 E4:4  E4:4 E4:4 G4:4 F4:4  ' +
        'A4:4 G4:4 F4:4 E4:4  D4:4 G4:4 C5:8' },
      { type: 'triangle', vol: 0.23, pattern:
        'A2:2 A2:2 A2:2 A3:2 E3:4 A2:4  A2:2 A2:2 A2:2 A3:2 F3:4 E3:4  ' +
        'G2:2 G2:2 G2:2 G3:2 D3:4 G2:4  E3:4 E2:4 E3:4 E2:4  ' +
        'A2:2 A2:2 A2:2 A3:2 E3:4 A2:4  C3:2 C3:2 C3:2 C4:2 G3:4 C3:4  ' +
        'F3:4 F2:4 D3:4 D2:4  E3:4 E2:4 A2:8' },
      { type: 'noise', nf: 5600, vol: 0.06, gate: 0.3, pattern:
        'C5:2 C5:2 C5:2 C5:2 C5:2 C5:2 C5:2 C5:2  C5:2 C5:2 C5:2 C5:2 C5:2 C5:2 C5:2 C5:2  ' +
        'C5:2 C5:2 C5:2 C5:2 C5:2 C5:2 C5:2 C5:2  C5:2 C5:2 C5:2 C5:2 C5:4 C5:4  ' +
        'C5:2 C5:2 C5:2 C5:2 C5:2 C5:2 C5:2 C5:2  C5:2 C5:2 C5:2 C5:2 C5:2 C5:2 C5:2 C5:2  ' +
        'C5:2 C5:2 C5:2 C5:2 C5:2 C5:2 C5:2 C5:2  C5:4 C5:4 C5:4 C5:4' },
    ],
  },
  boss: {
    bpm: 160,
    voices: [
      { type: 'pulse', duty: 0.125, vol: 0.16, pattern:
        'D5:2 D5:2 A4:2 D5:2 F5:4 E5:4  D5:2 D5:2 A4:2 D5:2 G5:4 F5:4  ' +
        'E5:2 E5:2 B4:2 E5:2 G5:4 F5:4  A5:4 G5:4 F5:4 E5:4  ' +
        'D5:2 D5:2 A4:2 D5:2 F5:4 E5:4  F5:2 F5:2 C5:2 F5:2 A5:4 G5:4  ' +
        'Bb5:4 A5:4 G5:4 F5:4  E5:8 D5:8' },
      { type: 'pulse', duty: 0.5, vol: 0.07, pattern:
        'F4:4 F4:4 A4:4 A4:4  F4:4 F4:4 Bb4:4 A4:4  ' +
        'G4:4 G4:4 Bb4:4 A4:4  C5:4 Bb4:4 A4:4 G4:4  ' +
        'F4:4 F4:4 A4:4 A4:4  A4:4 A4:4 C5:4 Bb4:4  ' +
        'D5:4 C5:4 Bb4:4 A4:4  G4:8 F4:8' },
      { type: 'triangle', vol: 0.24, pattern:
        'D2:2 D2:2 D2:2 D3:2 A2:4 D2:4  D2:2 D2:2 D2:2 D3:2 Bb2:4 A2:4  ' +
        'C3:2 C3:2 C3:2 C2:2 G2:4 C3:4  A2:4 A3:4 A2:4 A3:4  ' +
        'D2:2 D2:2 D2:2 D3:2 A2:4 D2:4  F2:2 F2:2 F2:2 F3:2 C3:4 F2:4  ' +
        'Bb2:4 Bb3:4 G2:4 G3:4  A2:8 D2:8' },
      { type: 'noise', nf: 6000, vol: 0.065, gate: 0.28, pattern:
        'C5:2 C5:2 C5:2 C5:2 C5:2 C5:2 C5:2 C5:2  C5:2 C5:2 C5:2 C5:2 C5:2 C5:2 C5:2 C5:2  ' +
        'C5:2 C5:2 C5:2 C5:2 C5:2 C5:2 C5:2 C5:2  C5:2 C5:2 C5:2 C5:2 C5:2 C5:2 C5:2 C5:2  ' +
        'C5:2 C5:2 C5:2 C5:2 C5:2 C5:2 C5:2 C5:2  C5:2 C5:2 C5:2 C5:2 C5:2 C5:2 C5:2 C5:2  ' +
        'C5:2 C5:2 C5:2 C5:2 C5:2 C5:2 C5:2 C5:2  C5:4 C5:4 C5:4 C5:4' },
    ],
  },
  cave: {
    bpm: 88,
    voices: [
      { type: 'pulse', duty: 0.125, vol: 0.11, vibrato: true, pattern:
        'A4:8 C5:4 B4:4  A4:8 E4:8  F4:8 E4:4 D4:4  E4:16 ' +
        'A4:8 C5:4 E5:4  D5:8 C5:8  B4:8 G4:4 A4:4  A4:16' },
      { type: 'triangle', vol: 0.2, pattern:
        'A2:8 A2:8  E2:8 E2:8  F2:8 F2:8  E2:8 E2:8 ' +
        'A2:8 A2:8  C3:8 C3:8  G2:8 G2:8  A2:16' },
      { type: 'pulse', duty: 0.5, vol: 0.045, pattern:
        'E4:16  B3:16  C4:16  B3:16  E4:16  G4:16  D4:16  E4:16' },
    ],
  },
  hall: {
    bpm: 108,
    voices: [
      { type: 'pulse', duty: 0.25, vol: 0.13, pattern:
        'G4:4 C5:4 E5:4 D5:4  C5:8 G4:8  A4:4 D5:4 F5:4 E5:4  D5:16 ' +
        'E5:4 D5:4 C5:4 B4:4  A4:4 B4:4 C5:8  D5:4 B4:4 G4:4 A4:4  C5:16' },
      { type: 'triangle', vol: 0.19, pattern:
        'C3:4 C2:4 G2:4 C3:4  F2:4 F3:4 C3:4 C3:4  D3:4 D2:4 A2:4 D3:4  G2:4 G3:4 D3:4 D3:4 ' +
        'C3:4 C2:4 G2:4 E3:4  F2:4 F3:4 C3:4 C3:4  G2:4 G3:4 D3:4 B2:4  C3:8 C2:8' },
    ],
  },
  victory: {
    bpm: 140,
    voices: [
      { type: 'pulse', duty: 0.25, vol: 0.18, pattern:
        'C5:2 C5:2 C5:2 C5:6 G4:6 A4:2 C5:4 -:4  ' +
        'C5:2 D5:2 E5:2 F5:6 G5:8 -:4' },
      { type: 'triangle', vol: 0.22, pattern:
        'C3:2 C3:2 C3:2 C3:6 C3:6 C3:2 C3:4 -:4  ' +
        'F2:4 F3:4 G2:4 G3:4  C3:8 C2:8' },
    ],
  },
};

export const audio = new Audio();
