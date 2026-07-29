import { SCREEN_W, SCREEN_H } from '../core/const.js';
import { input } from '../core/input.js';
import { audio } from '../core/audio.js';
import { clamp } from '../core/util.js';
import { drawText, drawTextRight } from '../gfx/font.js';
import { drawWindow, drawCursor } from '../gfx/ui.js';
import { PAL } from '../gfx/palette.js';
import { app } from '../game/app.js';
import { wrapPx } from '../game/dialog.js';
import { G, addItem, itemCount } from '../game/state.js';
import { ITEMS, SHOP_STOCK } from '../data/items.js';

const ROWS = 5;

export class ShopState {
  constructor() {
    this.index = 0;
    this.top = 0;
    this.t = 0;
    this.qty = 1;
    this.mode = 'list';
    this.note = 'Take your time.';
  }

  update(dt) {
    this.t += dt;
    const n = SHOP_STOCK.length + 1;
    if (this.mode === 'qty') {
      const id = SHOP_STOCK[this.index];
      const price = ITEMS[id].price;
      const maxQty = Math.max(1, Math.min(99, Math.floor(G.money / price)));
      const before = this.qty;
      if (input.repeat('UP')) this.qty = clamp(this.qty + 1, 1, maxQty);
      if (input.repeat('DOWN')) this.qty = clamp(this.qty - 1, 1, maxQty);
      if (input.repeat('RIGHT')) this.qty = clamp(this.qty + 10, 1, maxQty);
      if (input.repeat('LEFT')) this.qty = clamp(this.qty - 10, 1, maxQty);
      if (this.qty !== before) audio.sfx('cursor');
      if (input.pressed('B')) { audio.sfx('cancel'); this.mode = 'list'; return; }
      if (input.pressed('A')) {
        const total = price * this.qty;
        if (total > G.money) { audio.sfx('bump'); this.note = 'Not enough MARKS.'; return; }
        G.money -= total;
        addItem(id, this.qty);
        audio.sfx('save');
        this.note = `${this.qty} x ${ITEMS[id].name}. Thank you.`;
        this.mode = 'list';
      }
      return;
    }

    const before = this.index;
    if (input.repeat('UP')) this.index = (this.index + n - 1) % n;
    if (input.repeat('DOWN')) this.index = (this.index + 1) % n;
    if (this.index !== before) audio.sfx('cursor');
    if (this.index < this.top) this.top = this.index;
    if (this.index >= this.top + ROWS) this.top = this.index - ROWS + 1;
    if (input.pressed('B')) { audio.sfx('cancel'); app.pop(); return; }
    if (input.pressed('A')) {
      if (this.index >= SHOP_STOCK.length) { audio.sfx('cancel'); app.pop(); return; }
      audio.sfx('select');
      this.qty = 1;
      this.mode = 'qty';
    }
  }

  render(ctx) {
    ctx.fillStyle = '#3a4a5a';
    ctx.fillRect(0, 0, SCREEN_W, SCREEN_H);
    ctx.fillStyle = '#44566a';
    for (let y = 0; y < SCREEN_H; y += 6) ctx.fillRect(0, y, SCREEN_W, 3);

    drawWindow(ctx, 4, 4, 130, 14);
    drawText(ctx, 'SUPPLY COUNTER', 10, 7, { color: PAL.ink, shadow: PAL.inkShadow });
    drawWindow(ctx, 140, 4, 96, 14);
    drawTextRight(ctx, `${G.money} MARKS`, 230, 7, { color: PAL.ink, shadow: PAL.inkShadow });

    drawWindow(ctx, 4, 22, 232, 80);
    for (let r = 0; r < ROWS; r++) {
      const i = this.top + r;
      if (i > SHOP_STOCK.length) break;
      const y = 28 + r * 13;
      if (i === SHOP_STOCK.length) {
        drawText(ctx, 'LEAVE', 20, y, { color: PAL.ink, shadow: PAL.inkShadow });
      } else {
        const id = SHOP_STOCK[i];
        drawText(ctx, ITEMS[id].name, 20, y, { color: PAL.ink, shadow: PAL.inkShadow });
        drawTextRight(ctx, `${ITEMS[id].price}`, 190, y, { color: PAL.ink, shadow: PAL.inkShadow });
        drawTextRight(ctx, `have ${itemCount(id)}`, 228, y, { color: '#6a5a48', shadow: null });
      }
      if (this.index === i) drawCursor(ctx, 9, y + 1, this.t);
    }

    drawWindow(ctx, 4, 106, 232, 50);
    const id = SHOP_STOCK[this.index];
    const desc = id ? ITEMS[id].desc : 'Come again.';
    let ty = 112;
    for (const line of wrapPx(desc, 214)) {
      drawText(ctx, line, 12, ty, { color: PAL.ink, shadow: PAL.inkShadow });
      ty += 12;
    }
    drawText(ctx, this.note, 12, 142, { color: '#6a5a48', shadow: null });

    if (this.mode === 'qty') {
      const price = ITEMS[id].price;
      drawWindow(ctx, 120, 60, 116, 40);
      drawText(ctx, `${ITEMS[id].name}`, 128, 66, { color: PAL.ink, shadow: PAL.inkShadow });
      drawText(ctx, `x ${this.qty}`, 128, 80, { color: PAL.ink, shadow: PAL.inkShadow });
      drawTextRight(ctx, `${price * this.qty}`, 228, 80, { color: PAL.ink, shadow: PAL.inkShadow });
    }
  }
}
