import { clamp, lerp } from '../engine/math';
import type { Screen } from '../engine/screen';
import { GROUND_SCREEN_Y, PLAYER, PPM, RUN } from '../game/tuning';
import type { FxEvent, World } from '../game/world';
import type { SkinDef, TrailDef } from '../game/tuning';
import { drawBackground, drawForeground, drawGround, drawPost, blendedPalette } from './background';
import { drawCharacter, drawShadow } from './character';
import { Fx } from './fx';
import { contrastBoost, withAlpha, zoneAt, type ZonePalette } from './palette';
import { drawObstacle, drawPickup, type View } from './props';

export interface RenderOpts {
  skin: SkinDef;
  trail: TrailDef;
  quality: 'high' | 'low';
  screenShake: boolean;
  highContrast: boolean;
  showFps: boolean;
  fps: number;
}

/** Draws a run. Owns nothing the simulation cares about. */
export class Renderer {
  readonly fx = new Fx();
  private time = 0;
  private zoneBanner = 0;
  private zoneIndex = 0;
  private trailTimer = 0;
  private shakeX = 0;
  private shakeY = 0;

  constructor(private readonly screen: Screen) {}

  reset(): void {
    this.fx.reset();
    this.zoneBanner = 0;
    this.zoneIndex = 0;
    this.trailTimer = 0;
  }

  /** Translate a sim event into light, noise and debris. */
  onEvent(e: FxEvent, world: World): void {
    const pal = zoneAt(world.zone);
    switch (e.type) {
      case 'jump':
        this.fx.emit('dust', e.x, e.y + 0.05, 6, { speed: 3.4, dir: Math.PI, spread: 1.6, color: '#7f8ea8', life: 0.4 });
        break;
      case 'land':
        this.fx.emit('dust', e.x, e.y + 0.05, e.hard ? 14 : 6, {
          speed: e.hard ? 6 : 3,
          spread: Math.PI * 0.7,
          dir: Math.PI,
          color: '#8ba0bd',
          life: 0.45,
        });
        if (e.hard) this.fx.emit('ring', e.x, e.y + 0.1, 1, { speed: 0, life: 0.35, color: withAlpha(pal.accent, 0.8) });
        break;
      case 'slide':
        this.fx.emit('spark', e.x - 0.3, e.y + 0.1, 10, {
          speed: 7,
          dir: Math.PI * 0.9,
          spread: 0.7,
          color: '#ffc857',
          life: 0.35,
        });
        break;
      case 'dive':
        this.fx.emit('smoke', e.x, e.y + 0.4, 8, { speed: 3, spread: Math.PI, color: '#9fb4d6', life: 0.5 });
        break;
      case 'vault':
        this.fx.emit('spark', e.x, e.y, e.perfect ? 26 : 12, {
          speed: e.perfect ? 10 : 6,
          spread: Math.PI * 1.4,
          dir: 0.6,
          color: e.perfect ? '#ffc857' : pal.accent,
          life: 0.5,
        });
        this.fx.emit('ring', e.x, e.y + 0.2, 1, { speed: 0, life: 0.4, color: e.perfect ? '#ffc857' : pal.accent });
        if (e.perfect) this.fx.screenFlash('#ffc857', 0.28);
        break;
      case 'shatter':
        this.fx.emit('glass', e.x, e.y + 0.6, 26, {
          speed: 9,
          spread: Math.PI * 2,
          color: '#cdefff',
          life: 0.9,
          gravity: -18,
          drag: 0.99,
        });
        this.fx.emit('spark', e.x, e.y + 0.6, 12, { speed: 8, spread: Math.PI * 2, color: '#9dff4d', life: 0.4 });
        this.fx.screenFlash('#cdefff', 0.32);
        break;
      case 'smash':
        this.fx.emit('bit', e.x, e.y, 20, { speed: 11, spread: Math.PI * 2, color: '#ff3fa4', life: 0.6 });
        this.fx.screenFlash('#ff3fa4', 0.24);
        break;
      case 'shard':
        this.fx.emit('bit', e.x, e.y, 5, { speed: 4.5, spread: Math.PI * 2, color: '#45f5ff', life: 0.35 });
        break;
      case 'core':
        this.fx.emit('spark', e.x, e.y, 28, { speed: 10, spread: Math.PI * 2, color: '#ffc857', life: 0.8 });
        this.fx.emit('ring', e.x, e.y, 2, { speed: 0, life: 0.6, color: '#ffc857' });
        this.fx.screenFlash('#ffc857', 0.3);
        break;
      case 'power':
        this.fx.emit('ring', e.x, e.y, 3, { speed: 0, life: 0.7, color: '#ffffff' });
        this.fx.emit('spark', e.x, e.y, 24, { speed: 9, spread: Math.PI * 2, color: pal.accent, life: 0.7 });
        this.fx.screenFlash(pal.accent, 0.3);
        break;
      case 'hit':
        this.fx.emit('bit', e.x, e.y, 30, { speed: 12, spread: Math.PI * 2, color: '#ff5b5b', life: 0.9 });
        this.fx.emit('smoke', e.x, e.y, 14, { speed: 5, spread: Math.PI * 2, color: '#5c6b7a', life: 1.1 });
        this.fx.screenFlash('#ff5b5b', 0.6);
        break;
      case 'shield':
        this.fx.emit('ring', e.x, e.y, 3, { speed: 0, life: 0.55, color: '#9dff4d' });
        this.fx.screenFlash('#9dff4d', 0.35);
        break;
      case 'flowStart':
        this.fx.screenFlash('#ff3fa4', 0.45);
        this.fx.emit('ring', world.player.x, world.player.y + 0.9, 4, { speed: 0, life: 0.9, color: '#ff3fa4' });
        break;
      case 'zone':
        this.zoneBanner = 3.2;
        this.zoneIndex = e.index;
        this.fx.screenFlash(zoneAt(e.index).accent, 0.25);
        break;
      case 'popup':
        this.fx.popup(e.x, e.y, e.text, e.color);
        break;
      default:
        break;
    }
  }

  draw(world: World, alpha: number, frameDt: number, opts: RenderOpts): void {
    const ctx = this.screen.begin();
    const vp = this.screen.viewport;
    const vw = vp.width;
    const vh = vp.height;
    this.time += frameDt;
    this.fx.update(frameDt);
    if (this.zoneBanner > 0) this.zoneBanner -= frameDt;

    const p = world.player;
    // Interpolate the sim's fixed-step state into render space.
    const ix = lerp(p.px, p.x, alpha);
    const iy = lerp(p.py, p.y, alpha);

    const ppm = PPM * world.zoom;
    const anchorPx = vw * PLAYER.anchorX;
    const camX = ix;
    const camY = world.camY;
    const groundY = GROUND_SCREEN_Y + vp.insetTop * 0.4;

    let pal = zoneAt(world.zone);
    const nextPal = zoneAt(world.zone + 1);
    const zoneProgress = (world.stats.distance % 900) / 900;
    const blend = clamp((zoneProgress - 0.88) / 0.12, 0, 1);
    if (opts.highContrast) pal = contrastBoost(pal);

    // Camera shake, applied to the whole world layer.
    const shakeAmt = opts.screenShake ? world.shake : world.shake * 0.25;
    this.shakeX = (Math.random() - 0.5) * shakeAmt * 26;
    this.shakeY = (Math.random() - 0.5) * shakeAmt * 20;

    const view: View = {
      ctx,
      sx: (wx) => (wx - camX) * ppm + anchorPx,
      sy: (wy) => groundY - (wy - camY) * ppm,
      m: ppm,
      groundY,
      vw,
      vh,
      time: this.time,
      palette: pal,
      quality: opts.quality,
    };

    const bgOpts = {
      ctx,
      vw,
      vh,
      camX,
      camY,
      groundY,
      pxPerM: ppm,
      palette: pal,
      blend,
      next: opts.highContrast ? contrastBoost(nextPal) : nextPal,
      time: this.time,
      quality: opts.quality,
      flow: world.flowActive ? 1 : world.flow,
    };

    ctx.save();
    ctx.translate(this.shakeX, this.shakeY);

    drawBackground(bgOpts);
    drawGround(bgOpts, world.spawner.gaps);

    const blended = blendedPalette(pal, bgOpts.next, blend);
    this.fx.drawWeather(view, blended, world.speed, frameDt);

    // ------------------------------------------------------------- entities
    for (const o of world.spawner.obstacles) drawObstacle(view, o);
    for (const pk of world.spawner.pickups) drawPickup(view, pk);

    this.fx.draw(view);

    // ------------------------------------------------------------- player
    const feetX = view.sx(ix);
    const feetY = view.sy(iy);
    drawShadow(ctx, view.sx(ix), view.sy(0), iy, ppm);

    this.emitTrail(world, ix, iy, frameDt, opts);
    this.drawEchoes(view, world, opts);

    const speedT = clamp((world.speed - RUN.startSpeed) / (RUN.maxSpeed - RUN.startSpeed), 0, 1);
    const blinking = p.invuln > 0 && world.phase === 'running';
    const ghost = blinking ? 0.45 + 0.55 * Math.abs(Math.sin(this.time * 26)) : 1;

    if (world.flowActive) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const g = ctx.createRadialGradient(feetX, feetY - ppm, 0, feetX, feetY - ppm, ppm * 2.6);
      g.addColorStop(0, withAlpha('#ff3fa4', 0.32));
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.fillRect(feetX - ppm * 3, feetY - ppm * 4, ppm * 6, ppm * 6);
      ctx.restore();
    }

    drawCharacter({
      ctx,
      x: feetX,
      y: feetY,
      scale: ppm,
      player: p,
      skin: opts.skin.palette,
      accent: pal.accent,
      speedT,
      ghost,
      flow: world.flowActive ? 1 : 0,
      overdrive: world.overdriveTimer > 0,
    });

    if (world.shields > 0) this.drawShieldBubble(ctx, feetX, feetY - ppm * 0.9, ppm, world.shields);

    this.fx.drawPopups(view);
    drawForeground(bgOpts);
    ctx.restore();

    // ------------------------------------------------------------- screen space
    this.fx.drawSpeedLines(view, speedT * (world.overdriveTimer > 0 ? 1.6 : 1), pal.accent);
    drawPost(
      ctx,
      vw,
      vh,
      pal,
      world.flowActive ? 1 : 0,
      world.overdriveTimer > 0 ? clamp(world.overdriveTimer, 0, 1) : 0,
      world.phase === 'dying' ? clamp(world.deathTimer * 1.4, 0, 0.6) : 0,
    );
    this.fx.drawFlash(ctx, vw, vh);
    this.drawZoneBanner(ctx, vw, vh, pal);

    if (opts.showFps) {
      ctx.save();
      ctx.font = '600 12px ui-monospace, monospace';
      ctx.fillStyle = 'rgba(160,190,220,0.8)';
      ctx.textAlign = 'right';
      ctx.fillText(`${opts.fps.toFixed(0)} fps · ${world.speed.toFixed(1)} m/s`, vw - 10, vh - 10);
      ctx.restore();
    }
  }

  /** Cosmetic trail behind the runner. */
  private emitTrail(world: World, x: number, y: number, dt: number, opts: RenderOpts): void {
    if (world.phase !== 'running') return;
    this.trailTimer -= dt;
    const p = world.player;
    if (opts.trail.kind === 'spark' && p.onGround && this.trailTimer <= 0) {
      this.trailTimer = 0.05;
      this.fx.emit('spark', x - 0.3, y + 0.05, 2, {
        speed: 4,
        dir: Math.PI * 0.85,
        spread: 0.6,
        color: opts.trail.color,
        life: 0.35,
      });
    } else if (opts.trail.kind === 'ribbon' && this.trailTimer <= 0) {
      this.trailTimer = 0.02;
      this.fx.emit('trail', x - 0.2, y + p.height * 0.5, 1, {
        speed: 0.4,
        spread: 0.5,
        color: opts.trail.color,
        life: 0.45,
        gravity: 0,
        drag: 0.9,
      });
    } else if (opts.trail.kind === 'echo' && this.trailTimer <= 0) {
      this.trailTimer = 0.06;
      this.fx.pushEcho(x, y, p.cycle, p.state);
    }
    if (world.overdriveTimer > 0 && world.phase === 'running') {
      this.fx.emit('spark', x - 0.4, y + 0.8, 1, {
        speed: 6,
        dir: Math.PI,
        spread: 0.8,
        color: '#ff3fa4',
        life: 0.3,
      });
    }
  }

  private drawEchoes(view: View, world: World, opts: RenderOpts): void {
    if (opts.trail.kind !== 'echo' || !this.fx.echoes.length) return;
    const { ctx } = view;
    const p = world.player;
    for (const e of this.fx.echoes) {
      const a = clamp(e.life / 0.34, 0, 1) * 0.35;
      ctx.save();
      ctx.globalAlpha = a;
      ctx.globalCompositeOperation = 'lighter';
      const stash = { cycle: p.cycle, state: p.state };
      p.cycle = e.cycle;
      p.state = e.state as typeof p.state;
      drawCharacter({
        ctx,
        x: view.sx(e.x),
        y: view.sy(e.y),
        scale: view.m,
        player: p,
        skin: { ...opts.skin.palette, jacket: opts.trail.color, jacketDark: opts.trail.color, skin: opts.trail.color, skinShadow: opts.trail.color, trouser: opts.trail.color, shoe: opts.trail.color, hair: opts.trail.color },
        accent: opts.trail.color,
        speedT: 0.5,
        ghost: 1,
        flow: 0,
        overdrive: false,
      });
      p.cycle = stash.cycle;
      p.state = stash.state;
      ctx.restore();
    }
    ctx.globalAlpha = 1;
  }

  private drawShieldBubble(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    ppm: number,
    count: number,
  ): void {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < count; i++) {
      const r = ppm * (1.15 + i * 0.12);
      const pulse = 0.5 + 0.5 * Math.sin(this.time * 3 + i);
      ctx.strokeStyle = withAlpha('#9dff4d', 0.16 + pulse * 0.2);
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(x, y, r * 0.72, r, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  }

  private drawZoneBanner(ctx: CanvasRenderingContext2D, vw: number, vh: number, pal: ZonePalette): void {
    if (this.zoneBanner <= 0) return;
    const t = clamp(this.zoneBanner / 3.2, 0, 1);
    const a = t > 0.8 ? (1 - t) * 5 : Math.min(1, t * 2.4);
    const zone = zoneAt(this.zoneIndex);
    ctx.save();
    ctx.globalAlpha = clamp(a, 0, 1);
    ctx.textAlign = 'center';
    ctx.fillStyle = pal.accent;
    ctx.font = '900 26px "Avenir Next", system-ui, sans-serif';
    ctx.fillText(zone.name, vw * 0.5, vh * 0.34);
    ctx.font = '600 12px "Avenir Next", system-ui, sans-serif';
    ctx.fillStyle = 'rgba(220,240,255,0.75)';
    ctx.fillText(zone.tagline.toUpperCase(), vw * 0.5, vh * 0.34 + 20);
    ctx.strokeStyle = withAlpha(pal.accent, 0.6);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(vw * 0.5 - 90, vh * 0.34 + 32);
    ctx.lineTo(vw * 0.5 + 90, vh * 0.34 + 32);
    ctx.stroke();
    ctx.restore();
  }

  /** Title-screen idle: Marcus running on the spot behind the menu. */
  drawAttract(world: World, frameDt: number, opts: RenderOpts): void {
    this.draw(world, 0, frameDt, opts);
  }
}
