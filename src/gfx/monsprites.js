import { renderMon, spriteBounds, MON_W, MON_H } from './monart.js';
import { MON_ART } from './monrecipes.js';
import { silhouette } from './pixel.js';

const cache = new Map();

function build(id, back, scale) {
  const recipe = MON_ART[id] || MON_ART.sproutle;
  const canvas = renderMon(recipe, back, scale);
  return { canvas, bounds: spriteBounds(canvas), w: canvas.width, h: canvas.height };
}

export function monSprite(id, back = false) {
  const key = `${id}:${back ? 'b' : 'f'}`;
  if (!cache.has(key)) cache.set(key, build(id, back, 1));
  return cache.get(key);
}

export function monIcon(id) {
  const key = `${id}:icon`;
  if (!cache.has(key)) cache.set(key, build(id, false, 0.5));
  return cache.get(key);
}

const silCache = new Map();
export function monSilhouette(id, back, color = '#ffffff') {
  const key = `${id}:${back ? 'b' : 'f'}:${color}`;
  if (!silCache.has(key)) silCache.set(key, silhouette(monSprite(id, back).canvas, color));
  return silCache.get(key);
}

export { MON_W, MON_H };
