/**
 * Fully procedural audio — every sound here is synthesised at runtime, so the
 * shipped bundle carries zero audio assets (smaller app, no licensing).
 *
 * The music is a look-ahead scheduled synth loop whose tempo and layer count
 * follow the run's intensity, so the track tightens up as Marcus speeds up.
 */

type Ctx = AudioContext;

const NOTE = (semitonesFromA4: number): number => 440 * Math.pow(2, semitonesFromA4 / 12);

/** F# minor pentatonic, two octaves — moody but bright enough for neon. */
const SCALE = [-15, -12, -10, -8, -5, -3, 0, 2, 4, 7, 9, 12];
const BASS = [-27, -25, -22, -20];

export class AudioEngine {
  private ctx: Ctx | null = null;
  private master: GainNode | null = null;
  private musicBus: GainNode | null = null;
  private sfxBus: GainNode | null = null;
  private noiseBuffer: AudioBuffer | null = null;
  private schedulerId = 0;
  private nextNoteTime = 0;
  private step = 0;
  private bpm = 128;
  private intensity = 0;
  private musicRunning = false;
  private lastSfxAt: Record<string, number> = {};

  sfxEnabled = true;
  musicEnabled = true;

  /** Must be called from a user gesture (iOS unlocks audio only then). */
  unlock(): void {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') void this.ctx.resume();
      return;
    }
    const Ctor: typeof AudioContext | undefined =
      window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return;
    try {
      const ctx = new Ctor({ latencyHint: 'interactive' });
      this.ctx = ctx;
      this.master = ctx.createGain();
      this.master.gain.value = 0.9;
      this.master.connect(ctx.destination);

      // Gentle bus compression keeps the mix punchy when everything fires at once.
      const comp = ctx.createDynamicsCompressor();
      comp.threshold.value = -14;
      comp.knee.value = 22;
      comp.ratio.value = 6;
      comp.attack.value = 0.003;
      comp.release.value = 0.18;
      comp.connect(this.master);

      this.musicBus = ctx.createGain();
      this.musicBus.gain.value = 0;
      this.musicBus.connect(comp);

      this.sfxBus = ctx.createGain();
      this.sfxBus.gain.value = 0.85;
      this.sfxBus.connect(comp);

      const len = Math.floor(ctx.sampleRate * 1.2);
      const buf = ctx.createBuffer(1, len, ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
      this.noiseBuffer = buf;

      void ctx.resume();
    } catch {
      this.ctx = null;
    }
  }

  suspend(): void {
    if (this.ctx && this.ctx.state === 'running') void this.ctx.suspend();
  }

  resume(): void {
    if (this.ctx && this.ctx.state === 'suspended') void this.ctx.resume();
  }

  get ready(): boolean {
    return !!this.ctx && this.ctx.state === 'running';
  }

  private now(): number {
    return this.ctx ? this.ctx.currentTime : 0;
  }

  // ------------------------------------------------------------------ helpers
  private env(target: AudioNode, t: number, peak: number, attack: number, decay: number): GainNode {
    const ctx = this.ctx!;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay);
    g.connect(target);
    return g;
  }

  private tone(
    freq: number,
    t: number,
    dur: number,
    opts: { type?: OscillatorType; gain?: number; sweepTo?: number; detune?: number; bus?: AudioNode } = {},
  ): void {
    const ctx = this.ctx;
    if (!ctx) return;
    const bus = opts.bus ?? this.sfxBus!;
    const osc = ctx.createOscillator();
    osc.type = opts.type ?? 'sawtooth';
    osc.frequency.setValueAtTime(freq, t);
    if (opts.sweepTo) osc.frequency.exponentialRampToValueAtTime(Math.max(20, opts.sweepTo), t + dur);
    if (opts.detune) osc.detune.value = opts.detune;
    const g = this.env(bus, t, opts.gain ?? 0.25, Math.min(0.02, dur * 0.2), dur);
    osc.connect(g);
    osc.start(t);
    osc.stop(t + dur + 0.06);
  }

  private noise(
    t: number,
    dur: number,
    opts: { gain?: number; filter?: BiquadFilterType; freq?: number; sweepTo?: number; q?: number } = {},
  ): void {
    const ctx = this.ctx;
    if (!ctx || !this.noiseBuffer) return;
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    src.loop = true;
    const filter = ctx.createBiquadFilter();
    filter.type = opts.filter ?? 'bandpass';
    filter.frequency.setValueAtTime(opts.freq ?? 1400, t);
    if (opts.sweepTo) filter.frequency.exponentialRampToValueAtTime(Math.max(60, opts.sweepTo), t + dur);
    filter.Q.value = opts.q ?? 1.1;
    const g = this.env(this.sfxBus!, t, opts.gain ?? 0.2, 0.008, dur);
    src.connect(filter);
    filter.connect(g);
    src.start(t);
    src.stop(t + dur + 0.05);
  }

  /** Rate-limits identical sfx so particle-heavy moments don't turn to mush. */
  private gate(key: string, ms: number): boolean {
    const t = this.now() * 1000;
    if (t - (this.lastSfxAt[key] ?? -1e9) < ms) return false;
    this.lastSfxAt[key] = t;
    return true;
  }

  // ------------------------------------------------------------------ sfx
  play(name: SfxName, param = 0): void {
    if (!this.sfxEnabled || !this.ctx) return;
    const t = this.now() + 0.001;
    switch (name) {
      case 'jump':
        if (!this.gate('jump', 60)) return;
        this.noise(t, 0.18, { filter: 'highpass', freq: 420, sweepTo: 2600, gain: 0.12 });
        this.tone(300, t, 0.16, { type: 'triangle', gain: 0.18, sweepTo: 720 });
        break;
      case 'land':
        if (!this.gate('land', 70)) return;
        this.noise(t, 0.1, { filter: 'lowpass', freq: 900, sweepTo: 200, gain: 0.14 });
        this.tone(140, t, 0.09, { type: 'sine', gain: 0.2, sweepTo: 70 });
        break;
      case 'vault':
        this.tone(180, t, 0.1, { type: 'square', gain: 0.16, sweepTo: 420 });
        this.noise(t + 0.01, 0.16, { filter: 'bandpass', freq: 1800, sweepTo: 5200, gain: 0.16, q: 0.8 });
        this.tone(660, t + 0.03, 0.18, { type: 'triangle', gain: 0.12, sweepTo: 1320 });
        break;
      case 'perfect':
        for (let i = 0; i < 3; i++) {
          this.tone(NOTE(SCALE[6 + i * 2]) * 2, t + i * 0.045, 0.2, { type: 'triangle', gain: 0.15 });
        }
        break;
      case 'dive':
        this.noise(t, 0.26, { filter: 'bandpass', freq: 2600, sweepTo: 300, gain: 0.16, q: 0.7 });
        this.tone(520, t, 0.2, { type: 'sawtooth', gain: 0.1, sweepTo: 160 });
        break;
      case 'slide':
        if (!this.gate('slide', 220)) return;
        this.noise(t, 0.32, { filter: 'bandpass', freq: 900, sweepTo: 1500, gain: 0.09, q: 2.4 });
        break;
      case 'shatter':
        this.noise(t, 0.34, { filter: 'highpass', freq: 2400, gain: 0.22 });
        for (let i = 0; i < 6; i++) {
          this.tone(1400 + Math.random() * 2600, t + Math.random() * 0.08, 0.16, {
            type: 'triangle',
            gain: 0.07,
          });
        }
        break;
      case 'shard': {
        const chain = Math.min(param, 24);
        const f = NOTE(SCALE[chain % SCALE.length]) * 2;
        this.tone(f, t, 0.11, { type: 'triangle', gain: 0.14 });
        this.tone(f * 2.01, t, 0.08, { type: 'sine', gain: 0.07 });
        break;
      }
      case 'core':
        for (let i = 0; i < 4; i++) {
          this.tone(NOTE(SCALE[4 + i * 2]) * 2, t + i * 0.06, 0.3, { type: 'triangle', gain: 0.16 });
        }
        break;
      case 'power':
        this.tone(220, t, 0.5, { type: 'sawtooth', gain: 0.16, sweepTo: 1760 });
        this.noise(t, 0.5, { filter: 'highpass', freq: 300, sweepTo: 6000, gain: 0.1 });
        break;
      case 'flow':
        for (let i = 0; i < 5; i++) {
          this.tone(NOTE(SCALE[i * 2]) * 2, t + i * 0.05, 0.7, { type: 'triangle', gain: 0.13 });
        }
        this.noise(t, 0.9, { filter: 'bandpass', freq: 400, sweepTo: 5200, gain: 0.09, q: 0.6 });
        break;
      case 'hit':
        this.noise(t, 0.4, { filter: 'lowpass', freq: 2400, sweepTo: 120, gain: 0.3 });
        this.tone(180, t, 0.5, { type: 'square', gain: 0.22, sweepTo: 40 });
        break;
      case 'shield':
        this.tone(880, t, 0.3, { type: 'sine', gain: 0.18, sweepTo: 220 });
        this.noise(t, 0.3, { filter: 'bandpass', freq: 3000, sweepTo: 800, gain: 0.12 });
        break;
      case 'ui':
        this.tone(660, t, 0.07, { type: 'square', gain: 0.07 });
        break;
      case 'buy':
        this.tone(NOTE(0), t, 0.14, { type: 'triangle', gain: 0.14 });
        this.tone(NOTE(7), t + 0.08, 0.22, { type: 'triangle', gain: 0.14 });
        break;
      case 'deny':
        this.tone(180, t, 0.16, { type: 'square', gain: 0.12, sweepTo: 90 });
        break;
      case 'countdown':
        this.tone(param > 0 ? 520 : 880, t, 0.16, { type: 'triangle', gain: 0.16 });
        break;
    }
  }

  // ------------------------------------------------------------------ music
  startMusic(): void {
    if (!this.ctx || !this.musicBus || this.musicRunning || !this.musicEnabled) return;
    this.musicRunning = true;
    this.step = 0;
    this.nextNoteTime = this.now() + 0.1;
    this.musicBus.gain.cancelScheduledValues(this.now());
    this.musicBus.gain.setValueAtTime(0.0001, this.now());
    this.musicBus.gain.linearRampToValueAtTime(0.42, this.now() + 1.4);
    this.schedulerId = window.setInterval(this.schedule, 25);
  }

  stopMusic(fade = 0.7): void {
    if (!this.musicRunning) return;
    this.musicRunning = false;
    window.clearInterval(this.schedulerId);
    if (this.musicBus && this.ctx) {
      const t = this.now();
      this.musicBus.gain.cancelScheduledValues(t);
      this.musicBus.gain.setValueAtTime(this.musicBus.gain.value, t);
      this.musicBus.gain.linearRampToValueAtTime(0.0001, t + fade);
    }
  }

  /** 0..1 — drives tempo and how many layers are audible. */
  setIntensity(v: number): void {
    this.intensity = Math.max(0, Math.min(1, v));
    this.bpm = 124 + this.intensity * 32;
  }

  private schedule = (): void => {
    if (!this.ctx || !this.musicRunning) return;
    const secondsPerStep = 60 / this.bpm / 4;
    while (this.nextNoteTime < this.now() + 0.12) {
      this.emitStep(this.step, this.nextNoteTime);
      this.nextNoteTime += secondsPerStep;
      this.step = (this.step + 1) % 64;
    }
  };

  private emitStep(step: number, t: number): void {
    const bus = this.musicBus!;
    const i = this.intensity;
    const bar = Math.floor(step / 16);

    // Kick — the spine of the track, always on.
    if (step % 4 === 0) {
      const g = this.env(bus, t, 0.6, 0.004, 0.16);
      const osc = this.ctx!.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(150, t);
      osc.frequency.exponentialRampToValueAtTime(44, t + 0.14);
      osc.connect(g);
      osc.start(t);
      osc.stop(t + 0.22);
    }

    // Hats — density rises with intensity.
    if (step % 2 === 1 || (i > 0.45 && step % 2 === 0)) {
      const src = this.ctx!.createBufferSource();
      src.buffer = this.noiseBuffer!;
      src.loop = true;
      const hp = this.ctx!.createBiquadFilter();
      hp.type = 'highpass';
      hp.frequency.value = 7000;
      const g = this.env(bus, t, step % 4 === 2 ? 0.14 : 0.07, 0.002, 0.04);
      src.connect(hp);
      hp.connect(g);
      src.start(t);
      src.stop(t + 0.08);
    }

    // Bass — walking root every 8th.
    if (step % 2 === 0) {
      const root = BASS[bar % BASS.length];
      const g = this.env(bus, t, 0.26, 0.01, 0.2);
      const osc = this.ctx!.createOscillator();
      osc.type = 'sawtooth';
      const lp = this.ctx!.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.setValueAtTime(320 + i * 900, t);
      lp.Q.value = 6;
      osc.frequency.value = NOTE(root + (step % 8 === 6 ? 3 : 0));
      osc.connect(lp);
      lp.connect(g);
      osc.start(t);
      osc.stop(t + 0.3);
    }

    // Arp lead — only once the run has some momentum.
    if (i > 0.18 && step % 2 === 1) {
      const idx = (step * 3 + bar * 2) % SCALE.length;
      const g = this.env(bus, t, 0.1 + i * 0.09, 0.006, 0.16);
      const osc = this.ctx!.createOscillator();
      osc.type = 'square';
      osc.frequency.value = NOTE(SCALE[idx] + 12);
      const dly = this.ctx!.createDelay(0.5);
      dly.delayTime.value = (60 / this.bpm / 4) * 3;
      const fb = this.ctx!.createGain();
      fb.gain.value = 0.28;
      osc.connect(g);
      g.connect(dly);
      dly.connect(fb);
      fb.connect(dly);
      dly.connect(bus);
      osc.start(t);
      osc.stop(t + 0.22);
    }

    // Pad swell on bar changes when the player is deep into a run.
    if (i > 0.55 && step % 16 === 0) {
      const g = this.env(bus, t, 0.09, 0.35, 1.2);
      for (const off of [0, 7, 12]) {
        const osc = this.ctx!.createOscillator();
        osc.type = 'triangle';
        osc.frequency.value = NOTE(BASS[bar % BASS.length] + 12 + off);
        osc.detune.value = (Math.random() - 0.5) * 12;
        osc.connect(g);
        osc.start(t);
        osc.stop(t + 1.6);
      }
    }
  }
}

export type SfxName =
  | 'jump'
  | 'land'
  | 'vault'
  | 'perfect'
  | 'dive'
  | 'slide'
  | 'shatter'
  | 'shard'
  | 'core'
  | 'power'
  | 'flow'
  | 'hit'
  | 'shield'
  | 'ui'
  | 'buy'
  | 'deny'
  | 'countdown';

export const audio = new AudioEngine();
