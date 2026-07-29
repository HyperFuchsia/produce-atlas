import { SCREEN_W, SCREEN_H } from '../core/const.js';
import { input } from '../core/input.js';
import { audio } from '../core/audio.js';
import { drawText, drawTextRight, drawTextCentered } from '../gfx/font.js';
import { drawWindow, drawCursor, drawTypeChip } from '../gfx/ui.js';
import { PAL } from '../gfx/palette.js';
import { monSprite, monSilhouette } from '../gfx/monsprites.js';
import { app } from '../game/app.js';
import { G, dexCounts } from '../game/state.js';
import { SPECIES } from '../data/species.js';
import { wrapPx } from '../game/dialog.js';

const ORDER = Object.keys(SPECIES).sort((a, b) => SPECIES[a].num - SPECIES[b].num);
const ROWS = 7;

export class WildbookState {
  constructor() {
    this.index = 0;
    this.top = 0;
    this.t = 0;
  }

  update(dt) {
    this.t += dt;
    const before = this.index;
    if (input.repeat('UP')) this.index = (this.index + ORDER.length - 1) % ORDER.length;
    if (input.repeat('DOWN')) this.index = (this.index + 1) % ORDER.length;
    if (this.index !== before) audio.sfx('cursor');
    if (this.index < this.top) this.top = this.index;
    if (this.index >= this.top + ROWS) this.top = this.index - ROWS + 1;
    if (this.top > ORDER.length - ROWS) this.top = Math.max(0, ORDER.length - ROWS);
    if (input.pressed('B')) { audio.sfx('cancel'); app.pop(); }
  }

  render(ctx) {
    ctx.fillStyle = '#2a3a2e';
    ctx.fillRect(0, 0, SCREEN_W, SCREEN_H);
    ctx.fillStyle = '#32463880';
    for (let y = 0; y < SCREEN_H; y += 8) ctx.fillRect(0, y, SCREEN_W, 4);

    const d = dexCounts();
    drawWindow(ctx, 4, 4, 108, 14);
    drawText(ctx, 'WILDBOOK', 10, 7, { color: PAL.ink, shadow: PAL.inkShadow });
    drawTextRight(ctx, `${d.caught}/${d.total}`, 106, 7, { color: PAL.ink, shadow: PAL.inkShadow });

    drawWindow(ctx, 4, 20, 108, 136);
    for (let r = 0; r < ROWS; r++) {
      const i = this.top + r;
      if (i >= ORDER.length) break;
      const id = ORDER[i];
      const seen = G.seen[id];
      const caught = G.caught[id];
      const y = 26 + r * 18;
      drawText(ctx, String(SPECIES[id].num).padStart(3, '0'), 20, y, { color: PAL.ink, shadow: PAL.inkShadow });
      drawText(ctx, seen ? SPECIES[id].name : '---------', 44, y, {
        color: seen ? PAL.ink : '#8a7a68', shadow: PAL.inkShadow,
      });
      if (caught) {
        ctx.fillStyle = '#c8902a';
        ctx.fillRect(100, y + 1, 5, 5);
        ctx.fillStyle = '#f0d060';
        ctx.fillRect(101, y + 2, 3, 2);
      }
      if (this.index === i) drawCursor(ctx, 9, y + 1, this.t);
    }

    const id = ORDER[this.index];
    const sp = SPECIES[id];
    const seen = G.seen[id];
    drawWindow(ctx, 116, 4, 120, 152);
    if (!seen) {
      drawTextCentered(ctx, 'NOT YET MET', 176, 70, { color: '#8a7a68', shadow: PAL.inkShadow });
      return;
    }
    const spr = monSprite(id, false);
    const b = spr.bounds;
    if (G.caught[id]) {
      ctx.drawImage(spr.canvas, b.x, b.y, b.w, b.h, Math.round(176 - b.w / 2), Math.round(44 - b.h / 2), b.w, b.h);
    } else {
      ctx.drawImage(monSilhouette(id, false, '#4a5a50'), b.x, b.y, b.w, b.h,
        Math.round(176 - b.w / 2), Math.round(44 - b.h / 2), b.w, b.h);
    }
    drawTextCentered(ctx, sp.name, 176, 76, { color: PAL.ink, shadow: PAL.inkShadow });
    let tx = 128;
    for (const t of sp.types) tx += drawTypeChip(ctx, t, tx, 90) + 3;
    let y = 106;
    for (const line of wrapPx(G.caught[id] ? sp.dex : 'Met, but not yet bonded with.', 106)) {
      drawText(ctx, line, 124, y, { color: PAL.ink, shadow: PAL.inkShadow });
      y += 11;
    }
  }
}
