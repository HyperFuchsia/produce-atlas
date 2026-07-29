import { SCREEN_W, SCREEN_H } from '../core/const.js';
import { input } from '../core/input.js';
import { audio } from '../core/audio.js';
import { makeCanvas } from '../core/screen.js';
import { drawText, drawTextCentered, textWidth } from '../gfx/font.js';
import { drawWindow, drawCursor } from '../gfx/ui.js';
import { upscale, silhouette, hash2 } from '../gfx/pixel.js';
import { PAL } from '../gfx/palette.js';
import { monSprite } from '../gfx/monsprites.js';
import { app } from '../game/app.js';
import { G, resetGame, loadGame, peekSave, formatTime, deleteSave } from '../game/state.js';
import { Overworld } from './overworld.js';

function makeLogo(text, scale, fill, shade, outline) {
  const w = textWidth(text) + 2;
  const tmp = makeCanvas(w, 9);
  drawText(tmp.getContext('2d'), text, 0, 0, { color: '#ffffff', shadow: null });
  const big = upscale(tmp, scale);
  const out = makeCanvas(big.width + scale * 2, big.height + scale * 2);
  const g = out.getContext('2d');
  const dark = silhouette(big, outline);
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      if (!dx && !dy) continue;
      g.drawImage(dark, scale + dx * scale, scale + dy * scale);
    }
  }
  g.drawImage(silhouette(big, fill), scale, scale);
  // lower band in a deeper tone, clipped so it only lands on the letters
  const bandTop = Math.round(out.height * 0.56);
  g.save();
  g.beginPath();
  g.rect(0, bandTop, out.width, Math.round(out.height * 0.24));
  g.clip();
  g.drawImage(silhouette(big, shade), scale, scale);
  g.restore();
  return out;
}

export class TitleState {
  constructor() {
    this.t = 0;
    this.index = 0;
    this.phase = 'press';
    this.logo = null;
    this.sub = null;
    this.stars = Array.from({ length: 26 }, (_, i) => ({
      x: hash2(i, 1, 5) * SCREEN_W,
      y: hash2(i, 2, 6) * 70,
      s: 0.1 + hash2(i, 3, 7) * 0.35,
    }));
  }

  enter() {
    this.logo = makeLogo('WILDBOUND', 4, '#ffd25e', '#e09a2c', '#5a2c08');
    this.sub = makeLogo('AMBER EDITION', 2, '#f0f0f8', '#b8c0d8', '#2a2a44');
    audio.playMusic('title');
    this.save = peekSave();
  }

  options() {
    return this.save ? ['CONTINUE', 'NEW JOURNEY', 'ERASE SAVE'] : ['NEW JOURNEY'];
  }

  update(dt) {
    this.t += dt;
    for (const s of this.stars) {
      s.x -= s.s * dt * 0.03;
      if (s.x < -6) { s.x = SCREEN_W + 6; }
    }
    if (this.phase === 'press') {
      if (input.pressed('A') || input.pressed('START')) {
        audio.sfx('select');
        this.phase = 'menu';
      }
      return;
    }
    if (this.phase === 'menu') {
      const opts = this.options();
      const before = this.index;
      if (input.repeat('UP')) this.index = (this.index + opts.length - 1) % opts.length;
      if (input.repeat('DOWN')) this.index = (this.index + 1) % opts.length;
      if (this.index !== before) audio.sfx('cursor');
      if (input.pressed('B')) { audio.sfx('cancel'); this.phase = 'press'; return; }
      if (input.pressed('A')) {
        audio.sfx('select');
        const opt = opts[this.index];
        if (opt === 'CONTINUE') {
          if (loadGame()) app.reset(new Overworld());
        } else if (opt === 'NEW JOURNEY') {
          resetGame();
          app.push(new NameEntry({
            onDone: (name) => {
              G.player.name = name || 'ROWAN';
              G.started = true;
              app.reset(new Overworld());
            },
          }));
        } else if (opt === 'ERASE SAVE') {
          deleteSave();
          this.save = null;
          this.index = 0;
          audio.sfx('cancel');
        }
      }
    }
  }

  render(ctx) {
    // dusk sky
    for (let y = 0; y < SCREEN_H; y++) {
      const t = y / SCREEN_H;
      ctx.fillStyle = t < 0.42 ? (t < 0.2 ? '#1b1b3a' : '#38305e')
        : t < 0.56 ? '#7a4a68' : t < 0.66 ? '#c2704e' : '#2c4a34';
      ctx.fillRect(0, y, SCREEN_W, 1);
    }
    for (const s of this.stars) {
      ctx.fillStyle = 'rgba(255,255,255,0.7)';
      ctx.fillRect(Math.round(s.x), Math.round(s.y), 1, 1);
    }
    // hills
    for (let layer = 0; layer < 2; layer++) {
      const base = 108 + layer * 14;
      ctx.fillStyle = layer ? '#1c3020' : '#26402a';
      for (let x = 0; x < SCREEN_W; x++) {
        const h = Math.round(Math.sin((x + layer * 40) * 0.02) * 8 + Math.sin(x * 0.006) * 10 + 14);
        ctx.fillRect(x, base - h, 1, SCREEN_H);
      }
    }
    // a lone creature on the ridge
    const spr = monSprite('emberet', true);
    const b = spr.bounds;
    ctx.drawImage(spr.canvas, b.x, b.y, b.w, b.h, 174, 112 - b.h, b.w, b.h);

    const lx = Math.round(SCREEN_W / 2 - this.logo.width / 2);
    const bob = Math.round(Math.sin(this.t / 700) * 2);
    ctx.drawImage(this.logo, lx, 18 + bob);
    ctx.drawImage(this.sub, Math.round(SCREEN_W / 2 - this.sub.width / 2), 56 + bob);

    if (this.phase === 'press') {
      if (Math.floor(this.t / 520) % 2 === 0) {
        drawTextCentered(ctx, 'PRESS  Z  TO  START', SCREEN_W / 2, 128, { color: '#ffffff', shadow: '#3a2a44' });
      }
      drawText(ctx, 'v1.0', 4, SCREEN_H - 12, { color: '#c0b8d0', shadow: null });
    } else {
      const opts = this.options();
      const w = 108;
      const h = opts.length * 13 + 8;
      const x = SCREEN_W / 2 - w / 2;
      const y = 104;
      drawWindow(ctx, x, y, w, h);
      for (let i = 0; i < opts.length; i++) {
        drawText(ctx, opts[i], x + 18, y + 5 + i * 13, { color: PAL.ink, shadow: PAL.inkShadow });
        if (this.index === i) drawCursor(ctx, x + 7, y + 6 + i * 13, this.t);
      }
      if (this.save) {
        drawWindow(ctx, 4, 76, 92, 24);
        drawText(ctx, `${this.save.name}  ${formatTime(this.save.playtime)}`, 10, 80, { color: PAL.ink, shadow: PAL.inkShadow });
        drawText(ctx, `BONDED ${this.save.caught}`, 10, 90, { color: PAL.ink, shadow: PAL.inkShadow });
      }
    }
  }
}

const KEYS = [
  'ABCDEFGHIJ',
  'KLMNOPQRST',
  'UVWXYZ.-\' ',
  '0123456789',
];

class NameEntry {
  constructor(cfg) {
    this.cfg = cfg;
    this.name = '';
    this.cx = 0;
    this.cy = 0;
    this.t = 0;
  }
  update(dt) {
    this.t += dt;
    const rows = KEYS.length + 1;
    if (input.repeat('UP')) { this.cy = (this.cy + rows - 1) % rows; audio.sfx('cursor'); }
    if (input.repeat('DOWN')) { this.cy = (this.cy + 1) % rows; audio.sfx('cursor'); }
    if (this.cy < KEYS.length) {
      const len = KEYS[this.cy].length;
      if (input.repeat('LEFT')) { this.cx = (this.cx + len - 1) % len; audio.sfx('cursor'); }
      if (input.repeat('RIGHT')) { this.cx = (this.cx + 1) % len; audio.sfx('cursor'); }
    } else {
      if (input.repeat('LEFT')) { this.cx = (this.cx + 1) % 2; audio.sfx('cursor'); }
      if (input.repeat('RIGHT')) { this.cx = (this.cx + 1) % 2; audio.sfx('cursor'); }
    }
    if (input.pressed('B')) {
      audio.sfx('cancel');
      this.name = this.name.slice(0, -1);
    }
    if (input.pressed('A')) {
      audio.sfx('select');
      if (this.cy < KEYS.length) {
        if (this.name.length < 8) this.name += KEYS[this.cy][this.cx];
      } else if (this.cx === 0) {
        this.name = this.name.slice(0, -1);
      } else {
        this.done();
      }
    }
    if (input.pressed('START')) this.done();
  }
  done() {
    app.pop();
    this.cfg.onDone(this.name.trim() || 'ROWAN');
  }
  render(ctx) {
    ctx.fillStyle = '#2a3450';
    ctx.fillRect(0, 0, SCREEN_W, SCREEN_H);
    ctx.fillStyle = '#33405f';
    for (let y = 0; y < SCREEN_H; y += 6) ctx.fillRect(0, y, SCREEN_W, 3);

    drawWindow(ctx, 20, 8, 200, 34);
    drawTextCentered(ctx, 'WHAT IS YOUR NAME?', SCREEN_W / 2, 13, { color: PAL.ink, shadow: PAL.inkShadow });
    const shown = this.name + (Math.floor(this.t / 400) % 2 ? '_' : ' ');
    drawTextCentered(ctx, shown, SCREEN_W / 2, 28, { color: '#2a4a90', shadow: PAL.inkShadow });

    drawWindow(ctx, 20, 48, 200, 92);
    for (let r = 0; r < KEYS.length; r++) {
      for (let c = 0; c < KEYS[r].length; c++) {
        const x = 34 + c * 18;
        const y = 56 + r * 16;
        const sel = this.cy === r && this.cx === c;
        if (sel) {
          ctx.fillStyle = '#f0c060';
          ctx.fillRect(x - 4, y - 2, 14, 13);
        }
        drawText(ctx, KEYS[r][c], x, y, { color: PAL.ink, shadow: PAL.inkShadow });
      }
    }
    const y = 56 + KEYS.length * 16;
    for (let i = 0; i < 2; i++) {
      const label = i === 0 ? 'DELETE' : 'CONFIRM';
      const x = 44 + i * 92;
      if (this.cy === KEYS.length && this.cx === i) {
        ctx.fillStyle = '#f0c060';
        ctx.fillRect(x - 5, y - 2, 52, 13);
      }
      drawText(ctx, label, x, y, { color: PAL.ink, shadow: PAL.inkShadow });
    }
    drawText(ctx, 'A: pick   B: delete   ENTER: confirm', 22, 146, { color: '#c8c8e0', shadow: null });
  }
}
