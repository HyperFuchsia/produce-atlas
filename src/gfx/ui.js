import { PAL } from './palette.js';
import { drawText, textWidth } from './font.js';
import { TYPE_COLOR } from '../data/types.js';
import { SCREEN_W, SCREEN_H } from '../core/const.js';

/** The GBA-style bevelled window: dark rim, light inner rim, cream fill. */
export function drawWindow(ctx, x, y, w, h, opts = {}) {
  const fill = opts.fill || PAL.uiFill;
  const edge = opts.edge || '#3a2c20';
  const inner = opts.inner || (opts.dark ? '#5a6a90' : '#d8c4a0');
  const hi = opts.hi || (opts.dark ? '#8aa0c8' : '#ffffff');
  ctx.fillStyle = edge;
  ctx.fillRect(x + 1, y, w - 2, h);
  ctx.fillRect(x, y + 1, w, h - 2);
  ctx.fillStyle = hi;
  ctx.fillRect(x + 2, y + 1, w - 4, h - 2);
  ctx.fillRect(x + 1, y + 2, w - 2, h - 4);
  ctx.fillStyle = inner;
  ctx.fillRect(x + 2, y + 2, w - 4, h - 4);
  ctx.fillStyle = fill;
  ctx.fillRect(x + 3, y + 3, w - 6, h - 6);
}

export function drawPanel(ctx, x, y, w, h, color = 'rgba(20,16,28,0.72)') {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w, h);
}

const HP_COLORS = [PAL.hpGreen, PAL.hpYellow, PAL.hpRed];
export function hpColor(frac) {
  if (frac > 0.5) return HP_COLORS[0];
  if (frac > 0.2) return HP_COLORS[1];
  return HP_COLORS[2];
}

export function drawBar(ctx, x, y, w, frac, color, opts = {}) {
  const h = opts.h ?? 3;
  ctx.fillStyle = opts.frame || '#3a2c20';
  ctx.fillRect(x - 1, y - 1, w + 2, h + 2);
  ctx.fillStyle = opts.bg || '#6a5a48';
  ctx.fillRect(x, y, w, h);
  const fw = Math.max(frac > 0 ? 1 : 0, Math.round(w * Math.max(0, Math.min(1, frac))));
  ctx.fillStyle = color;
  ctx.fillRect(x, y, fw, h);
  if (h >= 3) {
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.fillRect(x, y, fw, 1);
  }
}

/** Little coloured type badge used in menus and the summary screen. */
export function drawTypeChip(ctx, type, x, y) {
  const label = type.toUpperCase();
  const w = textWidth(label) + 6;
  ctx.fillStyle = '#2a2018';
  ctx.fillRect(x, y, w, 10);
  ctx.fillStyle = TYPE_COLOR[type] || '#888';
  ctx.fillRect(x + 1, y + 1, w - 2, 8);
  ctx.fillStyle = 'rgba(255,255,255,0.28)';
  ctx.fillRect(x + 1, y + 1, w - 2, 3);
  drawText(ctx, label, x + 3, y + 1, { color: '#ffffff', shadow: 'rgba(0,0,0,0.55)' });
  return w;
}

export function drawCursor(ctx, x, y, t = 0) {
  const bob = Math.floor(t / 320) % 2;
  const px = x + bob;
  ctx.fillStyle = '#3a2c20';
  for (let i = 0; i < 7; i++) ctx.fillRect(px, y - 1 + i, 4 - Math.abs(i - 3), 1);
  ctx.fillStyle = '#e04838';
  for (let i = 0; i < 5; i++) ctx.fillRect(px + 1, y + i, 3 - Math.abs(i - 2), 1);
  ctx.fillStyle = '#f8a090';
  ctx.fillRect(px + 1, y + 1, 1, 1);
}

/** Bottom-of-screen message box. */
export function drawMessageBox(ctx, lines, opts = {}) {
  const h = opts.h ?? 46;
  const y = opts.y ?? SCREEN_H - h;
  drawWindow(ctx, 0, y, SCREEN_W, h, opts);
  let ty = y + 8;
  for (const line of lines) {
    drawText(ctx, line, 9, ty, { color: PAL.ink, shadow: PAL.inkShadow });
    ty += 13;
  }
  return { x: 0, y, w: SCREEN_W, h };
}

/** The blinking "press A" chevron in the corner of a message box. */
export function drawMoreArrow(ctx, x, y, t) {
  if (Math.floor(t / 260) % 2) return;
  ctx.fillStyle = '#3a2c20';
  for (let i = 0; i < 4; i++) ctx.fillRect(x + i, y + i, 7 - i * 2, 1);
  ctx.fillStyle = '#e04838';
  for (let i = 0; i < 3; i++) ctx.fillRect(x + 1 + i, y + i, 5 - i * 2, 1);
}

export function fadeRect(ctx, alpha, color = '#000') {
  if (alpha <= 0) return;
  ctx.globalAlpha = Math.min(1, alpha);
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, SCREEN_W, SCREEN_H);
  ctx.globalAlpha = 1;
}
