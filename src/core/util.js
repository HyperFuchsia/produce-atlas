export const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
export const lerp = (a, b, t) => a + (b - a) * t;
export const easeOutQuad = (t) => t * (2 - t);
export const easeInQuad = (t) => t * t;
export const easeInOut = (t) => (t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t);
export const sign = (v) => (v < 0 ? -1 : v > 0 ? 1 : 0);

/** Format an integer with a fixed width, right aligned with spaces. */
export function padNum(n, w) {
  let s = String(n);
  while (s.length < w) s = ' ' + s;
  return s;
}

export function capitalize(s) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** Chop a string into lines that fit `maxChars`, respecting explicit \n. */
export function wrapText(text, maxChars) {
  const out = [];
  for (const para of String(text).split('\n')) {
    let line = '';
    for (const word of para.split(' ')) {
      if (!line.length) {
        line = word;
      } else if ((line + ' ' + word).length <= maxChars) {
        line += ' ' + word;
      } else {
        out.push(line);
        line = word;
      }
    }
    out.push(line);
  }
  return out;
}

/** A tiny promise-free tween helper driven by the fixed-step update loop. */
export class Timer {
  constructor() {
    this.t = 0;
    this.dur = 0;
    this.running = false;
  }
  start(dur) {
    this.t = 0;
    this.dur = dur;
    this.running = dur > 0;
    return this;
  }
  update(dt) {
    if (!this.running) return true;
    this.t += dt;
    if (this.t >= this.dur) {
      this.t = this.dur;
      this.running = false;
      return true;
    }
    return false;
  }
  get p() {
    return this.dur <= 0 ? 1 : clamp(this.t / this.dur, 0, 1);
  }
  get done() {
    return !this.running;
  }
}
