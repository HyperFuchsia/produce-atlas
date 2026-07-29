import { SCREEN_W, SCREEN_H } from '../core/const.js';
import { input } from '../core/input.js';
import { audio } from '../core/audio.js';
import { drawText, drawTextRight, drawTextCentered } from '../gfx/font.js';
import { drawWindow, drawBar, hpColor, drawTypeChip } from '../gfx/ui.js';
import { PAL } from '../gfx/palette.js';
import { monSprite } from '../gfx/monsprites.js';
import { app } from '../game/app.js';
import { G } from '../game/state.js';
import { SPECIES } from '../data/species.js';
import { MOVES } from '../data/moves.js';
import { xpProgress, xpToNext, STATUS_LABEL } from '../game/creature.js';
import { wrapPx } from '../game/dialog.js';

export class SummaryState {
  constructor(cfg) {
    this.index = cfg.index || 0;
    this.page = 0;
    this.t = 0;
    this.list = cfg.list || G.party;
  }

  update(dt) {
    this.t += dt;
    if (input.pressed('B')) { audio.sfx('cancel'); app.pop(); return; }
    if (input.pressed('A') || input.repeat('RIGHT')) { this.page = (this.page + 1) % 3; audio.sfx('cursor'); }
    if (input.repeat('LEFT')) { this.page = (this.page + 2) % 3; audio.sfx('cursor'); }
    if (input.repeat('DOWN')) { this.index = (this.index + 1) % this.list.length; audio.sfx('cursor'); }
    if (input.repeat('UP')) { this.index = (this.index + this.list.length - 1) % this.list.length; audio.sfx('cursor'); }
  }

  render(ctx) {
    const c = this.list[this.index];
    const sp = SPECIES[c.id];
    ctx.fillStyle = '#2e3c56';
    ctx.fillRect(0, 0, SCREEN_W, SCREEN_H);
    ctx.fillStyle = '#37476380';
    for (let y = 0; y < SCREEN_H; y += 8) ctx.fillRect(0, y, SCREEN_W, 4);

    // left column: portrait
    drawWindow(ctx, 4, 4, 82, 152);
    const spr = monSprite(c.id, false);
    const b = spr.bounds;
    ctx.drawImage(spr.canvas, b.x, b.y, b.w, b.h,
      Math.round(45 - b.w / 2), Math.round(48 - b.h / 2), b.w, b.h);
    drawTextCentered(ctx, c.nick, 45, 78, { color: PAL.ink, shadow: PAL.inkShadow });
    drawTextCentered(ctx, `Lv${c.level}`, 45, 90, { color: PAL.ink, shadow: PAL.inkShadow });
    let tx = 12;
    for (const t of sp.types) tx += drawTypeChip(ctx, t, tx, 102) + 2;
    const frac = c.hp / c.maxhp;
    drawBar(ctx, 12, 122, 66, frac, hpColor(frac));
    drawTextCentered(ctx, `${c.hp}/${c.maxhp} HP`, 45, 128, { color: PAL.ink, shadow: PAL.inkShadow });
    if (c.status) drawTextCentered(ctx, STATUS_LABEL[c.status], 45, 140, { color: '#a03828', shadow: PAL.inkShadow });

    drawWindow(ctx, 90, 4, 146, 152);
    const px = 98;
    if (this.page === 0) {
      drawText(ctx, `No.${String(sp.num).padStart(3, '0')}  ${sp.name}`, px, 10, { color: PAL.ink, shadow: PAL.inkShadow });
      let y = 26;
      for (const line of wrapPx(sp.dex, 132)) {
        drawText(ctx, line, px, y, { color: PAL.ink, shadow: PAL.inkShadow });
        y += 11;
      }
      y += 6;
      drawText(ctx, `EXP  ${c.xp}`, px, y, { color: PAL.ink, shadow: PAL.inkShadow });
      drawText(ctx, `NEXT Lv ${xpToNext(c)}`, px, y + 11, { color: PAL.ink, shadow: PAL.inkShadow });
      drawBar(ctx, px, y + 26, 128, xpProgress(c), PAL.xpBlue, { h: 3, bg: '#8a7a60' });
      drawText(ctx, c.ot ? `MET  ${c.ot}` : 'MET  in the wild', px, y + 34, { color: PAL.ink, shadow: PAL.inkShadow });
    } else if (this.page === 1) {
      drawText(ctx, 'STATS', px, 10, { color: PAL.ink, shadow: PAL.inkShadow });
      const rows = [['HP', c.stats.hp], ['ATTACK', c.stats.atk], ['DEFENCE', c.stats.def],
        ['SP. ATK', c.stats.spa], ['SP. DEF', c.stats.spd], ['SPEED', c.stats.spe]];
      let y = 26;
      for (const [label, val] of rows) {
        drawText(ctx, label, px, y, { color: PAL.ink, shadow: PAL.inkShadow });
        drawTextRight(ctx, String(val), px + 60, y, { color: PAL.ink, shadow: PAL.inkShadow });
        drawBar(ctx, px + 66, y + 3, 60, Math.min(1, val / 200), '#5aa8e0', { h: 3, bg: '#8a7a60' });
        y += 15;
      }
      drawText(ctx, 'Higher is better. Growth is fixed at birth.', px, y + 4, { color: '#6a5a48', shadow: null });
    } else {
      drawText(ctx, 'MOVES', px, 10, { color: PAL.ink, shadow: PAL.inkShadow });
      let y = 24;
      for (const mv of c.moves) {
        const m = MOVES[mv.id];
        drawTypeChip(ctx, m.type, px, y);
        drawText(ctx, m.name, px + 46, y + 1, { color: PAL.ink, shadow: PAL.inkShadow });
        drawTextRight(ctx, `${mv.pp}/${mv.maxpp}`, px + 128, y + 1, { color: PAL.ink, shadow: PAL.inkShadow });
        drawText(ctx, m.pow ? `POW ${m.pow}` : 'STATUS', px + 46, y + 12, { color: '#6a5a48', shadow: null });
        drawText(ctx, `ACC ${m.acc}`, px + 92, y + 12, { color: '#6a5a48', shadow: null });
        y += 27;
      }
    }
    drawTextRight(ctx, `${this.page + 1}/3  A: page  B: back`, 230, 146, { color: '#6a5a48', shadow: null });
  }
}
