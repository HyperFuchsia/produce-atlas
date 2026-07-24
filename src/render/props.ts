import type { Obstacle, Pickup } from '../game/entities';
import { withAlpha, type ZonePalette } from './palette';

/** Screen-space projection handed to every prop drawing routine. */
export interface View {
  ctx: CanvasRenderingContext2D;
  /** world x → screen x */
  sx: (worldX: number) => number;
  /** world y → screen y */
  sy: (worldY: number) => number;
  /** metres → pixels */
  m: number;
  groundY: number;
  vw: number;
  vh: number;
  time: number;
  palette: ZonePalette;
  quality: 'high' | 'low';
}

const roundRect = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void => {
  const rr = Math.min(r, Math.abs(w) * 0.5, Math.abs(h) * 0.5);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
};

const glowLine = (
  v: View,
  x: number,
  y: number,
  w: number,
  h: number,
  color: string,
  intensity = 1,
): void => {
  const { ctx } = v;
  ctx.save();
  if (v.quality === 'high') {
    ctx.shadowColor = color;
    ctx.shadowBlur = 14 * intensity;
  }
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w, h);
  ctx.restore();
};

export const drawObstacle = (v: View, o: Obstacle): void => {
  if (o.broken) return;
  const { ctx } = v;
  const x = v.sx(o.x);
  const y = v.sy(o.y + o.h);
  const w = o.w * v.m;
  const h = o.h * v.m;
  if (x + w < -60 || x > v.vw + 60) return;
  const pal = v.palette;

  switch (o.kind) {
    // ------------------------------------------------------------- barrier
    case 'barrier': {
      const g = ctx.createLinearGradient(x, y, x, y + h);
      g.addColorStop(0, '#3c4a63');
      g.addColorStop(0.45, '#1d2637');
      g.addColorStop(1, '#0e1421');
      ctx.fillStyle = g;
      roundRect(ctx, x, y, w, h, 3);
      ctx.fill();

      // Hazard chevrons
      ctx.save();
      ctx.beginPath();
      roundRect(ctx, x, y, w, h, 3);
      ctx.clip();
      ctx.strokeStyle = withAlpha(pal.accent, 0.22);
      ctx.lineWidth = 5;
      for (let i = -2; i < w / 8 + 3; i++) {
        ctx.beginPath();
        ctx.moveTo(x + i * 14, y + h);
        ctx.lineTo(x + i * 14 + h * 0.7, y);
        ctx.stroke();
      }
      ctx.restore();

      // Vault lip — the visual promise that this one can be hand-planted.
      glowLine(v, x - 2, y - 3, w + 4, 4.5, pal.accent, 1.2);
      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      ctx.fillRect(x - 2, y - 3, w + 4, 1.4);
      break;
    }

    // ------------------------------------------------------------- stack
    case 'stack': {
      const rows = Math.max(2, Math.round(o.h / 0.65));
      const rh = h / rows;
      for (let i = 0; i < rows; i++) {
        const ry = y + i * rh;
        const shade = i % 2 === 0 ? '#26304a' : '#1b2338';
        ctx.fillStyle = shade;
        roundRect(ctx, x + 1, ry + 1, w - 2, rh - 2, 3);
        ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,0.06)';
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.fillStyle = withAlpha(pal.window, 0.5);
        ctx.fillRect(x + w * 0.18, ry + rh * 0.42, w * 0.16, 3);
      }
      glowLine(v, x, y - 2, w, 3, pal.accent, 0.8);
      break;
    }

    // ------------------------------------------------------------- beam
    case 'beam': {
      // Emitter posts
      ctx.fillStyle = '#20293c';
      ctx.fillRect(x - 3, y, 6, h);
      ctx.fillRect(x + w - 3, y, 6, h);
      // Scanning field
      const pulse = 0.55 + 0.45 * Math.sin(v.time * 6 + o.seed);
      const g = ctx.createLinearGradient(x, y, x, y + h);
      g.addColorStop(0, withAlpha('#ff3fa4', 0.03));
      g.addColorStop(1, withAlpha('#ff3fa4', 0.17 * pulse));
      ctx.fillStyle = g;
      ctx.fillRect(x, y, w, h);
      // Scan lines — sparse, so the field reads as a beam, not a wall.
      ctx.strokeStyle = withAlpha('#ff3fa4', 0.22);
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let i = 0; i < h; i += 16) {
        const yy = y + ((i + v.time * 60) % h);
        ctx.moveTo(x, yy);
        ctx.lineTo(x + w, yy);
      }
      ctx.stroke();
      // Danger lip at the bottom edge — the line you must get under — plus a
      // chevron in the gap so the required verb is legible at a glance.
      glowLine(v, x - 5, y + h - 2, w + 10, 4, '#ff3fa4', 1.6);
      const gapY = v.sy(0);
      const midX = x + w * 0.5;
      const bob = Math.sin(v.time * 5 + o.seed) * 2;
      ctx.strokeStyle = withAlpha('#ff3fa4', 0.85);
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(midX - 9, gapY - (gapY - (y + h)) * 0.45 - 8 + bob);
      ctx.lineTo(midX, gapY - (gapY - (y + h)) * 0.45 + bob);
      ctx.lineTo(midX + 9, gapY - (gapY - (y + h)) * 0.45 - 8 + bob);
      ctx.stroke();
      break;
    }

    // ------------------------------------------------------------- panel
    case 'panel': {
      const g = ctx.createLinearGradient(x, y, x + w, y + h);
      g.addColorStop(0, 'rgba(180,230,255,0.30)');
      g.addColorStop(0.5, 'rgba(120,190,230,0.16)');
      g.addColorStop(1, 'rgba(200,245,255,0.34)');
      ctx.fillStyle = g;
      ctx.fillRect(x, y, Math.max(3, w), h);
      ctx.strokeStyle = withAlpha('#9dff4d', 0.75);
      ctx.lineWidth = 2;
      ctx.strokeRect(x, y, Math.max(3, w), h);
      // Pre-scored fracture hint at dive height
      ctx.strokeStyle = 'rgba(255,255,255,0.35)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      const fy = v.sy(0.85);
      ctx.moveTo(x - 4, fy);
      ctx.lineTo(x + w + 4, fy - 4);
      ctx.stroke();
      ctx.fillStyle = withAlpha('#9dff4d', 0.5);
      ctx.fillRect(x - 3, fy - 1, w + 6, 2);
      break;
    }

    // ------------------------------------------------------------- drone
    case 'drone': {
      const cx = x + w * 0.5;
      const cy = y + h * 0.5;
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(Math.sin(v.time * 3 + o.seed) * 0.08);
      ctx.fillStyle = '#2b3550';
      roundRect(ctx, -w * 0.5, -h * 0.5, w, h, h * 0.35);
      ctx.fill();
      ctx.fillStyle = '#151c2c';
      roundRect(ctx, -w * 0.36, -h * 0.28, w * 0.72, h * 0.5, 4);
      ctx.fill();
      // Sensor eye sweeps ahead of the player
      const eye = Math.sin(v.time * 4 + o.seed) * w * 0.12;
      ctx.fillStyle = '#ff3fa4';
      ctx.save();
      if (v.quality === 'high') {
        ctx.shadowColor = '#ff3fa4';
        ctx.shadowBlur = 12;
      }
      ctx.beginPath();
      ctx.arc(eye, 0, h * 0.16, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      // Thrusters
      ctx.fillStyle = withAlpha(pal.accent, 0.5);
      ctx.fillRect(-w * 0.42, h * 0.4, w * 0.22, 3);
      ctx.fillRect(w * 0.2, h * 0.4, w * 0.22, 3);
      ctx.restore();
      // Downwash
      const grad = ctx.createLinearGradient(cx, cy + h * 0.4, cx, cy + h * 2.2);
      grad.addColorStop(0, withAlpha(pal.accent, 0.22));
      grad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = grad;
      ctx.fillRect(cx - w * 0.4, cy + h * 0.4, w * 0.8, h * 1.8);
      break;
    }

    // ------------------------------------------------------------- gate
    case 'gate': {
      const color = o.variant === 1 ? '#ff3fa4' : '#ffc857';
      ctx.fillStyle = '#151c2c';
      ctx.fillRect(x - 4, v.sy(3.6), 8, v.sy(0) - v.sy(3.6));
      ctx.fillRect(x + w - 4, v.sy(3.6), 8, v.sy(0) - v.sy(3.6));
      const pulse = 0.6 + 0.4 * Math.sin(v.time * 12 + o.seed);
      const g = ctx.createLinearGradient(x, y, x, y + h);
      g.addColorStop(0, withAlpha(color, 0.65 * pulse));
      g.addColorStop(0.5, withAlpha(color, 0.28 * pulse));
      g.addColorStop(1, withAlpha(color, 0.65 * pulse));
      ctx.fillStyle = g;
      ctx.fillRect(x, y, w, h);
      ctx.strokeStyle = withAlpha(color, 0.95);
      ctx.lineWidth = 2;
      ctx.strokeRect(x, y, w, h);
      // Arcs of plasma
      ctx.strokeStyle = withAlpha('#ffffff', 0.5 * pulse);
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      for (let i = 0; i < 3; i++) {
        const yy = y + h * ((i + 1) / 4);
        ctx.moveTo(x, yy);
        ctx.lineTo(x + w * 0.5, yy + Math.sin(v.time * 20 + i) * 4);
        ctx.lineTo(x + w, yy);
      }
      ctx.stroke();
      break;
    }

    // ------------------------------------------------------------- pad
    case 'pad': {
      ctx.fillStyle = '#1a2338';
      roundRect(ctx, x, y, w, h, 4);
      ctx.fill();
      const t = (v.time * 2.4) % 1;
      for (let i = 0; i < 3; i++) {
        const a = 1 - ((i / 3 + t) % 1);
        ctx.strokeStyle = withAlpha('#9dff4d', a * 0.9);
        ctx.lineWidth = 3;
        ctx.beginPath();
        const oy = y - 6 - ((i / 3 + t) % 1) * 26;
        ctx.moveTo(x + w * 0.22, oy + 8);
        ctx.lineTo(x + w * 0.5, oy);
        ctx.lineTo(x + w * 0.78, oy + 8);
        ctx.stroke();
      }
      glowLine(v, x, y - 2, w, 4, '#9dff4d', 1.4);
      break;
    }

    // ------------------------------------------------------------- rail
    case 'rail': {
      ctx.fillStyle = '#161e2f';
      ctx.fillRect(x, y, w, h);
      glowLine(v, x, y - 2, w, 3.5, pal.accent, 1);
      ctx.fillStyle = 'rgba(255,255,255,0.08)';
      ctx.fillRect(x, y + h - 2, w, 2);
      // Support struts down to the deck
      ctx.strokeStyle = 'rgba(120,150,190,0.25)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (let sx = x + 12; sx < x + w; sx += 46) {
        ctx.moveTo(sx, y + h);
        ctx.lineTo(sx - 6, v.groundY);
      }
      ctx.stroke();
      break;
    }

    // ------------------------------------------------------------- pylon
    case 'pylon': {
      const g = ctx.createLinearGradient(x, y, x + w, y);
      g.addColorStop(0, '#2a3450');
      g.addColorStop(1, '#141a29');
      ctx.fillStyle = g;
      ctx.fillRect(x, y, w, h);
      ctx.fillStyle = withAlpha('#ffc857', 0.9);
      ctx.fillRect(x - 2, y, w + 4, 4);
      const blink = 0.4 + 0.6 * Math.abs(Math.sin(v.time * 3 + o.seed));
      ctx.fillStyle = withAlpha('#ff3fa4', blink);
      ctx.fillRect(x + w * 0.2, y + h * 0.25, w * 0.6, 3);
      break;
    }
  }
};

export const drawPickup = (v: View, p: Pickup): void => {
  if (p.taken) return;
  const { ctx } = v;
  const x = v.sx(p.x);
  const bob = Math.sin(v.time * 3 + p.x * 0.6) * (p.kind === 'shard' ? 3 : 5);
  const y = v.sy(p.y) + bob;
  if (x < -40 || x > v.vw + 40) return;
  const r = p.r * v.m;

  ctx.save();
  ctx.translate(x, y);

  if (p.kind === 'shard') {
    ctx.rotate(v.time * 2.2 + p.x);
    ctx.fillStyle = '#45f5ff';
    if (v.quality === 'high') {
      ctx.shadowColor = '#45f5ff';
      ctx.shadowBlur = 12;
    }
    ctx.beginPath();
    ctx.moveTo(0, -r * 1.5);
    ctx.lineTo(r * 0.8, 0);
    ctx.lineTo(0, r * 1.5);
    ctx.lineTo(-r * 0.8, 0);
    ctx.closePath();
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.beginPath();
    ctx.moveTo(0, -r * 1.5);
    ctx.lineTo(r * 0.34, -r * 0.2);
    ctx.lineTo(0, r * 0.3);
    ctx.closePath();
    ctx.fill();
  } else if (p.kind === 'core') {
    ctx.rotate(v.time * 1.4);
    if (v.quality === 'high') {
      ctx.shadowColor = '#ffc857';
      ctx.shadowBlur = 20;
    }
    ctx.strokeStyle = '#ffc857';
    ctx.lineWidth = 3;
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      const px = Math.cos(a) * r * 1.5;
      const py = Math.sin(a) * r * 1.5;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.fillStyle = withAlpha('#ffc857', 0.35);
    ctx.fill();
    ctx.fillStyle = '#fff3c4';
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.55, 0, Math.PI * 2);
    ctx.fill();
  } else {
    const colors: Record<string, string> = {
      magnet: '#45f5ff',
      shield: '#9dff4d',
      overdrive: '#ff3fa4',
    };
    const color = colors[p.kind] ?? '#ffffff';
    const pulse = 0.75 + 0.25 * Math.sin(v.time * 6);
    if (v.quality === 'high') {
      ctx.shadowColor = color;
      ctx.shadowBlur = 22 * pulse;
    }
    ctx.strokeStyle = color;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(0, 0, r * 1.35 * pulse, 0, Math.PI * 2);
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.fillStyle = withAlpha(color, 0.18);
    ctx.fill();

    ctx.strokeStyle = color;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    if (p.kind === 'magnet') {
      ctx.arc(0, r * 0.25, r * 0.62, Math.PI, 0);
      ctx.moveTo(-r * 0.62, r * 0.25);
      ctx.lineTo(-r * 0.62, r * 0.75);
      ctx.moveTo(r * 0.62, r * 0.25);
      ctx.lineTo(r * 0.62, r * 0.75);
    } else if (p.kind === 'shield') {
      ctx.moveTo(0, -r * 0.85);
      ctx.lineTo(r * 0.62, -r * 0.35);
      ctx.lineTo(r * 0.42, r * 0.72);
      ctx.lineTo(0, r * 0.95);
      ctx.lineTo(-r * 0.42, r * 0.72);
      ctx.lineTo(-r * 0.62, -r * 0.35);
      ctx.closePath();
    } else {
      ctx.moveTo(r * 0.35, -r * 0.9);
      ctx.lineTo(-r * 0.45, r * 0.1);
      ctx.lineTo(r * 0.05, r * 0.1);
      ctx.lineTo(-r * 0.3, r * 0.95);
      ctx.lineTo(r * 0.5, -r * 0.1);
      ctx.lineTo(0, -r * 0.1);
      ctx.closePath();
    }
    ctx.stroke();
  }
  ctx.restore();
};
