import { clamp } from '../engine/math';
import { withAlpha, type ZonePalette } from './palette';
import type { View } from './props';

/**
 * Particles, popups and weather. Everything is pooled and lives in world
 * metres so it scrolls with the track; nothing here can ever affect the sim.
 */

type PKind = 'spark' | 'dust' | 'glass' | 'smoke' | 'ring' | 'bit' | 'trail';

interface Particle {
  alive: boolean;
  kind: PKind;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
  gravity: number;
  drag: number;
  spin: number;
  angle: number;
}

interface Popup {
  alive: boolean;
  x: number;
  y: number;
  vy: number;
  life: number;
  maxLife: number;
  text: string;
  color: string;
  scale: number;
}

interface Echo {
  x: number;
  y: number;
  life: number;
  cycle: number;
  state: string;
}

const MAX_PARTICLES = 420;
const MAX_POPUPS = 24;

export class Fx {
  private pool: Particle[] = [];
  private popups: Popup[] = [];
  private weatherX: number[] = [];
  private weatherY: number[] = [];
  private weatherV: number[] = [];
  echoes: Echo[] = [];
  flash = 0;
  flashColor = '#ffffff';

  constructor() {
    for (let i = 0; i < MAX_PARTICLES; i++) {
      this.pool.push({
        alive: false,
        kind: 'spark',
        x: 0,
        y: 0,
        vx: 0,
        vy: 0,
        life: 0,
        maxLife: 1,
        size: 1,
        color: '#fff',
        gravity: 0,
        drag: 1,
        spin: 0,
        angle: 0,
      });
    }
    for (let i = 0; i < MAX_POPUPS; i++) {
      this.popups.push({ alive: false, x: 0, y: 0, vy: 0, life: 0, maxLife: 1, text: '', color: '#fff', scale: 1 });
    }
    for (let i = 0; i < 140; i++) {
      this.weatherX.push(Math.random());
      this.weatherY.push(Math.random());
      this.weatherV.push(0.6 + Math.random() * 0.8);
    }
  }

  reset(): void {
    for (const p of this.pool) p.alive = false;
    for (const p of this.popups) p.alive = false;
    this.echoes.length = 0;
    this.flash = 0;
  }

  private spawn(): Particle | null {
    for (let i = 0; i < this.pool.length; i++) {
      const p = this.pool[i];
      if (!p.alive) return p;
    }
    return null;
  }

  emit(
    kind: PKind,
    x: number,
    y: number,
    count: number,
    opts: {
      speed?: number;
      spread?: number;
      dir?: number;
      color?: string;
      size?: number;
      life?: number;
      gravity?: number;
      drag?: number;
    } = {},
  ): void {
    for (let i = 0; i < count; i++) {
      const p = this.spawn();
      if (!p) return;
      const dir = (opts.dir ?? 0) + (Math.random() - 0.5) * (opts.spread ?? Math.PI * 2);
      const spd = (opts.speed ?? 4) * (0.4 + Math.random() * 0.9);
      p.alive = true;
      p.kind = kind;
      p.x = x + (Math.random() - 0.5) * 0.2;
      p.y = y + (Math.random() - 0.5) * 0.2;
      p.vx = Math.cos(dir) * spd;
      p.vy = Math.sin(dir) * spd;
      p.maxLife = (opts.life ?? 0.6) * (0.6 + Math.random() * 0.8);
      p.life = p.maxLife;
      p.size = (opts.size ?? 0.09) * (0.6 + Math.random() * 0.9);
      p.color = opts.color ?? '#ffffff';
      p.gravity = opts.gravity ?? -14;
      p.drag = opts.drag ?? 0.92;
      p.angle = Math.random() * Math.PI * 2;
      p.spin = (Math.random() - 0.5) * 14;
    }
  }

  popup(x: number, y: number, text: string, color: string, scale = 1): void {
    let slot: Popup | null = null;
    for (const p of this.popups) {
      if (!p.alive) {
        slot = p;
        break;
      }
    }
    if (!slot) {
      slot = this.popups.reduce((a, b) => (a.life < b.life ? a : b));
    }
    slot.alive = true;
    slot.x = x;
    slot.y = y;
    slot.vy = 1.7;
    slot.maxLife = 1.05;
    slot.life = slot.maxLife;
    slot.text = text;
    slot.color = color;
    slot.scale = scale;
  }

  screenFlash(color: string, amount = 0.5): void {
    this.flash = Math.max(this.flash, amount);
    this.flashColor = color;
  }

  pushEcho(x: number, y: number, cycle: number, state: string): void {
    this.echoes.push({ x, y, life: 0.34, cycle, state });
    if (this.echoes.length > 12) this.echoes.shift();
  }

  update(dt: number): void {
    for (const p of this.pool) {
      if (!p.alive) continue;
      p.life -= dt;
      if (p.life <= 0) {
        p.alive = false;
        continue;
      }
      p.vy += p.gravity * dt;
      p.vx *= Math.pow(p.drag, dt * 60);
      p.vy *= Math.pow(p.drag, dt * 60);
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.angle += p.spin * dt;
      if (p.kind === 'glass' && p.y < 0.02) {
        p.y = 0.02;
        p.vy *= -0.35;
        p.vx *= 0.7;
      }
    }
    for (const p of this.popups) {
      if (!p.alive) continue;
      p.life -= dt;
      if (p.life <= 0) {
        p.alive = false;
        continue;
      }
      p.y += p.vy * dt;
      p.vy *= 0.94;
    }
    for (let i = this.echoes.length - 1; i >= 0; i--) {
      this.echoes[i].life -= dt;
      if (this.echoes[i].life <= 0) this.echoes.splice(i, 1);
    }
    this.flash = Math.max(0, this.flash - dt * 2.6);
  }

  draw(v: View): void {
    const { ctx } = v;
    ctx.save();
    for (const p of this.pool) {
      if (!p.alive) continue;
      const sx = v.sx(p.x);
      if (sx < -40 || sx > v.vw + 40) continue;
      const sy = v.sy(p.y);
      const t = clamp(p.life / p.maxLife, 0, 1);
      const size = p.size * v.m;

      switch (p.kind) {
        case 'spark':
        case 'bit': {
          ctx.globalAlpha = t;
          ctx.fillStyle = p.color;
          const len = p.kind === 'spark' ? size * (1.5 + Math.hypot(p.vx, p.vy) * 0.12) : size;
          ctx.save();
          ctx.translate(sx, sy);
          ctx.rotate(Math.atan2(-p.vy, p.vx));
          ctx.fillRect(-len * 0.5, -size * 0.25, len, size * 0.5);
          ctx.restore();
          break;
        }
        case 'glass': {
          ctx.globalAlpha = t * 0.9;
          ctx.fillStyle = p.color;
          ctx.save();
          ctx.translate(sx, sy);
          ctx.rotate(p.angle);
          ctx.beginPath();
          ctx.moveTo(-size, -size * 0.6);
          ctx.lineTo(size * 0.8, -size * 0.2);
          ctx.lineTo(size * 0.2, size);
          ctx.closePath();
          ctx.fill();
          ctx.restore();
          break;
        }
        case 'smoke':
        case 'dust': {
          ctx.globalAlpha = t * 0.45;
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.arc(sx, sy, size * (2.2 - t), 0, Math.PI * 2);
          ctx.fill();
          break;
        }
        case 'ring': {
          ctx.globalAlpha = t * 0.8;
          ctx.strokeStyle = p.color;
          ctx.lineWidth = 3 * t;
          ctx.beginPath();
          ctx.arc(sx, sy, size * (1 - t) * 14 + 4, 0, Math.PI * 2);
          ctx.stroke();
          break;
        }
        case 'trail': {
          ctx.globalAlpha = t * 0.6;
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.arc(sx, sy, size * t * 1.6, 0, Math.PI * 2);
          ctx.fill();
          break;
        }
      }
    }
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  drawPopups(v: View): void {
    const { ctx } = v;
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (const p of this.popups) {
      if (!p.alive) continue;
      const sx = v.sx(p.x);
      const sy = v.sy(p.y);
      if (sx < -80 || sx > v.vw + 80) continue;
      const t = clamp(p.life / p.maxLife, 0, 1);
      const pop = t > 0.85 ? 1 + (1 - t) * 4 : 1;
      ctx.globalAlpha = Math.min(1, t * 1.8);
      ctx.font = `900 ${Math.round(15 * p.scale * pop)}px "Avenir Next", system-ui, sans-serif`;
      ctx.lineWidth = 4;
      ctx.strokeStyle = 'rgba(0,0,0,0.75)';
      ctx.strokeText(p.text, sx, sy);
      ctx.fillStyle = p.color;
      ctx.fillText(p.text, sx, sy);
    }
    ctx.restore();
    ctx.globalAlpha = 1;
  }

  /** Rain / embers / drifting stars, drawn in screen space. */
  drawWeather(v: View, pal: ZonePalette, speed: number, dt: number): void {
    if (pal.weather === 'none' || v.quality === 'low') return;
    const { ctx } = v;
    ctx.save();
    const n = pal.weather === 'star' ? 60 : 120;
    for (let i = 0; i < n; i++) {
      let x = this.weatherX[i];
      let y = this.weatherY[i];
      const spd = this.weatherV[i];

      if (pal.weather === 'rain') {
        y += dt * (1.6 + spd * 0.9);
        x -= dt * (0.18 + speed * 0.004);
      } else if (pal.weather === 'ember') {
        y -= dt * (0.12 + spd * 0.16);
        x -= dt * (0.06 + speed * 0.002) + Math.sin(v.time * 2 + i) * 0.0009;
      } else {
        x -= dt * (0.01 + speed * 0.0008) * spd;
      }
      if (y > 1) y -= 1;
      if (y < 0) y += 1;
      if (x < 0) x += 1;
      this.weatherX[i] = x;
      this.weatherY[i] = y;

      const px = x * v.vw;
      const py = y * v.vh;
      if (pal.weather === 'rain') {
        ctx.strokeStyle = `rgba(170,230,255,${0.24 + spd * 0.22})`;
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.moveTo(px, py);
        ctx.lineTo(px - 3, py + 16 + spd * 8);
        ctx.stroke();
      } else if (pal.weather === 'ember') {
        ctx.fillStyle = withAlpha(pal.accent, 0.35 + spd * 0.35);
        ctx.fillRect(px, py, 2.6, 2.6);
      } else {
        ctx.fillStyle = `rgba(255,255,255,${0.2 + spd * 0.3})`;
        ctx.fillRect(px, py, 1.6, 1.6);
      }
    }
    ctx.restore();
  }

  /** Horizontal speed streaks; intensity follows how fast the run has become. */
  drawSpeedLines(v: View, intensity: number, color: string): void {
    if (intensity <= 0.02) return;
    const { ctx } = v;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const count = Math.round(6 + intensity * 22);
    for (let i = 0; i < count; i++) {
      const seed = (i * 97.13 + Math.floor(v.time * 6 + i) * 31.7) % 1000;
      const y = ((seed * 7919) % v.vh) | 0;
      const len = 40 + ((seed * 131) % 180) * intensity;
      const x = v.vw - (((seed * 613 + v.time * 900 * (0.6 + intensity)) % (v.vw + 260)) - 130);
      const a = 0.05 + intensity * 0.12;
      const g = ctx.createLinearGradient(x, y, x + len, y);
      g.addColorStop(0, 'rgba(255,255,255,0)');
      g.addColorStop(0.5, withAlpha(color, a));
      g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = g;
      ctx.fillRect(x, y, len, 1.4);
    }
    ctx.restore();
  }

  drawFlash(ctx: CanvasRenderingContext2D, vw: number, vh: number): void {
    if (this.flash <= 0.01) return;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = withAlpha(this.flashColor, this.flash * 0.55);
    ctx.fillRect(0, 0, vw, vh);
    ctx.restore();
  }
}
