// Deterministic 32-bit RNG (mulberry32). Seeded per save so encounters and
// IV rolls are reproducible when replaying a save file.
export class RNG {
  constructor(seed = 0x9e3779b9) {
    this.s = seed >>> 0;
  }
  next() {
    this.s = (this.s + 0x6d2b79f5) >>> 0;
    let t = this.s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  /** integer in [0, n) */
  int(n) {
    return Math.floor(this.next() * n);
  }
  /** integer in [a, b] inclusive */
  range(a, b) {
    return a + this.int(b - a + 1);
  }
  chance(p) {
    return this.next() < p;
  }
  pick(arr) {
    return arr[this.int(arr.length)];
  }
}

export const rng = new RNG((Date.now() ^ 0x5f3759df) >>> 0);
