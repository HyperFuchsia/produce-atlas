import { ctx, clear } from '../core/screen.js';
import { fadeRect } from '../gfx/ui.js';

/** State stack. Only the top state updates; transparent states draw stacked. */
export const app = {
  states: [],
  fade: { alpha: 0, target: 0, speed: 0.006, color: '#000' },
  shake: { t: 0, mag: 0 },

  get top() {
    return this.states[this.states.length - 1];
  },
  push(s) {
    this.states.push(s);
    s.app = this;
    s.enter?.();
    return s;
  },
  pop() {
    const s = this.states.pop();
    s?.exit?.();
    this.top?.resume?.();
    return s;
  },
  replace(s) {
    const old = this.states.pop();
    old?.exit?.();
    this.push(s);
  },
  reset(s) {
    while (this.states.length) this.states.pop()?.exit?.();
    this.push(s);
  },

  fadeTo(alpha, ms = 260, color = '#000') {
    this.fade.target = alpha;
    this.fade.color = color;
    this.fade.speed = ms <= 0 ? 1 : 1 / ms;
    return {
      update: (dt) => {
        const f = this.fade;
        const dir = Math.sign(f.target - f.alpha);
        f.alpha += dir * f.speed * dt;
        if ((dir > 0 && f.alpha >= f.target) || (dir < 0 && f.alpha <= f.target) || dir === 0) {
          f.alpha = f.target;
          return true;
        }
        return false;
      },
    };
  },

  addShake(mag, ms) {
    this.shake.mag = mag;
    this.shake.t = ms;
  },

  update(dt) {
    if (this.shake.t > 0) this.shake.t -= dt;
    this.top?.update?.(dt);
  },

  render() {
    clear('#000');
    let start = this.states.length - 1;
    while (start > 0 && this.states[start].transparent) start--;
    const sh = this.shake.t > 0 ? this.shake.mag : 0;
    if (sh) {
      ctx.save();
      ctx.translate(Math.round((Math.random() - 0.5) * sh * 2), Math.round((Math.random() - 0.5) * sh * 2));
    }
    for (let i = start; i < this.states.length; i++) this.states[i].render?.(ctx);
    if (sh) ctx.restore();
    fadeRect(ctx, this.fade.alpha, this.fade.color);
  },
};
