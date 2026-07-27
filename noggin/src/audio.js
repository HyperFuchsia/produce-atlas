/* NOGGIN — fully procedural audio. No assets: every sound is synthesised from
   oscillators and a shared noise buffer, so the whole thing stays a handful of
   text files. */
(function (NG) {
  'use strict';

  function Audio() {
    this.ctx = null;
    this.enabled = true;
    this.ready = false;
    this.master = null;
    this.noiseBuffer = null;
    this.stretch = null;
  }

  Audio.prototype.init = function () {
    if (this.ready) return true;
    const Ctor = window.AudioContext || window.webkitAudioContext;
    if (!Ctor) return false;
    try {
      this.ctx = new Ctor();
    } catch (e) {
      return false;
    }
    const ctx = this.ctx;

    this.master = ctx.createGain();
    this.master.gain.value = this.enabled ? 0.75 : 0.0;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -14;
    comp.ratio.value = 6;
    comp.attack.value = 0.004;
    comp.release.value = 0.18;
    this.master.connect(comp);
    comp.connect(ctx.destination);

    /* One second of white noise, reused by every percussive sound. */
    const len = Math.floor(ctx.sampleRate);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    this.noiseBuffer = buf;

    /* Continuous voice driven by how far the face is being pulled. */
    const g = ctx.createGain();
    g.gain.value = 0;
    const filt = ctx.createBiquadFilter();
    filt.type = 'lowpass';
    filt.frequency.value = 400;
    filt.Q.value = 6;
    const oscA = ctx.createOscillator();
    oscA.type = 'sawtooth';
    oscA.frequency.value = 90;
    const oscB = ctx.createOscillator();
    oscB.type = 'triangle';
    oscB.frequency.value = 90 * 1.005;
    oscA.connect(filt);
    oscB.connect(filt);
    filt.connect(g);
    g.connect(this.master);
    oscA.start();
    oscB.start();
    this.stretch = { gain: g, filter: filt, oscA: oscA, oscB: oscB };

    this.ready = true;
    return true;
  };

  Audio.prototype.resume = function () {
    if (!this.ready) this.init();
    if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
  };

  Audio.prototype.setEnabled = function (on) {
    this.enabled = on;
    if (this.master) {
      this.master.gain.setTargetAtTime(on ? 0.75 : 0.0, this.ctx.currentTime, 0.02);
    }
  };

  /* amount: 0..1 normalised pull distance. */
  Audio.prototype.setStretch = function (amount, active) {
    if (!this.ready) return;
    const t = this.ctx.currentTime;
    const s = this.stretch;
    const a = Math.max(0, Math.min(1, amount));
    const target = active ? 0.035 + a * 0.10 : 0;
    s.gain.gain.setTargetAtTime(target, t, 0.05);
    s.filter.frequency.setTargetAtTime(320 + a * 2600, t, 0.05);
    s.oscA.frequency.setTargetAtTime(70 + a * 200, t, 0.06);
    s.oscB.frequency.setTargetAtTime((70 + a * 200) * 1.008, t, 0.06);
  };

  Audio.prototype._noise = function (dur, type, freq, q, gain, when) {
    const ctx = this.ctx;
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    src.loop = true;
    const f = ctx.createBiquadFilter();
    f.type = type;
    f.frequency.value = freq;
    f.Q.value = q;
    const g = ctx.createGain();
    g.gain.setValueAtTime(gain, when);
    g.gain.exponentialRampToValueAtTime(0.0001, when + dur);
    src.connect(f); f.connect(g); g.connect(this.master);
    src.start(when);
    src.stop(when + dur + 0.02);
    return f;
  };

  /* Elastic release. strength 0..1 sets pitch drop and body. */
  Audio.prototype.boing = function (strength) {
    if (!this.ready || !this.enabled) return;
    const ctx = this.ctx;
    const t = ctx.currentTime;
    const s = Math.max(0.05, Math.min(1, strength));
    const dur = 0.24 + s * 0.42;

    const osc = ctx.createOscillator();
    osc.type = 'sine';
    const g = ctx.createGain();
    const top = 260 + s * 620;
    osc.frequency.setValueAtTime(top, t);
    osc.frequency.exponentialRampToValueAtTime(70 + s * 40, t + dur);

    /* Wobble on top of the sweep is what sells "rubber". */
    const lfo = ctx.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.setValueAtTime(11 + s * 16, t);
    lfo.frequency.exponentialRampToValueAtTime(4, t + dur);
    const lfoGain = ctx.createGain();
    lfoGain.gain.setValueAtTime(top * 0.32, t);
    lfoGain.gain.exponentialRampToValueAtTime(1, t + dur);
    lfo.connect(lfoGain);
    lfoGain.connect(osc.frequency);

    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.16 + s * 0.16, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);

    osc.connect(g);
    g.connect(this.master);
    osc.start(t); osc.stop(t + dur + 0.05);
    lfo.start(t); lfo.stop(t + dur + 0.05);
  };


  /* Speech blip. Pitch is derived from the character being typed so the
     babble has the contour of words without being actual words. */
  Audio.prototype.blip = function (charCode) {
    if (!this.ready || !this.enabled) return;
    const ctx = this.ctx, t = ctx.currentTime;
    /* Keep it inside a pleasant interval instead of the full character range. */
    const step = (charCode % 12) - 6;
    const freq = 420 * Math.pow(2, step / 24);

    const osc = ctx.createOscillator();
    osc.type = 'square';
    osc.frequency.setValueAtTime(freq, t);
    osc.frequency.exponentialRampToValueAtTime(freq * 1.16, t + 0.05);

    const filt = ctx.createBiquadFilter();
    filt.type = 'lowpass';
    filt.frequency.value = 1700;

    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.05, t + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.075);

    osc.connect(filt); filt.connect(g); g.connect(this.master);
    osc.start(t); osc.stop(t + 0.09);
  };

  Audio.prototype.click = function () {
    if (!this.ready || !this.enabled) return;
    this._noise(0.05, 'highpass', 2400, 0.8, 0.08, this.ctx.currentTime);
  };



  NG.Audio = Audio;
})(window.NG = window.NG || {});
