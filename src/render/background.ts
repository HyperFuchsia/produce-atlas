import { clamp } from '../engine/math';
import { mix, withAlpha, type ZonePalette } from './palette';

/**
 * The city. Every building is derived from a hash of its own index, so the
 * skyline is infinite, deterministic and costs zero memory — nothing is ever
 * stored or spawned, we simply draw whatever the current camera window implies.
 */

const hash = (n: number): number => {
  let x = Math.imul(n ^ 0x9e3779b9, 0x85ebca6b);
  x ^= x >>> 13;
  x = Math.imul(x, 0xc2b2ae35);
  x ^= x >>> 16;
  return (x >>> 0) / 4294967296;
};

export interface BgOpts {
  ctx: CanvasRenderingContext2D;
  vw: number;
  vh: number;
  /** Camera position in world metres. */
  camX: number;
  camY: number;
  groundY: number;
  pxPerM: number;
  palette: ZonePalette;
  /** 0..1 blend into the next zone. */
  blend: number;
  next: ZonePalette;
  time: number;
  quality: 'high' | 'low';
  flow: number;
}

const lerpPalette = (a: ZonePalette, b: ZonePalette, t: number): ZonePalette =>
  t <= 0.001
    ? a
    : {
        ...a,
        name: t > 0.5 ? b.name : a.name,
        tagline: t > 0.5 ? b.tagline : a.tagline,
        sky: [mix(a.sky[0], b.sky[0], t), mix(a.sky[1], b.sky[1], t), mix(a.sky[2], b.sky[2], t)],
        far: mix(a.far, b.far, t),
        mid: mix(a.mid, b.mid, t),
        near: mix(a.near, b.near, t),
        window: mix(a.window, b.window, t),
        accent: mix(a.accent, b.accent, t),
        accent2: mix(a.accent2, b.accent2, t),
        ground: mix(a.ground, b.ground, t),
        groundGlow: mix(a.groundGlow, b.groundGlow, t),
        weather: t > 0.5 ? b.weather : a.weather,
      };

export const blendedPalette = (a: ZonePalette, b: ZonePalette, t: number): ZonePalette => lerpPalette(a, b, t);

export const drawBackground = (o: BgOpts): void => {
  const { ctx, vw, vh } = o;
  const pal = lerpPalette(o.palette, o.next, o.blend);
  const camPx = o.camX * o.pxPerM;
  const camLift = o.camY * o.pxPerM;

  // ------------------------------------------------------------------ sky
  const sky = ctx.createLinearGradient(0, 0, 0, o.groundY + camLift);
  sky.addColorStop(0, pal.sky[0]);
  sky.addColorStop(0.55, pal.sky[1]);
  sky.addColorStop(1, pal.sky[2]);
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, vw, vh);

  // ------------------------------------------------------------------ sun / halo
  const sunX = vw * 0.72;
  const sunY = vh * pal.sunY + camLift * 0.08;
  const halo = ctx.createRadialGradient(sunX, sunY, 0, sunX, sunY, vh * 0.62);
  halo.addColorStop(0, pal.sun);
  halo.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = halo;
  ctx.fillRect(0, 0, vw, vh);

  // A hanging world: the sister planet the Conduit was built to service.
  const planetR = vh * 0.19;
  const px = vw * 0.74 - (camPx * 0.004) % (vw * 3);
  ctx.save();
  ctx.beginPath();
  ctx.arc(px, sunY, planetR, 0, Math.PI * 2);
  ctx.clip();
  const pg = ctx.createLinearGradient(px - planetR, sunY - planetR, px + planetR, sunY + planetR);
  pg.addColorStop(0, withAlpha(pal.window, 0.34));
  pg.addColorStop(0.55, withAlpha(pal.window, 0.12));
  pg.addColorStop(1, 'rgba(0,0,0,0.25)');
  ctx.fillStyle = pg;
  ctx.fillRect(px - planetR, sunY - planetR, planetR * 2, planetR * 2);
  ctx.fillStyle = withAlpha(pal.window, 0.1);
  for (let i = 0; i < 3; i++) {
    ctx.beginPath();
    ctx.ellipse(px - planetR * 0.2 + i * planetR * 0.3, sunY - planetR * 0.5 + i * planetR * 0.45, planetR * 0.5, planetR * 0.14, 0.3, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
  ctx.strokeStyle = withAlpha(pal.window, 0.4);
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.ellipse(px, sunY, planetR * 1.5, planetR * 0.24, -0.3, 0, Math.PI * 2);
  ctx.stroke();

  // Air traffic — long streaks drifting between the towers.
  const laneCount = o.quality === 'low' ? 3 : 6;
  for (let i = 0; i < laneCount; i++) {
    const speed = 26 + (i % 3) * 22;
    const y = vh * (0.1 + ((i * 0.13) % 0.42));
    const span = vw + 320;
    const x = span - ((o.time * speed + i * 220 + camPx * 0.02) % span) - 160;
    const len = 26 + (i % 4) * 16;
    const g = ctx.createLinearGradient(x, y, x + len, y);
    g.addColorStop(0, 'rgba(255,255,255,0)');
    g.addColorStop(0.7, withAlpha(i % 2 ? pal.accent2 : pal.accent, 0.5));
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(x, y, len, 1.8);
    ctx.fillStyle = withAlpha(i % 2 ? pal.accent2 : pal.accent, 0.85);
    ctx.fillRect(x + len - 3, y - 0.5, 3.5, 2.8);
  }

  // ------------------------------------------------------------------ stars / weather bed
  if (pal.weather === 'star') {
    ctx.fillStyle = 'rgba(255,255,255,0.75)';
    for (let i = 0; i < 60; i++) {
      const sx = (hash(i * 3 + 1) * vw * 2 - camPx * 0.015) % (vw * 1.4);
      const x = sx < 0 ? sx + vw * 1.4 : sx;
      const y = hash(i * 7 + 5) * o.groundY * 0.7;
      const tw = 0.4 + 0.6 * Math.abs(Math.sin(o.time * 1.4 + i));
      ctx.globalAlpha = tw * 0.8;
      ctx.fillRect(x, y, 1.6, 1.6);
    }
    ctx.globalAlpha = 1;
  }

  // ------------------------------------------------------------------ skyline layers
  drawSkyline(ctx, {
    vw,
    groundY: o.groundY + camLift * 0.25,
    camPx,
    parallax: 0.05,
    spacing: 78,
    minH: 60,
    maxH: 200,
    color: pal.far,
    windowColor: pal.window,
    windowAlpha: 0.1,
    seedOffset: 11,
    quality: o.quality,
    time: o.time,
  });

  ctx.fillStyle = pal.fog;
  ctx.fillRect(0, o.groundY - 240 + camLift * 0.2, vw, 260);

  drawSkyline(ctx, {
    vw,
    groundY: o.groundY + camLift * 0.5,
    camPx,
    parallax: 0.14,
    spacing: 104,
    minH: 110,
    maxH: 300,
    color: pal.mid,
    windowColor: pal.window,
    windowAlpha: 0.24,
    seedOffset: 71,
    quality: o.quality,
    time: o.time,
  });

  drawSkyRail(ctx, vw, o.groundY - 210 + camLift * 0.45, camPx * 0.22, pal, o.time);

  drawSkyline(ctx, {
    vw,
    groundY: o.groundY + camLift * 0.78,
    camPx,
    parallax: 0.32,
    spacing: 150,
    minH: 170,
    maxH: 430,
    color: pal.near,
    windowColor: pal.window,
    windowAlpha: 0.4,
    seedOffset: 173,
    quality: o.quality,
    time: o.time,
    signs: true,
    accent: pal.accent2,
  });

  // ------------------------------------------------------------------ horizon glow
  const glow = ctx.createLinearGradient(0, o.groundY - 90 + camLift, 0, o.groundY + camLift);
  glow.addColorStop(0, 'rgba(0,0,0,0)');
  glow.addColorStop(1, withAlpha(pal.groundGlow, 0.16 + o.flow * 0.12));
  ctx.fillStyle = glow;
  ctx.fillRect(0, o.groundY - 90 + camLift, vw, 90);
};

/** An elevated maglev line strung between the towers, with trains on it. */
const drawSkyRail = (
  ctx: CanvasRenderingContext2D,
  vw: number,
  y: number,
  shift: number,
  pal: ZonePalette,
  time: number,
): void => {
  ctx.save();
  ctx.strokeStyle = withAlpha(pal.accent, 0.16);
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(0, y);
  ctx.lineTo(vw, y);
  ctx.stroke();

  // Pylons
  const spacing = 260;
  const off = ((-shift % spacing) + spacing) % spacing;
  ctx.fillStyle = 'rgba(6,10,20,0.85)';
  for (let x = off - spacing; x < vw + spacing; x += spacing) {
    ctx.fillRect(x - 3, y, 6, 130);
    ctx.fillStyle = withAlpha(pal.accent, 0.3);
    ctx.fillRect(x - 9, y - 4, 18, 3);
    ctx.fillStyle = 'rgba(6,10,20,0.85)';
  }

  // A train sweeps through every few seconds.
  const period = 9;
  const t = (time % period) / period;
  if (t < 0.55) {
    const trainW = 210;
    const x = vw + 120 - (t / 0.55) * (vw + 380);
    ctx.fillStyle = 'rgba(12,18,34,0.95)';
    ctx.fillRect(x, y - 15, trainW, 15);
    ctx.fillStyle = withAlpha(pal.window, 0.75);
    for (let i = 0; i < 9; i++) ctx.fillRect(x + 10 + i * 22, y - 11, 12, 6);
    ctx.fillStyle = withAlpha(pal.accent, 0.9);
    ctx.fillRect(x, y - 2, trainW, 2);
    const g = ctx.createLinearGradient(x + trainW, y - 8, x + trainW + 90, y - 8);
    g.addColorStop(0, withAlpha(pal.accent, 0.4));
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(x + trainW, y - 9, 90, 6);
  }
  ctx.restore();
};

interface SkylineOpts {
  vw: number;
  groundY: number;
  camPx: number;
  parallax: number;
  spacing: number;
  minH: number;
  maxH: number;
  color: string;
  windowColor: string;
  windowAlpha: number;
  seedOffset: number;
  quality: 'high' | 'low';
  time: number;
  signs?: boolean;
  accent?: string;
}

const drawSkyline = (ctx: CanvasRenderingContext2D, o: SkylineOpts): void => {
  const shift = o.camPx * o.parallax;
  const i0 = Math.floor((shift - o.spacing) / o.spacing);
  const i1 = Math.ceil((shift + o.vw + o.spacing) / o.spacing);

  for (let i = i0; i <= i1; i++) {
    const r = hash(i + o.seedOffset * 1013);
    const r2 = hash(i * 7 + o.seedOffset);
    const r3 = hash(i * 31 + o.seedOffset * 3);
    const w = o.spacing * (0.55 + r2 * 0.5);
    const h = o.minH + r * (o.maxH - o.minH);
    const x = i * o.spacing - shift + (r3 - 0.5) * o.spacing * 0.25;
    const y = o.groundY - h;

    ctx.fillStyle = o.color;
    ctx.fillRect(x, y, w, h + 20);

    // Roof furniture — antennae and blocks break up the silhouette.
    if (r3 > 0.72) {
      ctx.fillRect(x + w * 0.4, y - 22 - r * 26, 3, 24 + r * 26);
      ctx.fillStyle = withAlpha(o.accent ?? o.windowColor, 0.85);
      ctx.fillRect(x + w * 0.4 - 1, y - 24 - r * 26, 5, 4);
      ctx.fillStyle = o.color;
    } else if (r3 > 0.5) {
      ctx.fillRect(x + w * 0.18, y - 12, w * 0.3, 12);
    }

    // Windows
    if (o.windowAlpha > 0.05) {
      const cols = Math.max(2, Math.floor(w / 12));
      const rows = Math.max(3, Math.floor(h / 18));
      const cw = w / cols;
      const ch = h / rows;
      const step = o.quality === 'low' ? 2 : 1;
      for (let cx = 0; cx < cols; cx += step) {
        for (let cy = 0; cy < rows; cy += step) {
          const lit = hash(i * 977 + cx * 31 + cy * 7 + o.seedOffset);
          if (lit < 0.52) continue;
          const flicker = lit > 0.97 ? 0.5 + 0.5 * Math.sin(o.time * 6 + i + cx) : 1;
          ctx.fillStyle = withAlpha(o.windowColor, o.windowAlpha * (0.35 + lit * 0.65) * flicker);
          ctx.fillRect(x + cx * cw + cw * 0.22, y + cy * ch + ch * 0.22, cw * 0.5, ch * 0.42);
        }
      }
    }

    // A few holo-signs on the nearest layer.
    if (o.signs && r2 > 0.78) {
      const sw = w * 0.5;
      const sh = 26 + r * 30;
      const sx = x + w * 0.25;
      const sy = y + 24 + r3 * 60;
      const pulse = 0.55 + 0.45 * Math.sin(o.time * 2.2 + i);
      ctx.fillStyle = withAlpha(o.accent ?? o.windowColor, 0.16 * pulse);
      ctx.fillRect(sx, sy, sw, sh);
      ctx.strokeStyle = withAlpha(o.accent ?? o.windowColor, 0.85 * pulse);
      ctx.lineWidth = 1.5;
      ctx.strokeRect(sx, sy, sw, sh);
      ctx.fillStyle = withAlpha(o.accent ?? o.windowColor, 0.8 * pulse);
      for (let k = 0; k < 3; k++) {
        ctx.fillRect(sx + 5, sy + 6 + k * (sh / 3.4), sw * (0.3 + hash(i * 13 + k) * 0.5), 3);
      }
    }
  }
};

/** The running surface plus its perspective grid, drawn under the entities. */
export const drawGround = (o: BgOpts, gaps: { x0: number; x1: number }[]): void => {
  const { ctx, vw, vh } = o;
  const pal = lerpPalette(o.palette, o.next, o.blend);
  const gy = o.groundY;
  const camPx = o.camX * o.pxPerM;

  // Deck
  const deck = ctx.createLinearGradient(0, gy, 0, vh);
  deck.addColorStop(0, mix(pal.ground, '#000000', 0.15));
  deck.addColorStop(1, '#02030a');
  ctx.fillStyle = deck;
  ctx.fillRect(0, gy, vw, vh - gy);

  // Deck panels — seams and the odd lit service hatch give the floor texture
  // and, more importantly, give the eye something to measure speed against.
  const panel = 3 * o.pxPerM;
  const pOff = ((-camPx % panel) + panel) % panel;
  for (let x = pOff - panel, i = 0; x < vw + panel; x += panel, i++) {
    const idx = Math.floor((camPx + x) / panel);
    const r = Math.abs(Math.sin(idx * 12.9898) * 43758.5453) % 1;
    if (r > 0.82) {
      ctx.fillStyle = withAlpha(pal.groundGlow, 0.06);
      ctx.fillRect(x + panel * 0.15, gy + 6, panel * 0.7, 10);
      ctx.fillStyle = withAlpha(pal.groundGlow, 0.5);
      ctx.fillRect(x + panel * 0.15, gy + 6, panel * 0.7, 1.5);
    } else if (r > 0.6) {
      ctx.fillStyle = 'rgba(255,255,255,0.025)';
      ctx.fillRect(x + panel * 0.1, gy + 4, panel * 0.8, 26);
    }
    ctx.fillStyle = withAlpha(pal.groundGlow, 0.14);
    ctx.fillRect(x, gy + 2, 1.5, 20);
  }

  // Perspective lines racing toward the camera sell the speed.
  const spacing = 4 * o.pxPerM;
  const offset = ((-camPx % spacing) + spacing) % spacing;
  ctx.strokeStyle = withAlpha(pal.groundGlow, 0.12);
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (let x = offset - spacing; x < vw + spacing; x += spacing) {
    const depth = 1;
    ctx.moveTo(x, gy + 2);
    ctx.lineTo(x - 46 * depth, vh);
  }
  ctx.stroke();

  // Under-deck structure: girders and service lights receding below the run.
  const girder = 6 * o.pxPerM;
  const gOff = ((-camPx * 0.85) % girder + girder) % girder;
  ctx.save();
  ctx.globalAlpha = 0.5;
  for (let x = gOff - girder; x < vw + girder; x += girder) {
    ctx.strokeStyle = 'rgba(90,120,160,0.16)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x, gy + 18);
    ctx.lineTo(x - 30, vh);
    ctx.moveTo(x, gy + 18);
    ctx.lineTo(x + 46, gy + 74);
    ctx.stroke();
    ctx.fillStyle = withAlpha(pal.accent2, 0.5);
    ctx.fillRect(x - 2, gy + 52, 4, 4);
  }
  ctx.restore();

  ctx.strokeStyle = withAlpha(pal.groundGlow, 0.08);
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let i = 1; i < 5; i++) {
    const y = gy + Math.pow(i / 5, 1.7) * (vh - gy);
    ctx.moveTo(0, y);
    ctx.lineTo(vw, y);
  }
  ctx.stroke();

  // Edge light
  ctx.fillStyle = withAlpha(pal.groundGlow, 0.85);
  ctx.fillRect(0, gy - 2, vw, 2.5);
  ctx.fillStyle = withAlpha(pal.groundGlow, 0.22);
  ctx.fillRect(0, gy - 6, vw, 4);

  // Punch out the pits, and light their edges so they read instantly.
  for (const g of gaps) {
    const x0 = (g.x0 - o.camX) * o.pxPerM + o.vw * 0.27;
    const x1 = (g.x1 - o.camX) * o.pxPerM + o.vw * 0.27;
    if (x1 < -40 || x0 > vw + 40) continue;
    const grad = ctx.createLinearGradient(0, gy, 0, vh);
    grad.addColorStop(0, '#01020a');
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = '#01020a';
    ctx.fillRect(x0, gy - 3, x1 - x0, vh - gy);
    ctx.fillStyle = grad;
    ctx.fillRect(x0, gy - 3, x1 - x0, vh - gy);
    ctx.fillStyle = withAlpha('#ff3fa4', 0.9);
    ctx.fillRect(x0 - 3, gy - 4, 4, 8);
    ctx.fillRect(x1 - 1, gy - 4, 4, 8);
    ctx.fillStyle = withAlpha('#ff3fa4', 0.18);
    ctx.fillRect(x0, gy - 26, x1 - x0, 24);
  }
};

/** Foreground cables that whip past the camera for depth. */
export const drawForeground = (o: BgOpts): void => {
  if (o.quality === 'low') return;
  const { ctx, vw } = o;
  const pal = lerpPalette(o.palette, o.next, o.blend);
  const shift = o.camX * o.pxPerM * 1.85;
  const spacing = 620;
  const i0 = Math.floor((shift - spacing) / spacing);
  const i1 = Math.ceil((shift + vw + spacing) / spacing);
  ctx.save();
  for (let i = i0; i <= i1; i++) {
    const r = hash(i * 401 + 17);
    const x = i * spacing - shift;
    ctx.globalAlpha = 0.5;
    ctx.strokeStyle = '#01030a';
    ctx.lineWidth = 8 + r * 14;
    ctx.beginPath();
    ctx.moveTo(x, -20);
    ctx.quadraticCurveTo(x + 40, o.groundY * 0.4, x - 20, o.groundY + 120);
    ctx.stroke();
    ctx.globalAlpha = 0.35;
    ctx.strokeStyle = withAlpha(pal.accent, 0.5);
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }
  ctx.restore();
  ctx.globalAlpha = 1;
};

/** Vignette + chromatic warmth, applied last. */
export const drawPost = (
  ctx: CanvasRenderingContext2D,
  vw: number,
  vh: number,
  pal: ZonePalette,
  flow: number,
  overdrive: number,
  danger: number,
): void => {
  const v = ctx.createRadialGradient(vw * 0.5, vh * 0.5, vh * 0.35, vw * 0.5, vh * 0.5, vh * 0.95);
  v.addColorStop(0, 'rgba(0,0,0,0)');
  v.addColorStop(1, `rgba(0,0,0,${0.55 - flow * 0.1})`);
  ctx.fillStyle = v;
  ctx.fillRect(0, 0, vw, vh);

  if (flow > 0) {
    ctx.fillStyle = withAlpha(pal.accent2, 0.05 + flow * 0.05);
    ctx.fillRect(0, 0, vw, vh);
  }
  if (overdrive > 0) {
    const g = ctx.createLinearGradient(0, 0, vw, 0);
    g.addColorStop(0, withAlpha(pal.accent2, 0.22 * clamp(overdrive, 0, 1)));
    g.addColorStop(0.5, 'rgba(0,0,0,0)');
    g.addColorStop(1, withAlpha(pal.accent, 0.16 * clamp(overdrive, 0, 1)));
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, vw, vh);
  }
  if (danger > 0) {
    ctx.fillStyle = `rgba(255,60,60,${0.3 * danger})`;
    ctx.fillRect(0, 0, vw, vh);
  }
};
