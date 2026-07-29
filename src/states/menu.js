import { SCREEN_W } from '../core/const.js';
import { input } from '../core/input.js';
import { audio } from '../core/audio.js';
import { drawText } from '../gfx/font.js';
import { drawWindow, drawCursor } from '../gfx/ui.js';
import { PAL } from '../gfx/palette.js';
import { app } from '../game/app.js';
import { G, saveGame, dexCounts, formatTime } from '../game/state.js';
import { PartyState } from './party.js';
import { BagState } from './bag.js';
import { WildbookState } from './wildbook.js';

const OPTIONS = ['WILDBOOK', 'KINDRED', 'BAG', 'TRAINER', 'SAVE', 'CLOSE'];

export class MenuState {
  constructor() {
    this.index = 0;
    this.t = 0;
    this.saved = 0;
    this.transparent = true;
  }

  update(dt) {
    this.t += dt;
    if (this.saved > 0) {
      this.saved -= dt;
      if (this.saved <= 0) this.saved = 0;
      if (input.pressed('A') || input.pressed('B')) this.saved = 0;
      return;
    }
    const before = this.index;
    if (input.repeat('UP')) this.index = (this.index + OPTIONS.length - 1) % OPTIONS.length;
    if (input.repeat('DOWN')) this.index = (this.index + 1) % OPTIONS.length;
    if (this.index !== before) audio.sfx('cursor');
    if (input.pressed('B') || input.pressed('START')) { audio.sfx('cancel'); app.pop(); return; }
    if (input.pressed('A')) {
      audio.sfx('select');
      const opt = OPTIONS[this.index];
      if (opt === 'KINDRED') {
        if (!G.party.length) { this.flash = 'You have no KINDRED yet.'; return; }
        app.push(new PartyState({ mode: 'field' }));
      } else if (opt === 'BAG') app.push(new BagState({ mode: 'field' }));
      else if (opt === 'WILDBOOK') app.push(new WildbookState());
      else if (opt === 'TRAINER') this.showCard = !this.showCard;
      else if (opt === 'SAVE') {
        const ow = app.states.find((s) => s.player && s.map);
        if (ow) {
          G.player.x = ow.player.x;
          G.player.y = ow.player.y;
          G.player.dir = ow.player.dir;
          G.player.map = ow.map.id;
        }
        const ok = saveGame();
        audio.sfx(ok ? 'save' : 'bump');
        this.saved = 1800;
        this.savedOk = ok;
      } else if (opt === 'CLOSE') app.pop();
    }
  }

  render(ctx) {
    const w = 88;
    const x = SCREEN_W - w - 4;
    const h = OPTIONS.length * 13 + 8;
    drawWindow(ctx, x, 4, w, h);
    for (let i = 0; i < OPTIONS.length; i++) {
      drawText(ctx, OPTIONS[i], x + 16, 9 + i * 13, { color: PAL.ink, shadow: PAL.inkShadow });
      if (this.index === i) drawCursor(ctx, x + 6, 10 + i * 13, this.t);
    }

    if (this.showCard) {
      const d = dexCounts();
      drawWindow(ctx, 4, 4, 128, 74);
      drawText(ctx, G.player.name, 12, 9, { color: PAL.ink, shadow: PAL.inkShadow });
      drawText(ctx, `MARKS   ${G.money}`, 12, 24, { color: PAL.ink, shadow: PAL.inkShadow });
      drawText(ctx, `SEEN    ${d.seen}`, 12, 36, { color: PAL.ink, shadow: PAL.inkShadow });
      drawText(ctx, `BONDED  ${d.caught}/${d.total}`, 12, 48, { color: PAL.ink, shadow: PAL.inkShadow });
      drawText(ctx, `TIME    ${formatTime(G.playtime)}`, 12, 60, { color: PAL.ink, shadow: PAL.inkShadow });
    }

    if (this.saved > 0) {
      drawWindow(ctx, 30, 60, 180, 40);
      drawText(ctx, this.savedOk ? 'The journey was written down.' : 'Could not write the save.', 40, 72,
        { color: PAL.ink, shadow: PAL.inkShadow });
      drawText(ctx, this.savedOk ? `${G.player.name} — ${formatTime(G.playtime)}` : 'Storage may be blocked.', 40, 84,
        { color: PAL.ink, shadow: PAL.inkShadow });
    }
    if (this.flash) {
      drawWindow(ctx, 20, 120, 200, 26);
      drawText(ctx, this.flash, 30, 128, { color: PAL.ink, shadow: PAL.inkShadow });
    }
  }
}
