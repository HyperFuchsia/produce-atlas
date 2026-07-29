import { textWidth, drawText } from '../gfx/font.js';
import { drawWindow, drawMoreArrow } from '../gfx/ui.js';
import { PAL } from '../gfx/palette.js';
import { SCREEN_W, SCREEN_H } from '../core/const.js';
import { input } from '../core/input.js';
import { audio } from '../core/audio.js';

const MAX_PX = 214;

export function wrapPx(text, maxPx = MAX_PX) {
  const out = [];
  for (const para of String(text).split('\n')) {
    let line = '';
    for (const word of para.split(' ')) {
      const test = line ? line + ' ' + word : word;
      if (textWidth(test) <= maxPx || !line) line = test;
      else { out.push(line); line = word; }
    }
    out.push(line);
  }
  return out;
}

/** Two-line typewriter message box shared by the overworld and battles. */
export class Dialog {
  constructor() {
    this.pages = [];
    this.page = 0;
    this.shown = 0;
    this.active = false;
    this.autoClose = true;
    this.charMs = 22;
    this.acc = 0;
    this.blink = 0;
    this.holdAfter = 0;
    this.linesPerPage = 2;
  }

  get lines() {
    return this.pages[this.page] || [];
  }
  get pageText() {
    return this.lines.join('\n');
  }
  get complete() {
    return this.shown >= this.charCount;
  }
  get charCount() {
    return this.lines.reduce((a, l) => a + l.length, 0);
  }

  start(text, opts = {}) {
    const wrapped = wrapPx(text, opts.maxPx || MAX_PX);
    this.pages = [];
    for (let i = 0; i < wrapped.length; i += this.linesPerPage) {
      this.pages.push(wrapped.slice(i, i + this.linesPerPage));
    }
    if (!this.pages.length) this.pages = [['']];
    this.page = 0;
    this.shown = 0;
    this.acc = 0;
    this.active = true;
    this.needsInput = opts.wait !== false;
    this.holdAfter = opts.hold ?? 0;
    this._holdT = 0;
    this._finished = false;
  }

  /** Type; returns true once the whole message has been dismissed. */
  update(dt) {
    if (!this.active) return true;
    this.blink += dt;
    if (!this.complete) {
      // Tapping confirm snaps the line to the end, as it should.
      if (this.needsInput && (input.pressed('A') || input.pressed('START'))) {
        this.shown = this.charCount;
        return false;
      }
      this.acc += dt;
      const step = input.held('A') || input.held('B') ? this.charMs / 3 : this.charMs;
      while (this.acc >= step && !this.complete) {
        this.acc -= step;
        this.shown++;
      }
      return false;
    }
    if (this.needsInput) {
      if (input.pressed('A') || input.pressed('START')) {
        audio.sfx('cursor');
        if (this.page < this.pages.length - 1) {
          this.page++;
          this.shown = 0;
          this.acc = 0;
          return false;
        }
        this.active = false;
        return true;
      }
      return false;
    }
    this._holdT += dt;
    if (this._holdT >= this.holdAfter) {
      if (this.page < this.pages.length - 1) {
        this.page++;
        this.shown = 0;
        this._holdT = 0;
        return false;
      }
      this.active = false;
      return true;
    }
    return false;
  }

  /** Task wrapper for the coroutine runner. */
  task(text, opts = {}) {
    const self = this;
    let started = false;
    return {
      update(dt) {
        if (!started) { self.start(text, opts); started = true; return false; }
        return self.update(dt);
      },
    };
  }

  render(ctx, opts = {}) {
    if (!this.active) return;
    const h = opts.h ?? 46;
    const y = opts.y ?? SCREEN_H - h;
    drawWindow(ctx, 0, y, SCREEN_W, h, opts);
    let budget = this.shown;
    let ty = y + 9;
    for (const line of this.lines) {
      const n = Math.max(0, Math.min(line.length, budget));
      if (n > 0) drawText(ctx, line, 10, ty, { color: PAL.ink, shadow: PAL.inkShadow, maxChars: n });
      budget -= line.length;
      ty += 13;
    }
    if (this.complete && this.needsInput) drawMoreArrow(ctx, SCREEN_W - 16, y + h - 12, this.blink);
  }
}
