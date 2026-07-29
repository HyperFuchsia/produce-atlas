import { SCREEN_W, SCREEN_H } from '../core/const.js';
import { input } from '../core/input.js';
import { audio } from '../core/audio.js';
import { drawText, drawTextRight } from '../gfx/font.js';
import { drawWindow, drawCursor } from '../gfx/ui.js';
import { PAL } from '../gfx/palette.js';
import { app } from '../game/app.js';
import { wrapPx } from '../game/dialog.js';
import { G, bagList, itemCount, removeItem } from '../game/state.js';
import { ITEMS } from '../data/items.js';
import { PartyState } from './party.js';
import { MOVES } from '../data/moves.js';

const ROWS = 6;

/** modes: 'field' | 'battle' */
export class BagState {
  constructor(cfg = {}) {
    this.cfg = cfg;
    this.mode = cfg.mode || 'field';
    this.index = 0;
    this.top = 0;
    this.t = 0;
    this.note = null;
    this.pendingItem = null;
  }

  get items() {
    return bagList();
  }

  close(id, target) {
    this.cfg.onPick?.(id ?? null, target);
    app.pop();
  }

  update(dt) {
    this.t += dt;
    // returning from the party screen having chosen a target
    if (this.pendingItem && this.target !== undefined) {
      const id = this.pendingItem;
      const target = this.target;
      this.pendingItem = null;
      this.target = undefined;
      if (target !== null) {
        if (this.mode === 'battle') { this.close(id, target); return; }
        this.applyField(id, target);
      }
      return;
    }

    const list = this.items;
    const n = list.length + 1; // + CLOSE
    const before = this.index;
    if (input.repeat('UP')) this.index = (this.index + n - 1) % n;
    if (input.repeat('DOWN')) this.index = (this.index + 1) % n;
    if (this.index !== before) { audio.sfx('cursor'); this.note = null; }
    if (this.index < this.top) this.top = this.index;
    if (this.index >= this.top + ROWS) this.top = this.index - ROWS + 1;

    if (input.pressed('B')) { audio.sfx('cancel'); this.close(null); return; }
    if (input.pressed('A')) {
      if (this.index >= list.length) { audio.sfx('cancel'); this.close(null); return; }
      const id = list[this.index];
      const item = ITEMS[id];
      audio.sfx('select');
      if (item.kind === 'key') { this.note = 'It is not the moment for that.'; return; }
      if (item.kind === 'orb') {
        if (this.mode === 'battle') { this.close(id); return; }
        this.note = 'There is nothing here to use it on.';
        return;
      }
      // needs a target
      this.pendingItem = id;
      this.target = undefined;
      app.push(new PartyState({ mode: 'item', onPick: (i) => { this.target = i; } }));
    }
  }

  applyField(id, target) {
    const item = ITEMS[id];
    const c = G.party[target];
    if (!c) return;
    if (item.kind === 'heal') {
      if (c.hp <= 0) { this.note = `${c.nick} has fainted. Use a REVIVE.`; return; }
      if (c.hp >= c.maxhp) { this.note = `${c.nick} is already at full health.`; return; }
      const amount = Math.min(item.amount, c.maxhp - c.hp);
      c.hp += amount;
      removeItem(id, 1);
      audio.sfx('heal');
      this.note = `${c.nick} recovered ${amount} HP.`;
    } else if (item.kind === 'status') {
      if (!c.status) { this.note = `${c.nick} has nothing to cure.`; return; }
      c.status = null;
      c.sleep = 0;
      removeItem(id, 1);
      audio.sfx('heal');
      this.note = `${c.nick} is feeling better.`;
    } else if (item.kind === 'revive') {
      if (c.hp > 0) { this.note = `${c.nick} has not fainted.`; return; }
      c.hp = Math.max(1, Math.floor(c.maxhp * item.frac));
      removeItem(id, 1);
      audio.sfx('heal');
      this.note = `${c.nick} was revived.`;
    } else if (item.kind === 'ether') {
      const mv = c.moves.find((m) => m.pp < m.maxpp);
      if (!mv) { this.note = 'Its moves are all full.'; return; }
      mv.pp = Math.min(mv.maxpp, mv.pp + item.amount);
      removeItem(id, 1);
      audio.sfx('heal');
      this.note = `${MOVES[mv.id].name} regained PP.`;
    }
    if (this.index >= this.items.length) this.index = Math.max(0, this.items.length);
  }

  render(ctx) {
    ctx.fillStyle = '#4a3a5a';
    ctx.fillRect(0, 0, SCREEN_W, SCREEN_H);
    ctx.fillStyle = '#54446a';
    for (let y = 0; y < SCREEN_H; y += 6) ctx.fillRect(0, y, SCREEN_W, 3);

    drawWindow(ctx, 4, 4, 232, 14);
    drawText(ctx, 'BAG', 12, 7, { color: PAL.ink, shadow: PAL.inkShadow });
    drawTextRight(ctx, `${G.money} MARKS`, 228, 7, { color: PAL.ink, shadow: PAL.inkShadow });

    const list = this.items;
    drawWindow(ctx, 4, 22, 232, 90);
    for (let r = 0; r < ROWS; r++) {
      const i = this.top + r;
      const y = 27 + r * 13;
      if (i > list.length) break;
      if (i === list.length) {
        drawText(ctx, 'CLOSE BAG', 20, y, { color: PAL.ink, shadow: PAL.inkShadow });
      } else {
        const id = list[i];
        drawText(ctx, ITEMS[id].name, 20, y, { color: PAL.ink, shadow: PAL.inkShadow });
        drawTextRight(ctx, `x${itemCount(id)}`, 226, y, { color: PAL.ink, shadow: PAL.inkShadow });
      }
      if (this.index === i) drawCursor(ctx, 9, y + 1, this.t);
    }
    if (list.length > ROWS) {
      drawText(ctx, this.top > 0 ? '^' : ' ', 224, 24, { color: PAL.ink, shadow: null });
      drawText(ctx, this.top + ROWS <= list.length ? '▾' : ' ', 224, 102, { color: PAL.ink, shadow: null });
    }

    drawWindow(ctx, 4, 116, 232, 40);
    const cur = list[this.index];
    const text = this.note || (cur ? ITEMS[cur].desc : 'Put the bag away.');
    let ty = 122;
    for (const line of wrapPx(text, 214)) {
      drawText(ctx, line, 12, ty, { color: PAL.ink, shadow: PAL.inkShadow });
      ty += 12;
    }
  }
}
