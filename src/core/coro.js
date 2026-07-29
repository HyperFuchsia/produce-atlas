// Minimal coroutine runner. Generators yield "tasks" — objects with
// update(dt) -> done. It makes battle scripts and cutscenes read linearly.

export class Coro {
  constructor(genFn, ...args) {
    this.gen = genFn(...args);
    this.cur = null;
    this.done = false;
    this.value = undefined;
    this._pending = undefined;
  }
  _advance(sent) {
    const r = this.gen.next(sent);
    if (r.done) {
      this.done = true;
      this.cur = null;
      this.value = r.value;
    } else {
      this.cur = r.value;
    }
  }
  update(dt) {
    if (this.done) return true;
    let time = dt;
    let guard = 0;
    while (!this.done && guard++ < 200) {
      if (!this.cur) {
        this._advance(this._pending);
        this._pending = undefined;
        continue;
      }
      if (typeof this.cur.update !== 'function') {
        // yielding a plain value just resumes next frame
        this._pending = this.cur;
        this.cur = null;
        continue;
      }
      const finished = this.cur.update(time);
      time = 0;
      if (!finished) return false;
      this._pending = this.cur.result;
      this.cur = null;
    }
    return this.done;
  }
  cancel() {
    this.done = true;
    this.cur = null;
  }
}

export const wait = (ms) => ({
  t: 0,
  update(dt) { this.t += dt; return this.t >= ms; },
});

export const call = (fn) => ({
  update() { this.result = fn(); return true; },
});

export const waitUntil = (pred) => ({
  update() { return !!pred(); },
});

export const tween = (obj, key, to, ms, ease = (t) => t) => ({
  t: 0,
  from: null,
  update(dt) {
    if (this.from === null) this.from = obj[key];
    this.t += dt;
    const p = ms <= 0 ? 1 : Math.min(1, this.t / ms);
    obj[key] = this.from + (to - this.from) * ease(p);
    return p >= 1;
  },
});

/** Run several tasks at once; finishes when all have finished. */
export const all = (...tasks) => ({
  update(dt) {
    let done = true;
    for (const t of tasks) {
      if (t.__done) continue;
      if (t.update(dt)) t.__done = true;
      else done = false;
    }
    return done;
  },
});
