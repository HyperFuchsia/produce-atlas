import { SCREEN_W, SCREEN_H } from './const.js';

export const canvas = document.getElementById('screen');
export const ctx = canvas.getContext('2d', { alpha: false });
ctx.imageSmoothingEnabled = false;

/** Create an offscreen pixel buffer with smoothing disabled. */
export function makeCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const g = c.getContext('2d');
  g.imageSmoothingEnabled = false;
  return c;
}

let scale = 1;
export function getScale() {
  return scale;
}

function fit() {
  const pad = window.innerWidth < 560 ? 0 : 24;
  const sw = (window.innerWidth - pad) / SCREEN_W;
  const sh = (window.innerHeight - pad) / SCREEN_H;
  scale = Math.max(1, Math.floor(Math.min(sw, sh)));
  // On very small screens allow fractional scaling so the whole frame is visible.
  if (scale * SCREEN_W > window.innerWidth || scale * SCREEN_H > window.innerHeight) {
    scale = Math.min(sw, sh);
  }
  canvas.style.width = Math.floor(SCREEN_W * scale) + 'px';
  canvas.style.height = Math.floor(SCREEN_H * scale) + 'px';
}

window.addEventListener('resize', fit);
window.addEventListener('orientationchange', () => setTimeout(fit, 120));
fit();

/** Fill the whole framebuffer with a colour. */
export function clear(color = '#000') {
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, SCREEN_W, SCREEN_H);
}
