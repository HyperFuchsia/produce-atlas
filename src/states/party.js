import { SCREEN_W, SCREEN_H } from '../core/const.js';
import { input } from '../core/input.js';
import { audio } from '../core/audio.js';
import { clamp } from '../core/util.js';
import { drawText, drawTextRight } from '../gfx/font.js';
import { drawWindow, drawBar, hpColor, drawCursor } from '../gfx/ui.js';
import { PAL } from '../gfx/palette.js';
import { monIcon } from '../gfx/monsprites.js';
import { app } from '../game/app.js';
import { G } from '../game/state.js';
import { STATUS_LABEL, STATUS_COLOR, xpProgress } from '../game/creature.js';
import { SummaryState } from './summary.js';

const CARD_W = 114;
const CARD_H = 44;

/**
 * modes:
 *   'field'  — browse, summary, reorder
 *   'switch' — pick a creature to send out (battle)
 *   'item'   — pick a target for an item
 */
export class PartyState {
  constructor(cfg = {}) {
    this.cfg = cfg;
    this.mode = cfg.mode || 'field';
    this.index = 0;
    this.t = 0;
    this.sub = null;     // 'menu' when the per-creature options are open
    this.subIndex = 0;
    this.swapFrom = null;
    this.message = null;
  }

  enter() {
    this.message = {
      field: 'Choose a KINDRED.',
      switch: 'Send out which KINDRED?',
      item: 'Use it on which KINDRED?',
    }[this.mode];
  }

  pick(index) {
    this.cfg.onPick?.(index);
    app.pop();
  }
  cancel() {
    if (this.mode === 'switch' && this.cfg.force) {
      audio.sfx('bump');
      return;
    }
    audio.sfx('cancel');
    this.cfg.onPick?.(null);
    app.pop();
  }

  update(dt) {
    this.t += dt;
    const n = G.party.length;
    if (this.sub === 'menu') {
      const opts = this.subOptions();
      const before = this.subIndex;
      if (input.repeat('UP')) this.subIndex = (this.subIndex + opts.length - 1) % opts.length;
      if (input.repeat('DOWN')) this.subIndex = (this.subIndex + 1) % opts.length;
      if (this.subIndex !== before) audio.sfx('cursor');
      if (input.pressed('B')) { audio.sfx('cancel'); this.sub = null; return; }
      if (input.pressed('A')) {
        audio.sfx('select');
        const opt = opts[this.subIndex];
        this.sub = null;
        if (opt === 'SUMMARY') app.push(new SummaryState({ index: this.index }));
        else if (opt === 'SWITCH') { this.swapFrom = this.index; this.message = 'Move it where?'; }
        else if (opt === 'SEND OUT') this.pick(this.index);
      }
      return;
    }

    const before = this.index;
    if (input.repeat('UP')) this.index = (this.index + n - 1) % n;
    if (input.repeat('DOWN')) this.index = (this.index + 1) % n;
    if (input.repeat('LEFT')) this.index = clamp(this.index - 1, 0, n - 1);
    if (input.repeat('RIGHT')) this.index = clamp(this.index + 1, 0, n - 1);
    if (this.index !== before) audio.sfx('cursor');

    if (input.pressed('B')) { this.cancel(); return; }
    if (input.pressed('A')) {
      audio.sfx('select');
      if (this.swapFrom !== null) {
        const a = this.swapFrom;
        const b = this.index;
        [G.party[a], G.party[b]] = [G.party[b], G.party[a]];
        this.swapFrom = null;
        this.message = 'Choose a KINDRED.';
        return;
      }
      if (this.mode === 'switch') {
        const c = G.party[this.index];
        if (!c || c.hp <= 0) { audio.sfx('bump'); this.message = 'It has no energy left to fight!'; return; }
        if (this.cfg.currentIndex === this.index) { audio.sfx('bump'); this.message = 'It is already out!'; return; }
        this.pick(this.index);
        return;
      }
      if (this.mode === 'item') { this.pick(this.index); return; }
      this.sub = 'menu';
      this.subIndex = 0;
    }
  }

  subOptions() {
    return ['SUMMARY', 'SWITCH', 'CANCEL'];
  }

  render(ctx) {
    ctx.fillStyle = '#3a4a68';
    ctx.fillRect(0, 0, SCREEN_W, SCREEN_H);
    // subtle diagonal weave so the screen doesn't read as flat
    ctx.fillStyle = '#44557a';
    for (let y = 0; y < SCREEN_H; y += 4) {
      for (let x = (y / 4) % 2 ? 0 : 2; x < SCREEN_W; x += 4) ctx.fillRect(x, y, 2, 2);
    }

    for (let i = 0; i < G.party.length; i++) {
      const col = i % 2;
      const row = (i / 2) | 0;
      const x = 4 + col * (CARD_W + 4);
      const y = 4 + row * (CARD_H + 2);
      this.drawCard(ctx, G.party[i], x, y, i === this.index, i === this.swapFrom);
    }

    drawWindow(ctx, 0, SCREEN_H - 16, SCREEN_W, 16);
    drawText(ctx, this.message || '', 6, SCREEN_H - 13, { color: PAL.ink, shadow: PAL.inkShadow });

    if (this.sub === 'menu') {
      const opts = this.subOptions();
      const h = opts.length * 13 + 8;
      const w = 74;
      const x = SCREEN_W - w - 4;
      const y = SCREEN_H - 16 - h - 2;
      drawWindow(ctx, x, y, w, h);
      for (let i = 0; i < opts.length; i++) {
        drawText(ctx, opts[i], x + 14, y + 5 + i * 13, { color: PAL.ink, shadow: PAL.inkShadow });
        if (this.subIndex === i) drawCursor(ctx, x + 5, y + 6 + i * 13, this.t);
      }
    }
  }

  drawCard(ctx, c, x, y, selected, swapping) {
    drawWindow(ctx, x, y, CARD_W, CARD_H, selected
      ? { fill: '#fff4d0', inner: '#f0c060', hi: '#ffffff' }
      : { fill: PAL.uiFill });
    if (swapping) {
      ctx.fillStyle = '#e08040';
      ctx.fillRect(x + 1, y + 1, CARD_W - 2, 2);
    }
    const icon = monIcon(c.id);
    const b = icon.bounds;
    ctx.drawImage(icon.canvas, b.x, b.y, b.w, b.h,
      Math.round(x + 6 + (26 - b.w) / 2), Math.round(y + 6 + (30 - b.h) / 2), b.w, b.h);

    drawText(ctx, c.nick, x + 36, y + 5, { color: PAL.ink, shadow: PAL.inkShadow });
    drawText(ctx, `Lv${c.level}`, x + 36, y + 18, { color: PAL.ink, shadow: PAL.inkShadow });
    const frac = c.hp / c.maxhp;
    drawBar(ctx, x + 68, y + 21, 38, frac, hpColor(frac));
    drawTextRight(ctx, `${c.hp}/${c.maxhp}`, x + CARD_W - 7, y + 28, { color: PAL.ink, shadow: PAL.inkShadow });
    if (c.status) {
      ctx.fillStyle = STATUS_COLOR[c.status];
      ctx.fillRect(x + 36, y + 30, 20, 8);
      drawText(ctx, STATUS_LABEL[c.status], x + 38, y + 29, { color: '#2a2018', shadow: null });
    }
    if (c.hp <= 0) {
      drawText(ctx, 'FAINTED', x + 36, y + 29, { color: '#a03828', shadow: PAL.inkShadow });
    }
    drawBar(ctx, x + 6, y + CARD_H - 7, CARD_W - 12, xpProgress(c), PAL.xpBlue, { h: 2, bg: '#8a7a60' });
  }
}
